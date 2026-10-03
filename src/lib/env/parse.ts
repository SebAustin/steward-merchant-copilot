import { z } from 'zod'

/** Thrown when the process environment is invalid. Names variables, never their values. */
export class EnvError extends Error {
  readonly variables: readonly string[]

  constructor(variables: readonly string[], details: readonly string[]) {
    super(`Invalid environment:\n${details.map((d) => `  - ${d}`).join('\n')}`)
    this.name = 'EnvError'
    this.variables = variables
  }
}

const MIN_SESSION_SECRET_LENGTH = 32
const PLACEHOLDER_MARKERS = ['change-me', 'replace-with'] as const
/** Public by design (domain-locked AG Grid license); the only secret-looking NEXT_PUBLIC_ name allowed. */
const PUBLIC_ALLOWLIST: ReadonlySet<string> = new Set(['NEXT_PUBLIC_AG_GRID_LICENSE_KEY'])
const SECRET_NAME_PATTERN = /(SECRET|TOKEN|PASSWORD|PASSCODE|PRIVATE|CREDENTIAL|API_?KEY)/i

const optionalString = z.string().min(1).optional()
const capUsd = (fallback: number) => z.coerce.number().positive().default(fallback)
const flag = z
  .enum(['true', 'false', '1', '0'])
  .default('false')
  .transform((v) => v === 'true' || v === '1')

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  RENDER: optionalString,
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  /** Reverse-proxy hops in front of the app, used to pick the client IP from X-Forwarded-For. */
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),

  DATABASE_URL: z.string().min(1),
  EVAL_DATABASE_URL: optionalString,

  PAYPAL_ENV: z.literal('sandbox').default('sandbox'),
  PAYPAL_CLIENT_ID: optionalString,
  PAYPAL_CLIENT_SECRET: optionalString,
  PAYPAL_WEBHOOK_ID: optionalString,

  AI_PROVIDER: z.enum(['mock', 'anthropic']).default('mock'),
  ANTHROPIC_API_KEY: optionalString,

  DEMO_PASSCODE: z.string().min(8),
  SESSION_SECRET: z.string().min(MIN_SESSION_SECRET_LENGTH),
  CRON_SECRET: optionalString,

  DISPUTE_SOURCE: z.enum(['live', 'simulated', 'mixed']).default('simulated'),
  POLICIES_ENABLED: flag,
  NEXT_PUBLIC_AG_GRID_LICENSE_KEY: optionalString,

  DEMO_DAILY_CAP_USD: capUsd(5),
  DEMO_TOTAL_CAP_USD: capUsd(50),
  EVAL_CAP_USD: capUsd(70),
  DEV_CAP_USD: capUsd(30),
  SESSION_TOKEN_CAP: z.coerce.number().int().positive().default(100_000),
})

export type Env = Readonly<z.infer<typeof schema>>

function hasPlaceholder(value: string): boolean {
  return PLACEHOLDER_MARKERS.some((marker) => value.includes(marker))
}

/** Blank values count as unset so a credential-free deploy still boots. */
function dropBlanks(raw: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(raw).filter((entry): entry is [string, string] => {
      const value = entry[1]
      return value !== undefined && value.trim() !== ''
    }),
  )
}

function crossFieldIssues(raw: Record<string, string>, env: z.infer<typeof schema>) {
  const issues: { name: string; message: string }[] = []

  for (const name of Object.keys(raw)) {
    if (
      name.startsWith('NEXT_PUBLIC_') &&
      !PUBLIC_ALLOWLIST.has(name) &&
      SECRET_NAME_PATTERN.test(name)
    ) {
      issues.push({ name, message: 'secrets must not be exposed under NEXT_PUBLIC_' })
    }
  }

  if (env.RENDER) {
    if (env.AI_PROVIDER === 'mock') {
      issues.push({ name: 'AI_PROVIDER', message: 'the mock model is not allowed on Render' })
    }
    if (hasPlaceholder(env.DEMO_PASSCODE)) {
      issues.push({ name: 'DEMO_PASSCODE', message: 'replace the example placeholder' })
    }
    if (hasPlaceholder(env.SESSION_SECRET)) {
      issues.push({ name: 'SESSION_SECRET', message: 'replace the example placeholder' })
    }
  }
  return issues
}

/**
 * Validate a raw environment (usually `process.env`). Fails fast with an {@link EnvError}
 * that lists variable names and reasons only, so logs never leak secret values.
 */
export function parseEnv(raw: Record<string, string | undefined>): Env {
  const cleaned = dropBlanks(raw)
  const parsed = schema.safeParse(cleaned)

  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${String(i.path[0] ?? 'env')}: ${i.message}`)
    const names = parsed.error.issues.map((i) => String(i.path[0] ?? 'env'))
    throw new EnvError(names, details)
  }

  const issues = crossFieldIssues(cleaned, parsed.data)
  if (issues.length > 0) {
    throw new EnvError(
      issues.map((i) => i.name),
      issues.map((i) => `${i.name}: ${i.message}`),
    )
  }
  return Object.freeze(parsed.data)
}
