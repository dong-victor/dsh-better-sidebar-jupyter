/**
 * Tests for the editor reducer's kernel-lifecycle handling: a dead kernel
 * clears every cell's running flag (no stuck spinners), and status events
 * mark the right cell executing.
 */
import { describe, expect, it } from 'vitest'
import { applyKernelEvent, editorReducer, initialEditorState, type EditorState } from '../src/client/jupyter/panel/editorReducer.ts'
import { makeCell } from '../src/client/jupyter/nbModel.ts'

function stateWithRunningCells(): EditorState {
  const state = initialEditorState('x.ipynb')
  const a = { ...makeCell('code', 'a'), running: true }
  const b = { ...makeCell('code', 'b'), running: false }
  return { ...state, nb: { ...state.nb, cells: [a, b] }, executingId: a.id }
}

describe('kernelPhase dead', () => {
  it('clears the executing id and every running flag', () => {
    const before = stateWithRunningCells()
    const after = editorReducer(before, { type: 'kernelPhase', phase: 'dead', reason: 'shutdown' })
    expect(after.kernel).toBe('dead')
    expect(after.executingId).toBeNull()
    expect(after.nb.cells.every((c) => c.running === false)).toBe(true)
  })

  it('keeps non-running cells untouched', () => {
    const before = stateWithRunningCells()
    const after = editorReducer(before, { type: 'kernelPhase', phase: 'dead', reason: 'shutdown' })
    expect(after.nb.cells[1]?.running).toBe(false)
  })
})

describe('status busy', () => {
  it('marks the cell with the reported id as running', () => {
    const state = initialEditorState('x.ipynb')
    const cells = [makeCell('code', 'a'), makeCell('code', 'b')]
    const loaded = { ...state, nb: { ...state.nb, cells } }
    const after = applyKernelEvent(loaded, { type: 'status', execution_state: 'busy', cell_id: cells[1]!.id })
    expect(after.nb.cells[1]?.running).toBe(true)
    expect(after.nb.cells[0]?.running).toBe(false)
  })

  it('makes the busy cell the executing cell (running indicator on reopen)', () => {
    const state = initialEditorState('x.ipynb')
    const cells = [makeCell('code', 'a'), makeCell('code', 'b')]
    const loaded = { ...state, nb: { ...state.nb, cells } }
    // Replayed busy from a reopen (no beginExecute ran in this document).
    const after = applyKernelEvent(loaded, { type: 'status', execution_state: 'busy', cell_id: cells[1]!.id })
    expect(after.executingId).toBe(cells[1]?.id)
  })

  it('an idle status does not change the executing id', () => {
    const state = initialEditorState('x.ipynb')
    const cells = [makeCell('code', 'a')]
    const loaded = { ...state, nb: { ...state.nb, cells }, executingId: cells[0]!.id }
    const after = applyKernelEvent(loaded, { type: 'status', execution_state: 'idle', cell_id: cells[0]!.id })
    expect(after.executingId).toBe(cells[0]?.id)
  })
})

describe('run timing (IDEA duration corner)', () => {
  it('measures duration between beginExecute and endExecute', () => {
    const state = initialEditorState('x.ipynb')
    const a = makeCell('code', 'a')
    const loaded = { ...state, nb: { ...state.nb, cells: [a] } }
    const begun = editorReducer(loaded, { type: 'beginExecute', id: a.id, at: 1000 })
    expect(begun.nb.cells[0]?.running).toBe(true)
    expect(begun.nb.cells[0]?.runMs).toBeNull()
    const ended = editorReducer(begun, { type: 'endExecute', id: a.id, ok: true, at: 2500 })
    expect(ended.nb.cells[0]?.running).toBe(false)
    expect(ended.nb.cells[0]?.runMs).toBe(1500)
    expect(ended.nb.cells[0]?.runAt).toBe(2500)
    expect(ended.executingId).toBeNull()
  })

  it('does not report a duration for runs the client never saw', () => {
    const state = initialEditorState('x.ipynb')
    const a = makeCell('code', 'a')
    const loaded = { ...state, nb: { ...state.nb, cells: [a] } }
    const ended = editorReducer(loaded, { type: 'endExecute', id: a.id, ok: true, at: 2500 })
    expect(ended.nb.cells[0]?.runMs).toBeNull()
    expect(ended.nb.cells[0]?.runAt).toBe(2500)
  })
})

