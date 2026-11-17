// Kampfsimulation: reine Logik ohne Grafik. Läuft in festen Schritten (TICK_RATE pro Sekunde).
import { SHIPS } from '../data/ships';
import { WEAPONS } from '../data/weapons';
import { nextRandom } from './rng';
import type {
  BattleState,
  Command,
  Loadout,
  Projectile,
  ShipState,
  Side,
  SystemId,
  SystemState,
} from './types';

export const TICK_RATE = 30;
export const DT = 1 / TICK_RATE;
export const SYSTEM_ORDER: SystemId[] = ['shields', 'weapons', 'engines'];

/** Sekunden, bis eine Schildschicht nachgeladen ist. */
const SHIELD_RECHARGE = 2.5;
/** Reparierte Balken pro Sekunde ohne freie Energie. */
const REPAIR_BASE = 0.05;
/** Zusätzlicher Anteil je freier Reaktorenergie. */
const REPAIR_FREE_BONUS = 0.5;
const EVASION_PER_POWER = 0.05;
/** Anteil der Flugstrecke, an dem Ausweichen und Schild geprüft werden. */
export const CHECK_AT = 0.8;
/** Abstand zwischen den Schüssen einer Salve in Sekunden. */
const SALVO_GAP = 0.18;
const AI_INTERVAL = 15;

export function other(side: Side): Side {
  return side === 'player' ? 'enemy' : 'player';
}

export function capacity(sys: SystemState): number {
  return sys.level - sys.damage;
}

export function usedPower(ship: ShipState): number {
  return SYSTEM_ORDER.reduce((sum, id) => sum + ship.systems[id].power, 0);
}

export function freePower(ship: ShipState): number {
  return ship.reactor - usedPower(ship);
}

export function maxShieldLayers(ship: ShipState): number {
  return Math.floor(ship.systems.shields.power / 2);
}

export function evasion(ship: ShipState): number {
  return ship.systems.engines.power * EVASION_PER_POWER;
}

/** Das System, das gerade repariert wird (immer nur eines gleichzeitig). */
export function repairTarget(ship: ShipState): SystemId | null {
  return SYSTEM_ORDER.find((id) => ship.systems[id].damage > 0) ?? null;
}

function createShip(loadout: Loadout): ShipState {
  const def = SHIPS[loadout.defId];
  if (!def) throw new Error(`Unbekanntes Schiff: ${loadout.defId}`);
  const sys = (id: SystemId): SystemState => ({
    level: loadout.systems?.[id] ?? def.systems[id],
    power: 0,
    damage: 0,
    repair: 0,
  });
  const maxHull = loadout.maxHull ?? def.maxHull;
  return {
    defId: def.id,
    hull: Math.min(maxHull, loadout.hull ?? maxHull),
    maxHull,
    reactor: loadout.reactor ?? def.reactor,
    systems: { shields: sys('shields'), weapons: sys('weapons'), engines: sys('engines') },
    weapons: (loadout.weapons ?? def.weapons).map((id) => ({ defId: id, powered: false, charge: 0, target: null })),
    shieldLayers: 0,
    shieldCharge: 0,
    torpedoes: loadout.torpedoes ?? def.torpedoes,
    repairFactor: loadout.repairFactor ?? def.repairFactor ?? 1,
    shieldRechargeFactor: loadout.shieldRechargeFactor ?? 1,
  };
}

export function createBattle(seed: number, player: Loadout | string, enemyDefId: string): BattleState {
  const state: BattleState = {
    tick: 0,
    rng: seed | 0,
    outcome: 'ongoing',
    player: createShip(typeof player === 'string' ? { defId: player } : player),
    enemy: createShip({ defId: enemyDefId }),
    projectiles: [],
    nextProjectileId: 1,
    events: [],
  };
  for (const side of ['player', 'enemy'] as const) {
    autoAllocate(state, side);
    state[side].shieldLayers = maxShieldLayers(state[side]);
  }
  return state;
}

