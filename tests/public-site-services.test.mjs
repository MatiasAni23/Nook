import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

let server, settings, map, navigation, requests, denyWrite, failRead;
const originalFetch = globalThis.fetch;
const row = () => ({instagram_url:'',facebook_url:'',tiktok_url:'',linkedin_url:'',youtube_url:'',x_url:'',whatsapp_number:''});
let database;
const response = (data,status=200) => new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
before(async () => {
  server = await createServer({server:{middlewareMode:true,hmr:{port:24685}},define:{'import.meta.env.VITE_SUPABASE_URL':JSON.stringify('http://127.0.0.1:9'),'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY':JSON.stringify('test-key')}});
  settings = await server.ssrLoadModule('/src/app/services/siteSettingsService.ts');
  map = await server.ssrLoadModule('/src/app/services/publicMapService.ts');
  navigation = await server.ssrLoadModule('/src/app/features/auth/authNavigation.ts');
});
after(async () => {globalThis.fetch=originalFetch;await server?.close();});
beforeEach(() => {
  database=row();requests=[];denyWrite=false;failRead=false;
  settings.clearSiteSettingsCache();map.clearPublicMapCache();
  globalThis.fetch = async (target,options={}) => {
    const url=new URL(typeof target==='string'?target:target.url);
    assert.equal(url.origin,'http://127.0.0.1:9','No live backend request is allowed');
    requests.push({path:url.pathname,method:options.method??'GET'});
    if(url.pathname.endsWith('/rpc/get_public_map_pins')) return response([{id:'public-pin',name:'Espacio',type:'cafe',category:'study',latitude:-33.45,longitude:-70.65,description:'Unexpected private field'}]);
    assert.ok(url.pathname.endsWith('/site_settings'));
    if(options.method==='PATCH') {
      if(denyWrite) return response({message:'Denied',code:'42501'},403);
      database={...database,...JSON.parse(options.body)};
    } else if(failRead) return response({message:'Unavailable'},503);
    return response(database);
  };
});
test('public map requests only the limited RPC, projects fields, and reuses its cache',async()=>{
  const [left,right]=await Promise.all([map.listPublicMapPins(),map.listPublicMapPins()]);
  assert.deepEqual(left,right);
  assert.deepEqual(Object.keys(left[0]).sort(),['category','id','lat','lng','name','type']);
  await map.listPublicMapPins();
  assert.equal(requests.length,1);
  assert.equal(requests[0].path,'/rest/v1/rpc/get_public_map_pins');
});
test('saving updates public cache only after confirmation, and denied writes preserve old links',async()=>{
  const value=await settings.getSiteSettings();
  await settings.getSiteSettings();assert.equal(requests.length,1);
  let updates=0;const unsubscribe=settings.subscribeSiteSettings(()=>updates++);
  const input={...value,links:{...value.links,instagram:'https://instagram.com/pinwi'},whatsapp:'+56 9 1234 5678'};
  await settings.saveSiteSettings(input);
  assert.equal(updates,1);assert.equal(settings.getCachedSiteSettings().whatsapp,'+56912345678');
  denyWrite=true;
  await assert.rejects(settings.saveSiteSettings({...input,links:{...input.links,instagram:'https://example.test/denied'}}));
  assert.equal(updates,1);assert.equal(settings.getCachedSiteSettings().links.instagram,'https://instagram.com/pinwi');unsubscribe();
});
test('invalid links and phones never issue writes; a backend failure never becomes demo success',async()=>{
  const value=settings.emptySiteSettings();
  for(const url of ['javascript:alert(1)','http://example.test','https://user:pass@example.test']) await assert.rejects(settings.saveSiteSettings({...value,links:{...value.links,x:url}}));
  await assert.rejects(settings.saveSiteSettings({...value,whatsapp:'1234'}));assert.equal(requests.length,0);
  failRead=true;await assert.rejects(settings.getSiteSettings());assert.equal(settings.getCachedSiteSettings(),null);
});
test('post-login destinations stay internal and privileged roles always go to their own panel',()=>{
  for(const target of ['https://example.test','//example.test','/admin','/app/../admin','/app/place/a?continue=//bad']) assert.equal(navigation.safeAppDestination(target),'/app/discover');
  assert.equal(navigation.destinationAfterLogin('student','/app/place/a'),'/app/place/a');
  assert.equal(navigation.destinationAfterLogin('admin','/app/place/a'),'/admin');
  assert.equal(navigation.destinationAfterLogin('delegate','/app/place/a'),'/delegate');
  const params=new URLSearchParams(navigation.authLink('/app/workplace/a',true).split('?')[1]);
  assert.equal(params.get('continuar'),'/app/workplace/a');assert.equal(params.get('registro'),'1');
  const verify=new URLSearchParams(navigation.verificationLink('/app/place/a','visitor@pinwi.test').split('?')[1]);
  assert.equal(verify.get('continuar'),'/app/place/a');assert.equal(verify.get('email'),'visitor@pinwi.test');
  assert.ok(navigation.verificationLink('//example.test').includes('continuar=%2Fapp%2Fdiscover'));
});
