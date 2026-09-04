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

  const savedInputs = useRef({});
  const paramsRef = useRef(null);

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

  /* ── Global shortcuts ─────────────────────────────── */

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        doRun();
      } else if (e.key === 'Escape') {
        help.closeHelp();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [doRun, help.closeHelp]);

  return (
    <div className="app">
      <Header />

      <ToolTabs tools={TOOL_NAMES} active={tool} onSelect={selectTool} />

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
        />

        <div className="pane-divider" aria-hidden="true">
          <div className="divider-track" />
          <span className={`divider-arrow${arrowFiring ? ' firing' : ''}`}>→</span>
        </div>

        <OutputPane output={runner.output} stderr={runner.stderr} running={runner.running} />
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
