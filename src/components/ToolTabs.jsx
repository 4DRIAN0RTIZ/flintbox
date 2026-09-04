import '../styles/tabs.css';

/**
 * Presentational: tool selector tabs.
 * @param {{ tools: string[], active: string, onSelect: (tool: string) => void }} props
 */
export default function ToolTabs({ tools, active, onSelect }) {
  return (
    <nav className="tool-tabs" role="tablist" aria-label="Select tool">
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
