export type GateDecision = 'allow' | 'redirect-to-enter' | 'redirect-to-brief' | 'unauthorized'

export const ENTER_PATH = '/enter'

/**
 * Paths an anonymous visitor may reach. Exact matches only: a prefix match would let a
 * look-alike path through. Later slices add their own secret-authenticated routes here
 * (webhooks, cron) when those routes exist.
 */
const PUBLIC_PATHS: ReadonlySet<string> = new Set([ENTER_PATH, '/api/session', '/api/health'])

/** Decide what the proxy does with a request, given only the path and whether the cookie verified. */
export function gateDecision(pathname: string, hasSession: boolean): GateDecision {
  if (hasSession) return pathname === ENTER_PATH ? 'redirect-to-brief' : 'allow'
  if (PUBLIC_PATHS.has(pathname)) return 'allow'
  return pathname.startsWith('/api/') ? 'unauthorized' : 'redirect-to-enter'
}
