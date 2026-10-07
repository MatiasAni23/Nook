import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';

// Real PostgreSQL policies, triggers and transactions; no Supabase credentials or network.
const db = new PGlite();
const ids = Object.fromEntries(['admin', 'student', 'other', 'unverified', 'placeA', 'placeB', 'reservation']
  .map((key, i) => [key, `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`]));
const migration = await readFile(new URL('../supabase/migrations/202610060001_delegate_integrity.sql', import.meta.url), 'utf8');

async function asUser(id, sql, parameters = []) {
  await db.exec('SET ROLE authenticated');
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id]);
  try { return await db.query(sql, parameters); }
  finally { await db.exec('RESET ROLE'); }
}

async function save(email, places, id = null, status = 'active') {
  return (await asUser(ids.admin, 'SELECT save_managed_delegate($1, $2, $3, $4, $5, $6, $7) id',
    [id, email, 'Delegado', '', status, false, places])).rows[0].id;
}

async function invite(email, places, { status = 'pending', expires = '2099-01-01' } = {}) {
  return (await db.query(`INSERT INTO delegate_invitations (email, name, assigned_place_ids, status, expires_at, invited_by)
    VALUES ($1, 'Invitado', $2, $3, $4, $5) RETURNING token`, [email, places, status, expires, ids.admin])).rows[0].token;
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
  const baseline = await readFile(new URL('../supabase/schema/pinwi_schema_supabase.sql', import.meta.url), 'utf8');
  // PGlite already supplies gen_random_uuid; the Supabase pgcrypto extension isn't needed by these tests.
  await db.exec(baseline.replace('CREATE EXTENSION IF NOT EXISTS pgcrypto;', ''));
  // Reproduce a deployed variant with a different return type and argument name.
  await db.exec(`DROP FUNCTION public.claim_delegate_invitation(UUID);
    CREATE FUNCTION public.claim_delegate_invitation(legacy_token UUID)
    RETURNS TABLE(delegate_id UUID) LANGUAGE sql AS $$ SELECT legacy_token; $$;`);
  // Hosted-only legacy helpers/policies found during the remote schema review.
  await db.exec(`CREATE FUNCTION public.is_current_user_assigned_to_place(target_place_id UUID)
    RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
      SELECT EXISTS (SELECT 1 FROM delegates d JOIN delegate_places dp ON dp.delegate_id = d.id
        WHERE d.user_id = auth.uid() AND d.status = 'active' AND dp.place_id = target_place_id);
    $$;
    CREATE POLICY places_select_manager ON public.places FOR SELECT
      USING (is_current_user_admin() OR is_current_user_assigned_to_place(id));
    CREATE FUNCTION public.deliver_pending_place_contacts(target_place_id UUID, target_delegate_user_id UUID)
    RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN; END; $$;`);
  await db.exec(migration);
  await db.exec(await readFile(new URL('../supabase/migrations/202610060002_private_profiles_messages.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202610060003_legacy_message_receipts.sql', import.meta.url), 'utf8'));
  for (const name of ['admin', 'student', 'other', 'unverified']) {
    await db.query(`INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data)
      VALUES ($1, $2, $3, $4)`, [ids[name], `${name}@pinwi.test`, name === 'unverified' ? null : new Date(),
      JSON.stringify({ role: name === 'admin' ? 'admin' : 'student' })]);
  }
  await db.query("UPDATE users SET role = 'admin' WHERE id = $1", [ids.admin]);
  for (const name of ['placeA', 'placeB']) {
    await db.query(`INSERT INTO places (id, name, type, category, address, latitude, longitude)
      VALUES ($1, $2, 'coworking', 'work', 'Santiago', -33.45, -70.66)`, [ids[name], name]);
  }
});
after(async () => { await db.close(); });

test('migration can be applied twice without deleting existing rows', async () => {
  await db.exec(migration);
  assert.equal((await db.query('SELECT count(*)::int n FROM users')).rows[0].n, 4);
});

test('migration replaces a legacy invitation RPC and restores its restricted grants', async () => {
  const metadata = (await db.query(`SELECT pg_get_function_result(p.oid) result,
    p.proargnames, p.prosecdef,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') authenticated,
    has_function_privilege('anon', p.oid, 'EXECUTE') anonymous
    FROM pg_proc p WHERE p.oid = 'public.claim_delegate_invitation(uuid)'::regprocedure`)).rows[0];
  assert.equal(metadata.result, 'void');
  assert.deepEqual(metadata.proargnames, ['invitation_token']);
  assert.equal(metadata.prosecdef, true);
  assert.equal(metadata.authenticated, true);
  assert.equal(metadata.anonymous, false);
});

