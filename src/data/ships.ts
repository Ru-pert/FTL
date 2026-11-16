import type { ShipDef } from '../sim/types';

// Schiffe als reine Daten. Räume liegen auf einem Kachelraster, das Schiff zeigt nach rechts.
export const SHIPS: Record<string, ShipDef> = {
  eisvogel: {
    id: 'eisvogel',
    name: 'Eisvogel',
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
    rooms: [
      { id: 0, x: 0, y: 1, w: 2, h: 2, system: 'engines' },
      { id: 1, x: 2, y: 0, w: 2, h: 2 },
      { id: 2, x: 2, y: 2, w: 2, h: 2 },
      { id: 3, x: 4, y: 0, w: 2, h: 2, system: 'weapons' },
      { id: 4, x: 4, y: 2, w: 2, h: 2, system: 'shields' },
      { id: 5, x: 6, y: 1, w: 2, h: 2 },
    ],
  },
};
