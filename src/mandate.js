// The mandate is the human's standing instruction to the agent: how much it
// may spend without asking. It is enforced here, in code, after the planner
// runs. The model proposes; this decides.

import { getState, spentTodayUsd } from "./store.js";

export const PRICES = {
  // ContextPay's demo credit rate: dollars of prepaid credit consumed per 1M
  // input tokens sent through /v1/compress. A configurable demo assumption.
  creditPerMTok: Number(process.env.CREDIT_PRICE_PER_MTOK || 0.125),
  // What the downstream model charges per 1M input tokens. Used only to judge
  // whether a purchase is worth it. Configurable.
  downstreamPerMTok: Number(process.env.DOWNSTREAM_PRICE_PER_MTOK || 4),
};

// The largest single purchase anyone can be asked to approve.
export const MAX_PURCHASE_USD = 500;

export const creditCostUsd = (tokensIn) => (tokensIn / 1e6) * PRICES.creditPerMTok;
export const modelInputUsd = (tokens) => (tokens / 1e6) * PRICES.downstreamPerMTok;

/**
 * Returns { allowed: true } or { allowed: false, reason } for an agent-initiated
 * charge of `amountUsd` against the vaulted PayPal wallet.
 */
export function checkAgentCharge(amountUsd) {
  const { mandate, vault } = getState();
  if (!vault) return { allowed: false, reason: "no PayPal wallet saved yet" };
  if (!mandate.autoTopupEnabled) return { allowed: false, reason: "auto top-up is turned off" };
  if (!(amountUsd > 0)) return { allowed: false, reason: "amount must be positive" };
  if (amountUsd > mandate.perTxnCapUsd)
    return { allowed: false, reason: `$${amountUsd.toFixed(2)} is over the $${mandate.perTxnCapUsd.toFixed(2)} per-purchase limit` };
  const spent = spentTodayUsd();
  if (spent + amountUsd > mandate.dailyCapUsd)
    return {
      allowed: false,
      reason: `would bring today's agent spend to $${(spent + amountUsd).toFixed(2)}, over the $${mandate.dailyCapUsd.toFixed(2)} daily limit`,
    };
  return { allowed: true };
}
