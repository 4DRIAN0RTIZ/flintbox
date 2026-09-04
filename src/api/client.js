/**
 * client.js — the single module that talks to the backend.
 *
 * Endpoints and payloads are identical to the vanilla `public/js/api.js`:
 *   /api/run        POST { tool, params, input }         -> { stdout, stderr, exitCode }
 *   /api/help/:tool GET                                   -> { text }
 *   /api/fetch-text POST { url }                          -> { text }
 *   /api/fetch-input POST { method, url, headers, body }  -> { text, status, statusText, contentType }
 *
 * No React component imports `fetch` directly — everything routes through here.
 */

async function postJson(path, payload) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export const api = {
  /**
   * Execute a CLI tool with the given params and stdin input.
   * @returns {Promise<{ stdout: string, stderr: string, exitCode: number }>}
   * @throws {Error} on non-2xx HTTP or network failure
   */
  run(tool, params, input) {
    return postJson('/api/run', { tool, params, input });
  },

  /**
   * Fetch the --help output for a tool from the container binary.
   * @returns {Promise<string>} raw text
   * @throws {Error} on failure
   */
  async help(tool) {
    const res = await fetch(`/api/help/${encodeURIComponent(tool)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    return data.text;
  },

  /**
   * Fetch a URL as plain text (used for HTTP help sources), proxied
   * through the backend to avoid CORS.
   * @returns {Promise<string>}
   * @throws {Error} on failure
   */
  async fetchText(url) {
    const data = await postJson('/api/fetch-text', { url });
    return data.text;
  },

  /**
   * Execute an HTTP request via the backend proxy.
   * @param {string} method   HTTP verb
   * @param {string} url       Target URL
   * @param {Array<{key: string, value: string}>} headers
   * @param {string} body      Request body (for POST/PUT/PATCH/DELETE)
   * @returns {Promise<{ text: string, status: number, statusText: string, contentType: string }>}
   * @throws {Error} on non-2xx proxy response or network failure
   */
  fetchInput(method, url, headers = [], body = '') {
    return postJson('/api/fetch-input', { method, url, headers, body });
  },
};
