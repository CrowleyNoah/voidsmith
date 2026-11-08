# Voidsmith (steps 1-4: foundry, armory, combat, builds and drones)

A private idle forge game. Everything is saved on your device and works offline. No server, no paid parts.

**Put it on your phone:** upload these files to a GitHub repo, turn on GitHub Pages, open the page in Chrome on Android, then Menu > Install app.
**Updating:** replace every file in the repo with the new zip's contents. The app updates itself next time you open it.

## What is in step 1
- The Forge: spend Alloy, get a random part (8 slots, 6 tiers). Fit it or sell it.
- Foundry upgrades: Credits plus a real-time wait for better odds and stronger gear. 25 levels before Ascension. The odds, waits and costs follow Forge Master's table (35 levels) squeezed into 25 and made 1.5x slower. First step about 17 minutes, last steps about 18 days. All 10 tiers (Rusted, Refitted, Hardened, Classified, Voidborn, Exotic, Ancient, Dark Matter, Origin, Apex) unlock at Foundry 1, 2, 4, 6, 8, 10, 12, 14, 17 and 21.
- One Alloy per forge, about one Alloy a minute. Alloy and Credits have no cap. The only limit is offline time: production counts for 4 hours while the app is closed (Research raises it).
- Profile (tap your picture/name, top left): change picture (12 choices) and name (first change free, then 50 Flux), rank, level bar, Damage/Hull/Power, equipped gear, substat totals, records, Cloud, Options, Backup, Erase. There is no Ship or More tab any more. Save backup and restore codes. Auto-Salvage unlocks at Foundry 3.

## Added in step 2
- (Cargo Hold, Stash and Keep list were removed in v23: equip or sell, like the games this follows. Old held parts are sold into Credits.)
- Set bonuses: fit 4 or 8 parts of the same tier or better for a bonus (best set counts).
- Codex: every part you forge is recorded. Each new part adds +0.25% to all stats; finishing a tier adds +3%.
- Part comparison now shows the real change in Power, including set and Codex bonuses.
- Tap a fitted part for its details. The Codex tab shows every part and the set table.

## Added in step 3
- Missions tab: turn-order fights against drones, gunships, raiders, bulwarks and a boss every 10th stage. 200 stages shown as 1-1 to 20-10. The campaign lives on the main (Foundry) screen: your ship fights the current stage automatically, a win moves you to the next stage and a loss drops you back one. Swap your gear and the result changes. No arrows, no tickets. A fight has no round limit: it ends when one side is destroyed.
- Speed order matters (drones strike fast, bulwarks slow and armored). Every 4th shot of yours is an Overcharge. Crits and boss salvos happen.
- Win to earn Credits (first clears pay 5x; rewards grow by a flat step per stage). Lose and you fall back one stage. Auto-advance can be switched off to farm a stage.
- Boss first clears pay Flux, which can finish a Foundry upgrade early (1 Flux = 5 minutes).
- While the app is closed you earn Alloy and Credits at a set rate, for up to your offline time (4 hours to start, raised in Research). Nothing else is paid offline.

## Added in step 4
- Bonus lines on parts (Refitted and up): Crit chance, Crit damage, Armor pierce, Overcharge, Haste, Plating, Evasion, Hull leech. Weapons lean offensive, hull parts defensive. Higher tiers roll more and bigger lines.
- Power stays the plain number (stats x set x Codex). Fights use the lines too, so two ships with equal Power can win very differently. Each part shows its Power change and its Build change; auto decisions use Build.
- Drones: 37 drones (N, R, SR, SSR, UR), one active at a time, unlimited stockpile. Summon 3 for 30 AI Cores (3 free a day for an ad). Spare copies fuse into Stars (0-10) that unlock/upgrade 3 abilities. Nanites level a drone (cap 60); reset costs 10 Flux and refunds all Nanites. 9 Links (sets) give permanent bonuses; Defense = damage reduction at 1/5 of the %, cap 60%. Old Wing saves convert to drones.
- AI Cores come from rank promotions, rank orders, the Medal shop, clan convoys and the Flux store (never from fights; a kill pays 1 Credit). Nanites come from the Drone Hangar daily, orders, ads and Flux. Flux packs are shown but payments are not connected.
- Mission Outlook is now a real win chance from simulated fights.

