import type { GameData } from '../data/load';
import { applyEffects } from './effects';
import { log } from './state';
import type { GameState } from './types';

/** Toggling an ordinance costs Power: every change needs a plenary session. */
export function toggleDecree(state: GameState, data: GameData, id: string): boolean {
  if (state.ended || !(id in state.decrees)) return false;
  const cost = data.config.power.decreeToggleCost;
  if (state.power <= cost) return false;
  state.decrees[id] = !state.decrees[id];
  state.power -= cost;
  log(state, state.decrees[id] ? 'log.decree_on' : 'log.decree_off', 'info', { decree: id });
  return true;
}

export function tickDecrees(state: GameState, data: GameData) {
  for (const d of data.decrees) if (state.decrees[d.id]) applyEffects(state, data, d.monthly);
}
