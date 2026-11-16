// Pixelgrafik, die per Code erzeugt wird. Später lassen sich die Schiffsbilder durch
// gezeichnete PNG-Dateien ersetzen, ohne die übrige Darstellung zu ändern.
import type { ShipDef, SystemId } from '../sim/types';
import { bayer } from './background';
import { HULL_MARGIN, shipSize, TILE, weaponMount } from './layout';

export const SPRITE_PAD = 30;

export interface HullPalette {
  /** Von dunkel nach hell: Kontur, Schatten, dunkel, mittel, hell, Glanzlicht. */
  hull: [string, string, string, string, string, string];
  /** Farbflächen (Flügel, Zierstreifen): dunkel, mittel, hell. */
  accent: [string, string, string];
  /** Cockpitglas: dunkel, mittel, Glanz. */
  glass: [string, string, string];
}

export const PALETTES: Record<'player' | 'enemy', HullPalette> = {
  player: {
    hull: ['#141a2b', '#333e58', '#4c5a78', '#6f7f9e', '#98a9c4', '#d3deee'],
    accent: ['#a34a1e', '#e8792b', '#ffb561'],
    glass: ['#153457', '#3a9fe0', '#c9f2ff'],
  },
  enemy: {
    hull: ['#1c0f16', '#3f1f28', '#63303a', '#8c4648', '#b96a58', '#e6a583'],
    accent: ['#6b5a16', '#c9a72c', '#f6e07a'],
    glass: ['#3d1d0e', '#e0752a', '#ffe0a6'],
  },
};

const FLOOR: Record<SystemId | 'none', [string, string]> = {
  none: ['#2a3350', '#2f3958'],
  shields: ['#22395c', '#274166'],
  weapons: ['#422d48', '#4a3351'],
  engines: ['#453a34', '#4e423a'],
};

const HULL = 1;
const NOZZLE = 2;
const FIN = 3;
const GLASS = 4;

