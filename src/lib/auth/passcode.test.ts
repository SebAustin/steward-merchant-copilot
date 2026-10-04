import { describe, expect, it } from 'vitest'
import { passcodeGeneration, passcodeMatches } from './passcode'

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

describe('passcodeGeneration', () => {
  it('changes when the passcode or the secret changes, and is stable otherwise', () => {
    const secret = 's'.repeat(40)
    const gen = passcodeGeneration('espresso-2026', secret)

    expect(passcodeGeneration('espresso-2026', secret)).toBe(gen)
    expect(passcodeGeneration('espresso-2027', secret)).not.toBe(gen)
    expect(passcodeGeneration('espresso-2026', 't'.repeat(40))).not.toBe(gen)
    expect(gen).not.toContain('espresso')
  })
})
