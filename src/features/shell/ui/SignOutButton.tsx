'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { NETWORK_ERROR_MESSAGE, errorMessage, isSignedOut } from '@/lib/http/client'
import styles from './Masthead.module.css'

/** Ends the session: DELETE /api/session with the CSRF token (same-site Origin is automatic). */
export function SignOutButton({ csrfToken }: Readonly<{ csrfToken: string }>) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  async function signOut() {
    setPending(true)
    setFailure(null)
    try {
      const response = await fetch('/api/session', {
        method: 'DELETE',
        headers: { 'x-csrf-token': csrfToken },
      })
      if (isSignedOut(response)) {
        router.replace('/enter')
        router.refresh()
        return
      }
      setFailure(await errorMessage(response))
    } catch {
      setFailure(NETWORK_ERROR_MESSAGE)
    }
    setPending(false)
  }

  return (
    <>
      <button type="button" className={styles.menuButton} onClick={signOut} disabled={pending}>
        {pending ? 'Signing out...' : 'Sign out'}
      </button>
      {failure ? (
        <p role="alert" className={styles.menuError}>
          {failure}
        </p>
      ) : null}
    </>
  )
}
