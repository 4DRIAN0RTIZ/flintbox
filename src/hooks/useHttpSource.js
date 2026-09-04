import { useCallback, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { BODY_METHODS, parseCurl } from '../lib/curl.js';

const INITIAL = {
  mode: 'fields', // 'fields' | 'curl'
  method: 'GET',
  url: '',
  headers: [], // [{ key, value }]
  body: '',
  curl: '',
};

/**
 * Owns the Input pane's HTTP source: the fields/curl form state and the
 * proxied fetch. Response bodies are returned to the caller (App), which
 * writes them into the main input textarea.
 */
export function useHttpSource() {
  const [form, setForm] = useState(INITIAL);
  const [fetching, setFetching] = useState(false);
  const [status, setStatus] = useState({ msg: '', type: '' });

  const patch = useCallback((partial) => setForm((f) => ({ ...f, ...partial })), []);

  const setMode = useCallback((mode) => patch({ mode }), [patch]);
  const setMethod = useCallback((method) => patch({ method }), [patch]);
  const setUrl = useCallback((url) => patch({ url }), [patch]);
  const setBody = useCallback((body) => patch({ body }), [patch]);
  const setCurl = useCallback((curl) => patch({ curl }), [patch]);

  const addHeader = useCallback(() => {
    setForm((f) => ({ ...f, headers: [...f.headers, { key: '', value: '' }] }));
  }, []);

  const updateHeader = useCallback((index, field, value) => {
    setForm((f) => ({
      ...f,
      headers: f.headers.map((h, i) => (i === index ? { ...h, [field]: value } : h)),
    }));
  }, []);

  const removeHeader = useCallback((index) => {
    setForm((f) => ({ ...f, headers: f.headers.filter((_, i) => i !== index) }));
  }, []);

  const bodyVisible = BODY_METHODS.has(form.method);

  /**
   * Resolve the current request config, or null when nothing is runnable.
   * Mirrors the vanilla `getHttpRequest()`.
   */
  const buildRequest = useCallback(() => {
    if (form.mode === 'curl') {
      const raw = form.curl.trim();
      if (!raw) return null;
      try {
        return parseCurl(raw);
      } catch {
        return null;
      }
    }
    const url = form.url.trim();
    if (!url) return null;
    const cleanHeaders = form.headers
      .map((h) => ({ key: h.key.trim(), value: h.value.trim() }))
      .filter((h) => h.key && h.value);
    const body = BODY_METHODS.has(form.method) ? form.body : '';
    return { method: form.method, url, headers: cleanHeaders, body };
  }, [form]);

  /** Fetch without touching the visible status line (used by the Run flow). */
  const fetchSilent = useCallback(async (request) => {
    const { text } = await api.fetchInput(request.method, request.url, request.headers, request.body);
    return text;
  }, []);

  /**
   * Panel "Fetch" button flow: parse curl if needed, reflect it back into
   * the fields form, call the proxy, and publish a status line.
   * @returns {Promise<string|null>} response body, or null on error/empty
   */
  const runFetch = useCallback(async () => {
    let request;

    if (form.mode === 'curl') {
      const raw = form.curl.trim();
      if (!raw) {
        setStatus({ msg: 'Paste a curl command first', type: 'err' });
        return null;
      }
      try {
        request = parseCurl(raw);
      } catch (e) {
        setStatus({ msg: `Parse error: ${e.message}`, type: 'err' });
        return null;
      }
      // Reflect parsed curl into the fields form (UX feedback).
      setForm((f) => ({
        ...f,
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: request.body,
      }));
    } else {
      const url = form.url.trim();
      if (!url) {
        setStatus({ msg: 'URL is required', type: 'err' });
        return null;
      }
      request = buildRequest();
    }

    setFetching(true);
    setStatus({ msg: '', type: '' });
    const t0 = performance.now();

    try {
      const { text, status: code, statusText, contentType } = await api.fetchInput(
        request.method, request.url, request.headers, request.body,
      );
      const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
      const type = code < 300 ? 'ok' : code < 400 ? 'warn' : 'err';
      setStatus({ msg: `${code} ${statusText}  ·  ${elapsed}s  ·  ${contentType || 'unknown type'}`, type });
      return text;
    } catch (e) {
      setStatus({ msg: e.message, type: 'err' });
      return null;
    } finally {
      setFetching(false);
    }
  }, [form, buildRequest]);

  return useMemo(
    () => ({
      form,
      fetching,
      status,
      bodyVisible,
      setMode,
      setMethod,
      setUrl,
      setBody,
      setCurl,
      addHeader,
      updateHeader,
      removeHeader,
      buildRequest,
      fetchSilent,
      runFetch,
    }),
    [
      form, fetching, status, bodyVisible, setMode, setMethod, setUrl, setBody,
      setCurl, addHeader, updateHeader, removeHeader, buildRequest, fetchSilent, runFetch,
    ],
  );
}
