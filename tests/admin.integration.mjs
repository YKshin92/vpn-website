import test from 'node:test';import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createPool} from '../.build/db.js';import {buildApp} from '../.build/app.js';import {testAdmin} from './auth-helper.mjs';
test('admin session and persistent forward IP simulation',async t=>{
  let infrastructureCalls=0,healthCalls=0;
  const pool=createPool(),app=buildApp(pool,3000,async()=>{infrastructureCalls++;return {mode:'aws-read-only',status:'not-configured',changesAllowed:false};},undefined,async instance=>{healthCalls++;if(instance!=='vpnServer001')throw Object.assign(Error('unknown'),{statusCode:404});return {instanceName:instance,overall:'unknown',tcp:{status:'skipped',reason:'port-not-configured'}};}),headers={host:'127.0.0.1:3000'};
  const previous=(await pool.query("SELECT * FROM ieum_dev.simulation_states WHERE server_id='demo-server-01'")).rows[0];let admin;
  try{
    await t.test('local variable font is served with a same-origin font policy and no broad file route',async()=>{
      const page=await app.inject({url:'/admin',headers});assert.equal(page.statusCode,200);assert.match(page.headers['content-security-policy'],/font-src 'self'/);assert.match(page.body,/href="\/fonts.css"/);
      const css=await app.inject({url:'/fonts.css',headers});assert.equal(css.statusCode,200);assert.match(css.body,/font-family: "Noto Sans KR"/);assert.doesNotMatch(css.body,/https?:\/\//);
      const font=await app.inject({url:'/fonts/NotoSansKR-Variable.woff2',headers});assert.equal(font.statusCode,200);assert.match(font.headers['content-type'],/font\/woff2/);assert.equal(font.rawPayload.subarray(0,4).toString(),'wOF2');
      assert.equal((await app.inject({url:'/fonts/credentials.xml',headers})).statusCode,404);
    });
    await t.test('seven-character passwords rejected for setup and login',async()=>{
      for(const mode of ['setup','login'])assert.equal((await app.inject({method:'POST',url:'/api/auth/'+mode,headers,payload:{username:'boundary-test',password:'1234567'}})).statusCode,400);
    });
    await t.test('anonymous data, AWS and IP requests denied before any AWS reads',async()=>{for(const url of ['/api/dev/customers','/api/dev/keys','/api/admin/simulation','/api/admin/infrastructure','/api/admin/servers/vpnServer001/health'])assert.equal((await app.inject({url,headers})).statusCode,401);assert.equal(infrastructureCalls,0);assert.equal(healthCalls,0);});
    await t.test('first-admin setup is atomic and closes after first registration',async context=>{
      if((await pool.query('SELECT 1 FROM ieum_dev.admins LIMIT 1')).rowCount){context.skip('Existing administrator preserved');return;}
      const username='setup_'+randomBytes(8).toString('hex'),password=randomBytes(4).toString('hex');
      try{const attempts=await Promise.all([1,2].map(()=>app.inject({method:'POST',url:'/api/auth/setup',headers,payload:{username,password}})));assert.deepEqual(attempts.map(r=>r.statusCode).sort(),[200,409]);const stored=(await pool.query('SELECT password_hash FROM ieum_dev.admins WHERE username=$1',[username])).rows[0];assert.notEqual(stored.password_hash,password);}finally{await pool.query('DELETE FROM ieum_dev.admins WHERE username=$1',[username]);}
    });
    admin=await testAdmin(pool,app,randomBytes(4).toString('hex'));const request=(url,method='GET',payload,extra={})=>app.inject({url,method,payload,headers:{...headers,...admin.headers,...extra}});
    await t.test('health route requires an authenticated registered target and has no mutation method',async()=>{
      const report=await request('/api/admin/servers/vpnServer001/health');assert.equal(report.statusCode,200);assert.equal(report.json().instanceName,'vpnServer001');assert.equal(report.json().tcp.status,'skipped');
      assert.equal((await request('/api/admin/servers/unregistered/health')).statusCode,404);assert.equal((await request('/api/admin/servers/vpnServer001/health','POST',{})).statusCode,404);
    });
    await t.test('authenticated AWS read route has no write method',async()=>{const r=await request('/api/admin/infrastructure');assert.equal(r.statusCode,200);assert.equal(r.json().changesAllowed,false);assert.equal(infrastructureCalls,1);assert.equal((await request('/api/admin/infrastructure','POST',{})).statusCode,404);assert.equal(infrastructureCalls,1);});
    await t.test('login, session, CSRF, setup closure and wrong password',async()=>{
      assert.equal((await request('/api/auth/session')).json().authenticated,true);
      assert.equal((await app.inject({url:'/api/auth/login',method:'POST',headers,payload:{username:admin.username,password:'wrong-password-123'}})).statusCode,401);
      assert.equal((await request('/api/auth/setup','POST',{username:'second-admin',password:'not-a-real-password'})).statusCode,409);
      assert.equal((await request('/api/admin/simulation','POST',{action:'rotate',revision:0},{'x-csrf-token':'bad'})).statusCode,403);
      const persisted=await pool.query('SELECT token_hash FROM ieum_dev.sessions WHERE admin_id=$1',[admin.id]);assert.ok(persisted.rows.every(s=>!admin.headers.cookie.includes(s.token_hash)));
    });
    await pool.query("DELETE FROM ieum_dev.simulation_states WHERE server_id='demo-server-01'");
    await t.test('new IP and DNS retained; duplicate and stale execution blocked',async()=>{
      const responses=await Promise.all([request('/api/admin/simulation','POST',{action:'rotate',revision:0}),request('/api/admin/simulation','POST',{action:'rotate',revision:0})]);assert.deepEqual(responses.map(r=>r.statusCode).sort(),[200,409]);
      const result=responses.find(r=>r.statusCode===200).json();assert.equal(result.state.attachedIp,'192.0.2.20');assert.equal(result.state.dnsIp,'192.0.2.20');assert.equal(result.state.status,'success');
      assert.equal((await request('/api/admin/simulation','POST',{action:'rotate',revision:0})).statusCode,409);
      const reloaded=buildApp(pool);try{const r=await reloaded.inject({url:'/api/admin/simulation',headers:{...headers,...admin.headers}});assert.equal(r.json().state.attachedIp,'192.0.2.20');assert.ok(r.json().jobs.some(j=>j.actor===admin.username));}finally{await reloaded.close();}
    });
    await t.test('partial DNS failure stops without rollback; explicit forward confirmation',async()=>{
      const failed=await request('/api/admin/simulation','POST',{action:'rotate',revision:1,failure:'DNS 갱신'});assert.equal(failed.statusCode,200);assert.equal(failed.json().state.attachedIp,'192.0.2.30');assert.equal(failed.json().state.dnsIp,'192.0.2.20');assert.equal(failed.json().state.status,'needs-review');
      assert.equal((await request('/api/admin/simulation','POST',{action:'rotate',revision:2})).statusCode,409);
      const r=await request('/api/admin/simulation','POST',{action:'confirm',revision:2});assert.equal(r.json().state.dnsIp,'192.0.2.30');assert.equal(r.json().state.status,'success');
    });
    await t.test('logout revokes old cookie and expired session denied',async()=>{
      const cookie=admin.headers.cookie;await pool.query("UPDATE ieum_dev.sessions SET expires_at=now()-interval '1 second' WHERE admin_id=$1",[admin.id]);assert.equal((await request('/api/dev/customers')).statusCode,401);
      const login=await app.inject({url:'/api/auth/login',method:'POST',headers,payload:{username:admin.username,password:admin.password}});assert.equal(login.statusCode,200);const h={...headers,cookie:login.headers['set-cookie'].split(';')[0],'x-csrf-token':login.json().csrf};
      assert.equal((await app.inject({url:'/api/auth/logout',method:'POST',headers:h,payload:{}})).statusCode,200);assert.equal((await app.inject({url:'/api/dev/customers',headers:h})).statusCode,401);assert.notEqual(cookie,h.cookie);
    });
  }finally{
    if(admin){await pool.query('DELETE FROM ieum_dev.simulation_jobs WHERE actor=$1',[admin.username]);await pool.query('DELETE FROM ieum_dev.admins WHERE id=$1',[admin.id]);}
    await pool.query("DELETE FROM ieum_dev.simulation_states WHERE server_id='demo-server-01'");if(previous)await pool.query('INSERT INTO ieum_dev.simulation_states(server_id,state,revision) VALUES($1,$2,$3)',[previous.server_id,previous.state,previous.revision]);
    await app.close();await pool.end();
  }
});
