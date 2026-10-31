import "dotenv/config";
import crypto from "node:crypto";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import express from "express";
import * as paypal from "./paypal.js";
import { compress, compressEngine, estimateTokens } from "./compress.js";
import { PRICES, MAX_PURCHASE_USD, creditCostUsd, checkAgentCharge } from "./mandate.js";
import { planTopup, plannerName } from "./planner.js";
import { getState, update, logEvent, reset, round4, spentTodayUsd } from "./store.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 4242);
// Render sets RENDER_EXTERNAL_URL; PayPal needs absolute return URLs.
const baseUrl = () => process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
const APPROVAL_TTL_MS = Number(process.env.APPROVAL_TTL_MINUTES || 30) * 60_000;

export const app = express();
app.use(express.json({ limit: "20mb" }));
app.use(express.static(path.join(ROOT, "public")));

const nowIso = () => new Date().toISOString();
const findPurchase = (pred) => getState().purchases.find(pred);
const patchPurchase = (id, patch) =>
  update((s) => {
    const p = s.purchases.find((x) => x.id === id);
    if (p) Object.assign(p, patch, { updatedAt: nowIso() });
  });

const credit = (amountUsd, source, ref) => {
  update((s) => (s.wallet.balanceUsd = round4(s.wallet.balanceUsd + amountUsd)));
  logEvent("topup", { amountUsd, source, ref });
};

// Approvals nobody answered stop blocking the agent after APPROVAL_TTL_MINUTES.
function expireStaleApprovals() {
  const cutoff = Date.now() - APPROVAL_TTL_MS;
  for (const p of getState().purchases) {
    if (p.status === "awaiting_approval" && Date.parse(p.createdAt) < cutoff) {
      patchPurchase(p.id, { status: "expired", decidedBy: "timeout" });
      logEvent("approval_expired", { amountUsd: p.amountUsd, ref: p.id });
    }
  }
}

const pendingApprovals = () => getState().purchases.filter((p) => p.status === "awaiting_approval");

