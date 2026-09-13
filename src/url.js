// URL helpers shared by scanner, views and verdict.

export function parseHttpUrl(text) {
  let candidate = String(text ?? '').trim();
  if (!candidate) return null;
  // Be forgiving with pasted/scanned input: "example.com/x" → https://example.com/x
  if (!/^[a-z][a-z0-9+.-]*:/i.test(candidate) && /^[\w-]+(\.[\w-]+)+([/?#]|$)/.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url;
  } catch {
    return null;
  }
}

export function isHttpUrl(text) {
  return parseHttpUrl(text) !== null;
}

/** Hostname without a leading "www." for display. */
export function displayHost(url) {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Everything after the host, for display. Returns '' for a bare root. */
export function displayPath(url) {
  try {
    const u = new URL(url);
    const rest = `${u.pathname}${u.search}${u.hash}`;
    return rest === '/' ? '' : rest;
  } catch {
    return '';
  }
}

export function formatMs(ms) {
  if (ms == null) return '';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`;
}
