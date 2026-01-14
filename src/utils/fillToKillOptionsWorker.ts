import type { GagInfo, GagTrack } from '../types';
import {
  calculateCogHealth,
  calculateComboAccuracy,
  calculateTotalDamage,
} from './calculatorUtils';
import { DEFAULT_GAG_CONSERVE_WEIGHTS } from './defaultSettings';

export type ToonRestriction =
  | 'none'
  | 'toonup-less'
  | 'trapless'
  | 'lureless'
  | 'soundless'
  | 'dropless';

export type SortMode = 'accuracy' | 'conserve' | 'weighted';

export type SortWeights = {
  accuracy: number;
  conserve: number;
  tracks: number;
};

// Per-gag "importance to retain" weights for the Levels portion of Weighted sort.
// Key format: `${track}:${level}:${name}` (e.g. "Throw:5:Whole Cream Pie").
// Range: 0..1 where 1 = strongly conserve (penalize using) and 0 = freely spend.
export type GagConserveWeights = Partial<Record<string, number>>;

export interface FillToKillRequest {
  targetLevel: number;
  // If true, treat target as already lured at start of the round (no need to Lure/Trap).
  isTargetAlreadyLured?: boolean;
  // Optional remaining HP override for KO calculations.
  targetHpOverride?: number | null;
  currentGags: GagInfo[];
  availableGags: GagInfo[];
  maxToons: number;

  // Optional shape — older callers or alternate message shapes may nest toggles
  excludeLevels?: {
    low1to3: boolean;
    level7: boolean;
    // Back-compat: treat as "exclude level 6 for all tracks" when true
    level6?: boolean;
    // New: per-track level 6 exclusion
    level6ByTrack?: Partial<Record<GagTrack, boolean>>;
  };

  enabledTracks?: Record<GagTrack, boolean>;
  preferAccuracy?: boolean;
  sortMode?: SortMode;
  sortWeights?: Partial<SortWeights>;
  gagConserveWeights?: GagConserveWeights;
  hideOverkillAdditions?: boolean;
  maxResults?: number;
  maxGenerated?: number; // soft cap on number of successful kill options generated

  // Per-toon limitations (one missing track per toon)
  toonRestrictions?: ToonRestriction[];

  // Some callers send a `toggles` object instead of top-level fields
  toggles?: any;
}

export interface FillToKillOption {
  addedGags: GagInfo[];
  totalDamage: number;
  overkill: number;
  accuracy: number;
}

function isLevelExcluded(
  level: number,
  track: GagTrack,
  exclude?: FillToKillRequest['excludeLevels'],
) {
  if (!exclude) return false;
  if (exclude.level7 && level === 7) return true;
  if (
    level === 6 &&
    ((exclude.level6 ?? false) || (exclude.level6ByTrack?.[track] ?? false))
  ) {
    return true;
  }
  if (exclude.low1to3 && level >= 1 && level <= 3) return true;
  return false;
}

function maxGagLevel(gags: GagInfo[]) {
  return gags.reduce((max, g) => Math.max(max, g.level), 0);
}

function totalGagLevels(gags: GagInfo[]) {
  return gags.reduce((sum, g) => sum + g.level, 0);
}

// NOTE: Each Toon has their own gag inventory. When we say "conserve levels", we generally
// don't want the score to be purely additive across all toons/actions (e.g., 4 lower gags can
// be better than 2 high gags). So we use average level as the secondary tiebreaker.
function avgGagLevel(gags: GagInfo[]) {
  if (gags.length === 0) return 0;
  return totalGagLevels(gags) / gags.length;
}

