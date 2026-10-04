import pino from 'pino'
import { logLevel } from '@/lib/env/parse'
import { redact } from './redact'

// An invalid LOG_LEVEL falls back to info here; parseEnv reports it at startup.
const level = logLevel.catch('info').parse(process.env.LOG_LEVEL || undefined)

const base = pino({ level, base: { service: 'steward' } })

/**
 * Structured JSON logger. Every payload goes through `redact()`, so call sites cannot leak
 * secrets or Customer PII by accident.
 */
export const log = {
  info: (fields: Record<string, unknown>, msg: string) => base.info(redact(fields), msg),
  warn: (fields: Record<string, unknown>, msg: string) => base.warn(redact(fields), msg),
  error: (fields: Record<string, unknown>, msg: string) => base.error(redact(fields), msg),
}