## Tuning the numbers
Every number is in the TABLES section at the top of `core.js`. `node tests/calibrate.js` shows win chances by Power ratio, `node tests/rules.js` checks the rules, and `node tests/sim.js` simulates players who check in 3, 8 or 24 times a day and prints how long the 25 foundry levels take.
Bump `VERSION` in `sw.js` after any change.

## Commander, ranks and research (step 5)
- Commander level comes only from forging: 10 XP for Rusted and Refitted, 20 for Hardened, Classified and Voidborn, 30 for Exotic. The XP needed per level climbs about 10% each level. Each level adds 1.2% Damage and Hull.
- 500 levels, 25 ranks (Cadet, Lieutenant, Commander, Admiral, Warlord, each I to V). Every 20 levels the XP bar must fill once more, then tap the rank button (profile) to be promoted and go on. Promotions pay Flux, AI Cores and Data Shards. Each level adds +0.18% Damage and Hull, each rank +0.9%.
- Foundry upgrades are paid in installments (like Forge Master); research is on a Lab screen with Forge / Power / Fleet / Codex tiles.
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

## Added in v23
- Forge Master's forge math: tier odds, waits and costs resampled from 35 levels to 25 Foundry levels, waits x1.5. Credit prices are scaled to what parts sell for (COST_SCALE in core.js (0.4)).
- All 10 tiers are live (Codex is 80 parts). Level growth per Foundry level is 12%, tier multipliers go 1, 2.2, 4.8, 10, 20, 38, 70, 130, 240, 440. The enemy curve was re-fit with tests/fit.js.
- A kill pays 1 Credit, a boss too. Credits come from selling parts.
- Orders (Missions tab): 2 or 3 small jobs for every 20 campaign stages. Rewards are small (up to 200 Alloy or 2 Flux).
- The Armory tab is now the Codex tab: no cargo hold.

