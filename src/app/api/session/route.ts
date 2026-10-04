import { after, NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/db'
import { clearedSessionCookie, isSameSiteRequest, login, logout, requireSession } from '@/lib/auth'
import { getEnv } from '@/lib/env'
import { enforceRouteLimit } from '@/lib/guard/route-limit'
import { maybePrune } from '@/lib/guard/prune'
import { requestClientBucket } from '@/lib/http/client-key'
import type { ErrorCode } from '@/lib/http/messages'
import { jsonError } from '@/lib/http/respond'
import { log } from '@/lib/log'

const MAX_PASSCODE_LENGTH = 256
const body = z.object({ passcode: z.string().min(1).max(MAX_PASSCODE_LENGTH) })

const FAILURE_STATUS = {
  invalid_passcode: 401,
  login_rate_limited: 429,
  login_cap: 429,
} as const satisfies Partial<Record<ErrorCode, number>>

/** Passcode login: a thin adapter over `login()` (same-site only, rate limited, constant-time). */
export async function POST(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID()
  try {
    if (!isSameSiteRequest(request)) {
      return jsonError({ status: 403, code: 'csrf', requestId })
    }
    const limited = await enforceRouteLimit(request, 'session', requestId)
    if (limited) return limited

    const parsed = body.safeParse(await request.json().catch(() => null))
    // Malformed bodies are rejected before login(), so they cost no attempt.
    if (!parsed.success) return jsonError({ status: 400, code: 'invalid_request', requestId })

    const result = await login({ passcode: parsed.data.passcode, ip: requestClientBucket(request) })
    if (!result.ok) {
      return jsonError({
        status: FAILURE_STATUS[result.reason],
        code: result.reason,
        requestId,
        headers: result.retryAfterSec ? { 'retry-after': String(result.retryAfterSec) } : undefined,
      })
    }

    after(() =>
      maybePrune(getDb()).catch((error: unknown) => log.warn({ requestId, error }, 'prune failed')),
    )
    const response = NextResponse.json({ ok: true })
    const { name, value, options } = result.cookie
    response.cookies.set(name, value, options)
    return response
  } catch (error) {
    log.error({ requestId, route: '/api/session', error }, 'login failed closed')
    return jsonError({ status: 503, code: 'unavailable', requestId })
  }
}

/** Sign out: needs the session, the CSRF token and a same-site Origin. Revokes the session row. */
export async function DELETE(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID()
  try {
    // A failing limiter must never stop someone from signing out.
    const limited = await enforceRouteLimit(request, 'session', requestId).catch(
      (error: unknown) => {
        log.warn({ requestId, error }, 'route limiter unavailable during sign-out')
        return null
      },
    )
    if (limited) return limited

    const check = await requireSession(request, { csrf: true })
    if (!check.ok) return jsonError({ status: check.status, code: check.code, requestId })

    const cleared = await logout(check.session)
    const response = NextResponse.json({ ok: true })
    response.cookies.set(cleared.name, cleared.value, cleared.options)
    return response
  } catch (error) {
    log.error({ requestId, route: '/api/session', error }, 'logout failed closed')
    const response = jsonError({ status: 503, code: 'unavailable', requestId })
    // Still drop the cookie in this browser even though the server-side revoke did not happen.
    const cleared = clearedSessionCookie(getEnv())
    response.cookies.set(cleared.name, cleared.value, cleared.options)
    return response
  }
}
