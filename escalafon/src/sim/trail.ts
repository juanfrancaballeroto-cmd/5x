import type { GameData } from '../data/load';
import { chance, pick } from './rng';
import { log } from './state';
import type { CharacterId, CrimeKind, GameState, TrailEntry } from './types';

export interface TrailInput {
  kind: CrimeKind;
  evidence: number;
  visibility: number;
  witnesses: CharacterId[];
  source: string;
  amount?: number;
}

export function addTrail(state: GameState, data: GameData, input: TrailInput): TrailEntry {
  const witnesses = input.witnesses.filter((w) => !state.gone.includes(w));
  const entry: TrailEntry = {
    id: state.trail.length + 1,
    month: state.month,
    kind: input.kind,
    source: input.source,
    amount: input.amount ?? 0,
    evidence: input.evidence,
    visibility: input.visibility,
    witnesses,
    leaked: false,
    covered: false,
  };
  state.trail.push(entry);
  // Honest witnesses lose faith every time they watch you do it.
  for (const w of witnesses) {
    const def = data.characters.find((c) => c.id === w);
    if (def?.honest) state.loyalties[w] = Math.max(0, state.loyalties[w] - data.config.loyalty.honestWitnessPenalty);
  }
  return entry;
}

/** Number of crimes on record (what the final front page counts). */
export function crimeCount(state: GameState): number {
  return state.trail.length;
}

export function openEntries(state: GameState): TrailEntry[] {
  return state.trail.filter((t) => !t.leaked && !t.covered);
}

/** Marks an entry as public and applies its consequences. */
export function leakEntry(state: GameState, data: GameData, entry: TrailEntry, by: CharacterId | 'press') {
  const L = data.config.loyalty;
  entry.leaked = true;
  state.suspicion += entry.evidence * L.leakSuspicionPerEvidence;
  state.image -= entry.evidence * L.leakImagePerEvidence;
  state.journalist.interest += entry.evidence * L.leakInterestPerEvidence;
  log(state, by === 'press' ? 'log.leak_press' : 'log.leak', 'press', { who: by, crime: entry.kind });
}

/** Monthly: disloyal witnesses may leak one of the acts they saw. */
export function tickLeaks(state: GameState, data: GameData) {
  const L = data.config.loyalty;
  for (const [who, loyalty] of Object.entries(state.loyalties) as [CharacterId, number][]) {
    if (state.gone.includes(who) || loyalty >= L.leakBelow) continue;
    const seen = openEntries(state).filter((t) => t.witnesses.includes(who));
    if (!seen.length) continue;
    if (!chance(state, L.leakChance)) continue;
    leakEntry(state, data, pick(state, seen), who);
  }
}

/**
 * When Suspicion would trigger an indictment, a fiercely loyal witness (> shieldAbove)
 * can take the blame once. Returns true if someone did.
 */
export function tryShield(state: GameState, data: GameData): boolean {
  const L = data.config.loyalty;
  const candidates = (Object.entries(state.loyalties) as [CharacterId, number][])
    .filter(([who, l]) => l > L.shieldAbove && !state.gone.includes(who))
    .filter(([who]) => state.trail.some((t) => t.witnesses.includes(who) && !t.covered))
    .sort((a, b) => b[1] - a[1]);
  if (!candidates.length) return false;
  const [who] = candidates[0];
  for (const t of state.trail) if (t.witnesses.includes(who)) t.covered = true;
  state.gone.push(who);
  state.suspicion = L.shieldSuspicionAfter;
  state.stats.shields += 1;
  log(state, 'log.shield', 'press', { who });
  return true;
}
