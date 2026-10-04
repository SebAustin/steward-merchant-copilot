import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/db'
import { sessions } from '@/db/schema'
import { SESSION_COOKIE, sessionCookieAttributes } from '@/lib/auth/cookie'
import { clientIp } from '@/lib/auth/client-ip'
import { isSameOrigin } from '@/lib/auth/csrf'
import { passcodeMatches } from '@/lib/auth/passcode'
import { requireSessionAndCsrf } from '@/lib/auth/request'
import { SESSION_TTL_MS, createSessionId, signSession } from '@/lib/auth/session'
import { getEnv } from '@/lib/env'
import { enforceRouteLimit } from '@/lib/guard/route-limit'
import { rateLimit, refundRateLimit } from '@/lib/guard/rate-limit'
import { jsonError } from '@/lib/http/respond'
import { log } from '@/lib/log'

const LOGIN_ATTEMPTS = 5
const LOGIN_WINDOW_SEC = 600
const MAX_PASSCODE_LENGTH = 256

const body = z.object({ passcode: z.string().min(1).max(MAX_PASSCODE_LENGTH) })

/** Passcode login. Same-site only, rate limited per IP, constant-time compare (D-4, NFR-S6). */
export async function POST(request: Request): Promise<Response> {
  try {
    const env = getEnv()
    if (!isSameOrigin(request.headers.get('origin'), request.headers.get('host'))) {
      return jsonError(403, 'csrf', 'That request could not be verified. Reload and try again.')
    }
    const limited = await enforceRouteLimit(request, 'session')
    if (limited) return limited

    // Every attempt is counted before the passcode is checked (so parallel guesses cannot
    // outrun the limit); a correct passcode is refunded below, so only wrong guesses use it up.
    const attemptKey = `login:${clientIp(request.headers, env.TRUSTED_PROXY_HOPS)}`
    const attempts = await rateLimit(getDb(), {
      key: attemptKey,
      limit: LOGIN_ATTEMPTS,
      windowSec: LOGIN_WINDOW_SEC,
    })
    if (!attempts.allowed) {
      return jsonError(429, 'rate_limited', 'Too many tries. Please wait 10 minutes.', {
        'retry-after': String(attempts.retryAfterSec),
      })
    }

    const parsed = body.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return jsonError(400, 'invalid_request', 'Enter the demo passcode.')
    if (!passcodeMatches(parsed.data.passcode, env.DEMO_PASSCODE)) {
      return jsonError(401, 'invalid_passcode', "That passcode doesn't match.")
    }

    await refundRateLimit(getDb(), { key: attemptKey, windowStart: attempts.windowStart })

    const sid = createSessionId()
    await getDb()
      .insert(sessions)
      .values({ idHash: createHash('sha256').update(sid).digest('hex') })

    const response = NextResponse.json({ ok: true })
    response.cookies.set(
      SESSION_COOKIE,
      signSession({ sid, now: Date.now(), ttlMs: SESSION_TTL_MS }, env.SESSION_SECRET),
      sessionCookieAttributes(env.NODE_ENV, SESSION_TTL_MS / 1000),
    )
    return response
  } catch (error) {
    log.error({ route: '/api/session', error }, 'login failed closed')
    return jsonError(503, 'unavailable', 'Steward is unavailable right now. Please try again.')
  }
}

/** Sign out. Needs the session plus the CSRF token and a same-site Origin. */
export async function DELETE(request: Request): Promise<Response> {
  try {
    const limited = await enforceRouteLimit(request, 'session')
    if (limited) return limited
    const guarded = requireSessionAndCsrf(request)
    if (guarded.denied) return guarded.denied

    const response = NextResponse.json({ ok: true })
    response.cookies.set(SESSION_COOKIE, '', sessionCookieAttributes(getEnv().NODE_ENV, 0))
    return response
  } catch (error) {
    log.error({ route: '/api/session', error }, 'logout failed closed')
    return jsonError(503, 'unavailable', 'Steward is unavailable right now. Please try again.')
  }
}
