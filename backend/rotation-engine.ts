export const rotationSteps=['allocate','detach','attach','service','dns','verify'] as const;
export type RotationStep=typeof rotationSteps[number];
export type ExecutionStep=RotationStep|'release';
export interface RotationPlan {mode:'mock';target:'mock-vpnServer001';hostname:'connect.vpn.example.test';oldIp:'192.0.2.10';newName:string;retainOldIp:true}
export interface RotationState {attachedIp:string|null;dnsIp:string;candidateIp?:string;allocated:boolean;completed:ExecutionStep[];pending?:ExecutionStep;uncertain?:boolean;oldIpCleanup?:{status:'released';name:string;ip:string;releasedAt:string};dnsVerification?:DnsVerificationProgress}
export interface RotationDriver {readonly mode:'mock';perform(step:RotationStep,plan:RotationPlan,state:RotationState):Promise<RotationState>}
export interface RotationJournal {save(status:'running'|'succeeded'|'needs_review',state:RotationState,step:string,phase:'intent'|'done'|'failed',detail:string):Promise<void>}
export function mockRotationPlan(id:string):RotationPlan {return {mode:'mock',target:'mock-vpnServer001',hostname:'connect.vpn.example.test',oldIp:'192.0.2.10',newName:'ieum-'+id,retainOldIp:true};}
export function initialRotationState():RotationState {return {attachedIp:'192.0.2.10',dnsIp:'192.0.2.10',allocated:false,completed:[]};}
export function createMockRotationDriver(failureStep='',delay=10):RotationDriver {
  return {mode:'mock',async perform(step,plan,input){
    await new Promise(resolve=>setTimeout(resolve,delay));
    if(step===failureStep)throw Error('Synthetic provider failure');
    const state=structuredClone(input);
    if(step==='allocate'){state.candidateIp='192.0.2.20';state.allocated=true;}
    if(step==='detach')state.attachedIp=null;
    if(step==='attach'){if(!state.allocated||!state.candidateIp)throw Error('No allocation');state.attachedIp=state.candidateIp;}
    if(step==='service'&&state.attachedIp!==state.candidateIp)throw Error('Synthetic service unavailable');
    if(step==='dns'){if(!state.attachedIp)throw Error('No attached IP');state.dnsIp=state.attachedIp;}
    if(step==='verify'&&(state.attachedIp!==state.candidateIp||state.dnsIp!==state.candidateIp))throw Error('Synthetic verification failed');
    return state;
  }};
}
export async function executeRotation(plan:RotationPlan,input:RotationState,driver:RotationDriver,journal:RotationJournal){
  // This mock entry point can never switch into live mode through a browser payload.
  if(plan.mode!=='mock'||driver.mode!=='mock'||plan.target!=='mock-vpnServer001'||plan.hostname!=='connect.vpn.example.test'||plan.oldIp!=='192.0.2.10'||!plan.retainOldIp||input.completed.length||input.pending)throw Error('Only a fresh synthetic plan can execute');
  return executeRotationSteps(input,(step,state)=>driver.perform(step,plan,state),journal);
}
export async function executeRotationSteps(input:RotationState,perform:(step:RotationStep,state:RotationState)=>Promise<RotationState>,journal:RotationJournal){
  return executeRotationSequence(input,perform,journal,rotationSteps);
}
export async function executeRotationSequence<Step extends ExecutionStep>(input:RotationState,perform:(step:Step,state:RotationState)=>Promise<RotationState>,journal:RotationJournal,steps:readonly Step[]){
  let state=structuredClone(input);
  for(const [index,step] of steps.entries()){
    state.pending=step;
    // If intent cannot be persisted, do not call the provider.
    await journal.save('running',state,step,'intent','단계 실행 예정');
    let next:RotationState;
    try{next=await perform(step,structuredClone(state));}
    catch(error){
      if(error instanceof DnsVerificationFailure)state.dnsVerification=error.progress;
      state.uncertain=true;
      await journal.save('needs_review',state,step,'failed','응답 실패 · 실제 효과를 추측하지 않고 확인 대기');
      return {status:'needs_review' as const,state};
    }
    next.completed=[...state.completed,step];delete next.pending;
    // A failed checkpoint aborts execution; never continue or replay an ambiguous effect.
    await journal.save(index===steps.length-1?'succeeded':'running',next,step,'done','단계 완료 응답 저장');
    state=next;
  }
  return {status:'succeeded' as const,state};
}
import {DnsVerificationFailure} from './dns-verification.js';
import type {DnsVerificationProgress} from './dns-verification.js';
