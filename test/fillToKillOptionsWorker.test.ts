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

it('fits organic and regular gags into distinct available Toon slots', async () => {
  vi.resetModules();
  const addEventListener = vi.fn<
    (name: 'message', handler: (event: { data: FillToKillRequest }) => void) => void
  >();
  const postMessage = vi.fn<(result: { options: FillToKillOption[] }) => void>();
  vi.stubGlobal('self', { addEventListener, postMessage });

  try {
    await import('../src/utils/fillToKillOptionsWorker');
    const handleRequest = addEventListener.mock.calls[0][1];
    const solve = (request: FillToKillRequest) => {
      handleRequest({ data: request });
      return postMessage.mock.lastCall?.[0].options;
    };
    const organicFoghorn = { ...GAGS.Foghorn, isOrganic: true };
    const soundRequest = {
      targetLevel: 15,
      targetHpOverride: 258,
      availableGags: [GAGS.Foghorn],
      currentGags: [organicFoghorn],
      maxToons: 4,
      organicTracks: ['Sound', 'Sound', 'Sound', ''],
      hideOverkillAdditions: true,
    } satisfies FillToKillRequest;

    expect(solve(soundRequest)).toMatchObject([
      { addedGags: [GAGS.Foghorn, organicFoghorn, organicFoghorn], totalDamage: 258 },
    ]);
    expect(solve({ ...soundRequest, targetHpOverride: 259 })).toEqual([]);
    expect(solve({ ...soundRequest, organicTracks: ['Sound', 'Sound', 'Sound', 'Sound'] }))
      .toMatchObject([{ addedGags: [organicFoghorn, organicFoghorn, organicFoghorn], totalDamage: 264 }]);
    expect(solve({
      ...soundRequest,
      currentGags: [GAGS.Foghorn],
      organicTracks: ['Sound', 'Sound', 'Sound', 'Sound'],
      targetHpOverride: 100,
    })).toMatchObject([{ addedGags: [organicFoghorn] }]);

    const safeRequest = {
      targetLevel: 9,
      currentGags: [{ ...GAGS.Safe, isOrganic: true }],
      availableGags: [GAGS.Safe, GAGS.FireHose, GAGS.ElephantTrunk, GAGS.Foghorn],
      maxToons: 4,
      organicTracks: ['', '', '', ''],
      excludeLevels: { low1to3: true, level7: true, level6ByTrack: { Sound: true } },
    } satisfies FillToKillRequest;
    expect(solve(safeRequest)).toContainEqual(expect.objectContaining({
      addedGags: [GAGS.FireHose],
      totalDamage: 111,
    }));
    const mixedOrganicOptions = solve({
      ...safeRequest,
      organicTracks: ['Sound', '', '', ''],
      targetHpOverride: 100,
      maxResults: 50,
    });
    expect(mixedOrganicOptions).toContainEqual(expect.objectContaining({
      addedGags: [{ ...GAGS.ElephantTrunk, isOrganic: true }],
    }));
    expect(mixedOrganicOptions?.flatMap(({ addedGags }) => addedGags)).not.toContainEqual(
      expect.objectContaining({ track: 'Drop', isOrganic: true }),
    );
    expect(solve({ ...soundRequest, organicTracks: undefined, currentGags: [], targetHpOverride: 50 }))
      .toMatchObject([{ addedGags: [GAGS.Foghorn], totalDamage: 50 }]);

    const dropRequest = {
      ...soundRequest,
      targetHpOverride: 150,
      availableGags: [GAGS.GrandPiano],
      maxToons: 2,
      organicTracks: ['Sound', ''],
    } satisfies FillToKillRequest;
    expect(solve(dropRequest)).toMatchObject([{ addedGags: [GAGS.GrandPiano] }]);
    expect(solve({ ...dropRequest, toonRestrictions: ['none', 'dropless'] })).toEqual([]);
    expect(solve({ ...dropRequest, toonRestrictions: ['soundless', 'none'] }))
      .toMatchObject([{ addedGags: [GAGS.GrandPiano] }]);
    expect(solve({ ...dropRequest, toonRestrictions: ['soundless', 'soundless'] })).toEqual([]);
  } finally {
    vi.unstubAllGlobals();
  }
});

it('prefers the organic variant at equal displayed KO chance and keeps different chances', async () => {
  vi.resetModules();
  const addEventListener = vi.fn<
    (name: 'message', handler: (event: { data: FillToKillRequest }) => void) => void
  >();
  const postMessage = vi.fn<(result: { options: FillToKillOption[] }) => void>();
  vi.stubGlobal('self', { addEventListener, postMessage });

  try {
    await import('../src/utils/fillToKillOptionsWorker');
    const handleRequest = addEventListener.mock.calls[0][1];
    const solve = (request: FillToKillRequest) => {
      handleRequest({ data: request });
      return postMessage.mock.lastCall?.[0].options ?? [];
    };
    const pieRequest = {
      targetLevel: 9,
      availableGags: [GAGS.WholeFruitPie, GAGS.SeltzerBottle],
      currentGags: [],
      maxToons: 4,
      organicTracks: ['Throw', '', '', ''],
    } satisfies FillToKillRequest;
    const pieLine = (options: FillToKillOption[]) => options.filter(({ addedGags }) =>
      addedGags.length === 4 &&
      addedGags.filter(({ name }) => name === GAGS.WholeFruitPie.name).length === 3,
    );

    for (const hideOverkillAdditions of [false, true]) {
      for (const targetHpOverride of [110, 120]) {
        const boosted = pieLine(solve({ ...pieRequest, hideOverkillAdditions, targetHpOverride }));
        expect(boosted).toHaveLength(1);
        expect(boosted[0].totalDamage).toBe(122);
        expect(boosted[0].addedGags.filter(({ isOrganic }) => isOrganic)).toHaveLength(1);
      }
    }

    const regular = pieLine(solve({ ...pieRequest, organicTracks: [] }));
    expect(regular).toHaveLength(1);
    expect(regular[0].totalDamage).toBe(119);

    const accuracyVariants = solve({
      targetLevel: 20,
      targetHpOverride: 110,
      availableGags: [GAGS.Foghorn, GAGS.BirthdayCake],
      currentGags: [],
      maxToons: 2,
      organicTracks: ['Throw', ''],
    }).filter(({ addedGags }) =>
      addedGags.some(({ name }) => name === GAGS.Foghorn.name) &&
      addedGags.some(({ name }) => name === GAGS.BirthdayCake.name),
    );
    expect(accuracyVariants.map(({ accuracy }) => (accuracy * 100).toFixed(1)).sort())
      .toEqual(['85.5', '92.5']);
  } finally {
    vi.unstubAllGlobals();
  }
});
