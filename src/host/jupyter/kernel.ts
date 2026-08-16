/**
 * Kernel manager: one Python bridge subprocess per notebook. The bridge
 * (python/bridge.py) owns jupyter_client; this class owns the process, the
 * JSON-lines stdin/stdout protocol, and the WebSocket fan-out to browsers.
 *
 * Kernel identity: the canonical notebook path. A kernel is started lazily on
 * the first WebSocket attach. It runs in the BACKGROUND: closing the last
 * editor tab does NOT kill it (a cell may still be executing), so a notebook
 * keeps running and its outputs are written back to the .ipynb file as each
 * execution completes. Kernels are shut down on explicit `shutdown`, on
 * restart, after an idle timeout with no connections, or on plugin dispose.
 * @module dsh-jupyter/host/kernel
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import type { WebSocket } from 'ws'
import { resolvePythonCommand } from './env.ts'

/** How long a kernel with no browser connections stays alive before shutdown. */
const IDLE_TTL_MS = Number(process.env.DSH_EXPLORER_KERNEL_IDLE_MS ?? 30 * 60 * 1000)

/** Bridge events forwarded to browsers (a superset of what the client uses). */
export type BridgeEvent = Record<string, unknown> & { type: string }

/** One recently completed execution kept for late-attaching browsers. */
export interface KernelCompletion {
  cell_id: string
  outputs: BridgeEvent[]
  execution_count: number | null
  ok: boolean
}

/**
 * Convert one accumulated nbformat-shaped output record back into the bridge
 * event shape the browser reducer consumes (replay for late-attaching
 * sockets). Unknown output types degrade to a log line (never a crash).
 */
function nbOutputToBridgeEvent(cellId: string, out: Record<string, unknown>): BridgeEvent {
  const type = out.output_type
  if (type === 'stream') {
    return { type: 'stream', cell_id: cellId, name: out.name === 'stderr' ? 'stderr' : 'stdout', text: String(out.text ?? '') }
  }
  if (type === 'display_data' || type === 'update_display_data') {
    return { type, cell_id: cellId, data: out.data ?? {}, metadata: out.metadata ?? {} }
  }
  if (type === 'execute_result') {
    return {
      type: 'execute_result',
      cell_id: cellId,
      data: out.data ?? {},
      metadata: out.metadata ?? {},
      execution_count: typeof out.execution_count === 'number' ? out.execution_count : null,
    }
  }
  if (type === 'error') {
    return {
      type: 'error',
      cell_id: cellId,
      ename: typeof out.ename === 'string' ? out.ename : 'Error',
      evalue: typeof out.evalue === 'string' ? out.evalue : '',
      traceback: Array.isArray(out.traceback) ? out.traceback.filter((line): line is string => typeof line === 'string') : [],
    }
  }
  return { type: 'log', level: 'warn', message: `skipping replay of unknown output ${String(type)}` }
}

/** Kernel lifecycle summary for the HTTP status route. */
export interface KernelSummary {
  kernelId: string
  running: boolean
  python: string
  ready: boolean
  attachCount: number
  lastError: string | null
  /** Whether a cell is currently executing (from bridge status events). */
  busy: boolean
  /** The client cell id currently executing, when the bridge reports one. */
  executingCellId: string | null
}

/**
 * Persist one finished execution into the notebook file. Implemented by the
 * caller (wired to NotebookFs.applyOutputs in the plugin entry).
 */
export type PersistExecution = (
  path: string,
  cellId: string,
  index: number,
  source: string,
  outputs: Array<Record<string, unknown>>,
  executionCount: number | null,
) => Promise<void>

/** One bridge subprocess + its sockets. */
interface KernelEntry {
  key: string
  python: string
  proc: ChildProcessWithoutNullStreams
  ready: boolean
  attachCount: number
  sockets: Set<WebSocket>
  lastError: string | null
  closed: boolean
  /** Accumulated outputs per client cell id (persisted on execute_reply). */
  outputsByCell: Map<string, Array<Record<string, unknown>>>
  /** Executed source per cell id (for locating the cell in the file). */
  codeByCell: Map<string, string>
  /** Cell index captured when the execution started. */
  indexByCell: Map<string, number>
  /** Whether a cell is currently executing (from bridge status events). */
  busy: boolean
  /** The client cell id currently executing (from bridge status events). */
  executingCellId: string | null
  idleTimer: NodeJS.Timeout | null
  /**
   * Recently completed executions, kept briefly so a browser that (re)attaches
   * after the run finished can still receive the outputs + reply it missed
   * (bounded — evicted oldest-first, and dropped on re-execution).
   */
  completedByCell: Map<string, { outputs: Array<Record<string, unknown>>; execution_count: number | null; ok: boolean }>
}

