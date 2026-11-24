// Die Homebase: eine große Ringstation mit Mittelsäule. Jedes ausgebaute Modul ist sichtbar,
// das eigene Schiff liegt klein am Dock und zeigt, wie groß die Station ist.
import { ellipse } from '../data/shipArt';
import type { ModuleId } from '../data/modules';
import { SHIPS } from '../data/ships';
import type { Profile } from '../meta/profile';
import { buildBackground } from './background';
import { VIEW_H, VIEW_W } from './layout';
import { buildShieldSprite, buildShipMiniature, paintPolygon } from './sprites';

type Pts = [number, number][];
type Mat = 'hull' | 'hull2' | 'accent' | 'metal' | 'glass' | 'solar' | 'core' | 'dark' | 'green';

const RAMPS: Record<Mat, string[]> = {
  hull: ['#12151f', '#3a4256', '#5a6680', '#8591ad', '#b6c0d6', '#eef2fa'],
  hull2: ['#0c1220', '#1f2c44', '#2e4264', '#435f8a', '#6d8db6', '#b2cbe6'],
  accent: ['#3a1608', '#8c3a12', '#c85a1a', '#f08a2c', '#ffb968', '#ffe6b8'],
  metal: ['#0d1018', '#272c3a', '#3d4458', '#5b647d', '#8791aa', '#c5cde0'],
  glass: ['#071a30', '#0f3557', '#1b5f93', '#3ad0e0', '#8ff0ff', '#e6fdff'],
  solar: ['#050a18', '#0c1a3e', '#142a66', '#1f4296', '#3a68c8', '#8fb4ff'],
  core: ['#2a0c06', '#7a2408', '#c8500e', '#ff8a1e', '#ffc760', '#fff0c0'],
  green: ['#06200c', '#0f4a1c', '#1b8a34', '#3ad65a', '#8ff0a0', '#e0ffe6'],
  dark: ['#06080e', '#141a28', '#1c2436', '#263048', '#34405c', '#4a5878'],
};

// Bildgröße der Station und Lage ihres Mittelpunkts im Bild
const W = 650;
const H = 470;
const CX = 405;
const CY = 255;
/** Bildschirmposition des Stationsmittelpunkts. */
const SC = { x: 414, y: 248 };

// Wohnring: schräg von oben gesehen
const RING_RX = 215;
const RING_RY = 58;
const RING_W = 0.885;
const RING_WALL = 16;
const HUB_RX = 78;
const HUB_RY = 32;

/** Wo das Schiff liegt (Mitte, relativ zur Station) und wie groß eine Kachel gezeichnet wird. */
const SHIP_POS = { x: -312, y: 0 };
const SHIP_TILE = 9;

const box = (x: number, y: number, w: number, h: number): Pts => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];

/** Ringband zwischen zwei Winkeln, außen hin und innen zurück. */
function ringBand(t0: number, t1: number, dy = 0): Pts {
  return [
    ...ellipse(0, dy, RING_RX, RING_RY, t0, t1, 40),
    ...ellipse(0, dy, RING_RX * RING_W, RING_RY * RING_W, t1, t0, 40),
  ];
}

/** Senkrechte Wand unter einem Ellipsenbogen. */
function wall(rx: number, ry: number, t0: number, t1: number, height: number): Pts {
  return [...ellipse(0, 0, rx, ry, t0, t1, 40), ...ellipse(0, height, rx, ry, t1, t0, 40)];
}

/** Punkt auf der Mitte des Ringbands. */
function onRing(t: number): [number, number] {
  const k = (1 + RING_W) / 2;
  return [Math.cos(t) * RING_RX * k, Math.sin(t) * RING_RY * k];
}

/** Abschnitt auf dem Ringband (zwischen zwei Radien-Anteilen), z. B. Gewächshaus oder Wohnmodul. */
function ringSegment(t: number, span: number, k0: number, k1: number): Pts {
  return [
    ...ellipse(0, 0, RING_RX * k1, RING_RY * k1, t - span, t + span, 8),
    ...ellipse(0, 0, RING_RX * k0, RING_RY * k0, t + span, t - span, 8),
  ];
}

