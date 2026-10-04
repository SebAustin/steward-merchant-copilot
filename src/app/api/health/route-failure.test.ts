import { createServer, type Server, type Socket } from 'node:net'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

type Route = { GET: () => Promise<Response> }
let route: Route
let blackhole: Server
const sockets = new Set<Socket>()

beforeAll(async () => {
  // A server that accepts TCP connections and never answers: the worst kind of database outage.
  blackhole = createServer((socket) => {
    sockets.add(socket)
    socket.on('error', () => {})
  })
  await new Promise<void>((resolve) => blackhole.listen(0, '127.0.0.1', resolve))
  const { port } = blackhole.address() as { port: number }
  vi.stubEnv('DATABASE_URL', `postgres://u:p@127.0.0.1:${port}/steward_test`)
  vi.stubEnv('SESSION_SECRET', 'health-hung-secret-0123456789-abcdefghij')
  vi.stubEnv('DEMO_PASSCODE', 'espresso-2026')
  route = await import('./route')
})

afterAll(async () => {
  vi.unstubAllEnvs()
  for (const socket of sockets) socket.destroy()
  await new Promise((resolve) => blackhole.close(resolve))
})

describe('GET /api/health with a hung database', () => {
  it('answers 503 within the health timeout instead of hanging, and exposes no detail', async () => {
    const started = Date.now()

    const res = await route.GET()

    expect(Date.now() - started).toBeLessThan(4_500)
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ checks: { db: false }, skipped: ['paypal', 'model'] })
  }, 10_000)
})
