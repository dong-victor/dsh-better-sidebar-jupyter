/**
 * Tests for the Python syntax highlighter, with a focus on f-string
 * interpolation highlighting (IDEA/PyCharm behavior).
 */
import { describe, expect, it } from 'vitest'
import { highlightPython } from '../src/client/jupyter/panel/highlight.ts'

describe('highlightPython f-strings', () => {
  it('colors the {expr} interpolation with expression tokens', () => {
    const html = highlightPython("f'{x + 1}'")
    expect(html).toContain('dshjp-tok-id')
    expect(html).toContain('>x<')
    expect(html).toContain('dshjp-tok-num')
    expect(html).toContain('>1<')
    expect(html).toContain('dshjp-tok-op')
  })

  it('keeps the literal chunks as string tokens', () => {
    const html = highlightPython("f'hello {name}!'")
    expect(html).toContain('dshjp-tok-str')
    expect(html).toContain('hello ')
    expect(html).toContain('!')
  })

  it('treats {{ }} as escaped literal braces, not interpolations', () => {
    const html = highlightPython("f'a {{b}} c'")
    // The whole "a {{b}} c" stays inside string spans (no id token for b).
    expect(html).not.toContain('>b<')
    expect(html).toContain('{{b}}')
  })

  it('does not split plain strings', () => {
    const html = highlightPython("'x + 1'")
    expect(html).not.toContain('dshjp-tok-op')
    expect(html).toContain('dshjp-tok-str')
  })

  it('highlights double-quoted f-strings and raw-f strings', () => {
    expect(highlightPython('f"v={v}"')).toContain('>v<')
    expect(highlightPython("rf'{p}'")).toContain('>p<')
  })
})
