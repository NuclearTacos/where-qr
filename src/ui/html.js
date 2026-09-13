// Tiny safe-templating helper.
// `html` is a tagged template: every interpolated value is HTML-escaped unless
// it is itself the result of `html` (or wrapped in `raw`). Arrays are joined,
// null/undefined/false render as nothing. This is what keeps scanned URLs and
// query-string values from ever being interpreted as markup.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

class Markup {
  constructor(str) { this.str = str; }
  toString() { return this.str; }
}

export const raw = (str) => new Markup(String(str));

function render(value) {
  if (value == null || value === false) return '';
  if (value instanceof Markup) return value.str;
  if (Array.isArray(value)) return value.map(render).join('');
  return escapeHtml(value);
}

export function html(strings, ...values) {
  let out = '';
  for (let i = 0; i < strings.length; i++) {
    out += strings[i];
    if (i < values.length) out += render(values[i]);
  }
  return new Markup(out);
}
