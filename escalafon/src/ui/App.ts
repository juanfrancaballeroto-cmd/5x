import type { GameData } from '../data/load';
import { MapView, type Manifest } from '../render/MapView';
import { startBuilding } from '../sim/construction';
import { createGame } from '../sim/state';
import { advanceMonth, canAdvance } from '../sim/tick';
import type { GameState, Mode, Setup } from '../sim/types';
import { t } from '../i18n';
import { renderBuildPanel } from './buildPanel';
import { renderExpediente } from './expediente';
import { resolveExpediente } from '../sim/expedientes';
import { cajaPanel, causesPanel, collectivesPanel, decreesPanel, logPanel, loyaltiesPanel, pressPanel, type SideHandlers } from './panels';
import { bonus, campaign, fundParty, launder } from '../sim/actions';
import { toggleDecree } from '../sim/decrees';
import { clear, h } from './dom';
import { resolveVars } from './format';
import { renderDate, renderMeters } from './topbar';

/**
 * Game controller: owns the state, the real-time clock and the DOM around the canvas.
 * The simulation is only ever touched through src/sim functions.
 */
export class App {
  state!: GameState;
  speed = 1;
  private paused = true;
  private acc = 0;
  private last = 0;
  private map = new MapView();
  private selected: string | null = null;
  private logSeen = 0;
  private el = {
    root: h('div.game'),
    top: h('header.topbar'),
    meters: h('div'),
    date: h('div.date'),
    speed: h('div.speed'),
    progress: h('div.month-progress', {}, h('span')),
    left: h('aside.side.left'),
    right: h('aside.side.right'),
    stage: h('main.stage'),
    canvasHost: h('div.canvas-host'),
    overlay: h('div.overlay'),
    toasts: h('div.toasts'),
  };

  constructor(
    private host: HTMLElement,
    private data: GameData,
    private manifest: Manifest,
    private onExit: () => void,
  ) {}

  async start(setupOrState: Setup | GameState) {
    this.state = 'plots' in setupOrState ? setupOrState : createGame(this.data, setupOrState);
    this.logSeen = this.state.log.length;
    this.buildLayout();
    await this.map.init(this.el.canvasHost, this.data, this.manifest);
    this.map.onPlotClick = (id) => this.select(id);
    this.paused = false;
    this.refresh();
    this.last = performance.now();
    requestAnimationFrame(this.loop);
    window.addEventListener('keydown', this.onKey);
    // Debug/test hook: lets automated tests drive the game without pixel hunting.
    (window as unknown as { __escalafon: App }).__escalafon = this;
  }

  private buildLayout() {
    clear(this.host);
    const e = this.el;
    e.speed.replaceChildren(
      ...[0, ...this.data.config.time.speeds].map((s) =>
        h('button.spd', { 'data-speed': s, 'data-testid': `speed-${s}`, title: s === 0 ? t('ui.pause') : `x${s}`, onclick: () => this.setSpeed(s) }, s === 0 ? '❚❚' : `x${s}`),
      ),
    );
    e.top.replaceChildren(
      h('div.brand', {}, h('strong', {}, t('ui.title')), h('span', {}, t('ui.subtitle'))),
      e.meters,
      h('div.clock', {}, e.date, e.speed),
    );
    e.stage.replaceChildren(
      e.canvasHost,
      h(
        'div.map-tools',
        {},
        h('button.icon', { title: t('ui.zoom_in'), onclick: () => this.map.zoomBy(1.2) }, '+'),
        h('button.icon', { title: t('ui.zoom_out'), onclick: () => this.map.zoomBy(1 / 1.2) }, '−'),
        h('button.icon', { title: t('ui.center'), onclick: () => this.map.centerView() }, '◎'),
      ),
      h('div.help.muted.small', {}, t('ui.help')),
      e.toasts,
      e.overlay,
    );
    e.root.replaceChildren(e.top, e.progress, e.left, e.stage, e.right);
    this.host.append(e.root);
  }

  private onKey = (ev: KeyboardEvent) => {
    if ((ev.target as HTMLElement)?.tagName === 'INPUT') return;
    if (ev.code === 'Space') {
      ev.preventDefault();
      this.setSpeed(this.paused ? this.speed || 1 : 0);
    } else if (['Digit1', 'Digit2', 'Digit3'].includes(ev.code)) this.setSpeed(Number(ev.code.slice(5)));
    else if (ev.code === 'Escape') this.select(null);
  };

