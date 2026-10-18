export interface DnsVerificationProgress {
 status:'waiting'|'verified'|'timed_out'|'failed';attempt:number;elapsedMs:number;timeoutMs:number;reason:string;checkedAt:string;
}
export class DnsVerificationIssue extends Error {
 constructor(public reason:string,public retryable=false){super(reason);}
}
export class DnsVerificationFailure extends Error {
 constructor(public progress:DnsVerificationProgress){super(progress.reason);}
}
export interface VerificationReads {read(signal:AbortSignal):Promise<string[]>;tcp(signal:AbortSignal):Promise<void>}
export interface VerificationClock {now():number;sleep(ms:number):Promise<void>;timestamp():string}
const clock:VerificationClock={now:()=>performance.now(),sleep:ms=>new Promise(r=>setTimeout(r,ms)),timestamp:()=>new Date().toISOString()};
async function bounded<T>(work:(signal:AbortSignal)=>Promise<T>,remaining:number){
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([Promise.resolve().then(()=>work(controller.signal)),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{reject(new DnsVerificationIssue('verification-timeout'));controller.abort();},remaining);})]);}
 finally{clearTimeout(timer);controller.abort();}
}
// Only caller-provided reads may repeat. Mutation operations are not accepted here.
export async function waitForDnsVerification(oldIp:string,newIp:string,reads:VerificationReads,observe:(p:DnsVerificationProgress)=>Promise<void>=async()=>{},timing:VerificationClock=clock){
 const timeoutMs=120000,intervalMs=5000,started=timing.now();let attempt=0;
 const progress=(status:DnsVerificationProgress['status'],reason:string):DnsVerificationProgress=>({status,reason,attempt,elapsedMs:Math.min(timeoutMs,Math.max(0,Math.round(timing.now()-started))),timeoutMs,checkedAt:timing.timestamp()});
 const fail=async(status:'failed'|'timed_out',reason:string):Promise<never>=>{const result=progress(status,reason);await observe(result);throw new DnsVerificationFailure(result);};
 await observe(progress('waiting','checking'));
 while(attempt<25){
  const remaining=timeoutMs-(timing.now()-started);if(remaining<=0)return fail('timed_out','verification-timeout');attempt++;
  let retryReason='dns-propagation',verified=false;
  try{
   verified=await bounded(async signal=>{
    const addresses=await reads.read(signal);
    if(addresses.some(ip=>ip!==oldIp&&ip!==newIp))throw new DnsVerificationIssue('dns-unexpected-address');
    if(!addresses.length){retryReason='dns-no-answer';return false;}
    if(!addresses.includes(newIp)||addresses.includes(oldIp))return false;
    await reads.tcp(signal);return true;
   },remaining);
  }catch(error){
   if(error instanceof DnsVerificationFailure)throw error;
   if(error instanceof DnsVerificationIssue){if(error.reason==='verification-timeout')return fail('timed_out',error.reason);if(!error.retryable)return fail('failed',error.reason);retryReason=error.reason;}
   else {const name=(error as {name?:string})?.name??'';return fail('failed',/AccessDenied|Unauthorized/.test(name)?'permission-denied':/Credential|Token|Signature|SSO|UnrecognizedClient|InvalidClient/.test(name)?'authentication-required':'verification-query-failed');}
  }
  if(verified){if(timing.now()-started>=timeoutMs)return fail('timed_out','verification-timeout');const result=progress('verified','verified');await observe(result);return result;}
  await observe(progress('waiting',retryReason));
  const delay=Math.min(intervalMs,timeoutMs-(timing.now()-started));if(delay<=0)return fail('timed_out','verification-timeout');await timing.sleep(delay);
 }
 return fail('timed_out','verification-timeout');
}
