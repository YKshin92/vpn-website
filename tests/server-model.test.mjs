import test from 'node:test';
import assert from 'node:assert/strict';
import {createServerState,runIpTest,recoverServer} from '../dist/server-model.mjs';
test('IP round trip keeps DNS and restores original IP',async()=>{const s=createServerState();await runIpTest(s);assert.equal(s.status,'success');assert.equal(s.attachedIp,s.originalIp);assert.equal(s.dnsIp,s.originalIp);});
test('failure restores original IP',async()=>{for(const failure of ['신규 IP 확보','신규 IP 연결','연결 상태 확인']){const s=createServerState();await runIpTest(s,{failure});assert.equal(s.status,'rolled-back');assert.equal(s.attachedIp,s.originalIp);}});
test('restore failure requires recovery before rerunning',async()=>{const s=createServerState();await runIpTest(s,{failure:'기존 IP 복구'});assert.equal(s.status,'needs-recovery');assert.equal(s.attachedIp,s.candidateIp);await assert.rejects(runIpTest(s),/복구/);recoverServer(s);assert.equal(s.attachedIp,s.originalIp);assert.equal(s.dnsIp,s.originalIp);});
test('duplicate runs are rejected',async()=>{const s=createServerState();let release;const first=runIpTest(s,{wait:()=>new Promise(r=>{release=r;})});await assert.rejects(runIpTest(s),/진행 중/);for(let i=0;i<4;i++){release();await new Promise(r=>setImmediate(r));}await first;assert.equal(s.running,false);});
