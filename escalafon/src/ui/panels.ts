import type { GameData } from '../data/load';
import type { CharacterId, GameState } from '../sim/types';
import { fmtNumber, t } from '../i18n';
import { h } from './dom';

export function causesPanel(data: GameData, state: GameState): HTMLElement {
  return h(
    'section.panel',
    { 'data-testid': 'causes' },
    h('h4', {}, t('panel.causes')),
    ...state.causes.map((id) => {
      const def = data.causes.find((c) => c.id === id)!;
      const v = Math.max(0, state.legacy[id]);
      const done = v >= def.goal;
      const stat = state.stats[def.stat];
      return h(
        'div.row.cause-row',
        { title: t(`cause.${id}.desc`) },
        h('strong', {}, t(`cause.${id}.name`)),
        h('span.small', { class: done ? 'good' : 'muted' }, done ? t('cause.done') : t('cause.progress', { value: fmtNumber(v), goal: def.goal })),
        h('div.bar', { class: done ? 'done' : '' }, h('span', { style: `width:${Math.min(100, (v / def.goal) * 100)}%` })),
        h('span.stat', {}, `${fmtNumber(Math.max(0, stat), def.stat === 'taxCut' ? 1 : 0)} ${t(`stat.${def.stat}`)}`),
      );
    }),
  );
}

export function loyaltiesPanel(data: GameData, state: GameState): HTMLElement {
  const L = data.config.loyalty;
  return h(
    'section.panel',
    { 'data-testid': 'loyalties' },
    h('h4', {}, t('panel.loyalties')),
    ...data.characters.map((c) => {
      const id = c.id as CharacterId;
      const l = state.loyalties[id];
      const gone = state.gone.includes(id);
      const tag = gone
        ? h('span.tag', {}, t('loyalty.gone'))
        : l < L.leakBelow
          ? h('span.tag.leak', {}, t('loyalty.leak'))
          : l > L.shieldAbove
            ? h('span.tag.shield', {}, t('loyalty.shield'))
            : h('span.dots', { title: fmtNumber(l, 1) }, '●'.repeat(Math.round(l)) + '○'.repeat(10 - Math.round(l)));
      return h('div.loyal', { class: gone ? 'gone' : '' }, h('strong', {}, t(`char.${id}.name`)), tag, h('span.role', {}, t(`char.${id}.role`)));
    }),
  );
}
