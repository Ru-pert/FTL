// Bedienoberfläche als HTML über dem Spielbild: Anzeigen, Energieverteilung, Waffen, Dialoge.
import { MODULES } from '../data/modules';
import { SHIPS } from '../data/ships';
import { WEAPONS } from '../data/weapons';
import { loadoutFromProfile, nextCost, type Profile } from '../meta/profile';
import { capacity, evasion, freePower, repairTarget } from '../sim/battle';
import type { BattleState, ShipState, Side, SystemId } from '../sim/types';
import { WEAPON_COLORS } from '../render/renderer';

export interface Dialog {
  title: string;
  /** Farbklasse des Titels: ok, warn oder hot. */
  cls: string;
  lines: string[];
  buttons: { label: string; act: string; id?: string }[];
}

export interface HudView {
  paused: boolean;
  selectedWeapon: number | null;
  message: string | null;
  /** Zeile oben in der Mitte, z. B. "Kampf 2/5". */
  runLine: string;
  dialog: Dialog | null;
}

const SYSTEM_NAMES: Record<SystemId, string> = {
  shields: 'Schilde',
  weapons: 'Waffen',
  engines: 'Antrieb',
};

function pips(count: number, cls: (i: number) => string): string {
  let html = '';
  for (let i = 0; i < count; i++) html += `<i class="pip ${cls(i)}"></i>`;
  return html;
}

function shipInfo(ship: ShipState, side: Side): string {
  const def = SHIPS[ship.defId];
  const pct = Math.round((ship.hull / ship.maxHull) * 100);
  const hullCls = pct <= 30 ? 'low' : pct <= 60 ? 'mid' : '';
  const maxLayers = Math.floor(ship.systems.shields.level / 2);
  const shield = maxLayers
    ? `<span class="pips">${pips(maxLayers, (i) => (i < ship.shieldLayers ? 'shield' : 'off'))}</span>`
    : '<span class="dim">keiner</span>';
  return `<div class="shipinfo ${side}">
    <div class="name">${def.name}</div>
    <div class="row"><span class="lbl">Hülle</span><div class="bar ${hullCls}"><i style="width:${pct}%"></i></div><span class="num">${ship.hull}/${ship.maxHull}</span></div>
    <div class="row"><span class="lbl">Schild</span>${shield}<span class="dim">Ausweichen ${Math.round(evasion(ship) * 100)}%</span></div>
  </div>`;
}

function systemWidget(ship: ShipState, id: SystemId): string {
  const sys = ship.systems[id];
  const cap = capacity(sys);
  const repairing = repairTarget(ship) === id;
  const clickable = id !== 'weapons';
  return `<div class="sys ${clickable ? 'click' : ''}" data-act="power" data-sys="${id}">
    <div class="sysname">${SYSTEM_NAMES[id]}</div>
    <div class="pips">${pips(sys.level, (i) => (i < sys.power ? 'on' : i < cap ? 'off' : 'dmg'))}</div>
    ${repairing ? `<div class="bar rep"><i style="width:${Math.round(sys.repair * 100)}%"></i></div>` : `<div class="hint">${clickable ? '+ / −' : 'per Waffe'}</div>`}
  </div>`;
}

function weaponCard(state: BattleState, index: number, selected: boolean): string {
  const ship = state.player;
  const weapon = ship.weapons[index];
  const def = WEAPONS[weapon.defId];
  const color = WEAPON_COLORS[index % WEAPON_COLORS.length];
  const pct = Math.round((weapon.charge / def.chargeTime) * 100);
  const noAmmo = def.usesTorpedo && ship.torpedoes <= 0;
  let status: string;
  let statusCls = 'dim';
  if (!weapon.powered) status = 'aus';
  else if (noAmmo) [status, statusCls] = ['keine Torpedos', 'warn'];
  else if (selected) [status, statusCls] = ['Ziel wählen …', 'hot'];
  else if (weapon.target === null) [status, statusCls] = ['kein Ziel', 'warn'];
  else if (pct >= 100) [status, statusCls] = ['feuert', 'ok'];
  else status = 'lädt';
  const ammo = def.usesTorpedo ? ` <span class="dim">×${ship.torpedoes}</span>` : '';
  return `<div class="weapon click ${weapon.powered ? 'powered' : ''} ${selected ? 'selected' : ''}" data-act="weapon" data-index="${index}">
    <div class="wname"><i class="swatch" style="background:${color}"></i><span class="key">${index + 1}</span> ${def.name}${ammo}</div>
    <div class="bar charge"><i style="width:${weapon.powered ? pct : 0}%"></i></div>
    <div class="wfoot"><span class="${statusCls}">${status}</span><span class="pips">${pips(def.power, () => (weapon.powered ? 'on' : 'off'))}</span></div>
  </div>`;
}

