import { describe, expect, it } from 'vitest';
import { buyModule, loadoutFromProfile, newProfile, parseProfile } from '../meta/profile';
import { createBattle, step, TICK_RATE } from './battle';
import { battleLoadout, battleSeed, chooseReward, payout, resolveBattle, STAGES, startRun } from './run';

function begin(profile = newProfile()) {
  const { loadout, healAfterWin } = loadoutFromProfile(profile);
  return startRun(5, loadout, healAfterWin);
}

describe('Durchlauf', () => {
  it('nimmt Hülle und Torpedos in den nächsten Kampf mit', () => {
    const run = begin();
    const battle = createBattle(battleSeed(run), battleLoadout(run), STAGES[0]);
    battle.player.hull = 17;
    battle.player.torpedoes = 2;
    battle.outcome = 'victory';
    resolveBattle(run, battle);
    expect(run.status).toBe('reward');
    expect(run.crystals).toBe(12);
    chooseReward(run, 'repair');
    expect(run.stage).toBe(1);
    const next = createBattle(battleSeed(run), battleLoadout(run), STAGES[1]);
    expect(next.player.hull).toBe(27);
    expect(next.player.torpedoes).toBe(2);
  });

  it('lässt bei einer Niederlage die Hälfte der Kristalle', () => {
    const run = begin();
    run.crystals = 31;
    const battle = createBattle(1, battleLoadout(run), STAGES[0]);
    battle.outcome = 'defeat';
    resolveBattle(run, battle);
    expect(run.status).toBe('lost');
    expect(payout(run)).toBe(16);
  });

  it('endet nach dem letzten Kampf mit einem Sieg', () => {
    const run = begin();
    run.stage = STAGES.length - 1;
    const battle = createBattle(1, battleLoadout(run), STAGES[run.stage]);
    battle.outcome = 'victory';
    resolveBattle(run, battle);
    expect(run.status).toBe('won');
    expect(payout(run)).toBe(45);
  });

  it('alle Gegner lassen sich aufstellen und kämpfen ohne Fehler', () => {
    for (const enemy of STAGES) {
      const battle = createBattle(3, 'eisvogel', enemy);
      for (let i = 0; i < 20 * TICK_RATE; i++) step(battle);
      expect(battle.tick).toBeGreaterThan(0);
    }
  });
});

describe('Homebase', () => {
  it('Ausbau kostet Kristalle und verbessert die Startausrüstung', () => {
    const profile = newProfile();
    expect(buyModule(profile, 'werft')).toBe(false);
    profile.crystals = 200;
    expect(buyModule(profile, 'werft')).toBe(true);
    expect(buyModule(profile, 'waffen')).toBe(true);
    expect(buyModule(profile, 'waffen')).toBe(true);
    expect(profile.crystals).toBe(200 - 20 - 25 - 60);
    const { loadout } = loadoutFromProfile(profile);
    expect(loadout.maxHull).toBe(35);
    expect(loadout.torpedoes).toBe(9);
    expect(loadout.weapons?.[0]).toBe('drillingslaser');
  });

  it('ein Modul lässt sich nicht über die höchste Stufe ausbauen', () => {
    const profile = newProfile();
    profile.crystals = 1000;
    expect(buyModule(profile, 'reaktor')).toBe(true);
    expect(buyModule(profile, 'reaktor')).toBe(true);
    expect(buyModule(profile, 'reaktor')).toBe(false);
  });

  it('die zweite Schildschicht kommt im Kampf an', () => {
    const profile = newProfile();
    profile.modules.schild = 2;
    profile.modules.reaktor = 2;
    const battle = createBattle(1, loadoutFromProfile(profile).loadout, 'rostwespe');
    expect(battle.player.systems.shields.level).toBe(4);
    expect(battle.player.shieldLayers).toBe(2);
  });

  it('beschädigte oder fremde Spielstände werden abgewiesen oder bereinigt', () => {
    expect(parseProfile(null)).toBeNull();
    expect(parseProfile({ version: 2 })).toBeNull();
    const fixed = parseProfile({ version: 1, crystals: -5, modules: { werft: 99 } });
    expect(fixed?.crystals).toBe(0);
    expect(fixed?.modules.werft).toBe(3);
  });
});
