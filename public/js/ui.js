/**
 * ui.js — all DOM mutations and render logic.
 * Pure functions: receive state, update DOM.
 */
import { TOOLS } from './config.js';
import { DOM } from './dom.js';
import { History } from './history.js';

/** Currently active tool name. */
let _currentTool = 'jq';
export const getCurrentTool = () => _currentTool;

/** Saved input per tool. */
const _toolInputs = {};

export const UI = {

	/* ── Tool selection ─────────────────────────────── */

	setTool(tool) {
		if (_currentTool !== tool) _toolInputs[_currentTool] = DOM.input.value;
		_currentTool = tool;
		const cfg = TOOLS[tool];

		// Activate matching tab
		DOM.tabs.forEach(t => t.classList.toggle('active', t.dataset.tool === tool));

		// Update contextual label + params
		DOM.ctrlLabel.textContent = cfg.label;
		DOM.params.placeholder = `e.g. ${cfg.params}`;
		DOM.params.value = cfg.params;

		DOM.input.value = _toolInputs[tool] ?? cfg.input;

		this.updatePreview();
		this.updateLineCount();
		this.lintJson();
		DOM.jsonFmtBtn.hidden = (_currentTool !== 'jq');
	},

	/* ── Live previews ──────────────────────────────── */

	updatePreview() {
		DOM.cmdTool.textContent = _currentTool;
		DOM.cmdParams.textContent = DOM.params.value ? ' ' + DOM.params.value : '';
	},

	updateLineCount() {
		const n = DOM.input.value ? DOM.input.value.split('\n').length : 0;
		DOM.lineCount.textContent = `${n} line${n !== 1 ? 's' : ''}`;
	},

	formatJson() {
		const val = DOM.input.value.trim();
		if (!val) return;
		try {
			DOM.input.value = JSON.stringify(JSON.parse(val), null, 2);
			this.updateLineCount();
			this.lintJson();
		} catch {
			// invalid JSON — lint badge already shows the error
		}
	},

	lintJson() {
		const val = DOM.input.value.trim();
		if (_currentTool !== 'jq' || !val) {
			DOM.jsonLint.hidden = true;
			return;
		}
		try {
			JSON.parse(val);
			DOM.jsonLint.textContent = '✓ valid JSON';
			DOM.jsonLint.className = 'json-lint ok';
		} catch (e) {
			const msg = e.message.replace(/^JSON\.parse: /, '').replace(/ at line \d+.*$/, '');
			DOM.jsonLint.textContent = `✗ ${msg}`;
			DOM.jsonLint.className = 'json-lint err';
		}
		DOM.jsonLint.hidden = false;
	},

	/* ── Loading state ──────────────────────────────── */

	setLoading(on) {
		DOM.runBtn.disabled = on;
		DOM.spinner.classList.toggle('on', on);
		if (on) {
			DOM.execTimer.textContent = '';
			DOM.exitBadge.className = 'exit-badge';
			DOM.stderr.textContent = '';
			DOM.stderr.classList.remove('visible');
		}
	},

	/* ── Output ─────────────────────────────────────── */

	setOutput(text) {
		DOM.output.classList.remove('fresh', 'empty');
		if (!text) {
			DOM.output.textContent = '(empty output)';
			DOM.output.classList.add('empty');
		} else {
			DOM.output.textContent = text;
			void DOM.output.offsetWidth; // force reflow for animation replay
			DOM.output.classList.add('fresh');
		}
	},

	setExitBadge(code, elapsed) {
		DOM.exitBadge.textContent = `exit ${code}`;
		DOM.exitBadge.className = `exit-badge ${code === 0 ? 'ok' : 'err'}`;
		DOM.execTimer.textContent = `${elapsed}s`;
	},

	setStderr(text) {
		if (text) {
			DOM.stderr.textContent = text;
			DOM.stderr.classList.add('visible');
		}
	},

	/* ── Arrow animation ────────────────────────────── */

	fireArrow() {
		DOM.divArrow.classList.remove('firing');
		void DOM.divArrow.offsetWidth;
		DOM.divArrow.classList.add('firing');
		setTimeout(() => DOM.divArrow.classList.remove('firing'), 600);
	},

	/* ── Copy ───────────────────────────────────────── */

	flashCopy() {
		const orig = DOM.copyBtn.textContent;
		DOM.copyBtn.textContent = 'Copied!';
		setTimeout(() => { DOM.copyBtn.textContent = orig; }, 1600);
	},

	/* ── History ─────────────────────────────────────── */

	renderHistory() {
		const hist = History.load();
		if (!hist.length) {
			DOM.histBar.classList.remove('visible');
			return;
		}
		DOM.histBar.classList.add('visible');
		DOM.histChips.innerHTML = '';

		hist.forEach(({ tool, params }) => {
			const chip = document.createElement('button');
			chip.className = 'hist-chip';
			chip.title = `${tool} ${params}`;
			chip.textContent = `${tool}  ${params}`;
			chip.addEventListener('click', () => {
				this.setTool(tool);
				DOM.params.value = params;
				this.updatePreview();
			});
			DOM.histChips.appendChild(chip);
		});
	},

	/* ── Help drawer ─────────────────────────────────── */

	openHelp() {
		DOM.helpDrawer.classList.add('open');
		DOM.helpBackdrop.classList.add('visible');
		DOM.helpBtn.setAttribute('aria-expanded', 'true');
		DOM.helpClose.focus();
	},

	closeHelp() {
		DOM.helpDrawer.classList.remove('open');
		DOM.helpBackdrop.classList.remove('visible');
		DOM.helpBtn.setAttribute('aria-expanded', 'false');
		DOM.helpBtn.focus();
	},

	setHelpLoading(on) {
		DOM.helpLoading.classList.toggle('visible', on);
		if (on) DOM.helpBody.innerHTML = '';
	},

	/**
	 * Render plain-text help (e.g. from --help or HTTP fetch).
	 */
	renderHelpText(tool, text) {
		DOM.helpTitle.textContent = `${tool} --help`;
		DOM.helpBody.innerHTML = '';

		const pre = document.createElement('pre');
		pre.style.cssText = 'white-space:pre-wrap;word-break:break-word;font-size:11px;line-height:1.7;color:var(--text-1)';
		pre.textContent = text;
		DOM.helpBody.appendChild(pre);
	},

	/**
	 * Render structured help from config HELP_SOURCES[tool].data.
	 */
	renderHelpStructured(tool, data) {
		DOM.helpTitle.textContent = `${tool}  —  ${data.version ?? ''}`;
		DOM.helpBody.innerHTML = '';

		// Synopsis
		if (data.synopsis) {
			const syn = document.createElement('code');
			syn.className = 'help-example';
			syn.textContent = data.synopsis;
			DOM.helpBody.appendChild(syn);
		}

		// Sections
		(data.sections ?? []).forEach(section => {
			const title = document.createElement('div');
			title.className = 'help-section-title';
			title.textContent = section.title;
			DOM.helpBody.appendChild(title);

			// Flag entries
			(section.entries ?? []).forEach(({ flag, desc }) => {
				const row = document.createElement('div');
				row.style.cssText = 'margin-bottom:5px';
				row.innerHTML = `<span class="help-flag">${escHtml(flag)}</span>`
					+ `<span class="help-desc">  ${escHtml(desc)}</span>`;
				DOM.helpBody.appendChild(row);
			});

			// Code examples
			(section.examples ?? []).forEach(ex => {
				const code = document.createElement('code');
				code.className = 'help-example';
				code.textContent = ex;
				DOM.helpBody.appendChild(code);
			});
		});
	},

	renderHelpError(tool, msg) {
		DOM.helpTitle.textContent = `${tool} — help unavailable`;
		DOM.helpBody.innerHTML = `<span style="color:var(--err);font-size:11px">${escHtml(msg)}</span>`;
	},
};

function escHtml(str) {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}
