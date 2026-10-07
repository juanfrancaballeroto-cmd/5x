import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { GameData } from '../data/load';
import type { PlotDef } from '../data/schemas';
import type { GameState, PlotState } from '../sim/types';
import { depth, footprint, shade, toScreen, toTile, type TileMetrics } from './iso';

export interface Manifest {
  tile: TileMetrics;
  buildings: Record<string, { color: string; sprite: string | null; anchor?: [number, number] }>;
  tiles: Record<string, { color: string; sprite: string | null }>;
  zones: Record<string, { color: string }>;
}

const ACCENT = 0xb3261e;
const INK = 0x2f4a6d;
const STROKE = { width: 1, color: 0x3b3a36, alpha: 0.35 };

type Pt = { x: number; y: number };
const flat = (...ps: Pt[]) => ps.flatMap((p) => [p.x, p.y]);

/**
 * Isometric map renderer. Reads GameState, never writes it.
 * Input is reported through onPlotClick; the camera lives entirely here.
 */
export class MapView {
  app = new Application();
  private world = new Container();
  private ground = new Container();
  private objects = new Container();
  private highlight = new Graphics();
  private textures = new Map<string, Texture>();
  private m!: TileMetrics;
  private data!: GameData;
  private manifest!: Manifest;
  private state: GameState | null = null;
  private hovered: string | null = null;
  selected: string | null = null;
  onPlotClick: (plotId: string | null) => void = () => {};
  onHover: (plotId: string | null) => void = () => {};

  async init(el: HTMLElement, data: GameData, manifest: Manifest) {
    this.data = data;
    this.manifest = manifest;
    this.m = manifest.tile;
    await this.app.init({ resizeTo: el, background: 0xe6e0d2, antialias: true, autoDensity: true, resolution: window.devicePixelRatio || 1 });
    el.appendChild(this.app.canvas);
    this.objects.sortableChildren = true;
    this.world.addChild(this.ground, this.highlight, this.objects);
    this.app.stage.addChild(this.world);
    await this.loadSprites();
    this.drawGround();
    this.centerView();
    this.bindInput(this.app.canvas);
    new ResizeObserver(() => this.centerView(false)).observe(el);
  }

  private async loadSprites() {
    const all = [...Object.entries(this.manifest.buildings), ...Object.entries(this.manifest.tiles)];
    for (const [id, def] of all) {
      if (!def.sprite) continue;
      try {
        this.textures.set(id, await Assets.load(def.sprite));
      } catch {
        console.warn(`Sprite no encontrado para ${id}: ${def.sprite}. Se usa el placeholder.`);
      }
    }
  }

  centerView(resetZoom = true) {
    const { width, height } = this.app.screen;
    const mid = toScreen(this.m, this.data.map.width / 2, this.data.map.height / 2);
    if (resetZoom) {
      const mapW = ((this.data.map.width + this.data.map.height) * this.m.width) / 2;
      this.world.scale.set(Math.max(0.6, Math.min(2, (width * 1.05) / mapW)));
    }
    const s = this.world.scale.x;
    this.world.position.set(width / 2 - mid.x * s, height / 2 - mid.y * s + 20);
  }

  zoomBy(factor: number, cx?: number, cy?: number) {
    const { width, height } = this.app.screen;
    cx ??= width / 2;
    cy ??= height / 2;
    const old = this.world.scale.x;
    const s = Math.max(0.5, Math.min(2.8, old * factor));
    const wx = (cx - this.world.x) / old;
    const wy = (cy - this.world.y) / old;
    this.world.scale.set(s);
    this.world.position.set(cx - wx * s, cy - wy * s);
  }

