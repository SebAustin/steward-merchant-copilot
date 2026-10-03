import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/cookie'
import { ENTER_PATH, gateDecision, type GateDecision } from '@/lib/auth/gate'
import { verifySession } from '@/lib/auth/session'
import { getEnv } from '@/lib/env'
import { jsonError } from '@/lib/http/respond'
import { buildCsp, createNonce, securityHeaders } from '@/lib/security/headers'

/**
 * Next 16 `proxy` (formerly middleware): per-request nonce CSP, security headers and the
 * signed-cookie gate. No database access here; the cookie signature and expiry are enough.
 */
export function proxy(request: NextRequest): Response {
  const env = getEnv()
  const isDev = env.NODE_ENV === 'development'
  const nonce = createNonce()
  const csp = buildCsp(nonce, { isDev })

  const session = verifySession(
    request.cookies.get(SESSION_COOKIE)?.value,
    env.SESSION_SECRET,
    Date.now(),
  )
  const decision = gateDecision(request.nextUrl.pathname, session !== null)

  const response = respond(request, decision, nonce, csp)
  response.headers.set('Content-Security-Policy', csp)
  for (const [name, value] of Object.entries(securityHeaders({ isDev }))) {
    response.headers.set(name, value)
  }
  return response
}

function respond(
  request: NextRequest,
  decision: GateDecision,
  nonce: string,
  csp: string,
): Response {
  switch (decision) {
    case 'allow':
      return NextResponse.next({ request: { headers: forwardedHeaders(request, nonce, csp) } })
    case 'unauthorized':
      return jsonError(401, 'unauthorized', 'Please enter the passcode.')
    default:
      return NextResponse.redirect(
        new URL(decision === 'redirect-to-enter' ? ENTER_PATH : '/', request.url),
        307,
      )
  }
}

function forwardedHeaders(request: NextRequest, nonce: string, csp: string): Headers {
  const headers = new Headers(request.headers)
  headers.set('x-nonce', nonce)
  headers.set('Content-Security-Policy', csp)
  return headers
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
}
