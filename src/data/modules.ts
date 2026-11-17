// Module der Homebase als Daten: Name, Kosten je Stufe und was jede Stufe bringt.
export type ModuleId = 'werft' | 'reaktor' | 'waffen' | 'schild' | 'antrieb' | 'dock';

export interface ModuleDef {
  id: ModuleId;
  name: string;
  /** Kosten in Kristallen für Stufe 1, 2, ... */
  costs: number[];
  /** Beschreibung dessen, was die jeweilige Stufe bringt. */
  effects: string[];
}

export const MODULES: ModuleDef[] = [
  {
    id: 'werft',
    name: 'Werft',
    costs: [20, 40, 70],
    effects: ['+5 Hülle', '+5 Hülle', '+5 Hülle'],
  },
  {
    id: 'reaktor',
    name: 'Reaktorkammer',
    costs: [40, 90],
    effects: ['+1 Reaktorenergie', '+1 Reaktorenergie'],
  },
  {
    id: 'waffen',
    name: 'Waffenkammer',
    costs: [25, 60, 90],
    effects: ['+3 Torpedos zum Start', 'Drillingslaser', '+3 Torpedos zum Start'],
  },
  {
    id: 'schild',
    name: 'Schildlabor',
    costs: [35, 100],
    effects: ['Schild lädt schneller', 'Zweite Schildschicht'],
  },
  {
    id: 'antrieb',
    name: 'Antriebslabor',
    costs: [25, 55],
    effects: ['+1 Antriebsstufe', '+1 Antriebsstufe'],
  },
  {
    id: 'dock',
    name: 'Reparaturdock',
    costs: [30, 60],
    effects: ['Reparatur und Heilung', 'Reparatur und Heilung'],
  },
];
