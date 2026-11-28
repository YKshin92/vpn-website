// Contact for people who cannot use 1:1 문의 — not signed in, or a suspended account (2026-11-06 3차, review item
// 21, decision D-4): the customer service email from the business details, with when to expect an answer.
export const replyTimes='평일 문의는 보통 당일, 주말·공휴일은 다음 평일에 답변드려요';
export function contactEmail(items){
 const v=Array.isArray(items)?items.find(i=>i?.label==='고객센터 이메일')?.value:null;
 const m=typeof v==='string'?/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.exec(v):null;return m?{email:m[0],temporary:/임시/.test(v)}:null;
}
let cached=null;
export function loadContact(fetcher=globalThis.fetch){
 if(typeof fetcher!=='function')return Promise.resolve(null);
 return cached??=Promise.resolve().then(()=>fetcher('/api/public/business',{cache:'no-cache',signal:AbortSignal.timeout(8000)})).then(r=>r.ok?r.json():null).then(d=>contactEmail(d?.items)).catch(()=>null);
}
// "로그인할 수 없거나 계정이 정지됐다면 고객센터 이메일 support@… 로 연락해 주세요 · 평일 문의는 보통 당일 …"
export async function mountContactLine(node,{lead='로그인할 수 없거나 계정이 정지됐다면 고객센터 이메일로 연락해 주세요',load=loadContact,mark=true}={}){
 if(!node)return null;const contact=await load();if(!contact){node.hidden=true;return null;}
 const doc=node.ownerDocument,a=doc.createElement('a');a.href='mailto:'+contact.email;a.textContent=contact.email;a.setAttribute('translate','no');
 const first=doc.createElement('span');first.textContent=lead+' ';const rest=doc.createElement('span');rest.textContent=(mark&&contact.temporary?' (임시 주소)':'')+' · '+replyTimes;
 node.replaceChildren(first,a,rest);node.hidden=false;return contact;
}
