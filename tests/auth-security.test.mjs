import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { webcrypto } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

const now = Date.parse('2026-10-12T18:00:00Z');
const email = 'account@pinwi.test';
const goodPassword = 'Una frase larga y exclusiva 2026';
const id = '90000000-0000-4000-8000-000000000001';

function edgeHarness(entry = 'complete-password-recovery', config = {}) {
  const calls = [];
  const logs = [];
  let handler;
  const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service', BREVO_API_KEY: 'provider', ...config.env };
  const client = {
    rpc: async (name, args) => { calls.push(['limit', args]); return config.rateResult ?? { data: { allowed: true }, error: null }; },
    auth: {
      verifyOtp: async (input) => { calls.push(['verify', input]); return config.verifyResult ?? { data: { user: { id, recovery_sent_at: new Date(now - 60000).toISOString() }, session: { access_token: 'private-token' } }, error: null }; },
      getUser: async () => ({ data: { user: { id, email_confirmed_at: new Date(now).toISOString() } }, error: null }),
      admin: { updateUserById: async (...args) => { calls.push(['update', ...args]); return { error: config.updateError ?? null }; } },
      signOut: async (args) => { calls.push(['signout', args]); return { error: config.signOutError ?? null }; },
    },
    from: (table) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: table === 'users' ? { role: config.role ?? 'admin', status: 'active' } : config.invitation, error: null }) }) }) }),
  };
  const cache = new Map();
  const context = vm.createContext({
    Request, Response, Headers, URL, TextEncoder, TextDecoder, Uint8Array, AbortSignal, crypto: webcrypto,
    Date: class extends Date { static now() { return now; } },
    Deno: { env: { get: (name) => env[name] }, serve: (fn) => { handler = fn; } },
    console: { error: (...args) => logs.push(args) },
    fetch: async (...args) => { calls.push(['fetch', args[0], args[1]?.body]); return config.fetchResult ?? new Response('{}'); },
  });
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const source = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const execute = vm.runInContext('(function(exports, require, module) {' + source + '\n})', context);
    execute(module.exports, (specifier) => specifier.startsWith('https://') ? { createClient: () => client } : load(resolve(dirname(file), specifier)), module);
    return module.exports;
  }
  load(resolve('supabase/functions', entry, 'index.ts'));
  const invoke = (body = { email, code: '123456', password: goodPassword }, options = {}) => handler(new Request('https://example.test/function', {
    method: options.method ?? 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://www.pinwi.cl', Authorization: 'Bearer test', ...options.headers },
    ...((options.method ?? 'POST') === 'POST' ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
  }));
  return { invoke, calls, logs, load, env };
}

test('password policy requires length independently of character classes and supports passphrases', () => {
  const { getPasswordValidationMessage: validate } = edgeHarness().load(resolve('supabase/functions/_shared/passwordPolicy.ts'));
  for (const bad of ['Aa1!', 'Aa1!bcd', 'a'.repeat(20), 'abcd'.repeat(8), ' '.repeat(20), 'valid password\ncontrol', 'x'.repeat(129)]) assert.ok(validate(bad));
  assert.equal(validate('Aa1!bcde'), ''); // Exactly eight characters.
  assert.equal(validate('abcdefgh'), ''); // No forced character classes.
  assert.equal(validate(goodPassword), '');
  assert.equal(validate('Una frase con ñ y espacios'), '');
  assert.ok(validate('😀abC1!ñ')); // Seven code points despite eight UTF-16 units.
  assert.equal(validate('😀abC1!ñZ'), ''); // Eight Unicode code points.
});

test('recovery rejects malformed, oversized and cross-origin inputs without touching Auth', async () => {
  for (const [body, options, status] of [
    [{ email, code: '123456', password: 'Aa1!' }, {}, 400],
    [{ email: {}, code: '123456', password: goodPassword }, {}, 400],
    [{ email, code: 'ABC123', password: goodPassword }, {}, 400],
    ['{invalid', {}, 400], ['[]', {}, 400],
    [JSON.stringify({ huge: 'x'.repeat(17000) }), {}, 413],
    [{}, { headers: { Origin: 'https://attacker.test' } }, 403],
    [{}, { headers: { 'Content-Type': 'text/plain' } }, 415],
    [{}, { method: 'GET' }, 405],
  ]) {
    const h = edgeHarness(); const response = await h.invoke(body, options);
    assert.equal(response.status, status); assert.equal(h.calls.length, 0); assert.deepEqual(h.logs, []);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  }
});

