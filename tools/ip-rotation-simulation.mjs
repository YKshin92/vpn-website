import {loadDemoData} from './demo-data.mjs';
import {pathToFileURL} from 'node:url';

// In-memory simulation only. This module contains no AWS/DNS network adapter.
export function createSimulation(config,{failAt=null,failRollback=false}={}){
  return {config:structuredClone(config),locked:false,attachedIp:config.aws.publicIp,dnsIp:config.dns.recordValue,allocated:new Set([config.aws.publicIp]),failAt,failRollback,journal:[],keysChanged:false};
}
async function step(s,name,action){s.journal.push({stage:name,status:'started'});await Promise.resolve();if(s.failAt===name)throw Error(`Injected failure: ${name}`);action?.();s.journal.push({stage:name,status:'completed'});}
export async function simulateRotation(s){
  if(s.locked)throw Error('Another rotation is running');
  if(s.config.mode!=='simulation'||s.config.allowMutations!==false)throw Error('Simulation configuration required');
  s.locked=true;const old=s.attachedIp,oldDns=s.dnsIp,next=s.config.aws.candidatePublicIp;
  let changed=false;
  try{
    await step(s,'preflight',()=>{if(old!==s.config.aws.publicIp||oldDns!==old||next===old)throw Error('Unexpected original state');});
    await step(s,'allocate',()=>s.allocated.add(next));
    await step(s,'detach',()=>{s.attachedIp=null;changed=true;});
    await step(s,'attach',()=>s.attachedIp=next);
    await step(s,'dns-update',()=>s.dnsIp=next);
    await step(s,'verify',()=>{if(s.attachedIp!==next||s.dnsIp!==next)throw Error('Verification mismatch');});
    s.journal.push({stage:'ready-for-old-ip-release',status:'completed'});
    return {status:'simulated-success',oldIp:old,newIp:next,dnsIp:s.dnsIp,oldIpRetained:s.allocated.has(old),keysChanged:false,chinaConnectivity:'not-tested',externalCalls:0};
  }catch(error){
    s.journal.push({stage:'failure',message:error.message});
    if(changed){
      if(s.failRollback){s.journal.push({stage:'rollback',status:'failed'});return {status:'needs-manual-intervention',oldIpRetained:s.allocated.has(old),externalCalls:0};}
      s.attachedIp=old;s.dnsIp=oldDns;s.journal.push({stage:'rollback',status:'completed'});
    }
    return {status:changed?'rolled-back':'stopped-before-switch',message:error.message,oldIpRetained:s.allocated.has(old),externalCalls:0};
  }finally{s.locked=false;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const {infrastructure}=await loadDemoData();
  const cases=[];
  for(const [name,options] of [['normal',{}],['allocation-failure',{failAt:'allocate'}],['attach-failure',{failAt:'attach'}],['dns-failure',{failAt:'dns-update'}],['verification-failure',{failAt:'verify'}],['rollback-failure',{failAt:'dns-update',failRollback:true}]]){
    const state=createSimulation(infrastructure,options);cases.push({name,result:await simulateRotation(state),final:{attachedIp:state.attachedIp,dnsIp:state.dnsIp},journal:state.journal});
  }
  console.log(JSON.stringify({mode:'simulation',cases},null,2));
}
