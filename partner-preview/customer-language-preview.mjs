import {languages,language,translate} from './customer-languages.mjs';
// Common account terminology preview. Policy and full-page translations are not published here.
export function addAccountLanguagePreview(){
 const header=document.querySelector('header');if(!header)return;
 header.classList?.add('has-language-preview');const wrapper=document.createElement('label');wrapper.className='account-language-preview';wrapper.textContent='계정 용어 번역 미리보기 ';const select=document.createElement('select');select.style.width='auto';
 for(const entry of languages){const option=document.createElement('option');option.value=entry.code;option.textContent=entry.label;select.append(option);}wrapper.append(select);header.append(wrapper);
 const fields={'signup-username':'username','signup-password':'password','signup-password-confirm':'confirm','signup-email':'email','signup-nickname':'nickname','signup-messenger':'messenger','signup-messenger-id':'messengerId','login-id':'username','login-password':'password'};
 select.onchange=()=>{const locale=language(select.value);
  for(const [id,key] of Object.entries(fields)){const label=document.querySelector('label[for="'+id+'"]');if(!label)continue;label.lang=locale;const first=label.firstChild;if(first?.nodeType===3)first.nodeValue=translate(locale,key)+' ';}
  for(const [id,key] of [['find-id','findId'],['find-password','reset'],['account-signup','signup'],['signup-entry','signup'],['logout','logout']]){const node=document.getElementById(id);if(node){node.textContent=translate(locale,key);node.lang=locale;}}
  const none=document.querySelector('#signup-messenger option[value="none"]');if(none)none.textContent=translate(locale,'none');
 };
}
