import {createServerState,runIpTest,recoverServer} from './server-model.mjs';
const state=createServerState();
const dialog=document.createElement('dialog');dialog.id='server-admin';dialog.setAttribute('aria-labelledby','server-title');document.body.append(dialog);
const styles=document.createElement('link');styles.rel='stylesheet';styles.href='./server-admin.css';document.head.append(styles);
const statusLabels={ready:'테스트 준비',running:'테스트 진행 중',success:'교체·원복 완료','rolled-back':'중단 후 기존 IP 유지','needs-recovery':'원복 필요',recovered:'복구 완료'};
export function mountServerControls(admin,onBack){
  const nav=document.createElement('div');nav.className='admin-navigation';nav.innerHTML='<span aria-current="page">고객·이용권</span><button class="outline small" type="button">서버 IP 관리 →</button>';
  admin.querySelector('h2').after(nav);
  nav.querySelector('button').onclick=()=>{admin.close();openServer(onBack);};
}
function openServer(onBack){
  dialog.innerHTML=`<button class="close" aria-label="서버 관리 닫기">×</button><div class="eyebrow">IEUM / SERVER OPERATIONS</div><h2 id="server-title">서버 IP 관리</h2><button class="server-back" type="button">← 고객·이용권 관리</button>
  <div class="server-notice"><strong>시뮬레이션 모드 · AWS 미연결</strong><p>아래 IP와 실행 결과는 가상 데이터입니다 실제 서버·DNS·고객 키는 변경하지 않습니다</p></div>
  <div class="server-summary"><div><small>연동 예정 서버</small><strong>vpnServer001</strong><span>서울 · ap-northeast-2</span></div><div><small>연동 예정 도메인</small><strong>ieumvpn.link</strong><span>실제 연결 상태는 조회하지 않음</span></div></div>
  <section class="server-panel"><div class="server-panel-title"><h3>IP 교체 후 원복 테스트</h3><span id="server-status" role="status"></span></div><p>새 IP를 잠시 연결하고 기존 IP로 돌아오는 절차를 연습합니다 DNS는 기존 IP를 유지하므로, 새 IP 연결 중 도메인을 통한 VPN 접속은 중단될 수 있습니다</p>
  <div class="ip-route"><div><small>기존 IP · 보존</small><code>192.0.2.10</code></div><span>→</span><div><small>신규 IP · 가상</small><code>192.0.2.20</code></div><span>→</span><div><small>최종 원복</small><code>192.0.2.10</code></div></div>
  <dl class="server-facts"><div><dt>현재 연결된 가상 IP</dt><dd id="attached-ip"></dd></div><div><dt>DNS A 레코드 · 변경 안 함</dt><dd>192.0.2.10</dd></div><div><dt>기존 IP 반환 / 접속 키 변경</dt><dd>수행하지 않음</dd></div></dl>
  <label class="scenario-label">테스트 시나리오<select id="ip-scenario"><option value="">정상 교체 후 원복</option><option>신규 IP 확보</option><option>신규 IP 연결</option><option>연결 상태 확인</option><option>기존 IP 복구</option></select></label>
  <label class="server-consent"><input type="checkbox" id="ip-consent"> IP 교체 중 연결이 끊길 수 있음을 확인했습니다 (가상 테스트)</label>
  <div class="server-actions"><button class="primary" id="run-ip" disabled>가상 IP 교체 테스트 실행</button><button class="outline" id="recover-ip" hidden>기존 IP로 가상 복구</button></div></section>
  <section class="server-panel"><h3>작업 이력</h3><p class="fine">이력은 현재 브라우저 메모리에만 저장되며 새로고침하면 초기화됩니다</p><ol id="ip-journal" aria-live="polite"></ol></section>
  <p class="fine">실제 운영 연결에는 관리자 인증과 AWS 작업을 수행하는 서버 API가 필요합니다 중국 내 접속 가능성 및 실제 Outline 연결은 이 테스트로 검증되지 않습니다</p>`;
  const q=s=>dialog.querySelector(s);
  const render=()=>{
    q('#server-status').textContent=statusLabels[state.status];q('#attached-ip').textContent=state.attachedIp;
    q('#run-ip').disabled=state.running||!q('#ip-consent').checked||state.attachedIp!==state.originalIp;
    q('#ip-scenario').disabled=state.running;q('#ip-consent').disabled=state.running;
    q('#recover-ip').hidden=state.status!=='needs-recovery';
    dialog.querySelectorAll('.close,.server-back').forEach(b=>b.disabled=state.running);
    q('#ip-journal').replaceChildren(...(state.logs.length?state.logs:['아직 실행한 작업이 없습니다']).map(line=>{const li=document.createElement('li');li.textContent=line;return li;}));
  };
  q('.close').onclick=()=>dialog.close();q('.server-back').onclick=()=>{dialog.close();onBack();};
  dialog.oncancel=e=>{if(state.running)e.preventDefault();};
  q('#ip-consent').onchange=render;
  q('#run-ip').onclick=async()=>{try{await runIpTest(state,{failure:q('#ip-scenario').value,wait:()=>new Promise(r=>setTimeout(r,450)),onChange:render});}catch(error){state.logs.push(error.message);render();}};
  q('#recover-ip').onclick=()=>{recoverServer(state);render();};render();dialog.showModal();
}
