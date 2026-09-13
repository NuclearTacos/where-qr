import { html } from '../html.js';
import { icons } from '../icons.js';

export function renderInput(state) {
  return html`
    <div class="card dropzone" data-dropzone>
      <button class="btn btn-primary btn-lg btn-block" data-action="start-camera" type="button">
        ${icons.camera} Scan with camera
      </button>

      <div class="divider">or check a link</div>

      <form data-action="track-manual" novalidate>
        <label class="visually-hidden" for="manual-url">Link to check</label>
        <div class="field">
          <input id="manual-url" name="url" class="input" type="url" inputmode="url"
                 autocomplete="off" autocapitalize="off" spellcheck="false"
                 placeholder="https://qrco.de/…" aria-invalid="${state.inputError ? 'true' : 'false'}"
                 aria-describedby="manual-url-error">
          <button class="btn btn-secondary" type="submit">${icons.search} Check</button>
        </div>
        <div id="manual-url-error" class="field-error" role="alert" ${state.inputError ? '' : 'hidden'}>
          ${icons.alert} <span>${state.inputError}</span>
        </div>
      </form>

      <div class="divider">or</div>

      <button class="btn btn-secondary btn-block" data-action="pick-file" type="button">
        ${icons.upload} Upload a photo of a QR code
      </button>
      <input type="file" accept="image/*" data-file-input class="visually-hidden" tabindex="-1" aria-hidden="true">
      <p class="hint">You can also drop or paste an image anywhere on this page.</p>
    </div>
  `;
}
