import test from 'node:test';
import assert from 'node:assert/strict';
import {checkServerHealth,serverHealthReader,publicProbeAddress,probeTcp} from '../.build/server-health.js';
import {infrastructureConfig,infrastructureTargets} from '../.build/infrastructure.js';
const config={...infrastructureConfig({}),enabled:true,account:'111122223333',instance:'synthetic-one',domain:'one.example.test',servicePort:54137};
const snapshot=(overrides={})=>({status:'ok',mode:'aws-read-only',region:config.region,instanceName:config.instance,domain:config.domain,observedAt:'2026-10-17T13:00:00Z',changesAllowed:false,instance:{status:'ok',data:{state:'running',publicIp:'3.34.11.44'}},ipMatch:true,dnsManager:{status:'ns-match'},...overrides});
const deps=(value=snapshot(),tcp=async()=>({status:'connected',latencyMs:15}))=>({read:async()=>value,tcp,now:()=>Date.parse('2026-10-17T13:00:00Z')});
test('health keeps server, TCP and DNS independent; a reachable port does not fix DNS mismatch',async()=>{
 const ok=await checkServerHealth(config,deps());assert.equal(ok.overall,'ok');assert.equal(ok.tcp.latencyMs,15);assert.equal(ok.servicePort,54137);
 const mismatch=await checkServerHealth(config,deps(snapshot({ipMatch:false})));assert.equal(mismatch.server.status,'running');assert.equal(mismatch.tcp.status,'connected');assert.equal(mismatch.dns.status,'mismatch');assert.equal(mismatch.overall,'attention');
 const authority=await checkServerHealth(config,deps(snapshot({dnsManager:{status:'unverified'}})));assert.equal(authority.overall,'unknown');
});
test('unverified, stopped, private IP or missing-port instances never dial',async()=>{
 let calls=0;const dial=async()=>{calls++;return {status:'connected'};};
 const auth=await checkServerHealth(config,deps({status:'authentication-error',error:'authentication-required'},dial));assert.equal(auth.tcp.reason,'instance-unverified');
 const stopped=await checkServerHealth(config,deps(snapshot({instance:{status:'ok',data:{state:'stopped',publicIp:'3.34.11.44'}}}),dial));assert.equal(stopped.tcp.reason,'instance-not-running');
 const privateIp=await checkServerHealth(config,deps(snapshot({instance:{status:'ok',data:{state:'running',publicIp:'169.254.169.254'}}}),dial));assert.equal(privateIp.tcp.reason,'invalid-target');
 const noPort=await checkServerHealth({...config,servicePort:undefined},deps(snapshot(),dial));assert.equal(noPort.tcp.reason,'port-not-configured');assert.equal(noPort.servicePort,null);assert.equal(calls,0);
});
test('probe exceptions stay redacted and cannot imply server shutdown',async()=>{
 const result=await checkServerHealth(config,deps(snapshot(),async()=>{throw Error('secret-token credential path');}));assert.equal(result.server.status,'running');assert.equal(result.tcp.status,'failed');assert.equal(result.overall,'attention');assert.ok(!JSON.stringify(result).includes('secret-token'));
});
test('network probe rejects non-public addresses and invalid ports before creating a socket',async()=>{
 for(const ip of ['127.0.0.1','10.1.2.3','172.16.0.1','192.168.1.1','169.254.169.254','100.64.1.1','192.0.2.1','198.51.100.1','203.0.113.1','224.0.0.1','::1','hostname.example.test']){assert.equal(publicProbeAddress(ip),false,ip);assert.equal((await probeTcp(ip,54137)).status,'skipped');}
 assert.equal(publicProbeAddress('3.34.11.44'),true);assert.equal((await probeTcp('3.34.11.44',65536)).status,'skipped');
});
test('registered per-server ports are validated and never silently reuse the global port for a fleet',()=>{
 const targets=infrastructureTargets({IEUM_OUTLINE_SERVICE_PORT:'54137',IEUM_AWS_SERVER_TARGETS:JSON.stringify([{instance:'one',domain:'one.example.test',servicePort:12345},{instance:'two',domain:'two.example.test'}])});assert.equal(targets[0].servicePort,12345);assert.equal(targets[1].servicePort,undefined);
 for(const port of [0,65536,'54137',1.1])assert.throws(()=>infrastructureTargets({IEUM_AWS_SERVER_TARGETS:JSON.stringify([{instance:'one',domain:'one.example.test',servicePort:port}])}));
});
test('health reader coalesces and caches per target, expires, and rejects unknown targets before reading',async()=>{
 let calls=0,now=1000,complete;const pending=new Promise(resolve=>{complete=resolve;});
 const reader=serverHealthReader({targets:()=>[config,{...config,instance:'synthetic-two',servicePort:12345}],read:async c=>{calls++;if(c.instance===config.instance)await pending;return snapshot({instanceName:c.instance});},tcp:async()=>({status:'connected'}),now:()=>now});
 const a=reader(config.instance),b=reader(config.instance);assert.equal(calls,1);complete();await Promise.all([a,b]);await reader(config.instance);assert.equal(calls,1);await reader('synthetic-two');assert.equal(calls,2);now+=10001;await reader(config.instance);assert.equal(calls,3);
 await assert.rejects(reader('unregistered'),e=>e.statusCode===404);assert.equal(calls,3);
});
