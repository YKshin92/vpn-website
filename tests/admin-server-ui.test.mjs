import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../dist/admin.html',import.meta.url),'utf8');
const code=(await readFile(new URL('../dist/admin.js',import.meta.url),'utf8')).replace(/await session\(\);\s*$/,'');
// Small DOM adapter exercises the actual controller without browser/network access.
class Element {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.value='';this.dataset={};this.attributes={};this.hidden=false;this.checked=false;this.disabled=false;this.open=false;this.textContent='';this.elements=new Proxy({},{get:(target,key)=>target[key]??=new Element('input')});this.classes=new Set();this.classList={toggle:(key,on)=>on?this.classes.add(key):this.classes.delete(key)};}
 append(...nodes){this.children.push(...nodes);}
 prepend(...nodes){this.children.unshift(...nodes);}
 replaceChildren(...nodes){this.children=nodes;}
 setAttribute(k,v){this.attributes[k]=v;}
 querySelector(){return new Element();}
 addEventListener(){}
 dispatchEvent(event){this['on'+event.type]?.({target:this});}
 showModal(){this.open=true;}
 close(){this.open=false;}
}
function controller(fetchImpl=()=>{throw Error('Unexpected network access');}){const nodes=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));const all=[];const context=vm.createContext({document:{querySelector:s=>{const node=nodes.get(s.slice(1));assert.ok(node,'Missing DOM target '+s);return node;},querySelectorAll:()=>all,createElement:tag=>new Element(tag)},console,Intl,Date,Event,URLSearchParams,crypto:{randomUUID:()=> 'synthetic-request'},setInterval:()=>0,fetch:fetchImpl});vm.runInContext(code,context);return {nodes,run:source=>vm.runInContext(source,context)};}
const fixture=(name,ip,status='running',match=true)=>({instanceName:name,domain:name+'.example.test',region:'ap-northeast-2',status:'ok',observedAt:'2026-10-17T13:00:00Z',instance:{status:'ok',data:{state:status,publicIp:ip}},staticIps:{status:'ok',data:[]},publicDns:{status:'ok',data:{addresses:[ip],nameServers:[]}},dnsManager:{status:'ns-match',provider:'lightsail'},ipMatch:match});
test('Outline results are discarded after server switch or logout and sensitive form values clear',async()=>{
 let finish;const pending=new Promise(resolve=>finish=resolve);const ui=controller(async()=>{await pending;return {status:200,ok:true,json:async()=>({instanceName:'server-a',status:'ok',count:1,keys:[{id:'synthetic-key',name:'name',port:12345}]})};});
 ui.run("csrf='synthetic';selectedServer='server-a'");const work=ui.run('loadOutline()');ui.nodes.get('outline-api-url').value='synthetic-private';ui.run("selectedServer='server-b';resetOutline()");finish();await work;assert.equal(ui.nodes.get('outline-keys').children.length,0);assert.equal(ui.nodes.get('outline-api-url').value,'');ui.run('signedOut()');assert.equal(ui.run('outlineBusy'),false);
});
test('Outline save failure is visible beside the form, preserves inputs and does not claim registration',async()=>{
 const ui=controller(async()=>({status:400,ok:false,json:async()=>({error:'generic',reason:'invalid-management-address'})}));ui.run("csrf='synthetic';selectedServer='server-a'");ui.nodes.get('outline-api-url').value='synthetic-input';ui.nodes.get('outline-fingerprint').value='A'.repeat(64);
 await ui.nodes.get('outline-form').onsubmit({preventDefault(){}});assert.equal(ui.nodes.get('outline-api-url').value,'synthetic-input');assert.match(ui.nodes.get('outline-save-status').textContent,/저장 실패.*도메인/);assert.equal(ui.nodes.get('save-outline').disabled,false);assert.equal(ui.nodes.get('save-outline').textContent,'연결 정보 저장');
});
test('saved credentials stay hidden but registration and successful key count are shown',async()=>{
 let saves=0;const ui=controller(async(url,options)=>{if(options.method==='POST'){saves++;return {status:200,ok:true,json:async()=>({configured:true})};}return {status:200,ok:true,json:async()=>url.endsWith('/connection')?{configured:true,updatedAt:'2026-10-17T13:00:00Z'}:{instanceName:'server-a',status:'ok',count:0,keys:[],checkedAt:'2026-10-17T13:00:00Z'}};});
 ui.run("csrf='synthetic';selectedServer='server-a'");ui.nodes.get('outline-api-url').value='synthetic-input';ui.nodes.get('outline-fingerprint').value='A'.repeat(64);await ui.nodes.get('outline-form').onsubmit({preventDefault(){}});
 assert.equal(saves,1);assert.equal(ui.nodes.get('outline-api-url').value,'');assert.match(ui.nodes.get('outline-save-status').textContent,/등록됨/);assert.match(ui.nodes.get('outline-status').textContent,/관리 연결 확인 · 0개/);assert.equal(ui.nodes.get('save-outline').disabled,false);
});
test('a saved connection and failed upstream query are reported separately',async()=>{
 const ui=controller(async url=>url.endsWith('/connection')?{status:200,ok:true,json:async()=>({configured:true,updatedAt:'2026-10-17T13:00:00Z'})}:{status:503,ok:false,json:async()=>({error:'generic',reason:'certificate-mismatch'})});ui.run("csrf='synthetic';selectedServer='server-a'");await ui.run('loadOutline()');assert.match(ui.nodes.get('outline-save-status').textContent,/등록됨/);assert.match(ui.nodes.get('outline-status').textContent,/키 조회 실패.*인증서/);
});
test('first server entry loads despite placeholder rows, coalesces infrastructure requests and reuses loaded inventory',async()=>{
 let calls=0,complete;
 const pending=new Promise(resolve=>{complete=resolve;});
 const ui=controller(async url=>{if(url.endsWith('/infrastructure')){calls++;await pending;return {ok:true,status:200,json:async()=>({status:'ok',fleetStatus:'ok',servers:[fixture('server-a','192.0.2.10')]})};}return {ok:true,status:200,json:async()=>({enabled:false,jobs:[]})};});
 ui.nodes.get('fleet-list').append(new Element('tr'));ui.nodes.get('server-filter').value='all';ui.run("csrf='synthetic'");
 const first=ui.run('enterServerManagement()'),second=ui.run('enterServerManagement()');
 assert.equal(calls,1);assert.equal(ui.nodes.get('refresh-infrastructure').disabled,true);
 complete();await Promise.all([first,second]);assert.equal(ui.run('fleetLoaded'),true);assert.equal(ui.nodes.get('refresh-infrastructure').disabled,false);
 await ui.run('enterServerManagement()');assert.equal(calls,1);assert.equal(ui.run('fleetServers[0].instanceName'),'server-a');
});
test('failed first inventory request retries on re-entry and logout clears the loaded flag',async()=>{
 let calls=0;
 const ui=controller(async url=>{if(url.endsWith('/infrastructure')){calls++;return calls===1?{ok:false,status:503,json:async()=>({error:'synthetic failure'})}:{ok:true,status:200,json:async()=>({status:'ok',servers:[fixture('server-a','192.0.2.10')]})};}return {ok:true,status:200,json:async()=>({enabled:false,jobs:[]})};});
 ui.nodes.get('server-filter').value='all';ui.run("csrf='synthetic'");await ui.run('enterServerManagement()');assert.equal(ui.run('fleetLoaded'),false);assert.equal(ui.nodes.get('refresh-infrastructure').disabled,false);
 await ui.run('enterServerManagement()');assert.equal(calls,2);assert.equal(ui.run('fleetLoaded'),true);
 ui.run('signedOut()');assert.equal(ui.run('fleetLoaded'),false);assert.equal(ui.run('fleetLoading'),false);
});
test('server redesign has unique IDs, valid controller targets and separate native action dialog',()=>{
 const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
 for(const m of code.matchAll(/\$\('#([\w-]+)'\)/g))assert.ok(ids.includes(m[1]),m[1]);
 assert.match(html,/<dialog id="ip-change-dialog"/);assert.equal([...html.matchAll(/data-tab=/g)].length,2);
 assert.doesNotMatch(html,/IP 교체·DNS 수정 기능은 제공하지 않습니다/);
});
test('inventory filters and detail history stay scoped to the selected server',()=>{
 const ui=controller();ui.run('fleetServers='+JSON.stringify([fixture('server-a','192.0.2.10'),fixture('server-b','192.0.2.20','stopped',false)]));
 ui.nodes.get('server-filter').value='all';
 ui.run('liveJobs='+JSON.stringify([{id:'job-a',status:'succeeded',createdAt:'2026-10-17T13:00:00Z',plan:{instance:'server-a',oldIp:'192.0.2.1',servicePort:54137},state:{candidateIp:'192.0.2.10'}},{id:'job-b',status:'needs_review',createdAt:'2026-10-17T13:00:00Z',plan:{instance:'server-b',oldIp:'192.0.2.2'},state:{}}]));
 ui.run('renderFleet()');assert.equal(ui.nodes.get('fleet-list').children.length,2);
 assert.equal(ui.nodes.get('fleet-list').children[0].children[0].children[0].textContent,'server-b');
 ui.nodes.get('server-query').value='192.0.2.10';ui.run('renderFleet()');assert.equal(ui.nodes.get('fleet-list').children.length,1);
 ui.run('selectServer(fleetServers[0])');assert.equal(ui.nodes.get('live-target').value,'server-a');assert.equal(ui.nodes.get('live-list').children.length,1);assert.equal(ui.nodes.get('live-list').children[0].children[2].textContent,'192.0.2.1 → 192.0.2.10');
 ui.nodes.get('server-query').value='';ui.nodes.get('server-filter').value='attention';ui.run('renderFleet()');assert.equal(ui.nodes.get('fleet-list').children.length,1);
 ui.run('liveBusy=true;selectServer(fleetServers[1])');assert.equal(ui.run('selectedServer'),'server-a');
});
test('real run remains gated by target, server flag, expiry and approvals',()=>{
 const ui=controller();ui.run(`selectedServer='server-a';selectedLive={status:'planned',plan:{instance:'server-a',policyVersion:2,retainOldIp:false,releaseOldIpAfterVerification:true,retainKeys:true},expiresAt:new Date(Date.now()+60000).toISOString()};liveEnabled=false;`);
 for(const id of ['live-downtime','live-users','live-retain'])ui.nodes.get(id).checked=true;
 ui.nodes.get('live-typed').value='server-a';ui.run('liveControls()');assert.equal(ui.nodes.get('run-live').disabled,true);
 ui.run('liveEnabled=true;liveControls()');assert.equal(ui.nodes.get('run-live').disabled,false);
 ui.run('selectedLive.plan.retainOldIp=true;liveControls()');assert.equal(ui.nodes.get('run-live').disabled,true);ui.run('selectedLive.plan.retainOldIp=false');
 ui.run("selectedServer='server-b';liveControls()");assert.equal(ui.nodes.get('run-live').disabled,true);
 ui.run("selectedServer='server-a';selectedLive.expiresAt='2000-01-01T00:00:00Z';liveControls()");assert.equal(ui.nodes.get('run-live').disabled,true);
});
test('ambiguous DNS progress asks for a state check and does not claim rollback or propagation success',()=>{
 const ui=controller();ui.run("renderRotationProgress({status:'needs_review',state:{completed:['allocate','detach','attach','service'],pending:'dns'}})");
 const steps=ui.nodes.get('rotation-progress').children[0].children;
 assert.equal(steps[4].children[1].textContent,'상태 대조 필요');assert.equal(steps[5].children[1].textContent,'대기');
 ui.run("renderRotationProgress({plan:{policyVersion:2,retainOldIp:false,releaseOldIpAfterVerification:true,retainKeys:true},status:'needs_review',state:{completed:['allocate','detach','attach','service','dns','verify'],pending:'release'}})");
 const releaseSteps=ui.nodes.get('rotation-progress').children[0].children;assert.equal(releaseSteps.length,7);assert.equal(releaseSteps[6].children[0].textContent,'기존 IP 반환');assert.equal(releaseSteps[6].children[1].textContent,'상태 대조 필요');
 ui.run("renderRotationProgress({status:'running',state:{completed:['allocate','detach','attach','service','dns'],pending:'verify',dnsVerification:{status:'waiting'}}})");assert.equal(ui.nodes.get('rotation-progress').children[0].children[5].children[1].textContent,'전파 확인 중');
 ui.run("renderRotationProgress({status:'needs_review',state:{completed:['allocate','detach','attach','service','dns'],pending:'verify',dnsVerification:{status:'timed_out'}}})");assert.equal(ui.nodes.get('rotation-progress').children[0].children[5].children[1].textContent,'확인 시간 초과');
});
test('selected health check suppresses duplicates, stays with its server and invalidates stale/IP-changed results',async()=>{
 let calls=0,complete;const pending=new Promise(resolve=>{complete=resolve;});
 const a=fixture('server-a','3.34.11.44'),b=fixture('server-b','3.35.11.45');
 const ui=controller(async url=>{calls++;assert.equal(url,'/api/admin/servers/server-a/health');await pending;return {ok:true,status:200,json:async()=>({instanceName:'server-a',publicIp:a.instance.data.publicIp,servicePort:54137,finishedAt:new Date().toISOString(),server:{state:'running',status:'running'},tcp:{status:'connected',latencyMs:12},dns:{status:'match',authorityMatched:true},infrastructure:a})};});
 ui.nodes.get('server-filter').value='all';ui.run("csrf='synthetic';fleetServers="+JSON.stringify([a,b])+';selectServer(fleetServers[0])');
 const first=ui.run('checkSelectedServer()');await ui.run('checkSelectedServer()');assert.equal(calls,1);
 ui.run('selectServer(fleetServers[1])');complete();await first;assert.equal(ui.nodes.get('server-detail-title').textContent,'server-b');assert.equal(ui.run('serviceView(fleetServers[1]).label'),'미점검');assert.equal(ui.run('serviceView(fleetServers[0]).label'),'연결 성공');
 ui.run("healthReports.get('server-a').finishedAt=new Date(Date.now()-61000).toISOString()");assert.equal(ui.run('serviceView(fleetServers[0]).label'),'재점검 필요');
 ui.run("healthReports.get('server-a').finishedAt=new Date().toISOString();fleetServers[0].instance.data.publicIp='3.34.11.99'");assert.equal(ui.run('serviceView(fleetServers[0]).label'),'재점검 필요');
});
