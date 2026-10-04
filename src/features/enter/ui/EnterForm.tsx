'use client'

import { useRouter } from 'next/navigation'
import { useId, useRef, useState, type FormEvent } from 'react'
import { NETWORK_ERROR_MESSAGE, errorMessage } from '@/lib/http/client'
import styles from './EnterForm.module.css'

/** Passcode gate (DESIGN flow f): one field, inline errors, paste and password managers allowed. */
export function EnterForm() {
  const router = useRouter()
  const fieldId = useId()
  const errorId = `${fieldId}-error`
  const [passcode, setPasscode] = useState('')
  const [visible, setVisible] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ passcode }),
      })
      if (response.ok) {
        router.replace('/')
        router.refresh()
        return
      }
      setError(await errorMessage(response))
    } catch {
      setError(NETWORK_ERROR_MESSAGE)
    }
    // The disabled submit button dropped focus; hand it back to the field so retyping is immediate.
    inputRef.current?.focus()
    setPending(false)
  }

  return (
    <form onSubmit={submit} className={styles.form} noValidate>
      <label htmlFor={fieldId} className={styles.label}>
        Demo passcode
      </label>
      <div className={styles.field}>
        <input
          ref={inputRef}
          id={fieldId}
          name="passcode"
          type={visible ? 'text' : 'password'}
          autoComplete="current-password"
          required
          autoFocus
          value={passcode}
          onChange={(event) => setPasscode(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={styles.input}
        />
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className={styles.error}>
          <span aria-hidden="true">! </span>
          {error}
        </p>
      ) : null}
      <button type="submit" className={styles.submit} disabled={pending || passcode === ''}>
        {pending ? 'Checking...' : 'Enter Steward'}
      </button>
    </form>
  )
}
