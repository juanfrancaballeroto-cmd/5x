import type { GameData } from '../data/load';
import type { CharacterId, GameState } from '../sim/types';
import { fmtMoney, fmtNumber, t } from '../i18n';
import { h } from './dom';
import { resolveVars } from './format';

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

export function collectivesPanel(data: GameData, state: GameState, prev: Record<string, number> | null): HTMLElement {
  return h(
    'section.panel',
    { 'data-testid': 'collectives' },
    h('h4', {}, t('panel.collectives')),
    ...data.collectives.map((c) => {
      const v = state.collectives[c.id];
      const d = prev ? v - prev[c.id] : 0;
      const trend = Math.abs(d) < 0.01 ? '' : d > 0 ? '▲' : '▼';
      return h(
        'div.row.coll',
        { style: `--c:${c.color}`, title: `${Math.round(c.weight * 100)}%` },
        h('span', {}, t(`coll.${c.id}`), ' ', h('span.trend', { class: d > 0 ? 'good' : 'bad' }, trend)),
        h('span.small', {}, fmtNumber(v, 1)),
        h('div.bar', {}, h('span', { style: `width:${v * 10}%` })),
      );
    }),
  );
}

export interface SideHandlers {
  toggleDecree(id: string): void;
  launder(): void;
  fundParty(): void;
  campaign(): void;
  bonus(who: CharacterId): void;
}

export function decreesPanel(data: GameData, state: GameState, on: SideHandlers): HTMLElement {
  const cost = data.config.power.decreeToggleCost;
  return h(
    'section.panel',
    { 'data-testid': 'decrees' },
    h('h4', {}, t('panel.decrees')),
    h('p.muted.small', {}, t('decree.cost', { n: cost })),
    ...data.decrees.map((d) => {
      const on_ = state.decrees[d.id];
      return h(
        'div.decree',
        {},
        h('strong.small', {}, t(`decree.${d.id}.name`)),
        h('button.toggle', {
          class: on_ ? 'on' : '',
          'aria-pressed': on_ ? 'true' : 'false',
          'data-testid': `decree-${d.id}`,
          disabled: state.power <= cost || !!state.ended,
          title: t(`decree.${d.id}.name`),
          onclick: () => on.toggleDecree(d.id),
        }),
        h('p', {}, t(`decree.${d.id}.desc`)),
        decreeChips(d.monthly),
      );
    }),
  );
}

function decreeChips(m: GameData['decrees'][number]['monthly']): HTMLElement {
  const wrap = h('div.chips');
  for (const [k, v] of Object.entries(m.collectives ?? {}))
    if (v) wrap.append(h('span.chip', { class: v > 0 ? 'up' : 'down' }, `${v > 0 ? '▲' : '▼'} ${t(`coll.${k}`)}`));
  for (const [k, v] of Object.entries(m.legacy ?? {}))
    if (v) wrap.append(h('span.chip', { class: v > 0 ? 'up' : 'down' }, `${v > 0 ? '★' : '☆'} ${t(`cause.${k}.name`)}`));
  if (m.budget) wrap.append(h('span.chip', { class: m.budget > 0 ? 'up' : 'down' }, `${fmtMoney(m.budget)}${t('ui.per_month')}`));
  return wrap;
}

export function cajaPanel(data: GameData, state: GameState, on: SideHandlers): HTMLElement {
  const L = data.config.launder;
  const B = data.config.blackActions;
  const ended = !!state.ended;
  const select = h(
    'select',
    { 'data-testid': 'bonus-who' },
    ...data.characters.filter((c) => !state.gone.includes(c.id)).map((c) => h('option', { value: c.id }, t(`char.${c.id}.name`))),
  ) as HTMLSelectElement;
  return h(
    'section.panel.caja',
    { 'data-testid': 'caja' },
    h('h4', {}, t('panel.caja'), h('span', {}, `${t('caja.patrimony')}: ${fmtMoney(state.stats.laundered)}`)),
    h('div.total', {}, fmtMoney(state.blackMoney)),
    state.blackMoney <= 0 ? h('p.small', { style: 'color:#aaa;margin:4px 0' }, t('caja.empty')) : null,
    h(
      'button',
      { disabled: ended || state.blackMoney <= 0, 'data-testid': 'launder', onclick: () => on.launder() },
      t('caja.launder'),
      h('span.hint', {}, t('caja.launder_hint', { amount: fmtMoney(L.chunk), fee: Math.round(L.fee * 100) })),
    ),
    h(
      'button',
      { disabled: ended || state.blackMoney < B.fundParty.cost, onclick: () => on.fundParty() },
      t('caja.fund'),
      h('span.hint', {}, t('caja.fund_hint', { cost: fmtMoney(B.fundParty.cost), power: B.fundParty.power })),
    ),
    h(
      'button',
      { disabled: ended || state.blackMoney < B.campaign.cost, onclick: () => on.campaign() },
      t('caja.campaign'),
      h('span.hint', {}, t('caja.campaign_hint', { cost: fmtMoney(B.campaign.cost), image: B.campaign.image })),
    ),
    select,
    h(
      'button',
      { disabled: ended || state.blackMoney < B.bonus.cost, onclick: () => on.bonus(select.value as CharacterId) },
      t('caja.bonus'),
      h('span.hint', {}, t('caja.bonus_hint', { cost: fmtMoney(B.bonus.cost), loyalty: B.bonus.loyalty })),
    ),
  );
}

/** The local paper fills up as Suspicion rises: blank columns turn into headlines. */
export function pressPanel(state: GameState): HTMLElement {
  const fillerCount = 8;
  const filled = Math.min(fillerCount, Math.floor((state.suspicion / 100) * fillerCount + 0.5));
  const news = state.log.filter((e) => e.tone === 'press').slice(-4).reverse();
  const items: HTMLElement[] = [];
  for (const ev of state.events)
    items.push(h('div.item.hot', {}, h('b', {}, t(`event.${ev.id}.name`)), h('p', {}, t(`event.${ev.id}.desc`))));
  for (const n of news)
    items.push(h('div.item.hot', {}, h('b', {}, t(n.key, resolveVars(n.vars))), h('small', {}, t('press.byline'))));
  for (let i = 0; i < fillerCount; i++) {
    if (i < filled) items.push(h('div.item', { class: i >= 4 ? 'hot' : '' }, h('b', {}, t(`press.filler.${i}`)), i >= 2 ? h('p', {}, t('press.lorem')) : null));
    else items.push(h('div.blank'));
  }
  if (!news.length && !filled && !state.events.length) items.unshift(h('div.item', {}, h('b', {}, t('press.calm'))));
  return h(
    'section.panel',
    { 'data-testid': 'press' },
    h(
      'div.paper',
      {},
      h('div.masthead', {}, h('strong', {}, t('press.name')), h('span', {}, `${t('press.motto')} · ${t('press.price')}`)),
      h('div.cols', {}, ...items),
      h('div.interest', {}, `${t('press.interest')}: ${fmtNumber(state.journalist.interest)}%`),
    ),
  );
}

export function logPanel(state: GameState): HTMLElement {
  const items = state.log.slice(-14).reverse();
  return h(
    'section.panel',
    {},
    h('h4', {}, t('panel.log')),
    h(
      'ul.log-list',
      {},
      ...items.map((e) => h('li', { class: e.tone }, h('span.m', {}, String(e.month)), t(e.key, resolveVars(e.vars)))),
    ),
  );
}
