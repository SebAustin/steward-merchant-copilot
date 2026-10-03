import { HttpResponse, http } from 'msw'

/**
 * The toolkit authenticates against `api.sandbox.paypal.com` and calls resources on
 * `api-m.sandbox.paypal.com` (probe P0-8), so every endpoint is registered on both hosts.
 */
const HOSTS = ['https://api-m.sandbox.paypal.com', 'https://api.sandbox.paypal.com'] as const

const onBothHosts = (
  path: string,
  resolver: Parameters<typeof http.get>[1],
  method: 'get' | 'post',
) => HOSTS.map((host) => http[method](`${host}${path}`, resolver))

/** Minimal PayPal sandbox handlers; 0.1b grows this set per endpoint. */
export const handlers = [
  ...onBothHosts(
    '/v1/oauth2/token',
    () =>
      HttpResponse.json({
        access_token: 'msw-token',
        token_type: 'Bearer',
        expires_in: 32400,
        scope: 'https://uri.paypal.com/services/invoicing',
      }),
    'post',
  ),
  ...onBothHosts(
    '/v2/invoicing/invoices',
    () =>
      HttpResponse.json({
        total_items: 1,
        total_pages: 1,
        items: [{ id: 'INV2-MSW-0001', status: 'SENT', detail: { invoice_number: 'EO-INV-001' } }],
      }),
    'get',
  ),
]
