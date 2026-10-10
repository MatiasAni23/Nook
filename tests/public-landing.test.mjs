import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';

const db = new PGlite();
const ids = Object.fromEntries(['admin','student','suspended','place','inactive'].map((name,index) => [name, `70000000-0000-4000-8000-${String(index + 1).padStart(12,'0')}`]));
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
  for (const key of ['admin','student','suspended']) await db.query('INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,$2,NOW())', [ids[key],key + '@pinwi.test']);
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
