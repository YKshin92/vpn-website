import test from 'node:test';import assert from 'node:assert/strict';
import {createLiveRotationDriver,assertReleaseAttachments} from '../.build/lightsail-rotation-driver.js';
import {executeRotationSequence,rotationSteps} from '../.build/rotation-engine.js';
import {liveRotationSteps,currentLivePolicy} from '../.build/live-rotation.js';
const plan={accountId:'111122223333',profile:'fake-only',instance:'synthetic',domain:'vpn.example.test',oldIp:'192.0.2.10',oldStaticIpName:'old',newStaticIpName:'new',domainEntryId:'record',expectedNameServers:['ns.example.test'],servicePort:12345,dnsServers:[],policyVersion:2,retainOldIp:false,releaseOldIpAfterVerification:true,retainKeys:true};
const initial=()=>({attachedIp:plan.oldIp,dnsIp:plan.oldIp,allocated:false,completed:[]});
function setup(failure=''){
 const calls=[],journal=[];const effect=async name=>{calls.push(name);if(name===failure)throw Error('Synthetic effect uncertainty');};
 const ops={preflight:()=>effect('preflight'),allocate:async()=>{await effect('allocate');return '192.0.2.20';},...Object.fromEntries(['detach','attach','service','dns','verify','release'].map(name=>[name,()=>effect(name)]))};
 const driver=createLiveRotationDriver(plan,true,ops);
 return {calls,journal,driver,run:()=>executeRotationSequence(initial(),(step,state)=>driver.perform(step,state),{save:async(status,state,step,phase)=>{journal.push(structuredClone({status,state,step,phase}));}},liveRotationSteps)};
}
test('live policy requires explicit version and release acknowledgement policy; legacy records remain legacy',()=>{
 assert.equal(currentLivePolicy(plan),true);for(const changed of [{policyVersion:undefined},{retainOldIp:true},{releaseOldIpAfterVerification:false},{retainKeys:false}])assert.equal(currentLivePolicy({...plan,...changed}),false);
});
test('release is last, verify checkpoint is still running, and release intent is durable before provider call',async()=>{
 const {run,calls,journal}=setup();const result=await run();assert.deepEqual(calls,['preflight',...liveRotationSteps]);assert.equal(result.status,'succeeded');assert.equal(result.state.oldIpCleanup.status,'released');assert.equal(result.state.oldIpCleanup.ip,plan.oldIp);
 assert.equal(journal.find(e=>e.step==='verify'&&e.phase==='done').status,'running');assert.equal(journal.at(-2).step,'release');assert.equal(journal.at(-2).phase,'intent');assert.equal(journal.at(-1).status,'succeeded');
});
test('any failure before release prevents old IP return and retains last verified candidate state',async()=>{
 for(const step of ['preflight',...rotationSteps]){const {run,calls}=setup(step);const result=await run();assert.equal(result.status,'needs_review',step);assert.ok(!calls.includes('release'),step);assert.equal(result.state.oldIpCleanup,undefined);}
});
test('uncertain release stays needs_review at release without pretending the old IP is retained or released',async()=>{
 const {run,calls}=setup('release');const result=await run();assert.equal(result.status,'needs_review');assert.equal(result.state.pending,'release');assert.equal(result.state.uncertain,true);assert.equal(result.state.attachedIp,'192.0.2.20');assert.equal(result.state.dnsIp,'192.0.2.20');assert.equal(result.state.oldIpCleanup,undefined);assert.equal(calls.filter(c=>c==='release').length,1);
});
test('release cannot run early or under a legacy retention policy even when the provider is supplied',async()=>{
 let releases=0;const ops={release:async()=>{releases++;}},verified={...initial(),allocated:true,candidateIp:'192.0.2.20',attachedIp:'192.0.2.20',dnsIp:'192.0.2.20',completed:[...rotationSteps]};
 const driver=createLiveRotationDriver(plan,true,ops);await assert.rejects(driver.perform('release',{...verified,completed:['allocate','detach','attach']}));
 await assert.rejects(createLiveRotationDriver({...plan,releaseOldIpAfterVerification:undefined},true,ops).perform('release',verified));assert.equal(releases,0);
});
test('release attachment guard rejects wrong/missing resources, any old attachment and incomplete new attachment',()=>{
 const instance={name:plan.instance,state:{name:'running'},isStaticIp:true,publicIpAddress:'192.0.2.20'},candidate={name:'new',ipAddress:'192.0.2.20',attachedTo:plan.instance,isAttached:true},old={name:'old',ipAddress:plan.oldIp,isAttached:false};
 assert.doesNotThrow(()=>assertReleaseAttachments(plan,'192.0.2.20',instance,candidate,old));
 for(const changed of [{attachedTo:'another-server'},{isAttached:true},{isAttached:undefined},{ipAddress:'192.0.2.99'},{name:'different'}])assert.throws(()=>assertReleaseAttachments(plan,'192.0.2.20',instance,candidate,{...old,...changed}));
 for(const changed of [{isAttached:false},{attachedTo:'another-server'},{name:'different'},{ipAddress:plan.oldIp}])assert.throws(()=>assertReleaseAttachments(plan,'192.0.2.20',instance,{...candidate,...changed},old));
 assert.throws(()=>assertReleaseAttachments(plan,'192.0.2.20',{...instance,state:{name:'stopped'}},candidate,old));assert.throws(()=>assertReleaseAttachments(plan,'192.0.2.20',instance,candidate,undefined));
});
test('checkpoint failures before or after release never replay the destructive call',async()=>{
 for(const failPhase of ['intent','done']){const {driver,calls}=setup(),saved=[];await assert.rejects(executeRotationSequence(initial(),(step,state)=>driver.perform(step,state),{save:async(status,state,step,phase)=>{if(step==='release'&&phase===failPhase)throw Error('Synthetic database failure');saved.push(structuredClone({status,state,step,phase}));}},liveRotationSteps));assert.equal(calls.filter(c=>c==='release').length,failPhase==='intent'?0:1);if(failPhase==='done'){assert.equal(saved.at(-1).state.pending,'release');assert.equal(saved.at(-1).state.oldIpCleanup,undefined);}}
});
