# REQUIREMENTS: Steward (working name)

An AI ops copilot for small PayPal merchants. Entry for the PayPal AI Hackathon (Devpost). Deadline **Nov 12, 2026, 12:00 PT**.
Source of truth for scope: `~/.claude/plans/use-the-matpodock-skills-dreamy-snail.md`. Assumptions and open questions: `ASSUMPTIONS.md`.

## 1. Problem statement

**Persona (illustrative, not a real person): "Maya", owner of a small-batch coffee roastery ("Ember & Oak Roasters", fictional).**
She sells retail bags online through PayPal checkout (orders, refunds, disputes) and invoices a dozen wholesale cafés on net-15/net-30 terms with PayPal invoices (invoice chasing). She does roughly $20k-$200k a year in PayPal volume and runs the business with one part-timer. Ops work (chasing money, answering disputes, deciding refunds) is squeezed into evenings after roasting. She has no finance team, no fraud analyst, and no time to read every Resolution Center case.

**Job to be done:** "Tell me what in my PayPal account needs my attention today, get the evidence and the draft ready, and let me approve it in one click. Never act without me."

| Pain point | What we can say (sourced) | Steward response |
|---|---|---|
| Unpaid invoices | In Intuit QuickBooks' 2025 survey of 2,487 US small businesses, 56% had unpaid invoices (average $17,500 owed to each) and 47% had invoices more than 30 days overdue. [1] These are all US small businesses, not PayPal-specific. | Invoice chaser: ranks overdue invoices, drafts a tone-matched reminder, sends on approval. |
| Dispute deadlines | PayPal asks the seller to respond to a claim within 10 days; if they do not, the claim closes in the buyer's favor and the buyer is refunded. [2] The Disputes API exposes a `seller_response_due_date` for this. [3] | Dispute desk: sorts by deadline and amount, assembles evidence, drafts the response, recommends contest or accept. |
| Dispute cost | PayPal charges a dispute fee, and a higher fee at a high dispute rate (1.5% or more with more than 100 sales in 3 months). [4] Dollar amounts: $15 standard and $30 high-volume per a third-party summary [5]; confirm on PayPal's page before quoting in the video. | Cost of each dispute shown beside the proposal; contest-vs-accept recommendation weighs it. |
| Friendly fraud and abuse | A Chargebacks911 survey reported that on average 45% of chargebacks come from misuse or outright abuse (card chargebacks, not PayPal-specific). [6] | Risk view flags repeat disputers and refund spikes with an explanation. |
| Refund and returns abuse | NRF/Happy Returns (2025) put return fraud at 9% of retail returns [7]; Appriss Retail's 2026 benchmark put preventable fraud-and-abuse loss at 14.2% of $706B returned in 2025 [8]. Retail-wide figures, not PayPal-specific. | Refund proposals carry a risk level and cited history; merchant approves each. |

Claims not in the table are qualitative only. Rule for all later docs (README, Devpost text, video script): reuse only figures from this table, with citation, or phrase qualitatively.

**Why it matters (Potential Impact argument):** these are small-merchant tasks where a missed deadline or an unsent reminder costs real money, and where an autonomous agent would be unacceptable. Steward shows an agent that does the legwork while the merchant stays in control.

## 2. Goals and non-goals

### Goals
- G1. Cover three jobs end to end on the PayPal sandbox: invoice chasing, dispute desk, refunds/risk.
- G2. One safety pattern throughout: **propose, approve, execute**. Read tools run freely; write tools only create an `ActionProposal`; a separate server route executes after merchant approval.
- G3. Use PayPal deeply (toolkit plus direct REST, webhooks, Transaction Search) and AI non-trivially (tool use, classification, drafting, evidence grounding, evals).
- G4. A complete, coherent product feel (not a proof of concept): designed workspace, empty/error/loading states, audit trail, reset-demo.
- G5. Pass the hard submission requirements with margin (section 6).

### Non-goals
- NG1. No real money and no live PayPal environment. **Sandbox only.** Production credentials are never requested or stored.
- NG2. No multi-tenant auth, signup, or billing. One demo merchant. A demo passcode and rate limits are abuse controls, not an identity system.
- NG3. No mobile app. The web UI must be usable and not broken on small screens, but it is not a mobile product.
- NG4. No autonomous execution of write actions, including "auto-approve low-risk" rules.
- NG5. No emailing or messaging customers outside PayPal's own invoice-reminder / dispute-message channels.
- NG6. No accounting, tax, inventory, or non-PayPal payment processors.
- NG7. No model training or fine-tuning; no vector database unless a slice proves it is needed.
- NG8. No claim of legal, chargeback-win, or fraud-detection guarantees. Recommendations are advice.

