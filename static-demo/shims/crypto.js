const c = { randomUUID: () => globalThis.crypto.randomUUID(), timingSafeEqual: (a, b) => a.length === b.length && a.every((x, i) => x === b[i]) };
export default c;
export const { randomUUID, timingSafeEqual } = c;
