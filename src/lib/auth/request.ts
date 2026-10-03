import 'server-only'
import { getEnv } from '@/lib/env'
import { jsonError } from '@/lib/http/respond'
import { SESSION_COOKIE, parseCookies } from './cookie'
import { CSRF_HEADER, verifyCsrf } from './csrf'
import { verifySession, type Session } from './session'

/** The verified session on a route-handler request, or null. */
export function sessionFromRequest(request: Request): Session | null {
  const raw = parseCookies(request.headers.get('cookie')).get(SESSION_COOKIE)
  return verifySession(raw, getEnv().SESSION_SECRET, Date.now())
}

/** True when the request carries this session's CSRF token and a same-site Origin. */
export function csrfValid(request: Request, session: Session): boolean {
  return verifyCsrf({
    sid: session.sid,
    secret: getEnv().SESSION_SECRET,
    token: request.headers.get(CSRF_HEADER) ?? undefined,
    origin: request.headers.get('origin') ?? undefined,
    host: request.headers.get('host') ?? undefined,
  })
}

type Guarded = { session: Session; denied?: undefined } | { session?: undefined; denied: Response }

/** Session + CSRF gate for state-changing routes. Returns the session or a ready 401/403 response. */
export function requireSessionAndCsrf(request: Request): Guarded {
  const session = sessionFromRequest(request)
  if (!session) return { denied: jsonError(401, 'unauthorized', 'Please enter the passcode.') }
  if (!csrfValid(request, session)) {
    return {
      denied: jsonError(403, 'csrf', 'That request could not be verified. Reload and try again.'),
    }
  }
  return { session }
}
