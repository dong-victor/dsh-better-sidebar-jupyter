/**
 * Client half of the dsh-better-sidebar Jupyter plugin: registers the .ipynb
 * file viewer through the `ctx.betterSidebar` service and injects the
 * notebook editor styles. The viewer renders the full notebook editor inline
 * in the sidebar editor tab; the host half (same package) owns the
 * session-scoped notebook/kernel routes.
 * @module dsh-better-sidebar-jupyter/client
 */

import { createElement } from 'react'
// Triggers the ctx.betterSidebar type augmentation (erased at build).
import type {} from 'dsh-better-sidebar'
import type { Context } from 'cordis'
import { PANEL_CSS } from './jupyter/panel/styles.ts'
import { NotebookView } from './NotebookView.tsx'
import { startKernelDotPoller } from './explorerDot.ts'

/** Services required before mounting: the betterSidebar registry (provided
 *  by dsh-better-sidebar's own client half) and the session store (the
 *  explorer kernel-dot poller reads the active session). */
export const inject = ['betterSidebar', 'sessions']

/** Plugin body. */
export function apply(ctx: Context): void {
  // Notebook editor styles: one <style data-plugin> tag (the panel CSS rides
  // the --dsw-* tokens, so it follows the active theme).
  const styleId = 'dsh-better-sidebar-jupyter-styles'
  ctx.effect(() => {
    const existing = document.getElementById(styleId)
    if (existing !== null) existing.remove()
    const tag = document.createElement('style')
    tag.id = styleId
    tag.setAttribute('data-plugin', '@dong-victor/dsh-better-sidebar-jupyter')
    tag.textContent = PANEL_CSS
    document.head.appendChild(tag)
    return () => { document.getElementById(styleId)?.remove() }
  }, 'dsh-better-sidebar-jupyter: styles')

  // The .ipynb file viewer. `fetchStrategy: 'none'`: the view loads the
  // notebook and drives the kernel through its own session-scoped API (the
  // editor host only routes the file to us by extension).
  ctx.effect(() =>
    ctx.betterSidebar.registerFileViewer({
      id: 'dsh-better-sidebar:jupyter',
      title: () => 'Jupyter Notebook',
      exts: ['ipynb'],
      priority: 10,
      fetchStrategy: 'none',
      component: (props) => createElement(NotebookView, props),
    }),
    'dsh-better-sidebar-jupyter: ipynb viewer',
  )

  // Explorer indicator: a green dot on notebooks whose kernel is alive
  // (pulsing while a cell executes). The sidebar has no file-row extension
  // API, so the poller reconciles dots against the explorer DOM.
  ctx.effect(() => startKernelDotPoller(ctx), 'dsh-better-sidebar-jupyter: explorer kernel dots')
}