describe('addCellBelow (Shift+Enter on last cell creates one)', () => {
  it('inserts a code cell after the target and selects it', () => {
    const state = initialEditorState('x.ipynb')
    const a = makeCell('code', 'a')
    const b = makeCell('markdown', 'b')
    const loaded = { ...state, nb: { ...state.nb, cells: [a, b] } }
    const after = editorReducer(loaded, { type: 'addCellBelow', id: b.id })
    expect(after.nb.cells).toHaveLength(3)
    expect(after.nb.cells[2]?.type).toBe('code')
    expect(after.nb.cells[1]?.id).toBe(b.id)
    expect(after.selectedId).toBe(after.nb.cells[2]?.id)
  })
})

describe('setCellType (toolbar cell-type selector)', () => {
  it('converts a code cell to markdown and clears outputs', () => {
    const state = initialEditorState('x.ipynb')
    const a = { ...makeCell('code', 'a'), outputs: [{ outputType: 'stream', name: 'stdout' as const, text: 'x' }] }
    const loaded = { ...state, nb: { ...state.nb, cells: [a] } }
    const after = editorReducer(loaded, { type: 'setCellType', id: a.id, cellType: 'markdown' })
    expect(after.nb.cells[0]?.type).toBe('markdown')
    expect(after.nb.cells[0]?.outputs).toEqual([])
  })

  it('is a no-op when the type is unchanged', () => {
    const state = initialEditorState('x.ipynb')
    const a = makeCell('code', 'a')
    const loaded = { ...state, nb: { ...state.nb, cells: [a] } }
    expect(editorReducer(loaded, { type: 'setCellType', id: a.id, cellType: 'code' })).toBe(loaded)
  })
})

describe('selectAdjacent', () => {
  it('moves the selection up/down within bounds', () => {
    const state = initialEditorState('x.ipynb')
    const cells = [makeCell('code', 'a'), makeCell('code', 'b'), makeCell('code', 'c')]
    const loaded = { ...state, nb: { ...state.nb, cells }, selectedId: cells[1]!.id }
    expect(editorReducer(loaded, { type: 'selectAdjacent', dir: 1 }).selectedId).toBe(cells[2]?.id)
    expect(editorReducer(loaded, { type: 'selectAdjacent', dir: -1 }).selectedId).toBe(cells[0]?.id)
    const atBottom = { ...loaded, selectedId: cells[2]!.id }
    expect(editorReducer(atBottom, { type: 'selectAdjacent', dir: 1 }).selectedId).toBe(cells[2]?.id)
  })
})

describe('clearAllOutputs', () => {
  it('clears every code cell output', () => {
    const state = initialEditorState('x.ipynb')
    const a = { ...makeCell('code', 'a'), outputs: [{ outputType: 'stream', name: 'stdout' as const, text: 'x' }] }
    const b = { ...makeCell('markdown', 'b') }
    const loaded = { ...state, nb: { ...state.nb, cells: [a, b] } }
    const after = editorReducer(loaded, { type: 'clearAllOutputs' })
    expect(after.nb.cells[0]?.outputs).toEqual([])
    expect(after.nb.cells[1]?.outputs).toEqual([])
  })
})

describe('kernel name from ready event', () => {
  it('records the kernel name for the status widget', () => {
    const state = initialEditorState('x.ipynb')
    const after = applyKernelEvent(state, { type: 'ready', kernel_name: 'python3', language_info: {} })
    expect(after.kernelName).toBe('python3')
    expect(after.kernel).toBe('ready')
  })
})

