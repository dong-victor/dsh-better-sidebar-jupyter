/**
 * One notebook cell: code editor (syntax-highlighted textarea overlay),
 * rendered/editable markdown, outputs, and cell actions.
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
  kernelConnected: boolean
  onSelect(): void
  onRun(id: string): void
  onChange(id: string, source: string): void
  onConvert(id: string): void
  onDelete(id: string): void
  onMove(id: string, dir: -1 | 1): void
  onAddBelow(id: string): void
  onClearOutputs(id: string): void
}

/** A code editor with a highlighted overlay behind a transparent-text textarea. */
function CodeEditor({ value, onChange, onRun, executing, kernelConnected }: {
  value: string
  onChange(value: string): void
  onRun(): void
  executing: boolean
  kernelConnected: boolean
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
    ta.style.height = `${Math.min(480, Math.max(34, ta.scrollHeight))}px`
    syncScroll()
  }

  useEffect(() => { autoGrow() }, [value])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key === 'Enter' && (event.shiftKey || event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      if (kernelConnected && !executing) onRun()
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
function MarkdownBody({ cell, onCommit }: { cell: UiCell; onCommit(source: string): void }): React.JSX.Element {
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
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault()
            onCommit(draft)
            setEditing(false)
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
  const { cell, index, total, selected, executing, kernelConnected } = props
  const cellClass = [
    'dshjp-cell',
    selected ? 'selected' : '',
    executing ? 'running' : '',
  ].filter(Boolean).join(' ')

  const run = (): void => {
    if (kernelConnected && !executing) props.onRun(cell.id)
  }

  return (
    <div
      className={cellClass}
      data-cell-id={cell.id}
      onClick={props.onSelect}
    >
      <div className="dshjp-cell-gutter" />
      <div className="dshjp-cell-header">
        <span className="dshjp-cell-type">{cell.type}</span>
        <span className="dshjp-cell-actions">
          {cell.type === 'code' && (
            <button type="button" className="dshjp-cell-action" disabled={!kernelConnected || executing} onClick={(e) => { e.stopPropagation(); run() }}>
              {executing ? tt('editor.executing') : tt('editor.run')}
            </button>
          )}
          {cell.type === 'code' && (
            <button type="button" className="dshjp-cell-action" disabled={cell.outputs.length === 0} onClick={(e) => { e.stopPropagation(); props.onClearOutputs(cell.id) }}>
              {tt('editor.clearOutputs')}
            </button>
          )}
          <button type="button" className="dshjp-cell-action" onClick={(e) => { e.stopPropagation(); props.onConvert(cell.id) }}>
            {tt('editor.convert')}
          </button>
          <button type="button" className="dshjp-cell-action" onClick={(e) => { e.stopPropagation(); props.onAddBelow(cell.id) }}>
            {tt('editor.addBelow')}
          </button>
          <button type="button" className="dshjp-cell-action" disabled={index === 0} onClick={(e) => { e.stopPropagation(); props.onMove(cell.id, -1) }}>
            ↑
          </button>
          <button type="button" className="dshjp-cell-action" disabled={index === total - 1} onClick={(e) => { e.stopPropagation(); props.onMove(cell.id, 1) }}>
            ↓
          </button>
          <button type="button" className="dshjp-cell-action" onClick={(e) => { e.stopPropagation(); props.onDelete(cell.id) }}>
            ✕
          </button>
        </span>
        {cell.type === 'code' && cell.executionCount !== null && (
          <span className="dshjp-cell-count">[{cell.executionCount}]</span>
        )}
      </div>
      {cell.type === 'code' && (
        <CodeEditor
          value={cell.source}
          onChange={(source) => props.onChange(cell.id, source)}
          onRun={() => props.onRun(cell.id)}
          executing={executing}
          kernelConnected={kernelConnected}
        />
      )}
      {cell.type === 'markdown' && (
        <MarkdownBody cell={cell} onCommit={(source) => props.onChange(cell.id, source)} />
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
    </div>
  )
}
