// The pass chosen on the home page, shown the same way wherever it is carried on (2026-11-07):
// - home: pointing at or tapping a price card highlights it the way the 90-day card is at first, and fills its button
// - sign-in while logged out, and sign-up: one summary card (pass, discount, both prices, data) with a link back
//   to change it; sign-in puts "처음이신가요? 회원가입하고 계속" under the login button instead of a second blue
//   button above the form
// Texts are Korean; the page translator turns them into the chosen language.
import {prices,formatBoth} from './customer-money.mjs';
export const planInfo=Object.freeze({
 trial:{name:'무료 1일 체험',amount:'무료',meta:'24시간 · 데이터 5GB'},
 30:{name:'30일 이용권',meta:'매달 데이터 100GB'},
 90:{name:'90일 이용권',badge:'10% 할인',meta:'매달 데이터 100GB'},
 180:{name:'180일 이용권',badge:'20% 할인',meta:'매달 데이터 100GB'}
});
export const planAmount=plan=>plan==='trial'?planInfo.trial.amount:formatBoth(prices.plans[plan],'ko');
// The summary card; null for an unknown pass.
export function planSummary(doc,plan,{note,change='/#plans'}={}){
 const info=Object.hasOwn(planInfo,plan)?planInfo[plan]:null;if(!info)return null;
 const make=(tag,text,cls,parent)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;parent?.append(n);return n;};
 const box=make('div',undefined,'plan-pick');box.setAttribute('role','status');
 const head=make('div',undefined,'plan-pick-head',box);make('span','선택한 이용권','plan-pick-label',head);const back=make('a','변경','plan-pick-change',head);back.href=change;
 const main=make('div',undefined,'plan-pick-main',box);make('strong',info.name,'plan-pick-name',main);if(info.badge)make('span',info.badge,'plan-badge',main);
 const line=make('p',undefined,'plan-pick-price',box);make('span',planAmount(plan),'plan-pick-amount',line);make('span','·','plan-pick-dot',line);make('span',info.meta,'plan-pick-meta',line);
 if(note)make('p',note,'plan-pick-note',box);
 return box;
}
// Sign-in, logged out, with a pass chosen: summary above the form, sign-up under the login button.
export function mountLoginPlan(doc,{plan,box,form}){
 const card=planSummary(doc,plan);if(!card||!box)return false;
 box.replaceChildren(card);box.hidden=false;
 // The page's own sign-up block (customer-portal.html) carries the chosen pass on.
 const own=doc.getElementById?.('login-join');
 if(own){const go=doc.getElementById('account-signup'),note=own.querySelector?.('.login-join-note');if(go){go.href='./signup.html?plan='+encodeURIComponent(plan);go.textContent='회원가입하고 계속';}if(note)note.textContent='이메일 인증을 마치면 바로 신청 화면으로 이어져요';}
 else if(form){const join=doc.createElement('div');join.id='login-join';join.className='login-join';
  const ask=doc.createElement('p');ask.className='login-join-ask';ask.textContent='처음이신가요?';
  const go=doc.createElement('a');go.className='button secondary';go.href='./signup.html?plan='+encodeURIComponent(plan);go.textContent='회원가입하고 계속';
  const note=doc.createElement('p');note.className='login-join-note';note.textContent='이메일 인증을 마치면 바로 신청 화면으로 이어져요';
  join.append(ask,go,note);form.after(join);}
 return true;
}
// Home price cards: the card under the mouse, tapped or keyboard-focused is the highlighted one (it stays after the
// mouse leaves, so one card is always highlighted).
export function mountPlanCards(doc){
 const cards=[...doc.querySelectorAll('.plan-grid .plan')];if(!cards.length)return null;
 const pick=card=>{for(const c of cards){const on=c===card;c.classList.toggle('featured',on);c.setAttribute('data-selected',String(on));
  const b=c.querySelector('button[data-plan]');if(b){b.classList.toggle('primary',on);b.classList.toggle('outline',!on);}}};
 for(const c of cards)for(const type of ['mouseenter','click','focusin'])c.addEventListener(type,()=>pick(c));
 pick(cards.find(c=>c.classList.contains('featured'))??cards[0]);
 return {pick};
}
if(typeof document!=='undefined'&&document.querySelector?.('.plan-grid .plan'))mountPlanCards(document);
