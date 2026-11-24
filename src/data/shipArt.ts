// Aussehen der Schiffe als Daten: Rumpfteile, Farben, Einrichtung der Räume.
// Koordinaten in Kacheln, relativ zum Raumraster; das Schiff zeigt nach rechts.

/** energy = leuchtende Teile (Energieleitungen, Kerne) mit Lichtschein um sich herum. */
export type Material =
  | 'hull'
  | 'hull2'
  | 'accent'
  | 'metal'
  | 'glass'
  | 'bone'
  | 'energy'
  /** Goldene Isolierfolie, leicht zerknittert. */
  | 'foil'
  /** Gelb-schwarze Warnstreifen. */
  | 'hazard'
  /** Gitterträger: nur die Streben werden gezeichnet. */
  | 'truss';
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
  ramps: Record<Exclude<Material, 'energy' | 'foil' | 'hazard' | 'truss'>, string[]> &
    Partial<Record<'energy' | 'foil' | 'hazard' | 'truss', string[]>>;
  /** Rumpfteile von hinten nach vorn (spätere liegen über früheren). */
  parts: HullPart[];
  /** Einrichtung der Räume ohne System, nach Raum-ID. */
  deco: Record<number, Deco>;
  engines: { x: number; y: number; size: number }[];
  flame: [string, string, string];
  lights: { x: number; y: number; color: string }[];
  /** Drehpunkte der Geschütze in Kacheln, in der Reihenfolge der Waffen. */
  mounts?: { x: number; y: number }[];
  /** Kennzeichen auf dem Rumpf (Position in Kacheln, linke obere Ecke). */
  markings?: { x: number; y: number; text: string; color: string }[];
}

const METAL = ['#0d1018', '#272c3a', '#3d4458', '#5b647d', '#8791aa', '#c5cde0'];
const BONE = ['#2a2620', '#6e6654', '#a39a80', '#d1c9ae', '#ece6d0', '#ffffff'];

