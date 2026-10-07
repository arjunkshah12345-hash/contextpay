// The purchasing planner. When the agent runs out of credits, Claude looks at
// the upcoming job, the measured savings so far, prices and the mandate, and
// proposes whether to buy credits, how much, and why. mandate.js then
// enforces the human's limits regardless of what the model proposes.
//
// Without Claude credentials (or with PLANNER=heuristic) a deterministic
// heuristic stands in.

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { PRICES } from "./mandate.js";

const MODEL = process.env.PLANNER_MODEL || "claude-opus-5-5";

export const Plan = z.object({
  decision: z.enum(["buy", "decline"]),
  amount_usd: z.number(),
  expected_tokens_compressed: z.number(),
  expected_savings_usd: z.number(),
  rationale: z.string(),
});

const SYSTEM = `You are the purchasing planner inside ContextPay. A coding agent compresses its context through SuperCompress before sending it to an expensive model, and pays for compression from a prepaid credit wallet funded with PayPal.

The agent has just run out of credits. Decide whether buying more is worth it, and how much.

How to decide:
- Cost of compression: tokens_in / 1e6 * compress_price_per_mtok.
- Value of compression: tokens_saved / 1e6 * downstream_price_per_mtok. Estimate tokens_saved for the upcoming job from the measured savings ratio so far (or 0.5 if there is no history yet).
- Buy only if expected value is at least min_roi times the cost.
- Size the purchase to cover the upcoming job plus a modest buffer (about 25%). Round up to whole cents; never below $1.00, PayPal's practical minimum here.
- You may propose an amount above the human's per-purchase limit if the job genuinely needs it; the system will then ask the human to approve it. Don't shrink a purchase below what the job needs just to fit the limit.
- Keep the rationale to one or two plain sentences a busy developer would read on a dashboard. Quote the numbers you used.`;

export async function planTopup(input) {
  if (process.env.PLANNER === "heuristic") return { ...heuristicPlan(input), planner: "heuristic" };

  let response;
  try {
    // Resolves ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN or an `ant auth login` profile.
    response = await new Anthropic().messages.parse({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(Plan) },
      system: SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(plannerContext(input), null, 2) }],
    });
  } catch (e) {
    // No credentials or no network: the agent still needs an answer, and the
    // mandate still bounds what it can spend, so fall back rather than stall.
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.APIConnectionError || /credential|api key|apiKey|authToken/i.test(e.message)) {
      return { ...heuristicPlan(input), planner: "heuristic (Claude unavailable)" };
    }
    throw e;
  }
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return { ...heuristicPlan(input), planner: "heuristic (model gave no plan)" };
  }
  return { ...response.parsed_output, planner: MODEL };
}

function plannerContext({ upcomingJob, usage, balanceUsd, mandate }) {
  return {
    upcoming_job: upcomingJob,
    measured_so_far: {
      requests: usage.requests,
      tokens_in: usage.tokensIn,
      tokens_saved: usage.tokensSaved,
      savings_ratio: usage.tokensIn ? +(usage.tokensSaved / usage.tokensIn).toFixed(3) : null,
    },
    wallet_balance_usd: balanceUsd,
    prices: {
      compress_price_per_mtok: PRICES.compressPerMTok,
      downstream_price_per_mtok: PRICES.downstreamPerMTok,
    },
    mandate: {
      per_purchase_limit_usd: mandate.perTxnCapUsd,
      daily_limit_usd: mandate.dailyCapUsd,
      min_roi: mandate.minRoi,
    },
  };
}

export function heuristicPlan({ upcomingJob, usage, mandate }) {
  const ratio = usage.tokensIn ? usage.tokensSaved / usage.tokensIn : 0.5;
  const tokens = upcomingJob.estimated_tokens;
  const cost = (tokens / 1e6) * PRICES.compressPerMTok;
  const value = ((tokens * ratio) / 1e6) * PRICES.downstreamPerMTok;
  const amount = Math.max(1, Math.ceil(cost * 1.25 * 100) / 100);
  const roi = cost > 0 ? value / cost : 0;
  if (roi < mandate.minRoi) {
    return {
      decision: "decline",
      amount_usd: 0,
      expected_tokens_compressed: tokens,
      expected_savings_usd: +value.toFixed(4),
      rationale: `Expected ROI ${roi.toFixed(1)}x is under the ${mandate.minRoi}x minimum.`,
    };
  }
  return {
    decision: "buy",
    amount_usd: amount,
    expected_tokens_compressed: tokens,
    expected_savings_usd: +value.toFixed(4),
    rationale: `Compressing ~${(tokens / 1e6).toFixed(1)}M tokens costs $${cost.toFixed(2)} and should save $${value.toFixed(2)} (${roi.toFixed(0)}x) at a ${(ratio * 100).toFixed(0)}% savings ratio.`,
  };
}