  private bindInput(canvas: HTMLCanvasElement) {
    let drag: { x: number; y: number; wx: number; wy: number; moved: boolean } | null = null;
    canvas.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, y: e.clientY, wx: this.world.x, wy: this.world.y, moved: false };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (drag) {
        const dx = e.clientX - drag.x;
        const dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
        if (drag.moved) {
          this.world.position.set(drag.wx + dx, drag.wy + dy);
          canvas.style.cursor = 'grabbing';
          return;
        }
      }
      const id = this.plotAt(e);
      if (id !== this.hovered) {
        this.hovered = id;
        this.drawHighlight();
        this.onHover(id);
      }
      canvas.style.cursor = id ? 'pointer' : 'grab';
    });
    canvas.addEventListener('pointerup', (e) => {
      if (drag && !drag.moved) {
        const id = this.plotAt(e);
        this.selected = id;
        this.drawHighlight();
        this.onPlotClick(id);
      }
      drag = null;
      canvas.style.cursor = 'grab';
    });
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const r = canvas.getBoundingClientRect();
        this.zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
      },
      { passive: false },
    );
  }

  private plotAt(e: { clientX: number; clientY: number }): string | null {
    const r = this.app.canvas.getBoundingClientRect();
    const s = this.world.scale.x;
    const wx = (e.clientX - r.left - this.world.x) / s;
    const wy = (e.clientY - r.top - this.world.y) / s;
    const t = toTile(this.m, wx, wy);
    const tx = Math.floor(t.x);
    const ty = Math.floor(t.y);
    const p = this.data.map.plots.find((p) => tx >= p.x && tx < p.x + p.w && ty >= p.y && ty < p.y + p.h);
    return p?.id ?? null;
  }

  /** Screen position (CSS px, relative to canvas) of a plot's top corner, for anchoring HTML popovers. */
  plotScreenPos(plotId: string): Pt | null {
    const p = this.data.map.plots.find((x) => x.id === plotId);
    if (!p) return null;
    const c = toScreen(this.m, p.x + p.w / 2, p.y + p.h / 2);
    const s = this.world.scale.x;
    return { x: this.world.x + c.x * s, y: this.world.y + c.y * s };
  }

  private drawGround() {
    const g = new Graphics();
    const { map } = this.data;
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++) {
        const kind = map.legend[map.tiles[y][x]].kind;
        const base = ['house', 'townhall', 'church'].includes(kind) ? 'plaza' : kind;
        const f = footprint(this.m, x, y, 1, 1);
        g.poly(flat(f.n, f.e, f.s, f.w)).fill(this.manifest.tiles[base].color).stroke({ width: 1, color: 0x000000, alpha: 0.06 });
        if (kind === 'field' && (x + y) % 2 === 0) {
          // Furrows, so fields read as fields at a glance.
          const a = toScreen(this.m, x + 0.2, y + 0.5);
          const b = toScreen(this.m, x + 0.8, y + 0.5);
          g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1, color: 0x8a7d4a, alpha: 0.25 });
        }
      }
    this.ground.addChild(g);
  }

  private drawHighlight() {
    const g = this.highlight;
    g.clear();
    for (const [id, width, color] of [
      [this.hovered, 2, INK],
      [this.selected, 3, INK],
    ] as const) {
      if (!id) continue;
      const p = this.data.map.plots.find((x) => x.id === id)!;
      const f = footprint(this.m, p.x, p.y, p.w, p.h);
      g.poly(flat(f.n, f.e, f.s, f.w)).stroke({ width, color, alpha: 0.9 });
    }
  }

  update(state: GameState) {
    this.state = state;
    for (const c of this.objects.removeChildren()) c.destroy();
    const { map } = this.data;
    // Decorative old town.
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++) {
        const tile = map.legend[map.tiles[y][x]];
        if (tile.height <= 0.1) continue;
        const g = new Graphics();
        this.prism(g, x + 0.12, y + 0.12, 0.76, 0.76, 0, tile.height, this.manifest.tiles[tile.kind].color);
        if (tile.kind === 'church') this.prism(g, x + 0.3, y + 0.3, 0.3, 0.3, tile.height, tile.height + 1.6, this.manifest.tiles.church.color);
        if (tile.kind === 'townhall') {
          const top = toScreen(this.m, x + 0.5, y + 0.5, tile.height);
          g.moveTo(top.x, top.y).lineTo(top.x, top.y - 18).stroke({ width: 1, color: 0x333333 });
          g.rect(top.x, top.y - 18, 9, 6).fill(0x2f4a6d);
        }
        g.zIndex = depth(x, y, 1, 1);
        this.objects.addChild(g);
      }
    for (const def of map.plots) {
      const ps = state.plots.find((p) => p.id === def.id)!;
      const g = new Graphics();
      this.drawPlot(g, def, ps);
      g.zIndex = depth(def.x, def.y, def.w, def.h);
      this.objects.addChild(g);
      if (ps.building && ps.status === 'built' && this.textures.has(ps.building)) this.addSprite(def, ps.building);
    }
    this.drawHighlight();
  }

  private addSprite(def: PlotDef, building: string) {
    const tex = this.textures.get(building)!;
    const sp = new Sprite(tex);
    const [ax, ay] = this.manifest.buildings[building].anchor ?? [0.5, 1];
    sp.anchor.set(ax, ay);
    const f = footprint(this.m, def.x, def.y, def.w, def.h);
    sp.position.set(f.s.x, f.s.y);
    sp.scale.set((f.e.x - f.w.x) / tex.width);
    sp.zIndex = depth(def.x, def.y, def.w, def.h) + 0.5;
    this.objects.addChild(sp);
  }

  private drawPlot(g: Graphics, def: PlotDef, ps: PlotState) {
    const f = footprint(this.m, def.x, def.y, def.w, def.h);
    const zoneColor = this.manifest.zones[ps.zone]?.color ?? '#dddddd';
    const ground = ps.status === 'building' ? '#cdb98c' : ps.status === 'built' ? '#d6d0c0' : zoneColor;
    g.poly(flat(f.n, f.e, f.s, f.w)).fill(ground).stroke({ width: 1, color: 0x5a5548, alpha: 0.5 });
    if (ps.status === 'empty') {
      // Survey stakes on the corners: "this is buildable".
      for (const c of [f.n, f.e, f.s, f.w]) g.circle(c.x, c.y, 2).fill(0x5a5548);
      return;
    }
    const b = this.data.buildings.find((x) => x.id === ps.building)!;
    const color = this.manifest.buildings[b.id]?.color ?? '#999999';
    if (ps.status === 'building') {
      const progress = 1 - ps.monthsLeft / Math.max(1, ps.totalMonths);
      const x = def.x + 0.2,
        y = def.y + 0.2,
        w = def.w - 0.4,
        h = def.h - 0.4;
      this.prismOutline(g, x, y, w, h, b.height);
      if (progress > 0) this.prism(g, x, y, w, h, 0, Math.max(0.15, b.height * progress), color, 0.85);
      // Progress bar floating above the works; the accent marks a hand-picked contract.
      const top = toScreen(this.m, def.x + def.w / 2, def.y + def.h / 2, b.height + 1.2);
      g.rect(top.x - 22, top.y - 3, 44, 6).fill(0xffffff).stroke({ width: 1, color: 0x333333, alpha: 0.6 });
      g.rect(top.x - 22, top.y - 3, 44 * progress, 6).fill(ps.mode === 'dedo' ? ACCENT : INK);
      return;
    }
    if (this.textures.has(b.id)) return;
    this.drawBuilding(g, b.id, def, color);
  }

  /** Placeholder silhouettes: one flat colour per type plus a distinctive massing. */
  private drawBuilding(g: Graphics, id: string, d: PlotDef, color: string) {
    const { x, y, w, h } = d;
    const P = (dx: number, dy: number, dw: number, dh: number, z1: number, c = color, z0 = 0) =>
      this.prism(g, x + dx, y + dy, dw, dh, z0, z1, c);
    switch (id) {
      case 'vivienda_protegida':
        P(0.15, 0.15, w * 0.4, h - 0.3, 3);
        P(w * 0.55, 0.15, w * 0.3, h - 0.3, 3);
        break;
      case 'bloque_libre':
        P(0.25, 0.25, w - 0.5, h - 0.5, 4.2);
        break;
      case 'hotel':
        P(0.2, 0.2, w - 0.4, h - 0.4, 1.2, '#b9b2a3');
        P(0.4, 0.4, w - 0.8, h - 0.8, 5.5, color, 1.2);
        break;
      case 'pisos_turisticos':
        P(0.15, 0.15, 0.7, 0.7, 2.2);
        P(1.1, 0.2, 0.7, 0.7, 1.8, '#e0b878');
        P(0.3, 1.1, 0.7, 0.7, 2.0, '#c99550');
        break;
      case 'polideportivo':
        P(0.15, 0.15, w - 0.3, h - 0.3, 1.1);
        P(0.4, 0.4, w - 0.8, h - 0.8, 1.15, '#7fae6d', 1.1);
        break;
      case 'centro_salud':
        P(0.2, 0.2, w - 0.4, h - 0.4, 2);
        P(w / 2 - 0.08, 0.5, 0.16, h - 1, 2.1, '#b3261e', 2);
        P(0.5, h / 2 - 0.08, w - 1, 0.16, 2.1, '#b3261e', 2);
        break;
      case 'depuradora':
        P(0.15, 0.15, 0.75, 0.75, 0.8);
        P(1.05, 1.05, 0.75, 0.75, 0.8);
        P(1.05, 0.15, 0.7, 0.7, 0.5, '#9a9488');
        break;
      case 'poligono_industrial':
        P(0.1, 0.15, w - 0.2, 0.75, 1.6);
        P(0.1, 1.05, w - 0.2, 0.75, 1.3, '#a19a8e');
        break;
      case 'regadio':
        P(0.05, 0.05, w - 0.1, h - 0.1, 0.15);
        for (let i = 1; i < 6; i++) {
          const a = toScreen(this.m, x + 0.1, y + (i * h) / 6, 0.15);
          const b2 = toScreen(this.m, x + w - 0.1, y + (i * h) / 6, 0.15);
          g.moveTo(a.x, a.y).lineTo(b2.x, b2.y).stroke({ width: 1, color: 0x4f7a3a, alpha: 0.6 });
        }
        break;
      case 'parque':
        P(0.05, 0.05, w - 0.1, h - 0.1, 0.12);
        for (const [tx, ty] of [
          [0.4, 0.4],
          [1.3, 0.5],
          [0.6, 1.3],
          [1.4, 1.4],
        ])
          if (tx < w && ty < h) P(tx - 0.15, ty - 0.15, 0.3, 0.3, 1.1, '#3f7a3c', 0.12);
        break;
      default:
        P(0.2, 0.2, w - 0.4, h - 0.4, 2);
    }
  }

  private prism(g: Graphics, x: number, y: number, w: number, h: number, z0: number, z1: number, color: string, alpha = 1) {
    const b = footprint(this.m, x, y, w, h, z0);
    const t = footprint(this.m, x, y, w, h, z1);
    g.poly(flat(b.w, b.s, t.s, t.w)).fill({ color: shade(color, 0.8), alpha }).stroke(STROKE);
    g.poly(flat(b.s, b.e, t.e, t.s)).fill({ color: shade(color, 0.64), alpha }).stroke(STROKE);
    g.poly(flat(t.n, t.e, t.s, t.w)).fill({ color: shade(color, 1.04), alpha }).stroke(STROKE);
  }

  private prismOutline(g: Graphics, x: number, y: number, w: number, h: number, z1: number) {
    const b = footprint(this.m, x, y, w, h, 0);
    const t = footprint(this.m, x, y, w, h, z1);
    const s = { width: 1, color: 0x6b5d3e, alpha: 0.7 };
    g.poly(flat(t.n, t.e, t.s, t.w)).stroke(s);
    for (const k of ['e', 's', 'w'] as const) g.moveTo(b[k].x, b[k].y).lineTo(t[k].x, t[k].y).stroke(s);
    // Scaffolding diagonals.
    g.moveTo(b.w.x, b.w.y).lineTo(t.s.x, t.s.y).stroke(s);
    g.moveTo(b.s.x, b.s.y).lineTo(t.e.x, t.e.y).stroke(s);
  }

  get currentState() {
    return this.state;
  }
}
