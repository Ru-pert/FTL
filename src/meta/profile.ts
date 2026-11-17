// Dauerhafter Fortschritt: Kristalle und Ausbaustufen der Homebase. Reine Daten und Regeln.
import { MODULES, type ModuleId } from '../data/modules';
import { SHIPS } from '../data/ships';
import type { Loadout } from '../sim/types';

export interface Profile {
  version: 1;
  crystals: number;
  modules: Record<ModuleId, number>;
  runs: number;
  wins: number;
}

export function newProfile(): Profile {
  return {
    version: 1,
    crystals: 0,
    modules: { werft: 0, reaktor: 0, waffen: 0, schild: 0, antrieb: 0, dock: 0 },
    runs: 0,
    wins: 0,
  };
}

/** Prüft fremde Daten (aus dem Browser-Speicher oder einer Datei) und macht daraus ein gültiges Profil. */
export function parseProfile(data: unknown): Profile | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;
  if (raw.version !== 1) return null;
  const profile = newProfile();
  const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  profile.crystals = count(raw.crystals);
  profile.runs = count(raw.runs);
  profile.wins = count(raw.wins);
  const modules = (raw.modules ?? {}) as Record<string, unknown>;
  for (const def of MODULES) profile.modules[def.id] = Math.min(def.costs.length, count(modules[def.id]));
  return profile;
}

/** Kosten der nächsten Stufe oder null, wenn das Modul voll ausgebaut ist. */
export function nextCost(profile: Profile, id: ModuleId): number | null {
  const def = MODULES.find((m) => m.id === id)!;
  return def.costs[profile.modules[id]] ?? null;
}

export function buyModule(profile: Profile, id: ModuleId): boolean {
  const cost = nextCost(profile, id);
  if (cost === null || profile.crystals < cost) return false;
  profile.crystals -= cost;
  profile.modules[id]++;
  return true;
}

/** Startausrüstung des Spielerschiffs nach dem Stand der Homebase. */
export function loadoutFromProfile(profile: Profile): { loadout: Loadout; healAfterWin: number } {
  const def = SHIPS.eisvogel;
  const m = profile.modules;
  const weapons = [...def.weapons];
  if (m.waffen >= 2) weapons[0] = 'drillingslaser';
  return {
    loadout: {
      defId: def.id,
      maxHull: def.maxHull + m.werft * 5,
      reactor: def.reactor + m.reaktor,
      systems: {
        shields: def.systems.shields + (m.schild >= 2 ? 2 : 0),
        engines: def.systems.engines + m.antrieb,
      },
      weapons,
      torpedoes: def.torpedoes + (m.waffen >= 1 ? 3 : 0) + (m.waffen >= 3 ? 3 : 0),
      repairFactor: 1 + m.dock * 0.3,
      shieldRechargeFactor: m.schild >= 1 ? 1.3 : 1,
    },
    healAfterWin: m.dock * 3,
  };
}
