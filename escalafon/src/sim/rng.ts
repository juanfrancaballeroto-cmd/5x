/**
 * Deterministic PRNG (mulberry32). The generator state lives inside GameState
 * so a saved game resumes exactly where it left off.
 */
export interface RngHolder {
  rng: number;
}

export function seedToState(seed: number): number {
  return (seed ^ 0x9e3779b9) >>> 0;
}

export function next(h: RngHolder): number {
  h.rng = (h.rng + 0x6d2b79f5) >>> 0;
  let t = h.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function chance(h: RngHolder, p: number): boolean {
  return next(h) < p;
}

/** Integer in [min, max], both inclusive. */
export function int(h: RngHolder, min: number, max: number): number {
  return min + Math.floor(next(h) * (max - min + 1));
}

export function pick<T>(h: RngHolder, xs: readonly T[]): T {
  return xs[Math.floor(next(h) * xs.length)];
}

export function weighted<T>(h: RngHolder, xs: readonly T[], weight: (x: T) => number): T | undefined {
  const total = xs.reduce((s, x) => s + Math.max(0, weight(x)), 0);
  if (total <= 0) return undefined;
  let r = next(h) * total;
  for (const x of xs) {
    r -= Math.max(0, weight(x));
    if (r < 0) return x;
  }
  return xs[xs.length - 1];
}

/** Standalone generator, used by bots so they don't disturb the game stream. */
export function makeRng(seed: number): RngHolder {
  return { rng: seedToState(seed) };
}
