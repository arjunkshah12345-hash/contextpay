# ContextPay

**Coding agents that buy their own context compression with PayPal, only when it pays for itself, and only inside the limits you set.**

Coding agents burn most of their money re-reading context: CI logs, stack traces, whole source trees. [SuperCompress](https://www.supercompress.dev) cuts that context before it reaches the model. But an agent working at 2 a.m. can't stop and ask you for a credit card every time its credits run out.

ContextPay gives the agent a wallet with rules:

1. **You save a PayPal wallet once** (PayPal Vault), and set a mandate: most per purchase, most per day, and the minimum return a purchase must promise.
2. **The agent compresses through ContextPay.** When the prepaid credits run out, the endpoint answers `402 Payment Required`.
3. **A Claude planner decides whether to buy and how much.** It looks at the upcoming job, what it has measured so far, and both prices, and buys only when the projected return beats the cost by your minimum ratio.
4. **Inside your limits, the agent pays on its own** with a merchant-initiated charge on the vaulted wallet.
5. **Outside them, it is blocked and waits for you.** A card appears on the dashboard with the amount, the rule it broke and the planner's reasoning. Approve with one click on the saved wallet, approve through a regular PayPal checkout, or deny.
6. **Then it continues.** Approved: credits land and the agent picks up exactly where it stopped. Denied or unanswered (after 30 minutes): the agent finishes the job without buying.
7. **Every purchase lands in the ledger,** an AG Grid view with who decided, why it was blocked, the planner's rationale and the PayPal order id. Filter it, sort it, export it to CSV.

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
  │        └── over limits  ──▶ blocked: "Waiting for you" card on the dashboard
  │                               ├── approve: charge saved wallet, or PayPal checkout
  │                               └── deny / no answer in 30 min: no purchase
  └──────── approved: credits added, job continues · denied: job continues uncompressed
```

## PayPal integration

| What | PayPal API |
|---|---|
| Save the wallet the agent may charge | Vault v3: `POST /v3/vault/setup-tokens` → buyer approves → `POST /v3/vault/payment-tokens` |
| Agent-initiated top-up within the mandate | Orders v2 with `payment_source.paypal.vault_id` and `stored_credential`: `payment_initiator: MERCHANT`, `usage_pattern: UNSCHEDULED_PREPAID` (an automatic reload) |
| Over-limit purchase, human approves on the saved wallet | Orders v2 with the same `vault_id`, after the human clicks Approve |
| Over-limit purchase via checkout, or manual top-up | Orders v2 checkout (`payer-action` link) → `POST /v2/checkout/orders/{id}/capture` |
| Remove the saved wallet | `DELETE /v3/vault/payment-tokens/{id}` |
| No double charges | Every call sends a `PayPal-Request-Id`; concurrent 402s coalesce into one purchase; a second request while one is waiting for you reuses it; credits are added only when the capture itself is `COMPLETED` |

## Run it

Requires Node 20+.

```bash
git clone <this repo> && cd contextpay
npm install
cp .env.example .env    # then fill in the keys below
npm start               # dashboard on http://localhost:4242
npm run agent           # in a second terminal: the demo agent
```

No keys at all? It still runs end to end: PayPal goes to mock mode, the planner uses its heuristic, compression uses the local filter, and the dashboard badges say so. You can also press **Run the demo agent** on the dashboard instead of using a second terminal.

### Deploy on Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/arjunkshah12345-hash/contextpay)

`render.yaml` defines one free Node web service with a `/healthz` check. Render prompts for the PayPal, Anthropic and SuperCompress keys; leave any of them blank to use the matching fallback. PayPal return URLs come from `RENDER_EXTERNAL_URL` automatically. State is a JSON file, so on the free plan it resets on every deploy or restart.

### Keys

| Variable | Where to get it | Without it |
|---|---|---|
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | [developer.paypal.com](https://developer.paypal.com/dashboard/applications/sandbox) → Apps & Credentials → your sandbox app. Under the app's features, enable **Save payment methods** (Vault). | Mock mode: same flow, simulated responses, labelled `paypal: mock` on the dashboard |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) | A deterministic heuristic plans purchases instead of Claude |
| `SUPERCOMPRESS_API_KEY` | [supercompress.dev](https://www.supercompress.dev) | A small local line filter stands in, labelled `local-fallback` |
| `AGENT_TOKEN` | Any random string you choose | Agent endpoints are open (fine locally; set it on a public host) |

To pay in the sandbox, log in on the PayPal approval page with a sandbox **personal** account from Developer Dashboard → Testing Tools → Sandbox Accounts.

### Demo walkthrough

1. Open the dashboard and click **Save PayPal for the agent**. Approve with your sandbox buyer.
2. Press **Run the demo agent** (or `npm run agent`). Job 1 (a ~2M-token CI fix) finds the wallet empty. The planner buys $1.00, inside your $2 limit, and the agent pays on its own.
3. Job 2 (an ~80M-token monorepo migration) needs $12.50 of credits. That's over the per-purchase limit, so the agent is blocked and a **Waiting for you** card appears with the reason and the planner's rationale.
4. Click **Approve, charge saved wallet** (or **Or pay with PayPal** for a regular checkout). The agent picks up where it stopped and finishes the job. Click **Deny** instead and it finishes without buying.
5. Check the **Purchase ledger**: one row paid by the agent, one approved by you, each with its PayPal order id.

## Tests

```bash
npm test
```

21 tests, all in PayPal mock mode with no network. They cover the mandate rules, the heuristic planner and the fallback compressor, plus the whole HTTP flow: paying inside the limits, being blocked outside them, approving on the saved wallet or through checkout, denial, expiry, the daily limit, a declined capture never crediting the wallet, replayed return URLs, a stale vault return, the agent token, and the ledger.

## Project layout

```
src/server.js     HTTP API: dashboard, PayPal return URLs, /v1/compress, agent top-up
src/paypal.js     PayPal REST: OAuth, Orders v2, Vault v3 (+ mock mode)
src/planner.js    Claude purchasing planner (structured output) + heuristic fallback
src/mandate.js    Spending rules, enforced in code
src/compress.js   SuperCompress client + local fallback
src/store.js      JSON-file wallet, mandate, purchase ledger and event log
agent/demo-agent.js  The demo coding agent
public/index.html    Dashboard, with the AG Grid purchase ledger
render.yaml          Render Blueprint
```

## Built for the PayPal AI Hackathon

ContextPay was written during the hackathon's submission period, starting October 7, 2026. It builds on SuperCompress, an existing context-compression API by the same author. Everything in this repository (the PayPal payment layer, the Claude planner, the mandate engine, the approval flow, the dashboard and ledger, and the demo agent) is new. SuperCompress itself is used through its public API.

## License

MIT
