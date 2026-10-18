// Called only after the live endpoint validates its master gate and saved approval plan.
import {LightsailClient,AllocateStaticIpCommand,AttachStaticIpCommand,DetachStaticIpCommand,UpdateDomainEntryCommand,GetOperationCommand,GetInstanceCommand,GetStaticIpCommand,GetDomainCommand,ReleaseStaticIpCommand,GetStaticIpsCommand} from '@aws-sdk/client-lightsail';
import type {Operation,DomainEntry,Instance,StaticIp} from '@aws-sdk/client-lightsail';
import {STSClient,GetCallerIdentityCommand} from '@aws-sdk/client-sts';
import {fromIni} from '@aws-sdk/credential-providers';
import {Resolver} from 'node:dns/promises';
import {isIPv4} from 'node:net';
import {createConnection} from 'node:net';
import {rotationSteps} from './rotation-engine.js';
import type {RotationState,ExecutionStep} from './rotation-engine.js';
import {waitForDnsVerification,DnsVerificationIssue} from './dns-verification.js';
import type {DnsVerificationProgress} from './dns-verification.js';

export interface LiveRotationPlan {accountId:string;profile:string;instance:string;domain:string;oldIp:string;oldStaticIpName:string;newStaticIpName:string;domainEntryId:string;expectedNameServers:string[];servicePort:number;dnsServers:string[];releaseOldIpAfterVerification?:boolean}
export interface LiveOperations {
 preflight():Promise<void>;allocate():Promise<string>;detach():Promise<void>;attach(ip:string):Promise<void>;service(ip:string):Promise<void>;dns(ip:string):Promise<void>;verify(ip:string,observe?:(p:DnsVerificationProgress)=>Promise<void>):Promise<void>;release(ip:string):Promise<void>;
}
const normalize=(s:string)=>s.toLowerCase().replace(/\.$/,'');
// Lightsail may replace a DNS entry ID during UpdateDomainEntry.
// Only the post-update read accepts a new ID; pre-update checks stay pinned to the approved ID.
export function updatedDomainEntry(entries:DomainEntry[]|undefined,domain:string,ip:string){
 const matches=entries?.filter(e=>e.type==='A'&&normalize(e.name??'')===normalize(domain))??[];
 if(matches.length!==1||matches[0].isAlias||matches[0].target!==ip)throw Error('DNS update not confirmed');
 return matches[0];
}
export function assertReleaseAttachments(plan:LiveRotationPlan,ip:string,instance:Instance|undefined,candidate:StaticIp|undefined,old:StaticIp|undefined){
 if(ip===plan.oldIp||instance?.name!==plan.instance||instance.state?.name!=='running'||!instance.isStaticIp||instance.publicIpAddress!==ip||candidate?.name!==plan.newStaticIpName||candidate.ipAddress!==ip||candidate.attachedTo!==plan.instance||candidate.isAttached!==true||old?.name!==plan.oldStaticIpName||old.ipAddress!==plan.oldIp||old.attachedTo||old.isAttached!==false)throw Error('Release attachment precondition failed');
}
export function createLiveRotationDriver(plan:LiveRotationPlan,approvedForLiveExecution=false,provided?:LiveOperations,onVerification?:(state:RotationState)=>Promise<void>){
 if(!approvedForLiveExecution)throw Error('Live execution is disabled until separately approved');
 if(!/^\d{12}$/.test(plan.accountId)||!isIPv4(plan.oldIp)||!plan.instance||!plan.domainEntryId||!plan.expectedNameServers.length||plan.oldStaticIpName===plan.newStaticIpName||!Number.isInteger(plan.servicePort)||plan.servicePort<1||plan.servicePort>65535)throw Error('Invalid approved live plan');
 const snapshot=structuredClone(plan),ops=provided??liveOperations(snapshot);
 return {mode:'live' as const,async perform(step:ExecutionStep,state:RotationState){
   const next=structuredClone(state);
   if(step==='allocate'){await ops.preflight();next.candidateIp=await ops.allocate();if(!isIPv4(next.candidateIp)||next.candidateIp===snapshot.oldIp)throw Error('Invalid new IP');next.allocated=true;}
   else if(step==='detach'){await ops.detach();next.attachedIp=null;}
   else {const ip=next.candidateIp;if(!ip||!next.allocated)throw Error('No verified new allocation');
     if(step==='attach'){await ops.attach(ip);next.attachedIp=ip;}
     if(step==='service')await ops.service(ip);
     if(step==='dns'){await ops.dns(ip);next.dnsIp=ip;}
     if(step==='verify')await ops.verify(ip,async progress=>{next.dnsVerification=progress;await onVerification?.(structuredClone(next));});
     if(step==='release'){
       if(snapshot.releaseOldIpAfterVerification!==true||next.completed.join('|')!==rotationSteps.join('|')||next.attachedIp!==ip||next.dnsIp!==ip||next.oldIpCleanup)throw Error('Release requires all verified steps and explicit policy');
       await ops.release(ip);next.oldIpCleanup={status:'released',name:snapshot.oldStaticIpName,ip:snapshot.oldIp,releasedAt:new Date().toISOString()};
     }
   }return next;
 }};
}
function liveOperations(plan:LiveRotationPlan):LiveOperations {
 const credentials=fromIni({profile:plan.profile,clientConfig:{region:'ap-northeast-2'}}),options={credentials,maxAttempts:1,requestHandler:{connectionTimeout:2000,requestTimeout:5000}};
 const server=new LightsailClient({...options,region:'ap-northeast-2'}),dns=new LightsailClient({...options,region:'us-east-1'}),sts=new STSClient({...options,region:'ap-northeast-2'});
 const resolver=new Resolver({timeout:2000,tries:1});if(plan.dnsServers.length)resolver.setServers(plan.dnsServers);
 async function wait(client:LightsailClient,operations:Operation[]|undefined){
   if(!operations?.length||operations.some(o=>!o.id))throw Error('Missing operation receipt');
   for(const item of operations){let operation=item;for(let poll=0;poll<30;poll++){
     if(operation.status==='Failed')throw Error('AWS operation failed');if(['Succeeded','Completed'].includes(operation.status??''))break;
     if(poll===29)throw Error('AWS operation state unknown');await new Promise(resolve=>setTimeout(resolve,500));operation=(await client.send(new GetOperationCommand({operationId:item.id!}))).operation??{};
   }}
 }
 async function entry(){const domain=(await dns.send(new GetDomainCommand({domainName:plan.domain}))).domain;const e=domain?.domainEntries?.find(e=>e.id===plan.domainEntryId&&e.type==='A'&&normalize(e.name??'')===normalize(plan.domain));if(!e||e.isAlias)throw Error('Approved DNS record not found');return e;}
 async function nameservers(){const actual=(await resolver.resolveNs(plan.domain)).map(normalize).sort(),expected=plan.expectedNameServers.map(normalize).sort();if(actual.join('|')!==expected.join('|'))throw Error('DNS authority changed');}
 async function tcp(ip:string,signal?:AbortSignal){await new Promise<void>((resolve,reject)=>{const socket=createConnection({host:ip,port:plan.servicePort});const done=(error?:Error)=>{signal?.removeEventListener('abort',abort);socket.destroy();if(error)reject(error);else resolve();};const abort=()=>done(new DnsVerificationIssue('verification-timeout'));signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted){abort();return;}socket.setTimeout(4000);socket.once('connect',()=>done());socket.once('timeout',()=>done(new DnsVerificationIssue('tcp-timeout',true)));socket.once('error',(e:NodeJS.ErrnoException)=>done(new DnsVerificationIssue(e.code==='EACCES'||e.code==='EPERM'?'probe-permission-denied':'tcp-unavailable',e.code!=='EACCES'&&e.code!=='EPERM')));});}
 return {
   async preflight(){
     if((await sts.send(new GetCallerIdentityCommand({}))).Account!==plan.accountId)throw Error('Account mismatch');
     const instance=(await server.send(new GetInstanceCommand({instanceName:plan.instance}))).instance,old=(await server.send(new GetStaticIpCommand({staticIpName:plan.oldStaticIpName}))).staticIp;
     if(instance?.state?.name!=='running'||instance.publicIpAddress!==plan.oldIp||!instance.isStaticIp||old?.attachedTo!==plan.instance||old.ipAddress!==plan.oldIp||(await entry()).target!==plan.oldIp)throw Error('Server or DNS changed since approval');await nameservers();
     // Verify the worker's existing path before allocating/detaching anything.
     // A healthy client on another network does not establish that this worker can probe the server.
     await tcp(plan.oldIp);
   },
   async allocate(){await wait(server,(await server.send(new AllocateStaticIpCommand({staticIpName:plan.newStaticIpName}))).operations);const ip=(await server.send(new GetStaticIpCommand({staticIpName:plan.newStaticIpName}))).staticIp;if(!ip?.ipAddress||ip.attachedTo)throw Error('New allocation state unknown');return ip.ipAddress;},
   async detach(){const current=(await server.send(new GetStaticIpCommand({staticIpName:plan.oldStaticIpName}))).staticIp;if(current?.attachedTo!==plan.instance)throw Error('Old attachment changed');await wait(server,(await server.send(new DetachStaticIpCommand({staticIpName:plan.oldStaticIpName}))).operations);if((await server.send(new GetStaticIpCommand({staticIpName:plan.oldStaticIpName}))).staticIp?.attachedTo)throw Error('Detach not confirmed');},
   async attach(ip){const candidate=(await server.send(new GetStaticIpCommand({staticIpName:plan.newStaticIpName}))).staticIp;if(candidate?.ipAddress!==ip||candidate.attachedTo)throw Error('Candidate changed');await wait(server,(await server.send(new AttachStaticIpCommand({staticIpName:plan.newStaticIpName,instanceName:plan.instance}))).operations);const instance=(await server.send(new GetInstanceCommand({instanceName:plan.instance}))).instance;if(instance?.publicIpAddress!==ip||!instance.isStaticIp)throw Error('Attachment not confirmed');},
   service:ip=>tcp(ip),
   async dns(ip){await nameservers();const current=await entry();if(current.target!==plan.oldIp)throw Error('DNS changed concurrently');const result=await dns.send(new UpdateDomainEntryCommand({domainName:plan.domain,domainEntry:{...current,target:ip}}));await wait(dns,result.operations);const after=(await dns.send(new GetDomainCommand({domainName:plan.domain}))).domain;updatedDomainEntry(after?.domainEntries,plan.domain,ip);},
   async verify(ip,observe){await waitForDnsVerification(plan.oldIp,ip,{
     async read(signal){
       // An unexpected managed record or authority is a fatal condition, not propagation delay.
       const domain=(await dns.send(new GetDomainCommand({domainName:plan.domain}),{abortSignal:signal})).domain;
       try{updatedDomainEntry(domain?.domainEntries,plan.domain,ip);}catch{throw new DnsVerificationIssue('managed-dns-mismatch');}
       const currentResolver=new Resolver({timeout:2000,tries:1});if(plan.dnsServers.length)currentResolver.setServers(plan.dnsServers);
       const cancel=()=>currentResolver.cancel();signal.addEventListener('abort',cancel,{once:true});
       try{
         if(signal.aborted)throw new DnsVerificationIssue('verification-timeout');
         const ns=await currentResolver.resolveNs(plan.domain);
         if(ns.map(normalize).sort().join('|')!==plan.expectedNameServers.map(normalize).sort().join('|'))throw new DnsVerificationIssue('dns-authority-changed');
         return await currentResolver.resolve4(plan.domain);
       }catch(error){if(error instanceof DnsVerificationIssue)throw error;const code=(error as NodeJS.ErrnoException).code;if(signal.aborted)throw new DnsVerificationIssue('verification-timeout');if(['ETIMEOUT','ETIMEDOUT','EAI_AGAIN','ESERVFAIL','ENODATA','ENOTFOUND'].includes(code??''))throw new DnsVerificationIssue('dns-query-temporary',true);throw new DnsVerificationIssue('dns-query-failed');}
       finally{signal.removeEventListener('abort',cancel);currentResolver.cancel();}
     },tcp:signal=>tcp(ip,signal)
   },observe);},
   async release(ip){
     if((await sts.send(new GetCallerIdentityCommand({}))).Account!==plan.accountId)throw Error('Account mismatch');
     const instance=(await server.send(new GetInstanceCommand({instanceName:plan.instance}))).instance,candidate=(await server.send(new GetStaticIpCommand({staticIpName:plan.newStaticIpName}))).staticIp,old=(await server.send(new GetStaticIpCommand({staticIpName:plan.oldStaticIpName}))).staticIp;
     assertReleaseAttachments(plan,ip,instance,candidate,old);
     await nameservers();const domain=(await dns.send(new GetDomainCommand({domainName:plan.domain}))).domain;updatedDomainEntry(domain?.domainEntries,plan.domain,ip);
     const addresses=await resolver.resolve4(plan.domain);if(!addresses.includes(ip)||addresses.includes(plan.oldIp))throw Error('DNS not ready for release');await tcp(ip);
     await wait(server,(await server.send(new ReleaseStaticIpCommand({staticIpName:plan.oldStaticIpName}))).operations);
     let pageToken:string|undefined;
     for(let page=0;page<20;page++){const result=await server.send(new GetStaticIpsCommand({pageToken}));if(result.staticIps?.some(s=>s.name===plan.oldStaticIpName||s.ipAddress===plan.oldIp))throw Error('Release not confirmed');pageToken=result.nextPageToken;if(!pageToken)return;}
     throw Error('Release verification pagination limit');
   }
 };
}
