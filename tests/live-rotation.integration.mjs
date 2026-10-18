import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {createPool} from '../.build/db.js';import {buildApp} from '../.build/app.js';import {testAdmin} from './auth-helper.mjs';import {waitForDnsVerification} from '../.build/dns-verification.js';import {livePlanDigest} from '../.build/live-rotation.js';import {createLiveRotationDriver} from '../.build/lightsail-rotation-driver.js';
test('live approval endpoints with fake operations only',async t=>{
 const pool=createPool();let app,admin,enabled=false,failure='',captures=0,drivers=0,dnsScenario='';const ids=[],calls=[];
 const services={enabled:()=>enabled,capture:async(instance,id)=>{captures++;return {accountId:'111122223333',profile:'fake-only',instance,domain:instance+'.example.test',oldIp:'192.0.2.10',oldStaticIpName:'old-test',newStaticIpName:'ieum-'+id,domainEntryId:'test-a-record',expectedNameServers:['ns.example.test'],servicePort:40665,dnsServers:[],region:'ap-northeast-2',createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+900000).toISOString(),policyVersion:2,retainOldIp:false,releaseOldIpAfterVerification:true,retainKeys:true};},driver:(p,onVerification)=>{drivers++;const effect=async(name)=>{calls.push(name);await new Promise(r=>setTimeout(r,15));if(name===failure)throw Error('mock failure');};return createLiveRotationDriver(p,true,{preflight:()=>effect('preflight'),allocate:async()=>{await effect('allocate');return '192.0.2.20';},...Object.fromEntries(['detach','attach','service','dns','verify','release'].map(name=>[name,()=>effect(name)])),...(dnsScenario?{verify:async(ip,observe)=>{await effect('verify');let now=0,reads=0;await waitForDnsVerification(p.oldIp,ip,{read:async()=>{reads++;return dnsScenario==='timeout'||reads<3?[p.oldIp]:[ip];},tcp:async()=>{}},observe,{now:()=>now,sleep:async ms=>{now+=ms;},timestamp:()=>new Date(now).toISOString()});}}:{})},onVerification);}};
 try{
 app=buildApp(pool,3000,async()=>({status:'not-configured'}),services);await app.ready();admin=await testAdmin(pool,app);
 const request=(url,method='GET',payload,extra={})=>app.inject({url,method,payload,headers:{host:'127.0.0.1:3000',...admin.headers,...extra}});
 const create=async()=>{const r=await request('/api/admin/live-ip-jobs','POST',{instance:'test-'+randomUUID().replaceAll('-',''),requestKey:randomUUID()});assert.equal(r.statusCode,201);const j=r.json().job;ids.push(j.id);return j;};
 const approval=j=>({revision:j.revision,planHash:j.planHash,typedInstance:j.plan.instance,ackDowntime:true,ackReleaseOldIp:true,ackNoOtherUsers:true});
 await t.test('anonymous and CSRF blocked before capture',async()=>{assert.equal((await app.inject({url:'/api/admin/live-ip-jobs',headers:{host:'127.0.0.1:3000'}})).statusCode,401);assert.equal((await request('/api/admin/live-ip-jobs','POST',{instance:'test',requestKey:randomUUID()},{'x-csrf-token':'bad'})).statusCode,403);assert.equal(captures,0);});
 await t.test('disabled master gate rejects run before driver creation',async()=>{const j=await create();assert.equal((await request(`/api/admin/live-ip-jobs/${j.id}/run`,'POST',approval(j))).statusCode,403);assert.equal(drivers,0);assert.equal((await request(`/api/admin/live-ip-jobs/${j.id}/cancel`,'POST',{revision:0})).statusCode,200);});
 enabled=true;
 await t.test('typed instance, hash, expiry and acknowledgements checked before any effects',async()=>{
  const j=await create();for(const changed of [{typedInstance:'other'},{planHash:'0'.repeat(64)},{revision:99},{ackNoOtherUsers:false}])assert.ok([400,409].includes((await request(`/api/admin/live-ip-jobs/${j.id}/run`,'POST',{...approval(j),...changed})).statusCode));assert.equal(drivers,0);
  await pool.query("UPDATE ieum_dev.live_rotation_jobs SET expires_at=now()-interval '1 second' WHERE id=$1",[j.id]);assert.equal((await request(`/api/admin/live-ip-jobs/${j.id}/run`,'POST',approval(j))).statusCode,409);assert.equal(drivers,0);await request(`/api/admin/live-ip-jobs/${j.id}/cancel`,'POST',{revision:0});
 });
 await t.test('old retention approval and matching-hash legacy plans never execute under release policy',async()=>{
  const j=await create(),before=drivers,{ackReleaseOldIp,...old}=approval(j);
  assert.equal((await request(`/api/admin/live-ip-jobs/${j.id}/run`,'POST',{...old,ackRetainOldIp:true})).statusCode,400);
  const legacy={...j.plan,retainOldIp:true};delete legacy.policyVersion;delete legacy.releaseOldIpAfterVerification;
  const digest=livePlanDigest(legacy);await pool.query('UPDATE ieum_dev.live_rotation_jobs SET plan=$2,plan_hash=$3 WHERE id=$1',[j.id,legacy,digest]);
  assert.equal((await request(`/api/admin/live-ip-jobs/${j.id}/run`,'POST',{...approval(j),planHash:digest})).statusCode,409);assert.equal(drivers,before);
  await request(`/api/admin/live-ip-jobs/${j.id}/cancel`,'POST',{revision:0});
 });
 await t.test('one approved execution, ordered fake effects, old IP released last and rerun blocked',async()=>{
  const j=await create();const responses=await Promise.all([1,2].map(()=>request(`/api/admin/live-ip-jobs/${j.id}/run`,'POST',approval(j))));assert.deepEqual(responses.map(r=>r.statusCode).sort(),[200,409]);const result=responses.find(r=>r.statusCode===200).json().job;assert.equal(result.status,'succeeded');assert.equal(result.state.attachedIp,'192.0.2.20');assert.equal(result.state.dnsIp,'192.0.2.20');assert.deepEqual(calls,['preflight','allocate','detach','attach','service','dns','verify','release']);assert.equal(result.plan.retainOldIp,false);assert.equal(result.state.oldIpCleanup.status,'released');
  assert.equal((await request(`/api/admin/live-ip-jobs/${j.id}/run`,'POST',{...approval(result)})).statusCode,409);const detail=(await request('/api/admin/live-ip-jobs/'+j.id)).json();assert.equal(detail.events.length,16);assert.equal(detail.events[1].phase,'approved');
 });
 await t.test('failed effect preserves last state and forbids cancel or new conflicting plan',async()=>{
  failure='dns';const j=await create(),r=await request(`/api/admin/live-ip-jobs/${j.id}/run`,'POST',approval(j)),failed=r.json().job;assert.equal(failed.status,'needs_review');assert.equal(failed.state.attachedIp,'192.0.2.20');assert.equal(failed.state.dnsIp,'192.0.2.10');assert.equal((await request(`/api/admin/live-ip-jobs/${j.id}/cancel`,'POST',{revision:failed.revision})).statusCode,409);assert.equal((await request('/api/admin/live-ip-jobs','POST',{instance:j.plan.instance,requestKey:randomUUID()})).statusCode,409);failure='';
 });
 await t.test('verification failure never releases; release failure stays uncertain and cannot rerun',async()=>{
  for(const step of ['verify','release']){failure=step;const j=await create(),before=calls.length;const r=await request(`/api/admin/live-ip-jobs/${j.id}/run`,'POST',approval(j)),failed=r.json().job;assert.equal(failed.status,'needs_review');assert.equal(failed.state.pending,step);assert.equal(failed.state.dnsIp,'192.0.2.20');assert.equal(calls.slice(before).filter(c=>c==='release').length,step==='release'?1:0);const count=calls.length;assert.equal((await request(`/api/admin/live-ip-jobs/${j.id}/run`,'POST',approval(failed))).statusCode,409);assert.equal(calls.length,count);}failure='';
 });
 await t.test('DNS waiting progress is durable and delayed verification releases once without replaying mutations',async()=>{
  dnsScenario='delayed';const j=await create(),before=calls.length;
  const result=(await request(`/api/admin/live-ip-jobs/${j.id}/run`,'POST',approval(j))).json().job;assert.equal(result.status,'succeeded');assert.equal(result.state.dnsVerification.status,'verified');assert.equal(result.state.dnsVerification.attempt,3);assert.equal(result.state.oldIpCleanup.status,'released');
  assert.deepEqual(calls.slice(before),['preflight','allocate','detach','attach','service','dns','verify','release']);const details=(await request('/api/admin/live-ip-jobs/'+j.id)).json();assert.ok(details.events.some(e=>e.step==='verify'&&e.phase==='waiting'&&e.detail.includes('dns-propagation')));dnsScenario='';
 });
 await t.test('DNS timeout preserves structured cause and old IP without permitting a replay',async()=>{
  dnsScenario='timeout';const j=await create(),before=calls.length;
  const result=(await request(`/api/admin/live-ip-jobs/${j.id}/run`,'POST',approval(j))).json().job;assert.equal(result.status,'needs_review');assert.equal(result.state.pending,'verify');assert.equal(result.state.dnsVerification.status,'timed_out');assert.equal(result.state.dnsVerification.reason,'verification-timeout');assert.equal(result.state.oldIpCleanup,undefined);assert.ok(!calls.slice(before).includes('release'));
  const details=(await request('/api/admin/live-ip-jobs/'+j.id)).json();assert.ok(details.events.some(e=>e.phase==='timed_out'));const count=calls.length;assert.equal((await request(`/api/admin/live-ip-jobs/${j.id}/run`,'POST',approval(result))).statusCode,409);assert.equal(calls.length,count);dnsScenario='';
 });
 await t.test('orphaned running job moves to review, never replays',async()=>{
  const j=await create();await pool.query("UPDATE ieum_dev.live_rotation_jobs SET status='running',state=state || '{\"pending\":\"attach\"}'::jsonb WHERE id=$1",[j.id]);const count=drivers;const r=await request('/api/admin/live-ip-jobs/reconcile','POST',{confirm:true});assert.equal(r.statusCode,200);assert.equal((await request('/api/admin/live-ip-jobs/'+j.id)).json().job.status,'needs_review');assert.equal(drivers,count);
 });
  await t.test('preflight failure prevents any allocation or detachment',async()=>{
   failure='preflight';const j=await create(),before=calls.length;const response=await request(`/api/admin/live-ip-jobs/${j.id}/run`,'POST',approval(j));assert.equal(response.json().job.status,'needs_review');assert.deepEqual(calls.slice(before),['preflight']);failure='';
  });
 }finally{if(ids.length)await pool.query('DELETE FROM ieum_dev.live_rotation_jobs WHERE id=ANY($1::text[])',[ids]);if(admin)await pool.query('DELETE FROM ieum_dev.admins WHERE id=$1',[admin.id]);if(app)await app.close();await pool.end();}
});
