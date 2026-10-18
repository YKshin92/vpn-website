import pg from 'pg';import assert from 'node:assert/strict';import {randomUUID,createHash} from 'node:crypto';import {mkdir,writeFile,readFile,stat} from 'node:fs/promises';import path from 'node:path';import {spawn} from 'node:child_process';
import {postgresKeyJournal} from '../.build/outline-control.js';

// Local-only rehearsal. No AWS or Outline service is constructed or contacted.
const runDay=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replaceAll('-','');
const source='ieum_vpn_dev',target='ieum_vpn_key_restore_'+runDay+'_'+Date.now();
assert.match(target,/^ieum_vpn_key_restore_\d{8}_\d{13}$/);
const root=path.join(process.env.LOCALAPPDATA,'IeumVPN','postgres-local'),stamp=new Date().toISOString().replace(/[:.]/g,'-'),backup=path.join(root,'backups','outline-journal-'+stamp+'.dump'),reportPath=path.join(root,'outline-journal-'+stamp+'.json');
const config={host:'127.0.0.1',port:5432,user:'postgres',password:process.env.PGPASSWORD,connectionTimeoutMillis:5000,statement_timeout:20000,options:'-c timezone=UTC'};
if(!config.password||!process.env.IEUM_RESTORE_APP_PASSWORD)throw Error('Local credentials required');
const src=new pg.Client({...config,database:source}),app=new pg.Pool({...config,database:source,user:'ieum_app',password:process.env.IEUM_RESTORE_APP_PASSWORD,max:4});
let dst,restoredApp,snapshotOpen=false,baseline,phase='connect';const instances=['journal-test-'+randomUUID(),'journal-test-'+randomUUID()],report={source,target,status:'started',checks:[],externalCalls:false};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const ident=value=>'"'+value.replaceAll('"','""')+'"';
async function snapshot(client){
 const names=(await client.query("SELECT tablename FROM pg_tables WHERE schemaname='ieum_dev' ORDER BY tablename")).rows.map(r=>r.tablename),tables={};
 for(const name of names)tables[name]=(await client.query('SELECT to_jsonb(t) AS row FROM ieum_dev.'+ident(name)+' t ORDER BY to_jsonb(t)::text')).rows;
 const migrations=(await client.query('SELECT * FROM public.ieum_schema_migrations ORDER BY version')).rows;
 const constraints=(await client.query("SELECT c.relname,k.conname,pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ieum_dev' ORDER BY c.relname,k.conname")).rows;
 const indexes=(await client.query("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='ieum_dev' ORDER BY tablename,indexname")).rows;
 const grants=(await client.query("SELECT table_name,grantee,privilege_type FROM information_schema.role_table_grants WHERE table_schema='ieum_dev' AND grantee='ieum_app' ORDER BY table_name,privilege_type")).rows;
 return {hash:hash({tables,migrations,constraints,indexes,grants}),counts:Object.fromEntries(Object.entries(tables).map(([name,rows])=>[name,rows.length])),migrations:migrations.length,indexes:indexes.length,constraints:constraints.length,grants:grants.length};
}
async function utility(exe,args){await new Promise((resolve,reject)=>{const env={...process.env,PGPASSWORD:config.password};delete env.IEUM_RESTORE_APP_PASSWORD;const child=spawn(path.join('C:\\Program Files\\PostgreSQL\\17\\bin',exe),args,{env,windowsHide:true,stdio:'ignore'});child.once('error',()=>reject(Error('Utility launch failed')));child.once('close',code=>code===0?resolve():reject(Error('Utility failed')));});}
async function denied(pool,sql,values=[]){const client=await pool.connect();try{await client.query('BEGIN');let code;try{await client.query(sql,values);}catch(e){code=e.code;}assert.equal(code,'42501');}finally{await client.query('ROLLBACK');client.release();}}
const command=(action='create',extra={})=>({requestId:randomUUID(),action,serverId:'synthetic-generation',confirm:instances[0],name:'Synthetic test key',acknowledge:true,...extra});
try{
 await src.connect();assert.equal((await src.query('SELECT current_database() AS name')).rows[0].name,source);baseline=await snapshot(src);assert.equal(baseline.migrations,6);
 assert.equal((await src.query('SELECT 1 FROM pg_database WHERE datname=$1',[target])).rowCount,0);const journal=postgresKeyJournal(app);assert.equal(await journal.ready(),true);
 phase='persistent journal';const first=command();await journal.begin(instances[0],first.serverId,'synthetic-tester',first,'synthetic-key-1');const restarted=postgresKeyJournal(app);assert.equal((await restarted.list(instances[0]))[0].state,'intent');
 await assert.rejects(restarted.begin(instances[0],first.serverId,'synthetic-tester',command(),'synthetic-key-2'),{reason:'operation-needs-review'});
 await journal.finish(first.requestId,'succeeded',null);assert.equal((await restarted.begin(instances[0],first.serverId,'synthetic-tester',first,'unused-key')).replay,true);
 await assert.rejects(restarted.begin(instances[0],first.serverId,'synthetic-tester',{...first,name:'Changed payload'},'unused-key'),{reason:'request-conflict'});
 assert.ok((await restarted.created(instances[0],first.serverId))['synthetic-key-1']);assert.deepEqual(await restarted.created(instances[0],'different-generation'),{});
 await assert.rejects(journal.finish(first.requestId,'succeeded',null),{reason:'journal-write-failed'});
 report.checks.push('intent persists; matching request replays without another row; conflicting digest rejected; dates separated by generation; duplicate completion rejected');
 phase='concurrent journal';const commands=[command(),command()];const attempts=await Promise.allSettled(commands.map((c,i)=>journal.begin(instances[1],c.serverId,'synthetic-tester',c,'synthetic-race-'+i)));assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);assert.equal(attempts.filter(r=>r.status==='rejected').length,1);const winning=attempts.find(r=>r.status==='fulfilled').value;await journal.finish(winning.id,'succeeded',null);
 const uncertain=command('rename',{keyId:'synthetic-key-1'});await journal.begin(instances[0],uncertain.serverId,'synthetic-tester',uncertain,'synthetic-key-1');await journal.finish(uncertain.requestId,'needs_review','synthetic-timeout');await assert.rejects(restarted.begin(instances[0],uncertain.serverId,'synthetic-tester',command(),'synthetic-blocked'),{reason:'operation-needs-review'});
 report.checks.push('concurrent operations serialize; uncertain result blocks later operations across journal instances');
 phase='application permissions';await denied(app,'DELETE FROM ieum_dev.outline_key_operations WHERE id=$1',[first.requestId]);await denied(app,'CREATE TABLE ieum_dev.unauthorized_outline_probe(id int)');report.checks.push('application DELETE and DDL denied; SELECT INSERT UPDATE work');
 phase='consistent backup';await mkdir(path.dirname(backup),{recursive:true});await src.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');snapshotOpen=true;const before=await snapshot(src),exportId=(await src.query('SELECT pg_export_snapshot() AS id')).rows[0].id;await utility('pg_dump.exe',['--host','127.0.0.1','--port','5432','--username','postgres','--dbname',source,'--format=custom','--snapshot',exportId,'--file',backup]);await src.query('COMMIT');snapshotOpen=false;
 report.backupBytes=(await stat(backup)).size;assert.ok(report.backupBytes>0);report.backupSha256=createHash('sha256').update(await readFile(backup)).digest('hex');await utility('pg_restore.exe',['--list',backup]);
 phase='isolated restore';await src.query('CREATE DATABASE '+ident(target)+' OWNER postgres TEMPLATE template0');report.targetCreated=true;await utility('pg_restore.exe',['--host','127.0.0.1','--port','5432','--username','postgres','--dbname',target,'--no-owner','--single-transaction','--exit-on-error',backup]);dst=new pg.Client({...config,database:target});await dst.connect();assert.equal((await dst.query('SELECT current_database() AS name')).rows[0].name,target);await dst.query('REVOKE ALL ON DATABASE '+ident(target)+' FROM PUBLIC');await dst.query('GRANT CONNECT ON DATABASE '+ident(target)+' TO ieum_app');
 const restored=await snapshot(dst);assert.equal(restored.hash,before.hash);assert.equal((await snapshot(src)).hash,before.hash);report.snapshot={source:before,restored};report.checks.push('all ieum_dev rows, dates, migrations, constraints, indexes and app grants restored identically; source unchanged during restore');
 phase='restored app journal';restoredApp=new pg.Pool({...config,database:target,user:'ieum_app',password:process.env.IEUM_RESTORE_APP_PASSWORD,max:2});const restoredJournal=postgresKeyJournal(restoredApp);assert.equal(await restoredJournal.ready(),true);assert.equal((await restoredJournal.list(instances[0])).length,2);assert.ok((await restoredJournal.created(instances[0],first.serverId))['synthetic-key-1']);await assert.rejects(restoredJournal.begin(instances[0],first.serverId,'synthetic-tester',command(),'synthetic-blocked'),{reason:'operation-needs-review'});
 // Exercise the restored unique partial index directly in a rolled-back transaction.
 const client=await restoredApp.connect();try{await client.query('BEGIN');let code;try{await client.query("INSERT INTO ieum_dev.outline_key_operations(id,instance,server_id,key_id,action,actor,digest,state) VALUES($1,$2,'synthetic-generation','synthetic-duplicate','create','synthetic-tester',$3,'intent')",[randomUUID(),instances[0],'0'.repeat(64)]);}catch(e){code=e.code;}assert.equal(code,'23505');}finally{await client.query('ROLLBACK');client.release();}
 await denied(restoredApp,'DELETE FROM ieum_dev.outline_key_operations WHERE id=$1',[first.requestId]);report.checks.push('restored application reads dates/history; uncertain lock, unique partial index and DELETE restriction survive restore');report.status='success';
}catch{report.status='failed';report.failedPhase=phase;process.exitCode=1;}
finally{
 if(snapshotOpen)await src.query('ROLLBACK').catch(()=>{});
 try{await src.query('DELETE FROM ieum_dev.outline_key_operations WHERE instance=ANY($1::text[])',[instances]);if(dst)await dst.query('DELETE FROM ieum_dev.outline_key_operations WHERE instance=ANY($1::text[])',[instances]);report.fixturesCleaned=true;if(baseline){const after=await snapshot(src);report.originalPreserved=after.hash===baseline.hash;if(!report.originalPreserved){report.status='failed';report.failedPhase='source preservation';process.exitCode=1;}}}catch{report.status='failed';report.failedPhase='fixture cleanup';process.exitCode=1;}
 await restoredApp?.end();await dst?.end();await app.end();await src.end();report.finishedAt=new Date().toISOString();await writeFile(reportPath,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,backup,reportPath},null,2));
}
