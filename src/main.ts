// Einstiegspunkt: verbindet Homebase, Durchlauf, Kampf, Darstellung und Eingabe.
import '@fontsource/vt323/400.css';
import './style.css';
import type { ModuleId } from './data/modules';
import { applyPlayerDesign, type DesignId, PLAYER_DESIGNS, SHIPS } from './data/ships';
import { buyModule, loadoutFromProfile, type Profile } from './meta/profile';
import { exportProfile, importProfile, loadProfile, saveProfile } from './meta/storage';
import { applyCommand, createBattle, DT, step } from './sim/battle';
import {
  battleLoadout,
  battleSeed,
  chooseReward,
  payout,
  resolveBattle,
  REWARDS,
  type RewardId,
  type RunState,
  STAGES,
  startRun,
} from './sim/run';
import type { BattleState, Command, SystemId } from './sim/types';
import { roomAt, roomCenter, VIEW_H, VIEW_W } from './render/layout';
import { projectilePos, Renderer } from './render/renderer';
import { StationRenderer } from './render/station';
import { type Dialog, Hud, renderBaseHud, renderBattleHud } from './ui/hud';

const stage = document.getElementById('stage') as HTMLDivElement;
const canvas = document.getElementById('view') as HTMLCanvasElement;
const hudRoot = document.getElementById('hud') as HTMLDivElement;
const floatRoot = document.getElementById('floats') as HTMLDivElement;

let profile: Profile = loadProfile();
applyPlayerDesign(profile.design);
let screen: 'base' | 'battle' = 'base';
let run: RunState | null = null;
let state: BattleState | null = null;
let renderer: Renderer | null = null;
const station = new StationRenderer(canvas);

let paused = true;
let selectedWeapon: number | null = null;
let hoverRoom: number | null = null;
let message: string | null = null;
let messageUntil = 0;
/** Zeitpunkt, ab dem nach Kampfende das Ergebnisfenster erscheint. */
let dialogAt: number | null = null;
let accumulator = 0;
let scale = 1;
let pixelScale = 1;

function say(text: string): void {
  message = text;
  messageUntil = performance.now() + 1800;
}

function startBattle(): void {
  if (!run) return;
  state = createBattle(battleSeed(run), battleLoadout(run), STAGES[run.stage]);
  renderer = new Renderer(canvas, state);
  screen = 'battle';
  paused = true;
  selectedWeapon = null;
  hoverRoom = null;
  dialogAt = null;
  accumulator = 0;
}

function beginRun(): void {
  const { loadout, healAfterWin } = loadoutFromProfile(profile);
  run = startRun(Date.now() & 0x7fffffff, loadout, healAfterWin);
  profile.runs++;
  saveProfile(profile);
  startBattle();
}

function toBase(): void {
  run = null;
  state = null;
  renderer = null;
  screen = 'base';
}

function command(cmd: Command): boolean {
  if (!state || state.outcome !== 'ongoing') return false;
  return applyCommand(state, 'player', cmd);
}

function selectWeapon(index: number): void {
  if (!state || state.outcome !== 'ongoing') return;
  const weapon = state.player.weapons[index];
  if (!weapon) return;
  if (!weapon.powered && !command({ type: 'toggleWeapon', index })) {
    say('Nicht genug Energie für diese Waffe');
    return;
  }
  selectedWeapon = selectedWeapon === index ? null : index;
}

const hud = new Hud(hudRoot, floatRoot, (act, data, secondary) => {
  switch (act) {
    case 'power':
      if (!command({ type: 'setPower', system: data.sys as SystemId, delta: secondary ? -1 : 1 }) && !secondary) {
        say('Nicht genug Energie');
      }
      break;
    case 'weapon': {
      const index = Number(data.index);
      if (secondary) {
        if (state?.player.weapons[index]?.powered) command({ type: 'toggleWeapon', index });
        if (selectedWeapon === index) selectedWeapon = null;
      } else {
        selectWeapon(index);
      }
      break;
    }
    case 'reward':
      if (run && !secondary) {
        chooseReward(run, data.id as RewardId);
        startBattle();
      }
      break;
    case 'home':
      if (!secondary) toBase();
      break;
    case 'buy':
      if (secondary) break;
      if (buyModule(profile, data.id as ModuleId)) saveProfile(profile);
      else say('Nicht genug Kristalle');
      break;
    case 'design':
      if (secondary) break;
      {
        // Zum nächsten Entwurf weiterschalten
        const index = PLAYER_DESIGNS.findIndex((d) => d.id === profile.design);
        profile.design = PLAYER_DESIGNS[(index + 1) % PLAYER_DESIGNS.length].id as DesignId;
      }
      applyPlayerDesign(profile.design);
      saveProfile(profile);
      break;
    case 'start':
      if (!secondary) beginRun();
      break;
    case 'export':
      if (!secondary) exportProfile(profile);
      break;
    case 'import':
      if (secondary) break;
      void importProfile().then((loaded) => {
        if (loaded) {
          profile = loaded;
          applyPlayerDesign(profile.design);
          saveProfile(profile);
          say('Spielstand geladen');
        } else {
          say('Diese Datei ist kein gültiger Spielstand');
        }
      });
      break;
  }
});

