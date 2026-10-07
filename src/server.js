import "dotenv/config";
import crypto from "node:crypto";
import path from "node:path";
import express from "express";
import * as paypal from "./paypal.js";
import { compress, estimateTokens } from "./compress.js";
import { PRICES, compressCostUsd, savedUsd, checkAgentCharge } from "./mandate.js";
import { planTopup } from "./planner.js";
import { getState, update, logEvent, reset, round4, spentTodayUsd } from "./store.js";

const PORT = Number(process.env.PORT || 4242);
const BASE = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

const app = express();
app.use(express.json({ limit: "20mb" }));
app.use(express.static(path.resolve("public")));

const credit = (amountUsd, source, ref) => {
  update((s) => (s.wallet.balanceUsd = round4(s.wallet.balanceUsd + amountUsd)));
  logEvent("topup", { amountUsd, source, ref });
};

// ---- Dashboard API ----------------------------------------------------------

app.get("/api/state", (_req, res) => {
  const s = getState();
  res.json({
    paypalMode: paypal.paypalMode(),
    compressEngine: process.env.SUPERCOMPRESS_API_KEY ? "supercompress" : "local-fallback",
    planner: process.env.PLANNER === "heuristic" ? "heuristic" : process.env.PLANNER_MODEL || "claude-opus-5-5",
    prices: PRICES,
    wallet: s.wallet,
    mandate: s.mandate,
    vault: s.vault && { payerEmail: s.vault.payerEmail, createdAt: s.vault.createdAt },
    spentTodayUsd: round4(spentTodayUsd()),
    pendingApprovals: s.pendingApprovals.filter((p) => p.status === "pending"),
    usage: {
      ...s.usage,
      savedUsd: round4(savedUsd(s.usage.tokensSaved)),
    },
    events: s.events.slice(-60).reverse(),
  });
});

app.post("/api/mandate", (req, res) => {
  const { autoTopupEnabled, perTxnCapUsd, dailyCapUsd, minRoi } = req.body || {};
  const num = (v, lo, hi) => (Number.isFinite(+v) && +v >= lo && +v <= hi ? +v : null);
  update((s) => {
    if (typeof autoTopupEnabled === "boolean") s.mandate.autoTopupEnabled = autoTopupEnabled;
    if (num(perTxnCapUsd, 1, 500) != null) s.mandate.perTxnCapUsd = +perTxnCapUsd;
    if (num(dailyCapUsd, 1, 5000) != null) s.mandate.dailyCapUsd = +dailyCapUsd;
    if (num(minRoi, 1, 100) != null) s.mandate.minRoi = +minRoi;
  });
  logEvent("mandate", { mandate: getState().mandate });
  res.json(getState().mandate);
});

app.post("/api/reset", (_req, res) => {
  reset();
  res.json({ ok: true });
});

// ---- PayPal: save a wallet for the agent (Vault v3) ------------------------

app.post("/api/vault/start", async (_req, res, next) => {
  try {
    const setup = await paypal.createVaultSetupToken({
      returnUrl: `${BASE}/paypal/vault-return`,
      cancelUrl: `${BASE}/?vault=cancelled`,
    });
    update((s) => (s.pendingSetupTokenId = setup.id));
    res.json({ approveUrl: setup.approveUrl });
  } catch (e) {
    next(e);
  }
});

app.get("/paypal/vault-return", async (_req, res, next) => {
  try {
    const setupId = getState().pendingSetupTokenId;
    if (!setupId) return res.redirect("/?vault=missing");
    const token = await paypal.createPaymentToken(setupId);
    update((s) => {
      s.vault = { paymentTokenId: token.id, payerEmail: token.payerEmail, createdAt: new Date().toISOString() };
      s.pendingSetupTokenId = null;
    });
    logEvent("vault_saved", { payerEmail: token.payerEmail });
    res.redirect("/?vault=saved");
  } catch (e) {
    next(e);
  }
});

app.post("/api/vault/remove", (_req, res) => {
  update((s) => (s.vault = null));
  logEvent("vault_removed", {});
  res.json({ ok: true });
});

// ---- PayPal: human checkout (Orders v2) -----------------------------------

async function startCheckout(amountUsd, reason) {
  const ref = crypto.randomUUID();
  const order = await paypal.createCheckoutOrder({
    amountUsd,
    description: `ContextPay compression credits ($${amountUsd.toFixed(2)})`,
    customId: ref,
    returnUrl: `${BASE}/paypal/return`,
    cancelUrl: `${BASE}/?checkout=cancelled`,
  });
  update((s) =>
    s.pendingApprovals.push({ id: ref, orderId: order.id, amountUsd, reason, approveUrl: order.approveUrl, status: "pending", createdAt: new Date().toISOString() })
  );
  return { ref, approveUrl: order.approveUrl };
}

app.post("/api/topup/checkout", async (req, res, next) => {
  try {
    const amountUsd = Math.round(Number(req.body?.amountUsd) * 100) / 100;
    if (!(amountUsd >= 1 && amountUsd <= 500)) return res.status(400).json({ error: "amount must be $1–$500" });
    res.json(await startCheckout(amountUsd, "manual top-up"));
  } catch (e) {
    next(e);
  }
});

