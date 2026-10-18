import {randomUUID} from 'node:crypto';
import type {FastifyInstance} from 'fastify';
import type {Pool} from 'pg';
import {getSession} from './auth.js';
import {createServerState,runIpTest,recoverServer} from '../dist/server-model.mjs';
export function installSimulation(app:FastifyInstance,pool:Pool){
  app.get('/api/admin/simulation',async()=>{const state=await pool.query("SELECT state,revision FROM ieum_dev.simulation_states WHERE server_id='demo-server-01'");const jobs=await pool.query("SELECT id,actor,result,created_at AS \"createdAt\" FROM ieum_dev.simulation_jobs WHERE server_id='demo-server-01' ORDER BY created_at DESC LIMIT 10");return {mode:'simulation',state:state.rows[0]?.state??createServerState(),revision:state.rows[0]?.revision??0,jobs:jobs.rows};});
  app.post<{Body:{revision:number,action:string,failure?:string}}>('/api/admin/simulation',{schema:{body:{type:'object',required:['revision','action'],additionalProperties:false,properties:{revision:{type:'integer',minimum:0},action:{enum:['rotate','confirm']},failure:{enum:['','신규 IP 확보','신규 IP 연결','서비스 확인','DNS 갱신','접속 검증']}}}}},async(req,reply)=>{
    const session=await getSession(pool,req),client=await pool.connect();
    try{
      await client.query('BEGIN');if(!(await client.query('SELECT pg_try_advisory_xact_lock(190017,4) AS locked')).rows[0].locked){await client.query('ROLLBACK');return reply.code(409).send({error:'다른 IP 작업이 진행 중입니다'});}
      const old=(await client.query("SELECT state,revision FROM ieum_dev.simulation_states WHERE server_id='demo-server-01'")).rows[0];
      if((old?.revision??0)!==req.body.revision){await client.query('ROLLBACK');return reply.code(409).send({error:'상태가 변경됐습니다 새로 조회해 주세요'});}
      const state=old?.state??createServerState();
      if((req.body.action==='rotate'&&state.status==='needs-review')||(req.body.action==='confirm'&&state.status!=='needs-review')){await client.query('ROLLBACK');return reply.code(409).send({error:'현재 작업 상태에서 실행할 수 없습니다'});}
      if(req.body.action==='confirm')recoverServer(state);else await runIpTest(state,{failure:req.body.failure??'',wait:()=>new Promise(resolve=>setTimeout(resolve,120))});
      await client.query("INSERT INTO ieum_dev.simulation_states(server_id,state,revision) VALUES('demo-server-01',$1,$2) ON CONFLICT(server_id) DO UPDATE SET state=excluded.state,revision=excluded.revision",[state,req.body.revision+1]);
      await client.query("INSERT INTO ieum_dev.simulation_jobs(id,server_id,actor,result) VALUES($1,'demo-server-01',$2,$3)",[randomUUID(),session.username,state]);
      await client.query('COMMIT');return {mode:'simulation',state,revision:req.body.revision+1};
    }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  });
}
