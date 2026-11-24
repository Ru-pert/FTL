// Aussehen der Schiffe als Daten: Rumpfteile, Farben, Einrichtung der Räume.
// Koordinaten in Kacheln, relativ zum Raumraster; das Schiff zeigt nach rechts.

/** energy = leuchtende Teile (Energieleitungen, Kerne) mit Lichtschein um sich herum. */
export type Material = 'hull' | 'hull2' | 'accent' | 'metal' | 'glass' | 'bone' | 'energy';
export type Deco = 'bunks' | 'crates' | 'consoles' | 'medbay' | 'corridor' | 'cockpit';

export interface HullPart {
  mat: Material;
  pts: [number, number][];
  /** Zusätzlich an der Längsachse gespiegelt zeichnen. */
  mirror?: boolean;
  /** Panzerplatten mit Fugen und Nieten. */
  panels?: boolean;
  /** Waagerechte Rillen wie bei Kühlrippen. */
  stripes?: boolean;
}

/** Kristallsplitter: Fußpunkt, Länge, Richtung in Grad (0 = nach vorn, -90 = nach oben), Breite. */
export function shard(x: number, y: number, len: number, deg: number, width: number): [number, number][] {
  const a = (deg * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const nx = -dy * width * 0.5;
  const ny = dx * width * 0.5;
  return [
    [x + nx, y + ny],
    [x + dx * len * 0.62 + nx * 1.1, y + dy * len * 0.62 + ny * 1.1],
    [x + dx * len, y + dy * len],
    [x + dx * len * 0.62 - nx * 1.1, y + dy * len * 0.62 - ny * 1.1],
    [x - nx, y - ny],
  ];
}

/** Punkte einer Ellipse (oder eines Ellipsenbogens) als Vieleck, Winkel im Bogenmaß. */
export function ellipse(cx: number, cy: number, rx: number, ry: number, from = 0, to = Math.PI * 2, steps = 24): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = from + ((to - from) * i) / steps;
    pts.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]);
  }
  return pts;
}

