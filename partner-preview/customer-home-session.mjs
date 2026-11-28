export function mountHomeSession({api,account,signup,logout,status,onSession,events=window}){
 let sequence=0,busy=false;
 // The header shows its sign-in buttons only once the state is known (header[data-auth], ieum-ui.css), so a signed-in
 // visit no longer flips from 로그인·회원가입 to 내 이용권·로그아웃 (2026-11-24).
 function render(session){account.textContent=session.authenticated?'내 이용권':'로그인';signup.hidden=!!session.authenticated;if(logout)logout.hidden=!session.authenticated;account.closest?.('header')?.setAttribute?.('data-auth',session.authenticated?'in':'out');}
 function message(value){if(status){status.textContent=value;status.hidden=!value;}}
 async function refresh(){if(busy)return;const current=++sequence;try{const session=await api('session');if(current!==sequence)return;onSession(session);render(session);}catch{if(current===sequence)message('로그인 상태를 확인하지 못했습니다 잠시 후 다시 시도해 주세요');}}
 if(logout)logout.onclick=async()=>{if(busy)return;busy=true;sequence++;logout.disabled=true;try{await api('logout',{});onSession({authenticated:false});render({authenticated:false});message('로그아웃했습니다');}catch{message('로그아웃하지 못했습니다 잠시 후 다시 시도해 주세요');}finally{busy=false;logout.disabled=false;}};
 events.addEventListener?.('pageshow',event=>{if(event.persisted)void refresh();});
 events.addEventListener?.('focus',()=>void refresh());
 return {refresh,render};
}
