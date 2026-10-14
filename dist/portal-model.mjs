export const plans={30:12000,90:30000,180:54000};
export const labels={active:'이용 중',expired:'만료',payment_pending:'결제대기',review_required:'확인 필요'};
export function createStore(data){return {now:data.infrastructure.referenceTime,customers:data.customers.map(c=>({...c,keyId:c.outlineKeyId,accessUrl:data.accessKeys.find(k=>k.id===c.outlineKeyId)?.accessUrl})),orders:[],audit:[],sequence:100};}
function find(s,id){const c=s.customers.find(c=>c.id===id);if(!c)throw Error('고객을 찾을 수 없습니다');return c;}
export function addCustomer(s,{name,email}){if(!name.trim()||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('이름과 이메일을 확인해 주세요');if(s.customers.some(c=>c.email.toLowerCase()===email.toLowerCase()))throw Error('이미 등록된 이메일입니다');const c={id:`demo-customer-${++s.sequence}`,displayName:name.trim(),email,status:'review_required',expiresAt:null,startsAt:null,keyId:null,accessUrl:null};s.customers.push(c);s.audit.push({at:s.now,message:`${c.displayName} 고객 등록`});return c;}
export function extend(s,id,days){if(!plans[days])throw Error('지원하지 않는 기간입니다');const c=find(s,id);c.expiresAt=new Date(Math.max(Date.parse(s.now),Date.parse(c.expiresAt)||0)+Number(days)*86400000).toISOString();c.startsAt??=s.now;c.status='active';c.paymentStatus='confirmed';c.keyId??=`key-${c.id}`;c.accessUrl??=`ss://${btoa(`chacha20-ietf-poly1305:DEMO-${c.id}`).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}@connect.vpn.example.test:18443/?outline=1`;s.orders.push({id:`demo-order-${++s.sequence}`,customerId:c.id,days:Number(days),amount:plans[days],status:'confirmed',createdAt:s.now});s.audit.push({at:s.now,message:`${c.displayName} ${days}일 이용권 반영`});return c;}
export function purchase(s,{customerId,email,days}){let c=customerId?find(s,customerId):s.customers.find(c=>c.email.toLowerCase()===email.toLowerCase());if(!c)c=addCustomer(s,{name:'신규 가상 고객',email});return extend(s,c.id,days);}
export function confirmPayment(s,id){const c=find(s,id);if(c.status!=='payment_pending')throw Error('결제대기 고객만 확인할 수 있습니다');return extend(s,id,30);}
export function requestTrial(s,{customerId,email}){
  const normalized=String(email??'').trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))throw Error('이메일을 확인해 주세요');
  let c=customerId?find(s,customerId):s.customers.find(c=>c.email.toLowerCase()===normalized);
  if(c&&c.email.toLowerCase()!==normalized)throw Error('선택한 고객의 이메일과 일치하지 않습니다');
  if(c?.trialUsed)throw Error('이 고객은 이미 무료 체험을 신청했습니다');
  if(c?.status==='active'&&Date.parse(c.expiresAt)>Date.parse(s.now))throw Error('이미 이용 중인 이용권이 있습니다 내 이용권을 확인하세요');
  if(!c)c=addCustomer(s,{name:'무료 체험 고객',email:normalized});
  c.trialUsed=true;c.trialStartedAt=s.now;c.expiresAt=new Date(Date.parse(s.now)+86400000).toISOString();c.startsAt=s.now;c.status='active';c.paymentStatus='not_required';
  c.keyId??=`key-${c.id}`;c.accessUrl??=`ss://${btoa(`chacha20-ietf-poly1305:DEMO-${c.id}`).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}@connect.vpn.example.test:18443/?outline=1`;
  s.orders.push({id:`demo-trial-${++s.sequence}`,customerId:c.id,days:1,amount:0,type:'trial',status:'confirmed',createdAt:s.now});
  s.audit.push({at:s.now,message:`${c.displayName} 무료 24시간 체험 신청`});return c;
}
