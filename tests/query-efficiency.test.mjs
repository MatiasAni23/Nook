import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

let server, profiles, places, catalog, caches, requests, sessionId, validations, hold, fail, profileName;
const originalFetch = globalThis.fetch;
const originalNow = Date.now;
const firstUser = '70000000-0000-4000-8000-000000000001';
const secondUser = '70000000-0000-4000-8000-000000000002';
const firstPlace = '71000000-0000-4000-8000-000000000001';
const secondPlace = '71000000-0000-4000-8000-000000000002';
const response = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const place = id => ({ id, name:'Lugar de prueba', status:'active', type:'library',category:'study',images:[],place_spaces:[],place_amenities:[] });
const pause = () => {
  let release;
  const promise = new Promise(resolve => { release = resolve; });
  return { promise, release };
};
let started;
before(async () => {
  server = await createServer({server:{middlewareMode:true,hmr:{port:24686}},define:{
    'import.meta.env.VITE_SUPABASE_URL':JSON.stringify('http://127.0.0.1:9'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY':JSON.stringify('test-key'),
  }});
  const { supabase } = await server.ssrLoadModule('/src/app/lib/supabase.ts');
  supabase.auth.getSession = async () => ({data:{session:sessionId ? {user:{id:sessionId}} : null},error:null});
  supabase.auth.getUser = async () => { validations++; return {data:{user:sessionId ? {id:sessionId,email:'user@pinwi.test',user_metadata:{}} : null},error:null}; };
  profiles = await server.ssrLoadModule('/src/app/services/currentUserService.ts');
  places = await server.ssrLoadModule('/src/app/services/placeService.ts');
  catalog = await server.ssrLoadModule('/src/app/services/catalogService.ts');
  caches = await server.ssrLoadModule('/src/app/services/adminDataCache.ts');
});
after(async () => { globalThis.fetch = originalFetch; Date.now = originalNow; await server?.close(); });
beforeEach(() => {
  Date.now = originalNow;
  profiles.clearCurrentUserServiceCaches(); places.clearPlacesCache(); caches.clearAdminDataCaches();
  requests = []; sessionId = firstUser; validations = 0; hold = null; fail = false; started = null;
  profileName = 'Nombre anterior';
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    assert.equal(url.origin,'http://127.0.0.1:9','No requests to a live backend');
    requests.push(url);
    const id = url.searchParams.get('id')?.replace('eq.','') ?? url.searchParams.get('user_id')?.replace('eq.','');
    let value;
    if (url.pathname.endsWith('/users')) {
      if (options.method === 'PATCH') profileName = JSON.parse(options.body).name ?? profileName;
      value = [{id,name:profileName,role:'student',status:'active',avatar_url:null}];
    }
    else if (url.pathname.endsWith('/user_profiles')) value = [];
    else if (url.pathname.endsWith('/places')) value = place(id);
    else if (url.pathname.endsWith('/rpc/list_public_places')) value = [place(firstPlace),place(secondPlace)];
    else if (url.pathname.endsWith('/place_spaces')) value = [];
    else if (url.pathname.endsWith('/regions')) value = [{id:'region',name:'Región',code:null}];
    else if (url.pathname.endsWith('/cities')) value = [{id:'city',region_id:url.searchParams.get('region_id'),name:'Ciudad'}];
    else if (url.pathname.endsWith('/institutions')) value = [{id:url.searchParams.get('or') ?? 'all',city_id:null,name:'Institución',type:'university'}];
    else throw new Error('Unexpected request: ' + url.pathname);
    const pending = hold;
    started?.(url);
    if (pending) await pending;
    return fail ? response({message:'Denied',code:'42501'},403) : response(value);
  };
});

test('parallel profile refreshes share validation and fetch account and profile concurrently', {timeout:5000}, async () => {
  const gate = pause(), bothStarted = pause();
  hold = gate.promise;
  started = () => { if (requests.length === 2) bothStarted.release(); };
  const reads = [profiles.getCurrentUserProfile(),profiles.getCurrentUserProfile({forceRefresh:true}),profiles.getCurrentUserProfile()];
  try {
    await bothStarted.promise;
    assert.equal(validations,1);
    assert.equal(requests.length,2,'Account and profile must start before either response finishes');
  } finally { gate.release(); hold = null; }
  const values = await Promise.all(reads);
  assert.ok(values.every(value => value.id === firstUser));
  await profiles.getCurrentUserProfile();
  assert.equal(requests.length,2);
  await profiles.getCurrentUserProfile({forceRefresh:true});
  assert.equal(requests.length,4,'Explicit refresh must still fetch fresh data');
});

