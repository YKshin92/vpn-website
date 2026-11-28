// Business details and policy links at the bottom of every customer page (2026-11-06 4차, review item 26): the
// terms promise they are posted on the first screen and the signup screen, and e-commerce rules ask for the
// business name, representative, registration and mail-order numbers, address, contact and host on the shop.
// - one source: policies/business.json through /api/public/business (the same values as the policy pages)
// - values stay as written (translate="no"); labels follow the page language through the page translator
// - "(임시)" values say so; empty values are left out here (the policy pages show them as "등록 예정")
// - without the service (a static copy of the site) only the links show
export const policyLinks=[['terms','이용약관'],['privacy','개인정보 처리방침'],['refund','환불 규정']];
// A static copy on GitHub Pages has the pages as terms.html etc. next to index.html.
export function policyHref(name,loc=typeof location!=='undefined'?location:null){
 return /\.github\.io$/i.test(loc?.hostname??'')?'./'+name+'.html':'/'+name;
}
export function businessLines(data){
 const items=Array.isArray(data?.items)?data.items.filter(i=>i&&typeof i.label==='string'&&typeof i.value==='string'&&i.value.trim()):[];
 return {items:items.map(i=>({label:i.label,value:i.value.replace(/\s+/g,' ').trim().slice(0,120)})),temporary:items.some(i=>i.value.includes('(임시)'))};
}
export function renderBusinessFooter(doc,box,data,loc){
 const make=(tag,text,cls,parent)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;parent?.append(n);return n;};
 box.replaceChildren();
 const nav=make('nav',undefined,'ieum-business-links',box);nav.setAttribute('aria-label','약관·정책');
 for(const [name,label] of policyLinks){if(nav.children.length)make('span',' · ',undefined,nav);const a=make('a',undefined,undefined,nav);a.href=policyHref(name,loc);
  // The privacy policy link stands out, as the privacy rules ask.
  if(name==='privacy')make('strong',label,undefined,a);else a.textContent=label;}
 const {items,temporary}=businessLines(data);
 if(items.length){
  const dl=make('dl',undefined,'ieum-business-facts',box);
  for(const item of items){const row=make('div',undefined,undefined,dl);make('dt',item.label,undefined,row);const dd=make('dd',item.value,undefined,row);dd.setAttribute('translate','no');}
  if(temporary)make('p','사업자 정보는 임시 값이에요 · 사업자 등록을 마치면 실제 정보로 바뀌어요','ieum-business-note',box);
 }
 return {links:policyLinks.length,items:items.length,temporary};
}
export async function mountBusinessFooter(doc=document,{load=()=>fetch('/api/public/business',{cache:'no-cache',signal:AbortSignal.timeout(8000)}).then(r=>r.ok?r.json():null),loc}={}){
 // The page footer: right under <body> (home, signup) or at the end of <main> (내 이용권).
 const feet=[...doc.querySelectorAll('body > footer, main > footer')],foot=feet[feet.length-1];if(!foot)return null;
 let box=doc.getElementById('ieum-business');if(!box){box=doc.createElement('div');box.id='ieum-business';box.className='ieum-business';foot.append(box);}
 renderBusinessFooter(doc,box,null,loc);
 let data=null;try{data=await load();}catch{}
 return renderBusinessFooter(doc,box,data,loc);
}
if(typeof document!=='undefined'&&typeof window!=='undefined'&&!document.querySelector('.pp-business'))void mountBusinessFooter().catch(()=>{});
