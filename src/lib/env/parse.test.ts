import { describe, expect, it } from 'vitest'
import { EnvError, parseEnv } from './parse'

const SECRET = 'a'.repeat(32)

const valid = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  DEMO_PASSCODE: 'espresso-2026',
  SESSION_SECRET: SECRET,
}

describe('parseEnv', () => {
  it('accepts a credential-free configuration and applies safe defaults', () => {
    const env = parseEnv(valid)

    expect(env.AI_PROVIDER).toBe('mock')
    expect(env.PAYPAL_ENV).toBe('sandbox')
    expect(env.DISPUTE_SOURCE).toBe('simulated')
    expect(env.POLICIES_ENABLED).toBe(false)
    expect(env.PAYPAL_CLIENT_ID).toBeUndefined()
    expect(env.ANTHROPIC_API_KEY).toBeUndefined()
  })

  it('treats blank values as unset so a placeholder deploy boots', () => {
    const env = parseEnv({ ...valid, PAYPAL_CLIENT_ID: '', ANTHROPIC_API_KEY: '', CRON_SECRET: '' })

    expect(env.PAYPAL_CLIENT_ID).toBeUndefined()
    expect(env.CRON_SECRET).toBeUndefined()
  })

  it('rejects any PayPal environment other than sandbox (NG1)', () => {
    expect(() => parseEnv({ ...valid, PAYPAL_ENV: 'live' })).toThrow(EnvError)
  })

  it('requires DATABASE_URL, DEMO_PASSCODE and a 32+ character SESSION_SECRET', () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/)
    expect(() => parseEnv({ ...valid, DEMO_PASSCODE: undefined })).toThrow(/DEMO_PASSCODE/)
    expect(() => parseEnv({ ...valid, SESSION_SECRET: 'short' })).toThrow(/SESSION_SECRET/)
  })

  it('rejects the mock model provider on Render', () => {
    expect(() => parseEnv({ ...valid, RENDER: 'true', AI_PROVIDER: 'mock' })).toThrow(/AI_PROVIDER/)
    expect(parseEnv({ ...valid, RENDER: 'true', AI_PROVIDER: 'anthropic' }).AI_PROVIDER).toBe(
      'anthropic',
    )
  })

  it('rejects example placeholders for the passcode and session secret on Render', () => {
    const onRender = { ...valid, RENDER: 'true', AI_PROVIDER: 'anthropic' }

    expect(() => parseEnv({ ...onRender, DEMO_PASSCODE: 'change-me-demo-passcode' })).toThrow(
      /DEMO_PASSCODE/,
    )
    expect(() => parseEnv({ ...onRender, SESSION_SECRET: `replace-with-${SECRET}` })).toThrow(
      /SESSION_SECRET/,
    )
  })

  it('rejects secrets exposed under NEXT_PUBLIC_ but allows the AG Grid license key', () => {
    expect(() => parseEnv({ ...valid, NEXT_PUBLIC_API_SECRET: 'x' })).toThrow(
      /NEXT_PUBLIC_API_SECRET/,
    )
    expect(
      parseEnv({ ...valid, NEXT_PUBLIC_AG_GRID_LICENSE_KEY: 'lic' })
        .NEXT_PUBLIC_AG_GRID_LICENSE_KEY,
    ).toBe('lic')
  })

  it('coerces booleans and numeric caps from strings', () => {
    const env = parseEnv({ ...valid, POLICIES_ENABLED: 'true', DEMO_DAILY_CAP_USD: '3' })

    expect(env.POLICIES_ENABLED).toBe(true)
    expect(env.DEMO_DAILY_CAP_USD).toBe(3)
  })

  it('names invalid variables in the error but never echoes their values', () => {
    const leaked = 'super-secret-but-too-short'
    let message = ''
    try {
      parseEnv({ ...valid, SESSION_SECRET: leaked, DISPUTE_SOURCE: 'bogus-source' })
    } catch (error) {
      message = (error as Error).message
    }

    expect(message).toContain('SESSION_SECRET')
    expect(message).toContain('DISPUTE_SOURCE')
    expect(message).not.toContain(leaked)
    expect(message).not.toContain('bogus-source')
  })
})