function dialogHtml(dialog: Dialog): string {
  return `<div class="overlay"><div class="dialog">
    <div class="title ${dialog.cls}">${dialog.title}</div>
    ${dialog.lines.map((line) => `<div>${line}</div>`).join('')}
    <div class="buttons">${dialog.buttons
      .map((b) => `<div class="button click" data-act="${b.act}" data-id="${b.id ?? ''}">${b.label}</div>`)
      .join('')}</div>
  </div></div>`;
}

export function renderBattleHud(state: BattleState, view: HudView): string {
  const ship = state.player;
  const free = freePower(ship);
  let html = shipInfo(state.player, 'player') + shipInfo(state.enemy, 'enemy');

  html += `<div class="bottom">
    <div class="reactor">
      <div class="sysname">Reaktor</div>
      <div class="pips">${pips(ship.reactor, (i) => (i < free ? 'free' : 'used'))}</div>
      <div class="hint">frei: ${free}</div>
    </div>
    <div class="systems">${systemWidget(ship, 'shields')}${systemWidget(ship, 'weapons')}${systemWidget(ship, 'engines')}</div>
    <div class="weapons">${ship.weapons.map((_, i) => weaponCard(state, i, view.selectedWeapon === i)).join('')}</div>
  </div>`;

  if (view.message) html += `<div class="message">${view.message}</div>`;

  if (view.dialog) {
    html += dialogHtml(view.dialog);
  } else if (view.paused && state.outcome === 'ongoing') {
    html += `<div class="pause">
      <div class="dim">${view.runLine}</div>
      <div><span class="hot">PAUSE</span> · <b>Leertaste</b>: weiter</div>
      <div><b>Waffe</b> anklicken oder Taste 1, 2</div>
      <div>dann <b>Raum beim Gegner</b> anklicken</div>
      <div>Energie: <b>Links-</b> und <b>Rechtsklick</b></div>
    </div>`;
  } else {
    html += `<div class="runline">${view.runLine}</div>`;
  }
  return html;
}

export function renderBaseHud(profile: Profile, message: string | null): string {
  const { loadout } = loadoutFromProfile(profile);
  const modules = MODULES.map((def) => {
    const level = profile.modules[def.id];
    const cost = nextCost(profile, def.id);
    const affordable = cost !== null && profile.crystals >= cost;
    const action =
      cost === null
        ? '<div class="modfull ok">voll ausgebaut</div>'
        : `<div class="button click ${affordable ? '' : 'disabled'}" data-act="buy" data-id="${def.id}">Ausbauen · ${cost} Kristalle</div>`;
    return `<div class="mod">
      <div class="modhead"><span>${def.name}</span><span class="pips">${pips(def.costs.length, (i) => (i < level ? 'on' : 'off'))}</span></div>
      <div class="dim">${cost === null ? def.effects[level - 1] : `Stufe ${level + 1}: ${def.effects[level]}`}</div>
      ${action}
    </div>`;
  }).join('');

  return `<div class="base">
    <div class="basetitle">
      <div class="title hot">HEIMATBASIS</div>
      <div class="crystals"><i class="gem"></i>${profile.crystals} Kristalle</div>
      <div class="dim">Durchläufe: ${profile.runs} · geschafft: ${profile.wins}</div>
    </div>
    <div class="modules">${modules}</div>
    <div class="basefoot">
      <div class="dim">Start mit ${loadout.maxHull} Hülle · ${loadout.reactor} Energie · ${loadout.torpedoes} Torpedos</div>
      <div class="footrow">
        <div class="button big click" data-act="start">Durchlauf starten</div>
        <span class="dim">Spielstand:</span>
        <div class="button click" data-act="export">sichern</div>
        <div class="button click" data-act="import">laden</div>
      </div>
    </div>
    ${message ? `<div class="message basemsg">${message}</div>` : ''}
  </div>`;
}

/** Hängt die Oberfläche ein. Klicks werden mit Aktionsname und Daten weitergereicht. */
export class Hud {
  private last = '';

  constructor(
    private root: HTMLElement,
    private floats: HTMLElement,
    onAction: (act: string, data: DOMStringMap, secondary: boolean) => void,
  ) {
    // pointerdown statt click: Die Oberfläche wird laufend neu aufgebaut.
    root.addEventListener('pointerdown', (ev) => {
      const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
      if (!el) return;
      ev.preventDefault();
      ev.stopPropagation();
      onAction(el.dataset.act!, el.dataset, ev.button === 2);
    });
  }

  set(html: string): void {
    if (html !== this.last) {
      this.root.innerHTML = html;
      this.last = html;
    }
  }

  /** Kurzer aufsteigender Text im Spielfeld, z. B. Schadenszahlen. */
  floatText(x: number, y: number, text: string, cls: string): void {
    const el = document.createElement('div');
    el.className = `float ${cls}`;
    el.textContent = text;
    el.style.left = `${Math.round(x)}px`;
    el.style.top = `${Math.round(y)}px`;
    this.floats.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }
}
