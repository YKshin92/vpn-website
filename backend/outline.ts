import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash,timingSafeEqual} from 'node:crypto';
import {Agent,request} from 'node:https';
import {connect} from 'node:tls';
import {join} from 'node:path';
import type {ConnectionOptions} from 'node:tls';
import type {FastifyInstance,FastifyReply} from 'fastify';
import {infrastructureTargets,readInfrastructure} from './infrastructure.js';
import type {InfrastructureConfig} from './infrastructure.js';
import {publicProbeAddress} from './server-health.js';

export class OutlineError extends Error {constructor(public reason:string,public status=503){super(reason);}}
export interface OutlineConnection {apiUrl:string;certSha256:string;updatedAt?:string}
export interface SafeOutlineKey {id:string;name:string;port:number|null}
export interface OutlineKeys {instanceName:string;status:'ok'|'not-configured';checkedAt:string;keys:SafeOutlineKey[];count:number|null;readOnly:true;customerMapping:'not-linked'}
export interface OutlineSecrets {read(instance:string):Promise<unknown>;write(instance:string,connection:OutlineConnection):Promise<void>}
export interface OutlineDependencies {targets():InfrastructureConfig[];secrets:OutlineSecrets;read:typeof readInfrastructure;fetch(connection:OutlineConnection,ip:string):Promise<unknown>;now():number}
export function normalizeOutlineConnection(value:unknown,target:InfrastructureConfig):OutlineConnection {
 if(!value||typeof value!=='object')throw new OutlineError('invalid-connection',400);
 const input=value as Record<string,unknown>;if(typeof input.apiUrl!=='string'||typeof input.certSha256!=='string')throw new OutlineError('invalid-connection',400);
 let url:URL;try{url=new URL(input.apiUrl.trim());}catch{throw new OutlineError('invalid-connection',400);}
 if(url.protocol!=='https:'||url.hostname!==target.domain||!url.port||url.username||url.password||url.search||url.hash||!/^\/[a-zA-Z0-9_-]{8,256}\/?$/.test(url.pathname))throw new OutlineError('invalid-management-address',400);
 const fingerprint=input.certSha256.replace(/:/g,'').trim().toUpperCase();if(!/^[A-F0-9]{64}$/.test(fingerprint))throw new OutlineError('invalid-certificate',400);
 url.pathname=url.pathname.replace(/\/$/,'');return {apiUrl:url.toString().replace(/\/$/,''),certSha256:fingerprint,...(typeof input.updatedAt==='string'?{updatedAt:input.updatedAt}:{})};
}
export function safeOutlineKeys(value:unknown):SafeOutlineKey[]{
 if(!value||typeof value!=='object'||!Array.isArray((value as {accessKeys?:unknown}).accessKeys))throw new OutlineError('invalid-response');
 const keys=(value as {accessKeys:unknown[]}).accessKeys;if(keys.length>5000)throw new OutlineError('response-too-large');const ids=new Set<string>();
 return keys.map(key=>{const k=key as Record<string,unknown>;if(!k||typeof k.id!=='string'||!k.id.length||k.id.length>100||ids.has(k.id)||k.name!==undefined&&(typeof k.name!=='string'||k.name.length>200)||k.port!==undefined&&(!Number.isInteger(k.port)||Number(k.port)<1||Number(k.port)>65535))throw new OutlineError('invalid-response');ids.add(k.id);return {id:k.id,name:typeof k.name==='string'?k.name:'',port:typeof k.port==='number'?k.port:null};});
}
export function matchesOutlineCertificate(raw:Buffer|undefined,fingerprint:string){return !!raw&&/^[A-Fa-f0-9]{64}$/.test(fingerprint)&&timingSafeEqual(createHash('sha256').update(raw).digest(),Buffer.from(fingerprint,'hex'));}
export function fetchOutlineKeys(connection:OutlineConnection,ip:string):Promise<unknown>{return requestOutline(connection,ip,'GET','/access-keys');}
export function requestOutline(connection:OutlineConnection,ip:string,method:'GET'|'PUT'|'DELETE',path:string,body?:unknown):Promise<unknown>{
 return new Promise((resolve,reject)=>{
  const endpoint=new URL(connection.apiUrl),agent=new Agent({keepAlive:false});let settled=false,timer:ReturnType<typeof setTimeout>;
  const done=(error?:OutlineError,value?:unknown)=>{if(settled)return;settled=true;clearTimeout(timer);agent.destroy();if(error)reject(error);else resolve(value);};
  // Async agent callback withholds the socket (and therefore the secret HTTP path) until pin validation.
  agent.createConnection=((_options:ConnectionOptions,callback:(error:Error|null,socket?:ReturnType<typeof connect>)=>void)=>{
   let handed=false;const socket=connect({host:ip,port:Number(endpoint.port),servername:endpoint.hostname,rejectUnauthorized:false,minVersion:'TLSv1.2'});
   const fail=(error:OutlineError)=>{if(handed)return;handed=true;socket.destroy();callback(error);};
   socket.setTimeout(8000,()=>fail(new OutlineError('connection-timeout')));
   socket.once('error',()=>fail(new OutlineError('connection-failed')));
   socket.once('secureConnect',()=>{if(!matchesOutlineCertificate(socket.getPeerCertificate().raw,connection.certSha256)){fail(new OutlineError('certificate-mismatch'));return;}if(handed)return;handed=true;callback(null,socket);});
   return undefined;
  }) as typeof agent.createConnection;
  const payload=body===undefined?undefined:JSON.stringify(body);
  const req=request({hostname:endpoint.hostname,port:Number(endpoint.port),path:endpoint.pathname+path,method,agent,headers:{Accept:'application/json',...(payload?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}:{})}},res=>{
   if(![200,201,204].includes(res.statusCode??0)){res.resume();done(new OutlineError(res.statusCode===401||res.statusCode===403?'management-authentication-failed':res.statusCode===404?'management-path-invalid':'management-request-failed'));return;}
   if(res.statusCode===204){res.resume();done(undefined,null);return;}
   let size=0;const chunks:Buffer[]=[];res.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>1048576){req.destroy();done(new OutlineError('response-too-large'));}else chunks.push(chunk);});
   res.once('error',()=>done(new OutlineError('connection-failed')));res.once('aborted',()=>done(new OutlineError('connection-failed')));
   res.once('end',()=>{if(settled)return;try{done(undefined,JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{done(new OutlineError('invalid-response'));}});
  });
  timer=setTimeout(()=>{req.destroy();done(new OutlineError('connection-timeout'));},10000);
  req.once('error',error=>done(error instanceof OutlineError?error:new OutlineError('connection-failed')));req.end(payload);
 });
}
function secretProcess(mode:'read'|'write',instance:string,payload?:OutlineConnection):Promise<unknown>{
 return new Promise((resolve,reject)=>{
  // PowerShell 7's inherited module path can prevent Windows PowerShell from loading DPAPI cmdlets.
  const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',fileURLToPath(new URL('../tools/outline-secret-store.ps1',import.meta.url)),'-Mode',mode,'-Instance',instance],{windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...process.env,PSModulePath:join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','Modules')}});
  let output='',failed=false;const fail=()=>{if(failed)return;failed=true;child.kill();reject(new OutlineError('secret-store-unavailable'));};const timer=setTimeout(fail,10000);
  child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{output+=chunk;if(output.length>16384)fail();});child.stderr.resume();child.on('error',fail);child.stdin.on('error',fail);
  child.on('close',code=>{clearTimeout(timer);if(failed)return;if(code!==0){fail();return;}try{resolve(JSON.parse(output.replace(/^\uFEFF/,'')));}catch{fail();}});child.stdin.end(payload?JSON.stringify(payload):'');
 });
}
export function outlineSecretStore():OutlineSecrets{return {read:instance=>secretProcess('read',instance),write:async(instance,value)=>{await secretProcess('write',instance,value);}};}
export function createOutlineService(overrides:Partial<OutlineDependencies>={}){
 const deps:OutlineDependencies={targets:infrastructureTargets,secrets:outlineSecretStore(),read:readInfrastructure,fetch:fetchOutlineKeys,now:Date.now,...overrides};
 const cache=new Map<string,{expires:number;value:OutlineKeys}>(),active=new Map<string,Promise<OutlineKeys>>(),generation=new Map<string,number>(),saving=new Set<string>();
 const target=(instance:string)=>{const config=deps.targets().find(t=>t.instance===instance);if(!config)throw new OutlineError('unregistered-server',404);return config;};
 return {
  async connection(instance:string){const config=target(instance),stored=await deps.secrets.read(instance);if(!stored)return {configured:false};const value=normalizeOutlineConnection(stored,config);return {configured:true,updatedAt:value.updatedAt};},
  async save(instance:string,input:unknown){const config=target(instance),value=normalizeOutlineConnection(input,config);if(saving.has(instance))throw new OutlineError('configuration-busy',409);saving.add(instance);try{await deps.secrets.write(instance,{...value,updatedAt:new Date(deps.now()).toISOString()});generation.set(instance,(generation.get(instance)??0)+1);cache.delete(instance);return {configured:true};}finally{saving.delete(instance);}},
  async keys(instance:string):Promise<OutlineKeys>{
   const config=target(instance);if(saving.has(instance))throw new OutlineError('configuration-busy',409);const prior=cache.get(instance);if(prior&&prior.expires>deps.now())return prior.value;if(active.has(instance))return active.get(instance)!;
   const gen=generation.get(instance)??0;
   const work=(async()=>{const stored=await deps.secrets.read(instance),checkedAt=new Date(deps.now()).toISOString();if(!stored)return {instanceName:instance,status:'not-configured' as const,checkedAt,keys:[],count:null,readOnly:true as const,customerMapping:'not-linked' as const};
    const connection=normalizeOutlineConnection(stored,config),snapshot=await deps.read(config),ip='instance' in snapshot&&snapshot.instance.status==='ok'&&snapshot.instance.data.state==='running'?snapshot.instance.data.publicIp:undefined;
    if(!ip||!publicProbeAddress(ip))throw new OutlineError(snapshot.status==='authentication-error'?'aws-authentication-required':'instance-unverified');
    const keys=safeOutlineKeys(await deps.fetch(connection,ip));if((generation.get(instance)??0)!==gen)throw new OutlineError('configuration-changed',409);
    const result:OutlineKeys={instanceName:instance,status:'ok',checkedAt:new Date(deps.now()).toISOString(),keys,count:keys.length,readOnly:true,customerMapping:'not-linked'};cache.set(instance,{expires:deps.now()+10000,value:result});return result;
   })();active.set(instance,work);try{return await work;}finally{if(active.get(instance)===work)active.delete(instance);}
  }
 };
}
export type OutlineService=ReturnType<typeof createOutlineService>;
export function installOutline(app:FastifyInstance,service:OutlineService=createOutlineService()){
 const params={type:'object',required:['instance'],additionalProperties:false,properties:{instance:{type:'string',pattern:'^[a-zA-Z0-9_-]{1,100}$'}}};
 const response=async(reply:FastifyReply,work:()=>Promise<unknown>)=>{try{return await work();}catch(error){const e=error instanceof OutlineError?error:new OutlineError('outline-query-failed');return reply.code(e.status).send({error:'Outline 관리 연결 또는 조회 설정을 확인해 주세요',reason:e.reason});}};
 app.get<{Params:{instance:string}}>('/api/admin/servers/:instance/outline/connection',{schema:{params}},(req,reply)=>response(reply,()=>service.connection(req.params.instance)));
 app.post<{Params:{instance:string};Body:{apiUrl:string;certSha256:string}}>('/api/admin/servers/:instance/outline/connection',{schema:{params,body:{type:'object',additionalProperties:false,required:['apiUrl','certSha256'],properties:{apiUrl:{type:'string',minLength:1,maxLength:2048},certSha256:{type:'string',minLength:64,maxLength:95}}}}},(req,reply)=>response(reply,()=>service.save(req.params.instance,req.body)));
 app.get<{Params:{instance:string}}>('/api/admin/servers/:instance/outline/keys',{schema:{params}},(req,reply)=>response(reply,()=>service.keys(req.params.instance)));
}
