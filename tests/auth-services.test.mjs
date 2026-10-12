import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

let server, auth, attempts, publicConfig, images, websites, supabase;
const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: { port: 24698 } }, define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('http://127.0.0.1:9'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('test-key'),
    'import.meta.env.VITE_TURNSTILE_SITE_KEY': JSON.stringify('test-site-key'),
  }});
  ({ supabase } = await server.ssrLoadModule('/src/app/lib/supabase.ts'));
  auth = await server.ssrLoadModule('/src/app/services/authService.ts');
  attempts = await server.ssrLoadModule('/src/app/services/authAttemptService.ts');
  publicConfig = await server.ssrLoadModule('/src/app/lib/publicConfigSecurity.ts');
  images = await server.ssrLoadModule('/src/app/lib/imageUploadSecurity.ts');
  websites = await server.ssrLoadModule('/src/app/lib/externalUrl.ts');
  globalThis.window = { location: { origin: 'https://www.pinwi.cl' } };
});
after(async () => {
  globalThis.fetch = originalFetch; globalThis.window = originalWindow;
  await supabase?.auth.stopAutoRefresh(); await server?.close();
});

test('public builds reject server keys without including the key in the error', () => {
  const secret = 'sb_secret_do_not_print';
  assert.throws(() => publicConfig.assertPublicEnvironment({ VITE_SUPABASE_PUBLISHABLE_KEY: secret }), (error) => !error.message.includes(secret));
  const token = 'header.' + Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url') + '.signature';
  assert.throws(() => publicConfig.assertPublicEnvironment({ VITE_SUPABASE_ANON_KEY: token }));
  assert.throws(() => publicConfig.assertPublicEnvironment({ VITE_BREVO_API_KEY: 'server-only' }));
  assert.doesNotThrow(() => publicConfig.assertPublicEnvironment({ VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' }));
});

test('signup rejects short passwords and missing CAPTCHA before issuing HTTP and never calls an existence oracle', async () => {
  attempts.clearAuthAttemptState(); const requests = [];
  globalThis.fetch = async (input, options) => {
    const url = new URL(typeof input === 'string' ? input : input.url); requests.push({ path: url.pathname, body: JSON.parse(options.body) });
    return new Response(JSON.stringify({ user: { id: 'test-user', identities: [] }, session: null }), { headers: { 'Content-Type': 'application/json' } });
  };
  const base = { name: 'Cuenta', email: 'account@pinwi.test', phone: '', password: 'Una frase exclusiva muy larga' };
  await assert.rejects(auth.signUpWithEmail({ ...base, password: 'Aa1!', captchaToken: 'test-token' }), /8 caracteres/);
  await assert.rejects(auth.signUpWithEmail(base), /verificación de seguridad/);
  assert.equal(requests.length, 0);
  await auth.signUpWithEmail({ ...base, captchaToken: 'test-token' });
  assert.equal(requests.length, 1); assert.equal(requests[0].path, '/auth/v1/signup');
  assert.equal(requests[0].body.gotrue_meta_security.captcha_token, 'test-token');
});

test('email cooldown is shared between recovery and resends and blocks parallel duplicate requests', async () => {
  attempts.clearAuthAttemptState(); let requests = 0;
  globalThis.fetch = async () => { requests++; return new Response('{}', { headers: { 'Content-Type': 'application/json' } }); };
  const calls = await Promise.allSettled([
    auth.sendPasswordRecoveryCode('cooldown@pinwi.test', 'captcha'),
    auth.sendPasswordRecoveryCode('COOLDOWN@pinwi.test', 'captcha'),
  ]);
  assert.equal(calls.filter((result) => result.status === 'fulfilled').length, 1);
  await assert.rejects(auth.resendSignupVerificationCode('cooldown@pinwi.test', undefined, 'captcha'), /Espera/);
  assert.equal(requests, 1);
  await auth.sendPasswordRecoveryCode('different@pinwi.test', 'captcha'); assert.equal(requests, 2);
  attempts.clearAuthAttemptState(); assert.equal(attempts.getEmailCooldownSeconds('cooldown@pinwi.test'), 0);
});

test('recovery translates server rate limits and rejects nonnumeric OTPs before HTTP', async () => {
  let requests = 0;
  globalThis.fetch = async () => {
    requests++; return new Response(JSON.stringify({ error: 'rate_limit_exceeded', retry_after: 900 }), { status: 429, headers: { 'Content-Type': 'application/json' } });
  };
  await assert.rejects(auth.completePasswordRecovery('test@pinwi.test', 'AB1234', 'Una frase exclusiva muy larga', 'captcha'), /solo números/);
  assert.equal(requests, 0);
  await assert.rejects(auth.completePasswordRecovery('test@pinwi.test', '123456', 'Una frase exclusiva muy larga', 'captcha'), /900 segundos/);
  assert.equal(requests, 1);
});

test('image uploads reject active content, wrong signatures and oversized files while deriving extensions from MIME', async () => {
  const png = new File([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])], 'unsafe.html', { type: 'image/png' });
  assert.equal(await images.validateImageUpload(png), 'png');
  await assert.rejects(images.validateImageUpload(new File(['<svg/>'], 'avatar.svg', { type: 'image/svg+xml' })), /SVG/);
  await assert.rejects(images.validateImageUpload(new File(['<script>bad</script>'], 'avatar.jpg', { type: 'image/jpeg' })), /contenido/);
  await assert.rejects(images.validateImageUpload(png, 1), /máximo/);
});

test('place website links reject executable URLs and embedded credentials, including mixed-case/control character tricks', () => {
  for (const value of ['javascript:alert(1)','JaVaScRiPt:alert(1)','data:text/html,<script>bad</script>','file:///secret','https://user:password@example.test','https://example.test\nmalformed']) {
    assert.equal(websites.getSafeWebsiteUrl(value),null);
    assert.throws(()=>websites.validateWebsiteUrl(value));
  }
  assert.equal(websites.getSafeWebsiteUrl('example.test'),'https://example.test');
  assert.equal(websites.getSafeWebsiteUrl('https://example.test/path?q=value'),'https://example.test/path?q=value');
});
