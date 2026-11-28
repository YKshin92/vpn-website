export function signupReady({email,username,password,confirmation,terms,privacy}) {
 return typeof email==='string'&&email.trim().length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
 &&typeof username==='string'&&/^[A-Za-z0-9_]{3,32}$/.test(username)
 &&typeof password==='string'&&password.length>=8&&password.length<=128&&password===confirmation
 &&terms===true&&privacy===true;
}
// Field by field (2026-11-06 3차, review item 6): what is wrong with each field, in the order the form shows them.
// Messenger is optional (decision D-2): only a chosen WeChat/KakaoTalk needs its ID.
export function signupFieldErrors({username='',password='',confirmation='',email='',nickname='',messenger='none',messengerId='',referral=''}){
 const errors={};
 // 추천 코드 (optional): 8 letters and digits (no I, O, 0 or 1), spaces and dashes ignored.
 {const r=String(referral??'').trim().toUpperCase().replace(/[\s-]/g,'');if(r&&!/^[A-HJ-NP-Z2-9]{8}$/.test(r))errors.referral='추천 코드는 영문·숫자 8자예요 · 받은 코드를 다시 확인해 주세요';}
 if(!/^[A-Za-z0-9_]{3,32}$/.test(username))errors.username=username?'ID는 영문·숫자·밑줄(_)로 3~32자예요':'ID를 입력해 주세요';
 if(password.length<8||password.length>128)errors.password=password?'비밀번호는 8~128자로 입력해 주세요':'비밀번호를 입력해 주세요';
 if(!errors.password&&confirmation!==password)errors.confirmation=confirmation?'비밀번호가 서로 달라요 · 같은 비밀번호를 한 번 더 입력해 주세요':'같은 비밀번호를 한 번 더 입력해 주세요';
 const mail=String(email).trim();if(!mail||mail.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail))errors.email=mail?'이메일 주소 형식을 확인해 주세요 (예: hello@example.test)':'이메일을 입력해 주세요';
 const nick=String(nickname).trim();if(!nick||nick.length>30)errors.nickname=nick?'닉네임은 30자까지 쓸 수 있어요':'닉네임을 입력해 주세요 · 실명이 아니어도 돼요';
 if(['wechat','kakao'].includes(messenger)&&!String(messengerId).trim())errors.messengerId='고른 메신저의 ID를 입력해 주세요';
 return errors;
}
// A server refusal shown under the field it is about.
export const serverFieldFor={'invalid-login-id':'username','invalid-password':'password','invalid-email':'email','simulation-email-required':'email','recipient-not-allowed':'email','invalid-nickname':'nickname','invalid-messenger-id':'messengerId','invalid-referral':'referral','referral-unknown':'referral','referral-unavailable':'referral'};
