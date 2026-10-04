export const SESSION_COOKIE = 'steward_session'

/** Parse a Cookie request header into a name -> value map (first occurrence wins). */
export function parseCookies(header: string | null): ReadonlyMap<string, string> {
  const cookies = new Map<string, string>()
  for (const part of header?.split(';') ?? []) {
    const index = part.indexOf('=')
    if (index < 1) continue
    const name = part.slice(0, index).trim()
    if (!cookies.has(name)) cookies.set(name, part.slice(index + 1).trim())
  }
  return cookies
}

/**
 * Attributes for the session cookie. `Secure` everywhere except `next dev`, where browsers like
 * Safari refuse Secure cookies on http://localhost. Production builds always set it.
 */
export function sessionCookieAttributes(nodeEnv: string, maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: nodeEnv !== 'development',
    path: '/',
    maxAge: maxAgeSeconds,
  } as const
}
