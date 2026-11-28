import {mountProbeDashboard} from './china-probe-admin.mjs';
const status=document.getElementById('probe-auth-status');let dashboard;
const read=async path=>{const r=await fetch(path,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)});const data=await r.json();if(!r.ok){const e=Error('probe-status-unavailable');e.status=r.status;throw e;}return data;};
try{const session=await read('/api/auth/session');if(!session.authenticated){status.textContent='관리자 로그인 후 다시 열어 주세요';if(typeof location!=='undefined')location.replace('/admin/login?next='+encodeURIComponent(location.pathname+location.search));}else{// No probe data on this server (no read API): say so instead of an error (2026-11-06 2차).
  const probe=await fetch('/api/admin/connectivity',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)}).then(r=>r.status).catch(()=>0);
  if(probe===404){// 2단계 A-1: the 15-minute checks live in 서버 모니터링; this page keeps the checks made by hand with outside tools.
   status.textContent='15분 자동 점검 결과는 서버 모니터링에 있어요 · 이 화면은 외부 도구로 직접 확인한 기록이에요 ';const go=document.createElement('a');go.href='/admin/monitoring';go.textContent='서버 모니터링 열기 →';status.append(go);}
  else{status.textContent='모의 시험 결과를 조회해요 · 실제 IP·DNS·키는 바꾸지 않아요';dashboard=mountProbeDashboard({root:document.getElementById('probe-workspace'),loadServers:()=>read('/api/admin/connectivity'),loadStatus:id=>read('/api/admin/connectivity/'+encodeURIComponent(id)),onAuthLoss:()=>{status.textContent='관리자 로그인이 만료됐어요 · 페이지를 새로 고친 뒤 다시 로그인해 주세요';}});}}}catch{status.textContent='관리자 로그인 상태를 확인할 수 없습니다';}
window.addEventListener('pagehide',()=>dashboard?.dispose(),{once:true});
