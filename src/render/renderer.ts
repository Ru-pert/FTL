// Darstellung des Kampfs. Liest den Spielzustand nur, ändert ihn nie.
import { SHIPS } from '../data/ships';
import { WEAPONS } from '../data/weapons';
import { capacity, DT, other } from '../sim/battle';
import type { BattleState, GameEvent, Projectile, Side } from '../sim/types';
import { roomCenter, roomRect, shieldEllipse, shipOrigin, shipSize, TILE, VIEW_H, VIEW_W } from './layout';
import { buildShipSprite, drawIcon, HULL_MARGIN, PALETTES, SPRITE_PAD, SYSTEM_ICONS } from './sprites';

export const WEAPON_COLORS = ['#5ee6ff', '#ff7ad9', '#ffe45e', '#9dff7a'];

interface Effect {
  kind: 'boom' | 'spark';
  x: number;
  y: number;
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
  const fromDef = SHIPS[state[proj.from].defId];
  const targetSide = other(proj.from);
  const toDef = SHIPS[state[targetSide].defId];
  const weaponRoom = fromDef.rooms.find((r) => r.system === 'weapons') ?? fromDef.rooms[0];
  const a = roomCenter(proj.from, fromDef, weaponRoom.id);
  const b = roomCenter(targetSide, toDef, proj.targetRoom);
  const p = Math.max(0, (proj.t + extra) / proj.duration);
  return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private sprites: Record<Side, HTMLCanvasElement>;
  private effects: Effect[] = [];
  private stars: Star[] = [];
  private time = 0;
  private shieldFlash: Record<Side, number> = { player: 0, enemy: 0 };
  private deadFor: Record<Side, number | null> = { player: null, enemy: null };

