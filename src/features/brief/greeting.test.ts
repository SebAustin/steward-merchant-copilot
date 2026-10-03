import { describe, expect, it } from 'vitest'
import { briefGreeting } from './greeting'

// Pacific time, the roastery's zone (DESIGN section 1). October is PDT (UTC-7).
const pacific = (iso: string) => new Date(`${iso}-07:00`)

describe('briefGreeting', () => {
  it('names the weekday and part of day in the Merchant time zone', () => {
    expect(briefGreeting(pacific('2026-10-01T19:42:00'))).toBe('Thursday evening, Maya.')
    expect(briefGreeting(pacific('2026-10-02T08:05:00'))).toBe('Friday morning, Maya.')
    expect(briefGreeting(pacific('2026-10-03T13:30:00'))).toBe('Saturday afternoon, Maya.')
  })

  it('uses the Pacific day even when UTC has already rolled over', () => {
    // 02:00 UTC Friday is 19:00 Thursday in Pacific time.
    expect(briefGreeting(new Date('2026-10-02T02:00:00Z'))).toBe('Thursday evening, Maya.')
  })

  it('switches at noon and at 5 pm', () => {
    expect(briefGreeting(pacific('2026-10-01T11:59:00'))).toContain('morning')
    expect(briefGreeting(pacific('2026-10-01T12:00:00'))).toContain('afternoon')
    expect(briefGreeting(pacific('2026-10-01T16:59:00'))).toContain('afternoon')
    expect(briefGreeting(pacific('2026-10-01T17:00:00'))).toContain('evening')
  })
})
