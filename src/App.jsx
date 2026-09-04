import { useCallback, useEffect, useRef, useState } from 'react';
import { TOOLS } from './config/tools.js';
import { jsonLint } from './lib/json-lint.js';
import { useRunner } from './hooks/useRunner.js';
import { useHelp } from './hooks/useHelp.js';
import { useCommandHistory } from './hooks/useCommandHistory.js';
import { useHttpSource } from './hooks/useHttpSource.js';
import Header from './components/Header.jsx';
import ToolTabs from './components/ToolTabs.jsx';
import ControlRow from './components/ControlRow.jsx';
import CommandBar from './components/CommandBar.jsx';
import InputPane from './components/InputPane.jsx';
import OutputPane from './components/OutputPane.jsx';
import HistoryBar from './components/HistoryBar.jsx';
import HelpDrawer from './components/HelpDrawer.jsx';

const TOOL_NAMES = Object.keys(TOOLS);
const PANELS = ['tools', 'input', 'output'];

/**
 * Container: owns all UI state, wires the hooks (run / help / history /
 * HTTP source) to the presentational components. No component below this
 * one calls the backend directly — every request goes through the hooks,
 * which use `src/api/client.js`.
 */
export default function App() {
  const [tool, setTool] = useState('jq');
  const [params, setParams] = useState(TOOLS.jq.params);
  const [input, setInput] = useState(TOOLS.jq.input);
  const [sourceMode, setSourceMode] = useState('text'); // 'text' | 'http'
  const [arrowFiring, setArrowFiring] = useState(false);
  const [activePanel, setActivePanel] = useState('input');
  const [inputEditMode, setInputEditMode] = useState(false);
  const [outputSearch, setOutputSearch] = useState({ query: '', index: -1 });

  const savedInputs = useRef({});
  const paramsRef = useRef(null);
  const toolPanelRef = useRef(null);
  const inputPanelRef = useRef(null);
  const inputTextRef = useRef(null);
  const outputPanelRef = useRef(null);
  const outputTextRef = useRef(null);
  const pendingGRef = useRef(false);
  const pendingGTimeoutRef = useRef(null);

  const runner = useRunner();
  const help = useHelp();
  const history = useCommandHistory();
  const http = useHttpSource();

  const cfg = TOOLS[tool];
  const lineCount = input ? input.split('\n').length : 0;
  const lint = tool === 'jq' ? jsonLint(input) : null;

  /* ── Tool selection (saves per-tool input) ─────────── */

  const selectTool = useCallback((next) => {
    if (next === tool) return;
    savedInputs.current[tool] = input;
    setTool(next);
    setParams(TOOLS[next].params);
    setInput(savedInputs.current[next] ?? TOOLS[next].input);
  }, [tool, input]);

  const applyHistory = useCallback((histTool, histParams) => {
    if (histTool !== tool) {
      savedInputs.current[tool] = input;
      setTool(histTool);
      setInput(savedInputs.current[histTool] ?? TOOLS[histTool].input);
    }
    setParams(histParams);
  }, [tool, input]);

  /* ── JSON format (jq only) ────────────────────────── */

  const formatJson = useCallback(() => {
    const v = input.trim();
    if (!v) return;
    try {
      setInput(JSON.stringify(JSON.parse(v), null, 2));
    } catch {
      // invalid JSON — the lint badge already shows the error
    }
  }, [input]);

  /* ── Arrow animation ──────────────────────────────── */

  const fireArrow = useCallback(() => {
    setArrowFiring(false);
    requestAnimationFrame(() => setArrowFiring(true));
    setTimeout(() => setArrowFiring(false), 600);
  }, []);

  /* ── Run ──────────────────────────────────────────── */

  const doRun = useCallback(async () => {
    if (runner.running) return;
    const p = params.trim();
    if (!p) {
      paramsRef.current?.focus();
      return;
    }
    fireArrow();
    const httpRequest = sourceMode === 'http' ? http.buildRequest() : null;
    await runner.execute({
      tool,
      params: p,
      input,
      httpRequest,
      fetchSilent: http.fetchSilent,
      onInputText: setInput,
      remember: history.remember,
    });
  }, [runner, params, sourceMode, http, tool, input, history.remember, fireArrow]);

  const handleFetch = useCallback(async () => {
    const text = await http.runFetch();
    if (text != null) setInput(text);
  }, [http]);

  const handlePanelKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.stopPropagation();
      e.preventDefault();
      handleFetch();
    }
  }, [handleFetch]);

  const clearPendingG = useCallback(() => {
    pendingGRef.current = false;
    if (pendingGTimeoutRef.current) {
      clearTimeout(pendingGTimeoutRef.current);
      pendingGTimeoutRef.current = null;
    }
  }, []);

  const scrollOutputTop = useCallback(() => {
    const outputNode = outputTextRef.current;
    if (!outputNode) return;
    outputNode.scrollTop = 0;
  }, []);

  const scrollOutputBottom = useCallback(() => {
    const outputNode = outputTextRef.current;
    if (!outputNode) return;
    outputNode.scrollTop = outputNode.scrollHeight;
  }, []);

  const searchOutput = useCallback(() => {
    const outputNode = outputTextRef.current;
    if (!outputNode) return;
    const nextQuery = window.prompt('Search output', outputSearch.query) ?? null;
    if (!nextQuery) return;
    const query = nextQuery.trim();
    if (!query) return;
    const text = outputNode.textContent ?? '';
    if (!text) return;
    const needle = query.toLowerCase();
    const haystack = text.toLowerCase();
    const start = outputSearch.query === query ? outputSearch.index + 1 : 0;
    let index = haystack.indexOf(needle, start);
    if (index < 0) index = haystack.indexOf(needle);
    if (index < 0) return;

    setOutputSearch({ query, index });

    const textNode = outputNode.firstChild;
    if (textNode?.nodeType === Node.TEXT_NODE) {
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.setStart(textNode, index);
        range.setEnd(textNode, index + query.length);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }

    const maxScroll = Math.max(outputNode.scrollHeight - outputNode.clientHeight, 0);
    outputNode.scrollTop = maxScroll * (index / Math.max(text.length - 1, 1));
  }, [outputSearch]);

  const focusPanel = useCallback((panel, { editInput = false } = {}) => {
    setActivePanel(panel);
    setInputEditMode(panel === 'input' && editInput);

    if (panel === 'tools') {
      toolPanelRef.current?.focus();
      return;
    }
    if (panel === 'output') {
      outputPanelRef.current?.focus();
      return;
    }
    if (editInput) {
      inputTextRef.current?.focus();
      return;
    }
    inputPanelRef.current?.focus();
  }, []);

  const movePanel = useCallback((delta) => {
    const currentIndex = PANELS.indexOf(activePanel);
    const nextIndex = (currentIndex + delta + PANELS.length) % PANELS.length;
    focusPanel(PANELS[nextIndex]);
  }, [activePanel, focusPanel]);

  const activateToolsPanel = useCallback(() => {
    setInputEditMode(false);
    setActivePanel('tools');
    clearPendingG();
  }, [clearPendingG]);

  const activateInputPanel = useCallback(() => {
    setInputEditMode(false);
    setActivePanel('input');
    clearPendingG();
  }, [clearPendingG]);

  const activateInputEditor = useCallback(() => {
    setInputEditMode(true);
    setActivePanel('input');
    clearPendingG();
  }, [clearPendingG]);

  const activateOutputPanel = useCallback(() => {
    setInputEditMode(false);
    setActivePanel('output');
    clearPendingG();
  }, [clearPendingG]);

  /* ── Global shortcuts ─────────────────────────────── */

  useEffect(() => {
    const isEditableTarget = (target) => (
      target instanceof HTMLElement
      && (target.isContentEditable
        || target.tagName === 'TEXTAREA'
        || target.tagName === 'INPUT'
        || target.tagName === 'SELECT')
    );

    const onKeyDown = (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        doRun();
        return;
      }

      if (e.key === 'Escape') {
        if (inputEditMode) {
          e.preventDefault();
          focusPanel('input');
          return;
        }
        help.closeHelp();
        return;
      }

      if (inputEditMode || isEditableTarget(e.target)) return;

      if (e.key === 'j' || e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        clearPendingG();
        movePanel(1);
        return;
      }

      if (e.key === 'k' || e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        clearPendingG();
        movePanel(-1);
        return;
      }

      if (e.key === 'i') {
        e.preventDefault();
        clearPendingG();
        focusPanel('input', { editInput: true });
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        clearPendingG();
        doRun();
        return;
      }

      if (activePanel === 'output' && e.key === 'g') {
        e.preventDefault();
        if (pendingGRef.current) {
          clearPendingG();
          scrollOutputTop();
          return;
        }
        pendingGRef.current = true;
        pendingGTimeoutRef.current = setTimeout(() => {
          pendingGRef.current = false;
          pendingGTimeoutRef.current = null;
        }, 550);
        return;
      }

      if (activePanel === 'output' && e.key === 'G') {
        e.preventDefault();
        clearPendingG();
        scrollOutputBottom();
        return;
      }

      if (activePanel === 'output' && e.key === '/') {
        e.preventDefault();
        clearPendingG();
        searchOutput();
        return;
      }

      clearPendingG();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      clearPendingG();
    };
  }, [
    activePanel,
    clearPendingG,
    doRun,
    focusPanel,
    help.closeHelp,
    inputEditMode,
    movePanel,
    scrollOutputBottom,
    scrollOutputTop,
    searchOutput,
  ]);

  return (
    <div className="app">
      <Header />

      <ToolTabs
        tools={TOOL_NAMES}
        active={tool}
        onSelect={selectTool}
        panelRef={toolPanelRef}
        panelFocused={activePanel === 'tools'}
        onActivate={activateToolsPanel}
      />

      <ControlRow
        label={cfg.label}
        params={params}
        placeholder={cfg.params}
        running={runner.running}
        helpOpen={help.open}
        paramsRef={paramsRef}
        onParamsChange={setParams}
        onRun={doRun}
        onHelp={() => help.openHelp(tool)}
      />

      <CommandBar tool={tool} params={params} />

      <div className="workspace">
        <InputPane
          sourceMode={sourceMode}
          onSourceMode={setSourceMode}
          lineCount={lineCount}
          lint={lint}
          showFormat={tool === 'jq'}
          onFormat={formatJson}
          input={input}
          onInput={setInput}
          http={http}
          onFetch={handleFetch}
          onPanelKeyDown={handlePanelKeyDown}
          panelRef={inputPanelRef}
          inputRef={inputTextRef}
          panelFocused={activePanel === 'input'}
          inputEditMode={inputEditMode}
          onActivatePanel={activateInputPanel}
          onActivateInput={activateInputEditor}
        />

        <div className="pane-divider" aria-hidden="true">
          <div className="divider-track" />
          <span className={`divider-arrow${arrowFiring ? ' firing' : ''}`}>→</span>
        </div>

        <OutputPane
          output={runner.output}
          stderr={runner.stderr}
          running={runner.running}
          panelRef={outputPanelRef}
          outputRef={outputTextRef}
          panelFocused={activePanel === 'output'}
          onActivate={activateOutputPanel}
        />
      </div>

      <HistoryBar items={history.items} onPick={applyHistory} />

      <HelpDrawer
        open={help.open}
        loading={help.loading}
        title={help.title}
        content={help.content}
        onClose={help.closeHelp}
      />
    </div>
  );
}