/** Zeichnet ein Schiff (nach rechts zeigend) in ein eigenes Bild. */
export function buildShipSprite(def: ShipDef, pal: HullPalette): HTMLCanvasElement {
  const { cols, rows } = shipSize(def);
  const W = cols * TILE + SPRITE_PAD * 2;
  const H = rows * TILE + SPRITE_PAD * 2;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const mask = new Uint8Array(W * H);
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
  const get = (x: number, y: number) => (inside(x, y) ? mask[y * W + x] : 0);
  const set = (x: number, y: number, kind: number, overwrite = false) => {
    if (inside(x, y) && (overwrite || mask[y * W + x] === 0)) mask[y * W + x] = kind;
  };
  const px = (room: { x: number; y: number; w: number; h: number }) => ({
    x: SPRITE_PAD + room.x * TILE,
    y: SPRITE_PAD + room.y * TILE,
    w: room.w * TILE,
    h: room.h * TILE,
  });
  const triangle = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number, kind: number) => {
    const sign = (x: number, y: number, x1: number, y1: number, x2: number, y2: number) =>
      (x - x2) * (y1 - y2) - (x1 - x2) * (y - y2);
    for (let y = Math.min(ay, by, cy); y <= Math.max(ay, by, cy); y++) {
      for (let x = Math.min(ax, bx, cx); x <= Math.max(ax, bx, cx); x++) {
        const d1 = sign(x, y, ax, ay, bx, by);
        const d2 = sign(x, y, bx, by, cx, cy);
        const d3 = sign(x, y, cx, cy, ax, ay);
        if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) set(x, y, kind);
      }
    }
  };

  // Hülle: jeder Raum, ringsum abgerundet erweitert
  const R = HULL_MARGIN;
  for (const room of def.rooms) {
    const r = px(room);
    for (let y = r.y - R; y < r.y + r.h + R; y++) {
      for (let x = r.x - R; x < r.x + r.w + R; x++) {
        const dx = Math.max(r.x - x, 0, x - (r.x + r.w - 1));
        const dy = Math.max(r.y - y, 0, y - (r.y + r.h - 1));
        if (dx * dx + dy * dy <= R * R) set(x, y, HULL);
      }
    }
  }

  // Bug: spitz zulaufender Keil vor dem vordersten Raum, mit Cockpitglas
  const front = px(def.rooms.reduce((a, b) => (b.x + b.w > a.x + a.w ? b : a)));
  const noseX = front.x + front.w;
  const noseCy = Math.round(front.y + front.h / 2);
  const noseLen = 22;
  for (let i = 0; i < noseLen; i++) {
    const startHalf = front.h / 2 + R - 1;
    const half = Math.round(startHalf - Math.pow(i / noseLen, 1.4) * (startHalf - 3));
    for (let y = -half; y < half; y++) {
      const glass = i >= 4 && i <= 13 && Math.abs(y + 0.5) < half - 4;
      set(noseX + i, noseCy + y, glass ? GLASS : HULL, true);
    }
  }

  // Flügel: nach hinten gepfeilt, am obersten und untersten Raum
  const minY = Math.min(...def.rooms.map((r) => r.y));
  const maxY = Math.max(...def.rooms.map((r) => r.y + r.h));
  const rearmost = (list: typeof def.rooms) => list.reduce((a, b) => (b.x < a.x ? b : a));
  const topRoom = px(rearmost(def.rooms.filter((r) => r.y === minY)));
  const bottomRoom = px(rearmost(def.rooms.filter((r) => r.y + r.h === maxY)));
  triangle(topRoom.x + topRoom.w - 3, topRoom.y - R + 2, topRoom.x - 4, topRoom.y - R + 2, topRoom.x - 18, topRoom.y - R - 13, FIN);
  triangle(
    bottomRoom.x + bottomRoom.w - 3,
    bottomRoom.y + bottomRoom.h + R - 3,
    bottomRoom.x - 4,
    bottomRoom.y + bottomRoom.h + R - 3,
    bottomRoom.x - 18,
    bottomRoom.y + bottomRoom.h + R + 12,
    FIN,
  );

  // Triebwerksdüsen hinter dem Maschinenraum
  const engineDef = def.rooms.find((r) => r.system === 'engines');
  if (engineDef) {
    const e = px(engineDef);
    for (const top of [e.y + 2, e.y + e.h - 12]) {
      for (let y = top; y < top + 10; y++) {
        for (let x = e.x - R - 8; x < e.x - R + 2; x++) set(x, y, NOZZLE);
      }
    }
  }

  // Abstand jedes Pixels zum Rand (für Kontur, Panzerkante und Zierstreifen)
  const dist = new Uint8Array(W * H);
  let frontier: number[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!get(x, y)) continue;
      if (!get(x - 1, y) || !get(x + 1, y) || !get(x, y - 1) || !get(x, y + 1)) {
        dist[y * W + x] = 1;
        frontier.push(y * W + x);
      }
    }
  }
  for (let d = 2; frontier.length && d < 40; d++) {
    const next: number[] = [];
    for (const i of frontier) {
      for (const j of [i - 1, i + 1, i - W, i + W]) {
        if (j >= 0 && j < W * H && mask[j] && !dist[j]) {
          dist[j] = d;
          next.push(j);
        }
      }
    }
    frontier = next;
  }

  // Einfärben: Licht von oben, Schatten unten, eingelassene Panzerkante, Plattenfugen
  const depth = (x: number, y: number, dir: number, max: number) => {
    let n = 0;
    while (n < max && get(x, y + dir * (n + 1))) n++;
    return n;
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const kind = get(x, y);
      if (!kind) continue;
      const d = dist[y * W + x];
      if (d === 1) {
        ctx.fillStyle = pal.hull[0];
      } else if (kind === GLASS) {
        const lit = y < noseCy - 1 && bayer(x, y) < 0.7;
        ctx.fillStyle = d === 2 ? pal.glass[0] : y <= noseCy - 3 && x % 3 === 0 ? pal.glass[2] : lit ? pal.glass[1] : pal.glass[0];
      } else if (kind === NOZZLE) {
        const up = depth(x, y, -1, 6);
        ctx.fillStyle = up <= 1 ? '#8a93a8' : up <= 3 ? '#5a627a' : '#333a50';
      } else {
        const up = depth(x, y, -1, 12);
        const down = depth(x, y, 1, 12);
        let tone = 3;
        if (up <= 1) tone = 5;
        else if (up <= 4) tone = 4;
        else if (up <= 6 && bayer(x, y) < 0.5) tone = 4;
        if (down <= 2) tone = 1;
        else if (down <= 6) tone = 2;
        else if (down <= 8 && bayer(x, y) < 0.5) tone = 2;
        if (kind === FIN) {
          ctx.fillStyle = pal.accent[tone >= 4 ? 2 : tone <= 2 ? 0 : 1];
        } else {
          if (d === 5) tone = Math.max(1, tone - 1);
          else if (d > 5 && (x + Math.floor(y / 14) * 9) % 26 === 0) tone = Math.max(1, tone - 1);
          ctx.fillStyle = d === 3 && x > noseX - 10 ? pal.accent[tone >= 4 ? 2 : 1] : pal.hull[tone];
        }
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Räume: dunkler Boden mit Kachelmuster, damit die Systemsymbole leuchten
  for (const room of def.rooms) {
    const r = px(room);
    const [a, b] = FLOOR[room.system ?? 'none'];
    for (let ty = 0; ty < room.h; ty++) {
      for (let tx = 0; tx < room.w; tx++) {
        const x = r.x + tx * TILE;
        const y = r.y + ty * TILE;
        ctx.fillStyle = (tx + ty) % 2 ? b : a;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.fillRect(x + 1, y + 1, TILE - 2, 1);
        ctx.fillRect(x + 1, y + 1, 1, TILE - 2);
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(x + 1, y + TILE - 1, TILE - 1, 1);
        ctx.fillRect(x + TILE - 1, y + 1, 1, TILE - 1);
      }
    }
    // Wand: dunkle Linie außen, innen ein Schatten von oben
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, 2);
    ctx.fillStyle = '#0b0f1e';
    ctx.fillRect(r.x, r.y, r.w, 1);
    ctx.fillRect(r.x, r.y + r.h - 1, r.w, 1);
    ctx.fillRect(r.x, r.y, 1, r.h);
    ctx.fillRect(r.x + r.w - 1, r.y, 1, r.h);
  }

  // Geschütztürme auf der Hülle
  def.weapons.forEach((_, index) => {
    const m = weaponMount(def, index);
    const x = SPRITE_PAD + m.x;
    const y = SPRITE_PAD + m.y;
    ctx.fillStyle = '#0b0f1e';
    ctx.fillRect(x - 1, y - 1, 9, 7);
    ctx.fillRect(x + 7, y + 1, 8, 3);
    ctx.fillStyle = '#59637d';
    ctx.fillRect(x, y, 7, 5);
    ctx.fillStyle = '#a4aec6';
    ctx.fillRect(x, y, 7, 1);
    ctx.fillRect(x + 7, y + 2, 7, 1);
    ctx.fillStyle = pal.accent[1];
    ctx.fillRect(x + 2, y + 2, 3, 2);
  });
  return canvas;
}

/** Schildblase als leuchtendes Feld mit hellem Rand. */
export function buildShieldSprite(rx: number, ry: number, layers: number): HTMLCanvasElement {
  const grow = (layers - 1) * 4;
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
        const dx = (x - cx) / (rx + layer * 4);
        const dy = (y - cy) / (ry + layer * 4);
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 1) continue;
        // Rand hell, nach innen schnell abfallend; oben links ein Glanzbogen
        const edge = 1 - d;
        const pixel = 1 / Math.min(rx, ry);
        if (edge < pixel * 1.5) {
          alpha = Math.max(alpha, 220);
          bright = 1;
        } else if (edge < pixel * 4.5) {
          if (bayer(x, y) < 0.6) alpha = Math.max(alpha, 120);
        } else {
          const glow = Math.pow(d, 5);
          const gloss = dx < -0.2 && dy < -0.2 && d > 0.78 && d < 0.88 ? 70 : 0;
          const value = 10 + glow * 60 + gloss;
          if (bayer(x, y) < value / 90) alpha = Math.max(alpha, 46 + gloss);
        }
      }
      const i = (y * W + x) * 4;
      image.data[i] = bright ? 190 : 70;
      image.data[i + 1] = bright ? 235 : 170;
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
