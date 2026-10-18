import {createPool} from './db.js';
import {buildApp} from './app.js';
const port=Number(process.env.PORT??3000);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local port');
const pool=createPool();const app=buildApp(pool,port);
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,async()=>{await app.close();await pool.end();});
try{await pool.query('SELECT 1');await app.listen({host:'127.0.0.1',port});console.log(`Local synthetic API: http://127.0.0.1:${port}/api/health`);}
catch{console.error('Local API could not start; verify database and port configuration');await pool.end();process.exitCode=1;}
