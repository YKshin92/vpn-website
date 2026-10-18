import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createPool} from '../.build/db.js';
import {buildApp} from '../.build/app.js';
import {testAdmin} from './auth-helper.mjs';

test('PostgreSQL and API integration with isolated synthetic records',async t=>{
  const pool=createPool();const app=buildApp(pool);const customers=[];const servers=[];const token=randomUUID();
  const admin=await testAdmin(pool,app);
  const request=(method,url,payload,headers={})=>app.inject({method,url,payload,headers:{host:'127.0.0.1:3000',...admin.headers,...headers}});
  try{
    await t.test('health connects to actual PostgreSQL',async()=>{const r=await request('GET','/api/health');assert.equal(r.statusCode,200);assert.equal(r.json().mode,'local-synthetic');});
    await t.test('synthetic server can be stored; live hostname rejected',async()=>{
      const r=await request('POST','/api/dev/servers',{name:'가상 시험 서버',hostname:'test.vpn.example.test'});assert.equal(r.statusCode,201);servers.push(r.json().id);
      assert.equal((await request('POST','/api/dev/servers',{name:'운영 대상 거부',hostname:'ieumvpn.link'})).statusCode,400);
    });
    await t.test('seeded server and five individual keys are readable without key secrets',async()=>{
      const servers=(await request('GET','/api/dev/servers')).json().servers;assert.ok(servers.some(s=>s.id==='demo-server-01'));
      const keys=(await request('GET','/api/dev/keys')).json().keys.filter(k=>k.id.startsWith('assignment-demo-customer-'));
      assert.equal(keys.length,5);assert.equal(new Set(keys.map(k=>k.customerId)).size,5);assert.ok(keys.every(k=>!('password' in k)&&!('accessUrl'in k)));
    });
    await t.test('new customer is persisted; SQL-like name remains data',async()=>{
      const displayName="가상 고객 '); DROP TABLE customers; --";
      for(let i=0;i<2;i++){const r=await request('POST','/api/dev/customers',{displayName,email:`test-${token}-${i}@example.test`,status:'review_required'});assert.equal(r.statusCode,201);customers.push(r.json().id);}
      const stored=await pool.query('SELECT display_name FROM ieum_dev.customers WHERE id=$1',[customers[0]]);assert.equal(stored.rows[0].display_name,displayName);
    });
    await t.test('duplicate email, real email and unexpected fields rejected',async()=>{
      assert.equal((await request('POST','/api/dev/customers',{displayName:'중복',email:`test-${token}-0@example.test`,status:'active'})).statusCode,409);
      assert.equal((await request('POST','/api/dev/customers',{displayName:'실제 주소 거부',email:'someone@example.com',status:'active'})).statusCode,400);
      assert.equal((await request('POST','/api/dev/customers',{displayName:'추가 필드',email:'no@example.test',status:'active',isAdmin:true})).statusCode,400);
    });
    await t.test('concurrent attempts cannot share a server key',async()=>{
      const requests=customers.map(customerId=>request('POST','/api/dev/keys',{customerId,serverId:'demo-server-01',outlineKeyId:`demo-${token}`}));
      const results=await Promise.all(requests);assert.deepEqual(results.map(r=>r.statusCode).sort(),[201,409]);
      const owner=results.find(r=>r.statusCode===201).json().customerId;
      assert.equal((await request('POST','/api/dev/keys',{customerId:owner,serverId:'demo-server-01',outlineKeyId:`demo-${token}-second`})).statusCode,409);
    });
    await t.test('unknown customer reference and cross-origin requests rejected',async()=>{
      assert.equal((await request('POST','/api/dev/keys',{customerId:'missing',serverId:'demo-server-01',outlineKeyId:'demo-missing'})).statusCode,400);
      assert.equal((await request('GET','/api/health',undefined,{host:'outside.example:3000'})).statusCode,403);
      assert.equal((await request('POST','/api/dev/customers',{}, {origin:'https://outside.example'})).statusCode,403);
    });
    await t.test('application role cannot change schema',async()=>{await assert.rejects(pool.query('CREATE TABLE ieum_dev.unauthorized_probe(id int)'),e=>e.code==='42501');});
    await t.test('stored customer survives API process restart',async()=>{
      const script=`import {createPool} from './.build/db.js';import {buildApp} from './.build/app.js';const p=createPool(),a=buildApp(p);try{const r=await a.inject({url:'/api/dev/customers',headers:{host:'127.0.0.1:3000',cookie:process.env.PROBE_COOKIE}});const found=r.json().customers.some(c=>c.id===process.env.PROBE_CUSTOMER_ID);if(r.statusCode!==200||!found)process.exitCode=1;}finally{await a.close();await p.end();}`;
      const run=()=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,['--input-type=module','-e',script],{env:{...process.env,PROBE_CUSTOMER_ID:customers[0],PROBE_COOKIE:admin.headers.cookie},stdio:'ignore'});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Restart persistence failed')));});
      await run();await run();
    });
  }finally{
    await pool.query('DELETE FROM ieum_dev.access_keys WHERE customer_id=ANY($1::text[])',[customers]);
    await pool.query('DELETE FROM ieum_dev.customers WHERE id=ANY($1::text[])',[customers]);
    await pool.query('DELETE FROM ieum_dev.servers WHERE id=ANY($1::text[])',[servers]);
    await pool.query('DELETE FROM ieum_dev.admins WHERE id=$1',[admin.id]);
    await app.close();await pool.end();
  }
});
