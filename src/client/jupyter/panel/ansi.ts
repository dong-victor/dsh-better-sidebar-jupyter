/**
 * ANSI SGR escape-sequence parser: converts terminal-style color codes
 * embedded in kernel output (tracebacks, stderr, stdout) into themed HTML
 * spans so the notebook panel renders colored text instead of raw escape
 * sequences like `[31m`.
 *
 * Supports the common SGR subset produced by IPython tracebacks:
 * - Standard colors: 30-37 (fg), 40-47 (bg), 90-97 (bright fg), 100-107 (bright bg)
 * - 256-color: 38;5;n (fg), 48;5;n (bg)
 * - Reset: 0 (or empty)
 * - Bold/dim: 1/2, italic: 3, underline: 4, reverse: 7
 * - IPython-specific: 39;00m = reset (bold off + default fg)
 *
 * Non-SGR CSI sequences and stray ESC chars are stripped.
 * @module dsh-jupyter/client/panel/ansi
 */

/** Named standard ANSI colors (indices 0-15). */
const ANSI_COLORS: readonly string[] = [
  // Normal: 0-7 (30-37 / 40-47)
  '#282c34', '#e06c75', '#98c379', '#e5c07b', '#61afef', '#c678dd', '#56b6c2', '#abb2bf',
  // Bright: 8-15 (90-97 / 100-107)
  '#5c6370', '#e06c75', '#98c379', '#e5c07b', '#61afef', '#c678dd', '#56b6c2', '#ffffff',
]

/** CSS color for the xterm 256-color palette index n. */
function xterm256Color(n: number, isBg: boolean): string {
  if (n < 16) return ANSI_COLORS[n] ?? '#abb2bf'
  if (n >= 232) {
    // Grayscale ramp: 232 (darkest) .. 255 (lightest)
    const v = 8 + (n - 232) * 10
    const hex = v.toString(16).padStart(2, '0')
    return `#${hex}${hex}${hex}`
  }
  // 6x6x6 color cube
  const r = Math.floor((n - 16) / 36) % 6
  const g = Math.floor((n - 16) / 6) % 6
  const b = (n - 16) % 6
  const toHex = (v: number): string => (v === 0 ? '00' : (55 + v * 40).toString(16))
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

interface SgrState {
  /** Active CSS properties for the current span (empty = default). */
  style: string
}

/** Build the CSS style string from the parsed SGR stack. */
function buildStyle(fg: string | null, bg: string | null, bold: boolean, italic: boolean, underline: boolean, reverse: boolean): string {
  let fgColor = fg
  let bgColor = bg
  if (reverse) { const tmp = fgColor; fgColor = bgColor ?? 'transparent'; bgColor = (tmp ?? '#abb2bf') }
  const parts: string[] = []
  if (fgColor !== null) parts.push(`color:${fgColor}`)
  if (bgColor !== null) parts.push(`background-color:${bgColor}`)
  if (bold) parts.push('font-weight:bold')
  if (italic) parts.push('font-style:italic')
  if (underline) parts.push('text-decoration:underline')
  return parts.join(';')
}

/** Escape HTML metacharacters. */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

/**
 * Convert a string with ANSI SGR escape sequences into themed HTML.
 * Non-SGR escape sequences (cursor movement, etc.) are stripped.
 */
export function ansiToHtml(text: string): string {
  // Fast path: no ESC character at all.
  if (!text.includes('\u001b')) return escapeHtml(text)

  let fg: string | null = null
  let bg: string | null = null
  let bold = false
  let italic = false
  let underline = false
  let reverse = false

  let out = ''
  let pending = '' // Accumulated plain text not yet wrapped.
  let currentStyle = '' // The style of the currently-open span (empty = no span).

  /** Flush pending text into a span (or bare if no style). */
  const flush = (): void => {
    if (pending === '') return
    if (currentStyle !== '') {
      out += `<span style="${currentStyle}">${escapeHtml(pending)}</span>`
    } else {
      out += escapeHtml(pending)
    }
    pending = ''
  }

  // Match ESC [ ... <terminator> — CSI sequences. We process SGR (m),
  // strip everything else (cursor moves, erase line, etc.).
  const re = /\u001b\[([0-9;]*)[A-Za-z]/g
  let last = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(text)) !== null) {
    // Text before this escape sequence.
    pending += text.slice(last, match.index)
    last = re.lastIndex

    const params = match[1] ?? ''
    const terminator = match[0].at(-1)!

    // Only SGR ('m') produces styling; all other CSI sequences are
    // display-control noise we simply strip.
    if (terminator !== 'm') continue

    // Parse SGR parameters: empty = [0] (reset).
    const codes = params === '' ? [0] : params.split(';').map((s) => {
      const n = parseInt(s, 10)
      return Number.isNaN(n) ? 0 : n
    })

    // Flush the old span, then apply the new SGR codes and open a new span.
    flush()

    let i = 0
    while (i < codes.length) {
      const code = codes[i]!
      if (code === 0) {
        fg = null; bg = null; bold = false; italic = false; underline = false; reverse = false
      } else if (code === 1) {
        bold = true
      } else if (code === 2) {
        // Dim: treat as normal (no visual change; avoid ugly opacity).
      } else if (code === 3) {
        italic = true
      } else if (code === 4) {
        underline = true
      } else if (code === 7) {
        reverse = true
      } else if (code === 22) {
        bold = false
      } else if (code === 23) {
        italic = false
      } else if (code === 24) {
        underline = false
      } else if (code === 27) {
        reverse = false
      } else if (code >= 30 && code <= 37) {
        fg = ANSI_COLORS[code - 30] ?? null
      } else if (code === 38) {
        // Extended fg: 38;5;n (256-color) or 38;2;r;g;b (truecolor)
        if (codes[i + 1] === 5 && codes[i + 2] !== undefined) {
          fg = xterm256Color(codes[i + 2]!, false)
          i += 2
        } else if (codes[i + 1] === 2 && codes[i + 4] !== undefined) {
          fg = `rgb(${codes[i + 2]},${codes[i + 3]},${codes[i + 4]})`
          i += 4
        }
      } else if (code === 39) {
        fg = null
      } else if (code >= 40 && code <= 47) {
        bg = ANSI_COLORS[code - 40] ?? null
      } else if (code === 48) {
        // Extended bg: 48;5;n (256-color) or 48;2;r;g;b (truecolor)
        if (codes[i + 1] === 5 && codes[i + 2] !== undefined) {
          bg = xterm256Color(codes[i + 2]!, true)
          i += 2
        } else if (codes[i + 1] === 2 && codes[i + 4] !== undefined) {
          bg = `rgb(${codes[i + 2]},${codes[i + 3]},${codes[i + 4]})`
          i += 4
        }
      } else if (code === 49) {
        bg = null
      } else if (code >= 90 && code <= 97) {
        fg = ANSI_COLORS[8 + (code - 90)] ?? null
      } else if (code >= 100 && code <= 107) {
        bg = ANSI_COLORS[8 + (code - 100)] ?? null
      }
      // Unknown codes: ignore.
      i += 1
    }

    currentStyle = buildStyle(fg, bg, bold, italic, underline, reverse)
  }

  // Remaining text after the last escape sequence.
  pending += text.slice(last)
  flush()

  return out
}
