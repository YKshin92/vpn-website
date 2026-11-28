import {formatBytes,formatSeoulDate,formatSeoulDay} from './customer-verified-wallet.mjs';
import {formatMoney,currencyOf} from './customer-money.mjs';
// Isolated simulation only: prices are unapproved test values and the "payment"
// is a server-signed test receipt. No real charge, mail, key or Outline change.
const text={
 ko:{policy:'단순 변심 환불은 없어요 · 고객 기기·통신망 문제가 아닌 장애로 하루 4시간 넘게 이용하지 못하면 1일 연장해요',purchase:'이용권 신청',extension:'기간 연장',plan:'이용 기간',intro:'결제가 확인되면 바로 이용권에 반영돼요',days:n=>n+'일',fit:{30:'처음이거나 짧게 머물 때',90:'학기·출장처럼 몇 달 머물 때',180:'오래 머물며 꾸준히 쓸 때'},once:n=>'한 번 결제 · '+n+'일 이용',after:d=>'남은 기간에 더해져요 · 종료 예정 '+d,restart:n=>'결제가 확인되면 오늘부터 '+n+'일 · 같은 키로 다시 연결돼요',firstAfter:n=>'결제 확인과 키 발급이 끝나면 '+n+'일이 시작돼요',allowance:b=>'월 기본 '+b,data:'데이터',dataValue:b=>'매달 '+b+' (사용 주기마다 새로 시작)',topup:'데이터 추가',topupName:b=>b+' 추가',topupMeta:d=>'이번 사용 주기 종료일까지 · '+d,method:'결제 수단',methods:{kakao_pay:'카카오페이',bank_transfer:'계좌이체',wechat_pay:'위챗페이',alipay:'알리페이'},total:'결제 금액',pay:v=>v+' 결제하기',selectFirst:'상품을 선택해 주세요',confirmTitle:'테스트 결제창',confirmNote:'실제 결제 대신 서버가 서명한 시험 영수증으로 확인합니다',product:'상품',complete:'테스트 결제 완료',cancel:'다시 선택',pendingTitle:'결제를 기다리는 신청이 있어요',resume:'이어서 결제',fresh:'새로 선택',working:'처리하고 있어요',creating:'신청을 만들고 있어요',paying:'결제를 확인하고 반영하고 있어요',done:'결제가 확인되어 이용권에 반영됐어요',processing:'결제는 확인됐고 반영을 기다리고 있어요. 잠시 후 새로 확인해 주세요',review:'결제는 확인됐지만 반영 전에 확인이 필요해요. 1:1 상담으로 문의해 주세요',fine:'자동 갱신 없이 필요한 기간만 결제해요',loading:'신청 가능한 상품을 확인하고 있어요',trialTitle:'무료 1일 체험',trialLead:'먼저 연결을 확인해 보세요',trialMeta:(h,b)=>'결제정보 없이 '+h+'시간 · 데이터 '+b+' · 고객당 1회, 자동 유료 전환 없음',trialStart:'무료 체험 시작',trialCreating:'무료 체험을 준비하고 있어요',trialStarted:'무료 체험이 시작됐어요',retry:'다시 확인',
  reasons:{'preview-closed':'지금은 출시 준비 중이라 결제와 무료 체험을 받지 않아요 · 12월 1일 출시 때 열려요',processing:'이전 결제를 반영하고 있어요. 잠시 후 다시 확인해 주세요','review-required':'이전 결제를 확인하고 있어요. 확인이 끝나면 신청할 수 있어요','real-key-unavailable':'지금 VPN 서버에 연결할 수 없어 신청을 잠시 멈췄어요 · 잠시 후 다시 확인해 주세요','real-key-limit':'시험 서버의 실제 키가 모두 발급돼 지금은 새로 신청할 수 없어요','renewal-not-ready':'기간이 끝난 이용권의 재개는 운영 연결 후 제공돼요','plan-change-not-ready':'요금제 변경은 준비 중이에요','monthly-boundary-required':'이번 사용 주기를 확인한 뒤 신청할 수 있어요','active-pass-required':'이용 중인 이용권이 있어야 데이터를 추가할 수 있어요','monthly-cycle-required':'이번 달 사용량 집계가 시작되면 데이터를 추가할 수 있어요','key-held':'관리자가 접속을 멈춘 상태라 지금은 신청할 수 없어요 · 1:1 문의로 알려 주세요'},ended:(e,krw)=>e.kind==='refund'?'회사 사정으로 이용권이 종료되고 '+krw+' 환불됐어요 (시험 결제라 실제 돈은 오가지 않아요)':'시험용으로 이용 기간이 종료됐어요',
  errors:{'preview-closed':'지금은 출시 준비 중이라 결제와 무료 체험을 받지 않아요 · 12월 1일 출시 때 열려요','order-conflict':'같은 요청이 다른 내용으로 접수됐어요. 다시 선택해 주세요','too-many-pending-orders':'결제를 기다리는 신청이 많아요. 기존 신청을 먼저 진행해 주세요','order-outdated':'이용권 상태가 바뀌어 이 신청은 진행할 수 없어요. 다시 선택해 주세요','order-expired':'신청 후 시간이 지나 다시 선택해야 해요','payment-order-not-found':'신청을 찾지 못했어요. 다시 선택해 주세요','trial-used':'무료 체험은 고객당 한 번만 신청할 수 있어요','paid-customer':'결제한 적이 있는 계정은 무료 체험을 신청할 수 없어요','trial-email-used':'이 이메일 주소로는 이미 무료 체험을 했어요','trial-place-limit':'같은 곳에서는 하루 3번까지 무료 체험을 신청할 수 있어요. 내일 다시 신청해 주세요','trial-daily-limit':'오늘 무료 체험 신청이 마감됐어요. 내일 다시 신청해 주세요','trial-key-unavailable':'지금은 체험 키를 만들 수 없어요. 잠시 후 다시 시도해 주세요','csrf-required':'화면을 새로 고친 뒤 다시 시도해 주세요','preview-read-only':'화면 공유용 미리보기에서는 결제를 진행하지 않아요',unavailable:'지금은 처리하지 못했어요. 잠시 후 다시 시도해 주세요'}},
 en:{policy:'No refunds for a change of mind · if an outage not caused by your device or network stops you for over 4 hours in a day, we add 1 day',purchase:'Get a pass',extension:'Extend your pass',plan:'Duration',intro:'Your pass updates as soon as the payment is confirmed',days:n=>n+' days',fit:{30:'For your first try or a short stay',90:'For a few months, like a semester or work trip',180:'For a long stay and steady use'},once:n=>'One payment · '+n+' days',after:d=>'Added to your remaining time · ends around '+d,restart:n=>'Starts today once payment is confirmed · '+n+' days on the same key',firstAfter:n=>'Your '+n+' days start once payment and key issuance are complete',allowance:b=>b+' monthly base',data:'Data',dataValue:b=>b+' every month (renews each usage cycle)',topup:'Add data',topupName:b=>'Add '+b,topupMeta:d=>'Until the current usage cycle ends · '+d,method:'Payment method',methods:{kakao_pay:'KakaoPay',bank_transfer:'Bank transfer',wechat_pay:'WeChat Pay',alipay:'Alipay'},total:'Total',pay:v=>'Pay '+v,selectFirst:'Choose a product',confirmTitle:'Test checkout',confirmNote:'Instead of a real charge, the server confirms with a signed test receipt',product:'Product',complete:'Complete test payment',cancel:'Choose again',pendingTitle:'You have an order awaiting payment',resume:'Continue payment',fresh:'Choose again',working:'Working on it',creating:'Creating your order',paying:'Confirming and applying your payment',done:'Payment confirmed and applied to your pass',processing:'Payment confirmed. Applying it now, check again shortly',review:'Payment confirmed, but it needs a check before applying. Please contact support',fine:'No auto-renewal · pay only for the period you need',loading:'Loading available products',trialTitle:'Free 1-day trial',trialLead:'Check the connection first',trialMeta:(h,b)=>'No payment details · '+h+' hours · '+b+' data · once per customer, no automatic paid conversion',trialStart:'Start free trial',trialCreating:'Preparing your free trial',trialStarted:'Your free trial has started',retry:'Try again',
  reasons:{'preview-closed':'We are getting ready to launch, so payments and free trials are closed for now · They open at launch on December 1',processing:'Your previous payment is being applied. Check again shortly','review-required':'We are checking your previous payment. You can order once it is done','real-key-unavailable':'Orders are paused because the VPN server cannot be reached · check again shortly','real-key-limit':'All real keys for the test server have been issued, so new orders are paused','renewal-not-ready':'Resuming an ended pass will be available after operations go live','plan-change-not-ready':'Plan changes are not available yet','monthly-boundary-required':'You can order after the current usage cycle is confirmed','active-pass-required':'You need an active pass to add data','monthly-cycle-required':'Data top-ups open once this month’s usage tracking starts','key-held':'Your key is paused by an administrator, so orders are on hold · contact us via support'},ended:(e,krw)=>e.kind==='refund'?'Your pass was ended for a reason on our side and '+krw+' was refunded (test payment, no real money moves)':'Your pass was ended for testing',
  errors:{'preview-closed':'We are getting ready to launch, so payments and free trials are closed for now · They open at launch on December 1','order-conflict':'This request was already used with different details. Please choose again','too-many-pending-orders':'Too many orders are awaiting payment. Continue an existing one first','order-outdated':'Your pass changed, so this order can no longer continue. Please choose again','order-expired':'This order expired. Please choose again','payment-order-not-found':'We could not find this order. Please choose again','trial-used':'The free trial is available once per customer','paid-customer':'Accounts with a past payment cannot start a free trial','trial-email-used':'This e-mail address has already been used for a free trial','trial-place-limit':'Up to 3 free trials per day can start from the same place. Please try again tomorrow','trial-daily-limit':'Today\'s free trials are all taken. Please try again tomorrow','trial-key-unavailable':'A trial key cannot be made right now. Please try again shortly','csrf-required':'Refresh the page and try again','preview-read-only':'Payments are not run in this shared preview',unavailable:'We could not process this right now. Try again shortly'}},
 zh:{policy:'不支持因个人原因退款 · 非顾客设备或网络原因导致当天无法使用超过 4 小时的，延长 1 天',purchase:'申请套餐',extension:'延长期限',plan:'使用期限',intro:'付款确认后立即反映到套餐',days:n=>n+' 天',fit:{30:'适合首次使用或短期停留',90:'适合学期、出差等数月停留',180:'适合长期停留、持续使用'},once:n=>'一次付款 · 使用 '+n+' 天',after:d=>'在剩余期限上累加 · 预计到期 '+d,restart:n=>'付款确认后从今天开始计算 '+n+' 天 · 使用同一密钥重新连接',firstAfter:n=>'付款确认并发放密钥后开始计算 '+n+' 天',allowance:b=>'每月基础 '+b,data:'流量',dataValue:b=>'每月 '+b+'（每个使用周期重新开始）',topup:'追加流量',topupName:b=>'追加 '+b,topupMeta:d=>'有效至本使用周期结束 · '+d,method:'付款方式',methods:{kakao_pay:'KakaoPay',bank_transfer:'银行转账',wechat_pay:'微信支付',alipay:'支付宝'},total:'付款金额',pay:v=>'支付 '+v,selectFirst:'请选择商品',confirmTitle:'测试收银台',confirmNote:'不进行实际扣款，由服务器签名的测试收据确认',product:'商品',complete:'完成测试付款',cancel:'重新选择',pendingTitle:'有等待付款的申请',resume:'继续付款',fresh:'重新选择',working:'正在处理',creating:'正在创建申请',paying:'正在确认付款并反映',done:'付款已确认并反映到套餐',processing:'付款已确认，正在反映，请稍后刷新',review:'付款已确认，但反映前需要核对。请通过一对一咨询联系我们',fine:'不会自动续费 · 只需为所需期限付款',loading:'正在确认可申请的商品',trialTitle:'免费 1 天体验',trialLead:'先确认连接情况',trialMeta:(h,b)=>'无需付款信息 · '+h+' 小时 · 流量 '+b+' · 每位顾客 1 次，不会自动转为付费',trialStart:'开始免费体验',trialCreating:'正在准备免费体验',trialStarted:'免费体验已开始',retry:'重试',
  reasons:{'preview-closed':'目前正在准备上线，暂不接受付款和免费试用 · 12月1日上线时开放',processing:'正在反映之前的付款，请稍后再确认','review-required':'正在核对之前的付款，核对完成后即可申请','real-key-unavailable':'暂时无法连接 VPN 服务器，申请已暂停 · 请稍后再确认','real-key-limit':'测试服务器的真实密钥已全部发放，暂时无法新申请','renewal-not-ready':'已到期套餐的恢复将在正式运营后提供','plan-change-not-ready':'套餐变更尚在准备中','monthly-boundary-required':'确认本使用周期后即可申请','active-pass-required':'需要有使用中的套餐才能追加流量','monthly-cycle-required':'本月用量统计开始后即可追加流量','key-held':'管理员已暂停您的密钥，暂时无法申请 · 请通过一对一咨询联系我们'},ended:(e,krw)=>e.kind==='refund'?'因我方原因套餐已终止，已退款 '+krw+'（测试付款，不涉及真实资金）':'已为测试结束使用期限',
  errors:{'preview-closed':'目前正在准备上线，暂不接受付款和免费试用 · 12月1日上线时开放','order-conflict':'同一请求已以不同内容提交，请重新选择','too-many-pending-orders':'等待付款的申请过多，请先完成现有申请','order-outdated':'套餐状态已变化，此申请无法继续，请重新选择','order-expired':'申请已超时，请重新选择','payment-order-not-found':'未找到该申请，请重新选择','trial-used':'免费体验每位顾客仅限一次','paid-customer':'已有付款记录的账户无法申请免费体验','trial-email-used':'该邮箱地址已使用过免费体验','trial-place-limit':'同一地点每天最多可申请 3 次免费体验，请明天再试','trial-daily-limit':'今天的免费体验名额已满，请明天再试','trial-key-unavailable':'现在无法创建体验密钥，请稍后再试','csrf-required':'请刷新页面后重试','preview-read-only':'共享预览中不会进行付款',unavailable:'暂时无法处理，请稍后再试'}},
 ja:{policy:'お客様都合による返金はできません · お客様の端末・回線以外の障害で1日に4時間を超えて利用できない場合は1日延長します',purchase:'利用権の申請',extension:'期間の延長',plan:'利用期間',intro:'決済が確認されるとすぐに利用権へ反映されます',days:n=>n+'日',fit:{30:'初めての方や短期滞在に',90:'学期や出張など数か月の滞在に',180:'長期滞在で継続して使う方に'},once:n=>'1回のお支払い・'+n+'日利用',after:d=>'残り期間に加算されます · 終了予定 '+d,restart:n=>'決済が確認されると今日から'+n+'日 · 同じキーで再接続されます',firstAfter:n=>'決済確認とキー発行の完了後に'+n+'日が始まります',allowance:b=>'月次基本 '+b,data:'データ',dataValue:b=>'毎月'+b+'（利用サイクルごとにリセット）',topup:'データ追加',topupName:b=>b+' 追加',topupMeta:d=>'今回の利用周期の終了まで · '+d,method:'決済方法',methods:{kakao_pay:'KakaoPay',bank_transfer:'銀行振込',wechat_pay:'WeChat Pay',alipay:'Alipay'},total:'お支払い金額',pay:v=>v+'を支払う',selectFirst:'商品を選択してください',confirmTitle:'テスト決済画面',confirmNote:'実際の請求の代わりに、サーバーが署名したテスト領収書で確認します',product:'商品',complete:'テスト決済を完了',cancel:'選び直す',pendingTitle:'決済待ちの申請があります',resume:'決済を続ける',fresh:'選び直す',working:'処理しています',creating:'申請を作成しています',paying:'決済を確認して反映しています',done:'決済が確認され、利用権に反映されました',processing:'決済は確認済みで、反映を待っています。しばらくして再確認してください',review:'決済は確認済みですが、反映前に確認が必要です。1:1相談からお問い合わせください',fine:'自動更新なし · 必要な期間だけお支払い',loading:'申請できる商品を確認しています',trialTitle:'無料1日体験',trialLead:'まず接続を確認してみましょう',trialMeta:(h,b)=>'決済情報不要 · '+h+'時間 · データ '+b+' · お一人様1回、自動で有料に切り替わりません',trialStart:'無料体験を始める',trialCreating:'無料体験を準備しています',trialStarted:'無料体験が始まりました',retry:'再試行',
  reasons:{'preview-closed':'現在リリース準備中のため、決済と無料体験は受け付けていません · 12月1日のリリース時に開始します',processing:'前回の決済を反映しています。しばらくして再確認してください','review-required':'前回の決済を確認しています。確認が終わると申請できます','real-key-unavailable':'VPNサーバーに接続できないため申請を一時停止しています · しばらくして再確認してください','real-key-limit':'テストサーバーの実際のキーがすべて発行されたため、現在は新規申請できません','renewal-not-ready':'終了した利用権の再開は本番接続後に提供します','plan-change-not-ready':'プラン変更は準備中です','monthly-boundary-required':'今回の利用周期を確認した後に申請できます','active-pass-required':'データを追加するには利用中の利用権が必要です','monthly-cycle-required':'今月の使用量集計が始まるとデータを追加できます','key-held':'管理者がキーを停止しているため、現在は申請できません · 1:1お問い合わせでご連絡ください'},ended:(e,krw)=>e.kind==='refund'?'当社の事情により利用権が終了し、'+krw+' を返金しました（テスト決済のため実際のお金は動きません）':'テストのため利用期間を終了しました',
  errors:{'preview-closed':'現在リリース準備中のため、決済と無料体験は受け付けていません · 12月1日のリリース時に開始します','order-conflict':'同じリクエストが別の内容で受け付けられています。選び直してください','too-many-pending-orders':'決済待ちの申請が多すぎます。既存の申請を先に進めてください','order-outdated':'利用権の状態が変わったため、この申請は続行できません。選び直してください','order-expired':'申請の有効期限が切れました。選び直してください','payment-order-not-found':'申請が見つかりません。選び直してください','trial-used':'無料体験はお一人様1回までです','paid-customer':'決済履歴のあるアカウントは無料体験を申請できません','trial-email-used':'このメールアドレスはすでに無料体験に使われています','trial-place-limit':'同じ場所からの無料体験の申請は1日3回までです。明日もう一度お試しください','trial-daily-limit':'本日の無料体験の受付は終了しました。明日もう一度お試しください','trial-key-unavailable':'現在、体験キーを作成できません。しばらくしてからもう一度お試しください','csrf-required':'ページを再読み込みしてもう一度お試しください','preview-read-only':'共有プレビューでは決済を行いません',unavailable:'現在処理できません。しばらくしてからお試しください'}}
};
// 할인 코드·추천 (2026-11-08, draft 066): a code box under the payment methods for a pass (never data), checked before the
// order is made; the confirm step shows the discount, a code's extra days and a referral's extra days.
for(const [k,v,errors] of [
 ['ko',{discount:'할인 코드',discountPlaceholder:'코드가 있으면 넣어 주세요',discountApply:'적용',discountRemove:'빼기',discountOff:a=>a+' 할인',discountDays:n=>'이용 기간 +'+n+'일',listPrice:'정가',discountRow:'할인',codeDaysRow:'할인 코드 보너스',referralRow:'친구 초대 보너스',plusDays:n=>'+'+n+'일',referralNote:n=>'친구 초대로 가입해 첫 결제에 +'+n+'일이 더해져요'},
  {'discount-unknown':'없는 할인 코드예요','discount-used':'이미 쓴 할인 코드예요','discount-sold-out':'사용 한도가 다 찬 할인 코드예요','discount-ended':'기간이 끝난 할인 코드예요','discount-not-started':'아직 쓸 수 없는 할인 코드예요','discount-inactive':'지금은 쓸 수 없는 할인 코드예요','discount-not-for-this':'이 결제에는 쓸 수 없는 할인 코드예요','discount-too-large':'이 상품에는 쓸 수 없는 할인 코드예요'}],
 ['en',{discount:'Discount code',discountPlaceholder:'Enter a code if you have one',discountApply:'Apply',discountRemove:'Remove',discountOff:a=>a+' off',discountDays:n=>'+'+n+' days',listPrice:'Regular price',discountRow:'Discount',codeDaysRow:'Code bonus',referralRow:'Referral bonus',plusDays:n=>'+'+n+' days',referralNote:n=>'You joined with a referral: +'+n+' days on your first pass'},
  {'discount-unknown':'This code does not exist','discount-used':'You have already used this code','discount-sold-out':'This code has reached its limit','discount-ended':'This code has ended','discount-not-started':'This code is not active yet','discount-inactive':'This code cannot be used now','discount-not-for-this':'This code cannot be used for this payment','discount-too-large':'This code cannot be used for this item'}],
 ['zh',{discount:'优惠码',discountPlaceholder:'如有优惠码请输入',discountApply:'使用',discountRemove:'取消',discountOff:a=>'优惠 '+a,discountDays:n=>'使用期限 +'+n+' 天',listPrice:'原价',discountRow:'优惠',codeDaysRow:'优惠码赠送',referralRow:'邀请好友赠送',plusDays:n=>'+'+n+' 天',referralNote:n=>'通过好友邀请注册，首次付款加送 '+n+' 天'},
  {'discount-unknown':'优惠码不存在','discount-used':'该优惠码已使用过','discount-sold-out':'该优惠码已达使用上限','discount-ended':'该优惠码已过期','discount-not-started':'该优惠码尚未开始','discount-inactive':'该优惠码目前不可用','discount-not-for-this':'该优惠码不适用于本次付款','discount-too-large':'该优惠码不适用于此商品'}],
 ['ja',{discount:'割引コード',discountPlaceholder:'コードがあれば入力してください',discountApply:'適用',discountRemove:'外す',discountOff:a=>a+' 割引',discountDays:n=>'利用期間 +'+n+'日',listPrice:'定価',discountRow:'割引',codeDaysRow:'割引コード特典',referralRow:'友だち招待特典',plusDays:n=>'+'+n+'日',referralNote:n=>'友だち招待で登録したため、初回決済に +'+n+'日 追加されます'},
  {'discount-unknown':'存在しない割引コードです','discount-used':'すでに使った割引コードです','discount-sold-out':'利用上限に達した割引コードです','discount-ended':'期間が終了した割引コードです','discount-not-started':'まだ使えない割引コードです','discount-inactive':'現在使えない割引コードです','discount-not-for-this':'この決済には使えない割引コードです','discount-too-large':'この商品には使えない割引コードです'}]
]){Object.assign(text[k],v);Object.assign(text[k].errors,errors);}
const locale=value=>value==='zh-CN'?'zh':Object.hasOwn(text,value)?value:'ko';
// 2026-11-06 3차 (review items 14·15): with a pass the card is '기간 연장 · 데이터 추가'; before any pass the
// data add-on (which needs a pass) is left out; select(code) picks a product from the status card's button.
for(const [k,v] of Object.entries({ko:{extendBoth:'기간 연장 · 데이터 추가'},en:{extendBoth:'Extend · add data'},zh:{extendBoth:'延长期限 · 追加流量'},ja:{extendBoth:'期間延長 · データ追加'}}))Object.assign(text[k],v);
// 2026-11-07 4차 (review items 13·27): the refund line sits above the pay button with a link to the refund rules,
// and the customer ticks "이용 기간·데이터·환불 규정을 확인했어요" before an order is made; the time is kept with the order.
for(const [k,v] of Object.entries({
 ko:{policy:'단순 변심 환불은 없어요 · 회사 사정(장애로 계속 제공하기 어려울 때·운영 중단·중복/잘못된 결제)이면 환불해요 · 하루 합계 4시간 넘는 장애는 1일 연장해요',refundLink:'환불 규정 보기',ack:'이용 기간·데이터·환불 규정을 확인했어요',ackNeeded:'결제하기 전에 이용 기간·데이터·환불 규정을 확인하고 체크해 주세요'},
 en:{policy:'No refunds for a change of mind · we refund for reasons on our side (an outage we cannot fix, closing the service, a duplicate or wrong payment) · an outage over 4 hours in a day adds 1 day',refundLink:'Refund rules',ack:'I have checked the duration, data and refund rules',ackNeeded:'Before paying, check the duration, data and refund rules and tick the box'},
 zh:{policy:'不支持因个人原因退款 · 因公司原因（故障无法继续提供、停止运营、重复/错误付款）可退款 · 当天故障合计超过 4 小时延长 1 天',refundLink:'查看退款规定',ack:'我已确认使用期限、流量和退款规定',ackNeeded:'付款前请确认使用期限、流量和退款规定并勾选'},
 ja:{policy:'お客様都合による返金はできません · 当社都合（障害で提供を続けられない場合・運営終了・重複/誤った決済）の場合は返金します · 1日合計4時間を超える障害は1日延長します',refundLink:'返金規定を見る',ack:'利用期間・データ・返金規定を確認しました',ackNeeded:'お支払いの前に利用期間・データ・返金規定を確認してチェックしてください'}}))Object.assign(text[k],v);
