/**
 * Minimal HTML sanitizer for kernel-produced HTML (rich outputs) and rendered
 * markdown. Strategy: parse with DOMParser, drop dangerous nodes/attributes,
 * serialize back. Anything the parser cannot handle is escaped instead.
 * @module dsh-jupyter/client/panel/sanitize
 */

/** Tags that are dropped entirely (with their subtree). */
const DROP_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'base', 'form', 'input', 'button', 'textarea', 'select', 'option', 'video', 'audio', 'source', 'template'])

/** Tags allowed to keep only their text content (children stripped). */
const TEXT_ONLY_TAGS = new Set(['title'])

/** Tags allowed to survive as-is. */
const ALLOWED_TAGS = new Set([
  'a', 'abbr', 'b', 'blockquote', 'br', 'code', 'dd', 'del', 'details', 'div', 'dl', 'dt', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'hr', 'i', 'img', 'ins', 'kbd', 'li', 'mark', 'ol', 'p', 'pre', 'q', 's', 'samp', 'small', 'span', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul', 'var',
])

/** URL schemes allowed in href/src. */
const SAFE_URL_RE = /^(https?:|mailto:|tel:|data:image\/|#|\/)/i

function isSafeUrl(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false
  const trimmed = value.trim()
  if (trimmed === '') return false
  if (trimmed.startsWith('#')) return true
  if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml)/i.test(trimmed)) return true
  return SAFE_URL_RE.test(trimmed)
}

function sanitizeNode(node: Node, out: Node, doc: Document): void {
  if (node.nodeType === Node.TEXT_NODE) {
    out.appendChild(doc.createTextNode(node.textContent ?? ''))
    return
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return
  const el = node as Element
  const tag = el.tagName.toLowerCase()
  if (DROP_TAGS.has(tag)) return
  if (!ALLOWED_TAGS.has(tag)) {
    // Unknown tag: keep its children, drop the wrapper.
    for (const child of Array.from(el.childNodes)) sanitizeNode(child, out, doc)
    return
  }
  const copy = doc.createElement(tag)
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase()
    if (name.startsWith('on')) continue
    if (name === 'href' || name === 'src' || name === 'xlink:href') {
      if (isSafeUrl(attr.value)) copy.setAttribute(name, attr.value)
      continue
    }
    if (name === 'style') continue
    if (name === 'class') {
      // Keep only classes that look like notebook output helpers.
      const safe = attr.value.split(/\s+/).filter((c) => /^(highlight|output|ansi-|o-|jp-|dataframe|table)/i.test(c)).join(' ')
      if (safe !== '') copy.setAttribute('class', safe)
      continue
    }
    copy.setAttribute(name, attr.value)
  }
  if (TEXT_ONLY_TAGS.has(tag)) {
    copy.textContent = el.textContent ?? ''
    out.appendChild(copy)
    return
  }
  for (const child of Array.from(el.childNodes)) sanitizeNode(child, copy, doc)
  out.appendChild(copy)
}

/**
 * Sanitize a HTML string produced by the kernel or the markdown renderer.
 * Falls back to full escaping when DOMParser is unavailable.
 */
export function sanitizeHtml(html: string): string {
  if (typeof DOMParser === 'undefined') return escapeHtml(html)
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const fragment = doc.createDocumentFragment()
    sanitizeNode(doc.body, fragment, doc)
    const container = doc.createElement('div')
    container.appendChild(fragment)
    return container.innerHTML
  } catch {
    return escapeHtml(html)
  }
}

/** Escape HTML metacharacters. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/** Sanitize a URL attribute for rendered markdown links/images. */
export function sanitizeUrl(value: string): string | null {
  return isSafeUrl(value) ? value : null
}
