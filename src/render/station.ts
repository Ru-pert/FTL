// Die Homebase: eine Raumstation, die mit jedem ausgebauten Modul sichtbar wächst.
import type { ModuleId } from '../data/modules';
import { SHIPS } from '../data/ships';
import type { Profile } from '../meta/profile';
import { buildBackground } from './background';
import { VIEW_H, VIEW_W } from './layout';
import { buildShipSprite, paintPolygon } from './sprites';

type Pts = [number, number][];
type Mat = 'hull' | 'hull2' | 'accent' | 'metal' | 'glass' | 'solar' | 'core';

const RAMPS: Record<Mat, string[]> = {
  hull: ['#12151f', '#3a4256', '#566078', '#7d88a2', '#aab4ca', '#e2e8f4'],
  hull2: ['#0e1420', '#253349', '#36506e', '#4d7296', '#7ea2c2', '#c0dcf0'],
  accent: ['#3a1608', '#8c3a12', '#c85a1a', '#f08a2c', '#ffb968', '#ffe6b8'],
  metal: ['#0d1018', '#272c3a', '#3d4458', '#5b647d', '#8791aa', '#c5cde0'],
  glass: ['#071a30', '#0f3557', '#1b5f93', '#3ad0e0', '#8ff0ff', '#e6fdff'],
  solar: ['#060c1c', '#0e1d44', '#16306e', '#2148a0', '#3e6fd0', '#8fb4ff'],
  core: ['#2a0c06', '#7a2408', '#c8500e', '#ff8a1e', '#ffc760', '#fff0c0'],
};

// Bildgröße der Station und Lage ihres Mittelpunkts darin
const W = 510;
const H = 290;
const CX = 340;
const CY = 145;
/** Bildschirmposition des Stationsmittelpunkts. */
const SCREEN = { x: 400, y: 258 };
/** Mittelpunkt des angedockten Schiffs relativ zur Station. */
const SHIP_X = -215;

const box = (x: number, y: number, w: number, h: number): Pts => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];
const oct = (cx: number, cy: number, r: number): Pts => {
  const k = r * 0.42;
  return [
    [cx - k, cy - r],
    [cx + k, cy - r],
    [cx + r, cy - k],
    [cx + r, cy + k],
    [cx + k, cy + r],
    [cx - k, cy + r],
    [cx - r, cy + k],
    [cx - r, cy - k],
  ];
};

interface Part {
  pts: Pts;
  mat: Mat;
  panels?: boolean;
}

interface Light {
  x: number;
  y: number;
  color: string;
}

/** Bauplätze: hier erscheint ein Umriss, solange das Modul noch nicht gebaut ist. */
const SLOTS: Record<ModuleId, [number, number, number, number]> = {
  reaktor: [-24, -122, 48, 48],
  schild: [60, -94, 38, 34],
  waffen: [78, -12, 50, 44],
  antrieb: [-24, 76, 48, 34],
  dock: [-110, 56, 44, 30],
  werft: [-310, -88, 200, 10],
};

