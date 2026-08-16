/**
 * dsh-jupyter panel styles. Injected as one <style> tag by the client apply().
 * Scoped by the plugin's own data attributes; colors ride the dsh --dsw-*
 * tokens so the panel follows the active theme (light/dark and skins).
 * @module dsh-jupyter/client/panel/styles
 */

export const PANEL_CSS = /* css */ `
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

/* IDEA-style compact icon toolbar buttons. */
.dshjp-tbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 5px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  flex: none;
}

.dshjp-tbtn:hover { background: var(--dsw-specific-sidebar-nav-item-hover); color: var(--dsw-alias-label-primary); }
.dshjp-tbtn:disabled { opacity: .4; cursor: default; }
.dshjp-tbtn.primary { color: #4f8cff; }
.dshjp-tbtn.primary:hover { background: color-mix(in srgb, #4f8cff 18%, transparent); }

/* IDEA-style: the Stop/Interrupt button glows red while a cell is running. */
.dshjp-tbtn.stop-active {
  color: #ff6b6b;
  background: color-mix(in srgb, #dc2626 18%, transparent);
  animation: dshjp-pulse 1.2s infinite;
}
.dshjp-tbtn.stop-active:hover { background: color-mix(in srgb, #dc2626 30%, transparent); color: #ff8080; }

.dshjp-cell-type-select {
  height: 24px;
  padding: 0 4px;
  border-radius: 5px;
  border: 1px solid var(--dsw-specific-sidebar-nav-item-hover, rgba(128,128,128,.3));
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  cursor: pointer;
  flex: none;
}

.dshjp-kernel-name {
  font-family: var(--dsw-font-mono, ui-monospace, Menlo, Consolas, monospace);
  font-size: 11px;
  opacity: .8;
  margin-left: 2px;
}

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

/* IDEA-style gutter run button (green ▶, top-left of the cell). */
.dshjp-gutter-run {
  position: absolute;
  left: 4px;
  top: 7px;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #2e9e5b;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
}

.dshjp-cell:hover .dshjp-gutter-run, .dshjp-cell.selected .dshjp-gutter-run { opacity: 1; }
.dshjp-gutter-run:hover { background: color-mix(in srgb, #2e9e5b 22%, transparent); }
.dshjp-gutter-run:disabled { cursor: default; }
.dshjp-gutter-run.busy { color: #d97706; animation: dshjp-pulse 1s infinite; opacity: 1; }

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
.dshjp-cell-count { margin-left: auto; font-variant-numeric: tabular-nums; font-family: var(--dsw-font-mono, ui-monospace, Menlo, Consolas, monospace); }

/* Queued (run-all tail) cell indicator. */
.dshjp-cell-queued {
  font-size: 10.5px;
  color: var(--dsw-alias-label-tertiary, #8a8f98);
  border: 1px solid var(--dsw-specific-sidebar-nav-item-hover, rgba(128,128,128,.3));
  border-radius: 999px;
  padding: 0 6px;
  line-height: 1.5;
}

/* --- explorer "running notebook" green dot ------------------------------- */

/* A notebook whose kernel is alive gets a green dot; it pulses while a cell
   is executing. Inserted by the client poller next to the file name. */
.dshjp-file-dot {
  display: inline-block;
  flex: none;
  width: 8px;
  height: 8px;
  margin: 0 6px 0 4px;
  border-radius: 50%;
  background: #2e9e5b;
  align-self: center;
}
.dshjp-file-dot.busy {
  background: #2e9e5b;
  animation: dshjp-pulse 1s infinite;
}

/* IDEA-style execution duration in the lower-left corner of the cell. */
.dshjp-cell-duration {
  position: absolute;
  left: 8px;
  bottom: 4px;
  font-size: 10.5px;
  color: var(--dsw-alias-label-tertiary, #8a8f98);
  font-variant-numeric: tabular-nums;
  user-select: none;
  cursor: default;
}

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

/* IDEA-style collapsible traceback header. */
.dshjp-error-head {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  width: 100%;
  padding: 6px 10px;
  border: none;
  background: transparent;
  color: #fca5a5;
  font-family: var(--dsw-font-mono, ui-monospace, Menlo, Consolas, monospace);
  font-size: 12.5px;
  line-height: 1.5;
  text-align: left;
  cursor: pointer;
}

.dshjp-error-head:hover { background: color-mix(in srgb, #dc2626 14%, transparent); }
.dshjp-error-toggle { flex: none; font-size: 10px; line-height: 1.7; }
.dshjp-error-summary { word-break: break-word; white-space: pre-wrap; }
.dshjp-error-trace { max-height: 420px; overflow: auto; }

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
`
