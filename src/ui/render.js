import { html } from './html.js';
import { icons } from './icons.js';
import { renderInput } from './views/input.js';
import { renderScanning } from './views/scanning.js';
import { renderResults } from './views/results.js';

const REPO = 'https://github.com/NuclearTacos/where-qr';

const VIEWS = { input: renderInput, scanning: renderScanning, results: renderResults };

export function renderApp(root, state) {
  const view = VIEWS[state.view] ?? renderInput;
  const tagline = state.view === 'results' ? 'Where that code actually goes.' : 'See where a QR code goes before you do.';
  root.innerHTML = String(html`
    <div class="app">
      <main class="shell">
        <header class="masthead">
          <a class="wordmark" href="/" data-action="back"><span class="glyph">${icons.qr}</span>where-qr</a>
          <p class="tagline">${tagline}</p>
        </header>
        ${view(state)}
      </main>
      <footer class="footer">
        Scanning happens in your browser. Redirects are followed by a stateless function that keeps no logs.
        · <a href="${REPO}" rel="noopener">Source</a>
      </footer>
    </div>
  `);
}
