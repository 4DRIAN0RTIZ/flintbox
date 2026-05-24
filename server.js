'use strict';

const express = require('express');
const { execFile } = require('child_process');
const { parse: shellParse } = require('shell-quote');
const path = require('path');

const app = express();
const PORT = 3000;

// Hardcoded binary paths — never rely on PATH
const TOOL_PATHS = {
  grep: '/bin/grep',
  sed:  '/bin/sed',
  awk:  '/usr/bin/awk',
  cut:  '/usr/bin/cut',
  jq:   '/usr/bin/jq',
};

const MAX_INPUT_BYTES = 100 * 1024;       // 100 KB
const MAX_PARAMS_LEN  = 500;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024; // 2 MB
const TIMEOUT_MS = 5000;

// Shell operator tokens that shell-quote returns as objects
const FORBIDDEN_OPS = new Set(['|', '>', '>>', '<', '&', ';', '`', '(', ')']);

app.use(express.json({ limit: '110kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/run', (req, res) => {
  const { tool, params, input } = req.body ?? {};

  // --- Validate tool ---
  if (!tool || !TOOL_PATHS[tool]) {
    return res.status(400).json({ error: `Unknown tool. Allowed: ${Object.keys(TOOL_PATHS).join(', ')}` });
  }

  // --- Validate params ---
  if (typeof params !== 'string' || params.length > MAX_PARAMS_LEN) {
    return res.status(400).json({ error: `params must be a string ≤ ${MAX_PARAMS_LEN} chars` });
  }

  // --- Validate input ---
  if (typeof input !== 'string') {
    return res.status(400).json({ error: 'input must be a string' });
  }
  if (Buffer.byteLength(input, 'utf8') > MAX_INPUT_BYTES) {
    return res.status(400).json({ error: `input exceeds ${MAX_INPUT_BYTES / 1024} KB limit` });
  }

  // --- Parse params into args array ---
  // Security note: execFile with shell:false is the primary protection — the OS
  // receives individual argv entries; no shell ever interpolates them.
  // shell-quote is used only to split the params string respecting quotes.
  // For jq the filter is always a single argument (it contains | as language syntax).
  let args;
  try {
    if (tool === 'jq') {
      // Entire params string is the jq filter — single argument
      args = [params];
    } else {
      // Pass identity env fn so $1, $3 etc. are preserved as literal strings
      // instead of being substituted with empty values by shell-quote.
      const tokens = shellParse(params, (k) => `$${k}`);
      // Keep only plain string tokens; silently drop operator objects.
      // Because there is no shell, operator tokens cannot cause command chaining.
      args = tokens.filter(t => typeof t === 'string');
    }
  } catch (err) {
    return res.status(400).json({ error: 'Failed to parse params' });
  }

  if (args.length === 0) {
    return res.status(400).json({ error: 'No arguments provided' });
  }

  // --- Execute binary safely ---
  const child = execFile(
    TOOL_PATHS[tool],
    args,
    {
      timeout: TIMEOUT_MS,
      maxBuffer: MAX_OUTPUT_BYTES,
      env: {},        // minimal environment
      shell: false,   // NEVER use shell
    },
    (err, stdout, stderr) => {
      // execFile returns err for non-zero exit codes too
      const exitCode = err?.code ?? 0;

      // Distinguish timeout / kill from normal non-zero exit
      if (err && err.killed) {
        return res.status(200).json({ stdout: '', stderr: 'Process timed out', exitCode: 124 });
      }

      // If err.code is a string (e.g. 'ENOENT'), it's a spawn error
      if (err && typeof exitCode === 'string') {
        return res.status(500).json({ error: `Spawn error: ${err.message}` });
      }

      res.json({
        stdout: stdout ?? '',
        stderr: stderr ?? '',
        exitCode: typeof exitCode === 'number' ? exitCode : (err ? 1 : 0),
      });
    }
  );

  // Ignore EPIPE — the child may exit before we finish writing (e.g. bad args)
  child.stdin.on('error', () => {});

  // Write input to stdin then close it
  child.stdin.write(input, 'utf8');
  child.stdin.end();
});

// ── GET /api/help/:tool ──────────────────────────────────
// Runs `tool --help` in the container and returns its output as plain text.
// Uses the same hardcoded binary paths and execFile (no shell).
app.get('/api/help/:tool', (req, res) => {
  const tool = req.params.tool;
  if (!TOOL_PATHS[tool]) {
    return res.status(400).json({ error: `Unknown tool: ${tool}` });
  }

  execFile(
    TOOL_PATHS[tool],
    ['--help'],
    { timeout: 5000, maxBuffer: 512 * 1024, env: {}, shell: false },
    (err, stdout, stderr) => {
      // Many tools (grep, sed, awk) write --help to stderr and exit 1 — that's fine
      const text = (stdout || '') + (stderr || '');
      if (!text && err && typeof err.code === 'string') {
        return res.status(500).json({ error: `Spawn error: ${err.message}` });
      }
      res.json({ text: text.trim() });
    }
  );
});

// ── POST /api/fetch-text ─────────────────────────────────
// Proxies a plain-text HTTP GET to avoid browser CORS restrictions.
// Only allows https:// URLs pointing to well-known doc domains.
const ALLOWED_DOC_HOSTS = new Set([
  'jqlang.org', 'www.jqlang.org',
  'man7.org',
  'www.gnu.org',
  'pubs.opengroup.org',
]);

app.post('/api/fetch-text', async (req, res) => {
  const { url } = req.body ?? {};
  if (typeof url !== 'string') {
    return res.status(400).json({ error: 'url must be a string' });
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  if (parsed.protocol !== 'https:') {
    return res.status(400).json({ error: 'Only https:// URLs allowed' });
  }
  if (!ALLOWED_DOC_HOSTS.has(parsed.hostname)) {
    return res.status(400).json({ error: `Host not in allowlist: ${parsed.hostname}` });
  }

  try {
    // Node 18+ has native fetch
    const r = await fetch(url, {
      headers: { 'User-Agent': 'flintbox/1.0', 'Accept': 'text/plain,text/html' },
      signal: AbortSignal.timeout(8000),
    });
    const text = await r.text();
    // Strip HTML tags for readability
    const plain = text.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    res.json({ text: plain.trim() });
  } catch (err) {
    res.status(502).json({ error: `Fetch failed: ${err.message}` });
  }
});

// ── POST /api/fetch-input ─────────────────────────────────
// Proxies an arbitrary HTTP request on behalf of the frontend.
// Used by the "http" input source mode (fields + curl modes).
// SSRF protection: blocks private / loopback address ranges.

const ALLOWED_METHODS = new Set(['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS']);
const MAX_RESPONSE_BYTES = 1024 * 1024; // 1 MB

/** Return true if hostname resolves to a private/loopback address. */
function isPrivateHost(hostname) {
  if (/^localhost$/i.test(hostname) || hostname === '::1') return true;
  const parts = hostname.split('.').map(Number);
  if (parts.length === 4 && parts.every(n => !Number.isNaN(n) && n >= 0 && n <= 255)) {
    const [a, b] = parts;
    if (a === 0)                           return true; // 0.x.x.x
    if (a === 10)                          return true; // 10.0.0.0/8
    if (a === 127)                         return true; // loopback
    if (a === 169 && b === 254)            return true; // link-local / AWS metadata
    if (a === 172 && b >= 16 && b <= 31)   return true; // 172.16-31.x.x
    if (a === 192 && b === 168)            return true; // 192.168.x.x
  }
  return false;
}

app.post('/api/fetch-input', async (req, res) => {
  const { method = 'GET', url, headers = [], body = '' } = req.body ?? {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }

  let parsed;
  try { parsed = new URL(url); }
  catch { return res.status(400).json({ error: 'Invalid URL' }); }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return res.status(400).json({ error: 'Only http:// and https:// URLs are allowed' });
  }

  if (isPrivateHost(parsed.hostname)) {
    return res.status(400).json({ error: 'Private and internal addresses are not allowed' });
  }

  const normalizedMethod = method.toUpperCase();
  if (!ALLOWED_METHODS.has(normalizedMethod)) {
    return res.status(400).json({ error: `Method not allowed: ${method}` });
  }

  if (!Array.isArray(headers)) {
    return res.status(400).json({ error: 'headers must be an array' });
  }

  // Build fetch options
  const fetchHeaders = {};
  for (const h of headers) {
    if (h && typeof h.key === 'string' && typeof h.value === 'string' && h.key.trim()) {
      fetchHeaders[h.key.trim()] = h.value.trim();
    }
  }

  const fetchOpts = {
    method: normalizedMethod,
    headers: fetchHeaders,
    signal: AbortSignal.timeout(10_000),
  };

  const HAS_BODY = new Set(['POST','PUT','PATCH','DELETE']);
  if (HAS_BODY.has(normalizedMethod) && body) {
    fetchOpts.body = body;
  }

  try {
    const r = await fetch(url, fetchOpts);

    // Read response as text, enforce size limit
    const buf = await r.arrayBuffer();
    if (buf.byteLength > MAX_RESPONSE_BYTES) {
      return res.status(413).json({ error: `Response too large (max ${MAX_RESPONSE_BYTES / 1024}KB)` });
    }

    const text = new TextDecoder().decode(buf);

    res.json({
      text,
      status:      r.status,
      statusText:  r.statusText,
      contentType: r.headers.get('content-type') || '',
    });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`FlintBox running on http://localhost:${PORT}`);
});
