/**
 * nbformat <-> UI document conversion. The UI keeps cells with stable client
 * ids and typed outputs; saving maps them back to nbformat 4 shapes.
 * @module dsh-jupyter/client/nbModel
 */

import type { MimeBundle, UiCell, UiNotebook, UiOutput } from './types.ts'

/** nbformat cell as read from disk. */
interface NbCell {
  cell_type: string
  source: unknown
  outputs?: Array<Record<string, unknown>>
  execution_count?: unknown
  metadata?: Record<string, unknown>
  /** nbformat 4.5 stable cell id — persisted so background execution can
   * write outputs back to the right cell across reloads. */
  id?: string
}

/** nbformat notebook as read from disk. */
interface NbDocument {
  cells: NbCell[]
  metadata?: Record<string, unknown>
  nbformat?: unknown
  nbformat_minor?: unknown
}

let idCounter = 0

function nextId(): string {
  // Prefer real UUIDs (nbformat 4.5 cell ids are UUIDs); fall back to a
  // unique-but-informal id in non-secure contexts.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  idCounter += 1
  return `cell-${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** Normalize a cell source (string or list of strings). */
function sourceToString(source: unknown): string {
  if (typeof source === 'string') return source
  if (Array.isArray(source)) return source.map((part) => (typeof part === 'string' ? part : String(part))).join('')
  return source === undefined || source === null ? '' : String(source)
}

/** Convert one nbformat output record to a UI output. */
function outputFromNb(raw: Record<string, unknown>): UiOutput {
  const type = raw.output_type
  const data = typeof raw.data === 'object' && raw.data !== null ? raw.data as MimeBundle : {}
  const metadata = typeof raw.metadata === 'object' && raw.metadata !== null ? raw.metadata as Record<string, unknown> : {}
  if (type === 'stream') {
    return {
      outputType: 'stream',
      name: raw.name === 'stderr' ? 'stderr' : 'stdout',
      text: typeof raw.text === 'string' ? raw.text : Array.isArray(raw.text) ? raw.text.join('') : '',
    }
  }
  if (type === 'display_data') {
    return { outputType: 'display_data', data, metadata }
  }
  if (type === 'execute_result') {
    const count = typeof raw.execution_count === 'number' ? raw.execution_count : null
    return { outputType: 'execute_result', data, metadata, executionCount: count }
  }
  if (type === 'error') {
    return {
      outputType: 'error',
      ename: typeof raw.ename === 'string' ? raw.ename : 'Error',
      evalue: typeof raw.evalue === 'string' ? raw.evalue : '',
      traceback: Array.isArray(raw.traceback) ? raw.traceback.filter((line): line is string => typeof line === 'string') : [],
    }
  }
  // Unknown output type: degrade to a plain text output.
  return { outputType: 'stream', name: 'stdout', text: JSON.stringify(raw) }
}

/** Convert a raw nbformat notebook (from the API) to a UI document. */
export function notebookFromJson(value: unknown): UiNotebook {
  const nb = value as NbDocument
  const cells = Array.isArray(nb.cells) ? nb.cells : []
  const uiCells: UiCell[] = cells.map((cell) => {
    const type = cell.cell_type === 'markdown' ? 'markdown' : cell.cell_type === 'raw' ? 'raw' : 'code'
    const outputs = type === 'code' && Array.isArray(cell.outputs) ? cell.outputs.map(outputFromNb) : []
    const count = type === 'code' && typeof cell.execution_count === 'number' ? cell.execution_count : null
    return {
      id: typeof cell.id === 'string' && cell.id !== '' ? cell.id : nextId(),
      type,
      source: sourceToString(cell.source),
      outputs,
      executionCount: count,
      running: false,
    }
  })
  return {
    cells: uiCells,
    metadata: typeof nb.metadata === 'object' && nb.metadata !== null ? nb.metadata : {},
    nbformat: typeof nb.nbformat === 'number' ? nb.nbformat : 4,
    nbformatMinor: typeof nb.nbformat_minor === 'number' ? nb.nbformat_minor : 5,
    dirty: false,
  }
}

/** Convert one UI output back to an nbformat output record. */
function outputToNb(output: UiOutput): Record<string, unknown> {
  if (output.outputType === 'stream') {
    return { output_type: 'stream', name: output.name, text: output.text }
  }
  if (output.outputType === 'display_data') {
    return { output_type: 'display_data', data: output.data, metadata: output.metadata }
  }
  if (output.outputType === 'execute_result') {
    return { output_type: 'execute_result', data: output.data, metadata: output.metadata, execution_count: output.executionCount }
  }
  return { output_type: 'error', ename: output.ename, evalue: output.evalue, traceback: output.traceback }
}

/** Convert the UI document back to a serializable nbformat notebook. */
export function notebookToJson(nb: UiNotebook): Record<string, unknown> {
  const cells = nb.cells.map((cell) => {
    const base: Record<string, unknown> = { cell_type: cell.type, metadata: {}, source: cell.source, id: cell.id }
    if (cell.type === 'code') {
      base.outputs = cell.outputs.map(outputToNb)
      base.execution_count = cell.executionCount
    }
    return base
  })
  return {
    cells,
    metadata: nb.metadata,
    nbformat: nb.nbformat,
    nbformat_minor: nb.nbformatMinor,
  }
}

/** Create a fresh UI document (new notebook). */
export function emptyUiNotebook(): UiNotebook {
  return {
    cells: [{
      id: nextId(),
      type: 'code',
      source: '',
      outputs: [],
      executionCount: null,
      running: false,
    }],
    metadata: { kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' } },
    nbformat: 4,
    nbformatMinor: 5,
    dirty: false,
  }
}

/** New cell factory. */
export function makeCell(type: 'code' | 'markdown' | 'raw', source = ''): UiCell {
  return { id: nextId(), type, source, outputs: [], executionCount: null, running: false }
}
