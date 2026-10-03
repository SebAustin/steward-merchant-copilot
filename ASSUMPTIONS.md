# ASSUMPTIONS: Steward

Each assumption: what, why, how to override. Items marked **Day-1** must be validated in the first working session, not at deploy time.
Companion to `REQUIREMENTS.md`.

## 1. Credential-scope preflight (Day-1)

No step in this project creates an account or enters a credential on the user's behalf. The user supplies each item below. Verification commands are for the user's own shell; none print secrets.

| Service | Credential | Scope / permission needed | How to verify now |
|---|---|---|---|
| PayPal Developer (sandbox) | REST app client ID + secret (sandbox) | App features enabled: Invoicing, Payments/Orders (checkout), Disputes, Transaction Search, Webhooks (create a webhook, note its **Webhook ID**). Needs read and write (invoice send/remind, refunds, dispute evidence/accept) in sandbox. Transaction Search may need explicit enabling and can lag for new sandbox transactions. | `curl -s -u "$PAYPAL_CLIENT_ID:$PAYPAL_CLIENT_SECRET" -d grant_type=client_credentials https://api-m.sandbox.paypal.com/v1/oauth2/token` returns an access token whose `scope` lists the needed URIs; then one GET each on invoices list, disputes list, and transaction search |
| PayPal sandbox accounts | One business (merchant) and at least two personal (buyer) accounts | Buyer must be able to pay an order and open a dispute in the sandbox Resolution Center | Log into sandbox.paypal.com as the buyer; place a test order; confirm it appears under the merchant |
| Anthropic | API key | Messages API on the chosen models; a workspace spend limit set below the A-9 budget | Make one minimal request per model ID used; confirm model IDs `claude-sonnet-5-5` and `claude-opus-5-5` from the plan are valid (list models); set spend limit in the console |
| GitHub | Account; `gh` login or PAT | Create a **public** repo, push, and configure Actions secrets. Fine-grained PAT: Contents + Administration (create) + Actions/Secrets write, or `gh auth login` with `repo` scope | `gh auth status` shows the account and scopes; after creation, `gh api repos/OWNER/REPO/license` returns `spdx_id: MIT` |
| Render | Account connected to GitHub; optional API key | Authority to create a Blueprint with a web service, Postgres, and env groups in a workspace; confirm plan limits (free Postgres retention, free web service sleep) | Dashboard shows the GitHub connection; Blueprint dry-run on a scratch repo; note plan limits against the judging window (R6) |
| AG Grid | Enterprise license key (hackathon request) | Domain-locked key for the Render hostname | Email/contact AG Grid for a hackathon key; until received, build with Community features and accept watermark for Enterprise ones |
| YouTube | Google account/channel able to upload | Upload and set public/unlisted; no upload-length verification issue for < 3 min | Sign in to YouTube Studio and confirm the Upload button works |
| Devpost | Account registered for the hackathon | Submit project before deadline; edit after submit | Confirm registration at https://paypalaihackathon.devpost.com/ |
| Upstash/Redis or similar | Not used | Rate limiting uses Postgres or in-memory with the single instance (A-9) | n/a |

Rules for all credentials: env vars only, `.env` gitignored, `.env.example` lists names only, startup validation fails fast, never echoed in logs.

## 2. Assumptions

