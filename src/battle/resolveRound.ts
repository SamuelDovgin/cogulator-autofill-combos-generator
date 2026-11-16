import type { GagInfo, GagTrack } from '../types';
import {
  calculateCogHealth,
  calculateLureComboBonus,
  getGagAccuracy,
  getGagDmg,
  getTargetDefense,
} from '../utils/calculatorUtils';
import {
  activeRemote,
  battleGags,
  remoteStats,
  trackOrder,
  type Action,
  type BattleState,
  type BoilerState,
  type CogState,
} from './model';

type GagAction = Extract<Action, { kind: 'gag' }>;

const boilerTracks: GagTrack[] = ['Sound', 'Throw', 'Squirt'];
const roundTracks = trackOrder.filter(
  (track) => track !== 'Toonup' && track !== 'Trap',
);
const singleTargetTracks: GagTrack[] = ['Throw', 'Squirt'];

export function canHitBoiler(gag: GagInfo) {
  return boilerTracks.includes(gag.track);
}

function advanceBoiler(boiler: BoilerState): BoilerState {
  const ordinance =
    boiler.ordinance && boiler.ordinance.turns > 1
      ? { ...boiler.ordinance, turns: boiler.ordinance.turns - 1 }
      : undefined;
  if (boiler.tier === 4 && boiler.hp <= 2475) {
    return { ...boiler, ordinance, phase: 'Meltdown', turns: 1 };
  }
  if (boiler.phase === 'Meltdown' || boiler.turns > 1) {
    return { ...boiler, ordinance, turns: Math.max(1, boiler.turns - 1) };
  }
  return {
    ...boiler,
    ordinance,
    phase: boiler.phase === 'Fired Up' ? 'Defensive' : 'Fired Up',
    turns: 3,
  };
}

function strike(cog: CogState, damage: number) {
  cog.hp = Math.max(0, cog.hp - damage);
  cog.lure = 0;
  if (!cog.hp) cog.trap = undefined;
}

function chance(base: number, level: number, bonus: number) {
  return (
    Math.min(95, Math.max(5, base + 60 + getTargetDefense(level) + bonus)) / 100
  );
}

