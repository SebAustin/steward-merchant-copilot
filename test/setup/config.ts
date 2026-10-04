const DEFAULT_URL = 'postgres://steward:steward@localhost:54329/steward_test'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

/**
 * Global setup drops the public schema, so refuse any database that could be real data: the name
 * must end in `_test`, and the host must be local unless running in CI (service container).
 */
export function assertSafeTestDatabase(
  url: string,
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const parsed = new URL(url)
  const name = parsed.pathname.replace(/^\//, '')
  if (!name.endsWith('_test')) {
    throw new Error(`Refusing to use database "${name}" for tests: its name must end in _test`)
  }
  if (!LOCAL_HOSTS.has(parsed.hostname) && !env.CI) {
    throw new Error(
      `Refusing to use host "${parsed.hostname}" for tests: use localhost (or run in CI)`,
    )
  }
  return url
}

/** The one place the test database URL comes from. */
export const TEST_DATABASE_URL = assertSafeTestDatabase(
  process.env.TEST_DATABASE_URL ?? DEFAULT_URL,
)
