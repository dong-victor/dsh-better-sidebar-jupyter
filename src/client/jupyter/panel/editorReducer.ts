/**
 * Editor state reducer: the UI notebook document plus kernel lifecycle, with
 * kernel-event application (streams, rich outputs, errors, replies).
 * @module dsh-jupyter/client/panel/editorReducer
 */

import { makeCell } from '../nbModel.ts'
import type { KernelEvent, MimeBundle, UiCell, UiNotebook, UiOutput } from '../types.ts'

export type KernelPhase = 'idle' | 'connecting' | 'starting' | 'ready' | 'dead'

export interface EditorState {
  nb: UiNotebook
  kernel: KernelPhase
  kernelReason: string
  /** Cell id currently executing (in flight). */
  executingId: string | null
  /** The run-all queue (cell ids still to run). */
  runQueue: string[]
  selectedId: string | null
  loadError: string | null
  kernelError: string | null
  savedTick: number
}

export type EditorAction =
  | { type: 'load'; nb: UiNotebook }
  | { type: 'loadError'; error: string }
  | { type: 'kernelPhase'; phase: KernelPhase; reason?: string }
  | { type: 'kernelError'; message: string }
  | { type: 'event'; event: KernelEvent }
  | { type: 'setSource'; id: string; source: string }
  | { type: 'convert'; id: string }
  | { type: 'addCell'; index: number; cellType: 'code' | 'markdown' }
  | { type: 'deleteCell'; id: string }
  | { type: 'moveCell'; id: string; dir: -1 | 1 }
  | { type: 'select'; id: string }
  | { type: 'clearOutputs'; id: string }
  | { type: 'beginExecute'; id: string }
  | { type: 'endExecute'; id: string; ok: boolean }
  | { type: 'setExecuting'; id: string | null }
  | { type: 'markSaved' }

function findIndex(nb: UiNotebook, id: string): number {
  return nb.cells.findIndex((cell) => cell.id === id)
}

/** Append a stream chunk, merging with the previous same-name stream output. */
function appendOutput(cell: UiCell, output: UiOutput): UiCell {
  if (output.outputType === 'stream') {
    const last = cell.outputs[cell.outputs.length - 1]
    if (last !== undefined && last.outputType === 'stream' && last.name === output.name) {
      return { ...cell, outputs: [...cell.outputs.slice(0, -1), { ...last, text: last.text + output.text }] }
    }
  }
  return { ...cell, outputs: [...cell.outputs, output] }
}

function patchCell(nb: UiNotebook, id: string, patch: (cell: UiCell) => UiCell): UiNotebook {
  const index = findIndex(nb, id)
  if (index === -1) return nb
  const cells = [...nb.cells]
  cells[index] = patch(cells[index]!)
  return { ...nb, cells, dirty: true }
}

/** Apply one kernel event to the document (pure). */
export function applyKernelEvent(state: EditorState, event: KernelEvent): EditorState {
  let nb = state.nb
  const cellId = (event as { cell_id?: string | null }).cell_id ?? null
  if (event.type === 'ready') {
    return { ...state, kernel: 'ready', kernelReason: '', kernelError: null }
  }
  if (event.type === 'status') {
    const running = event.execution_state === 'busy'
    if (cellId !== null && cellId !== undefined) {
      nb = patchCell(nb, cellId, (cell) => ({ ...cell, running }))
    } else if (state.executingId !== null) {
      nb = patchCell(nb, state.executingId, (cell) => ({ ...cell, running }))
    }
    return { ...state, nb }
  }
  if (event.type === 'stream') {
    if (cellId === null || cellId === undefined) return state
    nb = patchCell(nb, cellId, (cell) => appendOutput(cell, { outputType: 'stream', name: event.name, text: event.text }))
    return { ...state, nb }
  }
  if (event.type === 'display_data' || event.type === 'update_display_data') {
    if (cellId === null || cellId === undefined) return state
    nb = patchCell(nb, cellId, (cell) => appendOutput(cell, { outputType: 'display_data', data: event.data, metadata: event.metadata ?? {} }))
    return { ...state, nb }
  }
  if (event.type === 'execute_result') {
    if (cellId === null || cellId === undefined) return state
    nb = patchCell(nb, cellId, (cell) => ({
      ...appendOutput(cell, { outputType: 'execute_result', data: event.data, metadata: event.metadata ?? {}, executionCount: event.execution_count }),
      executionCount: event.execution_count,
      running: false,
    }))
    return { ...state, nb }
  }
  if (event.type === 'error') {
    if (cellId === null || cellId === undefined) return state
    nb = patchCell(nb, cellId, (cell) => ({
      ...appendOutput(cell, { outputType: 'error', ename: event.ename, evalue: event.evalue, traceback: event.traceback }),
      running: false,
    }))
    return { ...state, nb }
  }
  if (event.type === 'clear_output') {
    if (cellId === null || cellId === undefined) return state
    nb = patchCell(nb, cellId, (cell) => ({ ...cell, outputs: [] }))
    return { ...state, nb }
  }
  if (event.type === 'execute_reply') {
    // The runner ref clears inFlight; here we just clear the running flag and
    // record the final execution count.
    if (cellId !== null && cellId !== undefined) {
      nb = patchCell(nb, cellId, (cell) => ({
        ...cell,
        running: false,
        executionCount: event.execution_count ?? cell.executionCount,
      }))
    }
    return { ...state, nb, executingId: null }
  }
  if (event.type === 'kernel_died') {
    return { ...state, kernel: 'dead', kernelReason: event.message, executingId: null, runQueue: [] }
  }
  if (event.type === 'log') {
    return state
  }
  return state
}

