import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, dependencies, globals = {}) {
  const compiled = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext('(function(require,exports,module){' + compiled + '\n})', {
    URL, Event, CustomEvent,
    KeyboardEvent: class extends Event { constructor(type, options) { super(type, options); this.key = options.key; } },
    ...globals,
  })(name => { assert.ok(name in dependencies, name); return dependencies[name]; }, module.exports, module);
  return module.exports;
}
const settle = () => new Promise(resolve => setImmediate(resolve));

function browserLocation({ secure = true, hidden = false } = {}) {
  const reads = [], watches = [], cleared = [], positions = [], failures = [];
  const document = Object.assign(new EventTarget(), { hidden });
  const window = Object.assign(new EventTarget(), { isSecureContext: secure });
  const service = load('src/app/services/deviceLocationService.ts', {
    '@capacitor/core': { Capacitor: { isNativePlatform: () => false } },
    '@capacitor/geolocation': { Geolocation: {} },
  }, { document, window, navigator: { geolocation: {
    getCurrentPosition: (success, error) => { reads.push({ success, error }); },
    watchPosition: (success, error) => { watches.push({ success, error }); return watches.length; },
    clearWatch: id => cleared.push(id),
  } }, fetch: () => assert.fail('Location must never fall back to an HTTP/IP lookup') });
  const stop = () => service.watchDeviceLocation(position => positions.push(position), failure => failures.push(failure));
  return { service, stop, reads, watches, cleared, positions, failures, document };
}

test('web views request an initial location automatically, then track it and clean up on unmount', () => {
  const web = browserLocation();
  const stop = web.stop();
  assert.equal(web.reads.length, 1); assert.equal(web.watches.length, 0);
  web.reads[0].success({ coords: { latitude: -33, longitude: -70 } });
  assert.equal(web.positions.length, 1); assert.equal(web.watches.length, 1);
  web.watches[0].success({ coords: { latitude: -34, longitude: -71 } });
  assert.equal(web.positions.length, 2);
  stop(); assert.deepEqual(web.cleared, [1]);
  web.watches[0].success({ coords: { latitude: 0, longitude: 0 } });
  assert.equal(web.positions.length, 2);
});

test('a Safari-style permission denial stays visible without starting a watch or inferring location by IP', () => {
  const web = browserLocation(); const stop = web.stop();
  web.reads[0].error({ code: 1, message: 'User denied Geolocation' });
  assert.equal(web.failures[0].code, 1);
  assert.match(web.failures[0].message, /bloqueada/);
  assert.equal(web.positions.length, 0); assert.equal(web.watches.length, 0);
  stop();
});

test('timeouts can be retried explicitly and late initial fixes do not restart tracking after leaving', async () => {
  const web = browserLocation(); const stop = web.stop();
  web.reads[0].error({ code: 3 });
  assert.equal(web.failures[0].code, 3); assert.equal(web.watches.length, 0);
  const retry = web.service.getDeviceLocation();
  web.reads[1].success({ coords: { latitude: -33, longitude: -70 } });
  assert.equal((await retry).coords.latitude, -33);
  stop(); web.reads[0].success({ coords: { latitude: 0, longitude: 0 } });
  assert.equal(web.watches.length, 0);
});

test('hidden tabs wait for visibility and revoked permissions stop an existing browser watch', () => {
  const web = browserLocation({ hidden: true }); const stop = web.stop();
  assert.equal(web.reads.length, 0);
  web.document.hidden = false; web.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(web.reads.length, 1);
  web.reads[0].success({ coords: { latitude: -33, longitude: -70 } });
  web.watches[0].error({ code: 1 });
  assert.deepEqual(web.cleared, [1]); assert.equal(web.failures[0].code, 1);
  web.watches[0].success({ coords: { latitude: 0, longitude: 0 } });
  assert.equal(web.positions.length, 1);
  stop();
});

test('insecure web previews report HTTPS as the requirement without asking for location', async () => {
  const web = browserLocation({ secure: false }); const stop = web.stop();
  assert.equal(web.reads.length, 0); assert.match(web.failures[0].message, /HTTPS/);
  await assert.rejects(web.service.getDeviceLocation(), error => /HTTPS/.test(error.message));
  stop();
});

test('native links reject external origins and injected sessions; OTP email URLs remain public HTTPS', () => {
  let native = true;
  const urls = load('src/app/mobile/appUrls.ts', {
    '@capacitor/core': { Capacitor: { isNativePlatform: () => native } },
  }, { window: { location: { origin: 'https://localhost' } } });
  assert.equal(urls.getWebAppUrl('/verify-account'), 'https://www.pinwi.cl/verify-account');
  assert.equal(urls.getNativeLinkDestination('cl.pinwi.app://open/app/place/example'), '/app/place/example');
  assert.equal(urls.getNativeLinkDestination('cl.pinwi.app://open/delegate-invite?token=opaque-invitation'), '/delegate-invite?token=opaque-invitation');
  for (const value of ['https://evil.test/app', 'https://www.pinwi.cl.evil.test/app', 'javascript:alert(1)',
    'cl.pinwi.app://other/app', 'https://user:pass@www.pinwi.cl/app', 'cl.pinwi.app://open/app#access_token=x',
    'cl.pinwi.app://open/app?access_token=x', 'cl.pinwi.app://open/app?refresh_token=x',
    'cl.pinwi.app://open/app?code=x', 'cl.pinwi.app://open/admin']) {
    assert.equal(urls.getNativeLinkDestination(value), null, value);
  }
  native = false;
  assert.equal(urls.getWebAppUrl('/recover-password'), 'https://localhost/recover-password');
});