  constructor(canvas: HTMLCanvasElement, state: BattleState) {
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.sprites = {
      player: buildShipSprite(SHIPS[state.player.defId], PALETTES.player),
      enemy: buildShipSprite(SHIPS[state.enemy.defId], PALETTES.enemy),
    };
    // Sternenfeld (rein dekorativ, daher eigener einfacher Zufall)
    let seed = 7;
    const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < 110; i++) {
      const depth = rand();
      this.stars.push({
        x: rand() * VIEW_W,
        y: rand() * VIEW_H,
        speed: 1 + depth * 5,
        color: depth > 0.85 ? '#ffffff' : depth > 0.5 ? '#9fb0d8' : '#4d5a82',
      });
    }
  }

  handleEvents(events: GameEvent[], state: BattleState): void {
    for (const ev of events) {
      if (ev.type === 'hit') {
        const c = roomCenter(ev.target, SHIPS[state[ev.target].defId], ev.room);
        this.effects.push({ kind: 'boom', x: c.x, y: c.y, age: 0, life: 0.45, size: 6 + ev.damage * 3 });
      } else if (ev.type === 'shieldHit') {
        const p = projectilePos(state, ev.proj);
        this.shieldFlash[ev.target] = 0.3;
        this.effects.push({ kind: 'spark', x: p.x, y: p.y, age: 0, life: 0.3, size: 5 });
      } else if (ev.type === 'destroyed') {
        this.deadFor[ev.side] = 0;
      }
    }
  }

  draw(state: BattleState, alpha: number, view: ViewState, dtReal: number): void {
    const ctx = this.ctx;
    this.time += dtReal;

    // Hintergrund
    ctx.fillStyle = '#080b18';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    for (const star of this.stars) {
      star.x -= star.speed * dtReal;
      if (star.x < 0) star.x += VIEW_W;
      ctx.fillStyle = star.color;
      ctx.fillRect(Math.floor(star.x), Math.floor(star.y), 1, 1);
    }

    for (const side of ['player', 'enemy'] as const) this.drawShip(state, side, view, dtReal);
    this.drawProjectiles(state, alpha);
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
        this.effects.push({
          kind: 'boom',
          x: origin.x + Math.random() * cols * TILE,
          y: origin.y + Math.random() * rows * TILE,
          age: 0,
          life: 0.5,
          size: 8 + Math.random() * 10,
        });
      }
      if (shipAlpha <= 0) return;
    }
    ctx.globalAlpha = shipAlpha;

    // Triebwerksflammen
    const engineRoom = def.rooms.find((r) => r.system === 'engines');
    if (engineRoom && ship.systems.engines.power > 0 && dead === null) {
      const rect = roomRect(side, def, engineRoom);
      const dir = side === 'player' ? -1 : 1;
      const baseX = side === 'player' ? rect.x - HULL_MARGIN - 6 : rect.x + rect.w + HULL_MARGIN + 6;
      for (const cy of [rect.y + 7, rect.y + rect.h - 7]) {
        const len = 3 + ship.systems.engines.power * 3 + Math.floor(Math.random() * 3);
        ctx.fillStyle = '#ff8a2a';
        ctx.fillRect(dir < 0 ? baseX - len : baseX, cy - 2, len, 4);
        ctx.fillStyle = '#ffe9a0';
        ctx.fillRect(dir < 0 ? baseX - len + 3 : baseX, cy - 1, Math.max(1, len - 3), 2);
      }
    }

    // Schiffskörper
    const sprite = this.sprites[side];
    if (side === 'player') {
      ctx.drawImage(sprite, origin.x - SPRITE_PAD, origin.y - SPRITE_PAD);
    } else {
      ctx.save();
      ctx.translate(origin.x + cols * TILE + SPRITE_PAD, origin.y - SPRITE_PAD);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite, 0, 0);
      ctx.restore();
    }

    // Systeme: Symbol und Schadensanzeige
    for (const room of def.rooms) {
      if (!room.system) continue;
      const sys = ship.systems[room.system];
      const rect = roomRect(side, def, room);
      if (sys.damage > 0) {
        const blink = 0.22 + 0.12 * Math.sin(this.time * 8);
        ctx.fillStyle = `rgba(255, 60, 40, ${blink})`;
        ctx.fillRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
      }
      const ix = rect.x + Math.floor(rect.w / 2) - 6;
      const iy = rect.y + Math.floor(rect.h / 2) - 6;
      ctx.fillStyle = '#161b2b';
      ctx.fillRect(ix - 1, iy, 15, 13);
      ctx.fillRect(ix, iy - 1, 13, 15);
      const color =
        capacity(sys) <= 0 ? '#ff5d5d' : sys.damage > 0 ? '#ffb347' : sys.power > 0 ? '#6ee06e' : '#8a93a0';
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
    if (ship.shieldLayers > 0 || this.shieldFlash[side] > 0) {
      const e = shieldEllipse(side, def);
      this.shieldFlash[side] = Math.max(0, this.shieldFlash[side] - dtReal);
      const flash = this.shieldFlash[side] > 0;
      for (let layer = 0; layer < Math.max(1, ship.shieldLayers); layer++) {
        ctx.fillStyle = flash ? '#e8fbff' : layer % 2 ? '#3f8fd0' : '#5ecbff';
        const rx = e.rx + layer * 4;
        const ry = e.ry + layer * 4;
        const steps = 220;
        for (let i = 0; i < steps; i++) {
          // Lücken wandern langsam um das Schiff: wirkt wie ein Energiefeld
          if (!flash && (i + Math.floor(this.time * 12) + layer * 3) % 5 === 0) continue;
          const angle = (i / steps) * Math.PI * 2;
          ctx.fillRect(Math.round(e.cx + Math.cos(angle) * rx), Math.round(e.cy + Math.sin(angle) * ry), 1, 1);
        }
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

  private drawProjectiles(state: BattleState, alpha: number): void {
    const ctx = this.ctx;
    for (const proj of state.projectiles) {
      if (proj.t + alpha * DT < 0) continue;
      const head = projectilePos(state, proj, alpha * DT);
      const tail = projectilePos(state, proj, alpha * DT - 0.05);
      const def = WEAPONS[proj.weaponId];
      if (def.kind === 'torpedo') {
        const far = projectilePos(state, proj, alpha * DT - 0.12);
        this.line(far.x, far.y, tail.x, tail.y, '#8a6a4a', 1);
        this.line(tail.x, tail.y, head.x, head.y, '#ffd75e', 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(head.x) - 1, Math.round(head.y) - 1, 2, 2);
      } else {
        const color = proj.from === 'player' ? '#7dffb0' : '#ff6a5a';
        this.line(tail.x, tail.y, head.x, head.y, color, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(head.x), Math.round(head.y), 1, 1);
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
      const p = fx.age / fx.life;
      const x = Math.round(fx.x);
      const y = Math.round(fx.y);
      if (fx.kind === 'boom') {
        const r = Math.round(fx.size * (0.4 + p * 0.8));
        ctx.fillStyle = p < 0.3 ? '#ffffff' : p < 0.6 ? '#ffd75e' : '#ff7a2a';
        ctx.fillRect(x - r, y - Math.round(r / 2), r * 2, r);
        ctx.fillRect(x - Math.round(r / 2), y - r, r, r * 2);
        if (p > 0.5) {
          ctx.fillStyle = '#4a2a2a';
          const inner = Math.round(r * (p - 0.4));
          ctx.fillRect(x - inner, y - inner, inner * 2, inner * 2);
        }
      } else {
        const r = Math.round(fx.size * p) + 1;
        ctx.fillStyle = '#e8fbff';
        ctx.fillRect(x - r, y, r * 2 + 1, 1);
        ctx.fillRect(x, y - r, 1, r * 2 + 1);
      }
    }
  }
}
