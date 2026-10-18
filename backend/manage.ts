import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createPool} from './db.js';
import type {Pool} from 'pg';

export async function migrate(pool:Pool) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(190017,1)');
    await client.query('CREATE TABLE IF NOT EXISTS public.ieum_schema_migrations (version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    const directory=new URL('../backend/migrations/',import.meta.url);
    for(const version of (await readdir(directory)).filter(n=>/^\d+_.+\.sql$/.test(n)).sort()) {
      const sql=(await readFile(new URL(version,directory),'utf8')).replace(/\r\n/g,'\n');
      const checksum=createHash('sha256').update(sql).digest('hex');
      const prior=await client.query('SELECT checksum FROM public.ieum_schema_migrations WHERE version=$1',[version]);
      if(prior.rowCount){if(prior.rows[0].checksum!==checksum)throw Error('Applied migration checksum differs');continue;}
      await client.query(sql);
      await client.query('INSERT INTO public.ieum_schema_migrations(version,checksum) VALUES($1,$2)',[version,checksum]);
    }
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

export async function seed(pool:Pool) {
  const customers=JSON.parse(await readFile(new URL('../fixtures/demo/customers.json',import.meta.url),'utf8'));
  const config=JSON.parse(await readFile(new URL('../fixtures/demo/infrastructure.json',import.meta.url),'utf8'));
  if(config.mode!=='simulation'||config.allowMutations!==false||!config.outline.hostnameForAccessKeys.endsWith('.test'))throw Error('Only synthetic fixtures are allowed');
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(190017,2)');
    await client.query('INSERT INTO ieum_dev.servers(id,name,region,hostname) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING',[config.outline.serverId,config.aws.instanceName,config.aws.region,config.outline.hostnameForAccessKeys]);
    for(const c of customers){
      await client.query('INSERT INTO ieum_dev.customers(id,display_name,email,status) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING',[c.id,c.displayName,c.email.toLowerCase(),c.status]);
      await client.query('INSERT INTO ieum_dev.access_keys(id,customer_id,server_id,outline_key_id) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING',[`assignment-${c.id}`,c.id,config.outline.serverId,c.outlineKeyId]);
    }
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

if(process.argv[1]?.endsWith('manage.js')){
  const pool=createPool();
  try{const action=process.argv[2];if(action==='migrate')await migrate(pool);else if(action==='seed')await seed(pool);else throw Error('Unknown database command');console.log(`${action}: complete (local synthetic database)`);}
  catch{console.error('Database command failed; credentials and database error details are not logged');process.exitCode=1;}
  finally{await pool.end();}
}
