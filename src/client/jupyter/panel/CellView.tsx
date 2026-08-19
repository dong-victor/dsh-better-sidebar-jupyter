/**
 * One notebook cell: code editor (syntax-highlighted textarea overlay),
 * rendered/editable markdown, outputs, and cell actions — IDEA-style: a
 * gutter run button, "In [n]" label, execution duration in the corner, and
 * Ctrl+Enter (run in place) / Shift+Enter (run + select below) semantics.
 * @module dsh-jupyter/client/panel/CellView
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { UiCell } from '../types.ts'
import { highlightPython } from './highlight.ts'
import { renderMarkdown } from './markdown.ts'
import { OutputView } from './OutputView.tsx'
import { tt } from './helpers.ts'

export interface CellViewProps {
  cell: UiCell
  index: number
  total: number
  selected: boolean
  /** True while this cell's execution is in flight. */
  executing: boolean
  /** Formats a run duration (IDEA-style corner label). */
  formatDuration(ms: number): string
  onSelect(): void
  /** Run the cell; `selectBelow` = Shift+Enter semantics (advance/insert). */
  onRunCell(id: string, selectBelow: boolean): void
  onChange(id: string, source: string): void
  onDelete(id: string): void
  onMove(id: string, dir: -1 | 1): void
  onAddBelow(id: string): void
  onClearOutputs(id: string): void
}

