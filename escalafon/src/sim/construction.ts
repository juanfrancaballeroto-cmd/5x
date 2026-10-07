import type { GameData } from '../data/load';
import type { BuildingDef } from '../data/schemas';
import { applyEffects, commitCorruption } from './effects';
import { log } from './state';
import type { GameState, Mode, PlotState } from './types';

export interface BuildQuote {
  cost: number;
  months: number;
  commission: number;
}

export function getBuilding(data: GameData, id: string): BuildingDef {
  const b = data.buildings.find((x) => x.id === id);
  if (!b) throw new Error(`Edificio desconocido: ${id}`);
  return b;
}

export function quote(data: GameData, buildingId: string, mode: Mode): BuildQuote {
  const b = getBuilding(data, buildingId);
  const adj = data.config.adjudication[mode];
  // Negative cost means the city collects a licence fee; the multiplier only inflates real spending.
  const cost = b.cost > 0 ? Math.round(b.cost * adj.costMult) : b.cost;
  const months = Math.max(1, Math.round(b.months * adj.timeMult));
  const commission = mode === 'dedo' ? Math.round(Math.abs(b.cost) * data.config.adjudication.dedo.commission) : 0;
  return { cost, months, commission };
}

export type BuildCheck = { ok: true } | { ok: false; reason: 'occupied' | 'zone' | 'budget' | 'ended' | 'unknown' };

export function canBuild(state: GameState, data: GameData, plotId: string, buildingId: string, mode: Mode): BuildCheck {
  if (state.ended) return { ok: false, reason: 'ended' };
  const plot = state.plots.find((p) => p.id === plotId);
  const b = data.buildings.find((x) => x.id === buildingId);
  if (!plot || !b) return { ok: false, reason: 'unknown' };
  if (plot.status !== 'empty') return { ok: false, reason: 'occupied' };
  if (!b.zones.includes(plot.zone)) return { ok: false, reason: 'zone' };
  const q = quote(data, buildingId, mode);
  if (q.cost > 0 && state.budget - q.cost < data.config.debt.allowBuildBelow) return { ok: false, reason: 'budget' };
  return { ok: true };
}

/** Player action: award a building contract on an empty plot. */
export function startBuilding(state: GameState, data: GameData, plotId: string, buildingId: string, mode: Mode): BuildCheck {
  const check = canBuild(state, data, plotId, buildingId, mode);
  if (!check.ok) return check;
  const q = quote(data, buildingId, mode);
  state.budget -= q.cost;
  begin(state, plotId, buildingId, mode, q.months);
  if (mode === 'dedo') {
    const d = data.config.adjudication.dedo;
    applyEffects(state, data, { blackMoney: q.commission });
    commitCorruption(
      state,
      data,
      { kind: 'cohecho', evidence: d.evidence, visibility: d.visibility, witnesses: d.witnesses },
      `build:${buildingId}`,
      q.commission,
    );
    state.stats.dedoContracts += 1;
    log(state, 'log.build_dedo', 'info', { building: buildingId, amount: q.commission });
  } else {
    state.stats.cleanContracts += 1;
    log(state, 'log.build_clean', 'info', { building: buildingId });
  }
  return check;
}

/** Construction ordered by an expediente: the contract is already settled, no cost, no extra trail. */
export function forceBuild(state: GameState, data: GameData, plotId: string, buildingId: string, mode: Mode) {
  const plot = state.plots.find((p) => p.id === plotId);
  if (!plot || plot.status !== 'empty') return;
  begin(state, plotId, buildingId, mode, quote(data, buildingId, mode).months);
}

function begin(state: GameState, plotId: string, buildingId: string, mode: Mode, months: number) {
  const plot = state.plots.find((p) => p.id === plotId)!;
  plot.building = buildingId;
  plot.status = 'building';
  plot.monthsLeft = months;
  plot.totalMonths = months;
  plot.mode = mode;
}

export function delayConstruction(state: GameState, buildingId: string, months: number) {
  for (const p of state.plots)
    if (p.status === 'building' && (buildingId === '*' || p.building === buildingId)) {
      p.monthsLeft += months;
      p.totalMonths += months;
    }
}

/** Monthly: advance works, complete buildings, apply running effects of finished ones. */
export function tickConstruction(state: GameState, data: GameData) {
  for (const p of state.plots) {
    if (p.status === 'building') {
      p.monthsLeft -= 1;
      if (p.monthsLeft <= 0) complete(state, data, p);
    } else if (p.status === 'built' && p.building) {
      applyEffects(state, data, getBuilding(data, p.building).monthly);
    }
  }
}

function complete(state: GameState, data: GameData, p: PlotState) {
  p.status = 'built';
  p.monthsLeft = 0;
  state.stats.buildingsDone += 1;
  applyEffects(state, data, getBuilding(data, p.building!).complete);
  log(state, 'log.build_done', 'good', { building: p.building! });
}

export function hasBuilding(state: GameState, id: string, status: 'built' | 'building' | 'any'): boolean {
  return state.plots.some((p) => p.building === id && (status === 'any' ? p.status !== 'empty' : p.status === status));
}
