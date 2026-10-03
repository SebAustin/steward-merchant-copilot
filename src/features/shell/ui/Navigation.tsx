'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BOTTOM_MORE, BOTTOM_PRIMARY, NAV_ITEMS, isActive } from '../nav'
import styles from './Navigation.module.css'

/** Index tabs across the masthead (768px and up). */
export function IndexTabs() {
  const pathname = usePathname()
  return (
    <nav aria-label="Main" className={styles.tabs}>
      <ul>
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={styles.tab}
              aria-current={isActive(pathname, item.href) ? 'page' : undefined}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Bottom tab bar below 768px: Brief, Queue, Ask (arrives with the Copilot), More. */
export function BottomTabs() {
  const pathname = usePathname()
  return (
    <nav aria-label="Main (mobile)" className={styles.bottom}>
      {BOTTOM_PRIMARY.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={styles.bottomItem}
          aria-current={isActive(pathname, item.href) ? 'page' : undefined}
        >
          {item.label}
        </Link>
      ))}
      <button type="button" className={styles.bottomItem} disabled title="Arrives with the Copilot">
        Ask
      </button>
      <details className={styles.more}>
        <summary className={styles.bottomItem}>More</summary>
        <ul className={styles.moreList}>
          {BOTTOM_MORE.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive(pathname, item.href) ? 'page' : undefined}
              >
                {item.title}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/settings">Settings</Link>
          </li>
        </ul>
      </details>
    </nav>
  )
}
