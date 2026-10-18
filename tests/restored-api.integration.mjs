import test from 'node:test';
import assert from 'node:assert/strict';
import {createPool} from '../.build/db.js';
import {buildApp} from '../.build/app.js';

test('historical restore retains data and current APIs require authentication',async()=>{
  assert.equal(process.env.PGDATABASE,'ieum_vpn_restore_test');
  const pool=createPool(),app=buildApp(pool);
  try{
    assert.equal((await pool.query('SELECT current_database() AS name')).rows[0].name,'ieum_vpn_restore_test');
    for(const [path,field,count] of [['customers','customers',5],['servers','servers',1],['keys','keys',5]]){
      const response=await app.inject({url:`/api/dev/${path}`,headers:{host:'127.0.0.1:3000'}});
      assert.equal(response.statusCode,401);
      const table=path==='keys'?'access_keys':path;
      assert.equal((await pool.query(`SELECT count(*)::int AS count FROM ieum_dev.${table}`)).rows[0].count,count);
    }
    const denied=(await pool.query("SELECT has_database_privilege(current_user,current_database(),'CREATE') AS db,has_schema_privilege(current_user,'ieum_dev','CREATE') AS schema")).rows[0];
    assert.deepEqual(denied,{db:false,schema:false});
  }finally{await app.close();await pool.end();}
});
