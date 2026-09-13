// Redirect-chain following: HTTP-header redirects plus client-side (JavaScript / meta-refresh)
// redirects sniffed out of HTML bodies.

// Order matters: more specific JS patterns must come before more general ones that are
// substrings of them (e.g. "window.location.replace(...)" also matches the bare
// "location.replace(...)" pattern, and "window.location = ..." also matches "location = ...").
// Testing specific-first ensures `details` describes the actual code that ran.
const PATTERNS = [
  {
    regex: /window\.location\.href\s*=\s*["']([^"']+)["']/i,
    method: 'javascript',
    details: 'JavaScript: window.location.href assignment',
  },
  {
    regex: /window\.location\.replace\s*\(\s*["']([^"']+)["']\s*\)/i,
    method: 'javascript',
    details: 'JavaScript: window.location.replace() call',
  },
  {
    regex: /window\.location\s*=\s*["']([^"']+)["']/i,
    method: 'javascript',
    details: 'JavaScript: window.location assignment',
  },
  {
    regex: /location\.href\s*=\s*["']([^"']+)["']/i,
    method: 'javascript',
    details: 'JavaScript: location.href assignment',
  },
  {
    regex: /location\.replace\s*\(\s*["']([^"']+)["']\s*\)/i,
    method: 'javascript',
    details: 'JavaScript: location.replace() call',
  },
  {
    regex: /location\s*=\s*["']([^"']+)["']/i,
    method: 'javascript',
    details: 'JavaScript: location assignment',
  },
  {
    // <meta http-equiv="refresh" content="0; url=https://x"> (quotes around the inner url,
    // whitespace, and case are all tolerated)
    regex: /<meta[^>]+http-equiv=["']refresh["'][^>]*content=["'][^"']*?;?\s*url\s*=\s*["']?([^"'>\s]+)["']?/i,
    method: 'meta-refresh',
    details: 'HTML: <meta http-equiv="refresh"> tag',
  },
  {
    // Same tag, attributes in the opposite order.
    regex: /<meta[^>]+content=["'][^"']*?;?\s*url\s*=\s*["']?([^"'>\s]+)["']?[^>]*http-equiv=["']refresh["']/i,
    method: 'meta-refresh',
    details: 'HTML: <meta> refresh tag (alternative format)',
  },
];

/**
 * Look for a client-side redirect (JavaScript location assignment or meta-refresh tag) in an
 * HTML document. Returns { url, method, details }. `method` is 'javascript', 'meta-refresh',
 * or 'none'. Only http(s) targets are accepted -- javascript:, data:, etc. are rejected.
 */
export function extractRedirect(html, baseUrl) {
  for (const pattern of PATTERNS) {
    const match = html.match(pattern.regex);
    if (match && match[1]) {
      try {
        const resolved = new URL(match[1], baseUrl).href;
        const parsed = new URL(resolved);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          return { url: resolved, method: pattern.method, details: pattern.details };
        }
      } catch {
        // Unparsable/invalid target -- try the next pattern.
      }
    }
  }

  return { url: null, method: 'none', details: 'No redirect pattern detected in response' };
}

/** Read a response body via its stream, stopping once maxBodyBytes have been read. */
async function readBodyCapped(response, maxBodyBytes) {
  const body = response.body;

  if (!body || typeof body.getReader !== 'function') {
    // Fallback for fetch-like implementations that don't expose a streamable body.
    const text = await response.text();
    const bytes = new TextEncoder().encode(text);
    if (bytes.length <= maxBodyBytes) return text;
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, maxBodyBytes));
  }

  const reader = body.getReader();
  const chunks = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value && value.length) {
        chunks.push(value);
        total += value.length;
        if (total >= maxBodyBytes) {
          await reader.cancel().catch(() => {});
          break;
        }
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // already released via cancel() -- ignore
    }
  }

  const capped = new Uint8Array(Math.min(total, maxBodyBytes));
  let offset = 0;
  for (const chunk of chunks) {
    const room = capped.length - offset;
    if (room <= 0) break;
    const slice = chunk.length > room ? chunk.subarray(0, room) : chunk;
    capped.set(slice, offset);
    offset += slice.length;
  }

  return new TextDecoder('utf-8', { fatal: false }).decode(capped);
}

/**
 * Follow a chain of redirects (HTTP-header and client-side) starting at `startUrl`.
 *
 * @param {string} startUrl
 * @param {object} [options]
 * @param {number} [options.maxHops=10]
 * @param {number} [options.timeoutMs=8000]
 * @param {number} [options.maxBodyBytes=524288]
 * @param {typeof fetch} [options.fetchImpl=globalThis.fetch]
 * @param {(hostname: string) => Promise<boolean>} [options.isBlockedHost]
 * @param {string} [options.userAgent]
 * @returns {Promise<{chain: object[], finalUrl: string, redirectCount: number, jsRedirectCount: number, truncated: boolean, totalTime: number}>}
 */