app.get("/paypal/return", async (req, res, next) => {
  try {
    const orderId = String(req.query.token || "");
    const pending = getState().pendingApprovals.find((p) => p.orderId === orderId && p.status === "pending");
    if (!pending) return res.redirect("/?checkout=unknown");
    const captured = await paypal.captureOrder(orderId);
    if (captured.status !== "COMPLETED") return res.redirect(`/?checkout=${encodeURIComponent(captured.status)}`);
    update((s) => {
      const p = s.pendingApprovals.find((x) => x.id === pending.id);
      p.status = "approved";
      p.captureId = captured.captureId;
    });
    credit(pending.amountUsd, "human", { orderId, captureId: captured.captureId });
    res.redirect("/?checkout=approved");
  } catch (e) {
    next(e);
  }
});

// ---- The agent's side ------------------------------------------------------

// Drop-in compression endpoint. Debits the prepaid wallet; answers 402 when
// the wallet can't cover the request, so the agent knows to go buy credits.
app.post("/v1/compress", async (req, res, next) => {
  try {
    const { context = "", query = "Summarize this context." } = req.body || {};
    if (!context) return res.status(400).json({ error: "context is required" });
    const tokensIn = estimateTokens(context);
    const cost = compressCostUsd(tokensIn);
    const { balanceUsd } = getState().wallet;
    if (balanceUsd < cost) {
      return res.status(402).json({
        error: "payment_required",
        balance_usd: balanceUsd,
        cost_usd: round4(cost),
        topup_endpoint: "/api/agent/topup",
      });
    }
    const result = await compress({ context, query });
    const chargedUsd = round4(compressCostUsd(result.originalTokens));
    update((s) => {
      s.wallet.balanceUsd = round4(s.wallet.balanceUsd - chargedUsd);
      s.usage.requests += 1;
      s.usage.tokensIn += result.originalTokens;
      s.usage.tokensSaved += result.tokensSaved;
      s.usage.spentOnCompressionUsd = round4(s.usage.spentOnCompressionUsd + chargedUsd);
    });
    res.json({
      compressed_text: result.compressedText,
      engine: result.engine,
      original_tokens: result.originalTokens,
      kept_tokens: result.keptTokens,
      tokens_saved: result.tokensSaved,
      charged_usd: chargedUsd,
      saved_usd: round4(savedUsd(result.tokensSaved)),
      balance_usd: getState().wallet.balanceUsd,
    });
  } catch (e) {
    next(e);
  }
});

// One purchase at a time: parallel 402s must not turn into parallel charges.
let topupInFlight = null;

app.post("/api/agent/topup", async (req, res, next) => {
  if (topupInFlight) {
    try {
      return res.json({ ...(await topupInFlight), coalesced: true });
    } catch (e) {
      return next(e);
    }
  }
  topupInFlight = agentTopup(req.body?.job);
  try {
    res.json(await topupInFlight);
  } catch (e) {
    next(e);
  } finally {
    topupInFlight = null;
  }
});

async function agentTopup(job) {
  const s = getState();
  const upcomingJob = {
    description: String(job?.description || "unspecified coding task").slice(0, 500),
    estimated_tokens: Math.max(1000, Math.round(Number(job?.estimated_tokens) || 1_000_000)),
  };
  const plan = await planTopup({ upcomingJob, usage: s.usage, balanceUsd: s.wallet.balanceUsd, mandate: s.mandate });
  const amountUsd = Math.max(1, Math.ceil(plan.amount_usd * 100) / 100);
  logEvent("plan", { plan, job: upcomingJob });

  if (plan.decision === "decline") return { status: "declined", plan };

  const guard = checkAgentCharge(amountUsd);
  if (guard.allowed) {
    const requestId = crypto.randomUUID();
    const order = await paypal.chargeVault({
      paymentTokenId: s.vault.paymentTokenId,
      amountUsd,
      description: `ContextPay agent top-up: ${upcomingJob.description}`.slice(0, 127),
      customId: requestId,
      requestId,
    });
    if (order.status !== "COMPLETED") {
      logEvent("charge_failed", { amountUsd, status: order.status });
      return { status: "charge_failed", plan, paypalStatus: order.status };
    }
    credit(amountUsd, "agent", { orderId: order.id, captureId: order.captureId });
    return { status: "charged", amount_usd: amountUsd, plan, order_id: order.id, balance_usd: getState().wallet.balanceUsd };
  }

  const { ref, approveUrl } = await startCheckout(amountUsd, guard.reason);
  logEvent("approval_requested", { amountUsd, reason: guard.reason, ref });
  return { status: "awaiting_human", amount_usd: amountUsd, reason: guard.reason, approval_id: ref, approve_url: approveUrl, plan };
}

app.get("/api/agent/approvals/:id", (req, res) => {
  const p = getState().pendingApprovals.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: "unknown approval" });
  res.json({ status: p.status, amount_usd: p.amountUsd, balance_usd: getState().wallet.balanceUsd });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  logEvent("error", { message: err.message });
  res.status(err.status && err.status < 600 ? 502 : 500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`ContextPay on ${BASE}  (PayPal: ${paypal.paypalMode()})`);
});
