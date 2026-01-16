import { range } from 'lodash-es';

import { GagTracks } from '../data/gagTracksInfo';
import type { CogStatus, GagInfo, GagTrackInfo, GagTrack } from '../types';

export function calculateMaxCogLevel(
  gags: GagInfo[],
  cogStatus: CogStatus = {},
) {
  const maxCogLevel = range(1, 21).find(
    (level) =>
      calculateTotalDamage(gags, { ...cogStatus, level }).totalDamage <
      calculateCogHealth(level),
  );

  return (maxCogLevel ?? 21) - 1;
}

// https://toontownrewritten.fandom.com/wiki/Health_of_Cogs
export function calculateCogHealth(lvl: number): number {
  if (lvl < 1) {
    throw new Error('Cog health cannot be calculated for level less than 1');
  }

  // Cogs lvl 1-11 have health of f(x) = (x + 1) * (x + 2)
  if (lvl < 12) {
    return (lvl + 1) * (lvl + 2);
  }

  // Cogs lvl 12+ have health of f(x) = (x + 1) * (x + 2) + 14
  return (lvl + 1) * (lvl + 2) + 14;
}

export function getGagDmg(gagInfo: GagInfo): number {
  const { maxDmg = 0, isOrganic, organicBonus = 0.1 } = gagInfo;

  const organicBonusValue = isOrganic
    ? Math.max(1, Math.ceil(maxDmg * organicBonus))
    : 0;

  return Math.max(1, maxDmg + organicBonusValue);
}

export function getGagAccuracy({
  accuracy,
  dmgType,
  isOrganic,
}: Pick<GagInfo, 'accuracy' | 'dmgType' | 'isOrganic'>): number {
  if (dmgType === 'Lure' && isOrganic) {
    return Math.min(95, accuracy + 10);
  }
  return accuracy;
}

// Tracks that contribute a +25% stun bonus per successful gag hit (capped at +75%)
const STUN_TRACKS: GagTrack[] = ['Sound', 'Throw', 'Squirt', 'Drop'];

const TARGET_DEFENSE: Record<number, number> = {
  1: -2,
  2: -5,
  3: -10,
  4: -12,
  5: -15,
  6: -25,
  7: -30,
  8: -35,
  9: -40,
  10: -45,
  11: -50,
  12: -55,
};

const DEFAULT_TARGET_DEFENSE = -65;

const DAMAGE_TRACKS: GagTrack[] = ['Sound', 'Throw', 'Squirt', 'Drop'];
const TRACK_ORDER = GagTracks.map((track) => track.name as GagTrack);

export function getTargetDefense(level: number): number {
  if (level <= 0) return 0;
  if (TARGET_DEFENSE[level] !== undefined) return TARGET_DEFENSE[level];
  if (level >= 13 && level <= 19) return -60;
  return DEFAULT_TARGET_DEFENSE;
}

function buildTrackExpMap(gags: GagInfo[]) {
  // Assumption (per user request): if a Toon has a track, they have max gags for it.
  // This means the trackExp bonus is treated as maxed for any track present.
  const tracksUsed = new Set<GagTrack>();
  for (const gag of gags) tracksUsed.add(gag.track);

  const expByTrack = new Map<GagTrack, number>();
  for (const track of tracksUsed) {
    let exp = 60;
    // Toon-Up accuracy uses half the normal trackExp bonus
    if (track === 'Toonup') exp = 30;
    expByTrack.set(track, exp);
  }
  return expByTrack;
}

function clampStunBonus(stunBonus: number) {
  return Math.min(75, stunBonus);
}

function applyAccuracyCaps(
  atkAcc: number,
  track: GagTrack,
  opts?: { dropOnLured?: boolean },
) {
  if (opts?.dropOnLured && track === 'Drop') return 0;
  if (atkAcc > 95) return 95;
  // Global 5% floor (Drop shares the same floor unless on a lured target)
  return Math.max(5, atkAcc);
}