function compareOptions(
  a: FillToKillOption,
  b: FillToKillOption,
  preferAccuracy: boolean,
) {
  const maxLevelA = maxGagLevel(a.addedGags);
  const maxLevelB = maxGagLevel(b.addedGags);
  const avgLevelsA = avgGagLevel(a.addedGags);
  const avgLevelsB = avgGagLevel(b.addedGags);

  if (preferAccuracy) {
    // Higher accuracy first
    if (a.accuracy !== b.accuracy) return b.accuracy - a.accuracy;
    // Then prefer lower highest-level gag used
    if (maxLevelA !== maxLevelB) return maxLevelA - maxLevelB;
    // Then prefer lower average gag level used
    if (avgLevelsA !== avgLevelsB) return avgLevelsA - avgLevelsB;
  } else {
    // Prioritize conserving high-level gags (highest level used)
    if (maxLevelA !== maxLevelB) return maxLevelA - maxLevelB;
    // Then prefer lower average gag level used
    if (avgLevelsA !== avgLevelsB) return avgLevelsA - avgLevelsB;
  }

  // Then higher accuracy
  if (a.accuracy !== b.accuracy) return b.accuracy - a.accuracy;
  // Then less overkill
  if (a.overkill !== b.overkill) return a.overkill - b.overkill;
  // Stable-ish tie-breaker
  return a.totalDamage - b.totalDamage;
}


type WeightedMetrics = {
  levelMetric: number; // lower is better
  trackCount: number; // lower is better
};

const DEFAULT_SORT_WEIGHTS: SortWeights = { accuracy: 1, conserve: 1, tracks: 1 };

function normalizeSortWeights(req: FillToKillRequest): SortWeights {
  const toggles = (req as any).toggles ?? {};

  const initialLured = !!(req.isTargetAlreadyLured ?? toggles.isTargetAlreadyLured);
  const raw = (req as any).sortWeights ?? toggles.sortWeights ?? {};
  const merged = { ...DEFAULT_SORT_WEIGHTS, ...raw } as any;
  const clean = (v: any, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, n) : fallback;
  };
  return {
    accuracy: clean(merged.accuracy, DEFAULT_SORT_WEIGHTS.accuracy),
    conserve: clean(merged.conserve, DEFAULT_SORT_WEIGHTS.conserve),
    tracks: clean(merged.tracks, DEFAULT_SORT_WEIGHTS.tracks),
  };
}


function normalizeSortMode(req: FillToKillRequest, preferAccuracy: boolean): SortMode {
  const toggles = (req as any).toggles ?? {};

  const initialLured = !!(req.isTargetAlreadyLured ?? toggles.isTargetAlreadyLured);
  const raw = (req as any).sortMode ?? toggles.sortMode;
  if (raw === 'accuracy' || raw === 'conserve' || raw === 'weighted') return raw;
  return preferAccuracy ? 'accuracy' : 'conserve';
}

function clamp01(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function defaultRetainWeightForTrack(track: GagTrack): number {
  // Preset: conserve Throw/Squirt most, Sound next, Lure moderate, Drop/Trap low.
  switch (track) {
    case 'Throw':
    case 'Squirt':
      return 1.0;
    case 'Sound':
      return 0.7;
    case 'Lure':
      return 0.5;
    case 'Toonup':
      return 0.5;
    case 'Drop':
    case 'Trap':
      return 0.2;
    default:
      return 0.5;
  }
}

function computeWeightedMetrics(
  current: GagInfo[],
  opt: FillToKillOption,
  gagWeights: GagConserveWeights,
): WeightedMetrics {
  const added = opt.addedGags;

  // Per-gag retain importance (0..1) -> "effective level" cost.
  // This is *only* used for the Levels portion of Weighted sort.
  let maxEff = 0;
  let sumEff = 0;
  for (const g of added) {
    const key = `${g.track}:${g.level}:${g.name}`;
    const wRaw = gagWeights[key];
    const w = Number.isFinite(wRaw) ? clamp01(Number(wRaw)) : clamp01(Number(DEFAULT_GAG_CONSERVE_WEIGHTS[key] ?? 0.5));
    const eff = g.level * w;
    if (eff > maxEff) maxEff = eff;
    sumEff += eff;
  }

  // Average (effective) level spent per action/toon.
  // This prevents "fewer gags" from always dominating even if they require higher-level gags.
  const avgEff = added.length ? sumEff / added.length : 0;

  // Keep behavior close to existing "conserve gags" tiebreakers:
  // - max (effective) level matters most
  // - then average (effective) levels matters next
  const levelMetric = maxEff * 10 + avgEff;

  const tracks = new Set<string>();
  for (const g of current) tracks.add(g.track);
  for (const g of added) tracks.add(g.track);
  const trackCount = tracks.size;

  return { levelMetric, trackCount };
}

function normalize01(value: number, min: number, max: number) {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) return 0;
  if (max <= min) return 1;
  return (value - min) / (max - min);
}

