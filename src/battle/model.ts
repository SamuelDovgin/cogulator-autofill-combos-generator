import { GagTracks } from '../data/gagTracksInfo';
import type { GagInfo, GagTrack } from '../types';
import { calculateCogHealth } from '../utils/calculatorUtils';

export type Strategy = 'balanced' | 'fast' | 'conserve' | 'control';
export type BoilerPhase = 'Neutral' | 'Fired Up' | 'Defensive' | 'Meltdown';
export type RemoteKind = 'damage' | 'healing';
export type RemoteTier = 1 | 2 | 3;
export type OfficeTier = 1 | 2 | 3 | 4;

export const boilerHealth = { 1: 4000, 2: 4500, 3: 5000, 4: 5500 };
export const remoteStats = {
  1: { turns: 2, damage: 45, heal: 15, expiry: 45 },
  2: { turns: 3, damage: 60, heal: 20, expiry: 90 },
  3: { turns: 4, damage: 75, heal: 25, expiry: 150 },
};
export const remoteKeys = [
  'damage:1',
  'damage:2',
  'damage:3',
  'healing:1',
  'healing:2',
  'healing:3',
] as const;
export type RemoteKey = (typeof remoteKeys)[number];

export interface ActiveRemote {
  kind: RemoteKind;
  tier: RemoteTier;
  turns: number;
}
export interface CogState {
  id: number;
  level: number;
  hp: number;
  lure: number;
  layers: 1 | 2;
  trap?: number;
  remote?: ActiveRemote;
}
export interface BoilerState {
  tier: OfficeTier;
  hp: number;
  phase: BoilerPhase;
  turns: number;
  ordinance?: { track: GagTrack; turns: number };
}
export interface ToonState {
  stock: number[];
  organic: GagTrack | '';
  remotes: Partial<Record<RemoteKey, number>>;
  laff?: { current: number; max: number };
}
export interface BattleState {
  cogs: CogState[];
  toons: ToonState[];
  boiler?: BoilerState;
  blockedTracks?: GagTrack[];
}
export type Action =
  | { toon: number; kind: 'gag'; gag: number; target?: number | 'boiler' }
  | { toon: number; kind: 'remote'; remote: RemoteKey; target: number }
  | { toon: number; kind: 'pass' };

export interface BattleRound {
  actions: Action[];
  before: BattleState;
  after: BattleState;
  accuracy: number;
  damage: number;
  healing: number;
  threats: number;
  retaliation: boolean;
}

export interface BattlePlan {
  rounds: BattleRound[];
  cleared: boolean;
}

export const battleGags: GagInfo[] = GagTracks.flatMap((track) => track.gags);
export const trackOrder = GagTracks.map((track) => track.name);
export const trackGags = Object.fromEntries(
  trackOrder.map((track) => [
    track,
    battleGags.flatMap((gag, index) => (gag.track === track ? [index] : [])),
  ]),
) as Record<GagTrack, number[]>;

const stockByTrack: Record<GagTrack, number[]> = {
  Toonup: [0, 0, 0, 2, 3, 3, 0],
  Trap: [0, 0, 0, 2, 3, 2, 0],
  Lure: [0, 0, 0, 4, 4, 3, 0],
  Sound: [1, 0, 1, 3, 5, 2, 0],
  Throw: [1, 1, 0, 3, 7, 3, 0],
  Squirt: [1, 1, 1, 2, 4, 3, 0],
  Drop: [0, 0, 0, 2, 3, 3, 0],
};

export function makeToon(): ToonState {
  return {
    stock: battleGags.map((gag) => stockByTrack[gag.track][gag.level - 1]),
    organic: '',
    remotes: {},
  };
}

export function makeCog(id: number, level = 10): CogState {
  return { id, level, hp: calculateCogHealth(level), lure: 0, layers: 1 };
}

export function activeRemote(key: RemoteKey): ActiveRemote {
  const [kind, star] = key.split(':') as [RemoteKind, string];
  const tier = Number(star) as RemoteTier;
  return { kind, tier, turns: remoteStats[tier].turns };
}

export function isCleared(state: BattleState) {
  return state.boiler
    ? state.boiler.hp === 0
    : !state.cogs.some((cog) => cog.hp > 0);
}

export const strategyOptions: { id: Strategy; name: string; detail: string }[] =
  [
    {
      id: 'balanced',
      name: 'Balanced',
      detail: 'Quick clears with selective use of premium gags.',
    },
    {
      id: 'fast',
      name: 'Fast clear',
      detail: 'Spend more to remove threats and finish sooner.',
    },
    {
      id: 'conserve',
      name: 'Conserve gags',
      detail: 'Save Foghorns, level 7s and other scarce stock.',
    },
    {
      id: 'control',
      name: 'Control Cogs',
      detail: 'Favor Lure, remotes and healing when Laff is entered.',
    },
  ];

export const reliableClear = 0.8;

export const trackName = (track: GagTrack) =>
  track === 'Toonup' ? 'Toon-Up' : track;
export const remoteName = (key: RemoteKey) => {
  const { kind, tier } = activeRemote(key);
  return `${kind === 'damage' ? 'Damage' : 'Healing'} Remote (${tier}★)`;
};