export function calculateComboAccuracy(
  gags: GagInfo[],
  targetLevel: number | null = 1,
  options?: { initialLured?: boolean; targetHpOverride?: number | null },
): number {
  if (gags.length === 0) return 0;
  const trackUsage = new Map<GagTrack, GagInfo[]>();
  for (const gag of gags) {
    trackUsage.set(gag.track, [...(trackUsage.get(gag.track) ?? []), gag]);
  }

  const level = targetLevel ?? 1;
  const trackExpByTrack = buildTrackExpMap(gags);
  const initialLured = !!options?.initialLured;
  const hp = (options?.targetHpOverride ?? null) !== null && Number.isFinite(Number(options?.targetHpOverride))
    ? Math.max(0, Math.floor(Number(options?.targetHpOverride)))
    : calculateCogHealth(level);

  // Only one Trap can be active on a target; extra Trap gags are redundant.
  const trapGags = (trackUsage.get('Trap') ?? []).slice(0, 1);
  const lureGags = trackUsage.get('Lure') ?? [];
  const orderedTracks = TRACK_ORDER.filter(
    (track) =>
      trackUsage.has(track) &&
      track !== 'Trap' &&
      track !== 'Toonup',
  );

  let totalProb = 0;

  const recurse = (
    idx: number,
    state: {
      stunBonus: number;
      luredActive: boolean;
    },
    prob: number,
    hitGags: GagInfo[],
  ) => {
    if (prob === 0) return;
    if (idx >= orderedTracks.length) {
      const totalDamage = calculateTotalDamage(hitGags, { lured: initialLured }).totalDamage;
      if (totalDamage >= hp) {
        totalProb += prob;
      }
      return;
    }

    const track = orderedTracks[idx];
    const trackGags = trackUsage.get(track) ?? [];

    let hitProb = 0;
    let onHitState = { ...state };
    let onHitGags = hitGags;

    if (track === 'Lure') {
      // If the target is already lured at the start of the round, Lure gags do not affect KO probability.
      if (state.luredActive) {
        hitProb = 1;
        onHitState = { ...state };
        onHitGags = [...hitGags, ...lureGags];
      } else {
        hitProb = calculateLureHitChance(
          lureGags,
          trapGags.length,
          level,
          trackExpByTrack.get('Lure') ?? 0,
          state.stunBonus,
        );
      }
      if (hitProb > 0) {
        if (state.luredActive) {
          // Already lured => ignore trap interaction and keep lure active until first damage track.
          onHitState.luredActive = true;
          onHitGags = [...hitGags, ...lureGags];
        } else if (trapGags.length > 0) {
          // Trap activation grants +50% stun bonus (v4.0.5)
          onHitState.stunBonus = clampStunBonus(onHitState.stunBonus + 50);
          onHitState.luredActive = false;
          onHitGags = [...hitGags, ...lureGags, ...trapGags];
        } else {
          onHitState.luredActive = true;
          onHitGags = [...hitGags, ...lureGags];
        }
      }
    } else {
      // Lured cogs: Throw/Squirt/Sound auto-hit, Drop always misses
      if (state.luredActive && (track === 'Throw' || track === 'Squirt' || track === 'Sound')) {
        hitProb = 1;
        onHitState.luredActive = false;
      } else if (state.luredActive && track === 'Drop') {
        hitProb = 0;
      } else {
        const baseAcc = trackGags.reduce(
          (acc, gag) => Math.max(acc, getGagAccuracy(gag)),
          0,
        );
        // Same-track gags share the same accuracy roll; all hit or all miss together
        hitProb = calculateTrackHitChance(
          baseAcc,
          level,
          trackExpByTrack.get(track) ?? 0,
          state.stunBonus,
          track,
          state.luredActive,
        );
      }

      if (hitProb > 0) {
        onHitGags = [...hitGags, ...trackGags];
        if (STUN_TRACKS.includes(track)) {
          const hitsFromTrack = trackGags.length;
          onHitState.stunBonus = clampStunBonus(onHitState.stunBonus + hitsFromTrack * 25);
        }

        // Successful damage hits end lure for that round
        if (state.luredActive && DAMAGE_TRACKS.includes(track)) {
          onHitState.luredActive = false;
        }
      }
    }

    // Hit branch
    recurse(idx + 1, onHitState, prob * hitProb, onHitGags);
    // Miss branch
    recurse(
      idx + 1,
      { ...state },
      prob * (1 - hitProb),
      hitGags,
    );
  };

  recurse(
    0,
    { stunBonus: 0, luredActive: initialLured },
    1,
    [],
  );
  return Number.isFinite(totalProb) ? totalProb : 0;
}

