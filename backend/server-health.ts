import {createConnection,isIPv4} from 'node:net';
import type {FastifyInstance} from 'fastify';
import {infrastructureTargets,readInfrastructure} from './infrastructure.js';
import type {InfrastructureConfig} from './infrastructure.js';

type Snapshot=Awaited<ReturnType<typeof readInfrastructure>>;
export interface TcpResult {status:'connected'|'failed'|'skipped';reason?:string;latencyMs?:number}
export interface HealthReport {
 instanceName:string;domain:string;servicePort:number|null;publicIp:string|null;checkedAt:string;finishedAt:string;
 overall:'ok'|'attention'|'unknown';
 server:{status:'running'|'not-running'|'unknown';state?:string;reason?:string};
 dns:{status:'match'|'mismatch'|'unknown';authorityMatched:boolean};
 tcp:TcpResult;
 infrastructure:Snapshot;
}
export interface HealthDependencies {targets():InfrastructureConfig[];read(config:InfrastructureConfig):Promise<Snapshot>;tcp(ip:string,port:number):Promise<TcpResult>;now():number}
// Only the registered instance's AWS-reported public IPv4 is eligible; never a browser-supplied address.
export function publicProbeAddress(ip:string){
 if(!isIPv4(ip))return false;const [a,b,c]=ip.split('.').map(Number);
 return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a===100&&b>=64&&b<=127||a===192&&b===0&&(c===0||c===2)||a===198&&(b===18||b===19||b===51&&c===100)||a===203&&b===0&&c===113);
}
export function probeTcp(ip:string,port:number):Promise<TcpResult>{
 if(!publicProbeAddress(ip)||!Number.isInteger(port)||port<1||port>65535)return Promise.resolve({status:'skipped',reason:'invalid-target'});
 return new Promise(resolve=>{const start=Date.now(),socket=createConnection({host:ip,port}),finish=(result:TcpResult)=>{socket.destroy();resolve(result);};socket.setTimeout(4000);
  socket.once('connect',()=>finish({status:'connected',latencyMs:Date.now()-start}));
  socket.once('timeout',()=>finish({status:'failed',reason:'timeout'}));
  socket.once('error',(error:NodeJS.ErrnoException)=>finish({status:'failed',reason:({ECONNREFUSED:'connection-refused',ETIMEDOUT:'timeout',EHOSTUNREACH:'network-unreachable',ENETUNREACH:'network-unreachable',EACCES:'probe-permission-denied',EPERM:'probe-permission-denied'} as Record<string,string>)[error.code??'']??'connection-failed'}));
 });
}
export async function checkServerHealth(config:InfrastructureConfig,deps:Pick<HealthDependencies,'read'|'tcp'|'now'>):Promise<HealthReport>{
 const checkedAt=new Date(deps.now()).toISOString(),snapshot=await deps.read(config);
 const instance='instance' in snapshot&&snapshot.instance.status==='ok'?snapshot.instance.data:null;
 const configuredPort=config.servicePort;
 const port=typeof configuredPort==='number'&&Number.isInteger(configuredPort)&&configuredPort>=1&&configuredPort<=65535?configuredPort:null;
 const server:HealthReport['server']=instance?{status:instance.state==='running'?'running':'not-running',state:instance.state}:{status:'unknown',reason:'error' in snapshot?snapshot.error:snapshot.status};
 const ip=instance?.publicIp??null;
 const dns:HealthReport['dns']={status:'ipMatch' in snapshot&&snapshot.ipMatch!==null?(snapshot.ipMatch?'match':'mismatch'):'unknown',authorityMatched:'dnsManager' in snapshot&&snapshot.dnsManager.status==='ns-match'};
 let tcp:TcpResult={status:'skipped',reason:!instance?'instance-unverified':server.status!=='running'?'instance-not-running':port===null?'port-not-configured':'invalid-target'};
 if(server.status==='running'&&port!==null&&ip&&publicProbeAddress(ip)){try{tcp=await deps.tcp(ip,port);}catch{tcp={status:'failed',reason:'connection-failed'};}}
 const overall=server.status==='running'&&dns.status==='match'&&dns.authorityMatched&&tcp.status==='connected'?'ok':server.status==='not-running'||dns.status==='mismatch'||tcp.status==='failed'?'attention':'unknown';
 return {instanceName:config.instance,domain:config.domain,servicePort:port,publicIp:ip,checkedAt,finishedAt:new Date(deps.now()).toISOString(),overall,server,dns,tcp,infrastructure:snapshot};
}
export function serverHealthReader(overrides:Partial<HealthDependencies>={}){
 const deps:HealthDependencies={targets:infrastructureTargets,read:readInfrastructure,tcp:probeTcp,now:Date.now,...overrides};
 const entries=new Map<string,{key:string;active?:Promise<HealthReport>;cached?:HealthReport;expires:number}>();
 return async(instance:string)=>{
  const config=deps.targets().find(c=>c.instance===instance);if(!config)throw Object.assign(Error('Unregistered server'),{statusCode:404});
  const key=JSON.stringify(config);let entry=entries.get(instance);if(!entry||entry.key!==key){entry={key,expires:0};entries.set(instance,entry);}
  if(entry.active)return entry.active;if(entry.cached&&entry.expires>deps.now())return entry.cached;
  const current=entry;current.active=checkServerHealth(config,deps);
  try{const report=await current.active;current.cached=report;current.expires=deps.now()+10000;return report;}finally{current.active=undefined;}
 };
}
export function installServerHealth(app:FastifyInstance,reader=serverHealthReader()){
 app.get<{Params:{instance:string}}>('/api/admin/servers/:instance/health',{schema:{params:{type:'object',required:['instance'],additionalProperties:false,properties:{instance:{type:'string',pattern:'^[a-zA-Z0-9_-]{1,100}$'}}}}},async(req,reply)=>{
  try{return await reader(req.params.instance);}catch(error){if((error as {statusCode?:number}).statusCode===404)return reply.code(404).send({error:'등록된 서버만 점검할 수 있습니다'});return reply.code(503).send({error:'서버 점검 설정·AWS 인증을 확인해 주세요'});}
 });
}
