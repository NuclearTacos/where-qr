import test from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateAddress, isBlockedHostname, isBlockedHost } from '../lib/ssrf.js';

// ---------------------------------------------------------------------------
// isPrivateAddress
// ---------------------------------------------------------------------------

const privateIPv4Cases = [
  '127.0.0.1',
  '127.255.255.255',
  '0.0.0.0',
  '10.0.0.1',
  '10.255.255.255',
  '172.16.0.1',
  '172.31.255.255',
  '192.168.0.1',
  '192.168.255.255',
  '169.254.0.1',
  '100.64.0.1',
  '100.127.255.255',
  '224.0.0.1',
  '239.255.255.255',
  '240.0.0.1',
  '255.255.255.255',
];

const publicIPv4Cases = ['8.8.8.8', '1.1.1.1', '93.184.216.34', '172.15.255.255', '172.32.0.1', '100.63.255.255', '100.128.0.1'];

for (const ip of privateIPv4Cases) {
  test(`isPrivateAddress: ${ip} is private (IPv4)`, () => {
    assert.equal(isPrivateAddress(ip), true);
  });
}

for (const ip of publicIPv4Cases) {
  test(`isPrivateAddress: ${ip} is public (IPv4)`, () => {
    assert.equal(isPrivateAddress(ip), false);
  });
}

const privateIPv6Cases = ['::', '::1', 'fc00::1', 'fd12:3456:789a::1', 'fe80::1', 'ff02::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1'];

const publicIPv6Cases = ['2001:4860:4860::8888', '2606:4700:4700::1111', '::ffff:8.8.8.8'];

for (const ip of privateIPv6Cases) {
  test(`isPrivateAddress: ${ip} is private (IPv6)`, () => {
    assert.equal(isPrivateAddress(ip), true);
  });
}

for (const ip of publicIPv6Cases) {
  test(`isPrivateAddress: ${ip} is public (IPv6)`, () => {
    assert.equal(isPrivateAddress(ip), false);
  });
}

// ---------------------------------------------------------------------------
// isBlockedHostname
// ---------------------------------------------------------------------------

test('isBlockedHostname: localhost variants', () => {
  assert.equal(isBlockedHostname('localhost'), true);
  assert.equal(isBlockedHostname('foo.localhost'), true);
});

test('isBlockedHostname: .local / .internal / .home.arpa suffixes', () => {
  assert.equal(isBlockedHostname('printer.local'), true);
  assert.equal(isBlockedHostname('service.internal'), true);
  assert.equal(isBlockedHostname('router.home.arpa'), true);
});

test('isBlockedHostname: bare private IP literal', () => {
  assert.equal(isBlockedHostname('127.0.0.1'), true);
  assert.equal(isBlockedHostname('192.168.1.1'), true);
  assert.equal(isBlockedHostname('[::1]'), true);
});

test('isBlockedHostname: bare public IP literal is allowed', () => {
  assert.equal(isBlockedHostname('8.8.8.8'), false);
});

test('isBlockedHostname: ordinary public hostname is allowed', () => {
  assert.equal(isBlockedHostname('example.com'), false);
  assert.equal(isBlockedHostname('bit.ly'), false);
});

test('isBlockedHostname: trailing dot FQDN form does not bypass suffix rules', () => {
  assert.equal(isBlockedHostname('localhost.'), true);
  assert.equal(isBlockedHostname('printer.local.'), true);
});

// ---------------------------------------------------------------------------
// isBlockedHost (async, with injected lookup)
// ---------------------------------------------------------------------------

test('isBlockedHost: hostname rule short-circuits without calling lookup', async () => {
  let called = false;
  const lookup = async () => {
    called = true;
    return [];
  };
  const result = await isBlockedHost('localhost', { lookup });
  assert.equal(result, true);
  assert.equal(called, false);
});

test('isBlockedHost: mixed public+private resolution is blocked', async () => {
  const lookup = async () => [
    { address: '93.184.216.34', family: 4 },
    { address: '10.0.0.5', family: 4 },
  ];
  const result = await isBlockedHost('example.com', { lookup });
  assert.equal(result, true);
});

test('isBlockedHost: public-only resolution is allowed', async () => {
  const lookup = async () => [{ address: '93.184.216.34', family: 4 }];
  const result = await isBlockedHost('example.com', { lookup });
  assert.equal(result, false);
});

test('isBlockedHost: lookup throwing is blocked (fail closed)', async () => {
  const lookup = async () => {
    throw new Error('DNS failure');
  };
  const result = await isBlockedHost('nonexistent.invalid', { lookup });
  assert.equal(result, true);
});

test('isBlockedHost: lookup returning no addresses is blocked (fail closed)', async () => {
  const lookup = async () => [];
  const result = await isBlockedHost('example.com', { lookup });
  assert.equal(result, true);
});