// Human-readable explanation of the KO probability calculation for a single target.
// Intended for UI tooltips/debugging.
export function explainComboAccuracy(
  gags: GagInfo[],
  targetLevel: number | null = 1,
  options?: { initialLured?: boolean; targetHpOverride?: number | null },
): string {
  if (gags.length === 0) return 'No gags selected.';

  const level = targetLevel ?? 1;
  const initialLured = !!options?.initialLured;
  const hp =
    (options?.targetHpOverride ?? null) !== null && Number.isFinite(Number(options?.targetHpOverride))
      ? Math.max(1, Math.floor(Number(options?.targetHpOverride)))
      : calculateCogHealth(level);
  const defense = getTargetDefense(level);

  const trackUsage = new Map<GagTrack, GagInfo[]>();
  for (const gag of gags) {
    trackUsage.set(gag.track, [...(trackUsage.get(gag.track) ?? []), gag]);
  }

  // Only one Trap can be active on a target; extra Trap gags are redundant.
  const trapGags = (trackUsage.get('Trap') ?? []).slice(0, 1);
  const lureGags = trackUsage.get('Lure') ?? [];

  const trackExpByTrack = buildTrackExpMap(gags);
  const orderedTracks = TRACK_ORDER.filter(
    (track) => trackUsage.has(track) && track !== 'Trap' && track !== 'Toonup',
  );

  const lines: string[] = [];
  lines.push(`Target level: ${level} (HP ${hp}, defense ${defense})`);
  lines.push(`Initial status: ${initialLured ? 'Already lured' : 'Not lured'}`);
  lines.push(`Tracks resolved: ${orderedTracks.join(' -> ') || '(none)'}`);
  lines.push('Rules summary:');
  lines.push('- Same track + same target: all gags in that track either hit or miss together.');
  lines.push('- Stun: each hit from Throw/Squirt/Sound adds +25 accuracy (capped at +75). Trap activation adds +50.');
  lines.push('- Lured target: Throw/Squirt/Sound auto-hit; Drop auto-miss; first successful damage ends lure.');
  if (trapGags.length) lines.push('- Trap triggers only if Lure hits (Trap itself is not an accuracy roll).');
  if ((options?.targetHpOverride ?? null) !== null) lines.push('- KO check uses Remaining HP override.');

  let totalProb = 0;
  let printedLeaves = 0;
  const MAX_LINES = 100;

  const describeTrackHitChance = (
    track: GagTrack,
    state: { stunBonus: number; luredActive: boolean },
  ): { p: number; desc: string } => {
    if (track === 'Lure') {
      if (state.luredActive) return { p: 1, desc: 'Lure: target already lured => treated as no-op (100%)' };

      const baseAcc = lureGags.reduce((acc, gag) => Math.max(acc, getGagAccuracy(gag)), 0);
      // Trap bonus: +10% base, +5% per extra trap (v4.0.5)
      const trapBonus = trapGags.length > 0 ? 10 + Math.max(0, trapGags.length - 1) * 5 : 0;
      const lureComboBonus = calculateLureComboBonus(lureGags);
      const exp = trackExpByTrack.get('Lure') ?? 0;
      const atkAcc = applyAccuracyCaps(
        baseAcc + exp + defense + trapBonus + lureComboBonus + state.stunBonus,
        'Lure',
      );
      const p = atkAcc / 100;
      return {
        p,
        desc: `Lure hit% = cap(base ${baseAcc} + exp ${exp} + def ${defense} + trapBonus ${trapBonus} + lureCombo ${lureComboBonus} + stun ${state.stunBonus}) = ${atkAcc}%`,
      };
    }

    if (state.luredActive && (track === 'Throw' || track === 'Squirt' || track === 'Sound')) {
      return { p: 1, desc: `${track}: target is lured => auto-hit (100%)` };
    }
    if (state.luredActive && track === 'Drop') {
      return { p: 0, desc: 'Drop: target is lured => auto-miss (0%)' };
    }

    const trackGags = trackUsage.get(track) ?? [];
    const baseAcc = trackGags.reduce((acc, gag) => Math.max(acc, getGagAccuracy(gag)), 0);
    const exp = trackExpByTrack.get(track) ?? 0;
    const atkAcc = applyAccuracyCaps(baseAcc + exp + defense + state.stunBonus, track);
    const p = atkAcc / 100;
    return {
      p,
      desc: `${track} hit% = cap(base ${baseAcc} + exp ${exp} + def ${defense} + stun ${state.stunBonus}) = ${atkAcc}%`,
    };
  };

  const recurse = (
    idx: number,
    state: { stunBonus: number; luredActive: boolean },
    prob: number,
    hitGags: GagInfo[],
    indent: string,
  ) => {
    if (prob === 0) return;
    if (lines.length >= MAX_LINES) return;

    if (idx >= orderedTracks.length) {
      const dmg = calculateTotalDamage(hitGags, { lured: initialLured }).totalDamage;
      const ko = dmg >= hp;
      if (ko) totalProb += prob;
      if (printedLeaves < 20) {
        printedLeaves += 1;
        lines.push(
          `${indent}Leaf: damage ${dmg} ${ko ? '>=' : '<'} HP ${hp} => ${ko ? 'KO ✓' : 'no KO'} (branch p=${(
            prob * 100
          ).toFixed(2)}%)`,
        );
      }
      return;
    }

    const track = orderedTracks[idx];
    const trackGags = trackUsage.get(track) ?? [];
    const { p: hitProb, desc } = describeTrackHitChance(track, state);

    const onHitState = { ...state };
    let onHitGags = hitGags;

    if (track === 'Lure') {
      if (hitProb > 0) {
        // Already lured => no-op.
        if (state.luredActive) {
          onHitState.luredActive = true;
          onHitGags = [...hitGags, ...lureGags];
        } else if (trapGags.length > 0) {
          // Lure hits + there is a trap => apply trap (as "hit") and stop lure for the round
          // Trap activation grants +50% stun bonus (v4.0.5)
          onHitState.stunBonus = clampStunBonus(onHitState.stunBonus + 50);
          onHitState.luredActive = false;
          onHitGags = [...hitGags, ...lureGags, ...trapGags];
        } else {
          onHitState.luredActive = true;
          onHitGags = [...hitGags, ...lureGags];
        }
      }
    } else if (hitProb > 0) {
      onHitGags = [...hitGags, ...trackGags];
      if (STUN_TRACKS.includes(track)) {
        onHitState.stunBonus = clampStunBonus(onHitState.stunBonus + trackGags.length * 25);
      }
      if (state.luredActive && DAMAGE_TRACKS.includes(track)) {
        onHitState.luredActive = false;
      }
      if (state.luredActive && (track === 'Throw' || track === 'Squirt' || track === 'Sound')) {
        onHitState.luredActive = false;
      }
    }

    lines.push(`${indent}${desc}`);
    lines.push(`${indent}↳ Hit branch: p=${(hitProb * 100).toFixed(1)}%`);
    recurse(idx + 1, onHitState, prob * hitProb, onHitGags, indent + '  ');
    lines.push(`${indent}↳ Miss branch: p=${((1 - hitProb) * 100).toFixed(1)}%`);
    recurse(idx + 1, { ...state }, prob * (1 - hitProb), hitGags, indent + '  ');
  };

  recurse(0, { stunBonus: 0, luredActive: initialLured }, 1, [], '');

  const exact = calculateComboAccuracy(gags, level, options);
  lines.unshift(`One-turn KO probability: ${(exact * 100).toFixed(2)}%`);
  return lines.join('\n');
}
function calculateGagAtkAcc(
  gag: GagInfo,
  targetLevel: number,
  trackExp: number,
): number {
  if (gag.track === 'Trap') return 1;
  const propAcc = getGagAccuracy(gag);
  const targetDefense = getTargetDefense(targetLevel);
  const atkAcc = applyAccuracyCaps(propAcc + trackExp + targetDefense, gag.track);
  return atkAcc / 100;
}

