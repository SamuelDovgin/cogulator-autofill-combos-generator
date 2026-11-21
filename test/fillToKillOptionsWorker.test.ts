import { expect, it, vi } from 'vitest';
import { GAGS } from '../src/data/gagsInfo';
import {
  DEFAULT_GAG_CONSERVE_WEIGHTS,
  DEFAULT_SORT_WEIGHTS,
} from '../src/utils/defaultSettings';
import type {
  FillToKillOption,
  FillToKillRequest,
} from '../src/utils/fillToKillOptionsWorker';

it('conserves Operas while keeping useful two-Opera finishers in the results', async () => {
  const addEventListener = vi.fn<
    (name: 'message', handler: (event: { data: FillToKillRequest }) => void) => void
  >();
  const postMessage = vi.fn<(result: { options: FillToKillOption[] }) => void>();
  vi.stubGlobal('self', { addEventListener, postMessage });

  try {
    await import('../src/utils/fillToKillOptionsWorker');
    const solve = addEventListener.mock.calls[0][1];
    const request = {
      targetLevel: 14,
      availableGags: Object.values(GAGS),
      currentGags: [],
      maxToons: 4,
      maxResults: 30,
      maxGenerated: 50000,
      sortMode: 'weighted',
      sortWeights: DEFAULT_SORT_WEIGHTS,
      gagConserveWeights: DEFAULT_GAG_CONSERVE_WEIGHTS,
      hideOverkillAdditions: true,
      toggles: { lureTrackMultiplier: 0.5 },
    } satisfies FillToKillRequest;

    for (const low1to3 of [true, false]) {
      const excludeLevels = { low1to3, level7: false };
      const findExactKill = (conserveLevel7Gags: boolean) => {
        solve({ data: { ...request, excludeLevels, conserveLevel7Gags } });
        return postMessage.mock.lastCall?.[0].options.find(
          (option) => option.addedGags.map((gag) => gag.name).join(',') ===
            'Elephant Trunk,Foghorn,Foghorn,Opera Singer',
        );
      };

      expect(findExactKill(false)).toBeUndefined();
      expect(findExactKill(true)).toMatchObject({ totalDamage: 254, accuracy: 0.95 });

      solve({
        data: { ...request, excludeLevels, targetLevel: 16, conserveLevel7Gags: true },
      });
      expect(postMessage.mock.lastCall?.[0].options).toContainEqual(
        expect.objectContaining({
          addedGags: [GAGS.Foghorn, GAGS.Foghorn, GAGS.OperaSinger, GAGS.OperaSinger],
          totalDamage: 336,
          accuracy: 0.95,
        }),
      );
    }
  } finally {
    vi.unstubAllGlobals();
  }
});
