const $=id=>document.getElementById(id);let authenticated=false,epoch=0,loading=false;
const node=(tag,value)=>{const n=document.createElement(tag);n.textContent=String(value??'');return n;};
function clear(){authenticated=false;epoch++;loading=false;$('provisioning-readiness').hidden=true;$('provisioning-summary').replaceChildren();$('provisioning-rows').replaceChildren();$('provisioning-status').textContent='';$('provisioning-refresh').disabled=false;}
async function load(){if(!authenticated||loading||!$('provisioning-readiness').open)return;loading=true;const version=epoch;$('provisioning-refresh').disabled=true;try{
 const response=await fetch('/api/admin/customer-provisioning/overview',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000)});if(response.status===401){clear();document.dispatchEvent(new CustomEvent('ieum-admin-session-expired'));return;}if(!response.ok)throw Error();const data=await response.json();if(!authenticated||epoch!==version)return;
 $('provisioning-summary').replaceChildren();$('provisioning-rows').replaceChildren();
 if(!data.schemaReady){$('provisioning-status').textContent='서버 자동 배정 저장소 적용 전입니다 · 기존 고객·키는 변경하지 않습니다';return;}
 for(const [label,value] of [['전체 배정',data.summary.total],['마지막 동기화 완료',data.summary.ready],['배정 후 발급 대기',data.summary.reserved],['관리자 확인 필요',data.summary.needsReview]]){const item=node('div','');item.append(node('small',label),node('strong',value));$('provisioning-summary').append(item);}
 const states={ready:'마지막 동기화 완료 · 현재 접속 상태 아님',reserved:'배정 후 발급 대기',needs_review:'확인 필요 · 자동 재발급 금지'};
 for(const item of data.assignments){const row=node('tr','');for(const value of [item.customerId,item.instance,item.keyId,states[item.state]??'확인 필요',item.revision??'—'])row.append(node('td',value));$('provisioning-rows').append(row);}
 $('provisioning-status').textContent='조회 전용 · 실제 자동 발급 실행기는 아직 연결되지 않았습니다 · 서버 배정은 키·비밀번호를 바꾸지 않습니다';
}catch{if(authenticated&&epoch===version)$('provisioning-status').textContent='배정 현황을 조회하지 못했습니다 잠시 후 다시 확인해 주세요';}finally{if(epoch===version){loading=false;$('provisioning-refresh').disabled=false;}}}
$('provisioning-readiness').addEventListener('toggle',()=>void load());$('provisioning-refresh').onclick=()=>void load();
document.addEventListener('ieum-admin-auth',event=>{if(!event.detail?.authenticated){clear();return;}authenticated=true;$('provisioning-readiness').hidden=false;void load();});document.addEventListener('ieum-admin-session-expired',clear);
const initial=epoch;void(async()=>{try{const r=await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'});if(!r.ok)return;const session=await r.json();if(epoch!==initial)return;if(session.authenticated){authenticated=true;$('provisioning-readiness').hidden=false;void load();}else clear();}catch{if(epoch===initial)clear();}})();
