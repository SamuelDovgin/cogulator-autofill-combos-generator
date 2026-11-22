import type { GagInfo, GagTrack } from '../types';

export const MISSING_TRACKS = {
  none: null,
  'toonup-less': 'Toonup',
  trapless: 'Trap',
  lureless: 'Lure',
  soundless: 'Sound',
  dropless: 'Drop',
} as const satisfies Record<string, GagTrack | null>;

export type ToonRestriction = keyof typeof MISSING_TRACKS;
export type OrganicTrack = GagTrack | '';

export function toonAllows(track: GagTrack, restriction: ToonRestriction): boolean {
  return MISSING_TRACKS[restriction] !== track;
}

export function eligibleToons(
  gag: GagInfo,
  restrictions: ToonRestriction[],
  organicTracks?: OrganicTrack[],
): number {
  return restrictions.reduce((mask, restriction, toon) => {
    if (!toonAllows(gag.track, restriction)) return mask;
    if (organicTracks && Boolean(gag.isOrganic) !== (organicTracks[toon] === gag.track)) {
      return mask;
    }
    return mask | (1 << toon);
  }, 0);
}

export function canAssignGagsToToons(eligibleMasks: number[]): boolean {
  // Each gag needs a distinct Toon from its eligibility mask.
  function assign(index: number, used: number): boolean {
    if (index === eligibleMasks.length) return true;
    let choices = eligibleMasks[index] & ~used;
    while (choices) {
      const toon = choices & -choices;
      if (assign(index + 1, used | toon)) return true;
      choices ^= toon;
    }
    return false;
  }

  return assign(0, 0);
}
