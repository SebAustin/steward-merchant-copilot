import { MESSAGES } from '@/lib/http/messages'
import { Notice } from './Notice'
import styles from './Unavailable.module.css'

/** What an error boundary shows instead of a bare 500: the shared "unavailable" copy and a retry. */
export function Unavailable() {
  return (
    <main className={styles.page}>
      <Notice title="Couldn't load this page." canRetry>
        {MESSAGES.unavailable}
      </Notice>
    </main>
  )
}
