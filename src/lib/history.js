/**
 * history.js — localStorage-backed command history (pure helpers).
 */
import { HIST_KEY, HIST_MAX } from '../config/tools.js';

export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HIST_KEY)) || [];
  } catch {
    return [];
  }
}

export function pushHistory(tool, params) {
  let h = loadHistory().filter((e) => !(e.tool === tool && e.params === params));
  h.unshift({ tool, params });
  if (h.length > HIST_MAX) h = h.slice(0, HIST_MAX);
  try {
    localStorage.setItem(HIST_KEY, JSON.stringify(h));
  } catch {
    // storage unavailable (private mode / quota) — history is best-effort
  }
  return h;
}
