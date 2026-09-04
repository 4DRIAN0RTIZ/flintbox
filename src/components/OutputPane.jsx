import { useEffect, useState } from 'react';
import '../styles/output.css';

/**
 * Presentational: the Output pane — run spinner, exit badge + timer,
 * stdout body and the stderr strip.
 *
 * @param {object} props
 * @param {{ text: string, exitCode: number, elapsed: string }|null} props.output
 * @param {string} props.stderr
 * @param {boolean} props.running
 * @param {object} [props.panelRef]
 * @param {object} [props.outputRef]
 * @param {boolean} [props.panelFocused]
 * @param {() => void} [props.onActivate]
 */
export default function OutputPane({
  output,
  stderr,
  running,
  panelRef,
  outputRef,
  panelFocused = false,
  onActivate,
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const id = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(id);
  }, [copied]);

  const hasRun = output !== null;
  const hasText = hasRun && output.text !== '';
  const showMeta = hasRun && !running;

  const copy = () => {
    if (!hasText) return;
    navigator.clipboard?.writeText(output.text).then(() => setCopied(true));
  };

  let bodyClass = 'output-pre';
  let bodyText = 'Result will appear here…';
  if (hasText) {
    bodyClass += ' fresh';
    bodyText = output.text;
  } else if (hasRun) {
    bodyClass += ' empty';
    bodyText = '(empty output)';
  } else {
    bodyClass += ' empty';
  }

  return (
    <div
      ref={panelRef}
      className={`pane pane-out${panelFocused ? ' panel-focused' : ''}`}
      tabIndex={-1}
      onFocus={onActivate}
      onMouseDown={onActivate}
    >
      <div className="pane-head">
        <span className="pane-title">Output</span>
        <div className="pane-actions">
          <div className={`spinner${running ? ' on' : ''}`} aria-label="Running…" />
          <span className="exec-timer">{showMeta ? `${output.elapsed}s` : ''}</span>
          <span
            className={`exit-badge${showMeta ? (output.exitCode === 0 ? ' ok' : ' err') : ''}`}
            role="status"
          >
            {showMeta ? `exit ${output.exitCode}` : ''}
          </span>
          <button type="button" className="copy-btn" onClick={copy}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="output-wrap">
        <pre ref={outputRef} className={bodyClass} aria-label="Command output" aria-live="polite">
          {bodyText}
        </pre>
      </div>

      <div className={`stderr-strip${stderr ? ' visible' : ''}`} aria-live="polite" role="alert">
        {stderr}
      </div>
    </div>
  );
}
