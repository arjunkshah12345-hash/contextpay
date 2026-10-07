// The mandate is the human's standing instruction to the agent: how much it
// may spend without asking. It is enforced here, in code, after the planner
// runs. The model proposes; this decides.

import { getState, spentTodayUsd } from "./store.js";

export const PRICES = {
  // SuperCompress pay-as-you-go: dollars per 1M input tokens compressed.
  compressPerMTok: Number(process.env.COMPRESS_PRICE_PER_MTOK || 0.1),
  // What the downstream model charges per 1M input tokens (default: Claude Opus 5.5).
  downstreamPerMTok: Number(process.env.DOWNSTREAM_PRICE_PER_MTOK || 4),
};

export const compressCostUsd = (tokensIn) => (tokensIn / 1e6) * PRICES.compressPerMTok;
export const savedUsd = (tokensSaved) => (tokensSaved / 1e6) * PRICES.downstreamPerMTok;

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
