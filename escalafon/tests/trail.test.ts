import { describe, expect, it } from 'vitest';
import { addTrail, crimeCount, tickLeaks, tryShield } from '../src/sim/trail';
import { commitCorruption } from '../src/sim/effects';
import { checkEndings } from '../src/sim/endings';
import { compassTier } from '../src/sim/compass';
import { data, newGame } from './helpers';

describe('trail and loyalties', () => {
  it('records witnesses and makes honest witnesses lose faith', () => {
    const s = newGame();
    const before = s.loyalties.interventora;
    addTrail(s, data, { kind: 'malversacion', evidence: 2, visibility: 1, witnesses: ['interventora', 'constructor'], source: 'test' });
    expect(crimeCount(s)).toBe(1);
    expect(s.loyalties.interventora).toBe(before - data.config.loyalty.honestWitnessPenalty);
    expect(s.loyalties.constructor).toBe(data.characters.find((c) => c.id === 'constructor')!.loyalty);
  });
  it('disloyal witnesses eventually leak, raising suspicion', () => {
    const s = newGame();
    addTrail(s, data, { kind: 'cohecho', evidence: 3, visibility: 1, witnesses: ['cunado'], source: 'test' });
    s.loyalties.cunado = 1;
    for (let i = 0; i < 200 && !s.trail[0].leaked; i++) tickLeaks(s, data);
    expect(s.trail[0].leaked).toBe(true);
    expect(s.suspicion).toBeGreaterThanOrEqual(3 * data.config.loyalty.leakSuspicionPerEvidence);
  });
  it('loyal witnesses never leak', () => {
    const s = newGame();
    addTrail(s, data, { kind: 'cohecho', evidence: 3, visibility: 1, witnesses: ['cunado'], source: 'test' });
    s.loyalties.cunado = 7;
    for (let i = 0; i < 200; i++) tickLeaks(s, data);
    expect(s.trail[0].leaked).toBe(false);
  });
  it('a fiercely loyal witness takes the fall instead of you, once', () => {
    const s = newGame();
    addTrail(s, data, { kind: 'cohecho', evidence: 3, visibility: 1, witnesses: ['jefa_gabinete'], source: 'test' });
    s.loyalties.jefa_gabinete = 9.5;
    s.suspicion = 100;
    checkEndings(s, data, false);
    expect(s.ended).toBeNull();
    expect(s.gone).toContain('jefa_gabinete');
    expect(s.suspicion).toBe(data.config.loyalty.shieldSuspicionAfter);
    expect(tryShield(s, data)).toBe(false);
    s.suspicion = 100;
    checkEndings(s, data, false);
    expect(s.ended?.id).toBe('imputacion');
  });
  it('corruption raises suspicion by visibility and drifts the compass', () => {
    const s = newGame();
    commitCorruption(s, data, { kind: 'cohecho', evidence: 1, visibility: 4, witnesses: [] }, 'test');
    expect(s.suspicion).toBe(4 * data.config.suspicion.visibilityMultiplier);
    expect(s.compass).toBe(data.config.compass.perCorruptAct);
  });
});

describe('compass', () => {
  it('maps values to the four justification tiers', () => {
    expect(compassTier({ compass: 0 }, data)).toBe(0);
    expect(compassTier({ compass: 30 }, data)).toBe(1);
    expect(compassTier({ compass: 60 }, data)).toBe(2);
    expect(compassTier({ compass: 99 }, data)).toBe(3);
  });
});