export async function followRedirects(startUrl, options = {}) {
  const {
    maxHops = 10,
    timeoutMs = 8000,
    maxBodyBytes = 512 * 1024,
    fetchImpl = globalThis.fetch,
    isBlockedHost = async () => false,
    userAgent = 'where-qr/redirect-tracker',
  } = options;

  const chain = [];
  const overallStart = Date.now();
  let currentUrl = startUrl;
  // Tracks the URL the most-recently-processed hop wants to move to next. Left null by every
  // terminal outcome (final destination, error, blocked, loop). If it's still set once the
  // maxHops loop bound is hit, the chain was cut off mid-redirect -- i.e. truncated.
  let nextUrl = null;

  for (let hop = 0; hop < maxHops; hop++) {
    let hostname;
    try {
      hostname = new URL(currentUrl).hostname;
    } catch {
      chain.push({
        url: currentUrl,
        status: 0,
        responseTime: 0,
        redirectMethod: 'error',
        redirectDetails: 'Invalid URL',
      });
      nextUrl = null;
      break;
    }

    let blocked;
    try {
      blocked = await isBlockedHost(hostname);
    } catch {
      blocked = true; // fail closed
    }
    if (blocked) {
      chain.push({
        url: currentUrl,
        status: 0,
        responseTime: 0,
        redirectMethod: 'blocked',
        redirectDetails: 'Blocked: address resolves to a private or internal network',
      });
      nextUrl = null;
      break;
    }

    const hopStart = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetchImpl(currentUrl, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': userAgent,
          Accept: 'text/html,*/*;q=0.8',
          'Accept-Language': 'en',
        },
      });
    } catch (err) {
      clearTimeout(timeoutId);
      const responseTime = Date.now() - hopStart;
      if (err && err.name === 'AbortError') {
        chain.push({
          url: currentUrl,
          status: 0,
          error: 'Request timeout',
          responseTime,
          redirectMethod: 'error',
          redirectDetails: `Request timed out after ${timeoutMs}ms`,
        });
      } else {
        chain.push({
          url: currentUrl,
          status: 0,
          error: err?.message || 'Unknown error',
          responseTime,
          redirectMethod: 'error',
          redirectDetails: `Network error: ${err?.message || 'unknown error'}`,
        });
      }
      nextUrl = null;
      break;
    }
    clearTimeout(timeoutId);
    const responseTime = Date.now() - hopStart;

    const entry = {
      url: currentUrl,
      status: response.status,
      responseTime,
      redirectMethod: 'http-header',
      redirectDetails: `${response.status} redirect with Location header`,
    };
    chain.push(entry);

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');

      if (!location) {
        entry.redirectMethod = 'none';
        entry.redirectDetails = `${response.status} redirect with no Location header (final)`;
        nextUrl = null;
        break;
      }

      let candidate;
      try {
        candidate = new URL(location, currentUrl).href;
      } catch {
        entry.redirectMethod = 'error';
        entry.redirectDetails = 'Invalid Location header';
        nextUrl = null;
        break;
      }

      if (chain.some((c) => c.url === candidate)) {
        entry.redirectDetails = 'Redirect loop detected';
        nextUrl = null;
        break;
      }

      nextUrl = candidate;
      currentUrl = candidate;
      continue;
    }

    if (response.status === 200) {
      const contentType = response.headers.get('content-type');
      const isHtml = !contentType || contentType.toLowerCase().includes('text/html');

      if (!isHtml) {
        entry.redirectMethod = 'none';
        entry.redirectDetails = 'Final destination (non-HTML content)';
        nextUrl = null;
        break;
      }

      let text;
      try {
        text = await readBodyCapped(response, maxBodyBytes);
      } catch {
        entry.redirectMethod = 'error';
        entry.redirectDetails = 'Could not read response body for redirect detection';
        nextUrl = null;
        break;
      }

      const jsResult = extractRedirect(text, currentUrl);
      if (jsResult.url) {
        entry.redirectMethod = jsResult.method;
        entry.redirectDetails = jsResult.details;

        if (chain.some((c) => c.url === jsResult.url)) {
          entry.redirectDetails = 'Redirect loop detected';
          nextUrl = null;
          break;
        }

        nextUrl = jsResult.url;
        currentUrl = jsResult.url;
        continue;
      }

      entry.redirectMethod = 'none';
      entry.redirectDetails = 'Final destination (no redirect detected)';
      nextUrl = null;
      break;
    }

    // Any other status (4xx, 5xx, 1xx, etc.) is treated as the final destination.
    entry.redirectMethod = 'none';
    entry.redirectDetails = `Final destination (HTTP ${response.status})`;
    nextUrl = null;
    break;
  }

  const truncated = Boolean(nextUrl);
  const finalUrl = chain.length > 0 ? chain[chain.length - 1].url : startUrl;
  const redirectCount = chain.filter((c) => c.status >= 300 && c.status < 400).length;
  const jsRedirectCount = chain.filter(
    (c) => c.redirectMethod === 'javascript' || c.redirectMethod === 'meta-refresh',
  ).length;
  const totalTime = Date.now() - overallStart;

  return { chain, finalUrl, redirectCount, jsRedirectCount, truncated, totalTime };
}
