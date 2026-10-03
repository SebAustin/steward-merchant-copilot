import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getEnv } from '@/lib/env'
import { SESSION_COOKIE } from './cookie'
import { csrfTokenFor } from './csrf'
import { verifySession, type Session } from './session'

/** The verified session for a server component, or null. Reading cookies makes the page dynamic. */
export async function getPageSession(): Promise<Session | null> {
  const jar = await cookies()
  return verifySession(jar.get(SESSION_COOKIE)?.value, getEnv().SESSION_SECRET, Date.now())
}

/** Defense in depth behind proxy.ts: pages re-check the cookie and never trust the proxy alone. */
export async function requirePageSession(): Promise<
  Readonly<{ session: Session; csrfToken: string }>
> {
  const session = await getPageSession()
  if (!session) redirect('/enter')
  return { session, csrfToken: csrfTokenFor(session.sid, getEnv().SESSION_SECRET) }
}
