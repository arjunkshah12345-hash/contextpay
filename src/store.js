// Tiny JSON-file store. One wallet, one mandate, a purchase ledger and an
// append-only event log. Good enough for a single-operator demo; swap for a
// database in production. On hosts with ephemeral disks (Render's free plan)
// the state resets on every deploy or restart, which is fine for a demo.

import fs from "node:fs";
import path from "node:path";

const FILE = process.env.CONTEXTPAY_DB || path.resolve("data/state.json");

const DEFAULT_STATE = {
  wallet: { balanceUsd: 0 },
  mandate: {
    autoTopupEnabled: true,
    perTxnCapUsd: 2,
    dailyCapUsd: 5,
    minRoi: 3, // only buy credits expected to return at least 3x their cost
  },
  vault: null, // { paymentTokenId, payerEmail, createdAt }
  pendingSetupTokenId: null,
  // Every purchase the agent attempted or a human made. Statuses:
  //   paid               agent paid on its own, inside the mandate
  //   awaiting_approval  blocked by the mandate, waiting for a human
  //   approved           a human approved it (saved wallet or PayPal checkout)
  //   denied | expired   a human said no, or nobody answered in time
  //   failed             PayPal did not complete the charge
  //   declined           the planner decided not to buy
  //   awaiting_payment   a manual top-up checkout the human has not finished
  purchases: [],
  usage: { requests: 0, tokensIn: 0, tokensSaved: 0, spentOnCompressionUsd: 0 },
  events: [],
};

let state = load();

function load() {
  try {
    const saved = JSON.parse(fs.readFileSync(FILE, "utf8"));
    const base = structuredClone(DEFAULT_STATE);
    // Merge one level deep so a state file from an older version still gets
    // any new nested defaults.
    for (const [k, v] of Object.entries(saved)) {
      base[k] = v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object" && !Array.isArray(base[k])
        ? { ...base[k], ...v }
        : v;
    }
    if (!Array.isArray(base.purchases)) base.purchases = [];
    return base;
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function save() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, FILE);
}

export function getState() {
  return state;
}

export function update(fn) {
  fn(state);
  save();
  return state;
}

export function logEvent(type, data) {
  update((s) => {
    s.events.push({ at: new Date().toISOString(), type, ...data });
    if (s.events.length > 500) s.events.splice(0, s.events.length - 500);
  });
}

export function reset() {
  state = structuredClone(DEFAULT_STATE);
  save();
}

// Money in the ledger is kept to 1/10,000 of a dollar to avoid float drift.
export const round4 = (n) => Math.round(n * 10_000) / 10_000;

// "Today" is the UTC calendar day, so the daily limit behaves the same on
// any host.
export const utcDay = (iso = new Date().toISOString()) => iso.slice(0, 10);

// Only purchases the agent made on its own count toward its daily limit.
// Purchases a human approved are the human's decision, not the agent's.
export function spentTodayUsd() {
  const today = utcDay();
  return state.events
    .filter((e) => e.type === "topup" && e.source === "agent" && utcDay(e.at) === today)
    .reduce((sum, e) => sum + e.amountUsd, 0);
}