function sortOptionsWeighted(
  options: FillToKillOption[],
  currentGags: GagInfo[],
  weights: SortWeights,
  gagWeights: GagConserveWeights,
) {
  const metrics = options.map((o) => computeWeightedMetrics(currentGags, o, gagWeights));
  const levelMin = Math.min(...metrics.map((m) => m.levelMetric));
  const levelMax = Math.max(...metrics.map((m) => m.levelMetric));
  const trackMin = Math.min(...metrics.map((m) => m.trackCount));
  const trackMax = Math.max(...metrics.map((m) => m.trackCount));

  const scoreAt = (idx: number) => {
    const opt = options[idx];
    const m = metrics[idx];

    const accScore = Math.max(0, Math.min(1, opt.accuracy));
    const conserveScore = 1 - normalize01(m.levelMetric, levelMin, levelMax);
    const trackScore = 1 - normalize01(m.trackCount, trackMin, trackMax);

    return (
      weights.accuracy * accScore +
      weights.conserve * conserveScore +
      weights.tracks * trackScore
    );
  };

  const idxs = options.map((_, i) => i);
  idxs.sort((ia, ib) => {
    const sa = scoreAt(ia);
    const sb = scoreAt(ib);
    if (sa !== sb) return sb - sa;

    // Tie-breakers: higher accuracy, then lower level metric, then fewer tracks
    const a = options[ia];
    const b = options[ib];
    if (a.accuracy !== b.accuracy) return b.accuracy - a.accuracy;

    const ma = metrics[ia];
    const mb = metrics[ib];
    if (ma.levelMetric !== mb.levelMetric) return ma.levelMetric - mb.levelMetric;
    if (ma.trackCount !== mb.trackCount) return ma.trackCount - mb.trackCount;

    if (a.overkill !== b.overkill) return a.overkill - b.overkill;
    return a.totalDamage - b.totalDamage;
  });

  return idxs.map((i) => options[i]);
}



function normalizeGenerationCap(req: FillToKillRequest): number {
  const toggles = (req as any).toggles ?? {};

  const initialLured = !!(req.isTargetAlreadyLured ?? toggles.isTargetAlreadyLured);
  const maxResultsCap = req.maxResults ?? toggles.maxResults ?? 12;
  const raw = (req as any).maxGenerated ?? toggles.maxGenerated ?? maxResultsCap * 30;
  const n = Number(raw);
  if (!Number.isFinite(n)) return maxResultsCap * 30;
  // Clamp to keep runtime sane on mobile; user can increase but we cap hard.
  const clamped = Math.max(50, Math.min(50000, Math.floor(n)));
  return clamped;
}

function normalizeToonRestrictions(req: FillToKillRequest): ToonRestriction[] {
  const incoming: ToonRestriction[] =
    (req.toonRestrictions ?? req.toggles?.toonRestrictions ?? []) as ToonRestriction[];
  const out: ToonRestriction[] = [];
  for (let i = 0; i < req.maxToons; i++) {
    out.push(incoming[i] ?? 'none');
  }
  return out;
}

function toonAllows(track: GagTrack, restriction: ToonRestriction): boolean {
  // Per user requirement: all toons always have Throw + Squirt.
  if (track === 'Throw' || track === 'Squirt') return true;

  switch (restriction) {
    case 'toonup-less':
      return track !== 'Toonup';
    case 'trapless':
      return track !== 'Trap';
    case 'lureless':
      return track !== 'Lure';
    case 'soundless':
      return track !== 'Sound';
    case 'dropless':
      return track !== 'Drop';
    case 'none':
    default:
      return true;
  }
}

