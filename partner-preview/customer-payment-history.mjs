import {renderPaymentPanel} from './customer-payment-panel.mjs';
const words={ko:['결제 처리 내역','새로 확인','아직 결제 처리 내역이 없습니다','결제 상태를 불러오지 못했습니다','이전','다음','확인 중'],en:['Payment updates','Refresh','No payment updates yet','Could not load payment updates','Previous','Next','Loading'],zh:['付款处理记录','刷新','暂无付款处理记录','无法加载付款状态','上一页','下一页','加载中'],ja:['決済処理履歴','再読み込み','決済処理履歴はありません','決済状態を取得できませんでした','前へ','次へ','読み込み中']};
const kinds={ko:{purchase:'이용권 구매',extension:'기간 연장',monthly_topup:'이번 주기 데이터 추가'},en:{purchase:'Pass purchase',extension:'Pass extension',monthly_topup:'Data for this cycle'},zh:{purchase:'购买套餐',extension:'套餐延期',monthly_topup:'本周期流量追加'},ja:{purchase:'利用権の購入',extension:'利用期間の延長',monthly_topup:'今期のデータ追加'}};
export function mountPaymentHistory({root,enabled=false,load,administrator=false,language='ko',onAuthLoss=()=>{}}){
 if(language==='zh-CN')language='zh';
 if(!Object.hasOwn(words,language))language='ko';
 let disposed=false,version=0,page=1,model=null,status='loading';root.hidden=!enabled;
 const doc=root.ownerDocument;const t=()=>Object.hasOwn(words,language)?words[language]:words.ko;
 function draw(){if(disposed)return;root.replaceChildren();const append=(tag,text)=>{const n=doc.createElement(tag);n.textContent=text;root.append(n);return n;};append('h2',t()[0]);const refresh=append('button',t()[1]);refresh.type='button';refresh.className='button secondary';refresh.onclick=()=>void refreshPage();append('p',t()[6]===undefined?'':status==='loading'?t()[6]:status==='error'?t()[3]:'');
  if(status!=='ready')return;if(!model.payments.length)append('p',t()[2]);
  for(const payment of model.payments){const card=append('section','');card.className='payment-status-item';const dictionary=Object.hasOwn(kinds,language)?kinds[language]:kinds.ko;if(Object.hasOwn(dictionary,payment.kind)){const context=doc.createElement('p');const stamp=Date.parse(payment.createdAt);context.textContent=dictionary[payment.kind]+(Number.isFinite(stamp)?' · '+new Date(stamp).toLocaleString(language==='zh'?'zh-CN':language,{timeZone:'Asia/Seoul'}):'');card.append(context);}const body=doc.createElement('div');card.append(body);renderPaymentPanel(body,payment,{administrator,language});}
  if(page>1){const prev=append('button',t()[4]);prev.type='button';prev.className='button secondary';prev.onclick=()=>{page--;void refreshPage();};}
  if(model.hasMore){const next=append('button',t()[5]);next.type='button';next.className='button secondary';next.onclick=()=>{page++;void refreshPage();};}
 }
 async function refreshPage(){if(disposed||!enabled)return;const current=++version;model=null;status='loading';draw();try{const result=await load(page);if(disposed||current!==version)return;if(!Array.isArray(result?.payments)||result.payments.length>10||result.page!==page||typeof result.hasMore!=='boolean')throw Error('invalid-payment-list');model=result;status='ready';draw();}catch(error){if(disposed||current!==version)return;model=null;status='error';draw();if([401,403].includes(error.status)){dispose();onAuthLoss();}}}
 function changeLanguage(event){const locale=event.detail?.locale==='zh-CN'?'zh':event.detail?.locale;if(Object.hasOwn(words,locale)){language=locale;draw();}}
 function dispose(){disposed=true;version++;model=null;root.replaceChildren();root.hidden=true;doc.removeEventListener?.('ieum-language-change',changeLanguage);}
 if(enabled){doc.addEventListener?.('ieum-language-change',changeLanguage);void refreshPage();}
 return {refresh:refreshPage,dispose};
}
