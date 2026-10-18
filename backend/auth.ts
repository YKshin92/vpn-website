import {randomBytes,randomUUID,scrypt,timingSafeEqual,createHash} from 'node:crypto';
import type {FastifyInstance,FastifyRequest,FastifyReply} from 'fastify';
import type {Pool} from 'pg';
export const hashToken=(token:string)=>createHash('sha256').update(token).digest('hex');
export async function passwordHash(password:string,salt:string):Promise<string>{return new Promise((resolve,reject)=>scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024},(error,key)=>error?reject(error):resolve(key.toString('hex'))));}
export function cookieToken(req:FastifyRequest){return (req.headers.cookie??'').split(';').map(s=>s.trim()).find(s=>s.startsWith('ieum_session='))?.slice(13)??'';}
export async function getSession(pool:Pool,req:FastifyRequest){const token=cookieToken(req);if(!/^[a-f0-9]{64}$/.test(token))return null;return (await pool.query('SELECT a.id,a.username,s.csrf FROM ieum_dev.sessions s JOIN ieum_dev.admins a ON a.id=s.admin_id WHERE s.token_hash=$1 AND s.expires_at>now()',[hashToken(token)])).rows[0]??null;}
async function issueSession(pool:Pool,id:string,reply:FastifyReply,prior:string){
  const token=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex'),client=await pool.connect();
  try{await client.query('BEGIN');await client.query('DELETE FROM ieum_dev.sessions WHERE expires_at<=now() OR token_hash=$1',[hashToken(prior)]);await client.query("INSERT INTO ieum_dev.sessions(token_hash,admin_id,csrf,expires_at) VALUES($1,$2,$3,now()+interval '8 hours')",[hashToken(token),id,csrf]);await client.query('COMMIT');}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  reply.header('Set-Cookie',`ieum_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);return csrf;
}
export function installAuth(app:FastifyInstance,pool:Pool){
  let failures=0,windowStart=Date.now();
  app.addHook('onRequest',async(req,reply)=>{const route=req.routeOptions.url??req.url.split('?')[0];if(route.startsWith('/api/dev/')||route.startsWith('/api/admin/')||route==='/api/auth/logout'){const session=await getSession(pool,req);if(!session)return reply.code(401).send({error:'관리자 로그인이 필요합니다'});if(!['GET','HEAD'].includes(req.method)&&req.headers['x-csrf-token']!==session.csrf)return reply.code(403).send({error:'인증 상태를 새로 확인해 주세요'});}});
  app.get('/api/auth/session',async(req)=>{const s=await getSession(pool,req);return s?{authenticated:true,username:s.username,csrf:s.csrf}:{authenticated:false,setupRequired:!(await pool.query('SELECT 1 FROM ieum_dev.admins LIMIT 1')).rowCount};});
  const body={type:'object',required:['username','password'],additionalProperties:false,properties:{username:{type:'string',pattern:'^[a-zA-Z0-9_-]{3,40}$'},password:{type:'string',minLength:8,maxLength:128}}};
  for(const mode of ['setup','login'] as const)app.post<{Body:{username:string,password:string}}>(`/api/auth/${mode}`,{schema:{body}},async(req,reply)=>{
    if(Date.now()-windowStart>600000){failures=0;windowStart=Date.now();}if(failures>=10)return reply.code(429).send({error:'로그인 시도가 많습니다 10분 뒤 다시 시도해 주세요'});failures++;
    const username=req.body.username.toLowerCase(),password=req.body.password;let admin;
    if(mode==='setup'){
      const client=await pool.connect();try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(190017,3)');if((await client.query('SELECT 1 FROM ieum_dev.admins LIMIT 1')).rowCount){await client.query('ROLLBACK');return reply.code(409).send({error:'최초 관리자 설정은 이미 완료됐습니다'});}const salt=randomBytes(16).toString('hex');admin={id:randomUUID(),username};await client.query('INSERT INTO ieum_dev.admins(id,username,password_hash,salt) VALUES($1,$2,$3,$4)',[admin.id,username,await passwordHash(password,salt),salt]);await client.query('COMMIT');}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
    }else{
      admin=(await pool.query('SELECT id,username,password_hash,salt FROM ieum_dev.admins WHERE username=$1',[username])).rows[0];const actual=await passwordHash(password,admin?.salt??'0'.repeat(32)),expected=admin?.password_hash??'0'.repeat(128);if(!timingSafeEqual(Buffer.from(actual,'hex'),Buffer.from(expected,'hex'))||!admin)return reply.code(401).send({error:'아이디 또는 비밀번호를 확인해 주세요'});
    }
    failures=0;return {authenticated:true,username,csrf:await issueSession(pool,admin.id,reply,cookieToken(req))};
  });
  app.post('/api/auth/logout',async(req,reply)=>{await pool.query('DELETE FROM ieum_dev.sessions WHERE token_hash=$1',[hashToken(cookieToken(req))]);reply.header('Set-Cookie','ieum_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return {authenticated:false};});
}
