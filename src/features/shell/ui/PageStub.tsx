import { Notice } from './Notice'
import styles from './PageStub.module.css'

type PageStubProps = Readonly<{
  title: string
  /** One sentence on what this page will hold. */
  purpose: string
  /** Heading above the title, e.g. the greeting on the Brief. */
  eyebrow?: string
}>

/** Placeholder page body for slices that have not built the page yet. */
export function PageStub({ title, purpose, eyebrow }: PageStubProps) {
  return (
    <div className={styles.page}>
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.purpose}>{purpose}</p>
      <Notice title="Couldn't reach PayPal." retryHref="?retry=1">
        Steward hasn&apos;t saved a view of your account yet, so there is nothing to show here.
      </Notice>
    </div>
  )
}
