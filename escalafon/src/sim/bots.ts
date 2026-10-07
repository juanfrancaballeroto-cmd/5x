import type { GameData } from '../data/load';
import { CAUSE_IDS, type Effects, type OptionDef } from '../data/schemas';
import { bonus, campaign, fundParty, launder } from './actions';
import { canBuild, quote, startBuilding } from './construction';
import { toggleDecree } from './decrees';
import { getExpediente, optionAvailable, resolveExpediente } from './expedientes';
import { makeRng, next, pick, type RngHolder } from './rng';
import { createGame, legacyScore } from './state';
import { weightedCollectives } from './economy';
import { projectVote } from './election';
import { advanceMonth } from './tick';
import { crimeCount, openEntries } from './trail';
import type { CauseId, CharacterId, EndingId, GameState, Mode, PartyId } from './types';

export const STRATEGIES = ['limpio', 'moderado', 'corrupto', 'aleatorio'] as const;
export type StrategyId = (typeof STRATEGIES)[number];

/** Rough utility of an effects bundle for a player who cares about these causes. */
function scoreEffects(state: GameState, data: GameData, e: Effects | undefined): number {
  if (!e) return 0;
  let s = 0;
  for (const [k, v] of Object.entries(e.legacy ?? {})) s += (state.causes.includes(k as CauseId) ? 2 : 0.2) * (v ?? 0);
  for (const [k, v] of Object.entries(e.collectives ?? {})) {
    const w = data.collectives.find((c) => c.id === k)!.weight;
    s += (v ?? 0) * w * 25;
  }
  s += (e.image ?? 0) * 1.5 + (e.power ?? 0) * (state.power < 30 ? 1.5 : 0.5);
  s += (e.budget ?? 0) / 60000 + ((e.incomeDelta ?? 0) * 20) / 60000;
  s -= (e.suspicion ?? 0) * 0.8;
  // Upsetting someone who has seen things is expensive; so is an audit with skeletons in the closet.
  const open = openEntries(state);
  for (const [k, v] of Object.entries(e.loyalty ?? {}))
    if (open.some((t) => t.witnesses.includes(k as CharacterId))) s += (v ?? 0) * (state.loyalties[k as CharacterId] < 5 ? 4 : 1.5);
  if (e.action === 'audit') s += open.length ? -4 * open.length : 4;
  if (e.ending) s -= 1000;
  return s;
}

function scoreBuilding(state: GameState, data: GameData, id: string): number {
  const b = data.buildings.find((x) => x.id === id)!;
  return (
    scoreEffects(state, data, b.monthly) * 12 +
    scoreEffects(state, data, { ...b.complete, budget: 0 }) +
    -Math.max(0, b.cost) / 150000
  );
}

interface Policy {
  takeCorrupt(state: GameState, option: OptionDef): boolean;
  mode(state: GameState): Mode;
  reserve: number;
  caja(state: GameState, data: GameData, rng: RngHolder): void;
}

/** Nobody in the room who is about to talk. */
const safeWitnesses = (state: GameState, who: CharacterId[]) => who.every((w) => state.gone.includes(w) || state.loyalties[w] >= 4);

const policies: Record<Exclude<StrategyId, 'aleatorio'>, Policy> = {
  limpio: {
    takeCorrupt: () => false,
    mode: () => 'clean',
    reserve: 250000,
    caja: () => {},
  },
  moderado: {
    // The opportunist: dirty only when it pays and nobody is looking.
    takeCorrupt: (s, o) => s.suspicion < 20 && s.month < 44 && safeWitnesses(s, o.corrupt!.witnesses),
    mode: (s) => (s.suspicion < 15 && safeWitnesses(s, ['constructor', 'interventora']) ? 'dedo' : 'clean'),
    reserve: 200000,
    caja: (state, data) => {
      for (const [who, l] of Object.entries(state.loyalties) as [CharacterId, number][])
        if (l < 3.5 && state.trail.some((t) => t.witnesses.includes(who) && !t.leaked && !t.covered)) bonus(state, data, who);
      if (state.power < 30) fundParty(state, data);
      if (state.month >= 42 && state.suspicion < 60) campaign(state, data);
      if (state.blackMoney > 250000 && state.suspicion < 40) launder(state, data);
    },
  },
  corrupto: {
    takeCorrupt: () => true,
    mode: () => 'dedo',
    reserve: 0,
    caja: (state, data) => {
      if (state.power < 45) fundParty(state, data);
      if (state.month > 38) campaign(state, data);
      for (const [who, l] of Object.entries(state.loyalties) as [CharacterId, number][]) if (l < 3) bonus(state, data, who);
      if (state.blackMoney > 300000) launder(state, data);
    },
  },
};

function chooseOption(state: GameState, data: GameData, strategy: StrategyId, rng: RngHolder): string {
  const card = getExpediente(data, state.pending!);
  const avail = card.options.filter((o) => optionAvailable(state, o));
  if (strategy === 'aleatorio') return pick(rng, avail).id;
  const policy = policies[strategy];
  const value = (o: OptionDef) => scoreEffects(state, data, o.effects) + (o.effects.blackMoney ?? 0) / 40000;
  if (card.id === 'fiscal') {
    // The prosecutor's deal: only the cornered moderate takes it.
    if (strategy === 'moderado' && state.suspicion > 80) return 'a';
    return avail.find((o) => o.id === 'c' && state.power > 30)?.id ?? 'b';
  }
  if (card.id.startsWith('amano_') && strategy === 'moderado') {
    // Only when the poll is tight and the newspapers are quiet.
    const poll = projectVote(state, data);
    const dirty = avail.find((o) => o.corrupt);
    if (dirty && poll > 0.45 && poll < 0.51 && state.suspicion < 35) return dirty.id;
  }
  const corrupt = avail.filter((o) => o.corrupt);
  const tempting = corrupt.filter((o) => policy.takeCorrupt(state, o));
  if (tempting.length) return tempting.sort((a, b) => value(b) - value(a))[0].id;
  const clean = avail.filter((o) => !o.corrupt && !o.effects.ending);
  const pool = clean.length ? clean : avail;
  return pool.sort((a, b) => value(b) - value(a))[0].id;
}