| ID | Assumption | Why | Override |
|---|---|---|---|
| A-1 | The hackathon rules are as summarized by search: sandbox plus an AI tool, text description, runnable demo, public GitHub repo with open source license file, YouTube video under 3 min, tools list, deadline Nov 12 2026 12:00 PT. The full rules page was not read in full during intake. | Search summaries of https://paypalaihackathon.devpost.com/rules; the caller supplied the same requirements | Read the rules page on Day 1; edit REQUIREMENTS.md section 6 and SC-12/13/20 if different |
| A-2 | The entrant is eligible (age of majority, not in an excluded region) and enters as an individual. | Search summary of eligibility terms; user country unknown | User confirms; team entries change nothing in scope |
| A-3 | Prize targets are ranked: (1) Grand Prize or Most Impactful/Best Use of PayPal + AI, which are mutually exclusive tiers per the rules summary; (2) one sponsor prize, AG Grid primary, Render secondary ticket. | Search summary says one Grand/Honorable plus one Sponsor | Re-rank after reading rules; AG Grid depth (SC-17) and Render reproducibility (SC-18) stay cheap either way |
| A-4 | License is MIT. | Plan says MIT; permissive, standard GitHub detection | Swap `LICENSE` (Apache-2.0 etc.) and SC-13's expected SPDX id |
| A-5 | Demo merchant is a single sandbox business account; "customers" are sandbox personal accounts and fixture contacts. | NG2; keeps the demo deterministic | n/a |
| A-6 | Dispute data: try real sandbox disputes first; fall back to labeled simulated disputes if creation is impractical. | Plan risk 1 | Spike outcome decides FR-3.6 usage; update SC-11 smoke path accordingly |
| A-7 | Golden set of >= 40 disputes and injection set of >= 30 payloads are authored by us (synthetic, modeled on PayPal's documented dispute reasons), not scraped real data. | No real dispute dataset available; avoids privacy issues | Grow sets if time allows; thresholds in SC-3/4/5 stay |
| A-8 | The contest/accept agreement threshold (80%) and "first token < 3s" are our own targets, not externally derived. | No benchmark exists | Adjust in SC-4 / NFR-P3 after the first eval |
| A-9 | Cost defaults (placeholders, set real numbers at plan time): per-session cap 100k tokens; chat limit 20 requests per IP per 10 min; global ceiling $10/day on the public demo; full eval run <= $10 (AI-QUALITY.md estimates $7–8; confirm on first run); total project API budget <= $150. | Hackathon-scale spend; protects the user's key | User sets the budget; change constants in config and SC-16 |
| A-10 | Access control for the public demo is a shared passcode printed in the README (allowed by the rules summary for judge credentials), plus rate limits. | Cheapest abuse control; not an identity system | Remove the passcode if abuse is low, or tighten caps |
| A-11 | Hosted demo stays up through Dec 15, 2026 (judging and announcement window unknown). | Judges need a working URL after submission | Check announced judging dates; extend the Render plan if needed |
| A-12 | AG Grid Community is the baseline; Enterprise features (row grouping, master/detail, sparklines, integrated charts) are used only if a license key arrives, otherwise redesigned or watermarked. | Plan risk 3 | Set `NEXT_PUBLIC_AG_GRID_LICENSE_KEY` env (decision date Oct 20, see PLAN); SC-17 counts only features that work without a watermark in the submitted demo |
| A-13 | Web design direction is chosen by `ux-designer` in the plan loop (not default AG Grid theme or template look). | User's design-quality rules; Design criterion | Record choice in PLAN.md / `CONTEXT.md` |
| A-14 | Schedule targets (assumed): v0.1 by Oct 10; v0.2 Oct 17; v0.3 Oct 26; v0.4 Nov 1; v0.5 Nov 6; feature freeze Nov 8; video recorded Nov 9; submit Nov 11 (24 h buffer). | About 40 days remain; slices are demoable alone so cutting the tail is safe | Re-plan if spikes slip; cut "S" items first |
| A-15 | The PayPal toolkit exposes invoices (incl. `send_invoice_reminder`), orders, shipment, and disputes list/get; other writes (provide-evidence, accept-claim, refund, Transaction Search, webhook verify) may need direct REST. Refund coverage in the toolkit is unconfirmed. | Search result for the toolkit lists invoice, shipment, orders, dispute list/get; refunds not confirmed | Day-1 spike lists the toolkit's actual tools for the installed version |
| A-16 | Statistics in REQUIREMENTS.md section 1 are used only as sourced; none are PayPal-specific except the dispute deadline and fee structure. The $15/$30 fee amounts come from a third-party summary and need confirmation on PayPal's page before appearing in the video or Devpost text. | "Do not invent statistics" | Replace with PayPal-verified amounts or drop numbers |
| A-17 | Quoted conflicting chargeback win-rate figures (18% vs 54% of contested) were deliberately omitted. | Sources disagree on methodology | Reintroduce only with a single clear primary source |

## 3. Decisions (grilling round 1, 2026-10-03; user accepted all recommendations)

| # | Decision |
|---|---|
| D-1 | Name: **Steward**. |
| D-2 | Demo merchant: a fictional small-batch coffee roaster that sells retail bags online (orders, refunds, disputes) and invoices wholesale cafés (invoices). |
| D-3 | Autonomy policies ship in v0.5, off by default, and cover **invoice reminders only**. Refunds and dispute actions always need a human approval. Every policy run is capped and audited. |
| D-4 | Hosted demo is behind a shared passcode printed in the README and Devpost text, with per-session token caps and a daily spend ceiling. |
| D-5 | GitHub repo is **public from day one**. `.env` is gitignored, and CI runs secret scanning. |
| D-6 | User supplies the PayPal sandbox app credentials and the Anthropic key in a local `.env` (never pasted into chat). Render comes before the first deploy. The user files 2–3 sandbox disputes manually as the sandbox buyer; a labeled simulated-dispute mode covers the gap until then. |
| D-7 | Request an AG Grid Enterprise hackathon key. Build with Enterprise features meanwhile (the watermark is fine in dev). |
| D-8 | The user narrates the video. The agency writes the script and shot list. |
| D-9 | PayPal integration split (see `docs/adr/0001-paypal-integration-split.md`): agent read tools come from `@paypal/agent-toolkit` through an AI SDK 7 adapter, and approved writes plus the gaps go through our own REST client. |
| D-10 | Render funding (2026-10-03): paid Postgres `basic-256mb` (~$6/mo) from slice 1; web service on free tier until v0.5, then `starter` (~$7/mo) through Dec 15 judging. Expected total ~$25–30. |

## 4. Open questions

| # | Question | Needed by | Default if unanswered |
|---|---|---|---|
| Q1 | Final product name (Steward is a working name; check for collisions with existing products)? | Before README and video | Keep "Steward" |
| Q2 | ~~Paid Render tier?~~ **Resolved by D-10** (paid Postgres from slice 1; starter web from v0.5). | — | — |
| Q3 | Will AG Grid supply a hackathon Enterprise key in time? | Before v0.5 | Community-only fallback (A-12) |
| Q4 | Who records and narrates the video; is a voice-over or on-screen captions preferred? | Before Nov 8 | Screen recording with captions and optional voice-over |
| Q5 | Are the plan's model IDs (`claude-sonnet-5-5`, `claude-opus-5-5`) valid for the user's key? | Day 1 | Verify via models list; substitute available models |
| Q6 | Is real-account PayPal data ever allowed in the demo? | n/a | No. NG1 stands. |

## 5. Additional risks and unknowns
- Transaction Search in the sandbox may return sparse or delayed data; v0.4 may need seeded transactions and a documented delay.
- Webhooks need a public URL in dev: use the Render deployment or a tunnel; webhook ID per environment.
- Prompt-injection evals can pass by luck on a probabilistic model; SC-5 therefore relies on structural containment (NFR-S1/S4), with evals as confirmation.
- AG Grid bundle size may exceed NFR-P2 even with dynamic import; budget exception to be recorded in PLAN.md.
- Judges may review only the video; the first 30 seconds must show the problem and the approve step.
