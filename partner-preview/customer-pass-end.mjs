import {formatMoney,toMajor,toMinor} from './customer-money.mjs';
// Administrator card (test site): refund for a company-side reason, end a test pass, pause or open a real key.
// Refunds are for company-side reasons only (refund policy: no refund for a simple change of mind). Two scopes
// (decision D-6, 2026-11-06): a duplicate or mistaken payment is refunded alone and its days are taken off the end
// of the pass (the pass keeps running), or the pass is refunded and ends now. Mock payments: the amount is
// recorded, no money moves until a real PG. "기간 즉시 종료 (시험)" is the test server's instant end (no money).
// Every action that changes the customer's pass or key asks first in place: a one-line summary with [확정][취소]
// (the outage compensation pattern), reasons start empty, and the result shows next to the button.
export const refundReasonText={service_outage:'서비스 장애로 오래 이용하지 못함',service_stopped:'서비스 운영 중단',company_error:'회사 실수 (중복·잘못된 결제)',company_other:'기타 회사 사정',legal:'법령에 따른 환불 (이용약관 제8조)'};
const holdReasonText={'payment-check':'결제 확인 중','key-exposed':'키가 다른 사람에게 알려진 것 같음','terms-check':'이용 규칙 확인 중','other':'기타'};
const kindText={refund:'환불 후 종료',refund_part:'함께 환불',refund_payment:'결제 1건 환불 (기간 차감)',refund_topup:'데이터 추가 환불',test_end:'기간 즉시 종료 (시험)',account_close:'탈퇴로 종료'};
// 1단계 (A-8): a suspended, closing or closed account keeps its key shut; only the refund stays on this screen.
const accountNotice={suspended:'정지된 계정이에요 · 키는 멈춰 있고, 고객 화면에서 정지를 풀면 함께 열려요',closing:'탈퇴 예정 계정이에요 · 키는 멈춰 있고, 탈퇴를 취소하면 함께 열려요',closed:'탈퇴한 계정이에요 · 이용권은 탈퇴가 확정될 때 끝나고 키는 열 수 없어요'};
const methodText={kakao_pay:'카카오페이',bank_transfer:'계좌이체',wechat_pay:'위챗페이',alipay:'알리페이'};
const blockedText={'review-required':'확인 중인 결제가 있어 지금은 처리할 수 없어요','processing':'반영 중인 결제가 있어요 · 잠시 후 다시 확인해 주세요','real-key-unavailable':'VPN 서버에 연결할 수 없어 지금은 처리할 수 없어요'};
// Turning a simulated key into a real one (test server, 2026-11-07).
const convertErrors={'real-key-cap':'시험 서버의 실제 키 한도가 모두 찼어요','real-key-exists':'이미 실제 키가 있어요','trial-key-exists':'무료 체험 키가 있는 고객이라 바꿀 수 없어요','simulated-key-required':'시험용 키 고객이 아니에요','not-simulated-key':'시험용 키 고객이 아니에요','customer-key-held':'관리자가 멈춘 키예요 · 먼저 다시 열어 주세요','customer-key-already-exists':'VPN 서버에 같은 키가 이미 있어요 · 키관리 화면을 확인해 주세요','customer-key-needs-review':'키를 만드는 중 확인이 필요해졌어요 · 키관리 화면을 확인해 주세요','real-keys-unavailable':'VPN 서버에 연결할 수 없어요 · 잠시 후 다시 시도해 주세요'};
const errorText={'numeric-key-ids-off':'숫자 키 방식이 꺼져 있어요','customer-key-not-ready':'고객 키가 아직 준비되지 않았어요','customer-key-missing':'VPN 서버에서 고객 키를 찾지 못했어요','server-generation-changed':'VPN 서버가 바뀌었어요 · 새로 확인해 주세요','verification-failed':'VPN 서버에서 결과를 확인하지 못했어요 · 다시 시도해 주세요','refund-exceeds-payment':'환불 금액이 이 결제의 남은 금액보다 커요','refund-not-allowed':'단순 변심은 환불하지 않아요','active-pass-required':'이용 중인 이용권이 없어요','refund-order-not-found':'결제를 찾지 못했어요 · 새로 확인해 주세요','refund-payment-not-allowed':'이 결제만 환불할 수 없어요 · 남은 기간이 이 결제 기간보다 짧거나 이미 일부 환불됐어요','request-conflict':'같은 요청이 다른 내용으로 접수됐어요 · 새로 확인해 주세요','csrf-required':'화면을 새로 고친 뒤 다시 시도해 주세요','pass-ended':'이용 기간이 끝난 키예요','customer-key-not-ready':'키가 아직 준비되지 않았어요','test-end-disabled':'시험 서버에서만 쓸 수 있어요','account-not-active':'정지·탈퇴 계정이라 키를 열 수 없어요 · 고객 화면에서 정지를 풀거나 탈퇴를 취소해 주세요','refund-topup-not-allowed':'이 데이터 추가 결제는 이미 환불됐어요','refund-all-unavailable':'이 서버에서는 결제 1건씩만 환불할 수 있어요','invalid-request':'입력 내용을 확인해 주세요',...blockedText};
const won=n=>Number(n).toLocaleString('ko-KR')+'원';
// Won or yuan (元) by the order's currency (2026-11-07): a WeChat Pay·Alipay payment is refunded in yuan; the
// amount field takes yuan with 2 decimals and is sent in fen.
const money=(n,currency)=>currency==='CNY'?formatMoney(n,'CNY','ko'):won(n);
const kst=value=>{const t=Date.parse(value);return Number.isFinite(t)?new Date(t+9*3600000).toISOString().slice(0,16).replace('T',' '):'—';};
const kstDay=value=>{const t=Date.parse(value);return Number.isFinite(t)?new Date(t+9*3600000).toISOString().slice(0,10):'—';};
const productText=code=>/^pass-(\d+)$/.test(code)?code.slice(5)+'일 이용권':/^topup-(\d+)g$/.test(code)?'데이터 추가 '+code.slice(6,-1)+'GB':code;
const gb=bytes=>Math.round(bytes/1024**3)+'GB';
// Each plan payment's days still ahead (1단계, decision Q-1): from the server, or worked out here the same way (the
// newest payment covers the end of the pass, the one before it the days before that).
export function aheadDays(orders,remainingDays){
 const out=new Map();let left=Math.max(0,remainingDays);
 for(const o of orders){if(o.purpose==='monthly_topup')continue;if(Number.isSafeInteger(o.aheadDays)){out.set(o.id,o.aheadDays);continue;}
  const d=o.refundedMinor>0?0:Math.min(left,o.durationDays);out.set(o.id,d);left-=d;}
 return out;
}
// '환불하고 지금 종료': every plan payment with days still ahead, newest first, each with its suggested part.
export function refundParts(orders,remainingDays){
 const ahead=aheadDays(orders,remainingDays);
 return orders.filter(o=>o.purpose!=='monthly_topup'&&o.refundableMinor>0&&(ahead.get(o.id)??0)>0).map(o=>({order:o,days:ahead.get(o.id),suggested:suggestRefund(o,ahead.get(o.id))}));
}
const totals=(list,cur=x=>x.currency==='CNY'?'CNY':'KRW')=>{const t={KRW:0,CNY:0};for(const x of list)t[cur(x)]+=x.amount;return t;};
const totalText=t=>[t.KRW||!t.CNY?won(t.KRW):null,t.CNY?formatMoney(t.CNY,'CNY','ko'):null].filter(Boolean).join(' + ');
// Suggested refund: the part of this order's days still ahead, at most what is left of it (rounded down to 10원).
// 법령에 따른 환불 (5단계 A-10, decision Q-2, 이용약관 제8조): 결제 금액 − 이용한 날 × 기본 요금(30일 10,000원 · 50元)
// ÷ 30 (원·0.01元 미만 버림) − 결제 금액의 10%, 0보다 적으면 0. usedDays: that payment's days already used.
export const legalBase={KRW:10000,CNY:5000};
export function legalRefund(order,usedDays){
 const cur=order.currency==='CNY'?'CNY':'KRW',used=Math.max(0,Math.min(usedDays,order.durationDays)),usedMinor=Math.floor(used*legalBase[cur]/30),fee=Math.round(order.amountMinor/10);
 return {used,usedMinor,fee,amount:Math.max(0,Math.min(order.refundableMinor,order.amountMinor-usedMinor-fee))};
}
export function suggestRefund(order,remainingDays){
 if(!order||!(order.durationDays>0))return 0;const days=Math.min(Math.max(0,remainingDays),order.durationDays);
 return Math.min(order.refundableMinor,Math.floor(order.amountMinor*days/order.durationDays/10)*10);
}
// By reason and scope: a duplicate or mistaken payment, or refunding one payment alone, is the whole of what is
// left of it; any other company-side reason is the part of its days still ahead.
export function suggestedAmount(order,remainingDays,reason,scope){
 if(!order)return 0;if(scope==='payment'||reason==='company_error')return order.refundableMinor;return suggestRefund(order,remainingDays);
}
export function validPassEnd(d){
 return !!d&&d.simulation===true&&typeof d.active==='boolean'&&Number.isSafeInteger(d.remainingDays)&&Array.isArray(d.orders)&&Array.isArray(d.endings)&&Array.isArray(d.reasons)&&
  d.orders.every(o=>typeof o.id==='string'&&[o.amountMinor,o.refundableMinor,o.durationDays].every(Number.isSafeInteger))&&d.reasons.every(r=>Object.hasOwn(refundReasonText,r));
}
export function mountPassEnd({root,enabled=false,load,submit,hold=null,convert=null,rekey=null,onChanged=()=>{},onAuthLoss=()=>{}}){
 const doc=root.ownerDocument;let data,failed=false,busy=false,stopped=false,seq=0,ask=null,notice=null;
 // The scope starts empty (1단계, A-7): the administrator picks one before anything else.
 let form={orderId:null,amount:null,amountTouched:false,reason:'',scope:'',note:'',holdNote:'',holdReason:'',parts:{}};
 root.hidden=!enabled;root.setAttribute('translate','no');root.classList?.add('wallet-card');
 const node=(tag,value,cls,parent)=>{const n=doc.createElement(tag);if(value!==undefined)n.textContent=value;if(cls)n.className=cls;if(parent)parent.append(n);return n;};
 const button=(label,cls,parent,action,disabled=false)=>{const b=node('button',label,cls,parent);b.type='button';b.disabled=busy||disabled;b.onclick=action;return b;};
 function say(where,text,kind='info'){notice={where,text,kind};}
 function draw(){if(stopped)return;root.replaceChildren();const head=node('div',undefined,'wallet-head',root);node('h2','이용권 종료·환불',undefined,head);
  button('새로 확인','button secondary wallet-refresh',head,()=>{ask=null;void reload();});
  if(failed||(data!==undefined&&!validPassEnd(data))){node('p','종료 정보를 불러오지 못했어요','wallet-loading',root);return;}
  if(data===undefined){node('p','확인하고 있어요','wallet-loading',root);return;}
  const facts=node('dl',undefined,'pe-summary',root);
  for(const [label,value] of [['이용 상태',data.active?'이용 중 · '+data.remainingDays+'일 남음':'이용 중인 이용권 없음'],['종료 예정',data.expiresAt?kst(data.expiresAt):'—']]){const row=node('div',undefined,'pe-stat',facts);node('dt',label,undefined,row);node('dd',value,undefined,row);}
  if(data.blocked)node('p',blockedText[data.blocked]??'지금은 처리할 수 없어요','pe-blocked',root);
  const card=(title,help,cls='')=>{const c=node('section',undefined,'pe-card'+(cls?' '+cls:''),root),h=node('header',undefined,'pe-card-head',c);node('h3',title,undefined,h);if(help)node('p',help,'pe-help',h);return c;};
  const cell=(parent,label,wide=false,optional=false)=>{const l=node('label',undefined,wide?'pe-field pe-wide':'pe-field',parent),t=node('span',label,'pe-label',l);if(optional)node('em','선택',undefined,t);return l;};
  // The card footer: the action button, or in its place the in-place confirmation, and the result right below.
  const foot=(parent,where,{label,cls='button',disabled=false,summary,confirm='확정',danger=true,run,extra,ready})=>{
   const f=node('footer',undefined,'pe-foot',parent);
   if(ask===where){const box=node('div',undefined,'pe-confirm',f);box.setAttribute('role','group');node('p',summary(),'pe-confirm-text',box);if(extra)extra(box);
    const row=node('div',undefined,'pe-confirm-actions',box);button(confirm,danger?'button pe-danger':'button',row,()=>void run(),ready?!ready():false);button('취소','button secondary',row,()=>{ask=null;draw();});}
   else button(label,cls,f,()=>{ask=where;notice=null;draw();},disabled);
   if(notice?.where===where){const p=node('p',notice.text,'pe-result',f);p.setAttribute('role','status');p.setAttribute('data-kind',notice.kind);}
   return f;};
  const account=['suspended','closing','closed'].includes(data.account?.state)?data.account.state:null;
  if(account){const p=node('p',accountNotice[account],'pe-blocked pe-account',root);p.setAttribute('data-state',account);}
  // Refund.
  const refund=card('환불','단순 변심은 환불하지 않아요 (환불정책) · 회사 사정이나 법령에 따른 경우만 환불해요 · 여기서는 환불을 기록하고, 돈은 담당자가 직접 돌려드려요 (계좌이체는 고객이 알려 준 본인 계좌로, 위챗페이·알리페이는 결제한 계정으로 · 3영업일 안)','pe-refund');
  const plans=data.orders.filter(o=>o.purpose!=='monthly_topup'),topups=data.orders.filter(o=>o.purpose==='monthly_topup'&&o.refundableMinor>0&&o.refundedMinor===0);
  const alone=[...plans.filter(o=>o.refundableMinor>0&&o.shortenable),...topups];
  let parts=data.active?refundParts(data.orders,data.remainingDays):[];if(data.refundAll===false)parts=parts.slice(0,1);
  const refundUsable=!data.blocked&&(alone.length>0||parts.length>0);
  if(!refundUsable&&!data.blocked&&!plans.some(o=>o.refundableMinor>0)&&!topups.length){node('p','환불할 수 있는 결제가 없어요','pe-help',refund);if(notice?.where==='refund'){const p=node('p',notice.text,'pe-result',refund);p.setAttribute('role','status');p.setAttribute('data-kind',notice.kind);}}
  else{
   const grid=node('div',undefined,'pe-grid',refund),lock=busy||!refundUsable||!!ask;
   if(form.scope==='payment'&&!alone.length)form.scope='';if(form.scope==='end'&&!parts.length)form.scope='';
   // Scope first: this payment alone (a plan payment's days come off the end, a top-up's data off this month) or
   // every payment the days ahead run on, and the pass ends now.
   const scope=node('fieldset',undefined,'pe-scope pe-wide',grid);node('legend','환불 범위',undefined,scope);
   const daysAll=parts.reduce((n,p)=>n+p.days,0);
   for(const [value,title,sub,ok] of [['payment','이 결제만 환불',alone.length?'고른 결제 1건만 돌려줘요 · 이용권 결제는 그 기간만큼 줄고, 데이터 추가는 이번 달 데이터가 줄어요':'따로 환불할 수 있는 결제가 없어요 (남은 기간이 결제 기간보다 짧거나 이미 환불됨)',alone.length>0],
    ['end','환불하고 이용권 지금 종료',parts.length?'남은 '+data.remainingDays+'일이 걸친 결제 '+parts.length+'건을 모두 돌려주고 이용권을 바로 끝내요 · 같은 키로 나중에 다시 결제할 수 있어요':'남은 기간에 걸친 결제가 없어요',parts.length>0]]){
    const l=node('label',undefined,'pe-option'+(ok?'':' pe-option-off'),scope),r=node('input',undefined,undefined,l);r.type='radio';r.name='pe-scope';r.value=value;r.checked=form.scope===value;r.disabled=lock||!ok;
    const t=node('span',undefined,undefined,l);node('strong',title,undefined,t);node('span',sub,'pe-option-sub',t);r.onchange=()=>{form.scope=value;form.amountTouched=false;draw();};}
   const reason=node('select',undefined,undefined,cell(grid,'환불 사유'));
   const blank=node('option','사유를 고르세요',undefined,reason);blank.value='';blank.selected=!form.reason;
   for(const r of data.reasons){const opt=node('option',refundReasonText[r],undefined,reason);opt.value=r;opt.selected=r===form.reason;}
   reason.disabled=lock;reason.onchange=()=>{const legalChanged=(form.reason==='legal')!==(reason.value==='legal');form.reason=reason.value;form.amountTouched=false;if(legalChanged)form.parts={};draw();};
   let valid=false,summary=()=>'',run=()=>undefined,label='환불';
   if(form.scope==='payment'){
    if(!alone.some(o=>o.id===form.orderId)){form.orderId=alone[0].id;form.amountTouched=false;}
    const order=alone.find(o=>o.id===form.orderId),topup=order.purpose==='monthly_topup',w=v=>money(v,order.currency==='CNY'?'CNY':'KRW');
    const pick=node('select',undefined,undefined,cell(grid,'결제',true));
    for(const o of alone){const opt=node('option',productText(o.productCode)+' · '+money(o.amountMinor,o.currency)+' · '+kstDay(o.paidAt)+' 결제'+(o.method?' · '+(methodText[o.method]??o.method):'')+' · 환불 '+money(o.refundableMinor,o.currency),undefined,pick);opt.value=o.id;opt.selected=o.id===form.orderId;}
    pick.disabled=lock;pick.onchange=()=>{form.orderId=pick.value;form.amountTouched=false;draw();};
    const left=data.remainingDays-order.durationDays,newEnd=data.expiresAt?kstDay(new Date(Date.parse(data.expiresAt)-order.durationDays*86400000).toISOString()):'—';
    const effect=topup?(order.topup==='current'&&data.active?'이번 달 데이터가 '+gb(order.dataBytes)+' 줄어요':order.topup==='past'?'지난달에 더한 데이터라 데이터는 그대로예요':'데이터에 더해지지 않은 결제라 데이터는 그대로예요'):'이용권은 계속 쓰고 '+order.durationDays+'일이 줄어요 · '+newEnd+'까지 ('+left+'일 남음)';
    node('p',effect,'pe-hint pe-wide',grid);
    const field=cell(grid,'환불 금액'),box=node('span',undefined,'pe-money',field),amount=node('input',undefined,undefined,box);node('span',order.currency==='CNY'?'元':'원','pe-unit',box);
    amount.type='number';amount.value=String(toMajor(order.refundableMinor,order.currency==='CNY'?'CNY':'KRW'));amount.disabled=true;
    node('span','이 결제만 환불할 때는 결제 금액 전부예요','pe-hint',field);
    if(form.reason==='legal')node('p',"법령에 따른 환불은 '환불하고 이용권 지금 종료'로 해요 (사용한 날과 수수료를 빼고 이용권이 끝나요)",'pe-hint pe-wide pe-warn',grid);
    valid=!!form.reason&&form.reason!=='legal';label='이 결제 환불';
    summary=()=>productText(order.productCode)+' ('+kstDay(order.paidAt)+' 결제'+(order.method?' · '+(methodText[order.method]??order.method):'')+') '+w(order.refundableMinor)+' 환불 · '+refundReasonText[form.reason]+' · '+(topup?effect:'이용권은 '+newEnd+'까지로 줄어요')+' · 되돌릴 수 없어요';
    run=()=>endPass('refund',{kind:topup?'refund_topup':'refund_payment',orderId:order.id,amountMinor:order.refundableMinor,reason:form.reason,note:form.note},order.currency==='CNY'?'CNY':'KRW',topup?effect:null);
   }else if(form.scope==='end'){
    // Every payment the days ahead run on, newest first; each amount can be changed (0 leaves that payment out).
    const list=node('div',undefined,'pe-parts pe-wide',grid);node('span','환불할 결제 (최근 결제부터)','pe-label',list);
    const chosen=[];
    const legal=form.reason==='legal';
    for(const p of parts){const o=p.order,cur=o.currency==='CNY'?'CNY':'KRW',l=legal?legalRefund(o,o.durationDays-p.days):null,suggested=l?l.amount:p.suggested;if(!(o.id in form.parts))form.parts[o.id]=suggested;
     const row=node('div',undefined,'pe-part',list),who=node('span',undefined,'pe-part-who',row);node('strong',productText(o.productCode)+' · '+money(o.amountMinor,o.currency),undefined,who);
     node('span',kstDay(o.paidAt)+' 결제'+(o.method?' · '+(methodText[o.method]??o.method):'')+' · 앞으로 '+p.days+'일분 · 제안 '+money(suggested,cur),'pe-hint',who);
     // The sum written out, as in 이용약관 제8조 (5단계 A-10).
     if(l)node('span','사용 '+l.used+'일 × '+money(Math.floor(legalBase[cur]/30),cur)+' = '+money(l.usedMinor,cur)+' · 수수료 10% '+money(l.fee,cur)+' → '+money(o.amountMinor,cur)+' − '+money(l.usedMinor,cur)+' − '+money(l.fee,cur)+' = '+money(l.amount,cur),'pe-hint pe-legal',who);
     const box=node('span',undefined,'pe-money',row),input=node('input',undefined,undefined,box);node('span',cur==='CNY'?'元':'원','pe-unit',box);
     input.type='number';input.min='0';input.max=String(toMajor(o.refundableMinor,cur));input.step=cur==='CNY'?'0.01':'10';input.value=String(toMajor(form.parts[o.id],cur));input.disabled=lock;input.setAttribute('aria-label',productText(o.productCode)+' '+kstDay(o.paidAt)+' 결제 환불 금액');
     input.oninput=()=>{form.parts[o.id]=toMinor(input.value,cur);};input.onchange=()=>draw();
     chosen.push({order:o,amount:Math.trunc(Number(form.parts[o.id]))});}
    const picked=chosen.filter(x=>x.amount>0),sum=totals(picked.map(x=>({currency:x.order.currency,amount:x.amount})));
    const ok=chosen.every(x=>Number.isSafeInteger(x.amount)&&x.amount>=0&&x.amount<=x.order.refundableMinor)&&picked.length>0;
    const line='남은 '+data.remainingDays+'일 · 결제 '+picked.length+'건 · 환불 합계 '+totalText(sum);
    node('p',ok?line:'금액을 확인해 주세요 · 결제마다 0부터 그 결제의 남은 금액까지예요','pe-total',list).setAttribute('data-ok',String(ok));
    valid=!!form.reason&&ok;label='환불하고 종료';
    summary=()=>line+' · '+refundReasonText[form.reason]+' · 이용권이 지금 끝나요 · 되돌릴 수 없어요';
    run=()=>{const body=picked.length===1?{kind:'refund',orderId:picked[0].order.id,amountMinor:picked[0].amount}:{kind:'refund',parts:picked.map(x=>({orderId:x.order.id,amountMinor:x.amount}))};
     return endPass('refund',{...body,reason:form.reason,note:form.note},null,null,totalText(sum));};
   }else node('p','환불 범위를 먼저 고르세요','pe-hint pe-wide',grid);
   const note=node('input',undefined,undefined,cell(grid,'메모',false,true));note.type='text';note.maxLength=500;note.value=form.note;note.placeholder='고객에게 안내한 내용 등';note.disabled=lock;note.oninput=()=>{form.note=note.value;};
   foot(refund,'refund',{label,cls:'button pe-danger',disabled:!refundUsable||!valid,confirm:form.scope==='end'?'환불하고 끝내기':'환불하기',summary,run});
  }
  // Test server: end now without money.
  if(data.testEnd&&!account){
   const test=card('기간 즉시 종료','시험 서버 전용 · 돈은 오가지 않아요 · 끝낸 뒤 고객 화면에서 기간 연장으로 같은 키 재개를 시험할 수 있어요','pe-test');
   node('span','시험','pe-badge',test.firstChild?.firstChild);
   foot(test,'test',{label:'지금 종료',confirm:'지금 끝내기',cls:'button secondary',disabled:!data.active||!!data.blocked,summary:()=>'이 고객의 이용권을 지금 끝내요 · 시험이라 돈은 오가지 않아요',run:()=>endPass('test',{kind:'test_end',reason:'test'})});
  }
  // Real key: pause (asks first, the customer is cut off at once) or open.
  // Test server: a simulated key with a running pass becomes a real key on the VPN server (named by login ID).
  if(convert&&data.realKey?.convertible===true&&!account){
   const box=card('실제 키로 바꾸기','시험 서버 전용 · 지금 이용권의 종료일과 데이터 그대로 VPN 서버에 실제 키를 만들어요 · 키 이름은 고객의 로그인 ID예요','pe-convert');
   foot(box,'convert',{label:'실제 키 만들기',confirm:'만들기',cls:'button secondary',danger:false,summary:()=>'이 고객의 시험용 키 대신 VPN 서버에 실제 키를 만들어요 · 고객 화면에 실제 접속 키가 바로 보여요 · 되돌릴 수 없어요',run:()=>changeKind()});
  }
  // Test server (2026-11-07): a key made with a text id cannot show this month's usage on the VPN server, so the monthly
  // cap is not measured. It is replaced by a numbered key with the same limit and name; the old key stops working.
  if(rekey&&data.realKey?.rekeyable===true&&!account){
   const box=card('키 새로 만들기','시험 서버 전용 · 이번 달 사용량을 잴 수 있는 새 키로 바꿔요 · 데이터 한도와 키 이름은 그대로예요','pe-rekey');
   foot(box,'rekey',{label:'새 키로 바꾸기',confirm:'바꾸기',cls:'button secondary',danger:false,summary:()=>'지금 키는 바로 끊기고 새 접속 키가 만들어져요 · 고객이 내 키 화면에서 새 키를 다시 넣어야 해요',run:()=>changeKey()});
  }
  const real=data.realKey;
  if(hold&&real&&real.state==='succeeded'){
   const box=card('키 멈춤',real.hold?'멈춤 · '+real.hold.by+' · '+kst(real.hold.at)+(real.hold.note?' · '+real.hold.note:''):'고객 키의 데이터 한도를 0으로 두어 접속을 멈춰요 · 다시 열면 이번 달 한도로 돌아가요','pe-hold');
   // A suspended or closed account's key opens only with 정지 해제·탈퇴 취소 (decision Q-4); opening asks first.
   if(account)node('p',account==='suspended'?'정지를 풀면 키도 함께 열려요':account==='closing'?'탈퇴를 취소하면 키도 함께 열려요':'탈퇴한 계정의 키는 열 수 없어요','pe-help',box);
   else if(real.hold)foot(box,'hold',{label:'다시 열기',cls:'button',danger:false,confirm:'다시 열기',summary:()=>'키를 다시 열까요? 고객이 바로 접속할 수 있어요',run:()=>changeHold({action:'release'})});
   // 4단계 (A-16): the same rule as the 고객 screen — a reason first, the button says what it does.
   else foot(box,'hold',{label:'키 멈춤',cls:'button secondary',disabled:!data.active,confirm:'멈추기',summary:()=>'이 고객의 키를 지금 멈춰요 · 고객의 접속이 바로 끊겨요',
    extra:parent=>{const l=node('label',undefined,'pe-field',parent);node('span','멈춤 사유','pe-label',l);const sel=node('select',undefined,undefined,l);const o0=node('option','멈춤 사유를 고르세요',undefined,sel);o0.value='';
     for(const [k,v] of Object.entries(holdReasonText)){const o=node('option',v,undefined,sel);o.value=k;o.selected=k===form.holdReason;}sel.disabled=busy;sel.onchange=()=>{form.holdReason=sel.value;draw();};
     const l2=node('label',undefined,'pe-field',parent);node('span','메모 (선택)','pe-label',l2);const note=node('input',undefined,undefined,l2);note.type='text';note.maxLength=150;note.value=form.holdNote;note.disabled=busy;note.oninput=()=>{form.holdNote=note.value;};},
    ready:()=>!!form.holdReason,run:()=>changeHold({action:'hold',note:holdReasonText[form.holdReason]+(form.holdNote.trim()?' · '+form.holdNote.trim():'')})});
  }
  if(data.endings.length){const list=node('ul',undefined,'pass-end-history',root);
   for(const e of data.endings)node('li',kst(e.endedAt)+' · '+(kindText[e.kind]??e.kind)+(e.orderId?' · '+(e.productCode?productText(e.productCode)+' ':'')+money(e.amountMinor,e.currency)+' · '+(refundReasonText[e.reason]??e.reason):'')+' · '+(e.by==='system:account-close'?'자동':e.by)+(e.note?' · '+e.note:''),undefined,list);}
  if(notice?.where==='general'){const status=node('p',notice.text,'pass-end-message',root);status.setAttribute('role','status');status.setAttribute('data-kind',notice.kind);}
 }
 function fail(where,e){if([401,403].includes(e?.status)&&e?.reason!=='csrf-required'){dispose();onAuthLoss();return true;}say(where,errorText[e?.reason]??'처리하지 못했어요 · 새로 확인해 주세요','error');return false;}
 async function endPass(where,input,currency='KRW',effect=null,total=null){if(busy||stopped)return;busy=true;say(where,'처리하고 있어요');draw();
  try{const result=await submit({requestId:crypto.randomUUID(),...input});
   const ok=result.fulfillment==='succeeded',amount=total??money(input.amountMinor,currency??'KRW');
   say(where,ok?(input.kind==='refund'?(input.parts?'환불 합계 ':'')+amount+' 환불로 기록하고 이용권을 종료했어요':input.kind==='refund_payment'?amount+' 환불로 기록하고 이용 기간을 줄였어요':input.kind==='refund_topup'?amount+' 환불로 기록했어요 · '+String(effect).replace(/줄어요$/,'줄었어요'):'이용권을 지금 종료했어요')
    :result.fulfillment==='needs_review'?'반영하지 못해 확인이 필요해요 · 결제 처리 상태를 확인해 주세요':'반영하고 있어요 · 잠시 후 새로 확인해 주세요',ok?'success':'error');
   form={...form,reason:'',note:'',amountTouched:false,scope:'',parts:{}};ask=null;onChanged();}
  catch(e){ask=null;if(fail(where,e))return;}finally{busy=false;}await reload(false);}
 async function changeKind(){if(busy||stopped||!convert)return;busy=true;say('convert','처리하고 있어요');draw();
  try{await convert();say('general','실제 키를 만들었어요 · 고객 화면에서 실제 접속 키가 보여요','success');ask=null;onChanged();}
  catch(e){ask=null;if([401,403].includes(e?.status)&&e?.reason!=='csrf-required'){dispose();onAuthLoss();return;}say('convert',convertErrors[e?.reason]??errorText[e?.reason]??'처리하지 못했어요 · 새로 확인해 주세요','error');}finally{busy=false;}await reload(false);}
 async function changeKey(){if(busy||stopped||!rekey)return;busy=true;say('rekey','처리하고 있어요');draw();
  try{const r=await rekey();say('general',r?.already?'이미 새 키예요':'새 키로 바꿨어요 · 고객이 내 키 화면에서 새 접속 키를 다시 넣어야 해요','success');ask=null;onChanged();}
  catch(e){ask=null;if(fail('rekey',e))return;}finally{busy=false;}await reload(false);}
 async function changeHold(input){if(busy||stopped||!hold)return;busy=true;say('hold','처리하고 있어요');draw();
  try{const result=await hold(input);say('hold',input.action==='hold'?'키를 멈췄어요':result.reopened?'키를 다시 열었어요 · 고객이 바로 접속할 수 있어요':'멈춤을 풀었어요 · 이용 기간이 끝난 키는 닫힌 채로 둬요','success');form.holdNote='';form.holdReason='';ask=null;onChanged();}
  catch(e){ask=null;if(fail('hold',e))return;}finally{busy=false;}await reload(false);}
 async function reload(clear=true){if(stopped||!enabled)return;const current=++seq;if(clear)notice=null;
  try{const result=await load();if(stopped||seq!==current)return;data=result;failed=false;draw();}
  catch(e){if(stopped||seq!==current)return;if([401,403].includes(e.status)){dispose();onAuthLoss();return;}if(e.status===404){dispose();return;}failed=true;draw();}}
 function dispose(){stopped=true;seq++;root.replaceChildren();root.hidden=true;}
 if(enabled){draw();void reload();}
 return {refresh:reload,dispose};
}
