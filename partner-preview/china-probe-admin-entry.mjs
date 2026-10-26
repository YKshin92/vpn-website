import {mountProbeDashboard} from './china-probe-admin.mjs';
const status=document.getElementById('probe-auth-status');let dashboard;
const read=async path=>{const r=await fetch(path,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)});const data=await r.json();if(!r.ok){const e=Error('probe-status-unavailable');e.status=r.status;throw e;}return data;};
try{const session=await read('/api/auth/session');if(!session.authenticated)status.textContent='키 작업 관리에서 관리자 로그인 후 다시 열어 주세요';else{status.textContent='격리 모의 결과를 조회합니다. 실제 IP·DNS·키를 변경하지 않습니다';dashboard=mountProbeDashboard({root:document.getElementById('probe-workspace'),loadServers:()=>read('/api/admin/connectivity'),loadStatus:id=>read('/api/admin/connectivity/'+encodeURIComponent(id)),onAuthLoss:()=>{status.textContent='관리자 로그인이 만료됐습니다';}});}}catch{status.textContent='관리자 로그인 상태를 확인할 수 없습니다';}
window.addEventListener('pagehide',()=>dashboard?.dispose(),{once:true});
