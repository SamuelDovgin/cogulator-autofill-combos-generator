import { describe, expect, it } from 'vitest';
import {
  battleGags,
  makeCog,
  makeToon,
  type Action,
  type BattleState,
  type RemoteKey,
  type ToonState,
} from '../src/battle/model';
import { resolveRound } from '../src/battle/resolveRound';
import { solveBattle } from '../src/battle/solveBattle';
import {
  estimateQuickPlan,
  solveQuickBattle,
} from '../src/battle/solveQuickBattle';

const gagIndex = (name: string) =>
  battleGags.findIndex((gag) => gag.name === name);
const gag = (
  toon: number,
  name: string,
  target?: number | 'boiler',
): Action => ({ toon, kind: 'gag', gag: gagIndex(name), target });

function inventory(
  stock: Record<string, number> = {},
  remotes: Partial<Record<RemoteKey, number>> = {},
): ToonState {
  return {
    ...makeToon(),
    stock: battleGags.map(({ name }) => stock[name] ?? 0),
    remotes,
  };
}

describe('battle round projections', () => {
  it('applies an area gag to each Cog and adds a same-track bonus only where both hit', () => {
    const state: BattleState = {
      cogs: [makeCog(1, 13), makeCog(2, 13)],
      toons: [inventory(), inventory()],
    };
    const result = resolveRound(
      state,
      [gag(0, 'Wedding Cake'), gag(1, 'Whole Cream Pie', 1)],
      false,
    );
    expect(result.after.cogs.map(({ hp }) => hp)).toEqual([32, 104]);
    expect(result.accuracy).toBe(0.75);
  });

  it('carries a placed trap into the next round and does not add knockback when it triggers', () => {
    const state: BattleState = {
      cogs: [makeCog(1, 13)],
      toons: [
        inventory({ TNT: 1 }),
        inventory({ '$10 Bill': 1 }),
        inventory({ 'Fire Hose': 1 }),
      ],
    };
    const placed = resolveRound(state, [gag(0, 'TNT', 1)]).after;
    expect(placed.cogs[0].hp).toBe(224);
    expect(placed.toons[0].stock[gagIndex('TNT')]).toBe(0);
    const result = resolveRound(placed, [
      gag(1, '$10 Bill', 1),
      gag(2, 'Fire Hose', 1),
    ]);
    expect(result.after.cogs[0]).toMatchObject({
      hp: 14,
      lure: 0,
      trap: undefined,
    });
    expect(state.toons[0].stock[gagIndex('TNT')]).toBe(1);
  });

  it('carries fresh lure and blocks Drop until the Cog wakes', () => {
    const state: BattleState = {
      cogs: [makeCog(1)],
      toons: [
        inventory({ 'Hypno Goggles': 1 }),
        inventory({ 'Grand Piano': 1 }),
      ],
    };
    const result = resolveRound(state, [
      gag(0, 'Hypno Goggles'),
      gag(1, 'Grand Piano', 1),
    ]);
    expect(result.after.cogs[0]).toMatchObject({ hp: 132, lure: 4 });
    expect(result.threats).toBe(0);
  });

  it('opens a v2.0 second suit at full HP after the round', () => {
    const state: BattleState = {
      cogs: [{ ...makeCog(1, 9), hp: 5, layers: 2 }],
      toons: [inventory(), inventory()],
    };
    const result = resolveRound(
      state,
      [gag(0, 'Birthday Cake', 1), gag(1, 'Grand Piano', 1)],
      false,
    );
    expect(result.after.cogs[0]).toMatchObject({ hp: 110, layers: 1 });
    expect(result.threats).toBeGreaterThan(0);
  });

  it('spends a remote once and resolves its expiry damage after its last round', () => {
    const state: BattleState = {
      cogs: [makeCog(1, 8), makeCog(2, 10)],
      toons: [inventory({}, { 'damage:1': 1 })],
    };
    const turn1 = resolveRound(state, [
      { toon: 0, kind: 'remote', remote: 'damage:1', target: 1 },
    ]);
    expect(turn1.after.cogs.map(({ hp }) => hp)).toEqual([90, 87]);
    expect(turn1.after.cogs[0].remote?.turns).toBe(1);
    expect(turn1.after.toons[0].remotes['damage:1']).toBe(0);
    const turn2 = resolveRound(turn1.after, [{ toon: 0, kind: 'pass' }]);
    expect(turn2.after.cogs.map(({ hp }) => hp)).toEqual([45, 42]);
    expect(turn2.after.cogs[0].remote).toBeUndefined();
  });

  it('advances Boiler phases, ordinances, and four-star Meltdown', () => {
    const state: BattleState = {
      cogs: [],
      toons: [inventory({ 'Birthday Cake': 1 })],
      boiler: {
        hp: 2600,
        tier: 4,
        phase: 'Fired Up',
        turns: 2,
        ordinance: { track: 'Sound', turns: 1 },
      },
    };
    const result = resolveRound(state, [gag(0, 'Birthday Cake', 'boiler')]);
    expect(result.damage).toBe(150);
    expect(result.after.boiler).toMatchObject({
      phase: 'Meltdown',
      hp: 2450,
      ordinance: undefined,
    });
  });
});

