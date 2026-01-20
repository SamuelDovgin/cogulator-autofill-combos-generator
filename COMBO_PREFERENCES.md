# Combo Preferences

This document tracks preferred gag combinations that should rank highly in the calculator's suggestions. Use this to inform weight adjustments.

---

## Preferred Combos by Cog Level

### Level 9 Cog (110 HP)

| Combo | Damage | Notes | Priority |
|-------|--------|-------|----------|
| 1 Safe + 2 Seltzers | 70 + 21 + 21 = 112 (with group bonus ~115) | Efficient 3-toon combo, uses Drop + Squirt | HIGH |
| 1 Safe + 2 Fire Hoses | 70 + 30 + 30 = 130+ | Higher damage but uses level 5 Squirt | MEDIUM |
| 1 Piano + 1 Seltzer | 170 + 21 = 191 | 2-toon overkill, uses level 6 Drop | LOW (overkill) |

**Why Safe + 2 Seltzers is preferred:**
- Uses lower-level gags (Safe=5, Seltzer=4)
- Only 3 toons needed
- Drop benefits from stun bonus from Squirts hitting first (when not lured)
- Conserves Fire Hoses for other battles

### Level 10 Cog (132 HP)

| Combo | Damage | Notes | Priority |
|-------|--------|-------|----------|
| 2 Pianos | ~170*2 + group = ~374 | Massive overkill but only 2 toons | MEDIUM |
| 1 Piano + 2 Seltzers | 170 + 21*2 + group = ~220 | 3 toons, good efficiency | HIGH |
| Lure + TNT + Cream Pie | 180 + 50% bonus + 17 = ~300 | Lure combo, high accuracy on Throw | HIGH |

### Level 11 Cog (156 HP)

| Combo | Damage | Notes | Priority |
|-------|--------|-------|----------|
| Lure + TNT + Whole Cream | 180*1.5 + 40*1.5 = 270 + 60 = 330 | Classic lure combo | HIGH |
| 2 Pianos | ~374 | Overkill but fast | MEDIUM |

### Level 12 Cog (182 HP)

| Combo | Damage | Notes | Priority |
|-------|--------|-------|----------|
| Lure + TNT + Birthday Cake | 180*1.5 + 100*1.5 = 270 + 150 = 420 | High damage lure combo | HIGH |
| Lure + 2 Storm Clouds | 80*2*1.5 + group = ~255 | 3 toons, organic squirt helps | MEDIUM |

---

## General Gag Preferences

### Prefer Seltzer/Fruit over Aoogah

When multiple combos achieve similar results, prefer **Seltzer Bottle** and **Fruit Pies** over **Aoogah**:

| Gag | Level | Conserve Weight | Preference |
|-----|-------|-----------------|------------|
| Seltzer Bottle | 4 | 0.04 | USE MORE |
| Fruit Pie Slice | 2 | 0.03 | USE MORE |
| Whole Fruit Pie | 4 | 0.05 | USE MORE |
| Aoogah | 4 | 0.06 | USE LESS |
| Elephant Trunk | 5 | 0.05 | NEUTRAL |

**Rationale:**
- Seltzer/Fruit combos are more flexible (available to all toons with Throw/Squirt)
- Sound gags affect all cogs, which can be undesirable in multi-cog battles
- Aoogah usage often leads to using more total gags (e.g., Safe + 3 Aoogahs vs Safe + 2 Seltzers)

**Example:** For a level 9 cog (110 HP):
- ✅ Safe + 2 Seltzers (3 gags, ~115 damage) - preferred
- ❌ Safe + 3 Aoogahs (4 gags, ~128 damage) - uses more gags

---

## Weight Adjustment Philosophy

### To Promote Safe + Seltzers for Level 9:

The weighted scoring formula is:
```
Score = (Acc × wAcc) + (LevelMetric × wConserve) + (TrackCount × wTracks)
```

Where `LevelMetric = maxEffectiveLevel*10 + avgEffectiveLevel`

**Key insight:** Safe (level 5) + Seltzer (level 4) should score better than:
- Fire Hose (level 5) + Safe (level 5) - same max level but higher avg
- Piano (level 6) + anything - higher max level

**Recommended adjustments:**

1. **Lower Safe weight** from 0.12 to 0.08 (use more freely)
2. **Lower Seltzer weight** from 0.07 to 0.04 (use more freely)
3. **Keep Fire Hose weight** at 0.10 (slightly higher to prefer Seltzer)
4. **Keep Piano weight** at 0.20 (discourage level 6 when lower works)

### Track Preferences

- **Drop + Squirt combos** should be favored (2 tracks = good track score)
- **Drop alone** has low accuracy (50%), so pairing with Squirt for stun bonus is strategic
- **Lure combos** get favorable treatment via the Lure track multiplier setting

---

## Current Weight Issues Identified

1. **Safe weight (0.12)** may be too high, causing calculator to avoid suggesting it
2. **Seltzer weight (0.07)** may be too high relative to Fire Hose (0.10)
3. **Fire Hose vs Seltzer**: Should prefer Seltzer for weaker cogs, Fire Hose for stronger

---

## Recommended Default Weight Changes

```json
{
  "Drop:3:Anvil": 0.04,            // progression
  "Drop:4:Big Weight": 0.05,       // should not exceed Safe
  "Drop:5:Safe": 0.06,             // was 0.12 - use more freely
  "Squirt:4:Seltzer Bottle": 0.04, // was 0.07 - prefer over Fire Hose for lower cogs
  "Squirt:5:Fire Hose": 0.12,      // was 0.10 - slightly discourage for lower cogs
  "Sound:4:Aoogah": 0.06,          // was 0.02 - prefer Seltzer/Fruit over Aoogah
  "Sound:5:Elephant Trunk": 0.05,  // was 0.04 - slight bump
  "Throw:2:Fruit Pie Slice": 0.03, // was 0.04 - prefer over Aoogah
  "Throw:4:Whole Fruit Pie": 0.05  // was 0.10 - prefer over Aoogah
}
```

**Note:** Big Weight should never have a higher conserve weight than Safe, since Safe is the more valuable gag.

These changes make the "1 Safe + 2 Seltzers" combo rank higher for level 9 cogs because:
- Lower effective level metric (5*0.06 + 4*0.04*2 = 0.30 + 0.32 = 0.62) vs previous
- Still maintains good accuracy (Drop benefits from Squirt stun)
- Uses fewer high-value gags

---

## Testing Checklist

After weight adjustments, verify these combos appear in top suggestions:

- [ ] Level 9: "1 Safe + 2 Seltzers" in top 5
- [ ] Level 10: Lure combos with TNT appear
- [ ] Level 11: Lure + TNT + Cream appears
- [ ] Level 12+: Piano combos don't dominate when Lure combos work
