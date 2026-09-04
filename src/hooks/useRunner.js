import { useCallback, useState } from 'react';
import { api } from '../api/client.js';

/**
 * Owns the execution flow for /api/run: loading state, the assembled
 * output (stdout + exit code + elapsed) and the stderr strip.
 */
export function useRunner() {
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState(null); // { text, exitCode, elapsed }
  const [stderr, setStderr] = useState('');

  /**
   * @param {object}   opts
   * @param {string}   opts.tool
   * @param {string}   opts.params
   * @param {string}   opts.input           current textarea content
   * @param {object?}  opts.httpRequest     { method, url, headers, body } or null
   * @param {Function} opts.fetchSilent     (request) => Promise<string>
   * @param {Function} opts.onInputText     (text) => void, called when HTTP fetch replaces input
   * @param {Function} opts.remember        (tool, params) => void
   */
  const execute = useCallback(async (opts) => {
    const { tool, params, input, httpRequest, fetchSilent, onInputText, remember } = opts;

    setRunning(true);
    setStderr('');

    let effectiveInput = input;
    if (httpRequest?.url) {
      try {
        effectiveInput = await fetchSilent(httpRequest);
        onInputText(effectiveInput);
      } catch {
        // fetch failed — run with whatever is already in the textarea
      }
    }

    const t0 = performance.now();
    try {
      const { stdout, stderr: err, exitCode } = await api.run(tool, params, effectiveInput);
      const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
      setOutput({ text: stdout, exitCode: exitCode ?? 0, elapsed });
      setStderr(err || '');
      remember(tool, params);
    } catch (e) {
      const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
      setOutput({ text: '', exitCode: 1, elapsed });
      setStderr(e.message);
    } finally {
      setRunning(false);
    }
  }, []);

  return { running, output, stderr, execute };
}
