// A stand-in coding agent. It works through two jobs, compressing every
// context through ContextPay before it would go to the model, and buys its
// own credits when it needs them:
//
//   job 1 is small: the planner buys a little and the agent pays on its own,
//         within the mandate, using the PayPal wallet you saved.
//   job 2 is big: the purchase is over your per-purchase limit, so the agent
//         stops and asks you to approve a PayPal checkout.
//
// Usage: npm run agent [-- --no-wait]

import fs from "node:fs";
import path from "node:path";

const BASE = process.env.CONTEXTPAY_URL || `http://localhost:${process.env.PORT || 4242}`;
const WAIT = !process.argv.includes("--no-wait");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const c = { dim: "\x1b[2m", bold: "\x1b[1m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m", reset: "\x1b[0m" };
const say = (...a) => console.log(...a);

async function api(method, route, body) {
  const res = await fetch(BASE + route, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}

// ---- realistic-looking contexts --------------------------------------------

function ciLog(failingTest, noiseLines) {
  const lines = [];
  for (let i = 0; i < noiseLines; i++) {
    lines.push(`[${String(i).padStart(5, "0")}] ok   packages/core/test/case_${i % 97}.test.ts (${(i % 13) + 2}ms)`);
    if (i % 400 === 0) lines.push(`[${i}] info  cache restored for workspace chunk ${i / 400}`);
  }
  const at = Math.floor(noiseLines * 0.71);
  lines.splice(
    at,
    0,
    `FAIL packages/auth/test/${failingTest}`,
    `  AssertionError: expected session.expiresAt to be after issuedAt`,
    `    at Object.<anonymous> (packages/auth/test/${failingTest}:42:18)`,
    `    at refreshSession (packages/auth/src/session.ts:118:9)`
  );
  return lines.join("\n");
}

function sourceBundle() {
  const dir = path.resolve("src");
  return fs
    .readdirSync(dir)
    .map((f) => `// file: src/${f}\n${fs.readFileSync(path.join(dir, f), "utf8")}`)
    .join("\n\n");
}

// ---- buying credits ------------------------------------------------------------

async function ensureCredits(job) {
  const { body: state } = await api("GET", "/api/state");
  const projectedCost = (job.estimated_tokens / 1e6) * state.prices.compressPerMTok;
  if (state.wallet.balanceUsd >= projectedCost) {
    say(c.dim + `  wallet $${state.wallet.balanceUsd.toFixed(4)} covers projected $${projectedCost.toFixed(4)}` + c.reset);
    return true;
  }
  return buy(job, `wallet $${state.wallet.balanceUsd.toFixed(4)} < projected $${projectedCost.toFixed(4)}`);
}

async function buy(job, why) {
  say(c.yellow + `  needs credits (${why}). asking the planner…` + c.reset);
  const { status, body } = await api("POST", "/api/agent/topup", { job });
  if (status !== 200) throw new Error(`top-up failed: ${body.error}`);
  if (body.plan) say(c.dim + `  planner: ${body.plan.rationale}` + c.reset);

  if (body.status === "charged") {
    say(c.green + `  ✔ paid $${body.amount_usd.toFixed(2)} from saved PayPal wallet (order ${body.order_id})` + c.reset);
    return true;
  }
  if (body.status === "declined") {
    say(`  ✘ planner declined: not worth buying. continuing uncompressed.`);
    return false;
  }
  if (body.status === "awaiting_human") {
    say(c.bold + `  ⏸ $${body.amount_usd.toFixed(2)} needs your approval: ${body.reason}` + c.reset);
    say(`    approve in the dashboard (${BASE}) or open:\n    ${c.cyan}${body.approve_url}${c.reset}`);
    if (!WAIT) return false;
    for (let i = 0; i < 300; i++) {
      await sleep(2000);
      const { body: a } = await api("GET", `/api/agent/approvals/${body.approval_id}`);
      if (a.status === "approved") {
        say(c.green + `  ✔ approved. wallet now $${a.balance_usd.toFixed(4)}` + c.reset);
        return true;
      }
    }
    say("  gave up waiting for approval.");
    return false;
  }
  throw new Error(`unexpected top-up status ${body.status}`);
}

// ---- the work ------------------------------------------------------------------

async function compressStep(label, context, query, job) {
  let r = await api("POST", "/v1/compress", { context, query });
  if (r.status === 402) {
    if (!(await buy(job, `402 from /v1/compress: balance $${r.body.balance_usd}`))) return null;
    r = await api("POST", "/v1/compress", { context, query });
  }
  if (r.status !== 200) throw new Error(`compress failed: ${r.body.error}`);
  const b = r.body;
  say(
    `  ${label.padEnd(34)} ${String(b.original_tokens).padStart(7)} → ${String(b.kept_tokens).padStart(6)} tok` +
      `  paid $${b.charged_usd.toFixed(4)}  saved ${c.green}$${b.saved_usd.toFixed(4)}${c.reset}  [${b.engine}]`
  );
  return b;
}

async function main() {
  const { body: s } = await api("GET", "/api/state").catch(() => {
    throw new Error(`ContextPay isn't running at ${BASE}. Start it with: npm start`);
  });
  say(`${c.bold}ContextPay demo agent${c.reset}  paypal=${s.paypalMode} compression=${s.compressEngine} planner=${s.planner}`);
  if (!s.vault) say(c.yellow + "  no saved PayPal wallet yet: every purchase will need your approval. Save one in the dashboard." + c.reset);

  const job1 = { description: "Fix the failing auth session-refresh test in CI", estimated_tokens: 2_000_000 };
  say(`\n${c.bold}Job 1:${c.reset} ${job1.description} (~${job1.estimated_tokens / 1e6}M tokens)`);
  await ensureCredits(job1);
  const src = sourceBundle();
  for (let i = 0; i < 4; i++) {
    await compressStep(`CI log, attempt ${i + 1}`, ciLog("session.test.ts", 6000 + i * 1500), "why does the session refresh test fail?", job1);
  }
  await compressStep("source files for the fix", src + "\n" + ciLog("session.test.ts", 3000), "refreshSession expiresAt issuedAt", job1);

  const job2 = { description: "Migrate the whole monorepo from CommonJS to ESM", estimated_tokens: 80_000_000 };
  say(`\n${c.bold}Job 2:${c.reset} ${job2.description} (~${job2.estimated_tokens / 1e6}M tokens)`);
  if (await ensureCredits(job2)) {
    for (let i = 0; i < 3; i++) {
      await compressStep(`package ${i + 1}: require() call sites`, src.repeat(6) + ciLog("esm.test.ts", 4000), "require module.exports import", job2);
    }
  }

  const { body: end } = await api("GET", "/api/state");
  const u = end.usage;
  say(`\n${c.bold}Summary${c.reset}`);
  say(`  compressed ${u.tokensIn.toLocaleString()} tokens, dropped ${u.tokensSaved.toLocaleString()} before they reached the model`);
  say(`  spent $${u.spentOnCompressionUsd.toFixed(4)} on compression, saved ${c.green}$${u.savedUsd.toFixed(4)}${c.reset} in model input (at $${end.prices.downstreamPerMTok}/1M)`);
  say(`  agent spend today $${end.spentTodayUsd.toFixed(2)} of $${end.mandate.dailyCapUsd.toFixed(2)}; wallet $${end.wallet.balanceUsd.toFixed(4)}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
