# ContextPay

**Coding agents that buy their own context compression with PayPal, only when it pays for itself, and only inside the limits you set.**

Coding agents burn most of their money re-reading context: CI logs, stack traces, whole source trees. [SuperCompress](https://www.supercompress.dev) cuts that context before it reaches the model, and costs a few cents per million tokens. But an agent working at 2 a.m. can't stop and ask you for a credit card every time its credits run out.

ContextPay gives the agent a wallet with rules:

1. **You save a PayPal wallet once** (PayPal Vault), and set a mandate: most per purchase, most per day, and the minimum return a purchase must promise.
2. **The agent compresses through ContextPay.** When the prepaid credits run out, the endpoint answers `402 Payment Required`.
3. **A Claude planner decides whether to buy and how much.** It looks at the upcoming job, the savings measured so far, and both prices, and buys only when the expected model-input savings beat the compression cost by your minimum ratio.
4. **Inside your limits, the agent pays on its own** with a merchant-initiated charge on the vaulted wallet.
5. **Outside them, it stops and asks you.** You get a normal PayPal checkout, approve it from the dashboard, and the agent resumes.

The model proposes and the code decides: the mandate is enforced in `src/mandate.js` after the planner runs, so no planner output can spend past your limits.

```
agent ──POST /v1/compress──▶ ContextPay ──▶ SuperCompress
  ▲            │ 402 when wallet is empty
  │            ▼
  │     POST /api/agent/topup
  │            │
  │     Claude planner: buy? how much? why?
  │            │
  │     mandate check (code, not model)
  │        ├── inside limits ──▶ PayPal Orders v2 charge on Vault token (no human)
  │        └── over limits  ──▶ PayPal checkout link ──▶ you approve on the dashboard
  └──────── credits added, job continues
```

## PayPal integration

| What | PayPal API |
|---|---|
| Save the wallet the agent may charge | Vault v3: `POST /v3/vault/setup-tokens` → buyer approves → `POST /v3/vault/payment-tokens` |
| Agent-initiated top-up within the mandate | Orders v2 with `payment_source.paypal.vault_id` and `stored_credential` (merchant-initiated, unscheduled) |
| Over-limit purchase or manual top-up | Orders v2 checkout (`payer-action` link) → `POST /v2/checkout/orders/{id}/capture` |
| No double charges | Every call sends a `PayPal-Request-Id`; concurrent 402s coalesce into one purchase |

## Run it

Requires Node 20+.

```bash
git clone <this repo> && cd contextpay
npm install
cp .env.example .env    # then fill in the keys below
npm start               # dashboard on http://localhost:4242
npm run agent           # in a second terminal: the demo agent
```

### Keys

| Variable | Where to get it | Without it |
|---|---|---|
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | [developer.paypal.com](https://developer.paypal.com/dashboard/applications/sandbox) → Apps & Credentials → your sandbox app. Under the app's features, enable **Save payment methods** (Vault). | Mock mode: same flow, simulated responses, labelled `paypal: mock` on the dashboard |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) | A deterministic heuristic plans purchases instead of Claude |
| `SUPERCOMPRESS_API_KEY` | [supercompress.dev](https://www.supercompress.dev) (5M tokens/month free) | A small local line filter stands in, labelled `local-fallback` |

To pay in the sandbox, log in on the PayPal approval page with a sandbox **personal** account from Developer Dashboard → Testing Tools → Sandbox Accounts.

### Demo walkthrough

1. Open the dashboard and click **Save PayPal for the agent**. Approve with your sandbox buyer.
2. Run `npm run agent`. Job 1 (a ~2M-token CI fix) finds the wallet empty. The planner buys $1.00, inside your $2 limit, and the agent pays on its own.
3. Job 2 (an ~80M-token monorepo migration) needs about $10. That's over the per-purchase limit, so the agent pauses and a **Waiting for you** card appears. Approve it in PayPal and the agent picks up where it stopped.
4. Watch the activity feed: every purchase shows the planner's reasoning and who paid.

## Tests

```bash
npm test
```

Covers the mandate rules (per-purchase limit, daily limit, the auto top-up switch, no wallet), the heuristic planner, and the fallback compressor.

## Project layout

```
src/server.js     HTTP API: dashboard, PayPal return URLs, /v1/compress, agent top-up
src/paypal.js     PayPal REST: OAuth, Orders v2, Vault v3 (+ mock mode)
src/planner.js    Claude purchasing planner (structured output) + heuristic fallback
src/mandate.js    Spending rules, enforced in code
src/compress.js   SuperCompress client + local fallback
src/store.js      JSON-file wallet, mandate and ledger
agent/demo-agent.js  The demo coding agent
public/index.html    Dashboard
```

## Built for the PayPal AI Hackathon

ContextPay was written during the hackathon's submission period, starting October 7, 2026. It builds on SuperCompress, an existing context-compression API by the same author. Everything in this repository (the PayPal payment layer, the Claude planner, the mandate engine, the dashboard and the demo agent) is new. SuperCompress itself is used through its public API.

## License

MIT
