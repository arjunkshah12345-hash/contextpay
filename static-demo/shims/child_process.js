export function spawn() {
  globalThis.process.env.CONTEXTPAY_URL = location.origin + location.pathname.replace(/\/[^/]*$/, "");
  const l = {};
  const child = { on(ev, fn) { (l[ev] ||= []).push(fn); return child; } };
  import(new URL("./agent.js?" + Date.now(), import.meta.url).href).then((m) => m.done).then(
    () => (l.exit || []).forEach((f) => f(0)),
    () => (l.exit || []).forEach((f) => f(1)));
  return child;
}
