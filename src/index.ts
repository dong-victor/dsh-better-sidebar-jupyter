/**
 * Host half of the dsh-better-sidebar Jupyter plugin: mounts the
 * session-scoped jupyter routes (/api/dsh-better-sidebar-jupyter/*) and the
 * kernel WebSocket upgrade, owning one Python bridge kernel per notebook
 * path. The kernel writes finished executions back into the .ipynb file even
 * while no editor is attached (background execution log).
 * @module dsh-better-sidebar-jupyter
 */

import type { IncomingMessage } from 'node:http'
import type { PluginContext } from './host/context.ts'
import { NotebookFs } from './host/jupyter/notebook.ts'
import { KernelManager } from './host/jupyter/kernel.ts'
import { isTrustedApiRequest } from './host/fence.ts'
import { makeRoutes } from './host/routes.ts'

/** Plugin identity for cordis.yml rows / the bundle patch. */
export const name = 'dsh-better-sidebar-jupyter'

/** Services required before mounting: the webserver routes, the session
 *  store (authoritative cwd for the path gate), and the web runtime's
 *  trusted hosts (the /api gateway's trust source). */
export const inject = ['webServer', 'sessions', 'webRuntime']

/** Plugin body: mount the fenced jupyter routes and the kernel lifecycle. */
export function apply(ctx: PluginContext): void {
  const fence = (req: IncomingMessage): boolean => isTrustedApiRequest(req, ctx.webRuntime.trustedHosts)
  const fs = new NotebookFs()
  // Kernels persist finished executions into the notebook file in the
  // background (best-effort; the client's explicit save covers the rest).
  const kernels = new KernelManager((path, cellId, index, source, outputs, executionCount) =>
    fs.applyOutputs(path, cellId, index, source, outputs, executionCount).then(() => undefined),
  )

  ctx.effect(() => {
    const { routes, upgrade } = makeRoutes({ ctx, fs, kernels, fence })
    const disposers = routes.map(route => ctx.webServer.register(route))
    disposers.push(ctx.webServer.registerUpgrade(upgrade))
    return () => {
      for (const dispose of disposers) {
        try { dispose() } catch { /* already disposed */ }
      }
    }
  }, 'dsh-better-sidebar-jupyter: routes')

  ctx.effect(() => () => {
    kernels.dispose()
  }, 'dsh-better-sidebar-jupyter: teardown')
}