## 3. Functional requirements (vertical slices)

Each slice is demoable alone and tagged only after its gate passes. Priority: **M** must, **S** should (cut first if time is short).

### v0.1 Walking skeleton
| ID | Requirement | P |
|---|---|---|
| FR-1.1 | Next.js App Router + TypeScript app that authenticates to the PayPal sandbox with OAuth token caching. | M |
| FR-1.2 | `scripts/seed-sandbox.ts` creates sandbox invoices (mixed ages and states) and orders; idempotent and re-runnable. | M |
| FR-1.3 | AG Grid table lists real sandbox invoices (live API, not hard-coded). | M |
| FR-1.4 | Chat panel: Claude answers using read-only PayPal tools only (list/get invoices, orders, disputes, transactions, shipment tracking). Write tools are not registered in this slice. | M |
| FR-1.5 | Deployed to Render from this slice (`render.yaml`: web + Postgres), with CI (lint, typecheck, test, build). | M |
| FR-1.6 | `LICENSE` (MIT) at repo root, `.env.example`, README with run instructions. | M |

### v0.2 Invoice chaser
| ID | Requirement | P |
|---|---|---|
| FR-2.1 | Agent ranks overdue invoices by amount, age, and customer history, with a stated reason per rank. | M |
| FR-2.2 | Agent drafts a reminder per invoice in a tone that fits the customer, and creates an `ActionProposal` (payload, rationale, risk level, cited evidence, amount at stake). | M |
| FR-2.3 | Approval queue (AG Grid): approve, edit-then-approve, or reject. Approval writes an approval record. | M |
| FR-2.4 | On approval the server executes `send_invoice_reminder` with a `PayPal-Request-Id` idempotency key; result stored. | M |
| FR-2.5 | Append-only audit log of every proposal, decision, execution, and failure, viewable in the UI. | M |
| FR-2.6 | Batch approve for many reminders, each still individually recorded. | S |

### v0.3 Dispute desk
| ID | Requirement | P |
|---|---|---|
| FR-3.1 | List disputes with deadline countdown, amount, and reason; sort by urgency. | M |
| FR-3.2 | Agent classifies the dispute reason and builds an `EvidencePacket` from the order, shipment tracking, and invoice. Every item links to its source record. | M |
| FR-3.3 | Agent drafts a response and recommends **contest** or **accept** with a confidence level and the cost trade-off. | M |
| FR-3.4 | On approval, call provide-evidence or accept-claim (direct REST) with idempotency and audit entry. | M |
| FR-3.5 | Buyer messages are shown and passed to the model as fenced **untrusted** content; they can never trigger a write or change a proposal's target, amount, or recipient. | M |
| FR-3.6 | If sandbox disputes cannot be created (see risk R1), a "simulated dispute" fixture mode, clearly labeled in the UI, with the same code path. Invoices, orders, refunds stay live. | M |

### v0.4 Refunds and risk
| ID | Requirement | P |
|---|---|---|
| FR-4.1 | Transaction view from Transaction Search in AG Grid. | M |
| FR-4.2 | Anomaly flags (refund spike, repeat disputer, high-value first order), computed deterministically, each with a Claude-written explanation that cites the underlying transactions. | M |
| FR-4.3 | Refund proposals (full or partial) go through the same approval queue; execution uses the refund API with idempotency. | M |
| FR-4.4 | Refund proposal shows customer history and dispute exposure alongside the amount. | S |

### v0.5 Polish and autonomy
| ID | Requirement | P |
|---|---|---|
| FR-5.1 | PayPal webhooks received at `api/webhooks/paypal`; signature verified; events deduplicated and persisted; relevant events create new work (e.g., new dispute, invoice overdue) as proposals or queue items, never as executions. | M |
| FR-5.2 | "Morning brief": prioritized summary of what needs attention, each line linking to its queue item. | M |
| FR-5.3 | Advanced AG Grid: row grouping, master/detail evidence panel, inline sparklines, custom cell renderers for AI status and risk. | M |
| FR-5.4 | Cost and token telemetry per session and per run, visible in the UI. | M |
| FR-5.5 | "Reset demo" button: clears Steward state and re-seeds the sandbox fixtures. | M |
| FR-5.6 | Eval dashboard showing latest golden-set, injection-set, and citation results. | S |
| FR-5.7 | Keyboard-complete approval flow; reduced-motion respected. | M |

