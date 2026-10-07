// Tiny JSON-file store. One wallet, one mandate, an append-only event ledger.
// Good enough for a single-operator demo; swap for a database in production.

import fs from "node:fs";
import path from "node:path";

const FILE = process.env.CONTEXTPAY_DB || path.resolve("data/state.json");

const DEFAULT_STATE = {
  wallet: { balanceUsd: 0 },
  mandate: {
    autoTopupEnabled: true,
    perTxnCapUsd: 2,
    dailyCapUsd: 5,
    minRoi: 3, // only buy credits expected to save >= 3x their cost
  },
  vault: null, // { paymentTokenId, payerEmail, createdAt }
  pendingSetupTokenId: null,
  pendingApprovals: [], // human checkouts the agent asked for
  usage: { requests: 0, tokensIn: 0, tokensSaved: 0, spentOnCompressionUsd: 0 },
  events: [],
};

let state = load();

function load() {
  try {
    return { ...structuredClone(DEFAULT_STATE), ...JSON.parse(fs.readFileSync(FILE, "utf8")) };
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

export function spentTodayUsd() {
  const today = new Date().toISOString().slice(0, 10);
  return state.events
    .filter((e) => e.type === "topup" && e.source === "agent" && e.at.startsWith(today))
    .reduce((sum, e) => sum + e.amountUsd, 0);
}
