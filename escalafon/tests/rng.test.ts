import { describe, expect, it } from 'vitest';
import { chance, int, makeRng, next, weighted } from '../src/sim/rng';

describe('rng', () => {
  it('is deterministic for the same seed', () => {
    const a = makeRng(7);
    const b = makeRng(7);
    const xs = Array.from({ length: 20 }, () => next(a));
    const ys = Array.from({ length: 20 }, () => next(b));
    expect(xs).toEqual(ys);
  });
  it('differs for different seeds and stays in [0,1)', () => {
    const a = makeRng(1);
    const b = makeRng(2);
    expect(next(a)).not.toEqual(next(b));
    for (let i = 0; i < 1000; i++) {
      const v = next(a);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('int is inclusive and weighted respects zero weights', () => {
    const r = makeRng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) seen.add(int(r, 1, 3));
    expect([...seen].sort()).toEqual([1, 2, 3]);
    for (let i = 0; i < 50; i++) expect(weighted(r, ['a', 'b'], (x) => (x === 'a' ? 0 : 1))).toBe('b');
    expect(weighted(r, [], () => 1)).toBeUndefined();
    expect(chance(r, 0)).toBe(false);
    expect(chance(r, 1)).toBe(true);
  });
});
