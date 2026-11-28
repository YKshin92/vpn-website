import {paymentPanelModel} from './customer-payment-panel.mjs';
import {formatMoney} from './customer-money.mjs';
const words={ko:['결제 처리 내역','새로 확인','아직 결제 처리 내역이 없어요','결제 상태를 불러오지 못했어요','이전','다음','확인 중','결제 처리 상태는 이 화면에서 확인할 수 있어요','안내'],en:['Payment updates','Refresh','No payment updates yet','Could not load payment updates','Previous','Next','Loading','You can check payment status on this screen','Notice'],zh:['付款处理记录','刷新','暂无付款处理记录','无法加载付款状态','上一页','下一页','加载中','可在此页面查看付款处理状态','通知'],ja:['決済処理履歴','再読み込み','決済処理履歴はありません','決済状態を取得できませんでした','前へ','次へ','読み込み中','お支払いの処理状況はこの画面で確認できます','通知']};
const chips={ko:{ok:'반영 완료',pending:'처리 중',warn:'확인 중',error:'확인 불가'},en:{ok:'Applied',pending:'Processing',warn:'Checking',error:'Unavailable'},zh:{ok:'已反映',pending:'处理中',warn:'核对中',error:'无法确认'},ja:{ok:'反映済み',pending:'処理中',warn:'確認中',error:'確認不可'}};
const kst=value=>{const t=Date.parse(value);return Number.isFinite(t)?new Date(t+9*3600000).toISOString().slice(0,16).replace('T',' '):'';};
const kinds={ko:{purchase:'이용권 구매',extension:'기간 연장',monthly_topup:'데이터 추가',compensation:'장애 보상 · 1일 연장',pass_end:'이용권 종료·환불'},en:{purchase:'Pass purchase',extension:'Pass extension',monthly_topup:'Data added',compensation:'Outage compensation · 1 day added',pass_end:'Pass ended · refund'},zh:{purchase:'购买套餐',extension:'套餐延期',monthly_topup:'追加流量',compensation:'故障补偿 · 延长 1 天',pass_end:'套餐结束 · 退款'},ja:{purchase:'利用権の購入',extension:'利用期間の延長',monthly_topup:'データ追加',compensation:'障害補償 · 1日延長',pass_end:'利用権の終了・返金'}};
// What was paid and what changed (2026-11-06 3차, review item 18): "기간 연장 · 30일 · 12,000원 · 위챗페이" and
// "11월 29일 → 12월 29일". The notice-delivery line is for administrators only.
const extra={ko:{methods:{kakao_pay:'카카오페이',bank_transfer:'계좌이체',wechat_pay:'위챗페이',alipay:'알리페이'},days:n=>n+'일',won:n=>n.toLocaleString('ko-KR')+'원',ends:d=>d+'까지',pass_end:'이용권 종료·환불'},
 en:{methods:{kakao_pay:'KakaoPay',bank_transfer:'Bank transfer',wechat_pay:'WeChat Pay',alipay:'Alipay'},days:n=>n+(n===1?' day':' days'),won:n=>'KRW '+n.toLocaleString('en-US'),ends:d=>'until '+d,pass_end:'Pass ended · refund'},
 zh:{methods:{kakao_pay:'KakaoPay',bank_transfer:'银行转账',wechat_pay:'微信支付',alipay:'支付宝'},days:n=>n+' 天',won:n=>n.toLocaleString('zh-CN')+' 韩元',ends:d=>'至 '+d,pass_end:'套餐结束 · 退款'},
 ja:{methods:{kakao_pay:'カカオペイ',bank_transfer:'口座振込',wechat_pay:'WeChat Pay',alipay:'Alipay'},days:n=>n+'日',won:n=>n.toLocaleString('ja-JP')+'ウォン',ends:d=>d+'まで',pass_end:'利用権の終了・返金'}};
const gb=b=>(b/1024**3).toLocaleString('en-US',{maximumFractionDigits:1})+'GB';
const day=(iso,lang)=>new Date(iso).toLocaleDateString(lang==='zh'?'zh-CN':lang,{timeZone:'Asia/Seoul',month:'long',day:'numeric'});
export function paymentSummary(p,language='ko'){
 const x=Object.hasOwn(extra,language)?extra[language]:extra.ko,parts=[];
 if(Number.isSafeInteger(p.durationDays)&&p.durationDays>0)parts.push(x.days(p.durationDays));else if(p.kind==='monthly_topup'&&Number.isSafeInteger(p.quantityBytes)&&p.quantityBytes>0)parts.push(gb(p.quantityBytes));
 // Yuan payments (WeChat Pay·Alipay, 2026-11-07) show as 元.
 if(Number.isSafeInteger(p.amountMinor)&&p.amountMinor>0)parts.push(p.currency==='CNY'?formatMoney(p.amountMinor,'CNY',language):x.won(p.amountMinor));if(p.method&&x.methods[p.method])parts.push(x.methods[p.method]);
 const before=Date.parse(p.expiresBefore),after=Date.parse(p.expiresAfter);
 const change=Number.isFinite(after)?(Number.isFinite(before)&&before!==after?day(before,language)+' → '+day(after,language):x.ends(day(after,language))):null;
 return {line:parts.join(' · '),change};
}
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
   const sum=paymentSummary(payment,language);if(sum.line)make('p',sum.line,'ph-detail',row);if(sum.change)make('p',sum.change,'ph-change',row);
   if(administrator&&valid)make('p',t()[8]+' · '+panel.notice,'ph-detail',row);else if(!valid)make('p',panel.detail,'ph-detail',row);if(panel.admin)make('p',panel.admin,'ph-admin',row);}
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
