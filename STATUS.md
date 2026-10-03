# STATUS: resume point (read this first in any new session)

**Last updated:** 2026-10-03
**Phase:** Build. The plan passed plan-critic at 91/100 in round 5 (the 5-round cap). Now starting slice **0.1a**.
**Last demoable tag:** none yet

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

## In progress
- 0.1a (no credentials needed): scaffold, `lib/env`, passcode auth + `/enter`, `proxy.ts` CSP, base tables + `api_spend`, `render.yaml`, basic `/api/health`, CI with `.env.ci`. Probes P0-5/6/8.

## Next
- 0.1b, then 0.1c (needs the owner's `.env`: PayPal sandbox app + Anthropic key). The owner calendar is in PLAN §8.

## Blocked on owner
- PayPal sandbox REST app credentials and an Anthropic key in a local `.env`. The key should sit in a dedicated workspace with a $240 limit.
- AG Grid Enterprise key, by Oct 20.
- 3 probe Disputes filed ~Oct 6 (instructions will be in scripts/README).
- Go-ahead for the first Render deploy. The Render account must be connected to GitHub.
