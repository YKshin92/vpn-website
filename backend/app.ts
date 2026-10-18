import Fastify from 'fastify';
import {randomUUID} from 'node:crypto';
import type {Pool} from 'pg';
import {readFile} from 'node:fs/promises';
import {installAuth} from './auth.js';
import {installSimulation} from './simulation.js';
import {installInfrastructure,infrastructureReader} from './infrastructure.js';
import {installRotationJobs} from './rotation-jobs.js';
import {installLiveRotations} from './live-rotation.js';
import type {LiveServices} from './live-rotation.js';
import {installCustomerBilling} from './customer-billing.js';
import {installServerHealth} from './server-health.js';
import type {HealthReport} from './server-health.js';
import {installOutline} from './outline.js';
import type {OutlineService} from './outline.js';
import {installOutlineControl} from './outline-control.js';
import type {OutlineControl} from './outline-control.js';
import {installOutlineReview} from './outline-review.js';
import type {OutlineReview} from './outline-review.js';

const id={type:'string',minLength:1,maxLength:100,pattern:'^[a-zA-Z0-9_-]+$'};
const status={type:'string',enum:['active','expired','payment_pending','review_required']};
export function buildApp(pool:Pool,port=3000,readInfrastructure:()=>Promise<unknown>=infrastructureReader(),liveServices?:LiveServices,readHealth?:(instance:string)=>Promise<HealthReport>,outline?:OutlineService,outlineControl?:OutlineControl,outlineReview?:OutlineReview){
  const app=Fastify({logger:false,bodyLimit:8192,ajv:{customOptions:{removeAdditional:false}}});
  app.addHook('onRequest',async(req,reply)=>{
    const hosts=[`127.0.0.1:${port}`,`localhost:${port}`];
    if(!hosts.includes(req.headers.host??'')|| (req.headers.origin && !hosts.map(h=>`http://${h}`).includes(req.headers.origin)) || req.headers['sec-fetch-site']==='cross-site')return reply.code(403).send({error:'Local development access only'});
    reply.header('Cache-Control','no-store');
    reply.header('X-Content-Type-Options','nosniff');
    reply.header('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  });
  installAuth(app,pool);
  installSimulation(app,pool);
  installInfrastructure(app,readInfrastructure);
  installServerHealth(app,readHealth);
  installOutline(app,outline);
  installOutlineControl(app,pool,outlineControl);
  installOutlineReview(app,pool,outlineReview);
  installRotationJobs(app,pool);
  installLiveRotations(app,pool,liveServices);
  installCustomerBilling(app,pool);
  app.get('/admin',async(req,reply)=>reply.type('text/html; charset=utf-8').send(await readFile(new URL('../dist/admin.html',import.meta.url))));
  app.get('/admin/keys',async(req,reply)=>reply.type('text/html; charset=utf-8').send(await readFile(new URL('../dist/key-admin.html',import.meta.url))));
  for(const [asset,type] of [['key-admin.js','text/javascript'],['key-admin.css','text/css']] as const)app.get('/'+asset,async(req,reply)=>reply.type(type).send(await readFile(new URL('../dist/'+asset,import.meta.url))));
  for(const [asset,type] of [['admin.js','text/javascript'],['admin.css','text/css'],['fonts.css','text/css'],['fonts/NotoSansKR-Variable.woff2','font/woff2']] as const)app.get('/'+asset,async(req,reply)=>reply.type(type).send(await readFile(new URL('../dist/'+asset,import.meta.url))));
  app.setErrorHandler((error,req,reply)=>{
    const code=(error as {code?:string}).code;
    if((error as {validation?:unknown}).validation)return reply.code(400).send({error:'Invalid request'});
    const statusCode=(error as {statusCode?:number}).statusCode;
    if(statusCode && [400,413,415].includes(statusCode))return reply.code(statusCode).send({error:'Invalid request'});
    if(code==='23505')return reply.code(409).send({error:'Customer, email or key already assigned'});
    if(code==='23503')return reply.code(400).send({error:'Customer or server does not exist'});
    if(code==='23514')return reply.code(400).send({error:'Synthetic data only'});
    reply.code(503).send({error:'Local database operation unavailable'});
  });
  app.get('/api/health',async()=>{await pool.query('SELECT 1');return {status:'ok',mode:'local-synthetic',authenticated:false};});
  app.get('/api/dev/customers',async()=>({mode:'simulation',customers:(await pool.query('SELECT c.id,c.display_name AS "displayName",c.email,c.status,k.outline_key_id AS "keyId",k.server_id AS "serverId" FROM ieum_dev.customers c LEFT JOIN ieum_dev.access_keys k ON k.customer_id=c.id ORDER BY c.id LIMIT 200')).rows}));
  app.get('/api/dev/servers',async()=>({mode:'simulation',servers:(await pool.query('SELECT id,name,region,hostname,mode FROM ieum_dev.servers ORDER BY id LIMIT 100')).rows}));
  app.post<{Body:{name:string,hostname:string}}>('/api/dev/servers',{schema:{body:{type:'object',required:['name','hostname'],additionalProperties:false,properties:{name:{type:'string',minLength:1,maxLength:80,pattern:'\\S'},hostname:{type:'string',maxLength:253,pattern:'^[a-z0-9]+(?:[a-z0-9.-]*[a-z0-9])?\\.test$'}}}}},async(req,reply)=>{
    const {name,hostname}=req.body;
    const result=await pool.query('INSERT INTO ieum_dev.servers(id,name,region,hostname) VALUES($1,$2,$3,$4) RETURNING id,name,region,hostname,mode',[randomUUID(),name.trim(),'ap-northeast-2',hostname]);
    return reply.code(201).send(result.rows[0]);
  });
  app.get('/api/dev/keys',async()=>({mode:'simulation',keys:(await pool.query('SELECT id,customer_id AS "customerId",server_id AS "serverId",outline_key_id AS "outlineKeyId",source FROM ieum_dev.access_keys ORDER BY id LIMIT 200')).rows}));
  app.post<{Body:{displayName:string,email:string,status:string}}>('/api/dev/customers',{schema:{body:{type:'object',required:['displayName','email','status'],additionalProperties:false,properties:{displayName:{type:'string',minLength:1,maxLength:80,pattern:'\\S'},email:{type:'string',maxLength:254,pattern:'^[^\\s@]+@[^\\s@]+\\.test$'},status}}}},async(req,reply)=>{
    const {displayName,email,status}=req.body;
    const result=await pool.query('INSERT INTO ieum_dev.customers(id,display_name,email,status) VALUES($1,$2,$3,$4) RETURNING id,display_name AS "displayName",email,status',[randomUUID(),displayName.trim(),email.toLowerCase(),status]);
    return reply.code(201).send(result.rows[0]);
  });
  app.post<{Body:{customerId:string,serverId:string,outlineKeyId:string}}>('/api/dev/keys',{schema:{body:{type:'object',required:['customerId','serverId','outlineKeyId'],additionalProperties:false,properties:{customerId:id,serverId:id,outlineKeyId:{...id,pattern:'^demo-[a-zA-Z0-9_-]+$'}}}}},async(req,reply)=>{
    const {customerId,serverId,outlineKeyId}=req.body;
    const result=await pool.query('INSERT INTO ieum_dev.access_keys(id,customer_id,server_id,outline_key_id) VALUES($1,$2,$3,$4) RETURNING id,customer_id AS "customerId",server_id AS "serverId",outline_key_id AS "outlineKeyId"',[randomUUID(),customerId,serverId,outlineKeyId]);
    return reply.code(201).send(result.rows[0]);
  });
  return app;
}
