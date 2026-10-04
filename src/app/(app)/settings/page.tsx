import type { Metadata } from 'next'
import { DISPUTE_SOURCE_LABEL } from '@/features/shell/dispute-source'
import { getEnv } from '@/lib/env'
import styles from './settings.module.css'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  const source = getEnv().DISPUTE_SOURCE
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Settings</h1>
      <dl className={styles.list}>
        <div className={styles.row}>
          <dt>Dispute source</dt>
          <dd>
            <strong>{DISPUTE_SOURCE_LABEL[source]}</strong>
            <span className={styles.hint}>
              Set by the DISPUTE_SOURCE environment setting; it can&apos;t be changed here.
            </span>
          </dd>
        </div>
      </dl>
      <p className={styles.hint}>
        Reset demo, spend telemetry and the rest of this page arrive in later slices.
      </p>
    </div>
  )
}
