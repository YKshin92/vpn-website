import test from 'node:test';import assert from 'node:assert/strict';
import {createPool} from '../.build/db.js';import {buildApp} from '../.build/app.js';import {createOutlineService} from '../.build/outline.js';import {testAdmin} from './auth-helper.mjs';
test('Outline routes enforce administrator session and CSRF, hide secrets and provide no key mutation',async()=>{
 const pool=createPool();let stored=null,reads=0,writes=0;
 const service=createOutlineService({targets:()=>[{instance:'synthetic-server',domain:'outline.example.test'}],secrets:{read:async()=>{reads++;return stored;},write:async(_,value)=>{writes++;stored=value;}},read:async()=>({status:'ok',instance:{status:'ok',data:{state:'running',publicIp:'52.79.185.31'}}}),fetch:async()=>({accessKeys:[{id:'1',name:'synthetic',port:12345,password:'synthetic-secret',accessUrl:'ss://synthetic-secret'}]})});
 const app=buildApp(pool,3000,undefined,undefined,undefined,service),base='/api/admin/servers/synthetic-server/outline',host={host:'127.0.0.1:3000'};let admin;
 try{
  assert.equal((await app.inject({url:base+'/keys',headers:host})).statusCode,401);assert.equal(reads,0);
  admin=await testAdmin(pool,app);const headers={...host,...admin.headers};
  assert.equal((await app.inject({url:base+'/keys',headers})).json().status,'not-configured');
  const payload={apiUrl:'https://outline.example.test:12345/synthetic-path',certSha256:'A'.repeat(64)};
  assert.equal((await app.inject({url:base+'/connection',method:'POST',headers:{...host,cookie:headers.cookie},payload})).statusCode,403);assert.equal(writes,0);
  const save=await app.inject({url:base+'/connection',method:'POST',headers,payload});assert.equal(save.statusCode,200);assert.deepEqual(save.json(),{configured:true});assert.equal(writes,1);
  const metadata=await app.inject({url:base+'/connection',headers});assert.equal(metadata.json().configured,true);assert.ok(!metadata.body.includes('synthetic-path'));assert.ok(!metadata.body.includes('certSha256'));
  const keys=await app.inject({url:base+'/keys',headers});assert.equal(keys.statusCode,200);assert.deepEqual(keys.json().keys,[{id:'1',name:'synthetic',port:12345}]);assert.ok(!keys.body.includes('synthetic-secret'));
  assert.equal((await app.inject({url:'/api/admin/servers/unknown/outline/keys',headers})).statusCode,404);
  for(const method of ['POST','DELETE','PUT'])assert.equal((await app.inject({url:base+'/keys',method,headers})).statusCode,404);
 }finally{await app.close();if(admin)await pool.query('DELETE FROM ieum_dev.admins WHERE id=$1',[admin.id]);await pool.end();}
});
