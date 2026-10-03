import { describe, expect, it } from 'vitest'
import { gateDecision } from './gate'

describe('gateDecision', () => {
  it('sends an anonymous visitor to the passcode page from any app page', () => {
    for (const path of ['/', '/queue', '/invoices', '/settings']) {
      expect(gateDecision(path, false)).toBe('redirect-to-enter')
    }
  })

  it('lets anonymous visitors reach only the passcode page, login and health', () => {
    expect(gateDecision('/enter', false)).toBe('allow')
    expect(gateDecision('/api/session', false)).toBe('allow')
    expect(gateDecision('/api/health', false)).toBe('allow')
  })

  it('answers anonymous API calls with 401 instead of a redirect', () => {
    expect(gateDecision('/api/chat', false)).toBe('unauthorized')
    expect(gateDecision('/api/proposals/abc/approve', false)).toBe('unauthorized')
  })

  it('does not treat look-alike paths as public', () => {
    expect(gateDecision('/enter/../queue', false)).toBe('redirect-to-enter')
    expect(gateDecision('/api/health/../chat', false)).toBe('unauthorized')
    expect(gateDecision('/api/healthz', false)).toBe('unauthorized')
    expect(gateDecision('/entering', false)).toBe('redirect-to-enter')
  })

  it('lets a signed-in visitor through, bouncing the passcode page back to the Brief', () => {
    expect(gateDecision('/queue', true)).toBe('allow')
    expect(gateDecision('/api/chat', true)).toBe('allow')
    expect(gateDecision('/enter', true)).toBe('redirect-to-brief')
  })
})
