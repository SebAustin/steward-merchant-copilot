import type { ReactNode } from 'react'
import { Masthead } from '@/features/shell/ui/Masthead'
import { BottomTabs } from '@/features/shell/ui/Navigation'
import { getEnv } from '@/lib/env'
import { requirePageSession } from '@/lib/auth/page'
import styles from './shell.module.css'

export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { csrfToken } = await requirePageSession()
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Masthead disputeSource={getEnv().DISPUTE_SOURCE} csrfToken={csrfToken} />
      <main id="main" className={styles.main} tabIndex={-1}>
        {children}
      </main>
      <BottomTabs />
    </>
  )
}
