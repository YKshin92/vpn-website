import assert from 'node:assert/strict';
import {open,writeFile,readFile,access} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {createPool} from '../.build/db.js';
import {buildApp} from '../.build/app.js';
import {createOutlineControl} from '../.build/outline-control.js';
import {infrastructureTargets} from '../.build/infrastructure.js';
import {testAdmin} from '../tests/auth-helper.mjs';

// Explicitly approved, one-key live test. The browser-facing production server stays read-only.
if(!process.argv.includes('--approved-live-key-test'))throw Error('Explicit operational approval is required');
if(process.env.IEUM_LIVE_ROTATION_ENABLED!=='false'||process.env.IEUM_OUTLINE_WRITES_ENABLED!=='false')throw Error('Production mutation gates must remain disabled');
const file=new URL('../.build/outline-live-key-test-state.json',import.meta.url);
try{await access(file);throw Error('A test record already exists; inspect it instead of rerunning');}catch(e){if(e.code!=='ENOENT')throw e;}
const target=infrastructureTargets().find(t=>t.instance==='vpnServer001');
if(!target||target.account!=='212150478290'||target.domain!=='ieumvpn.link'||target.region!=='ap-northeast-2'||!target.enabled)throw Error('Unexpected approved target');
const pool=createPool(),control=createOutlineControl(pool,{targets:()=>[target],enabled:()=>true});
const app=buildApp(pool,3000,undefined,undefined,undefined,undefined,control),name='IEUM verification '+new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',dateStyle:'short'}).format(new Date())+' '+randomUUID().slice(0,8);
let admin,state,stage='preflight';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const stableKey=k=>({id:k.id,name:k.name,port:k.port,limitBytes:k.limitBytes,limitSource:k.limitSource,limitKnown:k.limitKnown});
const stableKeys=keys=>keys.map(stableKey).sort((a,b)=>a.id.localeCompare(b.id));
const serverIdentity=view=>({id:view.server.id,hostname:view.server.hostname,defaultPort:view.server.defaultPort,defaultLimitBytes:view.server.defaultLimitBytes,publicIp:view.publicIp,domain:view.domain});
const persist=async()=>writeFile(file,JSON.stringify(state,null,2));
async function overview(){const response=await app.inject({url:'/api/admin/servers/vpnServer001/outline/overview',headers:{host:'127.0.0.1:3000',...admin.headers}});if(response.statusCode!==200){const data=response.json();throw Object.assign(Error('Query failed'),{reason:data.reason??'query-failed'});}return response.json();}
async function command(action,extra={}){stage=action==='limit'?(extra.limitBytes===null?'remove-limit':'set-limit'):action;const commandId=state.requests[stage];state.stage=stage;state.status='running';await persist();const response=await app.inject({method:'POST',url:'/api/admin/servers/vpnServer001/outline/commands',headers:{host:'127.0.0.1:3000',...admin.headers},payload:{requestId:commandId,action,serverId:state.server.id,confirm:'vpnServer001',acknowledge:true,...(state.testKeyId?{keyId:state.testKeyId}:{}),...extra}});const result=response.json();if(response.statusCode!==200||result.status!=='succeeded')throw Object.assign(Error('Command failed'),{reason:result.reason??'command-failed'});state.completed.push(stage);state.operations.push({action:stage,id:result.operationId});if(action==='create')state.testKeyId=result.keyId;await persist();console.log(JSON.stringify({step:stage,status:'verified',operationId:result.operationId}));return result;}
try{
 admin=await testAdmin(pool,app);const before=await overview();assert.equal(before.instanceName,'vpnServer001');assert.equal(before.journalReady,true);assert.equal(before.writesEnabled,true);assert.equal(before.operationBlocked,false);assert.equal(before.server.hostname,'ieumvpn.link');
 const production=await fetch('http://127.0.0.1:3000/api/admin/servers/vpnServer001/outline/overview',{headers:{cookie:admin.headers.cookie}});assert.equal(production.status,200);assert.equal((await production.json()).writesEnabled,false);
 const baseline=stableKeys(before.keys);state={status:'ready',stage,instance:'vpnServer001',startedAt:new Date().toISOString(),server:serverIdentity(before),baseline,baselineHash:hash(baseline),beforeCount:before.count,testName:name,testKeyId:null,requests:Object.fromEntries(['create','rename','set-limit','remove-limit','delete'].map(step=>[step,randomUUID()])),completed:[],operations:[],productionWritesEnabled:false};
 const handle=await open(file,'wx');await handle.writeFile(JSON.stringify(state,null,2));await handle.close();
 console.log(JSON.stringify({stage:'preflight',count:before.count,version:before.server.version,productionWritesEnabled:false}));
 await command('create',{name});let view=await overview();assert.equal(view.count,before.count+1);assert.equal(view.keys.find(k=>k.id===state.testKeyId)?.name,name);assert.deepEqual(stableKeys(view.keys.filter(k=>k.id!==state.testKeyId)),baseline);
 await command('rename',{name:name+' renamed'});view=await overview();assert.equal(view.keys.find(k=>k.id===state.testKeyId)?.name,name+' renamed');
 await command('limit',{limitBytes:1073741824});view=await overview();const limited=view.keys.find(k=>k.id===state.testKeyId);assert.equal(limited.limitSource,'key');assert.equal(limited.limitBytes,1073741824);
 await command('limit',{limitBytes:null});view=await overview();assert.notEqual(view.keys.find(k=>k.id===state.testKeyId)?.limitSource,'key');
 await command('delete',{confirmKey:state.testKeyId});const after=await overview();assert.equal(after.count,before.count);assert.ok(!after.keys.some(k=>k.id===state.testKeyId));assert.deepEqual(stableKeys(after.keys),baseline);assert.deepEqual(serverIdentity(after),state.server);
 const operations=(await pool.query('SELECT id,state,action,reason FROM ieum_dev.outline_key_operations WHERE id=ANY($1::uuid[]) ORDER BY created_at',[Object.values(state.requests)])).rows;assert.equal(operations.length,5);assert.ok(operations.every(r=>r.state==='succeeded'));state.status='succeeded';state.stage='complete';state.afterCount=after.count;state.testKeyDeleted=true;state.originalKeysUnchanged=true;state.serverUnchanged=true;state.finishedAt=new Date().toISOString();await persist();
 console.log(JSON.stringify({status:state.status,beforeCount:before.count,afterCount:after.count,completed:state.completed,testKeyDeleted:true,originalKeysUnchanged:true,serverUnchanged:true,productionWritesEnabled:false}));
}catch(e){if(state){state.status='needs-review';state.stage=stage;state.reason=e.reason??'verification-failed';state.finishedAt=new Date().toISOString();await persist();}console.log(JSON.stringify({status:'stopped',stage,reason:e.reason??'verification-failed',knownTestKeyId:state?.testKeyId??null,automaticRetry:false,productionWritesEnabled:false}));process.exitCode=1;}
finally{await app.close();if(admin)await pool.query('DELETE FROM ieum_dev.admins WHERE id=$1',[admin.id]);await pool.end();}
