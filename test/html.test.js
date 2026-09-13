import { test } from 'node:test';
import assert from 'node:assert/strict';
import { html, raw, escapeHtml } from '../src/ui/html.js';

test('escapes interpolated strings', () => {
  const out = String(html`<div>${'<img src=x onerror=alert(1)>'}</div>`);
  assert.equal(out, '<div>&lt;img src=x onerror=alert(1)&gt;</div>');
});

test('escapes quotes so attribute injection fails', () => {
  const out = String(html`<a title="${'" onmouseover="alert(1)'}">x</a>`);
  assert.equal(out, '<a title="&quot; onmouseover=&quot;alert(1)">x</a>');
});

test('nested html results are not double-escaped', () => {
  const inner = html`<b>${'a & b'}</b>`;
  assert.equal(String(html`<p>${inner}</p>`), '<p><b>a &amp; b</b></p>');
});

test('arrays join and nullish/false render empty', () => {
  const out = String(html`<ul>${[1, 2].map((n) => html`<li>${n}</li>`)}${null}${false}${undefined}</ul>`);
  assert.equal(out, '<ul><li>1</li><li>2</li></ul>');
});

test('raw() opts out of escaping', () => {
  assert.equal(String(html`${raw('<i>ok</i>')}`), '<i>ok</i>');
});

test('escapeHtml covers all five characters', () => {
  assert.equal(escapeHtml(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
});
