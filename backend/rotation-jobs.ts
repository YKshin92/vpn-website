import {randomUUID} from 'node:crypto';
import type {FastifyInstance} from 'fastify';
import type {Pool,PoolClient} from 'pg';
import {getSession} from './auth.js';
import {createMockRotationDriver,executeRotation,initialRotationState,mockRotationPlan,rotationSteps} from './rotation-engine.js';

const target='mock-vpnServer001';
const fields='id,target,mode,actor,request_key AS "requestKey",status,revision,plan,state,failure_step AS "failureStep",created_at AS "createdAt",updated_at AS "updatedAt"';
async function job(client:Pool|PoolClient,id:string){return (await client.query(`SELECT ${fields} FROM ieum_dev.rotation_jobs WHERE id=$1`,[id])).rows[0];}
async function lock(client:PoolClient){return (await client.query('SELECT pg_try_advisory_lock(190017,hashtext($1)) AS locked',[target])).rows[0].locked as boolean;}
async function release(client:PoolClient,locked:boolean){try{if(locked)await client.query('SELECT pg_advisory_unlock(190017,hashtext($1))',[target]);client.release();}catch{client.release(true);}}
async function checkpoint(client:PoolClient,id:string,status:string,state:unknown,step:string,phase:string,actor:string,detail:string){
  await client.query('BEGIN');try{
    const updated=await client.query('UPDATE ieum_dev.rotation_jobs SET status=$2,state=$3,revision=revision+1,updated_at=now() WHERE id=$1 RETURNING revision',[id,status,state]);
    if(!updated.rowCount)throw Error('Missing job');
    await client.query('INSERT INTO ieum_dev.rotation_events(id,job_id,revision,step,phase,actor,detail) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),id,updated.rows[0].revision,step,phase,actor,detail]);
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}
}
export async function reconcileRotations(pool:Pool){const client=await pool.connect();let locked=false;
  try{locked=await lock(client);if(!locked)return 0;
    const rows=(await client.query("SELECT id,state FROM ieum_dev.rotation_jobs WHERE target=$1 AND status='running'",[target])).rows;
    for(const row of rows)await checkpoint(client,row.id,'needs_review',{...row.state,uncertain:true},row.state.pending??'unknown','interrupted','system','실행 프로세스 중단 감지 · 자동 재실행 없음');return rows.length;
  }finally{await release(client,locked);}
}
export function installRotationJobs(app:FastifyInstance,pool:Pool){
  app.addHook('onReady',async()=>{if((await pool.query("SELECT to_regclass('ieum_dev.rotation_jobs') AS relation")).rows[0]?.relation)await reconcileRotations(pool);});
  app.get('/api/admin/ip-jobs',async()=>({mode:'mock',liveChangesAllowed:false,jobs:(await pool.query(`SELECT ${fields} FROM ieum_dev.rotation_jobs ORDER BY created_at DESC,id DESC LIMIT 30`)).rows}));
  app.post('/api/admin/ip-jobs/reconcile',{schema:{body:{type:'object',additionalProperties:false,required:['confirm'],properties:{confirm:{const:true}}}}},async()=>({mode:'mock',interrupted:await reconcileRotations(pool),liveChangesAllowed:false}));
  app.get<{Params:{id:string}}>('/api/admin/ip-jobs/:id',async(req,reply)=>{const found=await job(pool,req.params.id);if(!found)return reply.code(404).send({error:'작업을 찾지 못했습니다'});return {job:found,events:(await pool.query('SELECT revision,step,phase,actor,detail,created_at AS "createdAt" FROM ieum_dev.rotation_events WHERE job_id=$1 ORDER BY revision',[req.params.id])).rows};});
  app.post<{Body:{requestKey:string,failureStep?:string}}>('/api/admin/ip-jobs',{schema:{body:{type:'object',additionalProperties:false,required:['requestKey'],properties:{requestKey:{type:'string',pattern:'^[a-zA-Z0-9_-]{8,100}$'},failureStep:{enum:['',...rotationSteps]}}}}},async(req,reply)=>{
    const actor=(await getSession(pool,req)).username,client=await pool.connect();let locked=false;
    try{locked=await lock(client);if(!locked)return reply.code(409).send({error:'다른 작업이 실행 중입니다'});
      const existing=(await client.query('SELECT id,failure_step,actor FROM ieum_dev.rotation_jobs WHERE request_key=$1',[req.body.requestKey])).rows[0];
      if(existing){if(existing.failure_step!==(req.body.failureStep??'')||existing.actor!==actor)return reply.code(409).send({error:'같은 요청 번호의 내용이 다릅니다'});return {job:await job(client,existing.id),repeated:true};}
      if((await client.query("SELECT 1 FROM ieum_dev.rotation_jobs WHERE target=$1 AND status IN ('planned','running','needs_review')",[target])).rowCount)return reply.code(409).send({error:'완료하거나 확인해야 할 작업이 있습니다'});
      const id=randomUUID();await client.query('BEGIN');try{await client.query("INSERT INTO ieum_dev.rotation_jobs(id,target,actor,request_key,status,plan,state,failure_step) VALUES($1,$2,$3,$4,'planned',$5,$6,$7)",[id,target,actor,req.body.requestKey,mockRotationPlan(id),initialRotationState(),req.body.failureStep??'']);await client.query("INSERT INTO ieum_dev.rotation_events(id,job_id,revision,step,phase,actor,detail) VALUES($1,$2,0,'plan','planned',$3,'모의 변경 전 IP·DNS·신규 IP 이름·기존 IP 보유 계획 저장')",[randomUUID(),id,actor]);await client.query('COMMIT');}catch(error){await client.query('ROLLBACK');throw error;}
      return reply.code(201).send({job:await job(client,id),repeated:false});
    }finally{await release(client,locked);}
  });
  const commandSchema={type:'object',additionalProperties:false,required:['revision','confirm'],properties:{revision:{type:'integer',minimum:0},confirm:{const:true}}};
  app.post<{Params:{id:string};Body:{revision:number;confirm:boolean}}>('/api/admin/ip-jobs/:id/run',{schema:{body:commandSchema}},async(req,reply)=>{
    const actor=(await getSession(pool,req)).username,client=await pool.connect();let locked=false;
    try{locked=await lock(client);if(!locked)return reply.code(409).send({error:'다른 작업이 실행 중입니다'});
      const found=await job(client,req.params.id);if(!found)return reply.code(404).send({error:'작업을 찾지 못했습니다'});
      if(found.status!=='planned'||found.revision!==req.body.revision)return reply.code(409).send({error:'현재 상태에서 실행할 수 없습니다 새로 조회해 주세요'});
      await executeRotation(found.plan,found.state,createMockRotationDriver(found.failureStep,30),{save:async(status,state,step,phase,detail)=>checkpoint(client,found.id,status,state,step,phase,actor,detail)});
      return {job:await job(client,found.id),liveChangesAllowed:false};
    }finally{await release(client,locked);}
  });
  app.post<{Params:{id:string};Body:{revision:number;confirm:boolean;note:string}}>('/api/admin/ip-jobs/:id/review',{schema:{body:{...commandSchema,required:['revision','confirm','note'],properties:{...commandSchema.properties,note:{type:'string',minLength:10,maxLength:500,pattern:'\\S'}}}}},async(req,reply)=>{
    if(req.body.note.trim().length<10)return reply.code(400).send({error:'확인 메모를 10자 이상 입력해 주세요'});
    const actor=(await getSession(pool,req)).username,client=await pool.connect();let locked=false;
    try{locked=await lock(client);if(!locked)return reply.code(409).send({error:'다른 작업이 실행 중입니다'});const found=await job(client,req.params.id);
      if(!found)return reply.code(404).send({error:'작업을 찾지 못했습니다'});
      if(!['planned','needs_review'].includes(found.status)||found.revision!==req.body.revision)return reply.code(409).send({error:'현재 상태에서 확인 종료할 수 없습니다'});
      await checkpoint(client,found.id,'closed',found.state,'review','reviewed',actor,req.body.note.trim());return {job:await job(client,found.id)};
    }finally{await release(client,locked);}
  });
}
