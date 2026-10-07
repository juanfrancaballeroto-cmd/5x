import type { GameData } from '../data/load';
import { weightedCollectives } from './economy';
import { setEnding } from './endings';
import { chance, next } from './rng';
import { log } from './state';
import type { GameState } from './types';

/** Expected vote share without noise (what the municipal poll says). 0..1 */
export function projectVote(state: GameState, data: GameData): number {
  const E = data.config.election;
  return (
    (E.imageWeight * state.image) / 100 +
    (E.collectiveWeight * weightedCollectives(state, data)) / 10 -
    (E.suspicionPenalty * state.suspicion) / 100 +
    state.fraud / 100
  );
}

export function runElection(state: GameState, data: GameData) {
  if (state.ended) return;
  const E = data.config.election;
  const noise = (next(state) * 2 - 1) * E.noise;
  const vote = Math.max(0, Math.min(1, projectVote(state, data) + noise));
  const pct = Math.round(vote * 1000) / 10;
  log(state, 'log.election', 'press', { pct });

  if (state.fraud > 0 && chance(state, state.fraud * E.fraudDiscoveryPerPoint)) {
    setEnding(state, data, 'imputacion', pct, 'fraude');
    return;
  }
  if (vote > E.threshold) setEnding(state, data, state.trail.length === 0 ? 'reeleccion_limpia' : 'reeleccion_rastro', pct);
  else setEnding(state, data, 'derrota', pct);
}
