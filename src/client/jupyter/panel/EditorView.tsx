/**
 * Notebook editor: toolbar, kernel WebSocket lifecycle, run queue, and the
 * cell list. Owns the reducer state and the runner refs.
 * @module dsh-jupyter/client/panel/EditorView
 */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { JupyterApi, KernelConnection } from '../api.ts'
import { notebookFromJson, notebookToJson } from '../nbModel.ts'
import type { UiNotebook } from '../types.ts'
import { CellView } from './CellView.tsx'
import { editorReducer, initialEditorState } from './editorReducer.ts'
import { errorMessage, tt } from './helpers.ts'

export interface EditorViewProps {
  path: string
  api: JupyterApi
  /** Optional "back to list" affordance (center-panel context). Omitted in
   * the embedded standalone editor, where the hosting Explorer owns
   * navigation — no dead back button. */
  onBack?(): void
}

interface Runner {
  queue: string[]
  inFlight: string | null
}

export function EditorView({ path, api, onBack }: EditorViewProps): React.JSX.Element {
  const [state, dispatch] = useReducer(editorReducer, path, initialEditorState)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [envDetail, setEnvDetail] = useState<string | null>(null)

  const wsRef = useRef<KernelConnection | null>(null)
  const runnerRef = useRef<Runner>({ queue: [], inFlight: null })
  const pendingRunRef = useRef<string[] | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  const cellsByCode = useMemo(
    () => state.nb.cells.filter((cell) => cell.type === 'code'),
    [state.nb.cells],
  )

  /** Pump the run queue: send the next queued execution if idle. */
  const pump = useCallback(() => {
    const runner = runnerRef.current
    if (runner.inFlight !== null || runner.queue.length === 0) return
    const ws = wsRef.current
    if (ws === null || ws.readyState() !== 1) return
    const id = runner.queue.shift()!
    const cells = stateRef.current.nb.cells
    const index = cells.findIndex((c) => c.id === id)
    const cell = cells[index]
    if (cell === undefined) {
      pump()
      return
    }
    runner.inFlight = id
    dispatch({ type: 'beginExecute', id })
    // index lets the host write the background execution log into the right
    // cell even before stable ids are persisted to the file.
    ws.send({ type: 'execute', cellId: id, code: cell.source, index })
  }, [])

  /** Queue cell ids for execution (run / run all). */
  const requestRun = useCallback((ids: string[]) => {
    const existing = new Set(stateRef.current.nb.cells.filter((c) => c.type === 'code').map((c) => c.id))
    const runner = runnerRef.current
    for (const id of ids) {
      if (existing.has(id) && !runner.queue.includes(id)) runner.queue.push(id)
    }
    pump()
  }, [pump])

  const runAll = useCallback(() => {
    requestRun(stateRef.current.nb.cells.filter((c) => c.type === 'code').map((c) => c.id))
  }, [requestRun])

  const interrupt = useCallback(() => {
    runnerRef.current.queue = []
    runnerRef.current.inFlight = null
    wsRef.current?.send({ type: 'interrupt' })
    dispatch({ type: 'setExecuting', id: null })
    const index = stateRef.current.nb.cells.findIndex((c) => c.running)
    if (index !== -1) dispatch({ type: 'endExecute', id: stateRef.current.nb.cells[index]!.id, ok: false })
  }, [])

  const restart = useCallback(() => {
    runnerRef.current.queue = []
    runnerRef.current.inFlight = null
    wsRef.current?.send({ type: 'restart' })
    dispatch({ type: 'kernelPhase', phase: 'starting', reason: '' })
    dispatch({ type: 'setExecuting', id: null })
  }, [])

  const shutdown = useCallback(() => {
    runnerRef.current.queue = []
    runnerRef.current.inFlight = null
    wsRef.current?.send({ type: 'shutdown' })
    dispatch({ type: 'kernelPhase', phase: 'dead', reason: 'shutdown' })
    dispatch({ type: 'setExecuting', id: null })
  }, [])

  /** Save the current document back to disk. */
  const save = useCallback(async (): Promise<void> => {
    const nb: UiNotebook = stateRef.current.nb
    setSaveError(null)
    setSaving(true)
    try {
      await api.saveNotebook(path, notebookToJson(nb))
      dispatch({ type: 'markSaved' })
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1200)
    } catch (error) {
      setSaveError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }, [api, path])

  // ------------------------------------------------------------ lifecycle

  /** Open (or re-open) the kernel socket and wire the frame handlers. */
  const attachKernel = useCallback((): KernelConnection => {
    const ws = api.connectKernel(path)
    ws.onFrame = (frame) => {
      if (frame.type === 'kernel_state') {
        if (frame.running && frame.ready) dispatch({ type: 'kernelPhase', phase: 'ready' })
        else if (frame.running) dispatch({ type: 'kernelPhase', phase: 'starting' })
        else dispatch({ type: 'kernelPhase', phase: 'dead', reason: frame.reason ?? 'kernel not running' })
        return
      }
      if (frame.type === 'kernel_error') {
        dispatch({ type: 'kernelError', message: frame.message })
        setEnvDetail(frame.message)
        return
      }
      const event = frame.event
      dispatch({ type: 'event', event })
      if (event.type === 'execute_reply') {
        const runner = runnerRef.current
        runner.inFlight = null
        dispatch({ type: 'endExecute', id: event.cell_id ?? '', ok: event.ok })
        if (!event.ok) runner.queue = []
        else pump()
        // Auto-persist the execution log once the batch settles: the reducer
        // has applied the outputs by the time this macrotask runs, so saving
        // writes them (plus stable cell ids) back to the .ipynb — reopening
        // the notebook later still shows this run's output.
        if (runner.inFlight === null && runner.queue.length === 0) {
          setTimeout(() => void save(), 0)
        }
      }
    }
    ws.onClose = (reason) => {
      const runner = runnerRef.current
      runner.inFlight = null
      runner.queue = []
      dispatch({ type: 'kernelPhase', phase: 'dead', reason: reason ?? 'connection closed' })
    }
    wsRef.current = ws
    return ws
  }, [api, path, pump, save])

  /**
   * Lazy kernel start: connect the kernel socket on demand (host starts the
   * Python bridge on the first WebSocket attach) instead of on editor mount.
   */
  const ensureKernel = useCallback((): void => {
    const existing = wsRef.current
    if (existing !== null && existing.readyState() === 1) return
    try { existing?.close() } catch { /* already closed */ }
    attachKernel()
    dispatch({ type: 'kernelPhase', phase: 'connecting' })
  }, [attachKernel])

  /** Run now if the kernel is ready; otherwise start it and run once ready. */
  const requestRunLazy = useCallback((ids: string[]) => {
    if (stateRef.current.kernel === 'ready') {
      requestRun(ids)
      return
    }
    pendingRunRef.current = ids
    ensureKernel()
  }, [requestRun, ensureKernel])

  // Fire a run that was queued while the kernel was starting.
  useEffect(() => {
    if (state.kernel === 'ready' && pendingRunRef.current !== null) {
      const ids = pendingRunRef.current
      pendingRunRef.current = null
      requestRun(ids)
    }
  }, [state.kernel, requestRun])

  // Load the notebook once. The kernel is NOT connected here — it starts
  // lazily on the first run or an explicit "start kernel".
  useEffect(() => {
    let disposed = false
    void (async () => {
      try {
        const raw = await api.readNotebook(path)
        if (disposed) return
        dispatch({ type: 'load', nb: notebookFromJson(raw) })
      } catch (error) {
        if (!disposed) dispatch({ type: 'loadError', error: errorMessage(error) })
      }
    })()
    return () => {
      disposed = true
      const ws = wsRef.current
      if (ws !== null) {
        try { ws.close() } catch { /* already closed */ }
        wsRef.current = null
      }
    }
  }, [path, api])

  // Reopening a notebook whose kernel is still running in the background:
  // attach to it right away so execution state and any in-flight stream stay
  // live (the host keeps the kernel after the previous editor closed).
  useEffect(() => {
    let disposed = false
    void api.kernelStatus(path).then((kernel) => {
      if (disposed || !kernel.running || !kernel.ready) return
      const existing = wsRef.current
      if (existing !== null && existing.readyState() === 1) return
      attachKernel()
      dispatch({ type: 'kernelPhase', phase: 'connecting' })
    }).catch(() => { /* kernel not started yet — stay lazy */ })
    return () => { disposed = true }
  }, [path, api, attachKernel])

  // Env preflight (informational banner).
  useEffect(() => {
    let disposed = false
    void api.env().then((report) => {
      if (disposed) return
      if (!report.python.ok) setEnvDetail(report.python.error)
      else if (!report.jupyter.ok) setEnvDetail(report.jupyter.error)
      else setEnvDetail(null)
    }).catch(() => { /* silent */ })
    return () => { disposed = true }
  }, [api])

  // Ctrl+S / Cmd+S to save.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [save])

  // -------------------------------------------------------------- actions

  const selected = state.selectedId
  const selectedCode = state.nb.cells.find((c) => c.id === selected && c.type === 'code')

  const kernelClass = state.kernel === 'ready' ? 'ok'
    : state.kernel === 'starting' || state.kernel === 'connecting' ? 'busy'
      : state.kernel === 'dead' ? 'err' : 'off'
  const kernelLabel = state.kernel === 'ready' ? tt('editor.kernelReady')
    : state.kernel === 'starting' || state.kernel === 'connecting' ? tt('editor.kernelStarting')
      : state.kernel === 'dead' ? tt('editor.kernelDead', { reason: state.kernelReason || '?' })
        : tt('editor.kernelIdle')

  return (
    <div className="dshjp-panel">
      <div className="dshjp-header">
        {onBack !== undefined && (
          <button type="button" className="dshjp-btn" onClick={onBack}>← {tt('editor.back')}</button>
        )}
        <h2 className="dshjp-title" title={path}>{path.split(/[\\/]/).pop()}</h2>
        <span className="dshjp-filename">{state.nb.dirty ? tt('editor.unsaved') : ''}</span>
      </div>

      {state.loadError !== null && (
        <div className="dshjp-banner err">{tt('error.invalidNotebook', { error: state.loadError })}</div>
      )}
      {envDetail !== null && state.kernel !== 'ready' && (
        <div className="dshjp-banner warn">{tt('editor.kernelNoEnv', { detail: envDetail })}</div>
      )}
      {state.kernelError !== null && (
        <div className="dshjp-banner err">{tt('error.kernelFailed', { error: state.kernelError })}</div>
      )}
      {state.kernel === 'dead' && (
        <div className="dshjp-banner err">
          {tt('editor.kernelDead', { reason: state.kernelReason || '?' })}
          <button type="button" className="dshjp-btn" style={{ marginLeft: 8 }} onClick={ensureKernel}>↻</button>
        </div>
      )}

      <div className="dshjp-toolbar">
        <button type="button" className="dshjp-btn primary" disabled={selectedCode === undefined} onClick={() => { if (selectedCode !== undefined) requestRunLazy([selectedCode.id]) }}>
          ▶ {tt('editor.run')}
        </button>
        <button type="button" className="dshjp-btn" disabled={cellsByCode.length === 0} title={tt('editor.runAllHint')} onClick={() => requestRunLazy(cellsByCode.map((c) => c.id))}>
          {tt('editor.runAll')}
        </button>
        {state.kernel !== 'ready' && state.kernel !== 'starting' && state.kernel !== 'connecting' && (
          <button type="button" className="dshjp-btn primary" onClick={ensureKernel}>
            ⚡ {tt('editor.startKernel')}
          </button>
        )}
        <span className="sep" />
        <button type="button" className="dshjp-btn" onClick={() => dispatch({ type: 'addCell', index: (state.nb.cells.findIndex((c) => c.id === selected) + 1) || state.nb.cells.length, cellType: 'code' })}>
          + {tt('editor.addBelow')}
        </button>
        <button type="button" className="dshjp-btn" onClick={() => { if (selected !== null) dispatch({ type: 'deleteCell', id: selected }) }}>
          {tt('editor.delete')}
        </button>
        <span className="sep" />
        <button type="button" className="dshjp-btn" disabled={state.kernel !== 'ready' && state.kernel !== 'starting'} onClick={interrupt}>
          ■ {tt('editor.interrupt')}
        </button>
        <button type="button" className="dshjp-btn" disabled={state.kernel !== 'ready' && state.kernel !== 'starting'} onClick={restart}>
          ↻ {tt('editor.restart')}
        </button>
        <button type="button" className="dshjp-btn" disabled={state.kernel === 'dead'} onClick={shutdown}>
          ⏻ {tt('editor.shutdown')}
        </button>
        <span className="spacer" />
        <span className={`dshjp-status-badge ${kernelClass}`}>
          <span className="dot" />
          {state.kernel === 'connecting' || state.kernel === 'starting' ? <span className="dshjp-spinner" /> : null}
          {kernelLabel}
        </span>
        <span className="sep" />
        <button type="button" className="dshjp-btn primary" disabled={saving} onClick={() => void save()}>
          {saving ? '…' : savedFlash ? '✓' : '💾'} {tt('editor.save')}
        </button>
      </div>
      {saveError !== null && <div className="dshjp-banner err">{tt('editor.saveFailed', { error: saveError })}</div>}

      <div className="dshjp-body">
        <div className="dshjp-scroll">
          <div className="dshjp-cells">
            {state.nb.cells.map((cell, index) => (
              <CellView
                key={cell.id}
                cell={cell}
                index={index}
                total={state.nb.cells.length}
                selected={cell.id === state.selectedId}
                executing={cell.id === state.executingId}
                kernelConnected={state.kernel === 'ready'}
                onSelect={() => dispatch({ type: 'select', id: cell.id })}
                onRun={(id) => requestRun([id])}
                onChange={(id, source) => dispatch({ type: 'setSource', id, source })}
                onConvert={(id) => dispatch({ type: 'convert', id })}
                onDelete={(id) => dispatch({ type: 'deleteCell', id })}
                onMove={(id, dir) => dispatch({ type: 'moveCell', id, dir })}
                onAddBelow={(id) => {
                  const index = state.nb.cells.findIndex((c) => c.id === id)
                  dispatch({ type: 'addCell', index: index + 1, cellType: 'code' })
                }}
                onClearOutputs={(id) => dispatch({ type: 'clearOutputs', id })}
              />
            ))}
            {state.nb.cells.length === 0 && !state.loadError && (
              <div className="dshjp-empty">
                <button type="button" className="dshjp-btn primary" onClick={() => dispatch({ type: 'addCell', index: 0, cellType: 'code' })}>
                  + {tt('editor.addBelow')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
