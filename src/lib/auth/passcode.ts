import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest()

/**
 * Timing-safe passcode comparison. Both sides are hashed first so length differences leak
 * nothing, and an unset (empty) passcode never matches.
 */
export function passcodeMatches(input: string, expected: string): boolean {
  const equal = timingSafeEqual(digest(input), digest(expected))
  return equal && expected !== ''
}

const GENERATION_LENGTH = 16

/**
 * A short tag of the current passcode, stored on each session. Rotating DEMO_PASSCODE changes the
 * tag, so every session issued under the old passcode stops working. Keyed with the session
 * secret so the tag reveals nothing about the passcode.
 */
export function passcodeGeneration(passcode: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(`passcode-generation.${passcode}`)
    .digest('base64url')
    .slice(0, GENERATION_LENGTH)
}
