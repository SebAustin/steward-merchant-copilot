# Demo: slice 0.1a (walking skeleton)

What runs today: the passcode gate and the app shell. There is no PayPal and no model yet.

## Run it

```bash
nvm use                   # Node 24
pnpm install
cp .env.example .env      # defaults work locally; AI_PROVIDER=mock
pnpm db:up                # Postgres 17 in Docker on localhost:54329
pnpm db:migrate
pnpm dev                  # http://localhost:3000
```

1. Open <http://localhost:3000>. You are redirected to `/enter`.
2. Enter the passcode from your `.env` (`DEMO_PASSCODE`, default `change-me-demo-passcode`).
3. A wrong passcode shows an inline message and keeps focus in the field. The sixth try in 10 minutes from one address shows "Too many tries."

## What you see

- `/enter`: a ledger-style cover with the Fraunces wordmark, one field and the "Enter Steward" button.
- `/` (Brief): the index-tab masthead (Brief, Queue, Invoices, Disputes, Risk, Audit, Policies), the "Sandbox" chip, a "Simulated disputes" chip, a disabled "Ask Steward" button, and the Maya menu (Settings, Sign out). The page shows the "Couldn't reach PayPal." state, because no account is connected.
- Every tab opens a placeholder page with the same state. `/settings` shows the dispute source read-only.
- Below 768px the tabs become a bottom bar.
- `GET /api/health` returns `{"db":true,"paypal":"skipped","model":"skipped"}`.
- Response headers carry a per-request nonce CSP, HSTS (production), `nosniff`, frame denial, a Referrer-Policy and a Permissions-Policy.

## Checks

```bash
pnpm lint && pnpm typecheck && pnpm test
pnpm build:ci && pnpm check-bundle
pnpm exec playwright install chromium   # once
pnpm e2e                                 # passcode -> shell smoke, CSP, axe
```

## Stubbed in 0.1a

PayPal (reads and writes), the Copilot and "Ask Steward", the Brief figures, the Queue, grids, Proposals and Approvals, the Audit Log, the spend guard (`reserve`/`settle`; only the tables and the append-only `api_spend` ledger exist), and the PayPal and model health checks (reported as `skipped`).

## Needs the project owner (nothing below has been done)

1. Go-ahead to push the branch and to deploy the Render Blueprint (`render.yaml`). Nothing was pushed or deployed.
2. On the first Blueprint sync, set `DEMO_PASSCODE` and `CRON_SECRET` in the `steward-secrets` env group; leave the PayPal and Anthropic values blank until 0.1c. Set the same `CRON_SECRET` as a GitHub Actions secret.
3. After the first deploy, add the Actions secret `STEWARD_URL`.
4. Create the spend-ledger role (probe P0-6). On the Render Postgres, as the database owner:
   ```sql
   CREATE ROLE steward_eval LOGIN PASSWORD '<generate a strong password>';
   ```
   then run `scripts/sql/steward_eval_grants.sql`, and store `EVAL_DATABASE_URL` (the external connection string using that role) as an Actions secret. Re-run the grants file after any migration that adds tables.
5. After the first deploy, confirm Render's `X-Forwarded-For` shape matches `TRUSTED_PROXY_HOPS=1` (the passcode limit is per client address; a wrong value would put every visitor in one bucket).
