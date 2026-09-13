import test from 'node:test';
import assert from 'node:assert/strict';
import { extractRedirect, followRedirects } from '../lib/redirects.js';

function headers(obj) {
  return new Headers(obj);
}

function makeResponse({ status = 200, headers: h = {}, body = null } = {}) {
  return { status, headers: headers(h), body };
}

function streamFromChunks(chunks) {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk);
      }
      controller.close();
    },
  });
}

// ---------------------------------------------------------------------------
// extractRedirect
// ---------------------------------------------------------------------------

test('extractRedirect: window.location.href assignment', () => {
  const html = '<script>window.location.href = "https://example.com/dest";</script>';
  const result = extractRedirect(html, 'https://start.example');
  assert.equal(result.url, 'https://example.com/dest');
  assert.equal(result.method, 'javascript');
  assert.equal(result.details, 'JavaScript: window.location.href assignment');
});

test('extractRedirect: window.location.replace() call', () => {
  const html = '<script>window.location.replace("https://example.com/dest");</script>';
  const result = extractRedirect(html, 'https://start.example');
  assert.equal(result.url, 'https://example.com/dest');
  assert.equal(result.method, 'javascript');
  assert.equal(result.details, 'JavaScript: window.location.replace() call');
});

test('extractRedirect: window.location assignment', () => {
  const html = '<script>window.location = "https://example.com/dest";</script>';
  const result = extractRedirect(html, 'https://start.example');
  assert.equal(result.url, 'https://example.com/dest');
  assert.equal(result.method, 'javascript');
  assert.equal(result.details, 'JavaScript: window.location assignment');
});

test('extractRedirect: location.href assignment', () => {
  const html = '<script>location.href = "https://example.com/dest";</script>';
  const result = extractRedirect(html, 'https://start.example');
  assert.equal(result.url, 'https://example.com/dest');
  assert.equal(result.method, 'javascript');
  assert.equal(result.details, 'JavaScript: location.href assignment');
});

test('extractRedirect: location.replace() call', () => {
  const html = '<script>location.replace("https://example.com/dest");</script>';
  const result = extractRedirect(html, 'https://start.example');
  assert.equal(result.url, 'https://example.com/dest');
  assert.equal(result.method, 'javascript');
  assert.equal(result.details, 'JavaScript: location.replace() call');
});

test('extractRedirect: location assignment', () => {
  const html = '<script>location = "https://example.com/dest";</script>';
  const result = extractRedirect(html, 'https://start.example');
  assert.equal(result.url, 'https://example.com/dest');
  assert.equal(result.method, 'javascript');
  assert.equal(result.details, 'JavaScript: location assignment');
});

test('extractRedirect: meta refresh, http-equiv first, quoted inner url, mixed case URL=', () => {
  const html = '<meta http-equiv="refresh" content="0; URL=\'https://example.com/dest\'">';
  const result = extractRedirect(html, 'https://start.example');
  assert.equal(result.url, 'https://example.com/dest');
  assert.equal(result.method, 'meta-refresh');
  assert.equal(result.details, 'HTML: <meta http-equiv="refresh"> tag');
});

test('extractRedirect: meta refresh, http-equiv first, no quotes no space', () => {
  const html = '<meta http-equiv="refresh" content="0;url=https://example.com/dest">';
  const result = extractRedirect(html, 'https://start.example');
  assert.equal(result.url, 'https://example.com/dest');
  assert.equal(result.method, 'meta-refresh');
});

test('extractRedirect: meta refresh, content-first alternative format', () => {
  const html = '<meta content="0; url=https://example.com/dest" http-equiv="refresh">';
  const result = extractRedirect(html, 'https://start.example');
  assert.equal(result.url, 'https://example.com/dest');
  assert.equal(result.method, 'meta-refresh');
  assert.equal(result.details, 'HTML: <meta> refresh tag (alternative format)');
});

test('extractRedirect: relative URL resolution', () => {
  const html = '<script>window.location.href = "/dest/page";</script>';
  const result = extractRedirect(html, 'https://start.example/some/path');
  assert.equal(result.url, 'https://start.example/dest/page');
});

