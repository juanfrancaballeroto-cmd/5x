import type { GameData } from '../data/load';
import { compassTier } from '../sim/compass';
import { getExpediente, optionAvailable } from '../sim/expedientes';
import type { GameState } from '../sim/types';
import { fmtMoney, t } from '../i18n';
import { h } from './dom';
import { effectChips } from './format';

/** The pending decision as a manila folder. Visible effects are listed; hidden ones stay hidden. */
export function renderExpediente(data: GameData, state: GameState, onChoose: (optionId: string) => void): HTMLElement {
  const x = getExpediente(data, state.pending!);
  const number = Object.keys(state.seen).length + 1;
  const tier = compassTier(state, data);
  const urgent = x.id.startsWith('periodista') || x.id.startsWith('crisis') || x.id === 'fiscal';

  const options = x.options.map((o) => {
    const ok = optionAvailable(state, o);
    const req: string[] = [];
    if (o.requires?.budget !== undefined && state.budget < o.requires.budget) req.push(t('exp.requires_budget', { amount: fmtMoney(o.requires.budget) }));
    if (o.requires?.blackMoney !== undefined && state.blackMoney < o.requires.blackMoney) req.push(t('exp.requires_black', { amount: fmtMoney(o.requires.blackMoney) }));
    return h(
      'button.option',
      { class: o.corrupt ? 'corrupt' : '', disabled: !ok, 'data-option': o.id, 'data-testid': `option-${o.id}`, onclick: () => onChoose(o.id) },
      h('span.o-label', {}, t(`exp.${x.id}.${o.id}`)),
      o.corrupt ? h('span.o-why', {}, `${t('compass.you')} «${t(`compass.tier${tier}`)}»`) : null,
      effectChips(state, o.effects, o.corrupt),
      req.length ? h('span.o-req', {}, req.join(' · ')) : null,
    );
  });

  return h(
    'div.modal-backdrop',
    { 'data-testid': 'expediente' },
    h(
      'section.folder',
      { 'data-tab': t('exp.folder', { n: String(number).padStart(3, '0') }), 'data-id': x.id },
      urgent ? h('div.stamp', {}, t('exp.stamp')) : null,
      h('div.sheet', {}, h('h2', {}, t(`exp.${x.id}.title`)), h('p.body', {}, t(`exp.${x.id}.body`))),
      h('div.options', {}, ...options),
    ),
  );
}
