import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {createPool} from '../.build/db.js';import {buildApp} from '../.build/app.js';import {testAdmin} from './auth-helper.mjs';
test('customer periods, historical ledger and Korean revenue dates',async t=>{
 const pool=createPool(),app=buildApp(pool);let admin;const id=randomUUID(),email='billing-'+id+'@example.test';let payment,pending;
 try{
  await app.ready();admin=await testAdmin(pool,app);await pool.query('INSERT INTO ieum_dev.customers(id,display_name,email,status) VALUES($1,$2,$3,$4)',[id,'고객_%'+id,email,'active']);
  const request=(url,method='GET',payload,extra={})=>app.inject({url,method,payload,headers:{host:'127.0.0.1:3000',...admin.headers,...extra}});
  const profile={planCode:'30',startsAt:'2025-06-01T00:00:00Z',expiresAt:'2025-07-01T00:00:00Z',note:'테스트 운영 메모',status:'active',revision:0};
  await t.test('authenticated routes, CSRF and profile conflicts',async()=>{
   assert.equal((await app.inject({url:'/api/admin/customers',headers:{host:'127.0.0.1:3000'}})).statusCode,401);
   assert.equal((await request(`/api/admin/customers/${id}/profile`,'PATCH',profile,{'x-csrf-token':'bad'})).statusCode,403);
   const saved=await request(`/api/admin/customers/${id}/profile`,'PATCH',profile);assert.equal(saved.statusCode,200);assert.equal(saved.json().customer.status,'expired');assert.equal(saved.json().customer.remainingDays,0);
   assert.equal((await request(`/api/admin/customers/${id}/profile`,'PATCH',profile)).statusCode,409);
   assert.equal((await request(`/api/admin/customers/${id}/profile`,'PATCH',{...profile,revision:1,startsAt:'2025-02-31T00:00:00Z'})).statusCode,400);
   assert.equal((await request(`/api/admin/customers/${id}/profile`,'PATCH',{...profile,revision:1,expiresAt:null})).statusCode,400);
  });
  await t.test('literal search, expiry alert and future start derived from timestamps',async()=>{
   const update={...profile,revision:1,startsAt:new Date(Date.now()-86400000).toISOString(),expiresAt:new Date(Date.now()+3*86400000).toISOString()};assert.equal((await request(`/api/admin/customers/${id}/profile`,'PATCH',update)).statusCode,200);
   const result=(await request('/api/admin/customers?'+new URLSearchParams({q:email,filter:'soon'}))).json();assert.equal(result.customers.length,1);assert.equal(result.customers[0].remainingDays,3);
   const literal=(await request('/api/admin/customers?'+new URLSearchParams({q:'_%'+id}))).json();assert.equal(literal.customers.length,1);
   const scheduled=await request(`/api/admin/customers/${id}/profile`,'PATCH',{...update,revision:2,startsAt:new Date(Date.now()+86400000).toISOString(),expiresAt:new Date(Date.now()+5*86400000).toISOString()});assert.equal(scheduled.json().customer.status,'scheduled');
  });
  await t.test('manual payment is idempotent and does not extend subscription',async()=>{
   const body={planCode:'30',amount:10000,status:'paid',paidAt:'2025-05-31T15:00:00Z',note:'한국 6월1일',requestKey:randomUUID()};const first=await request(`/api/admin/customers/${id}/payments`,'POST',body);assert.equal(first.statusCode,201);payment=first.json().id;assert.equal(first.json().actualPaymentExecuted,false);
   assert.equal((await request(`/api/admin/customers/${id}/payments`,'POST',body)).json().id,payment);assert.equal((await request(`/api/admin/customers/${id}/payments`,'POST',{...body,amount:10001})).statusCode,409);
   const second=await request(`/api/admin/customers/${id}/payments`,'POST',{...body,amount:5000,paidAt:'2025-05-31T14:59:59Z',requestKey:randomUUID()});assert.equal(second.statusCode,201);
   pending=(await request(`/api/admin/customers/${id}/payments`,'POST',{...body,amount:12000,status:'pending',paidAt:null,requestKey:randomUUID()})).json().id;
   assert.equal((await request('/api/admin/customers/'+id)).json().customer.revision,3);
  });
  await t.test('refund limits and concurrent refunds use payment row lock',async()=>{
   const body={amount:2000,refundedAt:'2025-06-02T00:00:00Z',reason:'가상 부분 환불',requestKey:randomUUID()};assert.equal((await request(`/api/admin/payments/${pending}/refunds`,'POST',body)).statusCode,409);
   assert.equal((await request(`/api/admin/payments/${payment}/refunds`,'POST',{...body,refundedAt:'2025-01-01T00:00:00Z'})).statusCode,400);
   const first=await request(`/api/admin/payments/${payment}/refunds`,'POST',body);assert.equal(first.statusCode,201);assert.equal((await request(`/api/admin/payments/${payment}/refunds`,'POST',body)).json().id,first.json().id);
   const both=await Promise.all([1,2].map(()=>request(`/api/admin/payments/${payment}/refunds`,'POST',{...body,amount:7000,requestKey:randomUUID()})));assert.deepEqual(both.map(r=>r.statusCode).sort(),[201,409]);
  });
  await t.test('daily and monthly cash flow uses Korean dates, zeros and excludes pending',async()=>{
   const day=await request('/api/admin/revenue?start=2025-06-01&end=2025-06-03&group=day');assert.equal(day.statusCode,200);const data=day.json();assert.deepEqual(data.rows.map(r=>r.period),['2025-06-01','2025-06-02','2025-06-03']);assert.equal(data.rows[0].gross,10000);assert.equal(data.rows[1].refunded,9000);assert.equal(data.rows[2].net,0);assert.equal(data.totals.net,1000);
   const month=(await request('/api/admin/revenue?start=2025-05-01&end=2025-06-30&group=month')).json();assert.equal(month.rows.length,2);assert.equal(month.rows[0].gross,5000);assert.equal(month.totals.gross,15000);assert.equal(month.totals.count,2);
   assert.equal((await request('/api/admin/revenue?start=2025-02-30&end=2025-06-03')).statusCode,400);
  });
  await t.test('historical email snapshot and audit remain visible after email update',async()=>{
   await pool.query('UPDATE ieum_dev.customers SET email=$2 WHERE id=$1',[id,'changed-'+id+'@example.test']);const detail=(await request('/api/admin/customers/'+id)).json();assert.equal(detail.payments.length,3);assert.ok(detail.payments.every(p=>p.email===email));assert.ok(detail.audit.some(e=>e.action==='profile-updated'));assert.ok(detail.audit.some(e=>e.action==='manual-refund-recorded'));
  });
 }finally{await pool.query('DELETE FROM ieum_dev.billing_refunds WHERE payment_id IN(SELECT id FROM ieum_dev.billing_payments WHERE customer_id=$1)',[id]);await pool.query('DELETE FROM ieum_dev.billing_payments WHERE customer_id=$1',[id]);await pool.query('DELETE FROM ieum_dev.customer_events WHERE customer_id=$1',[id]);await pool.query('DELETE FROM ieum_dev.customers WHERE id=$1',[id]);if(admin)await pool.query('DELETE FROM ieum_dev.admins WHERE id=$1',[admin.id]);await app.close();await pool.end();}
});
