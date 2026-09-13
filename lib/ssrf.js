// SSRF (Server-Side Request Forgery) protection helpers.
//
// The redirect tracker follows arbitrary user-supplied URLs server-side, which means a
// malicious `url` param could point at loopback / link-local / private network addresses
// to probe internal infrastructure. These helpers decide whether a hostname or resolved
// IP address should be treated as "internal" and refused.

import net from 'node:net';
import dns from 'node:dns';

/**
 * Expand a valid IPv6 string (as returned by node:net normalization assumptions) into an
 * array of 8 16-bit hextets (numbers). Returns null if parsing fails.
 */
function expandIPv6(address) {
  if (net.isIP(address) !== 6) return null;

  let addr = address;
  // Handle IPv4-mapped/compatible tail (e.g. ::ffff:1.2.3.4) by converting the trailing
  // dotted-quad into two hextets before expanding.
  const v4TailMatch = addr.match(/(^|:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  let v4Tail = null;
  if (v4TailMatch) {
    v4Tail = v4TailMatch[2];
    addr = addr.slice(0, addr.length - v4Tail.length).replace(/:$/, '');
    const parts = v4Tail.split('.').map(Number);
    if (parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return null;
    const hex1 = ((parts[0] << 8) | parts[1]).toString(16);
    const hex2 = ((parts[2] << 8) | parts[3]).toString(16);
    addr = addr === '' ? `${hex1}:${hex2}` : `${addr}:${hex1}:${hex2}`;
  }

  let head = [];
  let tail = [];
  if (addr.includes('::')) {
    const [left, right] = addr.split('::');
    head = left ? left.split(':') : [];
    tail = right ? right.split(':') : [];
  } else {
    head = addr.split(':');
  }

  const missing = 8 - (head.length + tail.length);
  if (missing < 0) return null;
  const hextets = [...head, ...Array(missing).fill('0'), ...tail].map((h) => parseInt(h || '0', 16));
  if (hextets.length !== 8 || hextets.some((h) => Number.isNaN(h))) return null;
  return hextets;
}

/**
 * Is this IP address (v4 or v6, as a plain string) within a private / loopback / link-local /
 * reserved range? Fails closed: unparsable input is treated as private.
 */
export function isPrivateAddress(ip) {
  if (typeof ip !== 'string' || ip.length === 0) return true;

  const family = net.isIP(ip);
  if (family === 4) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return true;
    const [a, b] = parts;

    if (a === 127) return true; // loopback 127/8
    if (a === 0) return true; // "this network" 0/8
    if (a === 10) return true; // 10/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
    if (a === 192 && b === 168) return true; // 192.168/16
    if (a === 169 && b === 254) return true; // link-local 169.254/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64/10
    if (a >= 224 && a <= 239) return true; // multicast 224/4
    if (a >= 240) return true; // reserved 240/4 (includes 255.255.255.255)
    return false;
  }

  if (family === 6) {
    const normalized = ip.toLowerCase();
    if (normalized === '::' || normalized === '::1') return true;

    const hextets = expandIPv6(normalized);
    if (!hextets) return true; // fail closed on anything we can't parse

    // IPv4-mapped ::ffff:a.b.c.d -> hextets[0..4] === 0, hextets[5] === 0xffff
    if (hextets[0] === 0 && hextets[1] === 0 && hextets[2] === 0 && hextets[3] === 0 && hextets[4] === 0 && hextets[5] === 0xffff) {
      const v4 = [
        (hextets[6] >> 8) & 0xff,
        hextets[6] & 0xff,
        (hextets[7] >> 8) & 0xff,
        hextets[7] & 0xff,
      ].join('.');
      return isPrivateAddress(v4);
    }

    // fc00::/7 (unique local)
    if ((hextets[0] & 0xfe00) === 0xfc00) return true;
    // fe80::/10 (link-local)
    if ((hextets[0] & 0xffc0) === 0xfe80) return true;
    // ff00::/8 (multicast)
    if ((hextets[0] & 0xff00) === 0xff00) return true;

    return false;
  }

  // Not a recognizable IP literal at all -- caller should not have reached here with a
  // hostname, but fail closed just in case.
  return true;
}

/** Strip brackets, zone id, and a trailing dot from a hostname/IP-literal string. */
function normalizeHost(hostname) {
  let h = String(hostname || '').trim().toLowerCase();
  if (h.startsWith('[') && h.endsWith(']')) h = h.slice(1, -1);
  const percentIdx = h.indexOf('%');
  if (percentIdx !== -1) h = h.slice(0, percentIdx);
  if (h.endsWith('.')) h = h.slice(0, -1);
  return h;
}

/**
 * Synchronous hostname-based checks: known-internal suffixes and bare IP literals.
 * Does NOT perform DNS resolution -- see isBlockedHost for that.
 */
export function isBlockedHostname(hostname) {
  const h = normalizeHost(hostname);
  if (!h) return true;

  if (h === 'localhost') return true;
  if (h.endsWith('.localhost')) return true;
  if (h.endsWith('.local')) return true;
  if (h.endsWith('.internal')) return true;
  if (h.endsWith('.home.arpa')) return true;

  if (net.isIP(h)) return isPrivateAddress(h);

  return false;
}

/**
 * Full async check: hostname rules, then DNS resolution of every A/AAAA record. If ANY
 * resolved address is private, or resolution fails, the host is blocked (fail closed).
 *
 * `lookup` is injectable for tests; defaults to dns.promises.lookup.
 */
export async function isBlockedHost(hostname, { lookup = dns.promises.lookup } = {}) {
  if (isBlockedHostname(hostname)) return true;

  try {
    const results = await lookup(normalizeHost(hostname), { all: true });
    const list = Array.isArray(results) ? results : [results];
    if (list.length === 0) return true; // no addresses resolved -- fail closed
    return list.some((entry) => isPrivateAddress(entry.address));
  } catch {
    return true; // DNS failure -- fail closed
  }
}