/** A pending attach waiting for the kernel to become ready. */
interface ReadyWaiter {
  resolve: () => void
  reject: (error: Error) => void
  timer: NodeJS.Timeout
}

/** Locate python/bridge.py next to the built lib/index.js (or src during dev). */
export function bridgeScriptPath(): string {
  const built = fileURLToPath(new URL('../python/bridge.py', import.meta.url))
  if (existsSync(built)) return built
  // Dev layout: src/host/kernel.ts -> ../../python/bridge.py.
  return fileURLToPath(new URL('../../python/bridge.py', import.meta.url))
}

/** Parse one JSON line from the bridge stdout. */
function parseLine(line: string): BridgeEvent | null {
  try {
    const value: unknown = JSON.parse(line)
    if (typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string') {
      return value as BridgeEvent
    }
    return null
  } catch {
    return null
  }
}

/** One kernel session handle (returned by attach). */
export interface KernelHandle {
  key: string
  /** Send one command to the bridge (execute / interrupt / restart / shutdown). */
  command(command: Record<string, unknown>): void
  /** Detach (decrements the refcount; may shut the kernel down). */
  detach(): void
}

export class KernelManager {
  private readonly kernels = new Map<string, KernelEntry>()
  private readonly waiters = new Map<string, ReadyWaiter[]>()
  private readonly persist: PersistExecution | undefined

  constructor(persist?: PersistExecution) {
    this.persist = persist
  }

  /** Attach a browser socket to the kernel for `path`; starts it if needed. */
  async attach(path: string, socket: WebSocket): Promise<KernelHandle> {
    let entry = this.kernels.get(path)
    if (entry === undefined || entry.closed || entry.proc.exitCode !== null) {
      entry = this.start(path)
    }
    this.clearIdleTimer(entry)
    entry.attachCount += 1
    entry.sockets.add(socket)

    if (!entry.ready) {
      await this.waitReady(path, entry)
    }
    if (entry.closed || entry.proc.exitCode !== null) {
      throw new Error(entry.lastError ?? 'kernel exited while attaching')
    }

    socket.on('close', () => { this.detachSocket(path, socket) })
    socket.on('error', () => { this.detachSocket(path, socket) })

    return {
      key: path,
      command: (command) => this.command(path, command),
      detach: () => { this.detachSocket(path, socket) },
    }
  }

