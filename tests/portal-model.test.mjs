import test from 'node:test';
import assert from 'node:assert/strict';
import {loadDemoData} from '../tools/demo-data.mjs';
import {createStore,extend,purchase,confirmPayment,addCustomer} from '../dist/portal-model.mjs';
test('active extension retains key and extends from existing expiry',async()=>{const s=createStore(await loadDemoData());const c=s.customers[0],key=c.accessUrl;extend(s,c.id,30);assert.equal(c.expiresAt,'2026-11-30T00:00:00.000Z');assert.equal(c.accessUrl,key);assert.equal(s.orders.length,1);});
test('expired renewal starts from demo reference date',async()=>{const s=createStore(await loadDemoData());const c=extend(s,s.customers[2].id,30);assert.equal(c.expiresAt,'2026-11-13T00:00:00.000Z');assert.equal(c.status,'active');});
test('new purchases create unique keys and repeated payment confirmation is rejected',async()=>{const s=createStore(await loadDemoData());const a=purchase(s,{email:'a@example.test',days:30}),b=purchase(s,{email:'b@example.test',days:90});assert.notEqual(a.accessUrl,b.accessUrl);assert.notEqual(a.keyId,b.keyId);const id=s.customers[3].id;confirmPayment(s,id);assert.throws(()=>confirmPayment(s,id));});
test('duplicate registration and unsupported terms leave state unchanged',async()=>{const s=createStore(await loadDemoData());assert.throws(()=>addCustomer(s,{name:'x',email:s.customers[0].email}));assert.throws(()=>extend(s,s.customers[0].id,7));assert.equal(s.customers.length,5);assert.equal(s.orders.length,0);});