function tryBuild(state: GameState, data: GameData, strategy: StrategyId, rng: RngHolder) {
  const empties = state.plots.filter((p) => p.status === 'empty');
  if (!empties.length) return;
  if (strategy === 'aleatorio') {
    if (next(rng) > 0.25) return;
    const plot = pick(rng, empties);
    const options = data.buildings.filter((b) => b.zones.includes(plot.zone));
    if (!options.length) return;
    const b = pick(rng, options);
    startBuilding(state, data, plot.id, b.id, next(rng) < 0.5 ? 'dedo' : 'clean');
    return;
  }
  const policy = policies[strategy];
  const mode = policy.mode(state);
  let best: { plot: string; building: string; score: number } | null = null;
  for (const plot of empties)
    for (const b of data.buildings) {
      if (!b.zones.includes(plot.zone)) continue;
      if (state.plots.filter((p) => p.building === b.id).length >= 2) continue;
      if (!canBuild(state, data, plot.id, b.id, mode).ok) continue;
      const q = quote(data, b.id, mode);
      if (q.cost > 0 && state.budget - q.cost < policy.reserve) continue;
      // Late works do not finish before the vote; only cheap licences are worth it then.
      if (state.month + q.months > data.config.time.totalMonths - 2 && q.cost > 0) continue;
      const score = scoreBuilding(state, data, b.id);
      if (score > 0 && (!best || score > best.score)) best = { plot: plot.id, building: b.id, score };
    }
  if (best) startBuilding(state, data, best.plot, best.building, mode);
}

const DECREE_FOR_CAUSE: Partial<Record<CauseId, string>> = {
  vivienda: 'limitar_pisos',
  impuestos: 'bonificar_autonomos',
  paisaje: 'zona_verde',
  empleo: 'regularizacion',
};

function setupDecrees(state: GameState, data: GameData, strategy: StrategyId, rng: RngHolder) {
  if (strategy === 'aleatorio') {
    for (const d of data.decrees) if (next(rng) < 0.3) toggleDecree(state, data, d.id);
    return;
  }
  for (const c of state.causes) {
    const d = DECREE_FOR_CAUSE[c];
    if (d && !state.decrees[d]) toggleDecree(state, data, d);
  }
  if (strategy === 'corrupto' && !state.decrees.tasa_turistica) toggleDecree(state, data, 'tasa_turistica');
}

export interface GameResult {
  seed: number;
  strategy: StrategyId;
  party: PartyId;
  causes: CauseId[];
  ending: EndingId;
  months: number;
  votePct: number | null;
  legacy: number;
  crimes: number;
  blackTotal: number;
  buildings: number;
  decisions: number;
  /** Final meters, for tuning. */
  image: number;
  suspicion: number;
  collectives: number;
  fraud: number;
  power: number;
}

export function randomSetup(seed: number) {
  const rng = makeRng(seed * 7919 + 13);
  const party: PartyId = next(rng) < 0.5 ? 'orden' : 'progreso';
  const pool = [...CAUSE_IDS];
  const causes: CauseId[] = [];
  while (causes.length < 3) causes.push(pool.splice(Math.floor(next(rng) * pool.length), 1)[0]);
  return { seed, party, causes };
}

/** Plays a whole term headless. */
export function runGame(data: GameData, seed: number, strategy: StrategyId): GameResult {
  return playGame(data, seed, strategy).result;
}

/** Same as runGame but also hands back the final state, for inspection. */
export function playGame(data: GameData, seed: number, strategy: StrategyId): { result: GameResult; state: GameState } {
  const state = createGame(data, randomSetup(seed));
  const rng = makeRng(seed + 1);
  let decisions = 0;
  setupDecrees(state, data, strategy, rng);
  let guard = 0;
  while (!state.ended && guard++ < 1000) {
    while (state.pending && !state.ended) {
      resolveExpediente(state, data, chooseOption(state, data, strategy, rng));
      decisions++;
    }
    if (state.ended) break;
    tryBuild(state, data, strategy, rng);
    if (strategy === 'aleatorio') {
      if (next(rng) < 0.1) launder(state, data);
      if (next(rng) < 0.05) fundParty(state, data);
    } else policies[strategy].caja(state, data, rng);
    if (state.ended) break;
    advanceMonth(state, data);
  }
  const result: GameResult = {
    seed,
    strategy,
    party: state.party,
    causes: state.causes,
    ending: state.ended!.id,
    months: state.ended!.month,
    votePct: state.ended!.votePct,
    legacy: legacyScore(state, data),
    crimes: crimeCount(state),
    blackTotal: state.stats.blackTotal,
    buildings: state.stats.buildingsDone,
    decisions,
    image: state.image,
    suspicion: state.suspicion,
    collectives: weightedCollectives(state, data),
    fraud: state.fraud,
    power: state.power,
  };
  return { result, state };
}
