import { defineConfig, devices } from '@playwright/test'

const PORT = 3100
const isCi = Boolean(process.env.CI)

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  reporter: isCi ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // The real start path: migrate, then `next start` on the production build.
    command: 'bash scripts/with-env.sh .env.ci bash scripts/start.sh',
    env: { PORT: String(PORT) },
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !isCi,
    timeout: 90_000,
  },
})