describe('clear outputs before a re-run (Jupyter semantics)', () => {
  it('beginExecute clears the head cell previous outputs', () => {
    const state = initialEditorState('x.ipynb')
    const a = { ...makeCell('code', 'a'), outputs: [{ outputType: 'stream', name: 'stdout' as const, text: 'old' }] }
    const loaded = { ...state, nb: { ...state.nb, cells: [a] } }
    const after = editorReducer(loaded, { type: 'beginExecute', id: a.id, at: 1000 })
    expect(after.nb.cells[0]?.outputs).toEqual([])
    expect(after.nb.cells[0]?.running).toBe(true)
  })

  it('a busy transition clears a queued cell previous outputs (run-all tail)', () => {
    const state = initialEditorState('x.ipynb')
    const a = makeCell('code', 'a')
    const b = { ...makeCell('code', 'b'), outputs: [{ outputType: 'stream', name: 'stdout' as const, text: 'old-b' }] }
    const loaded = { ...state, nb: { ...state.nb, cells: [a, b] }, executingId: a.id }
    const after = applyKernelEvent(loaded, { type: 'status', execution_state: 'busy', cell_id: b.id })
    expect(after.nb.cells[1]?.running).toBe(true)
    expect(after.nb.cells[1]?.outputs).toEqual([])
  })

  it('an idle status never clears outputs', () => {
    const state = initialEditorState('x.ipynb')
    const a = { ...makeCell('code', 'a'), outputs: [{ outputType: 'stream', name: 'stdout' as const, text: 'keep' }] }
    const loaded = { ...state, nb: { ...state.nb, cells: [a] } }
    const after = applyKernelEvent(loaded, { type: 'status', execution_state: 'idle', cell_id: a.id })
    expect(after.nb.cells[0]?.outputs).toHaveLength(1)
    expect(after.nb.cells[0]?.running).toBe(false)
  })

  it('does not clear outputs when the busy event repeats for an already-running cell', () => {
    const state = initialEditorState('x.ipynb')
    const a = { ...makeCell('code', 'a'), running: true, outputs: [{ outputType: 'stream', name: 'stdout' as const, text: 'fresh' }] }
    const loaded = { ...state, nb: { ...state.nb, cells: [a] }, executingId: a.id }
    const after = applyKernelEvent(loaded, { type: 'status', execution_state: 'busy', cell_id: a.id })
    expect(after.nb.cells[0]?.outputs).toHaveLength(1)
  })
})

describe('markQueued (run-all batch re-sync after reopen)', () => {
  it('marks the listed cells queued and clears the rest', () => {
    const state = initialEditorState('x.ipynb')
    const a = makeCell('code', 'a')
    const b = makeCell('code', 'b')
    const c = makeCell('code', 'c')
    const loaded = { ...state, nb: { ...state.nb, cells: [a, b, c] } }
    const after = editorReducer(loaded, { type: 'markQueued', ids: [b.id, c.id] })
    expect(after.nb.cells.map((cell) => cell.queued)).toEqual([false, true, true])
  })

  it('never marks a running cell queued', () => {
    const state = initialEditorState('x.ipynb')
    const a = { ...makeCell('code', 'a'), running: true }
    const b = makeCell('code', 'b')
    const loaded = { ...state, nb: { ...state.nb, cells: [a, b] }, executingId: a.id }
    const after = editorReducer(loaded, { type: 'markQueued', ids: [a.id, b.id] })
    expect(after.nb.cells[0]?.queued).toBe(false)
    expect(after.nb.cells[1]?.queued).toBe(true)
  })

  it('a queued cell clears its flag when it starts executing (busy)', () => {
    const state = initialEditorState('x.ipynb')
    const a = makeCell('code', 'a')
    const b = { ...makeCell('code', 'b'), queued: true }
    const loaded = { ...state, nb: { ...state.nb, cells: [a, b] }, executingId: a.id }
    const after = applyKernelEvent(loaded, { type: 'status', execution_state: 'busy', cell_id: b.id })
    expect(after.nb.cells[1]?.queued).toBe(false)
    expect(after.nb.cells[1]?.running).toBe(true)
  })
})
