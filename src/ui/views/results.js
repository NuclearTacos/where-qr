import { html } from '../html.js';
import { icons } from '../icons.js';
import { classifyDomain } from '../../analysis/domains.js';
import { analyzeParameters, generateParameterInsight } from '../../analysis/parameters.js';
import { buildVerdict } from '../../analysis/verdict.js';
import { displayHost, displayPath, formatMs } from '../../url.js';

const STATUS_TEXT = {
  0: 'No response', 200: 'OK', 201: 'Created', 204: 'No Content',
  301: 'Moved Permanently', 302: 'Found', 303: 'See Other', 307: 'Temporary Redirect', 308: 'Permanent Redirect',
  400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 410: 'Gone', 429: 'Too Many Requests',
  500: 'Server Error', 502: 'Bad Gateway', 503: 'Unavailable', 504: 'Gateway Timeout',
};

const METHOD_LABEL = {
  'http-header': { icon: icons.globe, text: (h) => `HTTP ${h.status} redirect via Location header` },
  javascript: { icon: icons.code, text: (h) => h.redirectDetails || 'JavaScript redirect' },
  'meta-refresh': { icon: icons.refresh, text: () => 'HTML meta refresh redirect' },
  blocked: { icon: icons.shieldAlert, text: (h) => h.redirectDetails || 'Blocked' },
  error: { icon: icons.alert, text: (h) => h.redirectDetails || h.error || 'Request failed' },
};

const TYPE_GLYPH = { personal: 'ID', tracking: 'TR', attribution: 'UTM', session: 'KEY', functional: 'FN', unknown: '?' };
const FLAG_ICON = { warning: icons.alert, caution: icons.info, info: icons.info, ok: icons.check };
const LEVEL_ICON = { ok: icons.shieldCheck, caution: icons.shield, warning: icons.shieldAlert };

function statusClass(status) {
  if (!status) return '0';
  return String(Math.floor(status / 100));
}

function renderParam(p) {
  return html`
    <li class="param" data-type="${p.type}" data-privacy="${p.privacy}">
      <span class="glyph" aria-hidden="true">${TYPE_GLYPH[p.type] ?? '?'}</span>
      <div>
        <div class="param-kv">
          <span class="k">${p.key}</span>=<span class="v">${p.value}</span>${p.truncated ? html`<button type="button" class="param-more" data-action="expand-param" data-full="${p.fullValue}">show all</button>` : null}
        </div>
        <div class="param-desc">${p.description}</div>
      </div>
    </li>`;
}

function renderHop(hop, index, total) {
  const isFinal = index === total - 1;
  const failed = hop.status === 0;
  const classification = (() => { try { return classifyDomain(new URL(hop.url).hostname); } catch { return null; } })();
  const params = analyzeParameters(hop.url);
  const insight = generateParameterInsight(params);
  const method = METHOD_LABEL[hop.redirectMethod];
  const showMethod = method && (hop.redirectMethod !== 'http-header' || !isFinal);

  return html`
    <li class="hop">
      <div class="hop-dot" data-kind="${failed ? 'error' : isFinal ? 'final' : 'hop'}">
        ${isFinal && !failed ? icons.flag : failed ? icons.x : index + 1}
      </div>
      <div class="hop-card">
        <div class="hop-head">
          <span class="status" data-class="${statusClass(hop.status)}">${hop.status || '—'} ${STATUS_TEXT[hop.status] ?? ''}</span>
          <span class="hop-host">${displayHost(hop.url)}</span>
          <button class="icon-btn" data-action="copy" data-text="${hop.url}" title="Copy this URL" aria-label="Copy this URL">${icons.copy}</button>
        </div>
        ${displayPath(hop.url) ? html`<div class="hop-url">${displayPath(hop.url)}</div>` : null}

        <div class="hop-tags">
          ${classification ? html`<span class="tag" data-tone="${classification.categoryKey === 'shortener' || classification.categoryKey === 'qrservice' ? 'accent' : ''}">${classification.category.name}<span class="k">· ${classification.name}</span></span>` : null}
          ${params.hasPersonalData ? html`<span class="tag" data-tone="warn">${icons.eye} Personal data</span>` : null}
          ${params.byType?.session ? html`<span class="tag" data-tone="caution">${icons.lock} Token</span>` : null}
          ${hop.responseTime ? html`<span class="ms">${formatMs(hop.responseTime)}</span>` : null}
        </div>

        ${showMethod ? html`<div class="hop-method">${method.icon}<span>${method.text(hop)}</span></div>` : null}

        ${params.totalCount > 0 ? html`
          <details class="params">
            <summary>${icons.chevron}<span>${params.totalCount} parameter${params.totalCount === 1 ? '' : 's'}${insight ? ` · ${insight}` : ''}</span></summary>
            <ul class="param-list">${params.params.map(renderParam)}</ul>
          </details>` : null}
      </div>
    </li>`;
}

