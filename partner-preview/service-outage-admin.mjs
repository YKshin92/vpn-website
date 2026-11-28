// Administrator outage review (isolated simulation). Korean only, like the other admin screens.
const hour=3600000,kst=9*hour;
export const causeLabels={service:'서비스 장애',maintenance:'사전 공지 점검',china_block:'중국 현지 차단',customer_side:'고객 기기·통신망 문제',not_outage:'장애 아님'};
export const compensable=['service','maintenance','china_block'];
const sourceLabels={server_check:'모니터링 · 서버 응답 없음',china_probe:'모니터링 · 중국 차단',manual:'직접 등록'};
const reasons={'cause-not-allowed':'선택한 원인으로는 이 결정을 할 수 없습니다','outage-already-decided':'이미 결정된 장애입니다 목록을 새로 확인해 주세요','outage-still-open':'아직 끝나지 않은 장애입니다','outage-not-found':'장애 기록을 찾을 수 없습니다',
 'invalid-outage-window':'시작·끝 시각을 확인해 주세요 끝은 지금보다 앞이어야 하고, 길이는 7일 이하, 62일 이내 기록만 등록할 수 있습니다','invalid-outage':'서버와 시각을 확인해 주세요','invalid-time':'시각 형식을 확인해 주세요','unknown-instance':'고객이 배정된 서버만 등록할 수 있습니다','request-conflict':'같은 요청이 다른 내용으로 이미 처리됐습니다',
 'already-compensated':'이 고객은 그날 이미 보상을 받았습니다','paid-pass-required':'유료 이용권이 있는 고객만 보상할 수 있습니다','customer-not-found':'고객을 찾을 수 없습니다','invalid-day':'오늘부터 31일 전까지의 날짜만 선택할 수 있습니다','note-required':'확인 내용을 적어 주세요','invalid-grant':'고객 ID와 날짜를 확인해 주세요','invalid-note':'메모는 500자 이내로 적어 주세요','preview-read-only':'공유용 미리보기라 저장되지 않습니다 실제 처리는 격리 시험 환경에서 확인할 수 있습니다'};
