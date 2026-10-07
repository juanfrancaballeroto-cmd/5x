import type { GameData } from '../data/load';
import { CAUSE_IDS } from '../data/schemas';
import type { CauseId, PartyId, Setup } from '../sim/types';
import { t } from '../i18n';
import { h } from './dom';

export interface StartHandlers {
  start(setup: Setup): void;
  load(file: File): void;
  toggleLang(): void;
}

export function renderStartScreen(data: GameData, on: StartHandlers): HTMLElement {
  let party: PartyId = 'orden';
  const causes = new Set<CauseId>(['vivienda', 'agua', 'empleo']);
  const nameInput = h('input', { type: 'text', value: t('ui.name_default'), maxlength: 40, 'data-testid': 'name' }) as HTMLInputElement;
  const seedInput = h('input', { type: 'number', value: Math.floor(Math.random() * 99999), 'data-testid': 'seed' }) as HTMLInputElement;
  const startBtn = h('button.primary', { 'data-testid': 'start' }, t('ui.start')) as HTMLButtonElement;

  const partyCards = data.parties.map((p) =>
    h(
      'button.party-card',
      {
        'data-party': p.id,
        style: `--party:${p.color}`,
        onclick: (e: Event) => {
          party = p.id;
          for (const el of partyCards) el.classList.toggle('selected', el === e.currentTarget);
        },
      },
      h('strong', {}, t(`party.${p.id}.name`)),
      h('span', {}, t(`party.${p.id}.desc`)),
    ),
  );
  partyCards[0].classList.add('selected');

  const causeCards = CAUSE_IDS.map((c) => {
    const el = h(
      'button.cause-card',
      {
        'data-cause': c,
        onclick: () => {
          if (causes.has(c)) causes.delete(c);
          else if (causes.size < 3) causes.add(c);
          sync();
        },
      },
      h('strong', {}, t(`cause.${c}.name`)),
      h('span', {}, t(`cause.${c}.desc`)),
    );
    return el;
  });
  const sync = () => {
    causeCards.forEach((el, i) => el.classList.toggle('selected', causes.has(CAUSE_IDS[i])));
    startBtn.disabled = causes.size !== 3;
  };
  sync();

  startBtn.addEventListener('click', () => {
    if (causes.size !== 3) return;
    on.start({
      seed: Number(seedInput.value) || 1,
      name: nameInput.value.trim() || t('ui.name_default'),
      party,
      causes: [...causes],
    });
  });

  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true }) as HTMLInputElement;
  fileInput.addEventListener('change', () => fileInput.files?.[0] && on.load(fileInput.files[0]));

  return h(
    'div.start',
    {},
    h(
      'div.start-sheet',
      {},
      h('div.start-top', {}, h('div.crest', {}, 'V'), h('button.link', { onclick: () => on.toggleLang() }, t('ui.lang'))),
      h('h1', {}, t('ui.title')),
      h('h2', {}, t('ui.subtitle')),
      h('p.tagline', {}, t('ui.tagline')),
      h('label.field', {}, h('span', {}, t('ui.name')), nameInput),
      h('h3', {}, t('ui.party')),
      h('div.party-grid', {}, ...partyCards),
      h('h3', {}, t('ui.causes')),
      h('p.muted.small', {}, t('ui.causes_hint')),
      h('div.cause-grid', {}, ...causeCards),
      h(
        'div.start-actions',
        {},
        h('label.field.inline', {}, h('span', {}, t('ui.seed')), seedInput),
        h('button', { onclick: () => fileInput.click() }, t('ui.load')),
        fileInput,
        startBtn,
      ),
    ),
  );
}