test('signup metadata cannot grant admin and clients cannot forge roles, identity or status', async () => {
  const id = '00000000-0000-4000-8000-000000000090';
  await db.query(`INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, 'forged@pinwi.test', '{"role":"admin"}')`, [id]);
  assert.equal((await db.query('SELECT role FROM users WHERE id = $1', [id])).rows[0].role, 'student');
  for (const change of ["role = 'admin'", "role = 'delegate'", "status = 'verified'", "email = 'other@pinwi.test'", 'email_verified = false']) {
    await assert.rejects(asUser(ids.student, `UPDATE users SET ${change} WHERE id = $1 RETURNING id`, [ids.student]), undefined, change);
  }
  await asUser(ids.student, "UPDATE users SET name = 'Nombre valido' WHERE id = $1", [ids.student]);
  await assert.rejects(asUser(ids.student, `INSERT INTO users (id, email) VALUES (gen_random_uuid(), 'fake@pinwi.test')`), /permission denied/);
});

test('only admins manage delegates; invalid assignment replacement rolls back all changes', async () => {
  await assert.rejects(asUser(ids.student, 'SELECT save_managed_delegate(NULL, $1, $2, $3, $4, false, $5)',
    ['student@pinwi.test', 'No', '', 'active', [ids.placeA]]), /admin_required/);
  const id = await save('student@pinwi.test', [ids.placeA, ids.placeA]);
  await asUser(ids.admin, 'SELECT set_managed_delegate_subscription($1, true)', [id]);
  assert.equal((await db.query('SELECT subscription_active FROM delegates WHERE id = $1', [id])).rows[0].subscription_active, true);
  await assert.rejects(asUser(ids.student, 'SELECT set_managed_delegate_subscription($1, false)', [id]), /admin_required/);
  await assert.rejects(save('student@pinwi.test', ['00000000-0000-4000-8000-000000000099'], id), /invalid_delegate_places/);
  const assignments = await db.query('SELECT place_id FROM delegate_places WHERE delegate_id = $1', [id]);
  assert.deepEqual(assignments.rows.map(r => r.place_id), [ids.placeA]);
  // Force a failure AFTER deleting the old assignments, to verify transaction rollback.
  await db.exec(`CREATE FUNCTION reject_test_assignment() RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'simulated_assignment_failure'; END; $$;
    CREATE TRIGGER reject_test_assignment AFTER INSERT ON delegate_places
    FOR EACH ROW EXECUTE FUNCTION reject_test_assignment();`);
  try {
    await assert.rejects(save('student@pinwi.test', [ids.placeB], id, 'suspended'), /simulated_assignment_failure/);
    assert.deepEqual((await db.query('SELECT place_id FROM delegate_places WHERE delegate_id = $1', [id])).rows.map(r => r.place_id), [ids.placeA]);
    assert.equal((await db.query('SELECT status FROM users WHERE id = $1', [ids.student])).rows[0].status, 'active');
    assert.equal((await db.query('SELECT status FROM delegates WHERE id = $1', [id])).rows[0].status, 'active');
  } finally { await db.exec('DROP TRIGGER reject_test_assignment ON delegate_places; DROP FUNCTION reject_test_assignment();'); }
  await assert.rejects(save('other@pinwi.test', [ids.placeB], id), /delegate_identity_mismatch/);
  assert.equal((await db.query('SELECT role FROM users WHERE id = $1', [ids.other])).rows[0].role, 'student');
  await assert.rejects(asUser(ids.admin, 'DELETE FROM delegate_places WHERE delegate_id = $1', [id]), /permission denied/);
});

test('delegate can edit own place but cannot edit, delete or add children/images to another place', async () => {
  assert.equal((await asUser(ids.student, "UPDATE places SET name = 'Propio' WHERE id = $1 RETURNING id", [ids.placeA])).rows.length, 1);
  assert.equal((await asUser(ids.student, "UPDATE places SET name = 'Ajeno' WHERE id = $1 RETURNING id", [ids.placeB])).rows.length, 0);
  assert.equal((await asUser(ids.student, 'DELETE FROM places WHERE id = $1 RETURNING id', [ids.placeB])).rows.length, 0);
  await assert.rejects(asUser(ids.student, `INSERT INTO place_amenities (place_id, amenity_key, amenity_name)
    VALUES ($1, 'wifi', 'WiFi')`, [ids.placeB]), /row-level security/);
  await assert.rejects(asUser(ids.student, `INSERT INTO place_spaces (place_id, name, capacity, price_per_hour)
    VALUES ($1, 'Sala', 2, 1000)`, [ids.placeB]), /row-level security/);
  await assert.rejects(asUser(ids.student, `INSERT INTO storage.objects (bucket_id, name) VALUES ('place-images', $1)`, [`${ids.placeB}/image.png`]), /row-level security/);
  await asUser(ids.student, `INSERT INTO storage.objects (bucket_id, name) VALUES ('place-images', $1)`, [`${ids.placeA}/image.png`]);
  for (const change of ["plan_type = 'basic_premium'", 'verified = true', 'rating = 5']) {
    await assert.rejects(asUser(ids.student, `UPDATE places SET ${change} WHERE id = $1`, [ids.placeA]), /place_admin_fields/);
  }
});

