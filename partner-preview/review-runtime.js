// Loaded only by the generated partner preview. No real API request leaves this adapter.
(()=>{
 const nativeFetch=window.fetch.bind(window),fixture=nativeFetch('./review-fixture.json').then(r=>r.json());
 const query=new URLSearchParams(location.search);let signedIn=query.get('view')==='active';
 const result=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 const now=Date.now(),stamp=delta=>new Date(now+delta*86400000).toISOString();
 window.fetch=async(input,init={})=>{
  const url=new URL(typeof input==='string'?input:input.url,location.href),index=url.pathname.indexOf('/api/');
  if(index<0)return nativeFetch(input,init);
  const path=url.pathname.slice(index),method=(init.method??input.method??'GET').toUpperCase();
  if(path==='/api/auth/session')return result({authenticated:true,username:'운영 관리자 · 예시',csrf:'preview-only-not-a-credential',mode:'partner-preview',readOnly:true});
  if(path==='/api/local-customer/session')return result({authenticated:signedIn,username:'ieum_customer',email:'customer@example.test',csrf:'preview-only-not-a-credential',mode:'partner-preview',supportEnabled:true,paymentStatusEnabled:true});
  if(path.endsWith('/login')||path.endsWith('/logout')){signedIn=path.endsWith('/login');if(signedIn)location.href='./account.html?view=active';else location.href='./index.html';return result({authenticated:signedIn});}
  if(path==='/api/local-customer/check-username')return result({available:true});
  if(method!=='GET')return result({reason:'preview-read-only',error:'화면 공유용 미리보기입니다 실제 변경·결제·발송은 실행하지 않습니다'},403);
  if(path.startsWith('/api/customer/support')||path.startsWith('/api/admin/support')){
   if(path.startsWith('/api/customer/')&&!signedIn)return result({reason:'login-required'},401);
   const threads=[{id:'example-thread-1',subject:'데이터 추가 후 이용량 확인',state:'waiting_customer',unread:1,readThrough:0,revision:2,assignedTo:'운영 담당 · 예시',assignedToMe:false},{id:'example-thread-2',subject:'새 기기에서 접속하는 방법',state:'closed',unread:0,readThrough:2,revision:2}];
   const tail=path.replace(/^\/api\/(customer|admin)\/support/,'');if(tail==='/summary')return result({summary:{unreadThreads:1,unreadMessages:1,waitingAdmin:1,waitingCustomer:1}});
   if(!tail){const q=url.searchParams.get('q')??'',state=url.searchParams.get('state')??'all',page=Number(url.searchParams.get('page')??1);return result({threads:page===1?threads.filter(t=>t.subject.includes(q)&&(state==='all'||t.state===state)):[],page,hasMore:false});}
   const thread=threads.find(t=>'/'+t.id===tail);if(!thread)return result({reason:'support-not-found'},404);
   return result({thread,messages:[{seq:1,role:'customer',body:thread.id==='example-thread-1'?'이번 달 데이터를 추가하면 키를 다시 등록해야 하나요?':'새 기기에 기존 접속 키를 등록하고 싶어요.'},{seq:2,role:'administrator',body:thread.id==='example-thread-1'?'기존 키를 그대로 사용하시면 됩니다. 추가 데이터는 이번 주기에만 적용되고 다음 주기에는 기본 제공량으로 돌아갑니다.':'내 이용권에서 접속 키를 확인한 뒤 설치 안내에 따라 등록해 주세요. 이 대화는 화면 구성용 예시입니다.'}],hasMore:false});
  }
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
  if(path==='/api/admin/portal-customers'){const search=(url.searchParams.get('q')??'').toLowerCase(),filter=url.searchParams.get('filter')??'all';const selected=customers.filter(c=>c.email.includes(search)&&(filter==='all'||c.status===filter));return result({ready:true,customers:selected,total:selected.length,page:1,pageSize:50,summary:{total:3,active:2,pending:0,failed:0}});}
  if(path.startsWith('/api/admin/portal-customers/')){const customer=customers.find(c=>c.id===path.split('/').at(-1));if(customer)return result({customer,requests:[{id:'example-order-'+customer.id,plan:customer.planCode,state:'completed',payment:'confirmed',amount:12000,createdAt:stamp(-7),completedAt:stamp(-7),keyId:customer.keyId}]});}
  if(path==='/api/local-customer/wallet')return result({pass:{key_id:'EXAMPLE-KEY-001',starts_at:stamp(-7),expires_at:stamp(23),data_limit_bytes:String(30*1024**3),used_bytes:String(Math.floor(4.2*1024**3)),usable:true},orders:[{id:'example-order-001',product:'30',amount:12000,state:'applied',created_at:stamp(-7)}],keySync:{latest:{state:'succeeded'},jobs:[]},keyAccess:{state:'active',allowed:true,pending:false}});
  const data=await fixture;const value=data.routes[path];if(value)return result(value.body,value.status);
  return result({error:'이 화면은 예시 데이터로 제공됩니다',reason:'preview-read-only'},503);
 };
 document.addEventListener('DOMContentLoaded',()=>{
  const nav=document.createElement('nav');nav.className='review-nav';nav.setAttribute('aria-label','공유 미리보기 화면 이동');
  const label=document.createElement('strong');label.textContent='화면 공유용 · 예시 데이터';nav.append(label);
  for(const [label,href] of [['홈페이지','index.html'],['회원가입','signup.html'],['로그인','account.html?view=login'],['내 이용권','account.html?view=active'],['고객관리','admin.html'],['서버관리','admin.html?tab=server'],['키 관리','keys.html?server=demo-seoul-one'],['1:1 문의','support.html'],['결제 내역','payment-status.html'],['중국 접속 시험','connectivity.html']]){const a=document.createElement('a');a.textContent=label;a.href='./'+href;nav.append(a);}document.body.prepend(nav);
  if(query.get('tab')==='server'){const switchTab=()=>{const button=document.querySelector('[data-tab="server-management"]');if(button)button.click();};setTimeout(switchTab,300);}
  const note=document.createElement('p');note.className='review-safety';note.textContent='구성 검토용입니다 · 실제 개인정보·관리자 자격증명·VPN 키를 입력하지 마세요 · 결제·메일·서버 변경은 실행되지 않습니다';nav.after(note);
 });
})();
