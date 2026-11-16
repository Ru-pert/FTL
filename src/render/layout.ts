// Wo die Schiffe auf dem Bildschirm stehen. Wird von Darstellung und Eingabe gemeinsam genutzt.
import type { RoomDef, ShipDef, Side } from '../sim/types';

export const VIEW_W = 640;
export const VIEW_H = 360;
export const TILE = 16;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const CENTERS: Record<Side, { x: number; y: number }> = {
  player: { x: 178, y: 154 },
  enemy: { x: 488, y: 150 },
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

export function shieldEllipse(side: Side, def: ShipDef) {
  const { cols, rows } = shipSize(def);
  return {
    cx: CENTERS[side].x,
    cy: CENTERS[side].y,
    rx: (cols * TILE) / 2 + 30,
    ry: (rows * TILE) / 2 + 24,
  };
}
