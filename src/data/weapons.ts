import type { WeaponDef } from '../sim/types';

// Waffen als reine Daten. Neue Waffen hier eintragen, die Logik bleibt unberührt.
export const WEAPONS: Record<string, WeaponDef> = {
  impulslaser: {
    id: 'impulslaser',
    name: 'Impulslaser',
    kind: 'laser',
    power: 1,
    chargeTime: 9,
    shots: 1,
    damage: 1,
    piercing: false,
    usesTorpedo: false,
    flightTime: 0.9,
  },
  zwillingslaser: {
    id: 'zwillingslaser',
    name: 'Zwillingslaser',
    kind: 'laser',
    power: 2,
    chargeTime: 12,
    shots: 2,
    damage: 1,
    piercing: false,
    usesTorpedo: false,
    flightTime: 0.9,
  },
  torpedo: {
    id: 'torpedo',
    name: 'Torpedowerfer',
    kind: 'torpedo',
    power: 1,
    chargeTime: 15,
    shots: 1,
    damage: 2,
    piercing: true,
    usesTorpedo: true,
    flightTime: 1.6,
  },
};
