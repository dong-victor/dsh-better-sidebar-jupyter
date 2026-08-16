/**
 * Compact, dependency-free Markdown renderer for notebook markdown cells.
 * The source is HTML-escaped first, then transformed into safe HTML; raw HTML
 * in the source is escaped, never executed. Link/image URLs are sanitized.
 * @module dsh-jupyter/client/panel/markdown
 */

import { escapeHtml, sanitizeUrl } from './sanitize.ts'

interface InlineContext {
  /** Escape the whole text before inline processing (already done by caller). */
  text: string
}

/** Escape then render inline markdown (bold/italic/code/links/images/strike). */
function renderInline(text: string): string {
  const escaped = escapeHtml(text)
  let out = escaped
  // Inline code first (protects backtick content).
  out = out.replace(/`([^`\n]+)`/g, (_m, code: string) => `<code>${code}</code>`)
  // Images: ![alt](url)
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_m, alt: string, url: string) => {
    const safe = sanitizeUrl(url)
    if (safe === null) return ''
    return `<img alt="${escapeHtml(alt)}" src="${escapeHtml(safe)}">`
  })
  // Links: [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_m, label: string, url: string) => {
    const safe = sanitizeUrl(url)
    if (safe === null) return escapeHtml(label)
    return `<a href="${escapeHtml(safe)}" rel="noopener noreferrer">${label}</a>`
  })
  // Bold **text** and __text__
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  // Italic *text* and _text_
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  out = out.replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>')
  // Strikethrough ~~text~~
  out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>')
  return out
}

/** Render a markdown cell source to a sanitized HTML string. */
export function renderMarkdown(source: string): string {
  const lines = source.split(/\r?\n/)
  const out: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let listOpen = false
  let inCode = false
  let codeLang = ''
  let codeLines: string[] = []
  let inQuote = false
  let quoteLines: string[] = []
  let inTable = false
  let tableRows: string[][] = []
  let tableAligns: string[] = []

  const closeList = (): void => {
    if (listOpen) {
      out.push(`</${listType}>`)
      listOpen = false
      listType = null
    }
  }
  const closeQuote = (): void => {
    if (inQuote) {
      out.push(`<blockquote>${quoteLines.map((l) => `<p>${renderInline(l)}</p>`).join('')}</blockquote>`)
      inQuote = false
      quoteLines = []
    }
  }
  const closeTable = (): void => {
    if (!inTable) return
    const header = tableRows[0] ?? []
    const body = tableRows.slice(1)
    let html = '<table><thead><tr>'
    for (let i = 0; i < header.length; i++) html += `<th>${renderInline(header[i] ?? '')}</th>`
    html += '</tr></thead><tbody>'
    for (const row of body) {
      html += '<tr>'
      for (let i = 0; i < header.length; i++) html += `<td>${renderInline(row[i] ?? '')}</td>`
      html += '</tr>'
    }
    html += '</tbody></table>'
    out.push(html)
    inTable = false
    tableRows = []
    void tableAligns
  }

  for (const raw of lines) {
    if (inCode) {
      const fence = /^```/.exec(raw.trim())
      if (fence !== null) {
        inCode = false
        out.push(`<pre><code>${codeLines.map(escapeHtml).join('\n')}</code></pre>`)
        codeLines = []
      } else {
        codeLines.push(raw)
      }
      continue
    }
    const fenceMatch = /^```(\S*)\s*$/.exec(raw.trim())
    if (fenceMatch !== null) {
      closeList()
      closeQuote()
      closeTable()
      inCode = true
      codeLang = fenceMatch[1] ?? ''
      void codeLang
      continue
    }
    const trimmed = raw.trim()
    if (trimmed === '') {
      closeList()
      closeQuote()
      closeTable()
      continue
    }
    // Headings
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed)
    if (heading !== null) {
      closeList(); closeQuote(); closeTable()
      const level = heading[1]!.length
      out.push(`<h${level}>${renderInline(heading[2] ?? '')}</h${level}>`)
      continue
    }
    // HR
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      closeList(); closeQuote(); closeTable()
      out.push('<hr>')
      continue
    }
    // Blockquote
    const quote = /^>\s?(.*)$/.exec(raw)
    if (quote !== null) {
      closeList(); closeTable()
      inQuote = true
      quoteLines.push(quote[1] ?? '')
      continue
    }
    // Unordered list
    const ul = /^[-*+]\s+(.*)$/.exec(raw)
    if (ul !== null) {
      closeQuote(); closeTable()
      if (!listOpen || listType !== 'ul') {
        closeList()
        out.push('<ul>')
        listOpen = true
        listType = 'ul'
      }
      out.push(`<li>${renderInline(ul[1] ?? '')}</li>`)
      continue
    }
    // Ordered list
    const ol = /^\d+[.)]\s+(.*)$/.exec(raw)
    if (ol !== null) {
      closeQuote(); closeTable()
      if (!listOpen || listType !== 'ol') {
        closeList()
        out.push('<ol>')
        listOpen = true
        listType = 'ol'
      }
      out.push(`<li>${renderInline(ol[1] ?? '')}</li>`)
      continue
    }
    // Table: header row followed by |---|---| separator
    const tableSep = /^\|?[\s:|-]+\|[\s:|-]*$/.test(trimmed) && trimmed.includes('|') && /^\|?(\s*:?-{2,}:?\s*\|)+\s*:?-{2,}:?\s*\|?\s*$/.test(trimmed)
    if (inTable && tableSep) continue
    const tableRow = /^\|(.+)\|$/.exec(trimmed)
    const bareRow = trimmed.includes('|') ? trimmed.split('|').map((s) => s.trim()) : null
    if (tableRow !== null || bareRow !== null) {
      const cells = tableRow !== null ? (tableRow[1] ?? '').split('|').map((s) => s.trim()) : (bareRow ?? [])
      if (!inTable) {
        inTable = true
        tableRows = [cells]
      } else {
        tableRows.push(cells)
      }
      continue
    }
    closeList()
    closeQuote()
    closeTable()
    out.push(`<p>${renderInline(trimmed)}</p>`)
  }
  if (inCode) out.push(`<pre><code>${codeLines.map(escapeHtml).join('\n')}</code></pre>`)
  closeList()
  closeQuote()
  closeTable()
  return out.join('\n')
}

/** Render an inline-only markdown fragment (used for short labels). */
export function renderInlineMarkdown(text: string): string {
  return renderInline(text)
}
