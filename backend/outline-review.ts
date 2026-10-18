import {createHash} from 'node:crypto';
import type {Pool} from 'pg';import type {FastifyInstance} from 'fastify';
import {getSession} from './auth.js';import {OutlineError} from './outline.js';
import {createOutlineControl,keyReviewSchemaReady} from './outline-control.js';import type {OutlineControl} from './outline-control.js';
import {withOutlineWorkerLock} from './outline-worker-lock.js';
export interface ReviewOperation {id:string;instance:string;serverId:string;keyId:string;action:string;state:string;reason:string|null;createdAt:string;revision:number;requested:{name?:string;limitBytes?:number|null}|null;review:unknown}
export interface ReviewStore {ready():Promise<boolean>;get(instance:string,id:string):Promise<ReviewOperation|null>;lease<T>(instance:string,work:()=>Promise<T>):Promise<T>;close(operation:ReviewOperation,review:Record<string,unknown>):Promise<void>}
export function postgresReviewStore(pool:Pool):ReviewStore{return {
 ready:()=>keyReviewSchemaReady(pool),lease:(instance,work)=>withOutlineWorkerLock(pool,instance,work),
 async get(instance,id){const row=(await pool.query('SELECT to_jsonb(o) AS value FROM ieum_dev.outline_key_operations o WHERE instance=$1 AND id=$2',[instance,id])).rows[0]?.value;if(!row)return null;return {id:row.id,instance:row.instance,serverId:row.server_id,keyId:row.key_id,action:row.action,state:row.state,reason:row.reason,createdAt:row.created_at,revision:row.revision??0,requested:row.requested??null,review:row.review??null};},
 async close(operation,review){const result=await pool.query("UPDATE ieum_dev.outline_key_operations SET state='closed',review=$4::jsonb,revision=revision+1,updated_at=now() WHERE instance=$1 AND id=$2 AND revision=$3 AND state IN ('intent','needs_review')",[operation.instance,operation.id,operation.revision,JSON.stringify(review)]);if(result.rowCount!==1)throw new OutlineError('review-stale',409);}
};}
export interface CloseReview {fingerprint:string;checkedAt:string;confirm:string;confirmKey:string;note:string;acknowledge:boolean}
export function validReviewNote(note:unknown):note is string{return typeof note==='string'&&note.trim().length>=10&&note.length<=1000&&!/ss:\/\/|ssconf:\/\/|apiUrl|certSha256|https?:\/\//i.test(note);}
export function compareKeyOperation(operation:ReviewOperation,observed:Awaited<ReturnType<OutlineControl['inspection']>>){
 if(operation.serverId!==observed.serverId)return 'server-changed';
 const expected=operation.requested,key=observed.key;
 if(operation.action==='delete')return key?'different':'matching';
 if(operation.action==='reveal')return 'not-provable';
 if(!key)return 'different';
 if(['create','rename'].includes(operation.action))return typeof expected?.name==='string'?(key.name===expected.name?'matching':'different'):'request-unknown';
 if(operation.action==='limit')return expected&&Object.hasOwn(expected,'limitBytes')&&key.ownLimitKnown?(key.ownLimitBytes===expected.limitBytes?'matching':'different'):'request-unknown';
 return 'request-unknown';
}
export function createOutlineReview(pool:Pool,control:OutlineControl=createOutlineControl(pool),store:ReviewStore=postgresReviewStore(pool),enabled:()=>boolean=()=>process.env.IEUM_OUTLINE_REVIEWS_ENABLED==='true',now:()=>number=Date.now){
 const registered=(instance:string)=>{if(!control.targets().some(t=>t.instance===instance))throw new OutlineError('unregistered-server',404);};
 const fingerprint=(operation:ReviewOperation,observed:unknown,checkedAt:string)=>createHash('sha256').update(JSON.stringify({id:operation.id,instance:operation.instance,state:operation.state,revision:operation.revision,reason:operation.reason,requested:operation.requested,observed,checkedAt})).digest('hex');
 async function read(instance:string,id:string,checkedAt=new Date(now()).toISOString()){
  registered(instance);const operation=await store.get(instance,id);if(!operation)throw new OutlineError('operation-not-found',404);const observed=await control.inspection(instance,operation.keyId),comparison=compareKeyOperation(operation,observed),ready=await store.ready(),age=now()-Date.parse(operation.createdAt),oldEnough=Number.isFinite(age)&&age>=120000;
  return {instanceName:instance,operation,observed,comparison,checkedAt,fingerprint:fingerprint(operation,observed,checkedAt),reviewReady:ready,canClose:ready&&enabled()&&['intent','needs_review'].includes(operation.state)&&comparison!=='server-changed'&&(operation.state!=='intent'||oldEnough),closureEnabled:enabled(),waitingForWorker:operation.state==='intent'&&!oldEnough};
 }
 return {
  compare:read,
  async close(instance:string,id:string,actor:string,input:CloseReview){registered(instance);if(!enabled())throw new OutlineError('review-close-disabled',403);if(!await store.ready())throw new OutlineError('review-schema-pending',409);
   if(input.confirm!==instance||input.acknowledge!==true||!validReviewNote(input.note)||!Number.isFinite(Date.parse(input.checkedAt))||now()-Date.parse(input.checkedAt)>300000||Date.parse(input.checkedAt)>now()+5000)throw new OutlineError('invalid-review',400);
   return store.lease(instance,async()=>{const fresh=await read(instance,id,input.checkedAt);if(input.confirmKey!==fresh.operation.keyId)throw new OutlineError('invalid-review',400);if(!fresh.canClose)throw new OutlineError(fresh.comparison==='server-changed'?'server-generation-changed':'review-not-closable',409);if(fresh.fingerprint!==input.fingerprint)throw new OutlineError('review-stale',409);
    const review={actor,note:input.note.trim(),closedAt:new Date(now()).toISOString(),priorState:fresh.operation.state,originalReason:fresh.operation.reason,comparison:fresh.comparison,checkedAt:fresh.checkedAt,observed:fresh.observed,fingerprint:fresh.fingerprint,meaning:'Administrator reviewed current state; original execution result is not rewritten as success'};
    await store.close(fresh.operation,review);return {status:'closed',operationId:id,review,keysChanged:false};
   });
  }
 };
}
export type OutlineReview=ReturnType<typeof createOutlineReview>;
export function installOutlineReview(app:FastifyInstance,pool:Pool,service:OutlineReview=createOutlineReview(pool)){
 const params={type:'object',required:['instance','id'],additionalProperties:false,properties:{instance:{type:'string',pattern:'^[a-zA-Z0-9_-]{1,100}$'},id:{type:'string',format:'uuid'}}};
 const wrap=async(work:()=>Promise<unknown>,reply:any)=>{try{return await work();}catch(e){const error=e instanceof OutlineError?e:new OutlineError('review-query-failed');return reply.code(error.status).send({error:'작업 대조 요청을 완료하지 못했습니다',reason:error.reason});}};
 app.get<{Params:{instance:string;id:string}}>('/api/admin/servers/:instance/outline/operations/:id/compare',{schema:{params}},(req,reply)=>wrap(()=>service.compare(req.params.instance,req.params.id),reply));
 app.post<{Params:{instance:string;id:string};Body:CloseReview}>('/api/admin/servers/:instance/outline/operations/:id/close',{schema:{params,body:{type:'object',additionalProperties:false,required:['fingerprint','checkedAt','confirm','confirmKey','note','acknowledge'],properties:{fingerprint:{type:'string',pattern:'^[a-f0-9]{64}$'},checkedAt:{type:'string',format:'date-time'},confirm:{type:'string',minLength:1,maxLength:100},confirmKey:{type:'string',minLength:1,maxLength:100},note:{type:'string',minLength:10,maxLength:1000},acknowledge:{type:'boolean',const:true}}}}},(req,reply)=>wrap(async()=>service.close(req.params.instance,req.params.id,(await getSession(pool,req))!.username,req.body),reply));
}
