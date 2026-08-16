/**
 * Output renderer: turns one UiOutput into DOM. Rich MIME bundles pick
 * text/html (sanitized) > image/png/jpeg > application/json > text/plain;
 * errors render tracebacks; streams render as pre blocks.
 * @module dsh-jupyter/client/panel/OutputView
 */

import { useMemo, useState } from 'react'
import type { MimeBundle, UiOutput } from '../types.ts'
import { sanitizeHtml } from './sanitize.ts'
import { renderMarkdown } from './markdown.ts'
import { tt } from './helpers.ts'

function pickMime(data: MimeBundle): { kind: 'html' | 'image' | 'json' | 'markdown' | 'text' | 'latex'; value: string } | null {
  if (typeof data['text/html'] === 'string') return { kind: 'html', value: data['text/html'] as string }
  if (typeof data['text/markdown'] === 'string') return { kind: 'markdown', value: data['text/markdown'] as string }
  const image = typeof data['image/png'] === 'string' ? data['image/png'] : typeof data['image/jpeg'] === 'string' ? data['image/jpeg'] : undefined
  if (image !== undefined) {
    const mime = typeof data['image/png'] === 'string' ? 'image/png' : 'image/jpeg'
    const src = image.startsWith('data:') ? image : `data:${mime};base64,${image}`
    return { kind: 'image', value: src }
  }
  if (data['application/json'] !== undefined) {
    try {
      return { kind: 'json', value: JSON.stringify(data['application/json'], null, 2) }
    } catch {
      return { kind: 'json', value: String(data['application/json']) }
    }
  }
  if (typeof data['text/plain'] === 'string') return { kind: 'text', value: data['text/plain'] as string }
  if (typeof data['text/latex'] === 'string') return { kind: 'latex', value: data['text/latex'] as string }
  // Unknown bundle: dump keys so the user sees something.
  return { kind: 'text', value: JSON.stringify(Object.keys(data)) }
}

function RichOutput({ data }: { data: MimeBundle }): React.JSX.Element | null {
  const picked = useMemo(() => pickMime(data), [data])
  if (picked === null) return null
  if (picked.kind === 'html') {
    const html = useMemo(() => sanitizeHtml(picked.value), [picked.value])
    // eslint-disable-next-line react/no-danger
    return <div className="rich rich-html" dangerouslySetInnerHTML={{ __html: html }} />
  }
  if (picked.kind === 'markdown') {
    const html = useMemo(() => renderMarkdown(picked.value), [picked.value])
    // eslint-disable-next-line react/no-danger
    return <div className="rich" dangerouslySetInnerHTML={{ __html: html }} />
  }
  if (picked.kind === 'image') {
    return <img className="rich-img" src={picked.value} alt="kernel output" />
  }
  if (picked.kind === 'json') {
    return <pre>{picked.value}</pre>
  }
  return <pre>{picked.value}</pre>
}

/** Collapsible error traceback (IDEA-style: summary row + expand toggle). */
function ErrorTraceback({ summary, trace }: { summary: string; trace: string[] }): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  return (
    <>
      <button
        type="button"
        className="dshjp-error-head"
        title={expanded ? tt('editor.tracebackCollapse') : tt('editor.tracebackExpand')}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="dshjp-error-toggle">{expanded ? '▼' : '▶'}</span>
        <span className="dshjp-error-summary">{summary}</span>
      </button>
      {expanded && <pre className="dshjp-error-trace">{trace.join('\n')}</pre>}
    </>
  )
}

/** Render one output. */
export function OutputView({ output }: { output: UiOutput }): React.JSX.Element {
  if (output.outputType === 'stream') {
    return (
      <div className={`dshjp-output stream-${output.name}`}>
        {output.text.split('\n').length > 1 ? (
          <pre>{output.text}</pre>
        ) : (
          <pre>{output.text}</pre>
        )}
      </div>
    )
  }
  if (output.outputType === 'error') {
    // IDEA-style error node: show a summary line, expand to the full
    // traceback (collapsed by default when there is more than one line).
    const trace = output.traceback
    const summary = trace.length > 0 ? trace[trace.length - 1]! : `${output.ename}: ${output.evalue}`
    return (
      <div className="dshjp-output error-out">
        {trace.length > 1 ? (
          <ErrorTraceback summary={summary} trace={trace} />
        ) : (
          <pre className="dshjp-error-trace">{trace.length > 0 ? trace.join('\n') : `${output.ename}: ${output.evalue}`}</pre>
        )}
      </div>
    )
  }
  if (output.outputType === 'execute_result') {
    return (
      <div className="dshjp-output">
        {output.executionCount !== null && (
          <span className="out-count">Out[{output.executionCount}]</span>
        )}
        <RichOutput data={output.data} />
      </div>
    )
  }
  return (
    <div className="dshjp-output">
      <RichOutput data={output.data} />
    </div>
  )
}
