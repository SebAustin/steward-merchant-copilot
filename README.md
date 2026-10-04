# Steward

An AI ops copilot for small PayPal merchants. Steward watches the merchant's PayPal account and flags what needs attention: overdue invoices, open disputes and risky refunds. It gathers the evidence and drafts the action. **Nothing that moves money or contacts a customer happens until the merchant approves it.**

Built for the PayPal AI Hackathon (2026) with PayPal's Agent Toolkit, Claude through the Vercel AI SDK, AG Grid and Render.

> Status: in development. This is slice 0.1a: the walking skeleton (passcode gate, app shell, security headers, database, CI). PayPal and the model are not connected yet. See [DEMO.md](DEMO.md) for what runs today.

## Run it locally

Needs Node 24 (`nvm use`), pnpm 10 or newer, and Docker (for Postgres).

```bash
pnpm install
cp .env.example .env      # placeholders work for local development
pnpm db:up                # Postgres 17 on localhost:54329
pnpm db:migrate
pnpm dev                  # http://localhost:3000, passcode: DEMO_PASSCODE from .env
```

The hosted demo passcode will be printed here when the demo is published.

## Commands

| Command                       | What it does                                                              |
| ----------------------------- | ------------------------------------------------------------------------- |
| `pnpm lint`                   | ESLint and Prettier check                                                 |
| `pnpm typecheck`              | `next typegen` and `tsc --noEmit` (strict)                                |
| `pnpm test`                   | Vitest, including integration tests on the Postgres from `pnpm db:up`    |
| `pnpm test:coverage`          | Same, with the 80% threshold on domain logic (`src/lib`, `src/features`)  |
| `pnpm build:ci`               | Production build with the dummy values in `.env.ci`                       |
| `pnpm check-bundle`           | Fails if a server secret appears in the client bundle                     |
| `pnpm e2e`                    | Playwright smoke on a production build (`pnpm build:ci` first)            |
| `pnpm db:generate`            | Generate a SQL migration from `src/db/schema.ts`                          |

Run `pnpm exec playwright install chromium` once before `pnpm e2e`. If your Postgres is not the compose one, set `DATABASE_URL` and `TEST_DATABASE_URL` in your shell.

## Layout

`src/app` pages and API routes, `src/proxy.ts` CSP and the passcode gate, `src/features/*` by domain, `src/lib/*` shared modules (`env`, `auth`, `guard`, `security`, `log`), `src/db` schema and migrations, `scripts` start, migrate and bundle checks, `test` e2e and shared test setup. The full design is in [PLAN.md](PLAN.md) and [docs/DESIGN.md](docs/DESIGN.md).

## Deploy

`render.yaml` is the Render Blueprint (web service, Postgres, secrets env group). Deploys need the project owner's go-ahead; see the checklist in [DEMO.md](DEMO.md).

- Requirements: [REQUIREMENTS.md](REQUIREMENTS.md)
- Domain glossary: [CONTEXT.md](CONTEXT.md)
- Architecture decisions: [docs/adr](docs/adr)

License: [MIT](LICENSE)
