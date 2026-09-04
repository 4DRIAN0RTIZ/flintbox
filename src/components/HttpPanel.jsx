import '../styles/input-source.css';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'];

/**
 * Presentational: the HTTP fetch panel (fields / curl sub-modes).
 * All state and the fetch call live in the `http` object supplied by the
 * container; this component only renders and forwards events.
 *
 * @param {object} props
 * @param {object} props.http     value returned by useHttpSource()
 * @param {() => void} props.onFetch
 */
export default function HttpPanel({ http, onFetch }) {
  const { form, fetching, status, bodyVisible } = http;

  return (
    <div className="http-panel">
      <div className="http-mode-bar">
        <span className="http-mode-label">Mode</span>
        <div className="http-mode-tabs" role="tablist">
          {['fields', 'curl'].map((m) => (
            <button
              key={m}
              type="button"
              className={`http-tab${form.mode === m ? ' active' : ''}`}
              data-mode={m}
              role="tab"
              onClick={() => http.setMode(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {form.mode === 'fields' ? (
        <div className="http-fields">
          <div className="http-request-row">
            <select
              className="http-method-select"
              aria-label="HTTP method"
              value={form.method}
              onChange={(e) => http.setMethod(e.target.value)}
            >
              {METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <input
              className="http-url-input"
              type="url"
              placeholder="https://api.example.com/endpoint"
              autoComplete="off"
              spellCheck="false"
              aria-label="Request URL"
              value={form.url}
              onChange={(e) => http.setUrl(e.target.value)}
            />
          </div>

          <div className="http-section">
            <span className="http-section-label">Headers</span>
            <div>
              {form.headers.map((h, i) => (
                <div className="http-header-row" key={i}>
                  <input
                    className="http-header-key"
                    type="text"
                    placeholder="Header-Name"
                    value={h.key}
                    onChange={(e) => http.updateHeader(i, 'key', e.target.value)}
                  />
                  <input
                    className="http-header-val"
                    type="text"
                    placeholder="value"
                    value={h.value}
                    onChange={(e) => http.updateHeader(i, 'value', e.target.value)}
                  />
                  <button
                    type="button"
                    className="http-header-remove"
                    title="Remove"
                    aria-label="Remove header"
                    onClick={() => http.removeHeader(i)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="http-add-header-btn" onClick={http.addHeader}>
              + Add header
            </button>
          </div>

          {bodyVisible && (
            <div className="http-section">
              <span className="http-section-label">Body</span>
              <textarea
                className="http-body-textarea"
                spellCheck="false"
                placeholder='{"key": "value"}'
                aria-label="Request body"
                value={form.body}
                onChange={(e) => http.setBody(e.target.value)}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="http-curl-panel">
          <textarea
            className="http-curl-textarea"
            spellCheck="false"
            placeholder={"curl -X POST https://api.example.com/data \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"name\": \"Alice\"}'"}
            aria-label="curl command"
            value={form.curl}
            onChange={(e) => http.setCurl(e.target.value)}
          />
        </div>
      )}

      <div className="http-action-bar">
        <button type="button" className="http-fetch-btn" disabled={fetching} onClick={onFetch}>
          Fetch
        </button>
        <div className={`http-fetch-spinner${fetching ? ' on' : ''}`} />
        <span className={`http-fetch-status${status.type ? ` ${status.type}` : ''}`}>
          {status.msg}
        </span>
      </div>
    </div>
  );
}
