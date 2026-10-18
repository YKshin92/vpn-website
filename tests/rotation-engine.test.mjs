import test from 'node:test';import assert from 'node:assert/strict';
import {executeRotation,initialRotationState,mockRotationPlan,rotationSteps,createMockRotationDriver} from '../.build/rotation-engine.js';
test('journal commits intent before every provider call and retains new IP/DNS',async()=>{
 const events=[];const base=createMockRotationDriver('',0),driver={mode:'mock',async perform(step,p,s){assert.equal(events.at(-1).step,step);assert.equal(events.at(-1).phase,'intent');return base.perform(step,p,s);}};
 const result=await executeRotation(mockRotationPlan('test'),initialRotationState(),driver,{async save(status,state,step,phase){events.push({status,state:structuredClone(state),step,phase});}});
 assert.equal(result.status,'succeeded');assert.equal(result.state.attachedIp,'192.0.2.20');assert.equal(result.state.dnsIp,'192.0.2.20');assert.equal(events.length,12);assert.equal(result.state.allocated,true);
});
test('each provider failure stops without retry, rollback or releasing IP',async()=>{
 for(const failure of rotationSteps){const calls=[];const base=createMockRotationDriver(failure,0);const events=[];const result=await executeRotation(mockRotationPlan('test'),initialRotationState(),{mode:'mock',async perform(step,p,s){calls.push(step);return base.perform(step,p,s);}},{async save(status,state,step,phase){events.push({status,step,phase});}});assert.equal(result.status,'needs_review');assert.equal(result.state.pending,failure);assert.equal(result.state.uncertain,true);assert.equal(calls.length,rotationSteps.indexOf(failure)+1);assert.equal(events.at(-1).phase,'failed');}
});
test('failed intent saves prevent provider calls; failed completion stops subsequent steps',async()=>{
 let calls=0;const driver={mode:'mock',async perform(step,p,s){calls++;return createMockRotationDriver('',0).perform(step,p,s);}};
 await assert.rejects(()=>executeRotation(mockRotationPlan('test'),initialRotationState(),driver,{async save(){throw Error('DB down');}}));assert.equal(calls,0);
 await assert.rejects(()=>executeRotation(mockRotationPlan('test'),initialRotationState(),driver,{async save(status,state,step,phase){if(phase==='done')throw Error('Checkpoint lost');}}));assert.equal(calls,1);
});
test('live and partially executed plans never execute through this worker',async()=>{
 for(const [plan,state] of [[{...mockRotationPlan('test'),mode:'live'},initialRotationState()],[mockRotationPlan('test'),{...initialRotationState(),pending:'attach'}]])await assert.rejects(()=>executeRotation(plan,state,createMockRotationDriver(),{async save(){throw Error('Must not save');}}));
});
