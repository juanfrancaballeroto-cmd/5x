import { describe, expect, it } from 'vitest';
import { tickDecrees, toggleDecree } from '../src/sim/decrees';
import { startEvent, tickEvents } from '../src/sim/events';
import { journalistAction, tickJournalist } from '../src/sim/journalist';
import { addTrail } from '../src/sim/trail';
import { bonus, campaign, fundParty, launder } from '../src/sim/actions';
import { tickExpedientes } from '../src/sim/expedientes';
import { weightedCollectives } from '../src/sim/economy';
import { data, newGame } from './helpers';

describe('decrees', () => {
  it('cost power to toggle and apply monthly effects only while active', () => {
    const s = newGame();
    const p = s.power;
    expect(toggleDecree(s, data, 'subir_ibi')).toBe(true);
    expect(s.power).toBe(p - data.config.power.decreeToggleCost);
    const budget = s.budget;
    const owners = s.collectives.propietarios;
    tickDecrees(s, data);
    expect(s.budget).toBeGreaterThan(budget);
    expect(s.collectives.propietarios).toBeLessThan(owners);
    toggleDecree(s, data, 'subir_ibi');
    const b2 = s.budget;
    tickDecrees(s, data);
    expect(s.budget).toBe(b2);
  });
  it('cannot be toggled without enough power', () => {
    const s = newGame();
    s.power = 2;
    expect(toggleDecree(s, data, 'zona_verde')).toBe(false);
    expect(s.decrees.zona_verde).toBe(false);
  });
});

describe('crisis events', () => {
  it('start with their card queued and expire after their duration', () => {
    const s = newGame();
    s.month = 10;
    startEvent(s, data, 'sequia');
    expect(s.events).toEqual([{ id: 'sequia', monthsLeft: 6 }]);
    expect(s.queue[0].id).toBe('crisis_sequia');
    for (let i = 0; i < 6; i++) tickEvents(s, data);
    expect(s.events.find((e) => e.id === 'sequia')).toBeUndefined();
  });
  it('a factory closure destroys jobs on impact', () => {
    const s = newGame();
    s.stats.jobs = 500;
    startEvent(s, data, 'fabrica');
    expect(s.stats.jobs).toBe(350);
  });
  it('record tourism fills the coffers each month', () => {
    const s = newGame();
    startEvent(s, data, 'turismo_record');
    const b = s.budget;
    tickEvents(s, data);
    expect(s.budget).toBeGreaterThan(b);
  });
});

describe('journalist', () => {
  it('gets interested as visible acts pile up and queues her chain', () => {
    const s = newGame();
    s.month = 3;
    for (let i = 0; i < 4; i++) addTrail(s, data, { kind: 'cohecho', evidence: 2, visibility: 5, witnesses: [], source: 't' });
    for (let i = 0; i < 10; i++) tickJournalist(s, data);
    expect(s.journalist.interest).toBeGreaterThanOrEqual(data.config.journalist.stages[0]);
    expect(s.journalist.stage).toBe(1);
    expect(s.queue[0].id).toBe('periodista_1');
  });
  it('loses interest when there is nothing to find', () => {
    const s = newGame();
    s.journalist.interest = 10;
    tickJournalist(s, data);
    expect(s.journalist.interest).toBe(9);
  });
  it('a bribe freezes her for some months', () => {
    const s = newGame();
    addTrail(s, data, { kind: 'cohecho', evidence: 2, visibility: 5, witnesses: [], source: 't' });
    journalistAction(s, data, 'journalist_bribe');
    const i = s.journalist.interest;
    tickJournalist(s, data);
    expect(s.journalist.interest).toBe(i);
  });
  it('collaborating with a clean record improves image', () => {
    const s = newGame();
    const img = s.image;
    journalistAction(s, data, 'journalist_collaborate');
    expect(s.image).toBe(img + 4);
  });
  it('collaborating with a dirty record hands her the smallest fish', () => {
    const s = newGame();
    addTrail(s, data, { kind: 'cohecho', evidence: 3, visibility: 1, witnesses: [], source: 'a' });
    addTrail(s, data, { kind: 'blanqueo', evidence: 1, visibility: 1, witnesses: [], source: 'b' });
    journalistAction(s, data, 'journalist_collaborate');
    expect(s.trail.find((t) => t.kind === 'blanqueo')!.leaked).toBe(true);
    expect(s.trail.find((t) => t.kind === 'cohecho')!.leaked).toBe(false);
  });
  it('her cards jump the queue', () => {
    const s = newGame();
    s.queue.push({ id: 'vega_4', month: 0 });
    s.queue.unshift({ id: 'periodista_1', month: 0 });
    tickExpedientes(s, data);
    expect(s.pending).toBe('periodista_1');
  });
});

describe('black money actions', () => {
  it('laundering converts dirty cash into wealth, minus the fee, and leaves a trail', () => {
    const s = newGame();
    s.blackMoney = 150000;
    expect(launder(s, data)).toBe(true);
    expect(s.blackMoney).toBe(50000);
    expect(s.stats.laundered).toBe(75000);
    expect(s.trail[0].kind).toBe('blanqueo');
  });
  it('funding the party buys power; campaigns buy image; envelopes buy loyalty', () => {
    const s = newGame();
    s.blackMoney = 1_000_000;
    const p = s.power;
    fundParty(s, data);
    expect(s.power).toBe(p + data.config.blackActions.fundParty.power);
    const img = s.image;
    campaign(s, data);
    expect(s.image).toBe(img + data.config.blackActions.campaign.image);
    const l = s.loyalties.cunado;
    bonus(s, data, 'cunado');
    expect(s.loyalties.cunado).toBe(l + data.config.blackActions.bonus.loyalty);
    expect(s.trail).toHaveLength(3);
    expect(bonus(s, data, 'interventora')).toBe(false);
  });
  it('need the cash', () => {
    const s = newGame();
    expect(fundParty(s, data)).toBe(false);
    expect(launder(s, data)).toBe(false);
  });
});

describe('collectives', () => {
  it('weighted satisfaction stays within 0..10', () => {
    const s = newGame();
    const w = weightedCollectives(s, data);
    expect(w).toBeGreaterThan(0);
    expect(w).toBeLessThan(10);
  });
});