function buildTrackCapacity(restrictions: ToonRestriction[], enabledTracks?: Record<GagTrack, boolean>) {
  const capacity: Record<GagTrack, number> = {
    Toonup: 0,
    Trap: 0,
    Lure: 0,
    Sound: 0,
    Throw: 0,
    Squirt: 0,
    Drop: 0,
  };

  const tracks = Object.keys(capacity) as GagTrack[];
  for (const t of tracks) {
    const enabled = enabledTracks ? enabledTracks[t] !== false : true;
    if (!enabled) {
      capacity[t] = 0;
      continue;
    }
    let count = 0;
    for (const r of restrictions) {
      if (toonAllows(t, r)) count += 1;
    }
    capacity[t] = count;
  }

  // Single-target rule: only one trap can be placed on a Cog.
  capacity.Trap = Math.min(capacity.Trap, 1);
  return capacity;
}

function canAssignGagsToToons(
  allGags: GagInfo[],
  restrictions: ToonRestriction[],
): boolean {
  if (allGags.length > restrictions.length) return false;

  // Tiny problem size (<=4): exact backtracking with bitmask.
  const tracks = allGags.map((g) => g.track as GagTrack);

  function dfs(i: number, usedMask: number): boolean {
    if (i >= tracks.length) return true;
    const tr = tracks[i];
    for (let toon = 0; toon < restrictions.length; toon++) {
      if (usedMask & (1 << toon)) continue;
      if (!toonAllows(tr, restrictions[toon])) continue;
      if (dfs(i + 1, usedMask | (1 << toon))) return true;
    }
    return false;
  }

  // Heuristic: assign most constrained first to prune
  const order = tracks
    .map((tr, idx) => ({ tr, idx }))
    .sort((a, b) => {
      const aChoices = restrictions.filter((r) => toonAllows(a.tr, r)).length;
      const bChoices = restrictions.filter((r) => toonAllows(b.tr, r)).length;
      return aChoices - bChoices;
    })
    .map((x) => x.idx);

  const ordered = order.map((idx) => tracks[idx]);

  function dfsOrdered(i: number, usedMask: number): boolean {
    if (i >= ordered.length) return true;
    const tr = ordered[i];
    for (let toon = 0; toon < restrictions.length; toon++) {
      if (usedMask & (1 << toon)) continue;
      if (!toonAllows(tr, restrictions[toon])) continue;
      if (dfsOrdered(i + 1, usedMask | (1 << toon))) return true;
    }
    return false;
  }

  return dfsOrdered(0, 0);
}

function trackCountKey(gags: GagInfo[]) {
  const counts: Partial<Record<GagTrack, number>> = {};
  for (const g of gags) {
    counts[g.track] = (counts[g.track] ?? 0) + 1;
  }
  const tracks: GagTrack[] = ['Lure', 'Trap', 'Sound', 'Throw', 'Squirt', 'Drop', 'Toonup'];
  return tracks
    .filter((t) => (counts[t] ?? 0) > 0)
    .map((t) => `${t}:${counts[t]}`)
    .join('|');
}

function bestOfEquivalent(a: FillToKillOption, b: FillToKillOption): FillToKillOption {
  // Choose the one that "conserves" gags better among equivalent OHKO% + track composition.
  const maxA = maxGagLevel(a.addedGags);
  const maxB = maxGagLevel(b.addedGags);
  if (maxA !== maxB) return maxA < maxB ? a : b;

  const sumA = totalGagLevels(a.addedGags);
  const sumB = totalGagLevels(b.addedGags);
  if (sumA !== sumB) return sumA < sumB ? a : b;

  if (a.overkill !== b.overkill) return a.overkill < b.overkill ? a : b;
  if (a.totalDamage !== b.totalDamage) return a.totalDamage < b.totalDamage ? a : b;
  // Default stable
  return a;
}