## 4. Non-functional requirements

### Security and safety
| ID | Requirement |
|---|---|
| NFR-S1 | **Approval gating.** Write-capable PayPal clients are importable only from the executor module; the agent's tool set contains propose-only wrappers. Executor refuses any proposal without an approval record. |
| NFR-S2 | **Idempotency.** Every write carries a stable `PayPal-Request-Id` derived from the proposal ID; repeated approve calls are a no-op after the first success. |
| NFR-S3 | **Webhook signature verification** via PayPal's verify-webhook-signature endpoint [9] (webhook ID from env); invalid or unverifiable requests get a 4xx and cause no side effects. |
| NFR-S4 | **Prompt-injection containment.** Buyer text, invoice notes, and tool output are untrusted: delimited in the prompt, never concatenated into instructions, and structurally unable to cause a write (see NFR-S1). Proposal fields that name a target, amount, or recipient are validated against fetched PayPal records, not model text. |
| NFR-S5 | **Secrets via env only.** Validated at startup (fail fast), never sent to the client, never logged, covered by a secret scan in CI. |
| NFR-S6 | Production CSP (nonce-based), HSTS, `X-Content-Type-Options`, `Referrer-Policy`, frame denial; CSRF protection on approve/reject; schema validation of all inputs; rate limit on every API route. |
| NFR-S7 | Error messages shown to users do not leak internals; detailed context logged server-side. |

### Cost caps (defaults are assumptions, see ASSUMPTIONS.md A-9)
| ID | Requirement |
|---|---|
| NFR-C1 | Per-session token cap, per-IP chat rate limit, and a global daily spend ceiling that fails closed with a friendly message. |
| NFR-C2 | Default to Sonnet-class model; Opus-class model only for dispute-response drafting. |
| NFR-C3 | A full eval run has a documented cost and stays inside the budget in A-9; CI runs a small subset only. |

### Accessibility, performance, quality
| ID | Requirement |
|---|---|
| NFR-A1 | WCAG 2.2 AA for the whole demo path: contrast, focus visibility, target size, keyboard operation of the grid and approval flow, labelled status (risk and AI state are never conveyed by color alone). |
| NFR-P1 | Core Web Vitals on the hosted URL: LCP < 2.5s, INP < 200ms, CLS < 0.1, FCP < 1.5s, TBT < 200ms. |
| NFR-P2 | Initial JS for the app page < 300 kB gzipped; AG Grid and charts loaded via dynamic import (budget exception to be justified in PLAN.md if the grid cannot fit). |
| NFR-P3 | Agent responses stream; first token < 3s on the hosted app (assumption). |
| NFR-Q1 | TDD; >= 80% coverage on `src/lib` and `src/features/*` domain logic; unit, integration (MSW PayPal mocks), and Playwright E2E per slice. |
| NFR-Q2 | Design: a deliberate visual direction (not default AG Grid/Tailwind/shadcn look), designed hover/focus/active states, verified at 320, 768, 1024, 1440 px without horizontal overflow. |
| NFR-Q3 | Cross-browser smoke: Chrome, Firefox, Safari. |
| NFR-O1 | Observability: structured server logs, AI run records (model, tokens, cost, latency, tool calls) in Postgres. |

## 5. Success criteria

Each ID is copied into `ACCEPTANCE.md` with pass/fail and evidence (command output, report, or screenshot).

