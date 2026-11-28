const text={
 ko:{usageReal:'접속 키는 아래 "내 VPN 키"에 있어요 · 남은 데이터는 처음 확인한 뒤부터 여기에 보여요',keyReal:'',noteReal:'키를 Outline 앱에 추가하면 바로 연결돼요',title:'현재 이용권',note:'검증 결제 기준 · 격리 모의 이용권',chip:{active:'이용 중',expired:'만료',['not-issued']:'신청 전',needs_review:'확인 중'},active:'반영된 이용권이 있어요',expired:'이용기간이 끝났어요','not-issued':'아직 반영된 이용권이 없어요',needs_review:'이용권 상태를 확인하고 있어요',processing:'신청 내용을 반영하고 있어요',idle:'추가 반영 대기 없음',review:'추가 변경 내용을 확인하고 있어요',days:n=>n+'일 남음',today:'오늘 종료',ended:'기간 종료',none:'이용권 없음',checking:'확인 중',expiry:'이용 종료일',base:'월 기본 제공량',update:'반영 상태',usage:'사용량은 처음 확인한 뒤부터 보여요',key:'접속 키는 아직 준비 중이에요',readonly:'이 화면은 보기만 할 수 있어요',adminNote:'이번 주기 사용량과 접속 키 상태는 고객 메뉴의 고객 상세에서 확인하세요',trialChip:'무료 체험',trialEndedChip:'체험 종료',hours:n=>n+'시간 남음',minutes:'1시간 미만 남음',trialActive:'무료 체험 중이에요 · 자동 유료 전환은 없어요',trialEnded:'무료 체험이 끝났어요 · 이용권을 신청하면 계속 쓸 수 있어요',trialExpiry:'체험 종료',trialData:'체험 데이터',cycle:'이번 사용 주기 제공량',cycleDetail:(b,x,d)=>'기본 '+b+' + 추가 '+x+' · '+d+'까지',cycleUntil:d=>d+'까지',cycleChecking:'사용 주기 확인 중',refresh:'새로 확인',error:'이용권 정보를 불러오지 못했어요',loading:'이용권을 확인하고 있어요'},
 en:{usageReal:'Your access key is under "My VPN key" below · data left shows here after the first check',keyReal:'',noteReal:'Add the key to the Outline app to connect',title:'Current pass',note:'Verified-payment simulation',chip:{active:'Active',expired:'Expired',['not-issued']:'Not started',needs_review:'Checking'},active:'Your applied pass is available',expired:'Your pass has expired','not-issued':'No applied pass yet',needs_review:'We are checking your pass',processing:'Your update is processing',idle:'No pending update',review:'We are reviewing your update',days:n=>n+(n===1?' day left':' days left'),today:'Ends today',ended:'Ended',none:'No pass',checking:'Checking',expiry:'Expires at',base:'Monthly base allowance',update:'Update status',usage:'Usage will appear after metering is connected',key:'Real VPN key delivery is not connected yet',readonly:'This view is read only',trialChip:'Free trial',trialEndedChip:'Trial ended',hours:n=>n+(n===1?' hour left':' hours left'),minutes:'Less than an hour left',trialActive:'You are on the free trial · it never converts to a paid pass',trialEnded:'Your free trial has ended · get a pass to keep using it',trialExpiry:'Trial ends',trialData:'Trial data',cycle:'This cycle’s allowance',cycleDetail:(b,x,d)=>b+' base + '+x+' added · until '+d,cycleUntil:d=>'Until '+d,cycleChecking:'Checking the usage cycle',refresh:'Refresh',error:'Could not load your pass',loading:'Loading your pass'},
 zh:{usageReal:'访问密钥在下方“我的 VPN 密钥”中 · 首次确认后会在此显示剩余流量',keyReal:'',noteReal:'将密钥添加到 Outline 应用即可连接',title:'当前套餐',note:'已验证付款的隔离模拟套餐',chip:{active:'使用中',expired:'已到期',['not-issued']:'未申请',needs_review:'核对中'},active:'已有生效的套餐',expired:'套餐已到期','not-issued':'暂无已生效的套餐',needs_review:'正在核对套餐状态',processing:'正在处理申请变更',idle:'暂无待处理变更',review:'正在核对追加变更',days:n=>'剩余 '+n+' 天',today:'今天到期',ended:'已结束',none:'暂无套餐',checking:'核对中',expiry:'到期时间',base:'月度基础流量',update:'处理状态',usage:'使用量将在计量连接后显示',key:'尚未连接实际 VPN 密钥交付',readonly:'此页面仅供查询',trialChip:'免费体验',trialEndedChip:'体验结束',hours:n=>'剩余 '+n+' 小时',minutes:'剩余不到 1 小时',trialActive:'正在免费体验 · 不会自动转为付费',trialEnded:'免费体验已结束 · 申请套餐即可继续使用',trialExpiry:'体验结束时间',trialData:'体验流量',cycle:'本周期流量',cycleDetail:(b,x,d)=>'基础 '+b+' + 追加 '+x+' · 至 '+d,cycleUntil:d=>'至 '+d,cycleChecking:'正在确认使用周期',refresh:'刷新',error:'无法加载套餐信息',loading:'正在加载套餐'},
 ja:{usageReal:'アクセスキーは下の「マイVPNキー」にあります · 残りデータは最初の確認後にここに表示されます',keyReal:'',noteReal:'キーをOutlineアプリに追加すると接続できます',title:'現在の利用権',note:'確認済み決済の分離シミュレーション',chip:{active:'利用中',expired:'期限切れ',['not-issued']:'申請前',needs_review:'確認中'},active:'反映済みの利用権があります',expired:'利用期間が終了しました','not-issued':'反映済みの利用権はありません',needs_review:'利用権の状態を確認しています',processing:'申請内容を反映しています',idle:'反映待ちの変更はありません',review:'追加変更を確認しています',days:n=>'残り'+n+'日',today:'本日終了',ended:'期間終了',none:'利用権なし',checking:'確認中',expiry:'有効期限',base:'月次基本データ量',update:'反映状況',usage:'使用量は計測連携後に表示します',key:'実際のVPNキー配信は未接続です',readonly:'照会専用の画面です',trialChip:'無料体験',trialEndedChip:'体験終了',hours:n=>'残り'+n+'時間',minutes:'残り1時間未満',trialActive:'無料体験中です · 自動で有料に切り替わることはありません',trialEnded:'無料体験が終了しました · 利用権を申請すると引き続き使えます',trialExpiry:'体験終了',trialData:'体験データ',cycle:'今期のデータ量',cycleDetail:(b,x,d)=>'基本 '+b+' + 追加 '+x+' · '+d+'まで',cycleUntil:d=>d+'まで',cycleChecking:'利用周期を確認中',refresh:'再読み込み',error:'利用権を取得できませんでした',loading:'利用権を確認しています'}
};
const locale=value=>value==='zh-CN'?'zh':Object.hasOwn(text,value)?value:'ko';
const intl=l=>l==='zh'?'zh-CN':l;
// One notation everywhere (2026-11-07 다듬기): "100GB", no space, as on the home page.
export const formatBytes=bytes=>bytes>=1024**3?(bytes/1024**3).toLocaleString('en-US',{maximumFractionDigits:2})+'GB':bytes+'B';
export function formatSeoulDay(value,language){return new Date(value).toLocaleDateString(intl(locale(language)),{timeZone:'Asia/Seoul',month:'long',day:'numeric'});}
export function formatSeoulDate(value,language){return new Date(value).toLocaleString(intl(locale(language)),{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});}
// One status for the pass and the key (2026-11-06 3차, review items 11·12): the card says the same thing the key
// card says, with the data left next to the days left and one next step per status.
const words={
 ko:{state:{active:'이용 중','no-data':'데이터 소진',expired:'기간 만료',held:'일시 정지',trial:'무료 체험','trial-ended':'체험 종료',none:'신청 전',checking:'확인 중'},
  say:{active:'Outline 앱에서 바로 연결할 수 있어요',low:'남은 데이터가 적어요 · 아래 \'데이터 추가\'에서 10GB(3,000원 · 15元)를 더하면 바로 늘어나요','no-data':'이번 주기 데이터를 다 썼어요 · 10GB를 추가하면 바로 다시 연결돼요',expired:'이용 기간이 끝나 접속이 멈췄어요 · 기간을 연장하면 같은 키로 다시 연결돼요',held:'관리자가 접속을 잠시 멈췄어요 · 1:1 문의로 알려 주시면 확인해 드려요',trial:'무료 체험 중이에요 · 자동 유료 전환은 없어요','trial-no-data':'체험 데이터를 다 썼어요 · 이용권을 신청하면 같은 키로 바로 이어서 써요','trial-ended':'무료 체험이 끝났어요 · 이용권을 신청하면 같은 키로 이어서 써요',none:'이용권을 신청하면 내 전용 접속 키가 바로 준비돼요',checking:'이용권 상태를 확인하고 있어요 · 잠시 후 새로 확인해 주세요'},
  act:{extend:'기간 연장',renew:'기간 연장하기',topup:'10GB 추가하기',support:'1:1 문의하기',apply:'이용권 신청하기',start:'이용권 신청하기 ↓'},
  dataLeft:(left,total)=>'데이터 '+left+' 남음 · '+total+' 중',refill:d=>d+'에 다시 채워져요',processing:'신청 내용을 반영하고 있어요',review:'추가 변경 내용을 확인하고 있어요'},
 en:{state:{active:'Active','no-data':'Out of data',expired:'Expired',held:'Paused',trial:'Free trial','trial-ended':'Trial ended',none:'Not started',checking:'Checking'},
  say:{active:'You can connect in the Outline app now',low:'You are low on data · add 10GB (KRW 3,000 · CNY 15) under "Add data" below and it applies right away','no-data':'You have used this cycle\'s data · add 10GB to reconnect right away',expired:'Your pass has ended, so the connection stopped · extend it to reconnect with the same key',held:'An administrator has paused your connection · tell us through 1:1 support and we will check',trial:'You are on the free trial · it never turns into a paid pass','trial-no-data':'You have used the trial data · get a pass to continue right away with the same key','trial-ended':'Your free trial has ended · get a pass to continue with the same key',none:'Get a pass and your own access key is ready right away',checking:'We are checking your pass · refresh in a moment'},
  act:{extend:'Extend',renew:'Extend your pass',topup:'Add 10GB',support:'Contact support',apply:'Get a pass',start:'Get a pass ↓'},
  dataLeft:(left,total)=>left+' of '+total+' data left',refill:d=>'Refills on '+d,processing:'Your update is processing',review:'We are reviewing your update'},
 zh:{state:{active:'使用中','no-data':'流量用完',expired:'已到期',held:'暂停',trial:'免费体验','trial-ended':'体验结束',none:'未申请',checking:'核对中'},
  say:{active:'现在即可在 Outline 应用中连接',low:'剩余流量不多 · 在下方“追加流量”中增加 10GB（3,000 韩元 · 15元）即可立即生效','no-data':'本周期流量已用完 · 追加 10GB 后可立即重新连接',expired:'套餐已到期，连接已停止 · 延长期限后可用同一密钥重新连接',held:'管理员已暂停您的连接 · 请通过一对一咨询告诉我们，我们会确认',trial:'正在免费体验 · 不会自动转为付费','trial-no-data':'体验流量已用完 · 购买套餐后可立即用同一密钥继续使用','trial-ended':'免费体验已结束 · 购买套餐后可继续使用同一密钥',none:'申请套餐后会立即为您准备专属访问密钥',checking:'正在核对套餐状态 · 请稍后刷新'},
  act:{extend:'延长期限',renew:'延长期限',topup:'追加 10GB',support:'一对一咨询',apply:'申请套餐',start:'申请套餐 ↓'},
  dataLeft:(left,total)=>'剩余流量 '+left+' · 共 '+total,refill:d=>d+' 重新补满',processing:'正在处理申请变更',review:'正在核对追加变更'},
 ja:{state:{active:'利用中','no-data':'データ切れ',expired:'期間終了',held:'一時停止',trial:'無料体験','trial-ended':'体験終了',none:'申請前',checking:'確認中'},
  say:{active:'Outlineアプリですぐに接続できます',low:'残りデータが少なくなっています · 下の「データ追加」で10GB（3,000ウォン · 15元）を追加するとすぐに反映されます','no-data':'今期のデータを使い切りました · 10GBを追加するとすぐに再接続できます',expired:'利用期間が終了したため接続が止まりました · 期間を延長すると同じキーで再接続されます',held:'管理者が接続を一時停止しました · 1:1お問い合わせでお知らせいただければ確認します',trial:'無料体験中です · 自動で有料に切り替わることはありません','trial-no-data':'体験データを使い切りました · 利用権を申し込むと同じキーですぐに続けて使えます','trial-ended':'無料体験が終了しました · 利用権を申し込むと同じキーで続けて使えます',none:'利用権を申し込むと専用の接続キーがすぐに用意されます',checking:'利用権の状態を確認しています · しばらくして再読み込みしてください'},
  act:{extend:'期間を延長',renew:'期間を延長する',topup:'10GBを追加',support:'1:1お問い合わせ',apply:'利用権を申し込む',start:'利用権を申し込む ↓'},
  dataLeft:(left,total)=>'データ残り '+left+' · '+total+' 中',refill:d=>d+'に再びいっぱいになります',processing:'申請内容を反映しています',review:'追加変更を確認しています'}
};
const validModel=model=>model?.authority==='verified-payment-simulation'&&model.simulation===true&&['active','expired','not-issued','needs_review'].includes(model.pass?.state)&&['idle','processing','needs_review'].includes(model.update?.state);
const validUsage=u=>!!u&&[u.usedBytes,u.allowanceBytes,u.remainingBytes].every(n=>Number.isSafeInteger(n)&&n>=0);
// The customer's one status from the pass (wallet) and the key (real key state and this cycle's usage).
export function customerPassState(model,keyData,now=Date.now()){
 if(!validModel(model))return null;
 const real=keyData?.realKey&&keyData.realKey.state!=='none'?keyData.realKey:null,usage=validUsage(real?.usage)?real.usage:null;
 const state=model.pass.state,low=!!usage&&usage.allowanceBytes>0&&usage.remainingBytes>0&&usage.remainingBytes<usage.allowanceBytes*0.1,empty=!!usage&&usage.remainingBytes<=0;
 const trial=state==='not-issued'&&['active','ended'].includes(model.trial?.state)?model.trial:null;
 let status,action=null;
 if(state==='needs_review')status='checking';
 else if(state==='active'){status=real?.state==='held'?'held':empty?'no-data':'active';action=status==='held'?'support':status==='no-data'||low?'topup':'extend';}
 else if(state==='expired'){status=real?.state==='held'?'held':'expired';action=status==='held'?'support':'renew';}
 else if(trial){status=trial.state==='active'?(real?.state==='held'?'held':'trial'):'trial-ended';action=status==='held'?'support':'apply';}
 else{status='none';action='start';}
 return {status,action,low,empty,usage,real,trial,checkedAt:Date.parse(model.checkedAt)||now};
}
const adminAccount={suspended:{chip:'계정 정지',say:'정지된 계정이라 키가 멈춰 있어요 · 정지를 풀면 함께 열려요'},closing:{chip:'탈퇴 예정',say:'탈퇴 예정 계정이라 키가 멈춰 있어요 · 탈퇴를 취소하면 함께 열려요'},closed:{chip:'탈퇴',say:'탈퇴한 계정이에요 · 이용하지 않아요'}};
// Card layout: head (title + state chip), hero (what is left + one line + the next step), facts list, fine print.
export function renderVerifiedWallet(root,model,language='ko',options={}){
 const lang=locale(language),l=text[lang],w=words[lang],doc=root.ownerDocument;root.replaceChildren();
 const make=(tag,value,cls,parent=root)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;parent.append(n);return n;};
 const head=make('div',undefined,'wallet-head');make('h2',l.title,undefined,head);
 const s=customerPassState(model,options.keyData);if(!s){make('p',l.error,'wallet-error');return null;}
 // 1단계 (A-8): on the administrator's payment screen a suspended, closing or closed account says so first (its key
 // is shut whatever the pass says), instead of '이용 중 · 바로 연결할 수 있어요'.
 const account=options.admin&&adminAccount[options.account]?adminAccount[options.account]:null;
 const chip=make('span',account?account.chip:w.state[s.status],'wallet-chip',head);chip.setAttribute('data-state',account?'expired':{active:'active','no-data':'expired',expired:'expired',held:'expired',trial:'trial','trial-ended':'expired',none:'not-issued',checking:'needs_review'}[s.status]);
 const hero=make('div',undefined,'wallet-hero');hero.setAttribute('data-state',s.status);
 const now=s.checkedAt,pass=model.pass,expiry=Date.parse(pass.expiresAt),dated=['active','expired'].includes(pass.state)&&Number.isFinite(expiry);
 if(s.trial){const end=Date.parse(s.trial.expiresAt),hours=Math.ceil((end-now)/3600000);make('strong',s.trial.state==='active'?(end-now>=3600000?l.hours(hours):l.minutes):w.state['trial-ended'],'wallet-big',hero);}
 else{const left=dated?Math.ceil((expiry-now)/86400000):null;make('strong',pass.state==='active'&&left>0?l.days(left):pass.state==='active'?l.today:pass.state==='expired'?l.ended:pass.state==='not-issued'?l.none:l.checking,'wallet-big',hero);}
 // Data left this cycle, next to the days left; when the cycle ends before the pass, the day it refills.
 if(s.usage&&['active','no-data','held','trial'].includes(s.status)){make('p',w.dataLeft(formatBytes(s.usage.remainingBytes),formatBytes(s.usage.allowanceBytes)),'wallet-data',hero).setAttribute('data-low',String(s.low||s.empty));
  const ends=Date.parse(s.usage.cycleEndsAt);if(!s.trial&&Number.isFinite(ends)&&dated&&ends<expiry)make('p',w.refill(formatSeoulDay(ends,lang)),'wallet-refill',hero);}
 make('p',account?account.say:s.status==='active'&&s.low?w.say.low:s.status==='trial'&&s.empty?w.say['trial-no-data']:w.say[s.status],'wallet-message',hero);
 if(s.action&&!options.admin&&options.onAction){const go=make('button',w.act[s.action],s.action==='extend'?'button secondary wallet-action':'button primary wallet-action',hero);go.type='button';go.setAttribute('data-action',s.action);go.onclick=()=>options.onAction(s.action);}
 const facts=make('dl',undefined,'wallet-facts');const fact=(label,value,cls)=>{const row=make('div',undefined,'wallet-fact'+(cls?' '+cls:''),facts);make('dt',label,undefined,row);make('dd',value,undefined,row);return row;};
 if(s.trial){const end=Date.parse(s.trial.expiresAt);fact(l.trialExpiry,Number.isFinite(end)?formatSeoulDate(end,lang):'—');if(!s.usage&&Number.isSafeInteger(s.trial.dataBytes))fact(l.trialData,formatBytes(s.trial.dataBytes));}
 if(dated)fact(l.expiry,formatSeoulDate(expiry,lang));
 // Without live usage (simulated key, administrator view): this cycle's allowance, as before.
 const bytes=pass.monthlyBaseBytes,cycle=pass.state==='active'&&model.allowance&&Number.isSafeInteger(model.allowance.totalBytes)?model.allowance:null;
 if(!s.usage){if(cycle){const row=fact(l.cycle,formatBytes(cycle.totalBytes),'wallet-cycle');const day=formatSeoulDay(cycle.endsAt,lang);make('small',cycle.state!=='ready'?l.cycleChecking:cycle.extraBytes>0?l.cycleDetail(formatBytes(cycle.baseBytes),formatBytes(cycle.extraBytes),day):l.cycleUntil(day),'wallet-cycle-detail',row);}
  else if(pass.state==='active'&&Number.isSafeInteger(bytes)&&bytes>0)fact(l.base,formatBytes(bytes));}
 else if(cycle&&cycle.extraBytes>0)fact(l.cycle,l.cycleDetail(formatBytes(cycle.baseBytes),formatBytes(cycle.extraBytes),formatSeoulDay(cycle.endsAt,lang)));
 // '반영 상태' only while something is being applied (internal wording otherwise stays out).
 if(model.update.state!=='idle')fact(l.update,model.update.state==='needs_review'?w.review:w.processing);
 const fine=make('div',undefined,'wallet-fine');if(options.admin)make('p',l.adminNote??text.ko.adminNote,undefined,fine);else{if(!options.realKeys){make('p',l.usage,undefined,fine);make('p',l.key,undefined,fine);make('p',l.note,undefined,fine);}else if(!s.usage)make('p',l.usageReal,undefined,fine);if(!options.ordering)make('p',l.readonly,undefined,fine);}
 return s;
}
// realKeys: the test server issues real VPN keys, so the notes point to the key card's real usage instead.
// admin: the administrator payment screen shows one pointer to the customer detail instead of the customer notes (2026-11-06).
// loadKey (optional): the key card's data, so both cards tell one status; onAction(kind): the next step the card
// offers ('extend'|'renew'|'topup'|'support'|'apply'|'start'); onState(state): the status after each load.
export function mountVerifiedWallet({root,enabled=false,load,loadKey=null,language='ko',ordering=false,realKeys=false,admin=false,account=null,onAction=null,onState=()=>{},onAuthLoss=()=>{}}){
 let stopped=false,seq=0,model=null,keyData=null,status=null;language=locale(language);const doc=root.ownerDocument;root.hidden=!enabled;root.setAttribute('translate','no');root.classList?.add('wallet-card');
 function draw(){if(stopped)return;status=renderVerifiedWallet(root,model,language,{ordering,realKeys,admin,account,keyData,onAction});const button=doc.createElement('button');button.type='button';button.className='button secondary wallet-refresh';button.textContent=text[language].refresh;button.onclick=()=>void refresh();(root.querySelector?.('.wallet-head')??root).append(button);}
 async function refresh(){if(stopped||!enabled)return;const current=++seq;if(!model){root.replaceChildren();const note=doc.createElement('p');note.className='wallet-loading';note.textContent=text[language].loading;root.append(note);}try{const [result,key]=await Promise.all([load(),loadKey?loadKey().catch(()=>null):null]);if(stopped||seq!==current)return;model=result.wallet;keyData=key;draw();try{onState(status);}catch{}}catch(e){if(stopped||seq!==current)return;model=null;draw();if([401,403].includes(e.status)){dispose();onAuthLoss();}}}
 function state(){return status;}
 function change(e){language=locale(e.detail?.locale);draw();}function dispose(){stopped=true;seq++;model=null;doc.removeEventListener?.('ieum-language-change',change);root.replaceChildren();root.hidden=true;}
 // The account state comes from the customer list after the card is up (administrator screen).
 function setAccount(value){if(account===value)return;account=value;if(model)draw();}
 if(enabled){doc.addEventListener?.('ieum-language-change',change);void refresh();}return {refresh,dispose,state,setAccount};
}
