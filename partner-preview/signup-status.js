// Public readiness only. Never reads form values or invokes a mutation endpoint.
const status=document.getElementById('signup-connection');
if(location.port==='3000'&&['127.0.0.1','localhost'].includes(location.hostname)){
 void (async()=>{try{const r=await fetch('/api/signup/status',{credentials:'omit',signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error();const data=await r.json();status.textContent=data.available===false&&data.canRequestCode===false?'가입 서비스 준비 중 · 현재는 미리보기만 이용할 수 있습니다':'가입 안내를 확인하고 있습니다 실제 정보 입력은 잠시 기다려 주세요';}catch{status.textContent='가입 서비스 상태를 확인하지 못했습니다 현재 화면은 미리보기로 이용할 수 있습니다';}})();
}
