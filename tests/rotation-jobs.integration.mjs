import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {createPool} from '../.build/db.js';import {buildApp} from '../.build/app.js';import {testAdmin} from './auth-helper.mjs';
test('durable rotation jobs, interruption recovery and audit',async t=>{
 const pool=createPool();let app,admin;const ids=[];const headers={host:'127.0.0.1:3000'};
 try{
  if((await pool.query("SELECT 1 FROM ieum_dev.rotation_jobs WHERE status IN ('planned','running','needs_review')")).rowCount){t.skip('Existing open operator job preserved');return;}
  app=buildApp(pool,3000,async()=>({status:'not-configured'}));await app.ready();admin=await testAdmin(pool,app);
  const request=(url,method='GET',payload,extra={})=>app.inject({url,method,payload,headers:{...headers,...admin.headers,...extra}});
  const plan=async(failureStep='')=>{const r=await request('/api/admin/ip-jobs','POST',{requestKey:randomUUID(),failureStep});assert.equal(r.statusCode,201);ids.push(r.json().job.id);return r.json().job;};
  const close=async j=>{const r=await request(`/api/admin/ip-jobs/${j.id}/review`,'POST',{revision:j.revision,confirm:true,note:'모의 상태를 확인하고 시험 작업 종료'});assert.equal(r.statusCode,200);return r.json().job;};
  await t.test('authentication, CSRF and live payload rejected',async()=>{
   assert.equal((await app.inject({url:'/api/admin/ip-jobs',headers})).statusCode,401);
   assert.equal((await request('/api/admin/ip-jobs','POST',{requestKey:randomUUID()},{'x-csrf-token':'wrong'})).statusCode,403);
   assert.equal((await request('/api/admin/ip-jobs','POST',{requestKey:randomUUID(),mode:'live'})).statusCode,400);
  });
  await t.test('saved plan is idempotent; open target cannot get a second job',async()=>{
   const key=randomUUID();const first=await request('/api/admin/ip-jobs','POST',{requestKey:key});assert.equal(first.statusCode,201);const j=first.json().job;ids.push(j.id);
   assert.equal((await request('/api/admin/ip-jobs','POST',{requestKey:key})).json().job.id,j.id);
   assert.equal((await request('/api/admin/ip-jobs','POST',{requestKey:key,failureStep:'dns'})).statusCode,409);
   assert.equal((await request('/api/admin/ip-jobs','POST',{requestKey:randomUUID()})).statusCode,409);
   assert.equal((await request(`/api/admin/ip-jobs/${j.id}/run`,'POST',{revision:999,confirm:true})).statusCode,409);await close(j);
  });
  await t.test('one worker at a time, persisted intent/done, no rerun after success',async()=>{
   const j=await plan();const results=await Promise.all([1,2].map(()=>request(`/api/admin/ip-jobs/${j.id}/run`,'POST',{revision:j.revision,confirm:true})));assert.deepEqual(results.map(r=>r.statusCode).sort(),[200,409]);const result=results.find(r=>r.statusCode===200).json().job;
   assert.equal(result.status,'succeeded');assert.equal(result.state.attachedIp,'192.0.2.20');assert.equal(result.state.dnsIp,'192.0.2.20');assert.equal(result.revision,12);
   const detail=(await request('/api/admin/ip-jobs/'+j.id)).json();assert.equal(detail.events.length,13);assert.equal(detail.events[1].phase,'intent');assert.equal(detail.events.at(-1).phase,'done');assert.equal(detail.events.at(-1).actor,admin.username);
   assert.equal((await request(`/api/admin/ip-jobs/${j.id}/run`,'POST',{revision:12,confirm:true})).statusCode,409);
  });
  await t.test('partial failure blocks extra allocation until explicit review',async()=>{
   const j=await plan('dns'),result=(await request(`/api/admin/ip-jobs/${j.id}/run`,'POST',{revision:0,confirm:true})).json().job;
   assert.equal(result.status,'needs_review');assert.equal(result.state.attachedIp,'192.0.2.20');assert.equal(result.state.dnsIp,'192.0.2.10');assert.equal(result.state.pending,'dns');
   assert.equal((await request('/api/admin/ip-jobs','POST',{requestKey:randomUUID()})).statusCode,409);
   const ended=await close(result);assert.equal(ended.status,'closed');assert.equal(ended.state.dnsIp,'192.0.2.10');
  });
  await t.test('restarted app converts orphaned intent to review without replay',async()=>{
   const j=await plan();await pool.query("UPDATE ieum_dev.rotation_jobs SET status='running',state=state || '{\"pending\":\"allocate\"}'::jsonb WHERE id=$1",[j.id]);
   const restarted=buildApp(pool);try{await restarted.ready();const response=await restarted.inject({url:'/api/admin/ip-jobs/'+j.id,headers:{...headers,...admin.headers}});assert.equal(response.json().job.status,'needs_review');assert.equal(response.json().events.at(-1).phase,'interrupted');await close(response.json().job);}finally{await restarted.close();}
  });
  await t.test('worker lock prevents restart recovery from interrupting active worker',async()=>{
   const j=await plan(),running=request(`/api/admin/ip-jobs/${j.id}/run`,'POST',{revision:0,confirm:true});
   for(let i=0;i<40;i++){const state=(await pool.query('SELECT status FROM ieum_dev.rotation_jobs WHERE id=$1',[j.id])).rows[0].status;if(state==='running')break;await new Promise(r=>setTimeout(r,5));}
   const other=buildApp(pool);try{await other.ready();assert.equal((await running).json().job.status,'succeeded');}finally{await other.close();}
  });
  await t.test('manual reconciliation also unlocks orphaned work without server restart',async()=>{
   const j=await plan();await pool.query("UPDATE ieum_dev.rotation_jobs SET status='running',state=state || '{\"pending\":\"attach\"}'::jsonb WHERE id=$1",[j.id]);
   const result=await request('/api/admin/ip-jobs/reconcile','POST',{confirm:true});assert.equal(result.statusCode,200);assert.equal(result.json().interrupted,1);await close((await request('/api/admin/ip-jobs/'+j.id)).json().job);
  });
 }finally{if(ids.length)await pool.query('DELETE FROM ieum_dev.rotation_jobs WHERE id=ANY($1::text[])',[ids]);if(admin)await pool.query('DELETE FROM ieum_dev.admins WHERE id=$1',[admin.id]);if(app)await app.close();await pool.end();}
});
