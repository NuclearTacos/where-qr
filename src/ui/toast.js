// Non-blocking notifications. Replaces every alert() the app used to have.
import { html } from './html.js';
import { icons } from './icons.js';

let container;

function mount() {
  if (container) return container;
  container = document.createElement('div');
  container.className = 'toasts';
  container.setAttribute('role', 'status');
  container.setAttribute('aria-live', 'polite');
  document.body.appendChild(container);
  return container;
}

export function toast(message, { tone = 'default', duration = 2600 } = {}) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.dataset.tone = tone;
  el.innerHTML = String(html`${tone === 'error' ? icons.alert : icons.check}<span>${message}</span>`);
  mount().appendChild(el);
  setTimeout(() => {
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 200);
  }, duration);
}
