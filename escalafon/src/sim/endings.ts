import type { GameData } from '../data/load';
import { chance } from './rng';
import { log } from './state';
import { tryShield } from './trail';
import type { EndingId, GameState } from './types';

export function setEnding(state: GameState, _data: GameData, id: EndingId, votePct: number | null = null, reason?: string) {
  if (state.ended) return;
  state.ended = { id, month: state.month, votePct, reason };
  state.pending = null;
  log(state, `ending.${id}.headline`, 'press');
}

/** Checks the non-electoral endings. Called at the end of each month and after each decision. */
export function checkEndings(state: GameState, data: GameData, monthly: boolean) {
  if (state.ended) return;
  const c = data.config;
  if (state.suspicion >= c.suspicion.max) {
    if (!tryShield(state, data)) setEnding(state, data, 'imputacion');
    return;
  }
  if (state.power <= 0) {
    setEnding(state, data, 'expulsion');
    return;
  }
  if (
    monthly &&
    state.suspicion >= c.scapegoat.suspicion &&
    state.power < c.scapegoat.power &&
    chance(state, c.scapegoat.chance)
  ) {
    setEnding(state, data, 'cabeza_turco');
  }
}
