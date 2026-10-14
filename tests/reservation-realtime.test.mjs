import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
let server, db, realtime, presentation;
const id='74000000-0000-4000-8000-000000000001';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
before(async()=>{
  server=await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:{port:24705}},define:{
    'import.meta.env.VITE_SUPABASE_URL':JSON.stringify('http://127.0.0.1:9'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY':JSON.stringify('test-key')
  }});
  ({supabase:db}=await server.ssrLoadModule('/src/app/lib/supabase.ts'));
  realtime=await server.ssrLoadModule('/src/app/services/reservationRealtimeService.ts');
  presentation=await server.ssrLoadModule('/src/app/features/delegado/reservationPresentation.ts');
});
after(async()=>{await db?.auth.stopAutoRefresh();await server?.close();});
test('private channel shares one subscription, refreshes on reconnect and ignores events after cleanup',async()=>{
  const channels=[];const removed=[];
  db.auth.getUser=async()=>({data:{user:{id}},error:null});
  db.channel=(topic,options)=>{const entry={topic,options,on(type,filter,callback){this.event=callback;return this;},subscribe(callback){this.status=callback;return this;}};channels.push(entry);return entry;};
  db.removeChannel=async channel=>{removed.push(channel);return 'ok';};
  let firstChanges=0,secondChanges=0;const states=[];
  const first=realtime.subscribeToReservationChanges(()=>firstChanges++,state=>states.push(state));await flush();
  const second=realtime.subscribeToReservationChanges(()=>secondChanges++,()=>{});await flush();
  assert.equal(channels.length,1);assert.equal(channels[0].topic,'reservations:user:'+id);assert.equal(channels[0].options.config.private,true);
  channels[0].status('SUBSCRIBED');channels[0].event({payload:{changed:true}});
  assert.equal(firstChanges,2);assert.equal(secondChanges,2);
  channels[0].event({payload:{changed:false}});assert.equal(firstChanges,2);
  channels[0].status('CHANNEL_ERROR');channels[0].status('SUBSCRIBED');assert.equal(states.at(-1),'connected');assert.equal(firstChanges,3);
  first();assert.equal(removed.length,0);
  channels[0].event({payload:{changed:true}});assert.equal(firstChanges,3);assert.equal(secondChanges,4);
  second();assert.equal(removed.length,1);
  channels[0].event({payload:{changed:true}});assert.equal(secondChanges,4);await flush();
});
test('unmounted auth requests create no channel; new mounts wait for an old channel removal',async()=>{
  let created=0;const auth=deferred();db.auth.getUser=()=>auth.promise;
  const stop=realtime.subscribeToReservationChanges(()=>{},()=>{});stop();
  auth.resolve({data:{user:{id}},error:null});await flush();assert.equal(created,0);
  db.auth.getUser=async()=>({data:{user:{id}},error:null});
  const removal=deferred();db.removeChannel=()=>removal.promise;
  db.channel=()=>{created++;return {on(){return this;},subscribe(){return this;}};};
  const first=realtime.subscribeToReservationChanges(()=>{},()=>{});await flush();assert.equal(created,1);first();
  const second=realtime.subscribeToReservationChanges(()=>{},()=>{});await flush();assert.equal(created,1);
  removal.resolve('ok');await flush();assert.equal(created,2);second();await flush();
});
test('bursts are grouped into one read, idle time causes no repeated reads and disposal cancels timers',async()=>{
  let reads=0;const values=[];
  const controller=realtime.createReservationRefreshController({load:async()=>++reads,onData:value=>values.push(value),onError:()=>{},onUpdating:()=>{}});
  for(let i=0;i<20;i++)controller.schedule();
  await delay(230);assert.equal(reads,1);assert.deepEqual(values,[1]);
  await delay(230);assert.equal(reads,1);
  controller.schedule();controller.dispose();await delay(230);assert.equal(reads,1);
});
test('overlapping refreshes discard the older result and a confirmed mutation cannot be overwritten',async()=>{
  const first=deferred(),second=deferred();let reads=0;const values=[];
  const controller=realtime.createReservationRefreshController({load:()=>++reads===1?first.promise:second.promise,onData:value=>values.push(value),onError:()=>{},onUpdating:()=>{}});
  const running=controller.refresh();controller.refresh();first.resolve(['old']);await flush();assert.deepEqual(values,[]);
  second.resolve(['fresh']);await running;assert.deepEqual(values,[['fresh']]);controller.dispose();
  const pending=deferred();let count=0;const updates=[];
  const another=realtime.createReservationRefreshController({load:()=>++count===1?Promise.resolve(['pending']):pending.promise,onData:value=>updates.push(value),onError:()=>{},onUpdating:()=>{}});
  await another.refresh();const inFlight=another.refresh();another.update(()=>['confirmed']);pending.resolve(['server']);await inFlight;
  assert.equal(updates.some(value=>value[0]==='pending'&&updates.indexOf(value)>0),false);assert.deepEqual(updates[1],['confirmed']);another.dispose();
});
test('pending requests remain actionable; history and calendar use the Chilean reservation date',()=>{
  const now=new Date('2026-10-13T01:00:00Z');
  const base={status:'confirmed',startsAt:'2026-10-13T00:00:00Z',endsAt:'2026-10-13T02:00:00Z',dates:[],startTime:'21:00',endTime:'23:00'};
  assert.deepEqual(presentation.reservationDays(base),['2026-10-12']);
  assert.equal(presentation.reservationBucket(base,now),'upcoming');
  assert.equal(presentation.reservationBucket({...base,endsAt:'2026-10-13T00:30:00Z'},now),'history');
  assert.equal(presentation.reservationBucket({...base,status:'pending'},now),'pending');
  const grid=presentation.reservationMonthGrid('2026-10');assert.deepEqual(grid.slice(0,4),[null,null,null,'2026-10-01']);assert.equal(grid.at(-1),'2026-10-31');
  assert.equal(presentation.shiftReservationMonth('2026-12',1),'2027-01');
});
test('a pending read cannot publish data or errors after the panel was unmounted',async()=>{
  const pending=deferred();let changes=0;
  const controller=realtime.createReservationRefreshController({load:()=>pending.promise,onData:()=>changes++,onError:()=>changes++,onUpdating:()=>{}});
  const read=controller.refresh();controller.dispose();pending.resolve(['private']);await read;assert.equal(changes,0);
});