/** Führt einen Befehl aus. Gibt false zurück, wenn er nicht möglich war. */
export function applyCommand(state: BattleState, side: Side, cmd: Command): boolean {
  const ship = state[side];
  switch (cmd.type) {
    case 'setPower': {
      // Waffenenergie wird über das Ein- und Ausschalten einzelner Waffen gesteuert.
      if (cmd.system === 'weapons') return false;
      const sys = ship.systems[cmd.system];
      // Eine Schildschicht braucht immer zwei Energie.
      const stepSize = cmd.system === 'shields' ? 2 : 1;
      if (cmd.delta > 0) {
        if (sys.power + stepSize > capacity(sys) || freePower(ship) < stepSize) return false;
        sys.power += stepSize;
      } else {
        if (sys.power < stepSize) return false;
        sys.power -= stepSize;
      }
      return true;
    }
    case 'toggleWeapon': {
      const weapon = ship.weapons[cmd.index];
      if (!weapon) return false;
      const def = WEAPONS[weapon.defId];
      const sys = ship.systems.weapons;
      if (weapon.powered) {
        weapon.powered = false;
        weapon.charge = 0;
        sys.power -= def.power;
        return true;
      }
      if (freePower(ship) < def.power || sys.power + def.power > capacity(sys)) return false;
      weapon.powered = true;
      sys.power += def.power;
      return true;
    }
    case 'setTarget': {
      const weapon = ship.weapons[cmd.index];
      if (!weapon) return false;
      if (cmd.room !== null) {
        const targetDef = SHIPS[state[other(side)].defId];
        if (!targetDef.rooms.some((r) => r.id === cmd.room)) return false;
      }
      weapon.target = cmd.room;
      return true;
    }
  }
}

/** Nimmt Energie weg, die ein beschädigtes System nicht mehr aufnehmen kann. */
function enforceCapacity(ship: ShipState, id: SystemId): void {
  const sys = ship.systems[id];
  const cap = capacity(sys);
  if (id === 'weapons') {
    for (let i = ship.weapons.length - 1; i >= 0 && sys.power > cap; i--) {
      const weapon = ship.weapons[i];
      if (!weapon.powered) continue;
      weapon.powered = false;
      weapon.charge = 0;
      sys.power -= WEAPONS[weapon.defId].power;
    }
  } else if (id === 'shields') {
    sys.power = Math.min(sys.power, Math.floor(cap / 2) * 2);
  } else {
    sys.power = Math.min(sys.power, cap);
  }
}

/** Verteilt Energie sinnvoll: erst Waffen, dann Schilde, der Rest in die Triebwerke. */
export function autoAllocate(state: BattleState, side: Side): void {
  const ship = state[side];
  ship.systems.engines.power = 0;
  ship.weapons.forEach((weapon, index) => {
    if (!weapon.powered) applyCommand(state, side, { type: 'toggleWeapon', index });
  });
  while (applyCommand(state, side, { type: 'setPower', system: 'shields', delta: 1 })) {
    // bis zur Grenze auffüllen
  }
  while (applyCommand(state, side, { type: 'setPower', system: 'engines', delta: 1 })) {
    // bis zur Grenze auffüllen
  }
}

function runEnemyAI(state: BattleState): void {
  autoAllocate(state, 'enemy');
  const rooms = SHIPS[state.player.defId].rooms;
  for (const weapon of state.enemy.weapons) {
    if (weapon.target !== null) continue;
    // Systemräume werden dreimal so oft gewählt wie leere Räume.
    const weights = rooms.map((r) => (r.system ? 3 : 1));
    let roll = nextRandom(state) * weights.reduce((a, b) => a + b, 0);
    let pick = rooms[rooms.length - 1];
    for (let i = 0; i < rooms.length; i++) {
      roll -= weights[i];
      if (roll < 0) {
        pick = rooms[i];
        break;
      }
    }
    weapon.target = pick.id;
  }
}

