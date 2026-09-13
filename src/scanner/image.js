// Decode a QR code from an image file (upload, drop, or paste).

const MAX_SIDE = 1600;

async function loadBitmap(file) {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file); } catch { /* fall through */ }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image.')); };
    img.src = url;
  });
}

function draw(bitmap) {
  const w = bitmap.width, h = bitmap.height;
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
}

export async function decodeImageFile(file) {
  if (!file || !file.type.startsWith('image/')) throw new Error('That file is not an image.');
  const bitmap = await loadBitmap(file);
  const { canvas, ctx } = draw(bitmap);

  if ('BarcodeDetector' in window) {
    try {
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const codes = await detector.detect(canvas);
      if (codes[0]?.rawValue) return codes[0].rawValue;
    } catch { /* fall back to jsQR */ }
  }
  if (typeof jsQR !== 'function') return null;
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' });
  return code?.data || null;
}
