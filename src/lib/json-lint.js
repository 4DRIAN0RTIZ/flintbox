/**
 * json-lint.js — tiny JSON validity check for the jq input hint.
 * @param {string} value
 * @returns {{ ok: boolean, msg: string }|null} null when there is nothing to lint
 */
export function jsonLint(value) {
  const v = value.trim();
  if (!v) return null;
  try {
    JSON.parse(v);
    return { ok: true, msg: '✓ valid JSON' };
  } catch (e) {
    const msg = e.message
      .replace(/^JSON\.parse: /, '')
      .replace(/ at line \d+.*$/, '');
    return { ok: false, msg: `✗ ${msg}` };
  }
}
