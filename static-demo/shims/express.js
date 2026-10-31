// Minimal in-browser stand-in for Express, enough to run src/server.js in a page.
function compile(p) {
  const keys = [];
  const re = new RegExp("^" + p.replace(/:([A-Za-z_]+)/g, (_, k) => (keys.push(k), "([^/]+)")) + "/?$");
  return { re, keys };
}
export default function express() {
  const routes = [], errs = [];
  const app = {
    use(fn) { if (typeof fn === "function" && fn.length === 4) errs.push(fn); },
    get(p, ...h) { routes.push({ m: "GET", ...compile(p), h }); },
    post(p, ...h) { routes.push({ m: "POST", ...compile(p), h }); },
    listen(_p, cb) { setTimeout(cb); return { address: () => ({ port: 0 }) }; },
    handle(method, url, body, headers = {}) {
      return new Promise((resolve) => {
        const u = new URL(url, "http://x");
        const res = {
          code: 200,
          status(c) { this.code = c; return this; },
          json(o) { resolve({ status: this.code, body: o }); return this; },
          send(o) { resolve({ status: this.code, body: o }); return this; },
          redirect(loc) { resolve({ status: 302, location: loc }); return this; },
        };
        const req = { method, query: Object.fromEntries(u.searchParams), body: body || {}, params: {}, get: (k) => headers[k.toLowerCase()] };
        const fail = (err) => { if (errs[0]) errs[0](err, req, res, () => {}); else resolve({ status: 500, body: { error: String(err) } }); };
        const r = routes.find((r) => r.m === method && r.re.test(u.pathname));
        if (!r) return resolve({ status: 404, body: { error: "not found" } });
        const mm = u.pathname.match(r.re); r.keys.forEach((k, i) => (req.params[k] = decodeURIComponent(mm[i + 1])));
        let i = 0;
        const next = (err) => {
          if (err) return fail(err);
          const fn = r.h[i++]; if (!fn) return;
          try { const p = fn(req, res, next); if (p && p.catch) p.catch(fail); } catch (e) { fail(e); }
        };
        next();
      });
    },
  };
  return app;
}
express.json = () => () => {};
express.static = () => () => {};
