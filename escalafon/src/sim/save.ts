import { z } from 'zod';
import { SAVE_VERSION } from './state';
import type { GameState } from './types';

/**
 * Save files are plain JSON. The schema checks shape and version, not game logic:
 * a hand-edited save is the player's business.
 */
const SaveSchema = z.object({
  format: z.literal('escalafon-save'),
  version: z.number().int(),
  savedAt: z.string(),
  state: z
    .object({
      version: z.number(),
      seed: z.number(),
      rng: z.number(),
      month: z.number(),
      party: z.enum(['orden', 'progreso']),
      causes: z.array(z.string()).length(3),
      power: z.number(),
      image: z.number(),
      budget: z.number(),
      blackMoney: z.number(),
      suspicion: z.number(),
      compass: z.number(),
      plots: z.array(z.object({ id: z.string(), status: z.enum(['empty', 'building', 'built']) }).loose()),
      trail: z.array(z.object({ id: z.number(), kind: z.string() }).loose()),
      collectives: z.record(z.string(), z.number()),
      loyalties: z.record(z.string(), z.number()),
      legacy: z.record(z.string(), z.number()),
    })
    .loose(),
});

export function serialize(state: GameState): string {
  return JSON.stringify({ format: 'escalafon-save', version: SAVE_VERSION, savedAt: new Date().toISOString(), state }, null, 2);
}

export function deserialize(json: string): GameState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('El archivo no es JSON válido');
  }
  const save = SaveSchema.parse(parsed);
  if (save.version !== SAVE_VERSION) throw new Error(`Versión de guardado no compatible: ${save.version}`);
  return save.state as unknown as GameState;
}
