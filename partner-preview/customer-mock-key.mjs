// Customer card: the signed-in customer's own VPN key on the isolated test server.
// Simulated customers see a fixed example key on the reserved .invalid domain that never connects.
// With test-server real keys on, realKey carries the customer's own working access key (owner only).
const text={
 ko:{lowData:'남은 데이터가 적어요 · 이용권 신청에서 데이터를 추가하면 바로 늘어나요',noData:'이번 달 데이터를 다 썼어요 · 데이터를 추가하면 바로 다시 연결돼요',trialNoData:'체험 데이터를 다 썼어요 · 이용권을 신청하면 같은 키로 바로 이어서 써요',trialChip:'무료 체험',trialEndedChip:'체험 끝남',trialEnds:'체험 끝',trialData:'체험 데이터 사용량',trialNote:'무료 체험용 내 전용 키예요 · 체험이 끝나면 접속이 멈추고, 이용권을 신청하면 같은 키로 이어서 써요',trialSuspended:'무료 체험이 끝나 접속이 멈췄어요 · 이용권을 신청하면 같은 키로 다시 연결돼요',title:'내 VPN 키',test:'시험용',active:'발급됨',expired:'이용 종료',none:'발급 전',loading:'키를 확인하고 있어요',error:'키 정보를 불러오지 못했어요',empty:'이용권이 반영되면 내 전용 키가 하나 준비돼요',server:'서버 위치',seoul:'서울',waiting:'배정 중',issued:'발급일',replaced:d=>'접속 키가 '+d+'에 새로 바뀌었어요 · 앱에서 예전 키를 지우고 아래 새 키를 넣어 주세요',expires:'이용 종료',kept:'연장·추가 후에도 같은 키를 그대로 써요',key:'접속 키',copy:'키 복사',copied:'복사했어요',copyFail:'복사하지 못했어요 · 키를 길게 눌러 직접 복사해 주세요',guide:'기기별 설치 방법',note:'시험 서버용 예시 키라 실제로 연결되지 않아요 · 정식 연결 후 실제 접속 키가 여기에 표시돼요',refresh:'새로 확인',realNote:'실제 VPN 서버에 연결되는 내 전용 키예요 · 다른 사람과 공유하지 마세요',suspended:'이용 기간이 끝나 접속이 멈췄어요 · 기간을 연장하면 같은 키로 다시 연결돼요',held:'관리자가 접속을 잠시 멈췄어요 · 1:1 문의로 알려 주세요',month:'이번 사용 주기 사용량',monthValue:(left,total,used)=>used+' 사용',monthNote:d=>'다음 사용 주기 '+d+'부터 다시 채워져요',processing:'실제 접속 키를 만들고 있어요 · 잠시 후 새로 확인해 주세요',review:'키 처리를 확인하고 있어요 · 확인이 끝나면 여기에 표시돼요',unavailable:'지금 VPN 서버에서 키를 불러오지 못했어요 · 잠시 후 새로 확인해 주세요',paused:'정지됨'},
 en:{lowData:'You are running low on data · add data under Get a pass and it applies right away',noData:'You have used this month\'s data · add data to reconnect right away',trialNoData:'You have used the trial data · get a pass to continue right away with the same key',trialChip:'Free trial',trialEndedChip:'Trial ended',trialEnds:'Trial ends',trialData:'Trial data used',trialNote:'Your own key for the free trial · it stops when the trial ends, and a pass continues the same key',trialSuspended:'Your free trial has ended and the connection stopped · get a pass to reconnect with the same key',title:'My VPN key',test:'Test',active:'Issued',expired:'Ended',none:'Not issued',loading:'Checking your key',error:'Could not load your key',empty:'Your own key is prepared once a pass is applied',server:'Server location',seoul:'Seoul',waiting:'Assigning',issued:'Issued',replaced:d=>'Your access key was replaced on '+d+' · remove the old key in the app and add the new key below',expires:'Pass ends',kept:'You keep the same key after extensions and add-ons',key:'Access key',copy:'Copy key',copied:'Copied',copyFail:'Could not copy · press and hold the key to copy it',guide:'Setup by device',note:'Example key for the test server; it does not connect · your real access key will appear here once connected',refresh:'Refresh',realNote:'Your own key on the real VPN server · do not share it',suspended:'Your pass has ended, so the connection is paused · extend it to reconnect with the same key',held:'An administrator has paused your connection · contact us via support',month:'Used this cycle',monthValue:(left,total,used)=>used+' used',monthNote:d=>'Refills when the next cycle starts on '+d,processing:'Creating your access key · check again shortly',review:'We are checking your key · it will appear here once done',unavailable:'Could not load your key from the VPN server · check again shortly',paused:'Paused'},
 zh:{lowData:'剩余流量不多 · 在申请套餐中追加流量后立即生效',noData:'本月流量已用完 · 追加流量后可立即重新连接',trialNoData:'体验流量已用完 · 购买套餐后可立即用同一密钥继续使用',trialChip:'免费体验',trialEndedChip:'体验已结束',trialEnds:'体验结束',trialData:'体验流量已用',trialNote:'免费体验专用密钥 · 体验结束后连接会停止，购买套餐后可继续使用同一密钥',trialSuspended:'免费体验已结束，连接已停止 · 购买套餐后可用同一密钥重新连接',title:'我的 VPN 密钥',test:'测试',active:'已发放',expired:'已到期',none:'未发放',loading:'正在确认密钥',error:'无法加载密钥信息',empty:'套餐生效后会为您准备专属密钥',server:'服务器位置',seoul:'首尔',waiting:'分配中',issued:'发放日期',replaced:d=>'您的访问密钥已于'+d+'更换 · 请在应用中删除旧密钥并添加下方的新密钥',expires:'到期时间',kept:'续期或追加流量后仍使用同一密钥',key:'访问密钥',copy:'复制密钥',copied:'已复制',copyFail:'无法复制 · 请长按密钥手动复制',guide:'各设备安装方法',note:'测试服务器示例密钥，无法实际连接 · 正式连接后将在此显示真实访问密钥',refresh:'刷新',realNote:'连接到真实 VPN 服务器的专属密钥 · 请勿与他人共享',suspended:'套餐已到期，连接已暂停 · 延长期限后将使用同一密钥重新连接',held:'管理员已暂停您的连接 · 请通过一对一咨询联系我们',month:'本周期已用',monthValue:(left,total,used)=>'已用 '+used,monthNote:d=>'下一使用周期 '+d+' 起重新补满',processing:'正在创建访问密钥 · 请稍后刷新',review:'正在核对密钥处理 · 完成后将在此显示',unavailable:'暂时无法从 VPN 服务器加载密钥 · 请稍后刷新',paused:'已暂停'},
 ja:{lowData:'残りデータが少なくなっています · 利用権の申請でデータを追加するとすぐに反映されます',noData:'今月のデータを使い切りました · データを追加するとすぐに再接続できます',trialNoData:'体験データを使い切りました · 利用権を申し込むと同じキーですぐに続けて使えます',trialChip:'無料体験',trialEndedChip:'体験終了',trialEnds:'体験終了',trialData:'体験データの使用量',trialNote:'無料体験用の専用キーです · 体験が終わると接続が止まり、利用権を申し込むと同じキーで続けて使えます',trialSuspended:'無料体験が終了し接続が止まりました · 利用権を申し込むと同じキーで再接続できます',title:'マイVPNキー',test:'テスト用',active:'発行済み',expired:'利用終了',none:'未発行',loading:'キーを確認しています',error:'キー情報を読み込めませんでした',empty:'利用権が反映されると専用キーが用意されます',server:'サーバー所在地',seoul:'ソウル',waiting:'割り当て中',issued:'発行日',replaced:d=>'アクセスキーが'+d+'に新しくなりました · アプリで古いキーを削除し、下の新しいキーを追加してください',expires:'利用終了',kept:'延長・追加後も同じキーをそのまま使えます',key:'接続キー',copy:'キーをコピー',copied:'コピーしました',copyFail:'コピーできませんでした · キーを長押ししてコピーしてください',guide:'端末別の設定方法',note:'テストサーバー用のサンプルキーのため実際には接続されません · 正式接続後に本物の接続キーがここに表示されます',refresh:'再確認',realNote:'実際のVPNサーバーにつながる専用キーです · 他の人と共有しないでください',suspended:'利用期間が終了したため接続が停止しました · 期間を延長すると同じキーで再接続されます',held:'管理者が接続を一時停止しました · 1:1お問い合わせでご連絡ください',month:'今回の周期の使用量',monthValue:(left,total,used)=>used+' 使用',monthNote:d=>'次の利用周期 '+d+' から再び満タンになります',processing:'接続キーを作成しています · しばらくして再確認してください',review:'キーの処理を確認しています · 完了するとここに表示されます',unavailable:'VPNサーバーからキーを読み込めませんでした · しばらくして再確認してください',paused:'停止中'}
};
// 2026-11-06 3차 (review items 11·16): the key chip says why a key does not connect (기간 끝남 · 관리자 멈춤 ·
// 데이터 소진), one word for an ended trial (체험 종료), and '연결이 안 돼요' lists what to try before asking.
const more={
 ko:{ready:'사용 가능',ended:'기간 끝남',heldChip:'관리자 멈춤',noDataChip:'데이터 소진',preparing:'준비 중',checkingChip:'확인 중',trialEndedChip:'체험 종료',trialEnds:'체험 종료 시각',
  help:'연결이 안 돼요',helpLead:'아래 순서대로 해 보세요 · 대부분 1~3번에서 해결돼요',steps:['Outline 앱에서 이 키를 지운 뒤, 위의 [키 복사]로 다시 추가해요','다른 VPN·프록시 앱이 켜져 있으면 꺼요','Wi-Fi와 모바일 데이터를 바꿔서 다시 연결해 봐요','앱 스토어에서 Outline 앱을 최신 버전으로 업데이트해요'],helpAsk:'그래도 안 되면 1:1 문의 남기기',
  askText:'VPN 연결이 안 돼요\n· 기기(예: 아이폰, 갤럭시, 윈도우 PC):\n· 통신망(예: 차이나모바일 4G, 집 Wi-Fi):\n· 해 본 것: 키 다시 추가, 다른 VPN 끄기, Wi-Fi↔모바일 데이터, 앱 업데이트\n· 화면에 나온 오류 문구:'},
 en:{ready:'Ready',ended:'Pass ended',heldChip:'Paused by admin',noDataChip:'Out of data',preparing:'Preparing',checkingChip:'Checking',trialEndedChip:'Trial ended',trialEnds:'Trial ends at',
  help:'It does not connect',helpLead:'Try these in order · most problems are fixed by step 1–3',steps:['Delete this key in the Outline app, then add it again with [Copy key] above','Turn off any other VPN or proxy app','Switch between Wi-Fi and mobile data and connect again','Update the Outline app to the latest version in your app store'],helpAsk:'Still not working? Contact 1:1 support',
  askText:'The VPN does not connect\n· Device (e.g. iPhone, Galaxy, Windows PC):\n· Network (e.g. China Mobile 4G, home Wi-Fi):\n· What I tried: re-added the key, turned off other VPNs, switched Wi-Fi/mobile data, updated the app\n· Error message on screen:'},
 zh:{ready:'可使用',ended:'期限已到',heldChip:'管理员已暂停',noDataChip:'流量用完',preparing:'准备中',checkingChip:'核对中',trialEndedChip:'体验结束',trialEnds:'体验结束时间',
  help:'无法连接',helpLead:'请按以下顺序尝试 · 大多数问题在第 1–3 步即可解决',steps:['在 Outline 应用中删除此密钥，再用上方的[复制密钥]重新添加','如果开着其他 VPN 或代理应用，请关闭','在 Wi-Fi 和移动数据之间切换后重新连接','在应用商店把 Outline 应用更新到最新版本'],helpAsk:'仍无法连接？留下一对一咨询',
  askText:'VPN 无法连接\n· 设备（例：iPhone、Galaxy、Windows 电脑）：\n· 网络（例：中国移动 4G、家里的 Wi-Fi）：\n· 已尝试：重新添加密钥、关闭其他 VPN、切换 Wi-Fi/移动数据、更新应用\n· 屏幕上的错误提示：'},
 ja:{ready:'利用可能',ended:'期間終了',heldChip:'管理者が停止',noDataChip:'データ切れ',preparing:'準備中',checkingChip:'確認中',trialEndedChip:'体験終了',trialEnds:'体験終了日時',
  help:'接続できません',helpLead:'次の順に試してください · ほとんどは1〜3で解決します',steps:['Outlineアプリでこのキーを削除し、上の[キーをコピー]で追加し直します','ほかのVPN・プロキシアプリがオンならオフにします','Wi-Fiとモバイルデータを切り替えて再接続します','アプリストアでOutlineアプリを最新版に更新します'],helpAsk:'それでもつながらない場合は1:1お問い合わせ',
  askText:'VPNに接続できません\n· 端末（例：iPhone、Galaxy、Windows PC）：\n· 回線（例：China Mobile 4G、自宅のWi-Fi）：\n· 試したこと：キーの再追加、ほかのVPNをオフ、Wi-Fi/モバイルデータ切替、アプリ更新\n· 画面に出たエラー：'}};
