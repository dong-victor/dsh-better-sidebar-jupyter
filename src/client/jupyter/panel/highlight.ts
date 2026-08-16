/**
 * Lightweight Python syntax highlighter for code cells. Regex-based tokenizer
 * producing span-tagged HTML; good enough for notebook editing, no heavy deps.
 * @module dsh-jupyter/client/panel/highlight
 */

const KEYWORDS = new Set([
  'and', 'as', 'assert', 'async', 'await', 'break', 'case', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
  'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'match', 'nonlocal', 'not', 'or', 'pass',
  'raise', 'return', 'try', 'while', 'with', 'yield',
])

const BUILTINS = new Set([
  'abs', 'all', 'any', 'ascii', 'bin', 'bool', 'bytearray', 'bytes', 'callable', 'chr', 'classmethod', 'compile', 'complex',
  'delattr', 'dict', 'dir', 'divmod', 'enumerate', 'eval', 'exec', 'filter', 'float', 'format', 'frozenset', 'getattr',
  'globals', 'hasattr', 'hash', 'help', 'hex', 'id', 'input', 'int', 'isinstance', 'issubclass', 'iter', 'len', 'list',
  'locals', 'map', 'max', 'memoryview', 'min', 'next', 'object', 'oct', 'open', 'ord', 'pow', 'print', 'property', 'range',
  'repr', 'reversed', 'round', 'set', 'setattr', 'slice', 'sorted', 'staticmethod', 'str', 'sum', 'super', 'tuple', 'type',
  'vars', 'zip', '__import__', 'True', 'False', 'None', 'self', 'cls',
])

/** Escape then wrap in a token span. */
function tok(cls: string, text: string): string {
  return `<span class="dshjp-tok-${cls}">${text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</span>`
}

/** Token regex SOURCE (shared), instantiated per highlightPython call — the
 *  f-string interpolation highlighting recurses, and a shared `lastIndex`
 *  would be clobbered by the inner call. Group 2 is the string prefix (e.g.
 *  `f`, `rf`) — when it contains `f`/`F` the string is an f-string and its
 *  `{expr}` interpolations get expression colors. */
const TOKEN_RE_SOURCE = '(#[^\\n]*)|((?:[rRbBuU]*[fF])?)(?:("""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\'|"[^"\\n]*"|\'[^\'\\n]*\'))|(\\b(?:0x[0-9a-fA-F]+|0b[01]+|\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)\\b)|(@[A-Za-z_]\\w*)|(\\b[A-Za-z_]\\w*\\b)|(\\s+)|([^\\sA-Za-z0-9_])'

/**
 * Render an f-string token: the literal chunks keep the string color, while
 * `{expr}` interpolations are re-highlighted with expression colors
 * (IDEA/PyCharm style — `f'{x + 1}'` shows `x + 1` in expression colors).
 * Handles `{{`/`}}` escapes and nested braces inside format specs.
 */
function renderFString(raw: string): string {
  const prefix = /^(?:[rRbBuU]*[fF])/.exec(raw)?.[0] ?? ''
  const quote = raw[prefix.length] ?? ''
  const triple = raw.startsWith('"""', prefix.length) || raw.startsWith("'''", prefix.length)
  const openLen = triple ? 3 : 1
  const body = raw.slice(prefix.length + openLen, raw.length - openLen)
  let out = ''
  let lit = ''
  let i = 0
  const n = body.length
  const flushLit = (): void => {
    if (lit !== '') {
      out += tok('str', lit)
      lit = ''
    }
  }
  while (i < n) {
    const ch = body[i]!
    if (ch === '{' && body[i + 1] === '{') { lit += '{{'; i += 2; continue }
    if (ch === '}' && body[i + 1] === '}') { lit += '}}'; i += 2; continue }
    if (ch === '{') {
      // Find the matching close brace, respecting quoted content and nesting.
      let j = i + 1
      let depth = 1
      let quoteCh: string | null = null
      while (j < n && depth > 0) {
        const c = body[j]!
        if (quoteCh !== null) {
          if (c === '\\') j += 1
          else if (c === quoteCh) quoteCh = null
        } else if (c === '"' || c === "'") {
          quoteCh = c
        } else if (c === '{') {
          depth += 1
        } else if (c === '}') {
          depth -= 1
        }
        j += 1
      }
      const expr = body.slice(i + 1, j - 1)
      flushLit()
      out += highlightPython(expr)
      i = j
      continue
    }
    lit += ch
    i += 1
  }
  flushLit()
  return out
}

/** Highlight Python source into span-tagged HTML (input is escaped).
 * IDEA/PyCharm semantics: keywords and literals get their Darcula colors,
 * `def`/`class` definition names are yellow, `self`/`cls` are italic, and all
 * other identifiers stay the plain editor foreground (IDEA does not color
 * builtins or function calls). */
export function highlightPython(code: string): string {
  const tokenRe = new RegExp(TOKEN_RE_SOURCE, 'g')
  let out = ''
  let last = 0
  let prevWord = ''
  let match: RegExpExecArray | null
  while ((match = tokenRe.exec(code)) !== null) {
    const [full, comment, prefix, string, number, decorator, identifier, whitespace, op] = match
    out += code.slice(last, match.index)
    if (comment !== undefined) out += tok('com', comment)
    else if (string !== undefined) {
      out += (prefix ?? '').includes('f') || (prefix ?? '').includes('F')
        ? renderFString(string)
        : tok('str', string)
    }
    else if (number !== undefined) out += tok('num', number)
    else if (decorator !== undefined) out += tok('dec', decorator)
    else if (identifier !== undefined) {
      const word = identifier
      if (KEYWORDS.has(word)) {
        out += tok('kw', identifier)
        // Remember `def`/`class` so the following name is colored yellow.
        prevWord = word === 'def' || word === 'class' ? word : ''
      } else if (prevWord === 'def' || prevWord === 'class') {
        out += tok('fn', identifier) // function / class definition name
        prevWord = ''
      } else if (word === 'self' || word === 'cls') {
        out += tok('self', identifier)
      } else if (BUILTINS.has(word)) {
        out += tok('builtin', identifier)
      } else {
        out += tok('id', identifier)
      }
    } else if (whitespace !== undefined) {
      out += whitespace
    } else if (op !== undefined) {
      out += tok('op', op)
    }
    void full
    last = match.index + full.length
  }
  out += code.slice(last)
  return out
}
