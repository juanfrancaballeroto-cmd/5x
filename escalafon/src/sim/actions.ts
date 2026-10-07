import type { GameData } from '../data/load';
import { clampState, commitCorruption } from './effects';
import { checkEndings } from './endings';
import { log } from './state';
import type { CharacterId, GameState } from './types';

/** "Caja B" actions. Each one moves dirty money and leaves a mark in the Trail. */

export function launder(state: GameState, data: GameData): boolean {
  const L = data.config.launder;
  if (state.ended || state.blackMoney <= 0) return false;
  const amount = Math.min(L.chunk, state.blackMoney);
  state.blackMoney -= amount;
  const clean = Math.round(amount * (1 - L.fee));
  state.stats.laundered += clean;
  commitCorruption(state, data, { kind: 'blanqueo', evidence: L.evidence, visibility: L.visibility, witnesses: L.witnesses }, 'launder', amount);
  log(state, 'log.launder', 'info', { amount: clean });
  checkEndings(state, data, false);
  return true;
}

export function fundParty(state: GameState, data: GameData): boolean {
  const F = data.config.blackActions.fundParty;
  if (state.ended || state.blackMoney < F.cost) return false;
  state.blackMoney -= F.cost;
  state.power += F.power;
  commitCorruption(state, data, { kind: 'financiacion_ilegal', evidence: F.evidence, visibility: F.visibility, witnesses: F.witnesses }, 'fundParty', F.cost);
  clampState(state, data);
  log(state, 'log.fund_party', 'info');
  checkEndings(state, data, false);
  return true;
}

export function bonus(state: GameState, data: GameData, who: CharacterId): boolean {
  const B = data.config.blackActions.bonus;
  if (state.ended || state.blackMoney < B.cost || state.gone.includes(who)) return false;
  // Some people cannot be bought. That is precisely their problem.
  if (data.characters.find((c) => c.id === who)?.honest) return false;
  state.blackMoney -= B.cost;
  state.loyalties[who] += B.loyalty;
  commitCorruption(state, data, { kind: 'cohecho', evidence: B.evidence, visibility: B.visibility, witnesses: [who] }, `bonus:${who}`, B.cost);
  clampState(state, data);
  log(state, 'log.bonus', 'info', { who });
  checkEndings(state, data, false);
  return true;
}

export function campaign(state: GameState, data: GameData): boolean {
  const C = data.config.blackActions.campaign;
  if (state.ended || state.blackMoney < C.cost) return false;
  state.blackMoney -= C.cost;
  state.image += C.image;
  commitCorruption(state, data, { kind: 'financiacion_ilegal', evidence: C.evidence, visibility: C.visibility, witnesses: C.witnesses }, 'campaign', C.cost);
  clampState(state, data);
  log(state, 'log.campaign', 'info');
  checkEndings(state, data, false);
  return true;
}
