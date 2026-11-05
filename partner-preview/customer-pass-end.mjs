// Administrator card (test site): end the selected customer's pass now, and pause or open a real key.
// Refunds are for company-side reasons only (refund policy: no refund for a simple change of mind) and end the
// pass at once on the same key. Mock payments: the refund amount is recorded, no money moves until a real PG.
// "기간 즉시 종료 (시험)" is the test server's instant end (no money) for trying a renewal on the same key.
export const refundReasonText={service_outage:'서비스 장애로 오래 이용하지 못함',service_stopped:'서비스 운영 중단',company_error:'회사 실수 (중복·잘못된 결제 등)',company_other:'기타 회사 사정'};
const kindText={refund:'환불 후 종료',test_end:'기간 즉시 종료 (시험)'};
const blockedText={'review-required':'확인 중인 결제가 있어 지금은 종료할 수 없어요','processing':'반영 중인 결제가 있어요 · 잠시 후 다시 확인해 주세요','real-key-unavailable':'VPN 서버에 연결할 수 없어 지금은 종료할 수 없어요'};
const errorText={'refund-exceeds-payment':'환불 금액이 이 결제의 남은 금액보다 커요','refund-not-allowed':'단순 변심은 환불하지 않아요','active-pass-required':'이용 중인 이용권이 없어요','refund-order-not-found':'결제를 찾지 못했어요 · 새로 확인해 주세요','request-conflict':'같은 요청이 다른 내용으로 접수됐어요 · 새로 확인해 주세요','csrf-required':'화면을 새로 고친 뒤 다시 시도해 주세요','pass-ended':'이용 기간이 끝난 키예요','customer-key-not-ready':'키가 아직 준비되지 않았어요','test-end-disabled':'시험 서버에서만 쓸 수 있어요',...blockedText};
const won=n=>Number(n).toLocaleString('ko-KR')+'원';
const kst=value=>{const t=Date.parse(value);return Number.isFinite(t)?new Date(t+9*3600000).toISOString().slice(0,16).replace('T',' '):'—';};
const productText=code=>/^pass-(\d+)$/.test(code)?code.slice(5)+'일 이용권':code;
// Suggested refund: the remaining days of this order's length, at most what is left of it (rounded down to 10원).
export function suggestRefund(order,remainingDays){
 if(!order||!(order.durationDays>0))return 0;const days=Math.min(Math.max(0,remainingDays),order.durationDays);
 return Math.min(order.refundableMinor,Math.floor(order.amountMinor*days/order.durationDays/10)*10);
}
export function validPassEnd(d){
 return !!d&&d.simulation===true&&typeof d.active==='boolean'&&Number.isSafeInteger(d.remainingDays)&&Array.isArray(d.orders)&&Array.isArray(d.endings)&&Array.isArray(d.reasons)&&
  d.orders.every(o=>typeof o.id==='string'&&[o.amountMinor,o.refundableMinor,o.durationDays].every(Number.isSafeInteger))&&d.reasons.every(r=>Object.hasOwn(refundReasonText,r));
}
export function mountPassEnd({root,enabled=false,load,submit,hold=null,onChanged=()=>{},onAuthLoss=()=>{}}){
 const doc=root.ownerDocument;let data,failed=false,busy=false,message='',messageKind='info',stopped=false,seq=0;
 let form={orderId:null,amount:null,reason:'service_outage',note:'',confirmed:false,testConfirmed:false,holdNote:''};
 root.hidden=!enabled;root.setAttribute('translate','no');root.classList?.add('wallet-card');
 const node=(tag,value,cls,parent)=>{const n=doc.createElement(tag);if(value!==undefined)n.textContent=value;if(cls)n.className=cls;if(parent)parent.append(n);return n;};
 const button=(label,cls,parent,action,disabled=false)=>{const b=node('button',label,cls,parent);b.type='button';b.disabled=busy||disabled;b.onclick=action;return b;};
 const field=(label,parent)=>{const wrap=node('label',undefined,'field',parent);node('span',label,undefined,wrap);return wrap;};
 function say(text,kind='info'){message=text;messageKind=kind;}
 function draw(){if(stopped)return;root.replaceChildren();const head=node('div',undefined,'wallet-head',root);node('h2','이용권 종료·환불',undefined,head);
  button('새로 확인','button secondary wallet-refresh',head,()=>void reload());
  if(failed||(data!==undefined&&!validPassEnd(data))){node('p','종료 정보를 불러오지 못했어요','wallet-loading',root);return;}
  if(data===undefined){node('p','확인하고 있어요','wallet-loading',root);return;}
  const facts=node('dl',undefined,'wallet-facts',root);
  for(const [label,value] of [['이용 상태',data.active?'이용 중 · '+data.remainingDays+'일 남음':'이용 중인 이용권 없음'],['종료 예정',data.expiresAt?kst(data.expiresAt):'—']]){const row=node('div',undefined,'wallet-fact',facts);node('dt',label,undefined,row);node('dd',value,undefined,row);}
  if(data.blocked)node('p',blockedText[data.blocked]??'지금은 종료할 수 없어요','wallet-loading',root);
  const usable=data.active&&!data.blocked;
  // Refund, then end the pass.
  const refund=node('fieldset',undefined,'order-group pass-end-refund',root);node('legend','환불 후 종료',undefined,refund);
  node('p','단순 변심은 환불하지 않아요 (환불정책). 회사 사정일 때만 환불하고 이용권은 바로 끝나요 · 시험 결제라 실제 돈은 오가지 않아요','wallet-loading',refund);
  const refundable=data.orders.filter(o=>o.refundableMinor>0);
  if(!refundable.length)node('p','환불할 수 있는 결제가 없어요','wallet-loading',refund);
  else{
   if(!refundable.some(o=>o.id===form.orderId)){form.orderId=refundable[0].id;form.amount=suggestRefund(refundable[0],data.remainingDays);}
   const order=refundable.find(o=>o.id===form.orderId);
   const pick=node('select',undefined,undefined,field('결제',refund));
   for(const o of refundable){const opt=node('option',productText(o.productCode)+' · '+won(o.amountMinor)+' · '+kst(o.paidAt)+' · 환불 가능 '+won(o.refundableMinor),undefined,pick);opt.value=o.id;opt.selected=o.id===form.orderId;}
   pick.disabled=busy||!usable;pick.onchange=()=>{const o=refundable.find(x=>x.id===pick.value);form.orderId=o?.id??null;form.amount=suggestRefund(o,data.remainingDays);draw();};
   const amount=node('input',undefined,undefined,field('환불 금액 (원)',refund));amount.type='number';amount.min='1';amount.max=String(order.refundableMinor);amount.step='10';amount.value=String(form.amount??0);amount.disabled=busy||!usable;
   amount.oninput=()=>{form.amount=Number(amount.value);};
   node('p','남은 '+Math.min(data.remainingDays,order.durationDays)+'일 기준 제안 금액 '+won(suggestRefund(order,data.remainingDays))+' · 최대 '+won(order.refundableMinor),'wallet-loading',refund);
   const reason=node('select',undefined,undefined,field('환불 사유 (회사 사정)',refund));
   for(const r of data.reasons){const opt=node('option',refundReasonText[r],undefined,reason);opt.value=r;opt.selected=r===form.reason;}
   reason.disabled=busy||!usable;reason.onchange=()=>{form.reason=reason.value;};
   const note=node('input',undefined,undefined,field('메모 (선택)',refund));note.type='text';note.maxLength=500;note.value=form.note;note.disabled=busy||!usable;note.oninput=()=>{form.note=note.value;};
   const check=node('label',undefined,'pass-end-confirm',refund);const box=node('input',undefined,undefined,check);box.type='checkbox';box.checked=form.confirmed;box.disabled=busy||!usable;node('span','단순 변심이 아니라 회사 사정이고, 고객에게 안내했어요',undefined,check);
   box.onchange=()=>{form.confirmed=box.checked;draw();};
   button('환불하고 이용권 종료','button',refund,()=>void endPass({kind:'refund',orderId:form.orderId,amountMinor:Math.trunc(Number(form.amount)),reason:form.reason,note:form.note}),!usable||!form.confirmed||!(Number(form.amount)>=1)||Number(form.amount)>order.refundableMinor);
  }
  // Test server: end now without money.
  if(data.testEnd){
   const test=node('fieldset',undefined,'order-group pass-end-test',root);node('legend','기간 즉시 종료 (시험)',undefined,test);
   node('p','시험 서버 전용 · 돈은 오가지 않아요 · 끝낸 뒤 고객 화면에서 기간 연장으로 같은 키 재개를 시험할 수 있어요','wallet-loading',test);
   const check=node('label',undefined,'pass-end-confirm',test);const box=node('input',undefined,undefined,check);box.type='checkbox';box.checked=form.testConfirmed;box.disabled=busy||!usable;node('span','이 고객의 이용권을 지금 끝낼게요',undefined,check);
   box.onchange=()=>{form.testConfirmed=box.checked;draw();};
   button('지금 종료','button secondary',test,()=>void endPass({kind:'test_end',reason:'test'}),!usable||!form.testConfirmed);
  }
  // Real key: pause or open.
  const real=data.realKey;
  if(hold&&real&&real.state==='succeeded'){
   const box=node('fieldset',undefined,'order-group pass-end-hold',root);node('legend','실제 키 멈춤',undefined,box);
   if(real.hold){node('p','멈춤 · '+real.hold.by+' · '+kst(real.hold.at)+(real.hold.note?' · '+real.hold.note:''),'wallet-loading',box);button('다시 열기','button',box,()=>void changeHold({action:'release'}));}
   else{node('p','고객 키의 데이터 한도를 0으로 두어 접속을 멈춰요 · 다시 열면 이번 달 한도로 돌아가요','wallet-loading',box);
    const note=node('input',undefined,undefined,field('멈춤 사유 (선택)',box));note.type='text';note.maxLength=200;note.value=form.holdNote;note.disabled=busy;note.oninput=()=>{form.holdNote=note.value;};
    button('키 멈춤','button secondary',box,()=>void changeHold({action:'hold',note:form.holdNote}),!data.active);}
  }
  if(data.endings.length){const list=node('ul',undefined,'pass-end-history',root);
   for(const e of data.endings)node('li',kst(e.endedAt)+' · '+(kindText[e.kind]??e.kind)+(e.kind==='refund'?' · '+won(e.amountMinor)+' · '+(refundReasonText[e.reason]??e.reason):'')+' · '+e.by+(e.note?' · '+e.note:''),undefined,list);}
  const status=node('p',message,'pass-end-message',root);status.setAttribute('role','status');status.setAttribute('data-kind',messageKind);
 }
 function fail(e){if([401,403].includes(e?.status)&&e?.reason!=='csrf-required'){dispose();onAuthLoss();return true;}say(errorText[e?.reason]??'처리하지 못했어요 · 새로 확인해 주세요','error');return false;}
 async function endPass(input){if(busy||stopped)return;busy=true;say('처리하고 있어요');draw();
  try{const result=await submit({requestId:crypto.randomUUID(),...input});
   say(result.fulfillment==='succeeded'?(input.kind==='refund'?won(input.amountMinor)+' 환불로 기록하고 이용권을 종료했어요 (시험: 실제 돈은 오가지 않아요)':'이용권을 지금 종료했어요'):result.fulfillment==='needs_review'?'종료를 반영하지 못해 확인이 필요해요 · 결제 처리 상태를 확인해 주세요':'종료를 반영하고 있어요',result.fulfillment==='succeeded'?'info':'error');
   form={...form,confirmed:false,testConfirmed:false,note:''};onChanged();}
  catch(e){if(fail(e))return;}finally{busy=false;}await reload(false);}
 async function changeHold(input){if(busy||stopped||!hold)return;busy=true;say('처리하고 있어요');draw();
  try{const result=await hold(input);say(input.action==='hold'?'키를 멈췄어요':result.reopened?'키를 다시 열었어요':'멈춤을 풀었어요 · 이용 기간이 끝난 키는 닫힌 채로 둬요');form.holdNote='';onChanged();}
  catch(e){if(fail(e))return;}finally{busy=false;}await reload(false);}
 async function reload(clear=true){if(stopped||!enabled)return;const current=++seq;if(clear)message='';
  try{const result=await load();if(stopped||seq!==current)return;data=result;failed=false;draw();}
  catch(e){if(stopped||seq!==current)return;if([401,403].includes(e.status)){dispose();onAuthLoss();return;}if(e.status===404){dispose();return;}failed=true;draw();}}
 function dispose(){stopped=true;seq++;root.replaceChildren();root.hidden=true;}
 if(enabled){draw();void reload();}
 return {refresh:reload,dispose};
}
