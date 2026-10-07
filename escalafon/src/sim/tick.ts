import type { GameData } from '../data/load';
import { clampState } from './effects';
import { tickConstruction } from './construction';
import { tickDecrees } from './decrees';
import { tickEconomy, tickImage, tickPower, tickSuspicion } from './economy';
import { runElection } from './election';
import { checkEndings } from './endings';
import { tickEvents } from './events';
import { tickExpedientes } from './expedientes';
import { tickJournalist } from './journalist';
import { tickLeaks } from './trail';
import type { GameState } from './types';

/** True when the clock may advance (no open folder on the desk, game not over). */
export function canAdvance(state: GameState): boolean {
  return !state.ended && !state.pending;
}

/**
 * Advances one month. Deterministic given the state (RNG lives inside it).
 * Order matters: money first, then what it buys, then what people think, then what leaks.
 */
export function advanceMonth(state: GameState, data: GameData): GameState {
  if (!canAdvance(state)) return state;
  const budgetBefore = state.budget;
  state.month += 1;

  tickEconomy(state, data);
  tickConstruction(state, data);
  tickDecrees(state, data);
  tickEvents(state, data);
  tickSuspicion(state, data);
  tickLeaks(state, data);
  tickImage(state, data);
  tickPower(state, data);
  tickJournalist(state, data);
  clampState(state, data);
  state.lastBudgetDelta = state.budget - budgetBefore;

  checkEndings(state, data, true);
  if (state.ended) return state;

  if (state.month >= data.config.time.totalMonths) {
    runElection(state, data);
    return state;
  }
  tickExpedientes(state, data);
  return state;
}
