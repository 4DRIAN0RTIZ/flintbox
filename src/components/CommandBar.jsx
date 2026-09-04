import '../styles/controls.css';

/**
 * Presentational: assembled `$ tool params < stdin` preview.
 * @param {{ tool: string, params: string }} props
 */
export default function CommandBar({ tool, params }) {
  return (
    <div className="cmd-bar" aria-live="polite" aria-label="Assembled command preview">
      <span className="cmd-ps">$</span>
      <span className="cmd-tool">{tool}</span>
      <span className="cmd-params">{params ? ` ${params}` : ''}</span>
      <span className="cmd-redir">&lt;</span>
      <span className="cmd-stdin">stdin</span>
    </div>
  );
}
