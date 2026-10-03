/** Stable error body: a short message and a correlation id the Merchant can quote (NFR-S7). */
export function jsonError(
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit,
): Response {
  return Response.json(
    { error: { code, message, requestId: crypto.randomUUID() } },
    { status, headers },
  )
}
