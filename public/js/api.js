/**
 * api.js — all communication with the backend.
 *
 * Supported sources for help content:
 *   /api/run        POST { tool, params, input }  → { stdout, stderr, exitCode }
 *   /api/help/:tool GET                           → { text } (tool --help output)
 */

export const API = {
  /**
   * Execute a CLI tool with the given params and stdin input.
   * @throws {Error} on non-2xx HTTP or network failure
   */
  async run(tool, params, input) {
    const res = await fetch('/api/run', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ tool, params, input }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    return data; // { stdout, stderr, exitCode }
  },

  /**
   * Fetch the --help output for a tool from the container binary.
   * Returns the raw text string.
   * @throws {Error} on failure
   */
  async help(tool) {
    const res = await fetch(`/api/help/${encodeURIComponent(tool)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    return data.text; // plain text string
  },

  /**
   * Fetch a URL as plain text (used for HTTP help sources).
   * Proxied through the backend to avoid CORS issues.
   * @throws {Error} on failure
   */
  async fetchText(url) {
    const res = await fetch('/api/fetch-text', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    return data.text;
  },

  /**
   * Execute an HTTP request via the backend proxy and return the
   * response body as text along with status metadata.
   *
   * @param {string}   method   HTTP verb
   * @param {string}   url      Target URL
   * @param {Array}    headers  [{key, value}]
   * @param {string}   body     Request body (for POST/PUT/PATCH/DELETE)
   * @returns {{ text, status, statusText, contentType }}
   * @throws {Error} on non-2xx proxy response or network failure
   */
  async fetchInput(method, url, headers = [], body = '') {
    const res = await fetch('/api/fetch-input', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ method, url, headers, body }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    return data; // { text, status, statusText, contentType }
  },
};
