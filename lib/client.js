window.__ModuleLoader__.load({
	id: "@dong-victor/dsh-better-sidebar-jupyter",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/jupyter/panel/styles.ts
		/**
		* dsh-jupyter panel styles. Injected as one <style> tag by the client apply().
		* Scoped by the plugin's own data attributes; colors ride the dsh --dsw-*
		* tokens so the panel follows the active theme (light/dark and skins).
		* @module dsh-jupyter/client/panel/styles
		*/
		const PANEL_CSS = `
/* --- sidebar entry row ------------------------------------------------- */

.dshjp-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 32px;
  padding: 0 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
}

.dshjp-entry:hover {
  background: var(--dsw-specific-sidebar-nav-item-hover);
  color: var(--dsw-alias-label-primary);
}

.dshjp-entry[data-active] {
  background: var(--dsw-specific-sidebar-nav-item-active);
  color: var(--dsw-alias-label-primary);
  font-weight: 600;
}

.dshjp-entry-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.dshjp-entry-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

[data-dsh-frame][data-sidebar-collapsed] .dshjp-entry {
  justify-content: center;
  padding: 0;
}

[data-dsh-frame][data-sidebar-collapsed] .dshjp-entry-label {
  display: none;
}

/* --- panel frame --------------------------------------------------------- */

.dshjp-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  min-height: 0;
  padding: 12px 14px 14px;
  gap: 10px;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-family: var(--dsw-font-family);
  font-size: 13px;
}

.dshjp-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
}

.dshjp-title {
  margin: 0;
  flex: 1;
  font-size: 16px;
  font-weight: 700;
  color: var(--dsw-alias-label-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dshjp-subtitle {
  margin: 0;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
}

.dshjp-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  white-space: nowrap;
  border: 1px solid var(--dsw-specific-sidebar-nav-item-hover, rgba(128,128,128,.25));
  color: var(--dsw-alias-label-secondary);
}

.dshjp-status-badge .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--dsw-alias-label-tertiary, #999);
}

.dshjp-status-badge.ok .dot { background: #2e9e5b; }
.dshjp-status-badge.busy .dot { background: #d97706; animation: dshjp-pulse 1s infinite; }
.dshjp-status-badge.err .dot { background: #dc2626; }
.dshjp-status-badge.off .dot { background: #9ca3af; }

@keyframes dshjp-pulse { 50% { opacity: .35; } }

.dshjp-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

.dshjp-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 2px;
}

.dshjp-banner {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
  flex: none;
}

.dshjp-banner.err { background: color-mix(in srgb, #dc2626 12%, transparent); color: #fca5a5; border: 1px solid color-mix(in srgb, #dc2626 35%, transparent); }
.dshjp-banner.warn { background: color-mix(in srgb, #d97706 12%, transparent); color: #fbbf24; border: 1px solid color-mix(in srgb, #d97706 35%, transparent); }
.dshjp-banner.ok { background: color-mix(in srgb, #2e9e5b 12%, transparent); color: #86efac; border: 1px solid color-mix(in srgb, #2e9e5b 35%, transparent); }

/* --- buttons -------------------------------------------------------------- */

.dshjp-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--dsw-specific-sidebar-nav-item-hover, rgba(128,128,128,.3));
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  flex: none;
}

.dshjp-btn:hover { background: var(--dsw-specific-sidebar-nav-item-hover); }
.dshjp-btn:disabled { opacity: .45; cursor: default; }
.dshjp-btn.primary { background: color-mix(in srgb, #4f8cff 18%, transparent); border-color: color-mix(in srgb, #4f8cff 45%, transparent); color: #cfe0ff; }
.dshjp-btn.danger:hover { background: color-mix(in srgb, #dc2626 20%, transparent); }

/* --- browser view ---------------------------------------------------------- */

.dshjp-workspace-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  flex: none;
}

.dshjp-ws-tab {
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid var(--dsw-specific-sidebar-nav-item-hover, rgba(128,128,128,.3));
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  cursor: pointer;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dshjp-ws-tab.active { background: var(--dsw-specific-sidebar-nav-item-active); color: var(--dsw-alias-label-primary); font-weight: 600; }

.dshjp-file-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--dsw-alias-label-primary);
}

.dshjp-file-row:hover { background: var(--dsw-specific-sidebar-nav-item-hover); }
.dshjp-file-row .name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshjp-file-row .tag { font-size: 11px; color: var(--dsw-alias-label-secondary); flex: none; }
.dshjp-file-row.dir { color: var(--dsw-alias-label-secondary); }

.dshjp-empty {
  padding: 24px 12px;
  text-align: center;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.dshjp-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  flex: none;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--dsw-specific-sidebar-nav-item-hover, rgba(128,128,128,.18));
}

.dshjp-toolbar .spacer { flex: 1; }
.dshjp-toolbar .sep { width: 1px; align-self: stretch; background: var(--dsw-specific-sidebar-nav-item-hover, rgba(128,128,128,.25)); margin: 0 2px; }

.dshjp-filename {
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 40%;
}

/* --- editor / cells ---------------------------------------------------------- */

.dshjp-cells { display: flex; flex-direction: column; gap: 10px; padding: 4px 2px 24px; }

.dshjp-cell {
  border: 1px solid transparent;
  border-radius: 8px;
  position: relative;
}

.dshjp-cell.selected { border-color: color-mix(in srgb, #4f8cff 55%, transparent); background: color-mix(in srgb, #4f8cff 4%, transparent); }

.dshjp-cell-gutter {
  position: absolute;
  left: -2px;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 2px;
  background: transparent;
}

.dshjp-cell.selected .dshjp-cell-gutter { background: #4f8cff; }
.dshjp-cell.running .dshjp-cell-gutter { background: #d97706; animation: dshjp-pulse 1s infinite; }

.dshjp-cell-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  font-size: 11px;
  color: var(--dsw-alias-label-secondary);
  user-select: none;
}

.dshjp-cell-type { font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
.dshjp-cell-count { margin-left: auto; font-variant-numeric: tabular-nums; }

.dshjp-cell-actions {
  display: none;
  gap: 2px;
}

.dshjp-cell:hover .dshjp-cell-actions, .dshjp-cell.selected .dshjp-cell-actions { display: inline-flex; }

.dshjp-cell-action {
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
}

.dshjp-cell-action:hover { background: var(--dsw-specific-sidebar-nav-item-hover); color: var(--dsw-alias-label-primary); }

.dshjp-code-wrap {
  position: relative;
  margin: 0 8px 4px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--dsw-specific-sidebar-nav-item-hover, rgba(128,128,128,.2));
  background: color-mix(in srgb, var(--dsw-alias-bg-base, #0f1115) 88%, black);
}

.dshjp-code-editor {
  position: relative;
  min-height: 34px;
  max-height: 480px;
  overflow: hidden;
}

.dshjp-code-highlight, .dshjp-code-input {
  margin: 0;
  padding: 8px 10px;
  font-family: var(--dsw-font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  font-size: 12.5px;
  line-height: 1.55;
  tab-size: 4;
  white-space: pre;
  word-wrap: normal;
  overflow-wrap: normal;
  min-height: 34px;
  box-sizing: border-box;
  width: 100%;
}

.dshjp-code-highlight {
  position: absolute;
  inset: 0;
  /* IDEA Darcula editor foreground (#a9b7c6) for un-tokenized text. */
  color: #a9b7c6;
  pointer-events: none;
  overflow: auto;
}

.dshjp-code-highlight.show { visibility: visible; }

.dshjp-code-input {
  position: relative;
  display: block;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  color: transparent;
  caret-color: var(--dsw-alias-label-primary);
  overflow: auto;
}

.dshjp-code-input::selection { background: color-mix(in srgb, #4f8cff 40%, transparent); }

/* PyCharm / IDEA Darcula token palette (authentic Python colors):
 * keywords orange, strings green, numbers blue, comments gray italic,
 * def/class names yellow, 'self'/'cls' italic, everything else the plain
 * Darcula foreground #a9b7c6 — builtins are NOT specially colored in IDEA. */
.dshjp-tok-kw { color: #cc7832; }
.dshjp-tok-str { color: #6a8759; }
.dshjp-tok-com { color: #808080; font-style: italic; }
.dshjp-tok-num { color: #6897bb; }
.dshjp-tok-dec { color: #cc7832; }
.dshjp-tok-fn { color: #ffc66d; }
.dshjp-tok-self { color: #a9b7c6; font-style: italic; }
.dshjp-tok-builtin { color: #a9b7c6; }
.dshjp-tok-id { color: #a9b7c6; }
.dshjp-tok-op { color: #a9b7c6; }

.dshjp-markdown {
  margin: 4px 8px;
  padding: 8px 10px;
  line-height: 1.6;
  font-size: 13px;
  color: var(--dsw-alias-label-primary);
  word-break: break-word;
}

.dshjp-markdown h1, .dshjp-markdown h2, .dshjp-markdown h3, .dshjp-markdown h4 { margin: .6em 0 .3em; line-height: 1.3; }
.dshjp-markdown h1 { font-size: 1.5em; } .dshjp-markdown h2 { font-size: 1.3em; } .dshjp-markdown h3 { font-size: 1.15em; } .dshjp-markdown h4 { font-size: 1.05em; }
.dshjp-markdown p { margin: .4em 0; }
.dshjp-markdown ul, .dshjp-markdown ol { margin: .4em 0; padding-left: 1.6em; }
.dshjp-markdown li { margin: .15em 0; }
.dshjp-markdown code { font-family: var(--dsw-font-mono, ui-monospace, Menlo, Consolas, monospace); font-size: .92em; background: color-mix(in srgb, #4f8cff 12%, transparent); padding: .1em .35em; border-radius: 4px; }
.dshjp-markdown pre { background: color-mix(in srgb, var(--dsw-alias-bg-base, #0f1115) 82%, black); border: 1px solid var(--dsw-specific-sidebar-nav-item-hover, rgba(128,128,128,.2)); border-radius: 6px; padding: 8px 10px; overflow: auto; }
.dshjp-markdown pre code { background: none; padding: 0; }
.dshjp-markdown blockquote { margin: .4em 0; padding: .2em .8em; border-left: 3px solid color-mix(in srgb, #4f8cff 55%, transparent); color: var(--dsw-alias-label-secondary); }
.dshjp-markdown a { color: #7cb2ff; }
.dshjp-markdown img { max-width: 100%; border-radius: 4px; }
.dshjp-markdown hr { border: none; border-top: 1px solid var(--dsw-specific-sidebar-nav-item-hover, rgba(128,128,128,.3)); margin: .8em 0; }
.dshjp-markdown table { border-collapse: collapse; margin: .5em 0; }
.dshjp-markdown th, .dshjp-markdown td { border: 1px solid var(--dsw-specific-sidebar-nav-item-hover, rgba(128,128,128,.35)); padding: 4px 10px; }
.dshjp-markdown th { background: color-mix(in srgb, #4f8cff 10%, transparent); }

.dshjp-md-editor {
  margin: 4px 8px;
  width: calc(100% - 16px);
  min-height: 60px;
  padding: 8px 10px;
  border: 1px solid var(--dsw-specific-sidebar-nav-item-hover, rgba(128,128,128,.3));
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-family: var(--dsw-font-mono, ui-monospace, Menlo, Consolas, monospace);
  font-size: 12.5px;
  line-height: 1.55;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
}

/* --- outputs ---------------------------------------------------------------- */

.dshjp-outputs { margin: 0 8px 6px; display: flex; flex-direction: column; gap: 4px; }

.dshjp-output {
  border-radius: 6px;
  overflow: hidden;
  font-size: 12.5px;
  line-height: 1.55;
}

.dshjp-output pre {
  margin: 0;
  padding: 8px 10px;
  font-family: var(--dsw-font-mono, ui-monospace, Menlo, Consolas, monospace);
  white-space: pre-wrap;
  word-break: break-word;
  background: color-mix(in srgb, var(--dsw-alias-bg-base, #0f1115) 78%, black);
  color: var(--dsw-alias-label-primary);
  max-height: 420px;
  overflow: auto;
}

.dshjp-output .out-label {
  display: block;
  padding: 2px 10px;
  font-size: 11px;
  color: var(--dsw-alias-label-secondary);
  font-family: var(--dsw-font-mono, ui-monospace, Menlo, Consolas, monospace);
}

.dshjp-output.stream-stdout pre { color: var(--dsw-alias-label-primary); }
.dshjp-output.stream-stderr pre { color: #fca5a5; }
.dshjp-output .rich { padding: 8px 10px; }
.dshjp-output .rich pre { background: none; padding: 0; }
.dshjp-output img.rich-img { max-width: 100%; display: block; padding: 6px 10px; }

.dshjp-output.error-out {
  border: 1px solid color-mix(in srgb, #dc2626 40%, transparent);
  background: color-mix(in srgb, #dc2626 10%, transparent);
}

.dshjp-output.error-out pre { background: none; color: #fca5a5; }

.dshjp-output .out-count {
  display: inline-block;
  margin: 6px 0 0 10px;
  font-size: 11px;
  color: var(--dsw-alias-label-secondary);
  font-family: var(--dsw-font-mono, ui-monospace, Menlo, Consolas, monospace);
}

.dshjp-output table { border-collapse: collapse; margin: 0; }
.dshjp-output th, .dshjp-output td { border: 1px solid var(--dsw-specific-sidebar-nav-item-hover, rgba(128,128,128,.35)); padding: 3px 8px; font-size: 12px; }
.dshjp-output th { background: color-mix(in srgb, #4f8cff 10%, transparent); }

.dshjp-output .rich-html { overflow: auto; max-height: 420px; }
.dshjp-output .rich-html pre { background: none; }

/* --- code highlight token colors (dark default; skin override below) ---------- */

.dshjp-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid var(--dsw-alias-label-tertiary, #999);
  border-top-color: transparent;
  border-radius: 50%;
  animation: dshjp-spin .7s linear infinite;
  display: inline-block;
}

@keyframes dshjp-spin { to { transform: rotate(360deg); } }
`;
		//#endregion
		//#region src/client/jupyter/api.ts
		/** Route table mirrors the host half. */
		const JUPYTER_API = {
			env: "/api/dsh-better-sidebar-jupyter/env",
			notebook: "/api/dsh-better-sidebar-jupyter/notebook",
			kernelStatus: "/api/dsh-better-sidebar-jupyter/kernel/status",
			kernelStop: "/api/dsh-better-sidebar-jupyter/kernel/stop",
			kernelInterrupt: "/api/dsh-better-sidebar-jupyter/kernel/interrupt",
			kernelRestart: "/api/dsh-better-sidebar-jupyter/kernel/restart",
			kernelWs: "/api/dsh-better-sidebar-jupyter/kernel/ws"
		};
		/** Error carrying the route's JSON error message. */
		var JupyterApiError = class extends Error {
			constructor(message) {
				super(message);
				this.name = "JupyterApiError";
			}
		};
		async function readJson(response) {
			let body;
			try {
				body = await response.json();
			} catch {
				throw new JupyterApiError(`HTTP ${response.status}: invalid JSON response`);
			}
			if (!response.ok) throw new JupyterApiError(typeof body === "object" && body !== null && typeof body.error === "string" ? body.error : `HTTP ${response.status}`);
			return body;
		}
		function query(params) {
			const search = new URLSearchParams();
			for (const [key, value] of Object.entries(params)) if (value !== void 0 && value !== "") search.set(key, value);
			const text = search.toString();
			return text === "" ? "" : "?" + text;
		}
		/**
		* The browser half's only data entry point, bound to one session scope. The
		* sidebar editor creates one instance per open notebook (the scope rides the
		* FileViewerProps), so a notebook always talks to its own session's cwd.
		*/
		var JupyterApi = class {
			scope;
			constructor(scope) {
				this.scope = scope;
			}
			/** Fold the session scope into every query string. */
			scoped(extra) {
				return query({
					sessionId: this.scope.sessionId,
					...this.scope.cwd !== void 0 && this.scope.cwd !== "" ? { cwd: this.scope.cwd } : {},
					...extra
				});
			}
			async env() {
				return (await readJson(await fetch(JUPYTER_API.env))).report;
			}
			async readNotebook(path) {
				return (await readJson(await fetch(JUPYTER_API.notebook + this.scoped({ path })))).nb;
			}
			async saveNotebook(path, nb) {
				await readJson(await fetch(JUPYTER_API.notebook + this.scoped({ path }), {
					method: "PUT",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ nb })
				}));
			}
			async kernelStatus(path) {
				return (await readJson(await fetch(JUPYTER_API.kernelStatus + this.scoped({ path })))).kernel;
			}
			async stopKernel(path) {
				await readJson(await fetch(JUPYTER_API.kernelStop + this.scoped({ path }), { method: "POST" }));
			}
			async interruptKernel(path) {
				await readJson(await fetch(JUPYTER_API.kernelInterrupt + this.scoped({ path }), { method: "POST" }));
			}
			async restartKernel(path) {
				await readJson(await fetch(JUPYTER_API.kernelRestart + this.scoped({ path }), { method: "POST" }));
			}
			/** Open a WebSocket kernel session for a notebook path. */
			connectKernel(path) {
				const url = (window.location.protocol === "https:" ? "wss" : "ws") + "://" + window.location.host + JUPYTER_API.kernelWs + this.scoped({ path });
				const socket = new WebSocket(url);
				const connection = {
					onFrame: void 0,
					onClose: void 0,
					send: (frame) => {
						if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(frame));
					},
					close: () => {
						try {
							socket.close();
						} catch {}
					},
					readyState: () => socket.readyState
				};
				socket.onmessage = (event) => {
					let frame;
					try {
						frame = JSON.parse(event.data);
					} catch {
						return;
					}
					connection.onFrame?.(frame);
				};
				socket.onclose = () => {
					connection.onClose?.("connection closed");
				};
				socket.onerror = () => {
					connection.onClose?.("connection error");
				};
				return connection;
			}
		};
		//#endregion
		//#region src/client/jupyter/nbModel.ts
		let idCounter = 0;
		function nextId() {
			if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
			idCounter += 1;
			return `cell-${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
		}
		/** Normalize a cell source (string or list of strings). */
		function sourceToString(source) {
			if (typeof source === "string") return source;
			if (Array.isArray(source)) return source.map((part) => typeof part === "string" ? part : String(part)).join("");
			return source === void 0 || source === null ? "" : String(source);
		}
		/** Convert one nbformat output record to a UI output. */
		function outputFromNb(raw) {
			const type = raw.output_type;
			const data = typeof raw.data === "object" && raw.data !== null ? raw.data : {};
			const metadata = typeof raw.metadata === "object" && raw.metadata !== null ? raw.metadata : {};
			if (type === "stream") return {
				outputType: "stream",
				name: raw.name === "stderr" ? "stderr" : "stdout",
				text: typeof raw.text === "string" ? raw.text : Array.isArray(raw.text) ? raw.text.join("") : ""
			};
			if (type === "display_data") return {
				outputType: "display_data",
				data,
				metadata
			};
			if (type === "execute_result") return {
				outputType: "execute_result",
				data,
				metadata,
				executionCount: typeof raw.execution_count === "number" ? raw.execution_count : null
			};
			if (type === "error") return {
				outputType: "error",
				ename: typeof raw.ename === "string" ? raw.ename : "Error",
				evalue: typeof raw.evalue === "string" ? raw.evalue : "",
				traceback: Array.isArray(raw.traceback) ? raw.traceback.filter((line) => typeof line === "string") : []
			};
			return {
				outputType: "stream",
				name: "stdout",
				text: JSON.stringify(raw)
			};
		}
		/** Convert a raw nbformat notebook (from the API) to a UI document. */
		function notebookFromJson(value) {
			const nb = value;
			return {
				cells: (Array.isArray(nb.cells) ? nb.cells : []).map((cell) => {
					const type = cell.cell_type === "markdown" ? "markdown" : cell.cell_type === "raw" ? "raw" : "code";
					const outputs = type === "code" && Array.isArray(cell.outputs) ? cell.outputs.map(outputFromNb) : [];
					const count = type === "code" && typeof cell.execution_count === "number" ? cell.execution_count : null;
					return {
						id: typeof cell.id === "string" && cell.id !== "" ? cell.id : nextId(),
						type,
						source: sourceToString(cell.source),
						outputs,
						executionCount: count,
						running: false
					};
				}),
				metadata: typeof nb.metadata === "object" && nb.metadata !== null ? nb.metadata : {},
				nbformat: typeof nb.nbformat === "number" ? nb.nbformat : 4,
				nbformatMinor: typeof nb.nbformat_minor === "number" ? nb.nbformat_minor : 5,
				dirty: false
			};
		}
		/** Convert one UI output back to an nbformat output record. */
		function outputToNb(output) {
			if (output.outputType === "stream") return {
				output_type: "stream",
				name: output.name,
				text: output.text
			};
			if (output.outputType === "display_data") return {
				output_type: "display_data",
				data: output.data,
				metadata: output.metadata
			};
			if (output.outputType === "execute_result") return {
				output_type: "execute_result",
				data: output.data,
				metadata: output.metadata,
				execution_count: output.executionCount
			};
			return {
				output_type: "error",
				ename: output.ename,
				evalue: output.evalue,
				traceback: output.traceback
			};
		}
		/** Convert the UI document back to a serializable nbformat notebook. */
		function notebookToJson(nb) {
			return {
				cells: nb.cells.map((cell) => {
					const base = {
						cell_type: cell.type,
						metadata: {},
						source: cell.source,
						id: cell.id
					};
					if (cell.type === "code") {
						base.outputs = cell.outputs.map(outputToNb);
						base.execution_count = cell.executionCount;
					}
					return base;
				}),
				metadata: nb.metadata,
				nbformat: nb.nbformat,
				nbformat_minor: nb.nbformatMinor
			};
		}
		/** New cell factory. */
		function makeCell(type, source = "") {
			return {
				id: nextId(),
				type,
				source,
				outputs: [],
				executionCount: null,
				running: false
			};
		}
		//#endregion
		//#region src/client/jupyter/panel/highlight.ts
		/**
		* Lightweight Python syntax highlighter for code cells. Regex-based tokenizer
		* producing span-tagged HTML; good enough for notebook editing, no heavy deps.
		* @module dsh-jupyter/client/panel/highlight
		*/
		const KEYWORDS = /* @__PURE__ */ new Set([
			"and",
			"as",
			"assert",
			"async",
			"await",
			"break",
			"case",
			"class",
			"continue",
			"def",
			"del",
			"elif",
			"else",
			"except",
			"finally",
			"for",
			"from",
			"global",
			"if",
			"import",
			"in",
			"is",
			"lambda",
			"match",
			"nonlocal",
			"not",
			"or",
			"pass",
			"raise",
			"return",
			"try",
			"while",
			"with",
			"yield"
		]);
		const BUILTINS = /* @__PURE__ */ new Set([
			"abs",
			"all",
			"any",
			"ascii",
			"bin",
			"bool",
			"bytearray",
			"bytes",
			"callable",
			"chr",
			"classmethod",
			"compile",
			"complex",
			"delattr",
			"dict",
			"dir",
			"divmod",
			"enumerate",
			"eval",
			"exec",
			"filter",
			"float",
			"format",
			"frozenset",
			"getattr",
			"globals",
			"hasattr",
			"hash",
			"help",
			"hex",
			"id",
			"input",
			"int",
			"isinstance",
			"issubclass",
			"iter",
			"len",
			"list",
			"locals",
			"map",
			"max",
			"memoryview",
			"min",
			"next",
			"object",
			"oct",
			"open",
			"ord",
			"pow",
			"print",
			"property",
			"range",
			"repr",
			"reversed",
			"round",
			"set",
			"setattr",
			"slice",
			"sorted",
			"staticmethod",
			"str",
			"sum",
			"super",
			"tuple",
			"type",
			"vars",
			"zip",
			"__import__",
			"True",
			"False",
			"None",
			"self",
			"cls"
		]);
		/** Escape then wrap in a token span. */
		function tok(cls, text) {
			return `<span class="dshjp-tok-${cls}">${text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</span>`;
		}
		/** Token regex: comments, triple strings, strings, numbers, identifiers, ops. */
		const TOKEN_RE = /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?''')|("[^"\n]*"|'[^'\n]*')|\b(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|0x[0-9a-fA-F]+|0b[01]+)\b|(@[A-Za-z_]\w*)|(\b[A-Za-z_]\w*\b)|(\s+)|([^\sA-Za-z0-9_])/g;
		/** Highlight Python source into span-tagged HTML (input is escaped).
		* IDEA/PyCharm semantics: keywords and literals get their Darcula colors,
		* `def`/`class` definition names are yellow, `self`/`cls` are italic, and all
		* other identifiers stay the plain editor foreground (IDEA does not color
		* builtins or function calls). */
		function highlightPython(code) {
			let out = "";
			let last = 0;
			let prevWord = "";
			let match;
			TOKEN_RE.lastIndex = 0;
			while ((match = TOKEN_RE.exec(code)) !== null) {
				const [full, comment, triple, string, number, decorator, identifier, whitespace, op] = match;
				out += code.slice(last, match.index);
				if (comment !== void 0) out += tok("com", comment);
				else if (triple !== void 0) out += tok("str", triple);
				else if (string !== void 0) out += tok("str", string);
				else if (number !== void 0) out += tok("num", number);
				else if (decorator !== void 0) out += tok("dec", decorator);
				else if (identifier !== void 0) {
					const word = identifier;
					if (KEYWORDS.has(word)) {
						out += tok("kw", identifier);
						prevWord = word === "def" || word === "class" ? word : "";
					} else if (prevWord === "def" || prevWord === "class") {
						out += tok("fn", identifier);
						prevWord = "";
					} else if (word === "self" || word === "cls") out += tok("self", identifier);
					else if (BUILTINS.has(word)) out += tok("builtin", identifier);
					else out += tok("id", identifier);
				} else if (whitespace !== void 0) out += whitespace;
				else if (op !== void 0) out += tok("op", op);
				last = match.index + full.length;
			}
			out += code.slice(last);
			return out;
		}
		//#endregion
		//#region src/client/jupyter/panel/sanitize.ts
		/**
		* Minimal HTML sanitizer for kernel-produced HTML (rich outputs) and rendered
		* markdown. Strategy: parse with DOMParser, drop dangerous nodes/attributes,
		* serialize back. Anything the parser cannot handle is escaped instead.
		* @module dsh-jupyter/client/panel/sanitize
		*/
		/** Tags that are dropped entirely (with their subtree). */
		const DROP_TAGS = /* @__PURE__ */ new Set([
			"script",
			"style",
			"iframe",
			"object",
			"embed",
			"link",
			"meta",
			"base",
			"form",
			"input",
			"button",
			"textarea",
			"select",
			"option",
			"video",
			"audio",
			"source",
			"template"
		]);
		/** Tags allowed to keep only their text content (children stripped). */
		const TEXT_ONLY_TAGS = /* @__PURE__ */ new Set(["title"]);
		/** Tags allowed to survive as-is. */
		const ALLOWED_TAGS = /* @__PURE__ */ new Set([
			"a",
			"abbr",
			"b",
			"blockquote",
			"br",
			"code",
			"dd",
			"del",
			"details",
			"div",
			"dl",
			"dt",
			"em",
			"h1",
			"h2",
			"h3",
			"h4",
			"h5",
			"h6",
			"hr",
			"i",
			"img",
			"ins",
			"kbd",
			"li",
			"mark",
			"ol",
			"p",
			"pre",
			"q",
			"s",
			"samp",
			"small",
			"span",
			"strong",
			"sub",
			"summary",
			"sup",
			"table",
			"tbody",
			"td",
			"tfoot",
			"th",
			"thead",
			"tr",
			"u",
			"ul",
			"var"
		]);
		/** URL schemes allowed in href/src. */
		const SAFE_URL_RE = /^(https?:|mailto:|tel:|data:image\/|#|\/)/i;
		function isSafeUrl(value) {
			if (value === null || value === void 0) return false;
			const trimmed = value.trim();
			if (trimmed === "") return false;
			if (trimmed.startsWith("#")) return true;
			if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml)/i.test(trimmed)) return true;
			return SAFE_URL_RE.test(trimmed);
		}
		function sanitizeNode(node, out, doc) {
			if (node.nodeType === Node.TEXT_NODE) {
				out.appendChild(doc.createTextNode(node.textContent ?? ""));
				return;
			}
			if (node.nodeType !== Node.ELEMENT_NODE) return;
			const el = node;
			const tag = el.tagName.toLowerCase();
			if (DROP_TAGS.has(tag)) return;
			if (!ALLOWED_TAGS.has(tag)) {
				for (const child of Array.from(el.childNodes)) sanitizeNode(child, out, doc);
				return;
			}
			const copy = doc.createElement(tag);
			for (const attr of Array.from(el.attributes)) {
				const name = attr.name.toLowerCase();
				if (name.startsWith("on")) continue;
				if (name === "href" || name === "src" || name === "xlink:href") {
					if (isSafeUrl(attr.value)) copy.setAttribute(name, attr.value);
					continue;
				}
				if (name === "style") continue;
				if (name === "class") {
					const safe = attr.value.split(/\s+/).filter((c) => /^(highlight|output|ansi-|o-|jp-|dataframe|table)/i.test(c)).join(" ");
					if (safe !== "") copy.setAttribute("class", safe);
					continue;
				}
				copy.setAttribute(name, attr.value);
			}
			if (TEXT_ONLY_TAGS.has(tag)) {
				copy.textContent = el.textContent ?? "";
				out.appendChild(copy);
				return;
			}
			for (const child of Array.from(el.childNodes)) sanitizeNode(child, copy, doc);
			out.appendChild(copy);
		}
		/**
		* Sanitize a HTML string produced by the kernel or the markdown renderer.
		* Falls back to full escaping when DOMParser is unavailable.
		*/
		function sanitizeHtml(html) {
			if (typeof DOMParser === "undefined") return escapeHtml(html);
			try {
				const doc = new DOMParser().parseFromString(html, "text/html");
				const fragment = doc.createDocumentFragment();
				sanitizeNode(doc.body, fragment, doc);
				const container = doc.createElement("div");
				container.appendChild(fragment);
				return container.innerHTML;
			} catch {
				return escapeHtml(html);
			}
		}
		/** Escape HTML metacharacters. */
		function escapeHtml(value) {
			return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;").replaceAll("'", "&#39;");
		}
		/** Sanitize a URL attribute for rendered markdown links/images. */
		function sanitizeUrl(value) {
			return isSafeUrl(value) ? value : null;
		}
		//#endregion
		//#region src/client/jupyter/panel/markdown.ts
		/**
		* Compact, dependency-free Markdown renderer for notebook markdown cells.
		* The source is HTML-escaped first, then transformed into safe HTML; raw HTML
		* in the source is escaped, never executed. Link/image URLs are sanitized.
		* @module dsh-jupyter/client/panel/markdown
		*/
		/** Escape then render inline markdown (bold/italic/code/links/images/strike). */
		function renderInline(text) {
			let out = escapeHtml(text);
			out = out.replace(/`([^`\n]+)`/g, (_m, code) => `<code>${code}</code>`);
			out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_m, alt, url) => {
				const safe = sanitizeUrl(url);
				if (safe === null) return "";
				return `<img alt="${escapeHtml(alt)}" src="${escapeHtml(safe)}">`;
			});
			out = out.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_m, label, url) => {
				const safe = sanitizeUrl(url);
				if (safe === null) return escapeHtml(label);
				return `<a href="${escapeHtml(safe)}" rel="noopener noreferrer">${label}</a>`;
			});
			out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
			out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>");
			out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
			out = out.replace(/(^|[^_])_([^_\n]+)_/g, "$1<em>$2</em>");
			out = out.replace(/~~([^~]+)~~/g, "<del>$1</del>");
			return out;
		}
		/** Render a markdown cell source to a sanitized HTML string. */
		function renderMarkdown(source) {
			const lines = source.split(/\r?\n/);
			const out = [];
			let listType = null;
			let listOpen = false;
			let inCode = false;
			let codeLines = [];
			let inQuote = false;
			let quoteLines = [];
			let inTable = false;
			let tableRows = [];
			const closeList = () => {
				if (listOpen) {
					out.push(`</${listType}>`);
					listOpen = false;
					listType = null;
				}
			};
			const closeQuote = () => {
				if (inQuote) {
					out.push(`<blockquote>${quoteLines.map((l) => `<p>${renderInline(l)}</p>`).join("")}</blockquote>`);
					inQuote = false;
					quoteLines = [];
				}
			};
			const closeTable = () => {
				if (!inTable) return;
				const header = tableRows[0] ?? [];
				const body = tableRows.slice(1);
				let html = "<table><thead><tr>";
				for (let i = 0; i < header.length; i++) html += `<th>${renderInline(header[i] ?? "")}</th>`;
				html += "</tr></thead><tbody>";
				for (const row of body) {
					html += "<tr>";
					for (let i = 0; i < header.length; i++) html += `<td>${renderInline(row[i] ?? "")}</td>`;
					html += "</tr>";
				}
				html += "</tbody></table>";
				out.push(html);
				inTable = false;
				tableRows = [];
			};
			for (const raw of lines) {
				if (inCode) {
					if (/^```/.exec(raw.trim()) !== null) {
						inCode = false;
						out.push(`<pre><code>${codeLines.map(escapeHtml).join("\n")}</code></pre>`);
						codeLines = [];
					} else codeLines.push(raw);
					continue;
				}
				const fenceMatch = /^```(\S*)\s*$/.exec(raw.trim());
				if (fenceMatch !== null) {
					closeList();
					closeQuote();
					closeTable();
					inCode = true;
					fenceMatch[1];
					continue;
				}
				const trimmed = raw.trim();
				if (trimmed === "") {
					closeList();
					closeQuote();
					closeTable();
					continue;
				}
				const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
				if (heading !== null) {
					closeList();
					closeQuote();
					closeTable();
					const level = heading[1].length;
					out.push(`<h${level}>${renderInline(heading[2] ?? "")}</h${level}>`);
					continue;
				}
				if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
					closeList();
					closeQuote();
					closeTable();
					out.push("<hr>");
					continue;
				}
				const quote = /^>\s?(.*)$/.exec(raw);
				if (quote !== null) {
					closeList();
					closeTable();
					inQuote = true;
					quoteLines.push(quote[1] ?? "");
					continue;
				}
				const ul = /^[-*+]\s+(.*)$/.exec(raw);
				if (ul !== null) {
					closeQuote();
					closeTable();
					if (!listOpen || listType !== "ul") {
						closeList();
						out.push("<ul>");
						listOpen = true;
						listType = "ul";
					}
					out.push(`<li>${renderInline(ul[1] ?? "")}</li>`);
					continue;
				}
				const ol = /^\d+[.)]\s+(.*)$/.exec(raw);
				if (ol !== null) {
					closeQuote();
					closeTable();
					if (!listOpen || listType !== "ol") {
						closeList();
						out.push("<ol>");
						listOpen = true;
						listType = "ol";
					}
					out.push(`<li>${renderInline(ol[1] ?? "")}</li>`);
					continue;
				}
				const tableSep = /^\|?[\s:|-]+\|[\s:|-]*$/.test(trimmed) && trimmed.includes("|") && /^\|?(\s*:?-{2,}:?\s*\|)+\s*:?-{2,}:?\s*\|?\s*$/.test(trimmed);
				if (inTable && tableSep) continue;
				const tableRow = /^\|(.+)\|$/.exec(trimmed);
				const bareRow = trimmed.includes("|") ? trimmed.split("|").map((s) => s.trim()) : null;
				if (tableRow !== null || bareRow !== null) {
					const cells = tableRow !== null ? (tableRow[1] ?? "").split("|").map((s) => s.trim()) : bareRow ?? [];
					if (!inTable) {
						inTable = true;
						tableRows = [cells];
					} else tableRows.push(cells);
					continue;
				}
				closeList();
				closeQuote();
				closeTable();
				out.push(`<p>${renderInline(trimmed)}</p>`);
			}
			if (inCode) out.push(`<pre><code>${codeLines.map(escapeHtml).join("\n")}</code></pre>`);
			closeList();
			closeQuote();
			closeTable();
			return out.join("\n");
		}
		//#endregion
		//#region src/client/jupyter/panel/OutputView.tsx
		/**
		* Output renderer: turns one UiOutput into DOM. Rich MIME bundles pick
		* text/html (sanitized) > image/png/jpeg > application/json > text/plain;
		* errors render tracebacks; streams render as pre blocks.
		* @module dsh-jupyter/client/panel/OutputView
		*/
		function pickMime(data) {
			if (typeof data["text/html"] === "string") return {
				kind: "html",
				value: data["text/html"]
			};
			if (typeof data["text/markdown"] === "string") return {
				kind: "markdown",
				value: data["text/markdown"]
			};
			const image = typeof data["image/png"] === "string" ? data["image/png"] : typeof data["image/jpeg"] === "string" ? data["image/jpeg"] : void 0;
			if (image !== void 0) {
				const mime = typeof data["image/png"] === "string" ? "image/png" : "image/jpeg";
				return {
					kind: "image",
					value: image.startsWith("data:") ? image : `data:${mime};base64,${image}`
				};
			}
			if (data["application/json"] !== void 0) try {
				return {
					kind: "json",
					value: JSON.stringify(data["application/json"], null, 2)
				};
			} catch {
				return {
					kind: "json",
					value: String(data["application/json"])
				};
			}
			if (typeof data["text/plain"] === "string") return {
				kind: "text",
				value: data["text/plain"]
			};
			if (typeof data["text/latex"] === "string") return {
				kind: "latex",
				value: data["text/latex"]
			};
			return {
				kind: "text",
				value: JSON.stringify(Object.keys(data))
			};
		}
		function RichOutput({ data }) {
			const picked = (0, react.useMemo)(() => pickMime(data), [data]);
			if (picked === null) return null;
			if (picked.kind === "html") {
				const html = (0, react.useMemo)(() => sanitizeHtml(picked.value), [picked.value]);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "rich rich-html",
					dangerouslySetInnerHTML: { __html: html }
				});
			}
			if (picked.kind === "markdown") {
				const html = (0, react.useMemo)(() => renderMarkdown(picked.value), [picked.value]);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "rich",
					dangerouslySetInnerHTML: { __html: html }
				});
			}
			if (picked.kind === "image") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
				className: "rich-img",
				src: picked.value,
				alt: "kernel output"
			});
			if (picked.kind === "json") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", { children: picked.value });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", { children: picked.value });
		}
		/** Render one output. */
		function OutputView({ output }) {
			if (output.outputType === "stream") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: `dshjp-output stream-${output.name}`,
				children: output.text.split("\n").length > 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", { children: output.text }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", { children: output.text })
			});
			if (output.outputType === "error") {
				const text = output.traceback.length > 0 ? output.traceback.join("\n") : `${output.ename}: ${output.evalue}`;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dshjp-output error-out",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", { children: text })
				});
			}
			if (output.outputType === "execute_result") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dshjp-output",
				children: [output.executionCount !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "out-count",
					children: [
						"Out[",
						output.executionCount,
						"]"
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RichOutput, { data: output.data })]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dshjp-output",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RichOutput, { data: output.data })
			});
		}
		//#endregion
		//#region src/client/jupyter/locales.ts
		/**
		* dsh-jupyter surface copy: zh is the key source, en mirrors every key.
		*/
		const zh = {
			"entry.label": "Jupyter",
			"entry.tooltip": "Jupyter 笔记本（浏览 / 编辑 / 运行 .ipynb）",
			"panel.title": "Jupyter 笔记本",
			"panel.subtitle": "浏览工作区中的 .ipynb，编辑并运行单元格",
			"browser.empty": "当前工作区没有 .ipynb 文件。点击「新建笔记本」创建，或打开一个工作区。",
			"browser.noWorkspace": "没有可用的工作区。请先在 DSH 中打开一个项目工作区。",
			"browser.open": "打开",
			"browser.new": "新建笔记本",
			"browser.newPrompt": "笔记本名称（将创建于当前目录）：",
			"browser.refresh": "刷新",
			"browser.up": "上级目录",
			"browser.dir": "目录",
			"browser.notebook": "笔记本",
			"browser.workspace": "工作区",
			"browser.envOk": "Python 环境就绪",
			"browser.envMissing": "缺少执行环境：{detail}",
			"browser.envHint": "需要 Python 与 jupyter_client、ipykernel（pip install jupyter_client ipykernel）",
			"browser.openFailed": "打开笔记本失败：{error}",
			"editor.save": "保存",
			"editor.saved": "已保存",
			"editor.saveFailed": "保存失败：{error}",
			"editor.run": "运行",
			"editor.runAll": "全部运行",
			"editor.runAllHint": "按顺序运行所有代码单元格（遇错停止）",
			"editor.addBelow": "下方插入",
			"editor.delete": "删除单元格",
			"editor.moveUp": "上移",
			"editor.moveDown": "下移",
			"editor.convert": "切换 代码/Markdown",
			"editor.back": "返回列表",
			"editor.interrupt": "中断内核",
			"editor.restart": "重启内核",
			"editor.shutdown": "关闭内核",
			"editor.kernelReady": "内核就绪",
			"editor.kernelStarting": "内核启动中…",
			"editor.kernelIdle": "内核未启动",
			"editor.startKernel": "启动内核",
			"editor.kernelDead": "内核已退出：{reason}",
			"editor.kernelNoEnv": "执行环境不可用：{detail}",
			"editor.unsaved": "未保存",
			"editor.markdownEdit": "编辑 Markdown（双击预览切换）",
			"editor.codeHint": "代码单元格（Shift+Enter 运行并跳到下一格，Ctrl+Enter 运行）",
			"editor.clearOutputs": "清空输出",
			"editor.executing": "运行中…",
			"editor.execCount": "Out[{count}]",
			"editor.rawHint": "raw 单元格：内容原样保存，不参与执行",
			"output.empty": "（无输出）",
			"output.error": "执行出错",
			"status.busy": "运行中",
			"status.idle": "空闲",
			"status.connecting": "连接内核中…",
			"status.disconnected": "内核未连接",
			"error.transport": "无法访问插件接口（/api/dsh-explorer/jupyter）",
			"error.invalidNotebook": "无效的笔记本文件：{error}",
			"error.kernelFailed": "内核启动失败：{error}",
			"common.cancel": "取消",
			"common.close": "关闭",
			"common.loading": "加载中…",
			"common.error": "错误：{error}"
		};
		const en = {
			"entry.label": "Jupyter",
			"entry.tooltip": "Jupyter notebooks (browse / edit / run .ipynb)",
			"panel.title": "Jupyter Notebooks",
			"panel.subtitle": "Browse .ipynb files in your workspace, edit and run cells",
			"browser.empty": "No .ipynb files in the current workspace. Click “New notebook” to create one, or open a workspace.",
			"browser.noWorkspace": "No workspaces available. Open a project workspace in DSH first.",
			"browser.open": "Open",
			"browser.new": "New notebook",
			"browser.newPrompt": "Notebook name (created in the current directory):",
			"browser.refresh": "Refresh",
			"browser.up": "Up",
			"browser.dir": "Directory",
			"browser.notebook": "Notebook",
			"browser.workspace": "Workspace",
			"browser.envOk": "Python environment ready",
			"browser.envMissing": "Execution environment missing: {detail}",
			"browser.envHint": "Requires Python with jupyter_client and ipykernel (pip install jupyter_client ipykernel)",
			"browser.openFailed": "Failed to open notebook: {error}",
			"editor.save": "Save",
			"editor.saved": "Saved",
			"editor.saveFailed": "Save failed: {error}",
			"editor.run": "Run",
			"editor.runAll": "Run All",
			"editor.runAllHint": "Run every code cell in order (stops on error)",
			"editor.addBelow": "Add below",
			"editor.delete": "Delete cell",
			"editor.moveUp": "Move up",
			"editor.moveDown": "Move down",
			"editor.convert": "Code / Markdown",
			"editor.back": "Back to list",
			"editor.interrupt": "Interrupt kernel",
			"editor.restart": "Restart kernel",
			"editor.shutdown": "Shutdown kernel",
			"editor.kernelReady": "Kernel ready",
			"editor.kernelStarting": "Starting kernel…",
			"editor.kernelIdle": "Kernel not started",
			"editor.startKernel": "Start kernel",
			"editor.kernelDead": "Kernel exited: {reason}",
			"editor.kernelNoEnv": "Execution environment unavailable: {detail}",
			"editor.unsaved": "Unsaved",
			"editor.markdownEdit": "Edit Markdown (double-click to toggle preview)",
			"editor.codeHint": "Code cell (Shift+Enter runs and advances, Ctrl+Enter runs in place)",
			"editor.clearOutputs": "Clear outputs",
			"editor.executing": "Running…",
			"editor.execCount": "Out[{count}]",
			"editor.rawHint": "raw cell: content is stored as-is, not executed",
			"output.empty": "(no output)",
			"output.error": "Execution failed",
			"status.busy": "Busy",
			"status.idle": "Idle",
			"status.connecting": "Connecting to kernel…",
			"status.disconnected": "Kernel not connected",
			"error.transport": "Cannot reach the plugin API (/api/dsh-explorer/jupyter)",
			"error.invalidNotebook": "Invalid notebook file: {error}",
			"error.kernelFailed": "Kernel failed to start: {error}",
			"common.cancel": "Cancel",
			"common.close": "Close",
			"common.loading": "Loading…",
			"common.error": "Error: {error}"
		};
		/** Tiny interpolation: {name} -> value. */
		function t(dictionary, key, values) {
			let text = dictionary[key] ?? key;
			if (values !== void 0) for (const [name, value] of Object.entries(values)) text = text.replaceAll(`{${name}}`, String(value));
			return text;
		}
		//#endregion
		//#region src/client/jupyter/panel/helpers.ts
		/**
		* Shared panel helpers: the active-dictionary pick (document-language based,
		* task-board/ssh precedent) bound to the dsh-jupyter interpolator.
		* @module dsh-jupyter/client/panel/helpers
		*/
		/** Active dictionary, picked by the document language at call time. */
		function dictionary() {
			return (typeof document !== "undefined" ? document.documentElement.lang : "zh").toLowerCase().startsWith("en") ? { ...en } : { ...zh };
		}
		/** Translate a key with optional {name} template params (current language). */
		function tt(key, values) {
			return t(dictionary(), key, values);
		}
		/** Human-readable error text from an unknown thrown value. */
		function errorMessage(error) {
			if (error instanceof Error) return error.message;
			return String(error);
		}
		//#endregion
		//#region src/client/jupyter/panel/CellView.tsx
		/**
		* One notebook cell: code editor (syntax-highlighted textarea overlay),
		* rendered/editable markdown, outputs, and cell actions.
		* @module dsh-jupyter/client/panel/CellView
		*/
		/** A code editor with a highlighted overlay behind a transparent-text textarea. */
		function CodeEditor({ value, onChange, onRun, executing, kernelConnected }) {
			const taRef = (0, react.useRef)(null);
			const hlRef = (0, react.useRef)(null);
			const html = (0, react.useMemo)(() => highlightPython(value), [value]);
			const syncScroll = () => {
				const ta = taRef.current;
				const hl = hlRef.current;
				if (ta === null || hl === null) return;
				hl.scrollTop = ta.scrollTop;
				hl.scrollLeft = ta.scrollLeft;
			};
			const autoGrow = () => {
				const ta = taRef.current;
				if (ta === null) return;
				ta.style.height = "auto";
				ta.style.height = `${Math.min(480, Math.max(34, ta.scrollHeight))}px`;
				syncScroll();
			};
			(0, react.useEffect)(() => {
				autoGrow();
			}, [value]);
			const handleKeyDown = (event) => {
				if (event.key === "Enter" && (event.shiftKey || event.ctrlKey || event.metaKey)) {
					event.preventDefault();
					if (kernelConnected && !executing) onRun();
					return;
				}
				if (event.key === "Tab" && !event.shiftKey) {
					event.preventDefault();
					const ta = event.currentTarget;
					const start = ta.selectionStart;
					const end = ta.selectionEnd;
					onChange(value.slice(0, start) + "  " + value.slice(end));
					requestAnimationFrame(() => {
						ta.selectionStart = ta.selectionEnd = start + 2;
					});
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dshjp-code-editor",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
					ref: hlRef,
					className: "dshjp-code-highlight show",
					"aria-hidden": "true",
					dangerouslySetInnerHTML: { __html: html }
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
					ref: taRef,
					className: "dshjp-code-input",
					value,
					spellCheck: false,
					autoCapitalize: "off",
					autoComplete: "off",
					autoCorrect: "off",
					placeholder: tt("editor.codeHint"),
					onChange: (event) => {
						onChange(event.target.value);
					},
					onScroll: syncScroll,
					onKeyDown: handleKeyDown,
					onFocus: (event) => {
						event.currentTarget.select();
					}
				})]
			});
		}
		/** Rendered or editable markdown. */
		function MarkdownBody({ cell, onCommit }) {
			const [editing, setEditing] = (0, react.useState)(false);
			const [draft, setDraft] = (0, react.useState)(cell.source);
			const html = (0, react.useMemo)(() => renderMarkdown(cell.source), [cell.source]);
			(0, react.useEffect)(() => {
				if (!editing) setDraft(cell.source);
			}, [editing, cell.source]);
			if (editing) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
				className: "dshjp-md-editor",
				value: draft,
				spellCheck: false,
				autoFocus: true,
				onKeyDown: (event) => {
					if (event.key === "Escape") {
						event.preventDefault();
						setEditing(false);
					}
					if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
						event.preventDefault();
						onCommit(draft);
						setEditing(false);
					}
				},
				onChange: (event) => {
					setDraft(event.target.value);
				},
				onBlur: () => {
					if (draft !== cell.source) onCommit(draft);
					setEditing(false);
				}
			});
			if (cell.source.trim() === "") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dshjp-markdown",
				onDoubleClick: () => setEditing(true),
				style: { opacity: .55 },
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("em", { children: tt("editor.markdownEdit") })
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dshjp-markdown",
				onDoubleClick: () => setEditing(true),
				dangerouslySetInnerHTML: { __html: html }
			});
		}
		/** One cell block. */
		function CellView(props) {
			const { cell, index, total, selected, executing, kernelConnected } = props;
			const cellClass = [
				"dshjp-cell",
				selected ? "selected" : "",
				executing ? "running" : ""
			].filter(Boolean).join(" ");
			const run = () => {
				if (kernelConnected && !executing) props.onRun(cell.id);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: cellClass,
				"data-cell-id": cell.id,
				onClick: props.onSelect,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "dshjp-cell-gutter" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dshjp-cell-header",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dshjp-cell-type",
								children: cell.type
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dshjp-cell-actions",
								children: [
									cell.type === "code" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dshjp-cell-action",
										disabled: !kernelConnected || executing,
										onClick: (e) => {
											e.stopPropagation();
											run();
										},
										children: executing ? tt("editor.executing") : tt("editor.run")
									}),
									cell.type === "code" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dshjp-cell-action",
										disabled: cell.outputs.length === 0,
										onClick: (e) => {
											e.stopPropagation();
											props.onClearOutputs(cell.id);
										},
										children: tt("editor.clearOutputs")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dshjp-cell-action",
										onClick: (e) => {
											e.stopPropagation();
											props.onConvert(cell.id);
										},
										children: tt("editor.convert")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dshjp-cell-action",
										onClick: (e) => {
											e.stopPropagation();
											props.onAddBelow(cell.id);
										},
										children: tt("editor.addBelow")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dshjp-cell-action",
										disabled: index === 0,
										onClick: (e) => {
											e.stopPropagation();
											props.onMove(cell.id, -1);
										},
										children: "↑"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dshjp-cell-action",
										disabled: index === total - 1,
										onClick: (e) => {
											e.stopPropagation();
											props.onMove(cell.id, 1);
										},
										children: "↓"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dshjp-cell-action",
										onClick: (e) => {
											e.stopPropagation();
											props.onDelete(cell.id);
										},
										children: "✕"
									})
								]
							}),
							cell.type === "code" && cell.executionCount !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "dshjp-cell-count",
								children: [
									"[",
									cell.executionCount,
									"]"
								]
							})
						]
					}),
					cell.type === "code" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CodeEditor, {
						value: cell.source,
						onChange: (source) => props.onChange(cell.id, source),
						onRun: () => props.onRun(cell.id),
						executing,
						kernelConnected
					}),
					cell.type === "markdown" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MarkdownBody, {
						cell,
						onCommit: (source) => props.onChange(cell.id, source)
					}),
					cell.type === "raw" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dshjp-markdown",
						style: { opacity: .8 },
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
							style: {
								whiteSpace: "pre-wrap",
								margin: 0,
								fontFamily: "inherit"
							},
							children: cell.source || tt("editor.rawHint")
						})
					}),
					cell.type === "code" && cell.outputs.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dshjp-outputs",
						children: cell.outputs.map((output, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OutputView, { output }, i))
					})
				]
			});
		}
		//#endregion
		//#region src/client/jupyter/panel/editorReducer.ts
		/**
		* Editor state reducer: the UI notebook document plus kernel lifecycle, with
		* kernel-event application (streams, rich outputs, errors, replies).
		* @module dsh-jupyter/client/panel/editorReducer
		*/
		function findIndex(nb, id) {
			return nb.cells.findIndex((cell) => cell.id === id);
		}
		/** Append a stream chunk, merging with the previous same-name stream output. */
		function appendOutput(cell, output) {
			if (output.outputType === "stream") {
				const last = cell.outputs[cell.outputs.length - 1];
				if (last !== void 0 && last.outputType === "stream" && last.name === output.name) return {
					...cell,
					outputs: [...cell.outputs.slice(0, -1), {
						...last,
						text: last.text + output.text
					}]
				};
			}
			return {
				...cell,
				outputs: [...cell.outputs, output]
			};
		}
		function patchCell(nb, id, patch) {
			const index = findIndex(nb, id);
			if (index === -1) return nb;
			const cells = [...nb.cells];
			cells[index] = patch(cells[index]);
			return {
				...nb,
				cells,
				dirty: true
			};
		}
		/** Apply one kernel event to the document (pure). */
		function applyKernelEvent(state, event) {
			let nb = state.nb;
			const cellId = event.cell_id ?? null;
			if (event.type === "ready") return {
				...state,
				kernel: "ready",
				kernelReason: "",
				kernelError: null
			};
			if (event.type === "status") {
				const running = event.execution_state === "busy";
				if (cellId !== null && cellId !== void 0) nb = patchCell(nb, cellId, (cell) => ({
					...cell,
					running
				}));
				else if (state.executingId !== null) nb = patchCell(nb, state.executingId, (cell) => ({
					...cell,
					running
				}));
				return {
					...state,
					nb
				};
			}
			if (event.type === "stream") {
				if (cellId === null || cellId === void 0) return state;
				nb = patchCell(nb, cellId, (cell) => appendOutput(cell, {
					outputType: "stream",
					name: event.name,
					text: event.text
				}));
				return {
					...state,
					nb
				};
			}
			if (event.type === "display_data" || event.type === "update_display_data") {
				if (cellId === null || cellId === void 0) return state;
				nb = patchCell(nb, cellId, (cell) => appendOutput(cell, {
					outputType: "display_data",
					data: event.data,
					metadata: event.metadata ?? {}
				}));
				return {
					...state,
					nb
				};
			}
			if (event.type === "execute_result") {
				if (cellId === null || cellId === void 0) return state;
				nb = patchCell(nb, cellId, (cell) => ({
					...appendOutput(cell, {
						outputType: "execute_result",
						data: event.data,
						metadata: event.metadata ?? {},
						executionCount: event.execution_count
					}),
					executionCount: event.execution_count,
					running: false
				}));
				return {
					...state,
					nb
				};
			}
			if (event.type === "error") {
				if (cellId === null || cellId === void 0) return state;
				nb = patchCell(nb, cellId, (cell) => ({
					...appendOutput(cell, {
						outputType: "error",
						ename: event.ename,
						evalue: event.evalue,
						traceback: event.traceback
					}),
					running: false
				}));
				return {
					...state,
					nb
				};
			}
			if (event.type === "clear_output") {
				if (cellId === null || cellId === void 0) return state;
				nb = patchCell(nb, cellId, (cell) => ({
					...cell,
					outputs: []
				}));
				return {
					...state,
					nb
				};
			}
			if (event.type === "execute_reply") {
				if (cellId !== null && cellId !== void 0) nb = patchCell(nb, cellId, (cell) => ({
					...cell,
					running: false,
					executionCount: event.execution_count ?? cell.executionCount
				}));
				return {
					...state,
					nb,
					executingId: null
				};
			}
			if (event.type === "kernel_died") return {
				...state,
				kernel: "dead",
				kernelReason: event.message,
				executingId: null,
				runQueue: []
			};
			if (event.type === "log") return state;
			return state;
		}
		/** Main reducer. */
		function editorReducer(state, action) {
			switch (action.type) {
				case "load": return {
					...state,
					nb: action.nb,
					loadError: null,
					selectedId: action.nb.cells[0]?.id ?? null
				};
				case "loadError": return {
					...state,
					loadError: action.error
				};
				case "kernelPhase": return {
					...state,
					kernel: action.phase,
					kernelReason: action.reason ?? state.kernelReason
				};
				case "kernelError": return {
					...state,
					kernelError: action.message,
					kernel: "dead"
				};
				case "event": return applyKernelEvent(state, action.event);
				case "setSource": {
					const index = findIndex(state.nb, action.id);
					if (index === -1) return state;
					const cells = [...state.nb.cells];
					cells[index] = {
						...cells[index],
						source: action.source
					};
					return {
						...state,
						nb: {
							...state.nb,
							cells,
							dirty: true
						}
					};
				}
				case "convert": {
					const index = findIndex(state.nb, action.id);
					if (index === -1) return state;
					const cell = state.nb.cells[index];
					const next = (cell.type === "code" ? "markdown" : "code") === "code" ? {
						...cell,
						type: "code",
						outputs: cell.type === "code" ? cell.outputs : [],
						executionCount: cell.type === "code" ? cell.executionCount : null,
						running: false
					} : {
						...cell,
						type: "markdown",
						outputs: [],
						executionCount: null,
						running: false
					};
					const cells = [...state.nb.cells];
					cells[index] = next;
					return {
						...state,
						nb: {
							...state.nb,
							cells,
							dirty: true
						}
					};
				}
				case "addCell": {
					const index = Math.max(0, Math.min(state.nb.cells.length, action.index));
					const cells = [...state.nb.cells];
					cells.splice(index, 0, makeCell(action.cellType));
					return {
						...state,
						nb: {
							...state.nb,
							cells,
							dirty: true
						},
						selectedId: cells[index].id
					};
				}
				case "deleteCell": {
					const index = findIndex(state.nb, action.id);
					if (index === -1) return state;
					const cells = state.nb.cells.filter((cell) => cell.id !== action.id);
					const selectedId = state.selectedId === action.id ? cells[Math.min(index, cells.length - 1)]?.id ?? null : state.selectedId;
					return {
						...state,
						nb: {
							...state.nb,
							cells,
							dirty: true
						},
						selectedId
					};
				}
				case "moveCell": {
					const index = findIndex(state.nb, action.id);
					const target = index + action.dir;
					if (index === -1 || target < 0 || target >= state.nb.cells.length) return state;
					const cells = [...state.nb.cells];
					const [moved] = cells.splice(index, 1);
					cells.splice(target, 0, moved);
					return {
						...state,
						nb: {
							...state.nb,
							cells,
							dirty: true
						}
					};
				}
				case "select": return {
					...state,
					selectedId: action.id
				};
				case "clearOutputs": {
					const index = findIndex(state.nb, action.id);
					if (index === -1) return state;
					const cells = [...state.nb.cells];
					cells[index] = {
						...cells[index],
						outputs: []
					};
					return {
						...state,
						nb: {
							...state.nb,
							cells,
							dirty: true
						}
					};
				}
				case "beginExecute": {
					const index = findIndex(state.nb, action.id);
					if (index === -1) return state;
					const cells = [...state.nb.cells];
					cells[index] = {
						...cells[index],
						running: true
					};
					return {
						...state,
						nb: {
							...state.nb,
							cells
						},
						executingId: action.id,
						kernelError: null
					};
				}
				case "endExecute": {
					const index = findIndex(state.nb, action.id);
					if (index === -1) return {
						...state,
						executingId: null
					};
					const cells = [...state.nb.cells];
					cells[index] = {
						...cells[index],
						running: false
					};
					return {
						...state,
						nb: {
							...state.nb,
							cells
						},
						executingId: null
					};
				}
				case "setExecuting": return {
					...state,
					executingId: action.id
				};
				case "markSaved": return {
					...state,
					nb: {
						...state.nb,
						dirty: false
					},
					savedTick: Date.now()
				};
				default: return state;
			}
		}
		/** Create the initial editor state. The kernel starts idle — it is connected
		* lazily on the first run or an explicit "start kernel" click. */
		function initialEditorState(path) {
			return {
				nb: {
					cells: [],
					metadata: {},
					nbformat: 4,
					nbformatMinor: 5,
					dirty: false
				},
				kernel: "idle",
				kernelReason: "",
				executingId: null,
				runQueue: [],
				selectedId: null,
				loadError: null,
				kernelError: null,
				savedTick: 0
			};
		}
		//#endregion
		//#region src/client/jupyter/panel/EditorView.tsx
		/**
		* Notebook editor: toolbar, kernel WebSocket lifecycle, run queue, and the
		* cell list. Owns the reducer state and the runner refs.
		* @module dsh-jupyter/client/panel/EditorView
		*/
		function EditorView({ path, api, onBack }) {
			const [state, dispatch] = (0, react.useReducer)(editorReducer, path, initialEditorState);
			const [saving, setSaving] = (0, react.useState)(false);
			const [saveError, setSaveError] = (0, react.useState)(null);
			const [savedFlash, setSavedFlash] = (0, react.useState)(false);
			const [envDetail, setEnvDetail] = (0, react.useState)(null);
			const wsRef = (0, react.useRef)(null);
			const runnerRef = (0, react.useRef)({
				queue: [],
				inFlight: null
			});
			const pendingRunRef = (0, react.useRef)(null);
			const stateRef = (0, react.useRef)(state);
			stateRef.current = state;
			const cellsByCode = (0, react.useMemo)(() => state.nb.cells.filter((cell) => cell.type === "code"), [state.nb.cells]);
			/** Pump the run queue: send the next queued execution if idle. */
			const pump = (0, react.useCallback)(() => {
				const runner = runnerRef.current;
				if (runner.inFlight !== null || runner.queue.length === 0) return;
				const ws = wsRef.current;
				if (ws === null || ws.readyState() !== 1) return;
				const id = runner.queue.shift();
				const cells = stateRef.current.nb.cells;
				const index = cells.findIndex((c) => c.id === id);
				const cell = cells[index];
				if (cell === void 0) {
					pump();
					return;
				}
				runner.inFlight = id;
				dispatch({
					type: "beginExecute",
					id
				});
				ws.send({
					type: "execute",
					cellId: id,
					code: cell.source,
					index
				});
			}, []);
			/** Queue cell ids for execution (run / run all). */
			const requestRun = (0, react.useCallback)((ids) => {
				const existing = new Set(stateRef.current.nb.cells.filter((c) => c.type === "code").map((c) => c.id));
				const runner = runnerRef.current;
				for (const id of ids) if (existing.has(id) && !runner.queue.includes(id)) runner.queue.push(id);
				pump();
			}, [pump]);
			(0, react.useCallback)(() => {
				requestRun(stateRef.current.nb.cells.filter((c) => c.type === "code").map((c) => c.id));
			}, [requestRun]);
			const interrupt = (0, react.useCallback)(() => {
				runnerRef.current.queue = [];
				runnerRef.current.inFlight = null;
				wsRef.current?.send({ type: "interrupt" });
				dispatch({
					type: "setExecuting",
					id: null
				});
				const index = stateRef.current.nb.cells.findIndex((c) => c.running);
				if (index !== -1) dispatch({
					type: "endExecute",
					id: stateRef.current.nb.cells[index].id,
					ok: false
				});
			}, []);
			const restart = (0, react.useCallback)(() => {
				runnerRef.current.queue = [];
				runnerRef.current.inFlight = null;
				wsRef.current?.send({ type: "restart" });
				dispatch({
					type: "kernelPhase",
					phase: "starting",
					reason: ""
				});
				dispatch({
					type: "setExecuting",
					id: null
				});
			}, []);
			const shutdown = (0, react.useCallback)(() => {
				runnerRef.current.queue = [];
				runnerRef.current.inFlight = null;
				wsRef.current?.send({ type: "shutdown" });
				dispatch({
					type: "kernelPhase",
					phase: "dead",
					reason: "shutdown"
				});
				dispatch({
					type: "setExecuting",
					id: null
				});
			}, []);
			/** Save the current document back to disk. */
			const save = (0, react.useCallback)(async () => {
				const nb = stateRef.current.nb;
				setSaveError(null);
				setSaving(true);
				try {
					await api.saveNotebook(path, notebookToJson(nb));
					dispatch({ type: "markSaved" });
					setSavedFlash(true);
					setTimeout(() => setSavedFlash(false), 1200);
				} catch (error) {
					setSaveError(errorMessage(error));
				} finally {
					setSaving(false);
				}
			}, [api, path]);
			/** Open (or re-open) the kernel socket and wire the frame handlers. */
			const attachKernel = (0, react.useCallback)(() => {
				const ws = api.connectKernel(path);
				ws.onFrame = (frame) => {
					if (frame.type === "kernel_state") {
						if (frame.running && frame.ready) dispatch({
							type: "kernelPhase",
							phase: "ready"
						});
						else if (frame.running) dispatch({
							type: "kernelPhase",
							phase: "starting"
						});
						else dispatch({
							type: "kernelPhase",
							phase: "dead",
							reason: frame.reason ?? "kernel not running"
						});
						return;
					}
					if (frame.type === "kernel_error") {
						dispatch({
							type: "kernelError",
							message: frame.message
						});
						setEnvDetail(frame.message);
						return;
					}
					const event = frame.event;
					dispatch({
						type: "event",
						event
					});
					if (event.type === "execute_reply") {
						const runner = runnerRef.current;
						runner.inFlight = null;
						dispatch({
							type: "endExecute",
							id: event.cell_id ?? "",
							ok: event.ok
						});
						if (!event.ok) runner.queue = [];
						else pump();
						if (runner.inFlight === null && runner.queue.length === 0) setTimeout(() => void save(), 0);
					}
				};
				ws.onClose = (reason) => {
					const runner = runnerRef.current;
					runner.inFlight = null;
					runner.queue = [];
					dispatch({
						type: "kernelPhase",
						phase: "dead",
						reason: reason ?? "connection closed"
					});
				};
				wsRef.current = ws;
				return ws;
			}, [
				api,
				path,
				pump,
				save
			]);
			/**
			* Lazy kernel start: connect the kernel socket on demand (host starts the
			* Python bridge on the first WebSocket attach) instead of on editor mount.
			*/
			const ensureKernel = (0, react.useCallback)(() => {
				const existing = wsRef.current;
				if (existing !== null && existing.readyState() === 1) return;
				try {
					existing?.close();
				} catch {}
				attachKernel();
				dispatch({
					type: "kernelPhase",
					phase: "connecting"
				});
			}, [attachKernel]);
			/** Run now if the kernel is ready; otherwise start it and run once ready. */
			const requestRunLazy = (0, react.useCallback)((ids) => {
				if (stateRef.current.kernel === "ready") {
					requestRun(ids);
					return;
				}
				pendingRunRef.current = ids;
				ensureKernel();
			}, [requestRun, ensureKernel]);
			(0, react.useEffect)(() => {
				if (state.kernel === "ready" && pendingRunRef.current !== null) {
					const ids = pendingRunRef.current;
					pendingRunRef.current = null;
					requestRun(ids);
				}
			}, [state.kernel, requestRun]);
			(0, react.useEffect)(() => {
				let disposed = false;
				(async () => {
					try {
						const raw = await api.readNotebook(path);
						if (disposed) return;
						dispatch({
							type: "load",
							nb: notebookFromJson(raw)
						});
					} catch (error) {
						if (!disposed) dispatch({
							type: "loadError",
							error: errorMessage(error)
						});
					}
				})();
				return () => {
					disposed = true;
					const ws = wsRef.current;
					if (ws !== null) {
						try {
							ws.close();
						} catch {}
						wsRef.current = null;
					}
				};
			}, [path, api]);
			(0, react.useEffect)(() => {
				let disposed = false;
				api.kernelStatus(path).then((kernel) => {
					if (disposed || !kernel.running || !kernel.ready) return;
					const existing = wsRef.current;
					if (existing !== null && existing.readyState() === 1) return;
					attachKernel();
					dispatch({
						type: "kernelPhase",
						phase: "connecting"
					});
				}).catch(() => {});
				return () => {
					disposed = true;
				};
			}, [
				path,
				api,
				attachKernel
			]);
			(0, react.useEffect)(() => {
				let disposed = false;
				api.env().then((report) => {
					if (disposed) return;
					if (!report.python.ok) setEnvDetail(report.python.error);
					else if (!report.jupyter.ok) setEnvDetail(report.jupyter.error);
					else setEnvDetail(null);
				}).catch(() => {});
				return () => {
					disposed = true;
				};
			}, [api]);
			(0, react.useEffect)(() => {
				const onKey = (event) => {
					if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
						event.preventDefault();
						save();
					}
				};
				window.addEventListener("keydown", onKey);
				return () => window.removeEventListener("keydown", onKey);
			}, [save]);
			const selected = state.selectedId;
			const selectedCode = state.nb.cells.find((c) => c.id === selected && c.type === "code");
			const kernelClass = state.kernel === "ready" ? "ok" : state.kernel === "starting" || state.kernel === "connecting" ? "busy" : state.kernel === "dead" ? "err" : "off";
			const kernelLabel = state.kernel === "ready" ? tt("editor.kernelReady") : state.kernel === "starting" || state.kernel === "connecting" ? tt("editor.kernelStarting") : state.kernel === "dead" ? tt("editor.kernelDead", { reason: state.kernelReason || "?" }) : tt("editor.kernelIdle");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dshjp-panel",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dshjp-header",
						children: [
							onBack !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "dshjp-btn",
								onClick: onBack,
								children: ["← ", tt("editor.back")]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								className: "dshjp-title",
								title: path,
								children: path.split(/[\\/]/).pop()
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dshjp-filename",
								children: state.nb.dirty ? tt("editor.unsaved") : ""
							})
						]
					}),
					state.loadError !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dshjp-banner err",
						children: tt("error.invalidNotebook", { error: state.loadError })
					}),
					envDetail !== null && state.kernel !== "ready" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dshjp-banner warn",
						children: tt("editor.kernelNoEnv", { detail: envDetail })
					}),
					state.kernelError !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dshjp-banner err",
						children: tt("error.kernelFailed", { error: state.kernelError })
					}),
					state.kernel === "dead" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dshjp-banner err",
						children: [tt("editor.kernelDead", { reason: state.kernelReason || "?" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dshjp-btn",
							style: { marginLeft: 8 },
							onClick: ensureKernel,
							children: "↻"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dshjp-toolbar",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "dshjp-btn primary",
								disabled: selectedCode === void 0,
								onClick: () => {
									if (selectedCode !== void 0) requestRunLazy([selectedCode.id]);
								},
								children: ["▶ ", tt("editor.run")]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dshjp-btn",
								disabled: cellsByCode.length === 0,
								title: tt("editor.runAllHint"),
								onClick: () => requestRunLazy(cellsByCode.map((c) => c.id)),
								children: tt("editor.runAll")
							}),
							state.kernel !== "ready" && state.kernel !== "starting" && state.kernel !== "connecting" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "dshjp-btn primary",
								onClick: ensureKernel,
								children: ["⚡ ", tt("editor.startKernel")]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "sep" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "dshjp-btn",
								onClick: () => dispatch({
									type: "addCell",
									index: state.nb.cells.findIndex((c) => c.id === selected) + 1 || state.nb.cells.length,
									cellType: "code"
								}),
								children: ["+ ", tt("editor.addBelow")]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dshjp-btn",
								onClick: () => {
									if (selected !== null) dispatch({
										type: "deleteCell",
										id: selected
									});
								},
								children: tt("editor.delete")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "sep" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "dshjp-btn",
								disabled: state.kernel !== "ready" && state.kernel !== "starting",
								onClick: interrupt,
								children: ["■ ", tt("editor.interrupt")]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "dshjp-btn",
								disabled: state.kernel !== "ready" && state.kernel !== "starting",
								onClick: restart,
								children: ["↻ ", tt("editor.restart")]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "dshjp-btn",
								disabled: state.kernel === "dead",
								onClick: shutdown,
								children: ["⏻ ", tt("editor.shutdown")]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "spacer" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: `dshjp-status-badge ${kernelClass}`,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dot" }),
									state.kernel === "connecting" || state.kernel === "starting" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dshjp-spinner" }) : null,
									kernelLabel
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "sep" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "dshjp-btn primary",
								disabled: saving,
								onClick: () => void save(),
								children: [
									saving ? "…" : savedFlash ? "✓" : "💾",
									" ",
									tt("editor.save")
								]
							})
						]
					}),
					saveError !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dshjp-banner err",
						children: tt("editor.saveFailed", { error: saveError })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dshjp-body",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dshjp-scroll",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dshjp-cells",
								children: [state.nb.cells.map((cell, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CellView, {
									cell,
									index,
									total: state.nb.cells.length,
									selected: cell.id === state.selectedId,
									executing: cell.id === state.executingId,
									kernelConnected: state.kernel === "ready",
									onSelect: () => dispatch({
										type: "select",
										id: cell.id
									}),
									onRun: (id) => requestRun([id]),
									onChange: (id, source) => dispatch({
										type: "setSource",
										id,
										source
									}),
									onConvert: (id) => dispatch({
										type: "convert",
										id
									}),
									onDelete: (id) => dispatch({
										type: "deleteCell",
										id
									}),
									onMove: (id, dir) => dispatch({
										type: "moveCell",
										id,
										dir
									}),
									onAddBelow: (id) => {
										const index = state.nb.cells.findIndex((c) => c.id === id);
										dispatch({
											type: "addCell",
											index: index + 1,
											cellType: "code"
										});
									},
									onClearOutputs: (id) => dispatch({
										type: "clearOutputs",
										id
									})
								}, cell.id)), state.nb.cells.length === 0 && !state.loadError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "dshjp-empty",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "dshjp-btn primary",
										onClick: () => dispatch({
											type: "addCell",
											index: 0,
											cellType: "code"
										}),
										children: ["+ ", tt("editor.addBelow")]
									})
								})]
							})
						})
					})
				]
			});
		}
		//#endregion
		//#region src/client/NotebookView.tsx
		/**
		* The .ipynb file viewer: a full notebook editor (run / save / syntax
		* highlighting) rendered INLINE in the sidebar editor tab. Registered through
		* `ctx.betterSidebar.registerFileViewer` with `fetchStrategy: 'none'` — the
		* view loads the notebook and drives the kernel through its own
		* session-scoped JupyterApi (the host routes read/write under the session's
		* authoritative cwd).
		* @module dsh-better-sidebar-jupyter/client/NotebookView
		*/
		function NotebookView(props) {
			const { scope, path } = props;
			const api = (0, react.useMemo)(() => new JupyterApi(scope), [scope.sessionId, scope.cwd]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "dsh-bs-jp",
				style: {
					flex: 1,
					minHeight: 0,
					display: "flex",
					flexDirection: "column"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EditorView, {
					path,
					api
				})
			});
		}
		//#endregion
		//#region src/client/index.tsx
		/**
		* Client half of the dsh-better-sidebar Jupyter plugin: registers the .ipynb
		* file viewer through the `ctx.betterSidebar` service and injects the
		* notebook editor styles. The viewer renders the full notebook editor inline
		* in the sidebar editor tab; the host half (same package) owns the
		* session-scoped notebook/kernel routes.
		* @module dsh-better-sidebar-jupyter/client
		*/
		/** Services required before mounting: the betterSidebar registry (provided
		*  by dsh-better-sidebar's own client half). */
		const inject = ["betterSidebar"];
		/** Plugin body. */
		function apply(ctx) {
			const styleId = "dsh-better-sidebar-jupyter-styles";
			ctx.effect(() => {
				const existing = document.getElementById(styleId);
				if (existing !== null) existing.remove();
				const tag = document.createElement("style");
				tag.id = styleId;
				tag.setAttribute("data-plugin", "@dong-victor/dsh-better-sidebar-jupyter");
				tag.textContent = PANEL_CSS;
				document.head.appendChild(tag);
				return () => {
					document.getElementById(styleId)?.remove();
				};
			}, "dsh-better-sidebar-jupyter: styles");
			ctx.effect(() => ctx.betterSidebar.registerFileViewer({
				id: "dsh-better-sidebar:jupyter",
				title: () => "Jupyter Notebook",
				exts: ["ipynb"],
				priority: 10,
				fetchStrategy: "none",
				component: (props) => (0, react.createElement)(NotebookView, props)
			}), "dsh-better-sidebar-jupyter: ipynb viewer");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map