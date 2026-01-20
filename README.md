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
- Run local dev server by running `npm run dev` then go to https://localhost:5173 in your browser.

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
