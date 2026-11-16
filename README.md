# Big Brain Town V2 (MODIFIED BIG BRAIN TOWN)

Big Brain Town is a calculator to be used for the game Toontown Rewritten. I made it for fun a little after the release of Field Offices because they required more precise calculations and strategies.

## Tools

Built mainly with React + TailwindCSS.

## Inspiration

Big Brain Town was built because there was only one other web based gag calculator at the time!
https://www.ethanyhong.me/ttcalc/

## Get Started
- Get [Node.js](https://nodejs.org/en)
- Run `npm install` in the base of the repo.
- Run `npm run dev` and open the local URL Vite prints.

## Battle Planner

Use **Battle Planner** in the upper-right corner of Cogulator to open the experimental planner. The calculator starts by default and keeps its current selections when you switch back.

Tap up to four levels for an automatic one-turn recommendation. Choose **Boiler Active** to include the boss, then enter its phase and remaining HP. The default assumes four maxed, non-organic Toons with every track available and keeps level 7 gags off. Balanced uses an 80% estimated clear target and favors cheaper lineups that meet it.

After the turn, tap a surviving Cog to get a next-turn plan. Tap additional survivors if needed, or use **All survived** or **All Cogs cleared**. Unknown survivor HP defaults to full HP until you enter an observed value. **Undo recovery** restores the original lineup. **Next Wave** clears the Cogs, and **Repeat** restores the last wave’s levels.

Expand **Advanced** for a separate projected plan over up to 12 rounds. It starts with a copy of the quick lineup and accepts per-Toon stock, organic tracks, remotes, Laff, active statuses, and Boiler effects. **Record round outcome** loads the projection so you can correct it before replanning.

The planners use a bounded search. Quick clear odds use modeled hit and miss branches, including shared rolls. The advanced forecast shows the estimated chance of its planned hit sequence. Both use the calculator’s 95% cap approximation because the live game’s soft-cap thresholds are unpublished.

Official references for the planner. [Cog HP and group damage](https://cdn.toontownrewritten.com/community/notices/Rebalancing_Update_December_2021.pdf) · [Stun and Lure changes](https://www.toontownrewritten.com/news/item/877/cogs-inc-is-under-new-management) · [Boiler and remotes](https://www.toontownrewritten.com/taskforce/battles) · [Accuracy soft cap](https://www.toontownrewritten.com/news/release-notes/all).

## Changelog

### v2.1 - Trap + Multi-Lure Fix

**Bug Fixed:** Multiple lures after trap trigger no longer incorrectly re-lure the cog.

**Problem:** When a combo included Trap + multiple Lure gags, the calculator was incorrectly computing damage:
- First lure would trigger the trap (correct)
- Second lure would then "re-lure" the cog, enabling lure bonus on subsequent Throw/Squirt (incorrect)

For example, with TNT + $10 Bill + Big Magnet + Fire Hose against a Level 13 cog (224 HP):
- **Old (buggy) calculation:** TNT (180) + Fire Hose (30) + Lure Bonus (15) = 225 damage = kill
- **New (correct) calculation:** TNT (180) + Fire Hose (30) = 210 damage = does NOT kill

**How Toontown Actually Works:**
In Toontown Rewritten, when a trap triggers from a lure:
1. The trap deals its damage
2. The cog is NOT lured afterward (the trap "used up" the lure effect)
3. Additional lures on that same cog that round have NO effect - you cannot re-lure a cog that just had its trap triggered

**Technical Details:**
- Added `trapTriggeredThisRound` flag to `CogStatus` type
- When a trap triggers, this flag is set to `true`
- Subsequent lure gags check this flag and return early (no damage, no lure effect)
- This correctly models the in-game behavior where trap + lure combos don't allow additional luring
