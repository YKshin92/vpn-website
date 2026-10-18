import pg from 'pg';
export function createPool() {
  if (!process.env.PGPASSWORD) throw new Error('Backend database credentials are required');
  const database=process.env.PGDATABASE??'ieum_vpn_dev';
  if (!['ieum_vpn_dev','ieum_vpn_restore_test'].includes(database)) throw new Error('Only named development and restore databases are supported');
  const pool=new pg.Pool({host:process.env.PGHOST??'127.0.0.1',port:Number(process.env.PGPORT??5432),database,user:process.env.PGUSER??'ieum_app',password:process.env.PGPASSWORD,max:5,connectionTimeoutMillis:5000,statement_timeout:10000});
  pool.on('error',()=>console.error('Idle database connection failed; details omitted'));
  return pool;
}
