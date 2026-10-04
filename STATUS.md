# STATUS: resume point (read this first in any new session)

**Last updated:** 2026-10-04
**Phase:** Build. The plan passed plan-critic at 91/100 in round 5 (the 5-round cap). Slice **0.1a** is merged to `main` (ece301c) after a robustness review (APPROVE after 2 rework rounds) and a Matt Pocock code review. **CI is green on GitHub** (lint, typecheck, test, build, e2e, gitleaks). Slice **0.1b** is in progress.
**Last demoable tag:** none yet (PLAN §7 tags v0.1 after 0.1e; 0.1a is demoable on the branch tip, see DEMO.md)

## Done
- Intake:
  - REQUIREMENTS.md (SC-1..SC-20) and ASSUMPTIONS.md (decisions D-1..D-11)
  - CONTEXT.md (glossary)
  - ADR 0001 (PayPal integration split) and ADR 0002 (agent never holds write tools)
- Toolkit spike: AI SDK 7 adapter verified. Branch `spike/toolkit-adapter`.
- Plan loop: 5 rounds (67, 77, 84, 80, 91 PASS).
  - Rulings R1–R39 are in docs/PLAN-DECISIONS-R1.md.
  - PLAN.md, docs/DESIGN.md and docs/AI-QUALITY.md are consistent with each other.
- Public repo with MIT license detected: https://github.com/SebAustin/steward-merchant-copilot

## Done in 0.1a (merged to main)
- Scaffold: Next.js 16.3, TypeScript strict, pnpm 10, Node 24, ESLint, Prettier, Vitest, Playwright, docker-compose Postgres.
- `lib/env` (`parseEnv`), `lib/auth` (signed session cookie, CSRF, timing-safe passcode, client IP), `lib/guard` (`rateLimit`), `lib/security` (CSP + headers), `lib/log` (`redact`).
- `proxy.ts` (nonce CSP, headers, cookie gate), `/enter`, app shell, placeholder pages, `/api/session`, `/api/health`.
- DB: Drizzle schema + SQL migrations (sessions, rate_limits, demo_state, spend_days, append-only api_spend), `steward_eval` grants script, `scripts/start.sh`.
- `render.yaml` (validated against Render's JSON schema), CI (pinned actions, gitleaks), client-bundle secret check.
- Probes P0-5, P0-6 (partly), P0-8 recorded in PLAN §1.

## Next
- TODO (0.1b, first runtime import): move `@paypal/agent-toolkit` from `devDependencies` back to `dependencies` when the runtime first imports it (it is dev-only until then).
- 0.1b (no creds): `callRead` + allow-list, MSW handlers (the toolkit uses two hosts, see PLAN §1 P0-8), `/invoices` grid. Then 0.1c (needs the owner's `.env`: PayPal sandbox app + Anthropic key). The owner calendar is in PLAN §8.

## Blocked on owner
- PayPal sandbox REST app credentials and an Anthropic key in a local `.env`. The key should sit in a dedicated workspace with a $240 limit.
- AG Grid Enterprise key, by Oct 20.
- 3 probe Disputes filed ~Oct 6 (instructions will be in scripts/README).
- Go-ahead for the first Render Blueprint sync/deploy (code is on `main`). The Render account must be connected to GitHub. The remaining 0.1a owner steps (env group values, `steward_eval` role, Actions secrets) are listed in DEMO.md.
