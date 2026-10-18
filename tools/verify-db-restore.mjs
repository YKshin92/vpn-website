import pg from 'pg';
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile,stat} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';
import {buildApp} from '../.build/app.js';

const source='ieum_vpn_dev',target='ieum_vpn_restore_test';
const privateRoot=path.join(process.env.LOCALAPPDATA,'IeumVPN','postgres-local');
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const backup=path.join(privateRoot,'backups',`restore-rehearsal-${stamp}.dump`);
const reportPath=path.join(privateRoot,`restore-result-${stamp}.json`);
const report={source,target,status:'started',backup,checks:[],sourceWrites:false,externalCalls:false};
const config={host:'127.0.0.1',port:5432,user:'postgres',password:process.env.PGPASSWORD,connectionTimeoutMillis:5000,statement_timeout:15000};
if(!config.password||!process.env.IEUM_RESTORE_APP_PASSWORD)throw Error('Local credentials are required');
const src=new pg.Client({...config,database:source});
let dst,appPool,app,snapshotOpen=false;
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function snapshot(client){
  const tables={};
  for(const name of ['servers','customers','access_keys'])tables[name]=(await client.query(`SELECT * FROM ieum_dev.${name} ORDER BY id`)).rows;
  const migrations=(await client.query('SELECT * FROM public.ieum_schema_migrations ORDER BY version')).rows;
  const constraints=(await client.query("SELECT c.relname,k.conname,pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ieum_dev' ORDER BY c.relname,k.conname")).rows;
  const grants=(await client.query("SELECT table_name,grantee,privilege_type FROM information_schema.role_table_grants WHERE table_schema='ieum_dev' AND grantee='ieum_app' ORDER BY table_name,privilege_type")).rows;
  return {hash:digest({tables,migrations,constraints,grants}),counts:Object.fromEntries(Object.entries(tables).map(([k,v])=>[k,v.length])),migrations:migrations.length,constraints:constraints.length,appGrants:grants.length};
}
async function command(exe,args){
  const env={...process.env,PGHOST:'127.0.0.1',PGPORT:'5432',PGUSER:'postgres'};delete env.IEUM_RESTORE_APP_PASSWORD;
  await new Promise((resolve,reject)=>{const child=spawn(path.join('C:\\Program Files\\PostgreSQL\\17\\bin',exe),args,{env,stdio:'ignore',windowsHide:true});child.once('error',()=>reject(Error('PostgreSQL utility launch failed')));child.once('exit',code=>code===0?resolve():reject(Error(`${exe} failed (${code}); detailed output omitted`)));});
}
async function rejectConstraint(client,sql,values,expected){
  await client.query('BEGIN');
  let code;
  try{await client.query(sql,values);}catch(error){code=error.code;}finally{await client.query('ROLLBACK');}
  if(code!==expected)throw Error(`Constraint verification expected ${expected}, got ${code??'success'}`);
}
try{
  await src.connect();
  if((await src.query('SELECT 1 FROM pg_database WHERE datname=$1',[target])).rowCount)throw Error('Restore target already exists; it was not overwritten');
  await mkdir(path.dirname(backup),{recursive:true});
  await src.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');snapshotOpen=true;
  const original=await snapshot(src);report.original=original;
  const exportId=(await src.query('SELECT pg_export_snapshot() AS id')).rows[0].id;
  await command('pg_dump.exe',['--dbname',source,'--format=custom','--snapshot',exportId,'--file',backup]);
  await src.query('COMMIT');snapshotOpen=false;
  report.backupBytes=(await stat(backup)).size;
  report.backupSha256=createHash('sha256').update(await readFile(backup)).digest('hex');
  report.checks.push('consistent snapshot backup');
  // Target identifier is a fixed literal, never supplied by input. No DROP or --clean.
  await src.query('CREATE DATABASE ieum_vpn_restore_test OWNER postgres TEMPLATE template0');
  report.targetCreated=true;
  await command('pg_restore.exe',['--dbname',target,'--no-owner','--single-transaction','--exit-on-error',backup]);
  dst=new pg.Client({...config,database:target});await dst.connect();
  await dst.query('REVOKE ALL ON DATABASE ieum_vpn_restore_test FROM PUBLIC');
  await dst.query('GRANT CONNECT ON DATABASE ieum_vpn_restore_test TO ieum_app');
  const restored=await snapshot(dst);report.restored=restored;
  if(original.hash!==restored.hash)throw Error('Restored data, migrations, constraints or app grants differ');
  report.checks.push('all rows and timestamps, migrations, constraints and app grants match');
  const orphan=(await dst.query('SELECT count(*)::int AS count FROM ieum_dev.access_keys k LEFT JOIN ieum_dev.customers c ON c.id=k.customer_id LEFT JOIN ieum_dev.servers s ON s.id=k.server_id WHERE c.id IS NULL OR s.id IS NULL')).rows[0].count;
  if(orphan!==0)throw Error('Orphan key assignments found');
  report.checks.push('customer/server references intact');
  appPool=new pg.Pool({...config,database:target,user:'ieum_app',password:process.env.IEUM_RESTORE_APP_PASSWORD,max:2});
  const client=await appPool.connect();
  try{
    const token=randomUUID();
    const sample=(await client.query('SELECT * FROM ieum_dev.access_keys ORDER BY id LIMIT 1')).rows[0];
    if(!sample)throw Error('Fixture key required for constraint checks');
    // All mutation probes use only the restore target and always roll back.
    await client.query('BEGIN');
    try{
      await client.query('INSERT INTO ieum_dev.customers(id,display_name,email,status) VALUES($1,$2,$3,$4)',[token,'복원 검사',`${token}@example.test`,'review_required']);
      await client.query('SAVEPOINT key_conflict');
      let code;
      try{await client.query('INSERT INTO ieum_dev.access_keys(id,customer_id,server_id,outline_key_id) VALUES($1,$2,$3,$4)',[randomUUID(),token,sample.server_id,sample.outline_key_id]);}catch(error){code=error.code;}
      await client.query('ROLLBACK TO SAVEPOINT key_conflict');
      if(code!=='23505')throw Error('Shared server key assignment was not rejected');
    }finally{await client.query('ROLLBACK');}
    await rejectConstraint(client,'INSERT INTO ieum_dev.access_keys(id,customer_id,server_id,outline_key_id) VALUES($1,$2,$3,$4)',[randomUUID(),sample.customer_id,sample.server_id,`demo-${token}`],'23505');
    await rejectConstraint(client,'INSERT INTO ieum_dev.access_keys(id,customer_id,server_id,outline_key_id) VALUES($1,$2,$3,$4)',[randomUUID(),`missing-${token}`,sample.server_id,`demo-${token}`],'23503');
    await rejectConstraint(client,'CREATE TABLE ieum_dev.unauthorized_restore_probe(id int)',[],'42501');
    report.checks.push('duplicate shared key and second customer key rejected; foreign key enforced; app DDL denied');
  }finally{client.release();}
  app=buildApp(appPool);
  const health=await app.inject({url:'/api/health',headers:{host:'127.0.0.1:3000'}});
  const customers=await app.inject({url:'/api/dev/customers',headers:{host:'127.0.0.1:3000'}});
  if(health.statusCode!==200||customers.statusCode!==200||customers.json().customers.length!==original.counts.customers)throw Error('API connection to restore database failed');
  report.checks.push('same API using restored database connection works');
  const after=await snapshot(dst);
  if(after.hash!==restored.hash)throw Error('Restore probes left persistent changes');
  const unchanged=await snapshot(src);
  if(unchanged.hash!==original.hash)throw Error('Source changed during rehearsal; review concurrent writes');
  report.checks.push('restore probes rolled back; source data and schema unchanged');
  report.status='success';
}catch(error){report.status='failed';report.error=error.message;process.exitCode=1;}
finally{
  if(snapshotOpen)await src.query('ROLLBACK').catch(()=>{});
  await app?.close();await appPool?.end();await dst?.end();await src.end();
  report.finishedAt=new Date().toISOString();
  await writeFile(reportPath,JSON.stringify(report,null,2));
  console.log(JSON.stringify({...report,reportPath},null,2));
}
