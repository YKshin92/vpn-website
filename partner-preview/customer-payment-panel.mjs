// Read-only simulation component. No credentials, provider calls or write controls.
const labels={
 ko:{title:'결제·이용권 처리',demo:'예시 시뮬레이션 · 실제 결제·VPN 연결 없음',waiting:'이용권 반영을 기다리고 있어요',ready:'예시 이용권 반영 완료',review:'처리 상태를 확인하고 있어요',unavailable:'처리 정보를 불러오지 못했습니다',site:'메일 안내와 별도로 사이트에서 이용권 상태를 확인할 수 있습니다',pending:'안내 준비 중',sending:'안내 결과 확인 중',retryable:'안내를 다시 준비해야 합니다',sent:'모의 안내 접수 완료',needs_review:'안내 결과 확인 필요',not_queued:'안내 대기',admin:'관리자 확인',unknown:'다시 조회한 뒤 처리 상태를 확인해 주세요',target_policy:'월간 기준점·주기·키 연결 또는 정책 확인 필요',apply_uncertain:'모의 키 반영 결과 불명 · 자동 재발급 중단',proof_mismatch:'목표와 확인 증거 불일치',finish_uncertain:'완료 저장 또는 월간 목표 변경 확인 필요',interrupted:'중단된 작업 · 재실행 전 대사 필요'},
 en:{title:'Payment and pass',demo:'Example simulation · no real payment or VPN connection',waiting:'Your pass update is processing',ready:'Example pass updated',review:'We are checking the processing status',unavailable:'Could not load processing details',site:'Pass status is available on the site independently of email notices',pending:'Notice pending',sending:'Checking notice outcome',retryable:'Notice needs another attempt',sent:'Mock notice accepted',needs_review:'Notice outcome needs review',not_queued:'Notice not queued',admin:'Administrator review',unknown:'Refresh to check the latest processing status',target_policy:'Check monthly baseline, cycle, key binding or policy',apply_uncertain:'Mock key outcome unknown · automatic reissue stopped',proof_mismatch:'Target and acknowledgement differ',finish_uncertain:'Check completion storage or changed monthly target',interrupted:'Interrupted · reconcile before another attempt'},
 zh:{title:'付款与套餐处理',demo:'示例模拟 · 无实际付款或 VPN 连接',waiting:'正在更新您的套餐',ready:'示例套餐更新完成',review:'正在核对处理状态',unavailable:'无法加载处理信息',site:'即使邮件通知未完成，也可在网站查看套餐状态',pending:'通知待处理',sending:'正在核对通知结果',retryable:'通知需要重试',sent:'模拟通知已受理',needs_review:'通知结果待核对',not_queued:'通知尚未排队',admin:'管理员核对',unknown:'请刷新并查看最新处理状态',target_policy:'需核对月度基准、周期、密钥关联或政策',apply_uncertain:'模拟密钥结果未知 · 已停止自动重发',proof_mismatch:'目标与确认凭据不一致',finish_uncertain:'需核对完成记录或月度目标变更',interrupted:'任务中断 · 重试前需核对'},
 ja:{title:'決済・利用権の処理',demo:'サンプルシミュレーション · 実際の決済・VPN接続なし',waiting:'利用権を更新しています',ready:'サンプル利用権の更新完了',review:'処理状況を確認しています',unavailable:'処理情報を取得できませんでした',site:'メール通知とは別にサイトで利用権の状態を確認できます',pending:'通知待ち',sending:'通知結果を確認中',retryable:'通知の再試行が必要です',sent:'模擬通知の受付完了',needs_review:'通知結果の確認が必要です',not_queued:'通知は未登録です',admin:'管理者による確認',unknown:'再読み込みして最新の処理状況を確認してください',target_policy:'月次基準・期間・キーの関連付け・方針の確認が必要です',apply_uncertain:'模擬キーの結果不明 · 自動再発行を停止',proof_mismatch:'目標と確認証跡が一致しません',finish_uncertain:'完了記録または月次目標の変更を確認してください',interrupted:'処理中断 · 再試行前に照合が必要です'}
};
export function paymentPanelModel(value,{administrator=false,language='ko'}={}){
 const l=Object.hasOwn(labels,language)?labels[language]:labels.ko;
 const valid=value?.simulation===true&&['queued','running','succeeded','needs_review'].includes(value.fulfillment)&&['pending','sending','retryable','sent','needs_review','not_queued'].includes(value.notification)&&typeof value.simulatedPassAvailable==='boolean';
 if(!valid)return {title:l.title,demo:l.demo,heading:l.unavailable,detail:l.unknown,notice:null,admin:null};
 const ready=value.fulfillment==='succeeded'&&value.simulatedPassAvailable;
 const reason=['target_policy','apply_uncertain','proof_mismatch','finish_uncertain','interrupted'].includes(value.reviewReason)?l[value.reviewReason]:l.unknown;
 return {title:l.title,demo:l.demo,heading:ready?l.ready:value.fulfillment==='needs_review'?l.review:l.waiting,detail:l.site,notice:l[value.notification],admin:administrator&&value.fulfillment==='needs_review'?l.admin+': '+reason:null};
}
export function renderPaymentPanel(root,value,options){
 const model=paymentPanelModel(value,options);root.replaceChildren();
 for(const [tag,text] of [['h2',model.title],['small',model.demo],['h3',model.heading],['p',model.detail],['p',model.notice],['p',model.admin]])if(text){const n=root.ownerDocument.createElement(tag);n.textContent=text;root.append(n);}
}
export function mountPaymentPanel({root,enabled=false,load,administrator=false,language='ko'}){
 let disposed=false,request=0;root.hidden=!enabled;
 async function refresh(){if(!enabled||disposed)return;const current=++request;try{const value=await load();if(!disposed&&current===request)renderPaymentPanel(root,value,{administrator,language});}catch{if(!disposed&&current===request)renderPaymentPanel(root,null,{administrator,language});}}
 if(enabled)void refresh();return {refresh,dispose(){disposed=true;request++;root.replaceChildren();root.hidden=true;}};
}