// Bildschirmgröße: Das Spielbild füllt das Fenster. Gezeichnet wird in einem ganzzahligen
// Vielfachen der Spielauflösung, damit die Pixel auch bei krummen Fenstergrößen sauber bleiben.
function resize(): void {
  scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  stage.style.transform = `scale(${scale})`;
  stage.style.left = `${Math.max(0, Math.floor((window.innerWidth - VIEW_W * scale) / 2))}px`;
  stage.style.top = `${Math.max(0, Math.floor((window.innerHeight - VIEW_H * scale) / 2))}px`;
  const exact = scale * window.devicePixelRatio;
  pixelScale = Math.max(1, Math.min(6, Math.ceil(exact - 0.01)));
  canvas.width = VIEW_W * pixelScale;
  canvas.height = VIEW_H * pixelScale;
  canvas.style.imageRendering = Math.abs(exact - pixelScale) < 0.01 ? 'pixelated' : 'auto';
}
window.addEventListener('resize', resize);

function toView(ev: PointerEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return { x: (ev.clientX - rect.left) / scale, y: (ev.clientY - rect.top) / scale };
}

canvas.addEventListener('pointermove', (ev) => {
  if (!state) return;
  const p = toView(ev);
  hoverRoom = roomAt('enemy', SHIPS[state.enemy.defId], p.x, p.y)?.id ?? null;
});
canvas.addEventListener('pointerleave', () => (hoverRoom = null));
canvas.addEventListener('pointerdown', (ev) => {
  if (ev.button === 2) {
    selectedWeapon = null;
    return;
  }
  if (!state || selectedWeapon === null) return;
  const p = toView(ev);
  const room = roomAt('enemy', SHIPS[state.enemy.defId], p.x, p.y);
  if (room) {
    command({ type: 'setTarget', index: selectedWeapon, room: room.id });
    selectedWeapon = null;
  }
});
stage.addEventListener('contextmenu', (ev) => ev.preventDefault());

window.addEventListener('keydown', (ev) => {
  if (screen !== 'battle' || !state) return;
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
  if (!state || !renderer || !run) return;
  renderer.handleEvents(state.events, state);
  for (const ev of state.events) {
    if (ev.type === 'miss') {
      const p = projectilePos(state, ev.proj);
      hud.floatText(p.x, p.y - 12, 'verfehlt', 'miss');
    } else if (ev.type === 'hit') {
      const c = roomCenter(ev.target, SHIPS[state[ev.target].defId], ev.room);
      hud.floatText(c.x, c.y - 16, `-${ev.damage}`, ev.target === 'player' ? 'bad' : 'good');
    } else if (ev.type === 'destroyed') {
      // Ergebnis sofort verbuchen, damit nichts verloren geht, falls das Fenster geschlossen wird
      resolveBattle(run, state);
      if (run.status === 'won' || run.status === 'lost') {
        profile.crystals += payout(run);
        if (run.status === 'won') profile.wins++;
        saveProfile(profile);
      }
      dialogAt = performance.now() + 1700;
    }
  }
}

/** Fenster nach einem Kampf: Belohnung wählen oder Abschluss des Durchlaufs. */
function battleDialog(): Dialog | null {
  if (!run || !state) return null;
  const enemy = SHIPS[state.enemy.defId].name;
  if (run.status === 'reward') {
    return {
      title: 'SIEG',
      cls: 'ok',
      lines: [`${enemy} zerstört · +${run.lastReward} Kristalle`, 'Wähle eine Belohnung:'],
      buttons: (Object.keys(REWARDS) as RewardId[]).map((id) => ({
        label: `${REWARDS[id].name}<br><span class="dim">${REWARDS[id].text}</span>`,
        act: 'reward',
        id,
      })),
    };
  }
  if (run.status === 'won') {
    return {
      title: 'DURCHLAUF GESCHAFFT',
      cls: 'hot',
      lines: [`Alle ${STAGES.length} Gegner besiegt.`, `Du bringst ${payout(run)} Kristalle nach Hause.`],
      buttons: [{ label: 'Zur Heimatbasis', act: 'home' }],
    };
  }
  if (run.status === 'lost') {
    return {
      title: 'NIEDERLAGE',
      cls: 'warn',
      lines: [
        `Dein Schiff wurde in Kampf ${run.stage + 1} zerstört.`,
        `Du behältst ${payout(run)} von ${run.crystals} Kristallen.`,
      ],
      buttons: [{ label: 'Zur Heimatbasis', act: 'home' }],
    };
  }
  return null;
}

let lastTime = performance.now();
function frame(now: number): void {
  const dtReal = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  if (message && now > messageUntil) message = null;

  if (screen === 'battle' && state && renderer && run) {
    if (!paused && state.outcome === 'ongoing') {
      accumulator += dtReal;
      while (accumulator >= DT && state.outcome === 'ongoing') {
        step(state);
        handleEvents();
        accumulator -= DT;
      }
    }
    const alpha = state.outcome === 'ongoing' ? accumulator / DT : 0;
    renderer.scale = pixelScale;
    renderer.draw(state, alpha, { selectedWeapon, hoverRoom }, paused && state.outcome === 'ongoing' ? 0 : dtReal);
    hud.set(
      renderBattleHud(state, {
        paused,
        selectedWeapon,
        message,
        runLine: `Kampf ${run.stage + 1}/${STAGES.length} · ${run.crystals} Kristalle`,
        dialog: dialogAt !== null && now >= dialogAt ? battleDialog() : null,
      }),
    );
  } else {
    station.scale = pixelScale;
    station.draw(profile, dtReal);
    hud.set(renderBaseHud(profile, message));
  }
  stage.classList.toggle('targeting', screen === 'battle' && selectedWeapon !== null);
  requestAnimationFrame(frame);
}

resize();
requestAnimationFrame(frame);

// Für automatische Tests und Fehlersuche im Browser
Object.assign(window, {
  __game: {
    get state() {
      return state;
    },
    get run() {
      return run;
    },
    get profile() {
      return profile;
    },
    get screen() {
      return screen;
    },
  },
});
