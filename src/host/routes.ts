/**
 * The /api/dsh-better-sidebar-jupyter route family: environment detection,
 * notebook read/write, kernel lifecycle, and the kernel WebSocket stream
 * (execute / interrupt / restart / shutdown). Everything is session-scoped —
 * every request carries a sessionId (+ optional client cwd) and a path, and
 * the host gate requires the path to live inside the session's authoritative
 * working directory. All routes pass the same browser-trust fence as the
 * /api gateway (Host-header loopback or trustedHosts) — these endpoints read
 * and write conversation files and spawn Python processes.
 * @module dsh-better-sidebar-jupyter/host/routes
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { WebRoute, WebUpgradeRoute } from '@deepseek-ai/dsh-host-webserver'
import { WebSocket, WebSocketServer } from 'ws'
import type { PluginContext } from './context.ts'
import type { NotebookFs } from './jupyter/notebook.ts'
import { detectEnv } from './jupyter/env.ts'
import type { KernelManager } from './jupyter/kernel.ts'
import { createSessionGate } from './gate.ts'

/** Route family base. */
export const JUPYTER_API = {
  env: '/api/dsh-better-sidebar-jupyter/env',
  notebook: '/api/dsh-better-sidebar-jupyter/notebook',
  kernelStatus: '/api/dsh-better-sidebar-jupyter/kernel/status',
  kernelStop: '/api/dsh-better-sidebar-jupyter/kernel/stop',
  kernelInterrupt: '/api/dsh-better-sidebar-jupyter/kernel/interrupt',
  kernelRestart: '/api/dsh-better-sidebar-jupyter/kernel/restart',
  kernelWs: '/api/dsh-better-sidebar-jupyter/kernel/ws',
}

/** Cap on JSON request bodies (notebooks can be large — base64 images). */
const MAX_JSON_BODY_BYTES = 64 * 1024 * 1024

/** One noServer WebSocket server for kernel streams. */
const kernelWss = new WebSocketServer({ noServer: true })

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'referrer-policy': 'no-referrer' })
  res.end(payload)
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown> | undefined> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = chunk as Buffer
    size += buffer.length
    if (size > MAX_JSON_BODY_BYTES) return undefined
    chunks.push(buffer)
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : undefined
  } catch {
    return undefined
  }
}

function queryParam(url: URL, name: string): string | undefined {
  const value = url.searchParams.get(name)
  return value === null ? undefined : value
}

/** Route family dependencies. */
export interface JupyterRoutesDeps {
  ctx: PluginContext
  fs: NotebookFs
  kernels: KernelManager
  fence: (req: IncomingMessage) => boolean
}

/**
 * Build every jupyter route plus the kernel WebSocket upgrade.
 * @param deps - ctx, fs, kernels, fence.
 * @returns routes and the upgrade route.
 */
