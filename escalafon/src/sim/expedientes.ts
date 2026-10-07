import type { GameData } from '../data/load';
import type { Condition, ExpedienteDef, OptionDef } from '../data/schemas';
import { applyEffects, commitCorruption } from './effects';
import { checkEndings } from './endings';
import { hasBuilding } from './construction';
import { int, weighted } from './rng';
import type { GameState } from './types';

export function getExpediente(data: GameData, id: string): ExpedienteDef {
  const x = data.expedientes.find((e) => e.id === id);
  if (!x) throw new Error(`Expediente desconocido: ${id}`);
  return x;
}

export function conditionMet(state: GameState, _data: GameData, w: Condition): boolean {
  if (w.minMonth !== undefined && state.month < w.minMonth) return false;
  if (w.maxMonth !== undefined && state.month > w.maxMonth) return false;
  if (w.cause && !state.causes.includes(w.cause)) return false;
  if (w.party && state.party !== w.party) return false;
  for (const [k, v] of Object.entries(w.flags ?? {})) if ((state.flags[k] ?? 0) !== v) return false;
  for (const k of w.notFlags ?? []) if (state.flags[k] !== undefined) return false;
  if (w.building && !hasBuilding(state, w.building.id, w.building.status)) return false;
  if (w.decree && !state.decrees[w.decree]) return false;
  if (w.minSuspicion !== undefined && state.suspicion < w.minSuspicion) return false;
  if (w.maxSuspicion !== undefined && state.suspicion > w.maxSuspicion) return false;
  if (w.minTrail !== undefined && state.trail.length < w.minTrail) return false;
  if (w.minBlackMoney !== undefined && state.blackMoney < w.minBlackMoney) return false;
  if (w.minBudget !== undefined && state.budget < w.minBudget) return false;
  if (w.anyConstruction && !state.plots.some((p) => p.status === 'building')) return false;
  return true;
}

export function eligible(state: GameState, data: GameData): ExpedienteDef[] {
  return data.expedientes.filter((x) => {
    if (x.chainOnly) return false;
    if (state.seen[x.id] !== undefined && !x.repeatable) return false;
    if (x.repeatable && state.seen[x.id] !== undefined && state.month - state.seen[x.id] < 6) return false;
    return conditionMet(state, data, x.when);
  });
}

function show(state: GameState, data: GameData, id: string) {
  state.pending = id;
  const x = getExpediente(data, id);
  if (x.onShow) applyEffects(state, data, x.onShow);
}

/** Monthly: chained cards first (journalist, crises, plots), then the regular deck. */
export function tickExpedientes(state: GameState, data: GameData) {
  if (state.pending || state.ended) return;
  const dueIdx = state.queue.findIndex((q) => q.month <= state.month);
  if (dueIdx >= 0) {
    const [due] = state.queue.splice(dueIdx, 1);
    show(state, data, due.id);
    return;
  }
  if (state.month < state.nextExpedienteMonth) return;
  const card = weighted(state, eligible(state, data), (x) => x.weight);
  const E = data.config.expedientes;
  state.nextExpedienteMonth = state.month + int(state, E.minGap, E.maxGap);
  if (card) show(state, data, card.id);
}

export function optionAvailable(state: GameState, o: OptionDef): boolean {
  if (o.requires?.budget !== undefined && state.budget < o.requires.budget) return false;
  if (o.requires?.blackMoney !== undefined && state.blackMoney < o.requires.blackMoney) return false;
  return true;
}

export function isCorruptOption(o: OptionDef): boolean {
  return !!o.corrupt;
}

/** Player decision on the pending card. Returns false if the option cannot be taken. */
export function resolveExpediente(state: GameState, data: GameData, optionId: string): boolean {
  if (!state.pending || state.ended) return false;
  const x = getExpediente(data, state.pending);
  const o = x.options.find((op) => op.id === optionId);
  if (!o || !optionAvailable(state, o)) return false;
  state.seen[x.id] = state.month;
  state.pending = null;
  applyEffects(state, data, o.effects, { source: x.id });
  applyEffects(state, data, o.hidden, { source: x.id });
  if (o.corrupt) commitCorruption(state, data, o.corrupt, `exp:${x.id}`, Math.max(0, o.effects.blackMoney ?? 0));
  checkEndings(state, data, false);
  return true;
}
