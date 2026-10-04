import type { ReactNode } from 'react'
import styles from './Notice.module.css'

type NoticeProps = Readonly<{
  title: string
  children: ReactNode
  /** Show a "Try again" link that reloads the current page. */
  canRetry?: boolean
}>

/**
 * Inline error in the ledger voice (DESIGN section 6): ink text, a berry left rule and a leading
 * glyph, so the state never relies on color alone. Never a red banner.
 */
export function Notice({ title, children, canRetry }: NoticeProps) {
  return (
    <section className={styles.notice} role="status" aria-live="polite">
      <span className={styles.glyph} aria-hidden="true">
        !
      </span>
      <div>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.body}>{children}</p>
        {canRetry ? (
          <a className={styles.retry} href="">
            Try again
          </a>
        ) : null}
      </div>
    </section>
  )
}
