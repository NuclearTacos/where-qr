import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVerdict, cleanUrl } from '../src/analysis/verdict.js';

const hop = (url, status = 200, extra = {}) => ({ url, status, responseTime: 50, redirectMethod: status >= 300 && status < 400 ? 'http-header' : 'none', ...extra });
const texts = (v) => v.flags.map((f) => f.text);

test('direct, reachable, clean link is ok', () => {
  const v = buildVerdict({ chain: [hop('https://example.com/about')] });
  assert.equal(v.level, 'ok');
  assert.equal(v.hops, 0);
  assert.equal(v.finalHost, 'example.com');
  assert.equal(v.cleanUrl, null);
  assert.ok(v.reachable);
  assert.deepEqual(texts(v), ['No red flags']);
});

test('personal data anywhere in the chain is a warning', () => {
  const v = buildVerdict({ chain: [hop('https://bit.ly/x?email=a@b.com', 301), hop('https://example.com/')] });
  assert.equal(v.level, 'warning');
  assert.match(texts(v).join('|'), /personal data.*email/i);
});

test('unreachable destination is a warning', () => {
  const v = buildVerdict({ chain: [hop('https://bit.ly/x', 301), hop('https://down.example', 0, { redirectMethod: 'error', redirectDetails: 'Request timed out' })] });
  assert.equal(v.level, 'warning');
  assert.equal(v.reachable, false);
  assert.match(texts(v)[0], /could not be reached/i);
});

test('blocked destination is called out specifically', () => {
  const v = buildVerdict({ chain: [hop('https://bit.ly/x', 302), hop('http://10.0.0.5/', 0, { redirectMethod: 'blocked' })] });
  assert.match(texts(v)[0], /private or internal network/i);
});

test('404 is caution, not warning', () => {
  const v = buildVerdict({ chain: [hop('https://example.com/gone', 404)] });
  assert.equal(v.level, 'caution');
});

test('truncated chain is flagged', () => {
  const chain = Array.from({ length: 10 }, (_, i) => hop(`https://r${i}.example/`, 302));
  const v = buildVerdict({ chain, truncated: true });
  assert.match(texts(v).join('|'), /Stopped after 10 hops/);
});

test('https to http downgrade is caution', () => {
  const v = buildVerdict({ chain: [hop('https://short.example/x', 301), hop('http://plain.example/')] });
  assert.equal(v.level, 'caution');
  assert.match(texts(v).join('|'), /unencrypted HTTP/);
});

test('javascript redirects and intermediaries are reported', () => {
  const v = buildVerdict({ chain: [
    hop('https://bit.ly/x', 200, { redirectMethod: 'javascript', redirectDetails: 'JavaScript: window.location.href assignment' }),
    hop('https://example.com/?gclid=abc'),
  ] });
  const all = texts(v).join('|');
  assert.match(all, /JavaScript or meta-refresh/);
  assert.match(all, /Passes through Bitly/);
  assert.match(all, /1 tracking identifier/);
  assert.equal(v.cleanUrl, 'https://example.com/');
});

test('raw IP and punycode hosts are cautions', () => {
  assert.equal(buildVerdict({ chain: [hop('http://93.184.216.34/')] }).level, 'caution');
  assert.match(texts(buildVerdict({ chain: [hop('https://xn--pple-43d.com/')] })).join('|'), /Internationalised/);
});

test('cleanUrl strips tracking, attribution, personal and session params but keeps functional ones', () => {
  const dirty = 'https://shop.example/p?product_id=42&utm_source=x&fbclid=abc&email=a@b.com&token=t';
  assert.equal(cleanUrl(dirty), 'https://shop.example/p?product_id=42');
  assert.equal(cleanUrl('not a url'), 'not a url');
});

test('empty chain yields null', () => {
  assert.equal(buildVerdict({ chain: [] }), null);
  assert.equal(buildVerdict(null), null);
});