function renderVerdict(v, scannedUrl) {
  return html`
    <section class="verdict" data-level="${v.level}" aria-label="Verdict">
      <div class="verdict-kicker">${LEVEL_ICON[v.level]} ${v.headline}</div>
      <h2 class="verdict-host">${v.finalHost}</h2>
      ${displayPath(v.finalUrl) ? html`<div class="verdict-path">${displayPath(v.finalUrl)}</div>` : null}
      <p class="verdict-meta">
        ${v.hops === 0 ? 'Direct link, no redirects' : `${v.hops} redirect${v.hops === 1 ? '' : 's'}`}
        ${v.totalTime ? ` · ${formatMs(v.totalTime)}` : ''}
        ${v.finalClassification ? ` · ${v.finalClassification.name}` : ''}
      </p>
      <ul class="flags">
        ${v.flags.map((f) => html`
          <li class="flag" data-level="${f.level}">
            ${FLAG_ICON[f.level]}
            <div><div>${f.text}</div>${f.detail ? html`<div class="flag-detail">${f.detail}</div>` : null}</div>
          </li>`)}
      </ul>
      <div class="verdict-actions">
        ${v.openable ? html`<a class="btn ${v.reachable ? 'btn-primary' : 'btn-secondary'}" href="${v.finalUrl}" target="_blank" rel="noopener noreferrer nofollow">${icons.external} Open destination</a>` : null}
        ${v.cleanUrl ? html`<button class="btn btn-secondary" type="button" data-action="copy" data-text="${v.cleanUrl}" data-toast="Clean link copied (tracking removed)" title="${v.cleanUrl}">${icons.broom} Copy clean link</button>` : null}
        <button class="btn btn-secondary" type="button" data-action="copy" data-text="${v.finalUrl}">${icons.copy} Copy destination</button>
        <button class="btn btn-secondary" type="button" data-action="share" data-url="${scannedUrl}">${icons.share} Share this report</button>
      </div>
    </section>`;
}

export function renderResults(state) {
  const { scannedUrl, loading, error, result } = state;
  const verdict = result ? buildVerdict(result) : null;
  const chain = result?.chain ?? [];

  return html`
    <div class="card">
      <a class="back" href="/" data-action="back">${icons.back} Check another code</a>

      ${loading ? html`
        <div class="loading" aria-busy="true">
          <div class="loading-text"><span class="spinner"></span>Following the trail from <strong>${displayHost(scannedUrl)}</strong>…</div>
          <div class="skeleton"></div><div class="skeleton skeleton-sm"></div><div class="skeleton skeleton-sm"></div>
        </div>` : null}

      ${error ? html`
        <div class="notice notice-warn" role="alert">${icons.alert}<div><strong>Couldn't analyse that link.</strong><div>${error}</div></div></div>` : null}

      ${verdict ? renderVerdict(verdict, scannedUrl) : null}

      ${!loading ? html`
        <div class="source">
          <span class="label">Scanned</span>
          <span class="url" title="${scannedUrl}">${scannedUrl}</span>
          <button class="icon-btn" data-action="copy" data-text="${scannedUrl}" title="Copy scanned URL" aria-label="Copy scanned URL">${icons.copy}</button>
        </div>` : null}

      ${chain.length ? html`
        <h3 class="section-title">The route <small>${chain.length} hop${chain.length === 1 ? '' : 's'}</small></h3>
        <ol class="chain">${chain.map((hop, i) => renderHop(hop, i, chain.length))}</ol>
        ${result.truncated ? html`
          <div class="notice notice-caution truncated">${icons.info}<div>Stopped here after ${chain.length} hops. The chain kept redirecting, so the true destination may be further along.</div></div>` : null}
      ` : null}
    </div>
  `;
}
