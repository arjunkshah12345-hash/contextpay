export default {};
export function zodOutputFormat() {}
export const z = new Proxy({}, { get: () => () => new Proxy({}, { get: (t, k) => (k === "then" ? undefined : () => t) }) });
