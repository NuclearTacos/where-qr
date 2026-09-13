import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/track.js';

// Fake req/res mirroring the shape scripts/dev-server.mjs builds around the real Vercel
// request/response objects. No real network calls happen in any of these cases: every one
// of them is rejected (405 / 400 / 429) before followRedirects would ever call fetch.

function makeReq({ method = 'GET', query = {}, ip = '1.2.3.4' } = {}) {
  return {
    method,
    query,
    headers: { 'x-forwarded-for': ip },
    socket: { remoteAddress: ip },
  };
}

function makeRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    end(body) {
      this.body = body;
      return this;
    },
  };
  return res;
}

test('api/track: non-GET method is rejected with 405 and Allow header', async () => {
  const req = makeReq({ method: 'POST', ip: 'ip-405' });
  const res = makeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, 'GET');
  assert.deepEqual(res.body, { error: 'Method not allowed' });
});

test('api/track: missing url returns 400', async () => {
  const req = makeReq({ query: {}, ip: 'ip-400-missing' });
  const res = makeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'URL parameter is required');
});

test('api/track: non-http(s) scheme returns 400', async () => {
  const req = makeReq({ query: { url: 'ftp://example.com/file' }, ip: 'ip-400-scheme' });
  const res = makeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'Only HTTP(S) URLs are supported');
});

test('api/track: invalid url format returns 400', async () => {
  const req = makeReq({ query: { url: 'not a url' }, ip: 'ip-400-format' });
  const res = makeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'Invalid URL format');
});

test('api/track: url over 2048 chars returns 400', async () => {
  const longUrl = `https://example.com/${'a'.repeat(2048)}`;
  const req = makeReq({ query: { url: longUrl }, ip: 'ip-400-long' });
  const res = makeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'URL is too long');
});

test('api/track: blocked start host (private IP literal) returns 400 without network calls', async () => {
  const req = makeReq({ query: { url: 'http://127.0.0.1/' }, ip: 'ip-400-blocked' });
  const res = makeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(
    res.body.error,
    'That address points to a private or internal network and cannot be checked.',
  );
});

test('api/track: sets security headers and does not send a wildcard CORS header', async () => {
  const req = makeReq({ query: {}, ip: 'ip-headers' });
  const res = makeRes();
  await handler(req, res);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.equal(res.headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(res.headers['Access-Control-Allow-Origin'], undefined);
});

test('api/track: 429 after 30 requests from one IP within the window', async () => {
  const ip = 'ip-429-test';

  for (let i = 0; i < 30; i++) {
    const req = makeReq({ query: {}, ip });
    const res = makeRes();
    await handler(req, res);
    assert.equal(res.statusCode, 400, `request ${i + 1} should pass rate limiting (400 for missing url)`);
  }

  const req = makeReq({ query: {}, ip });
  const res = makeRes();
  await handler(req, res);

  assert.equal(res.statusCode, 429);
  assert.equal(res.body.error, 'Too many requests. Try again in a minute.');
  assert.ok(res.headers['Retry-After']);
});
