import { expect, test } from '@playwright/test'
import { MESSAGES } from '../../src/lib/http/messages'
import { createSessionId, signSession } from '../../src/lib/auth/session'

// The server under test cannot reach its database (see playwright.config.ts). A visitor whose
// cookie is validly signed must still get a usable page, never a bare 500.
test.describe('@smoke database outage', () => {
  test.beforeEach(async ({ context }) => {
    const value = signSession(
      { sid: createSessionId(), now: Date.now(), ttlMs: 60_000 },
      process.env.SESSION_SECRET ?? '',
    )
    await context.addCookies([{ name: 'steward_session', value, url: 'http://localhost:3101' }])
  })

  test('/enter still renders the passcode form', async ({ page }) => {
    const response = await page.goto('/enter')

    expect(response?.status()).toBe(200)
    await expect(page.getByLabel('Demo passcode')).toBeVisible()
  })

  test('an app page shows the friendly unavailable message instead of a 500 page', async ({
    page,
  }) => {
    await page.goto('/queue')

    await expect(page.getByText(MESSAGES.unavailable)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Try again' })).toBeVisible()
  })

  test('signing in fails closed with the friendly message', async ({ page }) => {
    await page.goto('/enter')
    await page.getByLabel('Demo passcode').fill('ci-demo-passcode')
    await page.getByRole('button', { name: 'Enter Steward' }).click()

    await expect(page.getByRole('alert').filter({ hasText: MESSAGES.unavailable })).toBeVisible()
  })
})
