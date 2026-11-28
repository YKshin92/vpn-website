function downloadCustomerJson(value){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='ieum-my-data.json';document.body.append(link);try{link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}}
export async function mountCustomerSettings({api,onSessionEnded,download=downloadCustomerJson,onClosed=()=>onSessionEnded(),onPasswordChanged=()=>onSessionEnded(),passwordOnly=false,loadReferral=null}){
 const $=id=>document.getElementById(id);let profile=null,busy=false,request=null;
 const message=error=>({'account-suspended':'정지된 계정은 직접 탈퇴할 수 없어요. 1:1 문의나 고객센터 이메일로 알려 주세요.','account-not-active':'이미 처리 중인 계정이에요','invalid-nickname':'닉네임은 1~30자로 입력해 주세요','invalid-messenger-id':'선택한 상담 메신저 ID를 입력해 주세요','profile-changed':'다른 화면에서 이미 바뀌었어요. 페이지를 새로 고친 뒤 다시 저장해 주세요.','request-conflict':'이전 저장 요청과 내용이 달라요. 페이지를 새로 고친 뒤 다시 확인해 주세요.','current-password-invalid':'현재 비밀번호를 확인해 주세요','invalid-password-change':'새 비밀번호는 지금과 다르게 8~128자로 입력하고, 확인 칸에도 똑같이 입력해 주세요','password-change-rate-limited':'변경 시도가 너무 많아요. 1분 뒤 다시 시도해 주세요.','password-changed':'비밀번호가 바뀌었어요. 다시 로그인해 주세요.'})[error.reason??error.message]??'처리 결과를 확인하지 못했어요. 페이지를 새로 고친 뒤 다시 시도해 주세요.';
 const clearPasswords=()=>{for(const id of ['settings-current-password','settings-password','settings-confirm'])$(id).value='';};
 function messenger(){$('settings-messenger-id').disabled=busy||$('settings-messenger').value==='none';$('settings-messenger-id').required=$('settings-messenger').value!=='none';if($('settings-messenger').value==='none')$('settings-messenger-id').value='';
  // No messenger chosen: the ID field is not shown at all, like the signup form (2026-11-07 다듬기).
  {const hide=$('settings-messenger').value==='none',label=$('settings-messenger-id-label');$('settings-messenger-id').hidden=hide;if(label)label.hidden=hide;}}
 function controls(){for(const id of ['settings-save','settings-refresh','settings-password-save','settings-nickname','settings-messenger','settings-export','settings-close'])if($(id))$(id).disabled=busy;messenger();}
 async function work(fn){if(busy)return;busy=true;controls();try{await fn();}catch(e){$('settings-status').textContent=message(e);if(e.status===401||e.message==='login-required'){clearPasswords();$('customer-settings').hidden=true;for(const id of ['settings-id','settings-email','settings-nickname','settings-messenger-id'])$(id).value='';onSessionEnded();}}finally{busy=false;controls();}}
 async function load(){profile=await api('profile');$('settings-id').value=profile.username;$('settings-email').value=profile.email;$('settings-nickname').value=profile.nickname;$('settings-messenger').value=profile.messenger;$('settings-messenger-id').value=profile.messengerId??'';$('settings-verified').textContent=profile.emailVerified?'이메일 인증 완료':'인증 상태 확인 필요';const consent=$('settings-consent'),at=Date.parse(profile.consent?.acceptedAt);if(consent)consent.textContent=Number.isFinite(at)?'가입 때 이용약관·개인정보 수집·이용·닉네임/상담 연락처 동의 · '+new Date(at+9*3600000).toISOString().slice(0,16).replace('T',' '):'동의 기록 없음 (시험용으로 만든 계정)';request=null;messenger();$('customer-settings').hidden=false;}
 $('settings-messenger').onchange=messenger;
 $('settings-export').onclick=()=>work(async()=>{const data=await api('export',{});download(data);$('settings-status').textContent='내 정보를 내려받았어요. 개인정보가 들어 있는 파일이니 안전하게 보관해 주세요.'+(data.truncated?.orders||data.truncated?.consents?' · 일부 기록은 최근 1,000건만 들어 있어요':'');});
 // No refresh button for customers any more (2026-11-07); kept for a page that still has one.
 if($('settings-refresh'))$('settings-refresh').onclick=()=>work(async()=>{await load();$('settings-status').textContent='최신 회원정보를 불러왔어요';});
 $('settings-profile-form').onsubmit=e=>{e.preventDefault();if(!profile||!$('settings-profile-form').reportValidity())return;void work(async()=>{const fields={revision:profile.revision,nickname:$('settings-nickname').value.trim(),messenger:$('settings-messenger').value,messengerId:$('settings-messenger').value==='none'?null:$('settings-messenger-id').value.trim()};const digest=JSON.stringify(fields);if(!request||request.digest!==digest)request={id:crypto.randomUUID(),digest};const result=await api('profile',{requestId:request.id,...fields});profile=result.profile;request=null;$('settings-status').textContent='회원정보를 저장했어요';});};
 $('settings-password-form').onsubmit=e=>{e.preventDefault();if(!$('settings-password-form').reportValidity())return;if($('settings-password').value!==$('settings-confirm').value){$('settings-status').textContent='새 비밀번호와 확인 값이 서로 달라요';return;}void work(async()=>{try{await api('change-password',{currentPassword:$('settings-current-password').value,password:$('settings-password').value,confirmation:$('settings-confirm').value});$('settings-status').textContent='비밀번호를 바꿨어요. 모든 기기에서 로그아웃됐으니 새 비밀번호로 다시 로그인해 주세요.';$('customer-settings').hidden=true;onPasswordChanged();}finally{clearPasswords();}});};
 // Closing the account (2026-11-06 3차, review item 19): password, then a confirmation box on the page (in the
 // page's language, not the browser's window) that says what is lost: the days left (not refunded), the key stops
 // at once, and whether it can be undone. If the days left cannot be read, it stops instead of guessing.
 const closeForm=$('settings-close-form');let closeBox=null;
 const closeAsk=quote=>{closeBox?.remove?.();const doc=closeForm.ownerDocument??document,box=doc.createElement('div');box.className='close-confirm';box.setAttribute('role','group');box.setAttribute('aria-label','탈퇴 확인');
  const title=doc.createElement('strong');title.textContent='정말 탈퇴할까요?';const list=doc.createElement('ul');
  for(const line of [quote.daysLeft>0?'환불되지 않는 남은 기간 · '+quote.daysLeft+'일':null,'접속 키가 바로 멈춰요',...(quote.graceDays>0?['계정과 개인정보 삭제까지 · '+quote.graceDays+'일','그 전에 다시 로그인하면 탈퇴를 취소할 수 있어요']:['계정과 개인정보가 바로 삭제되고 되돌릴 수 없어요'])].filter(Boolean)){const li=doc.createElement('li');li.textContent=line;list.append(li);}
  const actions=doc.createElement('div');actions.className='close-confirm-actions';const go=doc.createElement('button'),stay=doc.createElement('button');go.type='button';stay.type='button';go.className='button danger';stay.className='button secondary';
  go.textContent=quote.daysLeft>0?'남은 기간 포기하고 탈퇴':'탈퇴하기';stay.textContent='취소';actions.append(go,stay);box.append(title,list,actions);closeForm.append(box);closeBox=box;$('settings-close').hidden=true;go.focus?.();
  const done=()=>{box.remove?.();closeBox=null;$('settings-close').hidden=false;};
  stay.onclick=()=>{done();$('settings-close-password').value='';$('settings-status').textContent='탈퇴를 취소했어요';};
  go.onclick=()=>void work(async()=>{go.disabled=true;stay.disabled=true;try{const r=await api('close',{password:$('settings-close-password').value});done();$('settings-status').textContent=r.state==='closed'?'탈퇴가 완료됐어요':'탈퇴 신청이 접수됐어요';onClosed(r);}catch(e){done();throw e;}finally{$('settings-close-password').value='';}});};
 if(closeForm)closeForm.onsubmit=e=>{e.preventDefault();if(closeBox||!closeForm.reportValidity())return;void work(async()=>{
  const stop='남은 이용 기간을 확인하지 못해 탈퇴를 멈췄어요 · 잠시 후 다시 시도해 주세요';let quote;
  try{quote=await api('close-quote');}catch(e){if(e.status===401)throw e;$('settings-status').textContent=stop;return;}
  if(!quote||!Number.isSafeInteger(quote.graceDays)||(quote.daysLeft!==null&&!Number.isSafeInteger(quote.daysLeft))){$('settings-status').textContent=stop;return;}
  $('settings-status').textContent='';closeAsk(quote);});};
 window.addEventListener('pagehide',clearPasswords);
 // Signed in with an administrator's temporary password (2026-11-08): only the password change is shown, the profile
 // is not read (the server refuses it until then), and nothing else on the page asks for anything.
 if(passwordOnly){for(const id of ['settings-help','settings-verified','settings-consent','settings-profile-form','settings-export-section','settings-close-form'])if($(id))$(id).hidden=true;
  if($('settings-summary'))$('settings-summary').textContent='새 비밀번호 정하기';if($('settings-grid'))$('settings-grid').className='account-grid single';$('customer-settings').hidden=false;return {refresh:async()=>{}};}
 await work(load);void drawReferral(loadReferral,$);return {refresh:()=>work(load)};
}
// 친구 초대 (2026-11-08, draft 066): the customer's own code, a link that fills it in on sign-up, and what it brought.
async function drawReferral(loadReferral,$=id=>document.getElementById(id),origin=typeof location!=='undefined'?location.origin:''){
 const box=$('settings-referral');if(!box||!loadReferral)return;let r;try{r=await loadReferral();}catch{return;}if(!r?.available)return;
 const doc=box.ownerDocument??document,make=(tag,text,cls,parent)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;parent.append(n);return n;};
 box.replaceChildren();make('h3','친구 초대',undefined,box);
 make('p',r.on?'친구가 내 코드로 가입해 첫 이용권을 결제하면 친구와 나 모두 이용 기간 +'+r.days+'일을 받아요':'지금은 친구 초대 보상을 쉬고 있어요 · 코드는 그대로 쓸 수 있어요','settings-referral-rule',box);
 const row=make('div',undefined,'settings-referral-row',box);make('strong',r.code,'settings-referral-code',row);
 const link=origin+'/signup?ref='+encodeURIComponent(r.code),note=make('span','','settings-referral-copied',box);
 const copy=async(text,done)=>{try{await navigator.clipboard.writeText(text);note.textContent=done;}catch{note.textContent='복사하지 못했어요 · 길게 눌러 직접 복사해 주세요';}};
 for(const [label,text,done] of [['코드 복사',r.code,'코드를 복사했어요'],['초대 링크 복사',link,'초대 링크를 복사했어요']]){const b=make('button',label,'button secondary',row);b.type='button';b.onclick=()=>void copy(text,done);}
 make('p','가입 '+r.joined+'명 · 첫 결제 '+r.paid+'명 · 받은 보상 +'+r.daysEarned+'일','settings-referral-stats',box);box.hidden=false;
}
