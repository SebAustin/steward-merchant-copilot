import { NextResponse } from 'next/server'
import { MESSAGES, type ErrorCode } from './messages'

type ErrorResponse = Readonly<{
  status: number
  code: ErrorCode
  /** The id of the request being answered; log lines for it carry the same id (NFR-S7). */
  requestId: string
  headers?: HeadersInit
}>

/** Stable error body: a code, a short message and the correlation id the Merchant can quote. */
export function jsonError({ status, code, requestId, headers }: ErrorResponse): NextResponse {
  const merged = new Headers(headers)
  merged.set('x-request-id', requestId)
  return NextResponse.json(
    { error: { code, message: MESSAGES[code], requestId } },
    { status, headers: merged },
  )
}
