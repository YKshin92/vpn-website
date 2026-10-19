export function signupReady({email,username,password,confirmation,terms,privacy}) {
 return typeof email==='string'&&email.trim().length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
 &&typeof username==='string'&&/^[A-Za-z0-9_]{3,32}$/.test(username)
 &&typeof password==='string'&&password.length>=8&&password.length<=128&&password===confirmation
 &&terms===true&&privacy===true;
}
