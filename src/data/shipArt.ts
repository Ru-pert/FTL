// Aussehen der Schiffe als Daten: Rumpfteile, Farben, Einrichtung der Räume.
// Koordinaten in Kacheln, relativ zum Raumraster; das Schiff zeigt nach rechts.

export type Material = 'hull' | 'hull2' | 'accent' | 'metal' | 'glass' | 'bone';
export type Deco = 'bunks' | 'crates' | 'consoles' | 'medbay' | 'corridor' | 'cockpit';

export interface HullPart {
  mat: Material;
  pts: [number, number][];
  /** Zusätzlich an der Längsachse gespiegelt zeichnen. */
  mirror?: boolean;
  /** Panzerplatten mit Fugen und Nieten. */
  panels?: boolean;
}

export interface ShipArt {
  /** Längsachse (y in Kacheln), an der gespiegelte Teile gespiegelt werden. */
  axisY: number;
  /** Zusammengeflickter Look: Platten in wechselnden Farben. */
  scrappy?: boolean;
  /** Je Material sechs Farben von dunkel nach hell: Kontur, Schatten, dunkel, mittel, hell, Glanz. */
  ramps: Record<Material, string[]>;
  /** Rumpfteile von hinten nach vorn (spätere liegen über früheren). */
  parts: HullPart[];
  /** Einrichtung der Räume ohne System, nach Raum-ID. */
  deco: Record<number, Deco>;
  engines: { x: number; y: number; size: number }[];
  flame: [string, string, string];
  lights: { x: number; y: number; color: string }[];
}

const METAL = ['#0d1018', '#272c3a', '#3d4458', '#5b647d', '#8791aa', '#c5cde0'];
const BONE = ['#2a2620', '#6e6654', '#a39a80', '#d1c9ae', '#ece6d0', '#ffffff'];

