import test from 'node:test';
import assert from 'node:assert/strict';
import {infrastructureConfig,infrastructureTargets,readInfrastructure} from '../.build/infrastructure.js';
test('multiple server targets keep their own domains and reject duplicate names',()=>{
 const targets=infrastructureTargets({IEUM_AWS_SERVER_TARGETS:JSON.stringify([{instance:'one',domain:'one.example.test'},{instance:'two',domain:'two.example.test'}])});assert.equal(targets.length,2);assert.equal(targets[1].domain,'two.example.test');assert.equal(targets[0].region,'ap-northeast-2');
 assert.throws(()=>infrastructureTargets({IEUM_AWS_SERVER_TARGETS:'[{"instance":"one","domain":"one.test"},{"instance":"one","domain":"two.test"}]'}));
 assert.throws(()=>infrastructureTargets({IEUM_AWS_SERVER_TARGETS:'[{"instance":"one","domain":"https://bad.test"}]'}));
});
const config={...infrastructureConfig({}),enabled:true,account:'111122223333'};
test('explicit DNS resolver configuration rejects invalid values before any reads',async()=>{
  const noCalls=new Proxy({}, {get(){throw Error('Must not perform reads');}});
  assert.deepEqual(infrastructureConfig({IEUM_DNS_SERVERS:'192.0.2.1, 192.0.2.2'}).dnsServers,['192.0.2.1','192.0.2.2']);
  assert.equal((await readInfrastructure({...config,dnsServers:['not-an-ip']},noCalls)).status,'configuration-error');
  assert.equal((await readInfrastructure({...config,dnsServers:Array(5).fill('192.0.2.1')},noCalls)).status,'configuration-error');
});
const zone=(provider='lightsail')=>({provider,id:'zone-example',nameServers:['NS-ONE.EXAMPLE.','ns-two.example.'],records:[{type:'A',values:['192.0.2.20']}]});
function operations(overrides={}){return {identity:async()=>config.account,instance:async()=>({name:config.instance,state:'running',publicIp:'192.0.2.20',isStaticIp:true}),staticIps:async()=>[{name:'example-ip',ip:'192.0.2.20',attachedTo:config.instance}],lightsailZone:async()=>[zone()],route53Zones:async()=>[],publicDns:async()=>({nameServers:['ns-two.example','ns-one.example'],addresses:['192.0.2.10','192.0.2.20']}),...overrides};}
test('AWS remains disabled without explicit enable and target account',async()=>{
  const noCalls=new Proxy({}, {get(){throw Error('Must not perform reads');}});
  assert.equal((await readInfrastructure({...config,enabled:false},noCalls)).status,'not-configured');
  assert.equal((await readInfrastructure({...config,account:''},noCalls)).status,'not-configured');
});
test('wrong AWS account stops before resource and DNS queries',async()=>{
  const calls=[];const ops=operations({identity:async()=>{calls.push('identity');return '999988887777';},instance:async()=>{calls.push('instance');throw Error();}});
  assert.equal((await readInfrastructure(config,ops)).status,'account-mismatch');assert.deepEqual(calls,['identity']);
});
test('NS set comparison ignores case, order and trailing dot; public A may contain multiple addresses',async()=>{
  const r=await readInfrastructure(config,operations());assert.equal(r.status,'ok');assert.equal(r.dnsManager.provider,'lightsail');assert.equal(r.ipMatch,true);assert.equal(r.changesAllowed,false);
});
test('incomplete AWS permissions cannot establish DNS ownership and errors are redacted',async()=>{
  const r=await readInfrastructure(config,operations({route53Zones:async()=>{throw Object.assign(Error('secret credential path'),{name:'AccessDeniedException'});}}));
  assert.equal(r.status,'partial');assert.equal(r.dnsManager.status,'unverified');assert.equal(r.route53.error,'permission-denied');assert.equal(r.instance.status,'ok');assert.ok(!JSON.stringify(r).includes('secret credential path'));
});
test('duplicate NS candidates or unmatched delegation stay unverified',async()=>{
  assert.equal((await readInfrastructure(config,operations({route53Zones:async()=>[zone('route53')]}))).dnsManager.status,'ambiguous');
  const r=await readInfrastructure(config,operations({publicDns:async()=>({nameServers:['other.example'],addresses:['192.0.2.99']})}));assert.equal(r.dnsManager.status,'unverified');assert.equal(r.ipMatch,false);
});
test('DNS failure is partial and cannot imply working IP',async()=>{
  const r=await readInfrastructure(config,operations({publicDns:async()=>({nameServers:[],addresses:[],nsError:'dns-query-failed',aError:'dns-query-failed'})}));assert.equal(r.status,'partial');assert.equal(r.ipMatch,null);assert.equal(r.dnsManager.status,'unverified');
});
test('missing Lightsail zone still allows Route 53 NS match',async()=>{
  const r=await readInfrastructure(config,operations({lightsailZone:async()=>{throw Object.assign(Error('absent'),{name:'NotFoundException'});},route53Zones:async()=>[zone('route53')]}));assert.equal(r.dnsManager.provider,'route53');
});
test('authentication errors do not expose credentials or call resources',async()=>{
  const r=await readInfrastructure(config,operations({identity:async()=>{throw Object.assign(Error('secret-token'),{name:'CredentialsProviderError'});}}));assert.equal(r.status,'authentication-error');assert.equal(r.error,'authentication-required');assert.equal(r.instance,undefined);assert.ok(!JSON.stringify(r).includes('secret-token'));
});
