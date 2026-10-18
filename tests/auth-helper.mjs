import {randomBytes,randomUUID} from 'node:crypto';
import {passwordHash} from '../.build/auth.js';
export async function testAdmin(pool,app,password=randomBytes(24).toString('hex')){
  const id=randomUUID(),username='test_'+id.replaceAll('-',''),salt=randomBytes(16).toString('hex');
  await pool.query('INSERT INTO ieum_dev.admins(id,username,password_hash,salt) VALUES($1,$2,$3,$4)',[id,username,await passwordHash(password,salt),salt]);
  const login=await app.inject({method:'POST',url:'/api/auth/login',headers:{host:'127.0.0.1:3000'},payload:{username,password}});
  if(login.statusCode!==200){await pool.query('DELETE FROM ieum_dev.admins WHERE id=$1',[id]);throw Error('Test admin login failed');}
  return {id,username,password,headers:{cookie:login.headers['set-cookie'].split(';')[0],'x-csrf-token':login.json().csrf}};
}
