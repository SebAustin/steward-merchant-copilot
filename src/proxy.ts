import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/cookie'
import { verifySession } from '@/lib/auth/session'
import { getEnv } from '@/lib/env'
import { jsonError } from '@/lib/http/respond'
import { buildCsp, createNonce, securityHeaders } from '@/lib/security/headers'

const ENTER_PATH = '/enter'
/**
 * Paths an anonymous visitor may reach. Exact matches only: a prefix match would let a look-alike
 * path through. Later slices add their own secret-authenticated routes here (webhooks, cron).
 */
const PUBLIC_PATHS: ReadonlySet<string> = new Set([ENTER_PATH, '/api/session', '/api/health'])

type Decision = 'allow' | 'redirect-to-enter' | 'unauthorized'

function decide(pathname: string, hasSession: boolean): Decision {
  // A signed cookie proves nothing about revocation, so even /enter stays reachable: bouncing a
  // revoked cookie off /enter while pages bounce it back would loop. The /enter page does the
  // database-checked redirect for visitors who really are signed in.
  if (hasSession || PUBLIC_PATHS.has(pathname)) return 'allow'
  return pathname.startsWith('/api/') ? 'unauthorized' : 'redirect-to-enter'
}

/**
 * Next 16 `proxy` (formerly middleware): per-request nonce CSP, security headers and a first,
 * database-free gate on the signed cookie. It cannot see revoked sessions; pages and route
 * handlers re-check the session row (`lib/auth`).
 */
export function proxy(request: NextRequest): Response {
  const env = getEnv()
  const isDev = env.NODE_ENV === 'development'
  const csp = buildCsp(createNonce(), { isDev })

  const session = verifySession(
    request.cookies.get(SESSION_COOKIE)?.value,
    env.SESSION_SECRET,
    Date.now(),
  )
  const response = respond(request, decide(request.nextUrl.pathname, session !== null), csp)

  response.headers.set('Content-Security-Policy', csp)
  for (const [name, value] of Object.entries(securityHeaders({ isDev }))) {
    response.headers.set(name, value)
  }
  return response
}

function respond(request: NextRequest, decision: Decision, csp: string): Response {
  switch (decision) {
    case 'allow': {
      // Next reads the nonce from the request's CSP header and stamps it on its own scripts.
      const headers = new Headers(request.headers)
      headers.set('Content-Security-Policy', csp)
      return NextResponse.next({ request: { headers } })
    }
    case 'unauthorized':
      return jsonError({ status: 401, code: 'unauthorized', requestId: crypto.randomUUID() })
    default:
      // The Location must be absolute: Next rejects a relative one from proxy.ts.
      return NextResponse.redirect(new URL(ENTER_PATH, request.url), 307)
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
}
