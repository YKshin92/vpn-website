import {mountSupportInbox} from './customer-support-client.mjs';
import {mountSupportNotice} from './customer-support-notice.mjs';
const status=document.getElementById('support-admin-status'),workspace=document.getElementById('support-admin-workspace');
try{
 const response=await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)}),session=await response.json();
 if(!response.ok||!session.authenticated){status.textContent='관리자 로그인이 필요합니다';if(typeof location!=='undefined')location.replace('./account.html?next='+encodeURIComponent(location.pathname));}
 else{
  status.textContent=session.readOnly?'예시 고객 문의 · 읽기 전용입니다':'격리 DB의 고객 문의입니다';workspace.hidden=false;let inbox;
  const api=async(path,body)=>{const r=await fetch('/api/admin/support'+path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000),...(body?{headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrf},body:JSON.stringify(body)}:{})});const result=await r.json();if(!r.ok){const error=Error(result.reason??'support-unavailable');error.status=r.status;throw error;}return result;};
  const notification=mountSupportNotice({node:document.getElementById('support-admin-notice'),api,role:'administrator',intervalMs:30000,onAuthLoss:()=>{inbox?.dispose();location.reload();}});
  inbox=mountSupportInbox({root:document.getElementById('administrator-support'),role:'administrator',api,readOnly:session.readOnly===true,onChange:()=>notification.refresh(),loadCustomerSummary:async id=>{if(!session.supportWalletEnabled||!/^[a-f0-9-]{36}$/i.test(id))return null;const r=await fetch('/api/admin/customers/'+encodeURIComponent(id)+'/payment-pass',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000)});if(r.status===401||r.status===403){const e=Error('login-required');e.status=r.status;throw e;}return r.ok?(await r.json()).wallet:null;}});
  window.addEventListener('pagehide',()=>{inbox.dispose();notification.dispose();},{once:true});
 }
}catch{status.textContent='상담 화면을 불러오지 못했습니다 다시 로그인해 주세요';document.getElementById('support-admin-login').hidden=false;}

