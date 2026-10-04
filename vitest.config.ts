import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const src = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': src('./src'),
      // `server-only` throws outside a React Server build; tests run in plain Node.
      'server-only': src('./test/stubs/server-only.ts'),
    },
  },
  test: {
    env: { LOG_LEVEL: 'silent' },
    include: ['src/**/*.test.ts', 'test/**/*.test.ts', 'scripts/**/*.test.ts'],
    exclude: ['test/e2e/**', 'node_modules/**'],
    globalSetup: ['./test/setup/global.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text', 'lcov'],
      // PLAN section 10: domain logic only, never UI, pages or fixtures.
      // Domain logic plus the route handlers and proxy that adapt it. Pages, layouts and ui/ are
      // covered by Playwright instead.
      include: [
        'src/lib/**',
        'src/features/**',
        'src/db/**',
        'src/app/**/route.ts',
        'src/proxy.ts',
      ],
      exclude: ['**/ui/**', '**/*.test.ts', 'src/db/migrations/**', 'src/db/schema.ts'],
      thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
    },
  },
})
