import type { GagConserveWeights } from './fillToKillOptionsWorker';

// Default preset requested by user (2025-12-25)
export const DEFAULT_SORT_MODE = 'weighted' as const;
export const DEFAULT_SORT_WEIGHTS = { accuracy: 0.6, conserve: 0.2, tracks: 0.4 };
export const DEFAULT_MAX_GENERATED = 50000;
export const DEFAULT_TARGET_LEVEL = 10;

// Keys are "Track:Level:Gag Name".
export const DEFAULT_GAG_CONSERVE_WEIGHTS: GagConserveWeights = {
  'Toonup:1:Feather': 0.5,
  'Toonup:2:Megaphone': 0.5,
  'Toonup:3:Lipstick': 0.5,
  'Toonup:4:Bamboo Cane': 0.5,
  'Toonup:5:Pixie Dust': 0.5,
  'Toonup:6:Juggling Balls': 0.5,
  'Toonup:7:High Dive': 0.5,
  'Trap:1:Banana Peel': 0,
  'Trap:2:Rake': 0,
  'Trap:3:Marbles': 0,
  'Trap:4:Quicksand': 0,
  'Trap:5:Trapdoor': 0,
  'Trap:6:TNT': 0,
  'Trap:7:Railroad': 1,
  'Lure:1:$1 Bill': 0,
  'Lure:2:Small Magnet': 0,
  'Lure:3:$5 Bill': 0,
  'Lure:4:Big Magnet': 0,
  'Lure:5:$10 Bill': 0,
  'Lure:6:Hypno Goggles': 0.05,
  'Lure:7:Presentation': 1,
  'Sound:1:Bike Horn': 0,
  'Sound:2:Whistle': 0,
  'Sound:3:Bugle': 0,
  'Sound:4:Aoogah': 0,
  'Sound:5:Elephant Trunk': 0,
  'Sound:6:Foghorn': 0.02,
  'Sound:7:Opera Singer': 1,
  'Throw:1:Cupcake': 0,
  'Throw:2:Fruit Pie Slice': 0,
  'Throw:3:Cream Pie Slice': 0,
  'Throw:4:Whole Fruit Pie': 0,
  'Throw:5:Whole Cream Pie': 0.02,
  'Throw:6:Birthday Cake': 0.02,
  'Throw:7:Wedding Cake': 1,
  'Squirt:1:Squirting Flower': 0,
  'Squirt:2:Glass of Water': 0,
  'Squirt:3:Squirt Gun': 0,
  'Squirt:4:Seltzer Bottle': 0,
  'Squirt:5:Fire Hose': 0.02,
  'Squirt:6:Storm Cloud': 0.02,
  'Squirt:7:Geyser': 1,
  'Drop:1:Flower Pot': 0,
  'Drop:2:Sandbag': 0,
  'Drop:3:Anvil': 0,
  'Drop:4:Big Weight': 0,
  'Drop:5:Safe': 0,
  'Drop:6:Grand Piano': 0,
  'Drop:7:Toontanic': 1
};
