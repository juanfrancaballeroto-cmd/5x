import { describe, expect, it } from 'vitest';
import es from '../i18n/es.json';
import en from '../i18n/en.json';
import { data } from './helpers';
import { CAUSE_IDS, CRIME_KINDS, ENDING_IDS, STAT_IDS } from '../src/data/schemas';
import { readFileSync, readdirSync } from 'node:fs';

const ES = es as Record<string, string>;
const EN = en as Record<string, string>;

function requiredKeys(): string[] {
  const k: string[] = [];
  for (const b of data.buildings) k.push(`building.${b.id}.name`, `building.${b.id}.desc`);
  for (const d of data.decrees) k.push(`decree.${d.id}.name`, `decree.${d.id}.desc`);
  for (const c of data.collectives) k.push(`coll.${c.id}`);
  for (const c of CAUSE_IDS) k.push(`cause.${c}.name`, `cause.${c}.desc`, `front.legacy.${c}`);
  for (const ch of data.characters) k.push(`char.${ch.id}.name`, `char.${ch.id}.role`);
  for (const e of data.events) k.push(`event.${e.id}.name`, `event.${e.id}.desc`);
  for (const p of data.map.plots) k.push(`plot.${p.id}`);
  for (const p of data.parties) k.push(`party.${p.id}.name`, `party.${p.id}.desc`);
  for (const c of CRIME_KINDS) k.push(`crime.${c}`);
  for (const s of STAT_IDS) k.push(`stat.${s}`);
  for (const e of ENDING_IDS) k.push(`ending.${e}.headline`, `ending.${e}.kicker`, `ending.${e}.body`);
  for (const x of data.expedientes) {
    k.push(`exp.${x.id}.title`, `exp.${x.id}.body`);
    for (const o of x.options) k.push(`exp.${x.id}.${o.id}`);
  }
  for (let i = 0; i < 4; i++) k.push(`compass.tier${i}`);
  return k;
}

describe('texts', () => {
  it('every content id has Spanish and English text', () => {
    const missing = requiredKeys().filter((key) => !(key in ES) || !(key in EN));
    expect(missing).toEqual([]);
  });
  it('Spanish and English dictionaries have the same keys', () => {
    expect(Object.keys(EN).filter((k) => !(k in ES))).toEqual([]);
    expect(Object.keys(ES).filter((k) => !(k in EN))).toEqual([]);
  });
  it('placeholders match between languages', () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    const bad = Object.keys(ES).filter((k) => ph(ES[k]) !== ph(EN[k]));
    expect(bad).toEqual([]);
  });
  it('never use the em dash in game text or data', () => {
    const files = [
      'i18n/es.json',
      'i18n/en.json',
      ...readdirSync('data').map((f) => `data/${f}`),
    ];
    for (const f of files) expect(readFileSync(f, 'utf8').includes('—'), f).toBe(false);
  });
});
