import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { before, beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';

const db = new PGlite();
const ids = Object.fromEntries(['admin','delegate','otherDelegate','student','other','unverified','place','otherPlace','space','secondSpace','otherSpace']
  .map((name, index) => [name, `71000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`]));
let day, week;
async function asUser(id, sql, parameters = []) {
  await db.exec('SET ROLE authenticated');
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id]);
  try { return await db.query(sql, parameters); } finally { await db.exec('RESET ROLE'); }
}
async function publish(space = ids.space, start = '08:00', end = '12:00', minutes = 60) {
  return asUser(ids.delegate, 'SELECT publish_reservation_slots($1,$2,$3,$4,$5) n', [space, day, start, end, minutes]);
}
async function slot(space = ids.space, offset = 0) {
  return (await db.query('SELECT id FROM reservation_slots WHERE space_id = $1 ORDER BY starts_at OFFSET $2 LIMIT 1', [space, offset])).rows[0].id;
}
async function reserve(user = ids.student, slotId, guests = 2, request = crypto.randomUUID(), notes = '') {
  return (await asUser(user, 'SELECT create_trial_reservation($1,$2,$3,$4) id', [slotId ?? await slot(), guests, request, notes])).rows[0].id;
}
before(async () => {
  await db.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE TABLE auth.users (id UUID PRIMARY KEY, email TEXT, raw_user_meta_data JSONB DEFAULT '{}', email_confirmed_at TIMESTAMPTZ);
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::UUID $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated;
    CREATE TABLE storage.buckets(id TEXT PRIMARY KEY,name TEXT,public BOOLEAN,file_size_limit BIGINT,allowed_mime_types TEXT[]);
    CREATE TABLE storage.objects(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id TEXT,name TEXT);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA storage TO authenticated;
    GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;
    CREATE SCHEMA realtime;
    CREATE TABLE realtime.messages(id UUID DEFAULT gen_random_uuid(),extension TEXT,topic TEXT,payload JSONB,event TEXT,private BOOLEAN);
    ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA realtime TO authenticated;
    GRANT SELECT, INSERT ON realtime.messages TO authenticated;
    CREATE FUNCTION realtime.topic() RETURNS TEXT LANGUAGE sql STABLE AS $$ SELECT current_setting('test.realtime_topic',true) $$;
    CREATE FUNCTION realtime.send(payload JSONB,event TEXT,topic TEXT,is_private BOOLEAN DEFAULT TRUE) RETURNS VOID LANGUAGE sql AS $$
      INSERT INTO realtime.messages(extension,topic,payload,event,private) VALUES('broadcast',topic,payload,event,is_private)
    $$;`);
  const baseline = await readFile(new URL('../supabase/schema/pinwi_schema_supabase.sql', import.meta.url), 'utf8');
  await db.exec(baseline.replace('CREATE EXTENSION IF NOT EXISTS pgcrypto;', ''));
  for (const name of ['202610060001_delegate_integrity.sql','202610060002_private_profiles_messages.sql','202610060003_legacy_message_receipts.sql','202610110001_admin_place_deletion.sql','202610120001_auth_security.sql','202610120002_app_security.sql','202610120004_trial_reservations.sql','202610120005_reservation_realtime.sql','202610120006_weekly_reservation_schedules.sql','202610120007_delegate_reservation_feed.sql']) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'));
  }
  for (const name of ['admin','delegate','otherDelegate','student','other','unverified']) {
    await db.query('INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,$2,$3)', [ids[name], `${name}@pinwi.test`, name === 'unverified' ? null : new Date()]);
  }
  await db.query("UPDATE users SET role='admin' WHERE id=$1", [ids.admin]);
  for (const name of ['place','otherPlace']) await db.query("INSERT INTO places(id,name,type,category,address,latitude,longitude) VALUES($1,$2,'coworking','work','Prueba',-33,-70)", [ids[name], name]);
  for (const [name, place] of [['space','place'],['secondSpace','place'],['otherSpace','otherPlace']]) {
    await db.query("INSERT INTO place_spaces(id,place_id,name,capacity,image_url) VALUES($1,$2,$3,4,'https://example.test/space.webp')", [ids[name], ids[place], name]);
  }
  for (const [name, place] of [['delegate','place'],['otherDelegate','otherPlace']]) await asUser(ids.admin,
    'SELECT save_managed_delegate(NULL,$1,$2,$3,$4,false,$5)', [`${name}@pinwi.test`,name,'','active',[ids[place]]]);
  day = (await db.query("SELECT ((now() AT TIME ZONE 'America/Santiago')::DATE + 3)::TEXT AS slot_date")).rows[0].slot_date;
  week = (await db.query("SELECT ((now() AT TIME ZONE 'America/Santiago')::DATE + (8 - extract(isodow FROM now() AT TIME ZONE 'America/Santiago')::INTEGER))::TEXT AS monday")).rows[0].monday;
});
beforeEach(async () => {
  await db.exec('DELETE FROM notifications; DELETE FROM reservations; DELETE FROM reservation_slots; DELETE FROM place_reservation_settings; DELETE FROM realtime.messages;');
  await db.query("UPDATE users SET status='active' WHERE id=$1", [ids.student]);
  await db.query("UPDATE places SET status='active' WHERE id=$1", [ids.place]);
  await db.query('UPDATE place_spaces SET capacity=4 WHERE place_id=$1', [ids.place]);
  await asUser(ids.delegate, 'SELECT set_place_reservations_enabled($1,true)', [ids.place]);
});
after(async () => { await db.close(); });

test('optimized delegate feed returns scoped bookings and shared names without private account fields', async () => {
  await db.query("UPDATE users SET name='Persona de prueba' WHERE id=$1", [ids.student]);
  await publish(); const id = await reserve();
  const rows = (await asUser(ids.delegate, 'SELECT * FROM get_delegate_reservations(200,0)')).rows;
  assert.equal(rows.length, 1); assert.equal(rows[0].id, id); assert.equal(rows[0].place_id, ids.place);
  assert.equal(rows[0].user_name, (await db.query('SELECT name FROM users WHERE id=$1', [ids.student])).rows[0].name);
  for(const field of ['email','phone','avatar_url','user_profiles']) assert.equal(field in rows[0], false);
  assert.equal((await asUser(ids.otherDelegate, 'SELECT * FROM get_delegate_reservations(200,0)')).rows.length, 0);
  for(const user of [ids.student, ids.admin]) await assert.rejects(asUser(user, 'SELECT * FROM get_delegate_reservations(200,0)'), /reservation_manager_required/);
});

test('delegate feed pagination is bounded and assignment withdrawal immediately removes server access', async () => {
  await publish(); await reserve(ids.student, await slot(ids.space,0)); await reserve(ids.other, await slot(ids.space,1));
  const first = (await asUser(ids.delegate, 'SELECT id FROM get_delegate_reservations(1,0)')).rows;
  const second = (await asUser(ids.delegate, 'SELECT id FROM get_delegate_reservations(1,1)')).rows;
  assert.equal(first.length,1); assert.equal(second.length,1); assert.notEqual(first[0].id,second[0].id);
  for(const args of [[0,0],[201,0],[200,-1]]) await assert.rejects(asUser(ids.delegate,'SELECT * FROM get_delegate_reservations($1,$2)',args),/invalid_reservation_input/);
  await db.exec('BEGIN');
  try {
    await db.query('DELETE FROM delegate_places WHERE place_id=$1',[ids.place]);
    assert.equal((await asUser(ids.delegate,'SELECT * FROM get_delegate_reservations(200,0)')).rows.length,0);
  } finally { await db.exec('ROLLBACK'); }
  await db.exec('SET ROLE anon');
  try { await assert.rejects(db.query('SELECT * FROM get_delegate_reservations(200,0)'),/permission denied/); }
  finally { await db.exec('RESET ROLE'); }
});

const weekDate = (offset) => {
  const date = new Date(week + 'T12:00:00Z'); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0, 10);
};
const defaultWeek = () => [{date:week,start:'08:00',end:'10:00'},{date:weekDate(1),start:'09:00',end:'11:00'}];
async function publishWeek(days = defaultWeek(), user = ids.delegate, space = ids.space, minutes = 60) {
  return (await asUser(user, 'SELECT publish_reservation_week($1,$2,$3::JSONB,$4) n', [space,week,JSON.stringify(days),minutes])).rows[0].n;
}

test('weekly availability is published by assigned active managers with distinct daily ranges per space', async () => {
  for (const user of [ids.student, ids.otherDelegate]) await assert.rejects(publishWeek(defaultWeek(), user), /reservation_manager_required/);
  assert.equal(await publishWeek(), 4);
  assert.equal(await publishWeek(defaultWeek(), ids.delegate, ids.secondSpace), 4);
  const slots = (await db.query("SELECT (starts_at AT TIME ZONE 'America/Santiago')::DATE::TEXT AS slot_day, count(*)::INTEGER n FROM reservation_slots WHERE space_id=$1 GROUP BY slot_day ORDER BY slot_day", [ids.space])).rows;
  assert.deepEqual(slots, [{slot_day:week,n:2},{slot_day:weekDate(1),n:2}]);
});

test('a conflict on the last day rolls back the entire weekly publication', async () => {
  await asUser(ids.delegate, 'SELECT publish_reservation_slots($1,$2,$3,$4,60)', [ids.space,weekDate(1),'10:00','12:00']);
  await assert.rejects(publishWeek(), /reservation_schedule_overlap/);
  assert.equal((await db.query('SELECT count(*)::INTEGER n FROM reservation_slots')).rows[0].n, 2);
  assert.equal((await db.query("SELECT count(*)::INTEGER n FROM reservation_slots WHERE (starts_at AT TIME ZONE 'America/Santiago')::DATE=$1", [week])).rows[0].n, 0);
});

test('weekly retries retain identifiers, withdrawn exceptions and bookings; daily withdrawal only affects free slots', async () => {
  await publishWeek();
  const rows = (await db.query('SELECT id FROM reservation_slots WHERE space_id=$1 ORDER BY starts_at', [ids.space])).rows;
  const reservation = await reserve(ids.student, rows[1].id);
  await asUser(ids.delegate, 'SELECT set_reservation_slot_enabled($1,false)', [rows[0].id]);
  assert.equal(await publishWeek(), 0);
  assert.deepEqual((await db.query('SELECT id FROM reservation_slots WHERE space_id=$1 ORDER BY starts_at', [ids.space])).rows, rows);
  assert.equal((await db.query('SELECT enabled FROM reservation_slots WHERE id=$1', [rows[0].id])).rows[0].enabled, false);
  assert.equal((await asUser(ids.delegate, 'SELECT set_reservation_day_enabled($1,$2,false) n', [ids.space,week])).rows[0].n, 0);
  assert.equal((await db.query('SELECT enabled FROM reservation_slots WHERE id=$1', [rows[1].id])).rows[0].enabled, true);
  assert.equal((await db.query('SELECT status FROM reservations WHERE id=$1', [reservation])).rows[0].status, 'pending');
  assert.equal((await asUser(ids.delegate, 'SELECT set_reservation_day_enabled($1,$2,true) n', [ids.space,week])).rows[0].n, 1);
  assert.equal((await asUser(ids.delegate, 'SELECT set_reservation_day_enabled($1,$2,false) n', [ids.space,week])).rows[0].n, 1);
  await assert.rejects(asUser(ids.otherDelegate, 'SELECT set_reservation_day_enabled($1,$2,false)', [ids.space,week]), /reservation_manager_required/);
});

test('weekly schedule rejects malformed, duplicated, out-of-week and excessive schedules without partial writes', async () => {
  for (const days of [[], null, {}, [...defaultWeek(), defaultWeek()[0]], [{date:weekDate(7),start:'08:00',end:'09:00'}], [{date:'2026-02-31',start:'08:00',end:'09:00'}], [{date:week,start:'08:15',end:'09:00'}], Array(8).fill(defaultWeek()[0])]) {
    await assert.rejects(publishWeek(days), /invalid_reservation_input/);
  }
  await assert.rejects(publishWeek(defaultWeek(), ids.delegate, ids.space, 90), /invalid_reservation_schedule/);
  assert.equal((await db.query('SELECT count(*)::INTEGER n FROM reservation_slots')).rows[0].n, 0);
  await db.exec('SET ROLE anon');
  try { await assert.rejects(db.query('SELECT publish_reservation_week($1,$2,$3::JSONB,60)', [ids.space,week,JSON.stringify(defaultWeek())]), /permission denied/); }
  finally { await db.exec('RESET ROLE'); }
});

async function realtimeMigrationBody() {
  const sql = await readFile(new URL('../supabase/migrations/202610120005_reservation_realtime.sql', import.meta.url), 'utf8');
  return sql.replace(/^BEGIN;\r?\n/m, '').replace(/^COMMIT;\s*$/m, '');
}

test('realtime migration restores a missing read boundary without allowing forged broadcasts', async () => {
  await db.exec('BEGIN');
  try {
    await db.exec(`DROP TRIGGER broadcast_reservation_invalidation ON reservations;
      DROP TRIGGER broadcast_reservation_assignment_change ON delegate_places;
      DROP TRIGGER broadcast_reservation_place_removal ON places;
      DROP FUNCTION broadcast_reservation_invalidation(), broadcast_reservation_assignment_change(), broadcast_reservation_place_removal();
      DROP POLICY pinwi_reservation_receive ON realtime.messages;
      DROP POLICY pinwi_channel_receive_scope ON realtime.messages;
      DROP FUNCTION can_receive_reservation_channel(TEXT);`);
    await db.exec(await realtimeMigrationBody());
    await publish(); await reserve();
    await db.query("SELECT set_config('test.realtime_topic',$1,false)", ['reservations:user:' + ids.student]);
    assert.equal((await asUser(ids.student, 'SELECT topic FROM realtime.messages')).rows.length, 1);
    assert.equal((await asUser(ids.other, 'SELECT topic FROM realtime.messages')).rows.length, 0);
    await db.exec('SET ROLE authenticated');
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [ids.student]);
    await assert.rejects(db.query("INSERT INTO realtime.messages(extension,topic,payload) VALUES('broadcast',$1,'{}')", ['reservations:user:' + ids.student]), /row-level security/);
  } finally { await db.exec('ROLLBACK'); }
});

test('realtime migration identifies missing channel helpers or restrictive send permissions', async () => {
  const migration = await realtimeMigrationBody();
  for (const change of [
    'ALTER FUNCTION can_join_pinwi_channel(TEXT) RENAME TO missing_channel_helper',
    'DROP POLICY pinwi_channel_send_scope ON realtime.messages',
  ]) {
    await db.exec('BEGIN');
    try {
      await db.exec(change);
      await assert.rejects(db.exec(migration), /Falta la seguridad de canales de 202610120002_app_security.sql/);
    } finally { await db.exec('ROLLBACK'); }
  }
});

test('only active assigned managers can enable the pilot and publish slots', async () => {
  for (const user of [ids.student, ids.otherDelegate]) {
    await assert.rejects(asUser(user,'SELECT set_place_reservations_enabled($1,true)',[ids.place]), /reservation_manager_required/);
    await assert.rejects(asUser(user,'SELECT publish_reservation_slots($1,$2,$3,$4,60)',[ids.space,day,'08:00','09:00']), /reservation_manager_required/);
    await assert.rejects(asUser(user,'SELECT * FROM get_reservation_slots($1,true)',[ids.place]), /reservation_manager_required/);
  }
  await asUser(ids.admin,'SELECT set_managed_delegate_status((SELECT id FROM delegates WHERE user_id=$1),$2)',[ids.delegate,'suspended']);
  await assert.rejects(publish(), /reservation_manager_required/);
  await asUser(ids.admin,'SELECT set_managed_delegate_status((SELECT id FROM delegates WHERE user_id=$1),$2)',[ids.delegate,'active']);
  assert.equal((await publish()).rows[0].n, 4);
});
test('publication is atomic and rejects overlap, past dates and partial-duration ranges', async () => {
  await publish();
  await assert.rejects(publish(ids.space,'07:00','09:00'), /reservation_schedule_overlap/);
  await assert.rejects(publish(ids.space,'13:00','14:30'), /invalid_reservation_schedule/);
  await assert.rejects(asUser(ids.delegate,'SELECT publish_reservation_slots($1,$2,$3,$4,60)',[ids.space,'2000-01-01','08:00','09:00']), /invalid_reservation_schedule/);
  assert.equal((await db.query('SELECT count(*)::INTEGER n FROM reservation_slots')).rows[0].n,4);
});
test('whole-space bookings are exclusive, while the second space is independent', async () => {
  await publish(); await publish(ids.secondSpace);
  await reserve();
  await assert.rejects(reserve(ids.other), /reservation_slot_taken/);
  await reserve(ids.other,await slot(ids.secondSpace));
  assert.equal((await db.query('SELECT count(*)::INTEGER n FROM reservations')).rows[0].n,2);
  assert.equal((await db.query('SELECT count(*)::INTEGER n FROM notifications WHERE title=$1',['Nueva solicitud de reserva'])).rows[0].n,2);
});
test('server derives owner, space, dates and zero payment; retries are idempotent and cannot change payload', async () => {
  await publish(); const request = crypto.randomUUID(); const s = await slot();
  const first = await reserve(ids.student,s,3,request,'Reunion');
  assert.equal(await reserve(ids.student,s,3,request,'Reunion'),first);
  await assert.rejects(reserve(ids.student,s,2,request,'Reunion'), /reservation_retry_mismatch/);
  const row = (await db.query('SELECT * FROM reservations WHERE id=$1',[first])).rows[0];
  assert.equal(row.user_id,ids.student); assert.equal(row.space_id,ids.space); assert.equal(row.guests_count,3);
  assert.equal(row.space_name,'space'); assert.equal(row.total_amount,'0.00'); assert.equal(row.payment_method,'trial_no_payment');
  assert.equal(row.payment_status,'pending'); assert.equal(row.status,'pending'); assert.equal(row.is_trial,true);
  await assert.rejects(asUser(ids.student,"INSERT INTO reservations(user_id,place_id,reservation_dates,start_time,end_time,total_amount) VALUES($1,$2,ARRAY[$3::DATE],'08:00','09:00',0)",[ids.student,ids.place,day]), /permission denied/);
  await assert.rejects(asUser(ids.delegate,"UPDATE reservations SET status='confirmed' WHERE id=$1",[first]), /reservation_rpc_required/);
});
test('verified email, group capacity, notes length and active place are mandatory', async () => {
  await publish(); const s=await slot();
  await assert.rejects(reserve(ids.unverified,s), /reservation_account_required/);
  await assert.rejects(reserve(ids.student,s,5), /reservation_slot_unavailable/);
  await assert.rejects(reserve(ids.student,s,0), /invalid_reservation_input/);
  await assert.rejects(reserve(ids.student,s,2,crypto.randomUUID(),'x'.repeat(501)), /invalid_reservation_input/);
  await db.query("UPDATE users SET status='blocked' WHERE id=$1",[ids.student]);
  await assert.rejects(reserve(ids.student,s), /reservation_account_required/);
  await db.query("UPDATE users SET status='active' WHERE id=$1",[ids.student]);
  await db.query("UPDATE places SET status='inactive' WHERE id=$1",[ids.place]);
  await assert.rejects(reserve(ids.student,s), /reservation_place_unavailable/);
});
test('disabling pilot preserves existing reservations and blocks new ones; reserved slots cannot be withdrawn', async () => {
  await publish(); const s=await slot(); const id=await reserve(ids.student,s);
  await assert.rejects(asUser(ids.delegate,'SELECT set_reservation_slot_enabled($1,false)',[s]), /reservation_slot_has_booking/);
  await asUser(ids.delegate,'SELECT set_place_reservations_enabled($1,false)',[ids.place]);
  await assert.rejects(reserve(ids.other,await slot(ids.space,1)), /reservation_place_unavailable/);
  assert.equal((await asUser(ids.student,'SELECT id FROM reservations')).rows[0].id,id);
});
test('only assigned manager can approve, owner can cancel pending or confirmed and release slot', async () => {
  await publish(); const id=await reserve();
  for(const user of [ids.other, ids.otherDelegate, ids.student]) await assert.rejects(asUser(user,"SELECT transition_trial_reservation($1,'confirmed')",[id]), /reservation_not_found_or_forbidden/);
  await asUser(ids.delegate,"SELECT transition_trial_reservation($1,'confirmed')",[id]);
  assert.equal((await db.query('SELECT count(*)::INTEGER n FROM notifications WHERE user_id=$1',[ids.student])).rows[0].n,1);
  await assert.rejects(asUser(ids.delegate,"SELECT transition_trial_reservation($1,'completed')",[id]), /invalid_reservation_transition/);
  await asUser(ids.student,"SELECT transition_trial_reservation($1,'cancelled')",[id]);
  await reserve(ids.other);
  await assert.rejects(asUser(ids.delegate,"SELECT transition_trial_reservation($1,'confirmed')",[id]), /invalid_reservation_transition/);
});
test('reservation identities and notes are private; manager sees only assigned bookings and shared names', async () => {
  await publish(); const id=await reserve();
  assert.equal((await asUser(ids.student,'SELECT id FROM reservations')).rows.length,1);
  assert.equal((await asUser(ids.delegate,'SELECT id FROM reservations')).rows.length,1);
  for(const user of [ids.other,ids.otherDelegate]) assert.equal((await asUser(user,'SELECT id FROM reservations')).rows.length,0);
  const slots=(await asUser(ids.other,'SELECT * FROM get_reservation_slots($1,false)',[ids.place])).rows;
  assert.equal(slots[0].reserved,true); assert.equal('user_id' in slots[0],false);
  assert.equal((await asUser(ids.delegate,'SELECT name FROM get_shared_profiles($1,false)',[[ids.student]])).rows.length,1);
  await db.query("UPDATE users SET status='blocked' WHERE id=$1",[ids.student]);
  assert.equal((await asUser(ids.student,'SELECT id FROM reservations')).rows.length,0);
});
test('space updates retain IDs and bookings, reject shrinking/deleting booked spaces atomically', async () => {
  await publish(); const id=await reserve(ids.student,undefined,3);
  const payload = (await db.query('SELECT * FROM place_spaces WHERE place_id=$1 ORDER BY name',[ids.place])).rows;
  const first=payload.find((row)=>row.id===ids.space); first.name='Nombre nuevo';
  await asUser(ids.delegate,'SELECT * FROM replace_place_spaces($1,$2::JSONB)',[ids.place,JSON.stringify(payload)]);
  assert.equal((await db.query('SELECT space_name FROM reservations WHERE id=$1',[id])).rows[0].space_name,'space');
  assert.equal((await db.query('SELECT count(*)::INTEGER n FROM reservation_slots')).rows[0].n,4);
  first.capacity=2;
  await assert.rejects(asUser(ids.delegate,'SELECT * FROM replace_place_spaces($1,$2::JSONB)',[ids.place,JSON.stringify(payload)]), /reservation_space_has_booking/);
  assert.equal((await db.query('SELECT capacity FROM place_spaces WHERE id=$1',[ids.space])).rows[0].capacity,4);
  await assert.rejects(asUser(ids.delegate,"SELECT * FROM replace_place_spaces($1,'[]'::JSONB)",[ids.place]), /reservation_space_has_booking/);
});
test('server limits successful requests per account and unique slot index is a final guard', async () => {
  await publish(ids.space,'08:00','20:00');
  for(let i=0;i<5;i++) await reserve(ids.student,await slot(ids.space,i));
  await assert.rejects(reserve(ids.student,await slot(ids.space,5)), /reservation_rate_limit/);
  const rows=(await db.query('SELECT * FROM reservations ORDER BY created_at')).rows;
  const r=rows[0];
  await assert.rejects(db.query(`INSERT INTO reservations(user_id,place_id,reservation_dates,start_time,end_time,total_amount,slot_id)
    VALUES($1,$2,$3,$4,$5,0,$6)`,[ids.other,ids.place,r.reservation_dates,r.start_time,r.end_time,r.slot_id]), /reservations_exclusive_slot/);
});
test('anonymous callers cannot execute pilot RPCs or access availability tables', async () => {
  await db.exec('SET ROLE anon');
  try {
    await assert.rejects(db.query('SELECT get_place_reservation_config($1)',[ids.place]), /permission denied/);
    await assert.rejects(db.query('SELECT * FROM reservation_slots'), /permission denied/);
  } finally { await db.exec('RESET ROLE'); }
});
test('administrator permanent place deletion still cascades with booked slots', async () => {
  await publish(); await reserve();
  await db.exec('BEGIN');
  try {
    await asUser(ids.admin,'SELECT delete_managed_place($1)',[ids.place]);
    assert.equal((await db.query('SELECT count(*)::INTEGER n FROM reservations')).rows[0].n,0);
    assert.equal((await db.query('SELECT count(*)::INTEGER n FROM reservation_slots')).rows[0].n,0);
  } finally { await db.exec('ROLLBACK'); }
});
test('database changes broadcast only an invalidation to owner and assigned delegates, including deletes', async () => {
  await publish(); const id=await reserve();
  let messages=(await db.query('SELECT topic,payload,event,private FROM realtime.messages')).rows;
  assert.deepEqual(messages.map(x=>x.topic).sort(),[ids.student,ids.delegate].map(x=>'reservations:user:'+x).sort());
  for(const message of messages){assert.deepEqual(message.payload,{changed:true});assert.equal(message.event,'reservations_changed');assert.equal(message.private,true);}
  await db.exec('DELETE FROM realtime.messages');
  await asUser(ids.delegate,"SELECT transition_trial_reservation($1,'confirmed')",[id]);
  assert.equal((await db.query('SELECT count(*)::INTEGER n FROM realtime.messages')).rows[0].n,2);
  await db.exec('DELETE FROM realtime.messages');
  await db.query('DELETE FROM reservations WHERE id=$1',[id]);
  assert.equal((await db.query('SELECT count(*)::INTEGER n FROM realtime.messages')).rows[0].n,2);
});
test('reservation channels enforce exact account scope even with legacy policies; browser cannot publish', async () => {
  await publish(); await reserve();
  await db.exec('CREATE POLICY legacy_realtime_read ON realtime.messages FOR SELECT TO authenticated USING(true); CREATE POLICY legacy_realtime_write ON realtime.messages FOR INSERT TO authenticated WITH CHECK(true);');
  try {
    await db.query("SELECT set_config('test.realtime_topic',$1,false)",['reservations:user:'+ids.student]);
    assert.equal((await asUser(ids.student,'SELECT topic FROM realtime.messages')).rows.length,1);
    assert.equal((await asUser(ids.other,'SELECT topic FROM realtime.messages')).rows.length,0);
    await assert.rejects(asUser(ids.student,"INSERT INTO realtime.messages(extension,topic,payload) VALUES('broadcast',$1,'{}')",['reservations:user:'+ids.student]),/row-level security/);
    await db.query("UPDATE users SET status='blocked' WHERE id=$1",[ids.student]);
    assert.equal((await asUser(ids.student,'SELECT topic FROM realtime.messages')).rows.length,0);
  } finally { await db.exec('DROP POLICY legacy_realtime_read ON realtime.messages; DROP POLICY legacy_realtime_write ON realtime.messages;'); }
});
test('removing an assignment notifies its delegate and removes access to reservation records', async () => {
  await publish(); await reserve();await db.exec('DELETE FROM realtime.messages; BEGIN');
  try{
    await db.query('DELETE FROM delegate_places WHERE place_id=$1',[ids.place]);
    assert.equal((await db.query('SELECT topic FROM realtime.messages')).rows[0].topic,'reservations:user:'+ids.delegate);
    assert.equal((await asUser(ids.delegate,'SELECT id FROM reservations')).rows.length,0);
  }finally{await db.exec('ROLLBACK');}
});
test('the reservation read policy keeps existing private presence and authorized typing channels working', async () => {
  await db.query("INSERT INTO messages(sender_id,receiver_id,message) VALUES($1,$2,'Consulta')",[ids.student,ids.other]);
  for(const [topic,extension] of [['online-users','presence'],['typing-'+ids.student+'-'+ids.other,'broadcast']]){
    await db.query("SELECT set_config('test.realtime_topic',$1,false)",[topic]);
    await asUser(ids.student,'INSERT INTO realtime.messages(extension,topic) VALUES($1,$2)',[extension,topic]);
    assert.equal((await asUser(ids.student,'SELECT topic FROM realtime.messages WHERE topic=$1',[topic])).rows.length,1);
  }
});
