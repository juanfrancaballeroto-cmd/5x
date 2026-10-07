import { describe, expect, it } from 'vitest';
import { crossValidate, loadGameData, rawGameData } from '../src/data/load';

describe('data files', () => {
  it('validate against the zod schemas and cross references', () => {
    const data = loadGameData();
    expect(crossValidate(data)).toEqual([]);
  });
  it('meet the prototype content minimums', () => {
    const data = loadGameData();
    expect(data.buildings).toHaveLength(10);
    expect(data.decrees).toHaveLength(6);
    expect(data.collectives).toHaveLength(8);
    expect(data.expedientes.filter((x) => !x.chainOnly).length).toBeGreaterThanOrEqual(25);
    expect(data.events.map((e) => e.id).sort()).toEqual(['fabrica', 'sequia', 'tipos', 'turismo_record']);
    expect(data.map.width).toBe(14);
    expect(data.map.height).toBe(14);
    expect(data.expedientes.some((x) => x.id.startsWith('vega_'))).toBe(true);
  });
  it('rejects malformed content', () => {
    const broken = structuredClone(rawGameData) as unknown as { buildings: { cost: unknown }[] };
    broken.buildings[0].cost = 'mucho';
    expect(() => loadGameData(broken)).toThrow();
  });
  it('catches dangling references', () => {
    const broken = structuredClone(rawGameData) as unknown as { expedientes: { options: { effects: Record<string, unknown> }[] }[] };
    broken.expedientes[0].options[0].effects.schedule = [{ id: 'no_existe', delay: 1 }];
    expect(() => loadGameData(broken)).toThrow(/no_existe/);
  });
});
