import React, { useMemo, useEffect, useState } from 'react';

import type { GagInfo, GagInstance } from '../types';
import {
  calculateCogHealth,
  calculateComboAccuracy,
  calculateTotalDamage,
  explainComboAccuracy,
} from '../utils/calculatorUtils';
import { Buttoon } from './Buttoon';
import type { FillToKillOption, SortMode, SortWeights, GagConserveWeights } from '../utils/fillToKillOptionsWorker';
import GagConserveWeightsModal from './GagConserveWeightsModal';
import ComboPreview from './ComboPreview';
import { findCanonicalGag } from '../utils/gagLookup';
import { loadFavoritesForKey, toggleFavoriteForKey } from '../storage/favorites';
import type { FavoriteCombo } from '../storage/favorites';

const formatAccuracy = (value: number) =>
  Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '0.0%';

function buildComboItems(gags: GagInfo[]) {
  const counts: Record<string, { gag: GagInfo; count: number }> = {};
  for (const g of gags) {
    const canonical = findCanonicalGag(g) ?? g;
    const key = `${canonical.track}:${canonical.level}:${canonical.name}`;
    counts[key] = counts[key] ?? { gag: canonical, count: 0 };
    counts[key].count += 1;
  }
  return Object.values(counts)
    .sort(
      (a, b) =>
        a.gag.track.localeCompare(b.gag.track) ||
        a.gag.level - b.gag.level ||
        a.gag.name.localeCompare(b.gag.name),
    )
    .map(({ gag, count }) => ({ gag, count }));
}

interface Props {
  targetLevel: number;
  isTargetAlreadyLured: boolean;
  targetHpOverride?: number | null;
  currentGags: GagInstance[];
  options?: FillToKillOption[];
  isLoading: boolean;
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
  sortWeights: SortWeights;
  onSortWeightsChange: (next: SortWeights) => void;
  gagConserveWeights: GagConserveWeights;
  onGagConserveWeightsChange: (next: GagConserveWeights) => void;
  hideOverkillAdditions: boolean;
  onHideOverkillChange: (hide: boolean) => void;
  maxGenerated: number;
  onMaxGeneratedChange: (next: number) => void;
  maxDisplayed: number;
  onMaxDisplayedChange: (next: number) => void;
  onApply: (added: GagInfo[]) => void;
}

