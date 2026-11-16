// Weltraumhintergrund: Nebel, Planet und ferne Sterne. Wird einmal erzeugt und dann nur noch kopiert.
import { VIEW_H, VIEW_W } from './layout';

/** 4×4-Rastermuster für weiche Farbübergänge mit wenigen Farben. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

export function bayer(x: number, y: number): number {
  return BAYER[(y & 3) * 4 + (x & 3)];
}

function hash(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smoothNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const top = hash(xi, yi, seed) * (1 - sx) + hash(xi + 1, yi, seed) * sx;
  const bottom = hash(xi, yi + 1, seed) * (1 - sx) + hash(xi + 1, yi + 1, seed) * sx;
  return top * (1 - sy) + bottom * sy;
}

/** Mehrere Schichten Rauschen übereinander: ergibt wolkige Strukturen. */
function clouds(x: number, y: number, seed: number): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1 / 90;
  for (let i = 0; i < 4; i++) {
    sum += smoothNoise(x * freq, y * freq, seed + i * 17) * amp;
    amp /= 2;
    freq *= 2.1;
  }
  return sum / 0.9375;
}

function ramp(colors: string[], value: number, x: number, y: number): string {
  const scaled = Math.max(0, Math.min(colors.length - 1, value * (colors.length - 1)));
  const index = Math.floor(scaled);
  const up = scaled - index > bayer(x, y) ? 1 : 0;
  return colors[Math.min(colors.length - 1, index + up)];
}

const NEBULA_VIOLET = ['#060814', '#0b0e24', '#141233', '#201745', '#30205a', '#45286a'];
const NEBULA_TEAL = ['#060814', '#081424', '#0a2034', '#0e3044', '#134454'];
const PLANET = ['#1c1226', '#3d2036', '#703a40', '#a85e44', '#d6934f', '#f2cd88'];

export function buildBackground(seed: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const ctx = canvas.getContext('2d')!;

  // Nebel
  for (let y = 0; y < VIEW_H; y++) {
    for (let x = 0; x < VIEW_W; x++) {
      const density = clouds(x, y, seed);
      const hue = clouds(x + 900, y - 400, seed + 5);
      // Nebelband von links unten nach rechts oben
      const band = 1 - Math.min(1, Math.abs(y - (300 - x * 0.42)) / 190);
      const value = Math.max(0, (density - 0.4) * 2.6) * (0.35 + band * 0.65);
      ctx.fillStyle = ramp(hue > 0.5 ? NEBULA_TEAL : NEBULA_VIOLET, value, x, y);
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Ferne Sterne
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(hash(i, 1, seed) * VIEW_W);
    const y = Math.floor(hash(i, 2, seed) * VIEW_H);
    const b = hash(i, 3, seed);
    ctx.fillStyle = b > 0.93 ? '#ffffff' : b > 0.7 ? '#aab8dc' : b > 0.35 ? '#5c6a94' : '#353f63';
    ctx.fillRect(x, y, 1, 1);
    if (b > 0.975) {
      // Funkeln: kleines Kreuz
      ctx.fillStyle = '#8fa6d8';
      ctx.fillRect(x - 1, y, 3, 1);
      ctx.fillRect(x, y - 1, 1, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, 1, 1);
    }
  }

  drawPlanet(ctx, 322, 66, 30, seed, PLANET);
  drawPlanet(ctx, 381, 34, 6, seed + 9, ['#141826', '#2a3148', '#4d5876', '#8792ad', '#c3cbdc']);
  return canvas;
}

function drawPlanet(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  seed: number,
  colors: string[],
): void {
  // Licht kommt von links oben
  const lx = -0.55;
  const ly = -0.6;
  const lz = 0.58;
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d2 = x * x + y * y;
      if (d2 > r * r) continue;
      const nx = x / r;
      const ny = y / r;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      let light = Math.max(0, nx * lx + ny * ly + nz * lz);
      // Wolkenbänder
      const bands = smoothNoise(x * 0.05 + 40, y * 0.42 + nx * 2, seed) - 0.5;
      light = light * 0.95 + bands * 0.22 * light + 0.03;
      ctx.fillStyle = ramp(colors, light, cx + x, cy + y);
      ctx.fillRect(cx + x, cy + y, 1, 1);
    }
  }
}