test('native location prompts only on a user request and respects approximate permission and denial', async () => {
  let prompts = 0, reads = 0, permission = 'prompt', coarse = 'prompt';
  const document = Object.assign(new EventTarget(), { hidden: false });
  const window = new EventTarget();
  const location = load('src/app/services/deviceLocationService.ts', {
    '@capacitor/core': { Capacitor: { isNativePlatform: () => true } },
    '@capacitor/geolocation': { Geolocation: {
      checkPermissions: async () => ({ location: permission, coarseLocation: coarse }),
      requestPermissions: async () => { prompts++; return { location: 'denied', coarseLocation: coarse }; },
      getCurrentPosition: async () => { reads++; return { coords: { latitude: -33, longitude: -70 } }; },
      watchPosition: async () => { throw new Error('Passive watch must not start without permission'); },
    } },
  }, { document, window });
  const stop = location.watchDeviceLocation(() => assert.fail('No location should arrive'));
  await settle();
  assert.equal(prompts, 0); assert.equal(reads, 0);
  await assert.rejects(location.getDeviceLocation(), error => error.code === 1);
  assert.equal(prompts, 1); assert.equal(reads, 0);
  permission = 'denied'; coarse = 'granted';
  const position = await location.getDeviceLocation();
  assert.equal(position.coords.latitude, -33); assert.equal(reads, 1);
  assert.equal(prompts, 1);
  stop();
});

test('native watches release delayed IDs after unmount and pause/resume without callbacks from an old watch', async () => {
  const document = Object.assign(new EventTarget(), { hidden: false });
  const window = new EventTarget();
  const pending = [], cleared = [], positions = [];
  const location = load('src/app/services/deviceLocationService.ts', {
    '@capacitor/core': { Capacitor: { isNativePlatform: () => true } },
    '@capacitor/geolocation': { Geolocation: {
      checkPermissions: async () => ({ location: 'granted', coarseLocation: 'granted' }),
      watchPosition: (_, callback) => new Promise(resolve => pending.push({ resolve, callback })),
      clearWatch: async ({ id }) => { cleared.push(id); },
    } },
  }, { document, window });
  const stop = location.watchDeviceLocation(position => positions.push(position));
  await settle();
  window.dispatchEvent(new CustomEvent('pinwi:app-state', { detail: { isActive: false } }));
  pending[0].resolve('old'); pending[0].callback({ coords: { latitude: 1, longitude: 1 } });
  await settle();
  assert.deepEqual(cleared, ['old']); assert.equal(positions.length, 0);
  window.dispatchEvent(new CustomEvent('pinwi:app-state', { detail: { isActive: true } }));
  await settle();
  stop(); pending[1].resolve('late');
  await settle();
  assert.deepEqual(cleared, ['old', 'late']);
  window.dispatchEvent(new CustomEvent('pinwi:app-state', { detail: { isActive: true } }));
  await settle(); assert.equal(pending.length, 2);
});

test('native lifecycle restores Auth/Realtime and Android Back closes dialogs before navigating; listeners are removed', async () => {
  const events = new Map(), removed = [], calls = [], navigations = [];
  let dialog = false;
  const document = Object.assign(new EventTarget(), { querySelector: () => dialog ? {} : null });
  const window = Object.assign(new EventTarget(), { history: { state: { idx: 1 } } });
  document.addEventListener('keydown', event => calls.push(event.key));
  const runtime = load('src/app/mobile/nativeRuntime.ts', {
    '@capacitor/core': { Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' } },
    '@capacitor/app': { App: {
      addListener: async (name, callback) => { events.set(name, callback); return { remove: async () => removed.push(name) }; },
      getLaunchUrl: async () => undefined,
      minimizeApp: async () => calls.push('minimize'),
    } },
    '@capacitor/browser': { Browser: {} },
    '../lib/supabase': { supabase: {
      auth: { startAutoRefresh: async () => calls.push('start'), stopAutoRefresh: async () => calls.push('stop') },
      realtime: { connect: () => calls.push('connect'), disconnect: () => calls.push('disconnect') },
    } },
    './appUrls': { getNativeLinkDestination: () => null },
  }, { document, window });
  const stop = runtime.startNativeRuntime({ navigate: target => navigations.push(target) });
  await settle();
  events.get('appStateChange')({ isActive: false });
  events.get('appStateChange')({ isActive: true });
  assert.deepEqual(calls, ['start', 'stop', 'disconnect', 'start', 'connect']);
  dialog = true; events.get('backButton')();
  assert.equal(calls.at(-1), 'Escape'); assert.equal(navigations.length, 0);
  dialog = false; events.get('backButton')(); assert.deepEqual(navigations, [-1]);
  window.history.state.idx = 0; events.get('backButton')(); assert.equal(calls.at(-1), 'minimize');
  stop(); await settle();
  assert.equal(removed.length, 3);
  const length = calls.length; events.get('appStateChange')({ isActive: true }); assert.equal(calls.length, length);
});
