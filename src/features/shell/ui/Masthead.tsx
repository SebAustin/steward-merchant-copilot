import Link from 'next/link'
import { SignOutButton } from './SignOutButton'
import { IndexTabs } from './Navigation'
import styles from './Masthead.module.css'

type DisputeSource = 'live' | 'simulated' | 'mixed'

const SOURCE_CHIP: Readonly<Record<DisputeSource, string | null>> = {
  live: null,
  simulated: 'Simulated disputes',
  mixed: 'Some disputes simulated',
}

type MastheadProps = Readonly<{ disputeSource: DisputeSource; csrfToken: string }>

/** Sticky masthead: wordmark, index tabs, Sandbox chip, data-source chip, Maya menu (DESIGN section 3). */
export function Masthead({ disputeSource, csrfToken }: MastheadProps) {
  const sourceChip = SOURCE_CHIP[disputeSource]
  return (
    <header className={styles.masthead}>
      <Link href="/" className={styles.wordmark}>
        <span className={styles.wordmarkName}>Steward</span>
        <span className={styles.wordmarkShop}>Ember &amp; Oak Roasters</span>
      </Link>
      <IndexTabs />
      <div className={styles.cluster}>
        <span className={styles.chip}>
          Sandbox<span className={styles.chipLong}> - no real money</span>
        </span>
        {sourceChip ? (
          <Link href="/settings" className={`${styles.chip} ${styles.chipLink}`}>
            {sourceChip}
          </Link>
        ) : null}
        <button
          type="button"
          className={styles.ask}
          disabled
          title="Arrives with the Copilot"
          aria-keyshortcuts="Control+K Meta+K"
        >
          Ask Steward
        </button>
        <details className={styles.menu}>
          <summary className={styles.menuSummary}>Maya</summary>
          <div className={styles.menuPanel}>
            <Link href="/settings" className={styles.menuButton}>
              Settings
            </Link>
            <SignOutButton csrfToken={csrfToken} />
          </div>
        </details>
      </div>
    </header>
  )
}
