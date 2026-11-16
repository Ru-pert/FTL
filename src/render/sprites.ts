// Pixelgrafik, die per Code erzeugt wird: Rumpf aus den Formdaten in data/shipArt.ts,
// dazu das Innenleben der Räume. Später lassen sich die Schiffsbilder durch gezeichnete
// PNG-Dateien ersetzen, ohne die übrige Darstellung zu ändern.
import { SHIP_ART, type Deco } from '../data/shipArt';
import type { RoomDef, ShipDef, SystemId } from '../sim/types';
import { bayer, hash, rgb } from './background';
import { artBounds, TILE, weaponMount } from './layout';

export interface ShipSprite {
  canvas: HTMLCanvasElement;
  /** Lage des Raumrasters im Bild (für nicht gespiegelte Bilder). */
  ox: number;
  oy: number;
}

type Color = [number, number, number];

const PAD = 8;
/** Breite der abgeschrägten Kante eines Rumpfteils in Pixeln. */
const BEVEL = 6;
const RUST = ['#1a0e08', '#3d2012', '#63341a', '#8c4c22', '#b56e35', '#d99a5a'];

function fillPolygon(mask: Uint8Array, W: number, H: number, pts: [number, number][]): void {
  const ys = pts.map((p) => p[1]);
  const y0 = Math.max(0, Math.floor(Math.min(...ys)));
  const y1 = Math.min(H - 1, Math.ceil(Math.max(...ys)));
  for (let y = y0; y <= y1; y++) {
    const yc = y + 0.5;
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) {
        xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const from = Math.max(0, Math.ceil(xs[i] - 0.5));
      const to = Math.min(W - 1, Math.floor(xs[i + 1] - 0.5));
      for (let x = from; x <= to; x++) mask[y * W + x] = 1;
    }
  }
}

interface ShadeOptions {
  panels: boolean;
  glass: boolean;
  seed: number;
  /** Abweichende Farben für einzelne Platten (Flickwerk). */
  patches: Color[][];
}

/** Färbt ein Rumpfteil ein: Kontur, abgeschrägte Kante mit Licht von links oben, Panzerplatten. */
function shadePart(
  buf: Uint8ClampedArray,
  occupied: Uint8Array,
  W: number,
  H: number,
  mask: Uint8Array,
  ramp: Color[],
  opts: ShadeOptions,
): void {
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < W && y < H ? mask[y * W + x] : 0);

  // Schlagschatten auf darunterliegende Teile
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!mask[y * W + x]) continue;
      const sx = x + 2;
      const sy = y + 3;
      if (sx >= W || sy >= H) continue;
      const s = sy * W + sx;
      if (occupied[s] && !mask[s]) {
        buf[s * 4] *= 0.6;
        buf[s * 4 + 1] *= 0.6;
        buf[s * 4 + 2] *= 0.62;
      }
    }
  }

  // Abstand zum Rand
  const dist = new Uint8Array(W * H);
  let frontier: number[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!mask[y * W + x]) continue;
      if (!at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1)) {
        dist[y * W + x] = 1;
        frontier.push(y * W + x);
      }
    }
  }
  for (let d = 2; frontier.length && d <= BEVEL; d++) {
    const next: number[] = [];
    for (const i of frontier) {
      const x = i % W;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
        if (j >= 0 && j < W * H && mask[j] && !dist[j]) {
          dist[j] = d;
          next.push(j);
        }
      }
    }
    frontier = next;
  }
  const height = (x: number, y: number) => {
    if (!at(x, y)) return 0;
    return dist[y * W + x] || BEVEL + 1;
  };

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!mask[i]) continue;
      const d = dist[i] || BEVEL + 1;
      let colors = ramp;
      let tone: number;
      if (d === 1) {
        tone = 0;
      } else {
        const gx = height(x + 1, y) - height(x - 1, y);
        const gy = height(x, y + 1) - height(x, y - 1);
        let t = 3 + (gx * 0.5 + gy * 0.75) * 0.85;
        if (opts.glass) {
          t += (x + y) % 13 < 3 ? 1.3 : 0;
        } else if (opts.panels && d > BEVEL) {
          // Panzerplatten: Reihen mit versetzten Fugen
          const row = Math.floor(y / 14);
          const cellW = 18 + Math.floor(hash(row, 0, opts.seed) * 14);
          const shifted = x + Math.floor(hash(row, 1, opts.seed) * cellW);
          const col = Math.floor(shifted / cellW);
          const lx = shifted % cellW;
          const ly = y % 14;
          const cell = hash(col, row, opts.seed);
          if (opts.patches.length && cell > 0.7) {
            colors = opts.patches[Math.floor(cell * 97) % opts.patches.length];
          }
          if (lx === 0 || ly === 0) t = 2;
          else if (lx === 1 || ly === 1) t = 3.7;
          else if ((lx === 3 || lx === cellW - 2) && (ly === 3 || ly === 12)) t = 1.6;
          else t = 3 + (cell - 0.5) * 1.3;
        }
        const base = Math.floor(t);
        tone = Math.max(1, Math.min(5, base + (t - base > bayer(x, y) ? 1 : 0)));
      }
      const c = colors[tone];
      buf[i * 4] = c[0];
      buf[i * 4 + 1] = c[1];
      buf[i * 4 + 2] = c[2];
      buf[i * 4 + 3] = 255;
      occupied[i] = 1;
    }
  }
}

