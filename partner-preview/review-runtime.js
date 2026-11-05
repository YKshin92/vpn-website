// Loaded only by the generated partner preview. No real API request leaves this adapter.
(()=>{
 const nativeFetch=window.fetch.bind(window),fixture=nativeFetch('./review-fixture.json').then(r=>r.json());
 const query=new URLSearchParams(location.search);let signedIn=query.get('view')==='active';
 const result=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 const now=Date.now(),stamp=delta=>new Date(now+delta*86400000).toISOString();
 // Preview only: homepage plan/trial buttons open the account screen with that choice preselected.
 document.addEventListener('click',event=>{const button=event.target.closest?.('[data-plan],#request-trial');if(!button||!/(^|\/)(index|home)\.html$|\/$/.test(location.pathname))return;event.preventDefault();event.stopImmediatePropagation();location.href='./account.html?view=active&plan='+encodeURIComponent(button.id==='request-trial'?'trial':button.dataset.plan);},true);
 window.fetch=async(input,init={})=>{
  const url=new URL(typeof input==='string'?input:input.url,location.href),index=url.pathname.indexOf('/api/');
  if(index<0)return nativeFetch(input,init);
  const path=url.pathname.slice(index),method=(init.method??input.method??'GET').toUpperCase();
  if(path==='/api/auth/session')return result({authenticated:true,username:'운영 관리자 · 예시',csrf:'preview-only-not-a-credential',mode:'partner-preview',readOnly:true,supportWalletEnabled:true});
  if(path==='/api/local-customer/session')return result({authenticated:signedIn,username:'ieum_customer',email:'customer@example.test',csrf:'preview-only-not-a-credential',mode:'partner-preview',supportEnabled:true,paymentStatusEnabled:true,verifiedWalletEnabled:true,verifiedOrderEnabled:true});
  if(path.endsWith('/login')||path.endsWith('/logout')){signedIn=path.endsWith('/login');if(signedIn)location.href='./account.html?view=active';else location.href='./index.html';return result({authenticated:signedIn});}
  if(path==='/api/local-customer/check-username')return result({available:true});
  if(path==='/api/customer/mock-key'){if(!signedIn)return result({reason:'login-required'},401);return result({available:true,key:{simulation:true,state:'active',server:'seoul',issuedAt:stamp(-7),lastChangedAt:stamp(-1),expiresAt:stamp(23),sameKeyKept:true,exampleAccessKey:'ss://Y2hhY2hhMjAtaWV0Zi1wb2x5MTMwNTpJRVVNLVRFU1QtT05MWS1wcmV2aWV3@test-key.invalid:443/?outline=1#IEUM-TEST',realKeyConnected:false}});}
  if(path==='/api/customer/payment-pass'||path==='/api/customer/payment-products'){
   if(!signedIn)return result({reason:'login-required'},401);const GiB=1024**3;
   if(path.endsWith('payment-pass'))return result({wallet:{authority:'verified-payment-simulation',simulation:true,checkedAt:stamp(0),pass:{state:'active',revision:2,expiresAt:stamp(23),monthlyBaseBytes:100*GiB},update:{state:'idle'},allowance:{state:'ready',baseBytes:100*GiB,extraBytes:0,totalBytes:100*GiB,endsAt:stamp(16)},usage:{state:'unavailable'},keyAvailable:false,emailDelivered:false,legacyWritesEnabled:false}});
   return result({simulation:true,policyVersion:'preview-example',currency:'KRW',methods:['kakao_pay','bank_transfer','wechat_pay','alipay'],plan:{purpose:'extension',available:true,reason:null,currentExpiresAt:stamp(23),monthlyBaseBytes:100*GiB,options:[{code:'pass-30',durationDays:30,amountMinor:12000},{code:'pass-90',durationDays:90,amountMinor:30000},{code:'pass-180',durationDays:180,amountMinor:54000}]},topup:{available:true,reason:null,cycleEndsAt:stamp(16),options:[{code:'topup-10g',bytes:10*GiB,amountMinor:3000}]},trial:{available:false,reason:'paid-customer',active:false,hours:24,dataBytes:GiB},processing:false,pendingOrder:null});
  }
  if(method!=='GET')return result({reason:'preview-read-only',error:'화면 공유용 미리보기입니다 실제 변경·결제·발송은 실행하지 않습니다'},403);
  if(path.startsWith('/api/customer/support')||path.startsWith('/api/admin/support')){
   if(path.startsWith('/api/customer/')&&!signedIn)return result({reason:'login-required'},401);
   const threads=[{id:'example-thread-3',subject:'중국에서 아이폰 연결이 되지 않아요',state:'waiting_admin',unread:1,readThrough:0,revision:1,assignedTo:null,assignedToMe:false},{id:'example-thread-1',subject:'데이터 추가 후 이용량 확인',state:'waiting_customer',unread:1,readThrough:0,revision:2,assignedTo:'운영 담당 · 예시',assignedToMe:false},{id:'example-thread-2',subject:'새 기기에서 접속하는 방법',state:'closed',unread:0,readThrough:2,revision:2}];
   const tail=path.replace(/^\/api\/(customer|admin)\/support/,'');if(tail==='/summary')return result({summary:{unreadThreads:1,unreadMessages:1,waitingAdmin:1,waitingCustomer:1}});
   if(!tail){const q=url.searchParams.get('q')??'',state=url.searchParams.get('state')??'all',page=Number(url.searchParams.get('page')??1);return result({threads:page===1?threads.filter(t=>t.subject.includes(q)&&(state==='all'||t.state===state)&&(url.searchParams.get('unread')!=='true'||t.unread>0)).map((t,i)=>({...t,...(path.startsWith('/api/admin/')?{customer:{email:i===0?'traveler@example.test':'student@example.test',nickname:i===0?'여행하는고양이':'상하이유학생'},pendingReplyCount:t.state==='waiting_admin'?3:0}:{})})):[],page,hasMore:false});}
   const thread=threads.find(t=>'/'+t.id===tail);if(!thread)return result({reason:'support-not-found'},404);
   return result({thread:{...thread,...(path.startsWith('/api/admin/')?{customerId:'11111111-1111-4111-8111-111111111111'}:{})},messages:thread.id==='example-thread-3'?[{seq:1,role:'customer',body:'아이폰에서 Outline 연결이 되지 않습니다. 확인할 항목을 알려 주세요.',createdAt:stamp(-1)}]:[{seq:1,role:'customer',body:thread.id==='example-thread-1'?'이번 달 데이터를 추가하면 키를 다시 등록해야 하나요?':'새 기기에 기존 접속 키를 등록하고 싶어요.'},{seq:2,role:'administrator',body:thread.id==='example-thread-1'?'기존 키를 그대로 사용하시면 됩니다. 추가 데이터는 이번 주기에만 적용되고 다음 주기에는 기본 제공량으로 돌아갑니다.':'내 이용권에서 접속 키를 확인한 뒤 설치 안내에 따라 등록해 주세요. 이 대화는 화면 구성용 예시입니다.'}],hasMore:false});
  }
  if(path==='/api/admin/payment-customers')return result({customers:Number(url.searchParams.get('page')??1)===1?['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'].map((id,i)=>({id,paymentCount:1,pendingCount:0,reviewCount:i?0:1,latestAt:stamp(-2)})):[],page:Number(url.searchParams.get('page')??1),hasMore:false});
  if(/^\/api\/admin\/customers\/[^/]+\/payment-pass$/.test(path))return result({wallet:{authority:'verified-payment-simulation',simulation:true,checkedAt:stamp(0),pass:{state:'active',revision:1,expiresAt:stamp(23),monthlyBaseBytes:100*1024**3},update:{state:'idle'},usage:{state:'unavailable'},keyAvailable:false,emailDelivered:false,legacyWritesEnabled:false}});
  if(/^\/api\/admin\/customers\/[^/]+\/mock-key$/.test(path)){const id=path.split('/')[4];return result({available:true,key:{simulation:true,keyName:'ieum-customer-'+id,instance:'ieum-test-seoul-1',assignedAt:stamp(-7),issuedAt:stamp(-7),revision:1,lastAction:'first_issue',lastPurpose:'purchase',lastChangedAt:stamp(-7),expiresAt:stamp(23),state:'active',applied:true,realKeyConnected:false}});}
  if(path==='/api/customer/payment-status'||/^\/api\/admin\/customers\/[^/]+\/payment-status$/.test(path)){
   if(path.startsWith('/api/customer/')&&!signedIn)return result({reason:'login-required'},401);
   const second=path.includes('22222222-2222-4222-8222-222222222222');return result({payments:[{id:'example-paid-'+(second?'2':'1'),kind:second?'monthly_topup':'purchase',createdAt:stamp(-2),simulation:true,fulfillment:'succeeded',simulatedPassAvailable:true,notification:second?'sent':'needs_review',keyAvailable:false,emailDelivered:false}],page:Number(url.searchParams.get('page')??1),hasMore:false});
  }
  if(path==='/api/admin/connectivity')return result({servers:[{id:'example-seoul'},{id:'example-tokyo'}],truncated:false});
  if(path.startsWith('/api/admin/connectivity/')){const id=path.split('/').at(-1);if(!['example-seoul','example-tokyo'].includes(id))return result({reason:'probe-server-not-found'},404);const pass=id==='example-tokyo';return result({status:{serverId:id,checkedAt:stamp(0),mode:'simulation',connectivity:'not_live_verified',automaticIpChange:false,mutationsEnabled:false,diagnostic:{category:pass?'observed_success':'suspected_china_path_issue',suggestion:pass?'observe':'review_ip',coverage:{chinaSources:2,chinaCohorts:2,controlSources:1,healthyControlSources:1}},recovery:pass?{state:'closed_rollback',oldTargetRetained:true}:{state:'prepared',oldTargetRetained:true}}});}
  if(path==='/api/local-customer/profile')return result({username:'ieum_customer',email:'customer@example.test',nickname:'이음 고객',messenger:'wechat',messengerId:'example-contact',emailVerified:true,revision:1});
  if(path==='/api/local-customer/policies')return result({releaseId:'11111111-1111-4111-8111-111111111111',draft:true});
  if(path==='/api/admin/customer-provisioning/queue-readiness')return result({schemaReady:false,readOnly:true,runtime:{active:false,canDispatch:false,actualKeyChanges:false},summary:null});
  if(path==='/api/admin/customer-provisioning/overview')return result({schemaReady:false,readOnly:true,runtime:{active:false,actualKeyChanges:false},summary:null,assignments:[],limit:20});
  const customers=[1,2,3].map((n)=>({id:'review-customer-'+n,email:'customer'+n+'@example.test',status:n===3?'expired':'active',planCode:n===2?'90':'30',keyId:'EXAMPLE-KEY-00'+n,startsAt:stamp(-7),expiresAt:stamp(n===3?-2:23),remainingDays:n===3?0:23,trialUsed:true,pendingCount:0,latestState:'completed'}));
  // Outage review: example windows only; approving or registering stays read-only below.
  if(path==='/api/admin/outage-instances')return result({instances:[{instance:'demo-seoul-one',customers:2},{instance:'demo-seoul-two',customers:1}]});
  if(path==='/api/admin/outages'||path.startsWith('/api/admin/outages/')){
   const at=(d,h,m=0)=>{const t=new Date(now-d*86400000+9*3600000);t.setUTCHours(h,m,0,0);return new Date(t.getTime()-9*3600000).toISOString();},kday=iso=>new Date(Date.parse(iso)+9*3600000).toISOString().slice(0,10);
   const outages=[{id:'71111111-1111-4111-8111-111111111111',instance:'demo-seoul-one',source:'server_check',startedAt:at(2,14),endedAt:at(2,19,20),open:false,durationMinutes:320,monitorGap:false,cause:null,decision:'pending',decidedBy:null,decidedAt:null,note:null,impact:{customers:2,compensatedCustomers:2,compensationDays:2}},
    {id:'72222222-2222-4222-8222-222222222222',instance:'demo-seoul-two',source:'manual',startedAt:at(5,2),endedAt:at(5,7),open:false,durationMinutes:300,monitorGap:false,cause:'maintenance',decision:'approved',decidedBy:'운영 관리자',decidedAt:at(4,10),note:'공지한 점검 시간 초과',grants:1},
    {id:'73333333-3333-4333-8333-333333333333',instance:'demo-seoul-one',source:'server_check',startedAt:at(6,9),endedAt:at(6,9,40),open:false,durationMinutes:40,monitorGap:false,cause:'not_outage',decision:'dismissed',decidedBy:'운영 관리자',decidedAt:at(6,11),note:'점검 도구 오류',grants:0}];
   if(path==='/api/admin/outages')return result({outages,page:1,hasMore:false,summary:{pending:1,open:0,queued:0,review:0,applied:3}});
   const outage=outages.find(o=>o.id===path.split('/').at(-1));if(!outage)return result({reason:'outage-not-found'},404);
   if(outage.decision==='pending')return result({outage,impact:{days:[kday(outage.startedAt)],customers:2,compensatedCustomers:2,compensationDays:2,inactiveCustomers:0,rows:['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'].map(customerId=>({customerId,passEndsAt:stamp(23),passActive:true,days:[{day:kday(outage.startedAt),minutes:320,compensate:true,granted:false}],newDays:[kday(outage.startedAt)]}))},grants:[]});
   return result({outage,impact:null,grants:outage.grants?[{id:'74444444-4444-4444-8444-444444444444',customerId:'22222222-2222-4222-8222-222222222222',day:kday(outage.startedAt),state:'succeeded'}]:[]});
  }
  if(path==='/api/admin/portal-customers'){const search=(url.searchParams.get('q')??'').toLowerCase(),filter=url.searchParams.get('filter')??'all';const selected=customers.filter(c=>c.email.includes(search)&&(filter==='all'||c.status===filter));return result({ready:true,customers:selected,total:selected.length,page:1,pageSize:50,summary:{total:3,active:2,pending:0,failed:0}});}
  if(path.startsWith('/api/admin/portal-customers/')){const customer=customers.find(c=>c.id===path.split('/').at(-1));if(customer)return result({customer,requests:[{id:'example-order-'+customer.id,plan:customer.planCode,state:'completed',payment:'confirmed',amount:12000,createdAt:stamp(-7),completedAt:stamp(-7),keyId:customer.keyId}]});}
  if(path==='/api/local-customer/wallet')return result({pass:{key_id:'EXAMPLE-KEY-001',starts_at:stamp(-7),expires_at:stamp(23),data_limit_bytes:String(30*1024**3),used_bytes:String(Math.floor(4.2*1024**3)),usable:true},orders:[{id:'example-order-001',product:'30',amount:12000,state:'applied',created_at:stamp(-7)}],keySync:{latest:{state:'succeeded'},jobs:[]},keyAccess:{state:'active',allowed:true,pending:false}});
  const data=await fixture;const value=data.routes[path];if(value)return result(value.body,value.status);
  return result({error:'이 화면은 예시 데이터로 제공됩니다',reason:'preview-read-only'},503);
 };
 document.addEventListener('DOMContentLoaded',()=>{
  const nav=document.createElement('nav');nav.className='review-nav';nav.setAttribute('aria-label','공유 미리보기 화면 이동');
  const label=document.createElement('strong');label.textContent='화면 공유용 · 예시 데이터';nav.append(label);
  for(const [label,href] of [['홈페이지','index.html'],['회원가입','signup.html'],['로그인','account.html?view=login'],['내 이용권','account.html?view=active'],['관리자','admin.html'],['결제·이용권','payment-status.html'],['1:1 문의','support.html'],['접속 키','keys.html?server=demo-seoul-one'],['장애 보상','outages.html'],['중국 접속 시험','connectivity.html']]){const a=document.createElement('a');a.textContent=label;a.href='./'+href;nav.append(a);}document.body.prepend(nav);
  if(query.get('tab')==='server'){const switchTab=()=>{const button=document.querySelector('[data-tab="server-management"]');if(button)button.click();};setTimeout(switchTab,300);}
  const note=document.createElement('p');note.className='review-safety';note.textContent='구성 검토용입니다 · 실제 개인정보·관리자 자격증명·VPN 키를 입력하지 마세요 · 결제·메일·서버 변경은 실행되지 않습니다';nav.after(note);
 });
})();



