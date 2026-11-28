import {signupReady,signupFieldErrors,serverFieldFor} from './signup-model.mjs';import {planSummary} from './plan-pick.mjs';
const $=id=>document.getElementById(id),form=$('signup-form'),email=$('signup-email'),nickname=$('signup-nickname'),terms=$('agree-terms'),privacy=$('agree-privacy'),profile=$('agree-profile'),age=$('agree-age'),result=$('signup-result'),dialog=$('policy-dialog');
const username=$('signup-username'),password=$('signup-password'),confirmation=$('signup-password-confirm');
const messenger=$('signup-messenger'),messengerId=$('signup-messenger-id'),referral=$('signup-referral');
const clearPasswords=()=>{password.value='';confirmation.value='';};
const titles={terms:'서비스 이용약관',privacy:'개인정보 수집·이용 안내',profile:'닉네임·상담 연락처 수집·이용 안내',notice:'개인정보 처리방침'};
let stage=1;
function showStage(value){
 stage=value;$('join-consent').hidden=value!==1;$('join-information').hidden=value!==2;$('signup-preview').hidden=value!==2;
 for(let i=1;i<=3;i++){const el=$('join-step-'+i);if(i===value)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');}
 document.querySelectorAll('.steps li').forEach((el,index)=>{if(index+1===value)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
}
function update(){
 $('join-next').disabled=!(age.checked&&terms.checked&&privacy.checked&&profile.checked);
 $('agree-all').checked=age.checked&&terms.checked&&privacy.checked&&profile.checked;
 $('agree-all').indeterminate=!$('agree-all').checked&&(age.checked||terms.checked||privacy.checked||profile.checked);
 nickname.disabled=!profile.checked;
 messenger.disabled=!profile.checked;
 if(!profile.checked){nickname.value='';messenger.value='none';}
 if(profile.checked&&!messenger.value)messenger.value='none';
 messengerId.disabled=!profile.checked||!messenger.value||messenger.value==='none';
 // No messenger chosen: the ID field is not shown at all (2026-11-07 다듬기).
 {const hide=messenger.value==='none'||!messenger.value,label=document.getElementById('messenger-id-label');messengerId.hidden=hide;if(label)label.hidden=hide;}
 messengerId.required=profile.checked&&['wechat','kakao'].includes(messenger.value);
 if(messengerId.disabled)messengerId.value='';
 const ready=signupReady({email:email.value,username:username.value,password:password.value,confirmation:confirmation.value,terms:terms.checked,privacy:privacy.checked})&&email.validity.valid&&age.checked&&profile.checked&&nickname.value.trim().length>0&&(['wechat','kakao'].includes(messenger.value)?messengerId.value.trim().length>0:messenger.value==='none');
 $('password-match').textContent=confirmation.value?(password.value===confirmation.value?'비밀번호가 같아요':'비밀번호가 서로 달라요'):'같은 비밀번호를 한 번 더 입력해 주세요';
 result.hidden=true;showErrors(false);
 $('signup-status').textContent=stage===1?'필수 항목 4개에 모두 동의하면 다음 단계로 넘어가요':ready?'입력을 확인했어요 · 인증 코드를 받아 주세요':'모든 칸을 채우면 인증 코드를 받을 수 있어요';
}
// The master checkbox emits input before change; preserve its new value until its own handler runs.
form.addEventListener('input',event=>{if(event?.target!==$('agree-all'))update();});form.addEventListener('change',event=>{if(event?.target!==$('agree-all'))update();});
// Errors under each field (2026-11-06 3차, review item 6): shown once a field has been left, all of them when the
// button is pressed; the button stays on and takes the visitor to the first field to fix.
const fields={username,password,confirmation,email,nickname,messengerId,...(referral?{referral}:{})},touched=new Set(),serverErrors={};
const values=()=>({username:username.value,password:password.value,confirmation:confirmation.value,email:email.value,nickname:nickname.value,messenger:messenger.value,messengerId:messengerId.value,referral:referral?.value??''});
function errorNode(name){const input=fields[name],id=input.id+'-error';let n=document.getElementById(id);if(!n){n=document.createElement('p');n.id=id;n.className='field-error';n.setAttribute('role','alert');n.hidden=true;const after=input.closest?.('.username-row')??input;after.after(n);input.setAttribute('aria-describedby',[input.getAttribute('aria-describedby'),id].filter(Boolean).join(' '));}return n;}
function showErrors(all){const errors={...signupFieldErrors(values()),...serverErrors};for(const name of Object.keys(fields)){const show=(all||touched.has(name))&&!!errors[name]&&!fields[name].disabled;const n=errorNode(name);n.textContent=show?errors[name]:'';n.hidden=!show;fields[name].setAttribute('aria-invalid',String(show));}return errors;}
for(const [name,input] of Object.entries(fields)){input.addEventListener('blur',()=>{if(input.value||touched.has(name)){touched.add(name);showErrors(false);}});input.addEventListener('input',()=>{delete serverErrors[name];});}
function check(){const errors=showErrors(true),first=Object.keys(fields).find(name=>errors[name]&&!fields[name].disabled);
 if(first){for(const name of Object.keys(fields))touched.add(name);fields[first].focus();fields[first].scrollIntoView?.({block:'center',behavior:'smooth'});$('signup-status').textContent='빨간 글씨로 표시한 칸을 확인해 주세요';return false;}
 if(!(age.checked&&terms.checked&&privacy.checked&&profile.checked)){showStage(1);update();$('signup-status').textContent='필수 항목 4개에 모두 동의해 주세요';$('join-next').focus();return false;}return true;}
// Runs before any other submit handler (the test-site client included): nothing is sent while a field is wrong.
document.addEventListener('submit',event=>{if(event.target===form&&!check()){event.preventDefault();event.stopImmediatePropagation();}},true);
// A refusal from the server, shown under its field.
window.ieumSignupServerError=(reason,message)=>{const name=serverFieldFor[reason];if(!name)return false;serverErrors[name]=message;touched.add(name);showErrors(false);fields[name].focus();return true;};
form.addEventListener('submit',event=>{event.preventDefault();update();if(!check()||!form.reportValidity())return;
 $('profile-result').textContent=profile.checked?[nickname.value.trim()?'닉네임 입력':'',messenger.value==='none'?'메신저 없음':messenger.value&&messengerId.value.trim()?'상담 연락처 입력':''].filter(Boolean).join(' · ')||'수집 동의함 · 입력 안 함':'수집 동의 안 함';
 showStage(3);clearPasswords();result.hidden=false;$('signup-status').textContent='미리보기 완료 · 정보 저장·이메일 발송·계정 생성은 하지 않았습니다';result.scrollIntoView({behavior:'smooth',block:'nearest'});
});
$('agree-all').addEventListener('change',()=>{age.checked=terms.checked=privacy.checked=profile.checked=$('agree-all').checked;update();});
$('join-next').onclick=()=>{if(age.checked&&terms.checked&&privacy.checked&&profile.checked){showStage(2);update();username.focus();}};
$('join-back').onclick=()=>{showStage(1);update();};
$('signup-clear').onclick=()=>{showStage(1);form.reset();email.value='';nickname.value='';touched.clear();for(const k of Object.keys(serverErrors))delete serverErrors[k];update();$('join-next').focus();};
document.querySelectorAll('[data-policy]').forEach(button=>button.addEventListener('click',()=>{const key=button.dataset.policy;if(!titles[key])return;$('policy-title').textContent=$('policy-'+key).dataset?.title||titles[key];$('policy-body').replaceChildren($('policy-'+key).content.cloneNode(true));dialog.showModal();}));
$('policy-close').onclick=()=>dialog.close();
window.addEventListener('pagehide',clearPasswords);
// Coming back to the page (browser back) keeps what was typed, except the passwords (review item 10).
// Nothing is written to browser storage.
window.addEventListener('pageshow',()=>{clearPasswords();update();});
showStage(1);update();

$('signup-edit').onclick=()=>{showStage(2);update();username.focus();};
// 추천 코드 (2026-11-08): a shared link (?ref=CODE) fills it in.
{const ref=new URLSearchParams(location.search).get('ref');if(ref&&referral)referral.value=ref.trim().toUpperCase().slice(0,12);}
const selectedPlan=new URLSearchParams(location.search).get('plan');
if(['trial','30','90','180'].includes(selectedPlan)){$('signup-login').href='./account?plan='+encodeURIComponent(selectedPlan);
 // The pass chosen on the home page stays in view while signing up (2026-11-06 3차, review item 7); since 2026-11-07
 // the same summary card as on sign-in (pass, discount, won·yuan prices, data, a link to change it).
 const band=planSummary(document,selectedPlan,{note:'가입하고 이메일 인증을 마치면 바로 신청 화면으로 이어져요'});band.className+=' signup-plan';$('signup-connection').before(band);
 // One note instead of two: the band already says the account is made after email verification.
 $('signup-connection').hidden=true;}