/** Zeichnet ein Schiff in ein eigenes Bild. flip = Bug zeigt nach links (Gegner). */
export function buildShipSprite(def: ShipDef, flip: boolean): ShipSprite {
  const art = SHIP_ART[def.id];
  const b = artBounds(art);
  const W = b.maxX - b.minX + PAD * 2;
  const H = b.maxY - b.minY + PAD * 2;
  const ox = PAD - b.minX;
  const oy = PAD - b.minY;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Rumpfteile
  const image = ctx.createImageData(W, H);
  const occupied = new Uint8Array(W * H);
  const patches = art.scrappy ? [art.ramps.hull2, art.ramps.accent, RUST].map((r) => r.map(rgb)) : [];
  art.parts.forEach((part, index) => {
    for (const mirrored of part.mirror ? [false, true] : [false]) {
      const pts = part.pts.map(([x, y]): [number, number] => {
        const px = x * TILE + ox;
        const py = (mirrored ? 2 * art.axisY - y : y) * TILE + oy;
        return [flip ? W - px : px, py];
      });
      const mask = new Uint8Array(W * H);
      fillPolygon(mask, W, H, pts);
      shadePart(image.data, occupied, W, H, mask, art.ramps[part.mat].map(rgb), {
        panels: !!part.panels,
        glass: part.mat === 'glass',
        seed: index * 31 + 5,
        patches: part.mat === 'hull' ? patches : [],
      });
    }
  });
  ctx.putImageData(image, 0, 0);

  // Innenleben (immer ungespiegelt gezeichnet, dann passend aufgesetzt)
  const interior = document.createElement('canvas');
  interior.width = W;
  interior.height = H;
  drawInterior(interior.getContext('2d')!, def, ox, oy);
  if (flip) {
    ctx.save();
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(interior, 0, 0);
    ctx.restore();
  } else {
    ctx.drawImage(interior, 0, 0);
  }
  return { canvas, ox, oy };
}

const FLOORS: Record<SystemId | Deco, [string, string]> = {
  shields: ['#1f3558', '#243d63'],
  weapons: ['#3c2a44', '#44304d'],
  engines: ['#40352f', '#493d36'],
  bunks: ['#3b3340', '#42394a'],
  crates: ['#2d3344', '#333a4d'],
  consoles: ['#27344a', '#2c3b54'],
  medbay: ['#34474e', '#3b5058'],
  corridor: ['#2a3048', '#2f3650'],
  cockpit: ['#26304a', '#2b3754'],
};

