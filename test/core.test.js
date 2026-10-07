import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";

process.env.CONTEXTPAY_DB = path.join(os.tmpdir(), `contextpay-test-${process.pid}.json`);
const { reset, update, logEvent } = await import("../src/store.js");
const { checkAgentCharge } = await import("../src/mandate.js");
const { heuristicPlan } = await import("../src/planner.js");
const { localCompress } = await import("../src/compress.js");

beforeEach(() => reset());
const withVault = () => update((s) => (s.vault = { paymentTokenId: "tok", payerEmail: null }));

test("agent cannot charge without a saved wallet", () => {
  assert.equal(checkAgentCharge(1).allowed, false);
});

test("charges inside the mandate are allowed", () => {
  withVault();
  assert.deepEqual(checkAgentCharge(2), { allowed: true });
});

test("per-purchase limit sends the purchase to the human", () => {
  withVault();
  const r = checkAgentCharge(2.01);
  assert.equal(r.allowed, false);
  assert.match(r.reason, /per-purchase limit/);
});

test("daily limit counts earlier agent top-ups only", () => {
  withVault();
  logEvent("topup", { amountUsd: 2, source: "agent" });
  logEvent("topup", { amountUsd: 2, source: "agent" });
  logEvent("topup", { amountUsd: 50, source: "human" });
  assert.equal(checkAgentCharge(1).allowed, true);
  assert.match(checkAgentCharge(1.5).reason, /daily limit/);
});

test("auto top-up switch overrides everything", () => {
  withVault();
  update((s) => (s.mandate.autoTopupEnabled = false));
  assert.match(checkAgentCharge(1).reason, /turned off/);
});

test("heuristic buys at least $1 and declines low-ROI jobs", () => {
  const mandate = { minRoi: 3 };
  const buy = heuristicPlan({ upcomingJob: { estimated_tokens: 2e6 }, usage: { tokensIn: 0, tokensSaved: 0 }, mandate });
  assert.equal(buy.decision, "buy");
  assert.equal(buy.amount_usd, 1);
  const poor = heuristicPlan({ upcomingJob: { estimated_tokens: 2e6 }, usage: { tokensIn: 1000, tokensSaved: 10 }, mandate });
  assert.equal(poor.decision, "decline");
});

test("local compression keeps the error and drops the noise", () => {
  const context = Array.from({ length: 500 }, (_, i) => `ok test ${i}`).join("\n") + "\nAssertionError: boom\n  at refresh (session.ts:1)";
  const r = localCompress({ context, query: "why does refresh fail" });
  assert.match(r.compressedText, /AssertionError/);
  assert.ok(r.tokensSaved > r.keptTokens * 5);
});
