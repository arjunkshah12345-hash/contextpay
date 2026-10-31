const K = "contextpay:";
const fs = {
  readFileSync(f) { const v = localStorage.getItem(K + f); if (v == null) { if (/src\//.test(f)) return SRC; throw new Error("ENOENT"); } return v; },
  writeFileSync(f, d) { localStorage.setItem(K + f, d); },
  renameSync(a, b) { localStorage.setItem(K + b, localStorage.getItem(K + a)); localStorage.removeItem(K + a); },
  mkdirSync() {}, existsSync: (f) => localStorage.getItem(K + f) != null,
  readdirSync() { return ["server.js", "mandate.js", "planner.js", "paypal.js"]; },
};
const SRC = Array.from({ length: 400 }, (_, i) => `export function handler${i}(req, res) { const x = require("./mod${i % 17}"); module.exports.h${i} = x; return res.json({ ok: ${i} }); }`).join("\n");
export default fs;
export const { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, readdirSync } = fs;
