// Do the homepage and the app downloads open from China? (2026-11-07, screen review item 5 · decision "중국 현지
//확인": there is no one in China to try, so these addresses join the China check instead.)
// - one list: the home page install guide links to the same store and download addresses (tests keep them equal)
// - a result is recorded only when a check was actually made (date, how, what it showed); otherwise "확인 필요"
// - an outside checker from Chinese network locations is not a local test with a phone; the method says which
export const chinaWebTargets=[
 {id:'home',label:'홈페이지 (운영)',url:'https://www.ieumvpn.link/',note:'12월 1일 공개 예정 · 운영 도메인 확정 전 예정 주소'},
 {id:'test-site',label:'시험 사이트',url:'https://test.ieumvpn.link/',note:'사이트 잠금이 있어 401이 정상'},
 {id:'ios-kr',label:'iPhone·iPad · App Store (한국)',url:'https://apps.apple.com/kr/app/outline-app/id1356177741',note:'중국 지역 App Store에는 VPN 앱이 없어 한국 Apple ID로 설치'},
 {id:'mac-kr',label:'Mac · App Store (한국)',url:'https://apps.apple.com/kr/app/outline-app/id1356178125',note:'중국 지역 App Store에는 VPN 앱이 없어 한국 Apple ID로 설치'},
 {id:'android-apk',label:'Android · 공식 APK',url:'https://s3.amazonaws.com/outline-releases/client/android/stable/Outline-Client.apk'},
 {id:'android-play',label:'Android · Google Play',url:'https://play.google.com/store/apps/details?id=org.outline.android.client',note:'Google 서비스는 중국에서 보통 막혀 있음'},
 {id:'windows-exe',label:'Windows · 공식 설치 파일',url:'https://s3.amazonaws.com/outline-releases/client/windows/stable/Outline-Client.exe'},
 {id:'releases',label:'공식 다운로드 목록 (GitHub)',url:'https://github.com/OutlineFoundation/outline-releases'}
];
// Results, newest last: {at:'YYYY-MM-DD', method:'...', results:{targetId:'ok'|'blocked'|'unstable'|'unknown'}, details:{targetId:'...'}}.
// 2026-11-07: EXPERTE "Internet Censorship Check" (servers in Shanghai·Beijing·Shenzhen; Hong Kong·Germany·US as
// the control), run from the admin's browser with the owner's OK. It shows whether the address opens from those
// servers, not whether a phone on a Chinese mobile network can download the app.
export const chinaWebChecks=[
 {at:'2026-11-07',method:'외부 점검 EXPERTE (상하이·베이징·선전 / 대조 홍콩·독일·미국)',
  results:{'home':'unknown','test-site':'ok','ios-kr':'ok','mac-kr':'ok','android-apk':'unstable','android-play':'blocked','windows-exe':'ok','releases':'ok'},
  details:{'home':'아직 열지 않은 주소라 대조 지역(홍콩·독일·미국)에서도 열리지 않음 · 운영 공개 뒤 다시 확인','test-site':'중국 3곳 모두 열림 (VPN 연결 시험은 아님)','ios-kr':'중국 3곳 모두 열림','mac-kr':'중국 3곳 모두 열림','android-apk':'첫 시험에서 베이징만 막힘, 다시 시험하니 3곳 모두 열림','android-play':'중국 3곳 모두 막힘 · 대조 지역은 열림','windows-exe':'중국 3곳 모두 열림','releases':'중국 3곳 모두 열림'}}
];
const words={ok:'열림',blocked:'막힘',unstable:'불안정',unknown:'확인 필요'};
export function chinaWebStatus(targets=chinaWebTargets,checks=chinaWebChecks){
 return targets.map(t=>{const last=[...checks].reverse().find(c=>c?.results&&Object.hasOwn(c.results,t.id));const state=last&&Object.hasOwn(words,last.results[t.id])?last.results[t.id]:'unknown';
  return {...t,state,label:t.label,stateText:words[state],checkedAt:last?.at??null,method:last?.method??null,detail:typeof last?.details?.[t.id]==='string'?last.details[t.id]:null};});
}
// VPN servers (2026-11-08): whether each server's address (DNS from China) and its key port answer from Chinese networks.
// An outside check like this cannot tell whether the Outline connection itself gets through (that needs the app in China).
export const chinaServerTargets=[
 {id:'vpn1',label:'VPN 서버 1 (seoul-1)',host:'vpn1.ieumvpn.link',note:'주소(DNS)와 접속 포트가 중국에서 닿는지 · Outline 연결 자체는 현지 앱으로만 확인돼요'},
 {id:'vpn2',label:'VPN 서버 2 (seoul-2)',host:'vpn2.ieumvpn.link',note:'주소(DNS)와 접속 포트가 중국에서 닿는지 · Outline 연결 자체는 현지 앱으로만 확인돼요'}
];
// 2026-11-08: ping.pe TCP port check (13 probes in China: China Telecom, Unicom and Mobile in Jiangsu and Lishui; Tencent
// and Aliyun clouds) and ViewDNS "Chinese Firewall Test" (DNS from 5 places in China), run from the admin's browser with
// the owner's OK.
export const chinaServerChecks=[
 {at:'2026-11-08',method:'외부 점검 ping.pe 포트 (중국 13곳 · 통신 3사·텐센트·알리) + ViewDNS (중국 5곳 DNS)',
  results:{vpn1:'ok',vpn2:'ok'},
  details:{vpn1:'접속 포트: 중국 13곳 모두 연결 (58~197ms) · DNS: 중국 5곳 모두 올바른 IP · Outline 연결 자체 확인은 아님',
   vpn2:'접속 포트: 중국 13곳 모두 연결 (59~192ms) · DNS: 중국 5곳 모두 올바른 IP · Outline 연결 자체 확인은 아님'}}
];
// The outside checkers used for the records above (2026-11-08/09), each with what it can and cannot tell, how to use it
// and links that start a check for our addresses. No server IP or key port is written here (this file is public);
// ping.pe needs the key port typed in.
const viewdns=d=>'https://viewdns.info/chinesefirewall/?domain='+d,experte=u=>'https://www.experte.com/internet-censorship/china?url='+encodeURIComponent(u);
export const chinaCheckTools=[
 {id:'pingpe',name:'ping.pe (TCP 포트 점검)',url:'https://ping.pe/',
  checks:'중국 약 13곳(전신·연통·이동 3사, 텐센트·알리 클라우드)에서 서버 주소:포트로 연결되는지',use:'VPN 서버 접속 포트',
  how:'입력란에 "tcp 주소:접속포트" (예: tcp vpn1.ieumvpn.link:접속포트) · 결과 표에서 China 줄만 보면 돼요 · 접속 포트는 고객 키에 들어 있는 번호예요',
  limit:'포트가 열리는지만 알아요 · Outline 연결 자체는 아님 · 데이터센터 회선이라 휴대폰 회선과 다를 수 있어요',quick:[]},
 {id:'viewdns',name:'ViewDNS · Chinese Firewall Test',url:'https://viewdns.info/chinesefirewall/',
  checks:'중국 5곳(베이징·선전·내몽골·헤이룽장·윈난) DNS가 돌려주는 IP가 원래 IP와 같은지 (DNS 오염)',use:'VPN 서버 주소, 홈페이지 도메인',
  how:'도메인만 입력 · 5곳 모두 OK면 정상, FAIL이면 중국 DNS가 엉뚱한 IP를 주는 것',
  limit:'DNS만 봐요 · 주소가 맞게 풀려도 IP나 포트가 막힐 수 있어요',
  quick:[['vpn1 주소',viewdns('vpn1.ieumvpn.link')],['vpn2 주소',viewdns('vpn2.ieumvpn.link')],['홈페이지',viewdns('www.ieumvpn.link')],['시험 사이트',viewdns('test.ieumvpn.link')]]},
 {id:'experte',name:'EXPERTE · Internet Censorship Check',url:'https://www.experte.com/internet-censorship/china',
  checks:'상하이·베이징·선전에서 웹 주소가 열리는지, 홍콩·독일·미국을 대조 지역으로 함께 확인',use:'홈페이지, 앱 내려받기 주소',
  how:'웹 주소 입력 후 Start Test · 중국만 막히고 대조 지역이 열리면 중국 차단, 대조 지역도 안 열리면 사이트 문제',
  limit:'웹 주소용이라 VPN 접속 포트는 확인할 수 없어요',
  quick:[['홈페이지',experte('https://www.ieumvpn.link/')],['시험 사이트',experte('https://test.ieumvpn.link/')],['Android APK',experte('https://s3.amazonaws.com/outline-releases/client/android/stable/Outline-Client.apk')],['App Store',experte('https://apps.apple.com/kr/app/outline-app/id1356177741')]]},
 {id:'vpnmentor',name:'vpnMentor · 중국 방화벽 테스트',url:'https://ko.vpnmentor.com/tools/%EC%A4%91%EA%B5%AD%EC%9D%98-%EB%A7%8C%EB%A6%AC%EC%9E%A5%EC%84%B1-%EB%B0%A9%ED%99%94%EB%B2%BD-%ED%85%8C%EC%8A%A4%ED%8A%B8/',
  checks:'중국 5곳에서 웹 주소에 접근할 수 있는지 (주소의 도메인 기준)',use:'홈페이지 (참고용)',
  how:'웹 주소 입력 후 테스트',
  limit:'2026-11-08 점검에서 중국에서 막힌 Google Play를 "접근 가능"으로 보여 줬어요 · 다른 도구와 함께 참고로만 써요',quick:[]}
];
export function renderChinaCheckTools(root,{tools=chinaCheckTools}={}){
 const doc=root.ownerDocument,make=(tag,text,cls,parent)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;parent?.append(n);return n;};
 root.replaceChildren();make('h2','점검 도구 (직접 확인하기)',undefined,root);
 make('p','순서: ① ViewDNS로 주소(DNS) → ② ping.pe로 VPN 접속 포트 → ③ EXPERTE로 홈페이지·내려받기 주소 · Outline 연결 자체는 중국 안에서 앱으로만 확인돼요 · 한 번 결과로 단정하지 말고 날과 시간대를 바꿔 반복해요','ieum-page-intro',root);
 const list=make('ul',undefined,'cwc-list',root);
 for(const t of tools){const li=make('li',undefined,'cwc-row cwc-tool',list);const main=make('div',undefined,'cwc-main',li);
  const a=make('a',t.name,'cwc-tool-name',main);a.href=t.url;a.target='_blank';a.rel='noopener';
  for(const [k,v] of [['확인하는 것',t.checks],['쓰는 곳',t.use],['방법',t.how],['한계',t.limit]]){const line=make('span',undefined,'cwc-note',main);make('b',k+' ',undefined,line);line.append(doc.createTextNode?doc.createTextNode(v):Object.assign(doc.createElement('span'),{textContent:v}));}
  if(t.quick.length){const q=make('div',undefined,'cwc-quick',main);make('span','바로 점검',undefined,q);for(const [label,href] of t.quick){const l=make('a',label,undefined,q);l.href=href;l.target='_blank';l.rel='noopener';}}}
 return {tools:tools.length};
}
function renderRows(root,{title,rows,none,after}){
 const doc=root.ownerDocument,make=(tag,text,cls,parent)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;parent?.append(n);return n;};
 const unknown=rows.filter(r=>r.state==='unknown').length;
 root.replaceChildren();make('h2',title,undefined,root);
 const blocked=rows.filter(r=>r.state==='blocked').length,unstable=rows.filter(r=>r.state==='unstable').length;
 make('p',unknown===rows.length?none:[blocked?'막힘 '+blocked+'곳':null,unstable?'불안정 '+unstable+'곳':null,unknown?'확인 필요 '+unknown+'곳':null].filter(Boolean).join(' · ')+(blocked||unstable||unknown?' · ':'')+after,'ieum-page-intro',root);
 const list=make('ul',undefined,'cwc-list',root);
 for(const r of rows){const li=make('li',undefined,'cwc-row',list);li.setAttribute('data-state',r.state);const main=make('div',undefined,'cwc-main',li);make('strong',r.label,undefined,main);
  if(r.url){const a=make('a',r.url.replace(/^https:\/\//,''),'cwc-url',main);a.href=r.url;a.target='_blank';a.rel='noopener';a.setAttribute('translate','no');}
  else if(r.host){const h=make('span',r.host,'cwc-url',main);h.setAttribute('translate','no');}
  if(r.note)make('span',r.note,'cwc-note',main);if(r.detail)make('span',r.detail,'cwc-detail',main);
  const side=make('div',undefined,'cwc-side',li);make('span',r.stateText,'cwc-state',side);if(r.checkedAt)make('span',r.checkedAt+(r.method?' · '+r.method:''),'cwc-when',side);}
 return {targets:rows.length,unknown};
}
export function renderChinaWebCheck(root,{targets=chinaWebTargets,checks=chinaWebChecks}={}){
 return renderRows(root,{title:'홈페이지·앱 다운로드 (중국에서 열리는지)',rows:chinaWebStatus(targets,checks),none:'아직 확인한 결과가 없어요 · 현지 확인자가 없어 외부 점검(중국 여러 지역 접속 시험)으로 대신 확인해 기록합니다',after:'외부 점검 결과예요 · 현지 휴대폰 실측은 아니에요'});
}
export function renderChinaServerCheck(root,{targets=chinaServerTargets,checks=chinaServerChecks}={}){
 return renderRows(root,{title:'VPN 서버 주소·접속 포트 · 직접 점검 기록 (참고용)',rows:chinaWebStatus(targets,checks),none:'아직 확인한 결과가 없어요 · 중국 여러 지역에서 서버 주소와 접속 포트를 점검해 기록합니다',after:'외부 도구로 직접 점검한 날짜의 결과예요 · IP를 바꾸면 다시 점검해야 하고, 15분마다 바뀌는 결과는 서버 모니터링에 있어요 · 주소와 포트까지만 확인했고, VPN 연결 자체는 현지 앱으로만 확인할 수 있어요'});
}
if(typeof document!=='undefined'&&document.getElementById('china-web-check'))renderChinaWebCheck(document.getElementById('china-web-check'));
if(typeof document!=='undefined'&&document.getElementById('china-server-check'))renderChinaServerCheck(document.getElementById('china-server-check'));
if(typeof document!=='undefined'&&document.getElementById('china-check-tools'))renderChinaCheckTools(document.getElementById('china-check-tools'));
