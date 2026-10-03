'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from './Masthead.module.css'

/** Ends the session: DELETE /api/session with the CSRF token (same-site Origin is automatic). */
export function SignOutButton({ csrfToken }: Readonly<{ csrfToken: string }>) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function signOut() {
    setPending(true)
    setFailed(false)
    try {
      const response = await fetch('/api/session', {
        method: 'DELETE',
        headers: { 'x-csrf-token': csrfToken },
      })
      if (!response.ok) throw new Error(`status ${response.status}`)
      router.replace('/enter')
      router.refresh()
    } catch {
      setFailed(true)
      setPending(false)
    }
  }

  return (
    <>
      <button type="button" className={styles.menuButton} onClick={signOut} disabled={pending}>
        {pending ? 'Signing out...' : 'Sign out'}
      </button>
      {failed ? (
        <p role="alert" className={styles.menuError}>
          Couldn&apos;t sign out. Try again.
        </p>
      ) : null}
    </>
  )
}
