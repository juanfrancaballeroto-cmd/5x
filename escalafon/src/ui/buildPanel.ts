import type { GameData } from '../data/load';
import { canBuild, quote } from '../sim/construction';
import type { GameState, Mode } from '../sim/types';
import { fmtMoney, t } from '../i18n';
import { h } from './dom';
import { monthlyChips } from './format';

export interface BuildPanelHandlers {
  build(plotId: string, buildingId: string, mode: Mode): void;
  close(): void;
}

/** Side panel for a selected plot: catalogue + contract choice, or status of what stands there. */
export function renderBuildPanel(data: GameData, state: GameState, plotId: string, on: BuildPanelHandlers): HTMLElement {
  const plot = state.plots.find((p) => p.id === plotId)!;
  const head = h(
    'header.bp-head',
    {},
    h('div', {}, h('h3', {}, t(`plot.${plotId}`)), h('div.muted', {}, t(`zone.${plot.zone}`))),
    h('button.icon', { onclick: () => on.close(), 'aria-label': t('build.close'), title: t('build.close') }, '×'),
  );

  if (plot.status !== 'empty') {
    const b = plot.building!;
    return h(
      'aside.build-panel',
      { 'data-testid': 'build-panel' },
      head,
      h(
        'div.bp-status',
        {},
        h('div.swatch-row', {}, h('span.swatch', { 'data-building': b }), h('strong', {}, t(`building.${b}.name`))),
        h('p', {}, t(`building.${b}.desc`)),
        h('p', {}, plot.status === 'building' ? t('build.under', { n: plot.monthsLeft }) : t('build.built')),
        h('p', { class: plot.mode === 'dedo' ? 'accent-text' : 'muted' }, t(`build.mode.${plot.mode}`)),
        monthlyChips(data, state, b),
      ),
    );
  }

  const options = data.buildings.filter((b) => b.zones.includes(plot.zone));
  const list = h('div.bp-list');
  if (!options.length) list.append(h('p.muted', {}, t('build.none_here')));
  for (const b of options) {
    const btn = (mode: Mode) => {
      const q = quote(data, b.id, mode);
      const check = canBuild(state, data, plotId, b.id, mode);
      const money = q.cost >= 0 ? t('build.cost', { amount: fmtMoney(q.cost) }) : t('build.licence', { amount: fmtMoney(-q.cost) });
      return h(
        'button.contract',
        {
          class: mode,
          disabled: !check.ok,
          'data-testid': `build-${b.id}-${mode}`,
          title: !check.ok && check.reason === 'budget' ? t('build.no_budget') : t(`build.${mode}_hint`, { amount: fmtMoney(q.commission) }),
          onclick: () => on.build(plotId, b.id, mode),
        },
        h('span.c-mode', {}, t(`build.${mode}`)),
        h('span.c-line', {}, `${money} · ${t('build.months', { n: q.months })}`),
        mode === 'dedo' ? h('span.c-line.accent-text', {}, `+${fmtMoney(q.commission)}`) : h('span.c-line.muted', {}, ' '),
      );
    };
    list.append(
      h(
        'article.bp-item',
        {},
        h('div.swatch-row', {}, h('span.swatch', { 'data-building': b.id }), h('strong', {}, t(`building.${b.id}.name`))),
        h('p.muted.small', {}, t(`building.${b.id}.desc`)),
        monthlyChips(data, state, b.id),
        h('div.contracts', {}, btn('clean'), btn('dedo')),
      ),
    );
  }
  return h('aside.build-panel', { 'data-testid': 'build-panel' }, head, h('p.bp-intro', {}, t('build.empty')), list);
}
