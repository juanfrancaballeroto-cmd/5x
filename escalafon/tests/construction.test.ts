import { describe, expect, it } from 'vitest';
import { canBuild, quote, startBuilding, tickConstruction } from '../src/sim/construction';
import { advanceMonth } from '../src/sim/tick';
import { toScreen, toTile } from '../src/render/iso';
import { data, newGame, skipCards } from './helpers';

describe('construction and contracts', () => {
  it('clean tenders are slower and pricier than hand-picked ones', () => {
    const clean = quote(data, 'centro_salud', 'clean');
    const dedo = quote(data, 'centro_salud', 'dedo');
    expect(clean.cost).toBeGreaterThan(dedo.cost);
    expect(clean.months).toBeGreaterThan(dedo.months);
    expect(clean.commission).toBe(0);
    expect(dedo.commission).toBeGreaterThan(0);
  });
  it('a clean tender leaves no trail', () => {
    const s = newGame();
    const before = s.budget;
    expect(startBuilding(s, data, 'u1', 'parque', 'clean').ok).toBe(true);
    expect(s.budget).toBe(before - quote(data, 'parque', 'clean').cost);
    expect(s.trail).toHaveLength(0);
    expect(s.blackMoney).toBe(0);
    expect(s.suspicion).toBe(0);
  });
  it('a hand-picked contract pays a commission and leaves a trail', () => {
    const s = newGame();
    startBuilding(s, data, 'u1', 'centro_salud', 'dedo');
    expect(s.blackMoney).toBe(quote(data, 'centro_salud', 'dedo').commission);
    expect(s.trail).toHaveLength(1);
    expect(s.trail[0].witnesses).toContain('constructor');
    expect(s.suspicion).toBeGreaterThan(0);
    expect(s.compass).toBeGreaterThan(0);
  });
  it('respects zoning, occupancy and budget', () => {
    const s = newGame();
    expect(canBuild(s, data, 'r1', 'hotel', 'clean')).toEqual({ ok: false, reason: 'zone' });
    expect(canBuild(s, data, 'vega', 'vivienda_protegida', 'clean')).toEqual({ ok: false, reason: 'zone' });
    startBuilding(s, data, 'u1', 'parque', 'clean');
    expect(canBuild(s, data, 'u1', 'hotel', 'clean')).toEqual({ ok: false, reason: 'occupied' });
    s.budget = 10;
    expect(canBuild(s, data, 'u2', 'centro_salud', 'clean')).toEqual({ ok: false, reason: 'budget' });
    // Licences bring money in, so they never need budget.
    expect(canBuild(s, data, 'u2', 'hotel', 'clean').ok).toBe(true);
  });
  it('finishes works after the quoted months and applies completion effects', () => {
    const s = newGame();
    skipCards(s);
    startBuilding(s, data, 'u1', 'vivienda_protegida', 'dedo');
    const months = quote(data, 'vivienda_protegida', 'dedo').months;
    for (let i = 0; i < months - 1; i++) advanceMonth(s, data);
    expect(s.plots.find((p) => p.id === 'u1')!.status).toBe('building');
    advanceMonth(s, data);
    expect(s.plots.find((p) => p.id === 'u1')!.status).toBe('built');
    expect(s.stats.protectedHomes).toBe(120);
    expect(s.legacy.vivienda).toBeGreaterThan(0);
  });
  it('running buildings apply their monthly effects', () => {
    const s = newGame();
    const p = s.plots.find((x) => x.id === 'u1')!;
    Object.assign(p, { building: 'polideportivo', status: 'built' });
    const before = s.collectives.jovenes;
    tickConstruction(s, data);
    expect(s.collectives.jovenes).toBeGreaterThan(before);
  });
});

describe('iso projection', () => {
  it('toTile inverts toScreen', () => {
    const m = { width: 64, height: 32, heightUnit: 14 };
    for (const [x, y] of [[0, 0], [3, 7], [13, 2]]) {
      const s = toScreen(m, x + 0.5, y + 0.5);
      const t = toTile(m, s.x, s.y);
      expect(t.x).toBeCloseTo(x + 0.5);
      expect(t.y).toBeCloseTo(y + 0.5);
    }
  });
});
