# Toontown Rewritten Battle Rules

A comprehensive reference for all battle mechanics, accuracies, stun bonuses, and calculations in Toontown Rewritten.

> **Document Version:** Based on patches through v4.0.5 (July 19, 2024)

---

## Table of Contents

1. [Track Resolution Order](#track-resolution-order)
2. [Accuracy Calculations](#accuracy-calculations)
3. [Stun Mechanics](#stun-mechanics)
4. [Gag Track Details](#gag-track-details)
5. [Damage Calculations](#damage-calculations)
6. [Cog Health](#cog-health)
7. [Target Defense](#target-defense)
8. [Organic Bonuses](#organic-bonuses)
9. [Lure Mechanics](#lure-mechanics)
10. [Trap Mechanics](#trap-mechanics)
11. [Version 2.0 Cogs](#version-20-cogs)
12. [Patch History](#patch-history)

---

## Track Resolution Order

Gags resolve in a fixed order each round:

1. **Toon-Up** (healing)
2. **Trap** (placement only - does not activate yet)
3. **Lure** (triggers Trap if placed on same target)
4. **Sound**
5. **Throw**
6. **Squirt**
7. **Drop**

---

## Accuracy Calculations

### Base Formula

```
atkAcc = propAcc + trackExp + targetDefense + stunBonus + [bonuses]
```

Where:
- **propAcc**: Base gag accuracy (see gag tables below)
- **trackExp**: +60 for max experience in the track (+30 for Toon-Up)
- **targetDefense**: Negative modifier based on Cog level (see table below)
- **stunBonus**: +25% per successful damaging hit (capped at +75%)
- **bonuses**: Trap bonus (+10-20% for Lure), Lure combo bonus (multi-lure)

### Accuracy Caps

| Cap Type | Value | Notes |
|----------|-------|-------|
| Maximum | 95% | No gag can exceed 95% accuracy |
| Minimum | 5% | Global floor for all gags |
| Drop on Lured | 0% | Drop always misses on lured targets |

### Same-Track Accuracy Rule

When multiple gags of the same track target the same Cog, they share ONE accuracy roll. All hit together or all miss together.

---

## Stun Mechanics

### What Grants Stun Bonus

| Action | Stun Bonus | Patch Source |
|--------|------------|--------------|
| Sound hit | +25% | v4.0.0 (was +20% pre-v4.0.0) |
| Throw hit | +25% | v4.0.0 (was +20% pre-v4.0.0) |
| Squirt hit | +25% | v4.0.0 (was +20% pre-v4.0.0) |
| Drop hit | +25% | v4.0.0 (would apply if any action followed) |
| Trap activation hit | +50% | v4.0.5 (was +30% in v4.0.0) |

### What Does NOT Grant Stun Bonus (v4.0.0)

- Trap placement
- Successful Lure (lure itself doesn't stun)
- Reward usages
- Successful Doodle tricks
- Successful Toon-Up

### Stun Bonus Cap

**Maximum stun bonus: +75%** (equivalent to 3 damaging gag hits)

---

## Gag Track Details

### Toon-Up

| Gag | Level | Base Accuracy | Heal (Min-Max) | Affects |
|-----|-------|---------------|----------------|---------|
| Feather | 1 | 70% | 8-10 | Single |
| Megaphone | 2 | 70% | 15-18 | All |
| Lipstick | 3 | 70% | 25-30 | Single |
| Bamboo Cane | 4 | 70% | 40-45 | All |
| Pixie Dust | 5 | 70% | 50-60 | Single |
| Juggling Balls | 6 | 70% | 75-105 | All |
| High Dive | 7 | 95% | 210 | All |

**Organic Bonus:** +20% healing (v4.0.0 - was +10% prior)

**Track Experience Bonus:** +30 (half of normal tracks)

**Stun:** Does NOT grant stun bonus (v4.0.0)

---

### Trap

| Gag | Level | Accuracy | Damage (Min-Max) | Affects |
|-----|-------|----------|------------------|---------|
| Banana Peel | 1 | 100% | 10-12 | Single |
| Rake | 2 | 100% | 18-20 | Single |
| Marbles | 3 | 100% | 30-35 | Single |
| Quicksand | 4 | 100% | 45-50 | Single |
| Trapdoor | 5 | 100% | 75-85 | Single |
| TNT | 6 | 100% | 90-180 | Single |
| Railroad | 7 | 100% | 200 | All |

**Organic Bonus:** +10% damage (standard)

**Trap Rules:**
- Only ONE trap per target (extra traps are redundant)
- Trap placement does NOT grant stun bonus (v4.0.0)
- Trap activates when Lure successfully hits
- Trap activation grants +50% stun bonus (v4.0.5)
- Cannot be placed on already-lured targets

---

### Lure

| Gag | Level | Base Accuracy | Rounds | Affects | Patch Source |
|-----|-------|---------------|--------|---------|--------------|
| $1 Bill | 1 | 60% | 2 | Single | v4.0.0 (was 50%) |
| Small Magnet | 2 | 55% | 2 | All | v4.0.0 (was 50%) |
| $5 Bill | 3 | 70% | 3 | Single | v4.0.0 (was 60%) |
| Big Magnet | 4 | 65% | 3 | All | v4.0.0 (was 60%) |
| $10 Bill | 5 | 80% | 4 | Single | v4.0.0 (was 70%) |
| Hypno Goggles | 6 | 75% | 4 | All | v4.0.0 (was 70%) |
| Presentation | 7 | 90% | 15 | All | v4.0.0 (was 95%) |

**Organic Bonus:** +10% base accuracy shift (not additive during calculation) (v4.0.0)

**Lure Accuracy Bonuses:**

| Bonus Type | Amount | Condition | Patch Source |
|------------|--------|-----------|--------------|
| Trap Bonus | +10% | Target has trap placed | v4.0.0 |
| Trap Stacking | +5% per extra trap | When using group Lure on multiple trapped targets | v4.0.5 |
| Lure Combo (same level) | +20% | Multiple lures of same type and level | v4.0.0 |
| Lure Combo (1 level diff) | +15% | Multiple lures of same type, 1 level apart | v4.0.0 |
| Lure Combo (2+ level diff) | +10% | Multiple lures of same type, 2+ levels apart | v4.0.0 |

**Multi-Lure Rules (v4.0.0):**
- Higher-level Lure gags override the base accuracy of lower-level Lure gags
- Group Lures paired with Group Lures yield Lure Bonus
- Dollar Bills paired with Dollar Bills yield Lure Bonus
- Group Lures and Dollar Bills used together do NOT grant Lure Bonus

---

### Sound

| Gag | Level | Base Accuracy | Damage (Min-Max) | Affects |
|-----|-------|---------------|------------------|---------|
| Bike Horn | 1 | 95% | 3-4 | All |
| Whistle | 2 | 95% | 5-7 | All |
| Bugle | 3 | 95% | 9-11 | All |
| Aoogah | 4 | 95% | 14-16 | All |
| Elephant Trunk | 5 | 95% | 19-21 | All |
| Foghorn | 6 | 95% | 25-50 | All |
| Opera Singer | 7 | 95% | 90 | All |

**Organic Bonus:** +10% damage (standard)

**Carrying Capacity:** Reduced in v4.0.0 (same as Trap's pre-v3.0.0 capacity)

**Sound on Lured Targets:**
- Sound hits lured targets (auto-hit)
- Sound does NOT receive lure bonus damage
- First Sound hit ends lure status

---

### Throw

| Gag | Level | Base Accuracy | Damage (Min-Max) | Affects |
|-----|-------|---------------|------------------|---------|
| Cupcake | 1 | 75% | 4-6 | Single |
| Fruit Pie Slice | 2 | 75% | 8-10 | Single |
| Cream Pie Slice | 3 | 75% | 14-17 | Single |
| Whole Fruit Pie | 4 | 75% | 24-27 | Single |
| Whole Cream Pie | 5 | 75% | 36-40 | Single |
| Birthday Cake | 6 | 75% | 48-100 | Single |
| Wedding Cake | 7 | 75% | 120 | All |

**Organic Bonus:** +10% damage (standard)

**Throw on Lured Targets:**
- Auto-hit (100% accuracy)
- Receives +50% lure bonus damage
- First Throw hit ends lure status

---

### Squirt

| Gag | Level | Base Accuracy | Damage (Min-Max) | Affects |
|-----|-------|---------------|------------------|---------|
| Squirting Flower | 1 | 95% | 3-4 | Single |
| Glass of Water | 2 | 95% | 6-8 | Single |
| Squirt Gun | 3 | 95% | 10-12 | Single |
| Seltzer Bottle | 4 | 95% | 18-21 | Single |
| Fire Hose | 5 | 95% | 27-30 | Single |
| Storm Cloud | 6 | 95% | 36-80 | Single |
| Geyser | 7 | 95% | 105 | All |

**Organic Bonus:** +15% damage (v4.0.0 - was +10% prior)

**Squirt on Lured Targets:**
- Auto-hit (100% accuracy)
- Receives +50% lure bonus damage
- First Squirt hit ends lure status

---

### Drop

| Gag | Level | Base Accuracy | Damage (Min-Max) | Affects |
|-----|-------|---------------|------------------|---------|
| Flower Pot | 1 | 50% | 10 | Single |
| Sandbag | 2 | 50% | 18 | Single |
| Anvil | 3 | 50% | 30 | Single |
| Big Weight | 4 | 50% | 45 | Single |
| Safe | 5 | 50% | 60-70 | Single |
| Grand Piano | 6 | 50% | 85-170 | Single |
| Toontanic | 7 | 50% | 180 | All |

**Base Accuracy Description:** "Very Low" (v4.0.0 - was "Low" prior)

**Organic Bonus:** +15% damage (v4.0.0 - was +10% prior)

**Drop on Lured Targets:**
- **Always misses (0% accuracy)**
- Never use Drop on lured targets

---

## Damage Calculations

### Base Damage
Uses the maximum damage value for each gag.

### Group Bonus
When 2+ gags of the same track hit the same target:
```
groupBonus = ceil(trackBaseDamage / 5)
```

### Lure Bonus
When hitting a lured target (except Sound):
```
lureBonus = ceil(trackBaseDamage / 2)
```

### Total Damage Formula
```
totalDamage = baseDamage + groupBonus + lureBonus
```

---

## Cog Health

| Cog Level | Health | Formula |
|-----------|--------|---------|
| 1 | 6 | (1+1) * (1+2) = 6 |
| 2 | 12 | (2+1) * (2+2) = 12 |
| 3 | 20 | (3+1) * (3+2) = 20 |
| 4 | 30 | (4+1) * (4+2) = 30 |
| 5 | 42 | (5+1) * (5+2) = 42 |
| 6 | 56 | (6+1) * (6+2) = 56 |
| 7 | 72 | (7+1) * (7+2) = 72 |
| 8 | 90 | (8+1) * (8+2) = 90 |
| 9 | 110 | (9+1) * (9+2) = 110 |
| 10 | 132 | (10+1) * (10+2) = 132 |
| 11 | 156 | (11+1) * (11+2) = 156 |
| 12+ | (L+1)*(L+2)+14 | Level 12: 182, Level 13: 196, etc. |

---

## Target Defense

| Cog Level | Defense Modifier |
|-----------|------------------|
| 1 | -2 |
| 2 | -5 |
| 3 | -10 |
| 4 | -12 |
| 5 | -15 |
| 6 | -25 |
| 7 | -30 |
| 8 | -35 |
| 9 | -40 |
| 10 | -45 |
| 11 | -50 |
| 12 | -55 |
| 13-19 | -60 |
| 20 | -65 |

---

## Organic Bonuses

All organic bonuses are calculated with **rounding UP** (ceil) since v4.0.0.

| Track | Organic Bonus | Patch Source |
|-------|---------------|--------------|
| Toon-Up | +20% healing | v4.0.0 (was +10%) |
| Trap | +10% damage | Standard |
| Lure | +10% base accuracy shift | v4.0.0 |
| Sound | +10% damage | Standard |
| Throw | +10% damage | Standard |
| Squirt | +15% damage | v4.0.0 (was +10%) |
| Drop | +15% damage | v4.0.0 (was +10%) |

**Minimum organic bonus:** +1 damage/healing

---

## Lure Mechanics

### Effects on Lured Targets

| Track | Effect on Lured Target |
|-------|------------------------|
| Throw | Auto-hit (100%), +50% lure bonus, ends lure |
| Squirt | Auto-hit (100%), +50% lure bonus, ends lure |
| Sound | Auto-hit (100%), NO lure bonus, ends lure |
| Drop | Auto-miss (0%), cannot hit lured targets |
| Lure | No-op if target already lured |
| Trap | Cannot be placed on lured targets |

### Lure Duration
Lure lasts for the number of rounds specified by the gag, unless:
- A damaging gag (Throw/Squirt/Sound) hits the target
- The Cog is destroyed

---

## Trap Mechanics

### Trap Activation

1. Trap must be placed BEFORE Lure in the same round, or in a previous round
2. When Lure successfully hits a trapped target:
   - Trap damage is applied
   - Trap activation grants +50% stun bonus (v4.0.5)
   - Target is NOT set to lured (trap "consumes" the lure)

### Trap Bonus for Lure Accuracy (v4.0.5)

| Condition | Accuracy Bonus |
|-----------|----------------|
| Base trap bonus | +10% |
| Per extra trap (group Lure) | +5% additional |

Example: Group Lure on 4 trapped Cogs = +10% + (3 * 5%) = +25% total trap bonus

---

## Version 2.0 Cogs

### Reinforced Plating (v4.0.0)
- Defense attribute that blocked damage per gag based on Cog level was **REMOVED**
- When destroyed, v2.0 Cogs transform into Skelecogs that CAN still attack (no longer skip their turn)

### Promotion Experience
- v2.0 Cogs drop **double** the promotion experience of their level

---

## Patch History

### v4.0.5 (July 19, 2024)

**Balancing Changes:**
- Increased Trap Activation Stun Bonus from 30% to 50%
- Trap's 10% Lure Accuracy Bonus now stacks with multiple trapped Cogs (+5% per extra Trap when using group Lure)

### v4.0.0 (May 24, 2024) - Under New Management

**Stun Bonus Overhaul:**
- Trap Placements, Successful Lures, Doodle Tricks, and Toon-Ups NO LONGER grant stun bonuses
- Damaging gag hits (Sound/Throw/Squirt/Drop) now grant +25% stun (was +20%)
- Trap Activation hits grant +30% stun (later increased to +50% in v4.0.5)

**Lure Accuracy Adjustments:**
- $1 Bill: 50% -> 60%
- Small Magnet: 50% -> 55%
- $5 Bill: 60% -> 70%
- Big Magnet: 60% -> 65%
- $10 Bill: 70% -> 80%
- Hypno Goggles: 70% -> 75%
- Presentation: 95% -> 90%

**Lure Mechanics:**
- Higher-level Lure gags override lower-level base accuracy
- Organic Lure now shifts base accuracy by +10% (not additive during calculation)
- Multi-Lure Bonus system introduced (20/15/10% based on level discrepancy)
- Trap provides +10% accuracy bonus to Lure on trapped targets

**Organic Bonus Changes:**
- All organic bonuses now round UP (ceil) instead of down
- Organic Toon-Up: 10% -> 20% healing bonus
- Organic Squirt: 10% -> 15% damage bonus
- Organic Drop: 10% -> 15% damage bonus

**Sound:**
- Maximum carrying capacity reduced

**Drop:**
- Accuracy description changed from "Low" to "Very Low" (still 50% base)

**v2.0 Cogs:**
- Removed defense attribute (Reinforced Plating)
- Skelecogs now attack after v2.0 Cog is destroyed

---

## Quick Reference Card

### Accuracy Formula
```
atkAcc = min(95, max(5, propAcc + trackExp + defense + stunBonus + bonuses))
```

### Key Rules
1. **Same track, same target = one roll** (all hit or all miss)
2. **Stun bonus:** +25% per damaging hit, +50% for trap activation, capped at +75%
3. **Lured targets:** Throw/Squirt/Sound auto-hit; Drop auto-miss
4. **Lure bonus:** +50% damage (ceil(damage/2)) for non-Sound tracks
5. **Group bonus:** +20% damage (ceil(damage/5)) for 2+ same-track gags
6. **Track exp:** +60 (or +30 for Toon-Up) if you have the track maxed
