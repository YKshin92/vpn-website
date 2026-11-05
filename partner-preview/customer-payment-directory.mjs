const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function paymentCustomerFromLocation(search){
 const query=new URLSearchParams(search);if([...query.keys()].some(k=>k!=='customer')||query.getAll('customer').length>1)return null;
 const value=query.get('customer');return value&&uuid.test(value)?value.toLowerCase():null;
}
export function mountPaymentDirectory({root,enabled=false,load,onSelect=()=>{},onClear=()=>{},onAuthLoss=()=>{}}){
 let disposed=false,version=0,page=1;const doc=root.ownerDocument;root.hidden=!enabled;
 const node=(tag,text)=>{const n=doc.createElement(tag);n.textContent=text;return n;};
 function clear(){root.replaceChildren();onClear();}
 function dispose(){disposed=true;version++;clear();root.hidden=true;}
 async function refresh(){if(disposed||!enabled)return;const seq=++version;clear();root.append(node('p','결제 고객을 조회하고 있습니다'));
  try{const data=await load(page);if(disposed||version!==seq)return;
   if(data?.page!==page||typeof data.hasMore!=='boolean'||!Array.isArray(data.customers)||data.customers.length>20||data.customers.some(c=>!uuid.test(c.id)||!['paymentCount','pendingCount','reviewCount'].every(k=>Number.isSafeInteger(c[k])&&c[k]>=0)||c.pendingCount+c.reviewCount>c.paymentCount||!Number.isFinite(Date.parse(c.latestAt))))throw Error('invalid-payment-directory');
   root.replaceChildren();root.append(node('h2','결제 고객 목록'),node('p','검증 결제 모의 원장에 기록된 고객입니다. 계정·기존 가상 장부와 별도로 조회합니다'));
   const refreshButton=node('button','목록 새로 확인');refreshButton.type='button';refreshButton.onclick=()=>void refresh();root.append(refreshButton);
   if(!data.customers.length)root.append(node('p','결제 처리 이력이 있는 고객이 없습니다'));
   // One row per customer: whole row is the selection button; columns collapse to a single line on mobile.
   const kst=value=>new Date(Date.parse(value)+9*3600000).toISOString().slice(0,16).replace('T',' ');
   const span=(cls,text,parent)=>{const n=node('span',text);n.className=cls;parent.append(n);return n;};
   if(data.customers.length){const head=node('div','');head.className='pd-head';head.setAttribute?.('aria-hidden','true');for(const [cls,label] of [['pd-id','고객 ID'],['pd-count','결제'],['pd-count','처리 대기'],['pd-count','확인 필요'],['pd-date','최근 신청'],['pd-go','']])span(cls,label,head);root.append(head);}
   const list=node('ul','');list.className='pd-list';
   for(const customer of data.customers){const item=node('li','');const row=node('button','');row.type='button';row.className='pd-row';
    row.setAttribute?.('aria-label','고객 '+customer.id+' 이용권·결제 내역 보기 · 결제 '+customer.paymentCount+'건 · 처리 대기 '+customer.pendingCount+'건 · 확인 필요 '+customer.reviewCount+'건');
    span('pd-id',customer.id,row);
    for(const [label,value,warn] of [['결제',customer.paymentCount,false],['처리 대기',customer.pendingCount,false],['확인 필요',customer.reviewCount,true]]){const cell=span('pd-count',value+'건',row);cell.setAttribute?.('data-zero',String(value===0));if(warn&&value>0)cell.setAttribute?.('data-warn','true');}
    const summary=customer.reviewCount>0?['확인 필요 '+customer.reviewCount,'warn']:customer.pendingCount>0?['처리 대기 '+customer.pendingCount,'pending']:['결제 '+customer.paymentCount,'ok'];const chip=span('pd-summary',summary[0],row);chip.setAttribute?.('data-kind',summary[1]);
    const stamp=kst(customer.latestAt);span('pd-date',stamp,row);span('pd-date-short',stamp.slice(5,10).replace('-','.'),row);span('pd-go','›',row);
    row.onclick=()=>{if(!disposed&&seq===version)onSelect(customer.id.toLowerCase());};item.append(row);list.append(item);}
   if(data.customers.length)root.append(list);
   root.append(node('p',page+'페이지 · 고객 ID 순서 · 한국시간'));
   if(page>1){const prev=node('button','이전 고객');prev.type='button';prev.onclick=()=>{page--;void refresh();};root.append(prev);}
   if(data.hasMore){const next=node('button','다음 고객');next.type='button';next.onclick=()=>{page++;void refresh();};root.append(next);}
  }catch(error){if(disposed||seq!==version)return;clear();root.append(node('p','결제 고객 목록을 불러오지 못했습니다'));const retry=node('button','다시 시도');retry.type='button';retry.onclick=()=>void refresh();root.append(retry);if([401,403].includes(error.status)){dispose();onAuthLoss();}}
 }
 if(enabled)void refresh();return {refresh,dispose};
}
