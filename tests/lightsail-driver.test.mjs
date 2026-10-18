import test from 'node:test';import assert from 'node:assert/strict';
import {createLiveRotationDriver,updatedDomainEntry} from '../.build/lightsail-rotation-driver.js';import {initialRotationState,rotationSteps} from '../.build/rotation-engine.js';
const plan={accountId:'111122223333',profile:'test',instance:'synthetic',domain:'vpn.example.test',oldIp:'192.0.2.10',oldStaticIpName:'old',newStaticIpName:'new',domainEntryId:'test-record',expectedNameServers:['ns.example.test'],servicePort:40665,dnsServers:[]};
test('DNS completion accepts a replacement ID only for the unique matching A and target',()=>{
 const changed={id:'replacement-record',name:'VPN.EXAMPLE.TEST.',type:'A',target:'192.0.2.20',isAlias:false};
 assert.equal(updatedDomainEntry([changed],'vpn.example.test','192.0.2.20').id,'replacement-record');
 for(const entries of [[],[changed,changed],[{...changed,target:'192.0.2.10'}],[{...changed,isAlias:true}],[{...changed,name:'other.example.test'}],[{...changed,type:'AAAA'}]])assert.throws(()=>updatedDomainEntry(entries,'vpn.example.test','192.0.2.20'));
});
test('live adapter is disabled by default, before creating AWS clients',()=>{assert.throws(()=>createLiveRotationDriver(plan),/disabled/);});
test('live adapter contract uses only injected fake operations in tests',async()=>{
 const calls=[];const fake={preflight:async()=>{calls.push('preflight');},allocate:async()=>{calls.push('allocate');return '192.0.2.20';},...Object.fromEntries(['detach','attach','service','dns','verify'].map(name=>[name,async ip=>{calls.push(name);if(name!=='detach')assert.equal(ip,'192.0.2.20');}]))};
 const driver=createLiveRotationDriver(plan,true,fake);let state=initialRotationState();for(const step of rotationSteps)state=await driver.perform(step,state);assert.deepEqual(calls,['preflight',...rotationSteps]);assert.equal(state.attachedIp,'192.0.2.20');assert.equal(state.dnsIp,'192.0.2.20');
});
