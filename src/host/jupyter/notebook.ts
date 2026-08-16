/**
 * Notebook filesystem service: read, write, validate, and enumerate .ipynb
 * files under the workspace gate. All paths crossing this service are
 * canonical (already passed through the gate).
 * @module dsh-jupyter/host/notebook
 */

import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/** One directory entry in the browser's file listing. */
export interface DirEntry {
  name: string
  /** Absolute canonical path. */
  path: string
  isDir: boolean
  /** True only for *.ipynb files. */
  isNotebook: boolean
}

/** MIME-type keys a notebook output payload may carry. */
export type MimeBundle = Record<string, unknown>

/** A Jupyter notebook in nbformat 4 shape (loosely typed — we pass cells through). */
export interface Notebook {
  cells: Array<Record<string, unknown>>
  metadata: Record<string, unknown>
  nbformat: number
  nbformat_minor: number
}

/** Parse errors carry a readable message. */
export class NotebookError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotebookError'
  }
}

/** Build a fresh empty notebook (nbformat 4.5, one empty code cell). */
export function emptyNotebook(): Notebook {
  return {
    cells: [
      {
        cell_type: 'code',
        execution_count: null,
        metadata: {},
        outputs: [],
        source: '',
      },
    ],
    metadata: {
      kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
      language_info: { name: 'python', version: '3' },
    },
    nbformat: 4,
    nbformat_minor: 5,
  }
}

/** Validate a parsed notebook; throws NotebookError when malformed. */
export function validateNotebook(value: unknown): Notebook {
  if (typeof value !== 'object' || value === null) throw new NotebookError('notebook is not a JSON object')
  const nb = value as Record<string, unknown>
  if (!Array.isArray(nb.cells)) throw new NotebookError('notebook has no cells array')
  const cells: Array<Record<string, unknown>> = []
  for (const raw of nb.cells) {
    if (typeof raw !== 'object' || raw === null) throw new NotebookError('a cell is not a JSON object')
    const cell = raw as Record<string, unknown>
    const type = cell.cell_type
    if (type !== 'code' && type !== 'markdown' && type !== 'raw') {
      throw new NotebookError(`unknown cell_type ${String(type)}`)
    }
    // Normalize source (string or list of strings -> string).
    const source = normalizeSource(cell.source)
    const normalized: Record<string, unknown> = { ...cell, source }
    if (type === 'code') {
      if (!Array.isArray(cell.outputs)) normalized.outputs = []
      if (typeof cell.execution_count !== 'number' && cell.execution_count !== null) {
        normalized.execution_count = null
      }
    }
    cells.push(normalized)
  }
  const metadata = typeof nb.metadata === 'object' && nb.metadata !== null ? nb.metadata as Record<string, unknown> : {}
  return {
    cells,
    metadata,
    nbformat: typeof nb.nbformat === 'number' ? nb.nbformat : 4,
    nbformat_minor: typeof nb.nbformat_minor === 'number' ? nb.nbformat_minor : 5,
  }
}

/** A cell source may be a string or a list of strings; join into one string. */
function normalizeSource(source: unknown): string {
  if (typeof source === 'string') return source
  if (Array.isArray(source)) {
    return source
      .map((part) => (typeof part === 'string' ? part : String(part)))
      .join('')
  }
  return source === undefined || source === null ? '' : String(source)
}

/** Serialize a notebook the way Jupyter writes it: 2-space indent + newline. */
export function serializeNotebook(nb: Notebook): string {
  return JSON.stringify(validateNotebook(nb), null, 2) + '\n'
}

/** Parse notebook bytes; throws NotebookError on malformed JSON. */
export function parseNotebook(text: string): Notebook {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw new NotebookError(`invalid notebook JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
  return validateNotebook(parsed)
}

/**
 * The notebook fs service. Every public method takes an already-gated
 * canonical path.
 */
export class NotebookFs {
  /** Read and validate a notebook file. */
  async read(path: string): Promise<Notebook> {
    let text: string
    try {
      text = await readFile(path, 'utf8')
    } catch (error) {
      throw new NotebookError(`cannot read notebook: ${error instanceof Error ? error.message : String(error)}`)
    }
    return parseNotebook(text)
  }

  /** Validate and write a notebook file (atomic-ish: temp + rename not needed on loopback, keep simple). */
  async write(path: string, nb: Notebook): Promise<void> {
    const payload = serializeNotebook(nb)
    try {
      await writeFile(path, payload, 'utf8')
    } catch (error) {
      throw new NotebookError(`cannot write notebook: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /** Create a new empty notebook at dir/name.ipynb; returns the absolute path. */
  async create(dir: string, name: string): Promise<string> {
    const safe = name.trim().replace(/[\\/:*?"<>|]/g, '_')
    let filename = safe
    if (!/\.ipynb$/i.test(filename)) filename += '.ipynb'
    const path = join(dir, filename)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, serializeNotebook(emptyNotebook()), 'utf8')
    return path
  }

  /**
   * Persist a completed cell execution into the notebook file (background
   * execution log). Locates the cell by its stable `id` (nbformat 4.5), falling
   * back to the cell index the client captured when the run started, then to
   * the executed source text. Writes the collected outputs + execution count
   * and records the cell id so later runs match directly.
   * @returns true when the notebook was updated on disk.
   */
  async applyOutputs(
    path: string,
    cellId: string,
    index: number,
    source: string,
    outputs: Array<Record<string, unknown>>,
    executionCount: number | null,
  ): Promise<boolean> {
    let nb: Notebook
    try {
      nb = await this.read(path)
    } catch {
      return false
    }
    const cells = nb.cells as Array<Record<string, unknown>>
    let target: Record<string, unknown> | undefined
    if (cellId !== '') target = cells.find((cell) => cell.id === cellId)
    if (target === undefined && index >= 0 && index < cells.length) target = cells[index]
    if (target === undefined) target = cells.find((cell) => normalizeSource(cell.source) === source)
    if (target === undefined || target.cell_type !== 'code') return false

    const updated: Record<string, unknown> = { ...target, id: cellId, outputs, execution_count: executionCount }
    cells[cells.indexOf(target)] = updated
    try {
      await this.write(path, { ...nb, cells: cells as unknown as Notebook['cells'] })
      return true
    } catch {
      return false
    }
  }

  /** List one directory: subdirectories and files (notebooks flagged). */
  async list(dir: string): Promise<DirEntry[]> {
    let entries: string[]
    try {
      entries = await readdir(dir)
    } catch (error) {
      throw new NotebookError(`cannot list directory: ${error instanceof Error ? error.message : String(error)}`)
    }
    const out: DirEntry[] = []
    for (const name of entries) {
      const path = join(dir, name)
      let isDir = false
      try {
        isDir = (await stat(path)).isDirectory()
      } catch {
        continue // vanished during listing
      }
      out.push({ name, path, isDir, isNotebook: !isDir && /\.ipynb$/i.test(name) })
    }
    out.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    return out
  }
}
