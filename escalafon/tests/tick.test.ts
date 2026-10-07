import { describe, expect, it } from 'vitest';
import { advanceMonth, canAdvance } from '../src/sim/tick';
import { monthlyBalance } from '../src/sim/economy';
import { data, newGame, skipCards } from './helpers';

describe('advanceMonth', () => {
  it('advances the calendar and applies the base budget', () => {
    const s = newGame();
    skipCards(s);
    advanceMonth(s, data);
    expect(s.month).toBe(1);
    expect(s.lastBudgetDelta).toBe(monthlyBalance(s, data));
  });
  it('blocks while a folder is pending', () => {
    const s = newGame();
    s.pending = 'farola';
    expect(canAdvance(s)).toBe(false);
    advanceMonth(s, data);
    expect(s.month).toBe(0);
  });
  it('lets suspicion decay by one per month', () => {
    const s = newGame();
    skipCards(s);
    s.suspicion = 30;
    advanceMonth(s, data);
    expect(s.suspicion).toBeCloseTo(29, 5);
  });
  it('makes unlaundered black money raise suspicion', () => {
    const s = newGame();
    skipCards(s);
    s.suspicion = 30;
    s.blackMoney = data.config.suspicion.blackMoneyPerPoint * 4;
    advanceMonth(s, data);
    expect(s.suspicion).toBeCloseTo(33, 5);
  });
  it('pulls collectives back toward neutral and keeps meters in range', () => {
    const s = newGame();
    skipCards(s);
    s.collectives.inquilinos = 10;
    s.image = 140;
    advanceMonth(s, data);
    expect(s.collectives.inquilinos).toBeLessThan(10);
    expect(s.image).toBeLessThanOrEqual(100);
  });
  it('penalises debt', () => {
    const s = newGame();
    skipCards(s);
    s.budget = -1_000_000;
    const p = s.power;
    advanceMonth(s, data);
    expect(s.power).toBeLessThan(p);
  });
  it('is deterministic with the same seed', () => {
    const a = newGame({ seed: 99 });
    const b = newGame({ seed: 99 });
    for (let i = 0; i < 20; i++) {
      for (const s of [a, b]) {
        if (s.pending) s.pending = null;
        advanceMonth(s, data);
      }
    }
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });
  it('holds an election at the end of the term', () => {
    const s = newGame();
    skipCards(s);
    s.month = data.config.time.totalMonths - 1;
    advanceMonth(s, data);
    expect(s.ended).not.toBeNull();
    expect(['reeleccion_limpia', 'derrota', 'reeleccion_rastro', 'imputacion']).toContain(s.ended!.id);
  });
});
