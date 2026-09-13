// Camera access with a graceful fallback ladder and torch support.

const ATTEMPTS = [
  { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
  { video: { facingMode: 'user' } },
  { video: true },
];

export class CameraError extends Error {
  constructor(message, reason) { super(message); this.reason = reason; }
}

export async function openCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new CameraError('This browser cannot access the camera. Try uploading a photo of the code instead.', 'unsupported');
  }
  if (!window.isSecureContext) {
    throw new CameraError('Camera access needs a secure (https) page.', 'insecure');
  }
  let lastError;
  for (const constraints of ATTEMPTS) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastError = err;
      if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') break;
    }
  }
  const name = lastError?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    throw new CameraError('Camera permission was denied. Allow it in the address bar, or upload a photo instead.', 'denied');
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    throw new CameraError('No camera was found on this device. Upload a photo of the code instead.', 'missing');
  }
  if (name === 'NotReadableError') {
    throw new CameraError('The camera is in use by another app.', 'busy');
  }
  throw new CameraError('Could not start the camera.', 'unknown');
}

export function closeCamera(stream) {
  stream?.getTracks().forEach((t) => t.stop());
}

export function torchTrack(stream) {
  const track = stream?.getVideoTracks()[0];
  if (!track?.getCapabilities) return null;
  try {
    return track.getCapabilities().torch ? track : null;
  } catch {
    return null;
  }
}

export async function setTorch(track, on) {
  await track.applyConstraints({ advanced: [{ torch: on }] });
}