/** A code editor with a highlighted overlay behind a transparent-text textarea. */
function CodeEditor({ value, onChange, onRun, onRunSelectBelow, executing }: {
  value: string
  onChange(value: string): void
  onRun(): void
  onRunSelectBelow(): void
  executing: boolean
}): React.JSX.Element {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const hlRef = useRef<HTMLPreElement>(null)
  const html = useMemo(() => highlightPython(value), [value])

  const syncScroll = (): void => {
    const ta = taRef.current
    const hl = hlRef.current
    if (ta === null || hl === null) return
    hl.scrollTop = ta.scrollTop
    hl.scrollLeft = ta.scrollLeft
  }

  const autoGrow = (): void => {
    const ta = taRef.current
    if (ta === null) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.max(34, ta.scrollHeight)}px`
    syncScroll()
  }

  useEffect(() => { autoGrow() }, [value])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter') {
      // IDEA: Ctrl+Enter runs in place, Shift+Enter runs and selects below.
      // Alt combos (Ctrl+Alt+Shift+Enter = run all) bubble to the editor.
      if (event.altKey) return
      if (event.shiftKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault()
        if (!executing) onRunSelectBelow()
        return
      }
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        if (!executing) onRun()
        return
      }
      return
    }
    if (event.key === 'Tab' && !event.shiftKey) {
      // Insert two spaces instead of moving focus.
      event.preventDefault()
      const ta = event.currentTarget
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const next = value.slice(0, start) + '  ' + value.slice(end)
      onChange(next)
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2
      })
    }
  }

  return (
    <div className="dshjp-code-editor">
      <pre ref={hlRef} className="dshjp-code-highlight show" aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />
      <textarea
        ref={taRef}
        className="dshjp-code-input"
        value={value}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        placeholder={tt('editor.codeHint')}
        onChange={(event) => { onChange(event.target.value) }}
        onScroll={syncScroll}
        onKeyDown={handleKeyDown}
        onFocus={(event) => { event.currentTarget.select() }}
      />
    </div>
  )
}

/** Rendered or editable markdown. */
function MarkdownBody({ cell, onCommit, onRunSelectBelow }: {
  cell: UiCell
  onCommit(source: string): void
  onRunSelectBelow(): void
}): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(cell.source)
  const html = useMemo(() => renderMarkdown(cell.source), [cell.source])

  useEffect(() => {
    if (!editing) setDraft(cell.source)
  }, [editing, cell.source])

  if (editing) {
    return (
      <textarea
        className="dshjp-md-editor"
        value={draft}
        spellCheck={false}
        autoFocus
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.preventDefault(); setEditing(false) }
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.altKey) {
            event.preventDefault()
            onCommit(draft)
            setEditing(false)
          }
          if (event.key === 'Enter' && event.shiftKey && !event.ctrlKey && !event.metaKey) {
            event.preventDefault()
            onCommit(draft)
            setEditing(false)
            onRunSelectBelow()
          }
        }}
        onChange={(event) => { setDraft(event.target.value) }}
        onBlur={() => {
          if (draft !== cell.source) onCommit(draft)
          setEditing(false)
        }}
      />
    )
  }
  if (cell.source.trim() === '') {
    return (
      <div className="dshjp-markdown" onDoubleClick={() => setEditing(true)} style={{ opacity: 0.55 }}>
        <em>{tt('editor.markdownEdit')}</em>
      </div>
    )
  }
  // eslint-disable-next-line react/no-danger
  return <div className="dshjp-markdown" onDoubleClick={() => setEditing(true)} dangerouslySetInnerHTML={{ __html: html }} />
}

/** One cell block. */
export function CellView(props: CellViewProps): React.JSX.Element {
  const { cell, index, total, selected, executing, formatDuration } = props
  const cellClass = [
    'dshjp-cell',
    selected ? 'selected' : '',
    executing ? 'running' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={cellClass}
      data-cell-id={cell.id}
      onClick={props.onSelect}
    >
      <div className="dshjp-cell-gutter">
        {cell.type === 'code' && (
          <button
            type="button"
            className={`dshjp-gutter-run${executing ? ' busy' : ''}`}
            title={executing ? tt('editor.executing') : tt('editor.run')}
            disabled={executing}
            onClick={(e) => { e.stopPropagation(); props.onRunCell(cell.id, false) }}
          >▶</button>
        )}
      </div>
      <div className="dshjp-cell-header">
        <span className="dshjp-cell-type">{cell.type}</span>
        {cell.queued && <span className="dshjp-cell-queued">{tt('editor.queued')}</span>}
        <span className="dshjp-cell-actions">
          {cell.type === 'code' && cell.outputs.length > 0 && (
            <button type="button" className="dshjp-cell-action" title={tt('editor.clearOutputs')} onClick={(e) => { e.stopPropagation(); props.onClearOutputs(cell.id) }}>
              🧹
            </button>
          )}
          <button type="button" className="dshjp-cell-action" title={tt('editor.addBelow')} onClick={(e) => { e.stopPropagation(); props.onAddBelow(cell.id) }}>
            ＋
          </button>
          <button type="button" className="dshjp-cell-action" title={tt('editor.moveUp')} disabled={index === 0} onClick={(e) => { e.stopPropagation(); props.onMove(cell.id, -1) }}>
            ↑
          </button>
          <button type="button" className="dshjp-cell-action" title={tt('editor.moveDown')} disabled={index === total - 1} onClick={(e) => { e.stopPropagation(); props.onMove(cell.id, 1) }}>
            ↓
          </button>
          <button type="button" className="dshjp-cell-action" title={tt('editor.delete')} onClick={(e) => { e.stopPropagation(); props.onDelete(cell.id) }}>
            ✕
          </button>
        </span>
        {cell.type === 'code' && cell.executionCount !== null && (
          <span className="dshjp-cell-count">{tt('editor.inCount', { count: cell.executionCount })}</span>
        )}
      </div>
      {cell.type === 'code' && (
        <CodeEditor
          value={cell.source}
          onChange={(source) => props.onChange(cell.id, source)}
          onRun={() => props.onRunCell(cell.id, false)}
          onRunSelectBelow={() => props.onRunCell(cell.id, true)}
          executing={executing}
        />
      )}
      {cell.type === 'markdown' && (
        <MarkdownBody
          cell={cell}
          onCommit={(source) => props.onChange(cell.id, source)}
          onRunSelectBelow={() => props.onRunCell(cell.id, true)}
        />
      )}
      {cell.type === 'raw' && (
        <div className="dshjp-markdown" style={{ opacity: 0.8 }}>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>{cell.source || tt('editor.rawHint')}</pre>
        </div>
      )}
      {cell.type === 'code' && cell.outputs.length > 0 && (
        <div className="dshjp-outputs">
          {cell.outputs.map((output, i) => <OutputView key={i} output={output} />)}
        </div>
      )}
      {cell.type === 'code' && !executing && cell.runMs !== null && (
        <span
          className="dshjp-cell-duration"
          title={cell.runAt !== null ? tt('editor.runFinishedAt', { time: new Date(cell.runAt).toLocaleString() }) : undefined}
        >{formatDuration(cell.runMs)}</span>
      )}
    </div>
  )
}
