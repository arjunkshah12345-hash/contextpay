export const fileURLToPath = (u) => new URL(u).pathname;
export const pathToFileURL = (p) => ({ href: "file://" + p });
