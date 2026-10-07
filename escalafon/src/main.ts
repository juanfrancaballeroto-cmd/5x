import './ui/styles.css';
import { getGameData } from './data/load';
import type { Manifest } from './render/MapView';
import { deserialize } from './sim/save';
import { getLang, setLang, t } from './i18n';
import { App } from './ui/App';
import { renderStartScreen } from './ui/startScreen';

const root = document.querySelector<HTMLElement>('#app')!;
const data = getGameData();

async function loadManifest(): Promise<Manifest> {
  const res = await fetch('./manifest.json');
  if (!res.ok) throw new Error('No se pudo cargar assets/manifest.json');
  return res.json();
}

/** Placeholder colours become CSS so HTML swatches match the prisms on the map. */
function injectSwatchStyles(manifest: Manifest) {
  const css = Object.entries(manifest.buildings)
    .map(([id, b]) => `.swatch[data-building="${id}"]{background:${b.color}}`)
    .join('\n');
  document.head.append(Object.assign(document.createElement('style'), { textContent: css }));
}

let app: App | null = null;

function showStart(manifest: Manifest) {
  app = null;
  root.replaceChildren(
    renderStartScreen(data, {
      start: (setup) => launch(manifest, setup),
      load: async (file) => {
        try {
          launch(manifest, deserialize(await file.text()));
        } catch (e) {
          alert(t('ui.load_error', { error: (e as Error).message }));
        }
      },
      toggleLang: () => {
        setLang(getLang() === 'es' ? 'en' : 'es');
        showStart(manifest);
      },
    }),
  );
}

function launch(manifest: Manifest, from: Parameters<App['start']>[0]) {
  app = new App(root, data, manifest, () => showStart(manifest));
  void app.start(from);
}

loadManifest().then((manifest) => {
  injectSwatchStyles(manifest);
  const params = new URLSearchParams(location.search);
  if (params.get('lang') === 'en') setLang('en');
  // ?autostart=1&seed=7 skips the start screen (handy for tests and quick iterations).
  if (params.get('autostart')) {
    launch(manifest, {
      seed: Number(params.get('seed') ?? 1),
      party: params.get('party') === 'progreso' ? 'progreso' : 'orden',
      causes: ['vivienda', 'agua', 'empleo'],
      name: t('ui.name_default'),
    });
  } else showStart(manifest);
});
