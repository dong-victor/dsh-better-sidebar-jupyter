/**
 * Browser-side API client for the /api/dsh-better-sidebar-jupyter route
 * family plus the kernel WebSocket. Every call carries the session scope
 * (sessionId + optional cwd) so the host can gate the path against the
 * session's authoritative working directory. The only data access path the
 * notebook panel components use — plain fetch / WebSocket, same origin.
 * @module dsh-better-sidebar-jupyter/client/api
 */

import type {
  EnvReport,
  KernelClientFrame,
  KernelServerFrame,
  KernelSummary,
} from './types.ts'

/** The sidebar session scope a viewer receives (structural subset). */
export interface SessionScope {
  sessionId: string
  /** The session's working directory from the client list summary (optional). */
  cwd?: string
}

/** Route table mirrors the host half. */
export const JUPYTER_API = {
  env: '/api/dsh-better-sidebar-jupyter/env',
  notebook: '/api/dsh-better-sidebar-jupyter/notebook',
  kernelStatus: '/api/dsh-better-sidebar-jupyter/kernel/status',
  kernelStop: '/api/dsh-better-sidebar-jupyter/kernel/stop',
  kernelInterrupt: '/api/dsh-better-sidebar-jupyter/kernel/interrupt',
  kernelRestart: '/api/dsh-better-sidebar-jupyter/kernel/restart',
  kernelWs: '/api/dsh-better-sidebar-jupyter/kernel/ws',
}

/** Error carrying the route's JSON error message. */
export class JupyterApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JupyterApiError'
  }
}

async function readJson<T>(response: Response): Promise<T> {
  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new JupyterApiError(`HTTP ${response.status}: invalid JSON response`)
  }
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && typeof (body as { error?: unknown }).error === 'string'
      ? (body as { error: string }).error
      : `HTTP ${response.status}`
    throw new JupyterApiError(message)
  }
  return body as T
}

function query(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, value)
  }
  const text = search.toString()
  return text === '' ? '' : '?' + text
}

/** One open kernel connection (WebSocket JSON frames). */
export interface KernelConnection {
  /** Fired on every server frame. */
  onFrame: ((frame: KernelServerFrame) => void) | undefined
  /** Fired when the transport closes (with an optional reason). */
  onClose: ((reason?: string) => void) | undefined
  send(frame: KernelClientFrame): void
  close(): void
  /** Current socket state: 0 connecting, 1 open, 2 closing, 3 closed. */
  readyState(): number
}

/**
 * The browser half's only data entry point, bound to one session scope. The
 * sidebar editor creates one instance per open notebook (the scope rides the
 * FileViewerProps), so a notebook always talks to its own session's cwd.
 */
export class JupyterApi {
  constructor(private readonly scope: SessionScope) {}

  /** Fold the session scope into every query string. */
  private scoped(extra: Record<string, string | undefined>): string {
    return query({
      sessionId: this.scope.sessionId,
      ...(this.scope.cwd !== undefined && this.scope.cwd !== '' ? { cwd: this.scope.cwd } : {}),
      ...extra,
    })
  }

  async env(): Promise<EnvReport> {
    const response = await fetch(JUPYTER_API.env)
    const body = await readJson<{ report: EnvReport }>(response)
    return body.report
  }

  async readNotebook(path: string): Promise<unknown> {
    const response = await fetch(JUPYTER_API.notebook + this.scoped({ path }))
    const body = await readJson<{ nb: unknown }>(response)
    return body.nb
  }

  async saveNotebook(path: string, nb: unknown): Promise<void> {
    const response = await fetch(JUPYTER_API.notebook + this.scoped({ path }), {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nb }),
    })
    await readJson<{ ok: boolean }>(response)
  }

  async kernelStatus(path: string): Promise<KernelSummary> {
    const response = await fetch(JUPYTER_API.kernelStatus + this.scoped({ path }))
    const body = await readJson<{ kernel: KernelSummary }>(response)
    return body.kernel
  }

  async stopKernel(path: string): Promise<void> {
    const response = await fetch(JUPYTER_API.kernelStop + this.scoped({ path }), { method: 'POST' })
    await readJson<{ ok: boolean }>(response)
  }

  async interruptKernel(path: string): Promise<void> {
    const response = await fetch(JUPYTER_API.kernelInterrupt + this.scoped({ path }), { method: 'POST' })
    await readJson<{ ok: boolean }>(response)
  }

  async restartKernel(path: string): Promise<void> {
    const response = await fetch(JUPYTER_API.kernelRestart + this.scoped({ path }), { method: 'POST' })
    await readJson<{ ok: boolean }>(response)
  }

  /** Open a WebSocket kernel session for a notebook path. */
  connectKernel(path: string): KernelConnection {
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const url = scheme + '://' + window.location.host + JUPYTER_API.kernelWs + this.scoped({ path })
    const socket = new WebSocket(url)
    const connection: KernelConnection = {
      onFrame: undefined,
      onClose: undefined,
      send: (frame) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(frame))
        }
      },
      close: () => {
        try { socket.close() } catch { /* already closed */ }
      },
      readyState: () => socket.readyState,
    }
    socket.onmessage = (event: MessageEvent<string>) => {
      let frame: KernelServerFrame
      try {
        frame = JSON.parse(event.data) as KernelServerFrame
      } catch {
        return
      }
      connection.onFrame?.(frame)
    }
    socket.onclose = () => { connection.onClose?.('connection closed') }
    socket.onerror = () => { connection.onClose?.('connection error') }
    return connection
  }
}