export function makeRoutes(deps: JupyterRoutesDeps): { routes: WebRoute[]; upgrade: WebUpgradeRoute } {
  const { ctx, fs, kernels, fence } = deps

  const guard = (req: IncomingMessage, res: ServerResponse, method: string): boolean => {
    if (!fence(req)) {
      writeJson(res, 403, { error: 'forbidden' })
      return false
    }
    if (req.method !== method) {
      writeJson(res, 405, { error: `method not allowed: ${req.method}` })
      return false
    }
    return true
  }

  /**
   * Resolve a query path through the session gate. Requires sessionId; the
   * optional client cwd rides the query (the sidebar passes it while the
   * session header is still hydrating).
   * @returns the canonical gated path, or null (a 400 was already written).
   */
  const gatePath = async (url: URL, res: ServerResponse, fallback = ''): Promise<string | null> => {
    const sessionId = queryParam(url, 'sessionId')
    if (sessionId === undefined || sessionId === '') {
      writeJson(res, 400, { error: 'sessionId is required' })
      return null
    }
    const raw = queryParam(url, 'path') ?? fallback
    const verdict = await createSessionGate(ctx, sessionId, queryParam(url, 'cwd'))(raw)
    if (!verdict.ok) {
      writeJson(res, 400, { error: `workspace gate: ${verdict.error}` })
      return null
    }
    return verdict.canonical
  }

  const routes: WebRoute[] = [
    // ------------------------------------------------------------- env
    {
      kind: 'exact',
      path: JUPYTER_API.env,
      handler: async (req, res) => {
        if (!guard(req, res, 'GET')) return
        const report = await detectEnv()
        writeJson(res, 200, { report })
      },
    },
    // ---------------------------------------------------------- notebook
    {
      kind: 'exact',
      path: JUPYTER_API.notebook,
      handler: async (req, res) => {
        const method = req.method ?? 'GET'
        if (!fence(req)) {
          writeJson(res, 403, { error: 'forbidden' })
          return
        }
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (method === 'GET') {
          const path = await gatePath(url, res)
          if (path === null) return
          try {
            const nb = await fs.read(path)
            writeJson(res, 200, { nb })
          } catch (error) {
            writeJson(res, 400, { error: error instanceof Error ? error.message : String(error) })
          }
          return
        }
        if (method !== 'PUT') {
          writeJson(res, 405, { error: `method not allowed: ${method}` })
          return
        }
        const path = await gatePath(url, res)
        if (path === null) return
        const body = await readJsonBody(req)
        if (body === undefined || body.nb === undefined) {
          writeJson(res, 400, { error: 'invalid JSON body: { nb } required' })
          return
        }
        try {
          await fs.write(path, body.nb as Parameters<NotebookFs['write']>[1])
          writeJson(res, 200, { ok: true })
        } catch (error) {
          writeJson(res, 400, { error: error instanceof Error ? error.message : String(error) })
        }
      },
    },
    // --------------------------------------------------- kernel lifecycle
    {
      kind: 'exact',
      path: JUPYTER_API.kernelStatus,
      handler: async (req, res) => {
        if (!guard(req, res, 'GET')) return
        const url = new URL(req.url ?? '/', 'http://localhost')
        const path = await gatePath(url, res)
        if (path === null) return
        writeJson(res, 200, { kernel: kernels.status(path) })
      },
    },
    {
      kind: 'exact',
      path: JUPYTER_API.kernelStop,
      handler: async (req, res) => {
        if (!guard(req, res, 'POST')) return
        const url = new URL(req.url ?? '/', 'http://localhost')
        const path = await gatePath(url, res)
        if (path === null) return
        kernels.shutdown(path)
        writeJson(res, 200, { ok: true })
      },
    },
    {
      kind: 'exact',
      path: JUPYTER_API.kernelInterrupt,
      handler: async (req, res) => {
        if (!guard(req, res, 'POST')) return
        const url = new URL(req.url ?? '/', 'http://localhost')
        const path = await gatePath(url, res)
        if (path === null) return
        kernels.interrupt(path)
        writeJson(res, 200, { ok: true })
      },
    },
    {
      kind: 'exact',
      path: JUPYTER_API.kernelRestart,
      handler: async (req, res) => {
        if (!guard(req, res, 'POST')) return
        const url = new URL(req.url ?? '/', 'http://localhost')
        const path = await gatePath(url, res)
        if (path === null) return
        kernels.restart(path)
        writeJson(res, 200, { ok: true })
      },
    },
  ]

  // ---------------------------------------------- kernel stream (upgrade)
  const upgrade: WebUpgradeRoute = {
    path: JUPYTER_API.kernelWs,
    handler: (req, socket, head) => {
      if (!fence(req)) {
        socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n')
        socket.destroy()
        return
      }
      const url = new URL(req.url ?? '/', 'http://localhost')
      const sessionId = queryParam(url, 'sessionId')
      const rawPath = queryParam(url, 'path')
      if (sessionId === undefined || sessionId === '' || rawPath === undefined || rawPath === '') {
        socket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n')
        socket.destroy()
        return
      }
      void createSessionGate(ctx, sessionId, queryParam(url, 'cwd'))(rawPath).then((verdict) => {
        if (!verdict.ok) {
          socket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n')
          socket.destroy()
          return
        }
        kernelWss.handleUpgrade(req, socket, head, (ws) => {
          let handle: Awaited<ReturnType<KernelManager['attach']>> | undefined
          let closed = false
          const close = (): void => {
            if (closed) return
            closed = true
            try { handle?.detach() } catch { /* already closed */ }
          }
          kernels.attach(verdict.canonical, ws).then((attached) => {
            if (ws.readyState !== WebSocket.OPEN) {
              attached.detach()
              return
            }
            handle = attached
            ws.send(JSON.stringify({ type: 'kernel_state', running: true, ready: true, key: verdict.canonical }))
          }).catch((error) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'kernel_error', message: error instanceof Error ? error.message : String(error) }))
              ws.close(1011, 'kernel failed')
            }
            closed = true
          })
          ws.on('message', (data) => {
            let frame: { type?: string } & Record<string, unknown>
            try {
              frame = JSON.parse(String(data)) as { type?: string } & Record<string, unknown>
            } catch {
              return
            }
            const type = frame.type
            if (type === 'execute') {
              const cellId = typeof frame.cellId === 'string' ? frame.cellId : ''
              const code = typeof frame.code === 'string' ? frame.code : ''
              const index = typeof frame.index === 'number' ? frame.index : -1
              if (cellId === '') return
              handle?.command({ op: 'execute', cell_id: cellId, code, index })
            } else if (type === 'interrupt') {
              handle?.command({ op: 'interrupt' })
            } else if (type === 'restart') {
              handle?.command({ op: 'restart' })
            } else if (type === 'shutdown') {
              handle?.command({ op: 'shutdown' })
              close()
              try { ws.close(1000, 'kernel shutdown') } catch { /* already closed */ }
            }
          })
          ws.on('close', close)
          ws.on('error', close)
        })
      }).catch(() => {
        socket.write('HTTP/1.1 500 Internal Server Error\r\nConnection: close\r\n\r\n')
        socket.destroy()
      })
    },
  }

  return { routes, upgrade }
}
