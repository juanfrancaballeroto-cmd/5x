import type { GameData } from '../data/load';
import { applyEffects } from './effects';
import { chance, weighted } from './rng';
import { log } from './state';
import type { GameState } from './types';

/** Monthly: run active crises and maybe start a new one. */
export function tickEvents(state: GameState, data: GameData) {
  for (const ev of state.events) {
    const def = data.events.find((e) => e.id === ev.id)!;
    applyEffects(state, data, def.monthly);
    ev.monthsLeft -= 1;
  }
  state.events = state.events.filter((e) => e.monthsLeft > 0);

  const E = data.config.events;
  if (state.month - state.lastEventMonth < E.minGap) return;
  if (!chance(state, E.monthlyChance)) return;
  const pool = data.events.filter((e) => state.month >= e.minMonth && !state.events.some((a) => a.id === e.id));
  const def = weighted(state, pool, (e) => e.weight);
  if (def) startEvent(state, data, def.id);
}

export function startEvent(state: GameState, data: GameData, id: string) {
  const def = data.events.find((e) => e.id === id);
  if (!def) return;
  state.events.push({ id, monthsLeft: def.duration });
  state.lastEventMonth = state.month;
  applyEffects(state, data, def.onStart);
  if (def.card) state.queue.unshift({ id: def.card, month: state.month });
  log(state, `event.${id}.name`, 'press');
}
