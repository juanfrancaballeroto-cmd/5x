import { describe, expect, it } from 'vitest';
import { projectVote, runElection } from '../src/sim/election';
import { checkEndings, setEnding } from '../src/sim/endings';
import { buildFrontPage, headlineCause } from '../src/sim/frontpage';
import { resolveExpediente } from '../src/sim/expedientes';
import { advanceMonth } from '../src/sim/tick';
import { addTrail } from '../src/sim/trail';
import { data, newGame, skipCards } from './helpers';

describe('elections', () => {
  it('vote grows with image and collectives and shrinks with suspicion', () => {
    const s = newGame();
    const base = projectVote(s, data);
    s.image += 20;
    expect(projectVote(s, data)).toBeGreaterThan(base);
    s.image -= 20;
    s.suspicion = 80;
    expect(projectVote(s, data)).toBeLessThan(base);
    s.suspicion = 0;
    s.fraud = 5;
    expect(projectVote(s, data)).toBeCloseTo(base + 0.05);
  });
  it('a popular clean mayor is re-elected clean', () => {
    const s = newGame();
    s.image = 90;
    for (const k of Object.keys(s.collectives) as (keyof typeof s.collectives)[]) s.collectives[k] = 9;
    runElection(s, data);
    expect(s.ended?.id).toBe('reeleccion_limpia');
    expect(s.ended?.votePct).toBeGreaterThan(50);
  });
  it('a popular mayor with a record is re-elected with a trail', () => {
    const s = newGame();
    s.image = 90;
    for (const k of Object.keys(s.collectives) as (keyof typeof s.collectives)[]) s.collectives[k] = 9;
    addTrail(s, data, { kind: 'cohecho', evidence: 1, visibility: 1, witnesses: [], source: 't' });
    runElection(s, data);
    expect(s.ended?.id).toBe('reeleccion_rastro');
  });
  it('an unpopular mayor loses', () => {
    const s = newGame();
    s.image = 10;
    for (const k of Object.keys(s.collectives) as (keyof typeof s.collectives)[]) s.collectives[k] = 1;
    runElection(s, data);
    expect(s.ended?.id).toBe('derrota');
  });
  it('heavy fraud tends to be discovered', () => {
    let caught = 0;
    for (let seed = 0; seed < 200; seed++) {
      const s = newGame({ seed });
      s.fraud = 10;
      runElection(s, data);
      if (s.ended?.id === 'imputacion') caught++;
    }
    expect(caught).toBeGreaterThan(100);
  });
});

describe('endings', () => {
  it('suspicion 100 means indictment; power 0 means expulsion', () => {
    const a = newGame();
    a.suspicion = 100;
    checkEndings(a, data, false);
    expect(a.ended?.id).toBe('imputacion');
    const b = newGame();
    b.power = 0;
    checkEndings(b, data, false);
    expect(b.ended?.id).toBe('expulsion');
  });
  it('a weak, suspicious mayor eventually gets sacrificed by the party', () => {
    let sacrificed = 0;
    for (let seed = 0; seed < 50; seed++) {
      const s = newGame({ seed });
      s.suspicion = 80;
      s.power = 20;
      checkEndings(s, data, true);
      if (s.ended?.id === 'cabeza_turco') sacrificed++;
    }
    expect(sacrificed).toBeGreaterThan(0);
    expect(sacrificed).toBeLessThan(50);
  });
  it('cooperating with the prosecutor ends the game as a repentant', () => {
    const s = newGame();
    s.pending = 'fiscal';
    resolveExpediente(s, data, 'a');
    expect(s.ended?.id).toBe('arrepentido');
  });
  it('the clock stops once the game has ended', () => {
    const s = newGame();
    skipCards(s);
    setEnding(s, data, 'derrota', 40);
    const m = s.month;
    advanceMonth(s, data);
    expect(s.month).toBe(m);
  });
});

describe('front page', () => {
  it('crosses legacy and trail with concrete figures', () => {
    const s = newGame({ causes: ['vivienda', 'agua', 'empleo'] });
    s.stats.protectedHomes = 412;
    s.legacy.vivienda = 80;
    for (let i = 0; i < 6; i++) addTrail(s, data, { kind: 'cohecho', evidence: 1, visibility: 1, witnesses: [], source: 't' });
    setEnding(s, data, 'reeleccion_rastro', 53.2);
    const fp = buildFrontPage(s, data);
    expect(fp.lede[0]).toEqual({ key: 'front.legacy.vivienda', vars: { n: 412 } });
    expect(fp.lede[1]).toEqual({ key: 'front.trail.many', vars: { n: 6 } });
    expect(fp.headline.vars?.name).toBe(s.name);
  });
  it('a clean record says so', () => {
    const s = newGame();
    setEnding(s, data, 'derrota', 47);
    const fp = buildFrontPage(s, data);
    expect(fp.lede.map((l) => l.key)).toEqual(['front.legacy.none', 'front.trail.0']);
  });
  it('mentions laundered wealth and fraud-specific headline', () => {
    const s = newGame();
    s.stats.laundered = 300000;
    setEnding(s, data, 'imputacion', 51, 'fraude');
    const fp = buildFrontPage(s, data);
    expect(fp.headline.key).toBe('ending.imputacion.headline_fraude');
    expect(fp.body.some((b) => b.key === 'front.patrimony')).toBe(true);
  });
  it('headlines the cause with most relative progress', () => {
    const s = newGame({ causes: ['vivienda', 'agua', 'empleo'] });
    s.legacy.vivienda = 20;
    s.stats.protectedHomes = 120;
    s.legacy.agua = 60;
    s.stats.irrigatedHa = 750;
    expect(headlineCause(s, data)).toBe('agua');
  });
});
