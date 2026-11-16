import { describe, expect, it } from 'vitest';
import {
  applyCommand,
  createBattle,
  freePower,
  maxShieldLayers,
  step,
  TICK_RATE,
} from './battle';
import type { BattleState } from './types';

function run(state: BattleState, seconds: number): void {
  for (let i = 0; i < seconds * TICK_RATE && state.outcome === 'ongoing'; i++) step(state);
}

function newBattle(seed = 1): BattleState {
  return createBattle(seed, 'eisvogel', 'schrotthai');
}

describe('Energieverteilung', () => {
  it('startet mit sinnvoller Verteilung und vollen Schilden', () => {
    const s = newBattle();
    expect(s.player.systems.weapons.power).toBe(3);
    expect(s.player.systems.shields.power).toBe(2);
    expect(s.player.systems.engines.power).toBe(1);
    expect(freePower(s.player)).toBe(0);
    expect(s.player.shieldLayers).toBe(1);
  });

  it('gibt nie mehr Energie aus, als der Reaktor liefert', () => {
    const s = newBattle();
    expect(applyCommand(s, 'player', { type: 'setPower', system: 'engines', delta: 1 })).toBe(false);
    applyCommand(s, 'player', { type: 'setPower', system: 'shields', delta: -1 });
    expect(freePower(s.player)).toBe(2);
    expect(applyCommand(s, 'player', { type: 'setPower', system: 'engines', delta: 1 })).toBe(true);
    // Triebwerke haben nur Stufe 2
    expect(applyCommand(s, 'player', { type: 'setPower', system: 'engines', delta: 1 })).toBe(false);
  });

  it('eine abgeschaltete Waffe verliert ihre Ladung', () => {
    const s = newBattle();
    run(s, 3);
    expect(s.player.weapons[0].charge).toBeGreaterThan(2);
    applyCommand(s, 'player', { type: 'toggleWeapon', index: 0 });
    expect(s.player.weapons[0].charge).toBe(0);
    expect(s.player.systems.weapons.power).toBe(1);
  });
});

describe('Kampf', () => {
  it('Laser werden vom Schild abgefangen, Torpedos nicht', () => {
    const s = newBattle();
    // Gegner wehrlos machen, damit nur unsere Schüsse zählen
    s.enemy.weapons.forEach((w) => (w.powered = false));
    s.enemy.systems.weapons.power = 0;
    s.enemy.systems.weapons.level = 0;
    s.enemy.systems.engines.level = 0;
    s.enemy.systems.engines.power = 0;

    applyCommand(s, 'player', { type: 'setTarget', index: 1, room: 1 });
    run(s, 17);
    expect(s.enemy.hull).toBe(12); // Torpedo: 2 Schaden trotz Schild
    expect(s.player.torpedoes).toBe(5);
  });

  it('Treffer auf einen Systemraum beschädigen das System und nehmen ihm Energie', () => {
    const s = newBattle();
    s.enemy.systems.engines.level = 0;
    s.enemy.systems.engines.power = 0;
    const shieldRoom = 4;
    applyCommand(s, 'player', { type: 'setTarget', index: 1, room: shieldRoom });
    run(s, 17);
    expect(s.enemy.systems.shields.damage).toBeGreaterThan(0);
    expect(maxShieldLayers(s.enemy)).toBe(0);
  });

  it('beschädigte Systeme reparieren sich mit der Zeit', () => {
    const s = newBattle();
    s.player.systems.engines.damage = 1;
    s.enemy.weapons.forEach((w) => (w.powered = false));
    s.enemy.systems.weapons.level = 0;
    s.enemy.systems.weapons.power = 0;
    run(s, 20);
    expect(s.player.systems.engines.damage).toBe(0);
  });

  it('endet mit Sieg, wenn die gegnerische Hülle auf null fällt', () => {
    const s = newBattle();
    s.enemy.hull = 1;
    s.enemy.systems.shields.level = 0;
    s.enemy.systems.shields.power = 0;
    s.enemy.shieldLayers = 0;
    s.enemy.systems.engines.level = 0;
    s.enemy.systems.engines.power = 0;
    applyCommand(s, 'player', { type: 'setTarget', index: 0, room: 1 });
    run(s, 20);
    expect(s.outcome).toBe('victory');
  });

  it('verläuft bei gleichem Startwert immer gleich', () => {
    const play = (seed: number) => {
      const s = newBattle(seed);
      applyCommand(s, 'player', { type: 'setTarget', index: 0, room: 4 });
      applyCommand(s, 'player', { type: 'setTarget', index: 1, room: 3 });
      run(s, 120);
      return JSON.stringify(s);
    };
    expect(play(42)).toBe(play(42));
    expect(play(42)).not.toBe(play(43));
  });
});
