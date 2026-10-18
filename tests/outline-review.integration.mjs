import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {createPool} from '../.build/db.js';import {buildApp} from '../.build/app.js';import {createOutlineReview} from '../.build/outline-review.js';import {withOutlineWorkerLock} from '../.build/outline-worker-lock.js';import {testAdmin} from './auth-helper.mjs';
test('operation compare/close routes enforce session, CSRF, target, note and original state preservation',async()=>{
 const pool=createPool(),id=randomUUID();let reads=0,closes=0,operation={id,instance:'synthetic-server',serverId:'generation-a',keyId:'1',action:'rename',state:'needs_review',reason:'connection-timeout',createdAt:new Date(Date.now()-180000).toISOString(),revision:0,requested:{name:'Changed'},review:null};
 const control={targets:()=>[{instance:'synthetic-server'}],inspection:async()=>{reads++;return {serverId:'generation-a',key:{id:'1',name:'Changed',port:12345,ownLimitBytes:null,ownLimitKnown:true}};}},store={ready:async()=>true,get:async(instance,key)=>instance===operation.instance&&key===id?structuredClone(operation):null,lease:async(_instance,work)=>work(),close:async(_,review)=>{closes++;operation={...operation,state:'closed',revision:1,review};}};
 const service=createOutlineReview(pool,control,store,()=>true),app=buildApp(pool,3000,undefined,undefined,undefined,undefined,undefined,service),host={host:'127.0.0.1:3000'},url='/api/admin/servers/synthetic-server/outline/operations/'+id;let admin;
 try{
  assert.equal((await app.inject({url:url+'/compare',headers:host})).statusCode,401);assert.equal(reads,0);admin=await testAdmin(pool,app);const headers={...host,...admin.headers};const compare=await app.inject({url:url+'/compare',headers});assert.equal(compare.statusCode,200);assert.equal(compare.json().comparison,'matching');assert.equal(compare.json().canClose,true);
  const payload={fingerprint:compare.json().fingerprint,checkedAt:compare.json().checkedAt,confirm:'synthetic-server',confirmKey:'1',note:'현재 상태와 실패 이력을 직접 확인하고 기록함',acknowledge:true};
  assert.equal((await app.inject({url:url+'/close',method:'POST',headers:{...host,cookie:headers.cookie},payload})).statusCode,403);assert.equal(closes,0);
  assert.equal((await app.inject({url:url+'/close',method:'POST',headers,payload:{...payload,note:'ss://synthetic-private-value'}})).statusCode,400);assert.equal(closes,0);
  const closed=await app.inject({url:url+'/close',method:'POST',headers,payload});assert.equal(closed.statusCode,200);assert.equal(closed.json().status,'closed');assert.equal(closed.json().keysChanged,false);assert.equal(operation.reason,'connection-timeout');assert.equal(operation.review.priorState,'needs_review');assert.equal(closes,1);
  assert.equal((await app.inject({url:url+'/close',method:'POST',headers,payload})).statusCode,409);assert.equal(closes,1);assert.equal((await app.inject({url:'/api/admin/servers/unknown/outline/operations/'+id+'/compare',headers})).statusCode,404);
 }finally{await app.close();if(admin)await pool.query('DELETE FROM ieum_dev.admins WHERE id=$1',[admin.id]);await pool.end();}
});
test('database worker lease excludes concurrent processes and releases after errors without schema changes',async()=>{
 const a=createPool(),b=createPool(),instance='worker-lock-test-'+randomUUID();
 try{const result=await withOutlineWorkerLock(a,instance,async()=>{await assert.rejects(withOutlineWorkerLock(b,instance,async()=>{throw Error('Must not run');}),{reason:'operation-busy'});return 'held';});assert.equal(result,'held');
  await assert.rejects(withOutlineWorkerLock(a,instance,async()=>{throw Error('Synthetic worker failure');}),/Synthetic worker failure/);assert.equal(await withOutlineWorkerLock(b,instance,async()=>true),true);
 }finally{await a.end();await b.end();}
});