// Optional shared secret for the agent-facing endpoints. Leave AGENT_TOKEN
// unset for a local demo; set it on a public host.
function agentAuth(req, res, next) {
  const want = process.env.AGENT_TOKEN;
  if (!want) return next();
  const got = (req.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(got), b = Buffer.from(want);
  if (a.length === b.length && crypto.timingSafeEqual(a, b)) return next();
  res.status(401).json({ error: "missing or wrong agent token" });
}

// ---- Dashboard API ----------------------------------------------------------

app.get("/healthz", (_req, res) => res.json({ ok: true, paypal: paypal.paypalMode() }));

app.get("/api/state", (_req, res) => {
  expireStaleApprovals();
  const s = getState();
  const counts = { paid: 0, approved: 0, blocked: 0 };
  for (const p of s.purchases) {
    if (p.origin !== "agent") continue;
    if (p.status === "paid") counts.paid++;
    else if (p.status === "approved") counts.approved++;
    if (p.blockedReason) counts.blocked++;
  }
  res.json({
    paypalMode: paypal.paypalMode(),
    compressEngine: compressEngine(),
    planner: plannerName(),
    prices: PRICES,
    wallet: s.wallet,
    mandate: s.mandate,
    vault: s.vault && { payerEmail: s.vault.payerEmail, createdAt: s.vault.createdAt },
    spentTodayUsd: round4(spentTodayUsd()),
    pendingApprovals: pendingApprovals(),
    purchaseCounts: counts,
    usage: { requests: s.usage.requests, tokensIn: s.usage.tokensIn, spentOnCompressionUsd: s.usage.spentOnCompressionUsd },
    demoAgentRunning: Boolean(demoChild),
    events: s.events.slice(-60).reverse(),
  });
});

// Flat purchase ledger for the AG Grid view, newest first.
app.get("/api/ledger", (_req, res) => {
  expireStaleApprovals();
  res.json(
    [...getState().purchases].reverse().map((p) => ({
      id: p.id,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt || p.createdAt,
      origin: p.origin,
      job: p.job?.description || (p.origin === "you" ? "manual top-up" : ""),
      estimatedTokens: p.job?.estimated_tokens ?? null,
      amountUsd: p.amountUsd,
      status: p.status,
      decidedBy: p.decidedBy || null,
      method: p.method || null,
      blockedReason: p.blockedReason || null,
      rationale: p.plan?.rationale || null,
      planner: p.plan?.planner || null,
      paypalOrderId: p.orderId || null,
      paypalCaptureId: p.captureId || null,
    }))
  );
});

app.post("/api/mandate", (req, res) => {
  const { autoTopupEnabled, perTxnCapUsd, dailyCapUsd, minRoi } = req.body || {};
  const num = (v, lo, hi) => (Number.isFinite(+v) && +v >= lo && +v <= hi ? +v : null);
  update((s) => {
    if (typeof autoTopupEnabled === "boolean") s.mandate.autoTopupEnabled = autoTopupEnabled;
    if (num(perTxnCapUsd, 1, MAX_PURCHASE_USD) != null) s.mandate.perTxnCapUsd = +perTxnCapUsd;
    if (num(dailyCapUsd, 1, 5000) != null) s.mandate.dailyCapUsd = +dailyCapUsd;
    if (num(minRoi, 1, 100) != null) s.mandate.minRoi = +minRoi;
  });
  logEvent("mandate", { mandate: getState().mandate });
  res.json(getState().mandate);
});

app.post("/api/reset", (_req, res) => {
  if (process.env.ALLOW_RESET === "0") return res.status(403).json({ error: "reset is disabled on this host" });
  if (demoChild) return res.status(409).json({ error: "the demo agent is running; wait for it to finish" });
  reset();
  res.json({ ok: true });
});

// ---- PayPal: save a wallet for the agent (Vault v3) ------------------------

app.post("/api/vault/start", async (_req, res, next) => {
  try {
    const setup = await paypal.createVaultSetupToken({
      returnUrl: `${baseUrl()}/paypal/vault-return`,
      cancelUrl: `${baseUrl()}/?vault=cancelled`,
    });
    update((s) => (s.pendingSetupTokenId = setup.id));
    res.json({ approveUrl: setup.approveUrl });
  } catch (e) {
    next(e);
  }
});

app.get("/paypal/vault-return", async (req, res, next) => {
  try {
    const setupId = getState().pendingSetupTokenId;
    const returned = String(req.query.approval_token_id || "");
    if (!setupId) return res.redirect("/?vault=missing");
    // PayPal echoes the setup token it approved; refuse a stale or foreign one.
    if (returned && returned !== setupId) return res.redirect("/?vault=mismatch");
    const token = await paypal.createPaymentToken(setupId);
    update((s) => {
      s.vault = { paymentTokenId: token.id, payerEmail: token.payerEmail, createdAt: nowIso() };
      s.pendingSetupTokenId = null;
    });
    logEvent("vault_saved", { payerEmail: token.payerEmail });
    res.redirect("/?vault=saved");
  } catch (e) {
    next(e);
  }
});

app.post("/api/vault/remove", async (_req, res, next) => {
  try {
    const v = getState().vault;
    if (v) await paypal.deletePaymentToken(v.paymentTokenId);
    update((s) => (s.vault = null));
    logEvent("vault_removed", {});
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ---- PayPal: human checkout (Orders v2) -----------------------------------

async function createCheckout(amountUsd, ref) {
  return paypal.createCheckoutOrder({
    amountUsd,
    description: `ContextPay compression credits ($${amountUsd.toFixed(2)})`,
    customId: ref,
    returnUrl: `${baseUrl()}/paypal/return`,
    cancelUrl: `${baseUrl()}/?checkout=cancelled`,
  });
}

app.post("/api/topup/checkout", async (req, res, next) => {
  try {
    const amountUsd = Math.round(Number(req.body?.amountUsd) * 100) / 100;
    if (!(amountUsd >= 1 && amountUsd <= MAX_PURCHASE_USD)) return res.status(400).json({ error: `amount must be $1 to $${MAX_PURCHASE_USD}` });
    const id = crypto.randomUUID();
    const order = await createCheckout(amountUsd, id);
    update((s) =>
      s.purchases.push({ id, origin: "you", amountUsd, status: "awaiting_payment", method: "checkout", orderId: order.id, approveUrl: order.approveUrl, createdAt: nowIso() })
    );
    res.json({ ref: id, approveUrl: order.approveUrl });
  } catch (e) {
    next(e);
  }
});

app.get("/paypal/return", async (req, res, next) => {
  try {
    const orderId = String(req.query.token || "");
    const p = findPurchase((x) => x.orderId === orderId && (x.status === "awaiting_approval" || x.status === "awaiting_payment"));
    if (!p) return res.redirect("/?checkout=unknown");
    const captured = await paypal.captureOrder(orderId);
    if (!paypal.isPaid(captured)) {
      logEvent("charge_failed", { amountUsd: p.amountUsd, status: captured.captureStatus || captured.status, ref: p.id });
      return res.redirect(`/?checkout=${encodeURIComponent(captured.captureStatus || captured.status)}`);
    }
    patchPurchase(p.id, {
      status: p.status === "awaiting_approval" ? "approved" : "paid",
      decidedBy: "you",
      method: "checkout",
      captureId: captured.captureId,
    });
    credit(p.amountUsd, "human", { orderId, captureId: captured.captureId, purchase: p.id });
    res.redirect("/?checkout=approved");
  } catch (e) {
    next(e);
  }
});

// ---- Human decisions on blocked agent purchases ----------------------------

// One-click approval: charge the wallet the human already saved. The charge
// is the human's decision, so it does not count toward the agent's daily
// limit. The PayPal checkout link stays available as the other way to approve.
app.post("/api/approvals/:id/approve", async (req, res, next) => {
  try {
    expireStaleApprovals();
    const p = findPurchase((x) => x.id === req.params.id);
    if (!p) return res.status(404).json({ error: "unknown approval" });
    if (p.status !== "awaiting_approval") return res.status(409).json({ error: `approval is already ${p.status}` });
    const { vault } = getState();
    if (!vault) return res.status(409).json({ error: "no saved PayPal wallet; approve with the PayPal checkout link instead", approveUrl: p.approveUrl });
    patchPurchase(p.id, { status: "charging" }); // blocks a double click from charging twice
    const order = await paypal
      .chargeVault({
        paymentTokenId: vault.paymentTokenId,
        amountUsd: p.amountUsd,
        description: `ContextPay credits approved by you: ${p.job?.description || ""}`.slice(0, 127),
        customId: p.id,
        requestId: `approve-${p.id}`,
      })
      .catch((e) => {
        patchPurchase(p.id, { status: "awaiting_approval" });
        throw e;
      });
    if (!paypal.isPaid(order)) {
      patchPurchase(p.id, { status: "awaiting_approval" });
      logEvent("charge_failed", { amountUsd: p.amountUsd, status: order.captureStatus || order.status, ref: p.id });
      return res.status(402).json({ error: `PayPal charge did not complete (${order.captureStatus || order.status})`, approveUrl: p.approveUrl });
    }
    patchPurchase(p.id, { status: "approved", decidedBy: "you", method: "saved wallet", vaultOrderId: order.id, captureId: order.captureId });
    credit(p.amountUsd, "human", { orderId: order.id, captureId: order.captureId, purchase: p.id });
    logEvent("approval_granted", { amountUsd: p.amountUsd, ref: p.id, method: "saved wallet" });
    res.json({ status: "approved", balance_usd: getState().wallet.balanceUsd });
  } catch (e) {
    next(e);
  }
});

app.post("/api/approvals/:id/deny", (req, res) => {
  const p = findPurchase((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: "unknown approval" });
  if (p.status !== "awaiting_approval") return res.status(409).json({ error: `approval is already ${p.status}` });
  patchPurchase(p.id, { status: "denied", decidedBy: "you" });
  logEvent("approval_denied", { amountUsd: p.amountUsd, ref: p.id });
  res.json({ status: "denied" });
});

// ---- The agent's side ------------------------------------------------------

// Drop-in compression endpoint. Debits the prepaid wallet; answers 402 when
// the wallet can't cover the request, so the agent knows to go buy credits.
app.post("/v1/compress", agentAuth, async (req, res, next) => {
  const { context = "", query = "Summarize this context." } = req.body || {};
  if (!context || typeof context !== "string") return res.status(400).json({ error: "context is required" });
  const reserved = round4(creditCostUsd(estimateTokens(context)));
  const { balanceUsd } = getState().wallet;
  if (balanceUsd < reserved) {
    return res.status(402).json({ error: "payment_required", balance_usd: balanceUsd, cost_usd: reserved, topup_endpoint: "/api/agent/topup" });
  }
  // Reserve first so concurrent requests can't spend the same credit twice.
  update((s) => (s.wallet.balanceUsd = round4(s.wallet.balanceUsd - reserved)));
  let result;
  try {
    result = await compress({ context, query: String(query) });
  } catch (e) {
    update((s) => (s.wallet.balanceUsd = round4(s.wallet.balanceUsd + reserved)));
    return next(e);
  }
  const chargedUsd = round4(creditCostUsd(result.originalTokens));
  update((s) => {
    s.wallet.balanceUsd = round4(s.wallet.balanceUsd + reserved - chargedUsd);
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
    charged_usd: chargedUsd,
    balance_usd: getState().wallet.balanceUsd,
  });
});

// One purchase at a time: parallel 402s must not turn into parallel charges.
let topupInFlight = null;

app.post("/api/agent/topup", agentAuth, async (req, res, next) => {
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

const awaitingHuman = (p) => ({
  status: "awaiting_human",
  amount_usd: p.amountUsd,
  reason: p.blockedReason,
  approval_id: p.id,
  approve_url: p.approveUrl,
  dashboard_url: baseUrl(),
  plan: p.plan,
});

export async function agentTopup(job) {
  expireStaleApprovals();
  // While a human is already looking at a request, don't pile up new ones.
  const open = getState().purchases.find((p) => p.status === "awaiting_approval" || p.status === "charging");
  if (open) return { ...awaitingHuman(open), already_pending: true };

  const s = getState();
  const upcomingJob = {
    description: String(job?.description || "unspecified coding task").slice(0, 500),
    estimated_tokens: Math.min(10_000_000_000, Math.max(1000, Math.round(Number(job?.estimated_tokens) || 1_000_000))),
  };
  const plan = await planTopup({ upcomingJob, usage: s.usage, balanceUsd: s.wallet.balanceUsd, mandate: s.mandate });
  logEvent("plan", { plan, job: upcomingJob });
  const id = crypto.randomUUID();
  const record = { id, origin: "agent", job: upcomingJob, plan, createdAt: nowIso() };

  const proposed = Number(plan.amount_usd);
  if (plan.decision === "decline" || !Number.isFinite(proposed) || proposed <= 0) {
    update((st) => st.purchases.push({ ...record, amountUsd: 0, status: "declined", decidedBy: "planner" }));
    return { status: "declined", plan };
  }
  // PayPal's practical floor, and a hard ceiling no model output can exceed.
  const amountUsd = Math.min(MAX_PURCHASE_USD, Math.max(1, Math.ceil(proposed * 100) / 100));

  const guard = checkAgentCharge(amountUsd);
  if (guard.allowed) {
    const order = await paypal.chargeVault({
      paymentTokenId: s.vault.paymentTokenId,
      amountUsd,
      description: `ContextPay agent top-up: ${upcomingJob.description}`.slice(0, 127),
      customId: id,
      requestId: id,
    });
    if (!paypal.isPaid(order)) {
      update((st) => st.purchases.push({ ...record, amountUsd, status: "failed", method: "saved wallet", orderId: order.id }));
      logEvent("charge_failed", { amountUsd, status: order.captureStatus || order.status, ref: id });
      return { status: "failed", amount_usd: amountUsd, plan, order_id: order.id };
    }
    update((st) =>
      st.purchases.push({ ...record, amountUsd, status: "paid", decidedBy: "agent", method: "saved wallet", orderId: order.id, captureId: order.captureId })
    );
    credit(amountUsd, "agent", { orderId: order.id, captureId: order.captureId, purchase: id });
    return { status: "charged", amount_usd: amountUsd, plan, order_id: order.id, balance_usd: getState().wallet.balanceUsd };
  }

  // Blocked by the mandate: park it for a human. They can approve with one
  // click on the saved wallet, or through a regular PayPal checkout.
  const order = await createCheckout(amountUsd, id);
  update((st) =>
    st.purchases.push({ ...record, amountUsd, status: "awaiting_approval", blockedReason: guard.reason, method: "checkout", orderId: order.id, approveUrl: order.approveUrl })
  );
  logEvent("approval_requested", { amountUsd, reason: guard.reason, ref: id });
  return awaitingHuman(findPurchase((x) => x.id === id));
}

app.get("/api/agent/approvals/:id", agentAuth, (req, res) => {
  expireStaleApprovals();
  const p = findPurchase((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: "unknown approval" });
  const status = p.status === "awaiting_approval" || p.status === "charging" ? "pending" : p.status;
  res.json({ status, amount_usd: p.amountUsd, decided_by: p.decidedBy || null, balance_usd: getState().wallet.balanceUsd });
});

// ---- Run the demo agent from the dashboard (handy on a hosted demo) --------

let demoChild = null;

app.post("/api/demo/run", (_req, res) => {
  if (process.env.ALLOW_DEMO_AGENT === "0") return res.status(403).json({ error: "the demo agent is disabled on this host" });
  if (demoChild) return res.status(409).json({ error: "the demo agent is already running" });
  const port = serverPort();
  demoChild = spawn(process.execPath, [path.join(ROOT, "agent/demo-agent.js")], {
    cwd: ROOT,
    env: { ...process.env, CONTEXTPAY_URL: `http://127.0.0.1:${port}`, NO_COLOR: "1" },
    stdio: ["ignore", "inherit", "inherit"],
  });
  logEvent("demo_started", {});
  demoChild.on("exit", (code) => {
    demoChild = null;
    logEvent("demo_finished", { code });
  });
  res.json({ started: true });
});

// ---- Errors ------------------------------------------------------------------

app.use((err, _req, res, _next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "request body is not valid JSON" });
  if (err.type === "entity.too.large") return res.status(413).json({ error: "request body is too large" });
  console.error(err);
  logEvent("error", { message: err.message });
  // PayPal or SuperCompress said no: that's an upstream failure.
  const upstream = err instanceof paypal.PayPalError || /^SuperCompress /.test(err.message);
  res.status(upstream ? 502 : 500).json({ error: err.message });
});

let server = null;
const serverPort = () => server?.address()?.port || PORT;

export function start(port = PORT) {
  return new Promise((resolve) => {
    server = app.listen(port, () => resolve(server));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.env.PAYPAL_ENV === "live" && !paypal.liveAllowed())
    console.warn("PAYPAL_ENV=live ignored: set CONTEXTPAY_ALLOW_LIVE=1 as well to move real money. Using the sandbox.");
  start().then(() => console.log(`ContextPay on ${baseUrl()}  (PayPal: ${paypal.paypalMode()})`));
}
