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

/** Token regex: comments, triple strings, strings, numbers, identifiers, ops. */
const TOKEN_RE = /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?''')|("[^"\n]*"|'[^'\n]*')|\b(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|0x[0-9a-fA-F]+|0b[01]+)\b|(@[A-Za-z_]\w*)|(\b[A-Za-z_]\w*\b)|(\s+)|([^\sA-Za-z0-9_])/g

/** Highlight Python source into span-tagged HTML (input is escaped).
 * IDEA/PyCharm semantics: keywords and literals get their Darcula colors,
 * `def`/`class` definition names are yellow, `self`/`cls` are italic, and all
 * other identifiers stay the plain editor foreground (IDEA does not color
 * builtins or function calls). */
export function highlightPython(code: string): string {
  let out = ''
  let last = 0
  let prevWord = ''
  let match: RegExpExecArray | null
  TOKEN_RE.lastIndex = 0
  while ((match = TOKEN_RE.exec(code)) !== null) {
    const [full, comment, triple, string, number, decorator, identifier, whitespace, op] = match
    out += code.slice(last, match.index)
    if (comment !== undefined) out += tok('com', comment)
    else if (triple !== undefined) out += tok('str', triple)
    else if (string !== undefined) out += tok('str', string)
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
