import test from 'node:test';import assert from 'node:assert/strict';
import {waitForDnsVerification,DnsVerificationIssue,DnsVerificationFailure} from '../.build/dns-verification.js';
const oldIp='192.0.2.10',newIp='192.0.2.20';
function clock(){let now=0;return {now:()=>now,sleep:async ms=>{now+=ms;},timestamp:()=>new Date(1760000000000+now).toISOString(),advance:ms=>{now+=ms;}};}
test('old DNS answers wait with reads only until the new address and TCP are verified',async()=>{
 const time=clock(),events=[];let queries=0,tcp=0;
 const result=await waitForDnsVerification(oldIp,newIp,{read:async()=>++queries<4?[oldIp]:[newIp],tcp:async()=>{tcp++;}},async p=>{events.push(p);},time);
 assert.equal(result.status,'verified');assert.equal(queries,4);assert.equal(tcp,1);assert.equal(result.elapsedMs,15000);assert.equal(events.filter(e=>e.reason==='dns-propagation').length,3);
});
test('mixed old/new records keep waiting; an unrelated address is fatal before TCP',async()=>{
 let reads=0,tcp=0;await waitForDnsVerification(oldIp,newIp,{read:async()=>++reads===1?[oldIp,newIp]:[newIp],tcp:async()=>{tcp++;}},undefined,clock());assert.equal(reads,2);assert.equal(tcp,1);
 await assert.rejects(waitForDnsVerification(oldIp,newIp,{read:async()=>['192.0.2.99'],tcp:async()=>{throw Error('Must not dial');}},undefined,clock()),e=>e instanceof DnsVerificationFailure&&e.progress.reason==='dns-unexpected-address'&&e.progress.status==='failed');
});
test('the two-minute budget expires without any TCP/return step when DNS never changes',async()=>{
 const time=clock();let reads=0,tcp=0;
 await assert.rejects(waitForDnsVerification(oldIp,newIp,{read:async()=>{reads++;return [oldIp];},tcp:async()=>{tcp++;}},undefined,time),e=>e.progress.status==='timed_out'&&e.progress.elapsedMs===120000);assert.ok(reads<=25);assert.equal(tcp,0);assert.equal(time.now(),120000);
});
test('temporary TCP failures retry reads, but a probe permission error stops immediately',async()=>{
 let tcp=0;const result=await waitForDnsVerification(oldIp,newIp,{read:async()=>[newIp],tcp:async()=>{if(++tcp<3)throw new DnsVerificationIssue('tcp-timeout',true);}},undefined,clock());assert.equal(tcp,3);assert.equal(result.elapsedMs,10000);
 let attempts=0;await assert.rejects(waitForDnsVerification(oldIp,newIp,{read:async()=>[newIp],tcp:async()=>{attempts++;throw new DnsVerificationIssue('probe-permission-denied');}},undefined,clock()),e=>e.progress.reason==='probe-permission-denied');assert.equal(attempts,1);
});
test('authentication, authority and managed DNS errors do not wait or leak original errors',async()=>{
 for(const [error,reason] of [[Object.assign(Error('secret-token'),{name:'ExpiredTokenException'}),'authentication-required'],[Object.assign(Error('credential path'),{name:'AccessDeniedException'}),'permission-denied'],[new DnsVerificationIssue('dns-authority-changed'),'dns-authority-changed'],[new DnsVerificationIssue('managed-dns-mismatch'),'managed-dns-mismatch']]){
  let reads=0;const time=clock();await assert.rejects(waitForDnsVerification(oldIp,newIp,{read:async()=>{reads++;throw error;},tcp:async()=>{}},undefined,time),e=>e.progress.reason===reason&&!JSON.stringify(e.progress).includes('secret-token'));assert.equal(reads,1);assert.equal(time.now(),0);
 }
});
test('an in-flight read is aborted at the remaining deadline',async()=>{
 const time=clock();let aborted=false;
 await assert.rejects(waitForDnsVerification(oldIp,newIp,{read:signal=>new Promise(resolve=>{signal.addEventListener('abort',()=>{aborted=true;resolve([]);},{once:true});}),tcp:async()=>{throw Error('Must not dial');}},async p=>{if(p.attempt===0)time.advance(119999);},time),e=>e.progress.status==='timed_out');assert.equal(aborted,true);
});
test('progress storage failure stops further reads instead of retrying verification or journal writes',async()=>{
 let reads=0,writes=0;await assert.rejects(waitForDnsVerification(oldIp,newIp,{read:async()=>{reads++;return [oldIp];},tcp:async()=>{}},async p=>{writes++;if(p.reason==='dns-propagation')throw Error('Synthetic journal failure');},clock()),/Synthetic journal failure/);assert.equal(reads,1);assert.equal(writes,2);
});