test('extractRedirect: javascript: scheme is rejected', () => {
  const html = '<script>window.location.href = "javascript:alert(1)";</script>';
  const result = extractRedirect(html, 'https://start.example');
  assert.equal(result.url, null);
  assert.equal(result.method, 'none');
});

test('extractRedirect: no match returns none', () => {
  const html = '<html><body>Nothing interesting here</body></html>';
  const result = extractRedirect(html, 'https://start.example');
  assert.equal(result.url, null);
  assert.equal(result.method, 'none');
  assert.equal(result.details, 'No redirect pattern detected in response');
});

test('extractRedirect: specific pattern wins over general substring pattern', () => {
  const html = '<script>window.location.replace("https://example.com/a");</script>';
  const result = extractRedirect(html, 'https://start.example');
  // Must NOT be mistaken for the general "location = ..." / "location.replace" patterns.
  assert.equal(result.details, 'JavaScript: window.location.replace() call');
});

// ---------------------------------------------------------------------------
// followRedirects
// ---------------------------------------------------------------------------

test('followRedirects: 301 -> 302 -> 200 chain, counts correct', async () => {
  const responses = {
    'https://a.example/': makeResponse({ status: 301, headers: { location: 'https://b.example/' } }),
    'https://b.example/': makeResponse({ status: 302, headers: { location: 'https://c.example/' } }),
    'https://c.example/': makeResponse({
      status: 200,
      headers: { 'content-type': 'text/html' },
      body: streamFromChunks(['<html>no redirect here</html>']),
    }),
  };
  const fetchImpl = async (url) => responses[url];

  const result = await followRedirects('https://a.example/', { fetchImpl, isBlockedHost: async () => false });

  assert.equal(result.chain.length, 3);
  assert.equal(result.finalUrl, 'https://c.example/');
  assert.equal(result.redirectCount, 2);
  assert.equal(result.jsRedirectCount, 0);
  assert.equal(result.truncated, false);
  assert.ok(result.redirectCount >= 0);
  assert.ok(result.jsRedirectCount >= 0);
});

test('followRedirects: relative Location header is resolved against current url', async () => {
  const responses = {
    'https://a.example/start': makeResponse({ status: 301, headers: { location: '/dest' } }),
    'https://a.example/dest': makeResponse({
      status: 200,
      headers: { 'content-type': 'text/html' },
      body: streamFromChunks(['ok']),
    }),
  };
  const fetchImpl = async (url) => responses[url];
  const result = await followRedirects('https://a.example/start', { fetchImpl });
  assert.equal(result.chain[1].url, 'https://a.example/dest');
  assert.equal(result.finalUrl, 'https://a.example/dest');
});

test('followRedirects: JS redirect on 200 response continues the chain', async () => {
  const responses = {
    'https://a.example/': makeResponse({
      status: 200,
      headers: { 'content-type': 'text/html' },
      body: streamFromChunks(['<script>window.location.href="https://b.example/";</script>']),
    }),
    'https://b.example/': makeResponse({
      status: 200,
      headers: { 'content-type': 'text/html' },
      body: streamFromChunks(['<html>done</html>']),
    }),
  };
  const fetchImpl = async (url) => responses[url];
  const result = await followRedirects('https://a.example/', { fetchImpl });

  assert.equal(result.chain.length, 2);
  assert.equal(result.chain[0].redirectMethod, 'javascript');
  assert.equal(result.chain[1].redirectMethod, 'none');
  assert.equal(result.jsRedirectCount, 1);
  assert.equal(result.redirectCount, 0);
  assert.equal(result.finalUrl, 'https://b.example/');
});

test('followRedirects: body cap stops reading oversized stream but still returns', async () => {
  const maxBodyBytes = 16;
  const bigChunk1 = new Uint8Array(20).fill(97); // 'a' * 20
  const bigChunk2 = new Uint8Array(20).fill(98); // 'b' * 20
  const responses = {
    'https://a.example/': makeResponse({
      status: 200,
      headers: { 'content-type': 'text/html' },
      body: streamFromChunks([bigChunk1, bigChunk2]),
    }),
  };
  const fetchImpl = async () => responses['https://a.example/'];

  const result = await followRedirects('https://a.example/', { fetchImpl, maxBodyBytes });

  assert.equal(result.chain.length, 1);
  assert.equal(result.chain[0].redirectMethod, 'none');
  assert.equal(result.truncated, false);
});

