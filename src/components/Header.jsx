/** Presentational: top app bar with brand, secure tag and GitHub link. */
export default function Header() {
  return (
    <header className="header">
      <div className="header-brand">
        <img src="/LogoFlintBoxReal.png" alt="FlintBox logo" className="brand-logo" />
        <span className="brand-name">FlintBox</span>
      </div>
      <div className="header-right">
        <span className="secure-tag">Secure Sandbox</span>
        <a
          href="https://github.com/4drian0rtiz"
          target="_blank"
          rel="noopener noreferrer"
          className="github-link"
          title="@4drian0rtiz on GitHub"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.477 2 2 6.637 2 12.272c0 4.538 2.875 8.378 6.839 9.733.5.09.683-.223.683-.497 0-.245-.009-.898-.014-1.762-2.782.622-3.369-1.37-3.369-1.37-.455-1.182-1.111-1.497-1.111-1.497-.909-.639.069-.627.069-.627 1.004.073 1.532 1.06 1.532 1.06.892 1.56 2.341 1.109 2.91.848.09-.663.35-1.109.636-1.365-2.222-.259-4.56-1.136-4.56-5.059 0-1.118.39-2.032 1.03-2.749-.103-.259-.447-1.302.098-2.713 0 0 .84-.272 2.75 1.051A9.22 9.22 0 0112 6.84c.85.004 1.705.116 2.504.341 1.909-1.323 2.748-1.051 2.748-1.051.546 1.411.202 2.454.1 2.713.64.717 1.028 1.631 1.028 2.749 0 3.935-2.345 4.797-4.572 5.049.359.319.678.947.678 1.909 0 1.378-.013 2.49-.013 2.828 0 .277.18.592.688.491C19.127 20.647 22 16.807 22 12.272 22 6.637 17.523 2 12 2z" />
          </svg>
          <span>@4drian0rtiz</span>
        </a>
        <div className="status-dot" title="Container running" />
      </div>
    </header>
  );
}
