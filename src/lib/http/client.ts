import { MESSAGES } from './messages'

/** The server's own message from a failed JSON response, or the generic one if there is none. */
export async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: unknown } }
    const message = body.error?.message
    return typeof message === 'string' && message !== '' ? message : MESSAGES.unavailable
  } catch {
    return MESSAGES.unavailable
  }
}

export const NETWORK_ERROR_MESSAGE = MESSAGES.unavailable

/** After a sign-out request: done, or the session was already gone server-side (401). */
export const isSignedOut = (response: Response): boolean => response.ok || response.status === 401