for(const [k,v] of Object.entries(more))Object.assign(text[k],v);
const locale=value=>value==='zh-CN'?'zh':Object.hasOwn(text,value)?value:'ko';
const intl=l=>l==='zh'?'zh-CN':l;
const date=(value,l)=>new Date(value).toLocaleDateString(intl(l),{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric'});
const dateTime=(value,l)=>new Date(value).toLocaleString(intl(l),{timeZone:'Asia/Seoul',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});
const realStates=['none','processing','review','suspended','held','missing','active','unavailable'];
const size=b=>b>=1024**3?(b/1024**3).toLocaleString('en-US',{maximumFractionDigits:1})+'GB':(b/1024**2).toLocaleString('en-US',{maximumFractionDigits:0})+'MB';
const validUsage=u=>u===undefined||(!!u&&[u.usedBytes,u.allowanceBytes,u.remainingBytes].every(n=>Number.isSafeInteger(n)&&n>=0)&&Number.isFinite(Date.parse(u.cycleEndsAt))&&Number.isFinite(Date.parse(u.checkedAt)));
export function validRealKey(r){
 if(r===undefined)return true;if(!r||!realStates.includes(r.state)||!validUsage(r.usage)||(r.trial!==undefined&&r.trial!==true))return false;
 return r.state!=='active'||(typeof r.accessKey==='string'&&r.accessKey.length<2048&&/^ss:\/\/[^\s<>"']+$/.test(r.accessKey));
}
export function validCustomerKey(data){
 if(!data||typeof data.available!=='boolean'||!validRealKey(data.realKey))return false;if(data.key===null)return true;const k=data.key;
 return !!k&&k.simulation===true&&k.realKeyConnected===false&&['active','expired'].includes(k.state)&&[null,'seoul'].includes(k.server)&&typeof k.exampleAccessKey==='string'&&/^ss:\/\/[A-Za-z0-9_-]+@test-key\.invalid:443\/\?outline=1#IEUM-TEST$/.test(k.exampleAccessKey)&&Number.isFinite(Date.parse(k.expiresAt));
}
// onAsk(text): '그래도 안 되면 1:1 문의' opens the support window with the text filled in.
export function mountCustomerMockKey({root,enabled=false,realKeys=false,load,language='ko',copy=value=>navigator.clipboard.writeText(value),onAsk=null,onAuthLoss=()=>{}}){
 let stopped=false,seq=0,data,failed=false,copyState='';language=locale(language);const doc=root.ownerDocument;root.hidden=!enabled;root.setAttribute('translate','no');root.classList?.add('wallet-card');
 const node=(tag,value,cls)=>{const n=doc.createElement(tag);if(value!==undefined)n.textContent=value;if(cls)n.className=cls;return n;};
 function draw(){if(stopped)return;const t=text[language];root.replaceChildren();const head=node('div',undefined,'wallet-head'),heading=node('h2',realKeys?t.title:t.title+' ('+t.test+')');head.append(heading);root.append(head);
  const refresh=node('button',t.refresh,'button secondary wallet-refresh');refresh.type='button';refresh.onclick=()=>void reload();
  if(failed||(data!==undefined&&!validCustomerKey(data))){root.append(node('p',t.error,'wallet-loading'));head.append(refresh);return;}
  if(data===undefined){root.append(node('p',t.loading,'wallet-loading'));return;}
  const k=data.key;
  // Free trial before any pass (test server): the trial's own real key, its end and the trial data left.
  if(!k&&data.realKey?.trial===true&&data.realKey.state!=='none'){drawTrial(data.realKey,head,heading,refresh,t);return;}
  if(!k){head.append(node('span',t.none,'wallet-chip'),refresh);root.append(node('p',t.empty,'wallet-loading'));return;}
  const real=data.realKey&&data.realKey.state!=='none'?data.realKey:null;
  if(real)heading.textContent=t.title;
  const usage=real?.state==='active'?real.usage:undefined,empty=!!usage&&usage.allowanceBytes>0&&usage.remainingBytes<=0;
  const state=real?(real.state==='active'&&!empty?'active':['suspended','held'].includes(real.state)||empty?'expired':'pending'):k.state;
  const label=real?(real.state==='active'?(empty?t.noDataChip:t.ready):real.state==='suspended'?t.ended:real.state==='held'?t.heldChip:['processing','review'].includes(real.state)?t.preparing:t.checkingChip):k.state==='active'?t.active:t.ended;
  const chip=node('span',label,'wallet-chip');chip.setAttribute('data-state',state);head.append(chip,refresh);
  const facts=node('dl',undefined,'wallet-facts');
  // Key-only facts on the page's three columns (2026-11-07): server, issue date, this cycle's usage. The end date is
  // left to the pass card above (the same key runs to the pass end, so it was the same date twice); usage sits
  // under the pass card's allowance.
  for(const [label,value] of [[t.server,k.server==='seoul'?t.seoul:t.waiting],[t.issued,real?.replacedAt?date(real.replacedAt,language):k.issuedAt?date(k.issuedAt,language):'—'],...(usage?[[t.month,t.monthValue(size(usage.remainingBytes),size(usage.allowanceBytes),size(usage.usedBytes))]]:[])]){const row=node('div',undefined,'wallet-fact');row.append(node('dt',label),node('dd',value));facts.append(row);}
  // Data left and the refill date are on the pass card above; the key card only says how much was used (2026-11-07).
  root.append(facts);
  // An administrator replaced the key (2026-11-08): say so above the new key.
  if(real?.state==='active'&&typeof real.replacedAt==='string'&&Number.isFinite(Date.parse(real.replacedAt))&&typeof t.replaced==='function'){const p=node('p',t.replaced(date(real.replacedAt,language)),'wallet-loading key-data-hint key-replaced');p.setAttribute('role','status');root.append(p);}
  const shown=real?(real.state==='active'?real.accessKey:null):(k.state==='active'?k.exampleAccessKey:null);
  if(shown){accessBox(shown,t);troubleshoot(t);}
  if(real&&real.state!=='active')root.append(node('p',{suspended:t.suspended,held:t.held,processing:t.processing,review:t.review}[real.state]??t.unavailable,'wallet-loading'));
  if(k.sameKeyKept)root.append(node('p',t.kept,'wallet-loading'));
  root.append(node('p',real?t.realNote:t.note,'wallet-loading'));
 }
 // '연결이 안 돼요': what to try, in order, then 1:1 support with the details to fill in.
 function troubleshoot(t){
  const box=node('details',undefined,'key-help');box.append(node('summary',t.help));box.append(node('p',t.helpLead,'key-help-lead'));
  const list=node('ol',undefined,'key-help-steps');for(const step of t.steps)list.append(node('li',step));box.append(list);
  if(onAsk){const ask=node('button',t.helpAsk,'button secondary key-help-ask');ask.type='button';ask.onclick=()=>onAsk(t.askText);box.append(ask);}
  root.append(box);
 }
 function dataHint(usage,t,trial){
  if(!usage||!usage.allowanceBytes)return null;
  const text=usage.remainingBytes<=0?(trial?t.trialNoData:t.noData):!trial&&usage.remainingBytes<usage.allowanceBytes*0.1?t.lowData:null;
  if(!text)return null;const p=node('p',text,'wallet-loading key-data-hint');p.setAttribute('role','status');return p;
 }
 function accessBox(shown,t){
  const box=node('div',undefined,'key-access');box.append(node('span',t.key,'key-access-label'));const value=node('code',shown,'key-access-value');box.append(value);
  const actions=node('div',undefined,'key-access-actions');const button=node('button',t.copy,'button primary');button.type='button';
  button.onclick=async()=>{try{await copy(shown);copyState=t.copied;}catch{copyState=t.copyFail;}status.textContent=copyState;};
  const guide=node('a',t.guide,'button secondary');guide.href='/#guide';const status=node('span',copyState,'key-access-status');status.setAttribute('role','status');
  actions.append(button,guide,status);box.append(actions);root.append(box);
 }
 function drawTrial(real,head,heading,refresh,t){
  heading.textContent=t.title;const state=real.state==='active'?'active':real.state==='suspended'?'expired':'pending';
  const chip=node('span',state==='active'?t.trialChip:state==='expired'?t.trialEndedChip:t.preparing,'wallet-chip');chip.setAttribute('data-state',state);head.append(chip,refresh);
  const facts=node('dl',undefined,'wallet-facts'),usage=real.state==='active'?real.usage:undefined;
  for(const [label,value] of [[t.server,t.seoul],[t.trialEnds,real.expiresAt?dateTime(real.expiresAt,language):'—'],...(usage?[[t.trialData,t.monthValue(size(usage.remainingBytes),size(usage.allowanceBytes),size(usage.usedBytes))]]:[])]){const row=node('div',undefined,'wallet-fact');row.append(node('dt',label),node('dd',value));facts.append(row);}
  root.append(facts);
  if(real.state==='active'&&real.accessKey){accessBox(real.accessKey,t);troubleshoot(t);}
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