export const SHIP_ART: Record<string, ShipArt> = {
  // Eisvogel: schlanker Vogel mit langem Schnabel, gepfeilten Flügeln und zwei Triebwerksgondeln
  eisvogel: {
    axisY: 3,
    ramps: {
      hull: ['#10182a', '#2b3a57', '#42587c', '#6283a8', '#93b4d1', '#d6e9f5'],
      hull2: ['#0c1f2b', '#134a5e', '#1b6e85', '#2a97ab', '#5cc4cf', '#b5eef0'],
      accent: ['#3a1608', '#8c3a12', '#c85a1a', '#f08a2c', '#ffb968', '#ffe6b8'],
      metal: METAL,
      glass: ['#071a30', '#0f3557', '#1b5f93', '#3a9fe0', '#8fd6ff', '#e6f9ff'],
      bone: BONE,
    },
    parts: [
      // Flügel
      {
        mat: 'hull2',
        mirror: true,
        panels: true,
        pts: [
          [6.5, -0.2],
          [3.4, -2.45],
          [0.9, -2.95],
          [0.5, -2.4],
          [1.9, -1.3],
          [2.4, 0.7],
          [3.9, 0.9],
        ],
      },
      // Farbband auf dem Flügel
      {
        mat: 'accent',
        mirror: true,
        pts: [
          [4.9, -1.25],
          [4.2, -1.8],
          [3.0, -0.4],
          [3.7, 0.0],
        ],
      },
      // Gondel an der Flügelspitze
      {
        mat: 'metal',
        mirror: true,
        pts: [
          [3.9, -2.72],
          [3.5, -3.0],
          [0.6, -3.15],
          [0.3, -2.8],
          [0.6, -2.5],
          [3.4, -2.4],
        ],
      },
      // Leitwerk
      {
        mat: 'accent',
        mirror: true,
        pts: [
          [1.7, 1.5],
          [-0.3, 0.1],
          [-1.0, 0.25],
          [0.1, 1.75],
        ],
      },
      // Triebwerksgondeln
      {
        mat: 'metal',
        mirror: true,
        pts: [
          [-1.5, 1.8],
          [0.3, 1.6],
          [1.1, 1.9],
          [1.1, 2.75],
          [-1.5, 2.65],
        ],
      },
      // Rumpf mit Schnabel
      {
        mat: 'hull',
        mirror: true,
        panels: true,
        pts: [
          [-0.5, 3],
          [-0.5, 1.75],
          [1.6, 1.55],
          [1.75, 0.6],
          [3.65, 0.5],
          [3.8, -0.45],
          [6.25, -0.45],
          [6.6, 0.55],
          [9.3, 0.6],
          [9.65, 1.55],
          [11.3, 1.75],
          [12.7, 2.45],
          [14.0, 3],
        ],
      },
      // Schnabelspitze
      {
        mat: 'accent',
        pts: [
          [12.6, 2.42],
          [14.0, 3],
          [12.6, 3.58],
        ],
      },
      // Cockpitglas
      {
        mat: 'glass',
        pts: [
          [11.25, 2.25],
          [12.35, 2.62],
          [12.35, 3.38],
          [11.25, 3.75],
        ],
      },
    ],
    deco: { 1: 'bunks', 2: 'crates', 5: 'corridor', 6: 'consoles', 7: 'medbay', 8: 'cockpit' },
    engines: [
      { x: -1.5, y: 2.22, size: 8 },
      { x: -1.5, y: 3.78, size: 8 },
    ],
    flame: ['#2a7de0', '#7fd4ff', '#ffffff'],
    lights: [
      { x: 0.55, y: -2.85, color: '#ff5050' },
      { x: 0.55, y: 8.85, color: '#50ff70' },
    ],
  },

  // Schrotthai: zusammengeflickter Hai mit Rückenflosse, Schwanzflosse und Zähnen
  schrotthai: {
    axisY: 2,
    scrappy: true,
    ramps: {
      hull: ['#170d12', '#3a1e26', '#5c2f36', '#874447', '#b56a57', '#e3a585'],
      hull2: ['#101012', '#2a2828', '#47413f', '#6b625b', '#958a7e', '#c9bfae'],
      accent: ['#2a2208', '#6b5a16', '#9c8420', '#c9a72c', '#ecd060', '#fff3a8'],
      metal: METAL,
      glass: ['#2a0606', '#6e0f0f', '#b81d1d', '#f03a2a', '#ff8a6a', '#ffe0d0'],
      bone: BONE,
    },
    parts: [
      // Schwanzflosse
      {
        mat: 'hull2',
        panels: true,
        pts: [
          [-0.3, 1.5],
          [-2.3, -0.6],
          [-2.8, -0.1],
          [-1.3, 2.0],
        ],
      },
      {
        mat: 'hull2',
        panels: true,
        pts: [
          [-0.3, 2.5],
          [-1.9, 4.2],
          [-2.4, 3.7],
          [-1.3, 2.0],
        ],
      },
      // Rückenflosse
      {
        mat: 'hull2',
        panels: true,
        pts: [
          [4.7, -0.4],
          [2.3, -2.6],
          [1.4, -2.45],
          [2.4, -0.4],
        ],
      },
      // Brustflosse
      {
        mat: 'hull2',
        panels: true,
        pts: [
          [5.5, 4.4],
          [3.5, 6.15],
          [2.6, 5.9],
          [3.6, 4.4],
        ],
      },
      // Triebwerk
      {
        mat: 'metal',
        pts: [
          [-1.5, 1.45],
          [-0.4, 1.35],
          [-0.4, 2.65],
          [-1.5, 2.55],
        ],
      },
      // Körper mit Schnauze und Maul
      {
        mat: 'hull',
        panels: true,
        pts: [
          [-0.6, 1.2],
          [1.7, 0.6],
          [1.9, -0.5],
          [6.2, -0.5],
          [6.6, 0.45],
          [8.5, 0.8],
          [10.1, 1.6],
          [10.5, 2.05],
          [9.7, 2.5],
          [8.4, 3.25],
          [6.6, 3.5],
          [6.2, 4.5],
          [1.9, 4.5],
          [1.7, 3.4],
          [-0.6, 2.8],
        ],
      },
      // Kriegsbemalung hinter dem Kopf
      {
        mat: 'accent',
        pts: [
          [8.45, 0.85],
          [8.95, 1.05],
          [8.6, 3.05],
          [8.2, 3.22],
        ],
      },
      // Auge
      {
        mat: 'glass',
        pts: [
          [9.1, 1.4],
          [9.75, 1.6],
          [9.65, 2.0],
          [9.1, 1.92],
        ],
      },
      // Zähne
      ...[0, 1, 2, 3].map(
        (k): HullPart => ({
          mat: 'bone',
          pts: [
            [8.5 + 0.3 * k, 3.2 - 0.175 * k],
            [8.8 + 0.3 * k, 3.025 - 0.175 * k],
            [8.72 + 0.3 * k, 3.5 - 0.175 * k],
          ],
        }),
      ),
    ],
    deco: { 1: 'crates', 2: 'bunks', 5: 'cockpit' },
    engines: [{ x: -1.5, y: 2.0, size: 12 }],
    flame: ['#e0561e', '#ffae3d', '#fff3c4'],
    lights: [{ x: 1.55, y: -2.45, color: '#ff4040' }],
  },

  // Rostwespe: Insektenkörper mit Stachel, vier durchscheinenden Flügeln und Beißzangen
  rostwespe: {
    axisY: 2,
    ramps: {
      hull: ['#1a0d08', '#3f2010', '#6b3516', '#9c5220', '#c9782e', '#f0b060'],
      hull2: ['#0e1a1c', '#274045', '#3f666b', '#5e9296', '#8fc2c2', '#d0eeea'],
      accent: ['#2a2208', '#6b5a16', '#9c8420', '#d9b82c', '#f2dc60', '#fff6b0'],
      metal: METAL,
      glass: ['#06200c', '#0f4a1c', '#1b8a34', '#3ad65a', '#8ff0a0', '#e0ffe6'],
      bone: BONE,
    },
    parts: [
      // Hinteres Flügelpaar
      {
        mat: 'hull2',
        mirror: true,
        pts: [
          [2.6, -0.3],
          [0.2, -1.7],
          [-1.2, -1.3],
          [-0.6, -0.7],
          [1.2, -0.1],
        ],
      },
      // Vorderes Flügelpaar
      {
        mat: 'hull2',
        mirror: true,
        panels: true,
        pts: [
          [4.0, -0.3],
          [1.6, -2.9],
          [0.0, -2.9],
          [-0.3, -2.3],
          [1.0, -1.5],
          [2.4, -0.3],
        ],
      },
      // Stachel
      {
        mat: 'bone',
        pts: [
          [-0.6, 1.7],
          [-2.9, 2.0],
          [-0.6, 2.3],
        ],
      },
      // Seitentriebwerke
      {
        mat: 'metal',
        mirror: true,
        pts: [
          [-1.3, 0.85],
          [0.1, 0.65],
          [0.4, 1.35],
          [-1.3, 1.4],
        ],
      },
      // Körper: Hinterleib, Brust, Kopf
      {
        mat: 'hull',
        mirror: true,
        panels: true,
        pts: [
          [-0.9, 2],
          [-0.7, 1.15],
          [0.2, 0.55],
          [1.7, 0.55],
          [1.9, -0.5],
          [4.2, -0.5],
          [4.5, 0.5],
          [6.3, 0.6],
          [7.0, 1.2],
          [7.3, 2],
        ],
      },
      // Warnstreifen am Hinterleib
      {
        mat: 'accent',
        pts: [
          [-0.45, 1.25],
          [-0.1, 0.95],
          [-0.1, 3.05],
          [-0.45, 2.75],
        ],
      },
      // Facettenaugen
      {
        mat: 'glass',
        mirror: true,
        pts: [
          [6.35, 0.85],
          [6.95, 1.3],
          [6.7, 1.75],
          [6.25, 1.5],
        ],
      },
      // Beißzangen
      {
        mat: 'bone',
        mirror: true,
        pts: [
          [7.0, 1.45],
          [8.1, 1.55],
          [7.8, 1.95],
          [7.15, 1.9],
        ],
      },
    ],
    deco: { 3: 'cockpit' },
    engines: [
      { x: -1.3, y: 1.12, size: 6 },
      { x: -1.3, y: 2.88, size: 6 },
    ],
    flame: ['#c9a72c', '#f2dc60', '#ffffff'],
    lights: [{ x: 0.1, y: -2.8, color: '#ffd040' }],
  },

  // Eisenrochen: breite Schwingen, langer Schwanz, zwei Hörner am Bug
  eisenrochen: {
    axisY: 3,
    ramps: {
      hull: ['#0c0f18', '#252b3c', '#3b445c', '#5a6682', '#8591ad', '#c0c9de'],
      hull2: ['#0e0c18', '#231f3a', '#39325c', '#544a82', '#7d72ad', '#b8b0dc'],
      accent: ['#2a0818', '#6e1440', '#a82060', '#e03a88', '#ff80b8', '#ffd0e6'],
      metal: METAL,
      glass: ['#071a30', '#0f3557', '#1b5f93', '#3ad0e0', '#8ff0ff', '#e6fdff'],
      bone: BONE,
    },
    parts: [
      // Schwanz
      {
        mat: 'metal',
        pts: [
          [-0.4, 2.7],
          [-2.9, 2.93],
          [-2.9, 3.07],
          [-0.4, 3.3],
        ],
      },
      // Schwingen
      {
        mat: 'hull2',
        mirror: true,
        panels: true,
        pts: [
          [8.7, 1.4],
          [5.2, -2.2],
          [3.3, -2.5],
          [0.4, -0.4],
          [0.6, 1.6],
        ],
      },
      // Leuchtband auf den Schwingen
      {
        mat: 'accent',
        mirror: true,
        pts: [
          [6.3, -0.75],
          [5.6, -1.5],
          [2.9, -1.3],
          [3.3, -0.6],
        ],
      },
      // Triebwerke
      {
        mat: 'metal',
        mirror: true,
        pts: [
          [-1.3, 1.85],
          [-0.3, 1.75],
          [-0.3, 2.75],
          [-1.3, 2.65],
        ],
      },
      // Hörner
      {
        mat: 'hull2',
        mirror: true,
        pts: [
          [10.5, 1.85],
          [12.3, 1.2],
          [12.5, 1.65],
          [11.0, 2.55],
        ],
      },
      // Körper
      {
        mat: 'hull',
        mirror: true,
        panels: true,
        pts: [
          [-0.5, 3],
          [-0.5, 1.6],
          [1.7, 1.4],
          [1.8, 0.5],
          [3.7, 0.4],
          [3.8, -0.5],
          [6.2, -0.5],
          [6.4, 0.5],
          [8.3, 0.6],
          [8.6, 1.5],
          [10.4, 1.7],
          [11.0, 2.3],
          [11.1, 3],
        ],
      },
      // Augen
      {
        mat: 'glass',
        mirror: true,
        pts: [
          [10.25, 2.0],
          [10.85, 2.25],
          [10.85, 2.65],
          [10.25, 2.6],
        ],
      },
    ],
    deco: { 1: 'crates', 2: 'bunks', 4: 'corridor', 6: 'consoles', 7: 'medbay', 8: 'cockpit' },
    engines: [
      { x: -1.3, y: 2.25, size: 9 },
      { x: -1.3, y: 3.75, size: 9 },
    ],
    flame: ['#a82060', '#ff80b8', '#ffffff'],
    lights: [
      { x: 3.4, y: -2.4, color: '#ff40a0' },
      { x: 3.4, y: 8.4, color: '#ff40a0' },
    ],
  },
};

/** Aussehen eines Schiffs; Varianten können das Aussehen eines anderen Schiffs übernehmen. */
export function artFor(def: { id: string; art?: string }): ShipArt {
  return SHIP_ART[def.art ?? def.id];
}
