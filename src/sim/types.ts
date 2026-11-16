// Datentypen der Simulation. Alles hier ist reines, speicherbares Datenformat (keine Klassen).

export type SystemId = 'shields' | 'weapons' | 'engines';
export type Side = 'player' | 'enemy';
export type Outcome = 'ongoing' | 'victory' | 'defeat';

/** Ein Raum im Kachelraster des Schiffs (Schiff zeigt in den Daten immer nach rechts). */
export interface RoomDef {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  system?: SystemId;
}

export interface ShipDef {
  id: string;
  name: string;
  maxHull: number;
  reactor: number;
  rooms: RoomDef[];
  /** Ausbaustufe je System = maximale Energie. */
  systems: Record<SystemId, number>;
  weapons: string[];
  torpedoes: number;
}

export interface WeaponDef {
  id: string;
  name: string;
  kind: 'laser' | 'torpedo';
  power: number;
  /** Ladezeit in Sekunden. */
  chargeTime: number;
  shots: number;
  damage: number;
  /** Durchschlägt Schilde. */
  piercing: boolean;
  usesTorpedo: boolean;
  /** Flugzeit in Sekunden. */
  flightTime: number;
}

export interface SystemState {
  level: number;
  power: number;
  damage: number;
  /** Reparaturfortschritt des nächsten Balkens, 0..1. */
  repair: number;
}

export interface WeaponState {
  defId: string;
  powered: boolean;
  charge: number;
  /** Raum-ID auf dem gegnerischen Schiff. */
  target: number | null;
}

export interface ShipState {
  defId: string;
  hull: number;
  maxHull: number;
  reactor: number;
  systems: Record<SystemId, SystemState>;
  weapons: WeaponState[];
  shieldLayers: number;
  shieldCharge: number;
  torpedoes: number;
}

export interface Projectile {
  id: number;
  from: Side;
  weaponIndex: number;
  weaponId: string;
  targetRoom: number;
  /** Vergangene Flugzeit in Sekunden; negativ = wartet noch (Salve). */
  t: number;
  duration: number;
  damage: number;
  piercing: boolean;
  /** Ausweichen und Schild wurden bereits geprüft. */
  checked: boolean;
  missed: boolean;
}

export type GameEvent =
  | { type: 'fire'; side: Side; weaponIndex: number }
  | { type: 'miss'; target: Side; proj: Projectile }
  | { type: 'shieldHit'; target: Side; proj: Projectile }
  | { type: 'hit'; target: Side; room: number; damage: number; proj: Projectile }
  | { type: 'destroyed'; side: Side };

export interface BattleState {
  tick: number;
  rng: number;
  outcome: Outcome;
  player: ShipState;
  enemy: ShipState;
  projectiles: Projectile[];
  nextProjectileId: number;
  /** Ereignisse des letzten Simulationsschritts (für Effekte in der Darstellung). */
  events: GameEvent[];
}

export type Command =
  | { type: 'setPower'; system: SystemId; delta: 1 | -1 }
  | { type: 'toggleWeapon'; index: number }
  | { type: 'setTarget'; index: number; room: number | null };
