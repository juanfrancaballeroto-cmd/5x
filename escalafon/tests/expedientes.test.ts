import { describe, expect, it } from 'vitest';
import { conditionMet, eligible, getExpediente, optionAvailable, resolveExpediente, tickExpedientes } from '../src/sim/expedientes';
import { advanceMonth } from '../src/sim/tick';
import { startBuilding } from '../src/sim/construction';
import { data, newGame } from './helpers';

describe('expedientes', () => {
  it('draws a card on schedule and blocks the clock until answered', () => {
    const s = newGame();
    advanceMonth(s, data);
    expect(s.pending).not.toBeNull();
    const m = s.month;
    advanceMonth(s, data);
    expect(s.month).toBe(m);
  });
  it('evaluates conditions', () => {
    const s = newGame({ causes: ['vivienda', 'agua', 'empleo'] });
    s.month = 5;
    expect(conditionMet(s, data, { minMonth: 3, maxMonth: 6 })).toBe(true);
    expect(conditionMet(s, data, { minMonth: 6 })).toBe(false);
    expect(conditionMet(s, data, { cause: 'agua' })).toBe(true);
    expect(conditionMet(s, data, { cause: 'paisaje' })).toBe(false);
    expect(conditionMet(s, data, { notFlags: ['vega'] })).toBe(true);
    s.flags.vega = 1;
    expect(conditionMet(s, data, { notFlags: ['vega'] })).toBe(false);
    expect(conditionMet(s, data, { flags: { vega: 1 } })).toBe(true);
    expect(conditionMet(s, data, { building: { id: 'parque', status: 'any' } })).toBe(false);
    startBuilding(s, data, 'u1', 'parque', 'clean');
    expect(conditionMet(s, data, { building: { id: 'parque', status: 'building' } })).toBe(true);
    expect(conditionMet(s, data, { building: { id: 'parque', status: 'built' } })).toBe(false);
    expect(conditionMet(s, data, { anyConstruction: true })).toBe(true);
  });
  it('never offers chain-only cards from the deck and does not repeat seen ones', () => {
    const s = newGame();
    s.month = 10;
    const ids = eligible(s, data).map((x) => x.id);
    expect(ids).not.toContain('vega_2');
    expect(ids).not.toContain('periodista_1');
    s.seen.fiestas = 2;
    expect(eligible(s, data).map((x) => x.id)).not.toContain('fiestas');
  });
  it('applies the chosen option and records corruption in the trail', () => {
    const s = newGame();
    s.month = 4;
    s.pending = 'vega_1';
    expect(resolveExpediente(s, data, 'a')).toBe(true);
    expect(s.pending).toBeNull();
    expect(s.flags.vega).toBe(1);
    expect(s.trail).toHaveLength(1);
    expect(s.trail[0].kind).toBe('trafico_influencias');
    expect(s.queue).toEqual([{ id: 'vega_2', month: 7 }]);
    expect(s.compass).toBeGreaterThan(0);
  });
  it('runs the La Vega plot to the end: rezoning, split, black money and housing', () => {
    const s = newGame();
    s.month = 4;
    s.pending = 'vega_1';
    resolveExpediente(s, data, 'a');
    s.nextExpedienteMonth = 999;
    while (s.month < 7) advanceMonth(s, data);
    expect(s.pending).toBe('vega_2');
    resolveExpediente(s, data, 'a');
    expect(s.plots.find((p) => p.id === 'vega')!.zone).toBe('urbano');
    while (!s.pending) advanceMonth(s, data);
    expect(s.pending).toBe('vega_3');
    resolveExpediente(s, data, 'a');
    expect(s.blackMoney).toBeGreaterThanOrEqual(600000);
    expect(s.plots.find((p) => p.id === 'vega')!.building).toBe('vivienda_protegida');
    expect(s.trail.map((t) => t.kind)).toEqual(['trafico_influencias', 'prevaricacion', 'cohecho']);
  });
  it('the clean way out of La Vega builds housing without new crimes', () => {
    const s = newGame();
    s.pending = 'vega_2';
    resolveExpediente(s, data, 'c');
    expect(s.trail).toHaveLength(0);
    expect(s.plots.find((p) => p.id === 'vega')!.mode).toBe('clean');
  });
  it('enforces option requirements', () => {
    const s = newGame();
    s.pending = 'tesorero_campana';
    const opt = getExpediente(data, 'tesorero_campana').options.find((o) => o.id === 'a')!;
    expect(optionAvailable(s, opt)).toBe(false);
    expect(resolveExpediente(s, data, 'a')).toBe(false);
    s.blackMoney = 200000;
    expect(resolveExpediente(s, data, 'a')).toBe(true);
    expect(s.blackMoney).toBe(100000);
  });
  it('hidden effects are applied even though they are not shown', () => {
    const s = newGame({ causes: ['impuestos', 'agua', 'empleo'] });
    s.pending = 'imp_contable';
    resolveExpediente(s, data, 'a');
    expect(s.queue.some((q) => q.id === 'imp_agujero')).toBe(true);
  });
  it('queued chain cards take precedence over the deck', () => {
    const s = newGame();
    s.month = 5;
    s.queue.push({ id: 'vega_4', month: 5 });
    tickExpedientes(s, data);
    expect(s.pending).toBe('vega_4');
  });
});
