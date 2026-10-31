// Static demo boot: run the ContextPay server in this page and route API calls to it.
const BASE = location.pathname.replace(/\/[^/]*$/, "");
const banner = document.createElement("div");
banner.style.cssText = "background:#fff4d6;color:#5b4300;padding:8px 14px;font:13px Inter,system-ui,sans-serif;text-align:center";
banner.textContent = "Hosted demo: PayPal mock mode, no real money. The ContextPay server and demo agent run in your browser; state is kept in this browser only.";
document.body.prepend(banner);
window.__ready = (async () => {
  const realFetch = window.fetch.bind(window);
  let app;
  const isApi = (p) => /^\/(api|v1|paypal|healthz)(\/|$)/.test(p);
  const toPath = (url) => {
    const u = new URL(url, location.href);
    if (u.origin !== location.origin) return null;
    let p = u.pathname; if (BASE && p.startsWith(BASE)) p = p.slice(BASE.length);
    return isApi(p) ? p + u.search : null;
  };
  window.fetch = async (url, opts = {}) => {
    const p = toPath(typeof url === "string" ? url : url.url);
    if (!p) return realFetch(url, opts);
    const r = await app.handle((opts.method || "GET").toUpperCase(), p, opts.body ? JSON.parse(opts.body) : undefined, Object.fromEntries(Object.entries(opts.headers || {}).map(([k, v]) => [k.toLowerCase(), v])));
    return new Response(JSON.stringify(r.body ?? {}), { status: r.status, headers: { "Content-Type": "application/json" } });
  };
  window.__nav = async (url) => {
    const p = toPath(url);
    if (!p) { location.href = url; return; }
    const r = await app.handle("GET", p);
    location.href = BASE + "/" + (r.location || "/").replace(/^\//, "");
  };
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (a && toPath(a.href)) { e.preventDefault(); window.__nav(a.href); }
  }, true);
  ({ app } = await import(new URL("server.js", location.href).href));
})();
