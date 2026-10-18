import type {Pool} from 'pg';
import {OutlineError} from './outline.js';
// Separate namespace from the short journal transaction lock (190017).
export async function withOutlineWorkerLock<T>(pool:Pool,instance:string,work:()=>Promise<T>):Promise<T>{
 const client=await pool.connect();let locked=false,discard=false;
 try{locked=(await client.query('SELECT pg_try_advisory_lock(190018,hashtext($1)) AS locked',['outline:'+instance])).rows[0].locked;if(!locked)throw new OutlineError('operation-busy',409);return await work();}
 finally{if(locked){try{if(!(await client.query('SELECT pg_advisory_unlock(190018,hashtext($1)) AS unlocked',['outline:'+instance])).rows[0].unlocked)discard=true;}catch{discard=true;}}client.release(discard);}
}
