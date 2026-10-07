import type { GameData } from '../data/load';
import type { GameState } from './types';

/** Brújula tier 0..3: "Es solo esta vez" → "Me lo he ganado". */
export function compassTier(state: Pick<GameState, 'compass'>, data: GameData): number {
  const tiers = data.config.compass.tiers;
  let tier = 0;
  for (let i = 0; i < tiers.length; i++) if (state.compass >= tiers[i]) tier = i;
  return tier;
}