export const reasonText=reason=>reasons[reason]??'처리하지 못했습니다 잠시 후 다시 시도해 주세요';
export function formatDuration(minutes){if(!Number.isFinite(minutes)||minutes<0)return '—';const h=Math.floor(minutes/60),m=minutes%60;return h?(m?`${h}시간 ${m}분`:`${h}시간`):`${m}분`;}
export function kstLabel(iso,withYear=false){const t=Date.parse(iso);if(!Number.isFinite(t))return '—';const s=new Date(t+kst).toISOString();return (withYear?s.slice(0,4)+'.':'')+s.slice(5,7)+'.'+s.slice(8,10)+' '+s.slice(11,16);}
export const kstDayText=ms=>new Date(ms+kst).toISOString().slice(0,10);
export function kstInputToIso(value){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(value)))return null;const t=Date.parse(value+':00+09:00');return Number.isFinite(t)?new Date(t).toISOString():null;}
export function outageStatus(outage){
 if(outage.open)return {kind:'warn',text:'진행 중'};
 if(outage.decision==='approved')return {kind:'ok',text:outage.grants?`승인 · ${outage.grants}건 연장`:'승인 · 연장 없음'};
 if(outage.decision==='dismissed')return {kind:'muted',text:'제외'};
 const n=outage.impact?.compensatedCustomers??0;return {kind:'pending',text:n?`확인 대기 · ${n}명 보상 대상`:'확인 대기 · 보상 대상 없음'};
}
// 2026-11-06 2차: 개별 보상은 고객을 이름·아이디·이메일로 찾아 고르고("닉네임(아이디) · 종료일"을 보여 준 뒤 확정),
// 고객 상세의 '장애 보상 1일' 링크(?customer=id)로 열면 그 고객이 미리 골라져 있어요. 표의 고객은 이름으로 보여요.
const uuidPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const passWords={active:'이용 중',trial:'무료 체험 중',expired:'기간 끝남','trial-ended':'체험 끝남',none:'이용권 없음'};
const dayOf=iso=>{const t=Date.parse(iso);return Number.isFinite(t)?new Date(t+kst).toISOString().slice(0,10):'';};
export const noticeKindText={maintenance:'점검 안내',outage:'장애 안내',policy:'약관 변경 안내',general:'일반 공지'};
const noticeReasons={'too-many-notices':'같은 기간에 보이는 공지가 이미 3개예요 · 하나를 내린 뒤 올려 주세요','invalid-period':'보이는 기간을 확인해 주세요 · 끝은 지금보다 뒤, 길이는 31일 이하예요','invalid-body':'공지 내용을 200자 안으로 적어 주세요','notices-unavailable':'이 서버에는 고객 공지 기능이 아직 없어요','notice-not-found':'공지를 찾지 못했어요 · 새로 확인해 주세요'};
export function customerLabel(c){if(!c)return '';const name=c.nickname&&c.nickname!==c.username?c.nickname+'('+c.username+')':c.username;return c.accountState==='closed'?'탈퇴 고객':name+(c.expiresAt?' · '+dayOf(c.expiresAt)+' 종료':'');}
export function mountOutageAdmin({document:doc,api,now=()=>Date.now(),randomId=()=>crypto.randomUUID(),search:query=(typeof location!=='undefined'?location.search:''),searchDelay=300}){
 const $=id=>doc.getElementById(id);
 const status=$('outage-status'),summary=$('outage-summary'),list=$('outage-list'),detail=$('outage-detail'),register=$('outage-register'),individual=$('outage-individual'),policy=$('outage-policy'),simulationRoot=$('outage-simulation'),noticesRoot=$('outage-notices');
 let endAsk=null,csrf='',page=1,model=null,instances=[],simulation=null,selected=null,confirming=false,busy=false,ended=false,message=null;
 const requests={register:null,grant:null},form={instance:'',start:'',end:'',note:'',customer:'',day:'',reason:'',mock:''};
 // Individual grant: the picked customer, the search box (or the plain id box where search is not available), confirm.
 let pick=null,lookup={mode:'search',q:'',results:null,failed:false},asking=false,timer=0;const known=new Map();
 let notices={loaded:false,available:false,list:[]},noticeForm={kind:'maintenance',body:'',from:'',until:'',mail:false,asking:false};
 const kstInput=ms=>new Date(ms+kst).toISOString().slice(0,16);
 const nameOf=id=>{const c=known.get(id);return c?(c.accountState==='closed'?'탈퇴 고객':c.nickname||c.username):id.slice(0,8);};
 async function loadNames(ids){const missing=[...new Set(ids)].filter(id=>uuidPattern.test(id)&&!known.has(id)).slice(0,50);if(!missing.length)return false;
  try{const r=await api('/api/admin/test-customers/names?ids='+missing.join(','));for(const c of r?.customers??[])if(uuidPattern.test(c.id))known.set(c.id,c);return true;}catch{return false;}}
 const bind=(control,key,event='oninput')=>{control.value=form[key];control[event]=()=>{form[key]=control.value;};return control;};
 const make=(tag,text,cls,parent)=>{const n=doc.createElement(tag);if(text!==undefined&&text!==null)n.textContent=text;if(cls)n.className=cls;if(parent)parent.append(n);return n;};
 const button=(text,cls,parent,onclick)=>{const b=make('button',text,cls,parent);b.type='button';b.onclick=onclick;return b;};
 const field=(label,parent,control)=>{const wrap=make('label',undefined,'oa-field',parent);make('span',label,'oa-label',wrap);wrap.append(control);return control;};
 function lost(){ended=true;for(const n of [summary,list,detail,register,individual,policy,simulationRoot,noticesRoot])if(n)n.hidden=true;status.textContent='관리자 로그인이 만료됐어요 · 페이지를 새로 고친 뒤 다시 로그인해 주세요';}
 async function call(path,body){
  try{return await api(path,body===undefined?undefined:{method:'POST',headers:{'content-type':'application/json','x-csrf-token':csrf},body:JSON.stringify(body)});}
  catch(error){if([401,403].includes(error.status)&&['administrator-required','csrf-required',undefined].includes(error.reason)){lost();}throw error;}
 }
 function drawSummary(s){
  summary.replaceChildren();summary.hidden=false;
  for(const [label,value] of [['확인 대기',s.pending],['진행 중',s.open],['반영 대기',s.queued],['확인 필요',s.review],['연장 완료',s.applied]]){const box=make('div',undefined,undefined,summary);make('small',label,undefined,box);make('strong',String(value),undefined,box);}
  if(s.queued>0){const box=make('div',undefined,'oa-summary-action',summary);make('small','다른 처리가 끝난 뒤 반영합니다',undefined,box);button('대기 중인 보상 반영','button secondary',box,()=>void applyQueued());}
 }
 function drawList(){
  list.replaceChildren();list.hidden=false;const head=make('div',undefined,'oa-list-head',list);make('h2','장애 목록',undefined,head);button('새로 확인','button secondary',head,()=>void load());
  if(!model){make('p','불러오고 있습니다','oa-state',list);return;}
  if(!model.outages.length){make('p','기록된 장애가 없습니다 서버 상태 기록에서 장애가 감지되거나 직접 등록하면 여기에 표시됩니다','oa-state',list);return;}
  const cols=make('div',undefined,'oa-head',list);for(const name of ['서버','기간 (한국시간)','지속','출처','상태'])make('span',name,undefined,cols);
  const ul=make('ul',undefined,'oa-list',list);
  for(const o of model.outages){const li=make('li',undefined,undefined,ul),row=button('', 'oa-row',li,()=>void open(o.id));row.setAttribute('data-selected',String(selected?.outage?.id===o.id));
   make('span',o.instance,'oa-instance',row);make('span',kstLabel(o.startedAt)+' – '+(o.endedAt?kstLabel(o.endedAt):'계속'),'oa-period',row);make('span',o.open?'—':formatDuration(o.durationMinutes),'oa-duration',row);make('span',sourceLabels[o.source]??o.source,'oa-source',row);
   const s=outageStatus(o),chip=make('span',s.text,'oa-chip',row);chip.setAttribute('data-kind',s.kind);}
  const nav=make('div',undefined,'oa-nav',list);if(page>1)button('이전','button secondary',nav,()=>{page--;void load();});if(model.hasMore)button('다음','button secondary',nav,()=>{page++;void load();});
 }
 function fact(dl,k,v){const row=make('div',undefined,undefined,dl);make('dt',k,undefined,row);make('dd',v,undefined,row);}
 function drawDetail(){
  detail.replaceChildren();if(!selected){detail.hidden=true;return;}detail.hidden=false;const o=selected.outage;
  const head=make('div',undefined,'oa-list-head',detail);make('h2','장애 상세 · '+o.instance,undefined,head);button('닫기','button secondary',head,()=>{selected=null;confirming=false;drawDetail();drawList();});
  const dl=make('dl',undefined,'oa-facts',detail);fact(dl,'시작',kstLabel(o.startedAt,true));fact(dl,'끝',o.endedAt?kstLabel(o.endedAt,true):'아직 복구되지 않음');fact(dl,'지속 시간',o.open?'—':formatDuration(o.durationMinutes));fact(dl,'출처',sourceLabels[o.source]??o.source);
  if(o.decision!=='pending'){fact(dl,'원인',causeLabels[o.cause]??o.cause);fact(dl,'결정',(o.decision==='approved'?'승인':'제외')+' · '+o.decidedBy+' · '+kstLabel(o.decidedAt));}
  if(o.note)fact(dl,'메모',o.note);
  if(o.monitorGap)make('p','상태 기록 사이에 빈 시간이 있어 실제 시작·끝 시각과 다를 수 있습니다 서버 기록을 확인한 뒤 결정하세요','oa-warning',detail);
  if(noticesRoot&&notices.available){const row=make('div',undefined,'oa-actions',detail);button('고객 공지로 띄우기','button secondary',row,()=>{
   noticeForm={kind:'outage',body:o.open?`${o.instance} 서버 접속이 원활하지 않아 확인하고 있어요 · 불편을 드려 죄송해요`:`${o.instance} 서버에 문제가 있어 ${kstLabel(o.startedAt)}부터 접속이 원활하지 않았어요 · 하루 4시간 넘게 쓰지 못한 날은 이용 기간을 하루씩 늘려 드려요`,from:kstInput(now()),until:kstInput(now()+24*hour),asking:false};
   message=null;drawNotices();noticesRoot.scrollIntoView?.({block:'start',behavior:'smooth'});});}
  if(o.open){make('p','장애가 아직 끝나지 않았습니다 복구가 기록되면 원인을 정할 수 있습니다','oa-state',detail);return;}
  if(o.decision==='pending'&&selected.impact)drawImpact(selected.impact);
  if(o.decision!=='pending')drawGrants(selected.grants);
  if(o.decision==='pending')drawDecision(selected.impact);
 }
 function drawImpact(impact){
  make('h3','영향받은 고객',undefined,detail);
  make('p',impact.compensatedCustomers?`보상 대상 ${impact.compensatedCustomers}명 · 연장 ${impact.compensationDays}일`+(impact.inactiveCustomers?` · 이용 종료 ${impact.inactiveCustomers}명은 연장 전 확인 필요`:''):(impact.customers?`이 서버의 이용 고객 ${impact.customers}명 · 하루 4시간을 넘은 날이 없어 연장 대상이 없습니다`:'이 서버에 이용권이 있는 고객이 없습니다'),'oa-impact-note',detail);
  if(!impact.rows.length)return;
  const table=make('table',undefined,'oa-table',detail),thead=make('thead',undefined,undefined,table),tr=make('tr',undefined,undefined,thead);for(const h of ['고객','끊긴 시간 (같은 서버의 승인된 장애 포함)','결과'])make('th',h,undefined,tr);
  const tbody=make('tbody',undefined,undefined,table);
  for(const r of impact.rows){const row=make('tr',undefined,undefined,tbody),who=make('td',undefined,'oa-customer',row),link=make('a',nameOf(r.customerId),undefined,who);link.href='./payment-status.html?customer='+encodeURIComponent(r.customerId);link.title=r.customerId;
   make('td',r.days.map(d=>d.day.slice(5).replace('-','.')+' · '+formatDuration(d.minutes)).join(', ')||'—',undefined,row);
   const result=r.newDays.length?(r.passActive?`${r.newDays.length}일 연장`:`${r.newDays.length}일 · 이용 종료, 확인 필요`):r.days.some(d=>d.granted)?'이미 보상됨':'4시간 이하';const cell=make('td',result,'oa-result',row);cell.setAttribute('data-kind',r.newDays.length?(r.passActive?'ok':'warn'):'muted');}
 }
 function drawGrants(grants){
  make('h3','연장 결과',undefined,detail);if(!grants.length){make('p','이 결정으로 연장된 고객은 없습니다','oa-impact-note',detail);return;}
  const states={succeeded:'반영 완료',queued:'반영 대기',running:'반영 중',needs_review:'확인 필요'};
  const table=make('table',undefined,'oa-table',detail),tr=make('tr',undefined,undefined,make('thead',undefined,undefined,table));for(const h of ['고객','보상한 날','상태'])make('th',h,undefined,tr);const tbody=make('tbody',undefined,undefined,table);
  for(const g of grants){const row=make('tr',undefined,undefined,tbody),who=make('td',undefined,'oa-customer',row),link=make('a',nameOf(g.customerId),undefined,who);link.href='./payment-status.html?customer='+encodeURIComponent(g.customerId);link.title=g.customerId;make('td',g.day,undefined,row);const c=make('td',states[g.state]??g.state,'oa-result',row);c.setAttribute('data-kind',g.state==='succeeded'?'ok':g.state==='needs_review'?'warn':'muted');}
 }
 function drawDecision(impact){
  const box=make('div',undefined,'oa-decision',detail);make('h3','원인 정하기',undefined,box);
  const select=doc.createElement('select');field('원인',box,select);const empty=make('option','원인을 선택하세요',undefined,select);empty.value='';
  for(const [group,keys] of [['보상 · 하루 4시간 초과 시 1일 연장',compensable],['제외 · 보상 없음',['customer_side','not_outage']]]){const g=make('optgroup',undefined,undefined,select);g.label=group;for(const k of keys){const o=make('option',causeLabels[k],undefined,g);o.value=k;}}
  select.value=selected.cause??'';
  const note=doc.createElement('textarea');note.maxLength=500;note.rows=2;note.value=selected.note??'';field('메모 (선택)',box,note);note.oninput=()=>{selected.note=note.value;};
  const n=impact?.compensatedCustomers??0;
  const label=()=>!select.value?'원인을 선택하세요':compensable.includes(select.value)?(n?`승인하고 ${n}명 연장`:'승인 (연장 대상 없음)'):'보상 없이 닫기';
  if(confirming&&select.value){select.disabled=true;note.disabled=true;make('p',compensable.includes(select.value)&&n?`${n}명의 이용기간을 하루씩 연장합니다 승인 후에는 되돌릴 수 없습니다`:'이 장애를 보상 없이 닫습니다 결정 후에는 바꿀 수 없습니다','oa-confirm',box);
   // 4단계 (A-16): approving extends many passes at once and cannot be undone — red, named by what it does; 10 or more
   // customers need the number typed.
   const extend=compensable.includes(select.value)&&n>0,actions=make('div',undefined,'oa-actions',box);let typed=null;
   if(extend&&n>=10){typed=doc.createElement('input');typed.inputMode='numeric';typed.maxLength=4;typed.autocomplete='off';field('확인하려면 연장할 인원 수 '+n+'을 입력해 주세요',box,typed);box.append(actions);}
   const go=button(extend?`승인하고 ${n}명 연장`:'보상 없이 닫기',extend?'button danger':'button primary',actions,()=>void decide(select.value,note.value));go.disabled=busy||!!typed;if(typed)typed.oninput=()=>{go.disabled=busy||typed.value.trim()!==String(n);};
   button('취소','button secondary',actions,()=>{confirming=false;drawDetail();});}
  else{const actions=make('div',undefined,'oa-actions',box),go=button(label(),'button primary',actions,()=>{confirming=true;drawDetail();});go.disabled=!select.value||busy;select.onchange=()=>{selected.cause=select.value;go.textContent=label();go.disabled=!select.value||busy;};}
  if(message?.scope==='decision')make('p',message.text,'oa-message',box).setAttribute('data-kind',message.kind);
 }
 function drawForms(){
  register.replaceChildren();register.hidden=false;make('h2','장애 직접 등록',undefined,register);make('p','사전 공지 점검이나 상태 기록에 잡히지 않은 장애를 등록합니다 등록한 뒤 장애 상세에서 원인을 정해 승인하세요 시각은 한국시간입니다','oa-help',register);
  const box=make('div',undefined,'oa-form',register),server=doc.createElement('select');field('서버',box,server);const first=make('option',instances.length?'서버를 선택하세요':'고를 수 있는 서버가 없습니다',undefined,server);first.value='';
  // 1단계 (A-25): the same names and numbers as 서버 관리 (seoul-2 · 이용 중 고객 1명).
  for(const i of instances){const o=make('option',`${String(i.instance).replace(/^ieum-vpn-/,'')} · 이용 중 고객 ${i.customers}명`,undefined,server);o.value=i.instance;}bind(server,'instance','onchange');
  const start=doc.createElement('input');start.type='datetime-local';field('시작',box,bind(start,'start'));const end=doc.createElement('input');end.type='datetime-local';field('끝',box,bind(end,'end'));
  const note=doc.createElement('input');note.type='text';note.maxLength=500;note.placeholder='예: 10월 공지 점검 초과';field('메모 (선택)',box,bind(note,'note'));
  const act=make('div',undefined,'oa-actions',register);button('등록','button primary',act,()=>void submitOutage(form.instance,form.start,form.end,form.note)).disabled=busy;
  if(message?.scope==='register')make('p',message.text,'oa-message',register).setAttribute('data-kind',message.kind);
  drawIndividual();
 }
 function drawIndividual(){
  individual.replaceChildren();individual.hidden=false;make('h2','개별 고객 보상',undefined,individual);make('p','1:1 문의 등으로 확인한 경우 한 고객의 하루를 1일 연장해요 · 같은 날은 한 번만 보상돼요','oa-help',individual);
  const g=make('div',undefined,'oa-form',individual),who=make('div',undefined,'oa-field oa-who',g);make('span','고객',undefined,who).className='oa-label';
  if(pick){const chosen=make('div',undefined,'oa-picked',who);make('strong',pick.label,undefined,chosen);if(!asking)button('바꾸기','button secondary',chosen,()=>{pick=null;form.customer='';message=null;drawIndividual();});}
  else if(lookup.mode==='search'){const input=doc.createElement('input');input.type='search';input.maxLength=100;input.value=lookup.q;input.placeholder='닉네임·아이디·이메일로 찾기';input.autocomplete='off';input.setAttribute('aria-label','보상할 고객 찾기');who.append(input);
   input.oninput=()=>{lookup.q=input.value;clearTimeout(timer);timer=setTimeout(()=>void find(input.value),searchDelay);};
   const results=make('div',undefined,'oa-results',who);
   if(lookup.failed)make('p','고객을 찾지 못했어요 · 다시 입력해 주세요','oa-state',results);
   else if(lookup.results&&!lookup.results.length)make('p','‘'+lookup.q.trim()+'’와 맞는 고객이 없어요','oa-state',results);
   else for(const c of (lookup.results??[]).slice(0,8)){const b=button('','oa-result-row',results,()=>{known.set(c.id,c);pick={id:c.id,label:customerLabel(c)};form.customer=c.id;lookup={mode:'search',q:'',results:null,failed:false};message=null;drawIndividual();});
    make('strong',customerLabel({...c,expiresAt:null}),undefined,b);make('span',[c.accountState==='suspended'?'정지':passWords[c.pass]??'',c.expiresAt?dayOf(c.expiresAt)+' 종료':'',c.email].filter(Boolean).join(' · '),undefined,b);}
   button('고객 ID로 입력','oa-link',who,()=>{lookup={...lookup,mode:'id'};drawIndividual();});}
  else{const customer=doc.createElement('input');customer.type='text';customer.maxLength=36;customer.placeholder='고객 ID (36자)';customer.autocomplete='off';customer.spellcheck=false;who.append(bind(customer,'customer'));
   if(lookup.unavailable)make('p','이 서버에서는 고객 찾기를 쓸 수 없어 고객 ID로 입력해요','oa-state',who);else button('이름으로 찾기','oa-link',who,()=>{lookup={...lookup,mode:'search'};drawIndividual();});}
  const dayInput=doc.createElement('input');dayInput.type='date';dayInput.max=kstDayText(now());field('이용하지 못한 날',g,bind(dayInput,'day'));
  const reason=doc.createElement('input');reason.type='text';reason.maxLength=500;reason.placeholder='예: 1:1 문의 #12 · 서버 로그 확인';field('확인 내용',g,bind(reason,'reason'));
  if(asking){dayInput.disabled=true;reason.disabled=true;make('p',(pick?.label??form.customer.slice(0,8))+' 고객의 이용기간을 1일 연장해요 · 이용하지 못한 날 '+form.day+' · 같은 날은 한 번만 보상돼요','oa-confirm',individual);
   const act=make('div',undefined,'oa-actions',individual);button('확정','button primary',act,()=>void submitGrant(form.customer.trim().toLowerCase(),form.day,form.reason)).disabled=busy;button('취소','button secondary',act,()=>{asking=false;drawIndividual();});}
  else{const act2=make('div',undefined,'oa-actions',individual);button('1일 연장','button primary',act2,()=>{const id=form.customer.trim().toLowerCase();
   if(!uuidPattern.test(id)||!/^\d{4}-\d{2}-\d{2}$/.test(form.day)){message={scope:'grant',kind:'error',text:pick||lookup.mode==='id'?'고객과 날짜를 확인해 주세요':'보상할 고객을 찾아 골라 주세요'};drawIndividual();return;}
   if(!form.reason.trim()){message={scope:'grant',kind:'error',text:reasonText('note-required')};drawIndividual();return;}
   message=null;asking=true;drawIndividual();}).disabled=busy;}
  if(message?.scope==='grant')make('p',message.text,'oa-message',individual).setAttribute('data-kind',message.kind);
 }
 async function find(q){q=String(q??'').trim().slice(0,100);if(ended)return;if(!q){lookup={...lookup,results:null,failed:false};drawIndividual();refocus();return;}
  try{const r=await api('/api/admin/test-customers?filter=all&q='+encodeURIComponent(q));if(ended||lookup.q.trim()!==q)return;lookup={...lookup,results:Array.isArray(r?.customers)?r.customers.filter(c=>uuidPattern.test(c.id)):[],failed:false};}
  catch(error){if(ended)return;if([401,403].includes(error.status)){lost();return;}lookup=error.status===404?{mode:'id',q:'',results:null,failed:false,unavailable:true}:{...lookup,results:null,failed:true};}
  drawIndividual();refocus();}
 function refocus(){if(lookup.mode!=='search')return;const input=individual.querySelector?.('input[type=search]');if(input&&doc.activeElement!==input){input.focus?.();try{input.setSelectionRange?.(input.value.length,input.value.length);}catch{}}}
 // Isolated test servers only: record a mock health check to try automatic detection.
 function drawSimulation(){if(!simulationRoot)return;simulationRoot.replaceChildren();if(!simulation){simulationRoot.hidden=true;return;}simulationRoot.hidden=false;
  make('h2','모의 상태 기록 · 시험 서버 전용',undefined,simulationRoot);make('p','실제 서버 없이 자동 감지를 시험합니다 장애 시작을 기록하면 지금 시각으로 장애가 열리고, 복구를 기록하면 닫힙니다 4시간 넘는 보상 시험은 장애 직접 등록을 이용하세요','oa-help',simulationRoot);
  const box=make('div',undefined,'oa-form',simulationRoot),select=doc.createElement('select');field('모의 서버',box,select);for(const name of simulation.instances){const o=make('option',name,undefined,select);o.value=name;}if(!form.mock)form.mock=simulation.instances[0];bind(select,'mock','onchange');
  const act=make('div',undefined,'oa-actions',simulationRoot);button('장애 시작 기록','button secondary',act,()=>void sample(false)).disabled=busy;button('복구 기록','button secondary',act,()=>void sample(true)).disabled=busy;
  if(message?.scope==='simulation')make('p',message.text,'oa-message',simulationRoot).setAttribute('data-kind',message.kind);}
 async function sample(ok){if(busy)return;busy=true;try{const r=await call('/api/admin/outage-simulation/sample',{instance:form.mock,ok});const words={opened:'장애가 열렸습니다 목록에 진행 중으로 표시됩니다',continued:'이미 진행 중인 장애에 실패 기록을 더했습니다',closed:'복구를 기록해 장애를 닫았습니다 원인을 정할 수 있습니다',ok:'정상 상태를 기록했습니다 열린 장애가 없습니다',stale:'더 최근 기록이 있어 무시했습니다'};message={scope:'simulation',kind:r.state==='stale'?'warn':'ok',text:words[r.state]??'기록했습니다'};busy=false;drawSimulation();await load();}
  catch(error){busy=false;if(ended)return;message={scope:'simulation',kind:'error',text:reasonText(error.reason)};drawSimulation();}}
 function drawAll(){if(ended)return;drawList();drawDetail();drawSimulation();drawForms();drawNotices();policy.hidden=false;}
 // 고객 공지 (draft 055): the one line customers see at the top of the home page and 내 이용권.
 function drawNotices(){if(!noticesRoot||ended)return;noticesRoot.replaceChildren();noticesRoot.hidden=false;
  make('h2','고객 공지',undefined,noticesRoot);make('p','홈페이지와 내 이용권 맨 위에 한 줄로 보여요 · 점검은 미리, 약관 변경은 7일 전에 알려요 · 한 번에 3개까지','oa-help',noticesRoot);
  if(!notices.loaded){make('p','불러오고 있어요','oa-state',noticesRoot);return;}
  if(!notices.available){make('p','이 서버에는 고객 공지 기능이 아직 없어요','oa-state',noticesRoot);return;}
  const t=now(),showing=notices.list.filter(n=>!n.endedAt&&Date.parse(n.showUntil)>t),past=notices.list.filter(n=>!showing.includes(n)).slice(0,10);
  const period=n=>kstLabel(n.showFrom)+' – '+kstLabel(n.showUntil);
  make('h3',showing.length?'지금·예정된 공지 '+showing.length+'개':'보이는 공지 없음',undefined,noticesRoot);
  if(showing.length){const ul=make('ul',undefined,'oa-notices',noticesRoot);for(const n of showing){const li=make('li',undefined,undefined,ul);const tag=make('span',noticeKindText[n.kind]??n.kind,'oa-notice-kind',li);tag.setAttribute('data-kind',n.kind);make('span',n.body,'oa-notice-body',li);
   make('span',(Date.parse(n.showFrom)>t?'예정 · ':'보이는 중 · ')+period(n),'oa-notice-when',li);// 4단계 (A-16): taking a notice down asks first.
   if(endAsk===n.id){const q=make('span',undefined,'oa-inline-confirm',li);make('span','고객 화면에서 바로 내려가요 · 내릴까요?',undefined,q);button('내리기','button danger',q,()=>{endAsk=null;void endNotice(n.id);}).disabled=busy;button('취소','button secondary',q,()=>{endAsk=null;drawNotices();});}
   else button('내리기','button secondary',li,()=>{endAsk=n.id;drawNotices();}).disabled=busy;}}
  const box=make('div',undefined,'oa-form oa-notice-form',noticesRoot),kind=doc.createElement('select');field('종류',box,kind);
  for(const [value,label] of Object.entries(noticeKindText)){const o=make('option',label,undefined,kind);o.value=value;}kind.value=noticeForm.kind;kind.onchange=()=>{noticeForm.kind=kind.value;};
  const body=doc.createElement('input');body.type='text';body.maxLength=200;body.value=noticeForm.body;body.placeholder='예: 11월 20일 02:00–03:00 서버 점검으로 접속이 잠시 끊겨요';field('내용 (200자)',box,body).oninput=()=>{noticeForm.body=body.value;};
  const from=doc.createElement('input');from.type='datetime-local';from.value=noticeForm.from||kstInput(t);field('보이기 시작',box,from).oninput=()=>{noticeForm.from=from.value;};
  const until=doc.createElement('input');until.type='datetime-local';until.value=noticeForm.until||kstInput(t+24*hour);field('보이기 끝',box,until).oninput=()=>{noticeForm.until=until.value;};
  // 메일 발송 2단계: also mail it, once, when it starts showing, to customers whose pass is running.
  const mailRow=make('label',undefined,'oa-notice-mail',box),mail=doc.createElement('input');mail.type='checkbox';mail.checked=!!noticeForm.mail;mailRow.append(mail);make('span','이용 중인 고객에게 메일로도 보내기 (보이기 시작할 때 한 번)',undefined,mailRow);mail.onchange=()=>{noticeForm.mail=mail.checked;};
  if(!noticeForm.from)noticeForm.from=from.value;if(!noticeForm.until)noticeForm.until=until.value;
  if(noticeForm.asking){for(const c of [kind,body,from,until,mail])c.disabled=true;make('p','고객 화면 맨 위에 ['+(noticeKindText[noticeForm.kind]??'')+'] “'+noticeForm.body.trim()+'”을(를) '+kstLabel(kstInputToIso(noticeForm.from)??'')+'부터 '+kstLabel(kstInputToIso(noticeForm.until)??'')+'까지 보여 줘요'+(noticeForm.mail?' · 이용 중인 고객 모두에게 메일로도 보내요 (보낸 메일은 되돌릴 수 없어요)':''),'oa-confirm',noticesRoot);
   const act=make('div',undefined,'oa-actions',noticesRoot);button('확정','button primary',act,()=>void submitNotice()).disabled=busy;button('취소','button secondary',act,()=>{noticeForm.asking=false;drawNotices();});}
  else{const act=make('div',undefined,'oa-actions',noticesRoot);button('공지 올리기','button primary',act,()=>{const f=kstInputToIso(noticeForm.from),u=kstInputToIso(noticeForm.until);
   if(!noticeForm.body.trim()){message={scope:'notice',kind:'error',text:'공지 내용을 적어 주세요'};drawNotices();return;}
   if(!f||!u||Date.parse(u)<=Date.parse(f)||Date.parse(u)<=now()){message={scope:'notice',kind:'error',text:'보이는 기간을 확인해 주세요 · 끝은 시작과 지금보다 뒤여야 해요'};drawNotices();return;}
   message=null;noticeForm.asking=true;drawNotices();}).disabled=busy;}
  if(message?.scope==='notice')make('p',message.text,'oa-message',noticesRoot).setAttribute('data-kind',message.kind);
  if(past.length){const more=make('details',undefined,'oa-notice-record',noticesRoot);make('summary','지난 공지 기록 '+past.length+'개',undefined,more);const ul=make('ul',undefined,'oa-notices',more);
   for(const n of past){const li=make('li',undefined,undefined,ul);make('span',noticeKindText[n.kind]??n.kind,'oa-notice-kind',li).setAttribute('data-kind',n.kind);make('span',n.body,'oa-notice-body',li);make('span',period(n)+' · '+n.createdBy+(n.endedAt?' · '+kstLabel(n.endedAt)+' 내림 ('+n.endedBy+')':' · 기간 끝남'),'oa-notice-when',li);}}
 }
 async function loadNotices(){if(!noticesRoot||ended)return;try{const r=await call('/api/admin/notices');if(ended)return;notices={loaded:true,available:r?.available===true,list:Array.isArray(r?.notices)?r.notices:[]};}catch(error){if(ended)return;notices={loaded:true,available:false,list:[]};}drawNotices();if(selected)drawDetail();}
 async function submitNotice(){if(busy)return;busy=true;const body={kind:noticeForm.kind,body:noticeForm.body.trim(),showFrom:kstInputToIso(noticeForm.from),showUntil:kstInputToIso(noticeForm.until),...(noticeForm.mail?{mail:true}:{})};
  try{await call('/api/admin/notices',body);busy=false;noticeForm={kind:'maintenance',body:'',from:'',until:'',mail:false,asking:false};message={scope:'notice',kind:'ok',text:'공지를 올렸어요 · 고객 화면 맨 위에 보여요'+(body.mail?' · 보이기 시작하면 메일로도 보내요':'')};await loadNotices();}
  catch(error){busy=false;if(ended)return;noticeForm.asking=false;message={scope:'notice',kind:'error',text:noticeReasons[error.reason]??reasonText(error.reason)};drawNotices();}}
 async function endNotice(id){if(busy)return;busy=true;try{await call('/api/admin/notices/'+encodeURIComponent(id)+'/end',{});busy=false;message={scope:'notice',kind:'ok',text:'공지를 내렸어요'};await loadNotices();}
  catch(error){busy=false;if(ended)return;message={scope:'notice',kind:'error',text:noticeReasons[error.reason]??reasonText(error.reason)};drawNotices();}}
 async function load(){if(ended)return;try{const result=await call('/api/admin/outages?page='+page);if(ended)return;model=result;drawSummary(result.summary);drawList();}catch(error){if(!ended){model=null;list.hidden=false;list.replaceChildren();make('p','장애 기록을 불러오지 못했습니다','oa-state',list);}}}
 async function open(id){if(ended)return;message=null;confirming=false;try{const result=await call('/api/admin/outages/'+encodeURIComponent(id));if(ended)return;selected={...result,cause:null,note:null};drawDetail();drawList();
   if(await loadNames([...(result.impact?.rows??[]).map(r=>r.customerId),...(result.grants??[]).map(g=>g.customerId)])&&!ended&&selected?.outage?.id===result.outage.id)drawDetail();}catch(error){if(!ended){status.textContent=reasonText(error.reason);}}}
 async function decide(cause,note){if(busy||!selected)return;busy=true;const id=selected.outage.id;
  try{const result=await call('/api/admin/outages/'+encodeURIComponent(id)+'/decision',{decision:compensable.includes(cause)?'approve':'dismiss',cause,...(note.trim()?{note:note.trim()}:{})});
   message=null;confirming=false;busy=false;await load();await open(id);
   status.textContent=result.decision==='approved'?`승인했습니다 · 연장 ${result.grants}건 (반영 ${result.applied}, 대기 ${result.waiting}, 확인 필요 ${result.review})`:'보상 없이 닫았습니다';}
  catch(error){busy=false;confirming=false;if(ended)return;message={scope:'decision',kind:'error',text:reasonText(error.reason)};drawDetail();if(error.reason==='outage-already-decided')void load();}
 }
 async function submitOutage(instance,start,end,note){if(busy)return;const startedAt=kstInputToIso(start),endedAt=kstInputToIso(end);
  if(!instance||!startedAt||!endedAt){message={scope:'register',kind:'error',text:'서버와 시작·끝 시각을 모두 입력해 주세요'};drawForms();return;}
  const key=JSON.stringify([instance,startedAt,endedAt]);if(!requests.register||requests.register.key!==key)requests.register={key,id:randomId()};
  busy=true;try{const result=await call('/api/admin/outages',{instance,startedAt,endedAt,...(note.trim()?{note:note.trim()}:{}),requestId:requests.register.id});requests.register=null;busy=false;Object.assign(form,{start:'',end:'',note:''});message={scope:'register',kind:'ok',text:'등록했습니다 장애 상세에서 원인을 정해 주세요'};drawForms();await load();await open(result.outage.id);}
  catch(error){busy=false;if(ended)return;if(error.status!==503&&error.status!==undefined)requests.register=null;message={scope:'register',kind:'error',text:reasonText(error.reason)};drawForms();}
 }
 async function submitGrant(customerId,day,note){if(busy)return;
  if(!uuidPattern.test(customerId)||!/^\d{4}-\d{2}-\d{2}$/.test(day)){asking=false;message={scope:'grant',kind:'error',text:'고객과 날짜를 확인해 주세요'};drawIndividual();return;}
  if(!note.trim()){asking=false;message={scope:'grant',kind:'error',text:reasonText('note-required')};drawIndividual();return;}
  const key=JSON.stringify([customerId,day]);if(!requests.grant||requests.grant.key!==key)requests.grant={key,id:randomId()};
  busy=true;try{const result=await call('/api/admin/outage-compensation/grants',{customerId,day,note:note.trim(),requestId:requests.grant.id});requests.grant=null;busy=false;asking=false;const who=pick?.label?.split(' · ')[0]??customerId.slice(0,8);if(result.state==='succeeded'){Object.assign(form,{customer:'',day:'',reason:''});pick=null;}
   message={scope:'grant',kind:result.state==='succeeded'?'ok':'warn',text:result.state==='succeeded'?`${who} 고객의 이용기간을 1일 연장했어요`:result.state==='queued'?'다른 처리가 끝나면 반영돼요 · 위의 대기 중인 보상 반영으로 다시 시도할 수 있어요':'반영 전에 확인이 필요해요 · 결제·이용권에서 이 고객의 상태를 확인해 주세요'};drawIndividual();await load();}
  catch(error){busy=false;asking=false;if(ended)return;if(error.status!==503&&error.status!==undefined)requests.grant=null;message={scope:'grant',kind:'error',text:reasonText(error.reason)};drawIndividual();}
 }
 async function applyQueued(){if(busy)return;busy=true;try{const r=await call('/api/admin/outage-compensation/apply-queued',{});status.textContent=`대기 중인 보상을 다시 반영했습니다 · 반영 ${r.applied}, 대기 ${r.waiting}, 확인 필요 ${r.review}`;}catch(error){if(!ended)status.textContent=reasonText(error.reason);}finally{busy=false;}await load();}
 async function start(){
  try{const session=await api('/api/auth/session');if(!session?.authenticated){status.textContent='관리자 로그인 후 다시 열어 주세요';if(typeof location!=='undefined')location.replace('/admin/login?next='+encodeURIComponent(location.pathname+location.search));return;}csrf=session.csrf;
   try{const r=await call('/api/admin/outage-instances');instances=r.instances;simulation=r.simulation&&Array.isArray(r.simulation.instances)&&r.simulation.instances.length?r.simulation:null;}catch{instances=[];simulation=null;}
   // Opened from a customer's detail (?customer=id): that customer is picked for an individual grant.
   const asked=new URLSearchParams(String(query??'')).get('customer')?.toLowerCase();
   // Opened from 서버 모니터링's '장애로 등록' (3단계 B-4, ?instance=&from=&to=): the server and times are filled in.
   {const q=new URLSearchParams(String(query??'')),inst=q.get('instance'),toInput=v=>{const t=Date.parse(v??'');return Number.isFinite(t)?new Date(t+9*3600000).toISOString().slice(0,16):'';};
    if(inst&&/^ieum-vpn-[a-z0-9-]{1,40}$/.test(inst)){form.instance=inst;form.start=toInput(q.get('from'));form.end=toInput(q.get('to'));}}
   if(asked&&uuidPattern.test(asked)){pick={id:asked,label:asked.slice(0,8)};form.customer=asked;try{const d=await api('/api/admin/test-customers/'+encodeURIComponent(asked));if(d?.customer&&pick?.id===asked){known.set(asked,d.customer);pick={id:asked,label:customerLabel(d.customer)};}}catch{}}
   if(ended)return;status.textContent='장애를 선택해 영향받은 고객을 확인하고 원인을 정하세요 · 보상 연장은 결제 기록과 별도로 남아요';drawAll();await load();await loadNotices();
   if(pick)individual.scrollIntoView?.({block:'start'});}
  catch{if(!ended)status.textContent='관리자 상태를 확인할 수 없습니다';}
 }
 const ready=start();
 return {ready,dispose(){ended=true;}};
}
async function fetchJson(path,init){const response=await fetch(path,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(20000),...init});let body=null;try{body=await response.json();}catch{body=null;}if(!response.ok){const e=Error(body?.reason??'outage-service-unavailable');e.status=response.status;e.reason=body?.reason;throw e;}return body;}
if(typeof document!=='undefined'&&document.getElementById?.('outage-list')){const ui=mountOutageAdmin({document,api:fetchJson});window.addEventListener('pagehide',()=>ui.dispose(),{once:true});}
