import {languages} from './customer-languages.mjs';
import {normalizeLocale,translatePageText,getSavedLocale} from './customer-page-i18n.mjs';
// Customer-page localization. Translates text/accessible labels, never HTML,
// input values, URLs, code or credential-bearing fields. No translation API calls.
export function addAccountLanguagePreview(){
 if(document.querySelector('[data-language-selector]'))return;
 const header=document.querySelector('header');if(!header)return;
 header.classList?.add('has-language-preview');const wrapper=document.createElement('label');wrapper.className='account-language-preview';wrapper.setAttribute('data-language-selector','');const label=document.createElement('span');const select=document.createElement('select');select.style.width='auto';select.setAttribute('aria-label','Language');wrapper.append(label);
 for(const entry of languages){const option=document.createElement('option');option.value=entry.code;option.textContent=entry.label;select.append(option);}wrapper.append(select);header.append(wrapper);
 let storage;try{storage=window.localStorage;}catch{}let locale=getSavedLocale(storage);select.value=locale;
 const texts=new WeakMap(),attributes=new WeakMap();
 const excluded=node=>node.parentElement?.closest('script,style,code,pre,textarea,[translate="no"],[data-language-selector]');
 function convert(source,record){if(!record||source!==record.rendered)record={source,rendered:source};record.rendered=translatePageText(record.source,locale);return record;}
 const observer=new MutationObserver(()=>render());
 function render(){
  observer.disconnect();
  try{document.documentElement.lang=locale;label.textContent=({ko:'언어',en:'Language','zh-CN':'语言',ja:'言語'})[locale];
   const walker=document.createTreeWalker(document.documentElement,NodeFilter.SHOW_TEXT);let node;
   while((node=walker.nextNode())){if(excluded(node))continue;const record=convert(node.nodeValue,texts.get(node));texts.set(node,record);if(node.nodeValue!==record.rendered)node.nodeValue=record.rendered;}
   for(const element of document.querySelectorAll('[placeholder],[aria-label],[title],meta[name="description"]')){
    if(element.closest('[translate="no"],[data-language-selector]'))continue;const saved=attributes.get(element)??{};
    for(const name of ['placeholder','aria-label','title',...(element.matches('meta[name="description"]')?['content']:[])]){if(!element.hasAttribute(name))continue;const record=convert(element.getAttribute(name),saved[name]);saved[name]=record;if(element.getAttribute(name)!==record.rendered)element.setAttribute(name,record.rendered);}attributes.set(element,saved);
   }
  }finally{observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['placeholder','aria-label','title','content']});}
 }
 select.onchange=()=>{locale=normalizeLocale(select.value);try{storage?.setItem('ieum-language',locale);}catch{}render();document.dispatchEvent(new CustomEvent('ieum-language-change',{detail:{locale}}));};
 render();window.addEventListener('storage',event=>{if(event.key==='ieum-language'){locale=normalizeLocale(event.newValue);select.value=locale;render();}});
}
if(typeof document!=='undefined')addAccountLanguagePreview();