function calculateLureHitChance(
  lureGags: GagInfo[],
  trapCount: number,
  targetLevel: number,
  trackExp: number,
  stunBonus: number,
): number {
  if (lureGags.length === 0) return 0;
  const baseAcc = lureGags.reduce(
    (acc, gag) => Math.max(acc, getGagAccuracy(gag)),
    0,
  );
  // Trap bonus: +10% base, +5% per extra trap (v4.0.5)
  const trapBonus = trapCount > 0 ? 10 + Math.max(0, trapCount - 1) * 5 : 0;
  const lureComboBonus = calculateLureComboBonus(lureGags);
  const atkAcc = applyAccuracyCaps(
    baseAcc +
    trackExp +
    getTargetDefense(targetLevel) +
    trapBonus +
    lureComboBonus +
    stunBonus,
    'Lure',
  );
  return atkAcc / 100;
}

function calculateLureComboBonus(lureGags: GagInfo[]) {
  if (lureGags.length <= 1) return 0;
  const grouped: Record<GagInfo['affectsNum'], GagInfo[]> = {
    All: [],
    Single: [],
  };
  for (const gag of lureGags) {
    grouped[gag.affectsNum].push(gag);
  }

  let bonus = 0;
  for (const group of Object.values(grouped)) {
    if (group.length <= 1) continue;
    const sorted = [...group].sort((a, b) => b.level - a.level);
    const highest = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const diff = Math.max(0, highest.level - sorted[i].level);
      bonus += Math.max(10, 20 - diff * 5);
    }
  }
  return bonus;
}

