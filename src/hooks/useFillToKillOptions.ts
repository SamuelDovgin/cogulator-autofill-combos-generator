import { useCallback, useEffect, useRef, useState } from 'react';

import { GAGS } from '../data/gagsInfo';
import { GagTracks } from '../data/gagTracksInfo';
import type { GagInfo, GagTrack as GagTrackName } from '../types';
import type { FillToKillOption, ToonRestriction, SortMode, SortWeights, GagConserveWeights } from '../utils/fillToKillOptionsWorker';

// Vite worker import
import FillToKillWorker from '../utils/fillToKillOptionsWorker?worker';

export type ExcludeLevels = {
  low1to3: boolean; // levels 1-3
  level7: boolean;
  // Per-track exclusion for level 6 (e.g., exclude L6 Throw but allow L6 Lure)
  level6ByTrack: Partial<Record<GagTrackName, boolean>>;
};

export const defaultEnabledTracks = (): Record<GagTrackName, boolean> => {
  // By default: all tracks on
  return Object.fromEntries(GagTracks.map((t) => [t.name, true])) as Record<GagTrackName, boolean>;
};

type ComputeArgs = {
  targetLevel: number;
  isTargetAlreadyLured?: boolean;
  targetHpOverride?: number | null;
  currentGags: GagInfo[];
  maxToons: 1 | 2 | 3 | 4;
  excludeLevels: ExcludeLevels;
  enabledTracks: Record<GagTrackName, boolean>;
  sortMode: SortMode;
  sortWeights: SortWeights;
  gagConserveWeights: GagConserveWeights;
  lureTrackMultiplier?: number;
  preferAccuracy: boolean; // back-compat (ignored when sortMode='weighted')
  hideOverkillAdditions: boolean;
  toonRestrictions?: ToonRestriction[];
  maxResults?: number;
  maxGenerated?: number;
};

type WorkerResponse = {
  options: FillToKillOption[];
};

export function useFillToKillOptions() {
  const workerRef = useRef<Worker | null>(null);

  const [fillToKillLoading, setFillToKillLoading] = useState(false);
  const [fillToKillOptions, setFillToKillOptions] = useState<FillToKillOption[]>([]);

  useEffect(() => {
    const worker = new FillToKillWorker();
    workerRef.current = worker;

    const onMessage = (e: MessageEvent<WorkerResponse>) => {
      setFillToKillOptions(e.data?.options ?? []);
      setFillToKillLoading(false);
    };

    const onError = () => {
      // Fail closed: stop spinner and clear options
      setFillToKillOptions([]);
      setFillToKillLoading(false);
    };

    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    worker.addEventListener('messageerror', onError);

    return () => {
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
      worker.removeEventListener('messageerror', onError);
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const computeFillToKillOptions = useCallback(
    ({
      targetLevel,
      isTargetAlreadyLured,
      targetHpOverride,
      lureTrackMultiplier,
      currentGags,
      maxToons,
      excludeLevels,
      enabledTracks,
      sortMode,
      sortWeights,
      gagConserveWeights,
      preferAccuracy,
      hideOverkillAdditions,
      toonRestrictions,
      maxResults = 30,
      maxGenerated = 2000,
    }: ComputeArgs) => {
      const worker = workerRef.current;
      if (!worker) return;

      setFillToKillLoading(true);

      const availableGags = Object.values(GAGS) as GagInfo[];

      worker.postMessage({
        targetLevel,
        isTargetAlreadyLured,
        targetHpOverride,
        excludeLevels,
        currentGags,
        availableGags,
        maxToons,
        maxResults,
        maxGenerated,
        preferAccuracy,
        sortMode,
        sortWeights,
        gagConserveWeights,
        toonRestrictions,
        toggles: {
          excludeLow: excludeLevels.low1to3,
          excludeLevel7: excludeLevels.level7,
          excludeLevel6ByTrack: excludeLevels.level6ByTrack,
          hideOverkillAdditions,
          maxGenerated,
          enabledTracks,
          toonRestrictions,
          sortMode,
          sortWeights,
          gagConserveWeights,
          lureTrackMultiplier,
          isTargetAlreadyLured,
          targetHpOverride,
        },
      });
    },
    []
  );

  return {
    fillToKillOptions,
    fillToKillLoading,
    computeFillToKillOptions,
  };
}
