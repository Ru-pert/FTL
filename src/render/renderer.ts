// Darstellung des Kampfs. Liest den Spielzustand nur, ändert ihn nie.
import { SHIPS } from '../data/ships';
import { WEAPONS } from '../data/weapons';
import { capacity, DT, other } from '../sim/battle';
import type { BattleState, GameEvent, Projectile, Side } from '../sim/types';
import { buildBackground } from './background';
import {
  HULL_MARGIN,
  roomCenter,
  roomRect,
  shieldEllipse,
  shipOrigin,
  shipSize,
  TILE,
  VIEW_H,
  VIEW_W,
  weaponMuzzle,
} from './layout';
import { buildShieldSprite, buildShipSprite, drawIcon, PALETTES, SPRITE_PAD, SYSTEM_ICONS } from './sprites';

export const WEAPON_COLORS = ['#5ee6ff', '#ff7ad9', '#ffe45e', '#9dff7a'];

const FLAMES: Record<Side, [string, string, string]> = {
  player: ['#2a7de0', '#7fd4ff', '#ffffff'],
  enemy: ['#e0561e', '#ffae3d', '#fff3c4'],
};

interface Effect {
  kind: 'boom' | 'spark' | 'debris' | 'smoke';
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
}

interface Star {
  x: number;
  y: number;
  speed: number;
  color: string;
}

export interface ViewState {
  selectedWeapon: number | null;
  hoverRoom: number | null;
}