test('distributed rate limits return 429 with Retry-After and fail closed on a database error', async () => {
  for (const [rateResult, status, retry] of [
    [{ data: { allowed: false, retry_after: 900 }, error: null }, 429, '900'],
    [{ data: null, error: { message: 'private database detail' } }, 503, null],
  ]) {
    const h = edgeHarness('complete-password-recovery', { rateResult });
    const response = await h.invoke(); assert.equal(response.status, status);
    assert.equal(response.headers.get('Retry-After'), retry);
    assert.equal(h.calls.some(([type]) => type === 'verify' || type === 'update'), false);
    assert.match(h.calls[0][1].subject_hash, /^[a-f0-9]{64}$/);
    assert.equal(JSON.stringify(await response.json()).includes('private database detail'), false);
  }
});

test('recovery enforces ten-minute server expiry and never accepts a browser timestamp', async () => {
  for (const sent of [null, new Date(now - 600000).toISOString(), new Date(now + 120000).toISOString()]) {
    const h = edgeHarness('complete-password-recovery', { verifyResult: { data: { user: { id, recovery_sent_at: sent }, session: {} }, error: null } });
    const response = await h.invoke({ email, code: '123456', password: goodPassword, sentAt: new Date(now).toISOString() });
    assert.equal(response.status, 400); assert.equal((await response.json()).error, 'invalid_or_expired_code');
    assert.equal(h.calls.some(([type]) => type === 'update'), false);
    assert.equal(h.calls.at(-1)[1].scope, 'local');
  }
});

test('invalid or reused OTPs cannot change passwords; success revokes global sessions and returns no tokens', async () => {
  const denied = edgeHarness('complete-password-recovery', { verifyResult: { data: { user: null, session: null }, error: { message: 'OTP already used' } } });
  assert.equal((await denied.invoke()).status, 400);
  assert.equal(denied.calls.some(([type]) => type === 'update'), false);
  const h = edgeHarness(); const response = await h.invoke();
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { ok: true });
  assert.deepEqual(h.calls.map(([type]) => type), ['limit', 'limit', 'verify', 'update', 'signout']);
  assert.equal(h.calls.at(-1)[1].scope, 'global'); assert.deepEqual(h.logs, []);
  const failed = edgeHarness('complete-password-recovery', { signOutError: { message: 'failed' } });
  assert.equal((await failed.invoke()).status, 500);
});

test('CAPTCHA is required and validated on the server when configured', async () => {
  const missing = edgeHarness('complete-password-recovery', { env: { TURNSTILE_SECRET_KEY: 'test-secret' } });
  assert.equal((await missing.invoke()).status, 400); assert.equal(missing.calls.length, 0);
  for (const [hostname, success, expected] of [['www.pinwi.cl', true, 200], ['attacker.test', true, 400], ['www.pinwi.cl', false, 400]]) {
    const h = edgeHarness('complete-password-recovery', { env: { TURNSTILE_SECRET_KEY: 'test-secret' }, fetchResult: new Response(JSON.stringify({ success, hostname })) });
    assert.equal((await h.invoke({ email, code: '123456', password: goodPassword, captchaToken: 'test-token' })).status, expected);
    if (expected !== 200) assert.equal(h.calls.some(([type]) => type === 'update'), false);
  }
});

test('delegate emails require an active admin, a live invitation and its exact trusted link', async () => {
  const token = '90000000-0000-4000-8000-000000000002';
  const invitation = { id, email, name: 'Invitado', token, status: 'pending', expires_at: new Date(now + 60000).toISOString() };
  const body = { invitationId: id, email, name: 'untrusted client name', inviteUrl: 'https://www.pinwi.cl/delegate-invite?token=' + token };
  for (const [config, input, status] of [
    [{ invitation }, body, 200], [{ invitation, role: 'delegate' }, body, 403],
    [{ invitation: { ...invitation, expires_at: new Date(now).toISOString() } }, body, 400],
    [{ invitation }, { ...body, inviteUrl: 'https://attacker.test/delegate-invite?token=' + token }, 400],
    [{ invitation }, { ...body, inviteUrl: 'https://www.pinwi.cl/delegate-invite?token=wrong' }, 400],
  ]) {
    const h = edgeHarness('send-delegate-invitation', config); const response = await h.invoke(input);
    assert.equal(response.status, status);
    if (status !== 200) assert.equal(h.calls.some(([type]) => type === 'fetch'), false);
  }
});

