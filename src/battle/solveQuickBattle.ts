import {
  battleGags,
  makeToon,
  reliableClear,
  trackGags,
  type Action,
  type BattleRound,
  type BattleState,
  type Strategy,
} from './model';
import { resolveRound } from './resolveRound';
import { actionCost, actionKey, roundCandidates } from './solveBattle';

export interface QuickPlan {
  round: BattleRound;
  clearChance: number | null;
  expectedKOs: number;
  koChances: number[];
  expectedDamage: number[];
  expectedThreats: number;
  expectedBossDamage: number;
  retaliationChance: number;
  level6: number;
  level7: number;
  cost: number;
}

export interface QuickPlans {
  recommended: QuickPlan;
  conserve?: QuickPlan;
  reliable?: QuickPlan;
}

export function estimateQuickPlan(
  state: BattleState,
  actions: Action[],
): QuickPlan {
  const round = {
    before: state,
    actions,
    ...resolveRound(state, actions, false),
  };
  const targets = state.cogs.filter(({ hp }) => hp > 0);
  let clearChance = 0;
  let expectedThreats = 0;
  let expectedBossDamage = 0;
  let retaliationChance = 0;
  const koChances = targets.map(() => 0);
  const expectedDamage = targets.map(() => 0);

  function visit(rolls: boolean[], probability: number) {
    let rollIndex = 0;
    let nextOdds = 1;
    const result = resolveRound(state, actions, false, (odds) => {
      if (odds === 1) return true;
      if (rollIndex === rolls.length && nextOdds === 1) nextOdds = odds;
      return rolls[rollIndex++] ?? true;
    });
    if (nextOdds < 1) {
      visit([...rolls, true], probability * nextOdds);
      visit([...rolls, false], probability * (1 - nextOdds));
      return;
    }
    let kos = 0;
    for (const [index, cog] of targets.entries()) {
      const after = result.after.cogs.find(({ id }) => id === cog.id);
      expectedDamage[index] +=
        probability * Math.max(0, cog.hp - (after?.hp ?? 0));
      if (after?.hp === 0) {
        kos++;
        koChances[index] += probability;
      }
    }
    if (kos === targets.length) clearChance += probability;
    expectedThreats += probability * result.threats;
    expectedBossDamage +=
      probability * ((state.boiler?.hp ?? 0) - (result.after.boiler?.hp ?? 0));
    if (result.retaliation) retaliationChance += probability;
  }

  visit([], 1);
  const levels = actions.flatMap((action) =>
    action.kind === 'gag' ? [battleGags[action.gag].level] : [],
  );
  return {
    round,
    clearChance: targets.length ? Math.min(1, clearChance) : null,
    expectedKOs: koChances.reduce((total, chance) => total + chance, 0),
    koChances,
    expectedDamage,
    expectedThreats,
    expectedBossDamage,
    retaliationChance,
    level6: levels.filter((level) => level === 6).length,
    level7: levels.filter((level) => level === 7).length,
    cost: actions.reduce(
      (total, action) => total + actionCost(state, action),
      0,
    ),
  };
}

function soundLineups(state: BattleState): Action[][] {
  const lineups: Action[][] = [];
  if (state.boiler?.ordinance?.track === 'Sound') return lineups;
  const sound = trackGags.Sound.filter((id) => state.toons[0].stock[id]);
  function build(prefix: Action[], at: number) {
    const pass: Action[] = state.toons.slice(prefix.length).map((_, index) => ({
      kind: 'pass',
      toon: prefix.length + index,
    }));
    lineups.push([...prefix, ...pass]);
    if (prefix.length === state.toons.length) return;
    for (const [index, gag] of sound.slice(at).entries()) {
      build([...prefix, { kind: 'gag', gag, toon: prefix.length }], at + index);
    }
  }
  build([], 0);
  return lineups;
}

