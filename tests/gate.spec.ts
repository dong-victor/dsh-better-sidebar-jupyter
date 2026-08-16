/**
 * Tests for the session path gate: containment semantics (both separators,
 * case-insensitivity on win32) — the rule that keeps notebooks inside the
 * session's working directory.
 */
import { describe, expect, it } from 'vitest'
import { isPathInside } from '../src/host/gate.ts'

describe('isPathInside', () => {
  it('accepts children and the root itself', () => {
    expect(isPathInside('C:/proj', 'C:/proj')).toBe(true)
    expect(isPathInside('C:/proj', 'C:/proj/a.ipynb')).toBe(true)
    expect(isPathInside('C:/proj', 'C:/proj/sub/deep.ipynb')).toBe(true)
    expect(isPathInside('/home/u/proj', '/home/u/proj/x.ipynb')).toBe(true)
  })

  it('rejects siblings and prefix lookalikes', () => {
    expect(isPathInside('C:/proj', 'C:/proj2/a.ipynb')).toBe(false)
    expect(isPathInside('/home/u/proj', '/home/u/proj2/a.ipynb')).toBe(false)
    expect(isPathInside('/home/u/proj', '/etc/passwd')).toBe(false)
  })

  it('normalizes both separators and trailing slashes', () => {
    expect(isPathInside('C:\\proj\\', 'C:/proj/sub/a.ipynb')).toBe(true)
    expect(isPathInside('C:/proj/', 'C:\\proj\\sub\\a.ipynb')).toBe(true)
  })
})
