import 'server-only'
import { createHash } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getDb } from '@/db'
import { sessions } from '@/db/schema'
import type { Db } from '@/db/types'
import { getEnv, type Env } from '@/lib/env'
import { rateLimit, returnAttempt } from '@/lib/guard/rate-limit'
import { log } from '@/lib/log'
import { SESSION_COOKIE, parseCookies, sessionCookieAttributes } from './cookie'
import { CSRF_HEADER, csrfTokenFor, isSameOrigin, verifyCsrf } from './csrf'
import { passcodeGeneration, passcodeMatches } from './passcode'
import {
  SESSION_TTL_MS,
  createSessionId,
  signSession,
  verifySession,
  type Session,
} from './session'

/*
 * The auth interface (PLAN section 4): login, logout, requireSession, requirePageSession.
 * Cookie parsing, signing, CSRF and the session table stay behind it. proxy.ts is only a first,
 * database-free gate on the cookie signature; everything here also checks the session row.
 */

export type { Session }

export type AuthDeps = Readonly<{
  db: Db
  env: Pick<Env, 'SESSION_SECRET' | 'DEMO_PASSCODE' | 'NODE_ENV'>
}>

const defaultDeps = (): AuthDeps => ({ db: getDb(), env: getEnv() })

/** Wrong guesses allowed per client address and window. Successful logins are not counted. */
export const LOGIN_ATTEMPTS = 5
export const LOGIN_ATTEMPT_WINDOW_SEC = 10 * 60
/** Successful logins allowed per client address and hour (bounds session-row creation). */
export const LOGIN_SUCCESS_CAP = 20
export const LOGIN_SUCCESS_WINDOW_SEC = 60 * 60

const hashSid = (sid: string) => createHash('sha256').update(sid).digest('hex')

export type CookieSpec = Readonly<{
  name: string
  value: string
  options: ReturnType<typeof sessionCookieAttributes>
}>

export type LoginResult =
  | Readonly<{ ok: true; cookie: CookieSpec }>
  | Readonly<{
      ok: false
      reason: 'invalid_passcode' | 'login_rate_limited' | 'login_cap'
      retryAfterSec?: number
    }>

/**
 * Passcode login. Every attempt is counted before the passcode is checked, so parallel guesses
 * cannot outrun the limit; a correct passcode is returned to the allowance, so only wrong guesses
 * use it up. Throws if the database is unavailable (callers fail closed).
 */
export async function login(
  input: Readonly<{ passcode: string; ip: string; now?: number }>,
  deps: AuthDeps = defaultDeps(),
): Promise<LoginResult> {
  const { db, env } = deps
  const now = input.now ?? Date.now()
  const attemptKey = `login:${input.ip}`

  const attempt = await rateLimit(db, {
    key: attemptKey,
    limit: LOGIN_ATTEMPTS,
    windowSec: LOGIN_ATTEMPT_WINDOW_SEC,
    now,
  })
  if (!attempt.allowed) {
    return { ok: false, reason: 'login_rate_limited', retryAfterSec: attempt.retryAfterSec }
  }
  if (!passcodeMatches(input.passcode, env.DEMO_PASSCODE)) {
    return { ok: false, reason: 'invalid_passcode' }
  }
  await returnAttempt(db, { key: attemptKey, windowStart: attempt.windowStart })

  const issued = await rateLimit(db, {
    key: `login-ok:${input.ip}`,
    limit: LOGIN_SUCCESS_CAP,
    windowSec: LOGIN_SUCCESS_WINDOW_SEC,
    now,
  })
  if (!issued.allowed)
    return { ok: false, reason: 'login_cap', retryAfterSec: issued.retryAfterSec }

  const sid = createSessionId()
  await db.insert(sessions).values({
    idHash: hashSid(sid),
    passcodeGen: passcodeGeneration(env.DEMO_PASSCODE, env.SESSION_SECRET),
    expiresAt: new Date(now + SESSION_TTL_MS),
  })
  return {
    ok: true,
    cookie: {
      name: SESSION_COOKIE,
      value: signSession({ sid, now, ttlMs: SESSION_TTL_MS }, env.SESSION_SECRET),
      options: sessionCookieAttributes(env.NODE_ENV, SESSION_TTL_MS / 1000),
    },
  }
}