/** Main reducer. */
export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'load':
      return { ...state, nb: action.nb, loadError: null, selectedId: action.nb.cells[0]?.id ?? null }
    case 'loadError':
      return { ...state, loadError: action.error }
    case 'kernelPhase':
      return { ...state, kernel: action.phase, kernelReason: action.reason ?? state.kernelReason }
    case 'kernelError':
      return { ...state, kernelError: action.message, kernel: 'dead' }
    case 'event':
      return applyKernelEvent(state, action.event)
    case 'setSource': {
      const index = findIndex(state.nb, action.id)
      if (index === -1) return state
      const cells = [...state.nb.cells]
      cells[index] = { ...cells[index]!, source: action.source }
      return { ...state, nb: { ...state.nb, cells, dirty: true } }
    }
    case 'convert': {
      const index = findIndex(state.nb, action.id)
      if (index === -1) return state
      const cell = state.nb.cells[index]!
      const nextType: UiCell['type'] = cell.type === 'code' ? 'markdown' : 'code'
      const next: UiCell = nextType === 'code'
        ? { ...cell, type: 'code', outputs: cell.type === 'code' ? cell.outputs : [], executionCount: cell.type === 'code' ? cell.executionCount : null, running: false }
        : { ...cell, type: 'markdown', outputs: [], executionCount: null, running: false }
      const cells = [...state.nb.cells]
      cells[index] = next
      return { ...state, nb: { ...state.nb, cells, dirty: true } }
    }
    case 'addCell': {
      const index = Math.max(0, Math.min(state.nb.cells.length, action.index))
      const cells = [...state.nb.cells]
      cells.splice(index, 0, makeCell(action.cellType))
      return { ...state, nb: { ...state.nb, cells, dirty: true }, selectedId: cells[index]!.id }
    }
    case 'deleteCell': {
      const index = findIndex(state.nb, action.id)
      if (index === -1) return state
      const cells = state.nb.cells.filter((cell) => cell.id !== action.id)
      const selectedId = state.selectedId === action.id ? (cells[Math.min(index, cells.length - 1)]?.id ?? null) : state.selectedId
      return { ...state, nb: { ...state.nb, cells, dirty: true }, selectedId }
    }
    case 'moveCell': {
      const index = findIndex(state.nb, action.id)
      const target = index + action.dir
      if (index === -1 || target < 0 || target >= state.nb.cells.length) return state
      const cells = [...state.nb.cells]
      const [moved] = cells.splice(index, 1)
      cells.splice(target, 0, moved!)
      return { ...state, nb: { ...state.nb, cells, dirty: true } }
    }
    case 'select':
      return { ...state, selectedId: action.id }
    case 'clearOutputs': {
      const index = findIndex(state.nb, action.id)
      if (index === -1) return state
      const cells = [...state.nb.cells]
      cells[index] = { ...cells[index]!, outputs: [] }
      return { ...state, nb: { ...state.nb, cells, dirty: true } }
    }
    case 'beginExecute': {
      const index = findIndex(state.nb, action.id)
      if (index === -1) return state
      const cells = [...state.nb.cells]
      cells[index] = { ...cells[index]!, running: true }
      return { ...state, nb: { ...state.nb, cells }, executingId: action.id, kernelError: null }
    }
    case 'endExecute': {
      const index = findIndex(state.nb, action.id)
      if (index === -1) return { ...state, executingId: null }
      const cells = [...state.nb.cells]
      cells[index] = { ...cells[index]!, running: false }
      return { ...state, nb: { ...state.nb, cells }, executingId: null }
    }
    case 'setExecuting':
      return { ...state, executingId: action.id }
    case 'markSaved':
      return { ...state, nb: { ...state.nb, dirty: false }, savedTick: Date.now() }
    default:
      return state
  }
}

/** Create the initial editor state. The kernel starts idle — it is connected
 * lazily on the first run or an explicit "start kernel" click. */
export function initialEditorState(path: string): EditorState {
  return {
    nb: { cells: [], metadata: {}, nbformat: 4, nbformatMinor: 5, dirty: false },
    kernel: 'idle',
    kernelReason: '',
    executingId: null,
    runQueue: [],
    selectedId: null,
    loadError: null,
    kernelError: null,
    savedTick: 0,
  }
}

/** Unused-import guard: MimeBundle is a type used by consumers of this module. */
export type { MimeBundle }
