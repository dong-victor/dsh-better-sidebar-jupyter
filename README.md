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
- Toolbar: run / run-all / add-below / delete cell / convert code↔markdown,
  kernel start / interrupt / restart / shutdown, and save (Ctrl/Cmd+S).
- Lazy kernel: the Python bridge starts on the first run — no startup cost for
  plain browsing. Kernels keep running in the background while the editor is
  closed, and finished executions are written back into the `.ipynb` file.
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
