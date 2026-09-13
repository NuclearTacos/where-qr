// App controller: wires state, views, scanner, API and URL routing together.
import { state, setState, subscribe } from './state.js';
import { renderApp } from './ui/render.js';
import { toast } from './ui/toast.js';
import { trackUrl } from './api.js';
import { parseHttpUrl } from './url.js';
import { openCamera, closeCamera, torchTrack, setTorch, CameraError } from './scanner/camera.js';
import { startDetection } from './scanner/detect.js';
import { decodeImageFile } from './scanner/image.js';

const root = document.getElementById('root');

// Runtime handles that do not belong in render state
let stream = null;
let stopDetection = null;
let torch = null;
let requestId = 0;

// ---------- rendering ----------

subscribe(() => renderApp(root, state));

function afterRender() {
  if (state.view === 'scanning' && stream) {
    const video = root.querySelector('[data-video]');
    const canvas = root.querySelector('[data-canvas]');
    if (video && video.srcObject !== stream) {
      video.srcObject = stream;
      video.play?.().catch(() => {});
      stopDetection?.();
      stopDetection = startDetection(video, canvas, onCodeDetected);
    }
  }
  if (state.view === 'input') root.querySelector('#manual-url')?.focus({ preventScroll: true });
}
subscribe(afterRender);

// ---------- analysis flow ----------

async function analyze(url, { pushHistory = true } = {}) {
  const id = ++requestId;
  stopCamera({ rerender: false });
  if (pushHistory) {
    const target = `${location.pathname}?url=${encodeURIComponent(url)}`;
    if (location.search !== `?url=${encodeURIComponent(url)}`) history.pushState({ url }, '', target);
  }
  setState({ view: 'results', scannedUrl: url, loading: true, error: '', result: null, inputError: '' });
  document.title = `where-qr · ${new URL(url).hostname}`;
  try {
    const result = await trackUrl(url);
    if (id !== requestId) return;
    setState({ loading: false, result });
  } catch (err) {
    if (id !== requestId) return;
    setState({ loading: false, error: err.message });
  }
}

function handleDecodedText(text, { fromScanner = false } = {}) {
  const url = parseHttpUrl(text);
  if (url) { analyze(url.href); return true; }
  if (fromScanner) {
    setState({ scanNotice: { text: 'That code contains text, not a link:', value: text } });
  } else {
    toast(`That code contains text, not a link: ${text.slice(0, 80)}`, { tone: 'error', duration: 5000 });
  }
  return false;
}

function onCodeDetected(text) {
  if (navigator.vibrate) navigator.vibrate(40);
  if (!handleDecodedText(text, { fromScanner: true })) {
    // Not a URL: keep the camera running so they can scan a different code.
    const video = root.querySelector('[data-video]');
    const canvas = root.querySelector('[data-canvas]');
    if (video) stopDetection = startDetection(video, canvas, onCodeDetected);
  }
}

// ---------- camera ----------

async function startCamera() {
  try {
    stream = await openCamera();
  } catch (err) {
    toast(err instanceof CameraError ? err.message : 'Could not start the camera.', { tone: 'error', duration: 5000 });
    return;
  }
  torch = torchTrack(stream);
  setState({ view: 'scanning', scanNotice: null, torchAvailable: Boolean(torch), torchOn: false });
}

function stopCamera({ rerender = true } = {}) {
  stopDetection?.(); stopDetection = null;
  closeCamera(stream); stream = null; torch = null;
  if (rerender && state.view === 'scanning') setState({ view: 'input', scanNotice: null, torchOn: false });
}

async function toggleTorch() {
  if (!torch) return;
  try {
    await setTorch(torch, !state.torchOn);
    setState({ torchOn: !state.torchOn });
  } catch {
    toast('Flashlight is not available right now.', { tone: 'error' });
  }
}

// ---------- files ----------

async function handleImageFile(file) {
  if (!file) return;
  try {
    const text = await decodeImageFile(file);
    if (!text) { toast('No QR code found in that image. Try a sharper or closer photo.', { tone: 'error', duration: 4000 }); return; }
    handleDecodedText(text);
  } catch (err) {
    toast(err.message || 'Could not read that image.', { tone: 'error' });
  }
}

