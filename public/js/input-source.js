/**
 * input-source.js — manages the Input pane's source modes.
 *
 * Modes:
 *   text  — plain textarea (default)
 *   http  — HTTP fetch panel with two sub-modes:
 *     fields — method select + URL + headers + body form
 *     curl   — paste a curl command, auto-parsed then executed
 *
 * On successful fetch, the response body is written to the
 * main input textarea so it flows into the CLI tool as stdin.
 */
import { API } from './api.js';
import { DOM } from './dom.js';
import { UI }  from './ui.js';

/* ── Internal DOM refs (created in index.html) ── */
const D = {
  srcTabs:      () => document.querySelectorAll('.src-tab'),
  httpPanel:    () => document.getElementById('http-panel'),
  httpTabs:     () => document.querySelectorAll('.http-tab'),
  fieldsPanel:  () => document.getElementById('http-fields-panel'),
  curlPanel:    () => document.getElementById('http-curl-panel'),
  method:       () => document.getElementById('http-method'),
  url:          () => document.getElementById('http-url'),
  headersList:  () => document.getElementById('http-headers-list'),
  addHeaderBtn: () => document.getElementById('http-add-header'),
  bodySection:  () => document.getElementById('http-body-section'),
  bodyTextarea: () => document.getElementById('http-body'),
  curlTextarea: () => document.getElementById('http-curl-input'),
  fetchBtn:     () => document.getElementById('http-fetch-btn'),
  fetchSpinner: () => document.getElementById('http-fetch-spinner'),
  fetchStatus:  () => document.getElementById('http-fetch-status'),
};

/* ── State ── */
let sourceMode = 'text';  // 'text' | 'http'
let httpMode   = 'fields'; // 'fields' | 'curl'

/** Return current source mode ('text' | 'http'). */
export const getSourceMode = () => sourceMode;

/**
 * Return the current HTTP request config, or null if URL is empty.
 * Used by main.js to auto-fetch before running the CLI tool.
 */
export function getHttpRequest() {
  const url = D.url()?.value?.trim();
  if (!url) return null;

  if (httpMode === 'curl') {
    const raw = D.curlTextarea()?.value?.trim();
    if (!raw) return null;
    try {
      return parseCurl(raw);
    } catch {
      return null;
    }
  }

  const method = D.method()?.value || 'GET';
  const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  const body = BODY_METHODS.has(method) ? (D.bodyTextarea()?.value || '') : '';
  return { method, url, headers: getHeaders(), body };
}

/* ═══════════════════════════════════════════════
   CURL PARSER
═══════════════════════════════════════════════ */

/** Tokenize a shell-like string, respecting single and double quotes. */
function tokenize(str) {
  const tokens = [];
  let cur = '';
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if      (c === "'" && !inDouble) { inSingle = !inSingle; }
    else if (c === '"' && !inSingle) { inDouble = !inDouble; }
    else if (c === ' ' && !inSingle && !inDouble) {
      if (cur) { tokens.push(cur); cur = ''; }
    } else {
      cur += c;
    }
  }
  if (cur) tokens.push(cur);
  return tokens;
}

/**
 * Parse a curl command string into { method, url, headers[], body }.
 * Handles: -X, -H, -d / --data / --data-raw / --json, --url,
 *          --compressed, -s, -L, -v (ignored flags).
 * @throws {Error} if not a curl command or no URL found
 */
