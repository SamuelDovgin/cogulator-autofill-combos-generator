import type { GagTrack } from '../types';
import { calculateCogHealth, getGagDmg } from '../utils/calculatorUtils';
import {
  activeRemote,
  battleGags,
  isCleared,
  remoteKeys,
  trackGags,
  trackOrder,
  type Action,
  type BattlePlan,
  type BattleRound,
  type BattleState,
  type Strategy,
} from './model';
import { canHitBoiler, resolveRound } from './resolveRound';

const weights = {
  balanced: { cost: 1, threat: 15, round: 30, miss: 1, heal: 0.33 },
  fast: { cost: 0.28, threat: 12, round: 65, miss: 0.9, heal: 0.24 },
  conserve: { cost: 2.1, threat: 12, round: 19, miss: 1, heal: 0.3 },
  control: { cost: 0.8, threat: 29, round: 25, miss: 1.45, heal: 0.85 },
};

type RoundResult = ReturnType<typeof resolveRound>;

export function actionCost(state: BattleState, action: Action) {
  if (action.kind === 'pass') return 0;
  if (action.kind === 'remote') return 4 + activeRemote(action.remote).tier * 2;
  const gag = battleGags[action.gag];
  const stock = state.toons[action.toon].stock[action.gag];
  let cost = [0, 0.8, 0.9, 1, 1.6, 2.7, 6, 24][gag.level];
  if (gag.track === 'Sound' && gag.level >= 5) cost += gag.level === 6 ? 5 : 1;
  if (
    gag.level === 6 &&
    state.boiler &&
    gag.track === 'Throw' &&
    state.boiler.phase !== 'Fired Up' &&
    state.boiler.phase !== 'Meltdown'
  )
    cost += 4;
  return cost * (stock === 1 ? 1.25 : 1);
}

function remainingWork(state: BattleState) {
  if (isCleared(state)) return 0;
  const cogWork = state.cogs.reduce(
    (total, cog) =>
      total +
      (cog.hp > 0
        ? 27 +
          (cog.hp + (cog.layers === 2 ? calculateCogHealth(cog.level) : 0)) *
            0.18 -
          Math.min(2, cog.lure) * 4 -
          (cog.remote ? 9 : 0)
        : 0),
    0,
  );
  return cogWork + (state.boiler?.hp ?? 0) * 0.18;
}

function stockChoices(
  indices: number[],
  stock: number[],
  hp: number,
  organic: GagTrack | '',
  lured: boolean,
) {
  const ready = indices.filter((index) => stock[index] > 0);
  if (ready.length <= 4) return ready;
  const minimumKill = ready.find((index) => {
    const gag = battleGags[index];
    const damage = getGagDmg({ ...gag, isOrganic: gag.track === organic });
    return (lured ? damage + Math.ceil(damage / 2) : damage) >= hp;
  });
  return [
    ...new Set([
      ready[0],
      ready[ready.length - 2],
      ready[ready.length - 1],
      minimumKill ?? ready[Math.floor(ready.length / 2)],
    ]),
  ];
}

function choicesFor(state: BattleState, toon: number): Action[] {
  const { stock, remotes, organic } = state.toons[toon];
  const cogs = state.cogs.filter((cog) => cog.hp > 0);
  const candidates: Action[] = [{ toon, kind: 'pass' }];
  const allies = state.toons.flatMap((ally, index) =>
    index !== toon && ally.laff && ally.laff.current < ally.laff.max
      ? [{ index, missing: ally.laff.max - ally.laff.current }]
      : [],
  );
  const boss = state.boiler && state.boiler.hp > 0 ? state.boiler : undefined;
  const addGags = (
    indices: number[],
    hp: number,
    target?: number | 'boiler',
    lured = false,
  ) => {
    for (const gag of stockChoices(indices, stock, hp, organic, lured)) {
      candidates.push({ toon, kind: 'gag', gag, target });
    }
  };

  for (const track of trackOrder) {
    if (
      boss?.ordinance?.track === track ||
      state.blockedTracks?.includes(track)
    )
      continue;
    const group = trackGags[track].filter(
      (id) => battleGags[id].affectsNum === 'All',
    );
    const single = trackGags[track].filter(
      (id) => battleGags[id].affectsNum === 'Single',
    );
    if (track === 'Toonup') {
      if (allies.length)
        addGags(group, Math.max(...allies.map(({ missing }) => missing)));
      for (const ally of allies) addGags(single, ally.missing, ally.index);
      continue;
    }
    const targets = cogs.filter((cog) => {
      if (track === 'Trap') return !cog.lure && cog.trap === undefined;
      if (track === 'Lure' || track === 'Drop') return !cog.lure;
      return true;
    });
    const hitsBoss = !!boss && canHitBoiler(battleGags[trackGags[track][0]]);
    if (targets.length || hitsBoss) {
      addGags(group, Math.max(...targets.map(({ hp }) => hp), 0));
    }
    for (const cog of targets) {
      addGags(
        single,
        cog.hp,
        cog.id,
        cog.lure > 0 && (track === 'Throw' || track === 'Squirt'),
      );
    }
    if (hitsBoss) addGags(single, boss.hp, 'boiler');
  }
  for (const remote of remoteKeys) {
    if (!remotes[remote]) continue;
    for (const cog of cogs) {
      if (!cog.remote)
        candidates.push({ toon, kind: 'remote', remote, target: cog.id });
    }
  }
  return candidates;
}

