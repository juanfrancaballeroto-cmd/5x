import type { GameData } from '../data/load';
import { compassTier } from '../sim/compass';
import { monthlyBalance } from '../sim/economy';
import { projectVote } from '../sim/election';
import type { GameState } from '../sim/types';
import { fmtMoney, fmtNumber, t } from '../i18n';
import { h } from './dom';

function meter(key: string, value: string, pct: number | null, opts: { accent?: boolean; sub?: string } = {}) {
  return h(
    'div.meter',
    { class: opts.accent ? 'accent' : '', title: t(`meter.${key}.hint`), 'data-meter': key },
    h('div.m-label', {}, t(`meter.${key}`)),
    h('div.m-value', {}, value),
    pct === null ? h('div.m-sub', {}, opts.sub ?? '') : h('div.m-bar', {}, h('span', { style: `width:${Math.max(0, Math.min(100, pct))}%` })),
  );
}

export function renderMeters(data: GameData, state: GameState): HTMLElement {
  const delta = monthlyBalance(state, data);
  const tier = compassTier(state, data);
  const vote = projectVote(state, data) * 100;
  return h(
    'div.meters',
    {},
    meter('power', fmtNumber(state.power), state.power),
    meter('image', fmtNumber(state.image), state.image),
    meter('budget', fmtMoney(state.budget), null, { sub: `${state.lastBudgetDelta >= 0 ? '+' : ''}${fmtMoney(state.lastBudgetDelta || delta)}${t('ui.per_month')}` }),
    meter('blackMoney', fmtMoney(state.blackMoney), null, { accent: true, sub: state.stats.laundered ? `${t('caja.patrimony')}: ${fmtMoney(state.stats.laundered)}` : '' }),
    meter('suspicion', fmtNumber(state.suspicion), state.suspicion, { accent: true }),
    h(
      'div.meter.compass',
      { title: t('meter.compass.hint'), 'data-meter': 'compass' },
      h('div.m-label', {}, t('meter.compass')),
      h('div.compass-bar', {}, h('span.compass-mark', { style: `left:${state.compass}%` })),
      h('div.compass-ends', {}, h('span', {}, t('compass.left')), h('span', {}, t('compass.right'))),
      h('div.compass-quote', {}, `«${t(`compass.tier${tier}`)}»`),
    ),
    h('div.meter.poll', { title: t('ui.poll') }, h('div.m-label', {}, t('ui.poll')), h('div.m-value', { class: vote >= 50 ? 'good' : 'bad' }, `${fmtNumber(vote, 1)}%`)),
  );
}

export function renderDate(data: GameData, state: GameState): string {
  const m = state.month;
  const monthName = t(`months.${m % 12}`);
  const year = data.config.time.startYear + Math.floor(m / 12);
  return `${t('ui.month', { n: m, total: data.config.time.totalMonths })} · ${t('ui.date', { month: monthName, year })}`;
}