export function parseCurl(curlStr) {
  // Normalize line continuations and collapse whitespace
  const normalized = curlStr
    .replace(/\\\r?\n/g, ' ')
    .replace(/\r?\n/g, ' ')
    .trim();

  const tokens = tokenize(normalized);

  if (!tokens.length || tokens[0].toLowerCase() !== 'curl') {
    throw new Error('Command must start with "curl"');
  }

  let method  = null;
  let url     = null;
  const headers = [];
  let body    = null;

  // Flags to skip their value (consume next token without using it)
  const SKIP_VALUE = new Set([
    '--max-time', '--connect-timeout', '--retry', '--output', '-o',
    '--user', '-u', '--cert', '--key', '--cacert', '--proxy', '-x',
    '--user-agent', '-A', '--referer', '-e', '--interface', '--limit-rate',
    '--max-redirs',
  ]);

  const IGNORED = new Set([
    '-s', '--silent', '-v', '--verbose', '-L', '--location',
    '-i', '--include', '-I', '--head', '--compressed', '-k',
    '--insecure', '-f', '--fail', '-S', '--show-error', '-g',
    '--globoff', '--http1.1', '--http2', '--no-keepalive',
  ]);

  let i = 1;
  while (i < tokens.length) {
    const t = tokens[i];

    if (IGNORED.has(t)) { i++; continue; }

    if (SKIP_VALUE.has(t)) { i += 2; continue; }

    if (t === '-X' || t === '--request') {
      method = tokens[++i]?.toUpperCase();

    } else if (t === '-H' || t === '--header') {
      const raw = tokens[++i] ?? '';
      const colon = raw.indexOf(':');
      if (colon > 0) {
        headers.push({ key: raw.slice(0, colon).trim(), value: raw.slice(colon + 1).trim() });
      }

    } else if (
      t === '-d' || t === '--data' ||
      t === '--data-raw' || t === '--data-binary' ||
      t === '--data-ascii' || t === '--data-urlencode'
    ) {
      body = tokens[++i] ?? '';
      if (!method) method = 'POST';

    } else if (t === '--json') {
      body = tokens[++i] ?? '';
      method = method || 'POST';
      // Add Content-Type if not already set
      if (!headers.find(h => h.key.toLowerCase() === 'content-type')) {
        headers.push({ key: 'Content-Type', value: 'application/json' });
      }
      if (!headers.find(h => h.key.toLowerCase() === 'accept')) {
        headers.push({ key: 'Accept', value: 'application/json' });
      }

    } else if (t === '--url') {
      url = tokens[++i];

    } else if (t === '--get' || t === '-G') {
      method = 'GET';

    } else if (!t.startsWith('-')) {
      // Positional argument = URL
      url = t;
    }
    i++;
  }

  if (!url) throw new Error('No URL found in curl command');

  return {
    method:  method || 'GET',
    url,
    headers,
    body:    body || '',
  };
}

/* ═══════════════════════════════════════════════
   HEADERS FORM
═══════════════════════════════════════════════ */

function addHeaderRow(key = '', value = '') {
  const list = D.headersList();
  const row = document.createElement('div');
  row.className = 'http-header-row';
  row.innerHTML = `
    <input class="http-header-key" type="text" placeholder="Header-Name" value="${escAttr(key)}">
    <input class="http-header-val" type="text" placeholder="value" value="${escAttr(value)}">
    <button class="http-header-remove" title="Remove" aria-label="Remove header">×</button>
  `;
  row.querySelector('.http-header-remove').addEventListener('click', () => row.remove());
  list.appendChild(row);
}

function getHeaders() {
  return [...D.headersList().querySelectorAll('.http-header-row')].map(row => ({
    key:   row.querySelector('.http-header-key').value.trim(),
    value: row.querySelector('.http-header-val').value.trim(),
  })).filter(h => h.key && h.value);
}

function setHeaders(headers) {
  D.headersList().innerHTML = '';
  headers.forEach(({ key, value }) => addHeaderRow(key, value));
}

/* ═══════════════════════════════════════════════
   BODY VISIBILITY
═══════════════════════════════════════════════ */

const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function updateBodyVisibility() {
  const method = D.method()?.value || 'GET';
  const section = D.bodySection();
  if (section) section.hidden = !BODY_METHODS.has(method);
}

/* ═══════════════════════════════════════════════
   FETCH EXECUTION
═══════════════════════════════════════════════ */

function setFetchLoading(on) {
  const btn     = D.fetchBtn();
  const spinner = D.fetchSpinner();
  if (btn)     btn.disabled = on;
  if (spinner) spinner.classList.toggle('on', on);
}

function setFetchStatus(msg, type = '') {
  const el = D.fetchStatus();
  if (!el) return;
  el.textContent = msg;
  el.className   = `http-fetch-status${type ? ' ' + type : ''}`;
}

