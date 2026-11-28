import {formatMoney} from './customer-money.mjs';
// 결제·이용권 → 입금 확인 · 받는 계좌·QR (2026-11-24, 담당자 입금 확인 결제, draft 075).
// - 입금 확인: orders waiting for a deposit, the ones whose customer pressed '입금했어요' first. A staff member checks the
//   bank / WeChat / Alipay record (amount and the 4-digit order number in the depositor name or note) and confirms; the
//   pass and key follow at once and the customer's 1:1 thread gets the confirmation. Two steps, no browser dialog.
// - 받는 계좌·QR: what the customer's order screen shows for each method; only methods switched on can be chosen.
const methodName={bank_transfer:'계좌이체',wechat_pay:'위챗페이',alipay:'알리페이',kakao_pay:'카카오페이'};
// What the customer gave with '입금했어요': the depositor name (bank) or the WeChat / Alipay ID they paid with.
const payerLabel=m=>m==='wechat_pay'?'위챗 아이디':m==='alipay'?'알리페이 아이디':'입금자명';
const when=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});};
const errors={'payment-order-not-found':'신청을 찾지 못했어요 · 목록을 새로 확인해 주세요','order-outdated':'고객의 이용권 상태가 바뀌어 이 신청은 그대로 반영할 수 없어요 · 고객 화면에서 기간 조정이나 환불로 처리해 주세요','payment-verification-failed':'반영을 시작하지 못했어요 · 잠시 후 다시 눌러 주세요',
 'receiving-incomplete':'켜려면 필요한 칸을 모두 채워 주세요 (계좌이체: 은행·계좌번호·예금주 / 위챗·알리: QR 이미지)','receiving-account-number':'계좌번호는 숫자와 - 만 써 주세요','receiving-qr-image':'QR 이미지를 읽지 못했어요 · PNG·JPG 파일로 다시 올려 주세요','manual-payment-unavailable':'입금 확인 기능이 아직 서버에 준비되지 않았어요','csrf-required':'페이지를 새로 고친 뒤 다시 시도해 주세요'};
