/**
 * curl.js — pure curl-command parser. Ported from the vanilla
 * `public/js/input-source.js`; no DOM, no network.
 */

/** Tokenize a shell-like string, respecting single and double quotes. */
function tokenize(str) {
  const tokens = [];
  let cur = '';
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (c === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (c === ' ' && !inSingle && !inDouble) {
      if (cur) {
        tokens.push(cur);
        cur = '';
      }
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
  const normalized = curlStr
    .replace(/\\\r?\n/g, ' ')
    .replace(/\r?\n/g, ' ')
    .trim();

  const tokens = tokenize(normalized);

  if (!tokens.length || tokens[0].toLowerCase() !== 'curl') {
    throw new Error('Command must start with "curl"');
  }

  let method = null;
  let url = null;
  const headers = [];
  let body = null;

  // Flags whose value must be consumed but ignored.
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

    if (IGNORED.has(t)) {
      i++;
      continue;
    }

    if (SKIP_VALUE.has(t)) {
      i += 2;
      continue;
    }

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
      if (!headers.find((h) => h.key.toLowerCase() === 'content-type')) {
        headers.push({ key: 'Content-Type', value: 'application/json' });
      }
      if (!headers.find((h) => h.key.toLowerCase() === 'accept')) {
        headers.push({ key: 'Accept', value: 'application/json' });
      }
    } else if (t === '--url') {
      url = tokens[++i];
    } else if (t === '--get' || t === '-G') {
      method = 'GET';
    } else if (!t.startsWith('-')) {
      url = t;
    }
    i++;
  }

  if (!url) throw new Error('No URL found in curl command');

  return {
    method: method || 'GET',
    url,
    headers,
    body: body || '',
  };
}

export const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
