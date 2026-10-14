import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDemoData, validateDemoData } from '../tools/demo-data.mjs';

test('each synthetic customer has a unique Outline key and password', async () => {
  const data = await loadDemoData();
  assert.equal(data.customers.length, 5);
  assert.equal(new Set(data.accessKeys.map(k => k.password)).size, 5);
  for (const key of data.accessKeys) {
    const uri = new URL(key.accessUrl);
    assert.equal(uri.hostname, 'connect.vpn.example.test');
    assert.equal(uri.port, '18443');
    assert.equal(Buffer.from(uri.username, 'base64url').toString(), `${key.method}:${key.password}`);
  }
});

test('shared customer key assignments are rejected', async () => {
  const data = await loadDemoData();
  data.customers[1].outlineKeyId = data.customers[0].outlineKeyId;
  assert.throws(() => validateDemoData(data), /assigned keys/);
});

test('real hosts and mutations are rejected', async () => {
  const data = await loadDemoData();
  data.infrastructure.allowMutations = true;
  assert.throws(() => validateDemoData(data), /Simulation/);
  data.infrastructure.allowMutations = false;
  data.infrastructure.dns.hostname = 'real.example.com';
  assert.throws(() => validateDemoData(data), /\.test/);
});

test('payment-pending, expired and unknown-duration customers cannot connect in the demo', async () => {
  const data = await loadDemoData();
  const inactive = data.accessKeys.filter(k => k.state === 'demo-disabled');
  assert.equal(inactive.length, 3);
  inactive[0].state = 'demo-enabled';
  assert.throws(() => validateDemoData(data), /Inactive/);
});
