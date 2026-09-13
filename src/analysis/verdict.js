// Turns a redirect chain into a one-glance verdict: where you end up, how you
// got there, and anything worth pausing on. Pure function, unit-testable.

import { classifyDomain, isKnownIntermediary } from './domains.js';
import { analyzeParameters } from './parameters.js';

const LEVEL_RANK = { ok: 0, info: 0, caution: 1, warning: 2 };
const STRIP_TYPES = new Set(['tracking', 'attribution', 'personal', 'session']);

function safeUrl(u) { try { return new URL(u); } catch { return null; } }

/** Final URL with tracking, attribution, personal and session params removed. */
export function cleanUrl(url) {
  const parsed = safeUrl(url);
  if (!parsed) return url;
  const { params } = analyzeParameters(url);
  const drop = new Set(params.filter((p) => STRIP_TYPES.has(p.type)).map((p) => p.key));
  if (drop.size === 0) return url;
  for (const key of drop) parsed.searchParams.delete(key);
  return parsed.href;
}

export function buildVerdict(result) {
  const chain = result?.chain ?? [];
  if (chain.length === 0) return null;

  const last = chain[chain.length - 1];
  const finalUrl = last.url;
  const finalParsed = safeUrl(finalUrl);
  const flags = [];
  const add = (level, text, detail) => flags.push({ level, text, detail });

  // Reachability of the destination
  if (last.redirectMethod === 'blocked') {
    add('warning', 'Destination is on a private or internal network', 'Public scanners cannot follow it, which is unusual for a printed code.');
  } else if (last.status === 0) {
    add('warning', 'Destination could not be reached', last.redirectDetails || last.error || 'The final server did not respond.');
  } else if (last.status >= 500) {
    add('warning', `Destination returned a server error (HTTP ${last.status})`);
  } else if (last.status >= 400) {
    add('caution', `Destination returned HTTP ${last.status}`, 'The page may have been removed, or it may block automated visitors.');
  }

  if (result.truncated) {
    add('caution', `Stopped after ${chain.length} hops`, 'The chain kept going. The real destination may be further along.');
  }

  // Personal data and tracking across every hop
  // Count distinct key=value pairs so a param carried across hops counts once.
  const seen = { personal: new Set(), tracking: new Set(), session: new Set() };
  const personalKeys = new Set();
  for (const hop of chain) {
    const a = analyzeParameters(hop.url);
    for (const p of a.params) {
      if (!seen[p.type]) continue;
      seen[p.type].add(`${p.key}=${p.fullValue ?? p.value}`);
      if (p.type === 'personal') personalKeys.add(p.key);
    }
  }
  const personal = seen.personal.size, tracking = seen.tracking.size, session = seen.session.size;
  if (personal > 0) {
    add('warning', `Carries personal data in the link (${[...personalKeys].slice(0, 3).join(', ')})`,
      'Whoever printed this code may be able to tie your visit to you.');
  }
  if (session > 0) {
    add('caution', 'Contains a session or access token', 'Sharing this link may share access with it.');
  }

  // Transport downgrade
  const protocols = chain.map((h) => safeUrl(h.url)?.protocol);
  const downgrade = protocols.some((p, i) => i > 0 && p === 'http:' && protocols[i - 1] === 'https:');
  if (downgrade || (finalParsed?.protocol === 'http:' && chain.length === 1)) {
    add('caution', 'Uses unencrypted HTTP', 'Anyone on the network can see or alter the page.');
  }

  // Lookalike / odd hosts
  if (finalParsed) {
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(finalParsed.hostname) || finalParsed.hostname.startsWith('[')) {
      add('caution', 'Destination is a raw IP address, not a domain name');
    } else if (finalParsed.hostname.split('.').some((l) => l.startsWith('xn--'))) {
      add('caution', 'Internationalised domain name', 'Check the spelling carefully; these are sometimes used for lookalike domains.');
    }
    if (finalParsed.username || finalParsed.password) {
      add('warning', 'Link embeds credentials in the URL');
    }
  }

  // How it got there
  const intermediaries = chain.slice(0, -1)
    .map((h) => classifyDomain(safeUrl(h.url)?.hostname ?? ''))
    .filter((c) => c && isKnownIntermediary(c));
  const jsHops = chain.filter((h) => h.redirectMethod === 'javascript' || h.redirectMethod === 'meta-refresh').length;
  if (jsHops > 0) {
    add('caution', `${jsHops === 1 ? 'One hop uses' : `${jsHops} hops use`} a JavaScript or meta-refresh redirect`,
      'These hide the destination from ordinary link previews.');
  }
  if (intermediaries.length > 0) {
    const names = [...new Set(intermediaries.map((c) => c.name))];
    add('info', `Passes through ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` and ${names.length - 3} more` : ''}`);
  }
  if (tracking > 0) {
    add('info', `${tracking} tracking identifier${tracking === 1 ? '' : 's'} attached along the way`);
  }

  // Most severe first, stable within a level.
  flags.sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level]);
  const level = flags.reduce((worst, f) => (LEVEL_RANK[f.level] > LEVEL_RANK[worst] ? f.level : worst), 'ok');
  if (flags.length === 0) add('ok', 'No red flags', 'Direct link, reachable, nothing personal in the URL.');

  const hops = Math.max(0, chain.length - 1);
  const totalTime = result.totalTime ?? chain.reduce((s, h) => s + (h.responseTime || 0), 0);
  const cleaned = cleanUrl(finalUrl);

  return {
    level,
    headline: level === 'ok' ? 'Looks clean' : level === 'caution' ? 'Worth a look' : 'Be careful',
    finalUrl,
    finalHost: finalParsed ? finalParsed.hostname.replace(/^www\./, '') : finalUrl,
    finalClassification: finalParsed ? classifyDomain(finalParsed.hostname) : null,
    hops,
    totalTime,
    flags,
    cleanUrl: cleaned !== finalUrl ? cleaned : null,
    reachable: last.status > 0 && last.status < 400,
    openable: last.status > 0 && last.redirectMethod !== 'blocked',
  };
}
