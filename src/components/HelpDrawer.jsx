import '../styles/ui.css';

/** Render the drawer body for a resolved help `content` payload. */
function HelpContent({ content }) {
  if (!content) return null;

  if (content.kind === 'text') {
    return <pre className="help-pre">{content.text}</pre>;
  }

  if (content.kind === 'error') {
    return <span className="help-error">{content.msg}</span>;
  }

  // structured
  const { data } = content;
  return (
    <>
      {data.synopsis && <code className="help-example">{data.synopsis}</code>}
      {(data.sections ?? []).map((section, si) => (
        <div key={si}>
          <div className="help-section-title">{section.title}</div>
          {(section.entries ?? []).map(({ flag, desc }, ei) => (
            <div className="help-entry" key={ei}>
              <span className="help-flag">{flag}</span>
              <span className="help-desc">{`  ${desc}`}</span>
            </div>
          ))}
          {(section.examples ?? []).map((ex, xi) => (
            <code className="help-example" key={xi}>{ex}</code>
          ))}
        </div>
      ))}
    </>
  );
}

/**
 * Presentational: slide-in help drawer + backdrop.
 * @param {object} props
 * @param {boolean} props.open
 * @param {boolean} props.loading
 * @param {string} props.title
 * @param {object|null} props.content   { kind: 'text' | 'structured' | 'error', ... }
 * @param {() => void} props.onClose
 */
export default function HelpDrawer({ open, loading, title, content, onClose }) {
  return (
    <>
      <div
        className={`help-backdrop${open ? ' visible' : ''}`}
        aria-hidden="true"
        onClick={onClose}
      />
      <aside
        className={`help-drawer${open ? ' open' : ''}`}
        role="complementary"
        aria-label="Tool help"
        aria-hidden={!open}
      >
        <div className="help-drawer-head">
          <span className="help-drawer-title">{title}</span>
          <button type="button" className="help-close" aria-label="Close help" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={`help-loading${loading ? ' visible' : ''}`}>Loading help…</div>
        <div className="help-body" aria-live="polite">
          {!loading && <HelpContent content={content} />}
        </div>
      </aside>
    </>
  );
}
