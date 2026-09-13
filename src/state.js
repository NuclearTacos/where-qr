// Single app state object with a subscribe/notify loop. Deliberately minimal:
// the whole UI re-renders from state on every change (a few hundred nodes at
// most), which keeps every view a pure function of state.

const listeners = new Set();

export const state = {
  view: 'input',          // 'input' | 'scanning' | 'results'
  inputError: '',         // inline error under the manual URL field
  scanNotice: null,       // { kind: 'not-a-url', text } shown on the scanner
  torchAvailable: false,
  torchOn: false,
  scannedUrl: '',
  loading: false,
  error: '',              // error from the tracking API
  result: null,           // full API response
};

export function setState(patch) {
  Object.assign(state, patch);
  for (const fn of listeners) fn(state);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
