/**
 * dom.js — single registry of all DOM element references.
 * Import this module anywhere that needs to touch the DOM.
 */
export const DOM = {
  // Tool navigation
  tabs:        document.querySelectorAll('.tab'),

  // Control row
  ctrlLabel:   document.getElementById('ctrl-label'),
  params:      document.getElementById('params'),
  runBtn:      document.getElementById('run-btn'),

  // Command preview bar
  cmdTool:     document.getElementById('cmd-tool'),
  cmdParams:   document.getElementById('cmd-params'),

  // Input pane
  input:       document.getElementById('input-data'),
  lineCount:   document.getElementById('line-count'),
  jsonLint:    document.getElementById('json-lint'),
  jsonFmtBtn:  document.getElementById('json-fmt-btn'),

  // Output pane
  spinner:     document.getElementById('spinner'),
  execTimer:   document.getElementById('exec-timer'),
  exitBadge:   document.getElementById('exit-badge'),
  output:      document.getElementById('output-data'),
  stderr:      document.getElementById('stderr-strip'),
  copyBtn:     document.getElementById('copy-btn'),

  // Divider
  divArrow:    document.getElementById('divider-arrow'),

  // History
  histBar:     document.getElementById('history-bar'),
  histChips:   document.getElementById('hist-chips'),

  // Help drawer
  helpBtn:     document.getElementById('help-btn'),
  helpDrawer:  document.getElementById('help-drawer'),
  helpBackdrop:document.getElementById('help-backdrop'),
  helpTitle:   document.getElementById('help-title'),
  helpBody:    document.getElementById('help-body'),
  helpLoading: document.getElementById('help-loading'),
  helpClose:   document.getElementById('help-close'),
};
