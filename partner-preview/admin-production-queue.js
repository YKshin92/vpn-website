const el=id=>document.getElementById(id);let authenticated=false,epoch=0,loading=false;
function clear(){authenticated=false;epoch++;loading=false;el('production-queue-panel').hidden=true;el('production-queue-summary').replaceChildren();el('production-queue-status').textContent='';el('production-queue-refresh').disabled=false;}
async function load(){if(!authenticated||loading||!el('production-queue-panel').open)return;const generation=epoch;loading=true;el('production-queue-refresh').disabled=true;
 try{const r=await fetch('/api/admin/customer-provisioning/queue-readiness',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!authenticated||epoch!==generation)return;
  if(r.status===401){clear();document.dispatchEvent(new CustomEvent('ieum-admin-session-expired'));return;}if(!r.ok)throw Error();const value=await r.json();if(!authenticated||epoch!==generation)return;
  el('production-queue-summary').replaceChildren();
  if(!value.schemaReady){el('production-queue-status').textContent='운영 작업 저장소 적용 전입니다 · 시험용 작업과 합산하지 않습니다';return;}
  for(const [key,label] of [['total','전체 작업'],['review','관리자 확인 필요'],['evidence','지급 근거 확인 필요'],['policy','정책 확인 필요'],['expired','기간 만료'],['predecessor','이전 작업 대기'],['runtime','실행기 연결 대기'],['completed','저장된 완료 기록']]){
   const n=value.summary?.[key];if(!Number.isSafeInteger(n)||n<0)throw Error();const card=document.createElement('div'),title=document.createElement('small'),number=document.createElement('strong');title.textContent=label;number.textContent=String(n);card.append(title,number);el('production-queue-summary').append(card);
  }
  el('production-queue-status').textContent='조회 전용 · 실행기는 비활성입니다 · 완료 기록은 현재 VPN 접속 성공을 의미하지 않습니다';
 }catch{if(authenticated&&epoch===generation){el('production-queue-summary').replaceChildren();el('production-queue-status').textContent='운영 작업을 조회하지 못했습니다 · 저장소 적용과 조회 권한을 확인해 주세요';}}
 finally{if(epoch===generation){loading=false;el('production-queue-refresh').disabled=false;}}
}
el('production-queue-panel').addEventListener('toggle',()=>void load());el('production-queue-refresh').onclick=()=>void load();
document.addEventListener('ieum-admin-auth',event=>{if(!event.detail?.authenticated){clear();return;}authenticated=true;el('production-queue-panel').hidden=false;void load();});document.addEventListener('ieum-admin-session-expired',clear);
const start=epoch;void(async()=>{try{const r=await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'});if(!r.ok)return;const data=await r.json();if(epoch!==start)return;if(data.authenticated){authenticated=true;el('production-queue-panel').hidden=false;void load();}else clear();}catch{if(epoch===start)clear();}})();
