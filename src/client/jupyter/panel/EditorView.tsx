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
import {
  clearAll,
  createRunQueue,
  enqueue,
  inFlight,
  isIdle,
  markDetached,
  markSent,
  markUnsent,
  onReply,
  remapCellId,
  resolveBusyCell,
  type RunQueue,
} from './runner.ts'

export interface EditorViewProps {
  path: string
  api: JupyterApi
  /** Optional "back to list" affordance (center-panel context). Omitted in
   * the embedded standalone editor, where the hosting Explorer owns
   * navigation — no dead back button. */
  onBack?(): void
}

/** Auto-reconnect backoff: 0.5s -> 1s -> 2s -> 4s -> capped at 5s. */
const RECONNECT_BASE_MS = 500
const RECONNECT_CAP_MS = 5000

interface ReconnectState {
  timer: number | null
  attempts: number
  disposed: boolean
}

export function EditorView({ path, api, onBack }: EditorViewProps): React.JSX.Element {
  const [state, dispatch] = useReducer(editorReducer, path, initialEditorState)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [envDetail, setEnvDetail] = useState<string | null>(null)

  const wsRef = useRef<KernelConnection | null>(null)
  // Run bookkeeping lives in a ref so it survives re-renders; pending cells
  // are owned by the host bridge, so a socket drop must NOT discard them.
  const runnerRef = useRef<RunQueue>(createRunQueue())
  const pendingRunRef = useRef<string[] | null>(null)
  const reconnectRef = useRef<ReconnectState>({ timer: null, attempts: 0, disposed: false })
  /** Resolves when the mount-time notebook load finishes (kernel attach is
   *  sequenced after it so replayed in-flight events land on real cells). */
  const loadPromiseRef = useRef<Promise<void> | null>(null)
  /** Host cell id -> local cell id, for a run started before a session
   *  switch whose ids no longer match this document (index fallback). */
  const remapRef = useRef<Map<string, string>>(new Map())
  /** True once the .ipynb has been saved with stable cell ids this mount. */
  const idsSavedRef = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state

  const cellsByCode = useMemo(
    () => state.nb.cells.filter((cell) => cell.type === 'code'),
    [state.nb.cells],
  )

  /**
   * Send every queued cell to the host in one batch. The bridge serializes
   * them and owns the queue, so a later disconnect cannot lose them — they
   * keep executing (and persist into the .ipynb) even while no browser is
   * attached. Cells whose send failed (socket not open) stay queued and are
   * retried after the next reconnect.
   */
  const flush = useCallback((): void => {
    const runner = runnerRef.current
    if (runner.queue.length === 0) return
    const ws = wsRef.current
    if (ws === null || ws.readyState() !== 1) return
    const cells = stateRef.current.nb.cells
    const ids = [...runner.queue]
    const sent: string[] = []
    const unsent: string[] = []
    for (const id of ids) {
      const index = cells.findIndex((c) => c.id === id)
      const cell = cells[index]
      if (cell === undefined) continue // deleted while queued — drop silently
      if (ws.send({ type: 'execute', cellId: id, code: cell.source, index })) sent.push(id)
      else unsent.push(id)
    }
    runnerRef.current = markSent(markUnsent({ ...runner, queue: [] }, unsent), sent)
    const head = inFlight(runnerRef.current)
    if (head !== null && stateRef.current.executingId !== head) {
      dispatch({ type: 'beginExecute', id: head, at: Date.now() })
    }
  }, [])

  /** Queue cell ids for execution (run / run all). */
  const requestRun = useCallback((ids: string[]) => {
    const known = new Set(stateRef.current.nb.cells.filter((c) => c.type === 'code').map((c) => c.id))
    runnerRef.current = enqueue(runnerRef.current, ids, known)
    flush()
  }, [flush])

  /** Save the current document back to disk. */
  const save = useCallback(async (): Promise<void> => {
    const nb: UiNotebook = stateRef.current.nb
    setSaveError(null)
    setSaving(true)
    try {
      await api.saveNotebook(path, notebookToJson(nb))
      // The file now carries the stable cell ids (session-switch re-attach
      // relies on them matching after a reload).
      idsSavedRef.current = true
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

  /** Latest attachKernel, read through a ref so scheduleReconnect and
   *  attachKernel can reference each other without a declaration cycle. */
  const attachKernelRef = useRef<() => KernelConnection>(() => { throw new Error('attachKernel not ready') })

  /** Cancel a pending reconnect timer (unmount / deliberate shutdown). */
  const cancelReconnect = useCallback((): void => {
    const rc = reconnectRef.current
    if (rc.timer !== null) {
      clearTimeout(rc.timer)
      rc.timer = null
    }
  }, [])

  /**
   * Re-attach after the socket dropped while a run was outstanding. The host
   * keeps the kernel (and the bridge owns the run queue), so the notebook
   * reconnects with capped backoff instead of giving up.
   */
  const scheduleReconnect = useCallback((): void => {
    const rc = reconnectRef.current
    if (rc.disposed || rc.timer !== null) return
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** rc.attempts, RECONNECT_CAP_MS)
    rc.attempts += 1
    rc.timer = window.setTimeout(() => {
      rc.timer = null
      attachKernelRef.current()
      dispatch({ type: 'kernelPhase', phase: 'connecting' })
    }, delay)
  }, [])

  /** Open (or re-open) the kernel socket and wire the frame handlers. */
  const attachKernel = useCallback((): KernelConnection => {
    const ws = api.connectKernel(path)
    /** The kernel (or the bridge) is gone: drop the batch and stop
     *  reconnecting — a retry cannot resurrect a dead kernel. */
    const abortRun = (reason: string): void => {
      runnerRef.current = clearAll(runnerRef.current)
      pendingRunRef.current = null
      remapRef.current.clear()
      cancelReconnect()
      dispatch({ type: 'kernelPhase', phase: 'dead', reason })
    }
    ws.onFrame = (frame) => {
      if (frame.type === 'kernel_state') {
        // The host reports which cell is in flight when this socket attached
        // mid-run; mark it executing so a reopened notebook does not look
        // idle. When the host's cell id is not in this document (a run that
        // started before a session switch, ids regenerated on reload), fall
        // back to the captured index and remap the incoming events.
        if (frame.busy === true && typeof frame.cellId === 'string' && frame.cellId !== '') {
          const own = stateRef.current.nb.cells.map((c) => c.id)
          const { target, remap } = resolveBusyCell(frame.cellId, frame.index, own)
          if (remap !== null) remapRef.current.set(remap[0], remap[1])
          dispatch({ type: 'event', event: { type: 'status', execution_state: 'busy', cell_id: target } })
        }
        // Re-sync the whole run-all batch: every cell the host still has
        // queued (including the in-flight one) is marked, so a reopened
        // notebook shows the tail of the batch as queued, not idle.
        if (Array.isArray(frame.pendingCells) && frame.pendingCells.length > 0) {
          const own = stateRef.current.nb.cells
          const queued: string[] = []
          for (const pending of frame.pendingCells) {
            const byId = own.find((c) => c.id === pending.cellId)
            const local = byId ?? (pending.index >= 0 && pending.index < own.length ? own[pending.index] : undefined)
            if (local !== undefined) queued.push(local.id)
          }
          dispatch({ type: 'markQueued', ids: queued })
        }
        if (frame.running && frame.ready) {
          reconnectRef.current.attempts = 0
          dispatch({ type: 'kernelPhase', phase: 'ready' })
        }
        else if (frame.running) dispatch({ type: 'kernelPhase', phase: 'starting' })
        else abortRun(frame.reason ?? 'kernel not running')
        return
      }
      if (frame.type === 'kernel_error') {
        dispatch({ type: 'kernelError', message: frame.message })
        setEnvDetail(frame.message)
        abortRun(frame.message)
        return
      }
      const event = remapCellId(frame.event, remapRef.current)
      dispatch({ type: 'event', event })
      if (event.type === 'kernel_died') {
        abortRun(event.message)
        return
      }
      if (event.type === 'execute_reply') {
        const cellId = event.cell_id ?? ''
        runnerRef.current = onReply(runnerRef.current, cellId)
        dispatch({ type: 'endExecute', id: cellId, ok: event.ok, at: Date.now() })
        flush()
        // Auto-persist the execution log once the batch settles: the reducer
        // has applied the outputs by the time this macrotask runs, so saving
        // writes them (plus stable cell ids) back to the .ipynb. Skipped when
        // the socket dropped mid-run — the host already persisted the outputs
        // this browser never saw, and a stale save would clobber them.
        if (isIdle(runnerRef.current)) {
          remapRef.current.clear()
          if (!runnerRef.current.detached) setTimeout(() => void save(), 0)
          runnerRef.current = { ...runnerRef.current, detached: false }
        }
      }
    }
    ws.onClose = (reason) => {
      const runner = runnerRef.current
      const hasWork = runner.pending.length > 0 || runner.queue.length > 0 || pendingRunRef.current !== null
      if (hasWork && !reconnectRef.current.disposed) {
        // Keep the batch (the bridge is executing it) and reconnect so the
        // notebook can follow the rest of the run.
        runnerRef.current = markDetached(runner)
        dispatch({ type: 'kernelPhase', phase: 'connecting' })
        scheduleReconnect()
      } else {
        dispatch({ type: 'kernelPhase', phase: 'dead', reason: reason ?? 'connection closed' })
      }
    }
    wsRef.current = ws
    return ws
  }, [api, path, flush, save, scheduleReconnect])
  attachKernelRef.current = attachKernel

  const interrupt = useCallback(() => {
    runnerRef.current = clearAll(runnerRef.current)
    remapRef.current.clear()
    cancelReconnect()
    wsRef.current?.send({ type: 'interrupt' })
    dispatch({ type: 'setExecuting', id: null })
    const at = Date.now()
    for (const cell of stateRef.current.nb.cells) {
      if (cell.running) dispatch({ type: 'endExecute', id: cell.id, ok: false, at })
    }
  }, [cancelReconnect])

  const restart = useCallback(() => {
    runnerRef.current = clearAll(runnerRef.current)
    remapRef.current.clear()
    cancelReconnect()
    wsRef.current?.send({ type: 'restart' })
    dispatch({ type: 'kernelPhase', phase: 'starting', reason: '' })
    dispatch({ type: 'setExecuting', id: null })
  }, [cancelReconnect])

  const shutdown = useCallback(() => {
    runnerRef.current = clearAll(runnerRef.current)
    remapRef.current.clear()
    cancelReconnect()
    wsRef.current?.send({ type: 'shutdown' })
    dispatch({ type: 'kernelPhase', phase: 'dead', reason: 'shutdown' })
    dispatch({ type: 'setExecuting', id: null })
  }, [cancelReconnect])

  /**
   * Lazy kernel start: connect the kernel socket on demand (host starts the
   * Python bridge on the first WebSocket attach) instead of on editor mount.
   */
  const ensureKernel = useCallback((): void => {
    const existing = wsRef.current
    if (existing !== null && existing.readyState() === 1) return
    // A manual attach supersedes any scheduled reconnect.
    cancelReconnect()
    try { existing?.close() } catch { /* already closed */ }
    attachKernel()
    dispatch({ type: 'kernelPhase', phase: 'connecting' })
  }, [attachKernel, cancelReconnect])

  /** Run now if the kernel is ready; otherwise start it and run once ready. */
  const requestRunLazy = useCallback((ids: string[]) => {
    const go = (): void => {
      if (stateRef.current.kernel === 'ready') {
        requestRun(ids)
        return
      }
      pendingRunRef.current = ids
      ensureKernel()
    }
    if (idsSavedRef.current) {
      go()
      return
    }
    // First run of this mount: persist the stable cell ids to the .ipynb
    // FIRST, so a session switch / reload mid-run re-attaches to the same
    // cells (the host tracks the in-flight run by these ids). Without this,
    // a reopened notebook would generate fresh ids and the running cell would
    // look lost — no busy indicator, no logs.
    void save().then(() => { idsSavedRef.current = true; go() })
  }, [save, requestRun, ensureKernel])

  /** IDEA "Run All": runs every code cell, lazy-starting the kernel too. */
  const runAll = useCallback(() => {
    requestRunLazy(stateRef.current.nb.cells.filter((c) => c.type === 'code').map((c) => c.id))
  }, [requestRunLazy])

  /**
   * IDEA "Run Cell": run the cell; with `selectBelow` also select the next
   * cell, creating one below when the run cell is the last (Shift+Enter
   * semantics). Markdown cells are not executed — running them just commits
   * any open edit and moves the selection.
   */
  const runCell = useCallback((id: string, selectBelow: boolean): void => {
    const cells = stateRef.current.nb.cells
    const cell = cells.find((c) => c.id === id)
    if (cell === undefined) return
    if (cell.type === 'code') requestRunLazy([id])
    if (!selectBelow) return
    const index = cells.findIndex((c) => c.id === id)
    if (index >= cells.length - 1) {
      // IDEA creates a new cell below when there is none to select.
      dispatch({ type: 'addCellBelow', id })
    } else {
      dispatch({ type: 'select', id: cells[index + 1]!.id })
    }
  }, [requestRunLazy])

  // Fire a run that was queued while the kernel was starting, and flush any
  // cells that were queued while the socket was down (after a reconnect).
  useEffect(() => {
    if (state.kernel === 'ready') {
      if (pendingRunRef.current !== null) {
        const ids = pendingRunRef.current
        pendingRunRef.current = null
        requestRun(ids)
      } else {
        flush()
      }
    }
  }, [state.kernel, requestRun, flush])

  // Load the notebook once. The kernel is NOT connected here — it starts
  // lazily on the first run or an explicit "start kernel".
  useEffect(() => {
    let disposed = false
    // Fresh mount: re-arm the reconnect machinery (a previous instance of
    // this editor may have marked it disposed).
    reconnectRef.current = { timer: null, attempts: 0, disposed: false }
    loadPromiseRef.current = (async () => {
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
      reconnectRef.current.disposed = true
      cancelReconnect()
      const ws = wsRef.current
      if (ws !== null) {
        try { ws.close() } catch { /* already closed */ }
        wsRef.current = null
      }
    }
  }, [path, api, cancelReconnect])

  // Reopening a notebook whose kernel is still running in the background:
  // attach to it right away so execution state and any in-flight stream stay
  // live (the host keeps the kernel after the previous editor closed). The
  // attach is sequenced after the notebook load so the host's in-flight
  // replay lands on real cells instead of an empty document. A kernel that
  // is still STARTING also attaches — the host waits for it to become ready.
  useEffect(() => {
    let disposed = false
    void Promise.resolve(loadPromiseRef.current).then(() => api.kernelStatus(path)).then((kernel) => {
      if (disposed || !kernel.running) return
      const existing = wsRef.current
      if (existing !== null && existing.readyState() === 1) return
      cancelReconnect()
      attachKernel()
      dispatch({ type: 'kernelPhase', phase: 'connecting' })
    }).catch(() => { /* kernel not started yet — stay lazy */ })
    return () => { disposed = true }
  }, [path, api, attachKernel, cancelReconnect])

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

  // IDEA-style keyboard: Ctrl+S save, Ctrl+Alt+Shift+Enter run all,
  // Ctrl+F2 interrupt, Ctrl+Home/End focus first/last cell (outside editors).
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const ctrl = event.ctrlKey || event.metaKey
      if (ctrl && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void save()
        return
      }
      if (event.ctrlKey && event.altKey && event.shiftKey && event.key === 'Enter') {
        event.preventDefault()
        runAll()
        return
      }
      if (event.ctrlKey && event.key.toLowerCase() === 'f2') {
        event.preventDefault()
        interrupt()
        return
      }
      const target = event.target as HTMLElement | null
      const inEditor = target !== null && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.isContentEditable)
      if (!inEditor && ctrl && !event.shiftKey && !event.altKey) {
        const key = event.key.toLowerCase()
        if (key === 'home' || key === 'end') {
          const cells = stateRef.current.nb.cells
          if (cells.length === 0) return
          event.preventDefault()
          dispatch({ type: 'select', id: key === 'home' ? cells[0]!.id : cells[cells.length - 1]!.id })
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [save, runAll, interrupt])

  // -------------------------------------------------------------- actions

  const selected = state.selectedId
  const selectedIndex = selected === null ? -1 : state.nb.cells.findIndex((c) => c.id === selected)
  const selectedCell = selected === null ? undefined : state.nb.cells.find((c) => c.id === selected)
  const cells = state.nb.cells

  const kernelClass = state.kernel === 'ready' ? 'ok'
    : state.kernel === 'starting' || state.kernel === 'connecting' ? 'busy'
      : state.kernel === 'dead' ? 'err' : 'off'
  const kernelLabel = state.kernel === 'ready' ? tt('editor.kernelReady')
    : state.kernel === 'starting' || state.kernel === 'connecting' ? tt('editor.kernelStarting')
      : state.kernel === 'dead' ? tt('editor.kernelDead', { reason: state.kernelReason || '?' })
        : tt('editor.kernelIdle')
  const kernelActive = state.kernel === 'ready' || state.kernel === 'starting'
  const hasOutputs = cells.some((c) => c.type === 'code' && c.outputs.length > 0)
  // IDEA-style: the Stop/Interrupt button turns red while a cell is running.
  const anyRunning = state.executingId !== null || cells.some((c) => c.running)

  /** IDEA-style duration text ("1.2 s", "3 min 4 s"). */
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return tt('editor.durationMs', { ms: Math.round(ms) })
    if (ms < 60_000) return tt('editor.durationSec', { s: (ms / 1000).toFixed(1) })
    return tt('editor.durationMin', { m: Math.floor(ms / 60_000), s: Math.round((ms % 60_000) / 1000) })
  }

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

      <div className="dshjp-toolbar" role="toolbar" aria-label={tt('panel.title')}>
        <button
          type="button"
          className="dshjp-tbtn primary"
          title={`${tt('editor.runCellSelectBelow')} — ${tt('editor.runCellHint')}`}
          disabled={selected === null}
          onClick={() => { if (selected !== null) runCell(selected, true) }}
        >▶</button>
        <button
          type="button"
          className="dshjp-tbtn"
          title={`${tt('editor.runAll')} (Ctrl+Alt+Shift+Enter)`}
          disabled={cellsByCode.length === 0}
          onClick={() => runAll()}
        >▶▶</button>
        <span className="sep" />
        <button
          type="button"
          className={`dshjp-tbtn${anyRunning ? ' stop-active' : ''}`}
          title={tt('editor.interrupt')}
          disabled={!kernelActive}
          onClick={interrupt}
        >■</button>
        <button type="button" className="dshjp-tbtn" title={tt('editor.restart')} disabled={!kernelActive} onClick={restart}>↻</button>
        <button type="button" className="dshjp-tbtn" title={tt('editor.shutdown')} disabled={state.kernel === 'dead'} onClick={shutdown}>⏻</button>
        <span className="sep" />
        <button
          type="button"
          className="dshjp-tbtn"
          title={tt('editor.clearAllOutputs')}
          disabled={!hasOutputs}
          onClick={() => dispatch({ type: 'clearAllOutputs' })}
        >🧹</button>
        <button
          type="button"
          className="dshjp-tbtn"
          title={tt('editor.addBelow')}
          disabled={selected === null}
          onClick={() => { if (selected !== null) dispatch({ type: 'addCellBelow', id: selected }) }}
        >＋</button>
        <button
          type="button"
          className="dshjp-tbtn"
          title={tt('editor.moveUp')}
          disabled={selectedIndex <= 0}
          onClick={() => { if (selected !== null) dispatch({ type: 'moveCell', id: selected, dir: -1 }) }}
        >↑</button>
        <button
          type="button"
          className="dshjp-tbtn"
          title={tt('editor.moveDown')}
          disabled={selectedIndex < 0 || selectedIndex >= cells.length - 1}
          onClick={() => { if (selected !== null) dispatch({ type: 'moveCell', id: selected, dir: 1 }) }}
        >↓</button>
        <select
          className="dshjp-cell-type-select"
          aria-label={tt('editor.cellType')}
          value={selectedCell?.type ?? 'code'}
          disabled={selected === null}
          onChange={(event) => {
            if (selected !== null) {
              dispatch({ type: 'setCellType', id: selected, cellType: event.target.value as 'code' | 'markdown' | 'raw' })
            }
          }}
        >
          <option value="code">Code</option>
          <option value="markdown">Markdown</option>
          <option value="raw">Raw</option>
        </select>
        <span className="sep" />
        <button type="button" className="dshjp-tbtn" title={tt('editor.selectAbove')} disabled={selectedIndex <= 0} onClick={() => dispatch({ type: 'selectAdjacent', dir: -1 })}>⇡</button>
        <button type="button" className="dshjp-tbtn" title={tt('editor.selectBelow')} disabled={selectedIndex < 0 || selectedIndex >= cells.length - 1} onClick={() => dispatch({ type: 'selectAdjacent', dir: 1 })}>⇣</button>
        <span className="spacer" />
        <span className={`dshjp-status-badge ${kernelClass}`}>
          <span className="dot" />
          {state.kernel === 'connecting' || state.kernel === 'starting' ? <span className="dshjp-spinner" /> : null}
          {kernelLabel}
          {state.kernelName !== null && <span className="dshjp-kernel-name">{state.kernelName}</span>}
        </span>
        <span className="sep" />
        <button type="button" className="dshjp-tbtn" title={tt('editor.save')} disabled={saving} onClick={() => void save()}>
          {saving ? '…' : savedFlash ? '✓' : '💾'}
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
                formatDuration={formatDuration}
                onSelect={() => dispatch({ type: 'select', id: cell.id })}
                onRunCell={(id, selectBelow) => runCell(id, selectBelow)}
                onChange={(id, source) => dispatch({ type: 'setSource', id, source })}
                onDelete={(id) => dispatch({ type: 'deleteCell', id })}
                onMove={(id, dir) => dispatch({ type: 'moveCell', id, dir })}
                onAddBelow={(id) => dispatch({ type: 'addCellBelow', id })}
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
