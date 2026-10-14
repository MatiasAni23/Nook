import { before, beforeEach, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
let server, client, service, management, caches, calls, pageLoader;
const row = (index=0) => ({id:'reservation-'+index,user_id:'user',user_name:'Persona de prueba',place_id:'place',place_name:'Lugar',reservation_dates:['2026-10-19'],start_time:'08:00',end_time:'09:00',status:'pending',total_amount:0,payment_method:'trial_no_payment',created_at:'2026-10-12T12:00:00Z',space_name:'Sala',guests_count:2,special_requests:'Estudio',is_trial:true,starts_at:'2026-10-19T11:00:00Z',ends_at:'2026-10-19T12:00:00Z'});
before(async()=>{
  server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:{port:24708}},define:{'import.meta.env.VITE_SUPABASE_URL':JSON.stringify('http://127.0.0.1:9'),'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY':JSON.stringify('test-key')}});
  ({supabase:client}=await server.ssrLoadModule('/src/app/lib/supabase.ts'));
  service=await server.ssrLoadModule('/src/app/services/delegateService.ts');
  management=await server.ssrLoadModule('/src/app/services/adminManagementService.ts');
  caches=await server.ssrLoadModule('/src/app/services/adminDataCache.ts');
});
beforeEach(()=>{
  caches.clearAdminDataCaches();calls=[];pageLoader=async()=>[row()];
  client.from=()=>{throw new Error('Reservation feed must not load place records or private account tables');};
  client.auth.getUser=async()=>{throw new Error('Reservation read must let the server validate the session');};
  client.rpc=async(name,args)=>{calls.push({name,args});assert.equal(name,'get_delegate_reservations');return {data:await pageLoader(args),error:null};};
});
after(async()=>{await client?.auth.stopAutoRefresh();await server?.close();});
test('reservation feed requires one RPC for a page and shares concurrent and recent reads',async()=>{
  const [a,b]=await Promise.all([service.listCurrentDelegateReservations(),service.listCurrentDelegateReservations()]);
  assert.equal(calls.length,1);assert.equal(a,b);assert.equal(a[0].userName,'Persona de prueba');
  assert.equal(a[0].spaceName,'Sala');assert.equal(a[0].guestsCount,2);
  assert.equal(await service.listCurrentDelegateReservations(),a);assert.equal(calls.length,1);
  await service.refreshCurrentDelegateReservations();assert.equal(calls.length,2);
});
test('all pages are read without duplicating rows and no additional profile requests are needed',async()=>{
  pageLoader=async args=>args.page_offset===0?Array.from({length:200},(_,i)=>row(i)):[row(199),row(200)];
  assert.equal((await service.listCurrentDelegateReservations()).length,201);
  assert.deepEqual(calls.map(c=>c.args.page_offset),[0,200]);
});
test('account changes discard a pending response and clear private snapshots',async()=>{
  caches.setAdminCacheAccount('account-a');
  let resolve; pageLoader=()=>new Promise(r=>{resolve=r;});
  const pending=service.listCurrentDelegateReservations();
  await new Promise(r=>setTimeout(r,0));
  caches.setAdminCacheAccount('account-b');resolve([row()]);
  await assert.rejects(pending,/sesión o los datos cambiaron/);
  assert.equal(service.getCachedDelegateReservations(),null);
});
test('server failures are not converted to cached success',async()=>{
  client.rpc=async()=>({data:null,error:{code:'P0001',message:'reservation_manager_required'}});
  await assert.rejects(service.listCurrentDelegateReservations(),/lugares asignados/);
  assert.equal(service.getCachedDelegateReservations(),null);
});

test('assigned places use aggregate counts and deduplicate navigation reads until an explicit refresh',async()=>{
  const queries=[];let validations=0;
  client.auth.getUser=async()=>{validations++;return {data:{user:{id:'delegate-user'}},error:null};};
  client.from=name=>{
    const query={name,select:null,filters:[]};queries.push(query);
    const result=name==='delegates'?{id:'delegate-id'}:[{places:{id:'place',name:'Lugar',status:'active',images:[],place_spaces:[],place_amenities:[],reservations:[{count:321}]}}];
    const builder={select(value){query.select=value;return this;},eq(key,value){query.filters.push([key,value]);return this;},maybeSingle(){return Promise.resolve({data:result,error:null});},then(resolve,reject){return Promise.resolve({data:result,error:null}).then(resolve,reject);}};
    return builder;
  };
  const [first,second]=await Promise.all([management.listCurrentDelegatePlaces(),management.listCurrentDelegatePlaces()]);
  assert.equal(first,second);assert.equal(first[0].reservationsCount,321);assert.equal(validations,1);assert.equal(queries.length,2);
  assert.match(queries[1].select,/reservations\(count\)/);assert.doesNotMatch(queries[1].select,/reservations\(id\)/);
  await management.listCurrentDelegatePlaces();assert.equal(queries.length,2);
  await management.listCurrentDelegatePlaces({forceRefresh:true});assert.equal(queries.length,4);
  caches.setAdminCacheAccount('another-account');assert.equal(management.getCachedCurrentDelegatePlaces(),null);
});