test('new delegate places auto-assign and inactive owned places remain manageable', async () => {
  const created = (await asUser(ids.student, `INSERT INTO places (name, type, category, address, latitude, longitude, created_by)
    VALUES ('Nuevo', 'cafe', 'study', 'Valparaiso', -33.04, -71.62, $1) RETURNING id`, [ids.student])).rows[0].id;
  assert.equal((await asUser(ids.student, 'SELECT is_current_user_delegate_for_place($1) allowed', [created])).rows[0].allowed, true);
  await asUser(ids.student, "UPDATE places SET status = 'inactive' WHERE id = $1", [created]);
  assert.equal((await asUser(ids.student, 'SELECT id FROM places WHERE id = $1', [created])).rows.length, 1);
});

test('reviews and favorites still update server-owned aggregates without place write access', async () => {
  await asUser(ids.student, 'INSERT INTO reviews (user_id, place_id, rating) VALUES ($1, $2, 4)', [ids.student, ids.placeA]);
  await asUser(ids.unverified, 'INSERT INTO reviews (user_id, place_id, rating) VALUES ($1, $2, 5)', [ids.unverified, ids.placeB]);
  await asUser(ids.student, 'INSERT INTO favorites (user_id, place_id) VALUES ($1, $2)', [ids.student, ids.placeB]);
  const place = (await db.query('SELECT rating::float, reviews_count, favorites_count FROM places WHERE id = $1', [ids.placeB])).rows[0];
  assert.deepEqual(place, { rating: 5, reviews_count: 1, favorites_count: 1 });
  await assert.rejects(asUser(ids.student, 'SELECT refresh_place_rating($1)', [ids.placeB]), /permission denied/);
  await asUser(ids.student, 'DELETE FROM favorites WHERE user_id = $1 AND place_id = $2', [ids.student, ids.placeB]);
  assert.equal((await db.query('SELECT favorites_count FROM places WHERE id = $1', [ids.placeB])).rows[0].favorites_count, 0);
});

test('pending/suspended/blocked delegates lose write permissions, even with assignments', async () => {
  const id = (await db.query('SELECT id FROM delegates WHERE user_id = $1', [ids.student])).rows[0].id;
  for (const state of ['pending', 'suspended']) {
    await asUser(ids.admin, 'SELECT set_managed_delegate_status($1, $2)', [id, state]);
    assert.equal((await asUser(ids.student, "UPDATE places SET name = 'No' WHERE id = $1 RETURNING id", [ids.placeA])).rows.length, 0);
    await assert.rejects(asUser(ids.student, `INSERT INTO storage.objects (bucket_id, name) VALUES ('place-images', $1)`, [`${ids.placeA}/no.png`]), /row-level security/);
  }
  await asUser(ids.admin, "SELECT set_managed_delegate_status($1, 'active')", [id]);
  await db.query("UPDATE users SET status = 'blocked' WHERE id = $1", [ids.student]);
  assert.equal((await asUser(ids.student, 'SELECT is_current_user_delegate_for_place($1) allowed', [ids.placeA])).rows[0].allowed, false);
  assert.equal((await asUser(ids.student, 'SELECT is_current_user_assigned_to_place($1) allowed', [ids.placeA])).rows[0].allowed, false);
  assert.equal((await asUser(ids.student, "SELECT id FROM places WHERE status = 'inactive'")).rows.length, 0);
  await assert.rejects(asUser(ids.admin, "SELECT set_managed_delegate_status($1, 'active')", [id]), /delegate_account_blocked/);
  await db.query("UPDATE users SET status = 'active' WHERE id = $1", [ids.student]);
});

test('internal pending-contact delivery cannot be called by anonymous or authenticated clients', async () => {
  await assert.rejects(asUser(ids.student, 'SELECT deliver_pending_place_contacts($1, $2)', [ids.placeA, ids.student]), /permission denied/);
  await db.exec('SET ROLE anon');
  try {
    await assert.rejects(db.query('SELECT deliver_pending_place_contacts($1, $2)', [ids.placeA, ids.student]), /permission denied/);
  } finally { await db.exec('RESET ROLE'); }
});

