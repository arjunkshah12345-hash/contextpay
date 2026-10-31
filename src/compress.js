// Context compression. Uses the hosted SuperCompress API when a key is set;
// otherwise a small local query-aware line filter so the demo runs offline.
// The response always says which engine ran.

const SC_URL = process.env.SUPERCOMPRESS_URL || "https://www.supercompress.dev/api/v1/compress";

export const estimateTokens = (text) => Math.ceil(text.length / 4);

// COMPRESS_ENGINE=local forces the offline filter even when a key is set.
export const compressEngine = () =>
  process.env.SUPERCOMPRESS_API_KEY && process.env.COMPRESS_ENGINE !== "local" ? "supercompress" : "local-fallback";

export async function compress({ context, query }) {
  if (compressEngine() === "supercompress") {
    let res;
    try {
      res = await fetch(SC_URL, {
        method: "POST",
        headers: { "X-API-Key": process.env.SUPERCOMPRESS_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ context, query, source: "contextpay" }),
        signal: AbortSignal.timeout(Number(process.env.SUPERCOMPRESS_TIMEOUT_MS || 30_000)),
      });
    } catch (e) {
      // The agent should keep working if the hosted API is unreachable.
      return { ...localCompress({ context, query }), engine: "local-fallback (supercompress unreachable)" };
    }
    if (!res.ok) throw new Error(`SuperCompress ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const r = await res.json();
    return {
      engine: "supercompress",
      compressedText: r.compressed_text,
      originalTokens: r.original_tokens,
      keptTokens: r.kept_tokens,
      tokensSaved: r.tokens_saved,
    };
  }
  return localCompress({ context, query });
}

// Keeps lines that share words with the query, plus errors/stack frames and
// their neighbours. Crude next to SuperCompress, but honest and deterministic.
export function localCompress({ context, query }) {
  const lines = context.split("\n");
  const lowered = lines.map((l) => l.toLowerCase());
  // A query word that shows up on most lines ("test" in a test log) carries
  // no signal; only keep words that pick out under 5% of the lines.
  const terms = new Set(
    query
      .toLowerCase()
      .split(/[^a-z0-9_]+/)
      .filter((w) => w.length > 2)
      .filter((w) => lowered.filter((l) => l.includes(w)).length < Math.max(3, lines.length * 0.05))
  );
  const keep = new Set();
  lowered.forEach((lower, i) => {
    const hit =
      /error|exception|fail|traceback|panic|assert/.test(lower) ||
      [...terms].some((t) => lower.includes(t));
    if (hit) for (let j = Math.max(0, i - 1); j <= Math.min(lines.length - 1, i + 1); j++) keep.add(j);
  });
  const kept = lines.filter((_, i) => keep.has(i)).join("\n");
  const originalTokens = estimateTokens(context);
  const keptTokens = estimateTokens(kept);
  return {
    engine: "local-fallback",
    compressedText: kept,
    originalTokens,
    keptTokens,
    tokensSaved: Math.max(0, originalTokens - keptTokens),
  };
}