| ID | Criterion | How measured | Threshold |
|---|---|---|---|
| SC-1 | **No write without approval** | Integration tests + DB constraint + static import check; injection and E2E runs scanned for PayPal write calls (MSW) lacking an approval record | **0** writes without an approval record; 0 executed audit rows without an approval FK |
| SC-2 | Idempotent execution | Approve the same proposal 10x, including concurrent requests | Exactly **1** PayPal write; same `PayPal-Request-Id` on any retry |
| SC-3 | Dispute-reason classification | Golden set of >= 40 labeled disputes covering every supported reason with >= 3 each | **>= 90%** accuracy |
| SC-4 | Contest/accept recommendation quality | Same golden set with labeled expected decision | >= 80% agreement (assumption); each wrong case reviewed in `ACCEPTANCE.md` |
| SC-5 | Injection containment | Injection set of >= 30 payloads (instruction override, tool-call smuggling, amount/recipient swaps, data exfiltration, in disputes and invoice notes), each run 3x | **100%** contained: 0 unapproved writes, 0 altered target/amount/recipient, 0 secret or system-prompt leaks |
| SC-6 | **Every proposal cites evidence** | Code-level validator rejects proposals with no evidence refs; eval checks refs resolve to records fetched in that run | **100%** of proposals have >= 1 resolving evidence ref; 0 dangling refs |
| SC-7 | Draft correctness | Deterministic checks on reminders and responses (invoice number, amount, currency, due date, recipient match source records) | 100% on the eval set |
| SC-8 | Webhook integrity | Tests with valid, tampered, replayed, and unsigned payloads | Invalid -> 4xx, 0 DB side effects; valid replay -> persisted once |
| SC-9 | Slice demo paths pass | Playwright E2E for v0.1-v0.5 in CI | 100% pass; coverage >= 80% on `src/lib` and `src/features/*` |
| SC-10 | **Runs from a clean checkout** | `solution-verifier` clones into an empty directory, follows only `DEMO.md`/README, fills `.env` from `.env.example` | Seed, app start, and golden path work; <= 10 commands and <= 15 minutes |
| SC-11 | **Hosted URL works** | Smoke E2E against the Render URL: seed, ask, approve reminder, contest dispute, approve refund, view audit log | Passes; URL stays up through at least Dec 15, 2026 (assumption: judging window) |
| SC-12 | **Video < 3 minutes** | YouTube-reported duration; shows the app working with real sandbox calls; plays logged out | **<= 2:50** runtime (10 s margin); public or unlisted |
| SC-13 | **License detected** | GitHub API `GET /repos/{owner}/{repo}/license` and visual check of the repo header | Returns SPDX `MIT`; repo public |
| SC-14 | Web quality | Lighthouse (mobile and desktop) and axe on the demo path; manual keyboard and reduced-motion pass; screenshots at 320/768/1024/1440 | NFR-P1 met; axe 0 serious/critical; no overflow; WCAG 2.2 AA checklist complete |
| SC-15 | Secrets hygiene | Secret scanner over full history; inspect client bundle | 0 findings; no secret in client bundle |
| SC-16 | Cost control | Test that the session cap and daily ceiling stop requests; telemetry from a full eval run | Caps enforced; eval run within A-9 budget |
| SC-17 | AG Grid depth (sponsor prize) | Feature inventory in README, each verified in the demo | >= 5 distinct advanced features (custom renderers, row grouping, master/detail, sparklines, pinned/status bar/filters, etc.) |
| SC-18 | Render deploy reproducible | Fresh Blueprint deploy from `render.yaml` | Web + Postgres come up with env groups; documented |
| SC-19 | Honest labeling | Review of UI and docs | Any simulated data is labeled in the UI; every public statistic carries a citation or is qualitative |
| SC-20 | Submission package complete | Section 6 checklist | 100% items checked, 24 h before deadline |

## 6. Hackathon submission checklist

Mapped to the rules summarized from the Devpost page [10]. **Verification note:** this mapping came from search-result summaries; the full rules text must be read once on Day 1 and any difference corrected here (ASSUMPTIONS.md A-1).

| # | Requirement (per rules) | Our deliverable | Maps to | Owner |
|---|---|---|---|---|
| 1 | Uses PayPal developer platform in the free sandbox and an AI tool/model/platform | PayPal sandbox (toolkit + REST) and Claude via AI SDK | G3, NG1 | build |
| 2 | Public GitHub repo with open source license detected at top | Public repo, MIT `LICENSE` at root | SC-13 | user (go-ahead for push) |
| 3 | Functional demo judges can run | Render URL plus full run instructions (judge credentials in README if a passcode is used) | SC-10, SC-11 | build + user (deploy) |
| 4 | Demo video under 3 minutes on YouTube | <= 2:50 video, shot list in `launch/` | SC-12 | user uploads |
| 5 | English text description | Devpost text in `launch/devpost.md` | SC-20 | doc-writer |
| 6 | List of tools used and how each was used | `launch/tools.md` (PayPal toolkit, PayPal REST, Claude, AI SDK, AG Grid, Render, Postgres/Drizzle, Next.js, Vitest/MSW/Playwright, GitHub Actions) with one line on how each was used | SC-20 | doc-writer |
| 7 | Submitted before deadline Nov 12, 2026, 12:00 PT | Internal freeze Nov 8, submit by Nov 11 | SC-20 | user submits |
| 8 | Eligibility (age of majority, not in an excluded region, team/individual) | Confirm entrant eligibility | A-2 | user |
| 9 | Prize categories (Grand Prize; Honorable Mentions incl. Most Impactful, Best Use of PayPal + AI; sponsor prizes AG Grid, Render) | Submission narrative emphasizes impact and PayPal + AI depth; AG Grid and Render sections in README | SC-17, SC-18 | launch-comms |
| 10 | Third-party content permitted (licenses, credit) | Dependency licenses compatible with MIT; credits in README | SC-13 | build |