export function KillOptionsTable({
  targetLevel,
  isTargetAlreadyLured,
  targetHpOverride,
  currentGags,
  options = [],
  isLoading,
  sortMode,
  onSortModeChange,
  sortWeights,
  onSortWeightsChange,
  gagConserveWeights,
  onGagConserveWeightsChange,
  hideOverkillAdditions,
  onHideOverkillChange,
  maxGenerated,
  onMaxGeneratedChange,
  maxDisplayed,
  onMaxDisplayedChange,
  onApply,
}: Props) {
  const scenarioKey = `lvl:${targetLevel}|hp:${targetHpOverride ?? 'full'}|lured:${isTargetAlreadyLured ? 1 : 0}|toons:${currentGags.length}`;
  const [favorites, setFavorites] = useState<FavoriteCombo[]>(() => loadFavoritesForKey(scenarioKey));
  const [showGagWeights, setShowGagWeights] = useState(false);

  useEffect(() => {
    setFavorites(loadFavoritesForKey(scenarioKey));
  }, [scenarioKey]);
  const hp = useMemo(() => (targetHpOverride ?? calculateCogHealth(targetLevel)), [targetLevel, targetHpOverride]);
  const currentTotal = useMemo(
    () => calculateTotalDamage(currentGags, { lured: isTargetAlreadyLured }).totalDamage,
    [currentGags, isTargetAlreadyLured],
  );
  const currentAccuracy = useMemo(
    () => calculateComboAccuracy(currentGags, targetLevel, { initialLured: isTargetAlreadyLured, targetHpOverride }),
    [currentGags, targetLevel, isTargetAlreadyLured, targetHpOverride],
  );

  const rowTooltips = useMemo(() => {
    const combinedGagsByOption = options.map((opt) => [...currentGags, ...opt.addedGags]);

    // Precompute weighted-score components (mirrors worker logic).
    const weights = sortWeights ?? { accuracy: 1, levels: 1, tracks: 1 };
    const wAcc = weights.accuracy ?? 0;
    const wLevels = weights.levels ?? 0;
    const wTracks = weights.tracks ?? 0;

    const getWeightForGag = (g: GagInfo) => {
      const key = `${g.track}:${g.name}`;
      const v = gagConserveWeights?.[key];
      return typeof v === 'number' && Number.isFinite(v) ? v : 0.5;
    };

    const levelMetrics = options.map((opt) => {
      let maxEff = 0;
      let sumEff = 0;
      for (const g of opt.addedGags) {
        const eff = g.level * getWeightForGag(g);
        maxEff = Math.max(maxEff, eff);
        sumEff += eff;
      }
      const avgEff = opt.addedGags.length ? sumEff / opt.addedGags.length : 0;
      const levelMetric = maxEff * 10 + avgEff;
      const trackCount = new Set([...currentGags, ...opt.addedGags].map((g) => g.track)).size;
      return { maxEff, avgEff, levelMetric, trackCount };
    });

    const minLevel = Math.min(...levelMetrics.map((m) => m.levelMetric));
    const maxLevel = Math.max(...levelMetrics.map((m) => m.levelMetric));
    const minTracks = Math.min(...levelMetrics.map((m) => m.trackCount));
    const maxTracks = Math.max(...levelMetrics.map((m) => m.trackCount));

    const norm01 = (v: number, min: number, max: number) =>
      max === min ? 0 : (v - min) / (max - min);

    return options.map((opt, idx) => {
      const allGags = combinedGagsByOption[idx];
      const accTip = explainComboAccuracy(allGags, targetLevel, { initialLured: isTargetAlreadyLured, targetHpOverride });

      const m = levelMetrics[idx];
      const accScore = opt.accuracy;
      const conserveScore = 1 - norm01(m.levelMetric, minLevel, maxLevel);
      const tracksScore = 1 - norm01(m.trackCount, minTracks, maxTracks);
      const weightedScore = wAcc * accScore + wLevels * conserveScore + wTracks * tracksScore;

      const scoreTip =
        sortMode === 'weighted'
          ? [
            'Weighted score details:',
            `  Score = wAcc*Acc + wLevels*Levels + wTracks*Tracks`,
            `  wAcc=${wAcc}, wLevels=${wLevels}, wTracks=${wTracks}`,
            `  Acc (0..1) = ${accScore.toFixed(4)}`,
            `  Levels (0..1) = ${conserveScore.toFixed(4)}  (lower is better; normalized from levelMetric)`,
            `    levelMetric = maxEff*10 + avgEff`,
            `    maxEff=${m.maxEff.toFixed(2)}, avgEff=${m.avgEff.toFixed(2)}, levelMetric=${m.levelMetric.toFixed(2)}`,
            `  Tracks (0..1) = ${tracksScore.toFixed(4)}  (fewer unique tracks is better)`,
            `    trackCount=${m.trackCount}`,
            `  WeightedScore = ${weightedScore.toFixed(4)}`,
          ].join('\n')
          : '';

      return scoreTip ? `${accTip}\n\n${scoreTip}` : accTip;
    });
  }, [options, currentGags, targetLevel, sortMode, sortWeights, gagConserveWeights]);

  const favoriteIds = new Set(favorites.map((f) => f.id));

  return (
    <div className="mt-3 w-full rounded-2xl border-2 border-blue-900/60 bg-slate-900/70 p-3 md:p-4">
      <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div className="font-minnie text-lg md:text-xl text-white">
          Kill combos for <span className="text-yellow-300">Level {targetLevel}</span>{' '}
          <span className="opacity-70">(HP: {hp})</span>
        </div>
        <div className="text-xs md:text-sm text-slate-300 space-y-1">
          <div>
            Current damage: <span className="font-bold text-red-300">- {currentTotal}</span>
          </div>
          <div>
            Accuracy:{' '}
            <span className="font-bold text-yellow-300">
              {currentGags.length ? formatAccuracy(currentAccuracy) : 'N/A'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] uppercase tracking-wide text-slate-400">Sort:</span>

            <div className="flex overflow-hidden rounded-md border border-blue-800">
              <button
                type="button"
                onClick={() => onSortModeChange('accuracy')}
                className={[
                  'px-2 py-1 text-[11px] font-bold',
                  sortMode === 'accuracy'
                    ? 'bg-blue-500 text-white'
                    : 'bg-blue-950 text-blue-100 hover:bg-blue-900',
                ].join(' ')}
              >
                Accuracy
              </button>
              <button
                type="button"
                onClick={() => onSortModeChange('conserve')}
                className={[
                  'px-2 py-1 text-[11px] font-bold',
                  sortMode === 'conserve'
                    ? 'bg-blue-500 text-white'
                    : 'bg-blue-950 text-blue-100 hover:bg-blue-900',
                ].join(' ')}
              >
                Conserve gags
              </button>
              <button
                type="button"
                onClick={() => onSortModeChange('weighted')}
                className={[
                  'px-2 py-1 text-[11px] font-bold',
                  sortMode === 'weighted'
                    ? 'bg-blue-500 text-white'
                    : 'bg-blue-950 text-blue-100 hover:bg-blue-900',
                ].join(' ')}
              >
                Weighted
              </button>
            </div>

            {sortMode === 'weighted' && (
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="text-slate-300">Weights</span>

                <label className="flex items-center gap-1">
                  <span className="text-slate-300">Acc</span>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={0.1}
                    value={sortWeights.accuracy}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      onSortWeightsChange({
                        ...sortWeights,
                        accuracy: Number.isFinite(v) ? v : sortWeights.accuracy,
                      });
                    }}
                    className="w-[64px] rounded-md border border-blue-800 bg-blue-950 px-2 py-1 text-[11px] text-slate-100"
                  />
                </label>

                <label className="flex items-center gap-1">
                  <span className="text-slate-300">Levels</span>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={0.1}
                    value={sortWeights.conserve}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      onSortWeightsChange({
                        ...sortWeights,
                        conserve: Number.isFinite(v) ? v : sortWeights.conserve,
                      });
                    }}
                    className="w-[64px] rounded-md border border-blue-800 bg-blue-950 px-2 py-1 text-[11px] text-slate-100"
                  />
                </label>

                <label className="flex items-center gap-1">
                  <span className="text-slate-300">Tracks</span>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={0.1}
                    value={sortWeights.tracks}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      onSortWeightsChange({
                        ...sortWeights,
                        tracks: Number.isFinite(v) ? v : sortWeights.tracks,
                      });
                    }}
                    className="w-[64px] rounded-md border border-blue-800 bg-blue-950 px-2 py-1 text-[11px] text-slate-100"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setShowGagWeights(true)}
                  className="rounded-md border border-blue-800 bg-blue-950 px-2 py-1 text-[11px] font-bold text-blue-100 hover:bg-blue-900"
                >
                  Gag retain weights…
                </button>
              </div>
            )}

            <label className="flex items-center gap-2 text-[11px]">
              <input
                type="checkbox"
                checked={hideOverkillAdditions}
                onChange={(e) => onHideOverkillChange(e.target.checked)}
              />
              Hide overkill additions
            </label>


            <label className="flex items-center gap-2 text-[11px]">
              <span className="text-slate-300">Generation cap</span>
              <input
                type="number"
                min={50}
                max={50000}
                step={50}
                value={maxGenerated}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  onMaxGeneratedChange(Number.isFinite(v) ? v : 2000);
                }}
                className="w-[86px] rounded-md border border-blue-800 bg-blue-950 px-2 py-1 text-[11px] text-slate-100"
              />
            </label>

            <label className="flex items-center gap-2 text-[11px]">
              <span className="text-slate-300">Max shown</span>
              <input
                type="number"
                min={5}
                max={100}
                step={5}
                value={maxDisplayed}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  onMaxDisplayedChange(Number.isFinite(v) ? v : 20);
                }}
                className="w-[64px] rounded-md border border-blue-800 bg-blue-950 px-2 py-1 text-[11px] text-slate-100"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Favorites area (always shown) */}
      <div className="mb-3">
        <div className="mb-2 text-sm font-bold text-yellow-300">Starred</div>
        {favorites.length === 0 ? (
          <div className="text-sm text-slate-300/80">No favorites yet — click ☆ on any combo.</div>
        ) : (
          <div className="space-y-2">
            {favorites.slice(0, 6).map((f) => {
              const items = buildComboItems(f.addedGags);
              return (
                <div
                  key={f.id}
                  className="w-full rounded-md border border-slate-800 bg-slate-900/50 p-2 hover:bg-slate-800"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="flex-1 text-left text-sm font-bold text-slate-100"
                        onClick={() => onApply(f.addedGags)}
                      >
                        Lvl {f.maxCogLevel} · {f.total} dmg · {f.toons} toons
                      </button>
                      <div className="text-yellow-300">★</div>
                      <button
                        type="button"
                        className="text-xs text-slate-300 hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = toggleFavoriteForKey(scenarioKey, f);
                          setFavorites(next);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="text-xs text-slate-200">
                      <ComboPreview items={items} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-slate-300/80 text-sm">Finding low-level options…</div>
      ) : options.length === 0 ? (
        <div className="text-slate-300/80 text-sm">
          No valid one-turn kill found with the current constraints / toon count.
        </div>
      ) : (
        <div className="max-h-[600px] min-h-[300px] overflow-y-auto overflow-x-hidden pr-3">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-900 text-xs uppercase tracking-wider text-slate-300/80">
              <tr>
                <th className="py-2 pr-3">Add</th>
                <th className="py-2 pr-3">Toons</th>
                <th className="py-2 pr-3">Total</th>
                <th className="py-2 pr-3">Acc</th>
                <th className="py-2 pr-3">Over</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {options.map((opt, idx) => {
                const toonsUsed = currentGags.length + opt.addedGags.length;
                const comboItems = buildComboItems(opt.addedGags);
                const sigArr: string[] = [];
                for (const ci of comboItems) {
                  for (let i = 0; i < ci.count; i++) sigArr.push(`${ci.gag.track}:${ci.gag.level}:${ci.gag.name}`);
                }
                sigArr.sort();
                const sig = sigArr.join('|');
                const favId = `${targetLevel}|${toonsUsed}|${opt.totalDamage}|${sig}`;
                return (
                  <tr key={idx} className="align-top">
                    <td className="py-2 pr-3">
                      <div className="text-slate-100">
                        {opt.addedGags.length === 0 ? (
                          <span className="text-emerald-300 font-bold">No extra gags needed</span>
                        ) : (
                          <ComboPreview items={comboItems} />
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-slate-200">{toonsUsed}</td>
                    <td className="py-2 pr-3 tabular-nums text-slate-200">{opt.totalDamage}</td>
                    <td
                      className="py-2 pr-3 tabular-nums text-slate-200"
                      title={rowTooltips[idx]}
                    >
                      {formatAccuracy(opt.accuracy)}
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-slate-200">{opt.overkill}</td>
                    <td className="py-2 pr-0 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const next = toggleFavoriteForKey(scenarioKey, {
                              id: favId,
                              addedGags: opt.addedGags.map((g) => findCanonicalGag(g) ?? g),
                              toons: toonsUsed,
                              total: opt.totalDamage,
                              over: opt.overkill,
                              maxCogLevel: targetLevel,
                              createdAt: Date.now(),
                            });
                            setFavorites(next);
                          }}
                          className={`shrink-0 rounded-md border border-blue-800 bg-blue-950 px-2 py-1 text-sm font-bold ${favoriteIds.has(favId) ? 'text-yellow-300' : 'text-slate-300'} hover:bg-blue-900`}
                          title={favoriteIds.has(favId) ? 'Unfavorite' : 'Favorite'}
                        >
                          {favoriteIds.has(favId) ? '★' : '☆'}
                        </button>

                        <Buttoon
                          className="px-3 py-1 text-sm"
                          onClick={() => {
                            const resolved = opt.addedGags.map((g) => findCanonicalGag(g) ?? g);
                            onApply(resolved);
                          }}
                        >
                          Use
                        </Buttoon>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-2 text-xs text-slate-400/90">
        {sortMode === 'accuracy'
          ? 'Ranked by kill chance, then by gag level used.'
          : sortMode === 'conserve'
            ? 'Ranked by gag level used, then by kill chance.'
            : 'Ranked by weighted score (accuracy, conserve levels, fewer tracks).'}
      </div>

      {showGagWeights && (
        <GagConserveWeightsModal
          weights={gagConserveWeights}
          onChange={onGagConserveWeightsChange}
          onClose={() => setShowGagWeights(false)}
        />
      )}
    </div>
  );
}
