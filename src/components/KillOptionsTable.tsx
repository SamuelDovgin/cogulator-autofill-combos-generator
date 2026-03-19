import { useEffect, useMemo, useRef, useState } from 'react';

import type { GagInfo, GagInstance } from '../types';
import {
  calculateCogHealth,
  calculateComboAccuracy,
  calculateTotalDamage,
  explainComboAccuracy,
} from '../utils/calculatorUtils';
import { Buttoon } from './Buttoon';
import type {
  FillToKillOption,
  GagConserveWeights,
  SortMode,
  SortWeights,
} from '../utils/fillToKillOptionsWorker';
import GagConserveWeightsModal from './GagConserveWeightsModal';
import KillComboSettingsModal from './KillComboSettingsModal';
import ComboPreview from './ComboPreview';
import { findCanonicalGag } from '../utils/gagLookup';
import AccuracyPopover from './AccuracyPopover';

const formatAccuracy = (value: number) =>
  Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '0.0%';

const RESULTS_PANEL_MIN_HEIGHT_CLASS = 'min-h-[320px]';

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
  showScores: boolean;
  onShowScoresChange: (show: boolean) => void;
  maxGenerated: number;
  onMaxGeneratedChange: (next: number) => void;
  maxDisplayed: number;
  onMaxDisplayedChange: (next: number) => void;
  onApply: (added: GagInfo[]) => void;
  lureTracksMultiplierEnabled?: boolean;
  lureTracksMultiplier?: number;
  onToggleLureTracksMultiplierEnabled?: (next: boolean) => void;
  onSetLureTracksMultiplier?: (next: number) => void;
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
  showScores,
  onShowScoresChange,
  maxGenerated,
  onMaxGeneratedChange,
  maxDisplayed,
  onMaxDisplayedChange,
  onApply,
  lureTracksMultiplierEnabled = false,
  lureTracksMultiplier = 1,
  onToggleLureTracksMultiplierEnabled,
  onSetLureTracksMultiplier,
}: Props) {
  const [showGagWeights, setShowGagWeights] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const hp = useMemo(
    () => targetHpOverride ?? calculateCogHealth(targetLevel),
    [targetLevel, targetHpOverride],
  );

  const currentTotal = useMemo(
    () => calculateTotalDamage(currentGags, { lured: isTargetAlreadyLured }).totalDamage,
    [currentGags, isTargetAlreadyLured],
  );

  const currentAccuracy = useMemo(
    () =>
      calculateComboAccuracy(currentGags, targetLevel, {
        initialLured: isTargetAlreadyLured,
        targetHpOverride,
      }),
    [currentGags, targetLevel, isTargetAlreadyLured, targetHpOverride],
  );

  const rowScores = useMemo(() => {
    if (options.length === 0) return [];

    const weights = sortWeights ?? { accuracy: 1, levels: 1, tracks: 1 };
    const wAcc = weights.accuracy ?? 0;
    const wLevels = weights.conserve ?? 0;
    const wTracks = weights.tracks ?? 0;

    const getWeightForGag = (g: GagInfo) => {
      const key = `${g.track}:${g.level}:${g.name}`;
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
      const tracksExcludingLure = new Set<string>();
      let hasLure = false;

      for (const g of [...currentGags, ...opt.addedGags]) {
        if (g.track === 'Lure') {
          hasLure = true;
          continue;
        }
        tracksExcludingLure.add(g.track);
      }

      const mult = lureTracksMultiplierEnabled ? Number(lureTracksMultiplier ?? 1) : 1;
      const safeMult = Number.isFinite(mult) ? Math.max(0, Math.min(1, mult)) : 1;
      const trackCount = tracksExcludingLure.size + (hasLure ? safeMult : 0);

      return { maxEff, avgEff, levelMetric, trackCount };
    });

    const minLevel = Math.min(...levelMetrics.map((m) => m.levelMetric));
    const maxLevel = Math.max(...levelMetrics.map((m) => m.levelMetric));
    const minTracks = Math.min(...levelMetrics.map((m) => m.trackCount));
    const maxTracks = Math.max(...levelMetrics.map((m) => m.trackCount));

    const norm01 = (v: number, min: number, max: number) =>
      max === min ? 1 : (v - min) / (max - min);

    return options.map((opt, idx) => {
      const m = levelMetrics[idx];
      const accScore = opt.accuracy;
      const conserveScore = 1 - norm01(m.levelMetric, minLevel, maxLevel);
      const tracksScore = 1 - norm01(m.trackCount, minTracks, maxTracks);
      const weightedScore = wAcc * accScore + wLevels * conserveScore + wTracks * tracksScore;

      return {
        weightedScore,
        accScore,
        conserveScore,
        tracksScore,
        levelMetric: m.levelMetric,
        trackCount: m.trackCount,
        maxEff: m.maxEff,
        avgEff: m.avgEff,
      };
    });
  }, [
    options,
    currentGags,
    sortWeights,
    gagConserveWeights,
    lureTracksMultiplierEnabled,
    lureTracksMultiplier,
  ]);

  const rowTooltips = useMemo(() => {
    const combinedGagsByOption = options.map((opt) => [...currentGags, ...opt.addedGags]);

    const weights = sortWeights ?? { accuracy: 1, levels: 1, tracks: 1 };
    const wAcc = weights.accuracy ?? 0;
    const wLevels = weights.conserve ?? 0;
    const wTracks = weights.tracks ?? 0;

    return options.map((opt, idx) => {
      const allGags = combinedGagsByOption[idx];
      const accTip = explainComboAccuracy(allGags, targetLevel, {
        initialLured: isTargetAlreadyLured,
        targetHpOverride,
      });

      const s = rowScores[idx];
      if (!s) return accTip;

      const scoreTip =
        sortMode === 'weighted'
          ? [
              'Weighted score details:',
              '  Score = wAcc*Acc + wLevels*Conserve + wTracks*Tracks',
              `  wAcc=${wAcc}, wLevels=${wLevels}, wTracks=${wTracks}`,
              `  Acc (0..1) = ${s.accScore.toFixed(4)}`,
              `  Conserve (0..1) = ${s.conserveScore.toFixed(4)}  (higher = uses lower-value gags)`,
              '    levelMetric = maxEff*10 + avgEff',
              `    maxEff=${s.maxEff.toFixed(2)}, avgEff=${s.avgEff.toFixed(2)}, levelMetric=${s.levelMetric.toFixed(2)}`,
              `  Tracks (0..1) = ${s.tracksScore.toFixed(4)}  (fewer unique tracks is better)`,
              `    trackCount=${s.trackCount}`,
              `  WeightedScore = ${s.weightedScore.toFixed(4)}`,
            ].join('\n')
          : '';

      return scoreTip ? `${accTip}\n\n${scoreTip}` : accTip;
    });
  }, [
    options,
    currentGags,
    targetLevel,
    sortMode,
    sortWeights,
    rowScores,
    isTargetAlreadyLured,
    targetHpOverride,
  ]);

  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      if (listRef.current) listRef.current.scrollTop = 0;
    } catch {
      // ignore
    }
  }, [options]);

  return (
    <div className="mt-3 flex w-full flex-col rounded-2xl border-2 border-blue-900/60 bg-slate-900/70 p-3 min-[900px]:w-fit min-[900px]:max-w-full md:p-4">
      <div className="mb-3 space-y-3">
        <div className="flex flex-col gap-2">
          <div className="font-minnie text-lg text-white md:text-xl">
            Kill combos for <span className="text-yellow-300">Level {targetLevel}</span>{' '}
            <span className="opacity-70">(HP: {hp})</span>
          </div>
          <div className="space-y-1 text-xs text-slate-300 md:text-sm">
            <div>
              Current damage: <span className="font-bold text-red-300">- {currentTotal}</span>
            </div>
            <div>
              Accuracy to kill:{' '}
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
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Buttoon
            onClick={() => setShowSettingsModal(true)}
            className="border border-blue-800 bg-blue-950 px-3 py-2 text-sm font-bold text-blue-100 hover:bg-blue-900"
          >
            Combo settings
          </Buttoon>
          <div className="text-[11px] text-slate-400">
            Weights, limits, and display options are in the settings modal.
          </div>
        </div>
      </div>

      <div className={`relative ${RESULTS_PANEL_MIN_HEIGHT_CLASS}`}>
        {options.length === 0 ? (
          <>
            {isLoading && (
              <div className="text-sm text-slate-300/80">Finding low-level options...</div>
            )}
            {!isLoading && (
              <div
                className={`flex ${RESULTS_PANEL_MIN_HEIGHT_CLASS} items-center text-sm text-slate-300/80`}
              >
                No valid one-turn kill found with the current constraints / toon count.
              </div>
            )}
          </>
        ) : (
          <div
            ref={listRef}
            className={`max-h-[600px] w-full ${RESULTS_PANEL_MIN_HEIGHT_CLASS} overflow-y-auto overflow-x-visible pr-3 min-[900px]:w-fit`}
          >
            <table className="w-full table-auto text-left text-sm min-[900px]:w-fit">
              <thead className="text-xs uppercase tracking-wider text-slate-300/80">
                <tr>
                  <th className="sticky top-0 z-10 bg-slate-900 py-2 pr-3">Add</th>
                  <th className="sticky top-0 z-10 bg-slate-900 py-2 pr-3 whitespace-nowrap">
                    Toons
                  </th>
                  <th className="sticky top-0 z-10 bg-slate-900 py-2 pr-3 whitespace-nowrap">
                    Total
                  </th>
                  <th className="sticky top-0 z-10 bg-slate-900 py-2 pr-3 whitespace-nowrap">
                    Acc
                  </th>
                  <th className="sticky top-0 z-10 bg-slate-900 py-2 pr-3 whitespace-nowrap">
                    Over
                  </th>
                  {sortMode === 'weighted' && showScores && (
                    <th className="sticky top-0 z-10 bg-slate-900 py-2 pr-3 whitespace-nowrap">
                      Score
                    </th>
                  )}
                  <th className="sticky top-0 z-10 bg-slate-900 py-2 pr-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {options.map((opt, idx) => {
                  const toonsUsed = currentGags.length + opt.addedGags.length;
                  const comboItems = buildComboItems(opt.addedGags);

                  return (
                    <tr key={idx} className="align-top">
                      <td className="py-2 pr-3">
                        <div className="w-fit max-w-[18rem] text-slate-100 min-[900px]:max-w-[20rem]">
                          {opt.addedGags.length === 0 ? (
                            <span className="font-bold text-emerald-300">
                              No extra gags needed
                            </span>
                          ) : (
                            <ComboPreview items={comboItems} />
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-3 tabular-nums text-slate-200">{toonsUsed}</td>
                      <td className="py-2 pr-3 tabular-nums text-slate-200">
                        {opt.totalDamage}
                      </td>
                      <td className="py-2 pr-3 text-slate-200">
                        <AccuracyPopover
                          accuracy={opt.accuracy}
                          explanation={rowTooltips[idx]}
                        />
                      </td>
                      <td className="py-2 pr-3 tabular-nums text-slate-200">{opt.overkill}</td>
                      {sortMode === 'weighted' && showScores && rowScores[idx] && (
                        <td className="py-2 pr-3 text-slate-200">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold tabular-nums text-yellow-300">
                              {rowScores[idx].weightedScore.toFixed(3)}
                            </span>
                            <div className="flex gap-1.5 text-[10px] text-slate-400">
                              <span title="Accuracy component">
                                A:{(rowScores[idx].accScore * 100).toFixed(0)}
                              </span>
                              <span title="Conserve component (higher = uses cheaper gags)">
                                C:{(rowScores[idx].conserveScore * 100).toFixed(0)}
                              </span>
                              <span title="Tracks component (higher = fewer tracks)">
                                T:{(rowScores[idx].tracksScore * 100).toFixed(0)}
                              </span>
                            </div>
                          </div>
                        </td>
                      )}
                      <td className="py-2 pr-0 text-right">
                        <div className="flex items-center justify-end">
                          <Buttoon
                            className="px-3 py-1 text-sm"
                            onClick={() => {
                              const resolved = opt.addedGags.map(
                                (g) => findCanonicalGag(g) ?? g,
                              );
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
      </div>

      <div className="mt-2 text-xs text-slate-400/90">
        {sortMode === 'accuracy'
          ? 'Ranked by kill chance, then by gag level used.'
          : sortMode === 'conserve'
            ? 'Ranked by gag level used, then by kill chance.'
            : 'Ranked by weighted score (accuracy, conserve levels, fewer tracks).'}
      </div>

      {showSettingsModal && (
        <KillComboSettingsModal
          sortMode={sortMode}
          sortWeights={sortWeights}
          onSortWeightsChange={onSortWeightsChange}
          onOpenGagWeights={() => setShowGagWeights(true)}
          hideOverkillAdditions={hideOverkillAdditions}
          onHideOverkillChange={onHideOverkillChange}
          showScores={showScores}
          onShowScoresChange={onShowScoresChange}
          maxGenerated={maxGenerated}
          onMaxGeneratedChange={onMaxGeneratedChange}
          maxDisplayed={maxDisplayed}
          onMaxDisplayedChange={onMaxDisplayedChange}
          lureTracksMultiplierEnabled={lureTracksMultiplierEnabled}
          lureTracksMultiplier={lureTracksMultiplier}
          onToggleLureTracksMultiplierEnabled={onToggleLureTracksMultiplierEnabled}
          onSetLureTracksMultiplier={onSetLureTracksMultiplier}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

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