// Won and yuan (2026-11-07): the price shown big is in the currency the chosen payment method charges, the other
// currency sits under it; the line under the methods says which method pays in which currency.
for(const [k,v] of Object.entries({
 ko:{currencyNote:'위챗페이·알리페이는 위안(元), 카카오페이·계좌이체는 원화로 결제돼요'},
 en:{currencyNote:'WeChat Pay and Alipay charge in yuan (元); KakaoPay and bank transfer in won'},
 zh:{currencyNote:'微信支付和支付宝以人民币（元）付款，KakaoPay 和银行转账以韩元付款'},
 ja:{currencyNote:'WeChat Pay・Alipayは人民元（元）、KakaoPay・銀行振込はウォンで決済されます'}}))Object.assign(text[k],v);
// 담당자 입금 확인 (2026-11-24): no payment gateway. 신청하기 makes the order; the screen shows the receiving account or
// QR (only here, never in chat) with a 4-digit order number; '입금했어요' tells the staff, who confirm the deposit.
// KakaoPay is not offered.
for(const [k,v,reasons,errors] of [
 ['ko',{intro:'신청하면 결제 안내가 나와요 · 담당자가 입금을 확인하면 이용권에 반영돼요',restart:n=>'입금이 확인되면 오늘부터 '+n+'일 · 같은 키로 다시 연결돼요',firstAfter:n=>'입금 확인과 키 발급이 끝나면 '+n+'일이 시작돼요',pay:v=>v+' 신청하기',
   confirmTitle:'결제 안내',pendingTitle:'입금을 기다리는 신청이 있어요',waitingTitle:'입금 확인을 기다리고 있어요',fresh:'다른 상품으로 다시 신청',cancel:'다른 상품으로 다시 신청',
   guideLoading:'결제 안내를 불러오고 있어요',guideMissing:'이 결제 수단 안내가 아직 준비되지 않았어요 · 1:1 문의로 알려 주세요',bank:'은행',account:'계좌번호',holder:'예금주',send:'보낼 금액',reference:'주문 번호',copy:'복사',copied:'복사했어요',
   payerHint:r=>'입금자명은 이름 뒤에 주문 번호 '+r+'를 붙여 주세요 (예: 홍길동'+r+')',qrHint:(app,r)=>app+'에서 QR을 스캔해 위 금액을 보내고, 메모(备注)에 주문 번호 '+r+'를 적어 주세요',qrAlt:app=>app+' 결제 QR',
   deadline:d=>'이 신청은 '+d+'까지 입금을 기다려요',offHours:'상담 시간 밖에 입금해도 담당자가 확인해서 반영해요',safety:'이음은 이 화면의 계좌·QR 말고 다른 곳으로 입금을 안내하지 않아요',
   payer:'입금자명',payerPlaceholder:r=>'예: 홍길동'+r,paid:'입금했어요',payerNeeded:'입금자명을 적어 주세요',noticeSending:'입금 알림을 보내고 있어요',
   waitingNote:t=>t+'에 입금 알림을 보냈어요 · 담당자가 확인하면 바로 반영되고 1:1 문의로 알려 드려요',openSupport:'1:1 문의 보기',check:'반영됐는지 확인',checked:'아직 입금 확인 전이에요',
   ackNeeded:'신청하기 전에 이용 기간·데이터·환불 규정을 확인하고 체크해 주세요',currencyNote:'위챗페이·알리페이는 위안(元), 계좌이체는 원화로 결제해요',fine:'자동 갱신 없이 필요한 기간만 결제해요'},
  {'payment-setup':'결제 안내를 준비하고 있어요 · 1:1 문의로 알려 주세요'},
  {'method-unavailable':'지금은 이 결제 수단을 쓸 수 없어요. 다른 수단을 골라 주세요','payer-name-required':'입금자명을 적어 주세요','manual-payment-unavailable':'지금은 처리하지 못했어요. 잠시 후 다시 시도해 주세요','too-many-pending-orders':'입금을 기다리는 신청이 많아요. 기존 신청을 먼저 진행해 주세요'}],
 ['en',{intro:'Apply and you get payment instructions · your pass updates once our team confirms the deposit',restart:n=>'Starts today once the deposit is confirmed · '+n+' days on the same key',firstAfter:n=>'Your '+n+' days start once the deposit is confirmed and the key is issued',pay:v=>'Apply · '+v,
   confirmTitle:'How to pay',pendingTitle:'You have an order awaiting payment',waitingTitle:'Waiting for the deposit check',fresh:'Apply for something else',cancel:'Apply for something else',
   guideLoading:'Loading payment instructions',guideMissing:'Instructions for this method are not ready yet · please contact us via support',bank:'Bank',account:'Account number',holder:'Account holder',send:'Amount to send',reference:'Order number',copy:'Copy',copied:'Copied',
   payerHint:r=>'Add the order number '+r+' after your name as the depositor name (e.g. Hong Gildong'+r+')',qrHint:(app,r)=>'Scan the QR in '+app+', send the amount above and write the order number '+r+' in the note (备注)',qrAlt:app=>app+' payment QR',
   deadline:d=>'This order waits for your payment until '+d,offHours:'Paid outside support hours? Our team still checks and applies it',safety:'Ieum never asks you to pay to any account or QR other than the one on this screen',
   payer:'Depositor name',payerPlaceholder:r=>'e.g. Hong Gildong'+r,paid:'I have paid',payerNeeded:'Enter the depositor name',noticeSending:'Letting our team know',
   waitingNote:t=>'You told us you paid at '+t+' · once our team confirms it, your pass updates and we reply in support',openSupport:'Open support',check:'Check if it is applied',checked:'The deposit is not confirmed yet',
   ackNeeded:'Before applying, check the duration, data and refund rules and tick the box',currencyNote:'WeChat Pay and Alipay are paid in yuan (元); bank transfer in won',fine:'No auto-renewal · pay only for the period you need'},
  {'payment-setup':'Payment instructions are being prepared · please contact us via support'},
  {'method-unavailable':'This payment method is not available now. Choose another','payer-name-required':'Enter the depositor name','manual-payment-unavailable':'We could not process this right now. Try again shortly','too-many-pending-orders':'Too many orders are awaiting payment. Continue an existing one first'}],
 ['zh',{intro:'申请后会显示付款说明 · 工作人员确认到账后反映到套餐',restart:n=>'确认到账后从今天开始计算 '+n+' 天 · 使用同一密钥重新连接',firstAfter:n=>'确认到账并发放密钥后开始计算 '+n+' 天',pay:v=>'申请 · '+v,
   confirmTitle:'付款说明',pendingTitle:'有等待付款的申请',waitingTitle:'正在等待确认到账',fresh:'重新申请其他商品',cancel:'重新申请其他商品',
   guideLoading:'正在加载付款说明',guideMissing:'该付款方式的说明尚未准备好 · 请通过一对一咨询联系我们',bank:'银行',account:'账号',holder:'户名',send:'付款金额',reference:'订单号',copy:'复制',copied:'已复制',
   payerHint:r=>'汇款人姓名请在姓名后加上订单号 '+r+'（例：洪吉童'+r+'）',qrHint:(app,r)=>'请用'+app+'扫描二维码，支付上方金额，并在备注中填写订单号 '+r,qrAlt:app=>app+'付款二维码',
   deadline:d=>'此申请等待付款至 '+d,offHours:'在客服时间以外付款，工作人员也会确认并反映',safety:'除本页面显示的账户和二维码外，Ieum 不会引导您向其他地方付款',
   payer:'汇款人姓名',payerPlaceholder:r=>'例：洪吉童'+r,paid:'我已付款',payerNeeded:'请填写汇款人姓名',noticeSending:'正在发送付款通知',
   waitingNote:t=>'已于 '+t+' 发送付款通知 · 工作人员确认后立即反映，并通过一对一咨询通知您',openSupport:'查看一对一咨询',check:'确认是否已反映',checked:'尚未确认到账',
   ackNeeded:'申请前请确认使用期限、流量和退款规定并勾选',currencyNote:'微信支付和支付宝以人民币（元）付款，银行转账以韩元付款',fine:'不会自动续费 · 只需为所需期限付款'},
  {'payment-setup':'正在准备付款说明 · 请通过一对一咨询联系我们'},
  {'method-unavailable':'目前无法使用该付款方式，请选择其他方式','payer-name-required':'请填写汇款人姓名','manual-payment-unavailable':'暂时无法处理，请稍后再试','too-many-pending-orders':'等待付款的申请过多，请先完成现有申请'}],
 ['ja',{intro:'申請するとお支払い方法が表示されます · 担当者が入金を確認すると利用権に反映されます',restart:n=>'入金が確認されると今日から'+n+'日 · 同じキーで再接続されます',firstAfter:n=>'入金確認とキー発行の完了後に'+n+'日が始まります',pay:v=>v+'で申請する',
   confirmTitle:'お支払い方法',pendingTitle:'入金待ちの申請があります',waitingTitle:'入金の確認を待っています',fresh:'別の商品で申請し直す',cancel:'別の商品で申請し直す',
   guideLoading:'お支払い方法を読み込んでいます',guideMissing:'この決済方法の案内はまだ準備中です · 1:1お問い合わせでご連絡ください',bank:'銀行',account:'口座番号',holder:'口座名義',send:'お支払い金額',reference:'注文番号',copy:'コピー',copied:'コピーしました',
   payerHint:r=>'振込名義はお名前の後ろに注文番号 '+r+' を付けてください（例：ホンギルドン'+r+'）',qrHint:(app,r)=>app+'でQRを読み取って上の金額を送り、メモ（备注）に注文番号 '+r+' を書いてください',qrAlt:app=>app+'決済QR',
   deadline:d=>'この申請は'+d+'まで入金をお待ちします',offHours:'受付時間外に入金しても担当者が確認して反映します',safety:'イウムはこの画面の口座・QR以外への入金をご案内しません',
   payer:'振込名義',payerPlaceholder:r=>'例：ホンギルドン'+r,paid:'入金しました',payerNeeded:'振込名義を入力してください',noticeSending:'入金のお知らせを送っています',
   waitingNote:t=>t+'に入金のお知らせを送りました · 担当者が確認するとすぐに反映され、1:1お問い合わせでお知らせします',openSupport:'1:1お問い合わせを見る',check:'反映されたか確認',checked:'まだ入金は確認されていません',
   ackNeeded:'申請の前に利用期間・データ・返金規定を確認してチェックしてください',currencyNote:'WeChat Pay・Alipayは人民元（元）、銀行振込はウォンでお支払いください',fine:'自動更新なし · 必要な期間だけお支払い'},
  {'payment-setup':'お支払い方法を準備しています · 1:1お問い合わせでご連絡ください'},
  {'method-unavailable':'現在この決済方法は使えません。別の方法を選んでください','payer-name-required':'振込名義を入力してください','manual-payment-unavailable':'現在処理できません。しばらくしてからお試しください','too-many-pending-orders':'入金待ちの申請が多すぎます。既存の申請を先に進めてください'}]
]){Object.assign(text[k],v);Object.assign(text[k].reasons,reasons);Object.assign(text[k].errors,errors);}
// 2026-11-24 (decided): a WeChat Pay / Alipay payment is matched by the paying account's ID (the payment note may not be
// available on every code), so '입금했어요' asks for it; the order number in the note is "if you can".
for(const [k,v] of [
 ['ko',{qrHint:(app,r)=>app+'에서 QR을 스캔해 위 금액을 보내 주세요. 메모(备注)를 넣을 수 있으면 주문 번호 '+r+'를 적어 주세요',payerId:{wechat_pay:'결제한 위챗 아이디',alipay:'결제한 알리페이 아이디'},payerIdPlaceholder:{wechat_pay:'위챗 아이디(微信号)',alipay:'알리페이 계정 아이디'},payerIdHint:'담당자가 받은 내역과 맞춰 보는 데만 써요',payerIdNeeded:{wechat_pay:'결제한 위챗 아이디를 적어 주세요',alipay:'결제한 알리페이 아이디를 적어 주세요'}}],
 ['en',{qrHint:(app,r)=>'Scan the QR in '+app+' and send the amount above. If you can add a note (备注), write the order number '+r,payerId:{wechat_pay:'WeChat ID you paid with',alipay:'Alipay ID you paid with'},payerIdPlaceholder:{wechat_pay:'WeChat ID (微信号)',alipay:'Alipay account ID'},payerIdHint:'Used only to match your payment in our records',payerIdNeeded:{wechat_pay:'Enter the WeChat ID you paid with',alipay:'Enter the Alipay ID you paid with'}}],
 ['zh',{qrHint:(app,r)=>'请用'+app+'扫描二维码，支付上方金额。如可添加备注，请填写订单号 '+r,payerId:{wechat_pay:'付款的微信号',alipay:'付款的支付宝账号'},payerIdPlaceholder:{wechat_pay:'微信号',alipay:'支付宝账号'},payerIdHint:'仅用于与收款记录核对',payerIdNeeded:{wechat_pay:'请填写付款的微信号',alipay:'请填写付款的支付宝账号'}}],
 ['ja',{qrHint:(app,r)=>app+'でQRを読み取って上の金額を送ってください。メモ（备注）を付けられる場合は注文番号 '+r+' を書いてください',payerId:{wechat_pay:'支払いに使ったWeChat ID',alipay:'支払いに使ったAlipay ID'},payerIdPlaceholder:{wechat_pay:'WeChat ID（微信号）',alipay:'Alipayアカウント ID'},payerIdHint:'担当者が入金記録と照合するためだけに使います',payerIdNeeded:{wechat_pay:'支払いに使ったWeChat IDを入力してください',alipay:'支払いに使ったAlipay IDを入力してください'}}]
])Object.assign(text[k],v);
for(const [k,v] of [['ko','안내'],['en','Please note'],['zh','注意事项'],['ja','ご案内']])text[k].noticeTitle=v;
const refundHref=()=>typeof location!=='undefined'&&/\.github\.io$/i.test(location.hostname??'')?'./refund.html':'./refund.html';
export function formatKrw(amount,language){return formatMoney(amount,'KRW',locale(language));}
// A product's amount in a currency (older catalogs carry only the won amount).
export const amountIn=(p,currency)=>Number.isSafeInteger(p?.prices?.[currency])?p.prices[currency]:currency==='KRW'&&Number.isSafeInteger(p?.amountMinor)?p.amountMinor:null;
const validProducts=p=>p&&p.simulation===true&&Array.isArray(p.methods)&&Array.isArray(p.plan?.options)&&Array.isArray(p.topup?.options);
export function mountVerifiedOrder({root,language='ko',initialProduct=null,loadProducts,createOrder,instructions=null,notifyDeposit=null,openSupport=null,claimTrial=null,quoteDiscount=null,onChanged=()=>{},onAuthLoss=()=>{}}){
 const doc=root.ownerDocument;let lang=locale(language),trialRequestId=null,products=null,choice=null,method=null,order=null,requestId=null,busy=false,message=null,messageKind='info',stopped=false,seq=0,loadFailed=false,ack=false,ackBox=null;
 // 할인 코드: what was typed, the code applied with its quote, and why a code did not apply.
 let codeText='',discount=null,discountError=null,discountBusy=false;
 // 담당자 입금 확인: the order's payment instructions (receiving account or QR), the depositor name being typed, which
 // value was just copied.
 let guide=null,guideFor=null,guideFailed=false,payerText='',copied=null;
 root.hidden=false;root.setAttribute('translate','no');root.classList?.add('order-card');
 const make=(tag,value,cls,parent)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;parent.append(n);return n;};
 const button=(label,cls,parent,action)=>{const b=make('button',label,cls,parent);b.type='button';b.disabled=busy;b.onclick=action;return b;};
 const selected=()=>products?[...products.plan.options.map(p=>({...p,kind:'plan'})),...products.topup.options.map(p=>({...p,kind:'topup'}))].find(p=>p.code===choice)??null:null;
 function say(key,kind='info'){message=key;messageKind=kind;}
 function fail(e){if(e?.status===401){dispose();onAuthLoss();return;}say('error:'+(Object.hasOwn(text.ko.errors,e?.reason)?e.reason:'unavailable'),'error');}
 const currency=()=>products?.methodCurrency?.[method]??currencyOf(method);
 const priceOf=p=>{const c=currency(),a=amountIn(p,c);return a===null?formatMoney(p.amountMinor,'KRW',lang):formatMoney(a,c,lang);};
 const otherOf=p=>{const c=currency()==='CNY'?'KRW':'CNY',a=amountIn(p,c);return a===null?'':formatMoney(a,c,lang);};
 function optionCard(parent,{code,title,note,price,alt,meta,badge,disabled}){
  const label=make('label',undefined,'order-option',parent);label.setAttribute('data-selected',String(choice===code));if(disabled)label.setAttribute('data-disabled','true');
  const input=make('input',undefined,undefined,label);input.type='radio';input.name='ieum-order-product';input.value=code;input.checked=choice===code;input.disabled=!!disabled||busy;input.onchange=()=>{choice=code;requestId=null;message=null;draw();if(discount)void applyCode(discount.code);};
  const top=make('span',undefined,'order-option-top',label);make('span',title,'order-option-title',top);if(badge)make('span',badge,'order-option-badge',top);if(note)make('span',note,'order-option-note',label);
  make('strong',price,'order-option-price',label);if(alt)make('span',alt,'order-option-alt',label);if(meta)make('span',meta,'order-option-meta',label);
 }
 function drawChoose(l){
  const plan=products.plan,topup=products.topup,head=make('div',undefined,'order-head',root);const extending=plan.purpose==='extension'||(!plan.purpose&&plan.currentExpiresAt);make('h2',extending?(topup.available||topup.reason!=='active-pass-required'?l.extendBoth:l.extension):l.purchase,undefined,head);make('p',l.intro,'order-intro',head);if(products.lastEnding&&Number.isSafeInteger(products.lastEnding.amountMinor))make('p',l.ended(products.lastEnding,formatMoney(products.lastEnding.amountMinor,products.lastEnding.currency??'KRW',lang)),'order-ended',head);
  if(products.trial?.available&&claimTrial){const box=make('div',undefined,'order-trial',root);box.setAttribute('data-selected',String(initialProduct==='trial'));const copy=make('div',undefined,'order-trial-copy',box);make('span',l.trialTitle,'order-trial-label',copy);make('strong',l.trialLead,undefined,copy);make('p',l.trialMeta(products.trial.hours,formatBytes(products.trial.dataBytes)),undefined,copy);button(l.trialStart,'button secondary order-trial-start',box,()=>void startTrial());}
  const planGroup=make('fieldset',undefined,'order-group',root);make('legend',l.plan,undefined,planGroup);
  // Every pass carries the monthly base allowance (decided 100GB): shown before paying, as the terms rely on it (2026-11-06).
  if(Number.isSafeInteger(plan.monthlyBaseBytes)&&plan.monthlyBaseBytes>0)make('p',l.dataValue(formatBytes(plan.monthlyBaseBytes)),'order-allowance',planGroup);
  const grid=make('div',undefined,'order-options',planGroup);
  for(const p of plan.options)optionCard(grid,{code:p.code,title:l.days(p.durationDays),price:priceOf(p),alt:otherOf(p),note:l.fit[p.durationDays]??'',meta:l.once(p.durationDays),disabled:!plan.available});
  if(!plan.available)make('p',l.reasons[plan.reason]??l.errors.unavailable,'order-reason',planGroup);
  else{const sel=selected();const current=Date.parse(plan.currentExpiresAt);if(sel?.kind==='plan')make('p',plan.restart?l.restart(sel.durationDays):plan.purpose==='extension'&&Number.isFinite(current)?l.after(formatSeoulDate(current+sel.durationDays*86400000,lang)):l.firstAfter(sel.durationDays),'order-preview',planGroup);}
  // Data add-on: only with a pass (before the first pass it would only say it cannot be used).
  if(topup.available||topup.reason!=='active-pass-required'){const topGroup=make('fieldset',undefined,'order-group order-topup',root);make('legend',l.topup,undefined,topGroup);const topGrid=make('div',undefined,'order-options order-options-single',topGroup);
  for(const t of topup.options)optionCard(topGrid,{code:t.code,title:l.topupName(formatBytes(t.bytes)),price:priceOf(t),alt:otherOf(t),meta:topup.available&&topup.cycleEndsAt?l.topupMeta(formatSeoulDay(topup.cycleEndsAt,lang)):'',disabled:!topup.available});
  if(!topup.available)make('p',l.reasons[topup.reason]??l.errors.unavailable,'order-reason',topGroup);}
  const methodGroup=make('fieldset',undefined,'order-group',root);make('legend',l.method,undefined,methodGroup);const seg=make('div',undefined,'order-methods',methodGroup);
  // Main customers are Koreans living in China (decided 2026-11-05): WeChat Pay and Alipay first in every language, then
  // bank transfer (KakaoPay dropped 2026-11-24).
  const preferred=['wechat_pay','alipay','bank_transfer'],rank=m=>{const i=preferred.indexOf(m);return i<0?99:i;};
  for(const m of [...products.methods].filter(m=>m!=='kakao_pay').sort((a,b)=>rank(a)-rank(b))){const label=make('label',undefined,'order-method',seg);label.setAttribute('data-selected',String(method===m));const input=make('input',undefined,undefined,label);input.type='radio';input.name='ieum-order-method';input.value=m;input.checked=method===m;input.disabled=busy;input.onchange=()=>{method=m;requestId=null;draw();if(discount)void applyCode(discount.code);};make('span',l.methods[m]??m,undefined,label);}
  make('p',l.currencyNote,'order-currency-note',methodGroup);
  if(quoteDiscount&&selected()?.kind==='plan'&&plan.available){const g=make('fieldset',undefined,'order-group order-discount',root);make('legend',l.discount,undefined,g);const row=make('div',undefined,'order-discount-row',g);
   if(discount){const q=discount.quote,tag=make('span',undefined,'order-discount-tag',row);make('strong',discount.code,undefined,tag);make('span',q.discountMinor>0?l.discountOff(formatMoney(q.discountMinor,q.currency,lang)):l.discountDays(q.codeDays),undefined,tag);button(l.discountRemove,'button secondary order-discount-remove',row,()=>{discount=null;discountError=null;requestId=null;draw();});}
   else{const input=make('input',undefined,'order-discount-input',row);input.type='text';input.maxLength=20;input.autocomplete='off';input.placeholder=l.discountPlaceholder;input.value=codeText;input.setAttribute('aria-label',l.discount);input.oninput=()=>{codeText=String(input.value??'');};input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault?.();void applyCode(codeText);}};
    const b=button(l.discountApply,'button secondary order-discount-apply',row,()=>void applyCode(codeText));b.disabled=busy||discountBusy;}
   if(discountError){const e=make('p',l.errors[discountError]??l.errors.unavailable,'order-discount-error',g);e.setAttribute('role','alert');}}
  // Refund line, refund rules and the required tick, above the button (review item 13).
  const terms=make('div',undefined,'order-terms',root);const line=make('p',l.policy+' ','order-policy',terms);const rules=make('a',l.refundLink,'order-refund-link',line);rules.href=refundHref();rules.target='_blank';rules.rel='noopener';
  const tick=make('label',undefined,'order-ack',terms),box=make('input',undefined,undefined,tick);box.type='checkbox';box.checked=ack;box.disabled=busy;box.onchange=()=>{ack=!!box.checked;if(ack&&message==='ackNeeded')message=null;draw();};make('span',l.ack,undefined,tick);ackBox=box;
  if(message==='ackNeeded'){tick.setAttribute('data-missing','true');box.setAttribute('aria-invalid','true');}
  const sel=selected(),q=sel?.kind==='plan'?discount?.quote:null,total=q?formatMoney(q.amountMinor,q.currency,lang):sel?priceOf(sel):'—',bar=make('div',undefined,'order-summary',root),sum=make('div',undefined,'order-total',bar);make('span',l.total,undefined,sum);
  if(q&&q.discountMinor>0)make('s',formatMoney(q.listAmountMinor,q.currency,lang),'order-list-price',sum);make('strong',total,undefined,sum);
  const go=button(sel?l.pay(total):l.selectFirst,'button primary order-submit',bar,()=>void submit());go.disabled=busy||!sel||!method||discountBusy;
 }
 function copyButton(parent,l,key,value){const b=button(copied===key?l.copied:l.copy,'button secondary order-copy',parent,async()=>{try{await doc.defaultView?.navigator?.clipboard?.writeText(value);copied=key;draw();setTimeout(()=>{if(copied===key){copied=null;draw();}},1600);}catch{}});b.disabled=false;b.setAttribute('aria-label',l.copy+' · '+value);return b;}
 // 결제 안내 (2026-11-24): what was applied for, where to pay (account or QR), the order number, then '입금했어요'.
 function drawConfirm(l,pending){
  const deposit=order.deposit??null,box=make('div',undefined,'order-checkout',root);box.setAttribute('data-step',deposit?'waiting':'pay');make('p',deposit?l.waitingTitle:pending?l.pendingTitle:l.confirmTitle,'order-checkout-title',box);
  const sel=[...(products?.plan.options??[]),...(products?.topup.options??[])].find(p=>p.code===order.productCode);
  const name=order.purpose==='monthly_topup'?l.topupName(formatBytes(order.quantityBytes)):(order.purpose==='extension'?l.extension:l.purchase)+' · '+l.days(order.durationDays??sel?.durationDays);
  const facts=make('dl',undefined,'order-checkout-facts',box),base=products?.plan?.monthlyBaseBytes,rows=[[l.product,name]];if(order.purpose!=='monthly_topup'&&Number.isSafeInteger(base)&&base>0)rows.push([l.data,l.dataValue(formatBytes(base))]);rows.push([l.method,l.methods[order.method]??order.method]);
  if(order.discountMinor>0)rows.push([l.listPrice,formatMoney(order.listAmountMinor,order.currency??'KRW',lang)],[l.discountRow,'−'+formatMoney(order.discountMinor,order.currency??'KRW',lang)]);
  if(order.codeDays>0)rows.push([l.codeDaysRow,l.plusDays(order.codeDays)]);if(order.referralDays>0)rows.push([l.referralRow,l.plusDays(order.referralDays)]);
  rows.push([l.total,formatMoney(order.amountMinor,order.currency??'KRW',lang)]);for(const [k,v] of rows){const row=make('div',undefined,undefined,facts);make('dt',k,undefined,row);make('dd',v,undefined,row);}
  const ref=order.reference??guide?.reference??'',amount=formatMoney(order.amountMinor,order.currency??'KRW',lang),app=l.methods[order.method]??order.method;
  const pay=make('div',undefined,'order-pay-guide',box);
  if(!guide||guideFor!==order.id){make('p',guideFailed?l.errors.unavailable:l.guideLoading,'order-pay-loading',pay);if(guideFailed)button(l.retry,'button secondary',pay,()=>void loadGuide());}
  else if(!guide.receiving)make('p',l.guideMissing,'order-pay-missing',pay);
  else{const r=guide.receiving,qr=order.method!=='bank_transfer';
   // QR methods: the code first (scan it), then the amount and order number to send with it.
   if(qr){const fig=make('figure',undefined,'order-qr',pay),img=make('img',undefined,undefined,fig);img.src=r.qrImage;img.alt=l.qrAlt(app);img.width=220;img.height=220;img.decoding='async';}
   const list=make('dl',undefined,'order-pay-facts',pay);
   const line=(k,v,copyKey)=>{const row=make('div',undefined,undefined,list);make('dt',k,undefined,row);const dd=make('dd',undefined,undefined,row);make('strong',v,undefined,dd);if(copyKey)copyButton(dd,l,copyKey,copyKey==='amount'?String(order.currency==='CNY'?order.amountMinor/100:order.amountMinor):v);};
   if(order.method==='bank_transfer'){line(l.bank,r.bankName);line(l.account,r.accountNumber,'account');line(l.holder,r.holder);line(l.send,amount,'amount');line(l.reference,ref,'reference');}
   else{line(l.send,amount,'amount');line(l.reference,ref,'reference');}}
  // 안내 (2026-11-24, decided): every note about paying sits in one titled box — how to write the depositor name or
  // note, the staff's line, the deadline, out-of-hours deposits and the only-this-account warning.
  const notes=[];if(guide?.receiving&&guideFor===order.id){notes.push(order.method==='bank_transfer'?l.payerHint(ref):l.qrHint(app,ref));if(guide.receiving.note)notes.push(guide.receiving.note);if(guide.expiresAt&&!deposit)notes.push(l.deadline(formatSeoulDate(Date.parse(guide.expiresAt),lang)));}
  notes.push(l.offHours,l.safety);
  const notice=make('section',undefined,'order-notice',box);notice.setAttribute('aria-label',l.noticeTitle);make('p',l.noticeTitle,'order-notice-title',notice);const ul=make('ul',undefined,undefined,notice);for(const n of notes)make('li',n,undefined,ul);
  const after=make('div',undefined,'order-paid',box);
  if(deposit){make('p',l.waitingNote(formatSeoulDate(Date.parse(deposit.at),lang)),'order-waiting-note',after);const a=make('div',undefined,'order-actions',after);
   if(openSupport)button(l.openSupport,'button secondary',a,()=>{try{openSupport();}catch{}});button(l.check,'button secondary',a,()=>void check());}
  else if(guide?.receiving&&guideFor===order.id){
   {const bank=order.method==='bank_transfer',label=make('label',undefined,'order-payer',after);make('span',bank?l.payer:l.payerId[order.method]??l.payer,undefined,label);const input=make('input',undefined,undefined,label);input.type='text';input.maxLength=40;input.autocomplete=bank?'name':'off';if(!bank){input.autocapitalize='off';input.spellcheck=false;}input.placeholder=bank?l.payerPlaceholder(ref):l.payerIdPlaceholder[order.method]??'';input.value=payerText;input.disabled=busy;input.oninput=()=>{payerText=String(input.value??'');if(message==='payerNeeded')message=null;};if(message==='payerNeeded')input.setAttribute('aria-invalid','true');if(!bank)make('small',l.payerIdHint,'order-payer-hint',label);}
   const a=make('div',undefined,'order-actions',after);button(l.paid,'button primary order-paid-button',a,()=>void sendDeposit());}
  // 2026-11-24 (decided): the payment guide carries no refund wording; the rules are shown and ticked before applying.
  if(!deposit){const actions=make('div',undefined,'order-actions order-actions-quiet',box);button(l.fresh,'button secondary',actions,()=>{order=null;requestId=null;message=null;guide=null;guideFor=null;payerText='';if(products)products.pendingOrder=null;draw();});}
 }
 function draw(){
  if(stopped)return;const l=text[lang];root.replaceChildren();
  if(!products){make('p',loadFailed?l.errors.unavailable:l.loading,'order-loading',root);if(loadFailed)button(l.retry,'button secondary',root,()=>void reload());return;}
  if(order)drawConfirm(l,order.pending===true);else drawChoose(l);
  if(message){const n=make('p',message.startsWith('error:')?l.errors[message.slice(6)]:message==='payerNeeded'&&order&&order.method!=='bank_transfer'?l.payerIdNeeded[order.method]??l.payerNeeded:l[message],'order-message',root);n.setAttribute('role',messageKind==='error'?'alert':'status');n.setAttribute('data-kind',messageKind);}
  make('p',l.fine,'order-fine',root);
 }
 async function reload(){if(stopped)return;const current=++seq;try{const result=await loadProducts();if(stopped||current!==seq)return;if(!validProducts(result))throw Error('invalid-products');products=result;loadFailed=false;
   if(!method||!products.methods.includes(method))method=['wechat_pay','alipay','bank_transfer'].find(m=>products.methods.includes(m))??null;
   if(choice&&!selected())choice=null;const sel=selected();if(sel&&(sel.kind==='plan'?!products.plan.available:!products.topup.available))choice=null;
   if(!choice)choice=products.plan.available?(products.plan.options.find(p=>p.code===initialProduct)??products.plan.options[0])?.code??null:products.topup.available?products.topup.options[0]?.code??null:null;
   // The order on screen follows the server: once a staff member confirms it (or it is no longer accepted) it is gone.
   if(order&&products.pendingOrder?.id===order.id)order={...order,deposit:products.pendingOrder.deposit??order.deposit??null};
   else if(products.pendingOrder){order={...products.pendingOrder,pending:true};requestId=null;}else if(order){order=null;requestId=null;guide=null;guideFor=null;}
   if(order&&guideFor!==order.id)void loadGuide();
  }catch(e){if(stopped||current!==seq)return;if(e?.status===401){dispose();onAuthLoss();return;}products=null;loadFailed=true;}draw();}
 async function submit(){const sel=selected();if(busy||!sel||!method)return;
  if(!ack){say('ackNeeded','error');draw();ackBox?.focus?.();ackBox?.scrollIntoView?.({block:'center'});return;}
  busy=true;requestId??=crypto.randomUUID();say('creating');draw();
  try{const result=await createOrder({productCode:sel.code,method,requestId,refundAck:true,...(sel.kind==='plan'&&discount?{discountCode:discount.code}:{})});if(stopped)return;order=result.order;message=null;guide=null;guideFor=null;void loadGuide();}catch(e){if(stopped)return;fail(e);if(e?.reason==='order-conflict')requestId=null;}finally{busy=false;}draw();}
 // 할인 코드: checked against this payment (pass and method) before the order; the order checks again.
 async function applyCode(raw){const code=String(raw??'').trim().toUpperCase().replace(/[\s-]/g,'');const sel=selected();if(!quoteDiscount||!sel||sel.kind!=='plan'||!method||discountBusy)return;
  if(!/^[A-Z0-9]{4,20}$/.test(code)){discount=null;discountError='discount-unknown';draw();return;}
  discountBusy=true;discountError=null;draw();
  try{const quote=await quoteDiscount({productCode:sel.code,method,discountCode:code});if(stopped)return;discount={code,quote};codeText=code;requestId=null;}
  catch(e){if(stopped)return;if(e?.status===401){dispose();onAuthLoss();return;}discount=null;discountError=Object.hasOwn(text.ko.errors,e?.reason)?e.reason:'unavailable';}
  finally{discountBusy=false;}draw();}
 async function startTrial(){if(busy||!claimTrial)return;busy=true;trialRequestId??=crypto.randomUUID();say('trialCreating');draw();
  try{await claimTrial({requestId:trialRequestId});if(stopped)return;busy=false;trialRequestId=null;say('trialStarted','ok');try{onChanged();}catch{}}catch(e){if(stopped)return;busy=false;fail(e);if(['trial-used','paid-customer','trial-email-used','trial-daily-limit','trial-place-limit'].includes(e?.reason))trialRequestId=null;}draw();await reload();}
 async function loadGuide(){if(!order||!instructions)return;const id=order.id;guideFor=null;guideFailed=false;
  try{const g=await instructions(id);if(stopped||order?.id!==id)return;guide=g;guideFor=id;if(g?.deposit&&!order.deposit)order={...order,deposit:g.deposit};}
  catch(e){if(stopped||order?.id!==id)return;if(e?.status===401){dispose();onAuthLoss();return;}if(e?.reason==='payment-order-not-found'){order=null;requestId=null;guide=null;}else guideFailed=true;}draw();}
 async function sendDeposit(){if(busy||!order||!notifyDeposit)return;const payer=payerText.trim();
  if(!payer){say('payerNeeded','error');draw();root.querySelector?.('.order-payer input')?.focus?.();return;}
  busy=true;say('noticeSending');draw();
  try{const r=await notifyDeposit(order.id,payer);if(stopped)return;order={...order,deposit:r?.deposit??{payerName:payer||null,at:new Date().toISOString()}};message=null;try{onChanged();}catch{}}
  catch(e){if(stopped)return;fail(e);}finally{busy=false;}draw();}
 // '반영됐는지 확인': the pass is applied when the staff confirm, so reload shows it (or says it is not confirmed yet).
 async function check(){if(busy)return;const id=order?.id;await reload();if(stopped)return;if(order?.id===id){say('checked');draw();}else{say('done','ok');try{onChanged();}catch{}draw();}}
 function change(e){lang=locale(e.detail?.locale);draw();}
 function dispose(){stopped=true;seq++;doc.removeEventListener?.('ieum-language-change',change);root.replaceChildren();root.hidden=true;}
 // Pick a product from elsewhere on the page ('plan' = the first pass, 'topup' = the first data add-on, or a code);
 // nothing changes while a payment is open. Returns whether it was picked.
 function select(code){if(stopped||busy||order||!products)return false;const want=code==='plan'?products.plan.options[0]?.code:code==='topup'?products.topup.options[0]?.code:code;
  const all=[...products.plan.options.map(p=>({...p,kind:'plan'})),...products.topup.options.map(p=>({...p,kind:'topup'}))],hit=all.find(p=>p.code===want);
  if(!hit||(hit.kind==='plan'?!products.plan.available:!products.topup.available))return false;choice=hit.code;requestId=null;message=null;draw();return true;}
 const ready=()=>products!==null;
 doc.addEventListener?.('ieum-language-change',change);draw();const first=reload();
 return {reload,dispose,select,ready,loaded:first};
}
