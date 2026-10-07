import type { GameData } from '../data/load';
import { leakEntry, openEntries } from './trail';
import { log } from './state';
import type { GameState } from './types';

/**
 * Lucía, the local reporter. Her interest grows with the visibility of what is in the Trail;
 * crossing each stage threshold queues the next card of her chain.
 */
export function tickJournalist(state: GameState, data: GameData) {
  const J = data.config.journalist;
  const j = state.journalist;
  if (state.month < j.silencedUntil) return;
  // Old stories go cold: only what happened within the memory window keeps her digging.
  const recent = openEntries(state).filter((t) => state.month - t.month <= J.memoryMonths);
  const visible = recent.reduce((s, t) => s + t.visibility, 0);
  const gain = Math.min(J.maxMonthlyGain, visible * J.perVisibility);
  j.interest = Math.max(0, Math.min(100, j.interest + gain - J.decay));

  if (j.stage < J.stages.length && j.interest >= J.stages[j.stage]) {
    j.stage += 1;
    state.queue.unshift({ id: `periodista_${j.stage}`, month: state.month });
  } else if (j.stage > 0 && j.interest < J.stages[j.stage - 1] - 20) {
    // She lost the thread; she will need a new reason to come back.
    j.stage -= 1;
  }
}

export function journalistAction(state: GameState, data: GameData, action: 'journalist_collaborate' | 'journalist_bribe') {
  const j = state.journalist;
  if (action === 'journalist_bribe') {
    j.silencedUntil = state.month + data.config.journalist.silenceMonths;
    j.interest = Math.max(0, j.interest - 20);
    log(state, 'log.journalist_bribe', 'info');
    return;
  }
  // Collaborating: if there is something to find, you hand her the smallest fish.
  const open = openEntries(state).sort((a, b) => a.evidence - b.evidence);
  if (open.length === 0) {
    state.image += 4;
    j.interest -= 25;
    log(state, 'log.journalist_clean', 'good');
  } else {
    leakEntry(state, data, open[0], 'press');
    state.image += 2;
    state.compass -= 3;
    j.interest -= 30;
  }
}
