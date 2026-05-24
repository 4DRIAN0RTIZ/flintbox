/**
 * history.js — localStorage-backed command history.
 */
import { HIST_KEY, HIST_MAX } from './config.js';

export const History = {
  load() {
    try {
      return JSON.parse(localStorage.getItem(HIST_KEY)) || [];
    } catch {
      return [];
    }
  },

  push(tool, params) {
    let h = this.load().filter(e => !(e.tool === tool && e.params === params));
    h.unshift({ tool, params });
    if (h.length > HIST_MAX) h = h.slice(0, HIST_MAX);
    localStorage.setItem(HIST_KEY, JSON.stringify(h));
  },
};
