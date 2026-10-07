import type { GameData } from '../data/load';
import { buildFrontPage, type Line } from '../sim/frontpage';
import type { GameState } from '../sim/types';
import { fmtMoney, fmtNumber, t } from '../i18n';
import { h } from './dom';

const tr = (l: Line) => {
  const vars = { ...(l.vars ?? {}) };
  if (typeof vars.amount === 'number') vars.amount = fmtMoney(vars.amount);
  if (typeof vars.n === 'number') vars.n = fmtNumber(vars.n, 1);
  return t(l.key, vars);
};

export function renderFrontPage(data: GameData, state: GameState, on: { again(): void; close(): void }): HTMLElement {
  const fp = buildFrontPage(state, data);
  const year = data.config.time.startYear + Math.floor(state.ended!.month / 12);
  const date = `${t(`months.${state.ended!.month % 12}`)} ${year}`;
  return h(
    'div.front-wrap',
    { 'data-testid': 'front-page', 'data-ending': state.ended!.id },
    h(
      'article.front',
      {},
      h(
        'header.masthead',
        {},
        h('strong', {}, t('press.name')),
        h('div.meta', {}, h('span', {}, t('press.motto')), h('span', {}, date), h('span', {}, t('press.price'))),
      ),
      h('div.kicker', {}, tr(fp.kicker)),
      h('h1', {}, tr(fp.headline)),
      h('p.lede', {}, fp.lede.map(tr).join(' ')),
      h(
        'div.grid',
        {},
        h('div', {}, h('div.byline', {}, t('press.byline')), h('div.body', {}, ...fp.body.map((l) => h('p', {}, tr(l))), h('p', {}, t('press.lorem')))),
        h(
          'aside.boxes',
          {},
          ...fp.boxes.map((b) =>
            h(
              'div.box',
              { class: b.accent ? 'accent' : '' },
              h('span', {}, t(b.label)),
              h('b', {}, b.kind === 'money' ? fmtMoney(b.value) : b.kind === 'pct' ? `${fmtNumber(b.value, 1)}%` : b.kind === 'text' ? tr(b.text!) : fmtNumber(b.value)),
            ),
          ),
        ),
      ),
      h(
        'div.actions',
        {},
        h('button', { onclick: () => on.close() }, t('front.close')),
        h('button.primary', { 'data-testid': 'again', onclick: () => on.again() }, t('front.again')),
      ),
    ),
  );
}
