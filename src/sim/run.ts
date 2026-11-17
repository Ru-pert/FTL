// Ein Durchlauf: eine Kette von Kämpfen. Hülle und Torpedos bleiben zwischen den Kämpfen erhalten.
import type { BattleState, Loadout } from './types';

/** Gegner in der Reihenfolge der Kämpfe. */
export const STAGES = ['rostwespe', 'schrotthai', 'giftwespe', 'rudelfuehrer', 'eisenrochen'];
/** Kristalle für den Sieg im jeweiligen Kampf. */
export const STAGE_REWARD = [12, 16, 22, 28, 45];
/** Anteil der Kristalle, den man bei einer Niederlage behält. */
export const DEFEAT_SHARE = 0.5;

export type RewardId = 'repair' | 'torpedoes' | 'crystals';
export const REWARDS: Record<RewardId, { name: string; text: string }> = {
  repair: { name: 'Hülle flicken', text: '+10 Hülle' },
  torpedoes: { name: 'Torpedos bergen', text: '+3 Torpedos' },
  crystals: { name: 'Wrack ausschlachten', text: '+10 Kristalle' },
};

export interface RunState {
  seed: number;
  /** Nummer des aktuellen Kampfs, ab 0. */
  stage: number;
  hull: number;
  torpedoes: number;
  crystals: number;
  loadout: Loadout;
  healAfterWin: number;
  /** fighting = im Kampf, reward = Belohnung wählen, won/lost = Durchlauf beendet. */
  status: 'fighting' | 'reward' | 'won' | 'lost';
  /** Kristalle aus dem letzten Kampf (für die Anzeige). */
  lastReward: number;
}

export function startRun(seed: number, loadout: Loadout, healAfterWin: number): RunState {
  return {
    seed,
    stage: 0,
    hull: loadout.maxHull ?? 0,
    torpedoes: loadout.torpedoes ?? 0,
    crystals: 0,
    loadout,
    healAfterWin,
    status: 'fighting',
    lastReward: 0,
  };
}

/** Ausstattung für den nächsten Kampf: Grundausstattung plus aktueller Zustand. */
export function battleLoadout(run: RunState): Loadout {
  return { ...run.loadout, hull: run.hull, torpedoes: run.torpedoes };
}

export function battleSeed(run: RunState): number {
  return (run.seed + run.stage * 7919) | 0;
}

/** Übernimmt das Ergebnis eines beendeten Kampfs in den Durchlauf. */
export function resolveBattle(run: RunState, battle: BattleState): void {
  if (run.status !== 'fighting' || battle.outcome === 'ongoing') return;
  if (battle.outcome === 'defeat') {
    run.hull = 0;
    run.status = 'lost';
    return;
  }
  run.lastReward = STAGE_REWARD[run.stage];
  run.crystals += run.lastReward;
  run.hull = Math.min(battle.player.maxHull, battle.player.hull + run.healAfterWin);
  run.torpedoes = battle.player.torpedoes;
  run.status = run.stage >= STAGES.length - 1 ? 'won' : 'reward';
}

/** Belohnung nach einem Sieg wählen; danach geht es in den nächsten Kampf. */
export function chooseReward(run: RunState, reward: RewardId): void {
  if (run.status !== 'reward') return;
  if (reward === 'repair') run.hull = Math.min(run.loadout.maxHull ?? run.hull, run.hull + 10);
  else if (reward === 'torpedoes') run.torpedoes += 3;
  else run.crystals += 10;
  run.stage++;
  run.status = 'fighting';
}

/** Kristalle, die am Ende des Durchlaufs ins Profil wandern. */
export function payout(run: RunState): number {
  return run.status === 'lost' ? Math.ceil(run.crystals * DEFEAT_SHARE) : run.crystals;
}
