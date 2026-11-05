// Administrator card: simulated VPN key for the selected customer (test server only).
// Shows key name, server and timeline; never an access URL. With test-server real keys on, realKey adds
// the real VPN server's state for this key (limit and pause), still without the access URL.
const kst=value=>{const t=Date.parse(value);return Number.isFinite(t)?new Date(t+9*3600000).toISOString().slice(0,16).replace('T',' '):'—';};
const purposeText={purchase:'이용권 구매',extension:'기간 연장',monthly_topup:'데이터 추가',compensation:'장애 보상',pass_end:'이용권 종료'};
const gib=bytes=>Number.isSafeInteger(bytes)?(bytes===0?'0 (정지)':(bytes/1024**3).toFixed(bytes%1024**3?2:0)+' GB'):'—';
const realStateText={none:'실제 키 없음 (시험용 기록만)',intent:'실제 키 반영 중',succeeded:'실제 키 반영 완료',needs_review:'실제 키 확인 필요',unavailable:'VPN 서버 조회 실패'};
const validReal=r=>r===undefined||(!!r&&(r.state==='unavailable'||(r.realKeyConnected===true&&Object.hasOwn(realStateText,r.state))));
export function validMockKey(data){
 if(!data||typeof data.available!=='boolean'||!validReal(data.realKey))return false;if(data.key===null)return true;const k=data.key;
 return !!k&&k.simulation===true&&k.realKeyConnected===false&&/^ieum-customer-[a-f0-9-]{36}$/.test(k.keyName)&&['first_issue','preserve'].includes(k.lastAction)&&['active','expired'].includes(k.state)&&Number.isSafeInteger(k.revision)&&k.revision>0&&Number.isFinite(Date.parse(k.expiresAt))&&Number.isFinite(Date.parse(k.lastChangedAt));
}
export function renderMockKey(root,data){
 const doc=root.ownerDocument,node=(tag,text,cls)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 root.replaceChildren();const head=node('div',undefined,'wallet-head');head.append(node('h2','VPN 키 (시험용)'));root.append(head);
 if(!data||!validMockKey(data)){root.append(node('p','키 정보를 확인할 수 없습니다','wallet-loading'));return head;}
 if(!data.available){root.append(node('p','이 환경에서는 키 정보를 조회하지 않습니다','wallet-loading'));return head;}
 if(!data.key){const chip=node('span','발급 전','wallet-chip');head.append(chip);root.append(node('p','결제가 반영되면 고객 전용 키가 하나 준비됩니다','wallet-loading'));return head;}
 const k=data.key,chip=node('span',k.state==='active'?'발급됨':'이용 종료','wallet-chip');chip.setAttribute('data-state',k.state==='active'?'active':'expired');head.append(chip);
 const facts=node('dl',undefined,'wallet-facts');
 const last=(purposeText[k.lastPurpose]??'변경')+(k.lastAction==='first_issue'?' · 새 키 발급':' · 같은 키 유지')+' · '+kst(k.lastChangedAt);
 for(const [label,value] of [['키 이름',k.keyName],['서버',k.instance??'배정 대기'],['최초 발급',k.issuedAt?kst(k.issuedAt):'—'],['마지막 반영',last],['이용 종료',kst(k.expiresAt)],['반영 횟수',k.revision+'회']]){const row=node('div',undefined,'wallet-fact');row.append(node('dt',label),node('dd',value));facts.append(row);}
 const r=data.realKey;
 if(r&&r.state!=='none'){
  const pause=r.hold?'관리자 멈춤 · '+r.hold.by+' · '+kst(r.hold.at):r.suspension==='succeeded'?'만료로 정지 (한도 0)':r.suspension==='needs_review'?'정지 확인 필요':r.suspension==='intent'?'정지 처리 중':'—';
  const u=r.usage,month=u?gib(u.usedBytes)+' / '+gib(u.allowanceBytes)+' 사용 · 확인 '+kst(u.checkedAt):'집계 전';
  for(const [label,value] of [['실제 VPN 서버',realStateText[r.state]],['이번 달 사용',month],['서버 한도',r.serverLimitBytes==='unavailable'?'조회 실패':gib(r.serverLimitBytes)+(u?' (최근 30일 '+gib(u.windowBytes)+' + 남은 양)':'')],['결제 기준 한도',gib(r.targetLimitBytes)],['만료 정지',pause]]){const row=node('div',undefined,'wallet-fact');row.append(node('dt',label),node('dd',value));facts.append(row);}
  root.append(facts,node('p','실제 VPN 서버(시험 서버 전용, 최대 10개)에 만든 키입니다 · 접속 주소는 고객 본인 화면에만 표시됩니다','wallet-loading'));
 }else root.append(facts,node('p',r?'시험용 기록입니다 · 실제 키 연결 전에 결제한 고객이라 실제 VPN 서버에는 키가 없습니다':'시험 서버 전용 기록입니다 · 실제 VPN 서버에는 아직 키를 만들지 않으며 접속 주소는 실제 연결 후 표시됩니다','wallet-loading'));
 return head;
}
export function mountMockKey({root,enabled=false,load,onAuthLoss=()=>{}}){
 let stopped=false,seq=0;const doc=root.ownerDocument;root.hidden=!enabled;root.setAttribute('translate','no');root.classList?.add('wallet-card');
 function dispose(){stopped=true;seq++;root.replaceChildren();root.hidden=true;}
 async function refresh(){if(stopped||!enabled)return;const current=++seq;
  try{const data=await load();if(stopped||seq!==current)return;draw(data);}
  catch(e){if(stopped||seq!==current)return;if([401,403].includes(e.status)){dispose();onAuthLoss();return;}if(e.status===404){dispose();return;}draw(null);}}
 function draw(data){const head=renderMockKey(root,data);const button=doc.createElement('button');button.type='button';button.className='button secondary wallet-refresh';button.textContent='새로 확인';button.onclick=()=>void refresh();head.append(button);}
 if(enabled)void refresh();return {refresh,dispose};
}