function drawInterior(ctx: CanvasRenderingContext2D, def: ShipDef, ox: number, oy: number): void {
  const art = SHIP_ART[def.id];
  const R = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  const rect = (room: RoomDef) => ({
    x: ox + room.x * TILE,
    y: oy + room.y * TILE,
    w: room.w * TILE,
    h: room.h * TILE,
  });
  const crate = (x: number, y: number, w: number, h: number, base: string, light: string, dark: string) => {
    R(x - 1, y - 1, w + 2, h + 2, '#0b0e18');
    R(x, y, w, h, base);
    R(x, y, w, 1, light);
    R(x, y, 1, h, light);
    R(x, y + h - 1, w, 1, dark);
    R(x + w - 1, y, 1, h, dark);
    R(x + Math.floor(w / 2), y + 1, 1, h - 2, dark);
    R(x + 1, y + Math.floor(h / 2), w - 2, 1, dark);
  };
  const bed = (x: number, y: number, blanket: [string, string, string]) => {
    R(x, y, 24, 11, '#141825');
    R(x + 1, y + 1, 22, 9, '#cfc8b4');
    R(x + 2, y + 2, 5, 7, '#f6f3ea');
    R(x + 2, y + 8, 5, 1, '#b8b09a');
    R(x + 10, y + 1, 13, 9, blanket[1]);
    R(x + 10, y + 1, 13, 1, blanket[2]);
    R(x + 10, y + 1, 1, 9, blanket[0]);
    R(x + 15, y + 4, 6, 1, blanket[0]);
    R(x + 10, y + 9, 13, 1, blanket[0]);
  };
  const seat = (x: number, y: number) => {
    R(x, y, 9, 9, '#12151f');
    R(x + 1, y + 1, 3, 7, '#454c66');
    R(x + 4, y + 1, 4, 7, '#a5553a');
    R(x + 4, y + 1, 4, 1, '#cf7a55');
  };
  const screen = (x: number, y: number, w: number, h: number, color: string) => {
    R(x - 1, y - 1, w + 2, h + 2, '#0a0d16');
    R(x, y, w, h, color);
    R(x, y, w, 1, '#ffffff');
    R(x + w - 1, y + h - 1, 1, 1, '#0a0d16');
  };

  for (const room of def.rooms) {
    const r = rect(room);
    const kind: SystemId | Deco = room.system ?? art.deco[room.id] ?? 'corridor';
    const [a, b] = FLOORS[kind];

    // Bodenplatten
    for (let ty = 0; ty < room.h; ty++) {
      for (let tx = 0; tx < room.w; tx++) {
        const x = r.x + tx * TILE;
        const y = r.y + ty * TILE;
        R(x, y, TILE, TILE, (tx + ty) % 2 ? b : a);
        R(x + 1, y + 1, TILE - 2, 1, 'rgba(255,255,255,0.08)');
        R(x + 1, y + 1, 1, TILE - 2, 'rgba(255,255,255,0.08)');
        R(x + 1, y + TILE - 1, TILE - 1, 1, 'rgba(0,0,0,0.28)');
        R(x + TILE - 1, y + 1, 1, TILE - 1, 'rgba(0,0,0,0.28)');
        for (const [bx, by] of [
          [3, 3],
          [TILE - 4, 3],
          [3, TILE - 4],
          [TILE - 4, TILE - 4],
        ]) {
          R(x + bx, y + by, 1, 1, 'rgba(0,0,0,0.4)');
        }
        if (hash(room.id * 8 + tx, ty, 11) < 0.25) {
          for (let g = 0; g < 4; g++) R(x + 7, y + 8 + g * 3, 10, 1, 'rgba(0,0,0,0.32)');
        }
      }
    }

    // Rückwand mit Rippen und Schatten: gibt dem Raum Tiefe
    R(r.x, r.y, r.w, 8, '#39435f');
    R(r.x, r.y + 2, r.w, 1, '#6a78a3');
    for (let x = r.x + 5; x < r.x + r.w - 2; x += 8) R(x, r.y + 3, 1, 5, '#2a3350');
    R(r.x, r.y + 8, r.w, 2, 'rgba(0,0,0,0.3)');
    R(r.x + 2, r.y + 8, 2, r.h - 10, 'rgba(0,0,0,0.16)');
    R(r.x + r.w - 4, r.y + 8, 2, r.h - 10, 'rgba(0,0,0,0.16)');

    drawProps(room, r, kind, R, { crate, bed, seat, screen });

    // Wände
    R(r.x, r.y, r.w, 2, '#080b16');
    R(r.x, r.y + r.h - 2, r.w, 2, '#080b16');
    R(r.x, r.y, 2, r.h, '#080b16');
    R(r.x + r.w - 2, r.y, 2, r.h, '#080b16');
  }

  // Türen zwischen benachbarten Räumen
  for (const a of def.rooms) {
    for (const b of def.rooms) {
      if (a.x + a.w === b.x) {
        const from = Math.max(a.y, b.y);
        const to = Math.min(a.y + a.h, b.y + b.h);
        if (to - from < 1) continue;
        const cy = oy + (from + Math.floor((to - from - 1) / 2)) * TILE + TILE / 2;
        const x = ox + b.x * TILE;
        R(x - 3, cy - 9, 6, 18, '#080b16');
        R(x - 2, cy - 8, 4, 16, '#8a95b0');
        R(x - 2, cy - 8, 1, 16, '#c3cbe0');
        R(x - 2, cy - 1, 4, 2, '#3a4260');
        R(x - 1, cy - 6, 2, 2, '#5ee06e');
        R(x - 1, cy + 4, 2, 2, '#5ee06e');
      }
      if (a.y + a.h === b.y) {
        const from = Math.max(a.x, b.x);
        const to = Math.min(a.x + a.w, b.x + b.w);
        if (to - from < 1) continue;
        const cx = ox + (from + Math.floor((to - from - 1) / 2)) * TILE + TILE / 2;
        const y = oy + b.y * TILE;
        R(cx - 9, y - 3, 18, 6, '#080b16');
        R(cx - 8, y - 2, 16, 4, '#8a95b0');
        R(cx - 8, y - 2, 16, 1, '#c3cbe0');
        R(cx - 1, y - 2, 2, 4, '#3a4260');
        R(cx - 6, y - 1, 2, 2, '#5ee06e');
        R(cx + 4, y - 1, 2, 2, '#5ee06e');
      }
    }
  }

  // Geschütztürme auf der Hülle
  def.weapons.forEach((_, index) => {
    const m = weaponMount(def, index);
    const x = ox + m.x;
    const y = oy + m.y;
    R(x - 1, y - 1, 13, 9, '#080b16');
    R(x + 11, y + 1, 13, 5, '#080b16');
    R(x, y, 11, 7, '#59637d');
    R(x, y, 11, 1, '#a4aec6');
    R(x, y + 6, 11, 1, '#3d4458');
    R(x + 12, y + 2, 11, 3, '#6b7590');
    R(x + 12, y + 2, 11, 1, '#c5cde0');
    R(x + 20, y + 2, 1, 3, '#3d4458');
    R(x + 3, y + 2, 4, 3, '#1a1f30');
  });
}