/** Ausstattung des Ringbands: abwechselnd Gewächshäuser und Wohnmodule. */
function ringDecor(add: (mat: Mat, pts: Pts) => void, front: boolean): void {
  for (let k = 0; k < 12; k++) {
    const t = (k / 12) * Math.PI * 2 + Math.PI / 12;
    if (Math.sin(t) > 0 !== front) continue;
    if (k % 3 === 1) continue;
    add(k % 3 === 0 ? 'green' : 'accent', ringSegment(t, 0.13, 0.9, 0.985));
  }
}

/** Speiche von der Nabe zum Ring als schmales Viereck. */
function spoke(t: number): Pts {
  const [ix, iy] = [Math.cos(t) * HUB_RX * 0.8, Math.sin(t) * HUB_RY * 0.8 + 6];
  const [ox, oy] = [Math.cos(t) * RING_RX * RING_W, Math.sin(t) * RING_RY * RING_W + 6];
  const nx = -Math.sin(t) * 5;
  const ny = Math.cos(t) * 5;
  return [
    [ix + nx, iy - ny],
    [ox + nx, oy - ny],
    [ox - nx, oy + ny],
    [ix - nx, iy + ny],
  ];
}

/** Geschützturm auf dem Ring; dir = Richtung des Rohrs (1 = rechts, -1 = links). */
function turret(x: number, y: number, dir: number): { mat: Mat; pts: Pts }[] {
  return [
    { mat: 'metal', pts: box(dir > 0 ? x + 5 : x - 19, y - 4, 14, 3) },
    { mat: 'hull2', pts: [[x - 8, y + 3], [x - 6, y - 5], [x + 6, y - 5], [x + 8, y + 3]] },
    { mat: 'accent', pts: box(x - 3, y - 3, 6, 3) },
  ];
}

interface Part {
  pts: Pts;
  mat: Mat;
  panels?: boolean;
  stripes?: boolean;
}

interface Light {
  x: number;
  y: number;
  color: string;
}

/** Bauplätze: hier erscheint ein gestrichelter Umriss, solange das Modul fehlt. */
const SLOTS: Record<ModuleId, [number, number, number, number][]> = {
  reaktor: [[-28, -206, 56, 52]],
  schild: [
    [-112, -168, 44, 26],
    [68, -168, 44, 26],
  ],
  waffen: [
    [-136, 26, 34, 18],
    [102, 26, 34, 18],
  ],
  antrieb: [[-34, 150, 68, 34]],
  dock: [[-246, -18, 36, 36]],
  werft: [
    [-398, -66, 176, 10],
    [-398, 56, 176, 10],
  ],
};