test('followRedirects: maxHops truncation sets truncated true', async () => {
  let counter = 0;
  const fetchImpl = async () => {
    counter += 1;
    return makeResponse({ status: 301, headers: { location: `https://a.example/${counter}` } });
  };

  const result = await followRedirects('https://a.example/0', { fetchImpl, maxHops: 3 });

  assert.equal(result.chain.length, 3);
  assert.equal(result.truncated, true);
});

test('followRedirects: loop detection stops with correct details, truncated false', async () => {
  const responses = {
    'https://a.example/': makeResponse({ status: 301, headers: { location: 'https://b.example/' } }),
    'https://b.example/': makeResponse({ status: 301, headers: { location: 'https://a.example/' } }),
  };
  const fetchImpl = async (url) => responses[url];

  const result = await followRedirects('https://a.example/', { fetchImpl, maxHops: 10 });

  assert.equal(result.truncated, false);
  const last = result.chain[result.chain.length - 1];
  assert.equal(last.redirectDetails, 'Redirect loop detected');
});

test('followRedirects: timeout produces an error entry', async () => {
  const fetchImpl = (url, opts) =>
    new Promise((_, reject) => {
      opts.signal.addEventListener('abort', () => {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        reject(err);
      });
    });

  const result = await followRedirects('https://a.example/', { fetchImpl, timeoutMs: 10 });

  assert.equal(result.chain.length, 1);
  assert.equal(result.chain[0].redirectMethod, 'error');
  assert.equal(result.chain[0].status, 0);
  assert.match(result.chain[0].redirectDetails, /timed out/i);
});

test('followRedirects: blocked host produces a blocked entry and stops', async () => {
  const fetchImpl = async () => {
    throw new Error('fetch should not be called for a blocked host');
  };
  const isBlockedHost = async (hostname) => hostname === 'internal.example';

  const result = await followRedirects('https://internal.example/', { fetchImpl, isBlockedHost });

  assert.equal(result.chain.length, 1);
  assert.equal(result.chain[0].redirectMethod, 'blocked');
  assert.equal(result.chain[0].status, 0);
  assert.equal(result.truncated, false);
});

test('followRedirects: blocked host is checked before every hop, not just the first', async () => {
  const responses = {
    'https://a.example/': makeResponse({ status: 301, headers: { location: 'https://internal.example/' } }),
  };
  const fetchImpl = async (url) => responses[url];
  const isBlockedHost = async (hostname) => hostname === 'internal.example';

  const result = await followRedirects('https://a.example/', { fetchImpl, isBlockedHost });

  assert.equal(result.chain.length, 2);
  assert.equal(result.chain[1].redirectMethod, 'blocked');
});

test('followRedirects: non-HTML content-type is not read', async () => {
  let bodyWasRead = false;
  const response = {
    status: 200,
    headers: headers({ 'content-type': 'application/json' }),
    get body() {
      bodyWasRead = true;
      return streamFromChunks(['{}']);
    },
  };
  const fetchImpl = async () => response;

  const result = await followRedirects('https://a.example/', { fetchImpl });

  assert.equal(bodyWasRead, false);
  assert.equal(result.chain[0].redirectDetails, 'Final destination (non-HTML content)');
});

test('followRedirects: 3xx without Location header stops the chain', async () => {
  const fetchImpl = async () => makeResponse({ status: 302, headers: {} });
  const result = await followRedirects('https://a.example/', { fetchImpl });
  assert.equal(result.chain.length, 1);
  assert.equal(result.truncated, false);
});

test('followRedirects: counts are never negative', async () => {
  const fetchImpl = async () => makeResponse({ status: 404 });
  const result = await followRedirects('https://a.example/', { fetchImpl });
  assert.ok(result.redirectCount >= 0);
  assert.ok(result.jsRedirectCount >= 0);
});
