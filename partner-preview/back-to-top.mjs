// "맨 위로" button for long pages (2026-11-06), on the customer and the administrator screens.
// - shows once the page has scrolled past one screen (so a page shorter than two screens never shows it)
// - bottom right and stays put: on customer pages it sits just above the 1:1 문의 button, on administrator pages
//   in the corner (under the menus and the side panels); arrow and text on wide screens, arrow only on phones
// - hidden while typing on a phone (the keyboard is up and the button would cover the form)
// - jumps to the top (smoothly unless the visitor asked for reduced motion) and moves keyboard focus to the heading
// References: NN/g "Back-to-Top Button Design Guidelines", PatternFly "Back to top".
const texts={ko:'맨 위로',en:'Top','zh-CN':'回到顶部',ja:'トップへ'};
const names={ko:'맨 위로 이동',en:'Back to top','zh-CN':'返回页面顶部',ja:'ページの先頭へ'};
export function backToTopLabel(lang){
 const l=String(lang||'ko'),key=l.toLowerCase().startsWith('zh')?'zh-CN':l.slice(0,2).toLowerCase();
 return {text:texts[key]??texts.ko,name:names[key]??names.ko};
}
export const shouldShow=({scrollY,viewport,typing=false})=>viewport>0&&scrollY>viewport&&!typing;
export function pageVariant(doc){
 return doc.getElementById('ieum-admin-nav-host')||doc.querySelector('.ieum-admin-nav')||doc.documentElement.classList.contains('ieum-admin')?'admin':'customer';
}
const editable=el=>!!el&&(el.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName||''))&&!/^(button|submit|checkbox|radio|reset|range|color|file)$/.test(el.type||'');
// How far the 1:1 문의 button reaches up from the bottom of the window (0 when it is not shown).
function launcherReach(doc,win){
 const l=doc.querySelector('.support-widget .support-launcher');if(!l||l.closest('[hidden]'))return 0;
 const r=l.getBoundingClientRect();if(!r.width||!r.height)return 0;
 return Math.max(0,Math.round(win.innerHeight-r.top));
}
export function mountBackToTop(doc=globalThis.document,win=globalThis.window){
 if(!doc||!win||!doc.body||doc.getElementById('ieum-top'))return null;
 try{if(win.top!==win.self)return null;}catch{return null;}
 const variant=pageVariant(doc);
 const button=doc.createElement('button');button.type='button';button.id='ieum-top';button.dataset.variant=variant;button.dataset.show='false';
 button.setAttribute('translate','no');button.hidden=true;
 button.innerHTML='<svg aria-hidden="true" focusable="false" viewBox="0 0 20 20" width="18" height="18"><path d="M10 15.6V4.6M4.9 9.6 10 4.5l5.1 5.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="ieum-top-text"></span>';
 const text=button.querySelector('.ieum-top-text');
 // Only touch the label when it changes: the page translator watches labels and sets the language attribute.
 const label=()=>{const l=backToTopLabel(doc.documentElement.lang);if(text.textContent!==l.text)text.textContent=l.text;if(button.getAttribute('aria-label')!==l.name){button.setAttribute('aria-label',l.name);button.title=l.name;}};
 label();
 // The stylesheet travels with the module, so every page (with or without ieum-ui.css) gets the same button.
 if(!doc.querySelector('link[data-ieum-top]')){
  const link=doc.createElement('link');link.rel='stylesheet';link.dataset.ieumTop='';
  link.href=new URL('./back-to-top.css',import.meta.url).href;
  link.onload=()=>{button.hidden=false;schedule();};link.onerror=()=>button.remove();
  doc.head.append(link);
 }else button.hidden=false;
 doc.body.append(button);
 const phone=win.matchMedia?.('(max-width: 700px)');
 let frame=0,timer=0,lift=-1;
 function update(){
  if(frame)win.cancelAnimationFrame?.(frame);clearTimeout(timer);frame=0;timer=0;
  const reach=variant==='customer'?launcherReach(doc,win):0;
  if(reach!==lift){lift=reach;if(reach){button.style.setProperty('--ieum-top-lift',reach+'px');button.dataset.lift='';}else{button.style.removeProperty('--ieum-top-lift');delete button.dataset.lift;}}
  const show=shouldShow({scrollY:win.scrollY??doc.documentElement.scrollTop,viewport:win.innerHeight||doc.documentElement.clientHeight,typing:!!phone?.matches&&editable(doc.activeElement)});
  const value=show?'true':'false';if(button.dataset.show!==value)button.dataset.show=value;
 }
 // Next frame, with a short timer as a fallback for browsers that hold frames back (in-app views, a pane not drawn).
 function schedule(){if(frame||timer)return;if(win.requestAnimationFrame)frame=win.requestAnimationFrame(update);timer=setTimeout(update,150);}
 win.addEventListener('scroll',schedule,{passive:true});win.addEventListener('resize',schedule);
 doc.addEventListener('focusin',schedule);doc.addEventListener('focusout',schedule);
 // The 1:1 문의 button mounts later and hides while its window is open.
 if(variant==='customer'&&win.MutationObserver)new win.MutationObserver(schedule).observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class','open']});
 if(win.MutationObserver)new win.MutationObserver(label).observe(doc.documentElement,{attributes:true,attributeFilter:['lang']});
 button.addEventListener('click',()=>{
  const reduce=win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  win.scrollTo({top:0,left:0,behavior:reduce?'auto':'smooth'});
  const target=doc.querySelector('main h1')||doc.querySelector('h1')||doc.querySelector('main');
  if(target){if(!target.hasAttribute('tabindex')){target.setAttribute('tabindex','-1');target.addEventListener('blur',()=>target.removeAttribute('tabindex'),{once:true});}target.focus({preventScroll:true});}
 });
 schedule();
 return button;
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
 if(document.body)mountBackToTop();else document.addEventListener('DOMContentLoaded',()=>mountBackToTop(),{once:true});
}
