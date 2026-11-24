import type { ShipDef } from '../sim/types';

// Schiffe als reine Daten. Räume liegen auf einem Kachelraster, das Schiff zeigt nach rechts.
export const SHIPS: Record<string, ShipDef> = {
  // Das Spielerschiff. Name und Aussehen kommen aus dem gewählten Entwurf (PLAYER_DESIGNS).
  eisvogel: {
    id: 'eisvogel',
    name: 'Donnerkeil',
    art: 'donnerkeil',
    maxHull: 30,
    reactor: 6,
    systems: { shields: 2, weapons: 3, engines: 2 },
    weapons: ['zwillingslaser', 'torpedo'],
    torpedoes: 6,
    rooms: [
      { id: 0, x: 0, y: 2, w: 2, h: 2, system: 'engines' },
      { id: 1, x: 2, y: 1, w: 2, h: 2 },
      { id: 2, x: 2, y: 3, w: 2, h: 2 },
      { id: 3, x: 4, y: 0, w: 2, h: 2, system: 'shields' },
      { id: 4, x: 4, y: 4, w: 2, h: 2, system: 'weapons' },
      { id: 5, x: 4, y: 2, w: 3, h: 2 },
      { id: 6, x: 7, y: 1, w: 2, h: 2 },
      { id: 7, x: 7, y: 3, w: 2, h: 2 },
      { id: 8, x: 9, y: 2, w: 2, h: 2 },
    ],
  },
  schrotthai: {
    id: 'schrotthai',
    name: 'Schrotthai',
    maxHull: 14,
    reactor: 5,
    systems: { shields: 2, weapons: 2, engines: 1 },
    weapons: ['impulslaser', 'impulslaser'],
    torpedoes: 0,
    repairFactor: 0.4,
    rooms: [
      { id: 0, x: 0, y: 1, w: 2, h: 2, system: 'engines' },
      { id: 1, x: 2, y: 0, w: 2, h: 2 },
      { id: 2, x: 2, y: 2, w: 2, h: 2 },
      { id: 3, x: 4, y: 0, w: 2, h: 2, system: 'weapons' },
      { id: 4, x: 4, y: 2, w: 2, h: 2, system: 'shields' },
      { id: 5, x: 6, y: 1, w: 2, h: 2 },
    ],
  },
  // Kleiner, wendiger Jäger: kaum Hülle, kein Schild, weicht oft aus
  rostwespe: {
    id: 'rostwespe',
    name: 'Rostwespe',
    maxHull: 8,
    reactor: 4,
    systems: { shields: 0, weapons: 1, engines: 3 },
    weapons: ['impulslaser'],
    torpedoes: 0,
    repairFactor: 0.4,
    rooms: [
      { id: 0, x: 0, y: 1, w: 2, h: 2, system: 'engines' },
      { id: 1, x: 2, y: 0, w: 2, h: 2, system: 'shields' },
      { id: 2, x: 2, y: 2, w: 2, h: 2, system: 'weapons' },
      { id: 3, x: 4, y: 1, w: 2, h: 2 },
    ],
  },
  giftwespe: {
    id: 'giftwespe',
    name: 'Giftwespe',
    art: 'rostwespe',
    maxHull: 12,
    reactor: 7,
    systems: { shields: 2, weapons: 2, engines: 3 },
    weapons: ['impulslaser', 'impulslaser'],
    torpedoes: 0,
    repairFactor: 0.5,
    rooms: [
      { id: 0, x: 0, y: 1, w: 2, h: 2, system: 'engines' },
      { id: 1, x: 2, y: 0, w: 2, h: 2, system: 'shields' },
      { id: 2, x: 2, y: 2, w: 2, h: 2, system: 'weapons' },
      { id: 3, x: 4, y: 1, w: 2, h: 2 },
    ],
  },
  rudelfuehrer: {
    id: 'rudelfuehrer',
    name: 'Rudelführer',
    art: 'schrotthai',
    maxHull: 20,
    reactor: 7,
    systems: { shields: 2, weapons: 3, engines: 2 },
    weapons: ['zwillingslaser', 'impulslaser'],
    torpedoes: 0,
    repairFactor: 0.5,
    rooms: [
      { id: 0, x: 0, y: 1, w: 2, h: 2, system: 'engines' },
      { id: 1, x: 2, y: 0, w: 2, h: 2 },
      { id: 2, x: 2, y: 2, w: 2, h: 2 },
      { id: 3, x: 4, y: 0, w: 2, h: 2, system: 'weapons' },
      { id: 4, x: 4, y: 2, w: 2, h: 2, system: 'shields' },
      { id: 5, x: 6, y: 1, w: 2, h: 2 },
    ],
  },
  // Endgegner: zwei Schildschichten, drei Waffen
  eisenrochen: {
    id: 'eisenrochen',
    name: 'Eisenrochen',
    maxHull: 26,
    reactor: 10,
    systems: { shields: 4, weapons: 4, engines: 2 },
    weapons: ['zwillingslaser', 'impulslaser', 'torpedo'],
    torpedoes: 8,
    repairFactor: 0.6,
    rooms: [
      { id: 0, x: 0, y: 2, w: 2, h: 2, system: 'engines' },
      { id: 1, x: 2, y: 1, w: 2, h: 2 },
      { id: 2, x: 2, y: 3, w: 2, h: 2 },
      { id: 3, x: 4, y: 0, w: 2, h: 2, system: 'shields' },
      { id: 4, x: 4, y: 2, w: 2, h: 2 },
      { id: 5, x: 4, y: 4, w: 2, h: 2, system: 'weapons' },
      { id: 6, x: 6, y: 1, w: 2, h: 2 },
      { id: 7, x: 6, y: 3, w: 2, h: 2 },
      { id: 8, x: 8, y: 2, w: 2, h: 2 },
    ],
  },
};

/** Wählbare Entwürfe für das Spielerschiff: Aussehen (Schlüssel in SHIP_ART) und Name. */
export const PLAYER_DESIGNS = [
  { id: 'donnerkeil', name: 'Donnerkeil', role: 'Kanonenboot' },
  { id: 'frostbrecher', name: 'Frostbrecher', role: 'Eisfrachter' },
  { id: 'sonnenwind', name: 'Sonnenwind', role: 'Forschungsschiff' },
] as const;

export type DesignId = (typeof PLAYER_DESIGNS)[number]['id'];

/** Setzt Name und Aussehen des Spielerschiffs auf den gewählten Entwurf. */
export function applyPlayerDesign(id: DesignId): void {
  const design = PLAYER_DESIGNS.find((d) => d.id === id) ?? PLAYER_DESIGNS[0];
  SHIPS.eisvogel.name = design.name;
  SHIPS.eisvogel.art = design.id;
}