export const SHIP_ART: Record<string, ShipArt> = {
  // ---- Spielerschiffe (in der Heimatbasis wählbar) ----

  // Donnerkeil: Kanonenboot mit Schienenkanone zwischen zwei Gabelzinken, schwerer Antriebsblock
  donnerkeil: {
    axisY: 3,
    ramps: {
      hull: ['#0b0d12', '#262a33', '#3b414d', '#565e6c', '#7d8696', '#b9c0cc'],
      hull2: ['#0a0c0c', '#1f2422', '#2f3632', '#444d47', '#626d66', '#99a39c'],
      accent: ['#200806', '#5a1a12', '#8a2a1c', '#b8402a', '#d9705a', '#f0b8a8'],
      metal: METAL,
      glass: ['#06141c', '#0e2c3c', '#1a4c64', '#2c7090', '#6aa8c4', '#d0ecf6'],
      bone: BONE,
      energy: ['#0a3a46', '#147c90', '#2cc0d8', '#7ae6f6', '#ccf8ff', '#ffffff'],
    },
    parts: [
      // Kühlflächen am Heck
      { mat: 'metal', mirror: true, stripes: true, pts: [[-1.55, 0.7], [0.15, 0.7], [-0.05, -1.45], [-1.35, -1.45]] },
      { mat: 'truss', mirror: true, pts: [[-1.0, 0.7], [-0.4, 0.7], [-0.4, -1.45], [-1.0, -1.45]] },
      // Antriebsblock
      { mat: 'hull2', mirror: true, panels: true, pts: [[-2.4, 3], [-2.4, 1.0], [-1.7, 0.5], [0.5, 0.5], [0.9, 1.2], [0.9, 3]] },
      { mat: 'hazard', mirror: true, pts: [[0.42, 0.55], [0.82, 0.55], [0.86, 1.15], [0.46, 1.15]] },
      // Düsen
      { mat: 'metal', mirror: true, pts: [[-2.3, 0.95], [-2.3, 1.75], [-3.15, 2.0], [-3.15, 0.7]] },
      { mat: 'metal', pts: [[-2.3, 2.55], [-2.3, 3.45], [-3.3, 3.75], [-3.3, 2.25]] },
      // Brückenturm mit Sensormast
      { mat: 'metal', pts: [[5.15, -1.5], [5.3, -1.5], [5.3, -2.5], [5.15, -2.5]] },
      { mat: 'metal', pts: [[4.9, -2.45], [5.55, -2.45], [5.55, -2.32], [4.9, -2.32]] },
      { mat: 'hull', panels: true, pts: [[3.85, -0.3], [4.3, -1.55], [7.3, -1.55], [8.25, -0.3]] },
      { mat: 'glass', pts: [[7.35, -1.4], [7.8, -0.95], [7.8, -0.75], [7.2, -0.75], [7.2, -1.4]] },
      // Kiel unten
      { mat: 'hull2', panels: true, pts: [[3.6, 6.3], [8.4, 6.3], [7.5, 7.15], [4.3, 7.15]] },
      // Schienen der Kanone
      { mat: 'hull', mirror: true, panels: true, pts: [[9.2, 1.1], [11.0, 0.95], [15.5, 2.05], [15.5, 2.5], [11.3, 2.5], [9.4, 2.2]] },
      { mat: 'metal', mirror: true, pts: [[11.3, 2.32], [15.5, 2.32], [15.5, 2.52], [11.3, 2.52]] },
      ...[12.0, 12.9, 13.8, 14.7].map((x): HullPart => ({ mat: 'energy', mirror: true, pts: [[x, 2.2], [x + 0.14, 2.2], [x + 0.14, 2.5], [x, 2.5]] })),
      // Rumpf
      {
        mat: 'hull',
        mirror: true,
        panels: true,
        pts: [[-0.35, 3], [-0.35, 1.72], [0.2, 1.5], [1.65, 1.5], [1.78, 0.62], [3.55, 0.55], [3.75, -0.38], [6.35, -0.38], [6.55, 0.6], [9.2, 0.62], [9.45, 1.55], [11.2, 1.62], [11.85, 2.2], [12.05, 3]],
      },
      // Panzerschuppen und Lagedüsen
      { mat: 'hull2', mirror: true, panels: true, pts: [[6.4, 0.28], [9.3, 0.38], [9.62, 1.0], [6.62, 0.92]] },
      { mat: 'hull2', mirror: true, panels: true, pts: [[1.7, 0.42], [3.6, 0.36], [3.8, 0.85], [1.9, 0.9]] },
      { mat: 'metal', mirror: true, pts: [[3.3, -0.58], [3.7, -0.58], [3.7, -0.3], [3.3, -0.3]] },
      { mat: 'metal', mirror: true, pts: [[10.95, 1.3], [11.3, 1.3], [11.3, 1.55], [10.95, 1.55]] },
      { mat: 'accent', mirror: true, pts: [[6.55, 0.28], [6.85, 0.28], [6.95, 0.94], [6.65, 0.94]] },
    ],
    deco: { 1: 'bunks', 2: 'crates', 5: 'corridor', 6: 'consoles', 7: 'medbay', 8: 'cockpit' },
    engines: [
      { x: -3.15, y: 1.35, size: 14 },
      { x: -3.3, y: 3, size: 18 },
      { x: -3.15, y: 4.65, size: 14 },
    ],
    flame: ['#2a6ad6', '#8ad0ff', '#ffffff'],
    lights: [
      { x: 5.22, y: -2.5, color: '#ff4040' },
      { x: 15.4, y: 2.1, color: '#ff4040' },
      { x: 15.4, y: 3.9, color: '#50ff70' },
    ],
    mounts: [
      { x: 6.2, y: -1.55 },
      { x: 5.9, y: 7.15 },
    ],
    markings: [{ x: 6.08, y: 1.1, text: 'DK-07', color: '#d0d6e0' }],
  },

  // Frostbrecher: Eisfrachter mit Eisbrocken im Laderahmen, Tanks in Goldfolie und gepanzertem Brecherbug
  frostbrecher: {
    axisY: 3,
    ramps: {
      hull: ['#14171d', '#454b57', '#737b8a', '#a3abb8', '#cdd3dc', '#f4f6f9'],
      hull2: ['#0d1117', '#232a36', '#36404f', '#4d596b', '#6f7c90', '#a8b3c4'],
      accent: ['#2a1206', '#6a2e10', '#a24a1a', '#d4692a', '#ec9a5c', '#fbd0aa'],
      metal: METAL,
      glass: ['#1a2a36', '#3c5a6e', '#6a8ea6', '#9cbfd4', '#cfe4f0', '#f6fbff'],
      bone: BONE,
    },
    parts: [
      // Tanks in Goldfolie
      { mat: 'foil', mirror: true, pts: [[0.25, 0.3], [1.75, 0.3], [2.05, 0.7], [1.75, 1.15], [0.25, 1.15], [-0.05, 0.7]] },
      { mat: 'metal', mirror: true, pts: [[0.85, 0.25], [1.0, 0.25], [1.0, 1.2], [0.85, 1.2]] },
      // Laderahmen oben mit Eisbrocken und Spanngurten
      { mat: 'truss', pts: [[3.8, -0.45], [8.7, -0.45], [8.7, -0.2], [3.8, -0.2]] },
      { mat: 'glass', pts: [[4.0, -0.4], [4.2, -1.65], [5.0, -1.95], [5.65, -1.5], [5.55, -0.4]] },
      { mat: 'glass', pts: [[5.6, -0.4], [5.85, -1.3], [6.6, -1.5], [7.15, -1.05], [7.05, -0.4]] },
      { mat: 'glass', pts: [[7.1, -0.4], [7.35, -0.95], [8.0, -1.05], [8.5, -0.4]] },
      ...[4.75, 6.35, 7.75].map((x): HullPart => ({ mat: 'accent', pts: [[x, -2.0], [x + 0.13, -2.0], [x + 0.13, -0.35], [x, -0.35]] })),
      // Laderahmen unten
      { mat: 'truss', pts: [[6.4, 6.2], [9.3, 6.2], [9.3, 6.45], [6.4, 6.45]] },
      { mat: 'glass', pts: [[6.6, 6.25], [6.8, 7.2], [7.7, 7.35], [8.0, 6.25]] },
      { mat: 'glass', pts: [[8.0, 6.25], [8.2, 6.9], [8.9, 6.95], [9.15, 6.25]] },
      // Antriebsgehäuse und Düsen
      { mat: 'hull2', mirror: true, panels: true, pts: [[-1.7, 3], [-1.7, 1.75], [-1.2, 1.15], [0.4, 1.0], [0.7, 3]] },
      { mat: 'metal', mirror: true, pts: [[-1.6, 1.85], [-1.6, 2.65], [-2.5, 2.92], [-2.5, 1.58]] },
      // Rumpf
      {
        mat: 'hull',
        mirror: true,
        panels: true,
        pts: [[-0.35, 3], [-0.35, 1.72], [0.2, 1.5], [1.65, 1.45], [1.9, 0.62], [3.5, 0.5], [3.9, -0.38], [6.2, -0.38], [6.6, 0.55], [9.2, 0.6], [9.5, 1.5], [11.1, 1.65], [11.6, 2.1], [11.7, 3]],
      },
      // Brecherbug: gepanzerter Keil mit Warnstreifen
      { mat: 'hull2', mirror: true, panels: true, pts: [[10.9, 1.45], [12.0, 1.65], [13.9, 3], [11.3, 3]] },
      { mat: 'hazard', mirror: true, pts: [[12.05, 1.72], [12.4, 1.95], [13.85, 2.98], [13.4, 2.98]] },
      // Zierband und Lagedüsen
      { mat: 'accent', mirror: true, pts: [[3.45, -0.55], [3.85, -0.55], [3.85, 0.75], [3.45, 0.75]] },
      { mat: 'metal', mirror: true, pts: [[9.0, 0.3], [9.4, 0.3], [9.4, 0.58], [9.0, 0.58]] },
    ],
    deco: { 1: 'bunks', 2: 'crates', 5: 'corridor', 6: 'consoles', 7: 'medbay', 8: 'cockpit' },
    engines: [
      { x: -2.5, y: 2.25, size: 15 },
      { x: -2.5, y: 3.75, size: 15 },
    ],
    flame: ['#3a7ad6', '#a6d8ff', '#ffffff'],
    lights: [
      { x: 13.8, y: 3, color: '#ffffff' },
      { x: 1.0, y: 0.3, color: '#ff4040' },
      { x: 1.0, y: 5.7, color: '#50ff70' },
    ],
    mounts: [
      { x: 10.2, y: 1.6 },
      { x: 10.2, y: 4.4 },
    ],
    markings: [{ x: 6.08, y: 1.1, text: 'FB-12', color: '#3a4150' }],
  },

  // Sonnenwind: Forschungsschiff mit Magnetring-Antrieb, Gitterrückgrat und Schichtschild am Bug
  sonnenwind: {
    axisY: 3,
    ramps: {
      hull: ['#15181e', '#484e5a', '#788090', '#a8afbc', '#d2d7df', '#f5f7fa'],
      hull2: ['#0c1018', '#1e2634', '#2e394c', '#425068', '#62728e', '#9aa8c0'],
      accent: ['#1e0e06', '#552a12', '#8a4a22', '#b86e38', '#d99a64', '#f4cfa8'],
      metal: METAL,
      glass: ['#06141c', '#0e2c3c', '#1a4c64', '#2c7090', '#6aa8c4', '#d0ecf6'],
      bone: BONE,
      energy: ['#16305a', '#2a5ca6', '#4a8ee0', '#8ec4ff', '#d4eaff', '#ffffff'],
    },
    parts: [
      // Hintere Hälfte des Magnetrings (Kupferwicklung)
      { mat: 'accent', stripes: true, pts: [...ellipse(-1.5, 3, 0.85, 4.6, Math.PI / 2, Math.PI * 1.5, 24), ...ellipse(-1.5, 3, 0.55, 4.05, Math.PI * 1.5, Math.PI / 2, 24)] },
      { mat: 'energy', pts: [...ellipse(-1.5, 3, 0.57, 4.08, Math.PI / 2, Math.PI * 1.5, 24), ...ellipse(-1.5, 3, 0.51, 3.98, Math.PI * 1.5, Math.PI / 2, 24)] },
      // Gitterrückgrat durch den Ring, Düse am Ende
      { mat: 'truss', pts: [[-3.0, 2.55], [0.2, 2.55], [0.2, 3.45], [-3.0, 3.45]] },
      { mat: 'metal', pts: [[-2.95, 2.7], [-2.95, 3.3], [-3.6, 3.5], [-3.6, 2.5]] },
      // Streben zwischen Ring und Rumpf
      { mat: 'truss', mirror: true, pts: [[-1.35, 0.6], [0.5, 1.35], [0.5, 1.75], [-1.35, 1.0]] },
      // Treibstofftanks in Goldfolie
      { mat: 'foil', mirror: true, pts: [[0.25, 0.75], [1.75, 0.75], [1.95, 1.1], [1.75, 1.48], [0.25, 1.48], [0.05, 1.1]] },
      // Radarschüssel oben
      { mat: 'metal', pts: [[7.65, -0.4], [7.85, -0.4], [7.85, -1.2], [7.65, -1.2]] },
      { mat: 'hull', pts: [...ellipse(7.75, -1.55, 1.0, 0.5, 0, Math.PI, 14), ...ellipse(7.75, -1.55, 0.85, 0.15, Math.PI, 0, 8)] },
      { mat: 'metal', pts: [[7.7, -1.5], [7.8, -1.5], [7.8, -2.15], [7.7, -2.15]] },
      // Rumpf
      {
        mat: 'hull',
        mirror: true,
        panels: true,
        pts: [[-0.35, 3], [-0.35, 1.72], [0.2, 1.5], [1.65, 1.5], [1.78, 0.62], [3.55, 0.55], [3.75, -0.38], [6.35, -0.38], [6.55, 0.6], [9.2, 0.62], [9.45, 1.55], [11.0, 1.62], [11.0, 3]],
      },
      // Schichtschild am Bug: drei Platten mit Abstand, dazu ein Sensorausleger
      { mat: 'metal', pts: [[11.0, 2.9], [13.9, 2.9], [13.9, 3.1], [11.0, 3.1]] },
      { mat: 'hull2', panels: true, pts: [[11.15, 1.2], [11.45, 1.05], [11.45, 4.95], [11.15, 4.8]] },
      { mat: 'hull2', panels: true, pts: [[11.8, 1.5], [12.05, 1.4], [12.05, 4.6], [11.8, 4.5]] },
      { mat: 'foil', pts: [[12.4, 1.85], [12.6, 1.8], [12.6, 4.2], [12.4, 4.15]] },
      { mat: 'glass', pts: ellipse(13.95, 3, 0.22, 0.22, 0, Math.PI * 2, 10) },
      // Vordere Hälfte des Magnetrings
      { mat: 'accent', stripes: true, pts: [...ellipse(-1.5, 3, 0.85, 4.6, -Math.PI / 2, Math.PI / 2, 24), ...ellipse(-1.5, 3, 0.55, 4.05, Math.PI / 2, -Math.PI / 2, 24)] },
      { mat: 'energy', pts: [...ellipse(-1.5, 3, 0.57, 4.08, -Math.PI / 2, Math.PI / 2, 24), ...ellipse(-1.5, 3, 0.51, 3.98, Math.PI / 2, -Math.PI / 2, 24)] },
      // Halteklammern am Ring
      ...[-1.0, 7.0].map((y): HullPart => ({ mat: 'metal', pts: [[-2.0, y - 0.15], [-0.95, y - 0.15], [-0.95, y + 0.15], [-2.0, y + 0.15]] })),
    ],
    deco: { 1: 'bunks', 2: 'crates', 5: 'corridor', 6: 'consoles', 7: 'medbay', 8: 'cockpit' },
    engines: [{ x: -3.6, y: 3, size: 13 }],
    flame: ['#2a5ca6', '#8ec4ff', '#ffffff'],
    lights: [
      { x: 7.75, y: -2.15, color: '#ff4040' },
      { x: -1.5, y: -1.6, color: '#ffffff' },
      { x: -1.5, y: 7.6, color: '#ffffff' },
    ],
    mounts: [
      { x: 8.1, y: 0.6 },
      { x: 8.1, y: 5.4 },
    ],
    markings: [{ x: 6.08, y: 1.1, text: 'SW-04', color: '#3a4150' }],
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