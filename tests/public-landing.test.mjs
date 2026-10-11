import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';

const db = new PGlite();
const ids = Object.fromEntries(['admin','student','suspended','place','inactive','delegate'].map((name,index) => [name, `70000000-0000-4000-8000-${String(index + 1).padStart(12,'0')}`]));
const read = path => readFile(new URL('../supabase/' + path, import.meta.url), 'utf8');
async function asRole(role, id, sql, values = []) {
  await db.exec('SET ROLE ' + role);
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id ?? '']);
  try { return await db.query(sql, values); } finally { await db.exec('RESET ROLE'); }
}
before(async () => {
  await db.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE TABLE auth.users(id UUID PRIMARY KEY,email TEXT,raw_user_meta_data JSONB DEFAULT '{}',email_confirmed_at TIMESTAMPTZ);
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::UUID; $$;
    GRANT USAGE ON SCHEMA auth TO anon,authenticated;
    CREATE TABLE storage.buckets(id TEXT PRIMARY KEY,name TEXT,public BOOLEAN,file_size_limit BIGINT,allowed_mime_types TEXT[]);
    CREATE TABLE storage.objects(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id TEXT,name TEXT);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA storage TO authenticated;
    GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;`);
  await db.exec((await read('schema/pinwi_schema_supabase.sql')).replace('CREATE EXTENSION IF NOT EXISTS pgcrypto;', ''));
  for (const file of ['202610060001_delegate_integrity.sql','202610060002_private_profiles_messages.sql','202610060003_legacy_message_receipts.sql']) await db.exec(await read('migrations/' + file));
  await db.exec('GRANT SELECT ON places,place_hours,place_amenities,place_spaces,places_with_stats TO anon,PUBLIC;');
  await db.exec(await read('migrations/202610100001_public_landing.sql'));
  await db.exec(await read('migrations/202610110001_admin_place_deletion.sql'));
  for (const key of ['admin','student','suspended','delegate']) await db.query('INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,$2,NOW())', [ids[key],key + '@pinwi.test']);
  await db.query("UPDATE public.users SET role='admin',status='active' WHERE id=$1", [ids.admin]);
  await db.query("UPDATE public.users SET role='admin',status='suspended' WHERE id=$1", [ids.suspended]);
  for (const key of ['place','inactive']) await db.query(`INSERT INTO places(id,name,type,category,address,latitude,longitude,status,description,created_by) VALUES($1,'Espacio de prueba','library','study','Dirección de la ficha',-33.45,-70.65,$2,'Información solo para cuentas',$3)`, [ids[key],key === 'place' ? 'active' : 'inactive',ids.admin]);
});
after(() => db.close());

test('anonymous map exposes only pins of active places, with no access to complete records or accounts', async () => {
  const rows = (await asRole('anon',null,'SELECT * FROM get_public_map_pins()')).rows;
  assert.equal(rows.length,1);
  assert.equal(rows[0].id,ids.place);
  assert.deepEqual(Object.keys(rows[0]).sort(),['category','id','latitude','longitude','name','type']);
  await assert.rejects(asRole('anon',null,'SELECT * FROM list_public_places()'), /permission denied/);
  await assert.rejects(asRole('anon',null,'SELECT * FROM public.places'), /permission denied/);
  await assert.rejects(asRole('anon',null,'SELECT * FROM public.places_with_stats'), /permission denied/);
  await assert.rejects(asRole('anon',null,'SELECT * FROM public.place_amenities'), /permission denied/);
  await assert.rejects(asRole('anon',null,'SELECT email FROM public.users'), /permission denied/);
  assert.equal((await asRole('authenticated',ids.student,'SELECT * FROM list_public_places()')).rows[0].description,'Información solo para cuentas');
});
test('only an active administrator changes public links, and new deployments preserve configuration', async () => {
  assert.equal((await asRole('anon',null,'SELECT instagram_url FROM site_settings')).rows[0].instagram_url,'');
  await asRole('authenticated',ids.admin,"UPDATE site_settings SET instagram_url='https://www.instagram.com/pinwi/',whatsapp_number='+56912345678' WHERE id='public'");
  for (const key of ['student','suspended']) assert.equal((await asRole('authenticated',ids[key],"UPDATE site_settings SET instagram_url='https://example.test/forged' RETURNING id")).rows.length,0);
  await assert.rejects(asRole('anon',null,"UPDATE site_settings SET instagram_url='https://example.test/forged'"), /permission denied/);
  await assert.rejects(asRole('authenticated',ids.admin,"DELETE FROM site_settings"), /permission denied/);
  await assert.rejects(asRole('authenticated',ids.admin,"UPDATE site_settings SET id='other'"), /permission denied/);
  await db.exec(await read('migrations/202610100001_public_landing.sql'));
  assert.equal((await asRole('anon',null,'SELECT instagram_url,whatsapp_number FROM site_settings')).rows[0].instagram_url,'https://www.instagram.com/pinwi/');
  assert.equal((await db.query('SELECT count(*)::integer AS total FROM places')).rows[0].total,2);
});
test('database rejects executable links, credentials, malformed phone numbers, but accepts TikTok handles', async () => {
  for (const link of ['javascript:alert(1)','http://example.test','https://user:password@example.test','https://example.test/invalid space']) await assert.rejects(asRole('authenticated',ids.admin,'UPDATE site_settings SET x_url=$1', [link]), /check constraint/);
  for (const phone of ['1234','56912345678','+0123456789']) await assert.rejects(asRole('authenticated',ids.admin,'UPDATE site_settings SET whatsapp_number=$1', [phone]), /check constraint/);
  await asRole('authenticated',ids.admin,"UPDATE site_settings SET tiktok_url='https://www.tiktok.com/@pinwi'");
  assert.equal((await asRole('anon',null,'SELECT tiktok_url FROM site_settings')).rows[0].tiktok_url,'https://www.tiktok.com/@pinwi');
});

test('administrators can inspect hidden places and toggle publication without losing details; ordinary accounts cannot', async () => {
  await db.query("INSERT INTO place_amenities(place_id,amenity_key,amenity_name,is_available) VALUES($1,'wifi','WiFi',true)", [ids.inactive]);
  await db.query("INSERT INTO place_spaces(place_id,name,capacity,price_per_hour,billing_unit,image_url) VALUES($1,'Sala conservada',4,0,'hour','https://example.test/room.webp')", [ids.inactive]);
  assert.deepEqual((await asRole('authenticated',ids.admin,"SELECT id FROM places WHERE status IN ('active','inactive') ORDER BY id")).rows.map(row => row.id), [ids.place,ids.inactive]);
  assert.equal((await asRole('authenticated',ids.admin,'SELECT * FROM place_amenities WHERE place_id=$1',[ids.inactive])).rows.length,1);
  assert.equal((await asRole('authenticated',ids.admin,'SELECT * FROM place_spaces WHERE place_id=$1',[ids.inactive])).rows[0].name,'Sala conservada');
  for (const key of ['student','suspended']) {
    assert.equal((await asRole('authenticated',ids[key],"SELECT id FROM places WHERE status='inactive'")).rows.length,0);
    assert.equal((await asRole('authenticated',ids[key],"UPDATE places SET status='active' WHERE id=$1 RETURNING id",[ids.inactive])).rows.length,0);
    assert.equal((await asRole('authenticated',ids[key],"UPDATE places SET status='inactive' WHERE id=$1 RETURNING id",[ids.place])).rows.length,0);
  }
  await asRole('authenticated',ids.admin,"UPDATE places SET status='active' WHERE id=$1",[ids.inactive]);
  assert.equal((await asRole('anon',null,'SELECT * FROM get_public_map_pins()')).rows.length,2);
  assert.equal((await asRole('authenticated',ids.student,'SELECT * FROM list_public_places()')).rows.length,2);
  await asRole('authenticated',ids.admin,"UPDATE places SET status='inactive' WHERE id=$1",[ids.inactive]);
  assert.equal((await asRole('anon',null,'SELECT * FROM get_public_map_pins()')).rows.length,1);
  assert.equal((await asRole('authenticated',ids.student,'SELECT * FROM list_public_places()')).rows.length,1);
  assert.equal((await db.query('SELECT name FROM place_spaces WHERE place_id=$1',[ids.inactive])).rows[0].name,'Sala conservada');
  assert.equal((await db.query('SELECT description FROM places WHERE id=$1',[ids.inactive])).rows[0].description,'Información solo para cuentas');
});

test('permanent deletion is admin-only even with an extra legacy policy; delegates can still disable their assigned places', async () => {
  await asRole('authenticated',ids.admin,"SELECT save_managed_delegate(NULL,'delegate@pinwi.test','Delegado','','active',false,$1)",[[ids.inactive]]);
  await db.exec('CREATE POLICY extra_legacy_delete ON places FOR DELETE TO authenticated USING (is_current_user_delegate_for_place(id));');
  assert.equal((await asRole('authenticated',ids.delegate,'DELETE FROM places WHERE id=$1 RETURNING id',[ids.inactive])).rows.length,0);
  for (const key of ['student','suspended','delegate'])
    await assert.rejects(asRole('authenticated',ids[key],'SELECT delete_managed_place($1)',[ids.inactive]), /admin_required/);
  await assert.rejects(asRole('anon',null,'SELECT delete_managed_place($1)',[ids.inactive]), /permission denied/);
  await asRole('authenticated',ids.admin,"UPDATE places SET status='active' WHERE id=$1",[ids.inactive]);
  assert.equal((await asRole('authenticated',ids.delegate,"UPDATE places SET status='inactive' WHERE id=$1 RETURNING id",[ids.inactive])).rows.length,1);
  assert.equal((await asRole('authenticated',ids.delegate,"UPDATE places SET status='inactive' WHERE id=$1 RETURNING id",[ids.place])).rows.length,0);
  await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('place-images',$1),('place-images',$2)",[ids.inactive+'/cover.webp',ids.place+'/keep.webp']);
  await db.query("INSERT INTO reservations(user_id,place_id,reservation_dates,start_time,end_time,total_amount) VALUES($1,$2,ARRAY['2026-11-01'::date],'10:00','11:00',0)",[ids.student,ids.inactive]);
  await db.query('INSERT INTO reviews(user_id,place_id,rating) VALUES($1,$2,4)',[ids.student,ids.inactive]);
  await db.query('INSERT INTO favorites(user_id,place_id) VALUES($1,$2)',[ids.student,ids.inactive]);
  await db.exec('CREATE TABLE test_delete_guard(place_id UUID REFERENCES places(id) ON DELETE RESTRICT);');
  await db.query('INSERT INTO test_delete_guard VALUES($1)',[ids.inactive]);
  await assert.rejects(asRole('authenticated',ids.admin,'SELECT delete_managed_place($1)',[ids.inactive]), /foreign key/);
  assert.equal((await db.query('SELECT id FROM places WHERE id=$1',[ids.inactive])).rows.length,1);
  await db.exec('DROP TABLE test_delete_guard;');
  const result = (await asRole('authenticated',ids.admin,'SELECT delete_managed_place($1) result',[ids.inactive])).rows[0].result;
  assert.deepEqual(result,{ id: ids.inactive, image_paths: [ids.inactive+'/cover.webp'] });
  assert.equal((await db.query('SELECT id FROM places WHERE id=$1',[ids.inactive])).rows.length,0);
  for (const table of ['place_amenities','place_spaces','reservations','reviews','favorites','delegate_places'])
    assert.equal((await db.query(`SELECT count(*)::integer total FROM ${table} WHERE place_id=$1`,[ids.inactive])).rows[0].total,0);
  await assert.rejects(asRole('authenticated',ids.admin,'SELECT delete_managed_place($1)',[ids.inactive]), /place_not_found/);
  // Re-applying the migration does not delete unrelated places or configuration.
  await db.exec(await read('migrations/202610110001_admin_place_deletion.sql'));
  assert.equal((await db.query('SELECT id FROM places WHERE id=$1',[ids.place])).rows.length,1);
});
