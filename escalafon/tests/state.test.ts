import { describe, expect, it } from 'vitest';
import { createGame, legacyScore } from '../src/sim/state';
import { data, newGame } from './helpers';

describe('createGame', () => {
  it('starts with config values and party-dependent collectives', () => {
    const a = newGame({ party: 'orden' });
    const b = newGame({ party: 'progreso' });
    expect(a.power).toBe(data.config.start.power);
    expect(a.budget).toBe(data.config.start.budget);
    expect(a.month).toBe(0);
    expect(a.collectives.propietarios).toBeGreaterThan(b.collectives.propietarios);
    expect(b.collectives.inquilinos).toBeGreaterThan(a.collectives.inquilinos);
    expect(a.plots).toHaveLength(data.map.plots.length);
  });
  it('requires three distinct causes', () => {
    expect(() => createGame(data, { seed: 1, party: 'orden', causes: ['vivienda', 'agua'] })).toThrow();
    expect(() => createGame(data, { seed: 1, party: 'orden', causes: ['agua', 'agua', 'empleo'] })).toThrow();
  });
  it('scores legacy only for chosen causes, capped at goal', () => {
    const s = newGame({ causes: ['vivienda', 'agua', 'empleo'] });
    s.legacy.vivienda = 250;
    s.legacy.paisaje = 80;
    s.legacy.agua = 10;
    expect(legacyScore(s, data)).toBe(110);
  });
});
