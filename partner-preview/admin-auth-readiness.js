const $=id=>document.getElementById(id);let active=false,version=0,busy=false,detailSeq=0;
const date=value=>value?new Date(value).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'—';
const node=(tag,text)=>{const n=document.createElement(tag);n.textContent=String(text??'');return n;};
function closeDetail(){detailSeq++;$('auth-detail-facts').replaceChildren();$('auth-detail-events').replaceChildren();$('auth-detail-status').textContent='';if($('auth-request-dialog').open)$('auth-request-dialog').close();}
function clear(){active=false;version++;busy=false;closeDetail();$('auth-readiness').hidden=true;for(const id of ['auth-summary','auth-request-rows','auth-policy-rows'])$(id).replaceChildren();$('auth-readiness-status').textContent='';$('auth-readiness-refresh').disabled=false;}
function empty(id,text,cols){const row=node('tr',''),cell=node('td',text);cell.colSpan=cols;row.append(cell);$(id).append(row);}
async function load(){if(!active||busy)return;busy=true;const current=++version;$('auth-readiness-refresh').disabled=true;$('auth-readiness-status').textContent='인증 준비 상태를 조회하고 있습니다';
 try{const response=await fetch('/api/admin/customer-auth/overview',{credentials:'same-origin',signal:AbortSignal.timeout(10000)});if(response.status===401){clear();document.dispatchEvent(new CustomEvent('ieum-admin-session-expired'));return;}if(!response.ok)throw Error();const data=await response.json();if(!active||current!==version)return;
  for(const id of ['auth-summary','auth-request-rows','auth-policy-rows'])$(id).replaceChildren();
  if(!data.schemaReady){$('auth-readiness-status').textContent='인증 기록 조회를 준비하고 있습니다';empty('auth-request-rows','인증 기록 DB가 준비되지 않았습니다',6);empty('auth-policy-rows','정책 기록 DB가 준비되지 않았습니다',3);return;}
  for(const [label,value] of [['인증 요청',data.summary.requests],['동의 기록',data.summary.consents],['유효 세션',data.summary.activeSessions],['발송 결과 확인 필요',data.summary.unconfirmedMail]]){const card=node('div','');card.append(node('small',label),node('strong',value));$('auth-summary').append(card);}
  const states={pending:'확인 대기',expired:'코드 만료',consumed:'인증 완료',superseded:'무효화',locked:'잠김'},delivery={intent:'요청 처리 중',accepted:'발송 접수',rejected:'발송 거절',unknown:'결과 확인 필요'};
  for(const r of data.requests){const row=node('tr','');row.append(node('td',r.id),node('td',r.flow==='signup'?'가입':'로그인'),node('td',(states[r.displayState??r.state]??'확인 필요')+' · '+(delivery[r.delivery]??'확인 필요')),node('td',r.attempts+' / 5'),node('td',date(r.createdAt)));const cell=node('td',''),button=node('button','상세 이력');button.onclick=()=>void detail(r.id);cell.append(button);row.append(cell);$('auth-request-rows').append(row);}
  for(const p of data.policies){const row=node('tr','');row.append(node('td',p.id),node('td',({draft:'초안',active:'활성',retired:'이전 버전'})[p.state]??'확인 필요'),node('td',date(p.effectiveAt)));$('auth-policy-rows').append(row);}
  if(!data.requests.length)empty('auth-request-rows','인증 요청이 없습니다 실제 가입은 아직 비활성입니다',6);if(!data.policies.length)empty('auth-policy-rows','등록된 정책 버전이 없습니다 초안 확정 후 게시합니다',3);
  $('auth-readiness-status').textContent='조회 전용 · 인증 API '+(data.runtime.authApiConnected?'연결':'미연결')+' · 실제 메일 '+(data.runtime.realMailConnected?'연결':'미연결')+' · 가입 '+(data.runtime.signupEnabled?'활성':'비활성')+' · 한국시간';
 }catch{if(active&&current===version)$('auth-readiness-status').textContent='조회하지 못했습니다 표시된 이전 결과는 최신 정보가 아닐 수 있습니다 다시 조회해 주세요';}finally{if(current===version){busy=false;$('auth-readiness-refresh').disabled=false;}}
}
async function detail(id){if(!active)return;closeDetail();const current=version,seq=detailSeq;$('auth-detail-status').textContent='상세 이력을 조회하고 있습니다';$('auth-request-dialog').showModal();
 try{const response=await fetch('/api/admin/customer-auth/requests/'+encodeURIComponent(id),{credentials:'same-origin',signal:AbortSignal.timeout(10000)});if(response.status===401){clear();document.dispatchEvent(new CustomEvent('ieum-admin-session-expired'));return;}if(!response.ok)throw Error();const data=await response.json();if(!active||current!==version||seq!==detailSeq)return;const r=data.request;
  const state={pending:'확인 대기',expired:'코드 만료',consumed:'인증 완료',superseded:'무효화',locked:'잠김'},mail={intent:'요청 처리 중',accepted:'발송 접수',rejected:'발송 거절',unknown:'결과 확인 필요'};
  for(const [label,value] of [['요청 ID',r.id],['신청 종류',r.flow==='signup'?'가입':'로그인'],['인증 상태',state[r.displayState??r.state]??'확인 필요'],['발송 상태',mail[r.delivery]??'확인 필요'],['실패 횟수',r.attempts+' / 5'],['정책 묶음',r.releaseId??'재로그인'],['신청',date(r.createdAt)],['코드 만료',date(r.expiresAt)],['인증 완료',date(r.consumedAt)]])$('auth-detail-facts').append(node('dt',label),node('dd',value));
  for(const e of data.events){const item=node('article','');item.className='portal-event';item.append(node('strong',({terms:'이용약관',required_collection:'필수 수집·이용',optional_profile:'선택 프로필'})[e.kind]??'동의 문서'),node('p','버전 '+e.version+' · '+(({accepted:'동의',declined:'동의 안 함',withdrawn:'철회'})[e.action]??'확인 필요')),node('p',date(e.recordedAt)));$('auth-detail-events').append(item);}
  if(!data.events.length)$('auth-detail-events').append(node('p','이 요청에 기록된 동의가 없습니다 재로그인은 기존 동의를 다시 생성하지 않습니다'));
  $('auth-detail-status').textContent='조회 전용 · 한국시간 · 발송 접수는 메일 도착 확인이 아닙니다';
 }catch{if(active&&current===version&&seq===detailSeq)$('auth-detail-status').textContent='상세 이력을 조회하지 못했습니다 창을 닫고 다시 조회해 주세요';}
}
$('auth-detail-close').onclick=closeDetail;$('auth-request-dialog').addEventListener('cancel',closeDetail);
$('auth-readiness-refresh').onclick=()=>void load();
document.addEventListener('ieum-admin-auth',event=>{clear();if(event.detail?.authenticated){active=true;$('auth-readiness').hidden=false;void load();}});
const initial=version;void(async()=>{try{const r=await fetch('/api/auth/session',{credentials:'same-origin'});if(!r.ok)return;const s=await r.json();if(initial!==version)return;if(s.authenticated){active=true;$('auth-readiness').hidden=false;await load();}}catch{}})();
