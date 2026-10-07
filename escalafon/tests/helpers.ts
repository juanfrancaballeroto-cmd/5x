import { getGameData } from '../src/data/load';
import { createGame } from '../src/sim/state';
import type { GameState, Setup } from '../src/sim/types';

export const data = getGameData();

export function newGame(over: Partial<Setup> = {}): GameState {
  return createGame(data, { seed: 42, party: 'orden', causes: ['vivienda', 'agua', 'empleo'], ...over });
}

/** Disables the expediente deck so a test controls the clock alone. */
export function skipCards(state: GameState) {
  state.pending = null;
  state.queue = [];
  state.nextExpedienteMonth = 999;
}
