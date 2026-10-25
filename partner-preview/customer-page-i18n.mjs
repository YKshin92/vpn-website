import {pageMessages} from './customer-page-messages.mjs';
export const localeCodes=['ko','en','zh-CN','ja'];
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const fragments=new RegExp(Object.keys(pageMessages).filter(k=>k.length>=3).sort((a,b)=>b.length-a.length).map(escape).join('|'),'g');
export function normalizeLocale(value){return localeCodes.includes(value)?value:'ko';}
export function translatePageText(text,locale){
 const index=localeCodes.indexOf(normalizeLocale(locale))-1;if(index<0||typeof text!=='string')return text;
 const key=text.trim(),translated=pageMessages[key]?.[index];
 if(translated)return text.replace(key,translated);
 if(!/[가-힣]/.test(text))return text;
 return text.replace(fragments,match=>pageMessages[match][index])
  .replace(/약\s*(\d+)시간/g,(_m,n)=>["About "+n+" hours","约 "+n+" 小时","約"+n+"時間"][index])
  .replace(/(\d+)일/g,(_m,n)=>[n+' days',n+' 天',n+'日'][index])
  .replace(/오전/g,['AM','上午','午前'][index]).replace(/오후/g,['PM','下午','午後'][index]);
}
export function getSavedLocale(storage){try{return normalizeLocale(storage?.getItem('ieum-language'));}catch{return 'ko';}}
