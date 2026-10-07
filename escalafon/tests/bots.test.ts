import { describe, expect, it } from 'vitest';
import { runGame, STRATEGIES } from '../src/sim/bots';
import { data } from './helpers';

describe('headless bots', () => {
  it('every strategy finishes a game with a valid ending', () => {
    for (const s of STRATEGIES)
      for (let seed = 1; seed <= 5; seed++) {
        const r = runGame(data, seed, s);
        expect(r.months).toBeGreaterThan(0);
        expect(r.months).toBeLessThanOrEqual(data.config.time.totalMonths);
        expect(r.ending).toBeTruthy();
      }
  });
  it('is deterministic per seed', () => {
    expect(runGame(data, 77, 'moderado')).toEqual(runGame(data, 77, 'moderado'));
  });
  it('the clean strategy never commits a crime', () => {
    for (let seed = 1; seed <= 20; seed++) expect(runGame(data, seed, 'limpio').crimes).toBe(0);
  });
  it('keeps the balance targets on a small sample', () => {
    const n = 150;
    const rate = (s: (typeof STRATEGIES)[number], ok: (e: string) => boolean) =>
      Array.from({ length: n }, (_, i) => runGame(data, 5000 + i, s)).filter((r) => ok(r.ending)).length / n;
    const win = (e: string) => e.startsWith('reeleccion');
    const clean = rate('limpio', win);
    const moderate = rate('moderado', win);
    expect(clean).toBeGreaterThanOrEqual(0.25);
    expect(rate('corrupto', (e) => e === 'imputacion')).toBeGreaterThan(0.5);
    expect(moderate).toBeGreaterThan(clean);
  });
});
