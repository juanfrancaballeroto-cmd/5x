import { describe, expect, it } from 'vitest';
import { deserialize, serialize } from '../src/sim/save';
import { advanceMonth } from '../src/sim/tick';
import { resolveExpediente, getExpediente } from '../src/sim/expedientes';
import { startBuilding } from '../src/sim/construction';
import { data, newGame } from './helpers';

function play(s: ReturnType<typeof newGame>, months: number) {
  for (let i = 0; i < months && !s.ended; i++) {
    if (s.pending) resolveExpediente(s, data, getExpediente(data, s.pending).options.at(-1)!.id);
    advanceMonth(s, data);
  }
}

describe('save and load', () => {
  it('round-trips the whole state', () => {
    const s = newGame({ seed: 5 });
    startBuilding(s, data, 'u1', 'hotel', 'dedo');
    play(s, 10);
    const back = deserialize(serialize(s));
    expect(back).toEqual(s);
  });
  it('a loaded game continues exactly like the original', () => {
    const a = newGame({ seed: 11 });
    play(a, 12);
    const b = deserialize(serialize(a));
    play(a, 20);
    play(b, 20);
    expect(JSON.stringify(b)).toEqual(JSON.stringify(a));
  });
  it('rejects garbage and foreign versions', () => {
    expect(() => deserialize('no soy json')).toThrow();
    expect(() => deserialize(JSON.stringify({ format: 'otra-cosa' }))).toThrow();
    const s = JSON.parse(serialize(newGame()));
    s.version = 99;
    expect(() => deserialize(JSON.stringify(s))).toThrow(/Versión/);
  });
});
