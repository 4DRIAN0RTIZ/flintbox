import { useCallback, useState } from 'react';
import { api } from '../api/client.js';
import { HELP_SOURCES } from '../config/tools.js';

/**
 * Drives the help drawer: tries each configured source for a tool in
 * order (binary --help, HTTP docs, local structured data) until one
 * resolves. All backend calls go through `api`.
 */
export function useHelp() {
  const [state, setState] = useState({
    open: false,
    loading: false,
    title: 'Help',
    content: null, // { kind: 'text' | 'structured' | 'error', ... }
  });

  const closeHelp = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);

  const openHelp = useCallback(async (tool) => {
    setState({ open: true, loading: true, title: 'Help', content: null });
    const sources = HELP_SOURCES[tool] ?? [];

    for (const source of sources) {
      try {
        if (source.type === 'binary') {
          const text = await api.help(tool);
          setState({ open: true, loading: false, title: `${tool} --help`, content: { kind: 'text', text } });
          return;
        }
        if (source.type === 'http') {
          const text = await api.fetchText(source.url);
          setState({ open: true, loading: false, title: `${tool} --help`, content: { kind: 'text', text } });
          return;
        }
        if (source.type === 'structured') {
          setState({
            open: true,
            loading: false,
            title: `${tool}  —  ${source.data.version ?? ''}`,
            content: { kind: 'structured', data: source.data },
          });
          return;
        }
      } catch {
        // source failed — try the next one
      }
    }

    setState({
      open: true,
      loading: false,
      title: `${tool} — help unavailable`,
      content: { kind: 'error', msg: 'No help available for this tool.' },
    });
  }, []);

  return { ...state, openHelp, closeHelp };
}
