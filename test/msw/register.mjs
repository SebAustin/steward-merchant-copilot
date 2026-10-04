// Preloaded into the Next server with NODE_OPTIONS="--import ./test/msw/register.mjs" so that every
// outbound server request (global fetch and Node http, e.g. axios in the PayPal toolkit) hits MSW.
import { setupServer } from 'msw/node'
import { handlers } from './handlers.ts'

const server = setupServer(...handlers)
// Anything unhandled fails loudly instead of reaching the real network.
server.listen({ onUnhandledRequest: 'error' })
process.stdout.write('[msw] interception active\n')
