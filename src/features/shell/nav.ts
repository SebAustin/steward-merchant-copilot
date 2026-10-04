export type NavItem = Readonly<{ href: string; label: string; title: string }>

/** Index tabs in masthead order (DESIGN section 3). Settings lives in the Maya menu. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Brief', title: 'Brief' },
  { href: '/queue', label: 'Queue', title: 'Approval Queue' },
  { href: '/invoices', label: 'Invoices', title: 'Invoices' },
  { href: '/disputes', label: 'Disputes', title: 'Disputes' },
  { href: '/risk', label: 'Risk', title: 'Transactions & Risk' },
  { href: '/audit', label: 'Audit', title: 'Audit Log' },
  { href: '/policies', label: 'Policies', title: 'Standing Policies' },
]

/** Mobile bottom bar: these two tabs sit beside Ask; the remaining pages go under "More". */
export const BOTTOM_PRIMARY: readonly NavItem[] = NAV_ITEMS.slice(0, 2)
export const BOTTOM_MORE: readonly NavItem[] = NAV_ITEMS.slice(2)

/** Active when on the page itself or any child route; "/" matches only exactly. */
export function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
}
