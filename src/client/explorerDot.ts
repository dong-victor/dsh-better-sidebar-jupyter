/**
 * Explorer "running notebook" indicator: polls the host's kernel list for the
 * active session and toggles a green dot on `.ipynb` rows in the
 * dsh-better-sidebar file explorer. The sidebar exposes no file-row extension
 * API, so the dot is reconciled against the DOM directly: explorer file rows
 * carry the full path in their `title` attribute, which the poller matches
 * against the set of live kernels. The dot pulses while a cell is executing.
 * @module dsh-better-sidebar-jupyter/client/explorerDot
 */

import { JUPYTER_API, type KernelListEntry } from './jupyter/api.ts'

/** How often the poller re-checks the kernel list (and re-scans the DOM). */
const POLL_MS = 2000

/** The slice of the session service the poller reads (defensive: the runtime
 *  may expose `sessions.list` with { current, byId }). */
interface SessionsList {
  getSnapshot(): unknown
  subscribe(callback: () => void): () => void
}

/** Dot element inserted into an explorer file row. */
const DOT_CLASS = 'dshjp-file-dot'

function baseQuery(): string {
  return JUPYTER_API.kernels + '?'
}

/**
 * Start the poller. Returns a disposer that stops polling, unsubscribes from
 * session changes and removes any inserted dots.
 */
export function startKernelDotPoller(ctx: unknown): () => void {
  const list = (ctx as { sessions?: { list?: SessionsList } } | null)?.sessions?.list
  /** Resolve the active session id (or null when none / API missing). */
  const activeSessionId = (): string | null => {
    if (list === undefined) return null
    try {
      const snap = list.getSnapshot() as { current?: unknown; sessionId?: unknown } | null
      if (snap === null || typeof snap !== 'object') return null
      const id = snap.current ?? snap.sessionId
      return typeof id === 'string' && id !== '' ? id : null
    } catch {
      return null
    }
  }

  let running = new Map<string, KernelListEntry>()
  let disposed = false
  let timer: number | null = null

  /** Reconcile the dots with the current kernel set. */
  const reconcile = (): void => {
    const rows = document.querySelectorAll<HTMLElement>('div[role="button"][title$=".ipynb"]')
    for (const row of rows) {
      const path = row.getAttribute('title') ?? ''
      const entry = running.get(path)
      const dot = row.querySelector<HTMLElement>(`.${DOT_CLASS}`)
      if (entry === undefined || !entry.running) {
        if (dot !== null) dot.remove()
        continue
      }
      if (dot === null) {
        const created = document.createElement('span')
        created.className = DOT_CLASS
        // Place right after the file-name span (row children: icon, name, actions).
        row.insertBefore(created, row.children[2] ?? null)
        created.classList.toggle('busy', entry.busy)
      } else {
        dot.classList.toggle('busy', entry.busy)
      }
    }
  }

  /** Fetch the live kernel list for the active session and re-render dots. */
  const poll = (): void => {
    if (disposed || (typeof document !== 'undefined' && document.hidden)) return
    const sessionId = activeSessionId()
    if (sessionId === null) {
      if (running.size > 0) {
        running = new Map()
        reconcile()
      }
      return
    }
    fetch(baseQuery() + new URLSearchParams({ sessionId }).toString())
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { kernels?: KernelListEntry[] } | null) => {
        if (disposed) return
        const next = new Map<string, KernelListEntry>()
        for (const entry of body?.kernels ?? []) next.set(entry.path, entry)
        running = next
        reconcile()
      })
      .catch(() => { /* transient failure — keep the previous dots */ })
  }

  const unsubscribe = list?.subscribe(poll) ?? (() => { /* no session service */ })

  if (typeof window !== 'undefined') {
    timer = window.setInterval(poll, POLL_MS)
    window.addEventListener('visibilitychange', poll)
    poll()
  }

  return () => {
    disposed = true
    if (timer !== null) window.clearInterval(timer)
    if (typeof window !== 'undefined') window.removeEventListener('visibilitychange', poll)
    try { unsubscribe() } catch { /* already disposed */ }
    document.querySelectorAll(`.${DOT_CLASS}`).forEach((dot) => dot.remove())
  }
}
