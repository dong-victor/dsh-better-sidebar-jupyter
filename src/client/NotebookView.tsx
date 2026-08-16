/**
 * The .ipynb file viewer: a full notebook editor (run / save / syntax
 * highlighting) rendered INLINE in the sidebar editor tab. Registered through
 * `ctx.betterSidebar.registerFileViewer` with `fetchStrategy: 'none'` — the
 * view loads the notebook and drives the kernel through its own
 * session-scoped JupyterApi (the host routes read/write under the session's
 * authoritative cwd).
 * @module dsh-better-sidebar-jupyter/client/NotebookView
 */

import { useMemo } from 'react'
import { JupyterApi } from './jupyter/api.ts'
import { EditorView } from './jupyter/panel/EditorView.tsx'
import type { FileViewerProps } from 'dsh-better-sidebar/client/service'

export function NotebookView(props: FileViewerProps): React.ReactNode {
  const { scope, path } = props
  // One api per open notebook, bound to the session scope it belongs to (the
  // scope object is stable for the tab's lifetime).
  const api = useMemo(
    () => new JupyterApi(scope),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scope.sessionId, scope.cwd],
  )
  return (
    <div className="dsh-bs-jp" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <EditorView path={path} api={api} />
    </div>
  )
}
