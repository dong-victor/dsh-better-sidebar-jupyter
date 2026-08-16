/**
 * Shared client-side data model: the UI notebook document (cells with live
 * outputs) and the wire types for the /api/dsh-jupyter routes and the kernel
 * WebSocket.
 * @module dsh-jupyter/client/types
 */

/** MIME bundle as carried by nbformat outputs and kernel messages. */
export type MimeBundle = Record<string, unknown>

/** A cell output in UI form (superset of nbformat output shapes). */
export type UiOutput =
  | { outputType: 'stream'; name: 'stdout' | 'stderr'; text: string }
  | { outputType: 'display_data'; data: MimeBundle; metadata: Record<string, unknown> }
  | { outputType: 'execute_result'; data: MimeBundle; metadata: Record<string, unknown>; executionCount: number | null }
  | { outputType: 'error'; ename: string; evalue: string; traceback: string[] }

/** One cell in the UI document. */
export interface UiCell {
  /** Stable client id (not persisted). */
  id: string
  type: 'code' | 'markdown' | 'raw'
  source: string
  outputs: UiOutput[]
  executionCount: number | null
  running: boolean
}

/** The UI notebook document. */
export interface UiNotebook {
  cells: UiCell[]
  metadata: Record<string, unknown>
  nbformat: number
  nbformatMinor: number
  /** Dirty flag: true once the user edited something since the last save. */
  dirty: boolean
}

/** Directory entry from the list route. */
export interface DirEntry {
  name: string
  path: string
  isDir: boolean
  isNotebook: boolean
}

/** Workspace row from the workspaces route. */
export interface WorkspaceRow {
  id: string
  path: string
  title: string
}

/** Python/Jupyter environment report. */
export interface EnvReport {
  python:
    | { ok: true; executable: string; version: string }
    | { ok: false; executable: string; error: string }
  jupyter: { ok: true; clientVersion: string; ipykernelVersion: string } | { ok: false; error: string }
  checkedAt: number
}

/** Kernel lifecycle summary. */
export interface KernelSummary {
  kernelId: string
  running: boolean
  python: string
  ready: boolean
  attachCount: number
  lastError: string | null
}

/** Server -> client kernel WebSocket frames. */
export type KernelServerFrame =
  | { type: 'kernel_state'; running: boolean; ready: boolean; reason?: string; key?: string }
  | { type: 'kernel_error'; message: string }
  | { type: 'event'; event: KernelEvent }

/** Bridge events relayed inside { type: 'event' } frames. */
export type KernelEvent =
  | { type: 'ready'; kernel_name: string; language_info: Record<string, unknown> }
  | { type: 'status'; execution_state: 'busy' | 'idle'; cell_id: string | null }
  | { type: 'stream'; cell_id: string | null; name: 'stdout' | 'stderr'; text: string }
  | { type: 'display_data'; cell_id: string | null; data: MimeBundle; metadata: Record<string, unknown> }
  | { type: 'update_display_data'; cell_id: string | null; data: MimeBundle; metadata: Record<string, unknown> }
  | { type: 'execute_result'; cell_id: string | null; data: MimeBundle; execution_count: number | null; metadata: Record<string, unknown> }
  | { type: 'error'; cell_id: string | null; ename: string; evalue: string; traceback: string[] }
  | { type: 'clear_output'; cell_id: string | null; wait: boolean }
  | { type: 'execute_reply'; cell_id: string | null; ok: boolean; execution_count: number | null }
  | { type: 'kernel_died'; message: string; cell_id?: string | null }
  | { type: 'log'; level: string; message: string }
  | { type: 'status_reply'; alive: boolean }

/** Client -> server kernel WebSocket frames. */
export type KernelClientFrame =
  | { type: 'execute'; cellId: string; code: string; index?: number }
  | { type: 'interrupt' }
  | { type: 'restart' }
  | { type: 'shutdown' }
