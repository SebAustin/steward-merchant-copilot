import { createHash, timingSafeEqual } from 'node:crypto'

const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest()

/**
 * Timing-safe passcode comparison. Both sides are hashed first so length differences leak
 * nothing, and an unset (empty) passcode never matches.
 */
export function passcodeMatches(input: string, expected: string): boolean {
  const equal = timingSafeEqual(digest(input), digest(expected))
  return equal && expected !== ''
}
