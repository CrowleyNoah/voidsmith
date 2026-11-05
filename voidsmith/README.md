# Voidsmith (steps 1-4: foundry, armory, combat, builds and wing)

A private idle forge game. Everything is saved on your device and works offline. No server, no paid parts.

**Put it on your phone:** upload these files to a GitHub repo, turn on GitHub Pages, open the page in Chrome on Android, then Menu > Install app.
**Updating:** replace every file in the repo with the new zip's contents. The app updates itself next time you open it.

## What is in step 1
- The Forge: spend Alloy, get a random part (8 slots, 6 tiers). Fit it or sell it.
- Foundry upgrades: Credits plus a real-time wait for better odds and stronger gear. Only 14 levels at launch, each one a milestone: 30 seconds for the first, about two weeks for the last. A new tier unlocks at Foundry 1, 3, 5, 8, 11 and 14.
- One Alloy per forge, about one Alloy a minute. Alloy and Credits have no cap. The only limit is offline time: production counts for 4 hours while the app is closed (Research raises it).
- Ship screen with Damage, Hull and Power. Records. Save backup and restore codes. Auto-Salvage unlocks at Foundry 3.

## Added in step 2
- Cargo Hold: stash parts from the forge bay, swap them in later, expand it with Credits (6 to 30 slots).
- Set bonuses: fit 4 or 8 parts of the same tier or better for a bonus (best set counts).
- Codex: every part you forge is recorded. Each new part adds +0.25% to all stats; finishing a tier adds +3%.
- Part comparison now shows the real change in Power, including set and Codex bonuses.
- Tap a fitted part for details or to move it to the hold. Armory tab holds the hold, set table and Codex.

## Added in step 3
- Missions tab: turn-order fights against drones, gunships, raiders, bulwarks and a boss every 10th stage. 200 stages shown as 1-1 to 20-10. The campaign lives on the main (Foundry) screen: your ship fights the current stage automatically, a win moves you to the next stage and a loss drops you back one. Swap your gear and the result changes. No arrows, no tickets. A fight has no round limit: it ends when one side is destroyed.
- Speed order matters (drones strike fast, bulwarks slow and armored). Every 4th shot of yours is an Overcharge. Crits and boss salvos happen.
- Win to earn Credits (first clears pay 5x; rewards grow by a flat step per stage). Lose and you fall back one stage. Auto-advance can be switched off to farm a stage.
- Boss first clears pay Flux, which can finish a Foundry upgrade early (1 Flux = 5 minutes).
- The app patrols your best stage while closed (half pay, up to your offline time).
- Records moved into the More tab.

## Added in step 4
- Bonus lines on parts (Refitted and up): Crit chance, Crit damage, Armor pierce, Overcharge, Haste, Plating, Evasion, Hull leech. Weapons lean offensive, hull parts defensive. Higher tiers roll more and bigger lines.
- Power stays the plain number (stats x set x Codex). Fights use the lines too, so two ships with equal Power can win very differently. Each part shows its Power change and its Build change; auto decisions use Build.
- Keep list in More: parts with the lines you want go to the cargo hold instead of being sold.
- Wing: three companion ships (Hornet, Longbow, Mender, Aegis, Static, Surge) that act in turn order. Summon with AI Cores, fuse 3 of the same rank into the next rank (6 ranks). The Summon Bay levels up with use for better odds.
- AI Cores come from first clears, boss first clears and a 6% chance per win, and from patrol while closed.
- Mission Outlook is now a real win chance from simulated fights.

## Tuning the numbers
Every number is in the TABLES section at the top of `core.js`. `node tests/calibrate.js` shows win chances by Power ratio, `node tests/rules.js` checks the rules, and `node tests/sim.js` simulates players who check in 3, 8 or 24 times a day and prints how long the 40 foundry levels take.
Bump `VERSION` in `sw.js` after any change.

## Commander, ranks and research (step 5)
- Commander level comes only from forging: 10 XP for Rusted and Refitted, 20 for Hardened, Classified and Voidborn, 30 for Exotic. The XP needed per level climbs about 10% each level. Each level adds 1.2% Damage and Hull.
- Every 10 levels you need a promotion (stage, Foundry level and fitted-parts goals) before you can keep levelling. Promotions pay Flux, AI Cores and Data Shards.
- Research (Data Shards): Alloy production, offline time, Credits, Foundry speed, forging XP, Damage, Hull. Shards come from boss first clears, every fifth stage first clear and promotions.
- Pace check: `node tests/sim.js 420 3 10` plays a casual free player (3 short check-ins a day). `node tests/fit.js` re-fits the enemy curve to the pace you want.

## Missions tab (step 6)
- Three daily missions, each with its own stage ladder (shown as 1-1, 2-1...) and 3 tries a day: Salvage Run (Alloy), Data Heist (Data Shards) and Clan Convoy (AI Cores, needs a clan). Ladder enemies are 75% as strong as the campaign's. Rewards grow by a flat step per stage.
- Sweep tickets: 1 every 2 hours up to 4, plus 2 from ad stand-ins a day. A sweep collects the reward of the last ladder stage you cleared. No cooldown. The campaign has no tickets.
- Arena: a simulated league with 7 leagues. Three rivals built from your own ship (weaker, even, stronger), 5 fights a day, Medals and league points. Medal shop with a daily limit per item.
- Clans: simulated crews. Their members fill most of the daily goal over the UTC day, your Convoy wins and sweeps add the rest, with four claimable steps.
- All daily limits reset at midnight UTC.

## Depot (step 7)
- Daily gift: 100 Alloy, free every day.
- Daily deals: four offers from a pool of six, paid in Flux, one purchase each, shelf changes at midnight UTC.
- Optional rewarded ads (stand-in screens with a 5-second countdown): sweep tickets, Alloy, Credits, a 20-minute Foundry speed-up and Flux. Each has a daily cap and a cooldown, and each is small on purpose.
- Remove-ads pack (stand-in, no real payment): ad rewards then claim instantly with no video. Limits stay the same.
- Red dots on the tabs show unclaimed gifts, daily tries left, claimable clan steps, a possible promotion or affordable research.
- Dailies are now in the pace simulator (`node tests/sim.js`). A casual player reaches Foundry 14 around day 190 and commander level 100 around day 350.

## Balance pass (step 8)
- Fights are longer: enemies hit softer but carry more hull (same win odds), and fights play faster on screen, so a fight shows several exchanges.
- The Exotic tier is a smaller jump (it was too big a leap at Foundry 14), and the last Foundry levels cost less Credits so the end is a wait, not a wall.
- Dailies, arena and clans are in the simulator. A casual player (3 check-ins a day, 10 minutes each): Foundry 8 around day 10, Foundry 11 around day 30, Foundry 14 around day 135. One 20-minute check-in a day: Foundry 14 around day 300.
- Normal behavior: power comes in steps at each Foundry tier unlock (about x2-3 each), so there are stretches of days where the campaign stalls until the next upgrade lands. Ascension and more tiers come later.

### Step 8b: tier jumps
Tier multipliers are now [1, 2.2, 4.8, 10, 20, 38] and the enemy curve was re-fit. Rating jumps at the tier-unlock Foundry levels are about x3 (F8, F11, F14).

### Step 9: visual pass (vs-v17)
Main screen rebuilt to look like a game, not a text page: full-width fight scene with drawn ships, hit beams and floating numbers, icon gear tiles with levels, anvil with Alloy count, and a Foundry button that opens the upgrade + odds popup. Header is now avatar, power and icon-only currency pills; nav uses icons.
