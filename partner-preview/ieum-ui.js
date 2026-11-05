// Shared enhancement for administrator pages: label table cells with their column
// headers so narrow screens can show each record as one compact block (see ieum-ui.css).
(()=>{
 const label=table=>{
  const heads=[...table.querySelectorAll(':scope>thead th')].map(th=>th.textContent.trim());if(!heads.length)return;
  table.classList.add('ieum-stack');
  for(const tr of table.querySelectorAll(':scope>tbody>tr')){
   const cells=[...tr.children];tr.classList.toggle('ieum-stack-single',cells.length===1);
   cells.forEach((td,i)=>{const name=heads[i]??'';if(td.getAttribute('data-label')!==name)td.setAttribute('data-label',name);td.classList.toggle('ieum-stack-action',!!td.querySelector('button,a.button')&&i===cells.length-1);});
  }
 };
 let queued=false;const run=()=>{queued=false;document.querySelectorAll('.ieum-admin table').forEach(label);};
 const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(run);}};
 const start=()=>{run();new MutationObserver(records=>{if(records.some(r=>r.type==='childList'))schedule();}).observe(document.body,{childList:true,subtree:true});};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
