import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const VERSION = 'v1'
const SESSION_ID_BYTES = 24

export type Session = Readonly<{ sid: string; expiresAt: number }>

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000

/** A random, URL-safe session id (never contains the `.` cookie separator). */
export function createSessionId(): string {
  return randomBytes(SESSION_ID_BYTES).toString('base64url')
}

function mac(payload: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(payload).digest()
}

/** Build the signed cookie value `v1.<sid>.<expiresAtMs>.<hmac>`. */
export function signSession(
  input: Readonly<{ sid: string; now: number; ttlMs: number }>,
  secret: string,
): string {
  const expiresAt = input.now + input.ttlMs
  const payload = `${VERSION}.${input.sid}.${expiresAt}`
  return `${payload}.${mac(payload, secret).toString('base64url')}`
}

/** Verify signature and expiry. Returns null for anything missing, malformed, forged or expired. */
export function verifySession(
  value: string | undefined,
  secret: string,
  now: number,
): Session | null {
  const parts = value?.split('.')
  if (parts?.length !== 4) return null
  const [version, sid, exp, sig] = parts as [string, string, string, string]
  if (version !== VERSION || sid === '' || !/^\d+$/.test(exp)) return null

  const expected = mac(`${version}.${sid}.${exp}`, secret)
  const given = Buffer.from(sig, 'base64url')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null

  const expiresAt = Number(exp)
  return expiresAt > now ? { sid, expiresAt } : null
}
