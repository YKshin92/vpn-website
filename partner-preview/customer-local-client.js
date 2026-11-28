import {mountSupportNotice} from './customer-support-notice.mjs';
import {renderPolicy,effectiveDate} from './policy-text.mjs';
import {mountPaymentHistory} from './customer-payment-history.mjs';
import {mountVerifiedWallet} from './customer-verified-wallet.mjs';
import {mountCustomerMockKey} from './customer-mock-key.mjs';
import {mountVerifiedOrder} from './customer-verified-order.mjs';
import {mountSupportWidget} from './customer-support-widget.mjs';
import {clearSupportDrafts} from './customer-support-client.mjs';
import {mountContactLine} from './customer-contact.mjs';
import {mountCustomerSettings} from './customer-settings.mjs';
import {mountUsernameCheck} from './customer-username-check.mjs';
import {mountHomeSession} from './customer-home-session.mjs';
import {requestMemory} from './customer-request-memory.mjs';
import {mountLocalRecovery,authMessage,requestStatusMessage} from './customer-local-auth.mjs';
import {mountLocalPass} from './customer-local-pass.mjs';
import {addAccountLanguagePreview} from './customer-language-preview.mjs';
import {mountLoginPlan} from './plan-pick.mjs';
// Loaded only by the isolated credential preview, never the operational homepage.
let tabStorage;try{tabStorage=window.sessionStorage;}catch{}
const pendingMemory=requestMemory(tabStorage);
const $=id=>document.getElementById(id);let csrf='';
// 관리자 로그인은 /admin/login에서만 해요 (관리자 화면 검토 4단계, decision Q-14): a customer's failed sign-in is never tried as an administrator.
async function api(path,body){const r=await fetch('/api/local-customer/'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000),headers:body?{'Content-Type':'application/json','X-Local-CSRF':csrf}:{},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok){const error=Error(data.reason??'요청 실패');error.reason=data.reason;error.status=r.status;throw error;}return data;}
const text=(id,value)=>{const n=$(id);if(n){n.textContent=value;if(value&&n.hidden)n.hidden=false;}};
let panelNote=null;const notice=value=>{if(panelNote){panelNote.textContent=value;panelNote.hidden=!value;}else text($('signup-status')?'signup-status':'status',value);};
let supportInbox,supportNotice,paymentHistory,verifiedWallet,verifiedOrder,customerKey;let state;try{state=await api('session');csrf=state.csrf;}catch{notice('서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');}
// 메일 발송 (2026-11-10): 'live-email' sends codes to any address; 'private-email-test' was the one-address trial.
const liveMail=state?.mode==='live-email',realMail=liveMail||state?.mode==='private-email-test';
const chosen=new URLSearchParams(location.search).get('plan');const plan=['trial','30','90','180'].includes(chosen)?chosen:null;
// A session that ends while the page is open (2026-11-06 3차, review item 22): say so at the top and link back to
// sign in, instead of reloading and wiping what was on screen.
let authLostShown=false;
function authLost(){if(authLostShown)return;authLostShown=true;const bar=document.createElement('p');bar.className='auth-lost';bar.setAttribute('role','alert');const a=document.createElement('a');a.href='./account.html'+(plan?'?plan='+encodeURIComponent(plan):'');a.textContent='다시 로그인';bar.append(document.createTextNode('로그인이 풀렸어요 · 다시 로그인하면 이 화면으로 돌아와요'),a);(document.querySelector('main')??document.body).prepend(bar);bar.scrollIntoView?.({block:'nearest'});}
if($('account')){
 const homeSession=mountHomeSession({api,account:$('account'),signup:$('signup-entry'),logout:$('home-logout'),status:$('home-auth-status'),onSession:value=>{state=value;if(value.csrf)csrf=value.csrf;}});homeSession.render(state??{authenticated:false});
 $('account').onclick=()=>location.assign('./account.html');
 document.querySelectorAll('[data-plan]').forEach(b=>{b.disabled=false;b.onclick=()=>location.assign('./account.html?plan='+encodeURIComponent(b.dataset.plan));});
 if($('request-trial')){$('request-trial').disabled=false;$('request-trial').onclick=()=>location.assign('./account.html?plan=trial');}
}
if($('signup-form')){
 const usernameCheck=$('check-username')?mountUsernameCheck({input:$('signup-username'),button:$('check-username'),result:$('username-check-result'),api}):null;
 const errorBox=document.createElement('div');errorBox.className='signup-error';errorBox.hidden=true;errorBox.setAttribute('role','alert');const errorTitle=document.createElement('strong'),errorMessage=document.createElement('p'),errorLogin=document.createElement('a');errorTitle.textContent='가입 정보를 확인해 주세요';errorLogin.textContent='로그인으로 이동 →';errorLogin.href='./account.html';errorBox.append(errorTitle,errorMessage,errorLogin);$('signup-status').before?.(errorBox);
 $('signup-form').addEventListener('input',()=>{errorBox.hidden=true;});
 text('email-help',liveMail?'인증 코드를 받을 이메일 주소예요 · 6자리 코드를 메일로 보내요':realMail?'승인된 본인 이메일 주소를 입력하세요 인증 코드는 이메일로만 전달됩니다':'인증 코드를 받을 이메일 주소예요 · 시험 서버에서는 hello@example.test처럼 .test 주소만 쓸 수 있고, 코드는 메일 대신 다음 화면에 표시돼요');
 text('join-step-3','03 이메일 인증');
 void mountContactLine($('signup-contact'),{lead:'가입이 안 되거나 궁금한 점이 있으면 고객센터 이메일로 연락해 주세요'});
 const stepLabel=document.querySelector?.('.steps li:last-child strong');if(stepLabel)stepLabel.textContent='이메일 인증';const stepHelp=document.querySelector?.('.steps li:last-child p');if(stepHelp)stepHelp.textContent='인증 코드 확인 후 계정 생성';const previewNote=document.querySelector?.('.preview-note');if(previewNote)previewNote.hidden=true;
 let request=null,signupId=null,signupBusy=false,expires=0;const frozen=new Map();const freeze=()=>{$('signup-form').querySelectorAll('input,select,button').forEach(node=>{if(!frozen.has(node))frozen.set(node,node.disabled);node.disabled=true;});};const thaw=()=>{for(const [node,disabled] of frozen)node.disabled=disabled;frozen.clear();};const panel=document.createElement('section');panel.className='result';panel.id='signup-verification';panel.setAttribute('aria-live','polite');panel.hidden=true;const heading=document.createElement('h3');heading.textContent='이메일 인증';panel.append(heading);
 const label=document.createElement('label');label.className='field-label';label.textContent='인증 코드 6자리';const input=document.createElement('input');input.type='text';input.inputMode='numeric';input.maxLength=6;input.pattern='[0-9]{6}';input.autocomplete='one-time-code';label.append(input);
 const codeNote=document.createElement('p'),verify=document.createElement('button');codeNote.className='help sent-note';verify.type='button';verify.className='primary';verify.textContent='인증하고 계정 만들기';const checkStatus=document.createElement('button');checkStatus.type='button';checkStatus.className='view';checkStatus.textContent='요청 상태 다시 확인';const hint=document.createElement('p');hint.className='help code-hint';hint.textContent='코드는 5분 동안 유효해요. 다시 받으면 이전 코드는 쓸 수 없어요.';const panelMsg=document.createElement('p');panelMsg.className='status panel-status';panelMsg.setAttribute('role','status');panelMsg.hidden=true;const actions=document.createElement('div');actions.className='verify-actions';const editEmail=document.createElement('button');editEmail.type='button';editEmail.className='view';editEmail.textContent='이메일 주소 고치기';actions.append(editEmail);const contact2=document.createElement('p');contact2.className='footnote signup-contact';contact2.hidden=true;panel.append(codeNote,label,hint,verify,panelMsg,actions,checkStatus,contact2);$('signup-form').after(panel);void mountContactLine(contact2,{lead:'메일이 오지 않으면 고객센터 이메일로 알려 주세요',mark:false});
 // 이메일 주소 고치기: back to the information step; the next request (a new ID) replaces this pending one.
 editEmail.onclick=()=>{if(signupBusy)return;request=null;signupId=null;pendingMemory.clear();input.value='';thaw();restoreSignupInformation();notice('이메일 주소를 고치고 비밀번호를 다시 입력한 뒤 인증 코드를 받아 주세요');$('signup-email')?.focus?.();};
 checkStatus.onclick=async()=>{if(!signupId||signupBusy)return;signupBusy=true;checkStatus.disabled=true;try{const value=await api('signup-status/'+encodeURIComponent(signupId));codeNote.textContent=(request?.simulationCode?'인증 코드: '+request.simulationCode+' (시험 서버는 메일 대신 화면에 표시) · ':'')+requestStatusMessage(value);if(realMail&&value.state==='pending'&&value.delivery==='accepted'){request=value;expires=Date.parse(value.expiresAt);label.hidden=false;verify.hidden=false;verify.disabled=false;}if(value.state==='consumed'){pendingMemory.clear();request=null;verify.hidden=true;const link=document.createElement('a');link.href='./account.html'+(plan?'?plan='+encodeURIComponent(plan):'');link.textContent='로그인으로 이동';if(!panel.querySelector('a'))panel.append(link);notice('이미 계정이 만들어졌어요. 로그인해 주세요.');}else if(['expired','locked','conflict'].includes(value.state)){request=null;signupId=null;pendingMemory.clear();thaw();restoreSignupInformation();notice('이 요청은 끝났어요. 비밀번호를 다시 입력하고 새로 요청해 주세요.');}else if(!realMail&&value.delivery==='accepted'&&!request?.simulationCode){request=null;expires=Date.parse(value.expiresAt);verify.disabled=true;thaw();codeNote.textContent='새로 고침해서 인증 코드 칸이 비워졌어요. 같은 가입 정보와 비밀번호를 다시 입력하고 인증 코드 받기를 누르면 이전 요청을 이어서 확인해요.';notice(codeNote.textContent);}else notice('이전 요청 상태만 확인했어요. 코드를 다시 보내지는 않았어요.');}catch(e){notice(authMessage(e));}finally{signupBusy=false;checkStatus.disabled=false;}};
 // The signup screen shows the server's active documents: exactly the version a consent will point to.
 function showPolicies(value){
  const docs=value?.documents;if(!docs)return;
  for(const key of ['terms','privacy','profile','notice']){const tpl=$('policy-'+key),doc=docs[key];if(!tpl||typeof doc?.content!=='string')continue;const {title,section}=renderPolicy(document,doc.content);tpl.content.replaceChildren(section);if(title)tpl.dataset.title=title;}
  const starts=effectiveDate(docs.terms?.content);if($('policy-version')){const v=$('policy-version'),label=document.createElement('span');label.textContent='시행일';v.replaceChildren?.(...(starts?[label,' '+starts.dotted]:[]));}
  const draft=document.querySelector?.('.policy-draft');if(draft)draft.textContent='검토 중인 초안이에요 · 동의하면 이 문서가 가입 기록에 함께 저장돼요';
  const banner=document.querySelector?.('.draft-banner');if(banner)banner.hidden=true;
  const foot=document.querySelector?.('.footnote');if(foot)foot.textContent='동의한 문서와 시각은 가입 기록에 저장돼요';
 }
 // Remembering an opaque request ID must not open verification on the consent step.
 // The backend safely restores a pending request after the user submits the form.
 function restoreSignupInformation(){panelNote=null;panel.hidden=true;if($('signup-connection'))$('signup-connection').hidden=false;if($('join-information'))$('join-information').hidden=false;$('signup-preview').hidden=false;for(let i=1;i<=3;i++){const step=$('join-step-'+i);if(step){if(i===2)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');}}}
 const remembered=pendingMemory.read();if(remembered?.kind==='signup'){signupId=remembered.id;verify.disabled=true;}
 const policies=await api('policies');showPolicies(policies);$('signup-preview').textContent=realMail?'인증 이메일 받기':'인증 코드 받기';text('signup-connection',liveMail?'인증 코드는 5분 동안 유효해요 · 다시 받으면 이전 코드는 쓸 수 없어요':realMail?'비공개 이메일 인증 시험 · 코드 5분 유효 · 재발송 시 이전 코드 무효':'이메일 인증 후 계정이 만들어져요');
 $('signup-form').addEventListener('submit',async event=>{
  event.preventDefault();event.stopImmediatePropagation();if(signupBusy||request)return;if(usernameCheck&&!usernameCheck.ensure())return;if(!$('signup-form').reportValidity())return;errorBox.hidden=true;signupBusy=true;
  const password=$('signup-password').value;
  try{
   $('signup-preview').disabled=true;
   signupId??=crypto.randomUUID();pendingMemory.save(signupId,'signup');
   request=await api('signup',{requestId:signupId,username:$('signup-username').value,password,confirmation:$('signup-password-confirm').value,email:$('signup-email').value,nickname:$('signup-nickname').value,messenger:$('signup-messenger').value,messengerId:$('signup-messenger-id').value,...($('signup-referral')?.value?.trim()?{referralCode:$('signup-referral').value.trim()}:{}),consent:{releaseId:policies.releaseId,terms:$('agree-terms').checked,collection:$('agree-privacy').checked,profile:$('agree-profile').checked,age:$('agree-age')?.checked===true}});
   signupId=request.id;pendingMemory.save(signupId,'signup');expires=Date.parse(request.expiresAt);$('signup-password').value='';$('signup-password-confirm').value='';codeNote.textContent=request.simulationCode?'인증 코드: '+request.simulationCode+' · 5분 유효 · 오입력 5회 제한 (시험 서버는 메일 대신 화면에 표시)':liveMail&&request.delivery==='accepted'&&!request.duplicate?'메일로 6자리 인증 코드를 보냈어요 · 5분 안에 입력해 주세요 · 메일이 없으면 스팸함도 확인해 주세요':'기존 요청의 '+(liveMail?'':'시험 ')+'발송 상태: '+(request.delivery??'미확정')+' · 코드를 다시 보내지는 않았어요';const mayVerify=!!request.simulationCode||(realMail&&request.delivery==='accepted'&&request.state==='pending');if(realMail){if(mayVerify){const sentTo=document.createElement('strong');sentTo.textContent=$('signup-email').value.trim();sentTo.setAttribute('translate','no');const sentText=document.createElement('span');sentText.textContent='주소로 인증 코드를 보냈어요. 받은메일함과 스팸함을 확인해 주세요.';codeNote.textContent='';codeNote.append(sentTo,' ',sentText);}else codeNote.textContent='이메일 발송 상태: '+request.delivery+' · 요청 상태를 다시 확인해 주세요';}hint.hidden=!mayVerify;checkStatus.hidden=mayVerify&&realMail;verify.disabled=!mayVerify;label.hidden=!mayVerify;verify.hidden=!mayVerify;panel.hidden=false;if(mayVerify){if($('join-information'))$('join-information').hidden=true;$('signup-preview').hidden=true;for(let i=1;i<=3;i++){const step=$('join-step-'+i);if(step){if(i===3)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');}}document.querySelectorAll?.('.steps li')?.forEach((el,index)=>{if(index===2)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});}freeze();panel.scrollIntoView({behavior:'smooth',block:'center'});input.focus({preventScroll:true});if(mayVerify){if($('signup-connection'))$('signup-connection').hidden=true;text('signup-status','');panelNote=panelMsg;notice('');}else notice('요청 상태를 다시 확인해 주세요');
  }catch(e){panel.hidden=true;label.hidden=true;verify.hidden=true;request=null;errorMessage.textContent=authMessage(e);errorLogin.hidden=e.reason!=='enrollment-unavailable';if(window.ieumSignupServerError?.(e.reason,authMessage(e))===true)errorBox.hidden=true;else{errorBox.hidden=false;errorBox.scrollIntoView({behavior:'smooth',block:'center'});}if(['simulation-email-required','invalid-password','enrollment-unavailable','policy-version-changed'].includes(e.reason)){signupId=null;pendingMemory.clear();}notice('');}finally{signupBusy=false;$('signup-preview').disabled=!!request;}
 },true);
 if(realMail){
  if(previewNote)previewNote.textContent=liveMail?'입력한 이메일로 6자리 인증 코드를 보내요 · 코드를 입력하면 가입이 끝나요':'본인 이메일 인증 시험입니다 개인정보는 별도 로컬 시험 DB에 저장되며 결제와 VPN은 연결되지 않습니다';
  if(stepHelp)stepHelp.textContent='이메일 코드 확인 후 계정 생성';
  const resend=document.createElement('button');resend.type='button';resend.className='view';resend.textContent='인증 메일 다시 받기 (1분 간격)';actions.append(resend,editEmail);let resendId=null;
  resend.onclick=async()=>{if(!signupId||signupBusy)return;signupBusy=true;resend.disabled=true;try{resendId??=crypto.randomUUID();const value=await api('resend',{id:signupId,requestId:resendId});request=value;signupId=value.id;pendingMemory.save(signupId,'signup');resendId=null;expires=Date.parse(value.expiresAt);input.value='';label.hidden=value.delivery!=='accepted';verify.hidden=value.delivery!=='accepted';verify.disabled=value.delivery!=='accepted';codeNote.textContent=value.delivery==='accepted'?'새 인증 코드를 메일로 보냈어요 · 이전 코드는 쓸 수 없어요':'새 인증 메일을 보내지 못했어요 · 잠시 후 다시 시도해 주세요';notice('가장 최근 이메일의 코드를 입력해 주세요');}catch(e){notice(authMessage(e));}finally{signupBusy=false;resend.disabled=false;}};
 }
 verify.onclick=async()=>{if(!request||signupBusy)return;if(Date.now()>=expires){request=null;signupId=null;pendingMemory.clear();thaw();input.value='';restoreSignupInformation();notice('코드 유효 시간이 지났어요. 비밀번호를 다시 입력하고 새로 요청해 주세요.');return;}if(!/^[0-9]{6}$/.test(input.value)){notice('6자리 숫자 코드를 입력해 주세요');return;}signupBusy=true;verify.disabled=true;try{const made=await api('verify',{id:request.id,code:input.value});pendingMemory.clear();input.value='';
  // Verified accounts are signed in at once and go straight on to the pass they chose (2026-11-06 3차, review item 7).
  if(made?.authenticated===true){codeNote.textContent='계정을 만들었어요 · 내 이용권으로 이동해요';verify.hidden=true;location.assign('./account.html'+(plan?'?plan='+encodeURIComponent(plan):''));return;}
  codeNote.textContent='계정을 만들었어요';verify.hidden=true;const link=document.createElement('a');link.href='./account.html'+(plan?'?plan='+encodeURIComponent(plan):'');link.textContent='로그인하고 이용권 신청 →';panel.append(link);notice(liveMail?'가입을 마쳤어요 · ID와 비밀번호로 로그인하세요':'시험 계정을 만들었습니다 ID와 비밀번호로 로그인하세요');}catch(e){notice(authMessage(e));}finally{signupBusy=false;verify.disabled=false;}};
}
if($('credential-form')){
 const credentialSubmit=$('credential-form').querySelector('button');if(credentialSubmit)credentialSubmit.textContent='로그인';
 document.querySelector('.legacy-login').hidden=true;
 if(plan)$('account-signup').href='./signup.html?plan='+encodeURIComponent(plan);
 let loginBusy=false;
 $('credential-form').onsubmit=async event=>{event.preventDefault();if(loginBusy)return;loginBusy=true;const loginButton=$('credential-form').querySelector('button');loginButton.disabled=true;$('credential-status').classList?.remove('auth-error');try{await api('login',{username:$('login-id').value,password:$('login-password').value});location.reload();}catch(e){text('credential-status',authMessage(e));$('credential-status').classList?.add('auth-error');$('credential-status').setAttribute('role','alert');if(e.reason==='account-suspended'&&$('login-contact')){$('login-contact').classList?.add('auth-error');void mountContactLine($('login-contact'),{lead:'정지된 계정은 1:1 문의를 쓸 수 없어요 · 고객센터 이메일로 연락해 주세요'});}}finally{$('login-password').value='';loginBusy=false;loginButton.disabled=false;}};
 text('credential-status','');
 mountLocalRecovery({api,memory:pendingMemory,live:liveMail});
 $('login').hidden=!!state?.authenticated;$('logout').hidden=!state?.authenticated;
 // Logged out, the heading line says what signing in gives (2026-11-07); signed in, the page's own line.
 {const d=document.querySelector?.('.page-description');if(d){d.dataset.signedIn??=d.textContent;d.textContent=state?.authenticated?d.dataset.signedIn:'로그인하면 이용권·접속 키·결제 내역을 한곳에서 볼 수 있어요';}}
 // Before signing in (2026-11-06 3차, review items 7·21): the pass chosen on the home page and where to sign up for it,
 // and the customer service email for anyone who cannot sign in.
 if(!state?.authenticated){
  // 2026-11-07: the chosen pass as a summary card above the form, sign-up under the login button (dist/plan-pick.mjs).
  if(plan&&$('login-plan'))mountLoginPlan(document,{plan,box:$('login-plan'),form:$('credential-form')});
  void mountContactLine($('login-contact'));
 }
 let logoutBusy=false;$('logout').onclick=async()=>{if(logoutBusy)return;logoutBusy=true;$('logout').disabled=true;try{await api('logout',{});clearSupportDrafts();supportInbox?.dispose();supportNotice?.dispose();paymentHistory?.dispose();verifiedWallet?.dispose();customerKey?.dispose();verifiedOrder?.dispose();location.reload();}catch(e){notice(authMessage(e));}finally{logoutBusy=false;$('logout').disabled=false;}};
 if(state?.authenticated&&state.mustChangePassword){
  // Signed in with an administrator's temporary password (2026-11-08): only the password change until a new one is set.
  document.body.dataset.mustChange='1';notice('관리자가 만든 임시 비밀번호로 로그인했어요 · 새 비밀번호로 바꿔야 이용권·접속 키를 볼 수 있어요');
  for(const id of ['workspace','support-section','payment-history','customer-support'])if($(id))$(id).hidden=true;
  const s=$('customer-settings');if(s){s.hidden=false;s.open=true;$('status')?.after?.(s);}
  await mountCustomerSettings({api,passwordOnly:true,onSessionEnded:()=>location.assign('./account.html'),onPasswordChanged:()=>location.assign('./account.html?changed=1')});
  $('settings-current-password')?.setAttribute?.('placeholder','임시 비밀번호');$('settings-current-password')?.focus?.();
 }
 else if(state?.authenticated){
  // A closing account (grace days in operation): say when it is erased and offer the cancel.
  if(state.account?.state==='closing'){const at=Date.parse(state.account.closeAfter);notice('탈퇴 신청 중이에요 · '+(Number.isFinite(at)?new Date(at+9*3600000).toISOString().slice(0,10)+'에 계정이 삭제돼요':'곧 계정이 삭제돼요'));const box=$('status');if(box?.append){const b=document.createElement('button');b.type='button';b.className='button secondary';b.textContent='탈퇴 취소';b.onclick=async()=>{try{await api('close-cancel',{});location.reload();}catch(e){notice(authMessage(e));}};box.append(' ',b);}}
  // Sent here from an administrator screen while signed in as a customer: say so, instead of a silent bounce (2026-11-05).
  {const wanted=new URLSearchParams(location.search).get('next')??'';if(/^\/admin(\/[a-z-]+)?$/.test(wanted))notice('고객 계정으로 로그인돼 있어요 · 관리자 화면은 로그아웃한 뒤 관리자 계정으로 다시 로그인해 주세요');}
  if(state.verifiedWalletEnabled){
   $('workspace').hidden=false;text('customer-email',state.email??'');const legacy=document.querySelector('#workspace > .account-grid');if(legacy)legacy.hidden=true;
   const grid=document.createElement('div');grid.className='verified-grid';$('workspace').append(grid);const root=document.createElement('section');root.className='panel';root.id='verified-wallet';grid.append(root);let language='ko';try{language=localStorage.getItem('ieum-language')??'ko';}catch{}
   // The key's data is read once for both cards (status card and key card), so they always tell the same status.
   let keyRead=null;const loadKey=()=>{if(!keyRead){keyRead=(async()=>{const r=await fetch('/api/customer/mock-key',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)});let v={};try{v=await r.json();}catch{}if(!r.ok){const e=Error('key-unavailable');e.status=r.status;throw e;}return v;})();const done=()=>setTimeout(()=>{keyRead=null;},1500);keyRead.then(done,done);}return keyRead;};
   // The status card's one next step: pick the product in the order card and bring it into view, or open 1:1 문의.
   const toOrder=code=>{const box=$('verified-order');if(!box||!verifiedOrder)return;verifiedOrder.select(code);box.scrollIntoView({behavior:'smooth',block:'start'});box.querySelector?.('input[type=radio]:checked')?.focus({preventScroll:true});};
   const act=kind=>{if(kind==='support'){supportInbox?.ask?.('접속이 멈췄다고 나와요 · 확인 부탁드려요');return;}toOrder(kind==='topup'?'topup':kind==='apply'||kind==='start'?(plan&&plan!=='trial'?'pass-'+plan:'plan'):'plan');};
   let arranged=false;const arrange=s=>{const order=$('verified-order'),key=$('verified-key');if(!s||!order||!key)return;
    // Before a pass the order card comes right under the status card (the key card waits below); a status with no
    // data left picks the 10GB add-on; arriving with a plan from the home page brings the order card into view once.
    if(['none','trial','trial-ended','expired'].includes(s.status))key.before(order);else order.before?.(key);
    if(s.status==='no-data')verifiedOrder?.select('topup');
    if(!arranged&&plan){arranged=true;Promise.resolve(verifiedOrder?.loaded).then(()=>order.scrollIntoView({behavior:'smooth',block:'start'}));}};
   verifiedWallet=mountVerifiedWallet({root,enabled:true,language,ordering:!!state.verifiedOrderEnabled,realKeys:!!state.realKeysEnabled,loadKey,onAction:state.verifiedOrderEnabled?act:null,onState:arrange,load:async()=>{const r=await fetch('/api/customer/payment-pass',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)});const v=await r.json();if(!r.ok){const e=Error('wallet-unavailable');e.status=r.status;throw e;}return v;},onAuthLoss:authLost});notice('');window.addEventListener('pagehide',()=>verifiedWallet?.dispose(),{once:true});
   // Own simulated key (example access key on the test server); hidden automatically where the route does not exist.
   const keyRoot=document.createElement('section');keyRoot.className='panel';keyRoot.id='verified-key';grid.append(keyRoot);
   customerKey=mountCustomerMockKey({root:keyRoot,enabled:true,realKeys:state.realKeysEnabled===true,language,load:loadKey,onAsk:text=>supportInbox?.ask?.(text),onAuthLoss:authLost});window.addEventListener('pagehide',()=>customerKey?.dispose(),{once:true});
   if(state.verifiedOrderEnabled){
    // Orders go through the server; the browser sends only a product, method and request id. 담당자 입금 확인 (2026-11-24):
    // the order screen reads the payment instructions and sends '입금했어요'; a staff member confirms the deposit.
    const call=async(path,body)=>{const r=await fetch('/api/customer/'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(20000),headers:body?{'Content-Type':'application/json','X-Local-CSRF':csrf}:{},...(body?{body:JSON.stringify(body)}:{})});let v={};try{v=await r.json();}catch{}if(!r.ok){const e=Error(v.reason??'payment-order-unavailable');e.reason=v.reason;e.status=r.status;throw e;}return v;};
    const orderRoot=document.createElement('section');orderRoot.className='panel';orderRoot.id='verified-order';orderRoot.setAttribute('aria-label','이용권 신청');grid.append(orderRoot);
    verifiedOrder=mountVerifiedOrder({root:orderRoot,language,initialProduct:plan==='trial'?'trial':plan?'pass-'+plan:null,loadProducts:()=>call('payment-products'),createOrder:input=>call('payment-orders',input),claimTrial:input=>call('payment-trial',input),quoteDiscount:input=>call('payment-discount',input),instructions:id=>call('payment-orders/'+encodeURIComponent(id)+'/instructions'),notifyDeposit:(id,payerName)=>call('payment-orders/'+encodeURIComponent(id)+'/deposit-notice',payerName?{payerName}:{}),openSupport:()=>supportInbox?.open?.('inbox'),onChanged:()=>{void verifiedWallet?.refresh();void customerKey?.refresh();void paymentHistory?.refresh();void supportInbox?.refresh?.();void supportNotice?.refresh?.();},onAuthLoss:authLost});window.addEventListener('pagehide',()=>verifiedOrder?.dispose(),{once:true});
   }
  }else await mountLocalPass({api,state,selectedPlan:plan,notice});
  // Account details go last, after the pass, key, order and payment history (2026-11-07 다듬기).
  {const s=$('customer-settings'),last=$('payment-history')??$('support-section');if(s&&last?.after)last.after(s);}
  await mountCustomerSettings({api,loadReferral:async()=>{const r=await fetch('/api/customer/referral',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('referral-unavailable');return r.json();},onSessionEnded:()=>location.assign('./account.html'),onPasswordChanged:()=>location.assign('./account.html?changed=1'),onClosed:r=>location.replace('./account.html?'+(r?.state==='closed'?'closed=1':'closing=1'))});
 }else{
  // After closing or a password change the login screen says what happened (2026-11-08); otherwise the heading line
  // and the login card already say what to do.
  const q=new URLSearchParams(location.search),said=q.has('closed')?'탈퇴가 완료됐어요. 그동안 이용해 주셔서 감사합니다.':q.has('changed')?'비밀번호를 바꿨어요 · 새 비밀번호로 다시 로그인해 주세요':null;
  if(said)notice(said);else if($('status')){notice('');$('status').hidden=true;}else notice('가입한 ID로 로그인하거나 회원가입하세요');
 }
}

addAccountLanguagePreview();
if(state?.authenticated&&!state.mustChangePassword&&state.paymentStatusEnabled&&$('payment-history')){
 let language='ko';try{language=localStorage.getItem('ieum-language')??'ko';}catch{}
 paymentHistory=mountPaymentHistory({root:$('payment-history'),enabled:true,language,load:async page=>{const r=await fetch('/api/customer/payment-status?page='+page,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)});const value=await r.json();if(!r.ok){const e=Error('payment-status-unavailable');e.status=r.status;throw e;}return value;},onAuthLoss:authLost});
 window.addEventListener('pagehide',()=>paymentHistory?.dispose(),{once:true});
}