describe('battle search', () => {
  it('trades a faster clear for cheaper gags when conserving', () => {
    const state: BattleState = {
      cogs: [{ ...makeCog(1), hp: 99, lure: 2 }],
      toons: [inventory({ 'Whole Cream Pie': 3, 'Wedding Cake': 1 })],
    };
    const fast = solveBattle(state, 'fast');
    const conserve = solveBattle(state, 'conserve');
    expect(fast.cleared && conserve.cleared).toBe(true);
    expect(fast.rounds).toHaveLength(1);
    expect(conserve.rounds).toHaveLength(2);
    expect(
      conserve.rounds[1].after.toons[0].stock[gagIndex('Wedding Cake')],
    ).toBe(1);
  });

  it('waits out defense, spends only available gags, and respects an ordinance', () => {
    const state: BattleState = {
      cogs: [],
      toons: [inventory({ Foghorn: 1, 'Birthday Cake': 1 })],
      boiler: {
        hp: 200,
        tier: 2,
        phase: 'Defensive',
        turns: 1,
        ordinance: { track: 'Throw', turns: 2 },
      },
    };
    const plan = solveBattle(state, 'fast');
    expect(plan.cleared).toBe(true);
    expect(plan.rounds[0].actions).toEqual([{ toon: 0, kind: 'pass' }]);
    expect(plan.rounds[1].actions).toEqual([gag(0, 'Foghorn')]);
    expect(plan.rounds[2].actions).toEqual([gag(0, 'Birthday Cake', 'boiler')]);
  });

  it('can end the Boiler encounter in defense with lethal damage even if a Cog remains', () => {
    const state: BattleState = {
      cogs: [makeCog(1, 13)],
      toons: [
        inventory({ 'Birthday Cake': 1 }),
        inventory({ 'Birthday Cake': 1 }),
      ],
      boiler: { hp: 220, tier: 2, phase: 'Defensive', turns: 3 },
    };
    const plan = solveBattle(state, 'fast');
    expect(plan.cleared).toBe(true);
    expect(plan.rounds).toHaveLength(1);
    expect(plan.rounds[0].retaliation).toBe(false);
    expect(plan.rounds[0].after.cogs[0].hp).toBe(224);
  });

  it('does not fabricate a clear from unavailable inventory', () => {
    const state: BattleState = {
      cogs: [makeCog(1)],
      toons: [inventory({ 'Whole Cream Pie': 1 })],
    };
    const plan = solveBattle(state, 'balanced');
    expect(plan.cleared).toBe(false);
    expect(plan.rounds).toHaveLength(1);
    expect(
      plan.rounds[0].after.toons[0].stock[gagIndex('Whole Cream Pie')],
    ).toBe(0);
  });
});

