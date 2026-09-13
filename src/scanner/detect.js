// QR detection from a live <video>. Uses the native BarcodeDetector where the
// browser has one and falls back to jsQR (loaded globally from index.html).

const MAX_DECODE_WIDTH = 640; // jsQR is CPU-bound; downscale frames first
const INTERVAL_MS = 120;      // ~8 decode attempts per second is plenty

async function nativeDetector() {
  if (!('BarcodeDetector' in window)) return null;
  try {
    const formats = await window.BarcodeDetector.getSupportedFormats?.();
    if (formats && !formats.includes('qr_code')) return null;
    return new window.BarcodeDetector({ formats: ['qr_code'] });
  } catch {
    return null;
  }
}

function decodeWithJsQR(video, canvas) {
  if (typeof jsQR !== 'function' || !video.videoWidth) return null;
  const scale = Math.min(1, MAX_DECODE_WIDTH / video.videoWidth);
  const w = Math.round(video.videoWidth * scale);
  const h = Math.round(video.videoHeight * scale);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const code = jsQR(data, w, h, { inversionAttempts: 'dontInvert' });
  return code?.data || null;
}

/**
 * Starts a detection loop against `video`. Calls `onResult(text)` once with the
 * first decoded value. Returns a stop() function.
 */
export function startDetection(video, canvas, onResult) {
  let stopped = false;
  let detector;

  const tick = async () => {
    if (stopped) return;
    try {
      if (video.readyState >= 2) {
        let text = null;
        if (detector === undefined) detector = await nativeDetector();
        if (detector) {
          const codes = await detector.detect(video);
          text = codes[0]?.rawValue ?? null;
        } else {
          text = decodeWithJsQR(video, canvas);
        }
        if (text && !stopped) { stopped = true; onResult(text); return; }
      }
    } catch (err) {
      // A failing native detector should not kill scanning; drop to jsQR.
      if (detector) { console.warn('BarcodeDetector failed, using jsQR', err); detector = null; }
    }
    if (!stopped) setTimeout(tick, INTERVAL_MS);
  };

  tick();
  return () => { stopped = true; };
}