function filterEquivalentOverkill(options: FillToKillOption[]): FillToKillOption[] {
  // User-defined: only remove options that have the SAME
  // - number of added gags
  // - track composition
  // - one-turn KO chance (to 0.1% as displayed)
  // keeping the one that uses lower-level gags.
  const map = new Map<string, FillToKillOption>();
  for (const opt of options) {
    const accKey = Math.round(opt.accuracy * 1000); // 0.1% bins in probability space
    const key = `${opt.addedGags.length}|${trackCountKey(opt.addedGags)}|${accKey}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, opt);
      continue;
    }
    map.set(key, bestOfEquivalent(prev, opt));
  }
  return [...map.values()];
}

function filterNoAccuracyGainWithMoreGags(options: FillToKillOption[]): FillToKillOption[] {
  // Additional user requirement:
  // If adding more gags does NOT improve the displayed one-turn KO chance,
  // do not show those longer combos.
  //
  // Implementation: for each displayed accuracy bucket (0.1% bins), keep only
  // the options that use the MINIMUM number of added gags.
  const minLenByAcc = new Map<number, number>();
  for (const opt of options) {
    const accKey = Math.round(opt.accuracy * 1000); // 0.1% bins
    const len = opt.addedGags.length;
    const prev = minLenByAcc.get(accKey);
    if (prev === undefined || len < prev) minLenByAcc.set(accKey, len);
  }

  return options.filter((opt) => {
    const accKey = Math.round(opt.accuracy * 1000);
    return opt.addedGags.length === (minLenByAcc.get(accKey) ?? opt.addedGags.length);
  });
}


function filterSupersetsWithNoDisplayedAccuracyGain(options: FillToKillOption[]): FillToKillOption[] {
  // Core intent:
  //   If a combo is just another combo + extra gag(s), and it does NOT improve the
  //   displayed one-turn KO chance (0.1% bins), hide it.
  //
  // This is *subset/superset* based (multiset of added gags), not purely by length.
  // That keeps legitimate tradeoffs like "more low-level gags" vs "fewer high-level gags".
  const accKey = (opt: FillToKillOption) => Math.round(opt.accuracy * 1000); // 0.1% bins

  // Map exact added gag multiset -> displayed accuracy bucket
  const byKey = new Map<string, number>();
  for (const opt of options) {
    const key = formatExactKey(opt.addedGags);
    byKey.set(key, accKey(opt));
  }
  // We'll create subset keys using a stable per-gag key list, then convert to formatExactKey-like signature.
  function gagKey(g: GagInfo): string {
    return `${g.track}:${g.level}:${g.name}`;
  }

  function exactKeyFromGagKeys(keys: string[]): string {
    // Convert list of gag keys (may include duplicates) to the same signature as formatExactKey
    const counts: Record<string, number> = {};
    for (const k of keys) counts[k] = (counts[k] ?? 0) + 1;
    return Object.entries(counts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => `${k}x${v}`)
      .join('|');
  }

  // For each option, see if any subset (including the empty subset) exists with
  // >= displayed accuracy.
  //
  // Why include the empty subset?
  // If the current selection already kills with X% accuracy, then any option
  // that only *adds* gags but does not improve (or even lowers) that displayed
  // kill chance should be hidden when "Hide overkill additions" is enabled.
  return options.filter((opt) => {
    const optAcc = accKey(opt);
    if (opt.addedGags.length <= 0) return true;

    const perGagKeys = opt.addedGags.map(gagKey);
    // Enumerate subsets via bitmask (<= 15 subsets)
    const n = perGagKeys.length;
    const seen = new Set<string>();
    for (let mask = 0; mask < (1 << n); mask++) {
      if (mask === (1 << n) - 1) continue; // skip full set (itself)
      const subset: string[] = [];
      for (let i = 0; i < n; i++) if (mask & (1 << i)) subset.push(perGagKeys[i]);
      subset.sort();
      const exact = exactKeyFromGagKeys(subset);
      if (seen.has(exact)) continue;
      seen.add(exact);

      const subsetAcc = byKey.get(exact);
      if (subsetAcc !== undefined && subsetAcc >= optAcc) {
        return false;
      }
    }
    return true;
  });
}


function computeCandidatePool(req: FillToKillRequest, trackCapacity: Record<GagTrack, number>): GagInfo[] {
  const toggles = (req as any).toggles ?? {};

  const initialLured = !!(req.isTargetAlreadyLured ?? toggles.isTargetAlreadyLured);

  const resolvedEnabledTracks: Record<GagTrack, boolean> =
    (req as any).enabledTracks ?? toggles.enabledTracks ?? {};

  const resolvedExclude =
    req.excludeLevels ?? {
      low1to3: !!toggles.excludeLow,
      level7: !!toggles.excludeLevel7,
      level6: !!toggles.excludeLevel6,
      level6ByTrack: toggles.excludeLevel6ByTrack ?? undefined,
    };

  return (req.availableGags ?? [])
    .filter((g) => g.affectsType === 'Cog')
    .filter((g) => g.dmgType !== 'Heal')
    .filter((g) => resolvedEnabledTracks[g.track] !== false)
    .filter((g) => !isLevelExcluded(g.level, g.track, resolvedExclude))
    .filter((g) => g.track !== 'Toonup')
    .filter((g) => !initialLured || (g.track !== 'Lure' && g.track !== 'Trap'))
    .filter((g) => trackCapacity[g.track] > 0)
    .sort(
      (a, b) =>
        a.level - b.level || a.track.localeCompare(b.track) || a.name.localeCompare(b.name),
    );
}

// Generate combinations WITH repetition (multiset) of size k
function generateAndEvaluate(
  req: FillToKillRequest,
  candidates: GagInfo[],
  k: number,
  hp: number,
  out: FillToKillOption[],
  seenExactAdded: Set<string>,
  restrictions: ToonRestriction[],
  trackCapacity: Record<GagTrack, number>,
) {
  const base = req.currentGags;
  const maxToons = req.maxToons;
  const toggles = (req as any).toggles ?? {};
  const initialLured = !!(req.isTargetAlreadyLured ?? toggles.isTargetAlreadyLured);
  const hpOverrideRaw = (req.targetHpOverride ?? toggles.targetHpOverride ?? null);
  const hpOverride = (hpOverrideRaw ?? null) !== null && Number.isFinite(Number(hpOverrideRaw))
    ? Math.max(0, Math.floor(Number(hpOverrideRaw)))
    : null;

  // Pre-compute base track counts for capacity pruning
  const baseCounts: Partial<Record<GagTrack, number>> = {};
  for (const g of base) {
    baseCounts[g.track] = (baseCounts[g.track] ?? 0) + 1;
  }

  const chosenIdxs: number[] = [];
  const addedCounts: Partial<Record<GagTrack, number>> = {};

  const generationCap = normalizeGenerationCap(req);

  function wouldExceedCapacity(track: GagTrack): boolean {
    const used = (baseCounts[track] ?? 0) + (addedCounts[track] ?? 0);
    // Trap is special: only one trap can be placed on a single target.
    if (track === 'Trap') return used >= 1;

    return used + 1 > (trackCapacity[track] ?? 0);
  }

  function recurse(startIdx: number, depth: number) {
    if (out.length >= generationCap) {
      // soft cap to keep runtime sane; sorting later keeps best
      return;
    }

    if (depth === k) {
      const added: GagInfo[] = chosenIdxs.map((i) => candidates[i]);
      const all = [...base, ...added];
      if (all.length > maxToons) return;

      // Must be assignable to actual toon track availability
      if (!canAssignGagsToToons(all, restrictions)) return;

      const total = calculateTotalDamage(all, { lured: initialLured }).totalDamage;
      if (total < hp) return;

      // De-dupe exact identical gag selection (track+level+name+count)
      const exactKey = formatExactKey(added);
      if (seenExactAdded.has(exactKey)) return;
      seenExactAdded.add(exactKey);

      out.push({
        addedGags: added,
        totalDamage: total,
        overkill: total - hp,
        accuracy: calculateComboAccuracy(all, req.targetLevel, { initialLured, targetHpOverride: hpOverride }),
      });
      return;
    }

    for (let i = startIdx; i < candidates.length; i++) {
      const g = candidates[i];
      if (wouldExceedCapacity(g.track)) continue;

      chosenIdxs.push(i);
      addedCounts[g.track] = (addedCounts[g.track] ?? 0) + 1;

      recurse(i, depth + 1);

      addedCounts[g.track] = (addedCounts[g.track] ?? 0) - 1;
      if ((addedCounts[g.track] ?? 0) <= 0) delete addedCounts[g.track];
      chosenIdxs.pop();
    }
  }

  recurse(0, 0);
}

function formatExactKey(gags: GagInfo[]) {
  // Sort by track then level then name for deterministic key
  const sorted = [...gags].sort(
    (x, y) =>
      x.track.localeCompare(y.track) ||
      x.level - y.level ||
      x.name.localeCompare(y.name),
  );
  const counts: Record<string, number> = {};
  for (const g of sorted) {
    const k = `${g.track}:${g.level}:${g.name}`;
    counts[k] = (counts[k] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([k, v]) => `${k}x${v}`)
    .join('|');
}

function solve(req: FillToKillRequest): FillToKillOption[] {
  const toggles = (req as any).toggles ?? {};
  const initialLured = !!(req.isTargetAlreadyLured ?? toggles.isTargetAlreadyLured);
  const hpOverrideRaw = (req.targetHpOverride ?? toggles.targetHpOverride ?? null);
  const hpOverride = (hpOverrideRaw ?? null) !== null && Number.isFinite(Number(hpOverrideRaw))
    ? Math.max(1, Math.floor(Number(hpOverrideRaw)))
    : null;
  const hp = hpOverride ?? calculateCogHealth(req.targetLevel);
  const remaining = Math.max(0, req.maxToons - req.currentGags.length);

  const preferAccuracy =
    req.preferAccuracy ?? (req as any).toggles?.preferAccuracy ?? true;

  const restrictions = normalizeToonRestrictions(req);
  const sortMode = normalizeSortMode(req, preferAccuracy);
  const sortWeights = normalizeSortWeights(req);

  const enabledTracks: Record<GagTrack, boolean> =
    (req as any).enabledTracks ?? toggles.enabledTracks ?? {};

  const trackCapacity = buildTrackCapacity(restrictions, enabledTracks);
  const candidates = computeCandidatePool(req, trackCapacity);

  const allOptions: FillToKillOption[] = [];
  const seenExactAdded = new Set<string>();

  // Include "already kills" option first (no added gags), so the UI can show it.
  const currentTotal = calculateTotalDamage(req.currentGags, { lured: initialLured }).totalDamage;
  if (currentTotal >= hp && canAssignGagsToToons(req.currentGags, restrictions)) {
    allOptions.push({
      addedGags: [],
      totalDamage: currentTotal,
      overkill: currentTotal - hp,
      accuracy: calculateComboAccuracy(req.currentGags, req.targetLevel, { initialLured, targetHpOverride: hpOverride }),
    });
    seenExactAdded.add(formatExactKey([]));
  }

  for (let k = 1; k <= remaining; k++) {
    generateAndEvaluate(
      req,
      candidates,
      k,
      hp,
      allOptions,
      seenExactAdded,
      restrictions,
      trackCapacity,
    );
  }

  const hideOverkillAdditions =
    !!(
      (req as any).hideOverkillAdditions ??
      (req as any).toggles?.hideOverkillAdditions
    );

  const optionsToSort = hideOverkillAdditions
    ? filterSupersetsWithNoDisplayedAccuracyGain(filterEquivalentOverkill(allOptions))
    : allOptions;

  const maxResults = req.maxResults ?? (req as any).toggles?.maxResults ?? 12;

  const sorted =
    sortMode === 'weighted'
      ? sortOptionsWeighted(
        optionsToSort,
        req.currentGags,
        sortWeights,
        (req as any).gagConserveWeights ?? (req as any).toggles?.gagConserveWeights ?? {},
      )
      : [...optionsToSort].sort((a, b) =>
        compareOptions(a, b, sortMode === 'accuracy'),
      );

  return sorted.slice(0, maxResults);
}

// eslint-disable-next-line no-restricted-globals
self.addEventListener('message', (e: MessageEvent<FillToKillRequest>) => {
  const options = solve(e.data);
  // eslint-disable-next-line no-restricted-globals
  self.postMessage({ options });
});