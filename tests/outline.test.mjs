import test from 'node:test';
import assert from 'node:assert/strict';
import {createOutlineService,normalizeOutlineConnection,safeOutlineKeys,matchesOutlineCertificate,fetchOutlineKeys,outlineSecretStore} from '../.build/outline.js';
import {createHash,X509Certificate} from 'node:crypto';
import {createServer} from 'node:https';
import {readFile,mkdtemp} from 'node:fs/promises';
import {resolve} from 'node:path';
const target={instance:'test-server',domain:'outline.example.test',enabled:true,account:'123456789012',profile:'test',region:'ap-northeast-2',dnsServers:[]};
const connection={apiUrl:'https://outline.example.test:12345/synthetic-path',certSha256:'A'.repeat(64)};
const raw={accessKeys:[{id:'0',name:'<script>synthetic</script>',port:54137,password:'synthetic-password',accessUrl:'ss://synthetic',method:'synthetic'}]};
const snapshot=ip=>({status:'ok',instance:{status:'ok',data:{state:'running',publicIp:ip}}});
test('management address is restricted to the registered HTTPS host and a certificate fingerprint',()=>{
 assert.equal(normalizeOutlineConnection({...connection,certSha256:'aa:'.repeat(31)+'aa'},target).certSha256,'A'.repeat(64));
 for(const apiUrl of ['http://outline.example.test:12345/synthetic-path','https://evil.example:12345/synthetic-path','https://outline.example.test:12345/short','https://user@outline.example.test:12345/synthetic-path','https://outline.example.test:12345/synthetic-path?q=secret'])assert.throws(()=>normalizeOutlineConnection({...connection,apiUrl},target));
 assert.throws(()=>normalizeOutlineConnection({...connection,certSha256:'wrong'},target));
});
test('key response whitelist excludes every access credential and rejects malformed or duplicate IDs',()=>{
 const safe=safeOutlineKeys(raw);assert.deepEqual(Object.keys(safe[0]),['id','name','port']);assert.ok(!JSON.stringify(safe).includes('synthetic-password'));assert.equal(safeOutlineKeys({accessKeys:[{id:'1'}]})[0].port,null);
 for(const accessKeys of [[null],[{id:'1'},{id:'1'}],[{id:'1',port:70000}]])assert.throws(()=>safeOutlineKeys({accessKeys}));
});
test('unconfigured and unknown servers cannot invoke AWS or Outline',async()=>{
 const service=createOutlineService({targets:()=>[target],secrets:{read:async()=>null,write:async()=>{}},read:async()=>{throw Error('Unexpected AWS');},fetch:async()=>{throw Error('Unexpected Outline');}});
 assert.equal((await service.keys(target.instance)).status,'not-configured');assert.equal((await service.keys(target.instance)).count,null);await assert.rejects(service.keys('unknown'),{reason:'unregistered-server'});
});
test('verified public IP only, cached reads, save invalidation and metadata never expose secrets',async()=>{
 let ip='127.0.0.1',calls=0,stored=connection;
 const service=createOutlineService({targets:()=>[target],secrets:{read:async()=>stored,write:async(_,value)=>{stored=value;}},read:async()=>snapshot(ip),fetch:async(_,address)=>{assert.equal(address,'52.79.185.31');calls++;return raw;}});
 await assert.rejects(service.keys(target.instance),{reason:'instance-unverified'});assert.equal(calls,0);ip='52.79.185.31';
 const results=await Promise.all([service.keys(target.instance),service.keys(target.instance)]);assert.equal(calls,1);assert.equal(results[0].customerMapping,'not-linked');assert.deepEqual(results[0].keys,safeOutlineKeys(raw));
 assert.deepEqual(await service.save(target.instance,connection),{configured:true});assert.deepEqual(Object.keys(await service.connection(target.instance)).sort(),['configured','updatedAt']);await service.keys(target.instance);assert.equal(calls,2);
});
test('certificate pin fails closed before any HTTP secret path; redirects are not followed',async()=>{
 const cert=await readFile(new URL('./fixtures/outline-test-cert.pem',import.meta.url)),key=await readFile(new URL('./fixtures/outline-test-key.pem',import.meta.url));
 let calls=0,redirect=false;const server=createServer({cert,key},(req,res)=>{calls++;assert.equal(req.method,'GET');assert.equal(req.url,'/synthetic-path/access-keys');if(redirect){res.writeHead(302,{Location:'https://example.com/'});res.end();}else{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(raw));}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const fingerprint=createHash('sha256').update(new X509Certificate(cert).raw).digest('hex');
 const local={apiUrl:`https://localhost:${server.address().port}/synthetic-path`,certSha256:fingerprint};
 try{assert.equal(matchesOutlineCertificate(undefined,fingerprint),false);await assert.rejects(fetchOutlineKeys({...local,certSha256:'0'.repeat(64)},'127.0.0.1'),{reason:'certificate-mismatch'});assert.equal(calls,0);assert.deepEqual(await fetchOutlineKeys(local,'127.0.0.1'),raw);redirect=true;await assert.rejects(fetchOutlineKeys(local,'127.0.0.1'),{reason:'management-request-failed'});assert.equal(calls,2);}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
test('Windows local secret storage encrypts synthetic credentials and reads them only through a pipe',{skip:process.platform!=='win32'},async()=>{
 const prior=process.env.IEUM_OUTLINE_SECRET_DIR;process.env.IEUM_OUTLINE_SECRET_DIR=await mkdtemp(resolve('.build/outline-test-'));
 try{const store=outlineSecretStore();assert.equal(await store.read('synthetic-test'),null);await store.write('synthetic-test',connection);assert.deepEqual(await store.read('synthetic-test'),connection);const encrypted=await readFile(resolve(process.env.IEUM_OUTLINE_SECRET_DIR,'synthetic-test.dpapi'),'utf8');assert.ok(!encrypted.includes('synthetic-path'));}finally{if(prior===undefined)delete process.env.IEUM_OUTLINE_SECRET_DIR;else process.env.IEUM_OUTLINE_SECRET_DIR=prior;}
});
