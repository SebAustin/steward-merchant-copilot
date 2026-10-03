import { describe, expect, it } from 'vitest'
import { passcodeMatches } from './passcode'

describe('passcodeMatches', () => {
  it('accepts the exact passcode only', () => {
    expect(passcodeMatches('espresso-2026', 'espresso-2026')).toBe(true)
    expect(passcodeMatches('espresso-2027', 'espresso-2026')).toBe(false)
    expect(passcodeMatches('Espresso-2026', 'espresso-2026')).toBe(false)
  })

  it('handles inputs of different length and multibyte text without throwing', () => {
    expect(passcodeMatches('', 'espresso-2026')).toBe(false)
    expect(passcodeMatches('e'.repeat(10_000), 'espresso-2026')).toBe(false)
    expect(passcodeMatches('café-☕', 'café-☕')).toBe(true)
  })

  it('never grants access when no passcode is configured', () => {
    expect(passcodeMatches('', '')).toBe(false)
    expect(passcodeMatches('anything', '')).toBe(false)
  })
})
