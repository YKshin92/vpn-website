import {signupReady} from './signup-model.mjs';
const $=id=>document.getElementById(id),form=$('signup-form'),email=$('signup-email'),nickname=$('signup-nickname'),terms=$('agree-terms'),privacy=$('agree-privacy'),profile=$('agree-profile'),result=$('signup-result'),dialog=$('policy-dialog');
const username=$('signup-username'),password=$('signup-password'),confirmation=$('signup-password-confirm');
const messenger=$('signup-messenger'),messengerId=$('signup-messenger-id');
const clearPasswords=()=>{password.value='';confirmation.value='';};
const titles={terms:'서비스 이용약관',privacy:'개인정보 수집·이용 안내',profile:'닉네임·상담 연락처 수집·이용 안내',notice:'개인정보 처리방침'};
let stage=1;
function showStage(value){
 stage=value;$('join-consent').hidden=value!==1;$('join-information').hidden=value!==2;$('signup-preview').hidden=value!==2;
 for(let i=1;i<=3;i++){const el=$('join-step-'+i);if(i===value)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');}
 document.querySelectorAll('.steps li').forEach((el,index)=>{if(index+1===value)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
}
function update(){
 $('join-next').disabled=!(terms.checked&&privacy.checked&&profile.checked);
 $('agree-all').checked=terms.checked&&privacy.checked&&profile.checked;
 $('agree-all').indeterminate=!$('agree-all').checked&&(terms.checked||privacy.checked||profile.checked);
 nickname.disabled=!profile.checked;
 messenger.disabled=!profile.checked;
 if(!profile.checked){nickname.value='';messenger.value='';}
 messengerId.disabled=!profile.checked||!messenger.value||messenger.value==='none';
 messengerId.required=profile.checked&&['wechat','kakao'].includes(messenger.value);
 if(messengerId.disabled)messengerId.value='';
 const ready=signupReady({email:email.value,username:username.value,password:password.value,confirmation:confirmation.value,terms:terms.checked,privacy:privacy.checked})&&email.validity.valid&&profile.checked&&nickname.value.trim().length>0&&(['wechat','kakao'].includes(messenger.value)?messengerId.value.trim().length>0:messenger.value==='none');
 $('password-match').textContent=confirmation.value?(password.value===confirmation.value?'비밀번호가 일치합니다':'비밀번호가 일치하지 않습니다'):'같은 비밀번호를 한 번 더 입력해 주세요';
 $('signup-preview').disabled=!ready;result.hidden=true;
 $('signup-status').textContent=stage===1?'필수 약관 3개에 동의한 후 다음 단계로 이동하세요':ready?'필수 항목을 확인했습니다 가입 내용을 미리 볼 수 있습니다':'모든 회원 정보와 필수 동의를 확인해 주세요';
}
// The master checkbox emits input before change; preserve its new value until its own handler runs.
form.addEventListener('input',event=>{if(event?.target!==$('agree-all'))update();});form.addEventListener('change',event=>{if(event?.target!==$('agree-all'))update();});
form.addEventListener('submit',event=>{event.preventDefault();update();if($('signup-preview').disabled||!form.reportValidity())return;
 $('profile-result').textContent=profile.checked?[nickname.value.trim()?'닉네임 입력':'',messenger.value==='none'?'메신저 없음':messenger.value&&messengerId.value.trim()?'상담 연락처 입력':''].filter(Boolean).join(' · ')||'수집 동의함 · 입력 안 함':'수집 동의 안 함';
 showStage(3);clearPasswords();$('signup-preview').disabled=true;result.hidden=false;$('signup-status').textContent='미리보기 완료 · 정보 저장·이메일 발송·계정 생성은 하지 않았습니다';result.scrollIntoView({behavior:'smooth',block:'nearest'});
});
$('agree-all').addEventListener('change',()=>{terms.checked=privacy.checked=profile.checked=$('agree-all').checked;update();});
$('join-next').onclick=()=>{if(terms.checked&&privacy.checked&&profile.checked){showStage(2);update();username.focus();}};
$('join-back').onclick=()=>{showStage(1);update();};
$('signup-clear').onclick=()=>{showStage(1);form.reset();email.value='';nickname.value='';update();$('join-next').focus();};
document.querySelectorAll('[data-policy]').forEach(button=>button.addEventListener('click',()=>{const key=button.dataset.policy;if(!titles[key])return;$('policy-title').textContent=titles[key];$('policy-body').replaceChildren($('policy-'+key).content.cloneNode(true));dialog.showModal();}));
$('policy-close').onclick=()=>dialog.close();
window.addEventListener('pagehide',clearPasswords);
window.addEventListener('pageshow',()=>{showStage(1);form.reset();email.value='';nickname.value='';update();});
showStage(1);update();

$('signup-edit').onclick=()=>{showStage(2);update();username.focus();};
const selectedPlan=new URLSearchParams(location.search).get('plan');
if(['trial','30','90','180'].includes(selectedPlan))$('signup-login').href='./account?plan='+encodeURIComponent(selectedPlan);