function stationParts(m: Record<ModuleId, number>): { parts: Part[]; lights: Light[] } {
  const parts: Part[] = [];
  const lights: Light[] = [];
  const add = (mat: Mat, pts: Pts, panels = false) => parts.push({ mat, pts, panels });

  // Verbindungsröhren
  add('metal', box(-100, -7, 62, 14));
  if (m.reaktor > 0) add('metal', box(-7, -78, 14, 40));
  if (m.waffen > 0) add('metal', box(38, 3, 44, 14));
  if (m.antrieb > 0) add('metal', box(-7, 38, 14, 40));
  if (m.schild > 0) add('metal', [[24, -36], [34, -26], [74, -58], [64, -68]]);
  if (m.dock > 0) add('metal', [[-34, 26], [-24, 36], [-64, 72], [-74, 62]]);

  // Sonnensegel (immer vorhanden)
  add('metal', [[-30, -30], [-24, -36], [-72, -82], [-78, -76]]);
  add('solar', box(-146, -112, 78, 34), true);
  add('metal', [[30, 30], [24, 36], [68, 80], [74, 74]]);
  add('solar', box(62, 72, 78, 34), true);
  lights.push({ x: -146, y: -112, color: '#5ea0ff' }, { x: 139, y: 105, color: '#5ea0ff' });

  // Werft: Gerüst um das angedockte Schiff
  add('metal', box(-114, -13, 16, 26));
  if (m.werft >= 1) {
    add('accent', box(-312, -88, 204, 8));
    for (const x of [-300, -212, -124]) add('metal', box(x, -80, 6, 14));
    lights.push({ x: -310, y: -84, color: '#ffb040' });
  }
  if (m.werft >= 2) {
    add('accent', box(-312, 80, 204, 8));
    for (const x of [-300, -212, -124]) add('metal', box(x, 66, 6, 14));
    lights.push({ x: -310, y: 84, color: '#ffb040' });
  }
  if (m.werft >= 3) {
    add('hull2', box(-326, -92, 14, 184), true);
    add('hull', box(-334, -22, 10, 44));
    lights.push({ x: -330, y: -18, color: '#5ee06e' }, { x: -330, y: 18, color: '#5ee06e' });
  }

  // Reaktorkammer
  if (m.reaktor >= 2) {
    add('hull', box(-52, -105, 26, 14), true);
    add('hull', box(26, -105, 26, 14), true);
    add('hull', oct(0, -98, 31), true);
  }
  if (m.reaktor >= 1) {
    add('hull2', oct(0, -98, 23), true);
    add('core', oct(0, -98, 10));
  }

  // Schildlabor
  if (m.schild >= 1) {
    add('hull', box(62, -92, 34, 30), true);
    if (m.schild >= 2) {
      add('hull2', [[96, -90], [120, -114], [102, -82]]);
      add('hull2', [[64, -92], [52, -120], [74, -92]]);
      add('hull2', [[96, -64], [122, -58], [96, -72]]);
    }
    add('glass', oct(79, -77, m.schild >= 2 ? 14 : 10));
    lights.push({ x: 79, y: -77, color: '#8ff0ff' });
  }

  // Waffenkammer
  if (m.waffen >= 1) {
    add('metal', box(126, -3, 24, 7));
    add('hull', box(78, -12, 50, 44), true);
    lights.push({ x: 149, y: 0, color: '#ff5050' });
  }
  if (m.waffen >= 2) {
    add('metal', box(126, 40, 24, 7));
    add('hull2', box(92, 30, 36, 26), true);
  }
  if (m.waffen >= 3) {
    for (let i = 0; i < 3; i++) add('accent', box(83 + i * 15, -26, 11, 16));
  }

  // Antriebslabor
  if (m.antrieb >= 2) {
    add('metal', [[-43, 112], [-31, 112], [-29, 126], [-45, 126]]);
    add('metal', [[31, 112], [43, 112], [45, 126], [29, 126]]);
    add('hull2', box(-46, 84, 18, 30), true);
    add('hull2', box(28, 84, 18, 30), true);
  }
  if (m.antrieb >= 1) {
    add('metal', [[-18, 108], [-3, 108], [0, 126], [-21, 126]]);
    add('metal', [[3, 108], [18, 108], [21, 126], [0, 126]]);
    add('hull', box(-24, 76, 48, 34), true);
  }

  // Reparaturdock
  if (m.dock >= 1) {
    add('accent', box(-154, 64, 48, 6));
    add('metal', box(-160, 58, 8, 18));
    add('hull', box(-110, 56, 44, 30), true);
    lights.push({ x: -158, y: 60, color: '#ffe45e' });
  }
  if (m.dock >= 2) {
    add('accent', box(-154, 78, 48, 6));
    add('metal', box(-160, 74, 8, 16));
    add('hull2', box(-100, 84, 24, 14), true);
  }

  // Kern
  add('hull', oct(0, 0, 43), true);
  add('hull2', oct(0, 0, 27), true);
  add('glass', oct(0, 0, 13));
  return { parts, lights };
}

