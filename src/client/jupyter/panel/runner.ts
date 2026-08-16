/**
 * Client-side run bookkeeping, kept pure so the reconnect/batch semantics can
 * be unit-tested without React.
 *
 * Two lists mirror the host's execution pipeline:
 * - `pending`: cell ids already handed to the host (the bridge owns them and
 *   serializes them, so they keep running even if this browser disconnects).
 * - `queue`: cell ids not yet sent (the socket was down or the kernel was not
 *   ready when the user asked to run them).
 *
 * A run "settles" when both are empty. `detached` records that the socket
 * dropped while work was outstanding — the host may have persisted outputs
 * this browser never saw, so the auto-save must not clobber them.
 * @module dsh-better-sidebar-jupyter/client/jupyter/panel/runner
 */

import type { KernelEvent } from '../types.ts'

export interface RunQueue {
  /** Sent to the host; awaiting execute_reply (in execution order). */
  pending: string[]
  /** Not yet sent; retried after a reconnect. */
  queue: string[]
  /** True when the socket dropped while work was outstanding. */
  detached: boolean
}

export function createRunQueue(): RunQueue {
  return { pending: [], queue: [], detached: false }
}

/** True when nothing is in flight or queued. */
export function isIdle(run: RunQueue): boolean {
  return run.pending.length === 0 && run.queue.length === 0
}

/** The cell currently executing (the head of the batch), if any. */
export function inFlight(run: RunQueue): string | null {
  return run.pending.length > 0 ? run.pending[0]! : null
}

/** Add cell ids to the queue, skipping ids already queued or in flight. */
export function enqueue(run: RunQueue, ids: string[], known: ReadonlySet<string>): RunQueue {
  if (ids.length === 0) return run
  const queue = [...run.queue]
  for (const id of ids) {
    if (known.has(id) && !queue.includes(id) && !run.pending.includes(id)) queue.push(id)
  }
  return { ...run, queue }
}

/** Move ids from the queue into pending (they were handed to the host). */
export function markSent(run: RunQueue, ids: string[]): RunQueue {
  if (ids.length === 0) return run
  const sent = new Set(ids)
  return {
    ...run,
    queue: run.queue.filter((id) => !sent.has(id)),
    pending: [...run.pending, ...ids],
  }
}

/** A send failed: keep the ids queued for a later retry after a reconnect. */
export function markUnsent(run: RunQueue, ids: string[]): RunQueue {
  if (ids.length === 0) return run
  return { ...run, queue: [...run.queue, ...ids] }
}

/** An execute_reply arrived for a cell: drop it from pending. */
export function onReply(run: RunQueue, cellId: string): RunQueue {
  if (!run.pending.includes(cellId)) return run
  return { ...run, pending: run.pending.filter((id) => id !== cellId) }
}

/** Mark the batch as possibly-unsynced (socket dropped while work was pending). */
export function markDetached(run: RunQueue): RunQueue {
  return isIdle(run) ? run : { ...run, detached: true }
}

/** Drop everything (interrupt / shutdown / restart). */
export function clearAll(run: RunQueue): RunQueue {
  return { ...run, pending: [], queue: [], detached: false }
}

/**
 * Resolve which local cell a busy-replay should target. The host tracks the
 * in-flight run by the cell id of the browser that STARTED it; after a
 * session switch the reopened document may have generated different ids, so
 * fall back to the cell index the host captured when the run began. Returns
 * the local target id plus (when a remap is needed) the host-id -> local-id
 * pair to rewrite subsequent events with.
 */
export function resolveBusyCell(
  hostCellId: string,
  index: number | undefined,
  ownIds: readonly string[],
): { target: string; remap: [string, string] | null } {
  if (ownIds.includes(hostCellId)) return { target: hostCellId, remap: null }
  if (index !== undefined && index >= 0 && index < ownIds.length) {
    const local = ownIds[index]!
    return { target: local, remap: [hostCellId, local] }
  }
  return { target: hostCellId, remap: null }
}

/**
 * Rewrite an incoming kernel event's `cell_id` through a remap (host id ->
 * local id). Events without a cell_id, or with an unknown id, pass through
 * untouched.
 */
export function remapCellId(event: KernelEvent, map: ReadonlyMap<string, string>): KernelEvent {
  const cid = (event as { cell_id?: string | null }).cell_id
  if (typeof cid !== 'string') return event
  const target = map.get(cid)
  if (target === undefined || target === cid) return event
  return { ...event, cell_id: target } as KernelEvent
}
