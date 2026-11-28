import {mountSupportInbox} from './customer-support-client.mjs';
import {supportTopics,supportAvailability,answerSupportQuestion} from './customer-support-guide.mjs';
import {mountContactLine} from './customer-contact.mjs';
// 2026-11-06 3차: on phones the floating button is a round icon (decision D-1), the browser's back button closes the
// window instead of leaving the page (item 10), and visitors who are not signed in see the customer service email
// and when answers come (item 21).
const icon='<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="22" height="22"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.5 9.5h7M8.5 12.5h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
export function mountSupportWidget({root,api,readOnly=false,onChange=()=>{},authenticated=true,contact=mountContactLine}){
 const doc=root.ownerDocument,win=doc.defaultView??(typeof window!=='undefined'?window:null);let inbox,opened=false,disposed=false,lastQuestion='',pushed=false,skipPop=false,sending=false;
 const make=(tag,text,cls)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 root.replaceChildren();root.classList.add('support-widget');const launcher=make('button',undefined,'support-launcher');launcher.type='button';launcher.setAttribute('aria-expanded','false');launcher.setAttribute('aria-controls','ieum-support-window');launcher.setAttribute('aria-label','1:1 문의');
 const mark=make('span',undefined,'support-launcher-icon');mark.innerHTML=icon;launcher.append(mark,make('span','1:1 문의','support-launcher-text'));
 const shell=make('section',undefined,'support-widget-window');shell.id='ieum-support-window';shell.hidden=true;shell.setAttribute('aria-label','이음 고객 상담');const header=make('header',undefined,'support-widget-head'),title=make('div');title.append(make('h2','무엇을 도와드릴까요?'));const close=make('button',undefined,'support-widget-close');const closeMark=make('span','✕','support-close-x');closeMark.setAttribute('aria-hidden','true');close.append(closeMark,make('span','닫기','support-close-word'));close.type='button';close.setAttribute('aria-label','상담창 닫기');header.append(title,close);
 const hours=make('div',undefined,'support-hours'),tabs=make('nav',undefined,'support-widget-tabs');tabs.setAttribute('aria-label','상담 메뉴');const help=make('button','자주 묻는 질문'),mine=make('button','내 문의'),askButton=make('button','1:1 문의 남기기');for(const b of [help,mine,askButton])b.type='button';tabs.append(help,mine);
 const guide=make('div',undefined,'support-guide'),menu=make('div',undefined,'support-guide-menu'),body=make('div',undefined,'support-widget-inbox');body.hidden=true;guide.setAttribute('data-step','menu');menu.append(make('h3','빠른 안내를 먼저 확인해 보세요'),make('p','자주 묻는 질문으로 먼저 확인해 보세요. 해결되지 않으면 1:1 문의를 남겨 주세요.'));
 // 2026-11-19: a topic (or a typed question) shows the question and the FAQ answer right away, chat-style, with one
 // button that sends that same question to the team as a 1:1 inquiry — no form and no second confirm. Questions the
 // answer settles never reach the team's list.
 const answers=make('div',undefined,'support-guide-answers');answers.hidden=true;answers.setAttribute('aria-live','polite');
 const sendButton=make('button','상담원에게 바로 보내기','support-guide-send'),again=make('button','다른 질문 보기','support-guide-again');sendButton.type='button';again.type='button';
 function answer(question){lastQuestion=question;const result=answerSupportQuestion(question);const q=make('p',question,'support-guide-question');q.setAttribute('translate','no');
  const next=make('div',undefined,'support-guide-next'),note=readOnly?'화면 공유용 예시라 보내지 않아요':authenticated?'누르면 이 질문이 1:1 문의로 바로 등록돼요':'로그인하면 이 질문을 바로 보낼 수 있어요';
  next.append(make('p',result?'해결되지 않았나요?':'상담원이 직접 확인할게요','support-guide-next-title'),sendButton,make('p',note,'support-guide-next-note'),again);
  answers.replaceChildren(q,...(result?[make('small','자동 안내 · FAQ')]:[]),make('p',result?.answer??'이 질문은 상담원이 직접 확인해야 해요. 아래 버튼을 누르면 바로 전달돼요.','support-guide-answer'),next);
  sendButton.disabled=readOnly;menu.hidden=true;answers.hidden=false;guide.setAttribute('data-step','answer');guide.scrollTop=0;}
 function backToMenu(){lastQuestion='';answers.hidden=true;answers.replaceChildren();menu.hidden=false;guide.setAttribute('data-step','menu');guide.scrollTop=0;}
 again.onclick=()=>backToMenu();
 sendButton.onclick=async()=>{if(sending||readOnly||!lastQuestion)return;if(!authenticated){show('inbox');return;}sending=true;sendButton.disabled=true;sendButton.textContent='보내는 중';
  try{show('inbox');const sent=await inbox.sendInquiry?.(lastQuestion);if(sent)backToMenu();}finally{sending=false;sendButton.disabled=false;sendButton.textContent='상담원에게 바로 보내기';}};
 for(const topic of supportTopics){const button=make('button',topic.question,'support-topic');button.type='button';button.onclick=()=>answer(topic.question);menu.append(button);}const form=make('form',undefined,'support-guide-form'),question=make('input'),send=make('button','안내 확인');question.maxLength=500;question.required=true;question.placeholder='궁금한 점을 입력해 보세요';question.setAttribute('aria-label','자동 안내에 질문하기');send.type='submit';form.append(question,send);form.onsubmit=e=>{e.preventDefault();const text=question.value.trim();if(text){question.value='';question.blur?.();answer(text);}};askButton.className='support-guide-ask';menu.append(form,askButton);if(readOnly)menu.append(make('p','화면 공유용 예시입니다. 실제 문의 전송은 비활성화되어 있습니다','support-readonly'));guide.append(menu,answers);
 function show(view){guide.hidden=view!=='guide';body.hidden=view==='guide';shell.setAttribute('data-view',view==='guide'?'guide':'inbox');help.setAttribute('aria-pressed',String(view==='guide'));mine.setAttribute('aria-pressed',String(view!=='guide'));if(view!=='guide')inbox?.scrollToLatest?.();}
 // The window is one step in the browser's history: back closes it (and nothing else).
 const onPop=()=>{if(skipPop){skipPop=false;return;}if(opened&&pushed){pushed=false;hide(true);}};win?.addEventListener?.('popstate',onPop);
 // Phones (2026-11-19): the window follows the visible area, so the on-screen keyboard never covers the reply box,
 // and the newest message stays in view when the keyboard opens.
 const viewport=win?.visualViewport,phone=()=>!!win?.matchMedia?.('(max-width:640px)').matches;let fitted=0;
 function unfit(){fitted=0;for(const k of ['top','height','bottom'])shell.style?.removeProperty?.(k);}
 function fit(){if(!opened||!viewport||!phone()){unfit();return;}const h=Math.round(viewport.height);shell.style.top=Math.max(0,Math.round(viewport.offsetTop))+'px';shell.style.height=h+'px';shell.style.bottom='auto';if(fitted&&h<fitted-80&&!body.hidden)inbox?.scrollToLatest?.();fitted=h;}
 viewport?.addEventListener?.('resize',fit);viewport?.addEventListener?.('scroll',fit);
 // open('inbox') goes straight to 내 문의 (used by the unread-reply badge).
 function open(view='guide'){if(disposed)return;if(!opened&&win?.history?.pushState){try{win.history.pushState({...(win.history.state??{}),ieumSupport:true},'');pushed=true;}catch{}}
  opened=true;shell.hidden=false;launcher.hidden=true;launcher.setAttribute('aria-expanded','true');const state=supportAvailability();const line=make('p',undefined,'support-hours-line');line.append(make('b',state.hours),make('span',state.short));hours.replaceChildren(make('strong',state.label),make('p',state.message),line);if(view==='inbox'){show('inbox');void inbox.refresh();}else show('guide');fit();close.focus?.();}
 // Unread reply count mirrored on the floating button and the 내 문의 tab.
 function setUnread(count){const n=Number.isSafeInteger(count)&&count>0?count:0;for(const el of [launcher,mine]){if(n){el.setAttribute('data-unread',String(n));}else el.removeAttribute?.('data-unread');}launcher.setAttribute('aria-label',n?'1:1 문의 · 새 답변 있음':'1:1 문의');}
 function hide(fromHistory=false){if(!opened)return;opened=false;unfit();shell.hidden=true;launcher.hidden=false;launcher.setAttribute('aria-expanded','false');launcher.focus?.();
  if(pushed&&!fromHistory){pushed=false;skipPop=true;try{win.history.back();}catch{skipPop=false;}}}
 launcher.onclick=()=>open(launcher.hasAttribute?.('data-unread')?'inbox':'guide');close.onclick=()=>hide();help.onclick=()=>show('guide');mine.onclick=()=>{show('inbox');void inbox.refresh();};askButton.onclick=()=>{show('inbox');if(readOnly||!authenticated){void inbox.refresh();return;}inbox.startInquiry(lastQuestion);};shell.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();hide();}};
 shell.append(header,hours,tabs,guide,body);root.append(shell,launcher);
 if(authenticated)inbox=mountSupportInbox({root:body,api,readOnly,onChange,autoOpen:true});
 else{const login=make('a','로그인하고 문의 남기기','support-login-link');login.href='./account.html';const reach=make('p',undefined,'support-contact');reach.hidden=true;body.append(make('div','내 문의와 답변은 로그인 후 확인할 수 있어요','support-empty'),login,reach);void Promise.resolve(contact?.(reach)).catch(()=>{});inbox={ready:Promise.resolve(),refresh:()=>Promise.resolve(),dispose(){body.replaceChildren();}};}
 show('guide');
 const timer=setInterval(()=>{if(opened&&!doc.hidden&&!root.contains?.(doc.activeElement))void inbox.refresh();},30000);timer.unref?.();
 function dispose(){if(disposed)return;disposed=true;clearInterval(timer);win?.removeEventListener?.('popstate',onPop);viewport?.removeEventListener?.('resize',fit);viewport?.removeEventListener?.('scroll',fit);inbox.dispose();root.replaceChildren();}
 // ask(text): open the window on a new inquiry with the text filled in (the key card's '연결이 안 돼요').
 function ask(text=''){if(disposed)return;open('guide');show('inbox');if(readOnly||!authenticated){void inbox.refresh();return;}inbox.startInquiry(String(text));}
 return {ready:inbox.ready,open,ask,setUnread,refresh:()=>inbox.refresh(),dispose};
}