interface PropTools {
  crate(x: number, y: number, w: number, h: number, base: string, light: string, dark: string): void;
  bed(x: number, y: number, blanket: [string, string, string]): void;
  seat(x: number, y: number): void;
  screen(x: number, y: number, w: number, h: number, color: string): void;
}

/** Einrichtung eines Raums je nach Zweck. */
function drawProps(
  room: RoomDef,
  r: { x: number; y: number; w: number; h: number },
  kind: SystemId | Deco,
  R: (x: number, y: number, w: number, h: number, color: string) => void,
  tools: PropTools,
): void {
  const { x, y, w, h } = r;
  const { crate, bed, seat, screen } = tools;
  switch (kind) {
    case 'bunks': {
      bed(x + 4, y + 11, ['#2c5490', '#3f6fb0', '#6c9ad6']);
      bed(x + 4, y + h - 15, ['#7c3029', '#a8483f', '#d0756a']);
      // Spind und Tisch
      R(x + w - 14, y + 10, 10, 14, '#0b0e18');
      R(x + w - 13, y + 11, 8, 12, '#566079');
      R(x + w - 13, y + 11, 8, 1, '#8a96b3');
      R(x + w - 9, y + 12, 1, 10, '#333b52');
      R(x + w - 11, y + 16, 1, 2, '#c5cde0');
      R(x + w - 7, y + 16, 1, 2, '#c5cde0');
      R(x + w - 13, y + h - 13, 9, 8, '#0b0e18');
      R(x + w - 12, y + h - 12, 7, 6, '#7a5a40');
      R(x + w - 12, y + h - 12, 7, 1, '#a07a58');
      R(x + w - 10, y + h - 10, 2, 2, '#f0f0f0');
      break;
    }
    case 'crates': {
      crate(x + 5, y + 12, 15, 12, '#7a5a34', '#a37e4c', '#4d3820');
      crate(x + 24, y + 11, 11, 9, '#3f6a4a', '#5c9468', '#284530');
      crate(x + 6, y + 29, 11, 12, '#4a5a78', '#6b7ea3', '#2e3a52');
      crate(x + 26, y + 30, 15, 11, '#7a5a34', '#a37e4c', '#4d3820');
      // Fass
      R(x + 37, y + 14, 6, 8, '#0b0e18');
      R(x + 36, y + 15, 8, 6, '#0b0e18');
      R(x + 37, y + 15, 6, 6, '#a8483f');
      R(x + 38, y + 15, 3, 1, '#d98075');
      R(x + 39, y + 17, 2, 2, '#5a221c');
      break;
    }
    case 'consoles': {
      R(x + 4, y + 9, w - 8, 8, '#141a2a');
      R(x + 4, y + 16, w - 8, 1, '#3a4666');
      screen(x + 7, y + 11, 8, 4, '#3ad6c5');
      screen(x + 19, y + 11, 8, 4, '#5ee06e');
      screen(x + 31, y + 11, 8, 4, '#e0a03a');
      // Kartentisch mit Hologramm
      R(x + 13, y + h - 21, 20, 13, '#0b0e18');
      R(x + 14, y + h - 20, 18, 11, '#3a4666');
      R(x + 14, y + h - 20, 18, 1, '#6a78a3');
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 9; j++) {
          if ((i + j) % 2 === 0 && hash(i, j, room.id) > 0.35) R(x + 15 + i, y + h - 19 + j, 1, 1, '#5ee6ff');
        }
      }
      seat(x + 3, y + h - 18);
      // Pflanze
      R(x + w - 10, y + h - 9, 6, 5, '#8a5a3a');
      R(x + w - 11, y + h - 14, 8, 6, '#2f8048');
      R(x + w - 9, y + h - 15, 4, 2, '#6fd07f');
      R(x + w - 10, y + h - 12, 2, 1, '#6fd07f');
      break;
    }
    case 'medbay': {
      bed(x + 4, y + 11, ['#3aa59c', '#6fd0c8', '#b5f0ea']);
      bed(x + 4, y + h - 15, ['#3aa59c', '#6fd0c8', '#b5f0ea']);
      // Monitor mit Kreuz und Medizinschrank
      screen(x + w - 13, y + 11, 9, 9, '#0f2a1a');
      R(x + w - 10, y + 12, 3, 7, '#5ee06e');
      R(x + w - 12, y + 14, 7, 3, '#5ee06e');
      R(x + w - 14, y + h - 16, 10, 12, '#0b0e18');
      R(x + w - 13, y + h - 15, 8, 10, '#e8eef2');
      R(x + w - 13, y + h - 6, 8, 1, '#a9b4bd');
      R(x + w - 10, y + h - 13, 2, 6, '#e0463a');
      R(x + w - 12, y + h - 11, 6, 2, '#e0463a');
      break;
    }
    case 'corridor': {
      // Rohre an der Rückwand, Leitlinie am Boden, Wartungsluke, Spinde
      R(x + 3, y + 10, w - 6, 3, '#0b0e18');
      R(x + 3, y + 10, w - 6, 2, '#59637d');
      R(x + 3, y + 10, w - 6, 1, '#8a96b3');
      for (let px = x + 10; px < x + w - 6; px += 16) R(px, y + 9, 3, 4, '#3d4458');
      for (let px = x + 6; px < x + w - 10; px += 12) R(px, y + h / 2 + 1, 6, 2, '#b89a3a');
      R(x + w - 24, y + h - 20, 16, 14, '#0b0e18');
      R(x + w - 23, y + h - 19, 14, 12, '#3a4260');
      for (let i = 0; i < 12; i += 4) R(x + w - 22 + i, y + h - 18, 2, 10, '#2a3048');
      R(x + w - 23, y + h - 19, 3, 3, '#e8c23a');
      R(x + w - 12, y + h - 10, 3, 3, '#e8c23a');
      for (let i = 0; i < 3; i++) {
        R(x + 5 + i * 10, y + h - 14, 9, 10, '#0b0e18');
        R(x + 6 + i * 10, y + h - 13, 7, 8, '#566079');
        R(x + 6 + i * 10, y + h - 13, 7, 1, '#8a96b3');
        R(x + 11 + i * 10, y + h - 10, 1, 2, '#c5cde0');
      }
      break;
    }
    case 'cockpit': {
      // Steuerpult an der Bugwand, zwei Sitze, Sternenkarte
      R(x + w - 12, y + 9, 9, h - 13, '#0b0e18');
      R(x + w - 11, y + 10, 7, h - 15, '#1c2438');
      R(x + w - 11, y + 10, 1, h - 15, '#4a5880');
      const colors = ['#3ad6c5', '#5ee06e', '#e0a03a', '#5ea0ff'];
      for (let i = 0; i < 4; i++) screen(x + w - 9, y + 13 + i * 8, 4, 4, colors[i]);
      seat(x + w - 24, y + 12);
      seat(x + w - 24, y + h - 20);
      R(x + 5, y + h / 2 - 5, 12, 14, '#0b0e18');
      R(x + 4, y + h / 2 - 4, 14, 12, '#0b0e18');
      R(x + 5, y + h / 2 - 4, 12, 12, '#162038');
      for (let i = 0; i < 9; i++) {
        R(x + 6 + Math.floor(hash(i, 1, room.id) * 10), y + h / 2 - 3 + Math.floor(hash(i, 2, room.id) * 10), 1, 1, i % 3 ? '#ffffff' : '#ffd75e');
      }
      R(x + 5, y + h / 2 - 4, 12, 1, '#5ee6ff');
      break;
    }
    case 'engines': {
      // Zwei Antriebskerne mit glühenden Spulen, Rohre, Warnstreifen
      for (const cy of [y + 11, y + h - 17]) {
        R(x + 4, cy - 1, 18, 14, '#0b0e18');
        R(x + 5, cy, 16, 12, '#2f3648');
        R(x + 5, cy, 16, 1, '#6b7590');
        R(x + 7, cy + 3, 12, 6, '#1a0f08');
        for (let i = 0; i < 4; i++) {
          R(x + 8 + i * 3, cy + 4, 2, 4, '#ff9a3a');
          R(x + 8 + i * 3, cy + 4, 2, 1, '#ffe0a0');
        }
        R(x + 22, cy + 5, w - 30, 3, '#0b0e18');
        R(x + 22, cy + 5, w - 30, 2, '#7a849e');
        R(x + 22, cy + 5, w - 30, 1, '#aab4cc');
      }
      for (let i = 0; i < 9; i++) R(x + 2, y + 10 + i * 4, 2, 2, i % 2 ? '#e8c23a' : '#1a1a1a');
      R(x + w - 12, y + h / 2 - 5, 9, 10, '#0b0e18');
      R(x + w - 11, y + h / 2 - 4, 7, 8, '#3d4458');
      R(x + w - 10, y + h / 2 - 3, 2, 2, '#5ee06e');
      R(x + w - 7, y + h / 2 - 3, 2, 2, '#e0463a');
      R(x + w - 10, y + h / 2 + 1, 5, 2, '#e0a03a');
      break;
    }
    case 'shields': {
      // Vier Emitter in den Ecken, Leitungen zur Mitte, Feldring
      const cx = x + w / 2;
      const cy = y + h / 2 + 2;
      for (const [px, py] of [
        [x + 4, y + 11],
        [x + w - 11, y + 11],
        [x + 4, y + h - 11],
        [x + w - 11, y + h - 11],
      ]) {
        const dx = px < cx ? 1 : -1;
        const dy = py < cy ? 1 : -1;
        for (let i = 0; i < 9; i++) R(px + 3 + dx * (3 + i), py + 3 + dy * (3 + i), 2, 2, '#2b5f8a');
        R(px - 1, py - 1, 9, 9, '#0b0e18');
        R(px, py, 7, 7, '#1c2a4a');
        R(px, py, 7, 1, '#4a6a9a');
        R(px + 2, py + 2, 3, 3, '#5ecbff');
        R(px + 2, py + 2, 1, 1, '#e6f9ff');
      }
      for (let i = 0; i < 48; i++) {
        if (i % 2) continue;
        const angle = (i / 48) * Math.PI * 2;
        R(Math.round(cx + Math.cos(angle) * 15), Math.round(cy + Math.sin(angle) * 15), 1, 1, '#3f8fd0');
      }
      break;
    }
    case 'weapons': {
      // Torpedolager an der Rückwand, Munitionskiste, Feuerleitpult
      R(x + 4, y + 9, w - 8, 14, '#120e18');
      for (let i = 0; i < 6; i++) {
        const tx = x + 7 + i * 6;
        R(tx, y + 10, 4, 12, '#a4aec6');
        R(tx, y + 10, 4, 3, '#e8792b');
        R(tx, y + 10, 1, 12, '#dfe6f2');
        R(tx + 3, y + 13, 1, 9, '#5b647d');
        R(tx, y + 20, 4, 2, '#3d4458');
      }
      crate(x + 5, y + h - 14, 12, 9, '#5a6a34', '#82964c', '#384420');
      R(x + w - 19, y + h - 13, 15, 9, '#0b0e18');
      R(x + w - 18, y + h - 12, 13, 7, '#1c2438');
      R(x + w - 18, y + h - 12, 13, 1, '#4a5880');
      for (let i = 0; i < 4; i++) R(x + w - 16 + i * 3, y + h - 9, 2, 2, i === 1 ? '#e8c23a' : '#e0463a');
      break;
    }
  }
}

