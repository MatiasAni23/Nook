import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

let server, settings, places, catalog, buildCatalog, navigation, requests, denyWrite, failRead, publicRows;
const originalFetch = globalThis.fetch;
const row = () => ({instagram_url:'',facebook_url:'',tiktok_url:'',linkedin_url:'',youtube_url:'',x_url:'',whatsapp_number:''});
let database;
const response = (data,status=200) => new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
before(async () => {
  server = await createServer({server:{middlewareMode:true,hmr:{port:24685}},define:{'import.meta.env.VITE_SUPABASE_URL':JSON.stringify('http://127.0.0.1:9'),'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY':JSON.stringify('test-key')}});
  settings = await server.ssrLoadModule('/src/app/services/siteSettingsService.ts');
  places = await server.ssrLoadModule('/src/app/services/publicPlaceService.ts');
  catalog = await server.ssrLoadModule('/src/app/services/publicPlaceCatalog.ts');
  buildCatalog = await server.ssrLoadModule('/scripts/publicPlaceCatalog.ts');
  navigation = await server.ssrLoadModule('/src/app/features/auth/authNavigation.ts');
});
after(async () => {globalThis.fetch=originalFetch;await server?.close();});
beforeEach(() => {
  database=row();requests=[];denyWrite=false;failRead=false;
  settings.clearSiteSettingsCache();places.clearPublicPlaceCache();
  publicRows = [{id:'public-card',name:'Espacio',image_url:'https://example.test/main.jpg',description:'Unexpected private field',address:'Public address',latitude:-33.45}];
  globalThis.fetch = async (target,options={}) => {
    const url=new URL(typeof target==='string' || target instanceof URL ? target : target.url);
    assert.equal(url.origin,'http://127.0.0.1:9','No live backend request is allowed');
    requests.push({path:url.pathname,method:options.method??'GET',body:options.body});
    if(url.pathname.endsWith('/rpc/get_public_place_cards')) {
      if(failRead) return response({message:'Unavailable'},503);
      const {after_id,page_size}=JSON.parse(options.body);
      return response(publicRows.filter(row=>!after_id || row.id>after_id).slice(0,page_size));
    }
    assert.ok(url.pathname.endsWith('/site_settings'));
    if(options.method==='PATCH') {
      if(denyWrite) return response({message:'Denied',code:'42501'},403);
      database={...database,...JSON.parse(options.body)};
    } else if(failRead) return response({message:'Unavailable'},503);
    return response(database);
  };
});
test('public cards request only the limited RPC, project name, address and main photo, and reuse their cache',async()=>{
  const [left,right]=await Promise.all([places.listPublicPlaces(),places.listPublicPlaces()]);
  assert.deepEqual(left,right);
  assert.deepEqual(Object.keys(left[0]).sort(),['address','id','imageUrl','name']);
  assert.equal(left[0].address,'Public address');
  await places.listPublicPlaces();
  assert.equal(requests.length,1);
  assert.equal(requests[0].path,'/rest/v1/rpc/get_public_place_cards');
});

test('public catalogue and SEO loader include all pages without private fields or Auth calls',async()=>{
  publicRows=Array.from({length:205},(_,index)=>({id:`place-${String(index).padStart(4,'0')}`,name:`Lugar ${index}`,image_url:null,address:'Public address',description:'private'}));
  const result=await places.listPublicPlaces();
  assert.equal(result.length,205);assert.equal(requests.length,3);
  assert.equal(JSON.parse(requests[1].body).after_id,'place-0099');
  requests=[];
  const built=await buildCatalog.loadPublicPlaceCatalog({VITE_SUPABASE_URL:'http://127.0.0.1:9',VITE_SUPABASE_PUBLISHABLE_KEY:'test-key'},globalThis.fetch);
  assert.deepEqual(built,result);assert.equal(requests.length,3);
  assert.ok(!JSON.stringify(built).includes('private'));
});

test('public catalogue rejects backend failures and invalid rows without manufacturing a demo result',async()=>{
  failRead=true;
  await assert.rejects(places.listPublicPlaces());assert.equal(places.getCachedPublicPlaces(),null);
  await assert.rejects(buildCatalog.loadPublicPlaceCatalog({VITE_SUPABASE_URL:'http://127.0.0.1:9',VITE_SUPABASE_PUBLISHABLE_KEY:'test-key'},globalThis.fetch),/202610210003/);
  failRead=false;publicRows=[{id:'bad/id',name:'Invalid',image_url:null}];
  await assert.rejects(places.listPublicPlaces(),/no es válida/);
  assert.equal(places.getCachedPublicPlaces(),null);
});

test('public snapshot escapes script injection, drops extra fields and rejects unsafe photo URLs',()=>{
  const rows=catalog.parsePublicPlaceCards([{id:'place',name:'</script><script>alert(1)</script>',image_url:'javascript:alert(1)',address:'Calle </script> 123',description:'hidden'}]);
  assert.equal(rows[0].imageUrl,null);assert.equal(rows[0].address,'Calle </script> 123');
  const serialized=catalog.serializePublicPlaceCards(rows);
  assert.ok(!serialized.includes('</script>') && !serialized.includes('hidden'));
  assert.deepEqual(JSON.parse(serialized),rows);
  assert.equal(catalog.parsePublicPlaceCards([{id:'legacy',name:'Legacy snapshot'}])[0].address,null);
  assert.throws(()=>catalog.parsePublicPlaceCards([{id:'invalid',name:'Invalid address',address:123}]),/no es v\u00e1lida/);
});

test('public catalogue fails on repeated cursors instead of looping or truncating the listing',async()=>{
  const page=Array.from({length:100},(_,index)=>({id:`place-${String(index).padStart(4,'0')}`,name:'Lugar',image_url:null}));
  await assert.rejects(catalog.readPublicPlaceCatalog(async()=>page),/completar/);
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