/** Bildschirmposition eines Geschosses; extra = zusätzliche Sekunden für weiche Bewegung. */
export function projectilePos(state: BattleState, proj: Projectile, extra = 0): { x: number; y: number } {
  const targetSide = other(proj.from);
  const a = weaponMuzzle(proj.from, SHIPS[state[proj.from].defId], proj.weaponIndex);
  const b = roomCenter(targetSide, SHIPS[state[targetSide].defId], proj.targetRoom);
  const p = Math.max(0, (proj.t + extra) / proj.duration);
  return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private background: HTMLCanvasElement;
  private sprites: Record<Side, HTMLCanvasElement>;
  private shieldSprites = new Map<string, HTMLCanvasElement>();
  private effects: Effect[] = [];
  private stars: Star[] = [];
  private time = 0;
  private shieldFlash: Record<Side, number> = { player: 0, enemy: 0 };
  private hitFlash: Record<Side, number> = { player: 0, enemy: 0 };
  private muzzleFlash: { side: Side; index: number; age: number }[] = [];
  private deadFor: Record<Side, number | null> = { player: null, enemy: null };

  constructor(canvas: HTMLCanvasElement, state: BattleState) {
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.background = buildBackground(3);
    this.sprites = {
      player: buildShipSprite(SHIPS[state.player.defId], PALETTES.player),
      enemy: buildShipSprite(SHIPS[state.enemy.defId], PALETTES.enemy),
    };
    // Nahe Sterne, die langsam vorbeiziehen (rein dekorativ, daher eigener einfacher Zufall)
    let seed = 7;
    const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < 46; i++) {
      const depth = rand();
      this.stars.push({
        x: rand() * VIEW_W,
        y: rand() * VIEW_H,
        speed: 2 + depth * 9,
        color: depth > 0.8 ? '#ffffff' : depth > 0.4 ? '#b4c2e6' : '#7483ad',
      });
    }
  }

  handleEvents(events: GameEvent[], state: BattleState): void {
    for (const ev of events) {
      if (ev.type === 'hit') {
        const c = roomCenter(ev.target, SHIPS[state[ev.target].defId], ev.room);
        this.explode(c.x, c.y, 6 + ev.damage * 3);
        this.hitFlash[ev.target] = 0.12;
      } else if (ev.type === 'shieldHit') {
        const p = projectilePos(state, ev.proj);
        this.shieldFlash[ev.target] = 0.3;
        this.effects.push({ kind: 'spark', x: p.x, y: p.y, vx: 0, vy: 0, age: 0, life: 0.3, size: 6 });
      } else if (ev.type === 'fire') {
        this.muzzleFlash.push({ side: ev.side, index: ev.weaponIndex, age: 0 });
      } else if (ev.type === 'destroyed') {
        this.deadFor[ev.side] = 0;
      }
    }
  }

  private explode(x: number, y: number, size: number): void {
    this.effects.push({ kind: 'boom', x, y, vx: 0, vy: 0, age: 0, life: 0.45, size });
    for (let i = 0; i < 7; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 50;
      this.effects.push({
        kind: 'debris',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        age: 0,
        life: 0.4 + Math.random() * 0.5,
        size: Math.random() < 0.4 ? 2 : 1,
      });
    }
  }

  draw(state: BattleState, alpha: number, view: ViewState, dtReal: number): void {
    const ctx = this.ctx;
    this.time += dtReal;

    ctx.drawImage(this.background, 0, 0);
    for (const star of this.stars) {
      star.x -= star.speed * dtReal;
      if (star.x < 0) star.x += VIEW_W;
      ctx.fillStyle = star.color;
      ctx.fillRect(Math.floor(star.x), Math.floor(star.y), 1, 1);
    }

    for (const side of ['player', 'enemy'] as const) this.drawShip(state, side, view, dtReal);
    this.drawMuzzleFlashes(state, dtReal);
    this.drawProjectiles(state, alpha, dtReal);
    this.drawEffects(dtReal);
  }

  private drawShip(state: BattleState, side: Side, view: ViewState, dtReal: number): void {
    const ctx = this.ctx;
    const ship = state[side];
    const def = SHIPS[ship.defId];
    const origin = shipOrigin(side, def);
    const { cols, rows } = shipSize(def);

    // Zerstörung: Explosionen, dann verschwindet das Schiff
    let shipAlpha = 1;
    const dead = this.deadFor[side];
    if (dead !== null) {
      this.deadFor[side] = dead + dtReal;
      shipAlpha = Math.max(0, 1 - dead / 1.6);
      if (dead < 1.4 && Math.random() < dtReal * 14) {
        this.explode(
          origin.x + Math.random() * cols * TILE,
          origin.y + Math.random() * rows * TILE,
          8 + Math.random() * 10,
        );
      }
      if (shipAlpha <= 0) return;
    }
    ctx.globalAlpha = shipAlpha;

    // Triebwerksflammen: außen farbig, innen hell
    const engineRoom = def.rooms.find((r) => r.system === 'engines');
    if (engineRoom && ship.systems.engines.power > 0 && dead === null) {
      const rect = roomRect(side, def, engineRoom);
      const dir = side === 'player' ? -1 : 1;
      const baseX = side === 'player' ? rect.x - HULL_MARGIN - 8 : rect.x + rect.w + HULL_MARGIN + 8;
      const [outer, mid, core] = FLAMES[side];
      for (const cy of [rect.y + 7, rect.y + rect.h - 7]) {
        const len = 5 + ship.systems.engines.power * 4 + Math.floor(Math.random() * 4);
        const part = (color: string, length: number, height: number) => {
          ctx.fillStyle = color;
          ctx.fillRect(dir < 0 ? baseX - length : baseX, cy - height / 2, length, height);
        };
        ctx.globalAlpha = shipAlpha * 0.35;
        part(outer, len + 4, 8);
        ctx.globalAlpha = shipAlpha;
        part(outer, len, 6);
        part(mid, Math.round(len * 0.7), 4);
        part(core, Math.round(len * 0.4), 2);
      }
    }

    // Schiffskörper
    const sprite = this.sprites[side];
    const drawSprite = () => {
      if (side === 'player') {
        ctx.drawImage(sprite, origin.x - SPRITE_PAD, origin.y - SPRITE_PAD);
      } else {
        ctx.save();
        ctx.translate(origin.x + cols * TILE + SPRITE_PAD, origin.y - SPRITE_PAD);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, 0, 0);
        ctx.restore();
      }
    };
    drawSprite();
    // Kurzes Aufblitzen bei einem Treffer
    if (this.hitFlash[side] > 0) {
      this.hitFlash[side] -= dtReal;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = shipAlpha * 0.45;
      drawSprite();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = shipAlpha;
    }

    // Systeme: Konsole mit Symbol, Schaden blinkt rot
    for (const room of def.rooms) {
      if (!room.system) continue;
      const sys = ship.systems[room.system];
      const rect = roomRect(side, def, room);
      if (sys.damage > 0) {
        const blink = 0.3 + 0.15 * Math.sin(this.time * 8);
        ctx.fillStyle = `rgba(255, 60, 40, ${blink})`;
        ctx.fillRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
      }
      const color =
        capacity(sys) <= 0 ? '#ff5d5d' : sys.damage > 0 ? '#ffb347' : sys.power > 0 ? '#7df08a' : '#8a93a0';
      const ix = rect.x + Math.floor(rect.w / 2) - 6;
      const iy = rect.y + Math.floor(rect.h / 2) - 6;
      ctx.fillStyle = '#0b0f1e';
      ctx.fillRect(ix - 1, iy, 15, 13);
      ctx.fillRect(ix, iy - 1, 13, 15);
      ctx.fillStyle = '#1a2138';
      ctx.fillRect(ix, iy, 13, 13);
      ctx.fillStyle = color;
      ctx.globalAlpha = shipAlpha * 0.25;
      ctx.fillRect(ix, iy, 13, 1);
      ctx.fillRect(ix, iy + 12, 13, 1);
      ctx.fillRect(ix, iy, 1, 13);
      ctx.fillRect(ix + 12, iy, 1, 13);
      ctx.globalAlpha = shipAlpha;
      drawIcon(ctx, SYSTEM_ICONS[room.system], ix + 2, iy + 2, color);
    }

    // Zielmarkierungen und Auswahl auf dem gegnerischen Schiff
    if (side === 'enemy' && dead === null) {
      state.player.weapons.forEach((weapon, index) => {
        if (weapon.target === null) return;
        const room = def.rooms.find((r) => r.id === weapon.target);
        if (room) this.drawBrackets(roomRect(side, def, room), WEAPON_COLORS[index % WEAPON_COLORS.length], index * 2);
      });
      if (view.selectedWeapon !== null && view.hoverRoom !== null) {
        const room = def.rooms.find((r) => r.id === view.hoverRoom);
        if (room) {
          const r = roomRect(side, def, room);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.fillRect(r.x, r.y, r.w, r.h);
          this.drawBrackets(r, '#ffffff', 0);
        }
      }
    }

    // Schildblase
    this.shieldFlash[side] = Math.max(0, this.shieldFlash[side] - dtReal);
    const flash = this.shieldFlash[side] > 0;
    if (ship.shieldLayers > 0 || flash) {
      const e = shieldEllipse(side, def);
      const layers = Math.max(1, ship.shieldLayers);
      const key = `${side}:${layers}`;
      let shield = this.shieldSprites.get(key);
      if (!shield) {
        shield = buildShieldSprite(e.rx, e.ry, layers);
        this.shieldSprites.set(key, shield);
      }
      const x = Math.round(e.cx - shield.width / 2);
      const y = Math.round(e.cy - shield.height / 2);
      ctx.globalAlpha = shipAlpha * (ship.shieldLayers > 0 ? 0.8 + 0.12 * Math.sin(this.time * 2.5) : 0.5);
      ctx.drawImage(shield, x, y);
      if (flash) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = shipAlpha * Math.min(1, this.shieldFlash[side] / 0.2);
        ctx.drawImage(shield, x, y);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawBrackets(r: { x: number; y: number; w: number; h: number }, color: string, inset: number): void {
    const ctx = this.ctx;
    const x0 = r.x + 1 + inset;
    const y0 = r.y + 1 + inset;
    const x1 = r.x + r.w - 2 - inset;
    const y1 = r.y + r.h - 2 - inset;
    const len = 5;
    ctx.fillStyle = color;
    for (const [x, y, sx, sy] of [
      [x0, y0, 1, 1],
      [x1, y0, -1, 1],
      [x0, y1, 1, -1],
      [x1, y1, -1, -1],
    ]) {
      ctx.fillRect(sx > 0 ? x : x - len + 1, y, len, 1);
      ctx.fillRect(x, sy > 0 ? y : y - len + 1, 1, len);
    }
  }

  private drawMuzzleFlashes(state: BattleState, dtReal: number): void {
    const ctx = this.ctx;
    this.muzzleFlash = this.muzzleFlash.filter((m) => (m.age += dtReal) < 0.12);
    for (const m of this.muzzleFlash) {
      const p = weaponMuzzle(m.side, SHIPS[state[m.side].defId], m.index);
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 2, y - 1, 5, 3);
      ctx.fillRect(x - 1, y - 2, 3, 5);
    }
  }

  private drawProjectiles(state: BattleState, alpha: number, dtReal: number): void {
    const ctx = this.ctx;
    for (const proj of state.projectiles) {
      if (proj.t + alpha * DT < 0) continue;
      const head = projectilePos(state, proj, alpha * DT);
      const tail = projectilePos(state, proj, alpha * DT - 0.06);
      const def = WEAPONS[proj.weaponId];
      if (def.kind === 'torpedo') {
        if (dtReal > 0 && Math.random() < 0.6) {
          this.effects.push({ kind: 'smoke', x: tail.x, y: tail.y, vx: 0, vy: 0, age: 0, life: 0.5, size: 2 });
        }
        this.line(tail.x, tail.y, head.x, head.y, '#c9ccd6', 3);
        const mid = projectilePos(state, proj, alpha * DT - 0.02);
        this.line(mid.x, mid.y, head.x, head.y, '#e8792b', 3);
        ctx.fillStyle = '#ffe9a0';
        ctx.fillRect(Math.round(tail.x) - 1, Math.round(tail.y) - 1, 3, 3);
      } else {
        const color = proj.from === 'player' ? '#5dff9c' : '#ff5a4a';
        ctx.globalAlpha = 0.28;
        this.line(tail.x, tail.y, head.x, head.y, color, 5);
        ctx.globalAlpha = 1;
        this.line(tail.x, tail.y, head.x, head.y, color, 3);
        const core = projectilePos(state, proj, alpha * DT - 0.04);
        this.line(core.x, core.y, head.x, head.y, '#ffffff', 1);
      }
    }
  }

  /** Pixelgenaue Linie ohne Kantenglättung. */
  private line(x0: number, y0: number, x1: number, y1: number, color: string, thickness: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    const half = Math.floor(thickness / 2);
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / steps);
      const y = Math.round(y0 + ((y1 - y0) * i) / steps);
      ctx.fillRect(x - half, y - half, thickness, thickness);
    }
  }

  private drawEffects(dtReal: number): void {
    const ctx = this.ctx;
    this.effects = this.effects.filter((fx) => (fx.age += dtReal) < fx.life);
    for (const fx of this.effects) {
      fx.x += fx.vx * dtReal;
      fx.y += fx.vy * dtReal;
      const p = fx.age / fx.life;
      const x = Math.round(fx.x);
      const y = Math.round(fx.y);
      if (fx.kind === 'boom') {
        // Feuerball aus drei Ringen, innen hell, löst sich von innen auf
        const r = fx.size * (0.35 + p * 0.85);
        const hole = p > 0.45 ? r * ((p - 0.45) / 0.55) : -1;
        for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
          for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d > r || d < hole) continue;
            const t = d / r;
            ctx.fillStyle = p < 0.15 ? '#ffffff' : t < 0.4 ? '#fff3c4' : t < 0.75 ? '#ffb13d' : '#e0561e';
            ctx.fillRect(x + dx, y + dy, 1, 1);
          }
        }
      } else if (fx.kind === 'debris') {
        ctx.fillStyle = p < 0.4 ? '#ffe9a0' : p < 0.7 ? '#ff8a2a' : '#6a4a4a';
        ctx.fillRect(x, y, fx.size, fx.size);
      } else if (fx.kind === 'smoke') {
        ctx.globalAlpha = 0.5 * (1 - p);
        ctx.fillStyle = '#9aa3b8';
        ctx.fillRect(x - 1, y - 1, fx.size, fx.size);
        ctx.globalAlpha = 1;
      } else {
        const r = Math.round(fx.size * p) + 1;
        ctx.fillStyle = '#e8fbff';
        ctx.fillRect(x - r, y, r * 2 + 1, 1);
        ctx.fillRect(x, y - r, 1, r * 2 + 1);
        ctx.fillRect(x - 1, y - 1, 3, 3);
      }
    }
  }
}
