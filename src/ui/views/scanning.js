import { html } from '../html.js';
import { icons } from '../icons.js';

export function renderScanning(state) {
  const notice = state.scanNotice;
  return html`
    <div class="card">
      <div class="viewfinder">
        <video data-video playsinline muted autoplay></video>
        <canvas data-canvas hidden></canvas>
        <div class="reticle"><span></span></div>
        <div class="scanline"></div>
      </div>

      <div class="scan-status">
        <span><span class="pulse"></span>Point at a QR code</span>
        ${state.torchAvailable ? html`
          <button class="icon-btn" data-action="toggle-torch" type="button"
                  aria-pressed="${state.torchOn ? 'true' : 'false'}" title="Toggle flashlight">
            ${state.torchOn ? icons.flashOff : icons.flash}
          </button>` : null}
      </div>

      ${notice ? html`
        <div class="notice notice-caution notice-gap" role="alert">
          ${icons.info}
          <div>
            <div>${notice.text}</div>
            ${notice.value ? html`<div class="mono notice-value">${notice.value}</div>` : null}
          </div>
          ${notice.value ? html`
            <button class="icon-btn" data-action="copy" data-text="${notice.value}" title="Copy">${icons.copy}</button>` : null}
        </div>` : null}

      <div class="scan-actions">
        <button class="btn btn-secondary" data-action="pick-file" type="button">${icons.upload} Use a photo</button>
        <button class="btn btn-secondary" data-action="stop-camera" type="button">${icons.x} Cancel</button>
      </div>
      <input type="file" accept="image/*" data-file-input class="visually-hidden" tabindex="-1" aria-hidden="true">
    </div>
  `;
}