export class StationRenderer {
  private ctx: CanvasRenderingContext2D;
  private background = buildBackground(3);
  private sprite: HTMLCanvasElement | null = null;
  private lights: Light[] = [];
  private builtFor = '';
  private time = 0;
  /** Wie viele Bildschirmpixel ein Spielpixel breit ist. */
  scale = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  private rebuild(modules: Record<ModuleId, number>): void {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const image = ctx.createImageData(W, H);
    const occupied = new Uint8Array(W * H);
    const { parts, lights } = stationParts(modules);
    parts.forEach((part, index) => {
      paintPolygon(
        image.data,
        occupied,
        W,
        H,
        part.pts.map(([x, y]): [number, number] => [x + CX, y + CY]),
        RAMPS[part.mat],
        { panels: part.panels, glass: part.mat === 'glass' || part.mat === 'core', seed: index * 13 + 3 },
      );
    });
    ctx.putImageData(image, 0, 0);
    // Beleuchtete Fenster rund um den Kern
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + 0.2;
      ctx.fillStyle = i % 5 === 0 ? '#5ee6ff' : '#ffe9a0';
      ctx.fillRect(Math.round(CX + Math.cos(angle) * 35), Math.round(CY + Math.sin(angle) * 35), 2, 2);
    }
    this.sprite = canvas;
    this.lights = lights;
  }

  draw(profile: Profile, dtReal: number): void {
    const ctx = this.ctx;
    this.time += dtReal;
    const key = JSON.stringify(profile.modules);
    if (key !== this.builtFor || !this.sprite) {
      this.rebuild(profile.modules);
      this.builtFor = key;
    }
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    ctx.drawImage(this.background, 0, 0);
    // Rechte Seite abdunkeln: dort liegt die Modulliste
    ctx.fillStyle = 'rgba(4, 6, 14, 0.55)';
    ctx.fillRect(636, 0, VIEW_W - 636, VIEW_H);

    const ox = SCREEN.x - CX;
    const oy = SCREEN.y - CY;
    const bob = Math.round(Math.sin(this.time * 0.7) * 1.5);

    // Angedocktes Schiff, aus der Ferne gesehen (halbe Größe)
    const ship = buildShipSprite(SHIPS.eisvogel, false).canvas;
    const sw = Math.round(ship.width / 2);
    const sh = Math.round(ship.height / 2);
    ctx.drawImage(ship, SCREEN.x + SHIP_X - Math.round(sw / 2), SCREEN.y - Math.round(sh / 2) + bob, sw, sh);

    ctx.drawImage(this.sprite!, ox, oy + bob);

    // Umrisse noch nicht gebauter Module
    for (const id of Object.keys(SLOTS) as ModuleId[]) {
      if (profile.modules[id] > 0) continue;
      const [x, y, w, h] = SLOTS[id];
      ctx.fillStyle = '#4a5c8c';
      const sx = SCREEN.x + x;
      const sy = SCREEN.y + y + bob;
      for (let i = 0; i < w; i += 6) {
        ctx.fillRect(sx + i, sy, 3, 1);
        ctx.fillRect(sx + i, sy + h - 1, 3, 1);
      }
      for (let i = 0; i < h; i += 6) {
        ctx.fillRect(sx, sy + i, 1, 3);
        ctx.fillRect(sx + w - 1, sy + i, 1, 3);
      }
    }

    // Reaktorglühen
    if (profile.modules.reaktor > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.25 + 0.2 * Math.sin(this.time * 3);
      ctx.fillStyle = '#ff9a3a';
      const r = 14 + profile.modules.reaktor * 3;
      ctx.fillRect(SCREEN.x - r, SCREEN.y - 98 - r / 2 + bob, r * 2, r);
      ctx.fillRect(SCREEN.x - r / 2, SCREEN.y - 98 - r + bob, r, r * 2);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }

    // Blinklichter
    this.lights.forEach((light, i) => {
      if ((this.time * 0.9 + i * 0.37) % 1.8 > 0.4) return;
      const x = SCREEN.x + light.x;
      const y = SCREEN.y + light.y + bob;
      ctx.fillStyle = light.color;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(x - 3, y - 1, 7, 3);
      ctx.fillRect(x - 1, y - 3, 3, 7);
      ctx.globalAlpha = 1;
      ctx.fillRect(x - 1, y - 1, 3, 3);
    });
  }
}
