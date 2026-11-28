const categories={china_not_tested:'중국 현지 관측 없음',insufficient_evidence:'판단 근거 부족',mixed_results:'회선별 결과 혼재',observed_success:'모의 터널·웹 시험 통과',local_network_issue:'현지 인터넷 회선 확인',dns_issue:'DNS 확인 필요',server_or_service_issue:'서버·서비스 확인 필요',tunnel_path_unverified:'터널 경유 웹 요청 확인 필요',suspected_china_path_issue:'중국 경로 이상 의심'};
const suggestions={observe:'현지 관측을 더 확인하세요',check_local_network:'현지 인터넷 기준선을 확인하세요',check_dns:'등록된 도메인과 DNS를 확인하세요',check_server:'서버와 서비스 상태를 먼저 확인하세요',check_tunnel:'직접 접속과 터널 경유 결과를 구분해 주세요',review_ip:'관리자가 근거를 확인한 뒤 IP 변경 여부를 검토하세요'};
const stages={prepared:'근거 고정 · 모의 승인 대기',approved:'모의 승인됨 · 전환 전',switched:'모의 전환됨 · 새 대상 현지 재시험 대기',verified:'모의 재시험 통과 · 기존 대상 보존 중',completed:'모의 복구 단계 완료',needs_review:'근거 변경·만료 · 관리자 재확인 필요',cancelled:'모의 취소 완료 · 대상 전환 없음',rollback_pending:'모의 롤백됨 · 기존 대상 재시험 대기',rolled_back:'기존 대상 모의 재시험 통과 · 후보 대상 보존 중',closed_rollback:'모의 롤백 마무리 · 후보 대상 정리 완료'};
// 2026-11-06 2차: 맨 위에 한 줄 결론("중국에서 접속: 정상 / 이상 의심 / 확인 필요 / 판단 근거 부족")과 지금 할 일,
// 측정 근거와 복구 단계는 '자세히'로 접어 둬요. 개발 용어(관측원·대조 관측원)는 쉬운 말로 바꿨어요.
export function probeVerdict(diagnostic){
 const c=diagnostic?.category,s=diagnostic?.suggestion;
 if(c==='suspected_china_path_issue'||s==='review_ip')return {kind:'bad',title:'이상 의심',todo:'서버 관리 화면에서 서버가 정상인지 먼저 확인하세요 · 서버가 정상이면 중국 경로가 막혔을 수 있어요 · 고객 공지를 띄우고 개발 담당과 IP 변경을 검토하세요'};
 if(c==='server_or_service_issue')return {kind:'bad',title:'이상 의심',todo:'서버 관리 화면에서 서버와 서비스 상태를 먼저 확인하세요'};
 if(c==='observed_success')return {kind:'good',title:'정상',todo:'지금 할 일은 없어요 · 현지 시험이 통과했어요'};
 if(c==='china_not_tested'||c==='insufficient_evidence')return {kind:'muted',title:'판단 근거 부족',todo:'현지 측정이 더 쌓여야 판단할 수 있어요 · 지금 할 일은 없어요'};
 return {kind:'warn',title:'확인 필요',todo:suggestions[s]??'자세히를 열어 근거를 확인하세요'};
}
export function renderProbeStatus(root,value){
 root.replaceChildren();const doc=root.ownerDocument,make=(tag,text,parent=root)=>{const n=doc.createElement(tag);n.textContent=text;parent.append(n);return n;};
 const note='모의 시험 현황 · 실제 중국 접속 검증이나 IP 변경이 아닙니다';
 const valid=value?.mode==='simulation'&&value.connectivity==='not_live_verified'&&Object.hasOwn(categories,value.diagnostic?.category)&&Object.hasOwn(suggestions,value.diagnostic?.suggestion);
 if(!valid){make('p',note);make('h2','시험 현황을 확인할 수 없습니다');return;}
 const verdict=probeVerdict(value.diagnostic),top=doc.createElement('div');top.className='probe-verdict';top.setAttribute('data-kind',verdict.kind);root.append(top);
 make('h2','중국에서 접속: '+verdict.title,top);make('p',verdict.todo,top).className='probe-todo';
 const checked=Date.parse(value.checkedAt);if(Number.isFinite(checked))make('p','조회 시각 · '+new Date(checked).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}),top).className='probe-checked';
 make('p',note).className='probe-note';
 const more=doc.createElement('details');more.className='probe-more';root.append(more);make('summary','자세히 (측정 근거·복구 단계)',more);
 make('h3',categories[value.diagnostic.category],more);make('p',suggestions[value.diagnostic.suggestion],more);
 make('p','최근 5분 · 서로 다른 중국 회선 2종류 이상과 정상인 비교 지점이 기준이에요 · 운영 확정 전 초안이에요',more);
 const coverage=value.diagnostic.coverage;if(coverage&&['chinaSources','chinaCohorts','controlSources','healthyControlSources'].every(k=>Number.isSafeInteger(coverage[k])&&coverage[k]>=0&&coverage[k]<=10000)){
  const facts=make('dl','',more);facts.className='probe-facts';for(const [label,key] of [['중국 측정 지점','chinaSources'],['중국 회선 종류','chinaCohorts'],['비교용 측정 지점','controlSources'],['정상인 비교 지점','healthyControlSources']]){const item=make('div',undefined,facts);make('dt',label,item);make('dd',String(coverage[key]),item);}
 }
 make('h3','복구 진행 단계',more);const state=value.recovery?.state;make('p',Object.hasOwn(stages,state)?stages[state]:'준비된 모의 복구 계획이 없습니다',more);
 if(value.recovery)make('p',value.recovery.oldTargetRetained===false&&state==='completed'?'모의 기존 대상 보존 해제':'기존 대상 보존 · 새 대상의 현지 재시험 전 반환하지 않습니다',more);
 const steps=make('ol','',more);for(const label of ['근거 고정','모의 관리자 승인','모의 대상 전환','기존 키로 새 대상 터널·웹 재시험','명시적 모의 기존 대상 반환'])make('li',label,steps);
 make('p','지금은 조회만 할 수 있어요 · 승인·전환·반환 버튼은 운영 연결 전에 따로 검증해요',more);
}
export function mountProbeDashboard({root,loadServers,loadStatus,onAuthLoss=()=>{}}){
 let stopped=false,version=0;const doc=root.ownerDocument;root.hidden=false;root.replaceChildren();
 const label=doc.createElement('label'),select=doc.createElement('select'),refresh=doc.createElement('button'),message=doc.createElement('p'),panel=doc.createElement('section');label.textContent='시험 서버';select.setAttribute('aria-label','시험 서버');message.setAttribute('role','status');label.append(select);refresh.textContent='새로 확인';refresh.type='button';refresh.className='button secondary';panel.className='panel';root.append(label,refresh,message,panel);
 async function detail(){if(stopped||!select.value)return;const seq=++version;panel.replaceChildren();message.textContent='시험 현황을 확인하고 있습니다';try{const result=await loadStatus(select.value);if(stopped||seq!==version)return;renderProbeStatus(panel,result.status);message.textContent='';}catch(e){if(stopped||seq!==version)return;panel.replaceChildren();message.textContent='시험 현황을 불러오지 못했습니다';if([401,403].includes(e.status)){dispose();onAuthLoss();}}}
 async function refreshList(){if(stopped)return;const seq=++version;panel.replaceChildren();message.textContent='시험 서버 목록을 확인하고 있습니다';const previous=select.value;select.replaceChildren();try{const result=await loadServers();if(stopped||seq!==version)return;if(!Array.isArray(result?.servers)||result.servers.length>100||result.servers.some(s=>!s||!/^[a-zA-Z0-9_-]{1,100}$/.test(s.id)))throw Error('invalid-probe-list');for(const s of result.servers){const option=doc.createElement('option');option.value=s.id;option.textContent=s.id;select.append(option);}select.value=result.servers.some(s=>s.id===previous)?previous:result.servers[0]?.id??'';if(result.truncated){message.textContent='서버가 100개를 초과해 일부만 표시합니다';}if(!select.value){message.textContent='등록된 시험 서버가 없습니다';return;}await detail();}catch(e){if(stopped||seq!==version)return;message.textContent='시험 서버 목록을 불러오지 못했습니다';if([401,403].includes(e.status)){dispose();onAuthLoss();}}}
 function dispose(){stopped=true;version++;select.onchange=null;refresh.onclick=null;root.replaceChildren();root.hidden=true;}
 select.onchange=()=>void detail();refresh.onclick=()=>void refreshList();void refreshList();return {refresh:refreshList,dispose};
}
