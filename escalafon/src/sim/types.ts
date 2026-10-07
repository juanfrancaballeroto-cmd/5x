import type { z } from 'zod';
import type {
  CauseId,
  CharacterId,
  CollectiveId,
  CrimeKind,
  EndingId,
  PartyId,
  StatId,
  ZoneId,
} from '../data/schemas';

export type PartyId = z.infer<typeof PartyId>;
export type CauseId = z.infer<typeof CauseId>;
export type CollectiveId = z.infer<typeof CollectiveId>;
export type CharacterId = z.infer<typeof CharacterId>;
export type StatId = z.infer<typeof StatId>;
export type ZoneId = z.infer<typeof ZoneId>;
export type CrimeKind = z.infer<typeof CrimeKind>;
export type EndingId = z.infer<typeof EndingId>;
export type Mode = 'clean' | 'dedo';

export interface PlotState {
  id: string;
  zone: ZoneId;
  building: string | null;
  status: 'empty' | 'building' | 'built';
  monthsLeft: number;
  totalMonths: number;
  mode: Mode | null;
}

export interface TrailEntry {
  id: number;
  month: number;
  kind: CrimeKind;
  source: string;
  amount: number;
  evidence: number;
  visibility: number;
  witnesses: CharacterId[];
  leaked: boolean;
  /** A loyal character took the blame for it. */
  covered: boolean;
}

export interface LogEntry {
  month: number;
  key: string;
  vars?: Record<string, string | number>;
  tone: 'info' | 'good' | 'bad' | 'press';
}

export interface ActiveEvent {
  id: string;
  monthsLeft: number;
}

export interface JournalistState {
  interest: number;
  stage: number;
  silencedUntil: number;
}

export interface Ending {
  id: EndingId;
  month: number;
  votePct: number | null;
  reason?: string;
}

export interface GameStats {
  protectedHomes: number;
  freeHomes: number;
  jobs: number;
  irrigatedHa: number;
  taxCut: number;
  consults: number;
  protectedHa: number;
  blackTotal: number;
  laundered: number;
  buildingsDone: number;
  cleanContracts: number;
  dedoContracts: number;
  shields: number;
}

export interface GameState {
  version: number;
  seed: number;
  rng: number;
  name: string;
  month: number;
  party: PartyId;
  causes: CauseId[];
  power: number;
  image: number;
  budget: number;
  blackMoney: number;
  suspicion: number;
  compass: number;
  fraud: number;
  incomeDelta: number;
  legacy: Record<CauseId, number>;
  collectives: Record<CollectiveId, number>;
  loyalties: Record<CharacterId, number>;
  /** Characters that already took the fall for you and left the scene. */
  gone: CharacterId[];
  plots: PlotState[];
  decrees: Record<string, boolean>;
  trail: TrailEntry[];
  flags: Record<string, number>;
  pending: string | null;
  queue: { id: string; month: number }[];
  nextExpedienteMonth: number;
  seen: Record<string, number>;
  journalist: JournalistState;
  events: ActiveEvent[];
  lastEventMonth: number;
  stats: GameStats;
  log: LogEntry[];
  lastBudgetDelta: number;
  ended: Ending | null;
}

export interface Setup {
  seed: number;
  name?: string;
  party: PartyId;
  causes: CauseId[];
}
