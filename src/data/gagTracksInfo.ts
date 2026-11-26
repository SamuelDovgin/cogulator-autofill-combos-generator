import type { GagTrackInfo } from '../types';
import { GAGS } from './gagsInfo';
import { gagTrackMetadata } from './gagTrackMetadata';

export const GagTracks: GagTrackInfo[] = gagTrackMetadata.map(
  ({ name, color, order, dmgType }) => ({
    gags: Object.values(GAGS)
      .filter((gag) => gag.track === name)
      .sort((a, b) => a.level - b.level),
    color,
    name,
    order,
    dmgType,
  }),
);
