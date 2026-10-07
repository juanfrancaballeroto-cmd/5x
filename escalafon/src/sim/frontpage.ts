import type { GameData } from '../data/load';
import { causesCompleted, legacyScore } from './state';
import { crimeCount } from './trail';
import type { CauseId, GameState } from './types';

export interface Line {
  key: string;
  vars?: Record<string, string | number>;
}

export interface FrontPage {
  kicker: Line;
  headline: Line;
  /** "Built 412 social housing units. It cost 6 crimes and..." */
  lede: Line[];
  body: Line[];
  boxes: { label: string; value: number; kind: 'number' | 'money' | 'pct' | 'text'; accent?: boolean; text?: Line }[];
}

/** The cause with the most progress relative to its goal, among the player's three. */
export function headlineCause(state: GameState, data: GameData): CauseId | null {
  let best: CauseId | null = null;
  let bestRatio = 0;
  for (const id of state.causes) {
    const def = data.causes.find((c) => c.id === id)!;
    const ratio = state.legacy[id] / def.goal;
    if (state.stats[def.stat] > 0 && ratio > bestRatio) {
      best = id;
      bestRatio = ratio;
    }
  }
  return best;
}

/**
 * The mirror: crosses Legacy and Trail with concrete figures. No sermon, just numbers.
 * Returns translation keys so the same page renders in any language.
 */
export function buildFrontPage(state: GameState, data: GameData): FrontPage {
  const ending = state.ended;
  if (!ending) throw new Error('La partida no ha terminado');
  const name = state.name;
  const crimes = crimeCount(state);

  const lede: Line[] = [];
  const cause = headlineCause(state, data);
  if (cause) {
    const def = data.causes.find((c) => c.id === cause)!;
    const n = state.stats[def.stat];
    lede.push({ key: `front.legacy.${cause}`, vars: { n: def.stat === 'taxCut' ? Math.round(n * 10) / 10 : Math.round(n) } });
  } else lede.push({ key: 'front.legacy.none' });
  if (crimes === 0) lede.push({ key: 'front.trail.0' });
  else if (crimes === 1) lede.push({ key: 'front.trail.one' });
  else if (crimes <= 3) lede.push({ key: 'front.trail.few', vars: { n: crimes } });
  else lede.push({ key: 'front.trail.many', vars: { n: crimes } });

  const body: Line[] = [{ key: `ending.${ending.id}.body` }];
  if (state.stats.laundered > 0) body.push({ key: 'front.patrimony', vars: { amount: state.stats.laundered } });
  if (state.stats.shields > 0) body.push({ key: 'front.shield', vars: { n: state.stats.shields } });

  const headlineKey = ending.id === 'imputacion' && ending.reason === 'fraude' ? 'ending.imputacion.headline_fraude' : `ending.${ending.id}.headline`;

  return {
    kicker: { key: `ending.${ending.id}.kicker` },
    headline: { key: headlineKey, vars: { name, pct: ending.votePct ?? 0 } },
    lede,
    body,
    boxes: [
      { label: 'front.box.legacy', value: legacyScore(state, data), kind: 'number' },
      { label: 'front.box.causes', value: causesCompleted(state, data), kind: 'number' },
      { label: 'front.box.buildings', value: state.stats.buildingsDone, kind: 'number' },
      { label: 'front.box.trail', value: crimes, kind: 'number', accent: crimes > 0 },
      { label: 'front.box.black', value: state.stats.blackTotal, kind: 'money', accent: state.stats.blackTotal > 0 },
      ending.votePct === null
        ? { label: 'front.box.vote', value: 0, kind: 'text', text: { key: 'front.no_vote' } }
        : { label: 'front.box.vote', value: ending.votePct, kind: 'pct' },
      { label: 'front.box.months', value: ending.month, kind: 'number' },
    ],
  };
}
