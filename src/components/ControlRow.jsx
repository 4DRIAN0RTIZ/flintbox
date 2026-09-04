import '../styles/controls.css';

/**
 * Presentational: contextual label + params input + help/run buttons.
 * @param {object} props
 * @param {string} props.label            contextual param label for the tool
 * @param {string} props.params           current params string
 * @param {string} props.placeholder      example params for the tool
 * @param {boolean} props.running
 * @param {boolean} props.helpOpen
 * @param {object} props.paramsRef        ref forwarded to the <input>
 * @param {(value: string) => void} props.onParamsChange
 * @param {() => void} props.onRun
 * @param {() => void} props.onHelp
 */
export default function ControlRow({
  label,
  params,
  placeholder,
  running,
  helpOpen,
  paramsRef,
  onParamsChange,
  onRun,
  onHelp,
}) {
  return (
    <div className="control-row">
      <span className="ctrl-label">{label}</span>
      <input
        ref={paramsRef}
        className="ctrl-input"
        type="text"
        autoComplete="off"
        spellCheck="false"
        placeholder={`e.g. ${placeholder}`}
        aria-label="Command parameters"
        value={params}
        onChange={(e) => onParamsChange(e.target.value)}
      />
      <button
        type="button"
        className="help-btn"
        aria-expanded={helpOpen}
        title="Show tool help"
        onClick={onHelp}
      >
        ? Help
      </button>
      <button
        type="button"
        className="run-btn"
        title="Run (Ctrl+Enter)"
        disabled={running}
        onClick={onRun}
      >
        <span className="run-label">Run</span>
        <kbd className="run-kbd">⌃↵</kbd>
      </button>
    </div>
  );
}
