// Customer notices (2026-11-06, draft 055): one line at the top of the home page and 내 이용권 for planned
// maintenance, an outage, a terms change (seven days ahead, as the terms promise) or anything else.
// - reads /api/notices (no sign-in); nothing shows when there is none or the service is not there (static pages)
// - the kind label follows the page language; the notice itself is the administrator's words
// - each notice can be closed; it stays closed in this browser (when the browser lets us remember it)
const kinds={
 ko:{maintenance:'점검 안내',outage:'장애 안내',policy:'약관 변경 안내',general:'공지',close:'공지 닫기',region:'공지'},
 en:{maintenance:'Maintenance',outage:'Service issue',policy:'Terms update',general:'Notice',close:'Close notice',region:'Notices'},
 'zh-CN':{maintenance:'维护通知',outage:'故障通知',policy:'条款变更通知',general:'公告',close:'关闭公告',region:'公告'},
 ja:{maintenance:'メンテナンスのお知らせ',outage:'障害のお知らせ',policy:'規約変更のお知らせ',general:'お知らせ',close:'お知らせを閉じる',region:'お知らせ'}};
export function noticeWords(lang){const l=String(lang||'ko'),key=l.toLowerCase().startsWith('zh')?'zh-CN':l.slice(0,2).toLowerCase();return kinds[key]??kinds.ko;}
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export function validNotices(data){return Array.isArray(data?.notices)?data.notices.filter(n=>n&&uuid.test(n.id)&&Object.hasOwn(kinds.ko,n.kind)&&n.kind!=='close'&&n.kind!=='region'&&typeof n.body==='string'&&n.body.length>0&&n.body.length<=200).slice(0,3):[];}
export const noticePage=path=>['/','/index.html','./account.html','/account/'].includes(String(path||''));
const storeKey='ieum-closed-notices';
function closedSet(storage){try{const v=JSON.parse(storage?.getItem(storeKey)??'[]');return new Set(Array.isArray(v)?v.filter(x=>uuid.test(x)).slice(-20):[]);}catch{return new Set();}}
function remember(storage,set){try{storage?.setItem(storeKey,JSON.stringify([...set].slice(-20)));}catch{}}
export async function mountNoticeBanner({doc=globalThis.document,load,storage=null,stylesheet=true}={}){
 if(!doc?.body||doc.getElementById('ieum-notices'))return null;
 let data;try{data=validNotices(await load());}catch{return null;}
 const closed=closedSet(storage),list=data.filter(n=>!closed.has(n.id));if(!list.length)return null;
 const band=doc.createElement('div');band.id='ieum-notices';band.className='ieum-notices';band.setAttribute('role','region');
 if(stylesheet&&!doc.querySelector?.('link[data-ieum-notices]')){const link=doc.createElement('link');link.rel='stylesheet';link.dataset.ieumNotices='';link.href=new URL('./customer-notice-banner.css',import.meta.url).href;doc.head?.append(link);}
 const words=()=>noticeWords(doc.documentElement?.lang);
 function draw(){const w=words();band.setAttribute('aria-label',w.region);band.replaceChildren();
  for(const n of list){const row=doc.createElement('p');row.className='ieum-notice';row.dataset.kind=n.kind;
   const tag=doc.createElement('strong');tag.textContent=w[n.kind];const text=doc.createElement('span');text.textContent=n.body;text.setAttribute('translate','no');
   const close=doc.createElement('button');close.type='button';close.className='ieum-notice-close';close.textContent='×';close.setAttribute('aria-label',w.close);close.title=w.close;
   close.onclick=()=>{closed.add(n.id);remember(storage,closed);list.splice(list.indexOf(n),1);if(list.length)draw();else band.remove();};
   row.append(tag,text,close);band.append(row);}}
 draw();doc.body.prepend(band);
 if(globalThis.MutationObserver&&doc.documentElement)new MutationObserver(()=>{const w=words();if(band.getAttribute('aria-label')!==w.region)draw();}).observe(doc.documentElement,{attributes:true,attributeFilter:['lang']});
 return band;
}
if(typeof document!=='undefined'&&typeof window!=='undefined'&&noticePage(location.pathname)){
 const start=()=>void mountNoticeBanner({load:async()=>{const r=await fetch('/api/notices',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('notices-unavailable');return r.json();},storage:(()=>{try{return window.localStorage;}catch{return null;}})()});
 if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true});
}
