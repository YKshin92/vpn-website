import {mountSupportInbox} from './customer-support-client.mjs';
import {mountSupportNotice} from './customer-support-notice.mjs';
const status=document.getElementById('support-admin-status'),workspace=document.getElementById('support-admin-workspace');
try{
 const response=await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)}),session=await response.json();
 if(!response.ok||!session.authenticated){status.textContent='관리자 로그인이 필요합니다';if(typeof location!=='undefined')location.replace('/admin/login?next='+encodeURIComponent(location.pathname+location.search));}
 else{
  status.textContent=session.readOnly?'예시 고객 문의 · 읽기 전용입니다':'';status.hidden=!session.readOnly;workspace.hidden=false;let inbox;
  const api=async(path,body)=>{const r=await fetch('/api/admin/support'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000),...(body?{headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrf},body:JSON.stringify(body)}:{})});const result=await r.json();if(!r.ok){const error=Error(result.reason??'support-unavailable');error.status=r.status;throw error;}return result;};
  const notification=mountSupportNotice({node:document.getElementById('support-admin-notice'),api,role:'administrator',intervalMs:30000,onAuthLoss:()=>{inbox?.dispose();location.reload();}});
  let openThread=null;try{openThread=new URLSearchParams(location.search).get('thread');}catch{}
  // 5단계 (A-14, decision Q-20): the open conversation stays in the address (?thread=), for 새로고침 and links.
  inbox=mountSupportInbox({root:document.getElementById('administrator-support'),role:'administrator',api,readOnly:session.readOnly===true,openThread,onOpen:id=>{try{const u=new URL(location.href);if(id)u.searchParams.set('thread',id);else u.searchParams.delete('thread');history.replaceState(null,'',u.pathname+u.search);}catch{}},onChange:()=>notification.refresh(),
   // Test site: the integrated admin's customer detail (pass, usage, key, payments); elsewhere it is not there (404).
   loadCustomer:async id=>{if(!/^[a-f0-9-]{36}$/i.test(id))return null;const r=await fetch('/api/admin/test-customers/'+encodeURIComponent(id),{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000)});if(r.status===401||r.status===403){const e=Error('login-required');e.status=r.status;throw e;}return r.ok?r.json():null;},
   loadCustomerSummary:async id=>{if(!session.supportWalletEnabled||!/^[a-f0-9-]{36}$/i.test(id))return null;const r=await fetch('/api/admin/customers/'+encodeURIComponent(id)+'/payment-pass',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000)});if(r.status===401||r.status===403){const e=Error('login-required');e.status=r.status;throw e;}return r.ok?(await r.json()).wallet:null;}});
  // 6단계 (B-2): the list and the open conversation check every minute (not while a reply is being typed), and the
  // browser notification can be turned on here.
  const tick=setInterval(()=>{const typing=document.activeElement?.tagName==='TEXTAREA'&&document.activeElement.value.trim();if(!typing&&document.visibilityState!=='hidden')void inbox.refresh();},60000);
  if(typeof Notification!=='undefined'&&Notification.permission==='default'){const b=document.createElement('button');b.type='button';b.className='secondary support-notify';b.textContent='새 문의 브라우저 알림 켜기';b.onclick=async()=>{try{await Notification.requestPermission();}catch{}b.remove();};document.getElementById('support-admin-notice')?.after(b);}
  window.addEventListener('pagehide',()=>{clearInterval(tick);inbox.dispose();notification.dispose();},{once:true});
 }
}catch{status.textContent='상담 화면을 불러오지 못했습니다 다시 로그인해 주세요';document.getElementById('support-admin-login').hidden=false;}

