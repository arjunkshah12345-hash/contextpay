// End-to-end flow in PayPal mock mode: the agent pays inside its limits, is
// blocked outside them, a human approves (or denies), and the agent continues.
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";

process.env.CONTEXTPAY_DB = path.join(os.tmpdir(), `contextpay-flow-${process.pid}.json`);
process.env.PAYPAL_MODE = "mock";
process.env.PLANNER = "heuristic";
process.env.COMPRESS_ENGINE = "local";
delete process.env.AGENT_TOKEN;
delete process.env.MOCK_DECLINE_VAULT;

const { start } = await import("../src/server.js");
const { reset, getState, update } = await import("../src/store.js");

let server, base;
before(async () => {
  server = await start(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());
beforeEach(() => reset());

async function call(method, route, body, headers = {}) {
  const res = await fetch(base + route, {
    method,
    redirect: "manual",
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, body: json, location: res.headers.get("location") };
}

async function saveWallet() {
  const { body } = await call("POST", "/api/vault/start");
  const u = new URL(body.approveUrl);
  const r = await call("GET", u.pathname + u.search);
  assert.equal(r.location, "/?vault=saved");
}

const small = { description: "fix a flaky test", estimated_tokens: 2_000_000 };
const big = { description: "migrate the monorepo", estimated_tokens: 80_000_000 };

test("health check and state", async () => {
  assert.equal((await call("GET", "/healthz")).body.ok, true);
  const s = (await call("GET", "/api/state")).body;
  assert.equal(s.paypalMode, "mock");
  assert.equal(s.compressEngine, "local-fallback");
});

test("compress answers 402 when the wallet is empty", async () => {
  const r = await call("POST", "/v1/compress", { context: "x".repeat(4000), query: "q" });
  assert.equal(r.status, 402);
  assert.equal(r.body.topup_endpoint, "/api/agent/topup");
});

test("inside the limits the agent pays on its own", async () => {
  await saveWallet();
  const r = await call("POST", "/api/agent/topup", { job: small });
  assert.equal(r.body.status, "charged");
  assert.equal(r.body.amount_usd, 1);
  const s = (await call("GET", "/api/state")).body;
  assert.equal(s.wallet.balanceUsd, 1);
  assert.equal(s.spentTodayUsd, 1);
  assert.equal(s.purchaseCounts.paid, 1);
  const c = await call("POST", "/v1/compress", { context: "ok\n".repeat(2000) + "AssertionError: boom", query: "why" });
  assert.equal(c.status, 200);
  assert.ok(c.body.balance_usd < 1);
});

test("over the limit the agent is blocked, a human approves on the saved wallet, the agent resumes", async () => {
  await saveWallet();
  const r = await call("POST", "/api/agent/topup", { job: big });
  assert.equal(r.body.status, "awaiting_human");
  assert.match(r.body.reason, /per-purchase limit/);
  assert.equal(getState().wallet.balanceUsd, 0);

  // A second 402 while the human is deciding reuses the same request.
  const again = await call("POST", "/api/agent/topup", { job: big });
  assert.equal(again.body.approval_id, r.body.approval_id);
  assert.equal(again.body.already_pending, true);
  assert.equal(getState().purchases.length, 1);

  assert.equal((await call("GET", `/api/agent/approvals/${r.body.approval_id}`)).body.status, "pending");
  const ok = await call("POST", `/api/approvals/${r.body.approval_id}/approve`);
  assert.equal(ok.body.status, "approved");
  const polled = (await call("GET", `/api/agent/approvals/${r.body.approval_id}`)).body;
  assert.equal(polled.status, "approved");
  assert.equal(polled.decided_by, "you");
  assert.equal(polled.balance_usd, r.body.amount_usd);

  // Human-approved spend is not counted against the agent's daily limit.
  assert.equal((await call("GET", "/api/state")).body.spentTodayUsd, 0);
  // Approving twice is refused, so it can't double-charge.
  assert.equal((await call("POST", `/api/approvals/${r.body.approval_id}/approve`)).status, 409);

  const c = await call("POST", "/v1/compress", { context: "line\n".repeat(5000), query: "q" });
  assert.equal(c.status, 200);
});

test("a human can also approve through the PayPal checkout link", async () => {
  // No wallet saved: every purchase waits for a checkout.
  const r = await call("POST", "/api/agent/topup", { job: small });
  assert.equal(r.body.status, "awaiting_human");
  assert.match(r.body.reason, /no PayPal wallet/);
  assert.equal((await call("POST", `/api/approvals/${r.body.approval_id}/approve`)).status, 409);
  const u = new URL(r.body.approve_url);
  const ret = await call("GET", u.pathname + u.search);
  assert.equal(ret.location, "/?checkout=approved");
  assert.equal((await call("GET", `/api/agent/approvals/${r.body.approval_id}`)).body.status, "approved");
  // Replaying the return URL does not credit twice.
  assert.equal((await call("GET", u.pathname + u.search)).location, "/?checkout=unknown");
  assert.equal(getState().wallet.balanceUsd, 1);
});

test("a denied purchase lets the agent continue without buying", async () => {
  await saveWallet();
  const r = await call("POST", "/api/agent/topup", { job: big });
  assert.equal((await call("POST", `/api/approvals/${r.body.approval_id}/deny`)).body.status, "denied");
  assert.equal((await call("GET", `/api/agent/approvals/${r.body.approval_id}`)).body.status, "denied");
  assert.equal(getState().wallet.balanceUsd, 0);
  // With nothing pending, the next shortfall gets a fresh decision.
  const next = await call("POST", "/api/agent/topup", { job: small });
  assert.equal(next.body.status, "charged");
});

test("unanswered approvals expire and stop blocking", async () => {
  await saveWallet();
  const r = await call("POST", "/api/agent/topup", { job: big });
  update((s) => (s.purchases[0].createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()));
  assert.equal((await call("GET", `/api/agent/approvals/${r.body.approval_id}`)).body.status, "expired");
});

test("the daily limit blocks the agent even for small purchases", async () => {
  await saveWallet();
  update((s) => (s.mandate.dailyCapUsd = 2));
  assert.equal((await call("POST", "/api/agent/topup", { job: small })).body.status, "charged");
  assert.equal((await call("POST", "/api/agent/topup", { job: small })).body.status, "charged");
  const third = await call("POST", "/api/agent/topup", { job: small });
  assert.equal(third.body.status, "awaiting_human");
  assert.match(third.body.reason, /daily limit/);
});

test("a declined PayPal capture never credits the wallet", async () => {
  await saveWallet();
  process.env.MOCK_DECLINE_VAULT = "1";
  try {
    const r = await call("POST", "/api/agent/topup", { job: small });
    assert.equal(r.body.status, "failed");
    assert.equal(getState().wallet.balanceUsd, 0);
  } finally {
    delete process.env.MOCK_DECLINE_VAULT;
  }
});

test("removing the wallet sends every purchase to the human", async () => {
  await saveWallet();
  await call("POST", "/api/vault/remove");
  assert.equal((await call("POST", "/api/agent/topup", { job: small })).body.status, "awaiting_human");
});

test("a stale vault return is refused", async () => {
  await call("POST", "/api/vault/start");
  const r = await call("GET", "/paypal/vault-return?approval_token_id=SOMETHING-ELSE");
  assert.equal(r.location, "/?vault=mismatch");
  assert.equal(getState().vault, null);
});

test("malformed JSON is a 400, not an upstream error", async () => {
  const r = await call("POST", "/api/mandate", "{not json");
  assert.equal(r.status, 400);
});

test("agent endpoints honour AGENT_TOKEN when it is set", async () => {
  process.env.AGENT_TOKEN = "s3cret-for-tests";
  try {
    assert.equal((await call("POST", "/api/agent/topup", { job: small })).status, 401);
    const ok = await call("POST", "/api/agent/topup", { job: small }, { Authorization: "Bearer s3cret-for-tests" });
    assert.equal(ok.status, 200);
  } finally {
    delete process.env.AGENT_TOKEN;
  }
});

test("the ledger lists purchases newest first with PayPal references", async () => {
  await saveWallet();
  await call("POST", "/api/agent/topup", { job: small });
  await call("POST", "/api/agent/topup", { job: big });
  const rows = (await call("GET", "/api/ledger")).body;
  assert.equal(rows.length, 2);
  assert.equal(rows[0].status, "awaiting_approval");
  assert.equal(rows[1].status, "paid");
  assert.match(rows[1].paypalOrderId, /^MOCK-ORDER-/);
  assert.ok(rows[0].blockedReason);
});
