/**
 * Tests for the run-queue bookkeeping (the client half of background
 * execution): batch semantics, dedupe, and reconnect safety.
 */
import { describe, expect, it } from 'vitest'
import {
  clearAll,
  createRunQueue,
  enqueue,
  inFlight,
  isIdle,
  markDetached,
  markSent,
  markUnsent,
  onReply,
  remapCellId,
  resolveBusyCell,
} from '../src/client/jupyter/panel/runner.ts'

const known = (ids: string[]): Set<string> => new Set(ids)

describe('createRunQueue', () => {
  it('starts idle and clean', () => {
    const run = createRunQueue()
    expect(run.pending).toEqual([])
    expect(run.queue).toEqual([])
    expect(run.detached).toBe(false)
    expect(isIdle(run)).toBe(true)
    expect(inFlight(run)).toBeNull()
  })
})

describe('enqueue', () => {
  it('adds ids in order, skipping unknown ids', () => {
    const run = enqueue(createRunQueue(), ['a', 'ghost', 'b'], known(['a', 'b', 'c']))
    expect(run.queue).toEqual(['a', 'b'])
  })

  it('dedupes against the queue and the pending list', () => {
    const base = { pending: ['x'], queue: ['a'], detached: false }
    const run = enqueue(base, ['a', 'x', 'b'], known(['a', 'b', 'x']))
    expect(run.queue).toEqual(['a', 'b'])
  })
})

describe('markSent / markUnsent', () => {
  it('moves sent ids from queue to pending, preserving order', () => {
    const base = { pending: ['x'], queue: ['a', 'b'], detached: false }
    const run = markSent(base, ['a'])
    expect(run.queue).toEqual(['b'])
    expect(run.pending).toEqual(['x', 'a'])
  })

  it('markUnsent keeps failed ids queued for a retry', () => {
    const run = markUnsent({ pending: [], queue: [], detached: false }, ['a', 'b'])
    expect(run.queue).toEqual(['a', 'b'])
  })
})

describe('onReply', () => {
  it('drops the replied cell from pending', () => {
    const base = { pending: ['a', 'b'], queue: [], detached: false }
    const run = onReply(base, 'a')
    expect(run.pending).toEqual(['b'])
    expect(inFlight(run)).toBe('b')
  })

  it('is a no-op for unknown cells', () => {
    const base = { pending: ['a'], queue: [], detached: false }
    expect(onReply(base, 'zzz')).toBe(base)
  })
})

describe('markDetached', () => {
  it('flags the batch when work is outstanding', () => {
    expect(markDetached({ pending: ['a'], queue: [], detached: false }).detached).toBe(true)
    expect(markDetached({ pending: [], queue: ['a'], detached: false }).detached).toBe(true)
  })

  it('leaves an idle batch clean', () => {
    expect(markDetached(createRunQueue()).detached).toBe(false)
  })
})

describe('clearAll', () => {
  it('drops everything and resets the detached flag', () => {
    const run = clearAll({ pending: ['a', 'b'], queue: ['c'], detached: true })
    expect(run).toEqual({ pending: [], queue: [], detached: false })
    expect(isIdle(run)).toBe(true)
  })
})

describe('resolveBusyCell (session-switch re-attach)', () => {
  it('keeps the host id when it exists in the document', () => {
    expect(resolveBusyCell('c1', 0, ['c1', 'c2'])).toEqual({ target: 'c1', remap: null })
  })

  it('falls back to the captured index when the id is unknown', () => {
    const res = resolveBusyCell('old-id', 1, ['c1', 'c2'])
    expect(res).toEqual({ target: 'c2', remap: ['old-id', 'c2'] })
  })

  it('keeps the host id when the index is out of range', () => {
    expect(resolveBusyCell('old-id', 9, ['c1'])).toEqual({ target: 'old-id', remap: null })
    expect(resolveBusyCell('old-id', undefined, ['c1'])).toEqual({ target: 'old-id', remap: null })
  })
})

describe('remapCellId', () => {
  it('rewrites events carrying a remapped host cell id', () => {
    const map = new Map([['old-id', 'c2']])
    expect(remapCellId({ type: 'stream', cell_id: 'old-id', name: 'stdout', text: 'hi' }, map).cell_id).toBe('c2')
    expect(remapCellId({ type: 'execute_reply', cell_id: 'old-id', ok: true, execution_count: 1 }, map).cell_id).toBe('c2')
  })

  it('passes through events with no cell_id or unknown ids', () => {
    const map = new Map([['old-id', 'c2']])
    expect(remapCellId({ type: 'ready', kernel_name: 'python3', language_info: {} }, map)).toEqual({ type: 'ready', kernel_name: 'python3', language_info: {} })
    expect(remapCellId({ type: 'stream', cell_id: 'other', name: 'stdout', text: 'x' }, map).cell_id).toBe('other')
  })

  it('returns the same reference when nothing changes', () => {
    const map = new Map([['old-id', 'c2']])
    const event = { type: 'stream', cell_id: null, name: 'stdout' as const, text: 'x' }
    expect(remapCellId(event, map)).toBe(event)
  })
})
