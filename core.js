/* Voidsmith: game rules and numbers. No screen code here, so tests can run it directly.
   Every number you might want to tune lives in the TABLES section at the top. */
(function (root) {
  'use strict';

  /* ===================== TABLES (tune the game here) ===================== */
  const XP_C = 16.9, XP_P = 1.48;   // commander XP curve: need(L) = 16.9 x L^1.48 (500 levels in about the time 300 used to take)
  const CFG = {
    NAME: 'Voidsmith',
    SAVE_VERSION: 1,
    MAX_FORGE_LEVEL: 25,        // 25 Foundry levels before Ascension (Ascension comes later)
    OFFLINE_CREDIT_RATE: 1,     // while you are away, Credits come in at 1 per second, up to your offline time (research raises it)
    OFFLINE_BASE_H: 4,          // hours of offline production you start with; research raises it
    AUTO_UNLOCK_LEVEL: 3,       // forge level that unlocks Auto-Salvage
    ALLOY_COST: 1,              // one Alloy buys one forge. There is no cap on how much Alloy or Credits you can hold.
    ALLOY_PER_SEC: 1 / 60,      // base production: one Alloy a minute (research raises it)
    START_ALLOY: 60,
    TIME_SLOW: 1.5,             // everything waits 1.5x longer than the game this math came from
    SHARD_SCALE: 0.025,             // Data Shard price of research, against the original's potions (tuned with tests/sim.js)
    COST_SCALE: 0.4,            // tuned with tests/sim.js so Credits matter without replacing the timers
    UPGRADE_CREDITS: (L) => FM_COST[Math.min(FM_COST.length, L) - 1],   // Credits per payment to go from L to L+1: Forge Master's price for its forge level L, taken as is (levels 1-25)
    INSTALL: (L) => FM_NODES[Math.min(FM_NODES.length, L) - 1],   // payments to go from L to L+1 = the original's 'No. of Nodes' on its row for level L+1; each payment costs the row's Cost, the timer starts after the last
    PAY_X: 0.27,                 // size of one payment against the old single price
    UPGRADE_SECONDS: (L) => Math.max(1, Math.round(FM_TIME[Math.min(FM_TIME.length, L) - 1] * CFG.TIME_SLOW)),   // wait to go from L to L+1: the original's Time on its row for level L+1, 1.5x longer
    LEVEL_GROWTH: 1.0095,        // each gear level makes a part this much stronger
    GEAR_SPREAD: 2,             // a new part is made at your commander level, give or take this many levels (never below 1 or above the max commander level)
    SELL_LEVEL: 0.0016,         // a part sells for 0.16% more per gear level (tier sets the base: Rusted 1 .. Apex 40)
    COLLECT_LOCK_MS: 5000,      // after you collect, the button stays locked this long
    SET4: [0.02, 0.04, 0.06, 0.09, 0.12, 0.16, 0.21, 0.27, 0.34, 0.42],                      // bonus for 4 fitted parts of tier X or better
    SET8: [0.05, 0.10, 0.15, 0.22, 0.30, 0.40, 0.52, 0.66, 0.82, 1.00],                      // bonus for 8 fitted parts of tier X or better
    CODEX_PART: 0.0025,         // each part ever forged adds this to all stats
    CODEX_TIER: 0.03,           // finishing all 8 parts of a tier adds this too
    MAX_STAGE: 200,             // twenty chapters of ten stages at launch (shown as 1-1 ... 20-10)
    ENEMY_POINTS: [[1, 3], [10, 12], [20, 27], [50, 1127], [100, 30000], [150, 850000], [200, 10000000]],    // enemy Power at these stages; in between it grows smoothly
    ENEMY_SCALE: 7,
    ENEMY_POWER: (s) => { const P = CFG.ENEMY_POINTS; let i = 0; while (i < P.length - 2 && s > P[i + 1][0]) i++; const a = P[i], b = P[i + 1]; return CFG.ENEMY_SCALE * a[1] * Math.pow(b[1] / a[1], (s - a[0]) / (b[0] - a[0])); },
    CREDITS_WIN: () => 1,                                            // a kill pays one Credit, a boss too. Credits really come from selling parts.
    FIRST_CLEAR_X: 1,
    FLUX_BOSS: 15, FLUX_SECTOR: 35,   // Flux for the first clear of a boss / of the last chapter's boss bonus
    SHARD_BOSS: (s) => 2 + Math.ceil(s / 20), SHARD_FIFTH: 1,       // Data Shards: boss first clears, and the 5th stage of a chapter
    DAILY_ATTEMPTS: 3, DAILY_SCALE: 0.75,                            // each daily ladder: tries per day, and how hard its enemies are compared with the campaign
    ARENA_ATTEMPTS: 5, LEAGUE_LP: [0, 100, 250, 500, 900, 1500, 2500], SHOP_LIMIT: 2,
    CLAN_TARGET: 100, CLAN_STEPS: [25, 50, 75, 100], CLAN_WIN_POINTS: 8,
    SWEEP_MAX: 4, SWEEP_REGEN_S: 7200, SWEEP_ADS: 2,                 // sweep tickets: 1 every 120 minutes up to 4, plus 2 bonus tickets a day from ads (resets at midnight UTC)
    XP_TIER: [10, 10, 20, 20, 20, 30, 40, 50, 60, 70],               // commander XP per part forged, by tier
    XP_NEED: (L) => Math.round(XP_C * Math.pow(L, XP_P)),             // XP to go from level L to L+1 (500 levels, about a year for a casual player)
    LEVEL_MAX: 500, LEVEL_BONUS: 0.0018, RANK_BONUS: 0.009, RANK_LEVELS: 20, RENAME_FLUX: 50, AVATARS: 12,                               // each commander level adds this to Damage and Hull
    FIGHT_SECONDS: 12,           // how long a fight takes (also sets the offline Credit rate)
    CRIT_CHANCE: 0, CRIT_MULT: 1, OVERCHARGE_EVERY: 4, OVERCHARGE_MULT: 1,   // no built-in crit or overcharge: they come only from bonus lines on your parts (1 = no effect)
    ENEMY_CRIT_MULT: 1.5,
    RUSH_SECONDS_PER_FLUX: 300, // 1 Flux finishes 5 minutes of Foundry waiting
    SUB_COUNT: [0, 0, 1, 1, 1, 1, 2, 2, 2, 2],       // bonus lines a part rolls, by tier
    // Drones (see the DRONES section)
    SUMMON_COST: 30, SUMMON_COUNT: 3, FREE_SUMMONS: 3,        // one summon = 3 drones; 3 free ones a day (each after an ad)
    DRONE_ODDS: [55, 29, 12, 3.5, 0.5],                        // % chance of N, R, SR, SSR, UR for each of the 3 drones
    STAR_MAX: 10, DRONE_LEVEL_MAX: 60, DRONE_COST0: 500, DRONE_COST_G: 1.043,   // Nanites for the next level: 500 at first, +4.3% each level
    DRONE_RESET_FLUX: 10, DRONE_POWER: 0.7,                    // resetting a drone's level costs Flux and refunds every Nanite; DRONE_POWER scales ability damage and repair (tuned with tests/sim.js)
    LINK_BASE: 0.5, LINK_STEP: 0.1, LINK_STAR_STEP: 5,         // Link: owning all N drones gives 0.5% x N, then 0.1% x N for every 5 total stars (up to 2N times)
    ARMOR_PER_DEF: 0.2, ARMOR_MAX: 0.6,                        // 'Defense' from drones is damage reduction: 1/5 of the percent, up to 60% in total
    NANITE_RAID: 200, NANITE_RAID_G: 1.0125                    // Drone Hangar: Nanites for a win at ladder stage n = 200 x 1.0125^(n-1)
  };

  // 4 weapon-type slots add Damage, 4 hull-type slots add Hull.
  const SLOTS = [
    { id: 'cannon',   name: 'Main Cannon',      stat: 'dmg',  base: 12, glyph: '⌖' },
    { id: 'pod',      name: 'Missile Pod',      stat: 'dmg',  base: 10, glyph: '✦' },
    { id: 'array',    name: 'Targeting Array',  stat: 'dmg',  base: 8,  glyph: '◎' },
    { id: 'coil',     name: 'Reactor Coil',     stat: 'dmg',  base: 6,  glyph: '⚡' },
    { id: 'plating',  name: 'Hull Plating',     stat: 'hull', base: 50, glyph: '▣' },
    { id: 'bulkhead', name: 'Bulkhead',         stat: 'hull', base: 45, glyph: '▥' },
    { id: 'emitter',  name: 'Shield Emitter',   stat: 'hull', base: 40, glyph: '◈' },
    { id: 'spar',     name: 'Frame Spar',       stat: 'hull', base: 35, glyph: '╫' }
  ];

  // Each tier has its own gear names (not just a prefix). Tiers 6-9 are planned and locked.
  const TIERS = [
    { name: 'Rusted',     color: '#9a8672', mult: 1,   sell: 1,  unlock: 1,  launch: true,
      names: { cannon: 'Scrapper Cannon', pod: 'Junkyard Pod', array: 'Cracked Sight Array', coil: 'Leaky Coil', plating: 'Dented Plate', bulkhead: 'Patched Bulkhead', emitter: 'Flicker Emitter', spar: 'Bent Spar' } },
    { name: 'Refitted',   color: '#6fcf6f', mult: 2.2, sell: 2,  unlock: 3,  launch: true,
      names: { cannon: 'Rebuilt Autocannon', pod: 'Tube Launcher', array: 'Salvaged Targeter', coil: 'Jury Reactor', plating: 'Welded Hull', bulkhead: 'Braced Partition', emitter: 'Patched Barrier', spar: 'Reworked Strut' } },
    { name: 'Hardened',   color: '#4aa3ff', mult: 4.8, sell: 3,  unlock: 5, launch: true,
      names: { cannon: 'Gauss Cannon', pod: 'Swarm Pod', array: 'Optic Array', coil: 'Fusion Coil', plating: 'Ceramic Plate', bulkhead: 'Reinforced Bulkhead', emitter: 'Deflector Emitter', spar: 'Titan Spar' } },
    { name: 'Classified', color: '#b27cff', mult: 10,  sell: 4,  unlock: 8, launch: true,
      names: { cannon: 'Black-Ops Railgun', pod: 'Whisper Pod', array: 'Ghost Array', coil: 'Dark Coil', plating: 'Stealth Plate', bulkhead: 'Vault Bulkhead', emitter: 'Cloak Emitter', spar: 'Redacted Spar' } },
    { name: 'Voidborn',   color: '#ff5ec4', mult: 20,  sell: 6, unlock: 11, launch: true,
      names: { cannon: 'Rift Cannon', pod: 'Singularity Pod', array: 'Eventide Array', coil: 'Hollow Coil', plating: 'Umbral Plate', bulkhead: 'Abyssal Bulkhead', emitter: 'Null Emitter', spar: 'Voidglass Spar' } },
    { name: 'Exotic',     color: '#ffb02e', mult: 38,  sell: 9, unlock: 14, launch: true,
      names: { cannon: 'Plasma Lance', pod: 'Nova Pod', array: 'Prism Array', coil: 'Starheart Coil', plating: 'Aegis Plate', bulkhead: 'Citadel Bulkhead', emitter: 'Bastion Emitter', spar: 'Titanite Spar' } },
    { name: 'Ancient',    color: '#c9b37a', mult: 70,  sell: 13,  unlock: 17, launch: true,
      names: { cannon: 'Relic Cannon', pod: 'Elder Pod', array: 'Oracle Array', coil: 'Primal Coil', plating: 'Monolith Plate', bulkhead: 'Obelisk Bulkhead', emitter: 'Rune Emitter', spar: 'Fossil Spar' } },
    { name: 'Dark Matter', color: '#6a5acd', mult: 130, sell: 19, unlock: 20, launch: true,
      names: { cannon: 'Gravity Lance', pod: 'Dense Pod', array: 'Lensing Array', coil: 'Shadow Coil', plating: 'Dark Plate', bulkhead: 'Massive Bulkhead', emitter: 'Halo Emitter', spar: 'Collapsed Spar' } },
    { name: 'Origin',     color: '#7fe3d0', mult: 240, sell: 28, unlock: 24, launch: true,
      names: { cannon: 'Genesis Cannon', pod: 'Spark Pod', array: 'Prime Array', coil: 'Seed Coil', plating: 'Cradle Plate', bulkhead: 'Genesis Bulkhead', emitter: 'Dawn Emitter', spar: 'Root Spar' } },
    { name: 'Apex',       color: '#ff4d4d', mult: 440, sell: 40, unlock: 29, launch: true,
      names: { cannon: 'Apex Railgun', pod: 'Zenith Pod', array: 'Sovereign Array', coil: 'Crown Coil', plating: 'Apex Plate', bulkhead: 'Sovereign Bulkhead', emitter: 'Zenith Emitter', spar: 'Summit Spar' } }
  ];
  const LAUNCH_TIERS = TIERS.filter((t) => t.launch).length;

  /* ----- the 10 starship hulls. The hull on screen follows the tier of the fitted Hull Plating; its size grows with tier (CSS scale). ----- */
  const SHIPS = [
    { tier: 0, name: 'Rusted',      archetype: 'Scrap Barge / Cutter',          scale: 0.85, theme: 'Low-profile, flat open deck, heavy orange rust, welded scrap plates, single tiny cockpit.',
      kw: 'small scrap barge, single tiny cockpit canopy, flat deck, rusted scrap metal, crude patch welds' },
    { tier: 1, name: 'Refitted',    archetype: 'Gunboat / Patrol Craft',        scale: 0.89, theme: 'Angular gray steel plating, chipped orange primer underlayers, double-barreled mounts, industrial wedge bow.',
      kw: 'patrol gunboat, industrial wedge nose, gray steel armor plates, scattered orange primer rust patches, bolted repair plates' },
    { tier: 2, name: 'Hardened',    archetype: 'Corvette / Heavy Frigate',      scale: 0.93, theme: 'Slate-blue corporate hull, high-visibility yellow hazard chevrons, heavy I-beam framing, twin engine pods.',
      kw: 'heavy corvette frigate, slate-blue armor, yellow hazard warning stripes, structural I-beams, industrial corporate plating' },
    { tier: 3, name: 'Classified',  archetype: 'Stealth Destroyer',             scale: 0.97, theme: 'Sharp angular stealth facets, matte black radar-absorbent hull, glowing purple energy conduits, forward-swept stabilizer fins.',
      kw: 'stealth destroyer, faceted angular hull, matte black radar-absorbent coating, purple energy glow lines, forward-swept fins' },
    { tier: 4, name: 'Voidborn',    archetype: 'Cruiser / Battlecruiser',       scale: 1.01, theme: 'Deep metallic red/pink armor plates, exposed glowing plasma reactor core, multi-deck command bridge, heavy dorsal armor.',
      kw: 'heavy battlecruiser, deep metallic red plating, exposed glowing plasma reactor core, raised multi-deck bridge, reinforced hull flanks' },
    { tier: 5, name: 'Exotic',      archetype: 'Battleship / Dreadnought',      scale: 1.05, theme: 'Gold-trimmed armored prow, heavy broadside gun batteries, layered orbital plating, massive rear thruster bank.',
      kw: 'grand battleship, gold and dark metal trim, massive armored prow, broadside gun ports, layered heavy shield plating' },
    { tier: 6, name: 'Ancient',     archetype: 'Carrier / Hive Ship',           scale: 1.10, theme: 'Bronze monolithic alien geometry, cavernous drone launch bays, glowing rune energy channels, sweeping organic-mechanical curves.',
      kw: 'ancient alien carrier, monolithic bronze hull, cavernous drone bay openings, glowing engraved energy runes, alien megastructure' },
    { tier: 7, name: 'Dark Matter', archetype: 'Siege Platform / Leviathan',    scale: 1.15, theme: 'Deep violet and obsidian black armor, gravity-defying detached floating plates, central void engine core, imposing wide silhouette.',
      kw: 'dark matter siege platform, obsidian black armor, floating magnetic hull segments, central purple void singularity core' },
    { tier: 8, name: 'Origin',      archetype: 'Titan / Mothership',            scale: 1.20, theme: 'Utopian white and cyan metal, hyper-clean curved hull geometries, orbiting protective energy rings, massive multi-section flagship.',
      kw: 'utopian titan mothership, pristine white ceramic armor, glowing cyan accents, orbiting energy rings, massive high-tech flagship' },
    { tier: 9, name: 'Apex',        archetype: 'Super-Dreadnought / Star Fortress', scale: 1.25, theme: 'Overwhelming military-grade geometry, crimson and gold energy shields, triple-engine main thruster clusters, colossal fortress prow.',
      kw: 'apex super-dreadnought, dark crimson and gold armor, colossal star fortress prow, multi-layered energy shielding, massive main engines' }
  ];

  // Bonus lines on parts. Each roll is a random whole-ish percent from 1% up to the line's max (as in Forge Master). Only parts of tier 3 and up roll lines.
  const SUBS = {
    crit:    { name: 'Crit chance',   max: 12, cap: 0.75, note: 'chance to hit for extra damage' },
    critdmg: { name: 'Crit damage',   max: 80,  cap: 3,    note: 'extra damage on a crit' },
    pierce:  { name: 'Armor pierce',  max: 20,   cap: 0.8,  note: 'ignores enemy armor' },
    oc:      { name: 'Overcharge',    max: 40,  cap: 3,    note: 'stronger Overcharge shots' },
    haste:   { name: 'Haste',         max: 25,   cap: 0.7,  note: 'you act sooner in turn order' },
    armor:   { name: 'Plating',       max: 15, cap: 0.5,  note: 'less damage taken' },
    dodge:   { name: 'Evasion',       max: 10,   cap: 0.45, note: 'chance to dodge a hit' },
    leech:   { name: 'Hull leech',    max: 20, cap: 0.35, note: 'heals you for part of your damage' }
  };
  const SUB_KEYS = Object.keys(SUBS);
  // every bonus line can roll on any part (as in the reference games): purely random
  const SLOT_SUBS = {}; ['cannon', 'pod', 'array', 'coil', 'plating', 'bulkhead', 'emitter', 'spar'].forEach((id) => { SLOT_SUBS[id] = SUB_KEYS.slice(); });

  /* ===================== FORGE MASTER MATH (35 levels), resampled to our 25 Foundry levels ===================== */
  // Chance of each tier (Primitive..Divine in the original, Rusted..Apex here) at each of the 35 original forge levels, in percent.
  const FM_ODDS = [[100],[99,1],[98,2],[96,4],[91.5,8,0.5],[82,16,2],[64,32,4],[27.8,64,8,0.2],[13,70,16,1],[6,60,32,2],[0,31.9,64,4,0.1],[0,27.5,64,8,0.5],[0,8,75,16,1],[0,0,66,32,2,0.05],[0,0,31.7,64,4,0.25],[0,0,21.5,70,8,0.5],[0,0,0,82.9,16,1,0.05],[0,0,0,65.7,32,2,0.25],[0,0,0,31.5,64,4,0.5],[0,0,0,0,91,8,1,0.05],[0,0,0,0,81.7,16,2,0.25],[0,0,0,0,63.5,32,4,0.5],[0,0,0,0,27,64,8,1],[0,0,0,0,0,82,16,2,0.02],[0,0,0,0,0,64,32,4,0.05],[0,0,0,0,0,43.8,50,6,0.25],[0,0,0,0,0,31.5,60,8,0.5],[0,0,0,0,0,21,65,13,1],[0,0,0,0,0,6.99,68,23,2,0.02],[0,0,0,0,0,0,60,36,4,0.05],[0,0,0,0,0,0,50.8,43,6,0.25],[0,0,0,0,0,0,41.5,50,8,0.5],[0,0,0,0,0,0,28,58,13,1],[0,0,0,0,0,0,11,64,23,2],[0,0,0,0,0,0,0,60,36,4]];
  // Original time (seconds) and cost (credits) to reach level n, for n = 2..35 (index 0 is level 2).
  const FM_TIME = [300, 900, 1800, 3600, 7200, 27180, 47160, 67140, 87180, 104400, 126000, 144000, 165600, 187200, 205200, 226800, 244800, 277200, 306000, 334800, 363600, 396000, 424800, 457200, 486000, 514800, 547200, 576000, 607200, 633600, 666000, 694800, 727200, 756000];
  const FM_COST = [400, 700, 1500, 3500, 10000, 25000, 50000, 33000, 50000, 83300, 116000, 112000, 150000, 160000, 182000, 170000, 161000, 155000, 150000, 146000, 157000, 168000, 179000, 190000, 201000, 212000, 223000, 234000, 245000, 256000, 267000, 278000, 289000, 300000];
  // 'No. of Nodes' (payments) for levels 2..35 (index 0 is level 2)
  const FM_NODES = [1,1,1,1,1,1,1,3,3,3,3,4,4,5,5,6,7,8,9,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10];
  const FM_LEVELS = 35, OUR_LEVELS = 25;
  const fmPos = (L) => L;           // our Foundry level IS the original's level (1-25, nothing squeezed)
  // running total of an original table at a fractional level (straight lines between whole levels)
  function fmCum(arr, x) {
    let t = 0; const n = Math.floor(x), f = x - n;
    for (let k = 2; k <= n; k++) t += arr[k - 2];
    if (f > 0 && n >= 1 && n < FM_LEVELS) t += f * arr[n - 1];
    return t;
  }
  const fmStep = (arr, L) => fmCum(arr, fmPos(L + 1)) - fmCum(arr, fmPos(L));         // what the original charged for the stretch our step covers

  /* ===================== RULES ===================== */
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const slotById = (id) => SLOTS.find((s) => s.id === id);

  function itemStat(it) {
    const s = slotById(it.slot), t = TIERS[it.tier];
    return Math.max(1, Math.floor(s.base * t.mult * Math.pow(CFG.LEVEL_GROWTH, it.level - 1)));
  }
  function itemName(it) { return TIERS[it.tier].names[it.slot]; }
  function sellValue(it) {
    return Math.max(1, Math.round(TIERS[it.tier].sell * (1 + CFG.SELL_LEVEL * (it.level - 1))));
  }

  // Chance of each tier at Foundry level L (fractions that sum to 1). Blended between the original's levels, so 25 of ours cover its 35.
  function tierOdds(L) {
    const x = fmPos(clamp(L, 1, OUR_LEVELS)) - 1, a = Math.min(FM_LEVELS - 1, Math.floor(x)), f = x - a, w = [];
    for (let i = 0; i < LAUNCH_TIERS; i++) { const p = FM_ODDS[a][i] || 0, q = (FM_ODDS[Math.min(FM_LEVELS - 1, a + 1)][i]) || 0; w.push(p + (q - p) * f); }
    const sum = w.reduce((u, v) => u + v, 0);
    return w.map((v) => v / sum);
  }

  // what an average part forged at Foundry level L sells for
  function avgSell(L) { const o = tierOdds(L); let t = 0; o.forEach((p, i) => { if (p > 0) t += p * sellValue({ tier: i, level: L }); }); return t; }
  TIERS.forEach((t, i) => { let u = 1; while (u < OUR_LEVELS && tierOdds(u)[i] <= 0) u++; t.unlock = u; });   // first level where a tier can drop

  function rollSubs(slot, tier, rng, skip) {
    const pool = SLOT_SUBS[slot].filter((k) => !(skip || []).includes(k)), out = [], n = Math.min(CFG.SUB_COUNT[tier] || 0, pool.length);
    for (let i = 0; i < n; i++) {
      const k = pool.splice(Math.floor(rng() * pool.length) % pool.length, 1)[0];
      out.push({ k, v: rollSubValue(k, tier, rng) });
    }
    return out;
  }
  function rollSubValue(k, tier, rng) { return Math.round((1 + rng() * (SUBS[k].max - 1)) * 10) / 10; }
  function rollItem(forgeLevel, rng, cmdLevel) {
    const odds = tierOdds(forgeLevel);
    let r = rng(), tier = 0;
    for (let i = 0; i < odds.length; i++) { r -= odds[i]; if (r <= 0) { tier = i; break; } tier = i; }
    const slot = SLOTS[Math.floor(rng() * SLOTS.length) % SLOTS.length].id;
    const lvl = clamp((cmdLevel || 1) + Math.floor(rng() * (2 * CFG.GEAR_SPREAD + 1)) - CFG.GEAR_SPREAD, 1, CFG.LEVEL_MAX);
    return { slot, tier, level: lvl, subs: rollSubs(slot, tier, rng) };
  }

  function newState(now) {
    const gear = {}; SLOTS.forEach((s) => { gear[s.id] = null; });
    return {
      v: CFG.SAVE_VERSION, name: 'Commander', avatar: 0, renames: 0, created: now, last: now,
      alloy: CFG.START_ALLOY, credits: 0, shards: 0, stock: { alloy: 0, credits: 0, lock: 0 },
      cmd: { level: 1, xp: 0, rank: 0 }, research: {}, tech: null, sweep: { tickets: CFG.SWEEP_MAX, at: now, day: '', ads: 0 },
      medals: 0, ladders: { alloy: 0, shards: 0, cores: 0, nanites: 0 }, daily: { day: '', att: {}, arena: 0, arenaX: 0, shop: {}, fstore: {}, dsum: 0, clan: [], clanPts: 0, gift: false, deals: {}, ads: {} }, noAds: false, arena: { lp: 0, opp: [], seed: 0 }, clan: null,
      forge: { level: 1, upgrade: null, paid: 0 },
      gear, held: [], codex: {}, quests: {},
      combat: { stage: 1, best: 0, push: true, speed: 1 }, flux: 0,
      stats: { fused: 0, summoned: 0, arena: 0, wins: 0, losses: 0, bosses: 0, forged: 0, sold: 0, equipped: 0, alloyEarned: 0, creditsEarned: 0, upgrades: 0, bestTier: 0, seconds: 0 },
      cores: 0, nanites: 0, drones: { own: {}, active: '', summons: 0 },
      settings: { vibrate: true, auto: false, filter: [], filterMin: 1, autoTiers: [], autoSubs: [], runTiers: [] }
    };
  }
  function migrate(s, now) {
    const d = newState(now);
    if (!s || typeof s !== 'object') return d;
    const out = Object.assign(newState(now), s);
    out.forge = Object.assign(d.forge, s.forge || {});
    out.gear = Object.assign(d.gear, s.gear || {});
    out.stats = Object.assign(d.stats, s.stats || {});
    out.settings = Object.assign(d.settings, s.settings || {});
    out.combat = Object.assign({ stage: 1, best: 0, push: true, speed: 1 }, s.combat || {});
    out.combat.push = true;
    out.combat.best = clamp(Math.floor(out.combat.best) || 0, 0, CFG.MAX_STAGE);
    out.combat.stage = clamp(Math.floor(out.combat.stage) || 1, 1, Math.min(CFG.MAX_STAGE, out.combat.best + 1));
    if (!isFinite(out.flux) || out.flux < 0) out.flux = 0;
    if (!isFinite(out.shards) || out.shards < 0) out.shards = 0;
    out.cmd = Object.assign({ level: 1, xp: 0, rank: 0 }, s.cmd || {});
    out.cmd.rank = clamp(Math.floor(out.cmd.rank) || 0, 0, RANK_NAMES.length - 1);
    out.cmd.level = clamp(Math.floor(out.cmd.level) || 1, 1, CFG.LEVEL_MAX);
    if (!isFinite(out.cmd.xp) || out.cmd.xp < 0) out.cmd.xp = 0;
    out.cmd.level = Math.min(out.cmd.level, levelCap(out.cmd)); levelLoop(out);
    out.avatar = clamp(Math.floor(s.avatar) || 0, 0, CFG.AVATARS - 1); out.renames = clamp(Math.floor(s.renames) || 0, 0, 999);
    out.name = (typeof s.name === 'string' && s.name.trim() ? s.name : 'Commander').replace(/[<>&"]/g, '').trim().slice(0, 14) || 'Commander';
    // research: keep valid nodes. Older research layouts are wiped and refunded a few Shards per level.
    out.research = {}; let old = 0;
    Object.keys(s.research || {}).forEach((k) => {
      const v = Math.floor(s.research[k]) || 0, n = techNode(k);
      if (n && k === 'alloy' && s.rv !== 26) { old += 3 * v; return; }   // the old v24 'alloy' line is a different thing
      if (n) out.research[k] = clamp(v, 0, n.max); else if (v > 0) old += 3 * v;
    });
    if (old) out.shards = (isFinite(out.shards) ? out.shards : 0) + old;
    out.tech = s.tech && typeof s.tech === 'object' && techNode(s.tech.id) && isFinite(s.tech.endAt) ? s.tech : null;
    out.sweep = Object.assign({ tickets: CFG.SWEEP_MAX, at: now, day: '', ads: 0 }, s.sweep || {});
    if (!isFinite(out.sweep.tickets) || out.sweep.tickets < 0) out.sweep.tickets = 0;
    if (!isFinite(out.medals) || out.medals < 0) out.medals = 0;
    out.ladders = Object.assign({ alloy: 0, shards: 0, cores: 0, nanites: 0 }, s.ladders || {});
    Object.keys(out.ladders).forEach((k) => { out.ladders[k] = clamp(Math.floor(out.ladders[k]) || 0, 0, CFG.MAX_STAGE); });
    out.daily = Object.assign({ day: '', att: {}, arena: 0, arenaX: 0, shop: {}, fstore: {}, dsum: 0, clan: [], clanPts: 0, gift: false, deals: {}, ads: {} }, s.daily || {});
    out.noAds = !!out.noAds;
    out.arena = Object.assign({ lp: 0, opp: [], seed: 0 }, s.arena || {});
    if (!Array.isArray(out.arena.opp)) out.arena.opp = [];
    if (!out.clan || typeof out.clan !== 'object') out.clan = null;
    if (!isFinite(out.cores) || out.cores < 0) out.cores = 0;
    if (!isFinite(out.nanites) || out.nanites < 0) out.nanites = 0;
    out.drones = { own: {}, active: '', summons: Math.max(0, Math.floor(s.drones && s.drones.summons) || 0) };
    if (s.drones && s.drones.own && typeof s.drones.own === 'object') {
      Object.keys(s.drones.own).forEach((id) => {
        const r = s.drones.own[id]; if (!DRONE_BY[id] || !r) return;
        out.drones.own[id] = { s: clamp(Math.floor(r.s) || 0, 0, CFG.STAR_MAX), c: Math.max(0, Math.floor(r.c) || 0), l: clamp(Math.floor(r.l) || 1, 1, CFG.DRONE_LEVEL_MAX), p: Math.max(0, Math.floor(r.p) || 0) };
      });
      if (DRONE_BY[s.drones.active] && out.drones.own[s.drones.active]) out.drones.active = s.drones.active;
    } else if (s.wing && s.wing.owned) {
      // saves from before drones: every old companion becomes its drone, and fused ranks count as the copies they cost (3 per rank)
      Object.keys(s.wing.owned).forEach((k) => {
        const [sp, rank] = k.split(':').map(Number), id = OLD_WING[sp]; if (!DRONE_BY[id]) return;
        const copies = Math.max(0, Math.floor(s.wing.owned[k]) || 0) * Math.pow(3, rank || 0); if (!copies) return;
        const r = out.drones.own[id] || (out.drones.own[id] = { s: 0, c: -1, l: 1, p: 0 }); r.c += copies;
      });
      Object.keys(out.drones.own).forEach((id) => { const r = out.drones.own[id], total = r.c + 1, st = Math.min(CFG.STAR_MAX, total - 1); r.s = st; r.c = total - 1 - st; });
      const first = s.wing.active && s.wing.active[0] ? OLD_WING[Number(String(s.wing.active[0]).split(':')[0])] : '';
      out.drones.active = out.drones.own[first] ? first : (Object.keys(out.drones.own)[0] || '');
    }
    if (!out.drones.active) out.drones.active = Object.keys(out.drones.own)[0] || '';
    delete out.wing;
    if (!Array.isArray(out.settings.filter)) out.settings.filter = [];
    ['autoTiers', 'autoSubs'].forEach((k) => { if (!Array.isArray(out.settings[k])) out.settings[k] = []; });
    if (!Array.isArray(out.settings.runTiers)) out.settings.runTiers = [];
    delete out.settings.runTier;
    // the old cargo hold is gone: anything left in it is sold
    if (Array.isArray(s.hold)) s.hold.forEach((it) => { if (it && TIERS[it.tier] && slotById(it.slot)) out.credits += sellValue(it); });
    delete out.hold; delete out.holdCap;
    if (!out.quests || typeof out.quests !== 'object') out.quests = {};
    if (!out.codex || typeof out.codex !== 'object') out.codex = {};
    Object.keys(out.gear).forEach((k) => { if (out.gear[k] && !out.gear[k].subs) out.gear[k].subs = []; });
    out.held = Array.isArray(s.held) ? s.held.filter((h) => h && h.it && TIERS[h.it.tier] && slotById(h.it.slot)).map((h) => ({ it: Object.assign({ subs: [] }, h.it), isNew: !!h.isNew })) : [];
    if (s.pending && TIERS[s.pending.tier] && slotById(s.pending.slot)) out.held.push({ it: Object.assign({ subs: [] }, s.pending), isNew: !!s.pendingNew });
    delete out.pending; delete out.pendingNew;
    out.held = out.held.slice(-batchSize(out));
    ['alloy', 'credits'].forEach((k) => { if (!isFinite(out[k]) || out[k] < 0) out[k] = 0; });
    out.stock = Object.assign({ alloy: 0, credits: 0, lock: 0 }, s.stock || {});
    ['alloy', 'credits', 'lock'].forEach((k) => { if (!isFinite(out.stock[k]) || out.stock[k] < 0) out.stock[k] = 0; });
    out.forge.level = clamp(Math.floor(out.forge.level) || 1, 1, CFG.MAX_FORGE_LEVEL);
    if (out.forge.upgrade && out.forge.upgrade.to > CFG.MAX_FORGE_LEVEL) out.forge.upgrade = null;
    out.v = CFG.SAVE_VERSION; out.rv = 26;
    return out;
  }



  /* ===================== RESEARCH: Forge Master's tech tables (T1-T5), waits x1.5 ===================== */
  // Each table has 25 steps: 5 rows (I-V) of 5 levels. Cost in the original's potions, time in seconds, instant-finish cost in gems.
  const TECH_COST = [[27, 38, 53, 74, 115, 145, 203, 284, 399, 558, 781, 906, 1051, 1219, 1414, 1641, 1903, 2207, 2561, 2970, 3445, 3997, 4636, 5378, 6238], [24, 34, 47, 66, 92, 129, 181, 253, 354, 496, 694, 806, 934, 1083, 1257, 1458, 1691, 1962, 2276, 2640, 3062, 3553, 4121, 4780, 5545], [21, 29, 41, 57, 92, 113, 158, 221, 310, 434, 608, 705, 818, 948, 1100, 1276, 1480, 1716, 1991, 2310, 2680, 3109, 3606, 4183, 4852], [18, 25, 35, 49, 69, 97, 136, 190, 266, 372, 521, 604, 701, 812, 943, 1094, 1268, 1471, 1707, 1980, 2297, 2665, 3091, 3585, 4159], [15, 21, 30, 41, 58, 81, 113, 158, 222, 310, 434, 504, 584, 677, 786, 912, 1057, 1226, 1423, 1650, 1914, 2221, 2576, 2988, 3466]];
  const TECH_TIME = [[250, 500, 1000, 2000, 4000, 7920, 16020, 31980, 64020, 70380, 77460, 85140, 93720, 103080, 113400, 124740, 137160, 150900, 166020, 182580, 200880, 220920, 243060, 267360, 294060], [214, 429, 857, 1714, 3429, 6840, 13740, 28020, 54840, 60360, 66360, 73020, 80340, 88320, 97200, 106920, 117600, 129360, 142260, 156540, 172140, 189360, 208320, 229140, 252060], [188, 375, 750, 1500, 3000, 6000, 12000, 24000, 48000, 52800, 58080, 63900, 70260, 77280, 85020, 93540, 102900, 113160, 124500, 136980, 150660, 165720, 183120, 200520, 220560], [167, 333, 667, 1333, 2667, 5340, 10680, 21360, 42660, 46920, 51600, 56760, 62460, 68700, 75540, 83160, 91440, 100620, 110640, 121740, 133920, 147300, 162000, 178200, 196080], [150, 300, 600, 1200, 2400, 4800, 9600, 19200, 38400, 42240, 46440, 51120, 56220, 61860, 68040, 74820, 82320, 90540, 99600, 109560, 120540, 132540, 145800, 160380, 176460]];
  const TECH_GEMS = [[1, 1, 2, 5, 9, 18, 37, 74, 147, 162, 178, 196, 216, 237, 261, 287, 316, 347, 382, 420, 462, 508, 559, 615, 676], [1, 1, 2, 4, 8, 16, 32, 63, 126, 139, 153, 168, 185, 203, 224, 246, 270, 298, 327, 360, 396, 436, 479, 527, 580], [1, 1, 2, 3, 7, 14, 28, 55, 110, 121, 134, 147, 162, 178, 196, 215, 237, 260, 286, 315, 347, 381, 419, 461, 507], [1, 1, 2, 3, 6, 12, 25, 49, 98, 108, 119, 131, 144, 158, 174, 191, 210, 231, 255, 280, 308, 339, 373, 410, 451], [1, 1, 1, 3, 6, 12, 22, 44, 98, 97, 107, 118, 129, 142, 156, 172, 189, 208, 229, 252, 277, 305, 335, 369, 406]];

  /* ===================== COMMANDER, RANKS, RESEARCH ===================== */
  const RANK_FAMILIES = ['Cadet', 'Ensign', 'Lieutenant', 'Lieutenant Commander', 'Commander', 'Captain', 'Commodore', 'Rear Admiral'], NUMERALS = ['I', 'II', 'III'];
  const RANK_NAMES = []; RANK_FAMILIES.forEach((f) => NUMERALS.forEach((n) => RANK_NAMES.push(f + ' ' + n))); RANK_NAMES.push('Fleet Admiral');   // 8 names x I-III, then Fleet Admiral: 25 ranks, 20 levels each = level 500
  // Every 20 levels is one rank. At the last level of a rank (20, 40, ...) the bar fills for the next level and you are promoted.
  const levelCap = (cmd) => Math.min(CFG.LEVEL_MAX, (cmd.rank + 1) * CFG.RANK_LEVELS);
  /* ----- the research tree: Forge Master's layout. Every node has 5 tiers (I-V) of 5 levels = 25 upgrades. ----- */
  // cls = which of the five cost tables it follows (T1 is the dearest). per = what one level gives, a little under Forge Master's.
  const TECH_TIERS = 5, TECH_TIER_GATE = [1, 80, 167, 260, 350];     // commander level that opens tier I-V of a node
  const BATCH_STEPS = [0, 2, 4, 6, 8, 9], BATCH_GATE = [30, 100, 190, 280, 375];   // Multi-Forge: one upgrade per tier, +2 parts each (+1 on the last), so 10 at once at the end
  const TECH_BRANCHES = [{ id: 'forge', name: 'Forge' }, { id: 'power', name: 'Power' }, { id: 'fleet', name: 'Fleet' }];
  const pct = (n, p) => (n * p).toFixed(1).replace('.0', '') + '%';
  const TECH_NODES = [
    { id: 'ftimer',  branch: 'forge', cls: 1, per: 3,     text: (n) => 'Foundry upgrades ' + pct(n, 3) + ' faster' },
    { id: 'fcost',   branch: 'forge', cls: 2, per: 1.5,   text: (n) => 'Foundry upgrades ' + pct(n, 1.5) + ' cheaper' },
    { id: 'sell',    branch: 'forge', cls: 2, per: 1.6,   text: (n) => 'Sell prices +' + pct(n, 1.6) },
    { id: 'batch',   branch: 'forge', cls: 1, per: 0,     text: (n) => 'Forge ' + (1 + BATCH_STEPS[n]) + ' at once', max: 5 },
    { id: 'free',    branch: 'forge', cls: 3, per: 0.8,   text: (n) => pct(n, 0.8) + ' chance to forge for free' },
    { id: 'alloy',    branch: 'forge', cls: 1, per: 1.6,   text: (n) => 'Alloy production +' + pct(n, 1.6) },
    { id: 'patrol',   branch: 'forge', cls: 2, per: 1.6,   text: (n) => 'Offline Credits ' + (CFG.OFFLINE_CREDIT_RATE + n * 0.016).toFixed(2) + '/s' },
    { id: 'offline', branch: 'forge', cls: 1, per: 16,    text: (n) => 'Offline time ' + (CFG.OFFLINE_BASE_H * (1 + n * 0.16)).toFixed(1).replace('.0', '') + 'h' },
    { id: 'salv',    branch: 'forge', cls: 5, per: 1.6,   text: (n) => 'Salvage Run Alloy +' + pct(n, 1.6) },
    { id: 'dmgc',    branch: 'power', cls: 3, per: 1.6,   slot: 'cannon',   text: (n) => 'Main Cannon +' + pct(n, 1.6) },
    { id: 'dmgp',    branch: 'power', cls: 3, per: 1.6,   slot: 'pod',      text: (n) => 'Missile Pod +' + pct(n, 1.6) },
    { id: 'dmga',    branch: 'power', cls: 3, per: 1.6,   slot: 'array',    text: (n) => 'Targeting Array +' + pct(n, 1.6) },
    { id: 'dmgr',    branch: 'power', cls: 3, per: 1.6,   slot: 'coil',     text: (n) => 'Reactor Coil +' + pct(n, 1.6) },
    { id: 'hulp',    branch: 'power', cls: 4, per: 1.6,   slot: 'plating',  text: (n) => 'Hull Plating +' + pct(n, 1.6) },
    { id: 'hulb',    branch: 'power', cls: 4, per: 1.6,   slot: 'bulkhead', text: (n) => 'Bulkhead +' + pct(n, 1.6) },
    { id: 'hule',    branch: 'power', cls: 4, per: 1.6,   slot: 'emitter',  text: (n) => 'Shield Emitter +' + pct(n, 1.6) },
    { id: 'huls',    branch: 'power', cls: 4, per: 1.6,   slot: 'spar',     text: (n) => 'Frame Spar +' + pct(n, 1.6) },
    { id: 'techspd', branch: 'fleet', cls: 1, per: 3,     text: (n) => 'Research ' + pct(n, 3) + ' faster' },
    { id: 'techcst', branch: 'fleet', cls: 2, per: 1.6,   text: (n) => 'Research ' + pct(n, 1.6) + ' cheaper' },
    { id: 'odmg',    branch: 'fleet', cls: 2, per: 1.6,   text: (n) => 'Damage +' + pct(n, 1.6) },
    { id: 'ohull',   branch: 'fleet', cls: 2, per: 1.6,   text: (n) => 'Hull +' + pct(n, 1.6) },
    { id: 'woff',    branch: 'fleet', cls: 3, per: 1.6,   text: (n) => 'Drone attacks +' + pct(n, 1.6) },
    { id: 'wsup',    branch: 'fleet', cls: 3, per: 1.6,   text: (n) => 'Drone support +' + pct(n, 1.6) },
    { id: 'summon',  branch: 'fleet', cls: 4, per: 0.8,   text: (n) => 'Summons ' + pct(n, 0.8) + ' cheaper' },
    { id: 'wtwin',   branch: 'fleet', cls: 4, per: 1.6,   text: (n) => pct(n, 1.6) + ' chance of a bonus copy' },
    { id: 'heist',   branch: 'fleet', cls: 5, per: 1.6,   text: (n) => 'Data Heist Shards +' + pct(n, 1.6) },
    { id: 'convoy',  branch: 'fleet', cls: 5, per: 1.6,   text: (n) => 'Clan Convoy Cores +' + pct(n, 1.6) }
  ];
  TECH_NODES.forEach((n) => { n.max = n.max || 25; });
  const techNode = (id) => TECH_NODES.find((x) => x.id === id);
  const rLevel = (state, id) => (state.research && state.research[id]) || 0;
  const batchSize = (state) => 1 + BATCH_STEPS[Math.min(5, rLevel(state, 'batch'))];
  const techBonus = (state, id) => rLevel(state, id) * techNode(id).per / 100;   // as a fraction
  // everything about the next level of one research node
  function techInfo(state, id) {
    const n = techNode(id), l = rLevel(state, id), o = { id, node: n, level: l, max: n.max, maxed: l >= n.max };
    if (o.maxed) return o;
    const batch = id === 'batch', row = batch ? l * 5 : l;            // which row of the cost table
    o.tier = batch ? l + 1 : Math.floor(l / 5) + 1;                    // tier I-V this upgrade belongs to
    o.gate = batch ? BATCH_GATE[l] : TECH_TIER_GATE[o.tier - 1];
    o.cost = Math.max(1, Math.round(TECH_COST[n.cls - 1][row] * CFG.SHARD_SCALE * (1 - techBonus(state, 'techcst'))));
    o.secs = Math.max(1, Math.round(TECH_TIME[n.cls - 1][row] * CFG.TIME_SLOW / (1 + techBonus(state, 'techspd'))));
    o.flux = Math.max(1, Math.ceil(TECH_GEMS[n.cls - 1][row] * CFG.TIME_SLOW));
    o.locked = state.cmd.level < o.gate;
    return o;
  }
  function startTech(state, id, now) {
    const o = techInfo(state, id);
    if (!o.node || o.maxed || o.locked || state.tech || state.shards < o.cost) return false;
    state.shards -= o.cost; state.tech = { id, to: o.level + 1, startAt: now, endAt: now + o.secs * 1000, flux: o.flux };
    return true;
  }
  // finishes the research if its time is up; returns the node id or ''
  function checkTech(state, now) {
    const t = state.tech; if (!t || now < t.endAt) return '';
    state.research[t.id] = t.to; state.tech = null; state.stats.researched = (state.stats.researched || 0) + 1; return t.id;
  }
  const techRushCost = (state, now) => { const t = state.tech; if (!t) return 0; const total = Math.max(1, t.endAt - t.startAt); return Math.max(1, Math.ceil(t.flux * Math.max(0, t.endAt - now) / total)); };
  function rushTech(state, now) { const t = state.tech; if (!t) return false; const c = techRushCost(state, now); if (state.flux < c) return false; state.flux -= c; t.endAt = now; return true; }
  // can anything be started right now? (for the red dot)
  function techReady(state) {
    if (state.tech) return false;
    return TECH_NODES.some((n) => { const o = techInfo(state, n.id); return !o.maxed && !o.locked && state.shards >= o.cost; });
  }
  const alloyRate = (state) => CFG.ALLOY_PER_SEC * (1 + techBonus(state, 'alloy'));
  const offlineCapS = (state) => CFG.OFFLINE_BASE_H * (1 + techBonus(state, 'offline')) * 3600;   // 16% of the base per level (Forge Master's table): 4h up to 20h at level 25
  const creditMult = (state) => 1 + techBonus(state, 'sell');
  const upgradeSecs = (state, L) => Math.max(1, Math.round(CFG.UPGRADE_SECONDS(L) / (1 + techBonus(state, 'ftimer'))));
  const upgradeCredits = (state, L) => Math.max(1, Math.round(CFG.UPGRADE_CREDITS(L) * CFG.PAY_X * (1 - techBonus(state, 'fcost'))));   // one payment
  // multipliers on Damage and Hull from commander level and research
  function statBonus(state) {
    const lv = (1 + CFG.LEVEL_BONUS * (state.cmd.level - 1)) * (1 + CFG.RANK_BONUS * state.cmd.rank);
    const slotMul = {}; TECH_NODES.forEach((n) => { if (n.slot) slotMul[n.slot] = 1 + techBonus(state, n.id); });
    const db = droneBonus(state);
    return { dmg: lv * (1 + techBonus(state, 'odmg')) * (1 + db.dmg), hull: lv * (1 + techBonus(state, 'ohull')) * (1 + db.hull), armor: db.armor, slotMul };
  }
  // forging XP: returns levels gained
  function levelLoop(state) {
    const c = state.cmd, cap = levelCap(c); let gained = 0;
    for (;;) {
      const need = CFG.XP_NEED(c.level);
      if (c.level >= cap) { c.xp = c.rank >= RANK_NAMES.length - 1 ? 0 : Math.min(c.xp, need); break; }
      if (c.xp < need) break;
      c.xp -= need; c.level++; gained++;
    }
    return gained;
  }
  function addXp(state, tier) { const x = (CFG.XP_TIER[tier] || 10) * 1; state.cmd.xp += x; state.stats.xpTotal = (state.stats.xpTotal || 0) + x; return levelLoop(state); }
  const atCap = (state) => state.cmd.level >= levelCap(state.cmd) && state.cmd.rank < RANK_NAMES.length - 1;
  const rankReward = (k) => ({ flux: 6 * k, cores: 6 * k, shards: Math.max(1, Math.round(1.2 * k)) });
  function canPromote(state) { return atCap(state) && state.cmd.xp >= CFG.XP_NEED(state.cmd.level); }
  function promote(state) {
    if (!canPromote(state)) return null;
    const k = state.cmd.rank + 1, r = rankReward(k), c = state.cmd;
    c.xp -= CFG.XP_NEED(c.level); c.rank = k; c.level++;
    state.flux += r.flux; state.cores += r.cores; state.shards += r.shards;
    const before = c.level; levelLoop(state);
    return { rank: k, reward: r, levels: c.level - before + 1 };
  }
  // profile: pick a picture from the library; the first name change is free, later ones cost Flux
  const renameCost = (state) => ((state.renames || 0) < 1 ? 0 : CFG.RENAME_FLUX);
  function renameCommander(state, raw) {
    const name = String(raw || '').replace(/[<>&"]/g, '').replace(/\s+/g, ' ').trim().slice(0, 14);
    if (name.length < 2) return { ok: false, reason: 'short' };
    if (name === state.name) return { ok: false, reason: 'same' };
    const cost = renameCost(state);
    if (state.flux < cost) return { ok: false, reason: 'flux', cost };
    state.flux -= cost; state.name = name; state.renames = (state.renames || 0) + 1;
    return { ok: true, cost };
  }
  function setAvatar(state, i) { i = Math.floor(i); if (!(i >= 0 && i < CFG.AVATARS)) return false; state.avatar = i; return true; }

  /* ----- codex: every part you have ever forged ----- */
  const codexKey = (it) => it.tier + ':' + it.slot;
  const codexHas = (state, it) => !!state.codex[codexKey(it)];
  function codexTierCount(state, t) { let n = 0; SLOTS.forEach((s) => { if (state.codex[t + ':' + s.id]) n++; }); return n; }
  function codexCount(state) { let n = 0; for (let t = 0; t < LAUNCH_TIERS; t++) n += codexTierCount(state, t); return n; }
  function codexBonus(state) {
    let b = codexCount(state) * CFG.CODEX_PART;
    for (let t = 0; t < LAUNCH_TIERS; t++) if (codexTierCount(state, t) === SLOTS.length) b += CFG.CODEX_TIER;
    return b;
  }
  // records the part; returns { isNew, tierDone }
  function discover(state, it) {
    const k = codexKey(it);
    if (state.codex[k]) return { isNew: false, tierDone: false };
    state.codex[k] = 1;
    return { isNew: true, tierDone: codexTierCount(state, it.tier) === SLOTS.length };
  }

  /* ----- set bonus: 4 or 8 fitted parts of one tier or better ----- */
  function setBonus(gear) {
    let best = { bonus: 0, tier: -1, pieces: 0 };
    for (let t = 0; t < LAUNCH_TIERS; t++) {
      let n = 0; SLOTS.forEach((s) => { const it = gear[s.id]; if (it && it.tier >= t) n++; });
      const b = n >= 8 ? CFG.SET8[t] : n >= 4 ? CFG.SET4[t] : 0;
      if (b > best.bonus) best = { bonus: b, tier: t, pieces: n >= 8 ? 8 : 4 };
    }
    return best;
  }
  // Adds up every bonus line on fitted parts into the numbers combat uses.
  function gearCombat(gear) {
    const t = {}; SUB_KEYS.forEach((k) => { t[k] = 0; });
    SLOTS.forEach((sl) => { const it = gear[sl.id]; if (it && it.subs) it.subs.forEach((x) => { t[x.k] += x.v; }); });
    const cap = (k, v) => Math.min(SUBS[k].cap, v);
    return {
      crit: cap('crit', t.crit / 100), critMult: 1 + t.critdmg / 100,
      pierce: cap('pierce', t.pierce / 100), ocMult: 1 + t.oc / 100,
      haste: cap('haste', t.haste / 100), armor: cap('armor', t.armor / 100), dodge: cap('dodge', t.dodge / 100), leech: cap('leech', t.leech / 100)
    };
  }
  // A smooth "how good is this build" multiplier. 1.0 means no bonus lines at all.
  function buildFactor(c) {
    const avgShot = (3 + c.ocMult) / 4, base = (3 + CFG.OVERCHARGE_MULT) / 4;
    const off = (1 + c.crit * (c.critMult - 1)) * (avgShot / base) * (1 + c.haste) * ((1 - 0.12) / (1 - 0.12 * (1 - c.pierce)));
    const def = (1 / ((1 - c.armor) * (1 - c.dodge))) * (1 + 2.4 * c.leech);
    return Math.sqrt(off * def);
  }
  function calcPower(gear, codexB, sbn) {
    sbn = sbn || { dmg: 1, hull: 1 };
    let dmg = 0, hull = 0;
    SLOTS.forEach((s) => { const it = gear[s.id]; if (!it) return; const v = itemStat(it) * (sbn.slotMul && sbn.slotMul[s.id] || 1); if (s.stat === 'dmg') dmg += v; else hull += v; });
    const sb = setBonus(gear), mul = (1 + sb.bonus) * (1 + codexB);
    dmg = dmg * mul * sbn.dmg; hull = hull * mul * sbn.hull;
    const raw = dmg + hull / 4, cs = gearCombat(gear);
    if (sbn.armor) cs.armor = Math.min(CFG.ARMOR_MAX, cs.armor + sbn.armor);
    const bf = buildFactor(cs);
    return { dmg: Math.floor(dmg), hull: Math.floor(hull), power: Math.round(raw), raw, set: sb, codex: codexB, combat: cs, build: bf, rating: raw * bf };
  }
  function power(state) { return calcPower(state.gear, codexBonus(state), statBonus(state)); }
  // what your Power would be with this part fitted instead of what is in its slot
  function powerWith(state, it) { const g = Object.assign({}, state.gear); g[it.slot] = it; return calcPower(g, codexBonus(state), statBonus(state)); }
  // The hull on screen: tier of the fitted Hull Plating (Rusted when none is fitted).
  function hullTier(state) { const it = state.gear && state.gear.plating; return it ? Math.max(0, Math.min(SHIPS.length - 1, it.tier)) : 0; }
  function shipOf(state) { return SHIPS[hullTier(state)]; }
  function highestTier(state) { let h = -1; SLOTS.forEach((s) => { const it = state.gear[s.id]; if (it && it.tier > h) h = it.tier; }); return h; }
  const autoUnlocked = (state) => state.forge.level >= CFG.AUTO_UNLOCK_LEVEL;
  // Auto filter: with Auto on, a part is sold (never fitted) if its tier is on the sell list, or if you picked wanted bonus lines and it has lines but none of them is wanted (one match is enough).
  function filterHit(state, it) {
    const st = state.settings;
    if (st.autoTiers.includes(it.tier)) return true;
    if (st.autoSubs.length && it.subs && it.subs.length && !it.subs.some((x) => st.autoSubs.includes(x.k))) return true;
    return false;
  }
  function autoFiltered(state, it) { return !!(state.settings.auto && autoUnlocked(state) && filterHit(state, it)); }


  function addCredits(state, n) { state.credits += n; state.stats.creditsEarned += n; }
  function isUpgrade(state, it) { return powerWith(state, it).rating > power(state).rating + 1e-9; }

  function equip(state, it, keepOld) {
    const old = state.gear[it.slot];
    let sold = 0;
    if (old && !keepOld) { sold = sellFor(state, old); addCredits(state, sold); state.stats.sold++; }
    state.gear[it.slot] = it; state.stats.equipped++;
    if (it.tier > state.stats.bestTier) state.stats.bestTier = it.tier;
    return sold;
  }
  const sellFor = (state, it) => Math.max(1, Math.round(sellValue(it) * creditMult(state)));
  function sell(state, it) { const v = sellFor(state, it); addCredits(state, v); state.stats.sold++; return v; }

  function forgeCost() { return CFG.ALLOY_COST; }
  // Single forge. Returns { ok, item, auto: 'equipped'|'sold'|null, isNew, tierDone }
  function forgeOnce(state, rng) {
    const cost = forgeCost(state);
    if (state.alloy < cost) return { ok: false, reason: 'alloy' };
    if (!(state.settings.auto && autoUnlocked(state)) && !holdFree(state)) return { ok: false, reason: 'full' };
    if (!(rng() < techBonus(state, 'free'))) state.alloy -= cost;
    state.stats.forged++;
    const it = rollItem(state.forge.level, rng, state.cmd.level);
    const lv = addXp(state, it.tier);
    const d = discover(state, it);
    if (state.settings.auto && autoUnlocked(state)) {
      if (!autoFiltered(state, it) && isUpgrade(state, it)) { equip(state, it); return { ok: true, item: it, auto: 'equipped', isNew: d.isNew, tierDone: d.tierDone, levels: lv }; }
      sell(state, it); return { ok: true, item: it, auto: 'sold', isNew: d.isNew, tierDone: d.tierDone, levels: lv };
    }
    holdAdd(state, it, d.isNew);
    return { ok: true, item: it, auto: null, isNew: d.isNew, tierDone: d.tierDone, levels: lv };
  }

  // Forge many at once: keep upgrades, sell the rest. Returns a summary.
  function forgeBatch(state, n, rng) {
    const sum = { forged: 0, equipped: 0, sold: 0, credits: 0, best: null, newParts: 0, tiersDone: [], levels: 0 };
    const c0 = state.credits;
    while (sum.forged < n && state.alloy >= forgeCost(state)) {
      if (!(rng() < techBonus(state, 'free'))) state.alloy -= forgeCost(state);
      state.stats.forged++; sum.forged++;
      const it = rollItem(state.forge.level, rng, state.cmd.level);
      sum.levels += addXp(state, it.tier);
      const d = discover(state, it); if (d.isNew) sum.newParts++; if (d.tierDone) sum.tiersDone.push(it.tier);
      if (!sum.best || it.tier > sum.best.tier) sum.best = it;
      if (!autoFiltered(state, it) && isUpgrade(state, it)) { equip(state, it); sum.equipped++; } else { sell(state, it); sum.sold++; }
    }
    sum.credits = state.credits - c0;
    return sum;
  }

  // The hold bar: parts you have not decided on yet. It holds as many parts as you can forge at once. When it is full you cannot forge until you equip or sell something.
  const holdFree = (state) => Math.max(0, batchSize(state) - state.held.length);
  function holdAdd(state, it, isNew) { state.held.push({ it, isNew: !!isNew }); }

  // Forge n parts and put them all in the hold bar (used when Auto is off).
  function forgeHold(state, n, rng) {
    const sum = { forged: 0, newParts: 0, tiersDone: [], levels: 0 };
    n = Math.min(n, holdFree(state));
    while (sum.forged < n && state.alloy >= forgeCost(state)) {
      if (!(rng() < techBonus(state, 'free'))) state.alloy -= forgeCost(state);
      state.stats.forged++; sum.forged++;
      const it = rollItem(state.forge.level, rng, state.cmd.level);
      sum.levels += addXp(state, it.tier);
      const d = discover(state, it); if (d.isNew) sum.newParts++; if (d.tierDone) sum.tiersDone.push(it.tier);
      holdAdd(state, it, d.isNew);
    }
    return sum;
  }
  // One round of the multi-forge run: forge up to n parts, keep (in the hold bar) every part of the tiers you ticked that passes your line filter, sell the rest.
  // Stops by itself when the bar is full (reported as full) or you run out of Alloy (out).
  function forgeRun(state, n, rng, tiers) {
    const sum = { forged: 0, kept: 0, sold: 0, credits: 0, newParts: 0, tiersDone: [], levels: 0, full: false, out: false };
    const c0 = state.credits;
    while (sum.forged < n) {
      if (!holdFree(state)) { sum.full = true; break; }
      if (state.alloy < forgeCost(state)) { sum.out = true; break; }
      if (!(rng() < techBonus(state, 'free'))) state.alloy -= forgeCost(state);
      state.stats.forged++; sum.forged++;
      const it = rollItem(state.forge.level, rng, state.cmd.level);
      sum.levels += addXp(state, it.tier);
      const d = discover(state, it); if (d.isNew) sum.newParts++; if (d.tierDone) sum.tiersDone.push(it.tier);
      if (tiers.includes(it.tier) && !filterHit(state, it)) { holdAdd(state, it, d.isNew); sum.kept++; } else { sell(state, it); sum.sold++; }
    }
    if (!holdFree(state)) sum.full = true;
    sum.credits = state.credits - c0;
    return sum;
  }
  // Equip a held part: the part it replaces goes into the hold bar, so you can swap back until you sell it.
  function equipHeld(state, idx) {
    const h = state.held[idx]; if (!h) return null;
    state.held.splice(idx, 1);
    const old = state.gear[h.it.slot];
    equip(state, h.it, true);
    if (old) state.held.push({ it: old, isNew: false });
    return { item: h.it, old, index: old ? state.held.length - 1 : -1 };
  }
  function sellHeld(state, idx) { const h = state.held[idx]; if (!h) return 0; state.held.splice(idx, 1); return sell(state, h.it); }


  /* ===================== COMBAT ===================== */
  const SECTORS = [
    { name: 'Scrapfield',        boss: 'The Rust King' },
    { name: 'Dust Belt',         boss: 'Dustmaw' },
    { name: 'Ember Reach',       boss: 'Cinder Warden' },
    { name: 'Shatter Moons',     boss: 'Moonbreaker' },
    { name: 'Ion Veil',          boss: 'Veilshade' },
    { name: 'Dead Orbit',        boss: 'The Hollow Admiral' },
    { name: 'Black Halo',        boss: 'Eclipse Tyrant' },
    { name: 'Graveyard of Suns', boss: 'The Gravekeeper' },
    { name: 'Apex Gate',         boss: 'Apex Sentinel' },
    { name: 'Iron Maw',          boss: 'Ironmaw Prime' },
    { name: 'Pale Corridor',     boss: 'The Pale Warden' },
    { name: 'Blood Nebula',      boss: 'Nebula Butcher' },
    { name: 'Kessler Ring',      boss: 'Ringbreaker' },
    { name: 'Cold Harbor',       boss: 'Coldfire Colossus' },
    { name: 'Siren Deep',        boss: 'The Siren Queen' },
    { name: 'Warlord Expanse',   boss: 'The Warlord' },
    { name: 'Ash Meridian',      boss: 'The Ashen Regent' },
    { name: 'Last Lighthouse',   boss: 'The Lighthouse Keeper' },
    { name: 'Null Throne',       boss: 'The Null Emperor' },
    { name: 'Origin Fracture',   boss: 'The First Signal' }
  ];
  const FOES = {
    drone:   { name: 'Drone',   speed: 135, dm: 0.75, hm: 0.65, armor: 0,   crit: 0 },
    gunship: { name: 'Gunship', speed: 100, dm: 1,    hm: 1,    armor: 0,   crit: 0 },
    raider:  { name: 'Raider',  speed: 112, dm: 0.9,  hm: 0.72,  armor: 0,   crit: 0.2 },
    bulwark: { name: 'Bulwark', speed: 78,  dm: 0.9,  hm: 0.9,  armor: 0.3, crit: 0 }
  };
  const PATTERN = ['drone', 'gunship', 'raider', 'bulwark', 'gunship', 'drone', 'bulwark', 'raider', 'gunship'];
  const sectorOf = (stage) => Math.floor((stage - 1) / 10);
  const isBoss = (stage) => stage % 10 === 0;
  const stageLabel = (n) => (Math.floor((n - 1) / 10) + 1) + '-' + (((n - 1) % 10) + 1);
  const FIGHT_LEN = 1.6;   // stretches fights: enemies hit softer but have more hull, so a fight lasts several exchanges at the same win odds
  const ATK_SHARE = 0.55 / FIGHT_LEN, HULL_SHARE = 2.65 * FIGHT_LEN, BOSS_HM = 1.5;

  function enemyFor(stage, scale) {
    const pe = CFG.ENEMY_POWER(stage) * (scale || 1), sec = SECTORS[Math.min(SECTORS.length - 1, sectorOf(stage))];
    if (isBoss(stage)) return { stage, boss: true, type: 'boss', name: sec.boss, pe, dmg: Math.max(1, Math.round(pe * ATK_SHARE)), hull: Math.max(5, Math.round(pe * HULL_SHARE)), speed: 100, armor: 0, crit: 0 };   // a boss is simply the next step up the curve
    const key = PATTERN[(stage % 10) - 1], f = FOES[key], nf = Math.sqrt(f.dm * f.hm / (1 - f.armor));   // nf: the type only reshapes the enemy (glass cannon vs tank); its total strength follows the curve, so every stage is harder than the one before
    return { stage, boss: false, type: key, name: sec.name + ' ' + f.name, pe, dmg: Math.max(1, Math.round(pe * ATK_SHARE * f.dm / nf)), hull: Math.max(5, Math.round(pe * HULL_SHARE * f.hm / nf)), speed: f.speed, armor: f.armor, crit: f.crit };
  }
  /* ===================== DRONES ===================== */
  // One active drone fights beside your ship; you can own as many as you like. Rarity N..UR is fixed. A copy fused into a drone gives it a star (0-10).
  // Every drone has 3 abilities that unlock and grow with stars. Each drone also gives all stats while it is the active one, and every drone belongs to one Link.
  const D_RAR = ['N', 'R', 'SR', 'SSR', 'UR'];
  const D_COLOR = ['#9aa5b5', '#4aa3ff', '#b27cff', '#ffb02e', '#ff5ec4'];
  const D_BASE = [6, 8, 10, 13, 16], D_GAIN = [0.4, 0.5, 0.7, 0.9, 1.2], D_POW = [1, 1.1, 1.22, 1.45, 1.8];
  const D_UNLOCK = [0, 3, 6];                                   // star that unlocks ability 1, 2, 3
  const D_UPS = [[1, 4, 10], [5, 7, 10], [8, 10]];              // stars that upgrade ability 1, 2, 3
  // fx: [type, amount, rounds-or-count, options]. See the engine in simulateFight.
  const LINKS = [
    { id: 1, name: 'Gun Line',      stat: 'attack',  ids: ['hornet', 'longbow', 'lancer', 'nova'] },
    { id: 2, name: 'Field Hospital', stat: 'hull',   ids: ['mender', 'patch', 'tinker', 'aurora'] },
    { id: 3, name: 'Bulwark',       stat: 'defense', ids: ['aegis', 'buckler', 'warden', 'bastion', 'leviathan'] },
    { id: 4, name: 'Burn Crew',     stat: 'attack',  ids: ['flare', 'torch', 'inferno', 'phoenix'] },
    { id: 5, name: 'Storm Cell',    stat: 'hull',    ids: ['sparker', 'static', 'arc', 'tempest'] },
    { id: 6, name: 'Shadow Ops',    stat: 'defense', ids: ['tick', 'hex', 'phantom', 'oblivion'] },
    { id: 7, name: 'Siege Battery', stat: 'hull',    ids: ['scrapper', 'mortar', 'salvo', 'titan'] },
    { id: 8, name: 'Command',       stat: 'defense', ids: ['relay', 'surge', 'overlord', 'eclipse'] },
    { id: 9, name: 'Hunter Pack',   stat: 'attack',  ids: ['rivet', 'siphon', 'nullifier', 'reaper'] }
  ];
  const DRONES = [
    ['hornet', 'Hornet', 0, 'Gunner', [['Sting', 3, [['hit', 45]]], ['Swarm', 4, [['hit', 24, 0, { x: 3 }]]], ['Venom', 5, [['hit', 40], ['weaken', 15, 2]]]]],
    ['rivet', 'Rivet', 0, 'Gunner', [['Rivet Burst', 3, [['hit', 26, 0, { x: 2 }]]], ['Overheat', 5, [['hit', 95]]], ['Ricochet', 6, [['hit', 90], ['hit', 45]]]]],
    ['mender', 'Mender', 0, 'Medic', [['Patch Up', 3, [['heal', 8]]], ['Welding Beam', 4, [['regen', 3, 3]]], ['Emergency Fix', 6, [['heal', 10, 0, { low: [0.5, 2] }]]]]],
    ['patch', 'Patch', 0, 'Medic', [['Quick Fix', 2, [['heal', 4]]], ['Hull Tape', 5, [['shield', 10]]], ['Spare Parts', 6, [['heal', 4], ['armor', 8, 2]]]]],
    ['aegis', 'Aegis', 0, 'Shield', [['Barrier', 3, [['shield', 10]]], ['Reflect Plate', 5, [['shield', 8], ['reflect', 20, 2]]], ['Fortify', 6, [['shield', 20]]]]],
    ['buckler', 'Buckler', 0, 'Shield', [['Block', 3, [['dodge', 1]]], ['Dent Guard', 5, [['guard', 20, 2]]], ['Counter Plate', 6, [['dodge', 1], ['hit', 60]]]]],
    ['flare', 'Flare', 0, 'Decoy', [['Flare Burst', 4, [['blind', 50, 1]]], ['Smoke', 5, [['blind', 30, 2]]], ['Dazzle', 7, [['stun', 100, 1]]]]],
    ['sparker', 'Sparker', 0, 'Pulse', [['Zap', 3, [['hit', 42]]], ['Static Cling', 5, [['hit', 30], ['slow', 25, 2]]], ['Overload', 6, [['hit', 50, 0, { x: 2 }]]]]],
    ['tick', 'Tick', 0, 'Mine-layer', [['Drop Mine', 3, [['mine', 55, 1]]], ['Sticky Mine', 5, [['mine', 45, 1], ['slow', 25, 2]]], ['Minefield', 6, [['mine', 50, 2]]]]],
    ['scrapper', 'Scrapper', 0, 'Gunner', [['Ram', 3, [['hit', 45]]], ['Pile Driver', 5, [['hit', 95]]], ['Scrap Armor', 6, [['hit', 50], ['armor', 8, 3]]]]],
    ['longbow', 'Longbow', 1, 'Sniper', [['Long Shot', 4, [['hit', 75, 0, { pierce: 1 }]]], ['Steady Aim', 5, [['crit', 30, 2]]], ['Headshot', 6, [['hit', 80, 0, { low: [0.5, 2.2] }]]]]],
    ['tinker', 'Tinker', 1, 'Mechanic', [['Tune-Up', 4, [['amp', 25, 2]]], ['Field Repair', 4, [['heal', 7]]], ['Overclock', 6, [['amp', 30, 2], ['heal', 7]]]]],
    ['warden', 'Warden', 1, 'Anchor', [['Guard Stance', 4, [['guard', 25, 2]]], ['Taunt', 5, [['weaken', 20, 3]]], ['Iron Wall', 7, [['shield', 12], ['guard', 25, 2]]]]],
    ['torch', 'Torch', 1, 'Burner', [['Ignite', 3, [['burn', 12, 3]]], ['Hot Streak', 5, [['burn', 20, 3]]], ['Flashpoint', 6, [['expose', 20, 3], ['burn', 10, 3]]]]],
    ['static', 'Static', 1, 'Jammer', [['Jam', 4, [['slow', 30, 2]]], ['Feedback', 5, [['slow', 20, 2], ['hit', 55]]], ['Blackout', 7, [['stun', 100, 1]]]]],
    ['hex', 'Hex', 1, 'Saboteur', [['Hex', 4, [['weaken', 22, 3]]], ['Corrode', 5, [['break', 40, 3]]], ['Curse', 7, [['weaken', 22, 4], ['break', 30, 4]]]]],
    ['mortar', 'Mortar', 1, 'Bomber', [['Shell', 4, [['hit', 80]]], ['Cluster', 5, [['hit', 30, 0, { x: 3 }]]], ['Bunker Buster', 6, [['hit', 90, 0, { pierce: 1 }]]]]],
    ['relay', 'Relay', 1, 'Amp', [['Boost Signal', 4, [['amp', 25, 2]]], ['Crit Beacon', 5, [['crit', 25, 3]]], ['Command Link', 7, [['amp', 20, 3], ['crit', 15, 3]]]]],
    ['siphon', 'Siphon', 1, 'Leech', [['Drain', 4, [['hit', 50, 0, { drain: 0.5 }]]], ['Leech Field', 5, [['leech', 12, 3]]], ['Overdrain', 7, [['hit', 90, 0, { drain: 0.6 }]]]]],
    ['lancer', 'Lancer', 2, 'Sniper', [['Piercing Lance', 4, [['hit', 70, 0, { pierce: 1 }]]], ['Overpenetrate', 5, [['hit', 60, 0, { pierce: 1 }], ['hit', 30, 0, { pierce: 1 }]]], ['Marked Kill', 6, [['expose', 25, 3]]]]],
    ['bastion', 'Bastion', 2, 'Shield', [['Bastion Field', 4, [['shield', 22]]], ['Hardened', 5, [['shield', 12], ['armor', 10, 3]]], ['Last Stand', 6, [['shield', 18, 0, { low: [0.4, 2] }]]]]],
    ['inferno', 'Inferno', 2, 'Burner', [['Firestorm', 4, [['burn', 18, 4]]], ['Fuel', 5, [['burn', 12, 3], ['leech', 15, 3]]], ['Meltdown', 7, [['hit', 120], ['burn', 15, 3]]]]],
    ['arc', 'Arc', 2, 'Pulse', [['Arc Bolt', 4, [['hit', 32, 0, { x: 3 }]]], ['Conduct', 5, [['hit', 35, 0, { x: 3 }], ['slow', 15, 1]]], ['Chain Lightning', 7, [['hit', 30, 0, { x: 5 }]]]]],
    ['phantom', 'Phantom', 2, 'Decoy', [['Ghost Step', 4, [['dodge', 1]]], ['Afterimage', 5, [['dodge', 1], ['hit', 60]]], ['Vanish', 7, [['dodge', 2]]]]],
    ['salvo', 'Salvo', 2, 'Bomber', [['Missile Volley', 4, [['hit', 24, 0, { x: 3 }]]], ['Homing', 5, [['hit', 26, 0, { x: 3 }], ['crit', 25, 1]]], ['Full Salvo', 7, [['hit', 20, 0, { x: 6 }]]]]],
    ['surge', 'Surge', 2, 'Amp', [['Surge', 4, [['amp', 45, 1]]], ['Overcharge', 5, [['amp', 35, 2], ['crit', 15, 2]]], ['Power Spike', 7, [['amp', 45, 2]]]]],
    ['nullifier', 'Nullifier', 2, 'Jammer', [['Null Pulse', 4, [['stun', 35, 1]]], ['Suppress', 5, [['weaken', 25, 3]]], ['Lockdown', 7, [['stun', 100, 1]]]]],
    ['reaper', 'Reaper', 3, 'Executioner', [['Cull', 4, [['hit', 70, 0, { grow: 1 }]]], ['Harvest', 5, [['hit', 40], ['leech', 30, 2]]], ['Final Verdict', 7, [['hit', 90, 0, { low: [0.2, 4] }]]]]],
    ['aurora', 'Aurora', 3, 'Medic', [['Aurora Mend', 4, [['heal', 18]]], ['Regen Veil', 5, [['regen', 6, 3]]], ['Second Dawn', 0, [['revive', 30]]]]],
    ['tempest', 'Tempest', 3, 'Pulse', [['Storm Surge', 4, [['hit', 85]]], ['Thunderhead', 5, [['hit', 40], ['stun', 30, 1]]], ['Tempest Fury', 7, [['hit', 30, 0, { x: 5, rise: 1 }]]]]],
    ['eclipse', 'Eclipse', 3, 'Saboteur', [['Eclipse', 4, [['weaken', 25, 3], ['blind', 25, 3]]], ['Dark Pull', 5, [['weaken', 20, 3], ['amp', 20, 3]]], ['Total Eclipse', 7, [['stun', 100, 1], ['weaken', 25, 3]]]]],
    ['titan', 'Titan', 3, 'Anchor', [['Titan Slam', 4, [['hit', 80], ['stun', 25, 1]]], ['Armor Plating', 5, [['guard', 25, 3]]], ['Colossus', 7, [['hit', 55, 0, { x: 2 }], ['shield', 14]]]]],
    ['overlord', 'Overlord', 3, 'Overseer', [['Decree', 4, [['amp', 22, 3], ['armor', 8, 3]]], ['Mandate', 5, [['guard', 20, 3], ['amp', 15, 3]]], ['Supreme Order', 7, [['hit', 80], ['amp', 25, 3]]]]],
    ['phoenix', 'Phoenix', 4, 'Rebirth', [['Ember Strike', 3, [['hit', 50], ['burn', 12, 2]]], ['Rekindle', 5, [['burn', 15, 3], ['regen', 3, 3]]], ['Rebirth', 0, [['revive', 40]]]]],
    ['nova', 'Nova', 4, 'Striker', [['Nova Burst', 4, [['hit', 110]]], ['Supernova', 5, [['hit', 60], ['burn', 15, 3]]], ['Collapse', 7, [['hit', 120, 0, { pierce: 1 }], ['stun', 100, 1]]]]],
    ['leviathan', 'Leviathan', 4, 'Guardian', [['Deep Shield', 4, [['shield', 28]]], ['Tidal Repair', 5, [['heal', 12], ['shield', 12]]], ['Abyss Guard', 7, [['dodge', 2], ['shield', 20]]]]],
    ['oblivion', 'Oblivion', 4, 'Voidbreaker', [['Void Rend', 4, [['hit', 85, 0, { pierce: 1, grow: 1 }]]], ['Erase', 5, [['weaken', 30, 4]]], ['Oblivion', 7, [['hit', 110, 0, { low: [0.15, 3] }]]]]]
  ].map((d) => ({ id: d[0], name: d[1], rar: d[2], role: d[3], abil: d[4].map((a) => ({ name: a[0], cd: a[1], fx: a[2] })) }));
  const DRONE_BY = {}; DRONES.forEach((d) => { DRONE_BY[d.id] = d; });
  const LINK_OF = {}; LINKS.forEach((L) => L.ids.forEach((id) => { LINK_OF[id] = L; }));
  // old Wing species -> drone id (for saves from before drones)
  const OLD_WING = ['hornet', 'longbow', 'mender', 'aegis', 'static', 'surge'];

  const droneRec = (state, id) => state.drones.own[id] || null;
  const droneStat = (d, lvl) => D_BASE[d.rar] + D_GAIN[d.rar] * (lvl - 1);                // % to all stats at this level
  const levelCost = (lvl) => Math.round(CFG.DRONE_COST0 * Math.pow(CFG.DRONE_COST_G, lvl - 1));   // Nanites to go from lvl to lvl+1
  // ability levels for a star count: 0 = still locked
  function abilityLevels(stars) { return [0, 1, 2].map((i) => stars < D_UNLOCK[i] ? 0 : 1 + D_UPS[i].filter((u) => stars >= u).length); }
  const abilityScale = (lvl) => 1 + 0.22 * (lvl - 1);
  const HIT_TYPES = ['hit', 'burn', 'mine'], SUPPORT_TYPES = ['heal', 'shield', 'regen', 'guard', 'armor', 'reflect', 'leech'];
  const POWER_TYPES = ['hit', 'burn', 'mine', 'heal', 'shield', 'regen'];
  // the abilities a drone has right now, with every number worked out (this is what combat uses)
  function droneAbilities(state, id) {
    const d = DRONE_BY[id], rec = droneRec(state, id); if (!d || !rec) return [];
    const lv = abilityLevels(rec.s), out = [];
    const woff = 1 + techBonus(state, 'woff'), wsup = 1 + techBonus(state, 'wsup');
    d.abil.forEach((a, i) => {
      if (!lv[i]) return;
      const s = abilityScale(lv[i]) * D_POW[d.rar];
      out.push({ name: a.name, cd: a.cd, level: lv[i], fx: a.fx.map((f) => {
        let v = f[1];
        if (f[0] !== 'dodge') v = v * s * (POWER_TYPES.includes(f[0]) ? CFG.DRONE_POWER : 1) * (HIT_TYPES.includes(f[0]) ? woff : SUPPORT_TYPES.includes(f[0]) ? wsup : 1);
        return { t: f[0], a: v, b: f[2] || 0, o: f[3] || {} };
      }) });
    });
    return out;
  }
  // plain-words line for one effect (numbers already worked out)
  function describeFx(f) {
    const n = (x) => Math.round(x * 10) / 10, o = f.o || {}, x = o.x ? ' ×' + o.x : '';
    switch (f.t) {
      case 'hit': return 'Hit ' + n(f.a) + '%' + x + (o.pierce ? ', ignores armor' : '') + (o.grow ? ', more as the enemy weakens' : '') + (o.low ? ', ×' + o.low[1] + ' under ' + Math.round(o.low[0] * 100) + '% hull' : '') + (o.drain ? ', heals you' : '') + (o.rise ? ', rising' : '');
      case 'heal': return 'Repair ' + n(f.a) + '% hull' + (o.low ? ', ×' + o.low[1] + ' below ' + Math.round(o.low[0] * 100) + '% hull' : '');
      case 'shield': return 'Shield ' + n(f.a) + '% hull' + (o.low ? ', ×' + o.low[1] + ' below ' + Math.round(o.low[0] * 100) + '% hull' : '');
      case 'regen': return 'Repair ' + n(f.a) + '% hull a round for ' + f.b;
      case 'guard': return 'Take ' + n(Math.min(70, f.a)) + '% less for ' + f.b + ' rounds';
      case 'weaken': return 'Enemy hits ' + n(Math.min(60, f.a)) + '% weaker for ' + f.b;
      case 'expose': return 'Enemy takes ' + n(f.a) + '% more for ' + f.b;
      case 'break': return 'Enemy armor −' + n(Math.min(90, f.a)) + '% for ' + f.b;
      case 'stun': return (f.a >= 99.5 ? 'Stun' : n(Math.min(100, f.a)) + '% to stun') + ' ' + f.b + (f.b > 1 ? ' turns' : ' turn');
      case 'slow': return 'Slow enemy ' + n(Math.min(90, f.a)) + '% for ' + f.b;
      case 'burn': return 'Burn ' + n(f.a) + '% a round for ' + f.b;
      case 'amp': return 'Your damage +' + n(f.a) + '% for ' + f.b + (f.b > 1 ? ' shots' : ' shot');
      case 'crit': return 'Crit chance +' + n(f.a) + '% for ' + f.b;
      case 'dodge': return 'Dodge the next ' + (f.a > 1 ? f.a + ' hits' : 'hit');
      case 'blind': return 'Enemy misses ' + n(Math.min(90, f.a)) + '% for ' + f.b;
      case 'mine': return 'Mine: ' + n(f.a) + '% when it attacks' + (f.b > 1 ? ' ×' + f.b : '');
      case 'reflect': return 'Reflect ' + n(f.a) + '% for ' + f.b;
      case 'leech': return 'Heal ' + n(f.a) + '% of your damage for ' + f.b;
      case 'armor': return 'Armor +' + n(f.a) + '% for ' + f.b;
      case 'revive': return 'Once per fight, come back at ' + n(Math.min(90, f.a)) + '% hull';
    }
    return '';
  }
  const describeAbility = (a) => a.fx.map(describeFx).join(' · ') + (a.cd ? ' · every ' + a.cd + ' rounds' : '');

  // ---- Links: owning every drone of a set gives a small permanent bonus; total stars across the set raise it
  function linkInfo(state, L) {
    const own = L.ids.filter((id) => droneRec(state, id)), stars = own.reduce((s, id) => s + droneRec(state, id).s, 0), n = L.ids.length;
    const all = own.length === n, steps = all ? Math.min(2 * n, Math.floor(stars / CFG.LINK_STAR_STEP)) : 0;
    const bonus = all ? CFG.LINK_BASE * n + CFG.LINK_STEP * n * steps : 0;
    return { link: L, owned: own.length, size: n, stars, all, steps, maxSteps: 2 * n, bonus, next: all && steps < 2 * n ? (steps + 1) * CFG.LINK_STAR_STEP : 0, max: CFG.LINK_BASE * n + CFG.LINK_STEP * n * 2 * n };
  }
  // all stat bonuses from drones, as fractions: { dmg, hull, armor }
  function droneBonus(state) {
    const out = { dmg: 0, hull: 0, armor: 0 }, add = (stat, pct) => {
      if (stat === 'attack') out.dmg += pct / 100; else if (stat === 'hull') out.hull += pct / 100; else out.armor += pct / 100 * CFG.ARMOR_PER_DEF;
    };
    if (!state.drones) return out;
    const a = state.drones.active, rec = a && droneRec(state, a);
    if (rec) { const p = droneStat(DRONE_BY[a], rec.l); out.dmg += p / 100; out.hull += p / 100; out.armor += p / 100 * CFG.ARMOR_PER_DEF; }
    LINKS.forEach((L) => { const i = linkInfo(state, L); if (i.bonus) add(L.stat, i.bonus); });
    return out;
  }
  // ---- Summoning: 3 drones at a time. Rarity is rolled for each, then a drone of that rarity.
  const summonCost = (state) => Math.ceil(CFG.SUMMON_COST * (1 - techBonus(state, 'summon')));
  const freeSummonsLeft = (state, now) => { rollDaily(state, now); return CFG.FREE_SUMMONS - (state.daily.dsum || 0); };
  function giveDrone(state, id, n) {
    const r = state.drones.own[id];
    if (!r) { state.drones.own[id] = { s: 0, c: n - 1, l: 1, p: 0 }; if (!state.drones.active) state.drones.active = id; return true; }
    r.c += n; return false;
  }
  function summonRoll(state, rng) {
    const got = [];
    for (let i = 0; i < CFG.SUMMON_COUNT; i++) {
      let r = rng() * CFG.DRONE_ODDS.reduce((a, b) => a + b, 0), rar = 0;
      for (let k = 0; k < CFG.DRONE_ODDS.length; k++) { r -= CFG.DRONE_ODDS[k]; if (r <= 0) { rar = k; break; } rar = k; }
      const pool = DRONES.filter((d) => d.rar === rar), d = pool[Math.floor(rng() * pool.length) % pool.length];
      const copies = rng() < techBonus(state, 'wtwin') ? 2 : 1;
      got.push({ id: d.id, rar, isNew: giveDrone(state, d.id, copies), copies });
    }
    state.drones.summons++; state.stats.summoned = (state.stats.summoned || 0) + got.length;
    return got;
  }
  function summon(state, rng) {
    const cost = summonCost(state);
    if (state.cores < cost) return { ok: false, reason: 'cores' };
    state.cores -= cost; return { ok: true, got: summonRoll(state, rng) };
  }
  // one of the daily free summons (the screen shows the ad first)
  function summonFree(state, rng, now) {
    if (freeSummonsLeft(state, now) <= 0) return { ok: false, reason: 'limit' };
    state.daily.dsum = (state.daily.dsum || 0) + 1; return { ok: true, got: summonRoll(state, rng) };
  }
  const canFuse = (state, id) => { const r = droneRec(state, id); return !!r && r.c >= 1 && r.s < CFG.STAR_MAX; };
  function fuse(state, id) { if (!canFuse(state, id)) return false; const r = droneRec(state, id); r.c--; r.s++; state.stats.fused = (state.stats.fused || 0) + 1; return true; }
  function fuseAll(state) { let n = 0; DRONES.forEach((d) => { while (canFuse(state, d.id)) { fuse(state, d.id); n++; } }); return n; }
  function setActive(state, id) { if (!droneRec(state, id)) return false; state.drones.active = id; return true; }
  // ---- Levels (Nanites) and reset (Flux)
  function levelUp(state, id, count) {
    const r = droneRec(state, id); if (!r) return 0; let done = 0;
    while (done < (count || 1) && r.l < CFG.DRONE_LEVEL_MAX) { const c = levelCost(r.l); if (state.nanites < c) break; state.nanites -= c; r.p += c; r.l++; done++; }
    return done;
  }
  function resetDrone(state, id) {
    const r = droneRec(state, id); if (!r || r.l <= 1 || state.flux < CFG.DRONE_RESET_FLUX) return false;
    state.flux -= CFG.DRONE_RESET_FLUX; state.nanites += r.p; r.p = 0; r.l = 1; return true;
  }

  /* ===================== FIGHTING ===================== */
  function fighter(state) {
    const p = power(state), c = p.combat, a = state.drones && state.drones.active;
    let drone = null;
    if (a && droneRec(state, a)) {
      const ab = droneAbilities(state, a), rv = ab.find((x) => x.cd === 0 && x.fx[0].t === 'revive');
      drone = { id: a, name: DRONE_BY[a].name, abilities: ab.filter((x) => x.cd > 0), revive: rv ? Math.min(0.9, rv.fx[0].a / 100) : 0 };
    }
    return {
      dmg: Math.max(1, p.dmg), hull: Math.max(1, p.hull), speed: 100 * (1 + c.haste),
      crit: c.crit, critMult: c.critMult, ocMult: c.ocMult, armor: c.armor, dodge: c.dodge, leech: c.leech, pierce: c.pierce, drone
    };
  }

  // Plays a whole fight instantly and returns every turn so the screen can replay it.
  // A "round" is one shot from your ship. Your drone's abilities fire at the end of the rounds their timer says.
  function simulateFight(p, e, rng) {
    p = Object.assign({ speed: 100, crit: CFG.CRIT_CHANCE, critMult: CFG.CRIT_MULT, ocMult: CFG.OVERCHARGE_MULT, armor: 0, dodge: 0, leech: 0, pierce: 0, drone: null }, p);
    const events = [], pmax = p.hull, dr = p.drone;
    let php = p.hull, ehp = e.hull, shield = 0, np = 0, ne = 0, stun = 0, dodgeN = 0, mines = [], revived = false;
    const B = { amp: [], crit: [], guard: [], weaken: [], expose: [], brk: [], slow: [], burn: [], reflect: [], leech: [], regen: [], armor: [], blind: [] };
    const sum = (k) => B[k].reduce((s, x) => s + x.v, 0);
    const actors = [{ id: 'p', t: 100 / p.speed, period: 100 / p.speed, order: 0 }, { id: 'e', t: 100 / e.speed, period: 100 / e.speed, order: 99 }];
    const push = (o) => { o.php = php; o.ehp = ehp; o.shield = Math.round(shield); events.push(o); };
    const dmgTo = (base, ign) => {
      const ar = e.armor * (1 - Math.min(0.9, sum('brk') / 100)) * (1 - (ign ? 1 : p.pierce));
      return Math.max(1, Math.round(base * (0.8 + rng() * 0.4) * (1 - ar) * (1 + sum('expose') / 100)));
    };
    const tick = () => { Object.keys(B).forEach((k) => { B[k].forEach((x) => { x.left--; }); B[k] = B[k].filter((x) => x.left > 0); }); };
    // one ability: returns what to show
    function fire(ab) {
      const ev = { who: 'c', name: dr.name, kind: dr.id, ab: ab.name, dmg: 0, heal: undefined, shieldGain: 0, notes: [] };
      ab.fx.forEach((f) => {
        const o = f.o || {};
        if (f.t === 'hit') {
          const n = o.x || 1;
          for (let i = 0; i < n; i++) {
            let m = f.a / 100 * (o.rise ? 0.5 + 0.25 * i : 1);
            if (o.grow) m *= 1 + (1 - ehp / e.hull);
            if (o.low && ehp / e.hull < o.low[0]) m *= o.low[1];
            const d = dmgTo(p.dmg * m, o.pierce); ehp = Math.max(0, ehp - d); ev.dmg += d;
            if (o.drain) { const h = Math.round(d * o.drain); php = Math.min(pmax, php + h); ev.heal = (ev.heal || 0) + h; }
          }
        } else if (f.t === 'heal') {
          let h = pmax * f.a / 100; if (o.low && php / pmax < o.low[0]) h *= o.low[1];
          const before = php; php = Math.min(pmax, php + Math.round(h)); ev.heal = (ev.heal || 0) + (php - before);
        } else if (f.t === 'shield') {
          let s = pmax * f.a / 100; if (o.low && php / pmax < o.low[0]) s *= o.low[1];
          const before = shield; shield = Math.min(pmax * 0.6, shield + Math.round(s)); ev.shieldGain += Math.round(shield - before);
        } else if (f.t === 'dodge') { dodgeN += Math.round(f.a); ev.notes.push('DODGE'); }
        else if (f.t === 'stun') { if (rng() * 100 < f.a) { stun += f.b; ev.notes.push('STUN'); } }
        else if (f.t === 'mine') { for (let i = 0; i < Math.max(1, f.b); i++) mines.push(p.dmg * f.a / 100); ev.notes.push('MINE'); }
        else if (f.t === 'burn') { B.burn.push({ v: f.a, left: f.b }); ev.notes.push('BURN'); }
        else if (f.t === 'revive') { /* passive, handled when the hull hits 0 */ }
        else {
          const key = f.t === 'break' ? 'brk' : f.t;
          if (B[key]) { B[key].push({ v: f.t === 'amp' ? f.a / 100 : f.a, left: f.t === 'amp' ? f.b + 0 : f.b }); ev.notes.push(({ amp: 'AMP', crit: 'CRIT+', guard: 'GUARD', weaken: 'WEAK', expose: 'MARK', brk: 'BREAK', slow: 'SLOW', reflect: 'REFLECT', leech: 'LEECH', regen: 'REGEN', armor: 'ARMOR', blind: 'BLIND' })[key] || ''); }
        }
      });
      if (ev.notes.length) ev.note = ev.notes[0];
      if (ev.heal === undefined && !ev.dmg && !ev.shieldGain && !ev.note) ev.note = ab.name;
      push(ev);
    }
    let guard = 0;
    while (php > 0 && ehp > 0 && guard++ < 900) {
      let a = actors[0];
      for (const x of actors) if (x.t < a.t - 1e-9 || (Math.abs(x.t - a.t) <= 1e-9 && x.order < a.order)) a = x;
      if (a.id === 'p') {
        np++; let m = 1 + sum('amp'), label = null;
        if (np % CFG.OVERCHARGE_EVERY === 0) { m *= p.ocMult; label = 'overcharge'; }
        const crit = rng() < Math.min(0.95, p.crit + sum('crit') / 100); if (crit) m *= p.critMult;
        const d = dmgTo(p.dmg * m); ehp = Math.max(0, ehp - d);
        const lk = p.leech + sum('leech') / 100, heal = Math.round(d * lk); if (heal) php = Math.min(pmax, php + heal);
        push({ who: 'p', dmg: d, crit, label, heal }); a.t += a.period;
        // end of the round: effects count down, burns and repairs tick, then the drone's abilities whose timer is up
        tick0: {
          const bd = B.burn.reduce((s, x) => s + x.v, 0); let bdone = 0;
          if (bd > 0 && ehp > 0) { bdone = Math.max(1, Math.round(p.dmg * bd / 100)); ehp = Math.max(0, ehp - bdone); }
          const rg = sum('regen'); if (rg > 0) php = Math.min(pmax, php + Math.round(pmax * rg / 100));
          if (bdone || rg > 0) push({ who: 'c', name: dr ? dr.name : '', kind: dr ? dr.id : '', dmg: bdone, heal: rg > 0 ? Math.round(pmax * rg / 100) : undefined, note: bdone ? 'BURN' : '' });
        }
        tick();
        if (dr && ehp > 0) dr.abilities.forEach((ab) => { if (ehp > 0 && np % ab.cd === 0) fire(ab); });
      } else {
        ne++; let m = 1, label = null;
        if (stun > 0) { stun--; push({ who: 'e', dmg: 0, stunned: true }); a.t += a.period; continue; }
        if (e.boss && ne % 3 === 0) { m = 2; label = 'salvo'; }
        const crit = e.crit > 0 && rng() < e.crit; if (crit) m *= CFG.ENEMY_CRIT_MULT;
        let d = Math.max(1, Math.round(e.dmg * m * (0.8 + rng() * 0.4) * (1 - Math.min(0.6, sum('weaken') / 100)))), dodged = false;
        if (dodgeN > 0) { dodgeN--; d = 0; dodged = true; }
        else if (rng() < p.dodge || rng() * 100 < Math.min(90, sum('blind'))) { d = 0; dodged = true; }
        else { const ar = Math.min(0.8, p.armor + sum('armor') / 100); d = Math.max(1, Math.round(d * (1 - ar) * (1 - Math.min(0.7, sum('guard') / 100)))); }
        let absorbed = 0; if (shield > 0 && d > 0) { absorbed = Math.min(shield, d); shield -= absorbed; d -= absorbed; }
        php = Math.max(0, php - d);
        if (d > 0 && sum('reflect') > 0) ehp = Math.max(0, ehp - Math.round(d * sum('reflect') / 100));
        if (mines.length) { const md = Math.round(mines.reduce((s, x) => s + x, 0)); mines = []; ehp = Math.max(0, ehp - md); }
        if (php <= 0 && dr && dr.revive > 0 && !revived) { revived = true; php = Math.max(1, Math.round(pmax * dr.revive)); shield = 0; push({ who: 'e', dmg: d, crit, label, dodged, absorbed }); push({ who: 'c', name: dr.name, kind: dr.id, heal: php, note: 'REVIVE' }); a.t += a.period * (1 + sum('slow') / 100 > 1 ? 1 + Math.min(0.9, sum('slow') / 100) : 1); continue; }
        push({ who: 'e', dmg: d, crit, label, dodged, absorbed });
        a.t += a.period * (1 + Math.min(0.9, sum('slow') / 100));
      }
    }
    return { win: ehp <= 0 && php > 0, events, pmax, emax: e.hull };
  }
  // Chance to win, found by playing many fights. This is what the Outlook uses.
  function winChance(state, stage, n, rng, scale) {
    n = n || 60; const e = enemyFor(stage, scale), p = fighter(state); let w = 0;
    for (let i = 0; i < n; i++) if (simulateFight(p, e, rng).win) w++;
    return w / n;
  }

  const creditsWin = () => 1;   // every kill pays exactly 1 Credit: any stage, any enemy, any bonus
  const shardsFor = (stage) => isBoss(stage) ? CFG.SHARD_BOSS(stage / 10) : (stage % 10 === 5 ? CFG.SHARD_FIFTH : 0);
  function describeRewards(state, stage) {
    const first = stage > state.combat.best;
    const cr = creditsWin(stage, state) * (first ? CFG.FIRST_CLEAR_X : 1);
    let flux = 0, cores = 0, shards = first ? shardsFor(stage) : 0;   // fights never give AI Cores
    if (first && isBoss(stage)) flux = CFG.FLUX_BOSS + (stage === CFG.MAX_STAGE ? CFG.FLUX_SECTOR : 0);
    return { first, credits: cr, flux, cores, shards };
  }
  // applies a finished fight to the save; returns what happened
  function resolveFight(state, stage, win, rng) {
    rng = rng || Math.random;
    const c = state.combat, rep = { win, stage, credits: 0, flux: 0, cores: 0, shards: 0, first: false, unlockedStage: 0 };
    if (!win) { state.stats.losses++; if (c.push && c.stage === stage && c.stage > 1) c.stage = Math.max(1, stage - 1); return rep; }
    const r = describeRewards(state, stage);
    addCredits(state, r.credits); state.flux += r.flux; state.shards += r.shards; rep.credits = r.credits; rep.flux = r.flux; rep.shards = r.shards; rep.first = r.first;
    state.stats.wins++; if (isBoss(stage)) state.stats.bosses++;
    if (r.first) { c.best = stage; }
    if (c.push && stage === c.stage && c.stage < CFG.MAX_STAGE && c.best >= c.stage) { c.stage = c.stage + 1; rep.unlockedStage = c.stage; }
    return rep;
  }
  // Sweep tickets for the daily missions (not the campaign): one every 2 hours (up to 4 stored), plus 2 extra a day from ads. Ad tickets can go past the cap. No cooldown.
  const utcDay = (now) => new Date(now).toISOString().slice(0, 10);
  function sweepInfo(state, now) {
    const w = state.sweep, step = CFG.SWEEP_REGEN_S * 1000;
    if (w.tickets < CFG.SWEEP_MAX) {
      const n = Math.floor((now - w.at) / step);
      if (n > 0) { w.tickets = Math.min(CFG.SWEEP_MAX, w.tickets + n); w.at += n * step; }
      if (w.tickets >= CFG.SWEEP_MAX) w.at = now;
    } else w.at = now;
    if (w.day !== utcDay(now)) { w.day = utcDay(now); w.ads = 0; }
    return { tickets: w.tickets, nextIn: w.tickets < CFG.SWEEP_MAX ? Math.max(0, (w.at + step - now) / 1000) : 0, adsLeft: CFG.SWEEP_ADS - w.ads };
  }
  function sweepAd(state, now) { const i = sweepInfo(state, now); if (i.adsLeft <= 0) return false; state.sweep.ads++; state.sweep.tickets++; return true; }
  // Spend one sweep ticket. Not used by the campaign (it has no tickets); the daily missions in step 6 will call this.
  function useTicket(state, now) {
    if (sweepInfo(state, now).tickets < 1) return false;
    state.sweep.tickets--; if (state.sweep.tickets + 1 >= CFG.SWEEP_MAX) state.sweep.at = now;
    return true;
  }

  /* ===================== DAILIES, ARENA, CLAN ===================== */
  const DAILIES = [
    { id: 'alloy',  name: 'Salvage Run', glyph: '⚒', blurb: 'Strip wrecks for Alloy.',          reward: (n) => ({ alloy: 20 + Math.floor((n - 1) / 4) }), text: (r) => r.alloy + ' Alloy' },
    { id: 'shards', name: 'Data Heist',  glyph: '▤', blurb: 'Raid a data vault for Data Shards.', reward: (n) => ({ shards: 2 + Math.floor((n - 1) / 25) }), text: (r) => r.shards + ' Data Shards' },
    { id: 'nanites', name: 'Drone Hangar', glyph: '⚙', blurb: 'Strip a drone hangar for Nanites.', reward: (n) => ({ nanites: Math.round(CFG.NANITE_RAID * Math.pow(CFG.NANITE_RAID_G, n - 1)) }), text: (r) => r.nanites + ' Nanites' },
    { id: 'cores',  name: 'Clan Convoy', glyph: '✈', blurb: 'Escort the clan convoy for AI Cores. Needs a clan.', reward: (n) => ({ cores: 1 + Math.floor((n - 1) / 25) }), clan: true, text: (r) => r.cores + ' AI Cores' }
  ];
  const dailyById = (id) => DAILIES.find((d) => d.id === id);
  // Everything with a daily limit resets at midnight UTC.
  function rollDaily(state, now) {
    const key = utcDay(now), d = state.daily;
    if (d.day !== key) { d.day = key; d.att = {}; d.arena = 0; d.arenaX = 0; d.shop = {}; d.fstore = {}; d.dsum = 0; d.clan = []; d.clanPts = 0; d.gift = false; d.deals = {}; d.ads = {}; }
    return d;
  }
  const attemptsLeft = (state, id, now) => { rollDaily(state, now); return CFG.DAILY_ATTEMPTS - (state.daily.att[id] || 0); };
  function applyReward(state, r) {
    if (r.alloy) { state.alloy += r.alloy; state.stats.alloyEarned += r.alloy; }
    if (r.shards) state.shards += r.shards;
    if (r.cores) state.cores += r.cores;
    if (r.nanites) state.nanites += r.nanites;
  }
  // research bonuses for the daily missions
  function dailyBonus(state, id, r) {
    const k = id === 'alloy' ? 'salv' : id === 'shards' ? 'heist' : id === 'nanites' ? null : 'convoy', f = 1 + (k ? techBonus(state, k) : 0), out = {};
    Object.keys(r).forEach((x) => { out[x] = Math.round(r[x] * f); }); return out;
  }
  const ladderEnemy = (n) => enemyFor(n, CFG.DAILY_SCALE);
  function ladderLocked(state, id) { return !!dailyById(id).clan && !state.clan; }
  // Enter the next stage of a daily ladder. Uses one attempt. Returns the fight so the screen can show it.
  function ladderFight(state, id, rng, now) {
    const d = dailyById(id); if (!d || ladderLocked(state, id)) return { ok: false, reason: 'locked' };
    if (attemptsLeft(state, id, now) <= 0) return { ok: false, reason: 'attempts' };
    const n = state.ladders[id] + 1; if (n > CFG.MAX_STAGE) return { ok: false, reason: 'done' };
    state.daily.att[id] = (state.daily.att[id] || 0) + 1;
    const f = simulateFight(fighter(state), ladderEnemy(n), rng), out = { ok: true, win: f.win, stage: n, fight: f, reward: null };
    if (f.win) { state.ladders[id] = n; out.reward = dailyBonus(state, id, d.reward(n)); applyReward(state, out.reward); state.stats.wins++; if (d.clan) addClanPoints(state, CFG.CLAN_WIN_POINTS); } else state.stats.losses++;
    return out;
  }
  // Sweep the last ladder stage you cleared: costs one sweep ticket, no fight, no attempt.
  function ladderSweep(state, id, now) {
    const d = dailyById(id); if (!d || ladderLocked(state, id)) return null;
    const n = state.ladders[id]; if (n < 1) return null;
    if (!useTicket(state, now)) return null;
    const r = dailyBonus(state, id, d.reward(n)); applyReward(state, r); if (d.clan) addClanPoints(state, CFG.CLAN_WIN_POINTS);
    return { stage: n, reward: r };
  }

  /* ----- Arena: a simulated league ----- */
  const LEAGUES = ['Scrap League', 'Bronze League', 'Silver League', 'Gold League', 'Platinum League', 'Diamond League', 'Apex League'];
  const leagueOf = (lp) => { let i = 0; CFG.LEAGUE_LP.forEach((t, k) => { if (lp >= t) i = k; }); return i; };
  const CALLSIGNS = ['Vex', 'Harrow', 'Kestrel', 'Dutch', 'Mara', 'Ironside', 'Voss', 'Quill', 'Rook', 'Sable', 'Tarn', 'Wraith', 'Corvus', 'Lynx', 'Bishop', 'Nova', 'Grimm', 'Halo', 'Reyes', 'Talon'];
  function lcg(seed) { let x = (seed >>> 0) || 1; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }
  // three opponents scaled from your own ship: weaker, even, stronger. Stronger leagues push them up.
  function makeOpponents(state, seed) {
    const r = lcg(seed), L = leagueOf(state.arena.lp), out = [], used = new Set();
    [0.8, 1.0, 1.25].forEach((f, i) => {
      let name; do { name = CALLSIGNS[Math.floor(r() * CALLSIGNS.length)]; } while (used.has(name)); used.add(name);
      out.push({ name, f: +(f * (1 + 0.05 * L) * (0.96 + 0.08 * r())).toFixed(3), tag: ['Weaker', 'Even', 'Stronger'][i] });
    });
    return out;
  }
  function arenaOpponents(state, now) {
    rollDaily(state, now); const a = state.arena;
    if (!a.opp.length) { a.seed = (Math.floor(now / 3600000) * 7919 + a.lp) >>> 0; a.opp = makeOpponents(state, a.seed); }
    return a.opp;
  }
  const arenaLeft = (state, now) => { rollDaily(state, now); return CFG.ARENA_ATTEMPTS + (state.daily.arenaX || 0) - state.daily.arena; };
  function arenaFight(state, idx, rng, now) {
    const opp = arenaOpponents(state, now)[idx]; if (!opp) return { ok: false, reason: 'none' };
    if (arenaLeft(state, now) <= 0) return { ok: false, reason: 'attempts' };
    state.daily.arena++; state.stats.arena = (state.stats.arena || 0) + 1;
    const p = fighter(state), e = { stage: 0, boss: false, type: 'duel', name: opp.name, dmg: Math.max(1, Math.round(p.dmg * opp.f)), hull: Math.max(5, Math.round(p.hull * opp.f)), speed: 100, armor: 0, crit: 0.1 };
    const f = simulateFight(p, e, rng), L = leagueOf(state.arena.lp);
    let lp = 0, medals = 0;
    if (f.win) { lp = 25 + (opp.f > 1.1 * (1 + 0.05 * L) ? 10 : 0); medals = 10 + 2 * L; state.stats.wins++; } else { lp = -12; medals = 2; state.stats.losses++; }
    const before = state.arena.lp; state.arena.lp = Math.max(0, before + lp); state.medals += medals;
    state.arena.opp = []; // fresh opponents after each fight
    return { ok: true, win: f.win, fight: f, lp, medals, league: leagueOf(state.arena.lp), up: leagueOf(state.arena.lp) > leagueOf(before) };
  }
  const SHOP = [
    { id: 'alloy', name: 'Alloy crate', cost: 50, give: { alloy: 60 }, text: '60 Alloy' },
    { id: 'shards', name: 'Data cache', cost: 120, give: { shards: 3 }, text: '3 Data Shards' },
    { id: 'cores', name: 'Core pack', cost: 100, give: { cores: 5 }, text: '5 AI Cores' },
    { id: 'nanites', name: 'Nanite cache', cost: 60, give: { nanites: 150 }, text: '150 Nanites' },
    { id: 'flux', name: 'Flux cell', cost: 150, give: { flux: 10 }, text: '10 Flux' }
  ];
  function shopBuy(state, id, now) {
    rollDaily(state, now); const it = SHOP.find((x) => x.id === id); if (!it) return false;
    if ((state.daily.shop[id] || 0) >= CFG.SHOP_LIMIT || state.medals < it.cost) return false;
    state.medals -= it.cost; state.daily.shop[id] = (state.daily.shop[id] || 0) + 1;
    applyReward(state, it.give); if (it.give.flux) state.flux += it.give.flux; return true;
  }

  /* ----- Clans: simulated. Members fill most of the daily goal on their own as the day goes; you add the rest. ----- */
  const CLANS = [
    { id: 'vanguard', name: 'Iron Vanguard',  motto: 'Hold the line.',      members: 24, pace: 0.62 },
    { id: 'ashen',    name: 'Ashen Wing',     motto: 'Burn bright, burn fast.', members: 18, pace: 0.55 },
    { id: 'redline',  name: 'Redline Corps',  motto: 'No retreat, no refunds.', members: 30, pace: 0.7 }
  ];
  const CLAN_REWARDS = [{ alloy: 30 }, { flux: 5 }, { cores: 5 }, { flux: 10, shards: 2 }];
  function joinClan(state, id) { const c = CLANS.find((x) => x.id === id); if (!c) return false; state.clan = { id: c.id, name: c.name }; return true; }
  function leaveClan(state) { state.clan = null; return true; }
  function addClanPoints(state, n) { if (state.clan) state.daily.clanPts = (state.daily.clanPts || 0) + n; }
  function clanProgress(state, now) {
    if (!state.clan) return null; rollDaily(state, now);
    const c = CLANS.find((x) => x.id === state.clan.id), d = new Date(now), frac = (d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds()) / 86400;
    const members = Math.round(CFG.CLAN_TARGET * c.pace * frac), total = Math.min(CFG.CLAN_TARGET, members + (state.daily.clanPts || 0));
    return { clan: c, members, you: state.daily.clanPts || 0, total, steps: CFG.CLAN_STEPS.map((t, i) => ({ at: t, reached: total >= t, claimed: state.daily.clan.includes(i), reward: CLAN_REWARDS[i] })) };
  }
  function claimClan(state, i, now) {
    const p = clanProgress(state, now); if (!p) return false; const st = p.steps[i];
    if (!st || !st.reached || st.claimed) return false;
    state.daily.clan.push(i); applyReward(state, st.reward); if (st.reward.flux) state.flux += st.reward.flux; return true;
  }


  /* ===================== DEPOT: daily gift, daily deals, rewarded ads ===================== */
  // Rewarded ads are always optional. Each has a daily cap and a cooldown. They are small: a help, never a way to skip the waiting.
  const AD_OFFERS = [
    { id: 'alloy',   name: 'Salvage drop',   text: '+30 Alloy',                    cap: 4, cdS: 1200 },
    { id: 'credits', name: 'Supply cache',   text: '20 minutes of Credits', cap: 4, cdS: 1800 },
    { id: 'speed',   name: 'Rush crew',      text: 'Foundry upgrade 20 minutes faster', cap: 3, cdS: 3600 },
    { id: 'flux',    name: 'Flux cell',      text: '+2 Flux',                      cap: 3, cdS: 3600 },
    { id: 'nanites', name: 'Spare parts',    text: '+150 Nanites',                 cap: 3, cdS: 1800 }
  ];
  // what an average forged part sells for at your Foundry level (ad and deal Credits are counted in forges)
  function typicalSell(state) { return avgSell(state.forge.level) * creditMult(state); }
  const adCredits = (state) => Math.round(creditRate(state) * 1200);   // 20 minutes of the stockpile rate
  function adStatus(state, id, now) {
    rollDaily(state, now); const o = AD_OFFERS.find((x) => x.id === id), a = state.daily.ads[id] || { n: 0, at: 0 };
    const cd = Math.max(0, (a.at + o.cdS * 1000 - now) / 1000), left = o.cap - a.n;
    const needs = id === 'speed' && !state.forge.upgrade;
    return { left, cdLeft: cd, needs, ready: left > 0 && cd <= 0 && !needs };
  }
  function claimAd(state, id, now) {
    const st = adStatus(state, id, now); if (!st.ready) return false;
    if (id === 'alloy') { state.alloy += 30; state.stats.alloyEarned += 30; }
    else if (id === 'credits') addCredits(state, adCredits(state));
    else if (id === 'speed') state.forge.upgrade.endAt = Math.max(now, state.forge.upgrade.endAt - 20 * 60000);
    else if (id === 'flux') state.flux += 2;
    else if (id === 'nanites') state.nanites += 150;
    const a = state.daily.ads[id] || (state.daily.ads[id] = { n: 0, at: 0 }); a.n++; a.at = now; return true;
  }
  function claimGift(state, now) { rollDaily(state, now); if (state.daily.gift) return false; state.daily.gift = true; state.alloy += 100; state.stats.alloyEarned += 100; return true; }
  const DEAL_POOL = [
    { id: 'alloy200', name: 'Alloy bundle',   cost: 40, text: '200 Alloy' },
    { id: 'alloy600', name: 'Alloy crate',    cost: 100, text: '600 Alloy' },
    { id: 'cores10',  name: 'Core shipment',  cost: 60, text: '10 AI Cores' },
    { id: 'nan300',   name: 'Nanite crate',   cost: 50, text: '300 Nanites' },
    { id: 'shards4',  name: 'Data vault',     cost: 40, text: '4 Data Shards' },
    { id: 'credits',  name: 'Credit chest',   cost: 50, text: '1 hour of Credits' },
    { id: 'tickets2', name: 'Sweep voucher',  cost: 30, text: '2 sweep tickets' }
  ];
  function dealsToday(now) {
    const day = Math.floor(now / 86400000), r = lcg(day * 2654435761 + 17), pool = DEAL_POOL.slice(), out = [];
    while (out.length < 4) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    return out;
  }
  function buyDeal(state, id, now) {
    rollDaily(state, now); const d = dealsToday(now).find((x) => x.id === id); if (!d) return false;
    if (state.daily.deals[id] || state.flux < d.cost) return false;
    state.flux -= d.cost; state.daily.deals[id] = 1;
    if (id === 'alloy200') applyReward(state, { alloy: 200 }); else if (id === 'alloy600') applyReward(state, { alloy: 600 });
    else if (id === 'cores10') applyReward(state, { cores: 10 }); else if (id === 'nan300') applyReward(state, { nanites: 300 }); else if (id === 'shards4') applyReward(state, { shards: 4 });
    else if (id === 'credits') addCredits(state, Math.round(creditRate(state) * 3600));   // an hour of the stockpile rate
    else if (id === 'tickets2') state.sweep.tickets += 2;
    return true;
  }
  // stand-in for the one-time "remove ads" purchase: rewards then claim with no video
  function buyNoAds(state) { state.noAds = true; return true; }


  /* ===================== FLUX STORE: every currency can be bought with Flux (the premium currency) ===================== */
  // Prices follow the reference game's store: few items per Flux, small daily limits on the strong ones.
  const FSTORE = [
    { id: 'cr2',  give: 'credits', hours: 2,  cost: 50 },
    { id: 'cr5',  give: 'credits', hours: 5,  cost: 100 },
    { id: 'cr12', give: 'credits', hours: 12, cost: 200 },
    { id: 'al1',  give: 'alloy',   hours: 1,  cost: 15, limit: 20 },
    { id: 'co10', give: 'cores',   amount: 10,  cost: 75, limit: 10 },
    { id: 'na200', give: 'nanites', amount: 200, cost: 75 },
    { id: 'ar1',  give: 'arena',   amount: 1,   cost: 50, limit: 15 }
  ];
  function fstoreAmount(state, it) {
    if (it.give === 'credits') return Math.round(creditRate(state) * 3600 * it.hours);
    if (it.give === 'alloy') return Math.max(1, Math.round(alloyRate(state) * 3600 * it.hours));
    return it.amount;
  }
  function fstoreLeft(state, it, now) { rollDaily(state, now); return it.limit ? it.limit - (state.daily.fstore[it.id] || 0) : 99; }
  function fluxBuy(state, id, now) {
    const it = FSTORE.find((x) => x.id === id); if (!it) return false;
    if (fstoreLeft(state, it, now) <= 0 || state.flux < it.cost) return false;
    state.flux -= it.cost; if (it.limit) state.daily.fstore[id] = (state.daily.fstore[id] || 0) + 1;
    const n = fstoreAmount(state, it);
    if (it.give === 'credits') addCredits(state, n); else if (it.give === 'alloy') applyReward(state, { alloy: n });
    else if (it.give === 'cores') state.cores += n; else if (it.give === 'nanites') state.nanites += n; else if (it.give === 'arena') state.daily.arenaX = (state.daily.arenaX || 0) + n;
    return true;
  }
  // Real-money Flux packs (shown only; payments are not connected yet). Flux per price, double the first time you buy each.
  const FLUX_PACKS = [[30, 0.99], [150, 4.99], [320, 9.99], [480, 14.99], [990, 29.99], [1650, 49.99], [3300, 99.99], [7000, 199.99], [11000, 299.99]];

  /* ===================== CAMPAIGN ORDERS: a few small quests for every 20 stages ===================== */
  // Small bonuses only: never more than 200 Alloy, or a couple of Flux.
  const QUEST_FORGED = [300, 800, 1500, 2500, 4000, 6000, 8500, 12000, 16000, 22000];
  const QUESTS = (() => {
    const out = [];
    for (let b = 0; b < 10; b++) {
      out.push({ id: 'c' + b + 'a', block: b, kind: 'stage', need: b * 20 + 10, reward: { alloy: 40 + 14 * b } });
      out.push({ id: 'c' + b + 'b', block: b, kind: 'stage', need: b * 20 + 20, reward: { flux: 2 } });
      if (b % 2 === 0) out.push({ id: 'c' + b + 'c', block: b, kind: 'forge', need: QUEST_FORGED[b], reward: { alloy: 50 + 15 * b } });
    }
    return out;
  })();
  // Rank orders: 3 for every commander rank. One is always 'reach the last level of this rank'. Small rewards only.
  const RANK_FORGED = Array.from({ length: 25 }, (_, r) => Math.round(150 * Math.pow(r + 1, 1.9) / 50) * 50);   // forged parts needed during rank r
  for (let r = 0; r < RANK_NAMES.length; r++) {
    QUESTS.push({ id: 'r' + r + 'a', rank: r, kind: 'level', need: Math.min(CFG.LEVEL_MAX, (r + 1) * CFG.RANK_LEVELS), reward: { flux: 2, cores: 6 } });
    QUESTS.push({ id: 'r' + r + 'b', rank: r, kind: 'forge', need: RANK_FORGED[r], reward: { alloy: 100 + 25 * r } });
    const k = r % 3;
    if (k === 0) QUESTS.push({ id: 'r' + r + 'c', rank: r, kind: 'stage', need: Math.min(CFG.MAX_STAGE, 8 * (r + 1)), reward: { nanites: 150 + 50 * r } });
    else if (k === 1) QUESTS.push({ id: 'r' + r + 'c', rank: r, kind: 'arena', need: 5 * (r + 1), reward: { nanites: 150 + 50 * r } });
    else QUESTS.push({ id: 'r' + r + 'c', rank: r, kind: 'credits', need: Math.round(5000 * Math.pow(r + 1, 2.2)), reward: { cores: 6 + r } });
  }
  const questProgress = (state, q) => ({ stage: () => state.combat.best, forge: () => state.stats.forged, level: () => state.cmd.level, arena: () => state.stats.arena || 0, credits: () => state.stats.creditsEarned })[q.kind]();
  // a block of campaign orders opens once you have cleared the one before it; rank orders open with your rank
  const questOpen = (state, q) => q.rank !== undefined ? q.rank <= state.cmd.rank : q.block <= Math.floor(state.combat.best / 20);
  const visibleQuests = (state) => QUESTS.filter((q) => questOpen(state, q));
  function claimQuest(state, id) {
    const q = QUESTS.find((x) => x.id === id); if (!q || state.quests[id] || questProgress(state, q) < q.need || !questOpen(state, q)) return false;
    state.quests[id] = 1; applyReward(state, { alloy: q.reward.alloy || 0, cores: q.reward.cores || 0, nanites: q.reward.nanites || 0 }); if (q.reward.flux) state.flux += q.reward.flux; return true;
  }

  function setStage(state, stage) { state.combat.stage = clamp(stage, 1, Math.min(CFG.MAX_STAGE, state.combat.best + 1)); }
  // Flux can finish a Foundry upgrade early
  function rushCost(state, now) { const up = state.forge.upgrade; if (!up) return 0; return Math.max(1, Math.ceil(Math.max(0, up.endAt - now) / 1000 / CFG.RUSH_SECONDS_PER_FLUX)); }
  function rushUpgrade(state, now) {
    const up = state.forge.upgrade; if (!up) return false;
    const c = rushCost(state, now); if (state.flux < c) return false;
    state.flux -= c; up.endAt = now; return true;
  }

  function maxForges(state) { return Math.floor(state.alloy / forgeCost(state)); }


  function upgradeInfo(state) {
    const L = state.forge.level;
    if (L >= CFG.MAX_FORGE_LEVEL) return { maxed: true };
    const parts = CFG.INSTALL(L), paid = Math.min(parts - 1, state.forge.paid || 0);
    return { maxed: false, from: L, to: L + 1, credits: upgradeCredits(state, L), parts, paid, seconds: upgradeSecs(state, L) };
  }
  function startUpgrade(state, now) {
    const u = upgradeInfo(state);
    if (u.maxed || state.forge.upgrade) return { ok: false, reason: u.maxed ? 'max' : 'busy' };
    if (state.credits < u.credits) return { ok: false, reason: 'credits' };
    state.credits -= u.credits;
    if (u.paid + 1 < u.parts) { state.forge.paid = u.paid + 1; return { ok: true, partial: true }; }
    state.forge.paid = 0;
    state.forge.upgrade = { to: u.to, endAt: now + u.seconds * 1000, startAt: now };
    return { ok: true };
  }
  // finishes the upgrade if its time is up; returns the new level or 0
  function checkUpgrade(state, now) {
    const up = state.forge.upgrade;
    if (up && now >= up.endAt) { state.forge.level = up.to; state.forge.upgrade = null; state.stats.upgrades++; return up.to; }
    return 0;
  }

  // The stockpile: Alloy and Credits build up in real time (online or not) up to your offline time, and you collect them with a button.
  const creditRate = (state) => CFG.OFFLINE_CREDIT_RATE + techBonus(state, 'patrol');   // Credits per second
  function fillStock(state, secs) {
    const cap = offlineCapS(state), st = state.stock;
    st.alloy = Math.min(alloyRate(state) * cap, st.alloy + alloyRate(state) * secs);
    st.credits = Math.min(creditRate(state) * cap, st.credits + creditRate(state) * secs);
  }
  function earn(state, dt) { fillStock(state, dt); state.stats.seconds += dt; }
  function collect(state, now) {
    const st = state.stock;
    if (now < st.lock) return { ok: false, reason: 'wait' };
    const a = Math.floor(st.alloy), c = Math.floor(st.credits);
    if (a < 1 && c < 1) return { ok: false, reason: 'empty' };
    st.alloy -= a; st.credits -= c; st.lock = now + CFG.COLLECT_LOCK_MS;
    state.alloy += a; state.stats.alloyEarned += a; addCredits(state, c);
    return { ok: true, alloy: a, credits: c };
  }
  // Everything that happened while the app was closed: the stockpile kept filling (up to the cap) and Foundry/research timers ran.
  function offline(state, now) {
    const away = Math.max(0, (now - state.last) / 1000), cap = offlineCapS(state);
    const rep = { away, cap, alloy: 0, credits: 0, levelUp: 0, capped: away > cap };
    if (away < 1) return rep;
    fillStock(state, Math.min(away, cap));
    const l = checkUpgrade(state, now); if (l) rep.levelUp = l;
    const tdone = checkTech(state, now); if (tdone) rep.techDone = tdone;
    return rep;
  }

  function fmt(n) {
    if (!isFinite(n)) return '0';
    n = Math.floor(n);
    if (n < 10000) return n.toLocaleString('en-US');
    const units = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx'];
    let u = 0, x = n;
    while (x >= 1000 && u < units.length - 1) { x /= 1000; u++; }
    return (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2)) + units[u];
  }
  function fmtTime(sec) {
    sec = Math.max(0, Math.ceil(sec));
    const d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    if (d) return d + 'd ' + h + 'h';
    if (h) return h + 'h ' + m + 'm';
    if (m) return m + 'm ' + (s < 10 ? '0' : '') + s + 's';
    return s + 's';
  }

  const api = { SHIPS, hullTier, shipOf, batchSize, SUBS, SUB_KEYS, SLOT_SUBS, gearCombat, buildFactor, rollSubs, DRONES, DRONE_BY, LINK_OF, LINKS, D_RAR, D_COLOR, D_UNLOCK, D_UPS, abilityLevels, droneAbilities, describeAbility, describeFx, droneStat, levelCost, linkInfo, droneBonus, summon, summonFree, summonCost, freeSummonsLeft, giveDrone, canFuse, fuse, fuseAll, setActive, levelUp, resetDrone, FSTORE, fstoreAmount, fstoreLeft, fluxBuy, FLUX_PACKS, questOpen, CFG, SLOTS, TIERS, LAUNCH_TIERS, slotById, itemStat, itemName, sellValue, sellFor, tierOdds, rollItem, newState, migrate, power, powerWith, calcPower, setBonus, codexKey, codexHas, codexTierCount, codexCount, codexBonus, discover, highestTier, SECTORS, FOES, sectorOf, isBoss, enemyFor, fighter, simulateFight, creditsWin, describeRewards, resolveFight, setStage, winChance, rushCost, rushUpgrade, autoUnlocked, autoFiltered, isUpgrade, equip, forgeCost, forgeOnce, forgeBatch, maxForges, holdAdd, holdFree, forgeRun, forgeHold, equipHeld, sellHeld, upgradeInfo, startUpgrade, checkUpgrade, earn, offline, fmt, fmtTime, stageLabel, shardsFor, AD_OFFERS, adStatus, claimAd, claimGift, DEAL_POOL, dealsToday, buyDeal, buyNoAds, useTicket, sweepInfo, sweepAd, DAILIES, dailyById, rollDaily, attemptsLeft, ladderEnemy, ladderLocked, ladderFight, ladderSweep, LEAGUES, leagueOf, arenaOpponents, arenaLeft, arenaFight, SHOP, shopBuy, CLANS, CLAN_REWARDS, joinClan, leaveClan, addClanPoints, clanProgress, claimClan, utcDay, RANK_NAMES, TECH_NODES, TECH_BRANCHES, TECH_TIERS, TECH_TIER_GATE, BATCH_STEPS, techNode, techBonus, techInfo, startTech, checkTech, techRushCost, rushTech, techReady, rLevel, dailyBonus, typicalSell, creditRate, collect, QUESTS, questProgress, visibleQuests, claimQuest, FM_ODDS, alloyRate, offlineCapS, creditMult, statBonus, addXp, levelCap, atCap, rankReward, canPromote, promote, renameCost, renameCommander, setAvatar };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.VS = api;
})(typeof self !== 'undefined' ? self : this);