test('delegate email keeps its numeric template ID and adds authoritative Chilean expiry for Brevo', async () => {
  const token = '90000000-0000-4000-8000-000000000002';
  const invitation = { id, email, name: 'Invitado del servidor', token, status: 'pending', expires_at: '2026-10-20T21:00:00Z' };
  const h = edgeHarness('send-delegate-invitation', { invitation, env: { BREVO_DELEGATE_TEMPLATE_ID: '27' } });
  assert.equal((await h.invoke({ invitationId: id, email, name: 'Nombre del cliente', inviteUrl: 'https://www.pinwi.cl/delegate-invite?token=' + token })).status, 200);
  const payload = JSON.parse(h.calls.find(([type]) => type === 'fetch')[2]);
  assert.equal(payload.templateId, 27);
  assert.equal(payload.params.name, invitation.name);
  assert.equal(payload.params.expires_at, invitation.expires_at);
  assert.match(payload.params.expires_at_label, /20 de octubre de 2026.*18:00/);
  assert.equal(payload.htmlContent, undefined);
  assert.deepEqual(h.logs, []);
});

test('invitation HTML escapes dynamic names and URLs and rejects executable link schemes', () => {
  const { renderDelegateInvitation, formatInvitationExpiry } = edgeHarness().load(resolve('supabase/functions/_shared/emailTemplates.ts'));
  const html = renderDelegateInvitation('<img src=x onerror="alert(1)">', 'https://www.pinwi.cl/delegate-invite?token=sample&more="value"', '2026-10-20T21:00:00Z');
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!html.includes('onerror="alert(1)"'));
  assert.ok(html.includes('token=sample&amp;more='));
  assert.match(html, /20 de octubre de 2026.*18:00/);
  assert.throws(() => renderDelegateInvitation('Invitado', 'javascript:alert(1)', '2026-10-20T21:00:00Z'), /invalid_invitation_url/);
  assert.throws(() => formatInvitationExpiry('invalid'), /invalid_invitation_expiry/);
});

test('invitation fallback uses the branded template and server expiration without a Brevo template ID', async () => {
  const token = '90000000-0000-4000-8000-000000000002';
  const invitation = { id, email, name: '<script>untrusted</script>', token, status: 'pending', expires_at: '2026-10-20T21:00:00Z' };
  const h = edgeHarness('send-delegate-invitation', { invitation });
  assert.equal((await h.invoke({ invitationId: id, email, inviteUrl: 'https://www.pinwi.cl/delegate-invite?token=' + token })).status, 200);
  const payload = JSON.parse(h.calls.find(([type]) => type === 'fetch')[2]);
  assert.equal(payload.subject, 'Te invitaron a gestionar espacios en Pinwi');
  assert.match(payload.htmlContent, /Aceptar mi invitación/);
  assert.ok(!payload.htmlContent.includes('<script>'));
  assert.match(payload.htmlContent, /20 de octubre de 2026.*18:00/);
});

test('rate-limit RPC is server-only, atomic across queued calls, isolated by account and resets after expiry', async () => {
  const db = new PGlite();
  try {
    await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE FUNCTION public.email_account_exists(TEXT) RETURNS BOOLEAN LANGUAGE sql AS $$ SELECT false $$;");
    await db.exec(readFileSync('supabase/migrations/202610120001_auth_security.sql', 'utf8'));
    await db.exec(readFileSync('supabase/migrations/202610120003_disable_account_oracle.sql', 'utf8'));
    for (const role of ['anon','authenticated']) {
      await db.exec('SET ROLE ' + role);
      await assert.rejects(db.query('SELECT public.consume_auth_rate_limit($1,$2)', ['recovery_account','a'.repeat(64)]), /permission denied/);
      await assert.rejects(db.query("SELECT public.email_account_exists('account@pinwi.test')"), /permission denied/);
      await assert.rejects(db.query('SELECT * FROM pinwi_security.auth_rate_limits'), /permission denied/);
      await db.exec('RESET ROLE');
    }
    await db.exec('SET ROLE service_role');
    const responses = await Promise.all(Array.from({ length: 8 }, () => db.query('SELECT public.consume_auth_rate_limit($1,$2) AS result', ['recovery_account','a'.repeat(64)])));
    assert.equal(responses.filter((r) => r.rows[0].result.allowed).length, 5);
    assert.ok(responses[5].rows[0].result.retry_after > 0);
    assert.equal((await db.query('SELECT public.consume_auth_rate_limit($1,$2) AS result', ['recovery_account','b'.repeat(64)])).rows[0].result.allowed, true);
    await db.exec('RESET ROLE');
    await db.exec("UPDATE pinwi_security.auth_rate_limits SET expires_at=NOW()-INTERVAL '1 second'");
    assert.equal((await db.query('SELECT public.consume_auth_rate_limit($1,$2) AS result', ['recovery_account','a'.repeat(64)])).rows[0].result.allowed, true);
  } finally { await db.close(); }
});