/** Schildblase als leuchtendes Feld mit hellem Rand und feinem Gittermuster. */
export function buildShieldSprite(rx: number, ry: number, layers: number): HTMLCanvasElement {
  const grow = (layers - 1) * 5;
  const W = (rx + grow) * 2 + 3;
  const H = (ry + grow) * 2 + 3;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(W, H);
  const cx = (W - 1) / 2;
  const cy = (H - 1) / 2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let alpha = 0;
      let bright = 0;
      for (let layer = 0; layer < layers; layer++) {
        const dx = (x - cx) / (rx + layer * 5);
        const dy = (y - cy) / (ry + layer * 5);
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 1) continue;
        const edge = (1 - d) * Math.min(rx, ry);
        if (edge < 2) {
          alpha = Math.max(alpha, 235);
          bright = 1;
        } else if (edge < 7) {
          if (bayer(x, y) < 0.75 - edge * 0.07) alpha = Math.max(alpha, 130);
        } else {
          // Innen: schwaches Leuchten, das zum Rand hin zunimmt, mit Rautengitter
          const glow = Math.pow(d, 4);
          const lattice = (x + y * 2) % 16 === 0 || (x - y * 2 + 4096) % 16 === 0;
          if (lattice && d > 0.45) alpha = Math.max(alpha, 26 + glow * 90);
          else if (bayer(x, y) < 0.05 + glow * 0.5) alpha = Math.max(alpha, 46);
        }
      }
      const i = (y * W + x) * 4;
      image.data[i] = bright ? 200 : 70;
      image.data[i + 1] = bright ? 240 : 170;
      image.data[i + 2] = 255;
      image.data[i + 3] = alpha;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** Systemsymbole als 9×9-Pixelmuster. */
export const SYSTEM_ICONS: Record<SystemId, string[]> = {
  shields: [
    '.#######.',
    '#.......#',
    '#..###..#',
    '#..###..#',
    '#..###..#',
    '.#..#..#.',
    '..#...#..',
    '...#.#...',
    '....#....',
  ],
  weapons: [
    '....#....',
    '..#####..',
    '.#..#..#.',
    '.#.....#.',
    '###.#.###',
    '.#.....#.',
    '.#..#..#.',
    '..#####..',
    '....#....',
  ],
  engines: [
    '#...#....',
    '.#...#...',
    '..#...#..',
    '...#...#.',
    '....#...#',
    '...#...#.',
    '..#...#..',
    '.#...#...',
    '#...#....',
  ],
};

export function drawIcon(ctx: CanvasRenderingContext2D, icon: string[], x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  for (let row = 0; row < icon.length; row++) {
    for (let col = 0; col < icon[row].length; col++) {
      if (icon[row][col] === '#') ctx.fillRect(x + col, y + row, 1, 1);
    }
  }
}