function updateShip(state: BattleState, side: Side): void {
  const ship = state[side];

  // Schilde
  const maxLayers = maxShieldLayers(ship);
  if (ship.shieldLayers > maxLayers) ship.shieldLayers = maxLayers;
  if (ship.shieldLayers < maxLayers) {
    ship.shieldCharge += DT * ship.shieldRechargeFactor;
    if (ship.shieldCharge >= SHIELD_RECHARGE) {
      ship.shieldLayers++;
      ship.shieldCharge = 0;
    }
  } else {
    ship.shieldCharge = 0;
  }

  // Reparatur: freie Reaktorenergie beschleunigt sie.
  const target = repairTarget(ship);
  if (target) {
    const sys = ship.systems[target];
    sys.repair += REPAIR_BASE * ship.repairFactor * (1 + REPAIR_FREE_BONUS * freePower(ship)) * DT;
    if (sys.repair >= 1) {
      sys.damage--;
      sys.repair = 0;
    }
  }

  // Waffen laden und feuern
  ship.weapons.forEach((weapon, index) => {
    if (!weapon.powered) return;
    const def = WEAPONS[weapon.defId];
    weapon.charge = Math.min(def.chargeTime, weapon.charge + DT);
    if (weapon.charge < def.chargeTime || weapon.target === null) return;
    if (def.usesTorpedo) {
      if (ship.torpedoes <= 0) return;
      ship.torpedoes--;
    }
    weapon.charge = 0;
    for (let shot = 0; shot < def.shots; shot++) {
      state.projectiles.push({
        id: state.nextProjectileId++,
        from: side,
        weaponIndex: index,
        weaponId: def.id,
        targetRoom: weapon.target,
        t: -shot * SALVO_GAP,
        duration: def.flightTime,
        damage: def.damage,
        piercing: def.piercing,
        checked: false,
        missed: false,
      });
    }
    state.events.push({ type: 'fire', side, weaponIndex: index });
    // Der Gegner sucht sich nach jedem Schuss ein neues Ziel.
    if (side === 'enemy') weapon.target = null;
  });
}

function updateProjectiles(state: BattleState): void {
  const remaining: Projectile[] = [];
  for (const proj of state.projectiles) {
    proj.t += DT;
    const targetSide = other(proj.from);
    const target = state[targetSide];

    if (!proj.checked && proj.t >= proj.duration * CHECK_AT) {
      proj.checked = true;
      if (nextRandom(state) < evasion(target)) {
        proj.missed = true;
        state.events.push({ type: 'miss', target: targetSide, proj: { ...proj } });
      } else if (!proj.piercing && target.shieldLayers > 0) {
        target.shieldLayers--;
        target.shieldCharge = 0;
        state.events.push({ type: 'shieldHit', target: targetSide, proj: { ...proj } });
        continue;
      }
    }

    if (proj.missed) {
      // Fehlschüsse fliegen noch ein Stück am Schiff vorbei.
      if (proj.t < proj.duration * 1.5) remaining.push(proj);
      continue;
    }

    if (proj.t >= proj.duration) {
      target.hull = Math.max(0, target.hull - proj.damage);
      const room = SHIPS[target.defId].rooms.find((r) => r.id === proj.targetRoom);
      if (room?.system) {
        const sys = target.systems[room.system];
        sys.damage = Math.min(sys.level, sys.damage + proj.damage);
        enforceCapacity(target, room.system);
      }
      state.events.push({
        type: 'hit',
        target: targetSide,
        room: proj.targetRoom,
        damage: proj.damage,
        proj: { ...proj },
      });
      continue;
    }
    remaining.push(proj);
  }
  state.projectiles = remaining;
}

/** Ein Simulationsschritt von DT Sekunden. */
export function step(state: BattleState): void {
  if (state.outcome !== 'ongoing') return;
  state.events = [];
  state.tick++;

  if (state.tick % AI_INTERVAL === 1) runEnemyAI(state);
  updateShip(state, 'player');
  updateShip(state, 'enemy');
  updateProjectiles(state);

  if (state.enemy.hull <= 0) {
    state.outcome = 'victory';
    state.events.push({ type: 'destroyed', side: 'enemy' });
  } else if (state.player.hull <= 0) {
    state.outcome = 'defeat';
    state.events.push({ type: 'destroyed', side: 'player' });
  }
}
