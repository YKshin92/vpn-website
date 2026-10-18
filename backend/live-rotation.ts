import {randomUUID,createHash} from 'node:crypto';
import type {FastifyInstance} from 'fastify';
import type {Pool,PoolClient} from 'pg';
import {fromIni} from '@aws-sdk/credential-providers';
import {LightsailClient,GetDomainCommand} from '@aws-sdk/client-lightsail';
import {infrastructureTargets,readInfrastructure} from './infrastructure.js';
import {createLiveRotationDriver} from './lightsail-rotation-driver.js';
import type {LiveRotationPlan} from './lightsail-rotation-driver.js';
import {executeRotationSequence,rotationSteps} from './rotation-engine.js';
import type {RotationState,ExecutionStep} from './rotation-engine.js';
import {getSession} from './auth.js';

export const liveRotationSteps=[...rotationSteps,'release'] as const;
export interface SavedLivePlan extends LiveRotationPlan {createdAt:string;expiresAt:string;policyVersion:2;retainOldIp:false;releaseOldIpAfterVerification:true;retainKeys:true;region:'ap-northeast-2'}
export function currentLivePolicy(plan:Partial<SavedLivePlan>){return plan.policyVersion===2&&plan.retainOldIp===false&&plan.releaseOldIpAfterVerification===true&&plan.retainKeys===true;}
export interface LiveServices {
 enabled():boolean;
 capture(instance:string,id:string):Promise<SavedLivePlan>;
 driver(plan:SavedLivePlan,onVerification?:(state:RotationState)=>Promise<void>):{mode:'live';perform(step:ExecutionStep,state:RotationState):Promise<RotationState>};
}
const normalize=(s:string)=>s.toLowerCase().replace(/\.$/,'');
export async function captureLivePlan(instance:string,id:string):Promise<SavedLivePlan>{
 const config=infrastructureTargets().find(c=>c.instance===instance);if(!config)throw Error('Unregistered server');
 const snapshot=await readInfrastructure(config);
 if(!('instance' in snapshot)||snapshot.status!=='ok'||snapshot.instance.status!=='ok'||snapshot.instance.data.state!=='running'||!snapshot.instance.data.isStaticIp||!snapshot.instance.data.publicIp||snapshot.dnsManager.status!=='ns-match'||!('provider' in snapshot.dnsManager)||snapshot.dnsManager.provider!=='lightsail'||!snapshot.ipMatch||snapshot.staticIps.status!=='ok'||snapshot.publicDns.status!=='ok')throw Error('Server and authoritative DNS must match before planning');
 const ip=snapshot.instance.data.publicIp,attached=snapshot.staticIps.data.filter(s=>s.ip===ip&&s.attachedTo===instance);
 if(attached.length!==1||!attached[0].name)throw Error('Static IP ambiguous');
 const client=new LightsailClient({region:'us-east-1',credentials:fromIni({profile:config.profile}),maxAttempts:1,requestHandler:{connectionTimeout:2000,requestTimeout:5000}});
 try{
  const domain=(await client.send(new GetDomainCommand({domainName:config.domain}))).domain;
  const entries=domain?.domainEntries?.filter(e=>e.type==='A'&&normalize(e.name??'')===config.domain&&!e.isAlias)??[];
  if(entries.length!==1||!entries[0].id||entries[0].target!==ip)throw Error('Expected one unambiguous A record');
  const servicePort=config.servicePort;if(typeof servicePort!=='number'||!Number.isInteger(servicePort)||servicePort<1||servicePort>65535)throw Error('Configure this server service port');
  return {accountId:config.account,profile:config.profile,instance,domain:config.domain,oldIp:ip,oldStaticIpName:attached[0].name,newStaticIpName:'ieum-'+id,domainEntryId:entries[0].id,expectedNameServers:snapshot.publicDns.data.nameServers,servicePort,dnsServers:config.dnsServers,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+15*60*1000).toISOString(),policyVersion:2,retainOldIp:false,releaseOldIpAfterVerification:true,retainKeys:true,region:'ap-northeast-2'};
 }finally{client.destroy();}
}
export const defaultLiveServices:LiveServices={enabled:()=>process.env.IEUM_LIVE_ROTATION_ENABLED==='true',capture:captureLivePlan,driver:(plan,onVerification)=>createLiveRotationDriver(plan,true,undefined,onVerification)};
function canonical(value:unknown):string {if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a.localeCompare(b,'en')).map(([key,item])=>JSON.stringify(key)+':'+canonical(item)).join(',')+'}';return JSON.stringify(value);}
export const livePlanDigest=(value:unknown)=>createHash('sha256').update(canonical(value)).digest('hex');
const hash=livePlanDigest;
const fields='id,target,domain,actor,status,revision,plan,plan_hash AS "planHash",state,expires_at AS "expiresAt",created_at AS "createdAt"';
async function find(client:Pool|PoolClient,id:string){return (await client.query(`SELECT ${fields} FROM ieum_dev.live_rotation_jobs WHERE id=$1`,[id])).rows[0];}
async function withLocks<T>(pool:Pool,resources:string[],work:(client:PoolClient)=>Promise<T>):Promise<T>{
 const client=await pool.connect(),locked:string[]=[];
 try{for(const resource of [...new Set(resources)].sort()){if(!(await client.query('SELECT pg_try_advisory_lock(190018,hashtext($1)) AS locked',[resource])).rows[0].locked)throw Object.assign(Error('다른 변경 작업이 실행 중입니다'),{statusCode:409});locked.push(resource);}return await work(client);}
 finally{try{for(const resource of locked.reverse())await client.query('SELECT pg_advisory_unlock(190018,hashtext($1))',[resource]);client.release();}catch{client.release(true);}}
}
const resources=(plan:SavedLivePlan)=>['instance:'+plan.accountId+':'+plan.instance,'domain:'+plan.accountId+':'+plan.domain];
async function checkpoint(client:PoolClient,id:string,status:string,state:RotationState,step:string,phase:string,actor:string,detail:string){
 await client.query('BEGIN');try{const r=await client.query('UPDATE ieum_dev.live_rotation_jobs SET status=$2,state=$3,revision=revision+1,updated_at=now() WHERE id=$1 RETURNING revision',[id,status,state]);if(!r.rowCount)throw Error('Missing live job');await client.query('INSERT INTO ieum_dev.live_rotation_events(id,job_id,revision,step,phase,actor,detail) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),id,r.rows[0].revision,step,phase,actor,detail]);await client.query('COMMIT');}catch(error){await client.query('ROLLBACK');throw error;}
}
export async function saveLivePlan(pool:Pool,instance:string,actor:string,requestKey:string,services:LiveServices=defaultLiveServices){
 const existing=(await pool.query('SELECT id,actor,plan FROM ieum_dev.live_rotation_jobs WHERE request_key=$1',[requestKey])).rows[0];
 if(existing){if(existing.actor!==actor||existing.plan.instance!==instance)throw Object.assign(Error('요청 번호가 이미 사용됐습니다'),{statusCode:409});return find(pool,existing.id);}
 const id=randomUUID(),plan=await services.capture(instance,id);
 if(plan.instance!==instance||!currentLivePolicy(plan)||Date.parse(plan.expiresAt)<=Date.now()||plan.region!=='ap-northeast-2')throw Error('Invalid plan snapshot');
 return withLocks(pool,resources(plan),async client=>{
  // Recheck idempotency after obtaining cross-process locks.
  const prior=(await client.query('SELECT id,actor,plan FROM ieum_dev.live_rotation_jobs WHERE request_key=$1',[requestKey])).rows[0];
  if(prior){if(prior.actor!==actor||prior.plan.instance!==instance)throw Object.assign(Error('요청 번호 충돌'),{statusCode:409});return find(client,prior.id);}
  const state:RotationState={attachedIp:plan.oldIp,dnsIp:plan.oldIp,allocated:false,completed:[]};
  await client.query('BEGIN');try{await client.query("INSERT INTO ieum_dev.live_rotation_jobs(id,target,domain,request_key,actor,plan,plan_hash,state,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",[id,plan.accountId+':'+instance,plan.accountId+':'+plan.domain,requestKey,actor,plan,hash(plan),state,plan.expiresAt]);await client.query("INSERT INTO ieum_dev.live_rotation_events(id,job_id,revision,step,phase,actor,detail) VALUES($1,$2,0,'plan','planned',$3,'실제 조회 결과로 계획 저장 · 리소스 변경 없음')",[randomUUID(),id,actor]);await client.query('COMMIT');}catch(error){await client.query('ROLLBACK');throw error;}return find(client,id);
 });
}
export async function reconcileLivePlans(pool:Pool){
 const rows=(await pool.query("SELECT id,plan FROM ieum_dev.live_rotation_jobs WHERE status='running'")).rows;let count=0;
 for(const row of rows){try{await withLocks(pool,resources(row.plan),async client=>{const fresh=await find(client,row.id);if(fresh?.status==='running'){await checkpoint(client,row.id,'needs_review',{...fresh.state,uncertain:true},fresh.state.pending??'unknown','interrupted','system','실행 중단 · 외부 효과 확인 전 재실행 금지');count++;}});}catch(error){if((error as {statusCode?:number}).statusCode!==409)throw error;}}
 return count;
}
export function installLiveRotations(app:FastifyInstance,pool:Pool,services:LiveServices=defaultLiveServices){
 app.addHook('onReady',async()=>{if((await pool.query("SELECT to_regclass('ieum_dev.live_rotation_jobs') AS relation")).rows[0]?.relation)await reconcileLivePlans(pool);});
 app.get('/api/admin/live-ip-jobs',async()=>({enabled:services.enabled(),jobs:(await pool.query(`SELECT ${fields} FROM ieum_dev.live_rotation_jobs ORDER BY CASE WHEN status IN ('planned','running','needs_review') THEN 0 ELSE 1 END,created_at DESC,id DESC LIMIT 30`)).rows}));
 app.get<{Params:{id:string}}>('/api/admin/live-ip-jobs/:id',async(req,reply)=>{const found=await find(pool,req.params.id);if(!found)return reply.code(404).send({error:'작업을 찾지 못했습니다'});return {enabled:services.enabled(),job:found,events:(await pool.query('SELECT revision,step,phase,actor,detail,created_at AS "createdAt" FROM ieum_dev.live_rotation_events WHERE job_id=$1 ORDER BY revision',[found.id])).rows};});
 app.post<{Body:{instance:string;requestKey:string}}>('/api/admin/live-ip-jobs',{schema:{body:{type:'object',required:['instance','requestKey'],additionalProperties:false,properties:{instance:{type:'string',pattern:'^[a-zA-Z0-9_-]{1,100}$'},requestKey:{type:'string',pattern:'^[a-zA-Z0-9_-]{8,100}$'}}}}},async(req,reply)=>{
  try{return reply.code(201).send({job:await saveLivePlan(pool,req.body.instance,(await getSession(pool,req)).username,req.body.requestKey,services),enabled:services.enabled()});}catch(error){if((error as {statusCode?:number}).statusCode===409||(error as {code?:string}).code==='23505')return reply.code(409).send({error:'이미 진행·확인 중인 작업이 있거나 같은 요청 번호가 사용됐습니다'});return reply.code(503).send({error:'서버·고정 IP·DNS·AWS 인증을 재확인해야 계획을 저장할 수 있습니다'});}
 });
 const body={type:'object',additionalProperties:false,required:['revision','planHash','typedInstance','ackDowntime','ackReleaseOldIp','ackNoOtherUsers'],properties:{revision:{type:'integer',minimum:0},planHash:{type:'string',pattern:'^[a-f0-9]{64}$'},typedInstance:{type:'string',minLength:1,maxLength:100},ackDowntime:{const:true},ackReleaseOldIp:{const:true},ackNoOtherUsers:{const:true}}};
 app.post<{Params:{id:string};Body:{revision:number;planHash:string;typedInstance:string;ackDowntime:true;ackReleaseOldIp:true;ackNoOtherUsers:true}}>('/api/admin/live-ip-jobs/:id/run',{schema:{body}},async(req,reply)=>{
  // Master gate is checked BEFORE reading a plan, constructing clients or taking any AWS action.
  if(!services.enabled())return reply.code(403).send({error:'실제 변경은 서버에서 비활성 상태입니다 별도 실행 승인 후 활성화해야 합니다'});
  const initial=await find(pool,req.params.id);if(!initial)return reply.code(404).send({error:'작업을 찾지 못했습니다'});
  try{return await withLocks(pool,resources(initial.plan),async client=>{
   const found=await find(client,initial.id),plan=found.plan as SavedLivePlan;
   if(found.status!=='planned'||found.revision!==req.body.revision||found.planHash!==req.body.planHash||hash(plan)!==found.planHash||req.body.typedInstance!==plan.instance||new Date(found.expiresAt).getTime()<=Date.now()||!currentLivePolicy(plan)||found.state.completed.length||found.state.pending||found.state.allocated||found.state.attachedIp!==plan.oldIp||found.state.dnsIp!==plan.oldIp)return reply.code(409).send({error:'계획이 만료·변경됐거나 이전 보관 정책입니다 취소 후 새 계획을 확인해 주세요'});
   const actor=(await getSession(pool,req)).username;
   await checkpoint(client,found.id,'running',found.state,'approval','approved',actor,'대상 이름·접속 중단·검증 후 기존 IP 반환·다른 이용자 없음 확인');
   try{const driver=services.driver(plan,progress=>checkpoint(client,found.id,'running',progress,'verify',progress.dnsVerification?.status??'waiting',actor,'DNS·서비스 검증 '+(progress.dnsVerification?.reason??'checking')));if(driver.mode!=='live')throw Error('Invalid driver');await executeRotationSequence(found.state,(step,state)=>driver.perform(step,state),{save:(status,state,step,phase,detail)=>checkpoint(client,found.id,status,state,step,phase,actor,detail)},liveRotationSteps);}
   catch{const current=await find(client,found.id);if(current.status==='running')await checkpoint(client,found.id,'needs_review',{...current.state,uncertain:true},current.state.pending??'unknown','failed',actor,'실행 또는 기록 오류 · 자동 재실행 없음');}
   return {job:await find(client,found.id),enabled:services.enabled()};
  });}catch(error){if((error as {statusCode?:number}).statusCode===409)return reply.code(409).send({error:'같은 서버 또는 DNS의 다른 작업이 실행 중입니다'});return reply.code(503).send({error:'작업 상태를 새로 조회하고 중단 여부를 확인해 주세요'});}
 });
 app.post<{Params:{id:string};Body:{revision:number}}>('/api/admin/live-ip-jobs/:id/cancel',{schema:{body:{type:'object',required:['revision'],additionalProperties:false,properties:{revision:{type:'integer',minimum:0}}}}},async(req,reply)=>{
  const initial=await find(pool,req.params.id);if(!initial)return reply.code(404).send({error:'작업을 찾지 못했습니다'});
  try{return await withLocks(pool,resources(initial.plan),async client=>{const found=await find(client,initial.id);if(found.status!=='planned'||found.revision!==req.body.revision)return reply.code(409).send({error:'실행된 작업은 취소로 닫을 수 없습니다 상태 확인이 필요합니다'});await checkpoint(client,found.id,'closed',found.state,'cancel','reviewed',(await getSession(pool,req)).username,'실행 전 계획 취소 · 리소스 변경 없음');return {job:await find(client,found.id)};});}catch{return reply.code(409).send({error:'다른 작업이 실행 중입니다'});}
 });
 app.post('/api/admin/live-ip-jobs/reconcile',{schema:{body:{type:'object',additionalProperties:false,required:['confirm'],properties:{confirm:{const:true}}}}},async()=>({interrupted:await reconcileLivePlans(pool)}));
}
