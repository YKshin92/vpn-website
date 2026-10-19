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
  if(path==='/api/auth/session')return result({authenticated:true,username:'운영 관리자 · 예시',csrf:'preview-only-not-a-credential'});
  if(path==='/api/local-customer/session')return result({authenticated:signedIn,username:'ieum_customer',email:'customer@example.test',csrf:'preview-only-not-a-credential',mode:'partner-preview'});
  if(path.endsWith('/login')||path.endsWith('/logout')){signedIn=path.endsWith('/login');if(signedIn)location.href='./account.html?view=active';else location.href='./index.html';return result({authenticated:signedIn});}
  if(path==='/api/local-customer/check-username')return result({available:true});
  if(method!=='GET')return result({reason:'preview-read-only',error:'화면 공유용 미리보기입니다 실제 변경·결제·발송은 실행하지 않습니다'},403);
  if(path==='/api/local-customer/profile')return result({username:'ieum_customer',email:'customer@example.test',nickname:'이음 고객',messenger:'wechat',messengerId:'example-contact',emailVerified:true,revision:1});
  if(path==='/api/local-customer/policies')return result({releaseId:'11111111-1111-4111-8111-111111111111',draft:true});
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
  for(const [label,href] of [['홈페이지','index.html'],['회원가입','signup.html'],['로그인','account.html?view=login'],['내 이용권','account.html?view=active'],['고객관리','admin.html'],['서버관리','admin.html?tab=server'],['키 관리','keys.html?server=demo-seoul-one'],['고객·키 연결','customer-keys.html']]){const a=document.createElement('a');a.textContent=label;a.href='./'+href;nav.append(a);}document.body.prepend(nav);
  if(query.get('tab')==='server'){const switchTab=()=>{const button=document.querySelector('[data-tab="server-management"]');if(button)button.click();};setTimeout(switchTab,300);}
  const note=document.createElement('p');note.className='review-safety';note.textContent='구성 검토용입니다 · 실제 개인정보·관리자 자격증명·VPN 키를 입력하지 마세요 · 결제·메일·서버 변경은 실행되지 않습니다';nav.after(note);
 });
})();