// ---------- clipboard ----------

async function copyText(text, message = 'Copied') {
  try {
    await navigator.clipboard.writeText(text);
    toast(message);
  } catch {
    toast('Copy failed. Select the text and copy it manually.', { tone: 'error' });
  }
}

async function share(url) {
  const link = `${location.origin}${location.pathname}?url=${encodeURIComponent(url)}`;
  if (navigator.share) {
    try { await navigator.share({ title: 'where-qr report', url: link }); return; } catch { /* cancelled; fall back */ }
  }
  copyText(link, 'Report link copied');
}

// ---------- routing ----------

function goHome({ pushHistory = true } = {}) {
  requestId++;
  stopCamera({ rerender: false });
  if (pushHistory && location.search) history.pushState({}, '', location.pathname);
  document.title = 'where-qr · See where a QR code goes before you do';
  setState({ view: 'input', scannedUrl: '', result: null, error: '', loading: false, inputError: '', scanNotice: null });
}

function route() {
  const param = new URLSearchParams(location.search).get('url');
  const url = param ? parseHttpUrl(param) : null;
  if (url) {
    if (state.view === 'results' && state.scannedUrl === url.href) return;
    analyze(url.href, { pushHistory: false });
  } else {
    goHome({ pushHistory: false });
  }
}
window.addEventListener('popstate', route);

// ---------- event delegation ----------

root.addEventListener('click', (event) => {
  const el = event.target.closest('[data-action]');
  if (!el || el.tagName === 'FORM') return;
  const action = el.dataset.action;
  switch (action) {
    case 'start-camera': startCamera(); break;
    case 'stop-camera': stopCamera(); break;
    case 'toggle-torch': toggleTorch(); break;
    case 'pick-file': root.querySelector('[data-file-input]')?.click(); break;
    case 'copy': copyText(el.dataset.text, el.dataset.toast); break;
    case 'share': share(el.dataset.url); break;
    case 'back': event.preventDefault(); goHome(); break;
    case 'expand-param': {
      const v = el.previousElementSibling;
      if (v) v.textContent = el.dataset.full;
      el.remove();
      break;
    }
    default: break;
  }
});

root.addEventListener('submit', (event) => {
  const form = event.target.closest('[data-action="track-manual"]');
  if (!form) return;
  event.preventDefault();
  const raw = form.elements.url.value;
  if (!raw.trim()) { setState({ inputError: 'Paste a link to check.' }); return; }
  const url = parseHttpUrl(raw);
  if (!url) { setState({ inputError: 'That does not look like a web link. It needs to start with http:// or https://.' }); return; }
  analyze(url.href);
});

root.addEventListener('change', (event) => {
  if (event.target.matches('[data-file-input]')) {
    handleImageFile(event.target.files?.[0]);
    event.target.value = '';
  }
});

// Drag-and-drop and paste of images, anywhere on the page
['dragenter', 'dragover'].forEach((type) => document.addEventListener(type, (e) => {
  if (!e.dataTransfer?.types?.includes('Files')) return;
  e.preventDefault();
  root.querySelector('[data-dropzone]')?.classList.add('is-dragover');
}));
['dragleave', 'drop'].forEach((type) => document.addEventListener(type, (e) => {
  if (type === 'drop') e.preventDefault();
  root.querySelector('[data-dropzone]')?.classList.remove('is-dragover');
}));
document.addEventListener('drop', (e) => {
  const file = [...(e.dataTransfer?.files ?? [])].find((f) => f.type.startsWith('image/'));
  if (file) handleImageFile(file);
});
document.addEventListener('paste', (e) => {
  if (e.target.matches?.('input, textarea')) return;
  const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'));
  if (item) { e.preventDefault(); handleImageFile(item.getAsFile()); return; }
  const text = e.clipboardData?.getData('text');
  if (text && parseHttpUrl(text)) { e.preventDefault(); analyze(parseHttpUrl(text).href); }
});

// Release the camera if the tab is hidden or closed
document.addEventListener('visibilitychange', () => { if (document.hidden && stream) stopCamera(); });
window.addEventListener('pagehide', () => stopCamera({ rerender: false }));

// ---------- boot ----------
route();
