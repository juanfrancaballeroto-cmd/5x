import type { GameData } from '../data/load';
import type { Corrupt, Effects } from '../data/schemas';
import { clamp, log } from './state';
import type { CauseId, CharacterId, CollectiveId, GameState, StatId } from './types';
import { forceBuild, delayConstruction } from './construction';
import { journalistAction } from './journalist';
import { addTrail } from './trail';
import { setEnding } from './endings';

export function clampState(state: GameState, data: GameData) {
  const c = data.config;
  state.power = clamp(state.power, 0, 100);
  state.image = clamp(state.image, 0, 100);
  state.suspicion = clamp(state.suspicion, 0, c.suspicion.max);
  state.compass = clamp(state.compass, 0, 100);
  state.blackMoney = Math.max(0, state.blackMoney);
  state.journalist.interest = clamp(state.journalist.interest, 0, 100);
  for (const k of Object.keys(state.collectives) as CollectiveId[])
    state.collectives[k] = clamp(state.collectives[k], c.collectives.min, c.collectives.max);
  for (const k of Object.keys(state.loyalties) as CharacterId[]) state.loyalties[k] = clamp(state.loyalties[k], 0, 10);
}

export interface ApplyOptions {
  /** Multiplier for numeric deltas (monthly effects can be scaled). */
  scale?: number;
  /** Source label for trail entries / logs. */
  source?: string;
}

/** Applies an Effects bundle to the state. Pure data in, mutation out; all clamping happens here. */
export function applyEffects(state: GameState, data: GameData, e: Effects | undefined, opts: ApplyOptions = {}) {
  if (!e) return;
  const s = opts.scale ?? 1;
  if (e.power) state.power += e.power * s;
  if (e.image) state.image += e.image * s;
  if (e.budget) state.budget += e.budget * s;
  if (e.blackMoney) {
    state.blackMoney += e.blackMoney * s;
    if (e.blackMoney > 0) state.stats.blackTotal += e.blackMoney * s;
  }
  if (e.suspicion) state.suspicion += e.suspicion * s;
  if (e.compass) state.compass += e.compass * s;
  if (e.journalist) state.journalist.interest += e.journalist * s;
  if (e.fraud) state.fraud += e.fraud * s;
  if (e.incomeDelta) state.incomeDelta += e.incomeDelta * s;
  for (const [k, v] of Object.entries(e.collectives ?? {})) state.collectives[k as CollectiveId] += (v ?? 0) * s;
  for (const [k, v] of Object.entries(e.legacy ?? {})) state.legacy[k as CauseId] += (v ?? 0) * s;
  for (const [k, v] of Object.entries(e.loyalty ?? {})) {
    if (state.gone.includes(k as CharacterId)) continue;
    state.loyalties[k as CharacterId] += (v ?? 0) * s;
  }
  for (const [k, v] of Object.entries(e.stats ?? {})) state.stats[k as StatId] += (v ?? 0) * s;
  for (const [k, v] of Object.entries(e.flags ?? {})) state.flags[k] = v;
  for (const sc of e.schedule ?? []) state.queue.push({ id: sc.id, month: state.month + sc.delay });
  if (e.plotZone) {
    const plot = state.plots.find((p) => p.id === e.plotZone!.plot);
    if (plot) plot.zone = e.plotZone.zone;
  }
  if (e.build) forceBuild(state, data, e.build.plot, e.build.building, e.build.mode);
  if (e.delayConstruction) delayConstruction(state, e.delayConstruction.building, e.delayConstruction.months);
  if (e.action) runAction(state, data, e.action);
  if (e.ending) setEnding(state, data, e.ending);
  clampState(state, data);
}

function runAction(state: GameState, data: GameData, action: NonNullable<Effects['action']>) {
  switch (action) {
    case 'journalist_collaborate':
    case 'journalist_bribe':
      journalistAction(state, data, action);
      break;
    case 'audit': {
      const open = state.trail.filter((t) => !t.leaked && !t.covered);
      if (open.length === 0) {
        state.image += 4;
        state.suspicion -= 5;
        log(state, 'log.audit_clean', 'good');
      } else {
        state.suspicion += 3 * open.length;
        state.image -= open.length;
        log(state, 'log.audit_dirty', 'bad', { n: open.length });
      }
      break;
    }
  }
}

/** Registers a corrupt act: Trail entry, immediate Suspicion by visibility, Compass drift. */
export function commitCorruption(state: GameState, data: GameData, c: Corrupt, source: string, amount = 0) {
  addTrail(state, data, { ...c, source, amount });
  state.suspicion += c.visibility * data.config.suspicion.visibilityMultiplier;
  state.compass += data.config.compass.perCorruptAct;
  clampState(state, data);
}

/** Every key with a numeric/visible consequence, for UI previews. Hidden effects are not passed here. */
export function describeEffects(e: Effects | undefined): { key: string; value: number; target?: string }[] {
  if (!e) return [];
  const out: { key: string; value: number; target?: string }[] = [];
  const scalar = ['power', 'image', 'budget', 'blackMoney', 'suspicion', 'compass', 'incomeDelta'] as const;
  for (const k of scalar) if (e[k]) out.push({ key: k, value: e[k]! });
  for (const [k, v] of Object.entries(e.collectives ?? {})) if (v) out.push({ key: 'collective', target: k, value: v });
  for (const [k, v] of Object.entries(e.legacy ?? {})) if (v) out.push({ key: 'legacy', target: k, value: v });
  for (const [k, v] of Object.entries(e.loyalty ?? {})) if (v) out.push({ key: 'loyalty', target: k, value: v });
  if (e.build) out.push({ key: 'build', target: e.build.building, value: 1 });
  if (e.delayConstruction) out.push({ key: 'delay', target: e.delayConstruction.building, value: e.delayConstruction.months });
  return out;
}
