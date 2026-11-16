// Pixelgrafik, die per Code erzeugt wird. Später lassen sich die Schiffsbilder durch
// gezeichnete PNG-Dateien ersetzen, ohne die übrige Darstellung zu ändern.
import type { ShipDef, SystemId } from '../sim/types';
import { shipSize, TILE } from './layout';

export const SPRITE_PAD = 30;
/** Abstand der Außenhülle von den Räumen in Pixeln. */
export const HULL_MARGIN = 7;

export interface HullPalette {
  light: string;
  mid: string;
  dark: string;
  outline: string;
  accent: string;
}

export const PALETTES: Record<'player' | 'enemy', HullPalette> = {
  player: { light: '#a9b8cc', mid: '#73839c', dark: '#4a566e', outline: '#1c2233', accent: '#ff9b3d' },
  enemy: { light: '#c2705a', mid: '#8c4640', dark: '#5a2b30', outline: '#24121a', accent: '#f2d24b' },
};

/** Zeichnet ein Schiff (nach rechts zeigend) in ein eigenes Bild. */
export function buildShipSprite(def: ShipDef, pal: HullPalette): HTMLCanvasElement {
  const { cols, rows } = shipSize(def);
  const W = cols * TILE + SPRITE_PAD * 2;
  const H = rows * TILE + SPRITE_PAD * 2;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // 0 = leer, 1 = Hülle, 2 = Triebwerksdüse
  const mask = new Uint8Array(W * H);
  const set = (x: number, y: number, v: number) => {
    if (x >= 0 && y >= 0 && x < W && y < H && (v === 1 || mask[y * W + x] === 0)) mask[y * W + x] = v;
  };
  const get = (x: number, y: number) => (x >= 0 && y >= 0 && x < W && y < H ? mask[y * W + x] : 0);

  // Hülle: jeder Raum, ringsum abgerundet erweitert
  const R = HULL_MARGIN;
  for (const room of def.rooms) {
    const rx = SPRITE_PAD + room.x * TILE;
    const ry = SPRITE_PAD + room.y * TILE;
    const rw = room.w * TILE;
    const rh = room.h * TILE;
    for (let y = ry - R; y < ry + rh + R; y++) {
      for (let x = rx - R; x < rx + rw + R; x++) {
        const dx = Math.max(rx - x, 0, x - (rx + rw - 1));
        const dy = Math.max(ry - y, 0, y - (ry + rh - 1));
        if (dx * dx + dy * dy <= R * R) set(x, y, 1);
      }
    }
  }

  // Bug: spitz zulaufender Keil vor dem vordersten Raum
  const front = def.rooms.reduce((a, b) => (b.x + b.w > a.x + a.w ? b : a));
  const noseX = SPRITE_PAD + (front.x + front.w) * TILE;
  const noseCy = SPRITE_PAD + (front.y + front.h / 2) * TILE;
  const noseLen = 20;
  for (let i = 0; i < noseLen; i++) {
    const half = Math.round((front.h * TILE) / 2 + R - 1 - (i / noseLen) * ((front.h * TILE) / 2 + R - 4));
    for (let y = -half; y < half; y++) set(noseX + i, Math.round(noseCy) + y, 1);
  }

  // Triebwerksdüsen hinter dem Maschinenraum
  const engineRoom = def.rooms.find((r) => r.system === 'engines');
  if (engineRoom) {
    const ex = SPRITE_PAD + engineRoom.x * TILE;
    const ey = SPRITE_PAD + engineRoom.y * TILE;
    const eh = engineRoom.h * TILE;
    for (const top of [ey + 3, ey + eh - 11]) {
      for (let y = top; y < top + 8; y++) {
        for (let x = ex - R - 6; x < ex - R + 2; x++) set(x, y, 2);
      }
    }
  }

  // Einfärben mit Kontur, Licht von oben und Schatten unten
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = get(x, y);
      if (!v) continue;
      const edge = !get(x - 1, y) || !get(x + 1, y) || !get(x, y - 1) || !get(x, y + 1);
      let color: string;
      if (edge) color = pal.outline;
      else if (v === 2) color = y % 2 ? '#3a3f4d' : '#555c6e';
      else if (!get(x, y - 3)) color = pal.light;
      else if (!get(x, y + 4)) color = pal.dark;
      else if (x % 12 === 0 || y % 12 === 0) color = pal.dark;
      else color = pal.mid;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Farbstreifen am Bug
  ctx.fillStyle = pal.accent;
  ctx.fillRect(noseX + 4, Math.round(noseCy) - 1, noseLen - 9, 2);

  // Räume: Bodenplatten, Kachelfugen, Wände
  for (const room of def.rooms) {
    const rx = SPRITE_PAD + room.x * TILE;
    const ry = SPRITE_PAD + room.y * TILE;
    const rw = room.w * TILE;
    const rh = room.h * TILE;
    ctx.fillStyle = '#c4cbd4';
    ctx.fillRect(rx, ry, rw, rh);
    ctx.fillStyle = '#a3acb8';
    for (let tx = 1; tx < room.w; tx++) ctx.fillRect(rx + tx * TILE, ry, 1, rh);
    for (let ty = 1; ty < room.h; ty++) ctx.fillRect(rx, ry + ty * TILE, rw, 1);
    ctx.fillStyle = '#dfe4ea';
    ctx.fillRect(rx + 1, ry + 1, rw - 2, 1);
    ctx.fillStyle = '#232a3b';
    ctx.fillRect(rx, ry, rw, 1);
    ctx.fillRect(rx, ry + rh - 1, rw, 1);
    ctx.fillRect(rx, ry, 1, rh);
    ctx.fillRect(rx + rw - 1, ry, 1, rh);
  }
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