  setSpeed(s: number) {
    if (s === 0) this.paused = true;
    else {
      this.speed = s;
      this.paused = false;
    }
    this.renderClock();
  }

  private loop = (now: number) => {
    if (!this.state) return;
    const dt = Math.min(250, now - this.last);
    this.last = now;
    const monthMs = this.data.config.time.monthSeconds * 1000;
    if (!this.paused && canAdvance(this.state)) {
      this.acc += dt * this.speed;
      if (this.acc >= monthMs) {
        this.acc -= monthMs;
        this.rollMonthSnapshot();
        advanceMonth(this.state, this.data);
        this.refresh();
      }
    }
    (this.el.progress.firstChild as HTMLElement).style.width = `${(this.acc / monthMs) * 100}%`;
    requestAnimationFrame(this.loop);
  };

  /** Advance one month immediately (used by tests and the debug hook). */
  stepMonth() {
    this.rollMonthSnapshot();
    advanceMonth(this.state, this.data);
    this.acc = 0;
    this.refresh();
  }

  select(plotId: string | null) {
    this.selected = plotId;
    this.map.selected = plotId;
    this.map.update(this.state);
    this.renderOverlay();
  }

  build(plotId: string, buildingId: string, mode: Mode) {
    const r = startBuilding(this.state, this.data, plotId, buildingId, mode);
    if (r.ok) this.refresh();
  }

  refresh() {
    this.el.meters.replaceChildren(renderMeters(this.data, this.state));
    this.renderClock();
    this.map.update(this.state);
    this.renderOverlay();
    this.renderSides();
    this.flushToasts();
  }

  private renderClock() {
    this.el.date.textContent = renderDate(this.data, this.state);
    for (const b of this.el.speed.querySelectorAll<HTMLElement>('.spd')) {
      const s = Number(b.dataset.speed);
      b.classList.toggle('active', this.paused ? s === 0 : s === this.speed);
    }
  }

  private prevCollectives: Record<string, number> | null = null;
  private prevMonth = -1;

  private side: SideHandlers = {
    toggleDecree: (id) => toggleDecree(this.state, this.data, id) && this.refresh(),
    launder: () => launder(this.state, this.data) && this.refresh(),
    fundParty: () => fundParty(this.state, this.data) && this.refresh(),
    campaign: () => campaign(this.state, this.data) && this.refresh(),
    bonus: (who) => bonus(this.state, this.data, who) && this.refresh(),
  };

  private renderSides() {
    this.el.left.replaceChildren(
      causesPanel(this.data, this.state),
      collectivesPanel(this.data, this.state, this.prevCollectives),
      loyaltiesPanel(this.data, this.state),
    );
    this.el.right.replaceChildren(
      pressPanel(this.state),
      decreesPanel(this.data, this.state, this.side),
      cajaPanel(this.data, this.state, this.side),
      logPanel(this.state),
    );
    // Trend arrows compare with the previous month, not the previous click.
    if (this.state.month !== this.prevMonth) {
      this.prevMonth = this.state.month;
      this.prevCollectivesNext = { ...this.state.collectives };
    }
  }
  private prevCollectivesNext: Record<string, number> | null = null;

  private rollMonthSnapshot() {
    this.prevCollectives = this.prevCollectivesNext;
  }

  choose(optionId: string) {
    if (resolveExpediente(this.state, this.data, optionId)) this.refresh();
  }

  private renderOverlay() {
    const o = this.el.overlay;
    clear(o);
    if (this.state.pending) {
      o.append(renderExpediente(this.data, this.state, (id) => this.choose(id)));
      return;
    }
    if (this.selected)
      o.append(
        renderBuildPanel(this.data, this.state, this.selected, {
          build: (p, b, m) => this.build(p, b, m),
          close: () => this.select(null),
        }),
      );
  }

  private flushToasts() {
    const fresh = this.state.log.slice(this.logSeen);
    this.logSeen = this.state.log.length;
    for (const entry of fresh.slice(-4)) {
      if (entry.tone === 'info') continue;
      const el = h('div.toast', { class: entry.tone }, t(entry.key, resolveVars(entry.vars)));
      this.el.toasts.append(el);
      setTimeout(() => el.remove(), 5000);
    }
  }

  destroy() {
    window.removeEventListener('keydown', this.onKey);
    this.map.app.destroy(true);
    this.onExit();
  }
}
