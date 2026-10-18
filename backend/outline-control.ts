import {createHash,randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import type {FastifyInstance} from 'fastify';
import {getSession} from './auth.js';
import {infrastructureTargets,readInfrastructure} from './infrastructure.js';
import {publicProbeAddress} from './server-health.js';
import {OutlineError,normalizeOutlineConnection,outlineSecretStore,requestOutline,safeOutlineKeys} from './outline.js';
import type {OutlineConnection} from './outline.js';
import {withOutlineWorkerLock} from './outline-worker-lock.js';
type Json=Record<string,any>;
const object=(v:unknown):Json=>v&&typeof v==='object'&&!Array.isArray(v)?v as Json:{};
const number=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>=0?Number(v):null;
const text=(v:unknown,max=200)=>typeof v==='string'&&v.length<=max?v:null;
const stamp=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>0&&v<1e11?new Date(v*1000).toISOString():null;
export interface KeyCommand {requestId:string;action:'create'|'rename'|'limit'|'delete'|'reveal';serverId:string;keyId?:string;name?:string;limitBytes?:number|null;confirm:string;confirmKey?:string;acknowledge?:boolean}
export interface KeyJournal {
 ready():Promise<boolean>;
 begin(instance:string,serverId:string,actor:string,command:KeyCommand,keyId:string):Promise<{id:string;replay?:boolean}>;
 finish(id:string,state:'succeeded'|'needs_review',reason:string|null):Promise<void>;
 list(instance:string):Promise<unknown[]>;
 created(instance:string,serverId:string):Promise<Record<string,string>>;
 exclusive?<T>(instance:string,work:()=>Promise<T>):Promise<T>;
}
export async function keyReviewSchemaReady(pool:Pick<Pool,'query'>){return Number((await pool.query("SELECT count(*) AS count FROM information_schema.columns WHERE table_schema='ieum_dev' AND table_name='outline_key_operations' AND column_name IN ('requested','review','revision','updated_at')")).rows[0].count)===4;}
export function postgresKeyJournal(pool:Pool):KeyJournal{return {
 exclusive:(instance,work)=>withOutlineWorkerLock(pool,instance,work),
 async ready(){return !!(await pool.query("SELECT to_regclass('ieum_dev.outline_key_operations') AS table_name")).rows[0]?.table_name;},
 async begin(instance,serverId,actor,command,keyId){const client=await pool.connect(),digest=createHash('sha256').update(JSON.stringify([instance,serverId,actor,command.action,command.keyId??null,command.name??null,command.limitBytes??null,command.confirm])).digest('hex');
  try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(190017,hashtext($1))',['outline:'+instance]);const old=(await client.query('SELECT * FROM ieum_dev.outline_key_operations WHERE id=$1',[command.requestId])).rows[0];
   if(old){if(old.digest!==digest)throw new OutlineError('request-conflict',409);if(old.state!=='succeeded')throw new OutlineError('operation-needs-review',409);await client.query('COMMIT');return {id:old.id,replay:true};}
   if((await client.query("SELECT 1 FROM ieum_dev.outline_key_operations WHERE instance=$1 AND state IN ('intent','needs_review')",[instance])).rowCount)throw new OutlineError('operation-needs-review',409);
   const values=[command.requestId,instance,serverId,keyId,command.action,actor,digest];
   if(await keyReviewSchemaReady(client)){const requested={...(typeof command.name==='string'?{name:command.name.trim()}:{}),...(command.action==='limit'?{limitBytes:command.limitBytes}:{} )};await client.query("INSERT INTO ieum_dev.outline_key_operations(id,instance,server_id,key_id,action,actor,digest,state,requested) VALUES($1,$2,$3,$4,$5,$6,$7,'intent',$8)",[...values,JSON.stringify(requested)]);}else await client.query("INSERT INTO ieum_dev.outline_key_operations(id,instance,server_id,key_id,action,actor,digest,state) VALUES($1,$2,$3,$4,$5,$6,$7,'intent')",values);
   await client.query('COMMIT');return {id:command.requestId};
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}},
 async finish(id,state,reason){if((await pool.query("UPDATE ieum_dev.outline_key_operations SET state=$2,reason=$3,finished_at=now() WHERE id=$1 AND state='intent'",[id,state,reason])).rowCount!==1)throw new OutlineError('journal-write-failed');},
 async list(instance){return (await pool.query('SELECT id,key_id AS "keyId",server_id AS "serverId",action,actor,state,reason,created_at AS "createdAt",finished_at AS "finishedAt",to_jsonb(o)->\'review\' AS review FROM ieum_dev.outline_key_operations o WHERE instance=$1 ORDER BY created_at DESC LIMIT 100',[instance])).rows;},
 async created(instance,serverId){const rows=(await pool.query("SELECT key_id,MIN(finished_at) AS created_at FROM ieum_dev.outline_key_operations WHERE instance=$1 AND server_id=$2 AND action='create' AND state='succeeded' GROUP BY key_id",[instance,serverId])).rows;return Object.fromEntries(rows.map(r=>[r.key_id,new Date(r.created_at).toISOString()]));}
};}
export interface ControlDependencies {
 targets:typeof infrastructureTargets;secrets:ReturnType<typeof outlineSecretStore>;read:typeof readInfrastructure;
 request:typeof requestOutline;journal:KeyJournal;enabled():boolean;
}
export function createOutlineControl(pool:Pool,overrides:Partial<ControlDependencies>={}){
 const deps:ControlDependencies={targets:infrastructureTargets,secrets:outlineSecretStore(),read:readInfrastructure,request:requestOutline,journal:postgresKeyJournal(pool),enabled:()=>process.env.IEUM_OUTLINE_WRITES_ENABLED==='true',...overrides};
 const busy=new Set<string>();
 const target=(instance:string)=>{const t=deps.targets().find(t=>t.instance===instance);if(!t)throw new OutlineError('unregistered-server',404);return t;};
 async function context(instance:string){const t=target(instance),stored=await deps.secrets.read(instance);if(!stored)throw new OutlineError('not-configured',409);const connection=normalizeOutlineConnection(stored,t),snapshot=await deps.read(t),ip='instance' in snapshot&&snapshot.instance.status==='ok'&&snapshot.instance.data.state==='running'?snapshot.instance.data.publicIp:undefined;if(!ip||!publicProbeAddress(ip))throw new OutlineError(snapshot.status==='authentication-error'?'aws-authentication-required':'instance-unverified');return {connection,ip};}
 const call=(ctx:{connection:OutlineConnection;ip:string},method:'GET'|'PUT'|'DELETE',path:string,body?:unknown)=>deps.request(ctx.connection,ctx.ip,method,path,body);
 const safeReason=(e:unknown)=>e instanceof OutlineError?e.reason:'query-failed';
 async function optional(ctx:Awaited<ReturnType<typeof context>>,path:string){try{return {status:'ok',data:object(await call(ctx,'GET',path))};}catch(e){return {status:safeReason(e)==='management-path-invalid'?'unsupported':'error',reason:safeReason(e),data:{} as Json};}}
 return {
  targets(){return deps.targets().map(t=>({instance:t.instance,domain:t.domain,region:t.region}));},
  async inspection(instance:string,keyId:string){const ctx=await context(instance),server=object(await call(ctx,'GET','/server'));if(!text(server.serverId))throw new OutlineError('instance-unverified');const raw=object(await call(ctx,'GET','/access-keys')),keys=safeOutlineKeys(raw),key=keys.find(k=>k.id===keyId),source=(raw.accessKeys as Json[]).find(k=>k.id===keyId);if(object(await call(ctx,'GET','/server')).serverId!==server.serverId)throw new OutlineError('server-generation-changed',409);return {serverId:server.serverId as string,key:key?{...key,ownLimitBytes:number(object(source?.dataLimit).bytes),ownLimitKnown:!Object.hasOwn(source??{},'dataLimit')||number(object(source?.dataLimit).bytes)!==null}:null};},
  async overview(instance:string){target(instance);const ready=await deps.journal.ready(),ctx=await context(instance);
   const [raw,server,transfer,experimental]=await Promise.all([call(ctx,'GET','/access-keys'),optional(ctx,'/server'),optional(ctx,'/metrics/transfer'),optional(ctx,'/experimental/server/metrics?since=24h')]);
   const rawKeys=object(raw).accessKeys as unknown[],keys=safeOutlineKeys(raw),defaultLimit=number(object(server.data.accessKeyDataLimit).bytes),defaultLimitKnown=server.status==='ok'&&(!Object.hasOwn(server.data,'accessKeyDataLimit')||defaultLimit!==null),usage=object(transfer.data.bytesTransferredByUserId),metrics=Array.isArray(experimental.data.accessKeys)?experimental.data.accessKeys:[];
   const history=ready?await deps.journal.list(instance):[],serverId=text(server.data.serverId),created=ready&&serverId?await deps.journal.created(instance,serverId):{};
   const safe=keys.map((key,index)=>{const source=object(rawKeys[index]),metric=object(metrics.find((m:unknown)=>String(object(m).accessKeyId)===key.id)),connection=object(metric.connection),own=number(object(source.dataLimit).bytes),limit=own??defaultLimit,used=transfer.status==='ok'?number(Object.hasOwn(usage,key.id)?usage[key.id]:undefined):null;
    const limitKnown=own!==null||(!Object.hasOwn(source,'dataLimit')&&defaultLimitKnown);
    return {...key,limitKnown,limitBytes:limitKnown?limit:null,limitSource:!limitKnown?'unknown':own!==null?'key':defaultLimit!==null?'server':'none',usedBytes:used,remainingBytes:limitKnown&&used!==null&&limit!==null?Math.max(0,limit-used):null,createdAt:Object.hasOwn(created,key.id)?created[key.id]:null,startedAt:null,customer:null,lastUsedAt:stamp(connection.lastTrafficSeen),peakDevices:number(object(connection.peakDeviceCount).data),peakDevicesAt:stamp(object(connection.peakDeviceCount).timestamp)};});
   const blocked=(history as Json[]).some(h=>['intent','needs_review'].includes(h.state));
   return {instanceName:instance,domain:target(instance).domain,publicIp:ctx.ip,checkedAt:new Date().toISOString(),server:{status:server.status,id:serverId,name:text(server.data.name),version:text(server.data.version,50),hostname:text(server.data.hostnameForAccessKeys,253),defaultPort:number(server.data.portForNewAccessKeys),defaultLimitBytes:defaultLimit,defaultLimitKnown},keys:safe,count:safe.length,transfer:{status:transfer.status,scope:'Outline API 집계값 · 월간 사용량 아님',reason:transfer.reason??null},experimental:{status:experimental.status,scope:'최근 24시간 · 실험적 지표',reason:experimental.reason??null},writesEnabled:deps.enabled()&&ready&&!!serverId&&!blocked,journalReady:ready,operationBlocked:blocked,history};
  },
  async execute(instance:string,actor:string,command:KeyCommand){target(instance);if(!deps.enabled())throw new OutlineError('key-writes-disabled',403);if(!await deps.journal.ready())throw new OutlineError('journal-not-ready',409);if(busy.has(instance))throw new OutlineError('operation-busy',409);
   if(!/^[a-f0-9-]{36}$/.test(command.requestId)||!['create','rename','limit','delete'].includes(command.action)||command.confirm!==instance||!command.serverId||command.acknowledge!==true)throw new OutlineError('invalid-command',400);
   if(command.action==='delete'&&command.confirmKey!==command.keyId)throw new OutlineError('invalid-command',400);
   if(command.action!=='create'&&(!command.keyId||!/^[a-zA-Z0-9_-]{1,100}$/.test(command.keyId)))throw new OutlineError('invalid-command',400);
   if(['create','rename'].includes(command.action)&&(typeof command.name!=='string'||!command.name.trim()||command.name.length>100))throw new OutlineError('invalid-command',400);
   if(command.action==='limit'&&command.limitBytes!==null&&(number(command.limitBytes)===null||command.limitBytes===0))throw new OutlineError('invalid-command',400);
   busy.add(instance);const work=async()=>{let operation:string|undefined;
   try{const ctx=await context(instance),server=object(await call(ctx,'GET','/server'));if(server.serverId!==command.serverId)throw new OutlineError('server-generation-changed',409);
    const existing=safeOutlineKeys(await call(ctx,'GET','/access-keys'));const keyId=command.action==='create'?'ieum-'+randomUUID():command.keyId!;
    if(command.action!=='create'&&!existing.some(k=>k.id===keyId))throw new OutlineError('key-not-found',404);
    const record=await deps.journal.begin(instance,command.serverId,actor,command,keyId);if(record.replay)return {operationId:record.id,status:'succeeded',replayed:true};operation=record.id;
    const path='/access-keys/'+encodeURIComponent(keyId);
    if(command.action==='create')await call(ctx,'PUT',path,{name:command.name!.trim()});
    if(command.action==='rename')await call(ctx,'PUT',path+'/name',{name:command.name!.trim()});
    if(command.action==='delete')await call(ctx,'DELETE',path);
    if(command.action==='limit')await call(ctx,command.limitBytes===null?'DELETE':'PUT',path+'/data-limit',command.limitBytes===null?undefined:{limit:{bytes:command.limitBytes}});
    const fresh=object(await call(ctx,'GET','/access-keys')),verified=safeOutlineKeys(fresh),key=verified.find(k=>k.id===keyId);
    if(command.action==='delete'?!!key:!key)throw new OutlineError('verification-failed');
    if(['create','rename'].includes(command.action)&&key?.name!==command.name!.trim())throw new OutlineError('verification-failed');
    if(command.action==='limit'){const source=(fresh.accessKeys as Json[]).find(k=>k.id===keyId),limit=number(object(source?.dataLimit).bytes);if(limit!==(command.limitBytes??null))throw new OutlineError('verification-failed');}
    if(object(await call(ctx,'GET','/server')).serverId!==command.serverId)throw new OutlineError('server-generation-changed',409);
    await deps.journal.finish(record.id,'succeeded',null);return {operationId:record.id,status:'succeeded',keyId};
   }catch(e){if(operation){try{await deps.journal.finish(operation,'needs_review',safeReason(e));}catch{}throw new OutlineError('operation-needs-review',409);}throw e;}};
   try{return await (deps.journal.exclusive?deps.journal.exclusive(instance,work):work());}finally{busy.delete(instance);}
  },
  async reveal(instance:string,actor:string,command:{requestId:string;serverId:string;keyId:string;confirm:string;acknowledge?:boolean}){
   // Reveal is deliberately unavailable until auditable key control is explicitly enabled.
   target(instance);if(!deps.enabled())throw new OutlineError('key-writes-disabled',403);if(!await deps.journal.ready())throw new OutlineError('journal-not-ready',409);
   if(command.acknowledge!==true||!/^[a-zA-Z0-9_-]{1,100}$/.test(command.keyId))throw new OutlineError('invalid-command',400);
   const work=async()=>{const ctx=await context(instance),server=object(await call(ctx,'GET','/server'));if(server.serverId!==command.serverId||command.confirm!==instance)throw new OutlineError('server-generation-changed',409);
   const record=await deps.journal.begin(instance,command.serverId,actor,{...command,action:'reveal'},command.keyId);
   if(record.replay)throw new OutlineError('request-conflict',409);
   try{const raw=object(await call(ctx,'GET','/access-keys/'+encodeURIComponent(command.keyId))),url=text(raw.accessUrl,4096);if(raw.id!==command.keyId||!url?.startsWith('ss://'))throw new OutlineError('invalid-response');await deps.journal.finish(record.id,'succeeded',null);return {accessUrl:url};}catch(e){await deps.journal.finish(record.id,'needs_review',safeReason(e));throw new OutlineError('operation-needs-review',409);}};
   return deps.journal.exclusive?deps.journal.exclusive(instance,work):work();
  }
 };
}
export type OutlineControl=ReturnType<typeof createOutlineControl>;
export function installOutlineControl(app:FastifyInstance,pool:Pool,service:OutlineControl=createOutlineControl(pool)){
 const params={type:'object',required:['instance'],additionalProperties:false,properties:{instance:{type:'string',pattern:'^[a-zA-Z0-9_-]{1,100}$'}}};
 const properties={requestId:{type:'string',format:'uuid'},serverId:{type:'string',minLength:1,maxLength:200},confirm:{type:'string',minLength:1,maxLength:100},keyId:{type:'string',minLength:1,maxLength:100},confirmKey:{type:'string',minLength:1,maxLength:100},acknowledge:{type:'boolean',const:true},action:{type:'string',enum:['create','rename','limit','delete']},name:{type:'string',minLength:1,maxLength:100},limitBytes:{anyOf:[{type:'integer',minimum:1,maximum:Number.MAX_SAFE_INTEGER},{type:'null'}]}};
 const wrap=async(work:()=>Promise<unknown>,reply:any)=>{try{return await work();}catch(e){const error=e instanceof OutlineError?e:new OutlineError('outline-control-unavailable');return reply.code(error.status).send({error:'키 관리 요청을 완료하지 못했습니다',reason:error.reason});}};
 app.get('/api/admin/outline/servers',async()=>({servers:service.targets()}));
 app.get<{Params:{instance:string}}>('/api/admin/servers/:instance/outline/overview',{schema:{params}},(req,reply)=>wrap(()=>service.overview(req.params.instance),reply));
 app.post<{Params:{instance:string};Body:KeyCommand}>('/api/admin/servers/:instance/outline/commands',{schema:{params,body:{type:'object',additionalProperties:false,required:['requestId','serverId','confirm','action'],properties}}},(req,reply)=>wrap(async()=>service.execute(req.params.instance,(await getSession(pool,req))!.username,req.body),reply));
 app.post<{Params:{instance:string};Body:{requestId:string;serverId:string;keyId:string;confirm:string;acknowledge:boolean}}>('/api/admin/servers/:instance/outline/reveal',{schema:{params,body:{type:'object',additionalProperties:false,required:['requestId','serverId','confirm','keyId','acknowledge'],properties:{requestId:properties.requestId,serverId:properties.serverId,confirm:properties.confirm,keyId:properties.keyId,acknowledge:properties.acknowledge}}}},(req,reply)=>wrap(async()=>service.reveal(req.params.instance,(await getSession(pool,req))!.username,req.body),reply));
}
