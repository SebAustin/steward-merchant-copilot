import { describe, expect, it } from 'vitest'
import { NAV_ITEMS, isActive } from './nav'

describe('isActive', () => {
  it('matches the Brief only on the root path', () => {
    expect(isActive('/', '/')).toBe(true)
    expect(isActive('/queue', '/')).toBe(false)
  })

  it('matches a page and its children but not look-alike prefixes', () => {
    expect(isActive('/queue', '/queue')).toBe(true)
    expect(isActive('/queue/abc', '/queue')).toBe(true)
    expect(isActive('/queued', '/queue')).toBe(false)
  })
})

describe('NAV_ITEMS', () => {
  it('lists the DESIGN section 3 routes in masthead order', () => {
    expect(NAV_ITEMS.map((i) => i.href)).toEqual([
      '/',
      '/queue',
      '/invoices',
      '/disputes',
      '/risk',
      '/audit',
      '/policies',
    ])
  })
})
