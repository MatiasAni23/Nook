import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
let server, service, db, calendar;
const calls=[];
const slotId='72000000-0000-4000-8000-000000000001';
const requestId='72000000-0000-4000-8000-000000000002';
before(async()=>{
  server=await createServer({cacheDir:'node_modules/.vite-tests-reservations',optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:{port:24704}},define:{
    'import.meta.env.VITE_SUPABASE_URL':JSON.stringify('http://127.0.0.1:9'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY':JSON.stringify('test-key')
  }});
  ({supabase:db}=await server.ssrLoadModule('/src/app/lib/supabase.ts'));
  service=await server.ssrLoadModule('/src/app/services/reservationService.ts');
  calendar=await server.ssrLoadModule('/src/app/features/reservas/reservationDateUtils.ts');
});
after(async()=>{await db?.auth.stopAutoRefresh();await server?.close();});
test('reservation request sends only slot, group, notes and the reusable request key',async()=>{
  db.rpc=async(name,args)=>{calls.push({name,args});return {data:requestId,error:null};};
  const input={slotId,guests:3,requestId,notes:'Estudio'};
  assert.equal(await service.createTrialReservation(input),requestId);
  assert.equal(await service.createTrialReservation(input),requestId);
  assert.deepEqual(calls[0],{name:'create_trial_reservation',args:{target_slot_id:slotId,group_size:3,request_id:requestId,notes:'Estudio'}});
  assert.deepEqual(calls[0],calls[1]);
  for(const guests of [0,1.5,NaN]) await assert.rejects(service.createTrialReservation({...input,guests}));
  assert.equal(calls.length,2);
});
test('server errors never become success and conflicts have a useful message',async()=>{
  db.rpc=async()=>({data:null,error:{code:'P0001',message:'reservation_slot_taken'}});
  await assert.rejects(service.createTrialReservation({slotId,guests:1,requestId,notes:''}),/Otra persona/);
  db.rpc=async()=>({data:null,error:null});
  await assert.rejects(service.createTrialReservation({slotId,guests:1,requestId,notes:''}),/no confirm/);
  await assert.rejects(service.setPlaceReservationsEnabled(slotId,true),/no confirm/);
  await assert.rejects(service.transitionTrialReservation(requestId,'confirmed'),/no confirm/);
  assert.match(service.reservationError({code:'PGRST202',message:'Missing RPC'}).message,/migraci/);
});
test('management queries explicitly request manager scope and public slots contain no guest identity',async()=>{
  db.rpc=async(name,args)=>{calls.push({name,args});return {data:[{id:slotId,space_id:requestId,space_name:'Sala',capacity:4,starts_at:'2026-10-15T12:00:00Z',ends_at:'2026-10-15T13:00:00Z',enabled:true,reserved:false}],error:null};};
  const rows=await service.listReservationSlots(requestId,true);
  assert.equal(calls.at(-1).args.for_management,true);
  assert.equal(rows[0].spaceName,'Sala'); assert.equal('userId' in rows[0],false);
  await service.listReservationSlots(requestId);
  assert.equal(calls.at(-1).args.for_management,false);
});
test('reservation dates and clocks use Santiago regardless of the browser time zone',()=>{
  assert.equal(service.getSantiagoDate(new Date('2026-10-13T01:00:00Z')),'2026-10-12');
  assert.equal(service.formatReservationTime('2026-10-13T01:00:00Z'),'22:00');
});

test('weekly publication sends a single atomic RPC and accepts an idempotent zero result',async()=>{
  const requests=[];
  db.rpc=async(name,args)=>{requests.push({name,args});return {data:0,error:null};};
  const input={spaceId:slotId,weekStart:'2026-10-19',minutes:60,days:[{date:'2026-10-19',start:'08:00',end:'10:00'},{date:'2026-10-20',start:'09:00',end:'11:00'}]};
  assert.equal(await service.publishReservationWeek(input),0);
  assert.deepEqual(requests,[{name:'publish_reservation_week',args:{target_space_id:slotId,week_start:input.weekStart,day_schedules:input.days,slot_minutes:60}}]);
  await assert.rejects(service.publishReservationWeek({...input,days:[input.days[0],input.days[0]]}));
  assert.equal(requests.length,1);
  assert.equal(await service.setReservationDayEnabled(slotId,input.weekStart,false),0);
  assert.equal(requests[1].name,'set_reservation_day_enabled');
  db.rpc=async()=>({data:null,error:{code:'P0001',message:'reservation_schedule_overlap'}});
  await assert.rejects(service.publishReservationWeek(input),/se cruza/);
});

test('calendar dates and week navigation preserve civil dates across month, year and DST boundaries',()=>{
  for(const key of ['2026-09-06','2026-12-31','2028-02-29']) assert.equal(calendar.calendarDateKey(calendar.calendarDate(key)),key);
  assert.equal(calendar.reservationWeekStart('2026-10-25'),'2026-10-19');
  assert.equal(calendar.shiftCalendarDate('2026-12-31',1),'2027-01-01');
  assert.equal(calendar.shiftCalendarDate('2028-02-28',1),'2028-02-29');
  assert.equal(calendar.shiftCalendarDate('2026-09-06',1),'2026-09-07');
});
