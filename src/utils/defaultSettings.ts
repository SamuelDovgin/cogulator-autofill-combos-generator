import type { GagConserveWeights } from './fillToKillOptionsWorker';

// Default preset requested by user (2025-12-25)
export const DEFAULT_SORT_MODE = 'weighted' as const;
export const DEFAULT_SORT_WEIGHTS = { accuracy: 0.5, conserve: 0.05, tracks: 0.3 };
export const DEFAULT_MAX_GENERATED = 50000;
export const DEFAULT_TARGET_LEVEL = 10;

// Keys are "Track:Level:Gag Name".
// Weights 0-1: 0 = use freely, 1 = strongly conserve (avoid using)
// Philosophy: Throw/Squirt slightly conserve (Cream Pie > Hose for boilers)
//             Lure/Trap/Drop/Sound = use freely
export const DEFAULT_GAG_CONSERVE_WEIGHTS: GagConserveWeights = {
  // Toonup - moderate conservation (healing is valuable)
  'Toonup:1:Feather': 0.05,
  'Toonup:2:Megaphone': 0.08,
  'Toonup:3:Lipstick': 0.12,
  'Toonup:4:Bamboo Cane': 0.18,
  'Toonup:5:Pixie Dust': 0.25,
  'Toonup:6:Juggling Balls': 0.35,
  'Toonup:7:High Dive': 1,

  // Trap - use freely (want to spend these)
  'Trap:1:Banana Peel': 0,
  'Trap:2:Rake': 0,
  'Trap:3:Marbles': 0.01,
  'Trap:4:Quicksand': 0.02,
  'Trap:5:Trapdoor': 0.03,
  'Trap:6:TNT': 0.05,
  'Trap:7:Railroad': 1,

  // Lure - use freely (want to spend these)
  'Lure:1:$1 Bill': 0,
  'Lure:2:Small Magnet': 0,
  'Lure:3:$5 Bill': 0.01,
  'Lure:4:Big Magnet': 0.02,
  'Lure:5:$10 Bill': 0.05,
  'Lure:6:Hypno Goggles': 0.06,
  'Lure:7:Presentation': 1,

  // Sound - use freely (especially trunk)
  'Sound:1:Bike Horn': 0,
  'Sound:2:Whistle': 0,
  'Sound:3:Bugle': 0.01,
  'Sound:4:Aoogah': 0.02,
  'Sound:5:Elephant Trunk': 0.04,
  'Sound:6:Foghorn': 0.10,
  'Sound:7:Opera Singer': 1,

  // Throw - moderate conservation (want to keep some)
  'Throw:1:Cupcake': 0.02,
  'Throw:2:Fruit Pie Slice': 0.04,
  'Throw:3:Cream Pie Slice': 0.06,
  'Throw:4:Whole Fruit Pie': 0.10,
  'Throw:5:Whole Cream Pie': 0.18,  // Higher than Hose for boiler battles
  'Throw:6:Birthday Cake': 0.30,
  'Throw:7:Wedding Cake': 1,

  // Squirt - moderate conservation (slightly less than Throw)
  'Squirt:1:Squirting Flower': 0.005,
  'Squirt:2:Glass of Water': 0.02,
  'Squirt:3:Squirt Gun': 0.04,
  'Squirt:4:Seltzer Bottle': 0.07,
  'Squirt:5:Fire Hose': 0.1,
  'Squirt:6:Storm Cloud': 0.2,
  'Squirt:7:Geyser': 1,

  // Drop - use freely (want to spend these)
  'Drop:1:Flower Pot': 0.02,
  'Drop:2:Sandbag': 0.03,
  'Drop:3:Anvil': 0.05,
  'Drop:4:Big Weight': 0.08,
  'Drop:5:Safe': 0.12,
  'Drop:6:Grand Piano': 0.2,
  'Drop:7:Toontanic': 1
};
