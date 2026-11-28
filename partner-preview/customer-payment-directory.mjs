const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function paymentCustomerFromLocation(search){
 const query=new URLSearchParams(search);if([...query.keys()].some(k=>k!=='customer'&&k!=='focus')||query.getAll('customer').length>1)return null;
 const value=query.get('customer');return value&&uuid.test(value)?value.toLowerCase():null;
}
// 결제·이용권 list (2026-11-06 2차): customers by nickname, ID and email instead of the 36-character id, and a
// search over every customer (nickname, ID, email) so a customer without payments can be opened too.
//  names(ids) -> {customers:[{id,username,email,nickname,accountState}]}   (optional)
//  search(q)  -> {customers:[{id,username,email,nickname,pass,expiresAt,accountState}]}   (optional)
const passText={active:'이용 중',trial:'무료 체험 중',expired:'기간 끝남','trial-ended':'체험 끝남',none:'이용권 없음'};
export function mountPaymentDirectory({root,enabled=false,load,names=null,search=null,searchDelay=300,onSelect=()=>{},onClear=()=>{},onAuthLoss=()=>{}}){
 let disposed=false,version=0,page=1,query='',timer=0;const known=new Map(),doc=root.ownerDocument;root.hidden=!enabled;
 const node=(tag,text,cls)=>{const n=doc.createElement(tag);n.textContent=text??'';if(cls)n.className=cls;return n;};
 const span=(cls,text,parent)=>{const n=node('span',text,cls);parent.append(n);return n;};
 const button=(label,parent,action,cls)=>{const b=node('button',label,cls);b.type='button';b.onclick=action;parent.append(b);return b;};
 const kst=value=>new Date(Date.parse(value)+9*3600000).toISOString().slice(0,16).replace('T',' ');
 const day=value=>Number.isFinite(Date.parse(value))?new Date(Date.parse(value)+9*3600000).toISOString().slice(0,10):'';
 // The heading and the search box stay put; only the body below is redrawn (typing keeps its focus).
 const top=node('div','','pd-top'),body=node('div','','pd-body');let input=null,again=null;
 top.append(node('h2','결제 고객 목록'),node('p','결제 기록이 있는 고객이에요. 고객을 고르면 이용권·결제·키를 보고 처리할 수 있어요'));
 const tools=node('div','','pd-tools');top.append(tools);
 if(search){const form=node('form','','pd-search');form.setAttribute?.('role','search');input=node('input');input.type='search';input.maxLength=100;input.placeholder='닉네임·아이디·이메일로 찾기';input.setAttribute?.('aria-label','고객 찾기');
  const go=next=>{clearTimeout(timer);next=String(next??'').trim().slice(0,100);if(next===query)return;query=next;page=1;void refresh();};
  input.oninput=()=>{clearTimeout(timer);const next=input.value;timer=setTimeout(()=>go(next),searchDelay);};
  form.onsubmit=e=>{e?.preventDefault?.();go(input.value);};form.append(input);tools.append(form);}
 again=button('목록 새로 확인',tools,()=>{if(query){query='';page=1;if(input)input.value='';}void refresh();});
 function clear(){body.replaceChildren();onClear();}
 function mount(){if(top.parentNode!==root||body.parentNode!==root)root.replaceChildren(top,body);}
 function dispose(){disposed=true;version++;clearTimeout(timer);root.replaceChildren();onClear();root.hidden=true;}
 const who=c=>{const n=known.get(c.id.toLowerCase())??c;if(n.accountState==='closed')return ['탈퇴 고객',''];if(!n.username)return ['이름 확인 중',c.id.slice(0,8)];return [n.nickname||n.username,n.username+' · '+n.email];};
 const fail=(error,seq)=>{if(disposed||seq!==version)return true;if([401,403].includes(error?.status)){dispose();onAuthLoss();return true;}return false;};
 const nameCell=(row,c)=>{const [name,sub]=who(c),cell=span('pd-who',undefined,row);span('pd-name',name,cell);if(sub)span('pd-sub',sub,cell);return name;};
 async function refresh(){if(disposed||!enabled)return;const seq=++version;mount();clear();
  if(again)again.textContent=query?'검색 지우기':'목록 새로 확인';body.append(node('p',query?'찾고 있어요':'결제 고객을 조회하고 있습니다'));
  try{
   if(query&&search){const data=await search(query);if(disposed||version!==seq)return;
    if(!Array.isArray(data?.customers)||data.customers.some(c=>!uuid.test(c.id)))throw Error('invalid-search');
    body.replaceChildren();
    if(!data.customers.length){body.append(node('p','‘'+query+'’와 맞는 고객이 없어요','pd-none'));return;}
    const shown=data.customers.slice(0,50);body.append(node('p','‘'+query+'’로 찾은 고객 '+data.customers.length+'명'+(data.customers.length>50?' · 앞의 50명만 보여요':''),'pd-found'));
    const list=node('ul','','pd-list pd-results');
    for(const c of shown){known.set(c.id.toLowerCase(),c);const item=node('li'),row=node('button','','pd-row pd-result');row.type='button';
     const name=nameCell(row,c);row.setAttribute?.('aria-label',name+' 이용권·결제 내역 보기');
     span('pd-state',c.accountState==='suspended'?'정지':c.accountState==='closing'?'탈퇴 예정':(passText[c.pass]??''),row);span('pd-date',c.expiresAt?day(c.expiresAt)+' 종료':'',row);span('pd-go','›',row);
     row.onclick=()=>{if(!disposed&&seq===version)onSelect(c.id.toLowerCase());};item.append(row);list.append(item);}
    body.append(list);return;}
   const data=await load(page);if(disposed||version!==seq)return;
   if(data?.page!==page||typeof data.hasMore!=='boolean'||!Array.isArray(data.customers)||data.customers.length>20||data.customers.some(c=>!uuid.test(c.id)||!['paymentCount','pendingCount','reviewCount'].every(k=>Number.isSafeInteger(c[k])&&c[k]>=0)||(c.otherCount!==undefined&&(!Number.isSafeInteger(c.otherCount)||c.otherCount<0))||c.pendingCount+c.reviewCount>c.paymentCount+(c.otherCount??0)||!Number.isFinite(Date.parse(c.latestAt))))throw Error('invalid-payment-directory');
   const draw=()=>{if(disposed||version!==seq)return;body.replaceChildren();
    if(data.customers.length){
     // One row per customer: the whole row is the selection button; columns collapse to two lines on phones.
     const head=node('div','','pd-head');head.setAttribute?.('aria-hidden','true');for(const [cls,label] of [['pd-who','고객'],['pd-count','결제'],['pd-count','처리 대기'],['pd-count','확인 필요'],['pd-date','최근 결제'],['pd-go','']])span(cls,label,head);body.append(head);
     const list=node('ul','','pd-list');
     for(const customer of data.customers){const item=node('li'),row=node('button','','pd-row');row.type='button';
      const name=nameCell(row,customer);row.setAttribute?.('aria-label',name+' 이용권·결제 내역 보기 · 결제 '+customer.paymentCount+'건'+(customer.otherCount?' · 관리자 처리 '+customer.otherCount+'건':'')+' · 처리 대기 '+customer.pendingCount+'건 · 확인 필요 '+customer.reviewCount+'건');
      for(const [value,warn] of [[customer.paymentCount,false],[customer.pendingCount,false],[customer.reviewCount,true]]){const c=span('pd-count',value+'건',row);c.setAttribute?.('data-zero',String(value===0));if(warn&&value>0)c.setAttribute?.('data-warn','true');}
      const summary=customer.reviewCount>0?['확인 필요 '+customer.reviewCount,'warn']:customer.pendingCount>0?['처리 대기 '+customer.pendingCount,'pending']:['결제 '+customer.paymentCount+(customer.otherCount?' · 처리 '+customer.otherCount:''),'ok'];const chip=span('pd-summary',summary[0],row);chip.setAttribute?.('data-kind',summary[1]);
      // 5단계 (A-11): the latest payment's product and amount next to its time.
      const what=customer.latest?(/^pass-(\d+)$/.test(customer.latest.productCode)?customer.latest.productCode.slice(5)+'일':/^topup-(\d+)g$/.test(customer.latest.productCode)?'데이터 '+customer.latest.productCode.slice(6,-1)+'GB':customer.latest.productCode)+' '+(customer.latest.currency==='CNY'?(customer.latest.amountMinor/100).toLocaleString('ko-KR',{maximumFractionDigits:2})+'元':customer.latest.amountMinor.toLocaleString('ko-KR')+'원')+' · ':'';
      const stamp=kst(customer.latestAt);span('pd-date',what+stamp,row);span('pd-date-short',stamp.slice(5,10).replace('-','.'),row);span('pd-go','›',row);
      row.onclick=()=>{if(!disposed&&seq===version)onSelect(customer.id.toLowerCase());};item.append(row);list.append(item);}
     body.append(list);}
    else body.append(node('p','결제 처리 이력이 있는 고객이 없습니다'));
    body.append(node('p',page+'페이지 · 한국시간','pd-page'));
    if(page>1)button('이전 고객',body,()=>{page--;void refresh();});
    if(data.hasMore)button('다음 고객',body,()=>{page++;void refresh();});};
   draw();
   // Names come from the integrated admin (test site); the list works without them.
   const missing=data.customers.map(c=>c.id.toLowerCase()).filter(id=>!known.has(id));
   if(names&&missing.length){try{const got=await names(missing);if(disposed||version!==seq)return;for(const c of got?.customers??[])if(uuid.test(c.id))known.set(c.id.toLowerCase(),c);draw();}catch(error){if(fail(error,seq))return;}}
  }catch(error){if(fail(error,seq))return;body.replaceChildren();body.append(node('p',query?'고객을 찾지 못했어요 · 다시 시도해 주세요':'결제 고객 목록을 불러오지 못했습니다'));button('다시 시도',body,()=>void refresh());}
 }
 if(enabled){root.replaceChildren(top,body);void refresh();}return {refresh,dispose};
}
