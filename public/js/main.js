/**
 * main.js — application entry point.
 * Wires together all modules: binds events, orchestrates run + help flows.
 */
import { HELP_SOURCES }  from './config.js';
import { DOM }           from './dom.js';
import { History }       from './history.js';
import { API }           from './api.js';
import { UI, getCurrentTool } from './ui.js';
import { initInputSource, getSourceMode, getHttpRequest } from './input-source.js';

/* ── RUN ──────────────────────────────────────────── */

async function run() {
  const tool   = getCurrentTool();
  const params = DOM.params.value.trim();

  if (!params) { DOM.params.focus(); return; }

  UI.setLoading(true);
  UI.fireArrow();

  // Auto-fetch HTTP input when source mode is 'http' and a URL is set.
  // Silently skips if fetch fails — the existing textarea content is used.
  if (getSourceMode() === 'http') {
    const req = getHttpRequest();
    if (req?.url) {
      try {
        const { text } = await API.fetchInput(req.method, req.url, req.headers, req.body);
        DOM.input.value = text;
        UI.updateLineCount();
      } catch {
        // fetch failed — continue with whatever is already in the textarea
      }
    }
  }

  const input = DOM.input.value;

  const t0 = performance.now();

  try {
    const { stdout, stderr, exitCode } = await API.run(tool, params, input);
    const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

    UI.setOutput(stdout);
    UI.setExitBadge(exitCode ?? 0, elapsed);
    if (stderr) UI.setStderr(stderr);

    History.push(tool, params);
    UI.renderHistory();

  } catch (err) {
    const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
    UI.setOutput('');
    UI.setStderr(err.message);
    UI.setExitBadge(1, elapsed);
  } finally {
    UI.setLoading(false);
  }
}

/* ── HELP ─────────────────────────────────────────── */

/**
 * Load help for the current tool from HELP_SOURCES, trying each
 * source in order until one succeeds.
 *
 * Source types:
 *   binary     → GET /api/help/:tool  (real --help from container binary)
 *   http       → POST /api/fetch-text { url }  (plain-text docs page)
 *   structured → local JSON config rendered by UI
 */
async function loadHelp() {
  const tool    = getCurrentTool();
  const sources = HELP_SOURCES[tool] ?? [];

  UI.openHelp();
  UI.setHelpLoading(true);

  for (const source of sources) {
    try {
      if (source.type === 'binary') {
        const text = await API.help(tool);
        UI.setHelpLoading(false);
        UI.renderHelpText(tool, text);
        return;
      }

      if (source.type === 'http') {
        const text = await API.fetchText(source.url);
        UI.setHelpLoading(false);
        UI.renderHelpText(tool, text);
        return;
      }

      if (source.type === 'structured') {
        UI.setHelpLoading(false);
        UI.renderHelpStructured(tool, source.data);
        return;
      }
    } catch {
      // Source failed — try the next one
      continue;
    }
  }

  // All sources exhausted
  UI.setHelpLoading(false);
  UI.renderHelpError(tool, 'No help available for this tool.');
}

/* ── EVENTS ───────────────────────────────────────── */

// Tool tabs
DOM.tabs.forEach(tab => {
  tab.addEventListener('click', () => UI.setTool(tab.dataset.tool));
});

// Params live preview
DOM.params.addEventListener('input', () => UI.updatePreview());

// Input line counter + JSON lint
DOM.input.addEventListener('input', () => { UI.updateLineCount(); UI.lintJson(); });

// Run button + Ctrl/Cmd+Enter
DOM.runBtn.addEventListener('click', run);
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    run();
  }
});

// Format JSON
DOM.jsonFmtBtn.addEventListener('click', () => UI.formatJson());

// Copy output
DOM.copyBtn.addEventListener('click', () => {
  const text = DOM.output.textContent;
  if (!text || DOM.output.classList.contains('empty')) return;
  navigator.clipboard.writeText(text).then(() => UI.flashCopy());
});

// Help open/close
DOM.helpBtn.addEventListener('click', loadHelp);
DOM.helpClose.addEventListener('click', () => UI.closeHelp());
DOM.helpBackdrop.addEventListener('click', () => UI.closeHelp());
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') UI.closeHelp();
});

/* ── INIT ─────────────────────────────────────────── */

UI.setTool('jq');
UI.renderHistory();
initInputSource();