function stationParts(m: Record<ModuleId, number>): { parts: Part[]; lights: Light[] } {
  const parts: Part[] = [];
  const lights: Light[] = [];
  const add = (mat: Mat, pts: Pts, opts: { panels?: boolean; stripes?: boolean } = {}) =>
    parts.push({ mat, pts, ...opts });
  const addAll = (list: { mat: Mat; pts: Pts }[]) => list.forEach((p) => add(p.mat, p.pts));

  // --- Werft: Gerüst um das angedockte Schiff (liegt hinter dem Schiff)
  const sx = SHIP_POS.x;
  if (m.werft >= 3) {
    add('hull2', box(sx - 86, -66, 10, 132), { panels: true });
    add('metal', box(sx - 96, -10, 12, 20));
    lights.push({ x: sx - 90, y: -6, color: '#5ee06e' }, { x: sx - 90, y: 6, color: '#5ee06e' });
  }
  if (m.werft >= 1) {
    for (const x of [sx - 70, sx - 10, sx + 50]) add('metal', box(x, -58, 5, 14));
    add('accent', box(sx - 86, -66, 176, 9), { stripes: true });
    lights.push({ x: sx - 84, y: -62, color: '#ffb040' });
  }
  if (m.werft >= 2) {
    for (const x of [sx - 70, sx - 10, sx + 50]) add('metal', box(x, 44, 5, 14));
    add('accent', box(sx - 86, 57, 176, 9), { stripes: true });
    lights.push({ x: sx - 84, y: 61, color: '#ffb040' });
  }

  // --- Sonnensegel über dem Ring (gehören zur Grundausstattung)
  add('metal', box(-170, -118, 340, 5));
  for (const dir of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const x = dir > 0 ? 42 + i * 44 : -42 - i * 44 - 40;
      add('solar', box(x, -138, 40, 18), { panels: true });
      add('solar', box(x, -112, 40, 18), { panels: true });
    }
  }
  lights.push({ x: -170, y: -116, color: '#5ea0ff' }, { x: 170, y: -116, color: '#5ea0ff' });

  // --- Ring, hintere Hälfte
  add('hull2', wall(RING_RX * RING_W, RING_RY * RING_W, Math.PI, Math.PI * 2, RING_WALL));
  add('hull', ringBand(Math.PI, Math.PI * 2), { panels: true });
  ringDecor(add, false);
  for (const t of [Math.PI * 1.25, Math.PI * 1.75]) add('metal', spoke(t));
  if (m.waffen >= 2) {
    for (const t of [Math.PI * 1.15, Math.PI * 1.85]) {
      const [x, y] = onRing(t);
      addAll(turret(x, y - 2, x > 0 ? 1 : -1));
    }
  }

  // --- Mittelsäule
  add('metal', box(-4, -250, 8, 50));
  add('hull', [[-22, -152], [22, -152], [32, -112], [32, -40], [-32, -40], [-32, -112]], { panels: true });
  add('hull2', box(-36, -122, 72, 10));
  add('hull', box(-30, -40, 60, 100));
  add('hull', [[-32, 60], [32, 60], [32, 118], [22, 152], [-22, 152], [-32, 118]], { panels: true });
  add('hull2', box(-36, 92, 72, 10));
  lights.push({ x: 0, y: -250, color: '#ff4040' });

  // Schildlabor: Emitterarme seitlich an der Säule
  if (m.schild >= 1) {
    for (const dir of [-1, 1]) {
      add('metal', [[dir * 30, -146], [dir * 30, -138], [dir * 84, -156], [dir * 84, -164]]);
      add('hull2', box(dir > 0 ? 76 : -100, -168, 24, 20), { panels: true });
      add('glass', ellipse(dir * 88, -168, 9, 9, 0, Math.PI * 2, 16));
      lights.push({ x: dir * 88, y: -168, color: '#8ff0ff' });
    }
  }
  if (m.schild >= 2) {
    for (const dir of [-1, 1]) {
      add('hull2', [[dir * 20, -152], [dir * 46, -190], [dir * 52, -186], [dir * 30, -148]]);
      add('glass', ellipse(dir * 49, -192, 6, 6, 0, Math.PI * 2, 12));
    }
  }

  // Reaktorkammer: glühende Kugel auf der Säule
  if (m.reaktor >= 2) add('hull2', ellipse(0, -178, 44, 11, Math.PI, Math.PI * 2, 24).concat(ellipse(0, -178, 34, 7, Math.PI * 2, Math.PI, 24)));
  if (m.reaktor >= 1) {
    add('metal', [[-18, -152], [18, -152], [12, -166], [-12, -166]]);
    add('core', ellipse(0, -180, 24, 24, 0, Math.PI * 2, 32));
  }
  if (m.reaktor >= 2) add('hull2', ellipse(0, -178, 44, 11, 0, Math.PI, 24).concat(ellipse(0, -178, 34, 7, Math.PI, 0, 24)));

  // Antriebslabor: Triebwerksglocken unten an der Säule
  if (m.antrieb >= 2) {
    for (const dir of [-1, 1]) {
      add('hull2', box(dir > 0 ? 32 : -48, 108, 16, 48), { panels: true });
      add('metal', [[dir * 34, 156], [dir * 46, 156], [dir * 49, 172], [dir * 31, 172]]);
    }
  }
  if (m.antrieb >= 1) {
    for (const x of [-16, 0, 16]) add('metal', [[x - 6, 150], [x + 6, 150], [x + 9, 176], [x - 9, 176]]);
  }

  // Waffenkammer stufe 3: Raketenwerfer an der unteren Säule
  if (m.waffen >= 3) {
    for (const dir of [-1, 1]) add('accent', box(dir > 0 ? 32 : -50, 64, 18, 26), { stripes: true });
  }

  // --- Nabe
  add('hull2', wall(HUB_RX, HUB_RY, 0, Math.PI, 14));
  add('hull', ellipse(0, 0, HUB_RX, HUB_RY, 0, Math.PI * 2, 40), { panels: true });
  add('hull2', ellipse(0, 0, 40, 16, 0, Math.PI * 2, 32));
  add('glass', ellipse(0, -2, 22, 9, 0, Math.PI * 2, 24));

  // --- Ring, vordere Hälfte
  for (const t of [Math.PI * 0.25, Math.PI * 0.75]) add('metal', spoke(t));
  add('hull2', wall(RING_RX, RING_RY, 0, Math.PI, RING_WALL), { stripes: true });
  add('hull', ringBand(0, Math.PI), { panels: true });
  ringDecor(add, true);
  if (m.waffen >= 1) {
    for (const t of [Math.PI * 0.18, Math.PI * 0.82]) {
      const [x, y] = onRing(t);
      addAll(turret(x, y - 2, x > 0 ? 1 : -1));
      lights.push({ x: x + (x > 0 ? 18 : -18), y: y - 3, color: '#ff5050' });
    }
  }

  // --- Andockstelle: einfache Leitung immer, mit Reparaturdock eine Anlegebrücke
  const nose = SHIP_POS.x + 78;
  add('metal', box(nose, -3, -RING_RX - nose + 4, 6));
  if (m.dock >= 1) {
    add('hull2', box(nose - 2, -14, -RING_RX - nose + 10, 28), { panels: true });
    add('accent', box(nose - 6, -18, 10, 36));
    lights.push({ x: nose - 1, y: -16, color: '#ffe45e' }, { x: nose - 1, y: 16, color: '#ffe45e' });
  }
  if (m.dock >= 2) {
    // Kranarm über dem Schiff
    add('metal', [[-226, -8], [-218, -8], [-262, -54], [-270, -54]]);
    add('metal', box(-330, -58, 70, 5));
    add('accent', box(-336, -60, 10, 9));
  }
  return { parts, lights };
}

