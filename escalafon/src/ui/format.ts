import type { GameData } from '../data/load';
import type { Corrupt, Effects } from '../data/schemas';
import { describeEffects } from '../sim/effects';
import type { GameState } from '../sim/types';
import { fmtMoney, fmtNumber, t } from '../i18n';
import { h } from './dom';

const signed = (n: number, digits = 0) => (n > 0 ? '+' : '') + fmtNumber(n, digits);

/** Translates log/effect variables that hold ids into readable names. */
export function resolveVars(vars: Record<string, string | number> | undefined): Record<string, string | number> | undefined {
  if (!vars) return vars;
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(vars)) {
    if (k === 'who') out[k] = t(`char.${v}.name`);
    else if (k === 'crime') out[k] = t(`crime.${v}`);
    else if (k === 'building') out[k] = t(`building.${v}.name`);
    else if (k === 'decree') out[k] = t(`decree.${v}.name`);
    else if (k === 'amount' && typeof v === 'number') out[k] = fmtMoney(v);
    else out[k] = v;
  }
  return out;
}

/** Chips describing visible consequences of a choice. Hidden effects never get here. */
export function effectChips(state: GameState, e: Effects | undefined, corrupt?: Corrupt): HTMLElement {
  const wrap = h('div.chips');
  for (const fx of describeEffects(e)) {
    let label: string;
    let cls = fx.value > 0 ? 'up' : 'down';
    switch (fx.key) {
      case 'budget':
      case 'incomeDelta':
        label = `${t(`fx.${fx.key}`)} ${fx.value > 0 ? '+' : ''}${fmtMoney(fx.value)}`;
        break;
      case 'blackMoney':
        label = `${t('fx.blackMoney')} ${fx.value > 0 ? '+' : ''}${fmtMoney(fx.value)}`;
        cls = 'accent';
        break;
      case 'suspicion':
        label = `${t('fx.suspicion')} ${signed(fx.value)}`;
        cls = fx.value > 0 ? 'accent' : 'up';
        break;
      case 'compass':
        label = `${t('fx.compass')} ${signed(fx.value)}`;
        cls = 'neutral';
        break;
      case 'collective':
        label = `${fx.value > 0 ? '▲' : '▼'}${Math.abs(fx.value) >= 1.5 ? (fx.value > 0 ? '▲' : '▼') : ''} ${t(`coll.${fx.target}`)}`;
        break;
      case 'legacy': {
        const mine = state.causes.includes(fx.target as never);
        label = `${t('fx.legacy')}: ${t(`cause.${fx.target}.name`)} ${signed(fx.value)}`;
        if (mine) cls += ' mine';
        break;
      }
      case 'loyalty':
        label = `${t('fx.loyalty', { target: t(`char.${fx.target}.name`) })} ${signed(fx.value)}`;
        break;
      case 'build':
        label = t('fx.build', { target: t(`building.${fx.target}.name`) });
        cls = 'neutral';
        break;
      case 'delay':
        label = t('fx.delay', { value: fx.value });
        cls = 'down';
        break;
      default:
        label = `${t(`fx.${fx.key}`)} ${signed(fx.value)}`;
    }
    wrap.append(h('span.chip', { class: cls }, label));
  }
  if (corrupt) {
    const level = corrupt.visibility + corrupt.evidence >= 6 ? 3 : corrupt.visibility + corrupt.evidence >= 4 ? 2 : 1;
    wrap.append(h('span.chip.accent.risk', {}, '⚑ ' + t(`fx.risk${level}`)));
  }
  return wrap;
}

/** Monthly collective effects of a building as compact arrows, e.g. "▲ Inquilinos ▼ Propietarios". */
export function monthlyChips(data: GameData, state: GameState, buildingId: string): HTMLElement {
  const b = data.buildings.find((x) => x.id === buildingId)!;
  const wrap = h('div.chips');
  for (const [k, v] of Object.entries(b.monthly.collectives ?? {})) {
    if (!v) continue;
    const strong = Math.abs(v) >= 0.05;
    const arrow = v > 0 ? (strong ? '▲▲' : '▲') : strong ? '▼▼' : '▼';
    wrap.append(h('span.chip', { class: v > 0 ? 'up' : 'down' }, `${arrow} ${t(`coll.${k}`)}`));
  }
  for (const [k, v] of Object.entries(b.monthly.legacy ?? {})) {
    if (!v) continue;
    const mine = state.causes.includes(k as never);
    wrap.append(h('span.chip', { class: (v > 0 ? 'up' : 'down') + (mine ? ' mine' : '') }, `${v > 0 ? '★' : '☆'} ${t(`cause.${k}.name`)}`));
  }
  if (b.monthly.budget) wrap.append(h('span.chip', { class: b.monthly.budget > 0 ? 'up' : 'down' }, `${fmtMoney(b.monthly.budget)}${t('ui.per_month')}`));
  return wrap;
}
