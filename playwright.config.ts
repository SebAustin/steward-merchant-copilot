import { defineConfig, devices } from '@playwright/test'

const PORT = 3100
// A second server whose database is unreachable, for the outage specs.
const DB_DOWN_PORT = 3101
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
  projects: [
    {
      name: 'chromium',
      testIgnore: /db-down/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'db-down',
      testMatch: /db-down/,
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${DB_DOWN_PORT}` },
    },
  ],
  webServer: [
    {
      // The real start path: validate env, migrate, then `next start` on the production build.
      command: 'bash scripts/with-env.sh .env.ci bash scripts/start.sh',
      env: { PORT: String(PORT) },
      url: `http://localhost:${PORT}/api/health`,
      reuseExistingServer: !isCi,
      timeout: 90_000,
    },
    {
      // Nothing listens on port 1, so every query fails. /enter renders without a database
      // when there is no cookie, which makes it a usable readiness probe.
      command: `bash scripts/with-env.sh .env.ci env DATABASE_URL=postgres://steward:steward@127.0.0.1:1/steward node_modules/.bin/next start -H 0.0.0.0 -p ${DB_DOWN_PORT}`,
      url: `http://localhost:${DB_DOWN_PORT}/enter`,
      reuseExistingServer: !isCi,
      timeout: 90_000,
    },
  ],
})
