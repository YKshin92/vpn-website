import {mountSupportNotice} from './customer-support-notice.mjs';
import {mountPaymentHistory} from './customer-payment-history.mjs';
import {mountSupportInbox} from './customer-support-client.mjs';
import {mountCustomerSettings} from './customer-settings.mjs';
import {mountUsernameCheck} from './customer-username-check.mjs';
import {mountHomeSession} from './customer-home-session.mjs';
import {requestMemory} from './customer-request-memory.mjs';
import {mountLocalRecovery,authMessage,requestStatusMessage} from './customer-local-auth.mjs';
import {mountLocalPass} from './customer-local-pass.mjs';
import {addAccountLanguagePreview} from './customer-language-preview.mjs';
// Loaded only by the isolated credential preview, never the operational homepage.
let tabStorage;try{tabStorage=window.sessionStorage;}catch{}
const pendingMemory=requestMemory(tabStorage);
const $=id=>document.getElementById(id);let csrf='';
async function api(path,body){const r=await fetch('/api/local-customer/'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000),headers:body?{'Content-Type':'application/json','X-Local-CSRF':csrf}:{},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok){const error=Error(data.reason??'요청 실패');error.reason=data.reason;error.status=r.status;throw error;}return data;}
const text=(id,value)=>{if($(id))$(id).textContent=value;};
const notice=value=>text($('signup-status')?'signup-status':'status',value);
let supportInbox,supportNotice,paymentHistory;let state;try{state=await api('session');csrf=state.csrf;}catch{notice('격리 체험 서버에 연결하지 못했습니다');}
const realMail=state?.mode==='private-email-test';
const chosen=new URLSearchParams(location.search).get('plan');const plan=['trial','30','90','180'].includes(chosen)?chosen:null;
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
 text('email-help',realMail?'승인된 본인 이메일 주소를 입력하세요 인증 코드는 이메일로만 전달됩니다':'현재는 시험 가입 환경입니다 hello@example.test처럼 .test 주소를 사용하세요 실제 이메일은 발송하지 않고 다음 화면에 시험 코드를 표시합니다');
 text('join-step-3','03 이메일 인증');
 const stepLabel=document.querySelector?.('.steps li:last-child strong');if(stepLabel)stepLabel.textContent='이메일 인증';const stepHelp=document.querySelector?.('.steps li:last-child p');if(stepHelp)stepHelp.textContent='시험 코드 확인 후 계정 생성';const previewNote=document.querySelector?.('.preview-note');if(previewNote)previewNote.textContent='시험용 정보로 가입 흐름을 확인하세요 입력한 계정은 격리 DB에 저장되며 실제 메일은 발송하지 않습니다';
 let request=null,signupId=null,signupBusy=false,expires=0;const frozen=new Map();const freeze=()=>{$('signup-form').querySelectorAll('input,select,button').forEach(node=>{if(!frozen.has(node))frozen.set(node,node.disabled);node.disabled=true;});};const thaw=()=>{for(const [node,disabled] of frozen)node.disabled=disabled;frozen.clear();};const panel=document.createElement('section');panel.className='result';panel.id='signup-verification';panel.setAttribute('aria-live','polite');panel.hidden=true;const heading=document.createElement('h3');heading.textContent=realMail?'이메일 인증':'시험 인증 코드 확인';panel.append(heading);
 const label=document.createElement('label');label.className='field-label';label.textContent=realMail?'이메일로 받은 6자리 인증 코드':'6자리 인증 코드 · 격리 체험';const input=document.createElement('input');input.type='text';input.inputMode='numeric';input.maxLength=6;input.pattern='[0-9]{6}';input.autocomplete='one-time-code';label.append(input);
 const codeNote=document.createElement('p'),verify=document.createElement('button');codeNote.className='help';codeNote.style.fontSize='16px';codeNote.style.fontWeight='600';verify.type='button';verify.className='primary';verify.textContent='인증하고 계정 만들기';const checkStatus=document.createElement('button');checkStatus.type='button';checkStatus.className='view';checkStatus.textContent='요청 상태 다시 확인';panel.append(codeNote,label,verify,checkStatus);$('signup-form').after(panel);
 checkStatus.onclick=async()=>{if(!signupId||signupBusy)return;signupBusy=true;checkStatus.disabled=true;try{const value=await api('signup-status/'+encodeURIComponent(signupId));codeNote.textContent=(request?.simulationCode?'시험 코드: '+request.simulationCode+' · 실제 메일 발송 없음 · ':'')+requestStatusMessage(value);if(realMail&&value.state==='pending'&&value.delivery==='accepted'){request=value;expires=Date.parse(value.expiresAt);label.hidden=false;verify.hidden=false;verify.disabled=false;}if(value.state==='consumed'){pendingMemory.clear();request=null;verify.hidden=true;const link=document.createElement('a');link.href='./account.html'+(plan?'?plan='+encodeURIComponent(plan):'');link.textContent='로그인으로 이동';if(!panel.querySelector('a'))panel.append(link);notice('이미 계정 생성이 완료됐습니다 로그인 화면에서 확인해 주세요');}else if(['expired','locked','conflict'].includes(value.state)){request=null;signupId=null;pendingMemory.clear();thaw();restoreSignupInformation();notice('이 요청은 종료됐습니다 비밀번호를 다시 입력하고 새로 요청해 주세요');}else if(!realMail&&value.delivery==='accepted'&&!request?.simulationCode){request=null;expires=Date.parse(value.expiresAt);verify.disabled=true;thaw();codeNote.textContent='새로고침으로 시험 코드 표시가 초기화되었습니다 동일한 가입 정보와 비밀번호를 다시 입력하고 화면에서 시험 코드 확인을 눌러 주세요 기존 요청으로 다시 확인합니다';notice(codeNote.textContent);}else notice('기존 요청 상태만 확인했습니다 코드를 자동 재발송하지 않습니다');}catch(e){notice(authMessage(e));}finally{signupBusy=false;checkStatus.disabled=false;}};
 // Remembering an opaque request ID must not open verification on the consent step.
 // The backend safely restores a pending request after the user submits the form.
 function restoreSignupInformation(){panel.hidden=true;if($('join-information'))$('join-information').hidden=false;$('signup-preview').hidden=false;for(let i=1;i<=3;i++){const step=$('join-step-'+i);if(step){if(i===2)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');}}}
 const remembered=pendingMemory.read();if(remembered?.kind==='signup'){signupId=remembered.id;verify.disabled=true;}
 const policies=await api('policies');$('signup-preview').textContent=realMail?'인증 이메일 받기':'화면에서 시험 코드 확인';text('signup-connection',realMail?'비공개 이메일 인증 시험 · 코드 5분 유효 · 재발송 시 이전 코드 무효':'시험 가입 · 이메일 발송 없음 · .test 주소로 신청하면 화면에 인증 코드가 표시됩니다');
 $('signup-form').addEventListener('submit',async event=>{
  event.preventDefault();event.stopImmediatePropagation();if(signupBusy||request)return;if(usernameCheck&&!usernameCheck.ensure())return;if(!$('signup-form').reportValidity())return;errorBox.hidden=true;signupBusy=true;
  const password=$('signup-password').value;
  try{
   $('signup-preview').disabled=true;
   signupId??=crypto.randomUUID();pendingMemory.save(signupId,'signup');
   request=await api('signup',{requestId:signupId,username:$('signup-username').value,password,confirmation:$('signup-password-confirm').value,email:$('signup-email').value,nickname:$('signup-nickname').value,messenger:$('signup-messenger').value,messengerId:$('signup-messenger-id').value,consent:{releaseId:policies.releaseId,terms:$('agree-terms').checked,collection:$('agree-privacy').checked,profile:$('agree-profile').checked}});
   signupId=request.id;pendingMemory.save(signupId,'signup');expires=Date.parse(request.expiresAt);$('signup-password').value='';$('signup-password-confirm').value='';codeNote.textContent=request.simulationCode?'시험 코드: '+request.simulationCode+' · 5분 유효 · 오입력 5회 제한 · 실제 메일 발송 없음':'기존 요청의 시험 발송 상태: '+(request.delivery??'미확정')+' · 자동 재발송하지 않습니다';const mayVerify=!!request.simulationCode||(realMail&&request.delivery==='accepted'&&request.state==='pending');if(realMail)codeNote.textContent=mayVerify?'이메일 발송 요청이 접수됐습니다 받은메일함과 스팸함을 확인해 주세요':'이메일 발송 상태: '+request.delivery+' · 요청 상태를 다시 확인해 주세요';verify.disabled=!mayVerify;label.hidden=!mayVerify;verify.hidden=!mayVerify;panel.hidden=false;if(mayVerify){if($('join-information'))$('join-information').hidden=true;$('signup-preview').hidden=true;for(let i=1;i<=3;i++){const step=$('join-step-'+i);if(step){if(i===3)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');}}document.querySelectorAll?.('.steps li')?.forEach((el,index)=>{if(index===2)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});}freeze();panel.scrollIntoView({behavior:'smooth',block:'center'});input.focus({preventScroll:true});notice(realMail?'이메일로 받은 6자리 인증 코드를 입력해 주세요':'메일함이 아니라 아래 화면의 시험 코드를 입력해 주세요 실제 이메일은 발송되지 않습니다');
  }catch(e){panel.hidden=true;label.hidden=true;verify.hidden=true;request=null;errorMessage.textContent=authMessage(e);errorLogin.hidden=e.reason!=='enrollment-unavailable';errorBox.hidden=false;errorBox.scrollIntoView({behavior:'smooth',block:'center'});if(['simulation-email-required','invalid-password','enrollment-unavailable','policy-version-changed'].includes(e.reason)){signupId=null;pendingMemory.clear();}notice('');}finally{signupBusy=false;$('signup-preview').disabled=!!request;}
 },true);
 if(realMail){
  if(previewNote)previewNote.textContent='본인 이메일 인증 시험입니다 개인정보는 별도 로컬 시험 DB에 저장되며 결제와 VPN은 연결되지 않습니다';
  if(stepHelp)stepHelp.textContent='이메일 코드 확인 후 계정 생성';
  const resend=document.createElement('button');resend.type='button';resend.className='view';resend.textContent='인증 이메일 다시 받기 · 1분 간격';panel.append(resend);let resendId=null;
  resend.onclick=async()=>{if(!signupId||signupBusy)return;signupBusy=true;resend.disabled=true;try{resendId??=crypto.randomUUID();const value=await api('resend',{id:signupId,requestId:resendId});request=value;signupId=value.id;pendingMemory.save(signupId,'signup');resendId=null;expires=Date.parse(value.expiresAt);input.value='';label.hidden=value.delivery!=='accepted';verify.hidden=value.delivery!=='accepted';verify.disabled=value.delivery!=='accepted';codeNote.textContent='새 인증 이메일 발송 상태: '+value.delivery+' · 이전 코드는 사용할 수 없습니다';notice('가장 최근 이메일의 코드를 입력해 주세요');}catch(e){notice(authMessage(e));}finally{signupBusy=false;resend.disabled=false;}};
 }
 verify.onclick=async()=>{if(!request||signupBusy)return;if(Date.now()>=expires){request=null;signupId=null;pendingMemory.clear();thaw();input.value='';restoreSignupInformation();notice('코드가 만료됐습니다 비밀번호를 다시 입력하고 요청해 주세요');return;}if(!/^[0-9]{6}$/.test(input.value)){notice('6자리 숫자 코드를 입력해 주세요');return;}signupBusy=true;verify.disabled=true;try{await api('verify',{id:request.id,code:input.value});pendingMemory.clear();input.value='';codeNote.textContent='격리 계정 생성 완료';verify.hidden=true;const link=document.createElement('a');link.href='./account.html'+(plan?'?plan='+encodeURIComponent(plan):'');link.textContent='로그인하고 이용권 신청 →';panel.append(link);notice('시험 계정을 만들었습니다 ID와 비밀번호로 로그인하세요');}catch(e){notice(authMessage(e));}finally{signupBusy=false;verify.disabled=false;}};
}
if($('credential-form')){
 const credentialSubmit=$('credential-form').querySelector('button');if(credentialSubmit)credentialSubmit.textContent='로그인';
 document.querySelector('.legacy-login').hidden=true;
 if(plan)$('account-signup').href='./signup.html?plan='+encodeURIComponent(plan);
 let loginBusy=false;
 $('credential-form').onsubmit=async event=>{event.preventDefault();if(loginBusy)return;loginBusy=true;const loginButton=$('credential-form').querySelector('button');loginButton.disabled=true;$('credential-status').classList?.remove('auth-error');try{await api('login',{username:$('login-id').value,password:$('login-password').value});location.reload();}catch(e){text('credential-status',authMessage(e));$('credential-status').classList?.add('auth-error');$('credential-status').setAttribute('role','alert');}finally{$('login-password').value='';loginBusy=false;loginButton.disabled=false;}};
 text('credential-status','격리 DB의 시험 계정으로 로그인합니다 실제 계정이 아닙니다');
 mountLocalRecovery({api,memory:pendingMemory});
 $('login').hidden=!!state?.authenticated;$('logout').hidden=!state?.authenticated;
 let logoutBusy=false;$('logout').onclick=async()=>{if(logoutBusy)return;logoutBusy=true;$('logout').disabled=true;try{await api('logout',{});supportInbox?.dispose();supportNotice?.dispose();paymentHistory?.dispose();location.reload();}catch(e){notice(authMessage(e));}finally{logoutBusy=false;$('logout').disabled=false;}};
 if(state?.authenticated){
  await mountLocalPass({api,state,selectedPlan:plan,notice});
  await mountCustomerSettings({api,onSessionEnded:()=>location.assign('./account.html')});
 }else notice('격리 시험 계정으로 로그인하거나 회원가입하세요');
}

addAccountLanguagePreview();
if(state?.authenticated&&state.paymentStatusEnabled&&$('payment-history')){
 let language='ko';try{language=localStorage.getItem('ieum-language')??'ko';}catch{}
 paymentHistory=mountPaymentHistory({root:$('payment-history'),enabled:true,language,load:async page=>{const r=await fetch('/api/customer/payment-status?page='+page,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)});const value=await r.json();if(!r.ok){const e=Error('payment-status-unavailable');e.status=r.status;throw e;}return value;},onAuthLoss:()=>location.reload()});
 window.addEventListener('pagehide',()=>paymentHistory?.dispose(),{once:true});
}

if(state?.authenticated&&state.supportEnabled&&$('customer-support')){
 $('support-section').hidden=false;
 const supportCall=async(path,body)=>{const response=await fetch('/api/customer/support'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000),...(body?{headers:{'Content-Type':'application/json','X-Local-CSRF':csrf},body:JSON.stringify(body)}:{})});const result=await response.json();if(!response.ok){const error=Error(result.reason??'support-unavailable');error.status=response.status;throw error;}return result;};
 if($('support-notice'))supportNotice=mountSupportNotice({node:$('support-notice'),api:supportCall,intervalMs:30000,onAuthLoss:()=>{supportInbox?.dispose();location.reload();}});
 supportInbox=mountSupportInbox({root:$('customer-support'),api:supportCall,readOnly:state.mode==='partner-preview',onChange:()=>supportNotice?.refresh()});if($('support-notice'))$('support-notice').onclick=()=>{void supportInbox?.refresh();};
}
