import type { GameData } from '../data/load';
import { clampState } from './effects';
import type { CollectiveId, GameState } from './types';

/** Weighted collective satisfaction, 0..10. */
export function weightedCollectives(state: GameState, data: GameData): number {
  let sum = 0;
  let w = 0;
  for (const c of data.collectives) {
    sum += state.collectives[c.id] * c.weight;
    w += c.weight;
  }
  return sum / w;
}

export function monthlyBalance(state: GameState, data: GameData): number {
  return data.config.economy.baseIncome + state.incomeDelta - data.config.economy.baseExpense;
}

/** Base budget flow, debt penalties, collective memory decay. */
export function tickEconomy(state: GameState, data: GameData) {
  const c = data.config;
  state.budget += monthlyBalance(state, data);
  if (state.budget < 0) {
    state.image -= c.economy.debtImagePenalty;
    state.power -= c.economy.debtPowerPenalty;
  }
  const { neutral, reversion } = c.collectives;
  for (const id of Object.keys(state.collectives) as CollectiveId[])
    state.collectives[id] += (neutral - state.collectives[id]) * reversion;
  clampState(state, data);
}

/** Image drifts toward what the collectives feel, minus what the town suspects. */
export function tickImage(state: GameState, data: GameData) {
  const I = data.config.image;
  const target = weightedCollectives(state, data) * I.collectiveScale - state.suspicion * I.suspicionPenalty;
  state.image += (target - state.image) * I.inertia;
}

/** The party rewards popularity and punishes scandal. */
export function tickPower(state: GameState, data: GameData) {
  const P = data.config.power;
  state.power += (state.image - 50) * P.imageFactor;
  if (state.suspicion > P.suspicionThreshold) state.power -= (state.suspicion - P.suspicionThreshold) * P.suspicionFactor;
}

/** Suspicion decays one point a month, but unlaundered cash under the mattress keeps it warm. */
export function tickSuspicion(state: GameState, data: GameData) {
  const S = data.config.suspicion;
  state.suspicion += state.blackMoney / S.blackMoneyPerPoint;
  state.suspicion -= S.monthlyDecay;
}
