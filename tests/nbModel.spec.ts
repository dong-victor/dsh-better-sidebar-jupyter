/**
 * Tests for the notebook model conversion (nbformat <-> UI document): the
 * round-trip must preserve cells, sources, outputs and execution counts, and
 * a malformed document must degrade to a valid empty-ish notebook.
 */
import { describe, expect, it } from 'vitest'
import { emptyUiNotebook, makeCell, notebookFromJson, notebookToJson } from '../src/client/jupyter/nbModel.ts'

describe('notebookFromJson', () => {
  it('parses code/markdown cells with outputs and execution counts', () => {
    const nb = notebookFromJson({
      cells: [
        { cell_type: 'code', source: 'print(1)', execution_count: 3, outputs: [
          { output_type: 'stream', name: 'stdout', text: '1\n' },
          { output_type: 'execute_result', data: { 'text/plain': '1' }, execution_count: 3, metadata: {} },
        ] },
        { cell_type: 'markdown', source: ['# Hi', '\n\n', 'text'] },
      ],
      metadata: {},
      nbformat: 4,
      nbformat_minor: 5,
    })
    expect(nb.cells).toHaveLength(2)
    expect(nb.cells[0]?.type).toBe('code')
    expect(nb.cells[0]?.source).toBe('print(1)')
    expect(nb.cells[0]?.executionCount).toBe(3)
    expect(nb.cells[0]?.outputs).toHaveLength(2)
    // A list-of-strings source joins into one string (no separator inserted).
    expect(nb.cells[1]?.type).toBe('markdown')
    expect(nb.cells[1]?.source).toBe('# Hi\n\ntext')
  })

  it('degrades malformed input to an empty cell list', () => {
    const nb = notebookFromJson({ cells: 'nope' })
    expect(nb.cells).toEqual([])
    expect(nb.nbformat).toBe(4)
  })
})

describe('notebookToJson round-trip', () => {
  it('preserves cells, ids, sources and outputs', () => {
    const ui = emptyUiNotebook()
    ui.cells = [
      makeCell('code', 'x = 1'),
      makeCell('markdown', '# Title'),
    ]
    ui.cells[0] = { ...ui.cells[0]!, outputs: [{ outputType: 'stream', name: 'stdout', text: '1' }], executionCount: 7 }
    const json = notebookToJson(ui)
    expect(json.nbformat).toBe(4)
    expect((json.cells as Array<Record<string, unknown>>)).toHaveLength(2)
    const code = (json.cells as Array<Record<string, unknown>>)[0]!
    expect(code.cell_type).toBe('code')
    expect(code.source).toBe('x = 1')
    expect(code.execution_count).toBe(7)
    expect((code.outputs as Array<Record<string, unknown>>)[0]).toEqual({
      output_type: 'stream',
      name: 'stdout',
      text: '1',
    })
    // The stable cell id survives the round trip.
    const back = notebookFromJson(json)
    expect(back.cells.map(c => c.id)).toEqual(ui.cells.map(c => c.id))
  })
})

describe('emptyUiNotebook', () => {
  it('starts with one empty code cell and nbformat 4.5', () => {
    const nb = emptyUiNotebook()
    expect(nb.cells).toHaveLength(1)
    expect(nb.cells[0]?.type).toBe('code')
    expect(nb.nbformatMinor).toBe(5)
  })
})