export function actionKey(action: Action) {
  if (action.kind === 'pass') return '-';
  return action.kind === 'gag'
    ? `${action.gag}:${action.target ?? '*'}`
    : `${action.remote}:${action.target}`;
}

function stockKey(toon: BattleState['toons'][number]) {
  return `${toon.organic}/${toon.stock.join(',')}/${remoteKeys.map((key) => toon.remotes[key] ?? 0).join(',')}/${toon.laff?.current ?? ''}/${toon.laff?.max ?? ''}`;
}

interface RoundCandidate {
  actions: Action[];
  cost: number;
  score: number;
  route: string;
  result: RoundResult;
}

export function roundCandidates(
  state: BattleState,
  strategy: Strategy,
  quick = false,
) {
  const weight = weights[strategy];
  const initialWork = remainingWork(state);
  const choices = state.toons.map((_, toon) => choicesFor(state, toon));
  const costByAction = new Map(
    choices.flat().map((action) => [action, actionCost(state, action)]),
  );
  const toonKeys = state.toons.map(stockKey);
  let partial: Pick<RoundCandidate, 'actions' | 'cost'>[] = [
    { actions: [], cost: 0 },
  ];
  let finalists: RoundCandidate[] = [];

  for (const [toon, options] of choices.entries()) {
    const remainingSlots = choices.length - toon - 1;
    const seen = new Set<string>();
    const candidates: RoundCandidate[] = [];
    for (const prefix of partial) {
      for (const action of options) {
        const actions = [...prefix.actions, action];
        // Equivalent Toons can exchange actions. Healing targets depend on Toon identity.
        const hasHeal = actions.some(
          (move) =>
            move.kind === 'gag' && battleGags[move.gag].track === 'Toonup',
        );
        const key = hasHeal
          ? actions.map(actionKey).join('|')
          : actions
              .map((move) => `${toonKeys[move.toon]}/${actionKey(move)}`)
              .sort()
              .join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        const result = resolveRound(state, actions, false);
        if (result.retaliation && !remainingSlots) continue;
        const cost = prefix.cost + (costByAction.get(action) ?? 0);
        const used = actions.filter((move) => move.kind !== 'pass').length;
        const progress = initialWork - remainingWork(result.after);
        const missedRisk =
          (1 - result.accuracy) *
          (20 + Math.max(0, progress) * 0.65 + result.threats * 2);
        const placedTraps = result.after.cogs.filter(
          (cog, index) =>
            cog.trap !== undefined && cog.trap !== state.cogs[index].trap,
        ).length;
        const route = result.retaliation
          ? 'boiler'
          : placedTraps
            ? 'trap'
            : actions.some((move) => move.kind === 'remote')
              ? 'remote'
              : actions.some(
                    (move) =>
                      move.kind === 'gag' &&
                      battleGags[move.gag].track === 'Lure',
                  )
                ? 'lure'
                : actions.some(
                      (move) =>
                        move.kind === 'gag' &&
                        battleGags[move.gag].track === 'Sound',
                    )
                  ? 'sound'
                  : action.kind === 'gag'
                    ? battleGags[action.gag].track
                    : 'pass';
        const score =
          progress -
          result.threats * weight.threat -
          missedRisk * weight.miss +
          result.healing * weight.heal -
          cost * weight.cost -
          (used - result.useful) * 8 +
          placedTraps * (remainingSlots ? 18 : 5);
        candidates.push({ actions, cost, score, route, result });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    if (!remainingSlots) {
      finalists = candidates;
      break;
    }
    const routes = new Set(candidates.slice(0, 9).map(({ route }) => route));
    partial = candidates.slice(0, 9);
    for (const candidate of candidates.slice(9)) {
      if (routes.has(candidate.route)) continue;
      routes.add(candidate.route);
      partial.push(candidate);
    }
    // Always allow unused earlier slots, including when a later Toon has the right stock.
    const pass = candidates.find(({ actions }) =>
      actions.every((action) => action.kind === 'pass'),
    );
    if (pass && !partial.includes(pass)) partial.push(pass);
  }

  if (quick) {
    // Retain candidates from each spend band before comparing their hit/miss outcomes.
    const bySpend = new Map<number, number>();
    return finalists.filter(({ actions }) => {
      const spend = actions.reduce(
        (total, action) =>
          total +
          (action.kind === 'gag' && battleGags[action.gag].level >= 6 ? 1 : 0),
        0,
      );
      const count = bySpend.get(spend) ?? 0;
      if (count >= 12) return false;
      bySpend.set(spend, count + 1);
      return true;
    });
  }

  const distinct = new Set<string>();
  return finalists
    .filter(({ result }) => {
      const key = `${result.after.cogs.map((cog) => [cog.hp, cog.lure, cog.trap, cog.layers, cog.remote?.kind, cog.remote?.tier, cog.remote?.turns].join(',')).join('|')}/${result.after.boiler?.hp ?? ''}/${result.after.toons.map((toon) => toon.laff?.current ?? '').join(',')}`;
      if (distinct.has(key)) return false;
      distinct.add(key);
      return true;
    })
    .slice(0, 8);
}

interface SearchNode {
  state: BattleState;
  rounds: BattleRound[];
  penalty: number;
  rank: number;
}

function stateKey(state: BattleState) {
  return JSON.stringify([
    state.cogs,
    state.boiler,
    state.toons.map(stockKey).sort(),
  ]);
}

export function solveBattle(
  initial: BattleState,
  strategy: Strategy,
  horizon = 12,
): BattlePlan {
  if (isCleared(initial)) return { rounds: [], cleared: true };
  const weight = weights[strategy];
  let frontier: SearchNode[] = [
    { state: initial, rounds: [], penalty: 0, rank: remainingWork(initial) },
  ];
  let bestPartial = frontier[0];
  let bestClear: SearchNode | undefined;

  for (let turn = 0; turn < horizon && frontier.length; turn++) {
    const next: SearchNode[] = [];
    for (const node of frontier) {
      for (const candidate of roundCandidates(node.state, strategy)) {
        const { actions, cost } = candidate;
        const result = resolveRound(node.state, actions);
        const { after, accuracy, healing, threats, damage, retaliation } =
          result;
        if (retaliation) continue;
        const changed =
          damage > 0 || healing > 0 || stateKey(node.state) !== stateKey(after);
        if (!changed) continue;
        // Stock depletion alone is not progress if every selected action would be wasted.
        if (
          !result.useful &&
          !node.state.boiler &&
          !node.state.cogs.some((cog) => cog.lure || cog.remote)
        )
          continue;
        const missedRisk =
          (1 - accuracy) *
          (20 +
            Math.max(0, remainingWork(node.state) - remainingWork(after)) *
              0.65);
        const penalty =
          node.penalty +
          weight.round +
          cost * weight.cost +
          threats * weight.threat +
          missedRisk * weight.miss -
          healing * weight.heal;
        const rounds = [
          ...node.rounds,
          {
            before: node.state,
            after,
            actions,
            accuracy,
            healing,
            threats,
            damage,
            retaliation,
          },
        ];
        const rank = penalty + remainingWork(after);
        const child = { state: after, rounds, penalty, rank };
        if (isCleared(after)) {
          if (!bestClear || child.penalty < bestClear.penalty)
            bestClear = child;
          continue;
        }
        const difference =
          remainingWork(after) - remainingWork(bestPartial.state);
        if (
          difference < -0.001 ||
          (Math.abs(difference) <= 0.001 && rank < bestPartial.rank)
        )
          bestPartial = child;
        next.push(child);
      }
    }
    const seen = new Set<string>();
    frontier = next
      .sort((a, b) => a.rank - b.rank)
      .filter(({ state }) => {
        const key = stateKey(state);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 5);
    if (bestClear) {
      const clearCost = bestClear.penalty;
      const canImprove = frontier.some(({ state, penalty }) => {
        const missingLaff = state.toons.reduce(
          (total, { laff }) => total + (laff ? laff.max - laff.current : 0),
          0,
        );
        return penalty - missingLaff * weight.heal < clearCost;
      });
      if (strategy === 'fast' || !canImprove) break;
    }
  }

  return {
    rounds: (bestClear ?? bestPartial).rounds,
    cleared: isCleared((bestClear ?? bestPartial).state),
  };
}