if(state?.authenticated&&!state.mustChangePassword&&state.supportEnabled&&$('customer-support')){
 $('support-section').hidden=false;$('support-section').classList.add('support-widget-host');
 const supportCall=async(path,body)=>{const response=await fetch('/api/customer/support'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000),...(body?{headers:{'Content-Type':'application/json','X-Local-CSRF':csrf},body:JSON.stringify(body)}:{})});const result=await response.json();if(!response.ok){const error=Error(result.reason??'support-unavailable');error.status=response.status;throw error;}return result;};
 if($('support-notice'))supportNotice=mountSupportNotice({node:$('support-notice'),api:supportCall,intervalMs:30000,onSummary:summary=>supportInbox?.setUnread?.(summary?.unreadThreads??0),onAuthLoss:()=>{supportInbox?.dispose();authLost();}});
 supportInbox=mountSupportWidget({root:$('customer-support'),api:supportCall,readOnly:state.mode==='partner-preview',onChange:()=>supportNotice?.refresh()});if($('support-notice'))$('support-notice').onclick=event=>{event.preventDefault();supportInbox?.open($('support-notice').hasAttribute('data-unread')?'inbox':'guide');};
 window.addEventListener('pagehide',()=>{supportInbox?.dispose();supportNotice?.dispose();},{once:true});
}