interface Mover {
  /** Zeitversatz und Geschwindigkeit der Bahn. */
  phase: number;
  speed: number;
}

export class StationRenderer {
  private ctx: CanvasRenderingContext2D;
  private background = buildBackground(3);
  private sprite: HTMLCanvasElement | null = null;
  private lights: Light[] = [];
  private builtFor = '';
  private time = 0;
  private sparks: { x: number; y: number; vx: number; vy: number; age: number }[] = [];
  private shuttles: Mover[] = [
    { phase: 0, speed: 0.11 },
    { phase: 0.55, speed: 0.08 },
  ];
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
        {
          panels: part.panels,
          stripes: part.stripes,
          glass: part.mat === 'glass' || part.mat === 'core',
          bevel: 4,
          seed: index * 13 + 3,
        },
      );
    });
    ctx.putImageData(image, 0, 0);
    // Fensterreihe rund um die Nabe
    for (let i = 0; i < 28; i++) {
      const t = (i / 28) * Math.PI;
      const x = Math.round(CX + Math.cos(t) * (HUB_RX - 4));
      const y = Math.round(CY + Math.sin(t) * (HUB_RY - 2) + 8);
      ctx.fillStyle = i % 4 === 0 ? '#5ee6ff' : '#ffe9a0';
      ctx.fillRect(x, y, 2, 2);
    }
    // Fenster an der Säule
    for (let y = -100; y <= 130; y += 12) {
      if (y > -45 && y < 64) continue;
      ctx.fillStyle = '#ffe9a0';
      ctx.fillRect(CX - 12, CY + y, 3, 2);
      ctx.fillRect(CX + 9, CY + y, 3, 2);
    }
    this.sprite = canvas;
    this.lights = lights;
  }

  draw(profile: Profile, dtReal: number): void {
    const ctx = this.ctx;
    const m = profile.modules;
    this.time += dtReal;
    const time = this.time;
    const key = JSON.stringify(m);
    if (key !== this.builtFor || !this.sprite) {
      this.rebuild(m);
      this.builtFor = key;
    }
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.background, 0, 0);
    // Rechte Seite abdunkeln: dort liegt die Modulliste
    ctx.fillStyle = 'rgba(4, 6, 14, 0.55)';
    ctx.fillRect(636, 0, VIEW_W - 636, VIEW_H);

    const bob = Math.round(Math.sin(time * 0.6) * 2);
    const ox = SC.x;
    const oy = SC.y + bob;
    const px = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(ox + x), Math.round(oy + y), w, h);
    };

    // Shuttles auf der hinteren Bahnhälfte (hinter der Station)
    this.drawShuttles(ox, oy, false);

    ctx.drawImage(this.sprite!, ox - CX, oy - CY);

    // Lichter im drehenden Ring: wandern an der Außenwand entlang
    for (let i = 0; i < 64; i++) {
      const t = (i / 64) * Math.PI * 2 + time * 0.09;
      const s = Math.sin(t);
      if (s < 0.08) continue;
      const x = Math.cos(t) * (RING_RX - 1);
      const y = s * RING_RY + RING_WALL / 2 - 1;
      const lit = (i * 7) % 5 !== 0;
      if (!lit) continue;
      px(x - 1, y, 3, 2, i % 9 === 0 ? '#5ee6ff' : '#ffd890');
    }
    // Lichter auf der Ringoberseite, hinten (nur neben der Säule sichtbar)
    for (let i = 0; i < 40; i++) {
      const t = (i / 40) * Math.PI * 2 + time * 0.09;
      if (Math.sin(t) > -0.1) continue;
      const [x, y] = onRing(t);
      if (Math.abs(x) < 40) continue;
      if (i % 3 === 0) px(x, y, 2, 1, '#ffe9a0');
    }

    // Reaktorglühen
    if (m.reaktor > 0) {
      ctx.globalCompositeOperation = 'lighter';
      const pulse = 0.25 + 0.15 * Math.sin(time * 2.4);
      for (let r = 3; r >= 1; r--) {
        ctx.globalAlpha = pulse / r;
        const size = 24 + r * (6 + m.reaktor * 4);
        ctx.fillStyle = '#ff8a2a';
        ctx.fillRect(Math.round(ox - size * 0.7), Math.round(oy - 180 - size * 0.7), Math.round(size * 1.4), Math.round(size * 1.4));
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // Triebwerksglühen
    if (m.antrieb > 0) {
      const nozzles = [-16, 0, 16].map((x) => [x, 176, 12]);
      if (m.antrieb >= 2) nozzles.push([-40, 172, 14], [40, 172, 14]);
      for (const [x, y, w] of nozzles) {
        const len = 8 + Math.round(Math.sin(time * 30 + x) * 2 + 3);
        ctx.globalAlpha = 0.35;
        px(x - w / 2 - 1, y, w + 2, len + 4, '#2a7de0');
        ctx.globalAlpha = 1;
        px(x - w / 2 + 1, y, w - 2, len, '#7fd4ff');
        px(x - w / 4, y, Math.max(2, w / 2), Math.round(len * 0.5), '#ffffff');
      }
    }

    // Schildlabor Stufe 2: Schutzfeld um die Station
    if (m.schild >= 2) {
      const shield = this.shieldSprite();
      ctx.globalAlpha = 0.32 + 0.06 * Math.sin(time * 1.6);
      ctx.drawImage(shield, Math.round(ox - shield.width / 2), Math.round(oy - 20 - shield.height / 2));
      ctx.globalAlpha = 1;
    }

    // Angedocktes Schiff
    const ship = buildShipMiniature(SHIPS.eisvogel, SHIP_TILE);
    // Mitte des Raumrasters (11 × 6 Kacheln) liegt auf SHIP_POS
    const gridX = ox + SHIP_POS.x - (11 * SHIP_TILE) / 2;
    const gridY = oy + SHIP_POS.y - 3 * SHIP_TILE;
    ctx.drawImage(ship.canvas, Math.round(gridX - ship.ox), Math.round(gridY - ship.oy));

    // Reparaturdrohnen schwirren um das Schiff
    const drones = m.dock * 2;
    for (let i = 0; i < drones; i++) {
      const t = time * (0.5 + i * 0.13) + i * 1.7;
      const x = SHIP_POS.x + Math.cos(t) * (40 + i * 6);
      const y = Math.sin(t * 1.3) * (30 + i * 3);
      px(x - 1, y - 1, 3, 2, '#c5cde0');
      if (Math.sin(time * 6 + i) > 0.6) px(x, y + 1, 1, 1, '#5ee06e');
      if (Math.random() < dtReal * 1.5) this.spark(ox + x, oy + y);
    }
    // Werft Stufe 3: Schweißfunken am Schiff
    if (m.werft >= 3 && Math.random() < dtReal * 6) {
      this.spark(ox + SHIP_POS.x + (Math.random() - 0.5) * 100, oy + (Math.random() - 0.5) * 50);
    }
    this.drawSparks(dtReal);

    // Shuttles auf der vorderen Bahnhälfte
    this.drawShuttles(ox, oy, true);

    // Umrisse noch nicht gebauter Module
    ctx.fillStyle = '#5a6e9c';
    for (const id of Object.keys(SLOTS) as ModuleId[]) {
      if (m[id] > 0) continue;
      for (const [x, y, w, h] of SLOTS[id]) {
        const sx = Math.round(ox + x);
        const sy = Math.round(oy + y);
        for (let i = 0; i < w; i += 6) {
          ctx.fillRect(sx + i, sy, 3, 1);
          ctx.fillRect(sx + i, sy + h - 1, 3, 1);
        }
        for (let i = 0; i < h; i += 6) {
          ctx.fillRect(sx, sy + i, 1, 3);
          ctx.fillRect(sx + w - 1, sy + i, 1, 3);
        }
      }
    }

    // Blinklichter
    this.lights.forEach((light, i) => {
      if ((time * 0.9 + i * 0.37) % 1.8 > 0.4) return;
      const x = Math.round(ox + light.x);
      const y = Math.round(oy + light.y);
      ctx.fillStyle = light.color;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(x - 3, y - 1, 7, 3);
      ctx.fillRect(x - 1, y - 3, 3, 7);
      ctx.globalAlpha = 1;
      ctx.fillRect(x - 1, y - 1, 3, 3);
    });
  }

  private shieldCache: HTMLCanvasElement | null = null;
  private shieldSprite(): HTMLCanvasElement {
    if (!this.shieldCache) this.shieldCache = buildShieldSprite(250, 222, 1);
    return this.shieldCache;
  }

  /** Kleine Fähren, die auf einer schrägen Bahn um die Station kreisen. */
  private drawShuttles(ox: number, oy: number, front: boolean): void {
    const ctx = this.ctx;
    for (const [i, s] of this.shuttles.entries()) {
      const t = (this.time * s.speed + s.phase) * Math.PI * 2;
      const inFront = Math.sin(t) > 0;
      if (inFront !== front) continue;
      const rx = 285 + i * 30;
      const ry = 120 - i * 20;
      const x = Math.round(ox + Math.cos(t) * rx);
      const y = Math.round(oy - 30 + i * 60 + Math.sin(t) * ry);
      const dir = Math.cos(t + Math.PI / 2) > 0 ? 1 : -1;
      ctx.fillStyle = '#0b0e18';
      ctx.fillRect(x - 4, y - 2, 9, 5);
      ctx.fillStyle = front ? '#c5cde0' : '#7a849e';
      ctx.fillRect(x - 3, y - 1, 7, 3);
      ctx.fillStyle = '#5ee6ff';
      ctx.fillRect(dir > 0 ? x + 2 : x - 3, y - 1, 2, 1);
      ctx.fillStyle = '#ffae3d';
      ctx.fillRect(dir > 0 ? x - 5 : x + 4, y, 2, 1);
    }
  }

  private spark(x: number, y: number): void {
    for (let i = 0; i < 4; i++) {
      this.sparks.push({ x, y, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.7) * 50, age: 0 });
    }
  }

  private drawSparks(dtReal: number): void {
    const ctx = this.ctx;
    this.sparks = this.sparks.filter((p) => (p.age += dtReal) < 0.4);
    for (const p of this.sparks) {
      p.x += p.vx * dtReal;
      p.y += p.vy * dtReal;
      p.vy += 80 * dtReal;
      ctx.fillStyle = p.age < 0.15 ? '#ffffff' : '#ffd75e';
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
  }
}