function calculateTrackHitChance(
  baseAcc: number,
  targetLevel: number,
  trackExp: number,
  stunBonus: number,
  track: GagTrack,
  luredActive: boolean,
): number {
  const atkAcc = applyAccuracyCaps(
    baseAcc + trackExp + getTargetDefense(targetLevel) + stunBonus,
    track,
    { dropOnLured: luredActive && track === 'Drop' },
  );
  return atkAcc / 100;
}

export interface DamageResult {
  baseDamage: number;
  groupBonus: number;
  lureBonus: number;
  totalDamage: number;
}

function getTrackGagDamage(
  track: GagTrackInfo,
  gag: GagInfo,
  cogStatus: CogStatus,
): [number, CogStatus] {
  // If the current gag is a trap, save it for lure later.
  // If the target is already lured at the start of the round, Trap can't be placed/triggered here
  // (and in our UI we generally avoid recommending Trap when "Already lured" is enabled).
  if (track.name === 'Trap') {
    if (cogStatus.lured) return [0, cogStatus];
    // Set the cog status to trapped using the first trap gag, ignoring the rest
    return [0, { ...cogStatus, trapGag: cogStatus.trapGag ?? gag }];
  }

  // Drop does no damage when the cog is lured
  if (track.name === 'Drop' && cogStatus.lured) {
    return [0, cogStatus];
  }

  if (track.dmgType === 'Damage') {
    return [getGagDmg(gag), cogStatus];
  }

  if (track.dmgType === 'Lure') {
    // If the target is already lured, extra Lure is treated as a no-op here.
    // (It should not trigger Trap, and it should not change the lured state.)
    if (cogStatus.lured) return [0, cogStatus];

    // If there is a previous trap gag, apply the trap damage and do not set the cog status to lured
    if (cogStatus.trapGag) {
      const dmg = getGagDmg(cogStatus.trapGag);
      return [dmg, { ...cogStatus, trapGag: undefined }];
    }

    return [0, { ...cogStatus, lured: true }];
  }

  return [0, cogStatus];
}

export function calculateTotalDamage(
  gags: GagInfo[],
  initialCogStatus: CogStatus = {},
): DamageResult {
  let baseDamage = 0;
  let groupBonus = 0;
  let lureBonus = 0;

  let cogStatus: CogStatus = { ...initialCogStatus };

  // Get a list of the gag tracks that are used and sort them by track order
  const gagTracks = [...new Set(gags.map((gag) => gag.track))].sort(
    (a, b) => TRACK_ORDER.indexOf(a) - TRACK_ORDER.indexOf(b),
  );

  // For each of the currently used gag tracks, calculate the total damage
  for (const gagTrack of gagTracks) {
    // Get the gags of the current track
    const trackGags = gags.filter((gag) => gag.track === gagTrack);

    // Get the relevant track info
    const gagTrackInfo = GagTracks.find((track) => track.name === gagTrack);
    if (!gagTrackInfo) throw new Error(`Gag track ${gagTrack} not found`);

    let trackBaseDamage = 0;

    for (const gag of trackGags) {
      const [gagDamage, newCogStatus] = getTrackGagDamage(
        gagTrackInfo,
        gag,
        cogStatus,
      );
      trackBaseDamage += gagDamage;
      cogStatus = newCogStatus;
    }

    if (
      cogStatus.lured &&
      gagTrackInfo.dmgType === 'Damage' &&
      trackBaseDamage > 0
    ) {
      cogStatus.lured = false;
      // Lure bonus applies to all damage types except sound
      if (gagTrack !== 'Sound') lureBonus = Math.ceil(trackBaseDamage / 2);
    }

    // Group bonus only applies when multiple gags are used together
    if (trackGags.filter((g) => g.track !== 'Lure').length > 1) {
      groupBonus += Math.ceil(trackBaseDamage / 5);
    }

    baseDamage += trackBaseDamage;
  }
  return {
    baseDamage,
    groupBonus,
    lureBonus,
    totalDamage: baseDamage + groupBonus + lureBonus,
  };
}