test('invitation requires the matching verified email and rejects expired/revoked invitations', async () => {
  const token = await invite('other@pinwi.test', [ids.placeB]);
  await assert.rejects(asUser(ids.student, 'SELECT claim_delegate_invitation($1)', [token]), /email_mismatch_or_unverified/);
  const unverified = await invite('unverified@pinwi.test', [ids.placeA]);
  await assert.rejects(asUser(ids.unverified, 'SELECT claim_delegate_invitation($1)', [unverified]), /email_mismatch_or_unverified/);
  for (const options of [{ status: 'revoked' }, { expires: '2000-01-01' }]) {
    const invalid = await invite('other@pinwi.test', [ids.placeA], options);
    await assert.rejects(asUser(ids.other, 'SELECT claim_delegate_invitation($1)', [invalid]), /invalid_delegate_invitation/);
  }
  await asUser(ids.other, 'SELECT claim_delegate_invitation($1)', [token]);
  await asUser(ids.other, 'SELECT claim_delegate_invitation($1)', [token]); // retry is safe
  const extra = await invite('other@pinwi.test', [ids.placeA]);
  await asUser(ids.other, 'SELECT claim_delegate_invitation($1)', [extra]);
  const places = await db.query('SELECT place_id FROM delegate_places dp JOIN delegates d ON d.id = dp.delegate_id WHERE d.user_id = $1 ORDER BY place_id', [ids.other]);
  assert.deepEqual(places.rows.map(r => r.place_id), [ids.placeA, ids.placeB]);
});

test('invalid invitation assignments leave role, delegate and invitation untouched', async () => {
  await db.query('UPDATE auth.users SET email_confirmed_at = now() WHERE id = $1', [ids.unverified]);
  const token = await invite('unverified@pinwi.test', ['00000000-0000-4000-8000-000000000099']);
  await assert.rejects(asUser(ids.unverified, 'SELECT claim_delegate_invitation($1)', [token]), /invalid_delegate_places/);
  assert.equal((await db.query('SELECT role FROM users WHERE id = $1', [ids.unverified])).rows[0].role, 'student');
  assert.equal((await db.query('SELECT status FROM delegate_invitations WHERE token = $1', [token])).rows[0].status, 'pending');
});

test('reservation transitions enforce ownership, immutable amount and terminal states', async () => {
  await db.query(`INSERT INTO reservations (id, user_id, place_id, reservation_dates, start_time, end_time, total_amount)
    VALUES ($1, $2, $3, ARRAY['2026-11-01']::DATE[], '09:00', '10:00', 1000)`, [ids.reservation, ids.unverified, ids.placeB]);
  await assert.rejects(asUser(ids.student, "SELECT transition_delegate_reservation($1, 'confirmed')", [ids.reservation]), /not_found_or_forbidden/);
  await assert.rejects(asUser(ids.unverified, "UPDATE reservations SET status = 'confirmed' WHERE id = $1", [ids.reservation]), /transition_forbidden/);
  await assert.rejects(asUser(ids.other, 'UPDATE reservations SET total_amount = 0 WHERE id = $1', [ids.reservation]), /status_only/);
  await asUser(ids.other, "SELECT transition_delegate_reservation($1, 'confirmed')", [ids.reservation]);
  await assert.rejects(asUser(ids.other, "SELECT transition_delegate_reservation($1, 'rejected')", [ids.reservation]), /invalid_reservation_transition/);
  await asUser(ids.other, "SELECT transition_delegate_reservation($1, 'completed')", [ids.reservation]);
  await assert.rejects(asUser(ids.other, "UPDATE reservations SET status = 'pending' WHERE id = $1", [ids.reservation]), /invalid_reservation_transition/);
});

test('removing delegate restores original role and deletes assignments without deleting account', async () => {
  const id = (await db.query('SELECT id FROM delegates WHERE user_id = $1', [ids.other])).rows[0].id;
  await asUser(ids.admin, 'SELECT delete_managed_delegate($1)', [id]);
  assert.equal((await db.query('SELECT role FROM users WHERE id = $1', [ids.other])).rows[0].role, 'student');
  assert.equal((await db.query('SELECT count(*)::int n FROM delegate_places WHERE delegate_id = $1', [id])).rows[0].n, 0);
  await assert.rejects(asUser(ids.admin, 'SELECT delete_managed_delegate($1)', [id]), /delegate_not_found/);
});

test('anonymous callers cannot invoke delegate management or invitation acceptance', async () => {
  await db.exec('SET ROLE anon');
  try {
    await db.query("SELECT set_config('request.jwt.claim.sub', '', false)");
    await assert.rejects(db.query('SELECT claim_delegate_invitation($1)', [ids.placeA]), /permission denied/);
    await assert.rejects(db.query('SELECT delete_managed_delegate($1)', [ids.placeA]), /permission denied/);
  } finally { await db.exec('RESET ROLE'); }
});
