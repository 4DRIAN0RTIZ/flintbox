import '../styles/panes.css';
import HttpPanel from './HttpPanel.jsx';

/**
 * Presentational: the Input pane — source toggle (text / http), optional
 * HTTP fetch panel, JSON lint + format affordances, and the stdin textarea.
 *
 * @param {object} props
 * @param {'text'|'http'} props.sourceMode
 * @param {(mode: string) => void} props.onSourceMode
 * @param {number} props.lineCount
 * @param {{ ok: boolean, msg: string }|null} props.lint
 * @param {boolean} props.showFormat
 * @param {() => void} props.onFormat
 * @param {string} props.input
 * @param {(value: string) => void} props.onInput
 * @param {object} props.http                value from useHttpSource()
 * @param {() => void} props.onFetch
 * @param {(e: KeyboardEvent) => void} props.onPanelKeyDown
 */
export default function InputPane({
  sourceMode,
  onSourceMode,
  lineCount,
  lint,
  showFormat,
  onFormat,
  input,
  onInput,
  http,
  onFetch,
  onPanelKeyDown,
}) {
  const isHttp = sourceMode === 'http';

  return (
    <div className={`pane pane-in${isHttp ? ' pane-in--http' : ''}`}>
      <div className="pane-head">
        <span className="pane-title">Input</span>
        <div className="src-tabs" role="tablist" aria-label="Input source">
          {['text', 'http'].map((s) => (
            <button
              key={s}
              type="button"
              className={`src-tab${sourceMode === s ? ' active' : ''}`}
              data-src={s}
              role="tab"
              onClick={() => onSourceMode(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="pane-meta">{`${lineCount} line${lineCount !== 1 ? 's' : ''}`}</span>
        {lint && (
          <span className={`json-lint ${lint.ok ? 'ok' : 'err'}`}>{lint.msg}</span>
        )}
        {showFormat && (
          <button type="button" className="json-fmt-btn" onClick={onFormat}>
            Format
          </button>
        )}
      </div>

      {isHttp && (
        <div onKeyDown={onPanelKeyDown}>
          <HttpPanel http={http} onFetch={onFetch} />
        </div>
      )}

      <textarea
        className="code-area"
        spellCheck="false"
        placeholder="Paste your data here…"
        aria-label="Input data"
        value={input}
        onChange={(e) => onInput(e.target.value)}
      />
    </div>
  );
}
