import type { GameData } from '../data/load';
import { seedToState } from './rng';
import type { CauseId, CharacterId, CollectiveId, GameState, Setup } from './types';
import { CAUSE_IDS } from '../data/schemas';

export const SAVE_VERSION = 1;

export function createGame(data: GameData, setup: Setup): GameState {
  const { config } = data;
  if (setup.causes.length !== 3) throw new Error('Hay que elegir exactamente tres causas');
  if (new Set(setup.causes).size !== 3) throw new Error('Causas repetidas');

  const collectives = {} as Record<CollectiveId, number>;
  for (const c of data.collectives) collectives[c.id] = c.start[setup.party];

  const loyalties = {} as Record<CharacterId, number>;
  for (const ch of data.characters) loyalties[ch.id] = ch.loyalty;

  const legacy = {} as Record<CauseId, number>;
  for (const id of CAUSE_IDS) legacy[id] = 0;

  const decrees: Record<string, boolean> = {};
  for (const d of data.decrees) decrees[d.id] = false;

  return {
    version: SAVE_VERSION,
    seed: setup.seed,
    rng: seedToState(setup.seed),
    month: 0,
    party: setup.party,
    causes: [...setup.causes],
    power: config.start.power,
    image: config.start.image,
    budget: config.start.budget,
    blackMoney: config.start.blackMoney,
    suspicion: config.start.suspicion,
    compass: config.start.compass,
    fraud: 0,
    incomeDelta: 0,
    legacy,
    collectives,
    loyalties,
    gone: [],
    plots: data.map.plots.map((p) => ({
      id: p.id,
      zone: p.zone,
      building: null,
      status: 'empty',
      monthsLeft: 0,
      totalMonths: 0,
      mode: null,
    })),
    decrees,
    trail: [],
    flags: {},
    pending: null,
    queue: [],
    nextExpedienteMonth: config.expedientes.firstMonth,
    seen: {},
    journalist: { interest: 0, stage: 0, silencedUntil: -1 },
    events: [],
    lastEventMonth: -99,
    stats: {
      protectedHomes: 0,
      freeHomes: 0,
      jobs: 0,
      irrigatedHa: 0,
      taxCut: 0,
      consults: 0,
      protectedHa: 0,
      blackTotal: 0,
      laundered: 0,
      buildingsDone: 0,
      cleanContracts: 0,
      dedoContracts: 0,
      shields: 0,
    },
    log: [],
    lastBudgetDelta: 0,
    ended: null,
  };
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Legacy score: sum of progress in the player's three personal causes, capped at each goal. */
export function legacyScore(state: GameState, data: GameData): number {
  let total = 0;
  for (const id of state.causes) {
    const goal = data.causes.find((c) => c.id === id)!.goal;
    total += clamp(state.legacy[id], 0, goal);
  }
  return Math.round(total);
}

export function causesCompleted(state: GameState, data: GameData): number {
  return state.causes.filter((id) => state.legacy[id] >= data.causes.find((c) => c.id === id)!.goal).length;
}

export function log(state: GameState, key: string, tone: GameState['log'][number]['tone'] = 'info', vars?: Record<string, string | number>) {
  state.log.push({ month: state.month, key, tone, vars });
  if (state.log.length > 200) state.log.splice(0, state.log.length - 200);
}
