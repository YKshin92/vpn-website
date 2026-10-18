import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {createPool} from '../.build/db.js';import {buildApp} from '../.build/app.js';import {createOutlineControl} from '../.build/outline-control.js';import {testAdmin} from './auth-helper.mjs';
test('key control page and API enforce session, CSRF, schema and disabled writes without effects',async()=>{
 const pool=createPool();let reads=0,requests=0;const service=createOutlineControl(pool,{targets:()=>[{instance:'synthetic-server',domain:'outline.example.test',region:'ap-northeast-2'}],enabled:()=>false,secrets:{read:async()=>{reads++;return null;},write:async()=>{throw Error('Unexpected secret update');}},request:async()=>{requests++;throw Error('Unexpected Outline request');}});
 const app=buildApp(pool,3000,undefined,undefined,undefined,undefined,service),host={host:'127.0.0.1:3000'},base='/api/admin/servers/synthetic-server/outline';let admin;
 try{
  const page=await app.inject({url:'/admin/keys?server=synthetic-server',headers:host});assert.equal(page.statusCode,200);assert.match(page.body,/key-admin.js/);assert.match(page.headers['content-security-policy'],/connect-src 'self'/);
  for(const url of ['/key-admin.js','/key-admin.css'])assert.equal((await app.inject({url,headers:host})).statusCode,200);
  for(const url of ['/api/admin/outline/servers',base+'/overview'])assert.equal((await app.inject({url,headers:host})).statusCode,401);
  assert.equal((await app.inject({method:'POST',url:base+'/commands',headers:host,payload:{}})).statusCode,401);assert.equal(reads,0);
  admin=await testAdmin(pool,app);const headers={...host,...admin.headers},payload={requestId:randomUUID(),serverId:'synthetic-generation',confirm:'synthetic-server',acknowledge:true,action:'create',name:'Synthetic'};
  assert.deepEqual((await app.inject({url:'/api/admin/outline/servers',headers})).json().servers,[{instance:'synthetic-server',domain:'outline.example.test',region:'ap-northeast-2'}]);
  assert.equal((await app.inject({method:'POST',url:base+'/commands',headers:{...host,cookie:headers.cookie},payload})).statusCode,403);
  const command=await app.inject({method:'POST',url:base+'/commands',headers,payload});assert.equal(command.statusCode,403);assert.equal(command.json().reason,'key-writes-disabled');assert.equal(requests,0);assert.equal(reads,0);
  const reveal=await app.inject({method:'POST',url:base+'/reveal',headers,payload:{requestId:randomUUID(),serverId:'synthetic-generation',keyId:'0',confirm:'synthetic-server',acknowledge:true}});assert.equal(reveal.statusCode,403);assert.equal(reveal.json().reason,'key-writes-disabled');
  assert.equal((await app.inject({method:'POST',url:base+'/commands',headers,payload:{...payload,unknown:true}})).statusCode,400);
  assert.equal((await app.inject({url:'/api/admin/servers/unknown/outline/overview',headers})).statusCode,404);
  const overview=await app.inject({url:base+'/overview',headers});assert.equal(overview.statusCode,409);assert.equal(overview.json().reason,'not-configured');assert.equal(requests,0);
 }finally{await app.close();if(admin)await pool.query('DELETE FROM ieum_dev.admins WHERE id=$1',[admin.id]);await pool.end();}
});