export interface ShipArt {
  /** Längsachse (y in Kacheln), an der gespiegelte Teile gespiegelt werden. */
  axisY: number;
  /** Zusammengeflickter Look: Platten in wechselnden Farben. */
  scrappy?: boolean;
  /** Je Material sechs Farben von dunkel nach hell: Kontur, Schatten, dunkel, mittel, hell, Glanz. */
  ramps: Record<Exclude<Material, 'energy'>, string[]> & { energy?: string[] };
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
  // Eisvogel: Forschungs- und Eisbrecherschiff. Gedrungener Panzerrumpf, Bug aus Eiskristallen,
  // zwei große Triebwerksglocken, senkrechte Kühlrippen, Antennenschüssel oben, Frachtcontainer unten.
  eisvogel: {
    axisY: 3,
    ramps: {
      hull: ['#121a2c', '#3a4a66', '#5d7393', '#8ea6c3', '#c4d6e8', '#f2f8ff'],
      hull2: ['#0c1424', '#1e2d48', '#2d4468', '#41618e', '#6488b4', '#a9c6e6'],
      accent: ['#3a1608', '#8c3a12', '#c85a1a', '#f08a2c', '#ffb968', '#ffe6b8'],
      metal: METAL,
      glass: ['#06203a', '#0e4a70', '#1f7fb0', '#46bde0', '#9ee8fa', '#f0fdff'],
      bone: BONE,
    },
    parts: [
      // Kühlrippen: senkrechte Platten oben und unten am Heck
      {
        mat: 'metal',
        mirror: true,
        stripes: true,
        pts: [
          [0.45, 1.4],
          [1.75, 1.4],
          [1.95, -2.35],
          [0.25, -2.35],
        ],
      },
      // Haltestreben der Kühlrippen
      {
        mat: 'hull2',
        mirror: true,
        pts: [
          [0.2, -2.5],
          [2.0, -2.5],
          [2.0, -2.2],
          [0.2, -2.2],
        ],
      },
      // Antennenmast und Schüssel (nur oben)
      {
        mat: 'metal',
        pts: [
          [7.88, 0.8],
          [8.12, 0.8],
          [8.12, -1.0],
          [7.88, -1.0],
        ],
      },
      {
        mat: 'hull',
        pts: [...ellipse(8, -1.55, 1.25, 0.62, 0, Math.PI, 16), ...ellipse(8, -1.55, 1.05, 0.18, Math.PI, 0, 10)],
      },
      {
        mat: 'accent',
        pts: [
          [7.95, -1.45],
          [8.05, -1.45],
          [8.05, -2.25],
          [7.95, -2.25],
        ],
      },
      // Frachtcontainer (nur unten)
      {
        mat: 'accent',
        pts: [
          [6.75, 5.1],
          [7.85, 5.1],
          [7.85, 6.15],
          [6.75, 6.15],
        ],
      },
      {
        mat: 'hull2',
        panels: true,
        pts: [
          [7.95, 5.1],
          [9.15, 5.1],
          [9.15, 6.0],
          [7.95, 6.0],
        ],
      },
      // Triebwerksglocken
      {
        mat: 'metal',
        mirror: true,
        pts: [
          [0.1, 2.0],
          [0.1, 2.62],
          [-1.7, 2.97],
          [-1.7, 1.63],
        ],
      },
      // Panzerrumpf
      {
        mat: 'hull',
        mirror: true,
        panels: true,
        pts: [
          [-0.35, 3],
          [-0.35, 1.72],
          [0.2, 1.5],
          [1.65, 1.5],
          [1.78, 0.62],
          [3.55, 0.55],
          [3.75, -0.38],
          [6.35, -0.38],
          [6.55, 0.6],
          [9.2, 0.62],
          [9.45, 1.55],
          [11.2, 1.62],
          [11.85, 2.2],
          [12.05, 3],
        ],
      },
      // Panzerkragen in Signalfarbe
      {
        mat: 'accent',
        mirror: true,
        pts: [
          [3.45, -0.6],
          [3.9, -0.6],
          [3.9, 0.75],
          [3.45, 0.75],
        ],
      },
      {
        mat: 'accent',
        mirror: true,
        pts: [
          [6.2, -0.6],
          [6.65, -0.6],
          [6.65, 0.75],
          [6.2, 0.75],
        ],
      },
      // Eiskristall-Bug: großer Mittelkristall und zwei schräge Splitter
      {
        mat: 'glass',
        mirror: true,
        pts: [
          [11.25, 2.25],
          [11.95, 1.55],
          [13.05, 1.1],
          [12.45, 2.0],
          [11.75, 2.55],
        ],
      },
      {
        mat: 'glass',
        pts: [
          [11.55, 2.5],
          [12.65, 2.25],
          [14.1, 3.0],
          [12.65, 3.75],
          [11.55, 3.5],
        ],
      },
    ],
    deco: { 1: 'bunks', 2: 'crates', 5: 'corridor', 6: 'consoles', 7: 'medbay', 8: 'cockpit' },
    engines: [
      { x: -1.7, y: 2.3, size: 14 },
      { x: -1.7, y: 3.7, size: 14 },
    ],
    flame: ['#2a7de0', '#7fd4ff', '#ffffff'],
    lights: [
      { x: 8.0, y: -2.3, color: '#ff5050' },
      { x: 1.1, y: -2.35, color: '#5ea0ff' },
      { x: 1.1, y: 8.35, color: '#50ff70' },
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

  // ---- Entwürfe für das Spielerschiff (Auswahl über ?entwurf=a, b oder c) ----

  // Entwurf A, Speerspitze: dunkler Kampfrumpf, Gabelbug mit Energieschiene, wuchtiger Antriebsblock
  entwurf_a: {
    axisY: 3,
    ramps: {
      hull: ['#07090f', '#1a1f2c', '#2c3446', '#414c66', '#66748f', '#a7b3cc'],
      hull2: ['#05060b', '#11151f', '#1b2130', '#283046', '#3b4662', '#687696'],
      accent: ['#04222a', '#0a5866', '#0f95a8', '#22d3e6', '#8af2ff', '#e8feff'],
      metal: METAL,
      glass: ['#04222a', '#0a5866', '#0f95a8', '#22d3e6', '#8af2ff', '#e8feff'],
      bone: BONE,
      energy: ['#0a4a5a', '#18a6c0', '#3ee6ff', '#8af6ff', '#d8feff', '#ffffff'],
    },
    parts: [
      // Heckstacheln
      { mat: 'hull2', mirror: true, panels: true, pts: [[-1.9, 0.7], [-0.5, 0.7], [-1.5, -0.8], [-2.1, -0.85]] },
      // Antriebsblock
      { mat: 'hull2', mirror: true, panels: true, pts: [[-2.4, 3], [-2.4, 1.0], [-1.7, 0.5], [0.5, 0.5], [0.9, 1.2], [0.9, 3]] },
      // Düsen
      { mat: 'metal', mirror: true, pts: [[-2.3, 0.95], [-2.3, 1.75], [-3.2, 2.0], [-3.2, 0.7]] },
      { mat: 'metal', pts: [[-2.3, 2.55], [-2.3, 3.45], [-3.35, 3.75], [-3.35, 2.25]] },
      // Brückenturm oben
      { mat: 'hull', panels: true, pts: [[3.85, -0.3], [4.3, -1.55], [7.3, -1.55], [8.25, -0.3]] },
      { mat: 'energy', pts: [[4.6, -1.15], [7.25, -1.15], [7.25, -0.97], [4.6, -0.97]] },
      // Kiel unten
      { mat: 'hull2', panels: true, pts: [[3.6, 6.3], [8.4, 6.3], [7.5, 7.15], [4.3, 7.15]] },
      // Gabelzinken
      { mat: 'hull', mirror: true, panels: true, pts: [[9.0, 0.95], [11.0, 0.8], [15.9, 1.9], [11.5, 2.38], [9.4, 2.15]] },
      { mat: 'accent', mirror: true, pts: [[14.3, 1.62], [15.9, 1.9], [14.4, 2.0]] },
      // Rumpf
      {
        mat: 'hull',
        mirror: true,
        panels: true,
        pts: [[-0.35, 3], [-0.35, 1.72], [0.2, 1.5], [1.65, 1.5], [1.78, 0.62], [3.55, 0.55], [3.75, -0.38], [6.35, -0.38], [6.55, 0.6], [9.2, 0.62], [9.45, 1.55], [11.2, 1.62], [11.85, 2.2], [12.05, 3]],
      },
      // Panzerschuppen
      { mat: 'hull2', mirror: true, panels: true, pts: [[6.4, 0.28], [9.3, 0.38], [9.62, 1.0], [6.62, 0.92]] },
      { mat: 'hull2', mirror: true, panels: true, pts: [[1.7, 0.42], [3.6, 0.36], [3.8, 0.85], [1.9, 0.9]] },
      // Leuchtstreifen und Energieschiene zwischen den Zinken
      { mat: 'energy', mirror: true, pts: [[6.7, 0.52], [9.15, 0.6], [9.15, 0.72], [6.7, 0.66]] },
      { mat: 'energy', mirror: true, pts: [[-1.6, 0.8], [0.4, 0.8], [0.4, 0.94], [-1.6, 0.94]] },
      { mat: 'energy', pts: [[11.9, 2.9], [15.3, 2.92], [15.3, 3.08], [11.9, 3.1]] },
      { mat: 'energy', pts: ellipse(12.15, 3, 0.32, 0.32, 0, Math.PI * 2, 12) },
    ],
    deco: { 1: 'bunks', 2: 'crates', 5: 'corridor', 6: 'consoles', 7: 'medbay', 8: 'cockpit' },
    engines: [
      { x: -3.2, y: 1.35, size: 14 },
      { x: -3.35, y: 3, size: 18 },
      { x: -3.2, y: 4.65, size: 14 },
    ],
    flame: ['#1a8ad6', '#7ff0ff', '#ffffff'],
    lights: [
      { x: 5.8, y: -1.55, color: '#ff4040' },
      { x: 15.7, y: 1.9, color: '#3ee6ff' },
      { x: 15.7, y: 4.1, color: '#3ee6ff' },
    ],
  },

  // Entwurf B, Kristallkrone: perlweißer Rumpf, auf dem Kristalle wie eine Krone wachsen
  entwurf_b: {
    axisY: 3,
    ramps: {
      hull: ['#141a26', '#4a5670', '#7a8aa6', '#aebdd4', '#dbe5f2', '#ffffff'],
      hull2: ['#0c0a1e', '#1e1a44', '#2e2a66', '#433d8c', '#6460b4', '#a19ee0'],
      accent: ['#2a0c3a', '#5a1e7a', '#8a34b8', '#b45ee6', '#d9a2ff', '#f6e6ff'],
      metal: METAL,
      glass: ['#0a1440', '#1a3480', '#2e62c0', '#4aa6f0', '#a6e4ff', '#f0fbff'],
      bone: BONE,
      energy: ['#3a1466', '#7a36c8', '#b06aff', '#d8a8ff', '#f2e0ff', '#ffffff'],
    },
    parts: [
      // Kristalle hinter dem Rumpf (Krone oben, kleinere unten)
      { mat: 'glass', pts: shard(4.3, 0.2, 2.6, -112, 0.75) },
      { mat: 'glass', pts: shard(5.2, 0.0, 3.4, -98, 0.95) },
      { mat: 'glass', pts: shard(6.1, 0.2, 2.4, -78, 0.7) },
      { mat: 'glass', pts: shard(3.2, 0.7, 1.6, -130, 0.55) },
      { mat: 'glass', pts: shard(6.9, 0.7, 1.5, -55, 0.5) },
      { mat: 'glass', pts: shard(5.0, 5.9, 2.0, 105, 0.7) },
      { mat: 'glass', pts: shard(6.0, 5.8, 1.4, 80, 0.5) },
      { mat: 'glass', pts: shard(8.3, 5.2, 1.3, 120, 0.45) },
      // Antriebsgehäuse
      { mat: 'hull2', mirror: true, panels: true, pts: [[-1.7, 3], [-1.7, 1.75], [-1.2, 1.15], [0.4, 1.0], [0.7, 3]] },
      { mat: 'metal', mirror: true, pts: [[-1.6, 1.85], [-1.6, 2.65], [-2.4, 2.9], [-2.4, 1.6]] },
      // Rumpf, weich gerundet
      {
        mat: 'hull',
        mirror: true,
        panels: true,
        pts: [[-0.35, 3], [-0.35, 1.72], [0.2, 1.5], [1.65, 1.45], [1.9, 0.62], [3.5, 0.5], [3.9, -0.38], [6.2, -0.38], [6.6, 0.55], [9.2, 0.6], [9.5, 1.5], [11.1, 1.65], [11.9, 2.3], [12.15, 3]],
      },
      // Violette Zierbänder
      { mat: 'accent', mirror: true, pts: [[3.45, -0.55], [3.85, -0.55], [3.85, 0.75], [3.45, 0.75]] },
      { mat: 'accent', mirror: true, pts: [[9.05, 0.45], [9.4, 0.45], [9.4, 1.65], [9.05, 1.65]] },
      // Leuchtender Kristallkern oben auf dem Rumpf
      { mat: 'energy', pts: ellipse(5.15, -0.15, 0.45, 0.28, 0, Math.PI * 2, 16) },
      // Kristallbug: großer Speer und zwei Seitensplitter
      { mat: 'glass', mirror: true, pts: shard(11.4, 2.3, 2.6, -24, 0.55) },
      { mat: 'glass', pts: shard(11.8, 3, 4.0, 0, 1.15) },
      { mat: 'energy', pts: [[12.0, 2.94], [14.8, 2.97], [14.8, 3.03], [12.0, 3.06]] },
    ],
    deco: { 1: 'bunks', 2: 'crates', 5: 'corridor', 6: 'consoles', 7: 'medbay', 8: 'cockpit' },
    engines: [
      { x: -2.4, y: 2.25, size: 14 },
      { x: -2.4, y: 3.75, size: 14 },
    ],
    flame: ['#7a36c8', '#d8a8ff', '#ffffff'],
    lights: [
      { x: 5.2, y: -3.4, color: '#b06aff' },
      { x: 4.8, y: 7.9, color: '#b06aff' },
    ],
  },

  // Entwurf C, Ringantrieb: Rumpf führt durch einen großen leuchtenden Antriebsring, Hammerkopf-Brücke vorn
  entwurf_c: {
    axisY: 3,
    ramps: {
      hull: ['#160d08', '#40261a', '#6a4028', '#9a6236', '#cc9256', '#f6d8a6'],
      hull2: ['#061a1c', '#0e3a3e', '#16585c', '#22807e', '#4cb0a8', '#a8e8de'],
      accent: ['#2a1c04', '#6b4a0a', '#a87818', '#e0aa2c', '#f6d466', '#fff4c0'],
      metal: METAL,
      glass: ['#04201e', '#0a4e4a', '#12807a', '#28c0b4', '#8af0e4', '#e8fffc'],
      bone: BONE,
      energy: ['#0a4a44', '#18a898', '#3ef0dc', '#9afff2', '#dafffb', '#ffffff'],
    },
    parts: [
      // Hintere Hälfte des Antriebsrings
      { mat: 'accent', panels: true, pts: [...ellipse(-1.5, 3, 0.95, 4.7, Math.PI / 2, Math.PI * 1.5, 24), ...ellipse(-1.5, 3, 0.55, 4.0, Math.PI * 1.5, Math.PI / 2, 24)] },
      { mat: 'energy', pts: [...ellipse(-1.5, 3, 0.58, 4.05, Math.PI / 2, Math.PI * 1.5, 24), ...ellipse(-1.5, 3, 0.48, 3.9, Math.PI * 1.5, Math.PI / 2, 24)] },
      // Rückgrat durch den Ring mit Düse
      { mat: 'metal', mirror: true, pts: [[-2.9, 2.45], [0.2, 2.35], [0.2, 3], [-2.9, 3]] },
      { mat: 'metal', mirror: true, pts: [[-2.8, 2.5], [-2.8, 2.8], [-3.5, 2.95], [-3.5, 2.35]] },
      // Halter zwischen Rumpf und Ring
      { mat: 'hull2', mirror: true, pts: [[-1.2, 1.2], [0.4, 1.55], [0.4, 1.9], [-1.2, 1.6]] },
      // Sensorkuppel oben
      { mat: 'metal', pts: [[6.85, -0.4], [7.15, -0.4], [7.15, -1.7], [6.85, -1.7]] },
      { mat: 'glass', pts: [...ellipse(5.4, -0.3, 1.05, 0.62, Math.PI, Math.PI * 2, 16), [6.45, -0.25], [4.35, -0.25]] },
      // Rumpf
      {
        mat: 'hull',
        mirror: true,
        panels: true,
        pts: [[-0.35, 3], [-0.35, 1.72], [0.2, 1.5], [1.65, 1.5], [1.78, 0.62], [3.55, 0.55], [3.75, -0.38], [6.35, -0.38], [6.55, 0.6], [9.2, 0.62], [9.45, 1.55], [11.0, 1.62], [11.0, 3]],
      },
      // Hammerkopf-Brücke
      { mat: 'hull2', mirror: true, panels: true, pts: [[10.9, 3], [10.9, 0.55], [11.4, 0.05], [12.5, 0.05], [12.95, 0.6], [12.95, 3]] },
      { mat: 'glass', mirror: true, pts: [[12.6, 0.7], [12.85, 0.75], [12.85, 2.6], [12.6, 2.6]] },
      { mat: 'energy', mirror: true, pts: [[11.3, 0.2], [12.4, 0.2], [12.4, 0.32], [11.3, 0.32]] },
      // Vordere Hälfte des Antriebsrings (liegt vor dem Rumpf)
      { mat: 'accent', panels: true, pts: [...ellipse(-1.5, 3, 0.95, 4.7, -Math.PI / 2, Math.PI / 2, 24), ...ellipse(-1.5, 3, 0.55, 4.0, Math.PI / 2, -Math.PI / 2, 24)] },
      { mat: 'energy', pts: [...ellipse(-1.5, 3, 0.58, 4.05, -Math.PI / 2, Math.PI / 2, 24), ...ellipse(-1.5, 3, 0.48, 3.9, Math.PI / 2, -Math.PI / 2, 24)] },
    ],
    deco: { 1: 'bunks', 2: 'crates', 5: 'corridor', 6: 'consoles', 7: 'medbay', 8: 'cockpit' },
    engines: [{ x: -3.5, y: 3, size: 12 }],
    flame: ['#18a898', '#9afff2', '#ffffff'],
    lights: [
      { x: 7.0, y: -1.7, color: '#ff4040' },
      { x: 12.0, y: 0.05, color: '#3ef0dc' },
      { x: 12.0, y: 5.95, color: '#3ef0dc' },
    ],
  },
};

/** Aussehen eines Schiffs; Varianten können das Aussehen eines anderen Schiffs übernehmen. */
export function artFor(def: { id: string; art?: string }): ShipArt {
  return SHIP_ART[def.art ?? def.id];
}