const errorText=e=>errors[e?.reason]??'처리하지 못했어요 · 잠시 후 다시 시도해 주세요';
export function mountPaymentDeposits({depositsRoot,receivingRoot,load,confirm,loadReceiving,saveReceiving,onSelectCustomer=()=>{},onAuthLoss=()=>{}}){
 const doc=depositsRoot.ownerDocument;let stopped=false,visible=true,data=null,failed=false,asking=null,busy=null,note=null,accounts=null,receivingFailed=false,drafts={},saved={},receivingBusy=null;
 const make=(tag,value,cls,parent)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(value!==undefined&&value!==null)n.textContent=value;parent?.append(n);return n;};
 const button=(label,cls,parent,action)=>{const b=make('button',label,cls,parent);b.type='button';b.onclick=action;return b;};
 const lost=e=>{if(e?.status===401||e?.status===403&&e?.reason==='administrator-required'){dispose();onAuthLoss();return true;}return false;};
 function who(x){const c=x.customer;return c?[c.nickname??c.loginId??'고객',c.loginId&&c.nickname?c.loginId:null,c.email].filter(Boolean).join(' · '):'고객 '+String(x.customerId).slice(0,8);}
 function drawDeposits(){
  if(stopped)return;depositsRoot.hidden=!visible;depositsRoot.replaceChildren();const head=make('div',undefined,'dp-head',depositsRoot),title=make('div',undefined,undefined,head);make('h2','입금 확인',undefined,title);
  make('p',"고객이 '입금했어요'를 누른 신청이 위에 있어요. 통장 내역은 금액과 입금자명(주문 번호), 위챗·알리 내역은 금액과 고객이 적은 아이디(메모가 있으면 주문 번호)로 확인한 뒤 입금 확인을 눌러 주세요. 이용권 반영과 키 발급이 바로 진행되고, 고객의 1:1 문의에 확인 답변이 남아요.",'dp-intro',title);
  button('새로 확인','button secondary dp-refresh',head,()=>void refresh());
  if(note){const n=make('p',note.text,'dp-note',depositsRoot);n.setAttribute('role',note.kind==='error'?'alert':'status');n.setAttribute('data-kind',note.kind);}
  if(!data){make('p',failed?'입금 대기 목록을 불러오지 못했어요':'입금 대기 목록을 불러오고 있어요','dp-empty',depositsRoot);return;}
  if(!data.available){make('p','입금 확인 기능이 아직 서버에 준비되지 않았어요','dp-empty',depositsRoot);return;}
  if(!data.methods?.length)make('p','켜 둔 결제 수단이 없어 고객이 이용권을 신청할 수 없어요 · 아래 받는 계좌·QR에서 먼저 켜 주세요','dp-note',depositsRoot).setAttribute('data-kind','error');
  const waiting=data.waiting??[];
  if(!waiting.length)make('p','입금을 기다리는 신청이 없어요','dp-empty',depositsRoot);
  const list=make('ul',undefined,'dp-list',depositsRoot);
  for(const x of waiting){
   const li=make('li',undefined,'dp-item',list);li.setAttribute('data-notice',String(!!x.deposit));
   const top=make('div',undefined,'dp-top',li);make('strong','주문 '+x.reference,'dp-ref',top);
   const chip=make('span',x.deposit?'입금 알림 · '+when(x.deposit.at):'입금 알림 없음','dp-chip',top);chip.setAttribute('data-kind',x.deposit?'notice':'none');
   if(x.late)make('span','72시간 지남','dp-chip',top).setAttribute('data-kind','late');
   make('strong',formatMoney(x.amountMinor,x.currency,'ko'),'dp-amount',top);
   const body=make('div',undefined,'dp-body',li);const name=button(who(x),'dp-who',body,()=>onSelectCustomer(x.customerId));name.setAttribute('aria-label',who(x)+' · 고객 결제 화면 열기');
   make('span',x.product+' · '+(methodName[x.method]??x.method)+' · 신청 '+when(x.createdAt),'dp-meta',body);
   if(x.deposit?.payerName)make('span',payerLabel(x.method)+' '+x.deposit.payerName,'dp-payer',body);
   const actions=make('div',undefined,'dp-actions',li);
   if(asking===x.orderId){
    const q=make('p',undefined,'dp-ask',actions);q.textContent=(methodName[x.method]??x.method)+'로 '+formatMoney(x.amountMinor,x.currency,'ko')+'이(가) '+(x.method==='bank_transfer'?'주문 번호 '+x.reference:x.deposit?.payerName?payerLabel(x.method)+' '+x.deposit.payerName:'이 고객')+'(으)로 들어온 걸 확인했나요?';
    const yes=button(busy===x.orderId?'반영하고 있어요':'확인했어요 · 반영','button primary',actions,()=>void doConfirm(x));yes.disabled=!!busy;
    const no=button('취소','button secondary',actions,()=>{asking=null;drawDeposits();});no.disabled=!!busy;
   }else{const b=button('입금 확인','button primary dp-confirm',actions,()=>{asking=x.orderId;note=null;drawDeposits();});b.disabled=!!busy;}
  }
  const recent=data.recent??[];
  if(recent.length){const d=make('details',undefined,'dp-recent',depositsRoot);make('summary','최근 입금 확인 '+recent.length+'건',undefined,d);const ul=make('ul',undefined,undefined,d);
   for(const r of recent){const t=r.detail??{};make('li',when(r.at)+' · 주문 '+(t.reference??'')+' · '+(Number.isSafeInteger(t.amountMinor)?formatMoney(t.amountMinor,t.currency??'KRW','ko'):'')+' · '+(methodName[t.method]??t.method??'')+' · '+(r.customer?.nickname??r.customer?.loginId??'고객')+' · 확인 '+r.by,undefined,ul);}}
 }
 async function refresh(){try{data=await load();failed=false;}catch(e){if(stopped||lost(e))return;failed=true;}if(!stopped)drawDeposits();}
 async function doConfirm(x){if(busy)return;busy=x.orderId;drawDeposits();
  try{const r=await confirm(x.orderId,x.customerId);asking=null;
   note=r?.repeated?{kind:'info',text:'주문 '+x.reference+'은(는) 이미 확인된 신청이에요'}:r?.fulfillment==='succeeded'?{kind:'ok',text:'주문 '+x.reference+' 입금을 확인했어요 · 이용권에 반영됐고 고객에게 1:1 답변을 남겼어요'}:r?.fulfillment==='needs_review'?{kind:'error',text:'주문 '+x.reference+' 입금은 기록했지만 반영 전에 확인이 필요해요 · 고객 결제 화면을 열어 확인해 주세요'}:{kind:'info',text:'주문 '+x.reference+' 입금을 기록했고 반영하고 있어요 · 잠시 후 새로 확인해 주세요'};}
  catch(e){if(stopped||lost(e))return;note={kind:'error',text:'주문 '+x.reference+' · '+errorText(e)};}
  finally{busy=null;}await refresh();}
 // 받는 계좌·QR
 const fields={bank_transfer:[['bankName','은행','예: 하나은행',40],['accountNumber','계좌번호','숫자와 - 만',30],['holder','예금주','통장에 적힌 이름',40]]};
 function draft(m){const a=accounts.find(x=>x.method===m)??{method:m};return drafts[m]??={enabled:!!a.enabled,bankName:a.bankName??'',accountNumber:a.accountNumber??'',holder:a.holder??'',qrImage:a.qrImage??null,note:a.note??''};}
 function drawReceiving(){
  if(stopped||!receivingRoot)return;receivingRoot.hidden=!visible;receivingRoot.replaceChildren();make('h2','받는 계좌·QR',undefined,receivingRoot);
  make('p','고객의 결제 안내 화면에만 나와요 (1:1 문의로는 계좌를 보내지 않아요). 켜 둔 결제 수단만 고객이 고를 수 있어요.','dp-intro',receivingRoot);
  if(!accounts){make('p',receivingFailed?'받는 계좌를 불러오지 못했어요':'받는 계좌를 불러오고 있어요','dp-empty',receivingRoot);return;}
  const grid=make('div',undefined,'dp-accounts',receivingRoot);
  for(const m of ['bank_transfer','wechat_pay','alipay']){
   const d=draft(m),a=accounts.find(x=>x.method===m)??{},card=make('form',undefined,'dp-account',grid);card.setAttribute('data-enabled',String(!!a.enabled));card.onsubmit=e=>{e.preventDefault();void save(m);};
   const top=make('div',undefined,'dp-account-top',card);make('strong',methodName[m],undefined,top);make('span',a.enabled?'고객에게 보이는 중':'꺼짐','dp-chip',top).setAttribute('data-kind',a.enabled?'notice':'none');
   const on=make('label',undefined,'dp-toggle',card),box=make('input',undefined,undefined,on);box.type='checkbox';box.checked=d.enabled;box.onchange=()=>{d.enabled=box.checked;};make('span','고객에게 이 결제 수단 보이기',undefined,on);
   if(m==='bank_transfer')for(const [k,label,hint,max] of fields.bank_transfer){const l=make('label',undefined,'dp-field',card);make('span',label,undefined,l);const i=make('input',undefined,undefined,l);i.type='text';i.maxLength=max;i.placeholder=hint;i.value=d[k];i.oninput=()=>{d[k]=String(i.value??'');};if(k==='accountNumber')i.inputMode='numeric';}
   else{const l=make('div',undefined,'dp-field dp-qr',card);make('span','QR 이미지',undefined,l);if(d.qrImage){const img=make('img',undefined,undefined,l);img.src=d.qrImage;img.alt=methodName[m]+' QR';img.width=140;img.height=140;}
    const pick=make('label',undefined,'button secondary dp-file',l);make('span',d.qrImage?'이미지 바꾸기':'이미지 올리기',undefined,pick);const f=make('input',undefined,undefined,pick);f.type='file';f.accept='image/png,image/jpeg,image/webp';
    f.onchange=()=>{const file=f.files?.[0];if(!file)return;if(file.size>500*1024){saved[m]={kind:'error',text:'500KB보다 작은 이미지로 올려 주세요'};drawReceiving();return;}const r=new FileReader();r.onload=()=>{d.qrImage=String(r.result);saved[m]=null;drawReceiving();};r.readAsDataURL(file);};
    make('small','PNG·JPG·WebP, 500KB까지 · 위챗·알리 앱의 받기(收款) QR을 그대로 저장해 올려 주세요',undefined,l);}
   const n=make('label',undefined,'dp-field',card);make('span','안내 한 줄 (선택)',undefined,n);const ni=make('input',undefined,undefined,n);ni.type='text';ni.maxLength=200;ni.placeholder='예: 입금 후 꼭 입금했어요를 눌러 주세요';ni.value=d.note;ni.oninput=()=>{d.note=String(ni.value??'');};
   if(a.updatedAt)make('p','마지막 저장 '+when(a.updatedAt)+' · '+(a.updatedBy??''),'dp-saved-at',card);
   if(saved[m]){const s=make('p',saved[m].text,'dp-note',card);s.setAttribute('data-kind',saved[m].kind);s.setAttribute('role',saved[m].kind==='error'?'alert':'status');}
   const go=make('button',receivingBusy===m?'저장하고 있어요':'저장','button primary',card);go.type='submit';go.disabled=!!receivingBusy;
  }
 }
 async function refreshReceiving(){if(!loadReceiving)return;try{const r=await loadReceiving();accounts=r?.available?r.accounts:[];receivingFailed=!r?.available;drafts={};}catch(e){if(stopped||lost(e))return;receivingFailed=true;}if(!stopped)drawReceiving();}
 async function save(m){if(receivingBusy)return;const d=draft(m);receivingBusy=m;drawReceiving();
  const body=m==='bank_transfer'?{method:m,enabled:d.enabled,bankName:d.bankName.trim()||null,accountNumber:d.accountNumber.trim()||null,holder:d.holder.trim()||null,note:d.note.trim()||null}:{method:m,enabled:d.enabled,qrImage:d.qrImage,note:d.note.trim()||null};
  try{const r=await saveReceiving(body);accounts=r.accounts;delete drafts[m];saved[m]={kind:'ok',text:d.enabled?'저장했어요 · 고객의 결제 안내 화면에 바로 나와요':'저장했어요 · 꺼 둬서 고객에게는 보이지 않아요'};void refresh();}
  catch(e){if(stopped||lost(e))return;saved[m]={kind:'error',text:errorText(e)};}
  finally{receivingBusy=null;}drawReceiving();}
 function dispose(){stopped=true;depositsRoot.replaceChildren();depositsRoot.hidden=true;if(receivingRoot){receivingRoot.replaceChildren();receivingRoot.hidden=true;}}
 function show(on){if(stopped)return;visible=on;depositsRoot.hidden=!on;if(receivingRoot)receivingRoot.hidden=!on;if(on)void refresh();}
 drawDeposits();if(receivingRoot&&loadReceiving)drawReceiving();
 const ready=Promise.all([refresh(),refreshReceiving()]);
 return {ready,refresh,show,dispose};
}
