import { createHash } from 'node:crypto'

const SECRET_KEY = /(pass(word|code)?|secret|token|authorization|api[-_]?key|cookie|credential)/i
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const PHONE = /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{3}\)\s?|\d{3}[\s.-])\d{3}[\s.-]\d{4}\b/g
const BEARER = /Bearer\s+[A-Za-z0-9._~+/=-]+/g
const REDACTED = '[redacted]'

const hash8 = (value: string) =>
  createHash('sha256').update(value.toLowerCase()).digest('hex').slice(0, 8)

function scrubString(value: string): string {
  return value
    .replace(BEARER, `Bearer ${REDACTED}`)
    .replace(EMAIL, (email) => `email:${hash8(email)}`)
    .replace(PHONE, REDACTED)
}

function walk(value: unknown): unknown {
  if (typeof value === 'string') return scrubString(value)
  if (value instanceof Error) return { name: value.name, message: scrubString(value.message) }
  if (Array.isArray(value)) return value.map(walk)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [
        key,
        SECRET_KEY.test(key) ? REDACTED : walk(inner),
      ]),
    )
  }
  return value
}

/**
 * PII and secret redaction shared by the logger and (later) `ai_runs`. Returns a scrubbed copy:
 * Customer emails become `email:<sha8>`, phone numbers and secret-named fields become
 * `[redacted]`. PayPal object IDs are kept for debugging (AI-QUALITY section 6).
 */
export function redact<T>(value: T): T {
  return walk(value) as T
}
