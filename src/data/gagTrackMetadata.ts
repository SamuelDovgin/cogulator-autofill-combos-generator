import type { GagTrackInfo } from '../types';

export type GagTrackMetadata = Omit<GagTrackInfo, 'gags'>;

export const gagTrackMetadata: GagTrackMetadata[] = [
  {
    name: 'Toonup',
    color: '#C55AE8',
    order: 0,
    dmgType: 'Heal',
  },
  {
    name: 'Trap',
    color: '#E8E65A',
    order: 1,
    dmgType: 'Damage',
  },
  {
    name: 'Lure',
    color: '#33BD35',
    order: 2,
    dmgType: 'Lure',
  },
  {
    name: 'Sound',
    color: '#3D5DEB',
    order: 3,
    dmgType: 'Damage',
  },
  {
    name: 'Throw',
    color: '#ED9F32',
    order: 4,
    dmgType: 'Damage',
  },
  {
    name: 'Squirt',
    color: '#F55BD6',
    order: 5,
    dmgType: 'Damage',
  },
  {
    name: 'Drop',
    color: '#32EAED',
    order: 6,
    dmgType: 'Damage',
  },
];
