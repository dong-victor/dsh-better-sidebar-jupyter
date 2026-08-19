/**
 * Output renderer: turns one UiOutput into DOM. Rich MIME bundles pick
 * text/html (sanitized) > image/png/jpeg > application/json > text/plain;
 * errors render tracebacks; streams render as pre blocks.
 *
 * ANSI SGR escape sequences in stream/error output are parsed into themed
 * HTML spans so colored tracebacks render correctly (no raw [31m codes).
 * @module dsh-jupyter/client/panel/OutputView
 */

import { useMemo, useState } from 'react'
import type { MimeBundle, UiOutput } from '../types.ts'
import { sanitizeHtml } from './sanitize.ts'
import { renderMarkdown } from './markdown.ts'
import { ansiToHtml } from './ansi.ts'
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
  const summaryHtml = useMemo(() => ansiToHtml(summary), [summary])
  const traceHtml = useMemo(() => ansiToHtml(trace.join('\n')), [trace])
  return (
    <>
      <button
        type="button"
        className="dshjp-error-head"
        title={expanded ? tt('editor.tracebackCollapse') : tt('editor.tracebackExpand')}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="dshjp-error-toggle">{expanded ? '▼' : '▶'}</span>
        {/* eslint-disable-next-line react/no-danger */}
        <span className="dshjp-error-summary" dangerouslySetInnerHTML={{ __html: summaryHtml }} />
      </button>
      {expanded && (
        <pre
          className="dshjp-error-trace"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: traceHtml }}
        />
      )}
    </>
  )
}

/** Stream output (stdout/stderr) — ANSI parsed. */
function StreamOutput({ name, text }: { name: 'stdout' | 'stderr'; text: string }): React.JSX.Element {
  const html = useMemo(() => ansiToHtml(text), [text])
  return (
    <div className={`dshjp-output stream-${name}`}>
      <pre
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

/** Single-line error (no collapse) — ANSI parsed. */
function SimpleError({ text }: { text: string }): React.JSX.Element {
  const html = useMemo(() => ansiToHtml(text), [text])
  return (
    <div className="dshjp-output error-out">
      <pre
        className="dshjp-error-trace"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

/** Render one output. */
export function OutputView({ output }: { output: UiOutput }): React.JSX.Element {
  if (output.outputType === 'stream') {
    return <StreamOutput name={output.name} text={output.text} />
  }
  if (output.outputType === 'error') {
    // IDEA-style error node: show a summary line, expand to the full
    // traceback (collapsed by default when there is more than one line).
    const trace = output.traceback
    const summary = trace.length > 0 ? trace[trace.length - 1]! : `${output.ename}: ${output.evalue}`
    if (trace.length > 1) {
      return (
        <div className="dshjp-output error-out">
          <ErrorTraceback summary={summary} trace={trace} />
        </div>
      )
    }
    return <SimpleError text={trace.length > 0 ? trace.join('\n') : `${output.ename}: ${output.evalue}`} />
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