async function doFetch(request) {
  setFetchLoading(true);
  setFetchStatus('');

  const t0 = performance.now();

  try {
    const { text, status, statusText, contentType } =
      await API.fetchInput(request.method, request.url, request.headers, request.body);

    const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
    const statusClass = status < 300 ? 'ok' : status < 400 ? 'warn' : 'err';

    setFetchStatus(`${status} ${statusText}  ·  ${elapsed}s  ·  ${contentType || 'unknown type'}`, statusClass);

    // Write response body into the main input textarea
    DOM.input.value = text;
    UI.updateLineCount();

  } catch (err) {
    setFetchStatus(err.message, 'err');
  } finally {
    setFetchLoading(false);
  }
}

async function handleFetch() {
  if (httpMode === 'curl') {
    const raw = D.curlTextarea()?.value?.trim();
    if (!raw) { setFetchStatus('Paste a curl command first', 'err'); return; }

    let parsed;
    try {
      parsed = parseCurl(raw);
    } catch (e) {
      setFetchStatus(`Parse error: ${e.message}`, 'err');
      return;
    }

    // Populate fields from parsed curl (nice UX feedback)
    populateFieldsFromParsed(parsed);
    await doFetch(parsed);

  } else {
    const url    = D.url()?.value?.trim();
    const method = D.method()?.value || 'GET';
    const body   = BODY_METHODS.has(method) ? (D.bodyTextarea()?.value || '') : '';

    if (!url) { setFetchStatus('URL is required', 'err'); return; }

    await doFetch({ method, url, headers: getHeaders(), body });
  }
}

/** Populate the fields form from a parsed curl result (used after curl parse). */
function populateFieldsFromParsed({ method, url, headers, body }) {
  const mSel = D.method();
  const uInp = D.url();
  const bTxt = D.bodyTextarea();

  if (mSel) mSel.value = method;
  if (uInp) uInp.value = url;
  setHeaders(headers);
  if (bTxt) bTxt.value = body || '';
  updateBodyVisibility();
}

/* ═══════════════════════════════════════════════
   MODE SWITCHING
═══════════════════════════════════════════════ */

function setSourceMode(mode) {
  sourceMode = mode;
  const panel = D.httpPanel();

  D.srcTabs().forEach(t => t.classList.toggle('active', t.dataset.src === mode));

  if (mode === 'http') {
    if (panel) panel.hidden = false;
    DOM.input.style.flex = '0 0 120px'; // shrink textarea, panel takes more space
  } else {
    if (panel) panel.hidden = true;
    DOM.input.style.flex = '';
  }
}

function setHttpMode(mode) {
  httpMode = mode;
  D.httpTabs().forEach(t => t.classList.toggle('active', t.dataset.mode === mode));

  const fields = D.fieldsPanel();
  const curl   = D.curlPanel();

  if (mode === 'fields') {
    if (fields) fields.hidden = false;
    if (curl)   curl.hidden   = true;
  } else {
    if (fields) fields.hidden = true;
    if (curl)   curl.hidden   = false;
  }
}

/* ═══════════════════════════════════════════════
   PUBLIC INIT
═══════════════════════════════════════════════ */

export function initInputSource() {
  // Source mode tabs
  D.srcTabs().forEach(tab => {
    tab.addEventListener('click', () => setSourceMode(tab.dataset.src));
  });

  // HTTP sub-mode tabs
  D.httpTabs().forEach(tab => {
    tab.addEventListener('click', () => setHttpMode(tab.dataset.mode));
  });

  // Method select → show/hide body
  D.method()?.addEventListener('change', updateBodyVisibility);

  // Add header button
  D.addHeaderBtn()?.addEventListener('click', () => addHeaderRow());

  // Fetch button
  D.fetchBtn()?.addEventListener('click', handleFetch);

  // Ctrl+Enter inside the HTTP panel also triggers fetch
  document.getElementById('http-panel')
    ?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.stopPropagation();
        handleFetch();
      }
    });

  // Init state
  updateBodyVisibility();
}

/* ── helpers ── */
function escAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
