// Einstiegspunkt: verbindet Simulation, Darstellung und Eingabe.
import '@fontsource/vt323/400.css';
import './style.css';
import { SHIPS } from './data/ships';
import { applyCommand, createBattle, DT, step } from './sim/battle';
import type { BattleState, Command } from './sim/types';
import { roomAt, roomCenter, VIEW_H, VIEW_W } from './render/layout';
import { projectilePos, Renderer } from './render/renderer';
import { Hud } from './ui/hud';

const stage = document.getElementById('stage') as HTMLDivElement;
const canvas = document.getElementById('view') as HTMLCanvasElement;
const hudRoot = document.getElementById('hud') as HTMLDivElement;
const floatRoot = document.getElementById('floats') as HTMLDivElement;

let state: BattleState;
let renderer: Renderer;
let paused = true;
let selectedWeapon: number | null = null;
let hoverRoom: number | null = null;
let message: string | null = null;
let messageUntil = 0;
let outcomeAt: number | null = null;
let accumulator = 0;
let scale = 1;

function newBattle(): void {
  state = createBattle(Date.now() & 0x7fffffff, 'eisvogel', 'schrotthai');
  renderer = new Renderer(canvas, state);
  renderer.scale = canvas.width / VIEW_W;
  paused = true;
  selectedWeapon = null;
  hoverRoom = null;
  outcomeAt = null;
  accumulator = 0;
}

function command(cmd: Command): boolean {
  if (state.outcome !== 'ongoing') return false;
  return applyCommand(state, 'player', cmd);
}

function say(text: string): void {
  message = text;
  messageUntil = performance.now() + 1600;
}

function selectWeapon(index: number): void {
  const weapon = state.player.weapons[index];
  if (!weapon || state.outcome !== 'ongoing') return;
  if (!weapon.powered && !command({ type: 'toggleWeapon', index })) {
    say('Nicht genug Energie für diese Waffe');
    return;
  }
  selectedWeapon = selectedWeapon === index ? null : index;
}

const hud = new Hud(hudRoot, floatRoot, {
  power(system, delta) {
    if (!command({ type: 'setPower', system, delta }) && delta > 0) say('Nicht genug Energie');
  },
  weapon(index, secondary) {
    if (secondary) {
      if (state.player.weapons[index]?.powered) command({ type: 'toggleWeapon', index });
      if (selectedWeapon === index) selectedWeapon = null;
    } else {
      selectWeapon(index);
    }
  },
  restart: newBattle,
});

// Bildschirmgröße: Das Spielbild füllt das Fenster. Gezeichnet wird in einem ganzzahligen
// Vielfachen der Spielauflösung, damit die Pixel auch bei krummen Fenstergrößen sauber bleiben.
function resize(): void {
  scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  stage.style.transform = `scale(${scale})`;
  stage.style.left = `${Math.max(0, Math.floor((window.innerWidth - VIEW_W * scale) / 2))}px`;
  stage.style.top = `${Math.max(0, Math.floor((window.innerHeight - VIEW_H * scale) / 2))}px`;
  const exact = scale * window.devicePixelRatio;
  const pixelScale = Math.max(1, Math.min(6, Math.ceil(exact - 0.01)));
  canvas.width = VIEW_W * pixelScale;
  canvas.height = VIEW_H * pixelScale;
  canvas.style.imageRendering = Math.abs(exact - pixelScale) < 0.01 ? 'pixelated' : 'auto';
  renderer.scale = pixelScale;
}
window.addEventListener('resize', resize);

function toView(ev: PointerEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return { x: (ev.clientX - rect.left) / scale, y: (ev.clientY - rect.top) / scale };
}

canvas.addEventListener('pointermove', (ev) => {
  const p = toView(ev);
  hoverRoom = roomAt('enemy', SHIPS[state.enemy.defId], p.x, p.y)?.id ?? null;
});
canvas.addEventListener('pointerleave', () => (hoverRoom = null));
canvas.addEventListener('pointerdown', (ev) => {
  if (ev.button === 2) {
    selectedWeapon = null;
    return;
  }
  if (selectedWeapon === null) return;
  const p = toView(ev);
  const room = roomAt('enemy', SHIPS[state.enemy.defId], p.x, p.y);
  if (room) {
    command({ type: 'setTarget', index: selectedWeapon, room: room.id });
    selectedWeapon = null;
  }
});
stage.addEventListener('contextmenu', (ev) => ev.preventDefault());

window.addEventListener('keydown', (ev) => {
  if (ev.code === 'Space') {
    ev.preventDefault();
    if (state.outcome === 'ongoing') paused = !paused;
  } else if (ev.code === 'Escape') {
    selectedWeapon = null;
  } else if (/^Digit[1-9]$/.test(ev.code)) {
    selectWeapon(Number(ev.code.slice(5)) - 1);
  }
});

function handleEvents(): void {
  renderer.handleEvents(state.events, state);
  for (const ev of state.events) {
    if (ev.type === 'miss') {
      const p = projectilePos(state, ev.proj);
      hud.floatText(p.x, p.y - 12, 'verfehlt', 'miss');
    } else if (ev.type === 'hit') {
      const c = roomCenter(ev.target, SHIPS[state[ev.target].defId], ev.room);
      hud.floatText(c.x, c.y - 16, `-${ev.damage}`, ev.target === 'player' ? 'bad' : 'good');
    } else if (ev.type === 'destroyed') {
      outcomeAt = performance.now() + 1700;
    }
  }
}

let lastTime = performance.now();
function frame(now: number): void {
  const dtReal = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  if (!paused && state.outcome === 'ongoing') {
    accumulator += dtReal;
    while (accumulator >= DT && state.outcome === 'ongoing') {
      step(state);
      handleEvents();
      accumulator -= DT;
    }
  }
  if (message && now > messageUntil) message = null;

  const alpha = state.outcome === 'ongoing' ? accumulator / DT : 0;
  renderer.draw(state, alpha, { selectedWeapon, hoverRoom }, dtReal);
  hud.update(state, {
    paused,
    selectedWeapon,
    message,
    showOutcome: outcomeAt !== null && now >= outcomeAt,
  });
  stage.classList.toggle('targeting', selectedWeapon !== null);
  requestAnimationFrame(frame);
}

newBattle();
resize();
requestAnimationFrame(frame);

// Für automatische Tests und Fehlersuche im Browser
Object.assign(window, {
  __game: {
    get state() {
      return state;
    },
    get paused() {
      return paused;
    },
  },
});
