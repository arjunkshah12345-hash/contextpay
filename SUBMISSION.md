# ContextPay — PayPal AI Hackathon submission

> Paste these fields into the Devpost submission form. Record a 2–3 min demo video of the flow in `README.md` → "Demo walkthrough" (save a PayPal wallet, run `npm run agent`, approve the over-limit purchase).

**Tagline:** Coding agents that buy their own context compression with PayPal — only when it pays for itself, and only inside the limits you set.

**Repo:** https://github.com/arjunkshah12345-hash/contextpay (public, MIT)

---

## Inspiration
Coding agents burn most of their money re-reading context — CI logs, stack traces, whole source trees — into expensive models. Compression fixes the token bill, but an agent working at 2 a.m. can't stop and ask a human for a credit card every time its compression credits run out. We wanted an agent that can pay for its own tools autonomously, the way a person would, but inside limits the human actually trusts.

## What it does
ContextPay gives a coding agent a prepaid wallet with a mandate:
1. You save a PayPal wallet once (PayPal Vault) and set rules: max per purchase, max per day, and the minimum return a purchase must promise.
2. The agent compresses its context through ContextPay. When credits run out, the endpoint returns `402 Payment Required`.
3. A **Claude** planner decides whether buying more credits is worth it and how much, based on the upcoming job, the savings measured so far, and both prices.
4. **Inside your limits, the agent charges your saved PayPal wallet itself** (merchant-initiated) and keeps working.
5. **Over your limits, it stops and sends you a PayPal checkout to approve.** You approve from the dashboard and it resumes.

The model proposes; the code decides. Spending limits are enforced in `src/mandate.js` *after* the planner runs, so no model output can spend past them.

## How we used PayPal
- **Vault v3** (`/v3/vault/setup-tokens` → buyer approval → `/v3/vault/payment-tokens`) to save a wallet the agent may charge later.
- **Orders v2 with `payment_source.paypal.vault_id` + `stored_credential`** for agent-initiated, unscheduled merchant charges — no human present.
- **Orders v2 checkout + capture** for over-limit purchases and manual top-ups.
- Every call sends a `PayPal-Request-Id`, and concurrent 402s coalesce into a single purchase, so a retry never double-charges.

This squarely targets **Best Agentic Commerce** and **Best PayPal + AI Use**: the agent is the payer, PayPal is the rail, and the human sets policy.

## How we used AI
A Claude purchasing planner (`claude-opus-5-5`, structured output) reads the upcoming job, the measured savings ratio, prices, and the mandate, and returns a buy/decline decision with an amount and a one-line rationale shown on the dashboard. A deterministic heuristic stands in when no key is present.

## Built during the hackathon
ContextPay was built new during the submission period (started Oct 7, 2026). It builds on SuperCompress, an existing context-compression API by the same author, used through its public API. Everything in this repo — the PayPal payment layer, the Claude planner, the mandate engine, the dashboard, and the demo agent — is new for this hackathon.

## How to run / test
See `README.md`. `npm install && npm start` opens the dashboard; `npm run agent` runs the demo coding agent. Works end-to-end in `PAYPAL_MODE=mock` with no credentials; add PayPal sandbox keys for the real Vault + Orders flow. `npm test` → 7 passing tests covering the mandate rules and planner.

## Tech
Node/Express, PayPal REST (Vault v3, Orders v2), Anthropic SDK (`claude-opus-5-5`), a JSON-file wallet/ledger, and a zero-build dashboard.

## Challenges
Keeping the human in control without killing autonomy: the mandate is enforced in code after the model runs, and the server refuses to serve household/billing actions it can't bound. Idempotency on agent-initiated charges so retries never double-bill.

## What's next
Per-tool mandates, spend analytics, and a real SuperCompress billing hookup so the credits are live rather than simulated.