/** End a session server-side (the cookie alone is not enough) and return the cookie that clears it. */
export async function logout(
  session: Session,
  deps: AuthDeps = defaultDeps(),
): Promise<CookieSpec> {
  await deps.db.delete(sessions).where(eq(sessions.idHash, hashSid(session.sid)))
  return clearedSessionCookie(deps.env)
}

/** The cookie that clears the session in the browser (also used when the server-side delete is moot). */
export function clearedSessionCookie(env: Pick<Env, 'NODE_ENV'>): CookieSpec {
  return { name: SESSION_COOKIE, value: '', options: sessionCookieAttributes(env.NODE_ENV, 0) }
}

/** Signature, expiry, and a live session row issued under the current passcode. */
async function authenticate(
  rawCookie: string | undefined,
  deps: AuthDeps,
): Promise<Session | null> {
  const session = verifySession(rawCookie, deps.env.SESSION_SECRET, Date.now())
  if (!session) return null
  const [row] = await deps.db
    .select({ id: sessions.idHash })
    .from(sessions)
    .where(
      and(
        eq(sessions.idHash, hashSid(session.sid)),
        gt(sessions.expiresAt, new Date()),
        eq(
          sessions.passcodeGen,
          passcodeGeneration(deps.env.DEMO_PASSCODE, deps.env.SESSION_SECRET),
        ),
      ),
    )
    .limit(1)
  return row ? session : null
}

export type SessionCheck =
  | Readonly<{ ok: true; session: Session; csrfToken: string }>
  | Readonly<{ ok: false; status: 401 | 403; code: 'unauthorized' | 'csrf' }>

/**
 * Authenticate a route-handler request. Pass `{ csrf: true }` for state-changing requests: they
 * must also carry this session's CSRF token and a same-site Origin. Throws if the database is
 * unavailable (callers fail closed).
 */
export async function requireSession(
  request: Request,
  options: Readonly<{ csrf?: boolean }> = {},
  deps: AuthDeps = defaultDeps(),
): Promise<SessionCheck> {
  const raw = parseCookies(request.headers.get('cookie')).get(SESSION_COOKIE)
  const session = await authenticate(raw, deps)
  if (!session) return { ok: false, status: 401, code: 'unauthorized' }

  if (options.csrf) {
    const valid = verifyCsrf({
      sid: session.sid,
      secret: deps.env.SESSION_SECRET,
      token: request.headers.get(CSRF_HEADER) ?? undefined,
      origin: request.headers.get('origin') ?? undefined,
      host: request.headers.get('host') ?? undefined,
    })
    if (!valid) return { ok: false, status: 403, code: 'csrf' }
  }
  return { ok: true, session, csrfToken: csrfTokenFor(session.sid, deps.env.SESSION_SECRET) }
}

/** Thrown to the error boundary when the session store cannot be reached (never an auth decision). */
export class AuthUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super('Session store unavailable', options)
    this.name = 'AuthUnavailableError'
  }
}

/** Authenticate the page's cookie; a database failure is logged with a request id and rethrown typed. */
async function authenticatePage(deps: AuthDeps): Promise<Session | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value
  try {
    return await authenticate(raw, deps)
  } catch (error) {
    log.warn({ requestId: crypto.randomUUID(), error }, 'session check failed')
    throw new AuthUnavailableError({ cause: error })
  }
}

/**
 * For server components: the session and its CSRF token, or a redirect to the passcode page.
 * Throws {@link AuthUnavailableError} when the database is down, for the error boundary to show.
 */
export async function requirePageSession(
  deps: AuthDeps = defaultDeps(),
): Promise<Readonly<{ session: Session; csrfToken: string }>> {
  // The redirect stays outside the try: Next implements it as a thrown error.
  const session = await authenticatePage(deps)
  if (!session) redirect('/enter')
  return { session, csrfToken: csrfTokenFor(session.sid, deps.env.SESSION_SECRET) }
}

/**
 * The passcode page's own check: signed in already? Does not redirect. With the database down it
 * answers false, so the form still renders and the login POST fails closed with a friendly 503.
 */
export async function hasPageSession(deps: AuthDeps = defaultDeps()): Promise<boolean> {
  try {
    return (await authenticatePage(deps)) !== null
  } catch (error) {
    if (error instanceof AuthUnavailableError) return false
    throw error
  }
}

/** Same-site check for requests that have no session yet (the login POST). */
export function isSameSiteRequest(request: Request): boolean {
  return isSameOrigin(request.headers.get('origin'), request.headers.get('host'))
}
