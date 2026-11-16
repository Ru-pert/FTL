// Darstellung des Kampfs. Liest den Spielzustand nur, ändert ihn nie.
import { SHIP_ART } from '../data/shipArt';
import { SHIPS } from '../data/ships';
import { WEAPONS } from '../data/weapons';
import { capacity, DT, other } from '../sim/battle';
import type { BattleState, GameEvent, Projectile, Side } from '../sim/types';
import { buildBackground } from './background';
import {
  localToScreen,
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
import { buildShieldSprite, buildShipSprite, drawIcon, type ShipSprite, SYSTEM_ICONS } from './sprites';

export const WEAPON_COLORS = ['#5ee6ff', '#ff7ad9', '#ffe45e', '#9dff7a'];

type EffectKind = 'boom' | 'ring' | 'ripple' | 'debris' | 'smoke' | 'ember' | 'spark';

interface Effect {
  kind: EffectKind;
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
  size: number;
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
  private sprites: Record<Side, ShipSprite>;
  private shieldSprites = new Map<string, HTMLCanvasElement>();
  private effects: Effect[] = [];
  private stars: Star[] = [];
  private time = 0;
  private shake = 0;
  private screenFlash = 0;
  private shieldFlash: Record<Side, number> = { player: 0, enemy: 0 };
  private hitFlash: Record<Side, number> = { player: 0, enemy: 0 };
  private muzzleFlash: { side: Side; index: number; age: number }[] = [];
  private deadFor: Record<Side, number | null> = { player: null, enemy: null };
  /** Wie viele Bildschirmpixel ein Spielpixel breit ist. */
  scale = 1;

  constructor(canvas: HTMLCanvasElement, state: BattleState) {
    this.ctx = canvas.getContext('2d')!;
    this.background = buildBackground(3);
    this.sprites = {
      player: buildShipSprite(SHIPS[state.player.defId], false),
      enemy: buildShipSprite(SHIPS[state.enemy.defId], true),
    };
    // Nahe Sterne und Staub, die langsam vorbeiziehen (rein dekorativ, daher eigener einfacher Zufall)
    let seed = 7;
    const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < 70; i++) {
      const depth = rand();
      this.stars.push({
        x: rand() * VIEW_W,
        y: rand() * VIEW_H,
        speed: 3 + depth * 16,
        color: depth > 0.8 ? '#ffffff' : depth > 0.4 ? '#b4c2e6' : '#7483ad',
        size: depth > 0.92 ? 2 : 1,
      });
    }
  }

  handleEvents(events: GameEvent[], state: BattleState): void {
    for (const ev of events) {
      if (ev.type === 'hit') {
        const c = roomCenter(ev.target, SHIPS[state[ev.target].defId], ev.room);
        this.explode(c.x, c.y, 9 + ev.damage * 4);
        this.hitFlash[ev.target] = 0.14;
        this.shake = Math.max(this.shake, ev.target === 'player' ? 0.22 : 0.1);
      } else if (ev.type === 'shieldHit') {
        const p = projectilePos(state, ev.proj);
        this.shieldFlash[ev.target] = 0.35;
        this.add('ripple', p.x, p.y, 0, 0, 0.45, 30);
        for (let i = 0; i < 6; i++) this.scatter('spark', p.x, p.y, 30, 90, 0.25, 1);
      } else if (ev.type === 'fire') {
        this.muzzleFlash.push({ side: ev.side, index: ev.weaponIndex, age: 0 });
      } else if (ev.type === 'destroyed') {
        this.deadFor[ev.side] = 0;
        this.screenFlash = 0.35;
        this.shake = 0.6;
        const e = shieldEllipse(ev.side, SHIPS[state[ev.side].defId]);
        this.add('ring', e.cx, e.cy, 0, 0, 0.9, e.rx * 1.3);
      }
    }
  }

  private add(kind: EffectKind, x: number, y: number, vx: number, vy: number, life: number, size: number): void {
    this.effects.push({ kind, x, y, vx, vy, age: 0, life, size });
  }

  private scatter(kind: EffectKind, x: number, y: number, minSpeed: number, maxSpeed: number, life: number, size: number): void {
    const angle = Math.random() * Math.PI * 2;
    const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
    this.add(kind, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, life * (0.6 + Math.random() * 0.8), size);
  }

  private explode(x: number, y: number, size: number): void {
    this.add('boom', x, y, 0, 0, 0.5, size);
    this.add('ring', x, y, 0, 0, 0.4, size * 2.2);
    for (let i = 0; i < 12; i++) this.scatter('debris', x, y, 25, 110, 0.6, Math.random() < 0.35 ? 2 : 1);
    for (let i = 0; i < 5; i++) this.scatter('smoke', x, y, 4, 18, 1.1, 3 + Math.floor(Math.random() * 3));
  }

  draw(state: BattleState, alpha: number, view: ViewState, dtReal: number): void {
    const ctx = this.ctx;
    this.time += dtReal;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.imageSmoothingEnabled = false;

    // Bildwackeln bei Treffern
    this.shake = Math.max(0, this.shake - dtReal);
    if (this.shake > 0) {
      const amp = Math.min(4, this.shake * 14);
      ctx.translate(Math.round((Math.random() - 0.5) * amp * 2), Math.round((Math.random() - 0.5) * amp * 2));
    }

    ctx.drawImage(this.background, 0, 0);
    for (const star of this.stars) {
      star.x -= star.speed * dtReal;
      if (star.x < 0) star.x += VIEW_W;
      ctx.fillStyle = star.color;
      ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
    }

    for (const side of ['player', 'enemy'] as const) this.drawShip(state, side, view, dtReal);
    this.drawMuzzleFlashes(state, dtReal);
    this.drawProjectiles(state, alpha, dtReal);
    this.drawEffects(dtReal);

    if (this.screenFlash > 0) {
      this.screenFlash -= dtReal;
      ctx.globalAlpha = Math.max(0, Math.min(0.7, this.screenFlash * 2.2));
      ctx.fillStyle = '#fff6e0';
      ctx.fillRect(-8, -8, VIEW_W + 16, VIEW_H + 16);
      ctx.globalAlpha = 1;
    }
  }

  private drawShip(state: BattleState, side: Side, view: ViewState, dtReal: number): void {
    const ctx = this.ctx;
    const ship = state[side];
    const def = SHIPS[ship.defId];
    const art = SHIP_ART[def.id];
    const origin = shipOrigin(side, def);
    const { cols, rows } = shipSize(def);
    const sprite = this.sprites[side];
    const moving = dtReal > 0;

    // Zerstörung: Explosionen, dann verschwindet das Schiff
    let shipAlpha = 1;
    const dead = this.deadFor[side];
    if (dead !== null) {
      this.deadFor[side] = dead + dtReal;
      shipAlpha = Math.max(0, 1 - dead / 1.6);
      if (dead < 1.4 && Math.random() < dtReal * 16) {
        this.explode(
          origin.x + Math.random() * cols * TILE,
          origin.y + Math.random() * rows * TILE,
          10 + Math.random() * 14,
        );
      }
      if (shipAlpha <= 0) return;
    }

    // Das Schiff schwebt ganz leicht auf und ab
    const bob = Math.round(Math.sin(this.time * 1.1 + (side === 'player' ? 0 : 2)) * 1.5);
    ctx.save();
    ctx.translate(0, bob);
    ctx.globalAlpha = shipAlpha;

    // Triebwerksflammen
    const enginePower = ship.systems.engines.power;
    if (dead === null) {
      const dir = side === 'player' ? -1 : 1;
      const [outer, mid, core] = art.flame;
      for (const engine of art.engines) {
        const p = localToScreen(side, def, engine.x * TILE, engine.y * TILE);
        const x0 = Math.round(p.x);
        const y0 = Math.round(p.y);
        // Glühen der Düse auch im Leerlauf
        ctx.fillStyle = enginePower > 0 ? mid : '#5a3a2a';
        ctx.fillRect(dir < 0 ? x0 - 1 : x0, y0 - engine.size / 2 + 1, 2, engine.size - 2);
        if (enginePower <= 0) continue;
        const len = Math.round(engine.size * (1.4 + enginePower * 0.9) + Math.random() * 5);
        for (let i = 0; i < len; i++) {
          const t = i / len;
          const flicker = Math.sin(this.time * 40 + i * 0.9) * 0.6;
          const half = Math.max(0.5, (engine.size / 2) * Math.pow(1 - t, 0.75) + flicker * t);
          const x = x0 + dir * i - (dir < 0 ? 1 : 0);
          ctx.globalAlpha = shipAlpha * 0.3;
          ctx.fillStyle = outer;
          ctx.fillRect(x, Math.round(y0 - half - 2), 1, Math.round(half * 2 + 4));
          ctx.globalAlpha = shipAlpha;
          ctx.fillRect(x, Math.round(y0 - half), 1, Math.max(1, Math.round(half * 2)));
          if (t < 0.7) {
            ctx.fillStyle = mid;
            ctx.fillRect(x, Math.round(y0 - half * 0.6), 1, Math.max(1, Math.round(half * 1.2)));
          }
          if (t < 0.35) {
            ctx.fillStyle = core;
            ctx.fillRect(x, Math.round(y0 - half * 0.3), 1, Math.max(1, Math.round(half * 0.6)));
          }
        }
        if (moving && Math.random() < 0.4) {
          this.add('ember', x0 + dir * len, y0 + bob + (Math.random() - 0.5) * engine.size, dir * (40 + Math.random() * 40), 0, 0.35, 1);
        }
      }
    }

    // Schiffskörper
    const sx = side === 'player' ? origin.x - sprite.ox : origin.x + cols * TILE - sprite.canvas.width + sprite.ox;
    const sy = origin.y - sprite.oy;
    ctx.drawImage(sprite.canvas, sx, sy);
    if (this.hitFlash[side] > 0) {
      // Kurzes Aufblitzen bei einem Treffer
      this.hitFlash[side] -= dtReal;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = shipAlpha * 0.5;
      ctx.drawImage(sprite.canvas, sx, sy);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = shipAlpha;
    }

    // Positionslichter blinken
    if (dead === null) {
      art.lights.forEach((light, i) => {
        if ((this.time * 1.2 + i * 0.5) % 1.6 > 0.35) return;
        const p = localToScreen(side, def, light.x * TILE, light.y * TILE);
        ctx.fillStyle = light.color;
        ctx.globalAlpha = shipAlpha * 0.35;
        ctx.fillRect(Math.round(p.x) - 3, Math.round(p.y) - 1, 7, 3);
        ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 3, 3, 7);
        ctx.globalAlpha = shipAlpha;
        ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      });
    }

    // Systeme: Anzeige mit Symbol, Betriebsanimation, Schaden
    for (const room of def.rooms) {
      if (!room.system) continue;
      const sys = ship.systems[room.system];
      const rect = roomRect(side, def, room);
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2 + 2;
      const color =
        capacity(sys) <= 0 ? '#ff5d5d' : sys.damage > 0 ? '#ffb347' : sys.power > 0 ? '#7df08a' : '#8a93a0';

      if (room.system === 'shields' && sys.power > 0) {
        // Lichtpunkte laufen um den Feldring
        for (let k = 0; k < 3; k++) {
          const angle = this.time * 2.2 + (k * Math.PI * 2) / 3;
          ctx.fillStyle = '#c9f2ff';
          ctx.fillRect(Math.round(cx + Math.cos(angle) * 15) - 1, Math.round(cy + Math.sin(angle) * 15) - 1, 2, 2);
        }
      }
      if (room.system === 'engines' && sys.power > 0) {
        // Die Antriebsspulen pulsieren
        ctx.globalAlpha = shipAlpha * (0.25 + 0.25 * Math.sin(this.time * 6));
        ctx.fillStyle = '#ffd08a';
        const coilX = side === 'player' ? rect.x + 7 : rect.x + rect.w - 19;
        ctx.fillRect(coilX, rect.y + 14, 12, 6);
        ctx.fillRect(coilX, rect.y + rect.h - 14, 12, 6);
        ctx.globalAlpha = shipAlpha;
      }

      if (sys.damage > 0) {
        const blink = 0.22 + 0.12 * Math.sin(this.time * 8);
        ctx.fillStyle = `rgba(255, 60, 40, ${blink})`;
        ctx.fillRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
        if (moving && dead === null) {
          // Feuer und Rauch im beschädigten Raum
          const fx = rect.x + 6 + Math.random() * (rect.w - 12);
          const fy = rect.y + 12 + Math.random() * (rect.h - 18) + bob;
          if (Math.random() < dtReal * 10 * sys.damage) this.add('ember', fx, fy, (Math.random() - 0.5) * 14, -18 - Math.random() * 20, 0.6, 2);
          if (Math.random() < dtReal * 4) this.add('smoke', fx, fy, (Math.random() - 0.5) * 8, -12, 1.2, 3);
          if (Math.random() < dtReal * 3) this.scatter('spark', fx, fy, 20, 70, 0.2, 1);
        }
      }

      // Anzeige in der Raummitte
      const ix = Math.round(cx) - 8;
      const iy = Math.round(cy) - 8;
      ctx.fillStyle = '#080b16';
      ctx.fillRect(ix + 1, iy - 1, 15, 19);
      ctx.fillRect(ix - 1, iy + 1, 19, 15);
      ctx.fillRect(ix, iy, 17, 17);
      ctx.fillStyle = '#161d33';
      ctx.fillRect(ix + 1, iy + 1, 15, 15);
      ctx.globalAlpha = shipAlpha * 0.4;
      ctx.fillStyle = color;
      ctx.fillRect(ix + 2, iy, 13, 1);
      ctx.fillRect(ix + 2, iy + 16, 13, 1);
      ctx.fillRect(ix, iy + 2, 1, 13);
      ctx.fillRect(ix + 16, iy + 2, 1, 13);
      ctx.globalAlpha = shipAlpha;
      drawIcon(ctx, SYSTEM_ICONS[room.system], ix + 4, iy + 4, color);
    }

    // Ladeanzeige an den Geschütztürmen
    if (dead === null) {
      ship.weapons.forEach((weapon, index) => {
        if (!weapon.powered) return;
        const muzzle = weaponMuzzle(side, def, index);
        const dir = side === 'player' ? 1 : -1;
        const pct = weapon.charge / WEAPONS[weapon.defId].chargeTime;
        const ready = pct >= 1;
        ctx.globalAlpha = shipAlpha * (ready ? 0.6 + 0.4 * Math.sin(this.time * 10) : 0.25 + pct * 0.6);
        ctx.fillStyle = side === 'player' ? WEAPON_COLORS[index % WEAPON_COLORS.length] : '#ff6a5a';
        ctx.fillRect(Math.round(muzzle.x - dir * 18) - 2, Math.round(muzzle.y) - 1, 4, 3);
        ctx.globalAlpha = shipAlpha;
      });
    }

    // Zielmarkierungen und Auswahl auf dem gegnerischen Schiff
    if (side === 'enemy' && dead === null) {
      state.player.weapons.forEach((weapon, index) => {
        if (weapon.target === null) return;
        const room = def.rooms.find((r) => r.id === weapon.target);
        if (room) this.drawBrackets(roomRect(side, def, room), WEAPON_COLORS[index % WEAPON_COLORS.length], index * 3);
      });
      if (view.selectedWeapon !== null && view.hoverRoom !== null) {
        const room = def.rooms.find((r) => r.id === view.hoverRoom);
        if (room) {
          const r = roomRect(side, def, room);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
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
      ctx.globalAlpha = shipAlpha * (ship.shieldLayers > 0 ? 0.78 + 0.14 * Math.sin(this.time * 2.5) : 0.4);
      ctx.drawImage(shield, x, y);
      if (flash) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = shipAlpha * Math.min(1, this.shieldFlash[side] / 0.25) * 0.8;
        ctx.drawImage(shield, x, y);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  private drawBrackets(r: { x: number; y: number; w: number; h: number }, color: string, inset: number): void {
    const ctx = this.ctx;
    const x0 = r.x + 2 + inset;
    const y0 = r.y + 2 + inset;
    const x1 = r.x + r.w - 3 - inset;
    const y1 = r.y + r.h - 3 - inset;
    const len = 8;
    const pulse = Math.sin(this.time * 5) > 0 ? 0 : 1;
    ctx.fillStyle = color;
    for (const [x, y, sx, sy] of [
      [x0 + pulse, y0 + pulse, 1, 1],
      [x1 - pulse, y0 + pulse, -1, 1],
      [x0 + pulse, y1 - pulse, 1, -1],
      [x1 - pulse, y1 - pulse, -1, -1],
    ]) {
      ctx.fillRect(sx > 0 ? x : x - len + 1, sy > 0 ? y : y - 1, len, 2);
      ctx.fillRect(sx > 0 ? x : x - 1, sy > 0 ? y : y - len + 1, 2, len);
    }
  }

  private drawMuzzleFlashes(state: BattleState, dtReal: number): void {
    const ctx = this.ctx;
    this.muzzleFlash = this.muzzleFlash.filter((m) => (m.age += dtReal) < 0.14);
    for (const m of this.muzzleFlash) {
      const p = weaponMuzzle(m.side, SHIPS[state[m.side].defId], m.index);
      const x = Math.round(p.x);
      const y = Math.round(p.y);
      const r = m.age < 0.06 ? 5 : 3;
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#fff3c4';
      ctx.fillRect(x - r - 2, y - r - 2, r * 2 + 5, r * 2 + 5);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - r, y - 1, r * 2 + 1, 3);
      ctx.fillRect(x - 1, y - r, 3, r * 2 + 1);
    }
  }

  private drawProjectiles(state: BattleState, alpha: number, dtReal: number): void {
    const ctx = this.ctx;
    for (const proj of state.projectiles) {
      if (proj.t + alpha * DT < 0) continue;
      const head = projectilePos(state, proj, alpha * DT);
      const def = WEAPONS[proj.weaponId];
      if (def.kind === 'torpedo') {
        const tail = projectilePos(state, proj, alpha * DT - 0.05);
        if (dtReal > 0) {
          this.add('smoke', tail.x, tail.y, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, 0.7, 2);
          if (Math.random() < 0.6) this.add('ember', tail.x, tail.y, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, 0.25, 1);
        }
        const exhaust = projectilePos(state, proj, alpha * DT - 0.075);
        ctx.globalAlpha = 0.35;
        this.line(exhaust.x, exhaust.y, tail.x, tail.y, '#ff8a2a', 7);
        ctx.globalAlpha = 1;
        this.line(exhaust.x, exhaust.y, tail.x, tail.y, '#ffe9a0', 3);
        this.line(tail.x, tail.y, head.x, head.y, '#3d4458', 5);
        this.line(tail.x, tail.y, head.x, head.y, '#c5cde0', 3);
        const nose = projectilePos(state, proj, alpha * DT - 0.012);
        this.line(nose.x, nose.y, head.x, head.y, '#e8792b', 3);
      } else {
        const tail = projectilePos(state, proj, alpha * DT - 0.055);
        const color = proj.from === 'player' ? '#3dff8c' : '#ff4a3a';
        ctx.globalAlpha = 0.18;
        this.line(tail.x, tail.y, head.x, head.y, color, 9);
        ctx.globalAlpha = 0.4;
        this.line(tail.x, tail.y, head.x, head.y, color, 5);
        ctx.globalAlpha = 1;
        this.line(tail.x, tail.y, head.x, head.y, color, 3);
        const core = projectilePos(state, proj, alpha * DT - 0.04);
        this.line(core.x, core.y, head.x, head.y, '#ffffff', 1);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(head.x) - 1, Math.round(head.y) - 1, 3, 3);
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

  /** Kreisring aus einzelnen Pixeln. */
  private circle(cx: number, cy: number, radius: number, color: string, thickness: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    const steps = Math.max(12, Math.ceil(radius * 6.3));
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      ctx.fillRect(Math.round(cx + Math.cos(angle) * radius), Math.round(cy + Math.sin(angle) * radius), thickness, thickness);
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
      switch (fx.kind) {
        case 'boom': {
          // Feuerball: innen hell, außen rot, löst sich von innen her auf
          const r = fx.size * (0.35 + p * 0.85);
          const hole = p > 0.4 ? r * ((p - 0.4) / 0.6) : -1;
          const reach = Math.ceil(r);
          for (let dy = -reach; dy <= reach; dy++) {
            for (let dx = -reach; dx <= reach; dx++) {
              const d = Math.sqrt(dx * dx + dy * dy) + ((dx * 7 + dy * 13) & 3) * 0.4;
              if (d > r || d < hole) continue;
              const t = d / r;
              ctx.fillStyle = p < 0.12 ? '#ffffff' : t < 0.35 ? '#fff3c4' : t < 0.6 ? '#ffc94a' : t < 0.85 ? '#f07a22' : '#a8301a';
              ctx.fillRect(x + dx, y + dy, 1, 1);
            }
          }
          break;
        }
        case 'ring':
          ctx.globalAlpha = (1 - p) * 0.8;
          this.circle(x, y, 3 + fx.size * Math.sqrt(p), p < 0.3 ? '#fff3c4' : '#ff9a4a', p < 0.5 ? 2 : 1);
          ctx.globalAlpha = 1;
          break;
        case 'ripple':
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 1 - p;
          this.circle(x, y, 3 + fx.size * p, '#9fe8ff', 2);
          this.circle(x, y, 1 + fx.size * p * 0.55, '#5ecbff', 1);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
          break;
        case 'debris':
          fx.vx *= 1 - dtReal * 1.5;
          fx.vy *= 1 - dtReal * 1.5;
          ctx.fillStyle = p < 0.3 ? '#fff3c4' : p < 0.6 ? '#ff8a2a' : '#5a4040';
          ctx.fillRect(x, y, fx.size, fx.size);
          break;
        case 'smoke': {
          const size = Math.round(fx.size * (1 + p * 1.5));
          ctx.globalAlpha = 0.4 * (1 - p);
          ctx.fillStyle = p < 0.3 ? '#8a7a70' : '#5d6478';
          ctx.fillRect(x - (size >> 1), y - (size >> 1) + 1, size, Math.max(1, size - 2));
          ctx.fillRect(x - (size >> 1) + 1, y - (size >> 1), Math.max(1, size - 2), size);
          ctx.globalAlpha = 1;
          break;
        }
        case 'ember':
          ctx.globalAlpha = 1 - p * 0.6;
          ctx.fillStyle = p < 0.35 ? '#fff3c4' : p < 0.7 ? '#ffae3d' : '#e0561e';
          ctx.fillRect(x, y, fx.size, fx.size);
          ctx.globalAlpha = 1;
          break;
        case 'spark':
          ctx.fillStyle = p < 0.5 ? '#ffffff' : '#9fe8ff';
          ctx.fillRect(x, y, fx.size, fx.size);
          break;
      }
    }
  }
}