describe('team availability and support', () => {
  it('honors a team-wide track lock without removing the stock', () => {
    const state: BattleState = {
      cogs: [makeCog(1, 6)],
      toons: [inventory({ Foghorn: 2, 'Birthday Cake': 1 })],
      blockedTracks: ['Sound'],
    };
    const plan = solveBattle(state, 'conserve');
    expect(plan.cleared).toBe(true);
    expect(plan.rounds[0].actions).toEqual([gag(0, 'Birthday Cake', 1)]);
    expect(plan.rounds[0].after.toons[0].stock[gagIndex('Foghorn')]).toBe(2);
  });

  it('uses a stocked healing remote to control a Cog and restore entered Laff', () => {
    const state: BattleState = {
      cogs: [makeCog(1, 8)],
      toons: [
        {
          ...inventory({}, { 'healing:2': 1 }),
          laff: { current: 20, max: 110 },
        },
      ],
      boiler: { hp: 4500, tier: 2, phase: 'Defensive', turns: 3 },
    };
    const plan = solveBattle(state, 'control');
    expect(plan.rounds[0].actions).toEqual([
      { toon: 0, kind: 'remote', remote: 'healing:2', target: 1 },
    ]);
    expect(plan.rounds[0].after.toons[0].laff?.current).toBe(40);
    expect(plan.rounds[0].threats).toBe(0);
  });
});

describe('quick lineup planner', () => {
  it('treats a four-Cog Sound clear as one shared accuracy event', () => {
    const state: BattleState = {
      cogs: [1, 2, 3, 4].map((id) => makeCog(id, 8)),
      toons: Array.from({ length: 4 }, makeToon),
    };
    const result = estimateQuickPlan(
      state,
      state.toons.map((_, toon) => gag(toon, 'Elephant Trunk')),
    );
    expect(result.clearChance).toBeCloseTo(0.95);
    expect(result.koChances).toEqual([0.95, 0.95, 0.95, 0.95]);
    expect(result.expectedKOs).toBeCloseTo(3.8);
  });

  it('escalates to the fewest Foghorns that clear four level-12 Cogs', () => {
    const cogs = [1, 2, 3, 4].map((id) => makeCog(id, 12));
    const result = solveQuickBattle({ cogs }, 'balanced', false);
    expect(result.recommended.clearChance).toBeGreaterThanOrEqual(0.8);
    expect(result.recommended.level6).toBe(3);
    expect(result.recommended.level7).toBe(0);
    expect(result.conserve?.level6).toBe(0);
  });

  it('keeps all damage off a Defensive Boiler when it would survive', () => {
    const boiler: BattleState['boiler'] = {
      tier: 2,
      hp: 4500,
      phase: 'Defensive',
      turns: 2,
    };
    const cogs = [1, 2, 3, 4].map((id) => makeCog(id, 8));
    const risky = estimateQuickPlan(
      { cogs, boiler, toons: Array.from({ length: 4 }, makeToon) },
      [gag(0, 'Foghorn')],
    );
    expect(risky.retaliationChance).toBeCloseTo(0.95);
    const result = solveQuickBattle({ cogs, boiler }, 'balanced', false);
    expect(result.recommended.retaliationChance).toBe(0);
    expect(result.recommended.expectedBossDamage).toBe(0);
  });

  it('keeps the same target slot when planning for a single survivor with observed HP', () => {
    const survivor = { ...makeCog(3, 14), hp: 5 };
    const result = solveQuickBattle({ cogs: [survivor] }, 'balanced', false);
    expect(result.recommended.clearChance).toBeGreaterThanOrEqual(0.8);
    expect(result.recommended.round.before.cogs).toEqual([survivor]);
    expect(result.recommended.level6).toBe(0);
    expect(
      result.recommended.round.actions.every(
        (action) =>
          action.kind !== 'gag' ||
          action.target === undefined ||
          action.target === 3,
      ),
    ).toBe(true);
  });
});
