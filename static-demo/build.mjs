// Builds a fully static, mock-mode copy of ContextPay for GitHub Pages.
// The real Express app and demo agent run in the browser against shims:
// PayPal mock mode, heuristic planner, local compression, localStorage state.
// Usage: npx -y esbuild@0.24 is fetched by `node static-demo/build.mjs`.
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, "..");
const out = path.join(here, "dist");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const sh = (f) => path.join(here, "shims", f);
const alias = {
  express: sh("express.js"), "node:fs": sh("fs.js"), "node:crypto": sh("crypto.js"),
  "node:child_process": sh("child_process.js"), "node:path": "path-browserify", "node:url": sh("url.js"),
  "dotenv/config": sh("empty.js"), "@anthropic-ai/sdk": sh("empty.js"), "@anthropic-ai/sdk/helpers/zod": sh("empty.js"), zod: sh("empty.js"),
};
const banner = { js: `globalThis.process ||= { env: { PAYPAL_MODE: "mock", PLANNER: "heuristic", COMPRESS_ENGINE: "local", NO_COLOR: "1", PUBLIC_URL: location.origin + location.pathname.replace(/\\/[^/]*$/, "") }, argv: [], execPath: "", stdout: {}, exit(c) { throw new Error("exit " + c); }, cwd: () => "/" };` };
const common = { bundle: true, format: "esm", platform: "browser", alias, banner, logLevel: "warning", nodePaths: [path.join(root, "node_modules")] };
await build({ ...common, entryPoints: [path.join(root, "src/server.js")], outfile: path.join(out, "server.js") });
await build({
  ...common, entryPoints: [path.join(root, "agent/demo-agent.js")], outfile: path.join(out, "agent.js"),
  plugins: [{ name: "export-done", setup(b) { b.onLoad({ filter: /demo-agent\.js$/ }, (a) => ({ contents: fs.readFileSync(a.path, "utf8").replace("main().catch(", "export const done = main().catch("), loader: "js" })); } }],
});
let html = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
const boot = fs.readFileSync(path.join(here, "boot.js"), "utf8");
html = html
  .replace("<script>\nconst $ =", `<script>\n${boot}\n</script>\n<script>\nconst $ =`)
  .replaceAll("location.href = approveUrl", "await window.__nav(approveUrl)")
  .replace('history.replaceState(null, "", "/")', "history.replaceState(null, '', location.pathname)")
  .replace("initLedger(); refresh(); setInterval(refresh, 2000);", "window.__ready.then(() => { initLedger(); refresh(); setInterval(refresh, 2000); });");
fs.writeFileSync(path.join(out, "index.html"), html);
fs.writeFileSync(path.join(out, ".nojekyll"), "");
console.log("built", out);
