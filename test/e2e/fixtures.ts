import { test as base, expect } from '@playwright/test'

export const PASSCODE = 'ci-demo-passcode'

/**
 * Each test gets its own client address (via the trusted-proxy header) so passcode rate limits
 * never leak between tests or between repeated local runs.
 */
export const test = base.extend({
  context: async ({ context }, provide) => {
    const octet = () => Math.floor(Math.random() * 254) + 1
    await context.setExtraHTTPHeaders({ 'x-forwarded-for': `198.51.${octet()}.${octet()}` })
    await provide(context)
  },
})

export { expect }
