# Big Brain Town V2 - Feature Documentation

A comprehensive gag calculator for Toontown Rewritten, designed to help players optimize their gag strategies for defeating cogs.

---

## Table of Contents

- [Core Calculator Features](#core-calculator-features)
- [Gag Selection System](#gag-selection-system)
- [Target Configuration](#target-configuration)
- [Kill Combo Generator](#kill-combo-generator)
- [Sorting and Filtering](#sorting-and-filtering)
- [Toon Restrictions](#toon-restrictions)
- [Settings and Customization](#settings-and-customization)
- [Changelog](#changelog)

---

## Core Calculator Features

### Damage Calculation
- **Total Damage**: Calculates the combined damage of all selected gags
- **Base Damage**: Sum of individual gag damage values (includes organic bonuses)
- **Group Bonus**: +ceil(trackDamage/5) when 2+ gags of the same track are used together
- **Lure Bonus**: +ceil(trackDamage/2) when hitting a lured target with non-Sound damage tracks
- **Organic Bonus**: +ceil(maxDmg * 0.10) for organic gags (minimum +1)

### Accuracy Calculation
- Computes one-turn KO probability considering:
  - Base gag accuracy
  - Track experience bonus (assumed max for all tracks used)
  - Target defense based on cog level
  - Stun bonus (+25% per hit from Sound/Throw/Squirt, capped at +75%)
  - Lure interactions (Throw/Squirt/Sound auto-hit lured targets; Drop auto-misses)
  - Trap triggering on successful Lure
- Accounts for all hit/miss branches to compute exact KO probability

### Max Cog Level
- Displays the highest cog level (1-20) that can be defeated with the current gag selection
- Assumes all gags hit for this calculation

### Cog Health Reference
- Visual damage table showing all cog levels 1-20
- Hover to preview damage against each level
- Click to select a target level for kill combo suggestions
- Health formula: Levels 1-11: (lvl+1)*(lvl+2), Levels 12+: (lvl+1)*(lvl+2)+14

---

## Gag Selection System

### Gag Palette
- All 7 gag tracks displayed (Toon-Up hidden by default)
- Click any gag to add it to your selection
- Hover to preview the gag's effect on calculations
- Organic toggle on each gag (adds +10% damage, minimum +1)

### Selected Gags Display
- Shows current gag selection as an equation
- Gags grouped by track with visual separators
- Displays total damage calculation result
- Click any selected gag to remove it
- Clear all button (X icon) to reset selection

### Track Interactions
- **Trap**: Only one trap per target (duplicates are greyed out but removable)
- **Lure + Trap**: Trap triggers when Lure hits
- **Lure**: Enables lure bonus on subsequent damage tracks
- **Drop on Lured**: Always misses (0% accuracy)
- **Sound on Lured**: Hits but no lure bonus

### Gag Highlighting
- Orange highlight shows gags that would result in a kill
- Brightness indicates relative KO probability
- Toggle via "Highlight helpful gags" checkbox

---

## Target Configuration

### Cog Level Selection
- Click any level in the damage table to select
- Selected level used for accuracy calculations and kill combo generation

### Already Lured Toggle
- Simulates a cog that was lured in a previous round
- When enabled:
  - Lure and Trap gags are excluded from recommendations
  - A greyed-out magnet icon appears in the gag equation
  - Click the magnet icon to toggle off "already lured"
  - Throw/Squirt/Sound auto-hit; Drop auto-misses

### Remaining HP Override
- Custom HP input for damaged cogs
- Overrides the standard cog health for all calculations
- Useful for multi-round strategies

### Current Damage Input
- Alternative to Remaining HP
- Enter damage already dealt to the cog
- Automatically calculates remaining HP (Full HP - Current Damage)
- Clear button resets both HP fields

---

## Kill Combo Generator

### Automatic Suggestions
- Generates one-turn kill combinations based on:
  - Current gag selection
  - Target cog level
  - Available toon slots
  - Track restrictions
  - Enabled/excluded gag levels

### Combo Display
- Shows added gags needed to achieve kill
- Displays: Total toons, Total damage, Accuracy %, Overkill
- Detailed accuracy tooltip with calculation breakdown
- "Use" button to apply the combo to your selection

### Favorites System
- Star any combo to save it
- Favorites stored per scenario (level, HP, lured state, toons)
- Quick access to frequently used combos

---

## Sorting and Filtering

### Sort Modes

**Accuracy** (Default)
- Prioritizes highest one-turn KO probability
- Then conserves higher-level gags

**Conserve Gags**
- Prioritizes using lower-level gags
- Then maximizes accuracy

**Weighted**
- Customizable blend of factors:
  - Accuracy weight (0-20)
  - Conserve levels weight (0-20)
  - Tracks weight (0-20, fewer tracks preferred)
- Gag retain weights: per-gag importance values (0-1)

### Level Exclusions
- **Exclude Level 1-3**: Hide low-level gags from recommendations
- **Exclude Level 7**: Hide SOS/level 7 gags
- **Exclude Level 6 by Track**: Per-track level 6 exclusion

### Hide Overkill Additions
- Filters out combos that add gags without improving KO probability
- Removes redundant longer combos when shorter ones achieve same result

### Generation Cap
- Limits number of combos generated (50-50,000)
- Higher values find more options but take longer

---

## Toon Restrictions

### Max Toons Setting
- Set active toons (1-4)
- Limits gag selection and combo generation

### Per-Toon Track Restrictions
- **All tracks**: Toon has all gag tracks
- **Toon-Up-less**: Missing Toon-Up track
- **Trapless**: Missing Trap track
- **Lureless**: Missing Lure track
- **Soundless**: Missing Sound track
- **Dropless**: Missing Drop track

Note: All toons are assumed to always have Throw + Squirt.

### Track Enable/Disable
- Toggle entire tracks on/off for recommendations
- "Allow all" / "Disable all" quick buttons
- "Only" button to exclusively use one track

---

## Settings and Customization

### Sound Effects
- Toggle UI sounds on/off
- Click and hover sound effects

### Grey Out Excluded Levels
- Visual indicator for excluded gag levels
- Gags remain clickable even when greyed out

### Settings Import/Export
- Export full settings to JSON
- Export weights-only to JSON
- Import settings from JSON
- Reset to defaults

### Exported Settings Include
- Sound preferences
- Max toons and restrictions
- Level exclusions
- Track enables
- Sort mode and weights
- Gag conserve weights
- HP overrides
- Current gag selection

---

## Changelog

### Version 2.1.0 (Current)

**New Features:**
- **Current Damage Input**: New field under Remaining HP to enter damage already dealt to cog
  - Automatically calculates remaining HP from cog's full health minus entered damage
  - Prioritizes Remaining HP if both fields are filled
- **Clear Button**: One-click clear for both Remaining HP and Current DMG fields
- **Improved Lured State Handling**:
  - Magnet icon now appears in gag equation when "Already Lured" is active
  - Clicking the magnet icon toggles off "Already Lured" for ease of use
  - Trap/Lure gags shown greyed out (but removable) when target is lured

**Bug Fixes:**
- **Single Trap Limit**: Fixed combo generator suggesting multiple traps on same target
  - Worker now correctly limits trap capacity to 1 per cog
- **Greyed Out Gags Now Removable**: Duplicate traps and inactive Lure/Trap gags can be clicked to remove
  - Uses "soft" disabled variant that allows interaction
- **Dependency Array Fixes**: Fixed missing dependencies in useMemo hooks for:
  - `currentTotal` calculation (now includes `isTargetAlreadyLured`)
  - `currentAccuracy` calculation (now includes `isTargetAlreadyLured`, `targetHpOverride`)
- **HP Override Floor**: Changed minimum HP override from 1 to 0 to handle edge cases

**Technical Changes:**
- Renamed `effectiveSelectedGags` to `displaySelectedGags` and added `calcSelectedGags` for clearer separation
- Added `effectiveTargetHpOverride` computation that combines HP override with current damage
- Added `disabledVariant` prop to Gag component for soft disable styling
- Added `onAlreadyLuredChange` callback to CalculationDisplay component
- Simplified trap bonus calculation in `explainComboAccuracy` (now just +10, matching single-trap limit)

---

### Version 2.0.0

**Initial Release Features:**
- Complete gag damage and accuracy calculator
- Kill combo generator with multiple sort modes
- Toon restriction system
- Favorites system for saving combos
- Settings import/export
- Full Toontown Rewritten gag mechanics implementation
