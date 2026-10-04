/**
 * Every user-facing error string, keyed by error code. The server sends the message in the JSON
 * body and the client shows it as received, so the wording lives in exactly one place.
 */
export const MESSAGES = {
  unauthorized: 'Please enter the passcode.',
  csrf: 'That request could not be verified. Reload and try again.',
  rate_limited: 'Too many requests. Please slow down.',
  login_rate_limited: 'Too many tries. Please wait 10 minutes.',
  login_cap: 'Too many sign-ins from this address. Please try again later.',
  invalid_request: 'Enter the demo passcode.',
  invalid_passcode: "That passcode doesn't match. It's in the README.",
  unavailable: 'Steward is unavailable right now. Please try again.',
} as const

export type ErrorCode = keyof typeof MESSAGES