  /** Wait (with timeout) for the kernel's ready event. */
  private waitReady(key: string, entry: KernelEntry): Promise<void> {
    if (entry.ready) return Promise.resolve()
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const list = this.waiters.get(key)
        if (list === undefined) return
        const index = list.findIndex((w) => w.resolve === resolve)
        if (index !== -1) list.splice(index, 1)
        reject(new Error(entry.lastError ?? 'kernel failed to start (python bridge did not report ready in time)'))
      }, 90_000)
      const waiter: ReadyWaiter = { resolve, reject, timer }
      const list = this.waiters.get(key) ?? []
      list.push(waiter)
      this.waiters.set(key, list)
    })
  }

  /** Spawn a bridge process for a kernel key (the notebook path). */
  private start(key: string): KernelEntry {
    const stale = this.kernels.get(key)
    if (stale !== undefined && !stale.closed) return stale
    if (stale !== undefined) {
      try { stale.proc.kill() } catch { /* gone */ }
      this.kernels.delete(key)
    }
    const python = resolvePythonCommand()
    const script = bridgeScriptPath()
    const entry: KernelEntry = {
      key,
      python,
      proc: undefined as unknown as ChildProcessWithoutNullStreams,
      ready: false,
      attachCount: 0,
      sockets: new Set(),
      lastError: null,
      closed: false,
      outputsByCell: new Map(),
      codeByCell: new Map(),
      indexByCell: new Map(),
      busy: false,
      executingCellId: null,
      idleTimer: null,
      completedByCell: new Map(),
    }
    const cwd = dirname(key)
    const proc = spawn(python, ['-u', script], {
      cwd,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', DSH_JUPYTER_KERNEL_CWD: cwd },
    })
    entry.proc = proc
    this.kernels.set(key, entry)

    let buffer = ''
    proc.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8')
      let newline = buffer.indexOf('\n')
      while (newline !== -1) {
        const line = buffer.slice(0, newline)
        buffer = buffer.slice(newline + 1)
        const event = parseLine(line)
        if (event !== null) this.handleEvent(key, entry, event)
        newline = buffer.indexOf('\n')
      }
    })
    proc.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8').trim()
      if (text !== '') this.broadcast(entry, { type: 'event', event: { type: 'log', level: 'warn', message: text.slice(0, 1000) } })
    })
    proc.on('error', (error) => {
      entry.lastError = error.message
      this.failWaiters(key, new Error(error.message))
      this.killEntry(key, entry, `bridge error: ${error.message}`)
    })
    proc.on('close', (code) => {
      if (!entry.closed) {
        entry.closed = true
        this.failWaiters(key, new Error(`bridge exited (code ${String(code)})`))
        this.broadcast(entry, { type: 'kernel_state', running: false, ready: false, reason: `bridge exited (${String(code)})` })
        entry.sockets.forEach((socket) => { try { socket.close(1011, 'kernel exited') } catch { /* closed */ } })
        entry.sockets.clear()
      }
      if (this.kernels.get(key) === entry) this.kernels.delete(key)
    })
    return entry
  }

  /** Route one bridge event: resolve ready waiters, update state, relay. */
  private handleEvent(key: string, entry: KernelEntry, event: BridgeEvent): void {
    if (event.type === 'ready') {
      entry.ready = true
      this.resolveWaiters(key)
    } else if (event.type === 'kernel_died') {
      entry.lastError = typeof event.message === 'string' ? event.message : 'kernel died'
      this.broadcast(entry, { type: 'kernel_state', running: false, ready: false, reason: entry.lastError })
    } else if (event.type === 'status') {
      // Track busy/idle so the idle shutdown timer never kills a running cell
      // and so a freshly attached browser can learn which cell is in flight.
      entry.busy = event.execution_state === 'busy'
      if (entry.busy) {
        this.clearIdleTimer(entry)
        if (typeof event.cell_id === 'string' && event.cell_id !== '') {
          entry.executingCellId = event.cell_id
        }
      } else {
        entry.executingCellId = null
        if (entry.attachCount <= 0) this.scheduleIdleShutdown(key, entry)
      }
    } else if (event.type === 'execute_reply') {
      const cellId = typeof event.cell_id === 'string' ? event.cell_id : ''
      if (cellId !== '') void this.persistRun(key, entry, cellId, event)
    } else {
      // Accumulate output events so a background run (no browser connected)
      // still gets written back to the notebook file.
      this.accumulateOutput(entry, event)
    }
    this.broadcast(entry, { type: 'event', event })
  }

  /** Append one bridge output event to the cell's accumulated outputs. */
  private accumulateOutput(entry: KernelEntry, event: BridgeEvent): void {
    const cellId = typeof event.cell_id === 'string' ? event.cell_id : ''
    if (cellId === '') return
    const type = event.type
    if (type === 'clear_output') {
      entry.outputsByCell.set(cellId, [])
      return
    }
    if (type !== 'stream' && type !== 'display_data' && type !== 'update_display_data'
      && type !== 'execute_result' && type !== 'error') return
    const list = entry.outputsByCell.get(cellId) ?? []
    if (type === 'stream') {
      // Coalesce consecutive stream chunks of the same name (Jupyter style).
      const name = event.name === 'stderr' ? 'stderr' : 'stdout'
      const text = typeof event.text === 'string' ? event.text : ''
      const last = list[list.length - 1]
      if (last !== undefined && last.output_type === 'stream' && last.name === name) {
        last.text = String(last.text) + text
      } else {
        list.push({ output_type: 'stream', name, text })
      }
    } else if (type === 'display_data') {
      list.push({ output_type: 'display_data', data: event.data ?? {}, metadata: event.metadata ?? {} })
    } else if (type === 'update_display_data') {
      list.push({ output_type: 'update_display_data', data: event.data ?? {}, metadata: event.metadata ?? {} })
    } else if (type === 'execute_result') {
      list.push({
        output_type: 'execute_result',
        data: event.data ?? {},
        metadata: event.metadata ?? {},
        execution_count: typeof event.execution_count === 'number' ? event.execution_count : null,
      })
    } else if (type === 'error') {
      list.push({
        output_type: 'error',
        ename: typeof event.ename === 'string' ? event.ename : 'Error',
        evalue: typeof event.evalue === 'string' ? event.evalue : '',
        traceback: Array.isArray(event.traceback) ? event.traceback.filter((line): line is string => typeof line === 'string') : [],
      })
    }
    entry.outputsByCell.set(cellId, list)
  }

  /** Persist a finished execution to the notebook file (background log). */
  private async persistRun(key: string, entry: KernelEntry, cellId: string, reply: BridgeEvent): Promise<void> {
    const outputs = entry.outputsByCell.get(cellId) ?? []
    const source = entry.codeByCell.get(cellId) ?? ''
    const index = entry.indexByCell.get(cellId) ?? -1
    const count = typeof reply.execution_count === 'number' ? reply.execution_count : null
    entry.outputsByCell.delete(cellId)
    entry.codeByCell.delete(cellId)
    entry.indexByCell.delete(cellId)
    // Keep the completion around briefly (bounded) so a browser that attaches
    // after this run finished can still receive the outputs + reply it missed.
    if (outputs.length > 0 || count !== null) {
      entry.completedByCell.set(cellId, { outputs, execution_count: count, ok: reply.ok !== false })
      if (entry.completedByCell.size > 200) {
        const oldest = entry.completedByCell.keys().next().value
        if (oldest !== undefined) entry.completedByCell.delete(oldest)
      }
    }
    if (this.persist === undefined || (outputs.length === 0 && count === null)) return
    try {
      await this.persist(key, cellId, index, source, outputs, count)
    } catch {
      /* persistence is best-effort; the client save path still covers it */
    }
  }

  private resolveWaiters(key: string): void {
    const list = this.waiters.get(key)
    if (list === undefined) return
    this.waiters.delete(key)
    for (const waiter of list) {
      clearTimeout(waiter.timer)
      waiter.resolve()
    }
  }

  private failWaiters(key: string, error: Error): void {
    const list = this.waiters.get(key)
    if (list === undefined) return
    this.waiters.delete(key)
    for (const waiter of list) {
      clearTimeout(waiter.timer)
      waiter.reject(error)
    }
  }

  private broadcast(entry: KernelEntry, frame: Record<string, unknown>): void {
    const payload = JSON.stringify(frame)
    for (const socket of entry.sockets) {
      if (socket.readyState === socket.OPEN) {
        try { socket.send(payload) } catch { /* closed */ }
      }
    }
  }

  /** Write one JSON command line to the bridge stdin. */
  command(key: string, command: Record<string, unknown>): void {
    const entry = this.kernels.get(key)
    if (entry === undefined || entry.closed || entry.proc.stdin.destroyed) return
    if (command.op === 'execute') {
      const cellId = typeof command.cell_id === 'string' ? command.cell_id : ''
      if (cellId !== '') {
        // Record run context for persistence (fresh run resets the outputs
        // and invalidates any buffered completion for this cell).
        entry.codeByCell.set(cellId, typeof command.code === 'string' ? command.code : '')
        entry.indexByCell.set(cellId, typeof command.index === 'number' ? command.index : -1)
        entry.outputsByCell.set(cellId, [])
        entry.completedByCell.delete(cellId)
      }
    }
    try {
      entry.proc.stdin.write(JSON.stringify(command) + '\n')
    } catch { /* bridge gone */ }
  }

  private clearIdleTimer(entry: KernelEntry): void {
    if (entry.idleTimer !== null) {
      clearTimeout(entry.idleTimer)
      entry.idleTimer = null
    }
  }

  /** Arm the idle shutdown timer (no sockets, not busy). */
  private scheduleIdleShutdown(key: string, entry: KernelEntry): void {
    if (entry.closed || entry.idleTimer !== null || entry.attachCount > 0 || entry.busy) return
    entry.idleTimer = setTimeout(() => {
      entry.idleTimer = null
      this.shutdown(key)
    }, IDLE_TTL_MS)
    entry.idleTimer.unref()
  }

  private detachSocket(key: string, socket: WebSocket): void {
    const entry = this.kernels.get(key)
    if (entry === undefined) return
    entry.sockets.delete(socket)
    entry.attachCount = Math.max(0, entry.attachCount - 1)
    if (entry.attachCount <= 0) {
      // Background mode: keep the kernel (a cell may still be running) and
      // only shut it down after the idle window.
      this.scheduleIdleShutdown(key, entry)
    }
  }

  private killEntry(key: string, entry: KernelEntry, reason: string): void {
    if (entry.closed) return
    entry.closed = true
    this.clearIdleTimer(entry)
    this.broadcast(entry, { type: 'kernel_state', running: false, ready: false, reason })
    entry.sockets.forEach((socket) => { try { socket.close(1011, 'kernel exited') } catch { /* closed */ } })
    entry.sockets.clear()
    try { entry.proc.kill() } catch { /* gone */ }
    if (this.kernels.get(key) === entry) this.kernels.delete(key)
  }

  /** Shut down one kernel (bridge + sockets). Idempotent. */
  shutdown(key: string): void {
    const entry = this.kernels.get(key)
    if (entry === undefined || entry.closed) return
    entry.closed = true
    this.clearIdleTimer(entry)
    this.command(key, { op: 'shutdown' })
    const timer = setTimeout(() => {
      try { entry.proc.kill() } catch { /* gone */ }
    }, 1500)
    timer.unref()
    this.broadcast(entry, { type: 'kernel_state', running: false, ready: false, reason: 'shutdown' })
    entry.sockets.forEach((socket) => { try { socket.close(1000, 'kernel shutdown') } catch { /* closed */ } })
    entry.sockets.clear()
    if (this.kernels.get(key) === entry) this.kernels.delete(key)
  }

  /** Restart a kernel in place (bridge restart op). */
  restart(key: string): void {
    this.command(key, { op: 'restart' })
  }

  /** Interrupt the running kernel. */
  interrupt(key: string): void {
    this.command(key, { op: 'interrupt' })
  }

  /** Status summary for one key. */
  status(key: string): KernelSummary {
    const entry = this.kernels.get(key)
    if (entry === undefined || entry.closed || entry.proc.exitCode !== null) {
      return {
        kernelId: key, running: false, python: resolvePythonCommand(), ready: false,
        attachCount: 0, lastError: null, busy: false, executingCellId: null,
      }
    }
    return {
      kernelId: key,
      running: true,
      python: entry.python,
      ready: entry.ready,
      attachCount: entry.attachCount,
      lastError: entry.lastError,
      busy: entry.busy,
      executingCellId: entry.executingCellId,
    }
  }

  /**
   * The state a freshly attached browser needs to re-sync a run that started
   * while it was away: whether the kernel is busy, which client cell is
   * executing (plus the cell index captured when the run started — the
   * fallback a re-attached browser uses when its cell ids differ), that
   * cell's accumulated outputs so far (so the reopened notebook shows the
   * live partial output instead of an idle cell), the cells still waiting in
   * the batch, and any recently completed executions this browser may have
   * missed.
   */
  attachState(key: string): {
    busy: boolean
    executingCellId: string | null
    index: number
    outputs: BridgeEvent[]
    pendingCells: Array<{ cellId: string; index: number }>
    completions: KernelCompletion[]
  } {
    const entry = this.kernels.get(key)
    if (entry === undefined || entry.closed || entry.proc.exitCode !== null) {
      return { busy: false, executingCellId: null, index: -1, outputs: [], pendingCells: [], completions: [] }
    }
    const completions: KernelCompletion[] = []
    for (const [cellId, done] of entry.completedByCell) {
      completions.push({
        cell_id: cellId,
        outputs: done.outputs.map((out) => nbOutputToBridgeEvent(cellId, out)),
        execution_count: done.execution_count,
        ok: done.ok,
      })
    }
    const executing = entry.busy && entry.executingCellId !== null ? entry.executingCellId : null
    // Every cell handed to the bridge and still awaiting its execute_reply:
    // the in-flight one plus the queued tail of a run-all batch. The client
    // uses these (mapped through its local ids) to show the whole batch as
    // running/queued after a session switch or a close-and-reopen.
    const pendingCells: Array<{ cellId: string; index: number }> = []
    for (const cellId of entry.codeByCell.keys()) {
      pendingCells.push({ cellId, index: entry.indexByCell.get(cellId) ?? -1 })
    }
    return {
      busy: entry.busy,
      executingCellId: executing,
      index: executing !== null ? (entry.indexByCell.get(executing) ?? -1) : -1,
      outputs: executing !== null
        ? (entry.outputsByCell.get(executing) ?? []).map((out) => nbOutputToBridgeEvent(executing, out))
        : [],
      pendingCells,
      completions,
    }
  }

  /**
   * Every live kernel, for the explorer's "running notebook" indicator.
   * `inside` (optional) filters to paths under a directory (the route passes
   * the session's canonical cwd).
   */
  list(inside?: (path: string) => boolean): Array<{ key: string; running: boolean; busy: boolean }> {
    const out: Array<{ key: string; running: boolean; busy: boolean }> = []
    for (const [key, entry] of this.kernels) {
      if (entry.closed || entry.proc.exitCode !== null) continue
      if (inside !== undefined && !inside(key)) continue
      out.push({ key, running: true, busy: entry.busy })
    }
    return out
  }

  /** Drop the buffered completions for one kernel (they were just replayed). */
  clearCompletions(key: string): void {
    const entry = this.kernels.get(key)
    if (entry === undefined) return
    entry.completedByCell.clear()
  }

  /** Shut down every kernel (plugin dispose). */
  dispose(): void {
    for (const key of [...this.kernels.keys()]) this.shutdown(key)
  }
}
