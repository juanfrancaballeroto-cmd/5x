/** Isometric 2:1 projection helpers. Pure math, no Pixi, so they can be tested. */
export interface TileMetrics {
  width: number;
  height: number;
  heightUnit: number;
}

export function toScreen(m: TileMetrics, x: number, y: number, z = 0): { x: number; y: number } {
  return { x: ((x - y) * m.width) / 2, y: ((x + y) * m.height) / 2 - z * m.heightUnit };
}

/** Inverse of toScreen at ground level; returns fractional tile coordinates. */
export function toTile(m: TileMetrics, sx: number, sy: number): { x: number; y: number } {
  const a = sx / (m.width / 2);
  const b = sy / (m.height / 2);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

/** Ground corners of a w×h footprint: north, east, south, west (screen order: top, right, bottom, left). */
export function footprint(m: TileMetrics, x: number, y: number, w: number, h: number, z = 0) {
  return {
    n: toScreen(m, x, y, z),
    e: toScreen(m, x + w, y, z),
    s: toScreen(m, x + w, y + h, z),
    w: toScreen(m, x, y + h, z),
  };
}

/** Painter's order: things whose front corner is further down the screen are drawn later. */
export function depth(x: number, y: number, w: number, h: number): number {
  return x + w + y + h;
}

export function shade(hex: string, factor: number): number {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * factor));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * factor));
  const b = Math.min(255, Math.round((n & 255) * factor));
  return (r << 16) | (g << 8) | b;
}
