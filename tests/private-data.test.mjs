import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';

const db = new PGlite();
const ids = Object.fromEntries(['admin', 'alice', 'bob', 'outsider', 'legacyDelegate', 'place']
  .map((name, i) => [name, `10000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`]));
const read = (name) => readFile(new URL(`../supabase/${name}`, import.meta.url), 'utf8');
async function asUser(id, sql, parameters = []) {
  await db.exec('SET ROLE authenticated');
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id]);
  try { return await db.query(sql, parameters); }
  finally { await db.exec('RESET ROLE'); }
}

before(async () => {
  await db.exec(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE TABLE auth.users (id UUID PRIMARY KEY, email TEXT, raw_user_meta_data JSONB DEFAULT '{}', email_confirmed_at TIMESTAMPTZ);
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
    $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated;
    CREATE TABLE storage.buckets (id TEXT PRIMARY KEY, name TEXT, public BOOLEAN, file_size_limit BIGINT, allowed_mime_types TEXT[]);
    CREATE TABLE storage.objects (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id TEXT, name TEXT);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA storage TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
  `);
  await db.exec((await read('schema/pinwi_schema_supabase.sql')).replace('CREATE EXTENSION IF NOT EXISTS pgcrypto;', ''));
  await db.exec(await read('migrations/202610060001_delegate_integrity.sql'));
  for (const name of ['admin', 'alice', 'bob', 'outsider', 'legacyDelegate']) {
    await db.query(`INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,$2,NOW())`, [ids[name], `${name}@pinwi.test`]);
    await db.query('UPDATE users SET name=$2,phone=$3 WHERE id=$1', [ids[name], name, 'private-phone']);
    await db.query(`INSERT INTO user_profiles(user_id,career,university,subjects,bio,company)
      VALUES($1,'Carrera','Institucion',ARRAY['Materia'],'Biografia','Empresa privada')`, [ids[name]]);
  }
  await db.query("UPDATE users SET role='admin' WHERE id=$1", [ids.admin]);
  await db.query("UPDATE users SET role='delegate' WHERE id=$1", [ids.legacyDelegate]);
  await db.exec(`CREATE POLICY "read student users" ON users FOR SELECT TO authenticated USING (role='student');
    CREATE POLICY "read student profiles" ON user_profiles FOR SELECT TO authenticated USING (true);
    CREATE POLICY "update own messages" ON messages FOR UPDATE TO authenticated USING (sender_id=auth.uid() OR receiver_id=auth.uid());
    CREATE PUBLICATION supabase_realtime FOR TABLE public.messages;
    GRANT SELECT ON users_with_stats TO authenticated;`);
  await db.exec(await read('migrations/202610060002_private_profiles_messages.sql'));
  await db.exec(await read('migrations/202610060003_legacy_message_receipts.sql'));
});
after(async () => { await db.close(); });

test('other accounts and extended profiles remain private, including stats views', async () => {
  assert.equal((await asUser(ids.alice, 'SELECT email,phone FROM users WHERE id=$1', [ids.bob])).rows.length, 0);
  assert.equal((await asUser(ids.alice, 'SELECT * FROM user_profiles WHERE user_id=$1', [ids.bob])).rows.length, 0);
  assert.equal((await asUser(ids.alice, 'SELECT * FROM users_with_stats WHERE id=$1', [ids.bob])).rows.length, 0);
  assert.equal((await asUser(ids.alice, 'SELECT email FROM users WHERE id=$1', [ids.alice])).rows.length, 1);
  assert.equal((await asUser(ids.admin, 'SELECT email FROM users WHERE id=$1', [ids.bob])).rows.length, 1);
});

test('student directory is opt-in, revocable and never returns private fields', async () => {
  assert.equal((await asUser(ids.alice, 'SELECT * FROM get_shared_profiles(NULL,true)')).rows.length, 0);
  await asUser(ids.bob, 'UPDATE user_profiles SET study_profile_visible=true WHERE user_id=$1', [ids.bob]);
  const rows = (await asUser(ids.alice, 'SELECT * FROM get_shared_profiles(NULL,true)')).rows;
  assert.equal(rows.length, 1);
  assert.deepEqual(Object.keys(rows[0]).sort(), ['avatar_url','bio','career','id','name','role','subjects','university']);
  assert.equal(rows[0].career, 'Carrera');
  await asUser(ids.bob, 'UPDATE user_profiles SET study_profile_visible=false WHERE user_id=$1', [ids.bob]);
  assert.equal((await asUser(ids.alice, 'SELECT * FROM get_shared_profiles(NULL,true)')).rows.length, 0);
  assert.equal((await asUser(ids.alice, 'SELECT * FROM get_shared_profiles($1,false)', [[ids.bob]])).rows.length, 0);
});

test('chat counterparts see minimal identity but never obtain private account/profile rows', async () => {
  await assert.rejects(asUser(ids.alice, 'INSERT INTO messages(sender_id,receiver_id,message) VALUES($1,$2,$3)', [ids.alice, ids.bob, 'No solicitado']), /row-level security/);
  await asUser(ids.bob, 'UPDATE user_profiles SET study_profile_visible=true WHERE user_id=$1', [ids.bob]);
  await asUser(ids.alice, 'INSERT INTO messages(sender_id,receiver_id,message) VALUES($1,$2,$3)', [ids.alice, ids.bob, 'Hola']);
  await asUser(ids.bob, 'UPDATE user_profiles SET study_profile_visible=false WHERE user_id=$1', [ids.bob]);
  const profile = (await asUser(ids.alice, 'SELECT * FROM get_shared_profiles($1,false)', [[ids.bob]])).rows[0];
  assert.equal(profile.name, 'bob');
  assert.equal(profile.career, null);
  assert.equal(profile.bio, null);
  assert.equal((await asUser(ids.alice, 'SELECT email FROM users WHERE id=$1', [ids.bob])).rows.length, 0);
  assert.equal((await asUser(ids.outsider, 'SELECT * FROM get_shared_profiles($1,false)', [[ids.bob]])).rows.length, 0);
});

test('message participants cannot rewrite content, identity, dates or another participant flags', async () => {
  const message = (await db.query('SELECT id FROM messages LIMIT 1')).rows[0].id;
  for (const actor of [ids.alice, ids.bob]) {
    for (const field of ["message='Falso'", "created_at='2000-01-01'", `sender_id='${ids.outsider}'`, "attachment_url='https://example.test/file'"]) {
      await assert.rejects(asUser(actor, `UPDATE messages SET ${field} WHERE id=$1`, [message]), /message_content_immutable/);
    }
  }
  await assert.rejects(asUser(ids.alice, 'UPDATE messages SET read=true WHERE id=$1', [message]), /message_read_forbidden/);
  await assert.rejects(asUser(ids.alice, 'UPDATE messages SET deleted_by_receiver=true WHERE id=$1', [message]), /message_hide_forbidden/);
  await asUser(ids.bob, "UPDATE messages SET read=true,read_at='2000-01-01' WHERE id=$1", [message]);
  const receipt = (await db.query('SELECT read,read_at FROM messages WHERE id=$1', [message])).rows[0];
  assert.equal(receipt.read, true);
  assert.ok(new Date(receipt.read_at).getFullYear() > 2000);
  await assert.rejects(asUser(ids.bob, 'UPDATE messages SET read=false WHERE id=$1', [message]), /message_read_forbidden/);
  assert.equal((await asUser(ids.outsider, 'UPDATE messages SET read=true WHERE id=$1 RETURNING id', [message])).rows.length, 0);
  assert.equal((await asUser(ids.outsider, 'SELECT id FROM messages WHERE id=$1', [message])).rows.length, 0);
});

test('forged read receipts and oversized messages are rejected on insert', async () => {
  await assert.rejects(asUser(ids.alice, 'INSERT INTO messages(sender_id,receiver_id,message,read) VALUES($1,$2,$3,true)', [ids.alice, ids.bob, 'Hola']), /message_sender_fields/);
  await assert.rejects(asUser(ids.alice, 'INSERT INTO messages(sender_id,receiver_id,message) VALUES($1,$2,$3)', [ids.alice, ids.bob, 'x'.repeat(4001)]), /invalid_message_length/);
});

test('historic or server-delivered long messages can still be acknowledged without modifying content', async () => {
  const content = 'x'.repeat(4500);
  const id = (await db.query('INSERT INTO messages(sender_id,receiver_id,message) VALUES($1,$2,$3) RETURNING id', [ids.alice, ids.bob, content])).rows[0].id;
  await asUser(ids.bob, 'UPDATE messages SET read=true WHERE id=$1', [id]);
  const row = (await db.query('SELECT read,message FROM messages WHERE id=$1', [id])).rows[0];
  assert.equal(row.read, true);
  assert.equal(row.message, content);
});

test('notifications are recipient-only and acknowledgement cannot change their content', async () => {
  const id = (await db.query("INSERT INTO notifications(user_id,type,title,message) VALUES($1,'system','Aviso','Contenido') RETURNING id", [ids.alice])).rows[0].id;
  assert.equal((await asUser(ids.bob, 'SELECT * FROM notifications WHERE id=$1', [id])).rows.length, 0);
  await assert.rejects(asUser(ids.alice, "UPDATE notifications SET title='Falso' WHERE id=$1", [id]), /notification_content_immutable/);
  await asUser(ids.alice, "UPDATE notifications SET read=true,read_at='2000-01-01' WHERE id=$1", [id]);
  assert.ok(new Date((await db.query('SELECT read_at FROM notifications WHERE id=$1', [id])).rows[0].read_at).getFullYear() > 2000);
  await assert.rejects(asUser(ids.alice, "INSERT INTO notifications(user_id,type,title,message) VALUES($1,'system','Falso','Falso')", [ids.alice]), /permission denied/);
  assert.equal((await db.query("SELECT * FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='notifications'")).rows.length, 1);
});

test('legacy delegate is pending, with no assignments or subscription, and cannot manage places', async () => {
  const delegate = (await db.query('SELECT * FROM delegates WHERE user_id=$1', [ids.legacyDelegate])).rows[0];
  assert.equal(delegate.status, 'pending');
  assert.equal(delegate.subscription_active, false);
  assert.equal((await db.query('SELECT * FROM delegate_places WHERE delegate_id=$1', [delegate.id])).rows.length, 0);
  assert.equal((await asUser(ids.legacyDelegate, 'SELECT is_current_user_place_manager() allowed')).rows[0].allowed, false);
});

test('future orphaned delegate roles are prevented while management RPCs remain atomic', async () => {
  await assert.rejects(db.query("UPDATE users SET role='delegate' WHERE id=$1", [ids.outsider]), /delegate_account_inconsistent/);
  const delegate = (await asUser(ids.admin, 'SELECT save_managed_delegate(NULL,$1,$2,NULL,$3,false,ARRAY[]::UUID[]) id', ['outsider@pinwi.test','Delegado','active'])).rows[0].id;
  await assert.rejects(db.query('DELETE FROM delegates WHERE id=$1', [delegate]), /delegate_account_inconsistent/);
  await asUser(ids.admin, 'SELECT delete_managed_delegate($1)', [delegate]);
  assert.equal((await db.query('SELECT role FROM users WHERE id=$1', [ids.outsider])).rows[0].role, 'student');
});

test('assigned delegates can read reservation names without gaining private account access', async () => {
  await db.query(`INSERT INTO places(id,name,type,category,address,latitude,longitude)
    VALUES($1,'Lugar','coworking','work','Santiago',-33.45,-70.66)`, [ids.place]);
  await asUser(ids.admin, 'SELECT save_managed_delegate(NULL,$1,$2,NULL,$3,false,$4)',
    ['legacyDelegate@pinwi.test', 'Delegado', 'active', [ids.place]]);
  await db.query(`INSERT INTO reservations(user_id,place_id,reservation_dates,start_time,end_time,total_amount)
    VALUES($1,$2,ARRAY['2026-11-01']::DATE[],'09:00','10:00',1000)`, [ids.bob, ids.place]);
  const profiles = (await asUser(ids.legacyDelegate, 'SELECT * FROM get_shared_profiles($1,false)', [[ids.bob]])).rows;
  assert.equal(profiles[0].name, 'bob');
  assert.equal(profiles[0].career, null);
  assert.equal((await asUser(ids.legacyDelegate, 'SELECT email,phone FROM users WHERE id=$1', [ids.bob])).rows.length, 0);
  assert.equal((await asUser(ids.outsider, 'SELECT * FROM get_shared_profiles($1,false)', [[ids.bob]])).rows.length, 0);
});

test('suspended accounts cannot use the directory or read/write messages', async () => {
  await db.query("UPDATE users SET status='suspended' WHERE id=$1", [ids.alice]);
  assert.equal((await asUser(ids.alice, 'SELECT * FROM messages')).rows.length, 0);
  assert.equal((await asUser(ids.alice, 'SELECT * FROM get_shared_profiles(NULL,false)')).rows.length, 0);
  await assert.rejects(asUser(ids.alice, 'INSERT INTO messages(sender_id,receiver_id,message) VALUES($1,$2,$3)', [ids.alice, ids.bob, 'No']), /active_account_required/);
  await db.query("UPDATE users SET status='active' WHERE id=$1", [ids.alice]);
});

test('anonymous callers cannot read shared profiles or messages', async () => {
  await db.exec('SET ROLE anon');
  try {
    await assert.rejects(db.query('SELECT * FROM get_shared_profiles(NULL,true)'), /permission denied/);
    await assert.rejects(db.query('SELECT * FROM messages'), /permission denied/);
  } finally { await db.exec('RESET ROLE'); }
});
