import { describe, expect, it, vi } from 'vitest';
import { api } from '../src/api/client.js';

/** Install a fetch mock and return the vi.fn so calls can be asserted. */
function stubFetch(handler) {
  const fn = vi.fn(handler);
  global.fetch = fn;
  return fn;
}

const okJson = (body) => ({ ok: true, status: 200, json: async () => body });
const errJson = (status, body) => ({ ok: false, status, json: async () => body });

describe('api.run', () => {
  it('POSTs { tool, params, input } to /api/run and returns the parsed body', async () => {
    const fetchMock = stubFetch(async () => okJson({ stdout: 'out', stderr: '', exitCode: 0 }));

    const result = await api.run('jq', '.name', '{"name":"x"}');

    expect(result).toEqual({ stdout: 'out', stderr: '', exitCode: 0 });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/run');
    expect(opts.method).toBe('POST');
    expect(opts.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(opts.body)).toEqual({ tool: 'jq', params: '.name', input: '{"name":"x"}' });
  });

  it('throws with the server error message on a non-2xx response', async () => {
    stubFetch(async () => errJson(400, { error: 'params must be a string' }));
    await expect(api.run('jq', '.', '')).rejects.toThrow('params must be a string');
  });

  it('falls back to "HTTP <status>" when the error body has no message', async () => {
    stubFetch(async () => errJson(500, {}));
    await expect(api.run('jq', '.', '')).rejects.toThrow('HTTP 500');
  });
});

describe('api.help', () => {
  it('GETs /api/help/:tool (encoded) and returns the text field', async () => {
    const fetchMock = stubFetch(async () => okJson({ text: 'jq - commandline JSON processor' }));

    const text = await api.help('jq');

    expect(text).toBe('jq - commandline JSON processor');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/help/jq');
  });

  it('propagates a non-2xx error', async () => {
    stubFetch(async () => errJson(404, { error: 'unknown tool' }));
    await expect(api.help('nope')).rejects.toThrow('unknown tool');
  });
});

describe('api.fetchText', () => {
  it('POSTs { url } to /api/fetch-text and returns text', async () => {
    const fetchMock = stubFetch(async () => okJson({ text: 'DOC BODY' }));

    const text = await api.fetchText('https://example.com/doc');

    expect(text).toBe('DOC BODY');
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/fetch-text');
    expect(JSON.parse(opts.body)).toEqual({ url: 'https://example.com/doc' });
  });

  it('throws on a blocked host', async () => {
    stubFetch(async () => errJson(400, { error: 'host not allowed' }));
    await expect(api.fetchText('https://evil.test')).rejects.toThrow('host not allowed');
  });
});

describe('api.fetchInput', () => {
  it('POSTs { method, url, headers, body } to /api/fetch-input and returns metadata', async () => {
    const fetchMock = stubFetch(async () => okJson({
      text: '{"ok":true}',
      status: 200,
      statusText: 'OK',
      contentType: 'application/json',
    }));

    const result = await api.fetchInput(
      'POST',
      'https://api.example.com/x',
      [{ key: 'Accept', value: 'application/json' }],
      '{"q":1}',
    );

    expect(result).toEqual({
      text: '{"ok":true}',
      status: 200,
      statusText: 'OK',
      contentType: 'application/json',
    });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/fetch-input');
    expect(JSON.parse(opts.body)).toEqual({
      method: 'POST',
      url: 'https://api.example.com/x',
      headers: [{ key: 'Accept', value: 'application/json' }],
      body: '{"q":1}',
    });
  });

  it('defaults headers/body and propagates a proxy error', async () => {
    const fetchMock = stubFetch(async () => errJson(502, { error: 'upstream failed' }));

    await expect(api.fetchInput('GET', 'https://api.example.com/x')).rejects.toThrow('upstream failed');

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      method: 'GET',
      url: 'https://api.example.com/x',
      headers: [],
      body: '',
    });
  });
});
