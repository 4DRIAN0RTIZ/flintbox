import { useCallback, useState } from 'react';
import { loadHistory, pushHistory } from '../lib/history.js';

/**
 * localStorage-backed recent-command history.
 * @returns {{ items: Array<{tool: string, params: string}>, remember: (tool: string, params: string) => void }}
 */
export function useCommandHistory() {
  const [items, setItems] = useState(() => loadHistory());

  const remember = useCallback((tool, params) => {
    setItems(pushHistory(tool, params));
  }, []);

  return { items, remember };
}