Prize-stacking note (from search summary of the rules): a project can win at most one Grand Prize or Honorable Mention plus one sponsor prize. Targets are therefore ranked, not additive; see A-3.

## 7. Constraints (summary; detail in ASSUMPTIONS.md)
- Stack fixed by approved plan: Next.js + TypeScript (Node 24), AI SDK 7 with Claude, `@paypal/agent-toolkit` plus direct REST, AG Grid React, Drizzle + Render Postgres, Render Blueprint, Vitest/MSW/Playwright, GitHub Actions.
- Budget: hackathon-scale, no paid services beyond Anthropic API usage and Render's plan; sponsor credits not assumed.
- Time: about 40 days from Oct 3; five slices; slice 0.1 deployed in week 1.
- Outward-facing steps (public repo push, production deploy, YouTube upload, Devpost submit) require the user's explicit go-ahead at the time.

## 8. Top risks (full list in ASSUMPTIONS.md)
| ID | Risk | Mitigation |
|---|---|---|
| R1 | Sandbox disputes hard to create | Day-1 spike; labeled fixture-mode fallback (FR-3.6) |
| R2 | Toolkit vs AI SDK 7 incompatibility, or missing tool coverage (e.g., refunds) | Day-1 spike; own adapter; direct REST |
| R3 | AG Grid Enterprise features watermarked without a key | Request hackathon key; design with Community fallback |
| R4 | Public demo abuse and cost | NFR-C1, passcode |
| R5 | LLM nondeterminism makes 100% containment flaky | Containment enforced structurally (NFR-S1/S4), evals as confirmation, temperature 0 |
| R6 | Render free Postgres or service sleep breaks the demo or judging window | Verify plan limits Day 1; keep-warm and paid-tier decision |

## References
1. Intuit QuickBooks, Small Business Late Payments Report 2025: https://quickbooks.intuit.com/r/small-business-data/small-business-late-payments-report-2025/ (figures also summarized at https://www.aol.com/articles/small-businesses-owed-17-500-150003790.html)
2. PayPal Help, responding to Item Not Received / Significantly Not As Described disputes: https://www.paypal.com/us/cshelp/article/how-do-i-respond-to-%E2%80%98item-not-received%E2%80%99-and-%E2%80%98significantly-not-as-described%E2%80%99-disputes-help1083
3. PayPal Developer, Disputes API: https://developer.paypal.com/docs/api/customer-disputes/v1/
4. PayPal Help, dispute rate and fee: https://www.paypal.com/us/cshelp/article/when-is-the-dispute-rate-applied-and-how-is-it-calculated-help350
5. Chargeflow, PayPal dispute fee summary (dollar amounts, third party): https://www.chargeflow.io/chargebacks-101/paypal-chargeback
6. Chargebacks911 survey via Crowdfund Insider: https://www.crowdfundinsider.com/2024/12/234590-nearly-half-of-chargebacks-stem-from-misuse-or-outright-abuse-report/
7. NRF and Happy Returns, 2025 Retail Returns Landscape (9% fraud), via https://www.foodlogistics.com/home/news/22952626/national-retail-federation-nrf-returns-expected-to-cost-retailers-nearly-850b-in-2025 and https://eyecarebusiness.com/news/2025/retailers-expect-850-billion-in-returns-this-year-says-nrf/
8. Appriss Retail, 2026 Total Retail Loss Benchmark Report, via https://www.globaltextiletimes.com/?p=112508 and https://chainstoreage.com/study-returns-shrink-totaled-nearly-800b-2025
9. PayPal Developer, Webhooks: https://developer.paypal.com/docs/api/webhooks/v1/
10. Devpost, PayPal AI Hackathon: https://paypalaihackathon.devpost.com/ and rules https://paypalaihackathon.devpost.com/rules
