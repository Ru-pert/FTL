// Wo die Schiffe auf dem Bildschirm stehen. Wird von Darstellung und Eingabe gemeinsam genutzt.
import { artFor, type ShipArt } from '../data/shipArt';
import type { RoomDef, ShipDef, Side } from '../sim/types';

export const VIEW_W = 960;
export const VIEW_H = 540;
export const TILE = 24;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Bildschirmposition der Mitte des Raumrasters. */
const CENTERS: Record<Side, { x: number; y: number }> = {
  player: { x: 288, y: 252 },
  enemy: { x: 736, y: 250 },
};

export function shipSize(def: ShipDef): { cols: number; rows: number } {
  return {
    cols: Math.max(...def.rooms.map((r) => r.x + r.w)),
    rows: Math.max(...def.rooms.map((r) => r.y + r.h)),
  };
}

export function shipOrigin(side: Side, def: ShipDef): { x: number; y: number } {
  const { cols, rows } = shipSize(def);
  return {
    x: Math.round(CENTERS[side].x - (cols * TILE) / 2),
    y: Math.round(CENTERS[side].y - (rows * TILE) / 2),
  };
}

/** Bildschirmrechteck eines Raums. Das gegnerische Schiff wird gespiegelt (Bug zeigt nach links). */
export function roomRect(side: Side, def: ShipDef, room: RoomDef): Rect {
  const origin = shipOrigin(side, def);
  const { cols } = shipSize(def);
  const tileX = side === 'enemy' ? cols - (room.x + room.w) : room.x;
  return {
    x: origin.x + tileX * TILE,
    y: origin.y + room.y * TILE,
    w: room.w * TILE,
    h: room.h * TILE,
  };
}

export function roomCenter(side: Side, def: ShipDef, roomId: number): { x: number; y: number } {
  const room = def.rooms.find((r) => r.id === roomId) ?? def.rooms[0];
  const rect = roomRect(side, def, room);
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

export function roomAt(side: Side, def: ShipDef, px: number, py: number): RoomDef | null {
  for (const room of def.rooms) {
    const r = roomRect(side, def, room);
    if (px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h) return room;
  }
  return null;
}

/** Umriss aller Rumpfteile in Pixeln, relativ zum Raumraster (Bug nach rechts). */
export function artBounds(art: ShipArt): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const part of art.parts) {
    for (const [x, y] of part.pts) {
      const ys = part.mirror ? [y, 2 * art.axisY - y] : [y];
      minX = Math.min(minX, x * TILE);
      maxX = Math.max(maxX, x * TILE);
      for (const v of ys) {
        minY = Math.min(minY, v * TILE);
        maxY = Math.max(maxY, v * TILE);
      }
    }
  }
  return { minX: Math.floor(minX), minY: Math.floor(minY), maxX: Math.ceil(maxX), maxY: Math.ceil(maxY) };
}

/** Bildschirmposition eines Punkts, der in Pixeln relativ zum Raumraster angegeben ist. */
export function localToScreen(side: Side, def: ShipDef, lx: number, ly: number): { x: number; y: number } {
  const origin = shipOrigin(side, def);
  const { cols } = shipSize(def);
  return { x: origin.x + (side === 'enemy' ? cols * TILE - lx : lx), y: origin.y + ly };
}

export function shieldEllipse(side: Side, def: ShipDef) {
  const b = artBounds(artFor(def));
  const a = localToScreen(side, def, b.minX, b.minY);
  const c = localToScreen(side, def, b.maxX, b.maxY);
  return {
    cx: Math.round((a.x + c.x) / 2),
    cy: Math.round((a.y + c.y) / 2),
    rx: Math.round((Math.abs(c.x - a.x) / 2) * 1.06 + 10),
    ry: Math.round((Math.abs(c.y - a.y) / 2) * 1.1 + 10),
  };
}

/** Drehpunkt eines Geschützes in Pixeln relativ zum Raumraster (Bug nach rechts). */
export function weaponPivot(def: ShipDef, index: number): { x: number; y: number } {
  const mount = artFor(def).mounts?.[index];
  if (mount) return { x: mount.x * TILE, y: mount.y * TILE };
  // Ohne eigene Angabe: nebeneinander am Rand des Waffenraums
  const room = def.rooms.find((r) => r.system === 'weapons') ?? def.rooms[0];
  const { rows } = shipSize(def);
  const lower = room.y + room.h / 2 > rows / 2;
  return {
    x: room.x * TILE + 10 + index * (def.weapons.length > 2 ? 16 : 22),
    y: lower ? (room.y + room.h) * TILE + 4 : room.y * TILE - 4,
  };
}

/** Mittelpunkt des gegnerischen Schiffs, auf den Geschütze ohne Ziel zeigen. */
export function opponentCenter(side: Side): { x: number; y: number } {
  return CENTERS[side === 'player' ? 'enemy' : 'player'];
}

/** Bildschirmposition des Drehpunkts. */
export function weaponPivotScreen(side: Side, def: ShipDef, index: number): { x: number; y: number } {
  const p = weaponPivot(def, index);
  return localToScreen(side, def, p.x, p.y);
}

/** Mündung eines Geschützes, das auf target zielt: von hier starten die Schüsse. */
export function weaponMuzzle(
  side: Side,
  def: ShipDef,
  index: number,
  target: { x: number; y: number } = opponentCenter(side),
  reach = 18,
): { x: number; y: number } {
  const p = weaponPivotScreen(side, def, index);
  const angle = Math.atan2(target.y - p.y, target.x - p.x);
  return { x: p.x + Math.cos(angle) * reach, y: p.y + Math.sin(angle) * reach };
}
