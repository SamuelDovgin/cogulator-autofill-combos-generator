# Cogulator — Boiler Battle Planner

**Product / technical design specification · draft v1.1 (secondary mode + miss recovery) · 15 November 2026**  
**Repository:** [SamuelDovgin/cogulator-autofill-combos-generator](https://github.com/SamuelDovgin/cogulator-autofill-combos-generator) (`main`)  
**Status:** proposal only; no repository files changed. **v1.1:** Secondary/opt-in integration, miss-recovery UX options, and pending usability questions; see §14.

## 1. One-page product decision

Build an **optional, secondary Boiler Quick Planner** inside the existing Cogulator React app. The current Classic calculator stays the default landing experience, retains its existing workflows/settings/results, and must not be replaced or behaviorally altered. The Boiler tool launches only when deliberately selected; its state and worker are isolated and lazy-loaded. Its first interaction should be four quick taps on Cog levels. The application then immediately suggests complete, assigned moves for **Toon 1–4**, indicating which Cog each gag targets, the chance of clearing the group, levels of gags consumed, and Boiler retaliation risk.

The MVP should be optimized for a player with a short Toontown battle countdown and who wants to spend **no time on setup**; do not promise a specific game timer length. Four taps should be sufficient; there must be **no required Calculate, Confirm, Open Settings, or Apply buttons**. For repeated enemy configurations, one tap (`Repeat`) should suffice.

### Default product behavior

- Existing Classic remains unchanged; the optional `Boiler Quick Planner` entry is visually secondary (for example a small Tools link or compact tab, **not** a new default homepage). Closing the planner returns to the exact Classic state without resetting its selected gags or sort preferences.
- Four Cog slots, left-to-right, initially empty. A single level palette from **1 through 20**, with 8–15 visually prominent and 16–20 immediately accessible, fills the next vacant slot on each tap. More levels can be supported through a configurable cap.
- Assume four fully trained Toons, max non-organic damage, and sufficient gags for *this* round; organic effects OFF. **This is intentionally an optimistic simplified gag-access model**: actual Toons each have a missing track, so show the assumption beside results and support per-Toon track restrictions later.
- Automatically calculate after every level selection. The top recommendation stays visible without scrolling.
- Apply a **Boiler-aware conservation profile**. Level 7 gags are excluded in the default preset; try combinations without level 6 first, then introduce the fewest strategically justified level 6 gags if a sufficiently reliable clear is not otherwise possible. Users can turn on level 7 manually.
- Keep **Recommended**, **Save Gags**, and **Higher Reliability** as compact pre-turn alternatives when meaningfully different. Do not confuse these with a **post-miss rescue** recommendation, which depends on the observed battle result.
- Put a subtle `Miss / Survived?` affordance on the visible recommendation, not another required step. After the round resolves, optionally enter recovery by tapping surviving Cog slot(s); recompute from the post-round state without re-entering the original lineup. Preserve the old plan in a reversible snapshot. See §14.
- Separate **Cog Wave** from **Boiler Active**. The Boiler is a fifth target in the latter case, *not* one of the four Cog slots. The Boiler phase must affect the safety of using Sound and targeting the boss.
- `Next Wave` clears only targets and round-specific effects. It retains Toon assumptions, Field Office tier, strategy, and inventory assumption. `Repeat` restores the last target configuration. **`Recover` is different from `Next Wave`:** it keeps only observed survivors of the *same* battle and uses explicit/uncertain remaining-HP information.
- Do **not** automatically manipulate the Toontown game client or scrape the screen. This is a fast manual companion calculator.

### Explicit out of scope for v1

Live game integration, OCR, automated game input, customizable per-Toon inventories, tracking spent gag counts across floors, SOS/Unite/Remote simulations, arbitrary historical battle replay, complete multi-turn boss health simulation, and complete Laff/attack forecasting. **One-step miss recovery for the immediately previous recommended move is in scope**, without attempting to reconstruct unknown historical events. Design the contracts so these can be added later.

---

## 2. What the existing repository really does

Inspected the current `main` versions of:

| File | Existing behavior | Boiler Mode reuse or change |
|---|---|---|
| [`src/App.tsx`](https://github.com/SamuelDovgin/cogulator-autofill-combos-generator/blob/main/src/App.tsx) | Single target level, selected gag tray, settings, results; state for `maxToons`, `sortMode`, track exclusions, and imported settings | Add **optional** Boiler entry / lazy-loaded side tool; **Classic stays default and retains live state** |
| [`src/utils/calculatorUtils.ts`](https://github.com/SamuelDovgin/cogulator-autofill-combos-generator/blob/main/src/utils/calculatorUtils.ts) | Cog HP, trained gag damage, lure/trap interactions, group bonus, and branch-based single-target accuracy | Extract/reuse pure primitives; **do not** call single-target total damage once for four targets |
| [`src/utils/fillToKillOptionsWorker.ts`](https://github.com/SamuelDovgin/cogulator-autofill-combos-generator/blob/main/src/utils/fillToKillOptionsWorker.ts) | Generates 1–4 gag **multisets** to KO *one Cog*, filters them, sorts by accuracy/conserve/weighted | Keep separate from a new *four-Toon × up-to-five-target* action planner |
| [`src/hooks/useFillToKillOptions.ts`](https://github.com/SamuelDovgin/cogulator-autofill-combos-generator/blob/main/src/hooks/useFillToKillOptions.ts) | Web Worker initialization and `postMessage`, manages result/loading state | Reuse the pattern with request IDs, late-result protection, deterministic previews, and caching |
| [`src/utils/defaultSettings.ts`](https://github.com/SamuelDovgin/cogulator-autofill-combos-generator/blob/main/src/utils/defaultSettings.ts) | Default mode `weighted`, weights accuracy **0.5**, conserve **0.05**, tracks **0.3**; individual gag weights | New Boiler preset must be separate; current extremely low conservation weighting does not implement strict no-level-6 preference |
| [`src/components/KillOptionsTable.tsx`](https://github.com/SamuelDovgin/cogulator-autofill-combos-generator/blob/main/src/components/KillOptionsTable.tsx) | Detailed one-target results with damage, accuracy, overkill, `Use` button | Replace in Boiler Mode with 3 condensed, action-ready **Toon assignment cards** |
| [`src/components/CogDamageTable.tsx`](https://github.com/SamuelDovgin/cogulator-autofill-combos-generator/blob/main/src/components/CogDamageTable.tsx) | Existing clickable 1–20 level strip | Reuse its visual vocabulary, but apply clicks to the next Cog slot |
| [`src/data/gagsInfo.ts`](https://github.com/SamuelDovgin/cogulator-autofill-combos-generator/blob/main/src/data/gagsInfo.ts) | Track, level, damage, accuracy, one/all-target metadata and gag images | Source of truth for gag IDs; expand to explicit inventory, targeting, and Boiler eligibility |
| [`src/types.ts`](https://github.com/SamuelDovgin/cogulator-autofill-combos-generator/blob/main/src/types.ts) | Single-Cog status and gag types | Add battle context, per-target state, assignments and probability output |

### Important technical findings

1. The existing worker enumerates combinations with repetition and tests whether they can be assigned to available Toons. **It does not choose Cog targets** or evaluate attacks across several targets.
2. It treats Trap as limited to one because it solves for one target. A four-target solver must enforce trap constraints *per target*.
3. Its `FillToKillOption` contains `{addedGags, totalDamage, overkill, accuracy}` — no target IDs, per-Toon slots, shared-area damage or phase effects.
4. The default profile already distinguishes gag preservation (for example Birthday Cake weight 0.30, Foghorn 0.10, Storm Cloud 0.20, Wedding Cake 1). Keep the philosophy but make the Boiler tradeoff explicit, rather than overloading the existing general profile.
5. The worker's `maxGenerated` cap can stop enumeration before globally optimal solutions are found. A new solver should use branch bounds / constrained search and expose whether it found an **exact** or **budget-limited** solution. Never call a truncated-search answer provably optimal.
6. `useFillToKillOptions` currently does not identify each request and discard late responses. Rapid input of four numbers creates a risk of **older results replacing newer results**. Boiler Mode needs request sequencing.
7. Current accuracy values and implementation should be regression-tested against the **2026 soft accuracy cap** before presenting any solution as guaranteed.

---

## 3. Boiler mechanics that materially change the planner

References: [The Boiler — Toontown Rewritten Wiki](https://toontownrewritten.wiki/The_Boiler), [Cog Health](https://toontownrewritten.wiki/Cog_health), [Accuracy](https://toontownrewritten.wiki/accuracy), and [official release notes](https://www.toontownrewritten.com/news/release-notes/all).

- Ordinary Cog HP is `(level+1)(level+2)` through level 11, and `(level+1)(level+2)+14` from level 12 upward. Accordingly: **L8 90, L9 110, L10 132, L11 156, L12 196, L13 224, L14 254, L15 286, L16 320**.
- In the Boiler room, an **active Boiler** has **4,000 / 4,500 / 5,000 / 5,500 HP** for 1–4 stars. Only **Sound, Throw and Squirt** can directly damage it.
- **Fired Up:** damage to Boiler is boosted by 50%; attacking the Boiler is generally strategically attractive.
- **Defensive Strategy:** hitting the Boiler causes a punishing retaliation. **Sound is an all-target gag**: using Sound to clear Cog minions can also damage the Boiler and trigger retaliation. It is not automatically safe just because the user selected Cog targets.
- **Neutral / Fired Up / Defensive / Meltdown** are different contexts; a recommendation that is good for a standalone group of four Cogs can be dangerous when the Boiler is present.
- Boiler phases, Cog defense buffs, lure state, blocked gag tracks, and available gags are optional refinements. MVP should clearly state what is *not* represented rather than silently computing misleading results.
- TTR's accuracy cap was changed to a **soft** 95% cap with the 4.3.3-era change, noted officially in April 2026. Avoid a blanket `max 95%` rule; tests should model correlated track rolls and bonuses consistently.

**Critical rule:** Treat the Boiler as a separate fifth possible target in a Boiler-active battle. Sound/other all-target damage is applied to every eligible enemy, including the boss. A `Defense` phase warning takes priority over a high raw KO score.

---

## 4. Interaction design: the four-click screen

### Primary screen — no setup required

**Placement:** Classic is the primary interface, not a mode users must choose every visit. Launch the separate `Boiler Quick Planner` from a small header/Tools affordance. Once opened, the planner can have its own uncluttered page or panel; returning must restore the exact Classic selection and scroll/focus context where practical. **No recommendation to redesign the main calculator.**

```text
┌────────────────────────────  COGULATOR  ─────────────────────────────┐
│ Classic   [ BOILER ]             ★★  2-star   [Cog Wave / Boiler Active] │
│ Strategy: [Balanced ▾]           Lv7: OFF       Maxed gags: ON      │
│                                                                      │
│ ENEMIES                   Click a slot to replace its level          │
│ [1  LV12   ×] [2  LV10   ×] [3  LV12   ×] [4  LV09   ×]             │
│                                                                      │
│ TAP TO ADD:  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15         │
│              16 17 18 19 20             [Fill x4] [Repeat] [Clear]  │
│                                                                      │
│ ★ RECOMMENDED    [Reliable clear / Partial clear / Needs Lv6]       │
│ Toon 1   [gag icon] Foghorn          → ALL COGS                     │
│ Toon 2   [gag icon] Elephant Trunk   → ALL COGS                     │
│ Toon 3   [gag icon] Elephant Trunk   → ALL COGS                     │
│ Toon 4   [gag icon] Elephant Trunk   → ALL COGS                     │
│     Outcome:  __ / 4 KOs   •  P(full clear) __%   •  1 level-6 gag   │
│                                                                      │
│ [Conserve alternative]        [Highest reliability alternative]      │
│                                                                      │
│ [ ← Undo ]   [ NEXT WAVE → ]   [Advanced ▾]                          │
└──────────────────────────────────────────────────────────────────────┘
```

**Wireframe values and actions above are illustrative, not an actual evaluated recommendation for the mixed levels shown.** Dynamic results must always come from the battle solver.

### Interaction contract

| User action | Immediate result | Solver behavior |
|---|---|---|
| Click `12` with slot 1–4 next empty | Populate next empty slot, advance active slot | Recalculate with all populated targets; show results if actionable |
| Click a filled slot then `14` | Replace **only** that enemy's level | Recalculate in place |
| Click the small `×` in a Cog slot | Remove that enemy without changing other levels | Recalculate |
| Click `Fill ×4`, then `11` | Fill all four slots with level 11 | One computation; no four repeated clicks |
| Click `Repeat` | Restore prior wave levels | One computation |
| Click `Undo` | Restore preceding board state | Recompute or retrieve cache |
| Click `Next Wave` | Snapshot current wave as previous; empty targets; preserve persistent settings | No gag inventory decrease in MVP |
| Click `Miss / Survived?` after resolution | Enter quick recovery overlay with original four Cog slots still visible | Do not alter the Classic calculator; see §14 |
| Tap a surviving Cog in recovery | Mark it alive; **first tap defaults other original Cogs to defeated**, with reversible toggles | Immediately recompute a conservative/explicit-HP rescue plan (not a same-turn replacement) |
| Tap `All survived` or `All cleared` in recovery | One-action common-outcome shortcut | Recompute with four survivors or finish/reset current wave accordingly |
| Tap `Undo recovery` | Restore the pre-recovery lineup and selected recommendation | Restore prior snapshot without re-entering four levels |
| Click a recommendation card | Expand its detailed per-target damage and accuracy breakdown | No change to actual recommendation; no new computation required |
| Toggle `Lv7` | Recompute; when OFF, never recommend a level 7 gag | Enforced as a hard constraint |
| Select `Boiler Active` | Show boss status and phase controls without consuming Cog slots | Include boss in all-target gag resolution and phase scoring |
| Select `Defensive Strategy` | Warning banner and revised recommendations | Mark all plans that may hit boss and retaliate as dangerous |

### Ease-of-use decisions

- Start with the level palette in the visible viewport; no modal or screen-height navigation.
- **One level palette shared by all four slots**, not four individual dropdowns containing 20 choices each.
- A selected Cog is highlighted; untouched level clicks fill the next empty slot automatically.
- Support keyboard `Esc` for clearing active selection, `Backspace` to undo most recent target, and simple keyboard input only as an optional convenience; do not let focus conflict with the game.
- Show all four Toon actions as **one shared lineup** rather than making the user inspect four separate results or choose gags personally.
- Prefer recognizable gag images + short names + explicit target marker (`ALL`, `1`, `2`, `3`, `4`, `BOILER`) over verbose tooltips.
- Display only the top three meaningfully different **pre-turn plans**; put other options behind `More`. After a miss, replace the summary with **Recovery: next turn**, not a fourth plan mixed into the same carousel.
- Recovery must be optional, immediately dismissible, and reachable with one obvious click/tap from the current result. Do **not** ask the user to individually mark four gags as hit/missed by default.
- When no clean one-turn plan exists, **do not display “No results”**. Return best partial clear, best control setup, and the first feasible level-6 escalation.
- Display `Calculating…` without blanking the most recent result; mark it as *outdated* until the new request completes. Never allow a stale recommendation to look valid for a newly selected lineup.
- Support small laptop widths without horizontal scrolling; keep a highly legible fixed board area at ~900–1400px desktop width.

---

## 5. Strategy policy: reliable vs efficient

A single weighted average is not sufficient: the user must be able to say "never spend level 7," and the app must not trade life-threatening retaliation for a tiny conservation improvement. Therefore use **hard eligibility gates + Pareto candidates + contextual ranking**, not just one summed score.

### Recommended defaults

**Preset: Balanced Boiler (default)**

1. Exclude level 7 (unless user overrides).
2. For every candidate, enforce legal targets, Toon restrictions, phase constraints, same-turn action count and maximum trained gag damage.
3. Seek reliable plans with no level-6 gags first; if none meet reliability target, search options with one, then two, three, and four level-6 gags. **But** show a higher-reliability level-6 alternative when a no-level-6 plan is fragile.
4. Apply a **minimum reliability target** of `P(full clear) ≥ 80%` for four-Cog single-turn clears as an MVP policy, not as a game fact. Offer a compact `Safer` plan when possible. (A stricter per-target threshold may also be used.)
5. Favor clearing all four Cogs, then maximizing reliable kills, then reducing surviving enemy attacks, then conserving high-level gags, then avoiding wasted damage.
6. Preserve Birthday Cake and Storm Cloud more strongly when planning before a future Fired Up round; preserve Foghorn based on the current room context, and never recommend Opera Singer by default.
7. **Override the normal ranking** if a Boiler Defensive phase would cause an unsafe retaliation. Surface a warning and control-oriented alternatives.

**Preset: Max Safety** prioritizes retaliation avoidance and kill probability, permitting more level 6 usage. **Preset: Save Gags** conserves level 6 more aggressively, allowing lower one-turn clear chance or two-round control plans. **Preset: Fast Clear** maximizes high-confidence enemies defeated this turn with secondary conservation.

### Objective definitions

At minimum, compute and display:

- `P_full_clear`: probability **all** active normal Cogs are knocked out this round.
- `expected_KOs`: sum of per-target KO probabilities (does not imply independent rolls).
- `P_any_survivors`: probability at least one normal Cog survives.
- `level6_spend` and `level7_spend`: action counts; levels 7 are excluded by default.
- `gag_cost`: contextual relative cost by gag type, track and level; can incorporate future availability.
- `overkill`: total **non-useful** damage beyond targets' remaining HP; report only when useful for tie-breaking.
- `retaliation_risk`: Boolean / probability / potential Laff loss depending on phase and target, with no unverified exact value.
- `turns_to_clear` (later): approximate projected turns to a safe clear rather than purely optimizing current damage.

**Do not** multiply four individual target accuracies to estimate `P_full_clear`. Sound and track-based events have dependencies. Calculate the combined probability across shared hit/miss event branches, preserving correlations and per-target defense.

### How the three cards should read

| Card | Meaning | Main ranking logic |
|---|---|---|
| **Recommended** | Best practical action this turn given room phase | Feasible + safe, reliable enough, modest gag spend |
| **Save Gags** | Minimal rare gag use within an acceptable safety band | Cheapest level 6/7 usage, then expected kills |
| **High Reliability** | Greater KO confidence, possibly more expensive | Highest full-clear chance, risk then resource use |

When a group cannot be cleared: replace the Recommended label with **Best Setup** and show expected survivors and next-turn utility. A future version can show `Turn 1: Lure / control` and `Turn 2: Finish` as a paired solution, but this must not be passed off as a verified one-turn kill.

---

## 6. Worked efficiency examples: Sound thresholds

For **maxed, non-organic** Sound gags, assuming all hit, no defense buffs, standard simultaneous same-track group damage bonus of 20% rounded up, and no phase-related Boiler complications:

| Toon 1–4 Sound lineup | Damage to **each** normal Cog | Highest normal Cog level killed in one turn | Level 6 spent |
|---|---:|---:|---:|
| 4 × Aoogah | 77 | 7 (72 HP) | 0 |
| 3 × Elephant Trunk + 1 × Aoogah | 95 | 8 (90 HP) | 0 |
| 4 × Elephant Trunk | 101 | 8 (90 HP) | 0 |
| 1 × Foghorn + 3 × Elephant Trunk | 136 | 10 (132 HP) | 1 |
| 2 × Foghorn + 2 × Elephant Trunk | 171 | 11 (156 HP) | 2 |
| 3 × Foghorn + 1 × Elephant Trunk | 206 | 12 (196 HP) | 3 |
| 4 × Foghorn | 240 | 13 (224 HP) | 4 |

Example calculation for `1 Fog + 3 Trunks`: `(50 + 21 + 21 + 21) + ceil(113 / 5) = 113 + 23 = 136`.

**Why this table matters:** Four level-12 Cogs **cannot all be killed by a four-Trunk Sound combination**. A planner that refuses all level-6 gags must recommend a different solution (perhaps multiround / control), not erroneously promise a one-turn clear. Equally, four level-14 Cogs exceed the maximum damage of four maxed Foghorns and will need something other than a routine Fog-only clear.

**Important caveats:** These are raw **on-hit** calculations, **not** probability-of-KO calculations. They are not safe Boiler Defensive-phase recommendations. Same-track, cross-target, organic, defense, stun, and accuracy interactions must be modeled before ranking real moves. The game's basic Sound damage and Cog HP data are documented at [Sound](https://toontownrewritten.wiki/Sound) and [Cog Health](https://toontownrewritten.wiki/Cog_health).

### Alternative design archetypes (not interchangeable with full-group clears)

- **Broad Sound clear:** Best when several Cogs sit under the same Sound damage threshold and Boiler retaliation is not a problem. Can consume many Foghorns if the enemies are 11–13.
- **Cheap partial clear:** Target the highest-risk Cog with a reliable Throw/Squirt/Drop combination while controlling or leaving others. Should say `1/4 KO` or `2/4 KOs`, not imply an all-clear.
- **Lure + concentrated Throw:** One Lure and three maxed Whole Cream Pies on *one* target produce `120 + ceil(120/5) + ceil(120/2) = 204` conditional on successful interactions, potentially defeating a **single level-12 Cog (196 HP)** with **no level-6 gag**. This spends four Toon turns on one target; it is **not** an efficient four-Cog clear by itself.
- **Trap / Lure setup:** Useful as a single-target elimination or crowd-control pattern, but must respect trap triggering and the repo's existing `trapTriggeredThisRound` fix.
- **Boiler Fired Up damage:** Save Throw/Squirt heavy hitters for the offensive boss window when 50% extra boss damage applies; compare damage per rare gag, not raw Cog KO count.
- **Boiler Defensive control:** Prefer staying off the Boiler, managing surrounding Cogs, healing and preparing; treat Sound and other all-target gags that hit the boss as potential retaliation triggers.

---

## 7. Data model and event contracts

These are suggested TypeScript interfaces, not existing repository code.

```ts
type TargetId = 'cog-1' | 'cog-2' | 'cog-3' | 'cog-4' | 'boiler';
type BoilerPhase = 'none' | 'neutral' | 'fired-up' | 'defensive' | 'meltdown';
type StrategyPreset = 'balanced' | 'save-gags' | 'max-safety' | 'fast-clear';

type EnemySlot = {
  id: Exclude<TargetId, 'boiler'>;
  level: number | null;  // 1-20 initially, extensible
  remainingHp?: number;  // absent means full health by level
  lured?: boolean;
  defenseBuff?: number;
};

type ToonAssumption = {
  id: 0 | 1 | 2 | 3;
  maxed: true;
  organicTrack?: string | null; // null for v1
  unavailableTrack?: string | null; // null for v1 optimistic default
};

type BattleSnapshot = {
  schemaVersion: 1;
  battleId: string;
  waveId: number;
  officeTier: 1 | 2 | 3 | 4;
  phase: BoilerPhase;
  enemies: EnemySlot[]; // exactly four, slots may be empty
  boiler?: { remainingHp: number; phase: Exclude<BoilerPhase, 'none'> };
  toons: ToonAssumption[]; // exactly four
  strategy: StrategyPreset;
  allowLevel7: boolean;
  inventoryMode: 'assume-full';
  recovery?: {
    originWaveId: number;
    originPlanId: string;
    remainingHpKnowledge: 'exact' | 'estimated' | 'unknown';
    survivingTargetIds: TargetId[];
  }; // NEW v1.1: optional immediate post-round rescue context
};

type ToonAction = {
  toonId: 0 | 1 | 2 | 3;
  gagId: string | null;   // null means pass / no attack
  targetIds: TargetId[]; // single target or resolved ALL targets
};

type Plan = {
  actions: [ToonAction, ToonAction, ToonAction, ToonAction];
  perTarget: Record<TargetId, { expectedDamage: number; koChance?: number }>;
  probabilityFullClear: number | null;
  expectedCogKOs: number;
  countLevel6: number;
  countLevel7: number;
  relativeResourceCost: number;
  retaliationWarning?: string;
  verified: boolean; // all evaluated game rules supported for displayed metric
};

type PlannerRequest = { requestId: number; snapshot: BattleSnapshot };
type PlannerResponse = {
  requestId: number;
  snapshotHash: string;
  exact: boolean; // false if time/branch budget stopped exhaustive search
  plans: { recommended?: Plan; conserve?: Plan; reliable?: Plan };
  warnings: string[];
};
```

### Reducer events

```ts
type BattleAction =
  | { type: 'ADD_COG_LEVEL'; level: number }
  | { type: 'REPLACE_COG_LEVEL'; slotId: EnemySlot['id']; level: number }
  | { type: 'REMOVE_COG'; slotId: EnemySlot['id'] }
  | { type: 'FILL_ALL'; level: number }
  | { type: 'SET_STRATEGY'; strategy: StrategyPreset }
  | { type: 'SET_OFFICE_TIER'; tier: 1 | 2 | 3 | 4 }
  | { type: 'SET_BOILER_PHASE'; phase: BoilerPhase }
  | { type: 'SET_BOILER_HP'; remainingHp: number }
  | { type: 'SET_LEVEL7_ALLOWED'; allowed: boolean }
  | { type: 'REPEAT_WAVE' }
  | { type: 'NEXT_WAVE' }
  | { type: 'UNDO' }
  | { type: 'RESET_SESSION' }
  | { type: 'OPEN_RECOVERY'; fromPlanId: string }
  | { type: 'TOGGLE_SURVIVOR'; targetId: TargetId }
  | { type: 'ALL_SURVIVED' }
  | { type: 'ALL_CLEARED' }
  | { type: 'SET_SURVIVOR_HP'; targetId: TargetId; remainingHp: number }
  | { type: 'UNDO_RECOVERY' };
```

**Key semantics:**

- `ADD_COG_LEVEL` chooses the currently focused slot if present; otherwise the leftmost empty slot. If all slots are filled, **do not silently replace any Cog** — require selecting a slot or clicking Clear/Next Wave.
- `FILL_ALL` is a single state transaction and single compute request.
- `NEXT_WAVE` saves the previous lineup, increments the wave ID, clears round status and four levels, preserves room settings; does not spend gags in `assume-full` mode.
- `SET_BOILER_PHASE` triggers recomputation even if the four levels are unchanged.
- `REPEAT_WAVE` restores previous levels while preserving the current phase/strategy; it should not silently resurrect old HP/status effects.
- `UNDO` reverts the most recent input action, not the previous solver result.
- `RESET_SESSION` is intentionally separate from `NEXT_WAVE` to avoid accidental loss of strategy and settings.
- Recovery state is an **overlay/snapshot of one turn**, not a rewrite of four normal Cog inputs. It must preserve original level, original plan, chosen surviving targets and remaining-HP confidence, and let the user undo.
- `TOGGLE_SURVIVOR` first entry is optimized for the common one-survivor case. Subsequent toggles can identify two or more survivors without manually clearing the original four slots.
- A Cog being alive does **not** reveal its exact remaining HP; when unknown, assume full level HP for a clearly labeled conservative calculation, or ask for an *optional* quick HP edit. Do not show exact KO odds based on guessed HP.
- The tool cannot infer which gag missed or whether Sound, group bonuses, statuses and target-specific hit events applied merely from a Cog surviving. A separate optional `Which missed?` detail may reconstruct HP only if enough events are specified and verified.

---

## 8. Solver design: from one target to a group

### Pipeline

1. **Normalize:** Validate levels, max HP, boss phase/tier, per-Toon gag availability, exclusions and gag maxima.
2. **Precompute:** For each enemy level, cache HP and target defense. Prepare a gag catalog with target modes and base damage. Cache per-target 1–4 Toon combo evaluations where valid.
3. **Generate promising action templates:** Group Sound / other all-target attacks; one-Cog concentrated actions; two-Cog split damage; crowd-control; mixed Sound-plus-single-target; and boss-specific damage/control in Fired Up/Defense. Include `pass` and non-damage actions where necessary.
4. **Assign actual Toon slots and targets:** Backtracking over up to four players, with symmetry pruning for equivalent Toons and stable Toon numbering for display. Enforce legal target eligibility and special interactions at the resolved target level.
5. **Simulate each turn in game attack order:** Toon-Up, Trap, Lure, Sound, Throw, Squirt, Drop, respecting current game behavior. Resolve AoE against **each** target including Boiler if active. Apply same-track group bonus per target and lure/trap interactions only to eligible targets. Handle phase modifiers and retaliation.
6. **Evaluate stochastic outcomes:** Enumerate shared track hit/miss branches and target-specific conditions with exact probability mass where possible; calculate `P_full_clear`, expected KOs, retaliation risk. Do not assume independent Cog KO results.
7. **Filter:** Hard-exclude level 7 when OFF, illegal assignments, truly dominated plans, and duplicate plans that differ only in permuting equivalent Toons.
8. **Rank and diversify:** Use safety gate, reliability floor, minimal level-6 usage, resource cost and overkill; return three genuinely different plans if available.
9. **Respond incrementally:** Return fast provisional results first, followed by verified deeper search. Tag each response with `requestId` and `snapshotHash` so changing input never displays a stale plan as current.

### Why naïve brute force should not be used

A single-target multiset generator can enumerate candidate gags because it ignores target identities. For four Toons, assigning a gag and one of four Cog targets (or Boiler) to each Toon grows rapidly; global all-target effects, track order, statuses and accuracy events multiply evaluation work. Avoid enumerating every gag × every target × every Toon blindly.

Use target-aware action templates, cached damage, dominant-action pruning, phase-specific caps, lower bounds on guaranteed kill damage, and an anytime branch-and-bound / beam method. Exactness should be reported transparently: `exact: true` only after full bounded search of the declared catalog.

### A smart MVP shortcut

Implement accurate **all-Sound patterns** and **targeted single-track concentrated damage** first, because they are relatively easy to validate and valuable in real use. Next add mixed-target / mixed-track combinations, Lure/Trap/Drop and boss phase interactions. **Do not** describe early partial coverage as a full multi-track optimal solver.

---

## 9. Performance specification

The timer is a product constraint, not just a technical preference.

| Metric | Proposed target / requirement |
|---|---|
| Input→visual slot update | Synchronous on click, visually immediate |
| Four enemy entries | **4 clicks**, no confirm or calculate click |
| Repeat same 4 levels | **1 click** |
| Fill four identical levels | **2 clicks** (`Fill ×4`, level) |
| First useful plan after last click | Target **≤150ms p95** on a typical desktop, after benchmarking |
| Deep / alternative search | Target **≤500ms p95**, interruptible; do not block input |
| Older worker response | **Never** overwrite the current board's recommendations |
| Partial result status | Explicitly label if computed with limited search or simplified mechanics |
| Plan changes | Render minimal changes with no layout shift / scroll-jump |

Implementation guidance:

- Use one long-lived `boilerPlannerWorker` with monotonic request IDs. Ignore responses older than the current snapshot.
- Change the UI state synchronously and dispatch a calculation directly or during the next microtask. A large debounce (200–400ms) makes a countdown UX worse; prefer cancellation/stale-response suppression.
- Cache solved boards by normalized levels (sort only where order is not semantically relevant), boss phase, tier, settings, and inventory assumptions. Target slot identities still matter for display assignment.
- Precompute Cog HP and popular Sound thresholds; provide instant provisional cards for known cases without blocking deeper search.
- Bound expensive accuracy enumeration; retain visible result only if clearly labeled as previous snapshot when input changed.
- Profile on mid-tier laptops, test four quick clicks in succession, and benchmark multiple mixed Cogs (8–16).

---

## 10. Files and component architecture

Suggested additive structure (do not rewrite Classic until Boiler Mode proves useful):

```text
src/
  components/boiler/
    BoilerModePage.tsx          # main compact battle screen
    CogSlotRow.tsx              # four enemy cards, focus/replace/remove
    CogLevelPalette.tsx         # shared 1..20 click palette; Fill ×4
    BoilerContextStrip.tsx      # tier, phase, HP, warnings
    FourToonPlanCard.tsx        # four gags/targets and outcome
    StrategyChips.tsx           # recommended / save / reliable
    RecoveryQuickBar.tsx        # one-tap post-miss controls and survivor toggles
    RecoveryOutcomeDetail.tsx   # optional precise miss/HP input
    RecoveryPlanCard.tsx        # clearly next-turn plan, confidence label
  hooks/
    useBoilerBattle.ts          # reducer + undo/history + wave state
    useBoilerRecovery.ts        # one-step outcome transition; isolated from Classic
    useBoilerPlanner.ts         # request IDs, worker, caching
  data/
    boilerPresets.ts            # Boiler conservation + safety policy
  utils/
    boilerPlannerWorker.ts      # worker request/response protocol
    boilerPlannerSolver.ts      # templates, assignment, search
    battleSimulator.ts         # multi-target damage/status engine
    battleProbability.ts       # correlated hit/miss branch evaluation
    battlePlanRanking.ts       # policy gates + Pareto + diversity
    battlePlannerTypes.ts      # interfaces
    recoveryState.ts            # survivor state, uncertainty, previous-plan snapshot
  __tests__/
    boilerBattleReducer.test.ts
    boilerPlannerWorker.test.ts
    boilerDamage.test.ts
    boilerAccuracy.test.ts
    boilerRanking.test.ts
    boilerRecovery.test.ts
```

Use lazy loading for `BoilerModePage` and its worker to avoid slowing the existing single-target calculator. Preserve existing `App` defaults, working selected-gag state, and exported-settings v1; create a separate `boilerSettings` object (with its own schema version) instead of silently extending existing exports. **No refactor of Classic is necessary for launch.** Keep the recovery reducer inside Boiler-specific files.

---

## 11. QA / acceptance scenarios

| Test | Expected result |
|---|---|
| Enter `8,8,8,8` | Four distinct slots fill in four clicks; candidate `4 Elephant Trunks` visibly deals 101 per Cog when all land and is level-6-free |
| Enter `12,12,12,12` with Lv7 OFF | The system **never** claims four Trunks can clear the group; three Fog + one Trunk reaches 206 raw on-hit damage per Cog, but KO chance must be evaluated |
| Enter `14,14,14,14` | Four Fog on-hit 240 damage does **not** clear a 254-HP level-14 Cog; show accurate partial/multiround options or further escalation, not a false safe clear |
| Change target 2 from 10→13 | Only target 2 changes; any old plan is marked stale and new request wins |
| Four quick clicks while worker busy | UI never shows recommendation for a previous target snapshot as if it were current |
| Boiler Active → Defensive | Sound and other moves that hit Boiler show retaliation warning and are penalized / gated |
| Boiler Active → Fired Up | Boss-targeting Throw/Squirt damage includes correct phase multiplier |
| Lv7 OFF | No plan includes Opera, Wedding Cake, Geyser, Railroad, Toontanic, etc. |
| No all-clear within constraints | Show best partial kill/control, no misleading empty results |
| Two waves in succession | `Next Wave` preserves preset and tier; `Repeat` restores enemy levels |
| Track unavailable to one Toon (future) | That Toon is never assigned the missing track |
| Targeted Trap + Lure | No incorrect re-lure after Trap triggers, preserving current regression fix |
| Same-track accuracy events | No naïve multiplication of four individual KO probabilities |
| Worker search budget exceeded | Result labeled `search limited`, never `global optimum` |
| Existing Classic calculator reopened after a Boiler session | Original level/gags/sort/settings still present, with no new default workflow |
| One Cog survives after a recommended four-Cog plan | One tap on that Cog enters **Recovery · next turn**; other prior Cogs provisionally marked defeated; full-HP conservative fallback is visibly labeled |
| Two or more Cogs survive | Tapping additional original Cog slots toggles them alive; only active survivors enter the rescue plan |
| A four-Toon Sound attempt misses entirely | `All survived` shortcut; no false assumption that a particular Toon independently missed |
| Partially damaged surviving Cog, but exact damage unknown | Does not invent HP; displays `HP unknown · assuming full` and offers optional HP adjustment |
| User chooses a different gag lineup than recommended | No auto-deduction from the original plan; allow manual survivor/HP input and mark prior planned gag outcome unusable |
| A new Cog enters / Boiler phase changes before next turn | Recovery accepts new Cog level and phase adjustment without losing survivors |
| `Undo recovery` | Restores original board and recommended actions immediately |

### Measure actual usability

Recruit 2–3 players for timed tests with random four-Cog groups. Record: median click count, time to first readable recommendation, errors selecting/overwriting a Cog, time finding a viable no-7 action, and whether players correctly identify when using Sound would retaliate. Optimize these before adding knobs or settings.

---

## 12. Delivery sequence

**MVP 0 — Optional quick-tool shell:** Add a **secondary Boiler Quick Planner entry** without changing Classic default behavior, four slots, shared level palette, automatic solve trigger, Undo / Next Wave / Repeat and sticky results. Success: original calculator unchanged and a four-click Boiler input UX.

**MVP 1 — Accurate four-Cog combat + simple rescue:** Implement target-aware Sound, single-Cog attacks, Toon assignment, actual all-target processing, gag level policy, three-card ranking, and probability tests. Add one-tap survivor recovery and explicit unknown-HP labeling **after the base solver works**. Success: validated damage/accuracy, no stale results, and a one-survivor rescue without re-entering four levels.

**MVP 2 — True Boiler context:** Implement a fifth target, tier, phase, Fired Up multiplier, Defensive retaliation warnings, mixed group-and-boss attack rules, and Lure/Trap/Drop interactions. Success: warning/logic changes instantly with phase.

**Later — Precise recovery and persistent resources:** Exact hit/miss event entry, fully simulated post-turn statuses, real inventory per Toon, unavailable gag tracks, organic gags, blocked tracks, actual HP/Laff, gag spend across successive waves, more-than-one-turn prediction, and remotely assisted control/utility actions. Keep optional manual exact remaining-HP entry available earlier if inexpensive.

## 13. Final design tradeoff

The easiest implementation is to bolt four single-Cog calculators together. **Do not choose it.** It could assign four gags to each enemy (illegal), miss all-target Sound efficiencies, multiply dependent probabilities incorrectly, and ignore the Boiler being hit during its Defensive phase.

The most ambitious implementation is a fully faithful Field Office battle simulator. **Do not start there either.** It requires substantial state tracking and game-rule validation while adding inputs that slow the user down.

The right first product is an **optional, secondary four-slot, four-click Boiler Quick Planner** with a single visible best plan, compact pre-turn alternatives, and an unobtrusive **post-miss recovery** entry. Use an initially narrow but accurate target-aware solver, clearly labeled assumptions, and solver-coverage indicators. Optimize speed and comprehensibility first; preserve the already-working calculator entirely.


---

## 14. v1.1 addendum — Secondary tool, backup strategies, and one-click miss recovery

### A. Protect the existing calculator (non-negotiable)

**Boiler Quick Planner is a secondary feature, not the new application.** Keep the existing single-Cog calculator on the normal app entry URL with its same controls, generated combo list, weights and selections. Present a small `Boiler Planner` link in the existing header or Tools menu. Planner UI, assumptions, recovery state, settings and Web Worker must be isolated; opening/closing it must not clear Classic selections. Do not reuse Classic's selected-gag array as the four-Toon battle state, and do not replace `FillToKillOptionsWorker` merely to support the new use case. If a routing change is needed, retain backwards-compatible links and a direct one-click return to Classic.

**Hierarchy on the Boiler page:** four targets and recommended four-Toon action are primary. A compact `Alternatives` affordance is secondary. A `Miss / survived?` action is tertiary *until the turn resolves*, then becomes the fastest visible way to recover. Detailed accuracy, custom per-Toon restrictions, sliders, all possible combinations and precise result editing belong behind expanders; **nothing extra is required before an initial suggestion**.

### B. Two different meanings of “second option”

| Concept | When useful | Recommended UI | Important correctness limitation |
|---|---|---|---|
| **Pre-turn alternative** | You haven't committed to gags and want a second feasible choice | `Save gags` / `Safer` compact row; one click expands/changes the displayed full team plan | It is an alternative *for this round*, not a promise to recover during execution |
| **Post-miss rescue** | The round resolved, one or more Cogs survived | One tap on the surviving Cog; planner switches to `Recovery · next turn` | Surviving tells us identity, **not exact HP or which gag hit** |
| **If-miss preview** | You want reassurance before the turn | Optional `If this misses` preview for common branches, precomputed in the background | Hypothetical until outcome confirmed; must not consume gags or modify real state |

**Recommendation:** Build the first two. Leave speculative `If-miss` previews behind a disclosure or for a later iteration; most users will not have time to read a decision tree during a countdown. Keep only one primary action-ready result on screen by default.

### C. Three possible recovery interaction patterns

**Option A — Tap the surviving Cog (preferred default).** After the current turn resolves, tap `Miss / survived?` (or tap a Cog card directly if recovery affordance is active). The four Cog cards remain displayed. A tap on `Cog 3` says: Cog 3 survived; *for this first tap*, provisionally assume Cogs 1, 2, and 4 were defeated. That is **one Cog selection to describe a common three-KO outcome**. Tap Cog 1 too if two survived. `All survived` and `All cleared` are fast shortcuts. Recovery results appear immediately and identify themselves as **next-turn** recommendations, not late changes to the previous turn. `Undo` restores original.

**Option B — Tap which gag/track missed (optional precision mode).** Keep four Toon/gag rows from the chosen recommendation. Tap `Miss` on a row or a track event, then mark which targets were affected if relevant. If all other actions are *explicitly* assumed hit, the battle engine can simulate residual HP. However, same-track rolls and all-target gag effects can be shared/correlated, so **four independent Toon hit/miss switches can be misleading**. This mode needs track/target event semantics and clearer validation; do not ship a deceptively simple four-button exact-HP calculator.

**Option C — Always show a backup plan automatically.** A secondary `Backup` row is visible under the recommended combo, chosen for a different tradeoff (e.g., fewer Foghorns or better reliability). Fast to inspect before the turn but **not enough to determine the next turn after a miss**. Use only as pre-turn choice, not as the main recovery interaction.

### D. Recommended one-click recovery state flow

```text
NORMAL BOILER PLANNER
  four Cog slots → recommended 4-Toon plan → [Alternatives] [Miss / survived?]
                                        |
                                 round resolves
                                        |
                              tap `Miss / survived?`
                                        |
RECOVERY — NEXT TURN           four original Cog slots still visible
  tap Cog 3 survived → default: Cog 1/2/4 defeated → recompute instantly
  [Cog 1 toggle] [Cog 2 toggle] [Cog 3 ALIVE] [Cog 4 toggle]
  [All survived]  [All cleared]  [Undo]
                                        |
  `HP unknown — assuming full level HP`   [Enter HP ▾]
                                        |
  RECOMMENDED RESCUE: four-Toon action for surviving Cogs only
```

**Further speed refinement:** Once recovery mode is armed, tapping a Cog card should *both* identify it as surviving and recompute; do not require a separate `Apply` or `Calculate`. Optionally make the `Miss / survived?` action a small segmented strip that lets the user select a survivor directly in one total tap (e.g., `Survived: 1 2 3 4 · All`) while avoiding accidental changes before the round resolves. The exact one-tap affordance remains a usability decision in §14.H.

**When *all* Cogs survived**, press `All survived` once. **When one survived**, tap its Cog slot once. **When multiple survived**, tap the additional surviving slots. **When none survived**, `All cleared` finishes the wave; normal `Next Wave` remains available. Avoid an extra save/confirm button in every case.

### E. HP accuracy, missed Sound and safety behavior

- **Default: do not infer exact HP from a surviving Cog.** A Cog can survive despite a partial hit, mixed gags, a miss, defense modifiers or an unselected action by a different Toon. Show `HP unknown · using full HP` as a *conservative planning assumption*, not a factual damage measurement. An optional single numeric HP field can improve accuracy but must not block the rescue recommendation.
- If the player actually followed the displayed four-Toon plan and wants accurate recovery, offer `What missed?` as an optional advanced step. Only reconstruct post-turn HP when enough observed events are available. Expose assumptions such as `other planned actions landed` and do not invent observed hit/miss events.
- **Shared accuracy:** Toontown Rewritten has same-track and target/area effects and accuracy calculations that cannot safely be represented by unrelated per-Toon miss toggles. Exact recovery should model actual event groups, not independent checkbox probabilities. See [TTR Accuracy](https://toontownrewritten.wiki/accuracy) and [TTR Sound](https://toontownrewritten.wiki/Sound). Never mix in Corporate Clash-specific mechanics.
- **During a Boiler Defensive phase**, changing survivors does not erase retaliation concerns; recalculate with current phase, warning on Sound/any Boiler-hit action. Let the user change phase immediately if it changed between turns.
- **Gag inventory:** assume-full is retained in v1.1. Mark the previous plan as `suggested`, not `spent`. The calculator does not know whether the player followed it or used different gags. Do not silently subtract gags from a fictional inventory; a later optional `Used this plan` confirmation can enable real tracking.
- If the original line-up is replaced by a new spawning Cog, select an empty slot and tap the new level; keep existing survivor flags. The tool must not assume a fixed four-enemy lineup across different rounds.
- **No false precision:** with unknown remaining HP, do not present rescue KO percentages as exact. Use a conservative full-HP chance conditioned on explicit assumptions, or label `Approximate`/`Full-HP scenario` prominently; separate a verified probability for a supplied HP value from an approximation.

### F. UX comparison and complexity budget

| Pattern | Normal use | Recovery after miss | Extra cognitive burden | Verdict |
|---|---|---|---|---|
| Always-on four gag hit/miss toggles | Crowds the main action | Up to four gag taps, plus target ambiguities | High | Avoid in v1 |
| Secondary pre-turn backup only | No extra input | Still requires fresh battle entry | Low before turn, weak after | Add as compact alternative |
| **Survivor-first quick recovery** | No extra input until needed | **1 tap** for one survivor if direct-tap affordance; more taps for more survivors | Low, but HP uncertain | **Recommended default** |
| Full turn history with inferred HP | More setup and state | Potentially zero taps if everything is tracked | Very high initial complexity and can be wrong | Later, opt-in only |

**Product constraint:** A countdown tool should have one major action in the visual center: **read the recommended move**. Secondary controls must not compete with the recommendation. A one-tap rescue shortcut should be less visually prominent until the user needs it.

### G. Specific implementation additions

- `RecoverySnapshot` holds the displayed plan ID, original target levels/IDs, chosen surviving targets, optional exact HP per target, confidence/assumption flags, and original Boiler phase. It is transient Boiler state and lives outside Classic.
- Add a reducer `OPEN_RECOVERY`, `TOGGLE_SURVIVOR`, `ALL_SURVIVED`, `ALL_CLEARED`, `SET_SURVIVOR_HP`, `UNDO_RECOVERY`. These actions must not dispatch into the existing `App.tsx` gag-selection state.
- **First-survivor semantics:** when entering with a specific target tap, select only that target as alive. When opening with the generic `Miss / survived?` control, display neutral unknown outcome until an explicit survivor is selected, rather than silently treating all four as defeated.
- **Result specificity:** a solver request with unknown HP carries `hpAssumption: 'full'` and explicit current enemy IDs. The recommendation card reads `Next turn / full-HP assumption`; it may not claim exact expected remaining HP.
- **Precompute:** when the primary plan is available, cache common follow-up target subsets (especially one-survivor and all-survivor cases) using a bounded background worker, but prioritize the present board. Do not spend computation on combinatorially many exact miss branches.
- **Cache keys:** include survivors, remaining HP assumptions/overrides, Boiler phase, track locks, gag exclusions and assumptions; identify all responses with monotonically increasing request IDs to ignore stale answers.
- **Persisting between modes:** normal navigation away and back may retain a Boiler scratchpad in component state or session storage, but it must never change Classic exported settings or default start page.
- **Telemetry (local-only unless explicitly approved):** timed manual testing should measure taps from post-round observation to next actionable recommendation, incorrect survivor toggles, and whether users notice the unknown-HP label. Do not add analytics solely for this experiment without permission.

### H. Usability decisions to ask the user before finalizing

The following are **not** assumed settled by this addendum:

1. **Where should Boiler Planner live?** Small tab next to existing Classic calculator, separate Tools-menu entry, or pop-out/floating panel that can stay alongside Classic? Default proposal: small secondary header link with a dedicated quick page/panel.
2. **What does a “miss” mean to you during play?** (a) One or more Cogs simply remained alive, (b) you know *which gag/track missed*, or (c) the other Toons chose a different gag than the calculator suggested? Default proposal: optimize first for (a), with (b) an advanced option and (c) manual override.
3. **How much remaining-HP input can you tolerate?** None (assume full HP), one tap to select an estimated HP band, or optional exact number when needed? Default proposal: instant full-HP scenario, optional exact HP on expansion.
4. **Should a post-miss plan appear after one direct tap on a Cog, or after pressing `Miss / survived?` and then selecting the Cog?** Default proposal: direct one-tap on Cog only when its miss/recovery affordance is explicitly activated, preventing accidental state changes.
5. **Would you rather see one recommended combo plus a compact `Backup`/`Safer` alternative, or three always-visible complete lineups?** Default proposal: one complete primary and at most two collapsed alternatives.

### I. Decision priority and acceptance tests for the revised scope

**Do first:** Classic unchanged + opt-in Boiler entry; four clicks to a first plan; one-tap survivor path with conservative HP label; reversible recovery; stale-worker protection. **Then:** polish recovery accuracy (optional event/HP input) and compare backup strategies.

**Acceptance target:** From a displayed recommendation and a round where exactly one Cog survives, a user can obtain a readable **next-turn** recommendation by identifying that surviving Cog with **one click/tap**, with no re-entry of the other three original Cog levels and no fake exact-HP assertion. The new tool remains optional and never disrupts the established Classic calculator. Test both one-survivor and multiple-survivor cases with a stopwatch and a 2–3-player usability session.
