import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export async function loadDemoData() {
  const root = new URL('../fixtures/demo/', import.meta.url);
  const [infrastructure, customers] = await Promise.all(
    ['infrastructure.json', 'customers.json'].map(async name => JSON.parse(await readFile(new URL(name, root), 'utf8')))
  );
  const accessKeys = customers.map((customer, index) => {
    const password = `DEMO-ONLY-NOT-FOR-USE-${String(index + 1).padStart(3, '0')}`;
    const method = 'chacha20-ietf-poly1305';
    const encoded = Buffer.from(`${method}:${password}`).toString('base64url');
    return {
      id: customer.outlineKeyId,
      serverId: infrastructure.outline.serverId,
      name: customer.displayName,
      customerId: customer.id,
      port: infrastructure.outline.portForAccessKeys,
      method,
      password,
      accessUrl: `ss://${encoded}@${infrastructure.outline.hostnameForAccessKeys}:${infrastructure.outline.portForAccessKeys}/?outline=1`,
      state: customer.status === 'active' ? 'demo-enabled' : 'demo-disabled',
      source: 'synthetic-fixture'
    };
  });
  const data = { infrastructure, customers, accessKeys };
  validateDemoData(data);
  return data;
}

export function validateDemoData({ infrastructure: config, customers, accessKeys }) {
  if (config.mode !== 'simulation' || config.allowMutations !== false) throw new Error('Simulation mode is required.');
  if (config.dns.provider !== 'mock-dns') throw new Error('Only mock DNS is allowed.');
  const hosts = [config.dns.zone, config.dns.hostname, config.outline.hostnameForAccessKeys, new URL(config.outline.managementApiUrl).hostname];
  if (hosts.some(host => !host.endsWith('.test'))) throw new Error('Demo hosts must use .test.');
  if (![config.aws.publicIp, config.aws.candidatePublicIp, config.dns.recordValue].every(ip => /^192\.0\.2\.(?:[1-9]|[1-9]\d|1\d\d|2[0-4]\d|25[0-4])$/.test(ip))) throw new Error('Documentation IP addresses are required.');
  if (config.dns.recordValue !== config.aws.publicIp || config.dns.hostname !== config.outline.hostnameForAccessKeys) throw new Error('DNS and server configuration do not match.');
  if (!Number.isInteger(config.outline.portForAccessKeys) || config.outline.portForAccessKeys < 1 || config.outline.portForAccessKeys > 65535) throw new Error('Invalid port.');
  if (config.customerPolicy.sharedKeys !== false) throw new Error('Shared keys are prohibited.');
  for (const [label, values] of [
    ['customer IDs', customers.map(c => c.id)],
    ['assigned keys', customers.map(c => c.outlineKeyId)],
    ['key IDs', accessKeys.map(k => `${k.serverId}:${k.id}`)],
    ['passwords', accessKeys.map(k => k.password)]
  ]) if (values.some(v => !v) || new Set(values).size !== values.length) throw new Error(`Duplicate or missing ${label}.`);
  if (customers.length !== accessKeys.length) throw new Error('Customer/key counts differ.');
  for (const customer of customers) {
    const key = accessKeys.find(k => k.id === customer.outlineKeyId && k.customerId === customer.id);
    if (!key || key.serverId !== config.outline.serverId) throw new Error('Customer/key mapping mismatch.');
    if (customer.status !== 'active' && key.state === 'demo-enabled') throw new Error('Inactive customer key is enabled.');
    if (customer.status === 'active' && (customer.paymentStatus !== 'confirmed' || !customer.expiresAt)) throw new Error('Active customer needs confirmed payment and expiry.');
  }
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const data = await loadDemoData();
  const summary = {
    mode: data.infrastructure.mode,
    aws: data.infrastructure.aws,
    dns: data.infrastructure.dns,
    customers: data.customers.map(c => ({ id: c.id, name: c.displayName, status: c.status, keyId: c.outlineKeyId, expiresAt: c.expiresAt })),
    keyCount: data.accessKeys.length,
    sharedKeys: false,
    externalCalls: 0
  };
  console.log(JSON.stringify(process.argv.includes('--show-demo-keys') ? data : summary, null, 2));
}