const clear = (plan: QuickPlan) => plan.clearChance ?? 0;
const efficiency = (a: QuickPlan, b: QuickPlan) =>
  a.level7 - b.level7 || a.level6 - b.level6 || a.cost - b.cost;
const outcomes = (a: QuickPlan, b: QuickPlan) =>
  clear(b) - clear(a) ||
  b.expectedKOs - a.expectedKOs ||
  a.expectedThreats - b.expectedThreats;
const bossDamage = (a: QuickPlan, b: QuickPlan) =>
  b.expectedBossDamage - a.expectedBossDamage;
const lineupKey = (actions: Action[]) =>
  actions.map(actionKey).sort().join('|');

export function solveQuickBattle(
  board: Omit<BattleState, 'toons'>,
  strategy: Strategy,
  allowLevel7: boolean,
): QuickPlans {
  const state = {
    ...board,
    toons: Array.from({ length: 4 }, () => ({
      ...makeToon(),
      stock: battleGags.map(({ level }) => (level < 7 || allowLevel7 ? 2 : 0)),
    })),
  };

  const cheapState = {
    ...state,
    toons: state.toons.map((toon) => ({
      ...toon,
      stock: toon.stock.map((stock, id) =>
        battleGags[id].level < 6 ? stock : 0,
      ),
    })),
  };
  const candidates = [
    ...soundLineups(state),
    ...roundCandidates(cheapState, strategy, true).map(
      ({ actions }) => actions,
    ),
    ...roundCandidates(state, strategy, true).map(({ actions }) => actions),
  ];
  const seen = new Set<string>();
  const plans: QuickPlan[] = [];
  for (const actions of candidates) {
    const key = lineupKey(actions);
    if (seen.has(key)) continue;
    seen.add(key);
    const traps = actions.flatMap((action) =>
      action.kind === 'gag' && battleGags[action.gag].track === 'Trap'
        ? [action.target]
        : [],
    );
    if (
      traps.length > 1 &&
      traps.some((action, index) =>
        traps
          .slice(index + 1)
          .some(
            (other) =>
              action === undefined || other === undefined || action === other,
          ),
      )
    )
      continue;
    const plan = estimateQuickPlan(state, actions);
    if (plan.retaliationChance === 0) plans.push(plan);
  }

  const bossOnly = state.cogs.length === 0;
  const reliable = (a: QuickPlan, b: QuickPlan) =>
    outcomes(a, b) || bossDamage(a, b) || efficiency(a, b);
  const balanced = (a: QuickPlan, b: QuickPlan) => {
    if (bossOnly) return bossDamage(a, b) || efficiency(a, b);
    const aMeets = clear(a) >= reliableClear;
    const bMeets = clear(b) >= reliableClear;
    return (
      Number(bMeets) - Number(aMeets) ||
      (aMeets && bMeets ? efficiency(a, b) : 0) ||
      reliable(a, b)
    );
  };
  const conserve = (a: QuickPlan, b: QuickPlan) => {
    // Within the same spend tier, keep useful actions ahead of passing.
    return (
      a.level7 - b.level7 ||
      a.level6 - b.level6 ||
      (bossOnly ? bossDamage(a, b) : outcomes(a, b)) ||
      efficiency(a, b)
    );
  };
  const primary = {
    balanced,
    fast: reliable,
    conserve,
    control: (a: QuickPlan, b: QuickPlan) =>
      a.expectedThreats - b.expectedThreats || reliable(a, b),
  }[strategy];
  const recommended = [...plans].sort(primary)[0];
  const economical = [...plans].sort(conserve)[0];
  const safer = [...plans].sort(reliable)[0];
  return {
    recommended,
    conserve:
      economical.level6 + economical.level7 <
      recommended.level6 + recommended.level7
        ? economical
        : undefined,
    reliable:
      clear(safer) > clear(recommended) + 0.0001 ||
      (clear(safer) === clear(recommended) &&
        safer.expectedThreats < recommended.expectedThreats - 0.001)
        ? safer
        : undefined,
  };
}