test('a pending profile cannot restore an old account after cache invalidation', async () => {
  const gate = pause(), received = pause(); hold = gate.promise; started = () => received.release();
  const old = profiles.getCurrentUserProfile(); await received.promise;
  profiles.clearCurrentUserServiceCaches(); sessionId = secondUser; hold = null;
  assert.equal((await profiles.getCurrentUserProfile()).id,secondUser);
  gate.release(); assert.equal(await old,null);
  const count = requests.length;
  assert.equal((await profiles.getCurrentUserProfile()).id,secondUser);
  assert.equal(requests.length,count);
});

test('guest profiles issue no queries; denied profile reads are retried rather than cached', async () => {
  sessionId = null;
  assert.equal(await profiles.getCurrentUserProfile(),null); assert.equal(requests.length,0); assert.equal(validations,0);
  sessionId = firstUser; fail = true;
  await assert.rejects(profiles.getCurrentUserProfile());
  fail = false; assert.equal((await profiles.getCurrentUserProfile()).id,firstUser);
  assert.equal(requests.length,4);
});

test('saving a profile invalidates an older in-flight read before the next refresh', async () => {
  const gate = pause(), received = pause(); hold = gate.promise; started = () => received.release();
  const old = profiles.getCurrentUserProfile(); await received.promise;
  hold = null;
  await profiles.updateCurrentUserProfile({name:'Nombre nuevo',role:'student',profileData:{}});
  assert.equal((await profiles.getCurrentUserProfile({forceRefresh:true})).name,'Nombre nuevo');
  gate.release(); assert.equal(await old,null);
  assert.equal((await profiles.getCurrentUserProfile()).name,'Nombre nuevo');
});

test('direct place visits share a request and reuse detail cache without masking the full catalogue', async () => {
  const values = await Promise.all([places.getPlaceById(firstPlace),places.getPlaceById(firstPlace)]);
  assert.equal(values[0].id,firstPlace); assert.deepEqual(values[0],values[1]);
  await places.getPlaceById(firstPlace); assert.equal(requests.length,1);
  assert.equal(places.getCachedPlaces(),null,'A single detail is not a complete catalogue');
  assert.equal((await places.listPlaces()).length,2);
  assert.equal(requests.length,3);
});

test('place details expire after five minutes and cannot be restored by a response from a cleared session', async () => {
  await places.getPlaceById(firstPlace);
  const now = originalNow(); Date.now = () => now + 300001;
  await places.getPlaceById(firstPlace); assert.equal(requests.length,2);
  places.clearPlacesCache();
  const gate = pause(), received = pause(); hold = gate.promise; started = () => received.release();
  const old = places.getPlaceById(firstPlace); await received.promise;
  places.clearPlacesCache(); gate.release(); hold = null;
  assert.equal(await old,null);
  await places.getPlaceById(firstPlace); assert.equal(requests.length,4);
});

test('denied place details are not cached and a second visit can recover', async () => {
  fail = true; await assert.rejects(places.getPlaceById(firstPlace));
  fail = false; assert.equal((await places.getPlaceById(firstPlace)).id,firstPlace);
  assert.equal(requests.length,2);
});

test('reference catalogues deduplicate reads, separate filters, expire and clear on account changes', async () => {
  await Promise.all([catalog.getRegions(),catalog.getRegions()]);
  await catalog.getRegions(); assert.equal(requests.length,1);
  await Promise.all([catalog.getCitiesByRegion('north'),catalog.getCitiesByRegion('north')]);
  await catalog.getCitiesByRegion('south'); assert.equal(requests.length,3);
  const all = await catalog.getInstitutions(); const filtered = await catalog.getInstitutions('city');
  assert.notDeepEqual(all,filtered);
  await catalog.getInstitutions('city'); assert.equal(requests.length,5);
  const now = originalNow(); Date.now = () => now + 300001;
  await catalog.getRegions(); assert.equal(requests.length,6);
  caches.setAdminCacheAccount(firstUser); await catalog.getRegions(); assert.equal(requests.length,7);
  caches.setAdminCacheAccount(secondUser); await catalog.getRegions(); assert.equal(requests.length,8);
});
