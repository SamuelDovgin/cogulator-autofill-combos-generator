# Big Brain Town - Working Document

A comprehensive gag calculator for Toontown Rewritten to help players optimize their battle strategies.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Usage Guide](#usage-guide)
4. [Configuration](#configuration)
5. [Technical Architecture](#technical-architecture)
6. [Work Log](#work-log)
7. [Known Issues](#known-issues)
8. [Future Improvements](#future-improvements)

---

## Overview

**Big Brain Town** (Cogulator) is a web-based calculator designed to help Toontown Rewritten players:
- Calculate optimal gag combinations for defeating cogs
- Understand accuracy probabilities and damage calculations
- Plan efficient strategies for various cog levels

**Tech Stack:** React + TypeScript + TailwindCSS + Web Workers

---

## Features

### Core Functionality

#### Damage Calculation
- **Base Damage:** Sum of individual gag damages (uses max damage values)
- **Group Bonus:** +ceil(trackDamage/5) when 2+ gags of same track target same cog
- **Lure Bonus:** +ceil(trackDamage/2) for non-Sound tracks hitting lured targets
- **Organic Bonus:** +ceil(maxDmg * organicBonus) with minimum +1

#### Accuracy Calculation
- **Probabilistic KO Calculation:** Computes one-turn KO probability accounting for all hit/miss branches
- **Track Experience:** +60 for maxed tracks (+30 for Toon-Up)
- **Target Defense:** Level-based negative modifier (see TOONTOWN_BATTLE_RULES.md)
- **Stun Bonus:** +25% per damaging hit, +50% for trap activation (capped at +75%)
- **Same-Track Rule:** All gags of same track share one accuracy roll

#### Lure Mechanics
- Throw/Squirt/Sound auto-hit on lured targets
- Drop always misses on lured targets (0%)
- First successful damage hit ends lure status
- Multi-lure bonus system for using multiple lures

#### Trap Mechanics
- Only one trap per target
- Trap activates when Lure hits
- Trap provides +10% accuracy bonus to Lure (+5% per extra trap with group Lure)
- Trap activation grants +50% stun bonus

### User Interface

#### Cog Level Selection (Top Bar)
- 20 cog level buttons (1-20)
- Visual health bar showing damage vs HP
- Hover preview for temporary calculations
- Click to commit target level

#### Gag Palette
- 7 tracks (Toon-Up hidden by default)
- Click to select gag, hover to preview
- **Orange highlights:** Gags that would result in a kill
- **Organic button:** Hover over gag to reveal, click for organic version
- **Track toggles:** Enable/disable tracks from combo suggestions

#### Selection Display
- Shows currently selected gags
- Drag to reorder, click X to remove
- Toggle organic status on selected gags
- Real-time damage/accuracy display

#### Kill Combos Panel
- **Sorted suggestions** for completing the kill
- **Three sort modes:**
  - Accuracy: Highest KO probability first
  - Conserve: Lowest gag levels first
  - Weighted: Custom formula balancing all factors
- **Accuracy popover:** Click accuracy % for detailed breakdown
- **Favorites system:** Star combos for quick access

### Configuration Options

#### Toon Settings
- Number of toons (1-4)
- Per-toon track restrictions (trapless, lureless, etc.)

#### Target Settings
- **Already Lured:** Treat target as pre-lured (disables Lure/Trap)
- **Remaining HP:** Override for damaged cogs
- **Current DMG:** Alternative to Remaining HP

#### Level Exclusions
- Exclude levels 1-3 (low-level gags)
- Exclude level 7 (SOS cards)
- Per-track level 6 exclusion

#### Weighted Sorting
- **Accuracy weight:** Importance of KO probability
- **Conserve weight:** Importance of using lower-level gags
- **Tracks weight:** Prefer fewer unique tracks
- **Gag retain weights:** Per-gag conservation importance
- **Lure track multiplier:** How much Lure counts toward track score

---

## Usage Guide

### Basic Workflow

1. **Select target level** by clicking a cog button
2. **Add gags** by clicking on the gag palette
3. **View suggestions** in the Kill Combos panel
4. **Apply a suggestion** by clicking "Use"

### Tips

- **Hover to preview:** Hover over gags and cog levels to see effects before committing
- **Use organic gags:** Hover over a gag to reveal the organic leaf button
- **Adjust weights:** Fine-tune the weighted sorting to match your playstyle
- **Save favorites:** Star combos you use frequently

### Keyboard Shortcuts

- Click gags to select
- Use browser back/forward for undo (if applicable)

---

## Configuration

### Settings Export/Import

Access via the gear icon in the header:
- **Export full settings:** All preferences, weights, and current state
- **Export weights only:** Just sorting weights and gag conservation values
- **Import:** Paste JSON to restore settings
- **Reset to defaults:** Clear all customizations

### Default Weights Philosophy

```
Toon-Up: Moderate conservation (healing is valuable)
Trap: Use freely (want to spend these)
Lure: Use freely (want to spend these)
Sound: Use freely (especially trunk)
Throw: Moderate conservation
Squirt: Slightly prefer Seltzer over Fire Hose for lower cogs
Drop: Use freely (Safe+Squirt combos are efficient)
```

See `COMBO_PREFERENCES.md` for detailed weight tuning.

---

## Technical Architecture

### File Structure

```
src/
├── App.tsx                    # Main application component
├── components/
│   ├── Cog.tsx               # Individual cog level button
│   ├── CogDamageTable.tsx    # Cog level selection bar
│   ├── Gag.tsx               # Individual gag tile
│   ├── GagTrack.tsx          # Track row with gags
│   ├── KillOptionsTable.tsx  # Combo suggestions panel
│   ├── AccuracyPopover.tsx   # Accuracy breakdown popover
│   ├── CalculationDisplay.tsx# Selected gags display
│   └── ...
├── data/
│   ├── gagsInfo.ts           # Gag definitions (70 gags)
│   └── gagTracksInfo.ts      # Track definitions
├── utils/
│   ├── calculatorUtils.ts    # Core damage/accuracy calculations
│   ├── fillToKillOptionsWorker.ts # Combo generation (Web Worker)
│   └── defaultSettings.ts    # Default configuration
└── hooks/
    └── useFillToKillOptions.ts # Worker communication hook
```

### Key Algorithms

#### Damage Calculation (`calculateTotalDamage`)
1. Process gags in track order
2. Handle trap placement and activation
3. Calculate group and lure bonuses
4. Sum all damage components

#### Accuracy Calculation (`calculateComboAccuracy`)
1. Build probability tree for all hit/miss branches
2. Recursively evaluate each branch
3. Sum probabilities where damage >= HP

#### Combo Generation (`fillToKillOptionsWorker`)
1. Enumerate valid gag combinations
2. Filter by toon restrictions and track enables
3. Calculate damage and accuracy for each
4. Sort by selected mode (accuracy/conserve/weighted)
5. Return top N results

---

## Work Log

### 2026-01-18: Battle Rules Update (v4.0.5 Compliance)

**Changes Made:**
- Created `TOONTOWN_BATTLE_RULES.md` - comprehensive battle mechanics reference
- Updated trap activation stun bonus: 30% -> 50% (v4.0.5)
- Updated trap bonus for Lure accuracy to stack (+5% per extra trap)
- Fixed stun cap description: "capped at +75" (was incorrectly showing +100)
- Created `AccuracyPopover.tsx` - improved accuracy explanation UI with:
  - Click-to-open popover (replaces hard-to-read native tooltip)
  - Color-coded track calculations
  - Outcome branches showing KO vs Survive probabilities
  - Collapsible rules reference

**Bug Fixes:**
- Fixed lure bonus not showing on cog health buttons when "Already Lured" enabled
  - Added `isTargetAlreadyLured` prop to CogDamageTable
  - Passed lured status to calculateTotalDamage
- Fixed Clear button to also clear "Already Lured" status
- Fixed organic buttons being covered by track bar above
  - Added `hover:z-[100]` to Gag component

**Weight Adjustments:**
- Created `COMBO_PREFERENCES.md` for tracking preferred combos
- Adjusted default weights to favor "1 Safe + 2 Seltzers" for level 9:
  - Safe: 0.12 -> 0.06
  - Big Weight: 0.08 -> 0.05 (should not exceed Safe)
  - Anvil: 0.05 -> 0.04
  - Seltzer: 0.07 -> 0.04
  - Fire Hose: 0.10 -> 0.12
- Changed default maxGenerated from 50000 to 30 (more reasonable default)

### Previous Work

- Initial calculator implementation
- Weighted sorting system
- Favorites system
- Settings export/import
- Track enable/disable toggles
- Per-toon restrictions
- Orange highlight hints
- Hover preview system

---

## Known Issues

1. **Mobile touch support:** Organic buttons may be difficult to tap on small screens
2. **Large combos:** Very high maxGenerated values may cause performance issues
3. **Multi-target scenarios:** Calculator focuses on single-target damage

---

## Future Improvements

### Planned
- [ ] Multi-cog battle support (calculate for 4 cogs simultaneously)
- [ ] Battle history / undo system
- [ ] Preset combo libraries
- [ ] Mobile-optimized layout

### Under Consideration
- Sound round optimization (multiple cogs)
- Boss battle specific modes
- Cog attack damage calculator
- Gag restock tracking

---

## Related Documents

- `TOONTOWN_BATTLE_RULES.md` - Complete battle mechanics reference
- `COMBO_PREFERENCES.md` - Preferred combos and weight tuning
- `FEATURES.md` - Original feature documentation
