import { useCallback, useEffect, useRef, useState } from 'react';

import { GAGS } from '../data/gagsInfo';
import { GagTracks } from '../data/gagTracksInfo';
import type { GagInfo, GagTrack as GagTrackName } from '../types';
import type { FillToKillOption, FillToKillRequest, ToonRestriction, SortMode, SortWeights, GagConserveWeights } from '../utils/fillToKillOptionsWorker';
import type { OrganicTrack } from '../utils/toonTracks';

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
  conserveLevel7Gags: boolean;
  toonRestrictions?: ToonRestriction[];
  organicTracks?: OrganicTrack[];
  maxResults?: number;
  maxGenerated?: number;
  isPreview?: boolean;
};

type WorkerResponse = {
  options: FillToKillOption[];
  requestId: number;
};

const PREVIEW_SETTLE_MS = 60;
const CACHE_SIZE = 24;
const AVAILABLE_GAGS: GagInfo[] = Object.values(GAGS);

export function useFillToKillOptions() {
  const workerRef = useRef<Worker | null>(null);
  const previewTimer = useRef<number | null>(null);
  const inFlight = useRef<{ id: number; key: string } | null>(null);
  const nextRequestId = useRef(0);
  const cache = useRef(new Map<string, FillToKillOption[]>());

  const [fillToKillLoading, setFillToKillLoading] = useState(false);
  const [fillToKillOptions, setFillToKillOptions] = useState<FillToKillOption[]>([]);

  const cancelSearch = useCallback(() => {
    if (previewTimer.current !== null) {
      window.clearTimeout(previewTimer.current);
      previewTimer.current = null;
    }

    if (inFlight.current) {
      // The solver is synchronous inside the worker. Termination stops obsolete work.
      workerRef.current?.terminate();
      workerRef.current = null;
      inFlight.current = null;
    }
  }, []);

  useEffect(() => () => {
    cancelSearch();
    workerRef.current?.terminate();
    workerRef.current = null;
  }, [cancelSearch]);

  const getWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;
    const worker = new FillToKillWorker();
    workerRef.current = worker;

    worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
      const request = inFlight.current;
      if (workerRef.current !== worker || !request || data.requestId !== request.id) return;
      inFlight.current = null;
      const options = data.options ?? [];
      const entries = cache.current;
      entries.set(request.key, options);
      if (entries.size > CACHE_SIZE) {
        const oldest = entries.keys().next();
        if (!oldest.done) entries.delete(oldest.value);
      }
      setFillToKillOptions(options);
      setFillToKillLoading(false);
    };

    const onError = () => {
      if (workerRef.current !== worker) return;
      cancelSearch();
      setFillToKillOptions([]);
      setFillToKillLoading(false);
    };
    worker.onerror = onError;
    worker.onmessageerror = onError;
    return worker;
  }, [cancelSearch]);

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
      conserveLevel7Gags,
      toonRestrictions,
      organicTracks,
      maxResults = 30,
      maxGenerated = 2000,
      isPreview = false,
    }: ComputeArgs) => {
      cancelSearch();
      const request: Omit<FillToKillRequest, 'requestId' | 'availableGags'> = {
        targetLevel,
        isTargetAlreadyLured,
        targetHpOverride,
        excludeLevels,
        currentGags,
        maxToons,
        maxResults,
        maxGenerated,
        preferAccuracy,
        sortMode,
        sortWeights,
        gagConserveWeights,
        toonRestrictions,
        organicTracks,
        conserveLevel7Gags,
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
      };

      // A hover ghost and the same committed gag have identical solver inputs.
      const key = JSON.stringify({
        ...request,
        currentGags: currentGags.map(({ track, level, name, isOrganic, accuracy, affectsNum, dmgType, maxDmg, organicBonus }) =>
          [track, level, name, Boolean(isOrganic), accuracy, affectsNum, dmgType, maxDmg, organicBonus],
        ),
      });
      const previous = cache.current.get(key);
      if (previous) {
        cache.current.delete(key);
        cache.current.set(key, previous);
        setFillToKillOptions(previous);
        setFillToKillLoading(false);
        return;
      }

      setFillToKillLoading(true);
      const start = () => {
        previewTimer.current = null;
        const worker = getWorker();
        const id = ++nextRequestId.current;
        inFlight.current = { id, key };
        worker.postMessage({ ...request, availableGags: AVAILABLE_GAGS, requestId: id });
      };

      if (isPreview) {
        previewTimer.current = window.setTimeout(start, PREVIEW_SETTLE_MS);
      } else {
        start();
      }
    },
    [cancelSearch, getWorker],
  );

  return {
    fillToKillOptions,
    fillToKillLoading,
    computeFillToKillOptions,
  };
}
