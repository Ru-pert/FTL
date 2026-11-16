// Weltraumhintergrund: Nebel, Planet und ferne Sterne. Wird einmal erzeugt und dann nur noch kopiert.
import { VIEW_H, VIEW_W } from './layout';

/** 4×4-Rastermuster für weiche Farbübergänge mit wenigen Farben. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

export function bayer(x: number, y: number): number {
  return BAYER[(y & 3) * 4 + (x & 3)];
}

export function hash(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
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
  let freq = 1 / 130;
  for (let i = 0; i < 5; i++) {
    sum += smoothNoise(x * freq, y * freq, seed + i * 17) * amp;
    amp /= 2;
    freq *= 2.1;
  }
  return sum / 0.96875;
}

type Ramp = [number, number, number][];

function pick(colors: Ramp, value: number, x: number, y: number): [number, number, number] {
  const scaled = Math.max(0, Math.min(colors.length - 1, value * (colors.length - 1)));
  const index = Math.floor(scaled);
  const up = scaled - index > bayer(x, y) ? 1 : 0;
  return colors[Math.min(colors.length - 1, index + up)];
}

const NEBULA_VIOLET: Ramp = ['#05070f', '#090b1e', '#11102e', '#1c1541', '#2b1d57', '#40276b', '#5a3580'].map(rgb);
const NEBULA_TEAL: Ramp = ['#05070f', '#07121f', '#091e30', '#0d2e42', '#124354', '#1a5c68'].map(rgb);
const PLANET: Ramp = ['#150d1c', '#2e182c', '#55293a', '#84433f', '#b56a45', '#dc9a54', '#f5d28d'].map(rgb);
const MOON: Ramp = ['#10131f', '#252b40', '#454f6c', '#7480a0', '#aab4cc', '#dde3f0'].map(rgb);

export function buildBackground(seed: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(VIEW_W, VIEW_H);
  const put = (x: number, y: number, c: [number, number, number]) => {
    if (x < 0 || y < 0 || x >= VIEW_W || y >= VIEW_H) return;
    const i = (y * VIEW_W + x) * 4;
    image.data[i] = c[0];
    image.data[i + 1] = c[1];
    image.data[i + 2] = c[2];
    image.data[i + 3] = 255;
  };

  // Nebel
  for (let y = 0; y < VIEW_H; y++) {
    for (let x = 0; x < VIEW_W; x++) {
      const density = clouds(x, y, seed);
      const hue = clouds(x + 900, y - 400, seed + 5);
      // Nebelband von links unten nach rechts oben
      const band = 1 - Math.min(1, Math.abs(y - (460 - x * 0.42)) / 280);
      const value = Math.max(0, (density - 0.4) * 2.7) * (0.3 + band * 0.7);
      put(x, y, pick(hue > 0.5 ? NEBULA_TEAL : NEBULA_VIOLET, value, x, y));
    }
  }

  // Ferne Sterne
  const starColors = ['#2f3859', '#5c6a94', '#aab8dc', '#ffffff'].map(rgb);
  for (let i = 0; i < 520; i++) {
    const x = Math.floor(hash(i, 1, seed) * VIEW_W);
    const y = Math.floor(hash(i, 2, seed) * VIEW_H);
    const b = hash(i, 3, seed);
    put(x, y, starColors[b > 0.93 ? 3 : b > 0.7 ? 2 : b > 0.35 ? 1 : 0]);
    if (b > 0.975) {
      // Funkeln: kleines Kreuz
      const tint = hash(i, 4, seed) > 0.5 ? rgb('#9db8ff') : rgb('#ffd9a8');
      for (let d = 1; d <= 2; d++) {
        put(x - d, y, tint);
        put(x + d, y, tint);
        put(x, y - d, tint);
        put(x, y + d, tint);
      }
      put(x, y, starColors[3]);
    }
  }

  // Großer Gasplanet, der oben ins Bild ragt, dazu ein Mond
  sphere(put, 476, -14, 104, seed, PLANET, true);
  sphere(put, 612, 58, 11, seed + 9, MOON, false);
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function sphere(
  put: (x: number, y: number, c: [number, number, number]) => void,
  cx: number,
  cy: number,
  r: number,
  seed: number,
  colors: Ramp,
  banded: boolean,
): void {
  // Licht kommt von links oben
  const lx = -0.5;
  const ly = -0.45;
  const lz = 0.74;
  for (let y = -r - 2; y <= r + 2; y++) {
    for (let x = -r - 2; x <= r + 2; x++) {
      const d = Math.sqrt(x * x + y * y);
      if (d > r + 2) continue;
      if (d > r) {
        // Dünner Atmosphärenschein auf der hellen Seite
        if (x * lx + y * ly > 0 && bayer(cx + x, cy + y) < 0.5) put(cx + x, cy + y, colors[2]);
        continue;
      }
      const nx = x / r;
      const ny = y / r;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      let light = Math.max(0, nx * lx + ny * ly + nz * lz);
      if (banded) {
        // Wolkenbänder, leicht gewellt
        const wave = smoothNoise(x * 0.03, y * 0.03, seed + 3) * 5;
        const bands = smoothNoise(x * 0.012 + 40, (y + wave) * 0.16, seed) - 0.5;
        const swirl = smoothNoise(x * 0.09, y * 0.3, seed + 7) - 0.5;
        light = light * (1 + bands * 0.7 + swirl * 0.18);
      } else {
        // Krater
        light *= 0.8 + smoothNoise(x * 0.5, y * 0.5, seed) * 0.4;
      }
      put(cx + x, cy + y, pick(colors, Math.min(1, light + 0.02), cx + x, cy + y));
    }
  }
}
