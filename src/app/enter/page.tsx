import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { EnterForm } from '@/features/enter/ui/EnterForm'
import { hasPageSession } from '@/lib/auth'
import styles from './enter.module.css'

export const metadata: Metadata = { title: 'Enter' }

export default async function EnterPage() {
  // proxy.ts already bounces signed-in visitors; this keeps the page correct on its own.
  if (await hasPageSession()) redirect('/')
  return (
    <main className={styles.cover}>
      <div className={styles.sheet}>
        <p className={styles.wordmark}>Steward</p>
        <h1 className={styles.title}>Ember &amp; Oak Roasters</h1>
        <p className={styles.lede}>
          A demo ops copilot for a fictional roastery. Sandbox only, no real money.
        </p>
        <EnterForm />
      </div>
    </main>
  )
}
