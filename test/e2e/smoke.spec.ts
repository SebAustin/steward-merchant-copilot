import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { PASSCODE, expect, test } from './fixtures'

async function enter(page: Page, passcode = PASSCODE) {
  await page.goto('/enter')
  await page.getByLabel('Demo passcode').fill(passcode)
  await page.getByRole('button', { name: 'Enter Steward' }).click()
}

/** The passcode form's inline error (Next also injects its own route-announcer alert). */
const formError = (page: Page) =>
  page.getByRole('alert').filter({ hasText: /passcode|tries|unavailable/i })

/** Collects Content-Security-Policy violations and uncaught page errors. */
function watchForCspViolations(page: Page): string[] {
  const problems: string[] = []
  page.on('pageerror', (error) => problems.push(error.message))
  page.on('console', (message) => {
    if (/content security policy/i.test(message.text())) problems.push(message.text())
  })
  return problems
}

test.describe('@smoke passcode gate to app shell', () => {
  test('sends an anonymous visitor to /enter, then into the shell with the right passcode', async ({
    page,
  }) => {
    const problems = watchForCspViolations(page)

    await page.goto('/')
    await expect(page).toHaveURL(/\/enter$/)
    await expect(page.getByText('Sandbox only, no real money.')).toBeVisible()

    await enter(page)

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Brief' })).toBeVisible()
    await expect(page.getByText("Couldn't reach PayPal.")).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible()
    expect(problems).toEqual([])
  })

  test('keeps a wrong passcode on /enter with an inline message and focus in the field', async ({
    page,
  }) => {
    await enter(page, 'not-the-passcode')

    await expect(formError(page)).toContainText("That passcode doesn't match.")
    await expect(page).toHaveURL(/\/enter$/)
    await expect(page.getByLabel('Demo passcode')).toBeFocused()
  })

  test('locks the address out after five wrong passcodes', async ({ page }) => {
    await page.goto('/enter')
    const field = page.getByLabel('Demo passcode')
    for (let attempt = 1; attempt <= 5; attempt++) {
      await field.fill(`wrong-${attempt}`)
      await page.getByRole('button', { name: 'Enter Steward' }).click()
      await expect(formError(page)).toContainText("doesn't match")
    }

    await field.fill(PASSCODE)
    await page.getByRole('button', { name: 'Enter Steward' }).click()

    await expect(formError(page)).toContainText('Too many tries. Please wait 10 minutes.')
    await expect(page).toHaveURL(/\/enter$/)
  })

  test('sends a signed-in visitor from /enter straight to the Brief', async ({ page }) => {
    await enter(page)
    await expect(page).toHaveURL('/')

    await page.goto('/enter')

    await expect(page).toHaveURL('/')
  })

  test('navigates the index tabs and marks the current page', async ({ page }) => {
    await enter(page)
    await expect(page).toHaveURL('/')

    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Queue' })
      .click()

    await expect(page).toHaveURL('/queue')
    await expect(page.getByRole('heading', { level: 1, name: 'Approval Queue' })).toBeVisible()
    await expect(
      page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Queue' }),
    ).toHaveAttribute('aria-current', 'page')
  })

  test('signs out through the Maya menu, gates the app again and revokes the old cookie', async ({
    page,
    context,
  }) => {
    await enter(page)
    await expect(page).toHaveURL('/')
    const [signedIn] = await context.cookies()

    await page.getByText('Maya', { exact: true }).click()
    await page.getByRole('button', { name: 'Sign out' }).click()

    await expect(page).toHaveURL(/\/enter$/)
    await page.goto('/queue')
    await expect(page).toHaveURL(/\/enter$/)

    // Replaying the old cookie passes proxy.ts (the signature is still valid) but the session
    // row is gone, so the page must send the visitor back to /enter.
    await context.addCookies([signedIn!])
    await page.goto('/queue')
    await expect(page).toHaveURL(/\/enter$/)
  })

  test('serves a nonce CSP and security headers, and the public health check', async ({
    page,
    request,
  }) => {
    const response = await page.goto('/enter')
    const headers = response?.headers() ?? {}

    expect(headers['content-security-policy']).toMatch(
      /script-src 'self' 'nonce-[^']+' 'strict-dynamic'/,
    )
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'")
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['x-content-type-options']).toBe('nosniff')

    const health = await request.get('/api/health')
    expect(health.status()).toBe(200)
    expect(await health.json()).toEqual({ checks: { db: true }, skipped: ['paypal', 'model'] })
    const anonymousApi = await request.get('/api/chat')
    expect(anonymousApi.status()).toBe(401)
  })

  test('has no serious or critical accessibility violations on /enter and the shell', async ({
    page,
  }) => {
    const seriousOrWorse = async () => {
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
        .analyze()
      return violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    }

    await page.goto('/enter')
    expect(await seriousOrWorse()).toEqual([])

    await enter(page)
    await expect(page.getByRole('heading', { level: 1, name: 'Brief' })).toBeVisible()
    expect(await seriousOrWorse()).toEqual([])
  })
})
