// Customer card: the signed-in customer's own VPN key on the isolated test server.
// Simulated customers see a fixed example key on the reserved .invalid domain that never connects.
// With test-server real keys on, realKey carries the customer's own working access key (owner only).
const text={
 ko:{lowData:'남은 데이터가 적어요 · 이용권 신청에서 데이터를 추가하면 바로 늘어나요',noData:'이번 달 데이터를 다 썼어요 · 데이터를 추가하면 바로 다시 연결돼요',trialNoData:'체험 데이터를 다 썼어요 · 이용권을 신청하면 같은 키로 바로 이어서 써요',trialChip:'무료 체험',trialEndedChip:'체험 끝남',trialEnds:'체험 끝',trialData:'체험 데이터',trialNote:'무료 체험용 내 전용 키예요 · 체험이 끝나면 접속이 멈추고, 이용권을 신청하면 같은 키로 이어서 써요',trialSuspended:'무료 체험이 끝나 접속이 멈췄어요 · 이용권을 신청하면 같은 키로 다시 연결돼요',title:'내 VPN 키',test:'시험용',active:'발급됨',expired:'이용 종료',none:'발급 전',loading:'키를 확인하고 있어요',error:'키 정보를 불러오지 못했어요',empty:'이용권이 반영되면 내 전용 키가 하나 준비돼요',server:'서버 위치',seoul:'서울',waiting:'배정 중',issued:'발급일',expires:'이용 종료',kept:'연장·추가 후에도 같은 키를 그대로 써요',key:'접속 키',copy:'키 복사',copied:'복사했어요',copyFail:'복사하지 못했어요 · 키를 길게 눌러 직접 복사해 주세요',guide:'기기별 설치 방법',note:'시험 서버용 예시 키라 실제로 연결되지 않아요 · 정식 연결 후 실제 접속 키가 여기에 표시돼요',refresh:'새로 확인',realNote:'실제 VPN 서버에 연결되는 내 전용 키예요 · 다른 사람과 공유하지 마세요',suspended:'이용 기간이 끝나 접속이 멈췄어요 · 기간을 연장하면 같은 키로 다시 연결돼요',held:'관리자가 접속을 잠시 멈췄어요 · 1:1 문의로 알려 주세요',month:'이번 달 데이터',monthValue:(left,total,used)=>left+' 남음 · '+total+' 중 '+used+' 사용',monthNote:d=>'다음 사용 주기 '+d+'부터 다시 채워져요',processing:'실제 접속 키를 만들고 있어요 · 잠시 후 새로 확인해 주세요',review:'키 처리를 확인하고 있어요 · 확인이 끝나면 여기에 표시돼요',unavailable:'지금 VPN 서버에서 키를 불러오지 못했어요 · 잠시 후 새로 확인해 주세요',paused:'정지됨'},
 en:{lowData:'You are running low on data · add data under Get a pass and it applies right away',noData:'You have used this month\'s data · add data to reconnect right away',trialNoData:'You have used the trial data · get a pass to continue right away with the same key',trialChip:'Free trial',trialEndedChip:'Trial ended',trialEnds:'Trial ends',trialData:'Trial data',trialNote:'Your own key for the free trial · it stops when the trial ends, and a pass continues the same key',trialSuspended:'Your free trial has ended and the connection stopped · get a pass to reconnect with the same key',title:'My VPN key',test:'Test',active:'Issued',expired:'Ended',none:'Not issued',loading:'Checking your key',error:'Could not load your key',empty:'Your own key is prepared once a pass is applied',server:'Server location',seoul:'Seoul',waiting:'Assigning',issued:'Issued',expires:'Pass ends',kept:'You keep the same key after extensions and add-ons',key:'Access key',copy:'Copy key',copied:'Copied',copyFail:'Could not copy · press and hold the key to copy it',guide:'Setup by device',note:'Example key for the test server; it does not connect · your real access key will appear here once connected',refresh:'Refresh',realNote:'Your own key on the real VPN server · do not share it',suspended:'Your pass has ended, so the connection is paused · extend it to reconnect with the same key',held:'An administrator has paused your connection · contact us via support',month:'This month’s data',monthValue:(left,total,used)=>left+' left · '+used+' of '+total+' used',monthNote:d=>'Refills when the next cycle starts on '+d,processing:'Creating your access key · check again shortly',review:'We are checking your key · it will appear here once done',unavailable:'Could not load your key from the VPN server · check again shortly',paused:'Paused'},
 zh:{lowData:'剩余流量不多 · 在申请套餐中追加流量后立即生效',noData:'本月流量已用完 · 追加流量后可立即重新连接',trialNoData:'体验流量已用完 · 购买套餐后可立即用同一密钥继续使用',trialChip:'免费体验',trialEndedChip:'体验已结束',trialEnds:'体验结束',trialData:'体验流量',trialNote:'免费体验专用密钥 · 体验结束后连接会停止，购买套餐后可继续使用同一密钥',trialSuspended:'免费体验已结束，连接已停止 · 购买套餐后可用同一密钥重新连接',title:'我的 VPN 密钥',test:'测试',active:'已发放',expired:'已到期',none:'未发放',loading:'正在确认密钥',error:'无法加载密钥信息',empty:'套餐生效后会为您准备专属密钥',server:'服务器位置',seoul:'首尔',waiting:'分配中',issued:'发放日期',expires:'到期时间',kept:'续期或追加流量后仍使用同一密钥',key:'访问密钥',copy:'复制密钥',copied:'已复制',copyFail:'无法复制 · 请长按密钥手动复制',guide:'各设备安装方法',note:'测试服务器示例密钥，无法实际连接 · 正式连接后将在此显示真实访问密钥',refresh:'刷新',realNote:'连接到真实 VPN 服务器的专属密钥 · 请勿与他人共享',suspended:'套餐已到期，连接已暂停 · 延长期限后将使用同一密钥重新连接',held:'管理员已暂停您的连接 · 请通过一对一咨询联系我们',month:'本月流量',monthValue:(left,total,used)=>'剩余 '+left+' · 已用 '+used+' / '+total,monthNote:d=>'下一使用周期 '+d+' 起重新补满',processing:'正在创建访问密钥 · 请稍后刷新',review:'正在核对密钥处理 · 完成后将在此显示',unavailable:'暂时无法从 VPN 服务器加载密钥 · 请稍后刷新',paused:'已暂停'},
 ja:{lowData:'残りデータが少なくなっています · 利用権の申請でデータを追加するとすぐに反映されます',noData:'今月のデータを使い切りました · データを追加するとすぐに再接続できます',trialNoData:'体験データを使い切りました · 利用権を申し込むと同じキーですぐに続けて使えます',trialChip:'無料体験',trialEndedChip:'体験終了',trialEnds:'体験終了',trialData:'体験データ',trialNote:'無料体験用の専用キーです · 体験が終わると接続が止まり、利用権を申し込むと同じキーで続けて使えます',trialSuspended:'無料体験が終了し接続が止まりました · 利用権を申し込むと同じキーで再接続できます',title:'マイVPNキー',test:'テスト用',active:'発行済み',expired:'利用終了',none:'未発行',loading:'キーを確認しています',error:'キー情報を読み込めませんでした',empty:'利用権が反映されると専用キーが用意されます',server:'サーバー所在地',seoul:'ソウル',waiting:'割り当て中',issued:'発行日',expires:'利用終了',kept:'延長・追加後も同じキーをそのまま使えます',key:'接続キー',copy:'キーをコピー',copied:'コピーしました',copyFail:'コピーできませんでした · キーを長押ししてコピーしてください',guide:'端末別の設定方法',note:'テストサーバー用のサンプルキーのため実際には接続されません · 正式接続後に本物の接続キーがここに表示されます',refresh:'再確認',realNote:'実際のVPNサーバーにつながる専用キーです · 他の人と共有しないでください',suspended:'利用期間が終了したため接続が停止しました · 期間を延長すると同じキーで再接続されます',held:'管理者が接続を一時停止しました · 1:1お問い合わせでご連絡ください',month:'今月のデータ',monthValue:(left,total,used)=>'残り '+left+' · '+total+' 中 '+used+' 使用',monthNote:d=>'次の利用周期 '+d+' から再び満タンになります',processing:'接続キーを作成しています · しばらくして再確認してください',review:'キーの処理を確認しています · 完了するとここに表示されます',unavailable:'VPNサーバーからキーを読み込めませんでした · しばらくして再確認してください',paused:'停止中'}
};
const locale=value=>value==='zh-CN'?'zh':Object.hasOwn(text,value)?value:'ko';
const intl=l=>l==='zh'?'zh-CN':l;
const date=(value,l)=>new Date(value).toLocaleDateString(intl(l),{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric'});
const dateTime=(value,l)=>new Date(value).toLocaleString(intl(l),{timeZone:'Asia/Seoul',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});
const realStates=['none','processing','review','suspended','held','missing','active','unavailable'];
const size=b=>b>=1024**3?(b/1024**3).toLocaleString('en-US',{maximumFractionDigits:1})+' GB':(b/1024**2).toLocaleString('en-US',{maximumFractionDigits:0})+' MB';
const validUsage=u=>u===undefined||(!!u&&[u.usedBytes,u.allowanceBytes,u.remainingBytes].every(n=>Number.isSafeInteger(n)&&n>=0)&&Number.isFinite(Date.parse(u.cycleEndsAt))&&Number.isFinite(Date.parse(u.checkedAt)));
export function validRealKey(r){
 if(r===undefined)return true;if(!r||!realStates.includes(r.state)||!validUsage(r.usage)||(r.trial!==undefined&&r.trial!==true))return false;
 return r.state!=='active'||(typeof r.accessKey==='string'&&r.accessKey.length<2048&&/^ss:\/\/[^\s<>"']+$/.test(r.accessKey));
}
export function validCustomerKey(data){
 if(!data||typeof data.available!=='boolean'||!validRealKey(data.realKey))return false;if(data.key===null)return true;const k=data.key;
 return !!k&&k.simulation===true&&k.realKeyConnected===false&&['active','expired'].includes(k.state)&&[null,'seoul'].includes(k.server)&&typeof k.exampleAccessKey==='string'&&/^ss:\/\/[A-Za-z0-9_-]+@test-key\.invalid:443\/\?outline=1#IEUM-TEST$/.test(k.exampleAccessKey)&&Number.isFinite(Date.parse(k.expiresAt));
}
export function mountCustomerMockKey({root,enabled=false,load,language='ko',copy=value=>navigator.clipboard.writeText(value),onAuthLoss=()=>{}}){
 let stopped=false,seq=0,data,failed=false,copyState='';language=locale(language);const doc=root.ownerDocument;root.hidden=!enabled;root.setAttribute('translate','no');root.classList?.add('wallet-card');
 const node=(tag,value,cls)=>{const n=doc.createElement(tag);if(value!==undefined)n.textContent=value;if(cls)n.className=cls;return n;};
 function draw(){if(stopped)return;const t=text[language];root.replaceChildren();const head=node('div',undefined,'wallet-head'),heading=node('h2',t.title+' ('+t.test+')');head.append(heading);root.append(head);
  const refresh=node('button',t.refresh,'button secondary wallet-refresh');refresh.type='button';refresh.onclick=()=>void reload();
  if(failed||(data!==undefined&&!validCustomerKey(data))){root.append(node('p',t.error,'wallet-loading'));head.append(refresh);return;}
  if(data===undefined){root.append(node('p',t.loading,'wallet-loading'));return;}
  const k=data.key;
  // Free trial before any pass (test server): the trial's own real key, its end and the trial data left.
  if(!k&&data.realKey?.trial===true&&data.realKey.state!=='none'){drawTrial(data.realKey,head,heading,refresh,t);return;}
  if(!k){head.append(node('span',t.none,'wallet-chip'),refresh);root.append(node('p',t.empty,'wallet-loading'));return;}
  const real=data.realKey&&data.realKey.state!=='none'?data.realKey:null;
  if(real)heading.textContent=t.title;
  const state=real?(real.state==='active'?'active':real.state==='suspended'||real.state==='held'?'expired':'pending'):k.state;
  const chip=node('span',state==='active'?t.active:state==='expired'?(real?t.paused:t.expired):t.none,'wallet-chip');chip.setAttribute('data-state',state);head.append(chip,refresh);
  const facts=node('dl',undefined,'wallet-facts');
  const usage=real?.state==='active'?real.usage:undefined;
  for(const [label,value] of [[t.server,k.server==='seoul'?t.seoul:t.waiting],[t.issued,k.issuedAt?date(k.issuedAt,language):'—'],[t.expires,date(k.expiresAt,language)],...(usage?[[t.month,t.monthValue(size(usage.remainingBytes),size(usage.allowanceBytes),size(usage.usedBytes))]]:[])]){const row=node('div',undefined,'wallet-fact');row.append(node('dt',label),node('dd',value));facts.append(row);}
  root.append(facts);if(usage&&Date.parse(usage.cycleEndsAt)<Date.parse(k.expiresAt))root.append(node('p',t.monthNote(date(usage.cycleEndsAt,language)),'wallet-loading'));
  // Real usage: point to a data top-up when little or nothing is left this month.
  const hint=dataHint(usage,t,false);if(hint)root.append(hint);
  const shown=real?(real.state==='active'?real.accessKey:null):(k.state==='active'?k.exampleAccessKey:null);
  if(shown)accessBox(shown,t);
  if(real&&real.state!=='active')root.append(node('p',{suspended:t.suspended,held:t.held,processing:t.processing,review:t.review}[real.state]??t.unavailable,'wallet-loading'));
  if(k.sameKeyKept)root.append(node('p',t.kept,'wallet-loading'));
  root.append(node('p',real?t.realNote:t.note,'wallet-loading'));
 }
 function dataHint(usage,t,trial){
  if(!usage||!usage.allowanceBytes)return null;
  const text=usage.remainingBytes<=0?(trial?t.trialNoData:t.noData):!trial&&usage.remainingBytes<usage.allowanceBytes*0.1?t.lowData:null;
  if(!text)return null;const p=node('p',text,'wallet-loading key-data-hint');p.setAttribute('role','status');return p;
 }
 function accessBox(shown,t){
  const box=node('div',undefined,'key-access');box.append(node('span',t.key,'key-access-label'));const value=node('code',shown,'key-access-value');box.append(value);
  const actions=node('div',undefined,'key-access-actions');const button=node('button',t.copy,'button');button.type='button';
  button.onclick=async()=>{try{await copy(shown);copyState=t.copied;}catch{copyState=t.copyFail;}status.textContent=copyState;};
  const guide=node('a',t.guide,'button secondary');guide.href='/#guide';const status=node('span',copyState,'key-access-status');status.setAttribute('role','status');
  actions.append(button,guide,status);box.append(actions);root.append(box);
 }
 function drawTrial(real,head,heading,refresh,t){
  heading.textContent=t.title;const state=real.state==='active'?'active':real.state==='suspended'?'expired':'pending';
  const chip=node('span',state==='active'?t.trialChip:state==='expired'?t.trialEndedChip:t.none,'wallet-chip');chip.setAttribute('data-state',state);head.append(chip,refresh);
  const facts=node('dl',undefined,'wallet-facts'),usage=real.state==='active'?real.usage:undefined;
  for(const [label,value] of [[t.server,t.seoul],[t.trialEnds,real.expiresAt?dateTime(real.expiresAt,language):'—'],...(usage?[[t.trialData,t.monthValue(size(usage.remainingBytes),size(usage.allowanceBytes),size(usage.usedBytes))]]:[])]){const row=node('div',undefined,'wallet-fact');row.append(node('dt',label),node('dd',value));facts.append(row);}
  root.append(facts);const hint=dataHint(usage,t,true);if(hint)root.append(hint);
  if(real.state==='active'&&real.accessKey)accessBox(real.accessKey,t);
  else root.append(node('p',{suspended:t.trialSuspended,held:t.held,processing:t.processing,review:t.review}[real.state]??t.unavailable,'wallet-loading'));
  root.append(node('p',t.trialNote,'wallet-loading'));
 }
 async function reload(){if(stopped||!enabled)return;const current=++seq;copyState='';
  try{const result=await load();if(stopped||seq!==current)return;data=result;failed=false;draw();}
  catch(e){if(stopped||seq!==current)return;if([401,403].includes(e.status)){dispose();onAuthLoss();return;}if(e.status===404){dispose();return;}failed=true;draw();}}
 function change(e){language=locale(e.detail?.locale);copyState='';draw();}
 function dispose(){stopped=true;seq++;doc.removeEventListener?.('ieum-language-change',change);root.replaceChildren();root.hidden=true;}
 if(enabled){doc.addEventListener?.('ieum-language-change',change);draw();void reload();}
 return {refresh:reload,dispose};
}