export function resolveRound(
  state: BattleState,
  actions: Action[],
  commit = true,
  roll?: (odds: number) => boolean,
) {
  const cogs = state.cogs.map((cog) => ({ ...cog }));
  const toons = state.toons.map((toon) => ({
    ...toon,
    stock: commit ? [...toon.stock] : toon.stock,
    remotes: commit ? { ...toon.remotes } : toon.remotes,
    laff: toon.laff && { ...toon.laff },
  }));
  const boiler = state.boiler && { ...state.boiler };
  const gags = actions.flatMap((action) => {
    if (action.kind !== 'gag') return [];
    const base = battleGags[action.gag];
    const gag =
      state.toons[action.toon].organic === base.track
        ? { ...base, isOrganic: true }
        : base;
    if (commit) toons[action.toon].stock[action.gag]--;
    return [{ action, gag }];
  });
  let accuracy = 1;
  let damage = 0;
  let healing = 0;
  let useful = 0;
  const stuns = cogs.map(() => 0);
  const freshlyLured = new Set<number>();

  const heal = (toon: number, value: number) => {
    const laff = toons[toon].laff;
    if (!laff) return 0;
    const amount = Math.min(value, laff.max - laff.current);
    laff.current += amount;
    healing += amount;
    return amount;
  };
  const applyDamage = (cog: CogState, value: number) => {
    damage += Math.min(cog.hp, value);
    strike(cog, value);
  };

  for (const action of actions) {
    if (action.kind !== 'remote') continue;
    if (commit)
      toons[action.toon].remotes[action.remote] =
        (toons[action.toon].remotes[action.remote] ?? 0) - 1;
    const cog = cogs.find((target) => target.id === action.target);
    if (cog?.hp && !cog.remote) {
      cog.remote = activeRemote(action.remote);
      cog.lure = 0;
      useful++;
    }
  }

  for (const { action, gag } of gags) {
    if (gag.track === 'Toonup') {
      const odds = Math.min(95, gag.accuracy + 30) / 100;
      if (roll && !roll(odds)) continue;
      const allies = toons.flatMap((_, toon) =>
        toon !== action.toon ? [toon] : [],
      );
      const value = getGagDmg(gag);
      const amount =
        gag.affectsNum === 'All'
          ? allies.reduce(
              (total, toon) =>
                total + heal(toon, Math.floor(value / allies.length)),
              0,
            )
          : heal(action.target as number, value);
      if (amount > 0) {
        accuracy *= odds;
        useful++;
      }
    }
    if (gag.track !== 'Trap') continue;
    let placed = false;
    for (const cog of cogs) {
      if (
        cog.hp &&
        !cog.lure &&
        cog.trap === undefined &&
        (gag.affectsNum === 'All' || action.target === cog.id)
      ) {
        cog.trap = action.gag * 2 + Number(!!gag.isOrganic);
        placed = true;
      }
    }
    if (placed) useful++;
  }

  for (const track of roundTracks) {
    const hits = gags.filter(({ gag }) => gag.track === track);
    if (!hits.length) continue;
    const group = hits.filter(({ gag }) => gag.affectsNum === 'All');
    const active = cogs.filter(
      (cog) => cog.hp > 0 && (track !== 'Lure' || !cog.lure),
    );
    const trapped = active.filter((cog) => cog.trap !== undefined).length;
    const targets = cogs.flatMap((cog, index) => {
      if (
        !cog.hp ||
        (track === 'Lure' && cog.lure) ||
        (track === 'Drop' && cog.lure)
      )
        return [];
      const targeted = hits.filter(
        ({ action, gag }) =>
          gag.affectsNum === 'All' || action.target === cog.id,
      );
      if (!targeted.length) return [];
      const chosen = targeted.map(({ gag }) => gag);
      const base = Math.max(...chosen.map(getGagAccuracy));
      const bonus = Math.min(75, stuns[index]);
      const traps = group.length ? trapped : Number(cog.trap !== undefined);
      const odds =
        track === 'Lure'
          ? chance(
              base,
              cog.level,
              (traps ? 5 + traps * 5 : 0) + calculateLureComboBonus(chosen),
            )
          : cog.lure
            ? 1
            : chance(base, cog.level, bonus);
      return [{ cog, index, targeted, chosen, odds }];
    });

    const used = new Set<GagAction>();
    const groupOdds = group.length
      ? Math.min(1, ...targets.map(({ odds }) => odds))
      : 1;
    const groupHit = roll?.(groupOdds) ?? true;
    accuracy *= groupOdds;

    for (const { cog, index, targeted, chosen, odds } of targets) {
      if (!group.length) accuracy *= odds;
      const hit = group.length ? groupHit : (roll?.(odds) ?? true);
      if (!hit) continue;
      if (track === 'Lure') {
        if (cog.trap !== undefined) {
          const trap = battleGags[Math.floor(cog.trap / 2)];
          applyDamage(
            cog,
            getGagDmg({ ...trap, isOrganic: cog.trap % 2 === 1 }),
          );
          cog.trap = undefined;
          stuns[index] += 50;
        } else {
          cog.lure = Math.max(...chosen.map((gag) => gag.maxDmg ?? 1));
          freshlyLured.add(cog.id);
        }
      } else {
        const sum = chosen.reduce((total, gag) => total + getGagDmg(gag), 0);
        const groupBonus = chosen.length > 1 ? Math.ceil(sum / 5) : 0;
        const lureBonus =
          cog.lure && singleTargetTracks.includes(track)
            ? Math.ceil(sum / 2)
            : 0;
        applyDamage(cog, sum + groupBonus + lureBonus);
        stuns[index] += chosen.length * 25;
      }
      for (const { action } of targeted) used.add(action);
    }

    if (boiler?.hp && boilerTracks.includes(track)) {
      const bossHits = hits.filter(
        ({ action, gag }) =>
          action.target === 'boiler' || (groupHit && gag.affectsNum === 'All'),
      );
      if (bossHits.length) {
        const sum = bossHits.reduce(
          (total, { gag }) => total + getGagDmg(gag),
          0,
        );
        const combo = sum + (bossHits.length > 1 ? Math.ceil(sum / 5) : 0);
        const hit =
          boiler.phase === 'Fired Up' || boiler.phase === 'Meltdown'
            ? Math.ceil(combo * 1.5)
            : combo;
        damage += Math.min(boiler.hp, hit);
        boiler.hp = Math.max(0, boiler.hp - hit);
        for (const { action } of bossHits) used.add(action);
      }
    }
    useful += used.size;
    if (boiler && !boiler.hp) break;
  }

  const controlledThisRound = new Set<number>();
  for (const cog of cogs) {
    if ((boiler && !boiler.hp) || !cog.hp || !cog.remote) continue;
    controlledThisRound.add(cog.id);
    const { kind, tier, turns } = cog.remote;
    const stats = remoteStats[tier];
    if (kind === 'damage') {
      for (const other of cogs) {
        if (other.hp && other.id !== cog.id) applyDamage(other, stats.damage);
      }
    } else {
      toons.forEach((_, index) => heal(index, stats.heal));
    }
    if (turns <= 1) {
      applyDamage(cog, stats.expiry);
      cog.remote = undefined;
    } else {
      cog.remote = { ...cog.remote, turns: turns - 1 };
    }
  }

  let threats = 0;
  for (const cog of cogs) {
    if (!cog.hp && cog.layers === 2) {
      cog.hp = calculateCogHealth(cog.level);
      cog.layers = 1;
      cog.lure = 0;
    }
    if (
      (!boiler || boiler.hp) &&
      cog.hp &&
      !cog.lure &&
      !cog.remote &&
      !controlledThisRound.has(cog.id)
    )
      threats += 0.5 + cog.level / 12;
    if (!freshlyLured.has(cog.id)) cog.lure = Math.max(0, cog.lure - 1);
    if (!cog.hp) cog.remote = undefined;
  }
  const retaliation =
    state.boiler?.phase === 'Defensive' &&
    !!boiler?.hp &&
    boiler.hp < state.boiler.hp;

  return {
    after: { ...state, cogs, toons, boiler: boiler && advanceBoiler(boiler) },
    accuracy,
    damage,
    healing,
    threats,
    useful,
    retaliation,
  };
}
