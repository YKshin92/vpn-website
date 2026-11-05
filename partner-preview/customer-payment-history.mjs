import {paymentPanelModel} from './customer-payment-panel.mjs';
const words={ko:['결제 처리 내역','새로 확인','아직 결제 처리 내역이 없습니다','결제 상태를 불러오지 못했습니다','이전','다음','확인 중','예시 시뮬레이션 · 실제 결제·VPN 연결 없음 · 메일 안내와 별도로 이 화면에서 상태를 확인할 수 있습니다','안내'],en:['Payment updates','Refresh','No payment updates yet','Could not load payment updates','Previous','Next','Loading','Example simulation · no real payment or VPN connection · status is shown here independently of email notices','Notice'],zh:['付款处理记录','刷新','暂无付款处理记录','无法加载付款状态','上一页','下一页','加载中','示例模拟 · 无实际付款或 VPN 连接 · 即使邮件通知未完成，也可在此查看状态','通知'],ja:['決済処理履歴','再読み込み','決済処理履歴はありません','決済状態を取得できませんでした','前へ','次へ','読み込み中','サンプルシミュレーション · 実際の決済・VPN接続なし · メール通知とは別にこの画面で状態を確認できます','通知']};
const chips={ko:{ok:'반영 완료',pending:'처리 중',warn:'확인 중',error:'확인 불가'},en:{ok:'Applied',pending:'Processing',warn:'Checking',error:'Unavailable'},zh:{ok:'已反映',pending:'处理中',warn:'核对中',error:'无法确认'},ja:{ok:'反映済み',pending:'処理中',warn:'確認中',error:'確認不可'}};
const kst=value=>{const t=Date.parse(value);return Number.isFinite(t)?new Date(t+9*3600000).toISOString().slice(0,16).replace('T',' '):'';};
const kinds={ko:{purchase:'이용권 구매',extension:'기간 연장',monthly_topup:'이번 주기 데이터 추가',compensation:'장애 보상 · 1일 연장'},en:{purchase:'Pass purchase',extension:'Pass extension',monthly_topup:'Data for this cycle',compensation:'Outage compensation · 1 day added'},zh:{purchase:'购买套餐',extension:'套餐延期',monthly_topup:'本周期流量追加',compensation:'故障补偿 · 延长 1 天'},ja:{purchase:'利用権の購入',extension:'利用期間の延長',monthly_topup:'今期のデータ追加',compensation:'障害補償 · 1日延長'}};
export function mountPaymentHistory({root,enabled=false,load,administrator=false,language='ko',onAuthLoss=()=>{}}){
 if(language==='zh-CN')language='zh';
 if(!Object.hasOwn(words,language))language='ko';
 let disposed=false,version=0,page=1,model=null,status='loading';root.hidden=!enabled;
 const doc=root.ownerDocument;const t=()=>Object.hasOwn(words,language)?words[language]:words.ko;
 // One compact row per payment: kind + time, a status chip, and one detail line.
 function draw(){if(disposed)return;root.replaceChildren();const make=(tag,text,cls,parent=root)=>{const n=doc.createElement(tag);n.textContent=text;if(cls)n.className=cls;parent.append(n);return n;};
  const head=make('div','','ph-head');make('h2',t()[0],'',head);const refresh=make('button',t()[1],'button secondary',head);refresh.type='button';refresh.onclick=()=>void refreshPage();
  if(status!=='ready'){make('p',status==='loading'?t()[6]:t()[3],'ph-state');return;}
  make('p',t()[7],'ph-note');if(!model.payments.length)make('p',t()[2],'ph-state');
  const list=make('ul','','ph-list'),dictionary=Object.hasOwn(kinds,language)?kinds[language]:kinds.ko,chip=Object.hasOwn(chips,language)?chips[language]:chips.ko;
  for(const payment of model.payments){const panel=paymentPanelModel(payment,{administrator,language}),valid=!!panel.notice,kind=valid?payment.fulfillment==='succeeded'?'ok':payment.fulfillment==='needs_review'?'warn':'pending':'error';
   const row=make('li','','ph-row',list),main=make('div','','ph-main',row);make('strong',Object.hasOwn(dictionary,payment.kind)?dictionary[payment.kind]:panel.title,'ph-kind',main);const when=kst(payment.createdAt);if(when)make('span',when,'ph-time',main);
   const badge=make('span',chip[kind],'ph-chip',row);badge.setAttribute?.('data-kind',kind);
   make('p',valid?t()[8]+' · '+panel.notice:panel.detail,'ph-detail',row);if(panel.admin)make('p',panel.admin,'ph-admin',row);}
  const nav=make('div','','ph-nav');
  if(page>1){const prev=make('button',t()[4],'',nav);prev.type='button';prev.className='button secondary';prev.onclick=()=>{page--;void refreshPage();};}
  if(model.hasMore){const next=make('button',t()[5],'',nav);next.type='button';next.className='button secondary';next.onclick=()=>{page++;void refreshPage();};}
 }
 async function refreshPage(){if(disposed||!enabled)return;const current=++version;model=null;status='loading';draw();try{const result=await load(page);if(disposed||current!==version)return;if(!Array.isArray(result?.payments)||result.payments.length>10||result.page!==page||typeof result.hasMore!=='boolean')throw Error('invalid-payment-list');model=result;status='ready';draw();}catch(error){if(disposed||current!==version)return;model=null;status='error';draw();if([401,403].includes(error.status)){dispose();onAuthLoss();}}}
 function changeLanguage(event){const locale=event.detail?.locale==='zh-CN'?'zh':event.detail?.locale;if(Object.hasOwn(words,locale)){language=locale;draw();}}
 function dispose(){disposed=true;version++;model=null;root.replaceChildren();root.hidden=true;doc.removeEventListener?.('ieum-language-change',changeLanguage);}
 if(enabled){doc.addEventListener?.('ieum-language-change',changeLanguage);void refreshPage();}
 return {refresh:refreshPage,dispose};
}
