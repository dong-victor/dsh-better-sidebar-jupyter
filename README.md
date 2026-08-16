# dsh-better-sidebar-jupyter

Jupyter notebook support for [dsh-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar):
`.ipynb` files open **inline in the sidebar editor** as a runnable notebook view —
Python syntax highlighting, cell execution through a lazy-start Python kernel
(`jupyter_client` + `ipykernel` via `python/bridge.py`), streaming outputs, and
save-back.

Merged from the Jupyter support of `@dong-victor/dsh-explorer`, adapted to the
better-sidebar plugin architecture: the viewer registers through the
`ctx.betterSidebar.registerFileViewer` service, and every route is
**session-scoped** — the notebook must live inside the conversation's working
directory.

## Requirements

- dsh-better-sidebar ≥ 0.13.0 (the `registerFileViewer` service)
- Python with `jupyter_client` and `ipykernel` for cell execution:
  `pip install jupyter_client ipykernel`

## Install

```sh
cd ~/.dsh && dsh plugin --profile web add @dong-victor/dsh-better-sidebar-jupyter
```

(or add it from the Side card settings → 文件预览 → “添加预览插件”.)

## What you get

- `.ipynb` opens in the sidebar editor (single-click in the explorer / any
  open-path flow), rendered by the inline notebook viewer.
- **IDEA/PyCharm-style run mode** — shortcuts and toolbar mirror IntelliJ's
  Jupyter support (Windows keymap):
  - `Ctrl+Enter` — run the current cell (stays in the cell for editing).
  - `Shift+Enter` — run the current cell **and select the cell below**; when
    there is no cell below, a new one is created (IDEA behavior).
  - `Ctrl+Alt+Shift+Enter` — run all code cells.
  - `Ctrl+F2` — interrupt the running kernel.
  - `Ctrl+Home` / `Ctrl+End` — move the caret to the start/end of the current
    cell; outside an editor, focus the first/last cell of the notebook.
  - `Ctrl/Cmd+S` — save.
- **IDEA toolbar**: ▶ Run cell and select below · ▶▶ Run all · ■ Interrupt ·
  ↻ Restart · ⏻ Shutdown · 🧹 Clear all outputs · ＋ Add cell below · ↑/↓ Move
  cell · cell-type selector (Code/Markdown/Raw) · ⇡/⇣ select above/below ·
  kernel status widget (state + kernel name) · save.
- **Per-cell IDEA affordances**: green ▶ gutter run button on every code cell
  (hover/selected), `In [n]` execution counter, `Out[n]` on results, and the
  **execution duration in the cell's lower-left corner** (hover shows the
  completion date/time). Error outputs render as **collapsible tracebacks**
  (IDEA-style summary row + expand toggle).
- Lazy kernel: the Python bridge starts on the first run — no startup cost for
  plain browsing. Kernels keep running in the background while the editor is
  closed, and finished executions are written back into the `.ipynb` file
  (run-all survives tab switches / session switches / reconnects). Reopening a
  notebook — or coming back after switching sessions — **re-syncs the whole
  batch**: the executing cell shows as running with its latest partial output,
  and the queued tail of a run-all batch shows as queued.
- **Explorer indicator**: notebooks whose kernel is alive get a **green dot**
  next to their file name in the sidebar file browser (pulsing while a cell
  executes), so a background run is visible even with the notebook closed.
- Syntax highlighting follows the app theme (IDEA/Darcula-style Python
  highlighting, `--dsw-*` tokens).

## Architecture

- `src/index.ts` (host half): mounts the fenced routes
  `/api/dsh-better-sidebar-jupyter/*` (env / notebook GET+PUT / kernel
  lifecycle) and the kernel WebSocket upgrade, with one `KernelManager` per
  notebook path. Every request carries `sessionId` (+ optional `cwd`) and a
  `path`; `src/host/gate.ts` requires the canonical path to live inside the
  session's authoritative working directory.
- `python/bridge.py`: a JSON-lines RPC shim that owns the real Jupyter kernel
  (all ZeroMQ handling stays in Python — no native ZMQ bindings in Node).
- `src/client/` (client half): the `.ipynb` file viewer (`NotebookView`) wraps
  the notebook editor UI (`EditorView` + cells + outputs), talking to the host
  through a session-scoped `JupyterApi`.

## Security

All routes pass the same browser-trust fence as the DSH `/api` gateway
(Host-header loopback or `trustedHosts`), and notebook paths are gated to the
session's cwd — a cross-site page cannot reach the kernel or read/write files
outside the conversation's directory.

## License

MIT