## Added in v25: research tree rebuilt from the Forge Master tech guide
- Lab tab: Research and Codex. Three branches (Forge, Power, Fleet), 25 nodes, no Clan branch.
- Each node has 25 levels in 5 tiers of 5 (I-V). Bonus per level is constant; cost and wait rise with the tier (Forge Master's T1-T5 tables, waits x1.5, Shards x SHARD_SCALE, Flux x1.5).
- Values are about 0.8x Forge Master: Foundry speed +3%, upgrade cost -1.5%, sell +1.6%, Free Forge 0.8%, offline +16% of 4h per level (20h at level 25), Power nodes +1.6% to one gear slot, research speed +3%, research cost -1.6%, summon cost -0.8%.
- Multi-Forge: one upgrade per tier (+2,+2,+2,+2,+1, max 10 at once), commander level 6/20/38/56/75. Tiers I-V open at commander level 1/16/34/52/70.
- v26 additions: Alloy Output (+1.6% per level on the 1 Alloy a minute base) and Patrol Pay (offline patrol 50% -> up to 90%) in the Forge branch. Offline time node stays (4h base, +16% of the base per level).
- v26 installments: Foundry upgrades take several payments before the timer starts: 1 until about Foundry 8, then 2, 3 ... up to 9-10 near the end (CFG.INSTALL). One payment is PAY_X (0.2) of the old single price, so late levels are credit-limited, not just timer-limited.
- Dropped (no equivalent here): Forging XP, crit/haste, eggs, mounts, level-ups.
- One research at a time; Flux finishes it early. Old research is refunded 3 Shards per level.

## v37 look
- theme.css: gunmetal plates, amber actions, outlined numerals; header floats over the battle scene; 5-tab bar (Forge, Battle, Lab, Drones, Shop).
- Profile is one scene (ship, companion, rank banner, power plate, stats panel) with a gear box below. Rank adds +1.5% Damage/Hull per rank. "Rank" screen shows before/after and Promote.

## Ship art (assets/)
- `assets/icons/gear_<slot>_t<NN>_<a|b|c>.png` – inventory and Forge-grid icons, 3/4 view.
- `assets/ship/hull_t<NN>.png` and `assets/ship/<slot>_t<NN>_<a|b|c>.png` – battle layers, strict side profile, facing right.
- `ship.js` lists which art exists (`ICONS`, `HULLS`, `LAYERS`) and where layers attach. Missing art is skipped and the code-drawn ship is the fallback.
- Hull on screen = tier of the fitted Hull Plating; size = `V.SHIPS[tier].scale` (0.85 to 1.25) as a CSS scale.
- To add art: drop the PNG in, add its entry in `ship.js`, add the file to `sw.js` FILES, bump `VERSION`.

## Hangar scene and drones (vs-v49)
- `assets/bg/bg_profile.jpg` – painted hangar behind the ship on Profile (1024x1024, shown with `background-size: cover`, so it crops to the scene box).
- `assets/comp/comp_<species>.png` – painted companion drones, 256x256, facing right like the ship. Hornet only for now; add a species to `COMP_ART` in game.js when its art exists.
- The paper-doll ship rig and 3/4 gear icons are in the code but switched off (`USE_RIG = false` in game.js).

## Stockpile (v59)
- Alloy (1/min to start) and Credits (1/sec) build up in real time, online or not, up to your offline time (4h to start, +16% of 4h per research level, 20h at level 25).
- The Collect button (left of the anvil) pays out what has built up. It locks for 5 seconds after each collect. Coming back after being away is just collecting a bigger stockpile.
- Kills pay 1 Credit. Gear sells for little: base 1 (Rusted) to 40 (Apex), +2% per forge level the part was made at (guessed ladder; Forge Master's top tier is in the 50s).

## Combat numbers (v60)
- No built-in crit or overcharge: base crit chance is 0 and base crit/overcharge multipliers are 1 (no effect). They come only from bonus lines on your parts. Crit damage and Overcharge lines are +25% and +30% base (before tier and roll).
- Every bonus line can roll on any part (no slot restrictions).

## Bonus lines (v61)
- Only parts of tier 3 (Hardened) and up roll bonus lines (2, 2, 3, 4, 4, 5, 5, 6 lines going up the tiers).
- Each line rolls a random value from 1% up to its max: Crit chance 12, Crit damage 80, Armor pierce 20, Overcharge 40, Haste 25, Plating 15, Evasion 10, Hull leech 20. The max does not change with tier. Totals across all fitted parts still hit the caps listed in the code.

## Auto menu (v62)
- Bonus lines per part: tiers 1-2 none, tiers 3-6 one line, tiers 7-10 two lines.
- The AUTO button (next to the stats) opens the Auto menu: Auto-Salvage on/off, tiers to always sell, and wanted bonus lines. With wanted lines picked, a part that has lines is sold unless at least one line is wanted. Also applies to multi-forge.

## Hold bar (v63)
- Parts you have not decided on sit in a bar of icons above the forge. It holds as many parts as you can forge at once (1 to start). Forging past that sells the oldest held part.
- Equipping a held part puts the part it replaced into the bar, so you can swap back until you sell it.
- A new part opens its card (stats, Equip, Sell). Tapping anywhere else shrinks it to its icon above the forge; tap the icon to open it again.
- With Auto off, multi-forge puts all its parts in the bar. With Auto on, parts are decided automatically (the replaced part is sold).

## Hold bar rules and the multi-forge run (v64)
- Forging is blocked while the hold bar is full (with Auto off): equip or sell a part first. Nothing is ever sold for you to make room.
- Multi-forge run: in the Auto menu pick a tier. The multi-forge button becomes a run (▶ x N): it forges in rounds, sells every part below that tier (or that your line filter rejects), holds the rest, and stops when the bar is full or Alloy runs out. Tap the button (now a stop square) to stop early and decide on what it caught. The run also stops if you leave the Forge tab.

## Gear levels (v65)
- A new part is made at your commander level, give or take 2 (never below 1 or above the max commander level). Part stats grow 1.75% per gear level, so leveling up and ranking up keep making new parts stronger, as in Steelborn.
- Multi-forge run: tick any tiers you like (only tiers that can drop at your Foundry level are listed). Only parts of the ticked tiers are held; everything else is sold.
