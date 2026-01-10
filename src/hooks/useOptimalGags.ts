import React, { useEffect } from 'react';

import { GAGS } from '../data/gagsInfo';
import type { GagInfo, GagInstance } from '../types';
import { getUniqueId } from '../utils/uniqueUtils';

interface OptimalGags {
  isLoading: boolean;
  optimalGags?: GagInstance[];
  beginCalculation: (hp: number) => void;
}

const worker = new Worker(new URL('../utils/worker.ts', import.meta.url), {
  type: 'module',
});

export function useOptimalGags(): OptimalGags {
  const [isLoading, setIsLoading] = React.useState(false);
  const [optimalGags, setOptimalGags] = React.useState<GagInstance[]>();

  useEffect(() => {
    const listener = (e: MessageEvent<GagInfo[]>) => {
      const gagsWithIds: GagInstance[] = e.data.map((gag) => ({
        ...gag,
        id: getUniqueId(),
      }));
      setOptimalGags(gagsWithIds);
      setIsLoading(false);
    };
    worker.addEventListener('message', listener);

    return () => {
      worker.removeEventListener('message', listener);
    };
  }, []);

  const beginCalculation = (hp: number) => {
    worker.postMessage({
      targetDamage: hp,
      availableGags: Object.values(GAGS),
    });
    setIsLoading(true);
    setOptimalGags([]);
  };

  return { isLoading, optimalGags, beginCalculation };
}
