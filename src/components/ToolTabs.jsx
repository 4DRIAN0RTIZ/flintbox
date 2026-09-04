import '../styles/tabs.css';

/**
 * Presentational: tool selector tabs.
 * @param {{ tools: string[], active: string, onSelect: (tool: string) => void, panelRef?: any, panelFocused?: boolean, onActivate?: () => void }} props
 */
export default function ToolTabs({
  tools,
  active,
  onSelect,
  panelRef,
  panelFocused = false,
  onActivate,
}) {
  return (
    <nav
      ref={panelRef}
      className={`tool-tabs${panelFocused ? ' panel-focused' : ''}`}
      role="tablist"
      aria-label="Select tool"
      tabIndex={-1}
      onFocus={onActivate}
      onMouseDown={onActivate}
    >
      {tools.map((tool) => (
        <button
          key={tool}
          type="button"
          className={`tab${tool === active ? ' active' : ''}`}
          data-tool={tool}
          role="tab"
          aria-selected={tool === active}
          onClick={() => onSelect(tool)}
        >
          {tool}
        </button>
      ))}
    </nav>
  );
}
