/* Voidsmith: game rules and numbers. No screen code here, so tests can run it directly.
   Every number you might want to tune lives in the TABLES section at the top. */
(function (root) {
  'use strict';

  /* ===================== TABLES (tune the game here) ===================== */
  const CFG = {
    NAME: 'Voidsmith',
    SAVE_VERSION: 1,
    MAX_FORGE_LEVEL: 14,        // launch cap: few levels, each one a milestone. More arrive with later tiers.
    PATROL_RATE: 0.5,           // fights you are not watching (offline patrol) pay half
    OFFLINE_BASE_H: 4,          // hours of offline production you start with; research raises it
    AUTO_UNLOCK_LEVEL: 3,       // forge level that unlocks Auto-Salvage
    ALLOY_COST: 1,              // one Alloy buys one forge. There is no cap on how much Alloy or Credits you can hold.
    ALLOY_PER_SEC: 1 / 60,      // base production: one Alloy a minute (research raises it)
    START_ALLOY: 60,
    UPGRADE_CREDITS: (L) => {
      const raw = L <= 10 ? 50 * Math.pow(3.65, L - 1) : 50 * Math.pow(3.65, 9) * Math.pow(3.0, L - 10);
      const m = L === 1 ? 3 : L === 2 ? 6 : L <= 9 ? 12 : L === 10 ? 2.5 : 1.1; // early levels need real saving, late ones were already gated by income
      return Math.round(raw * m);
    }, // Credits to go from L to L+1
    // wait time from L to L+1: seconds early, hours mid, days late. Levels in between are blended smoothly.
    UPGRADE_SECONDS: (L) => { const A = CFG.UPGRADE_ANCHORS; let i = 0; while (i < A.length - 2 && L > A[i + 1][0]) i++; const a = A[i], b = A[i + 1]; return Math.round(a[1] * Math.pow(b[1] / a[1], (L - a[0]) / (b[0] - a[0]))); },
    UPGRADE_ANCHORS: [[1, 30], [2, 300], [3, 3600], [4, 28800], [5, 129600], [6, 259200], [7, 432000], [8, 518400], [9, 604800], [10, 691200], [11, 864000], [12, 1036800], [13, 1209600]],
    LEVEL_GROWTH: 1.28,         // each forge level makes new gear 28% stronger
    SELL_BASE: 3, SELL_GROWTH: 1.30,
    TIER_FADE: 0.6,             // how fast lower tiers fade as better ones unlock
    HOLD_START: 6, HOLD_MAX: 30, HOLD_STEP: 2,                       // Cargo Hold size
    HOLD_COST: (k) => Math.round(150 * Math.pow(1.6, k)),            // Credits for the k-th expansion
    SET4: [0.02, 0.04, 0.06, 0.09, 0.12, 0.16],                      // bonus for 4 fitted parts of tier X or better
    SET8: [0.05, 0.10, 0.15, 0.22, 0.30, 0.40],                      // bonus for 8 fitted parts of tier X or better
    CODEX_PART: 0.0025,         // each part ever forged adds this to all stats
    CODEX_TIER: 0.03,           // finishing all 8 parts of a tier adds this too
    MAX_STAGE: 200,             // twenty chapters of ten stages at launch (shown as 1-1 ... 20-10)
    ENEMY_POINTS: [[1, 8], [20, 200], [50, 2000], [100, 70000], [150, 380000], [200, 900000]],    // enemy Power at these stages; in between it grows smoothly
    ENEMY_SCALE: 7,
    ENEMY_POWER: (s) => { const P = CFG.ENEMY_POINTS; let i = 0; while (i < P.length - 2 && s > P[i + 1][0]) i++; const a = P[i], b = P[i + 1]; return CFG.ENEMY_SCALE * a[1] * Math.pow(b[1] / a[1], (s - a[0]) / (b[0] - a[0])); },
    CREDITS_WIN: (s) => Math.round(8 + 1 * (s - 1)),                 // Credits per win: starts near 1 a second, then +1 per stage
    FIRST_CLEAR_X: 5,           // first time you clear a stage, Credits are multiplied by this
    FLUX_BOSS: 15, FLUX_SECTOR: 35,   // Flux for the first clear of a boss / of the last chapter's boss bonus
    SHARD_BOSS: (s) => 2 + Math.ceil(s / 20), SHARD_FIFTH: 1,       // Data Shards: boss first clears, and the 5th stage of a chapter
    DAILY_ATTEMPTS: 3, DAILY_SCALE: 0.75,                            // each daily ladder: tries per day, and how hard its enemies are compared with the campaign
    ARENA_ATTEMPTS: 5, LEAGUE_LP: [0, 100, 250, 500, 900, 1500, 2500], SHOP_LIMIT: 2,
    CLAN_TARGET: 100, CLAN_STEPS: [25, 50, 75, 100], CLAN_WIN_POINTS: 8,
    SWEEP_MAX: 4, SWEEP_REGEN_S: 7200, SWEEP_ADS: 2,                 // sweep tickets: 1 every 2 hours up to 4, plus 2 bonus tickets a day from ads (resets at midnight UTC)
    XP_TIER: [10, 10, 20, 20, 20, 30, 40, 50, 60, 70],               // commander XP per part forged, by tier
    XP_NEED: (L) => Math.round(120 * Math.pow(1.10, L - 1)),          // XP to go from level L to L+1
    LEVEL_MAX: 100, LEVEL_BONUS: 0.012,                               // each commander level adds this to Damage and Hull
    FIGHT_SECONDS: 12,           // how long a fight takes (used for offline patrols)
    CRIT_CHANCE: 0.12, CRIT_MULT: 1.6, OVERCHARGE_EVERY: 4, OVERCHARGE_MULT: 2.5,
    RUSH_SECONDS_PER_FLUX: 300, // 1 Flux finishes 5 minutes of Foundry waiting
    SUB_COUNT: [0, 1, 2, 2, 3, 4],       // bonus lines a part rolls, by tier
    SUB_TIER_F: (t) => 1 + 0.35 * t,     // higher tiers roll bigger lines
    CORE_FIRST: 3, CORE_BOSS: 15, CORE_DROP: 0.06,   // AI Cores: first clears, boss first clears, chance per win
    SUMMON_COST: 10, SUMMON10_COST: 90, FUSE_NEED: 3,
    BAY_STEP: 25, BAY_MAX: 20, WING_SLOTS: 3,
    RANK_F: [1, 1.5, 2.2, 3.2, 4.6, 6.5],            // companion strength by rank
    SUMMON_BASE: [70, 24, 5, 0.9, 0.1, 0],           // rank odds at Summon Bay level 1
    SUMMON_SHIFT: 0.14                               // each Bay level makes higher ranks this much likelier
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
    { name: 'Hardened',   color: '#4aa3ff', mult: 4.8, sell: 4,  unlock: 5, launch: true,
      names: { cannon: 'Gauss Cannon', pod: 'Swarm Pod', array: 'Optic Array', coil: 'Fusion Coil', plating: 'Ceramic Plate', bulkhead: 'Reinforced Bulkhead', emitter: 'Deflector Emitter', spar: 'Titan Spar' } },
    { name: 'Classified', color: '#b27cff', mult: 10,  sell: 8,  unlock: 8, launch: true,
      names: { cannon: 'Black-Ops Railgun', pod: 'Whisper Pod', array: 'Ghost Array', coil: 'Dark Coil', plating: 'Stealth Plate', bulkhead: 'Vault Bulkhead', emitter: 'Cloak Emitter', spar: 'Redacted Spar' } },
    { name: 'Voidborn',   color: '#ff5ec4', mult: 20,  sell: 16, unlock: 11, launch: true,
      names: { cannon: 'Rift Cannon', pod: 'Singularity Pod', array: 'Eventide Array', coil: 'Hollow Coil', plating: 'Umbral Plate', bulkhead: 'Abyssal Bulkhead', emitter: 'Null Emitter', spar: 'Voidglass Spar' } },
    { name: 'Exotic',     color: '#ffb02e', mult: 38,  sell: 32, unlock: 14, launch: true,
      names: { cannon: 'Plasma Lance', pod: 'Nova Pod', array: 'Prism Array', coil: 'Starheart Coil', plating: 'Aegis Plate', bulkhead: 'Citadel Bulkhead', emitter: 'Bastion Emitter', spar: 'Titanite Spar' } },
    { name: 'Ancient',     color: '#c9b37a', launch: false },
    { name: 'Dark Matter', color: '#6a5acd', launch: false },
    { name: 'Origin',      color: '#7fe3d0', launch: false },
    { name: 'Apex',        color: '#ff4d4d', launch: false }
  ];
  const LAUNCH_TIERS = TIERS.filter((t) => t.launch).length;

  // Bonus lines on parts. Values are percent. Weapons lean offensive, hull parts lean defensive.
  const SUBS = {
    crit:    { name: 'Crit chance',   base: 2.0, cap: 0.75, note: 'chance to hit for extra damage' },
    critdmg: { name: 'Crit damage',   base: 8,   cap: 3,    note: 'extra damage on a crit' },
    pierce:  { name: 'Armor pierce',  base: 6,   cap: 0.8,  note: 'ignores enemy armor' },
    oc:      { name: 'Overcharge',    base: 10,  cap: 3,    note: 'stronger Overcharge shots' },
    haste:   { name: 'Haste',         base: 3,   cap: 0.7,  note: 'you act sooner in turn order' },
    armor:   { name: 'Plating',       base: 2.5, cap: 0.5,  note: 'less damage taken' },
    dodge:   { name: 'Evasion',       base: 2,   cap: 0.45, note: 'chance to dodge a hit' },
    leech:   { name: 'Hull leech',    base: 1.5, cap: 0.35, note: 'heals you for part of your damage' }
  };
  const SUB_KEYS = Object.keys(SUBS);
  const SLOT_SUBS = {
    cannon: ['crit', 'critdmg', 'pierce', 'oc', 'haste', 'leech'], pod: ['crit', 'critdmg', 'pierce', 'oc', 'haste', 'leech'],
    array: ['crit', 'critdmg', 'pierce', 'oc', 'haste', 'leech'], coil: ['crit', 'critdmg', 'pierce', 'oc', 'haste', 'leech'],
    plating: ['armor', 'dodge', 'leech', 'haste', 'crit', 'critdmg'], bulkhead: ['armor', 'dodge', 'leech', 'haste', 'crit', 'critdmg'],
    emitter: ['armor', 'dodge', 'leech', 'haste', 'crit', 'critdmg'], spar: ['armor', 'dodge', 'leech', 'haste', 'crit', 'critdmg']
  };

  // Wing: companion ships that act in turn order. Rank 0-5.
  const RANKS = ['Recruit', 'Veteran', 'Elite', 'Ace', 'Legend', 'Paragon'];
  const RANK_COLORS = ['#9a8672', '#6fcf6f', '#4aa3ff', '#b27cff', '#ff5ec4', '#ffb02e'];
  const SPECIES = [
    { id: 'hornet',  name: 'Hornet',  role: 'Gunner',  speed: 110, glyph: '➤', blurb: 'Fires fast. Hits for {a}% of your ship damage.',   a: 30 },
    { id: 'longbow', name: 'Longbow', role: 'Sniper',  speed: 70,  glyph: '⌖', blurb: 'Slow, heavy shot. {a}% of your damage, ignores armor.', a: 80 },
    { id: 'mender',  name: 'Mender',  role: 'Medic',   speed: 90,  glyph: '✚', blurb: 'Repairs your hull for {a}% of its maximum.',        a: 5 },
    { id: 'aegis',   name: 'Aegis',   role: 'Shield',  speed: 85,  glyph: '◈', blurb: 'Adds a shield worth {a}% of your hull (up to 60%).', a: 10 },
    { id: 'static',  name: 'Static',  role: 'Jammer',  speed: 95,  glyph: '≋', blurb: 'Slows the enemy by {a}% for its next two turns.',   a: 25 },
    { id: 'surge',   name: 'Surge',   role: 'Amp',     speed: 90,  glyph: '⚡', blurb: 'Your next shot deals +{a}% damage.',                a: 50 }
  ];

  /* ===================== RULES ===================== */
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const slotById = (id) => SLOTS.find((s) => s.id === id);

  function itemStat(it) {
    const s = slotById(it.slot), t = TIERS[it.tier];
    return Math.max(1, Math.floor(s.base * t.mult * Math.pow(CFG.LEVEL_GROWTH, it.level - 1)));
  }
  function itemName(it) { return TIERS[it.tier].names[it.slot]; }
  function sellValue(it) {
    return Math.max(1, Math.round(CFG.SELL_BASE * Math.pow(CFG.SELL_GROWTH, it.level - 1) * TIERS[it.tier].sell));
  }

  // Chance of each launch tier when forging at forge level L (array of fractions that sum to 1).
  function tierOdds(L) {
    let top = 0;
    for (let i = 0; i < LAUNCH_TIERS; i++) if (L >= TIERS[i].unlock) top = i;
    const w = [];
    for (let i = 0; i < LAUNCH_TIERS; i++) {
      if (L < TIERS[i].unlock) { w.push(0); continue; }
      w.push((1 + (L - TIERS[i].unlock)) * Math.pow(CFG.TIER_FADE, top - i));
    }
    const sum = w.reduce((a, b) => a + b, 0);
    return w.map((x) => x / sum);
  }

  function rollSubs(slot, tier, rng, skip) {
    const pool = SLOT_SUBS[slot].filter((k) => !(skip || []).includes(k)), out = [], n = Math.min(CFG.SUB_COUNT[tier] || 0, pool.length);
    for (let i = 0; i < n; i++) {
      const k = pool.splice(Math.floor(rng() * pool.length) % pool.length, 1)[0];
      out.push({ k, v: rollSubValue(k, tier, rng) });
    }
    return out;
  }
  function rollSubValue(k, tier, rng) { return Math.round(SUBS[k].base * CFG.SUB_TIER_F(tier) * (0.6 + 0.8 * rng()) * 10) / 10; }
  function rollItem(forgeLevel, rng) {
    const odds = tierOdds(forgeLevel);
    let r = rng(), tier = 0;
    for (let i = 0; i < odds.length; i++) { r -= odds[i]; if (r <= 0) { tier = i; break; } tier = i; }
    const slot = SLOTS[Math.floor(rng() * SLOTS.length) % SLOTS.length].id;
    return { slot, tier, level: forgeLevel, subs: rollSubs(slot, tier, rng) };
  }

  function newState(now) {
    const gear = {}; SLOTS.forEach((s) => { gear[s.id] = null; });
    return {
      v: CFG.SAVE_VERSION, name: 'Commander', created: now, last: now,
      alloy: CFG.START_ALLOY, credits: 0, shards: 0,
      cmd: { level: 1, xp: 0, rank: 0 }, research: {}, sweep: { tickets: CFG.SWEEP_MAX, at: now, day: '', ads: 0 },
      medals: 0, ladders: { alloy: 0, shards: 0, cores: 0 }, daily: { day: '', att: {}, arena: 0, shop: {}, clan: [], clanPts: 0, gift: false, deals: {}, ads: {} }, noAds: false, arena: { lp: 0, opp: [], seed: 0 }, clan: null,
      forge: { level: 1, upgrade: null },
      gear, pending: null, pendingNew: false, hold: [], holdCap: CFG.HOLD_START, codex: {},
      combat: { stage: 1, best: 0, push: true, speed: 1 }, flux: 0,
      stats: { fused: 0, wins: 0, losses: 0, bosses: 0, forged: 0, sold: 0, equipped: 0, alloyEarned: 0, creditsEarned: 0, upgrades: 0, bestTier: 0, seconds: 0 },
      cores: 0, wing: { owned: {}, active: [], summons: 0 },
      settings: { vibrate: true, auto: false, filter: [], filterMin: 1 }
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
    out.research = Object.assign({}, s.research || {});
    RESEARCH.forEach((n) => { out.research[n.id] = clamp(Math.floor(out.research[n.id]) || 0, 0, n.max); });
    out.sweep = Object.assign({ tickets: CFG.SWEEP_MAX, at: now, day: '', ads: 0 }, s.sweep || {});
    if (!isFinite(out.sweep.tickets) || out.sweep.tickets < 0) out.sweep.tickets = 0;
    if (!isFinite(out.medals) || out.medals < 0) out.medals = 0;
    out.ladders = Object.assign({ alloy: 0, shards: 0, cores: 0 }, s.ladders || {});
    Object.keys(out.ladders).forEach((k) => { out.ladders[k] = clamp(Math.floor(out.ladders[k]) || 0, 0, CFG.MAX_STAGE); });
    out.daily = Object.assign({ day: '', att: {}, arena: 0, shop: {}, clan: [], clanPts: 0, gift: false, deals: {}, ads: {} }, s.daily || {});
    out.noAds = !!out.noAds;
    out.arena = Object.assign({ lp: 0, opp: [], seed: 0 }, s.arena || {});
    if (!Array.isArray(out.arena.opp)) out.arena.opp = [];
    if (!out.clan || typeof out.clan !== 'object') out.clan = null;
    if (!isFinite(out.cores) || out.cores < 0) out.cores = 0;
    out.wing = Object.assign({ owned: {}, active: [], summons: 0 }, s.wing || {});
    if (!Array.isArray(out.wing.active)) out.wing.active = [];
    if (!Array.isArray(out.settings.filter)) out.settings.filter = [];
    out.hold.forEach((it) => { if (!it.subs) it.subs = []; });
    if (!Array.isArray(out.hold)) out.hold = [];
    if (!out.codex || typeof out.codex !== 'object') out.codex = {};
    out.holdCap = clamp(Math.floor(out.holdCap) || CFG.HOLD_START, CFG.HOLD_START, CFG.HOLD_MAX);
    Object.keys(out.gear).forEach((k) => { if (out.gear[k] && !out.gear[k].subs) out.gear[k].subs = []; });
    if (out.pending && !out.pending.subs) out.pending.subs = [];
    ['alloy', 'credits'].forEach((k) => { if (!isFinite(out[k]) || out[k] < 0) out[k] = 0; });
    out.forge.level = clamp(Math.floor(out.forge.level) || 1, 1, CFG.MAX_FORGE_LEVEL);
    out.v = CFG.SAVE_VERSION;
    return out;
  }


  /* ===================== COMMANDER, RANKS, RESEARCH ===================== */
  const RANK_NAMES = ['Cadet', 'Ensign', 'Lieutenant', 'Commander', 'Captain', 'Major', 'Colonel', 'Commodore', 'Admiral', 'Fleet Admiral', 'Warlord'];
  // To pass level 9, 19, 29... you must earn a promotion. Quest k (1-10) gates the step into rank k.
  const QUEST_STAGE = [3, 12, 25, 45, 70, 95, 120, 150, 175, 200];
  const QUEST_FOUNDRY = [2, 3, 4, 5, 8, 9, 11, 12, 14, 14];
  const QUEST_FIT = [[0, 4], [1, 4], [1, 8], [2, 8], [3, 4], [3, 8], [4, 4], [4, 8], [5, 4], [5, 8]];
  const levelCap = (cmd) => Math.min(CFG.LEVEL_MAX, (cmd.rank + 1) * 10 - 1 + (cmd.rank >= RANK_NAMES.length - 1 ? 1 : 0));
  const RESEARCH = [
    { id: 'alloy',   name: 'Salvage Drones',     max: 10, base: 2, per: 0.05, text: (l) => 'Alloy production +' + Math.round(l * 5) + '%' },
    { id: 'offline', name: 'Deep-Range Comms',   max: 12, base: 3, per: 1,    text: (l) => 'Offline production time ' + (CFG.OFFLINE_BASE_H + l) + ' hours' },
    { id: 'credits', name: 'Trade Contracts',    max: 10, base: 2, per: 0.05, text: (l) => 'Credits from fights and sales +' + Math.round(l * 5) + '%' },
    { id: 'speed',   name: 'Rapid Assembly',     max: 10, base: 3, per: 0.03, text: (l) => 'Foundry upgrades ' + Math.round(l * 3) + '% faster' },
    { id: 'xp',      name: 'Training Simulators', max: 10, base: 2, per: 0.05, text: (l) => 'Forging XP +' + Math.round(l * 5) + '%' },
    { id: 'dmg',     name: 'Ordnance Doctrine',  max: 10, base: 3, per: 0.02, text: (l) => 'Damage +' + Math.round(l * 2) + '%' },
    { id: 'hull',    name: 'Armor Doctrine',     max: 10, base: 3, per: 0.02, text: (l) => 'Hull +' + Math.round(l * 2) + '%' }
  ];
  const rLevel = (state, id) => (state.research && state.research[id]) || 0;
  const researchCost = (n, l) => Math.round(n.base * Math.pow(1.4, l));
  function buyResearch(state, id) {
    const n = RESEARCH.find((x) => x.id === id); if (!n) return false;
    const l = rLevel(state, id); if (l >= n.max) return false;
    const c = researchCost(n, l); if (state.shards < c) return false;
    state.shards -= c; state.research[id] = l + 1; return true;
  }
  const alloyRate = (state) => CFG.ALLOY_PER_SEC * (1 + 0.05 * rLevel(state, 'alloy'));
  const offlineCapS = (state) => (CFG.OFFLINE_BASE_H + rLevel(state, 'offline')) * 3600;
  const creditMult = (state) => 1 + 0.05 * rLevel(state, 'credits');
  const upgradeSecs = (state, L) => Math.max(1, Math.round(CFG.UPGRADE_SECONDS(L) * (1 - 0.03 * rLevel(state, 'speed'))));
  // multipliers on Damage and Hull from commander level and research
  function statBonus(state) {
    const lv = 1 + CFG.LEVEL_BONUS * (state.cmd.level - 1);
    return { dmg: lv * (1 + 0.02 * rLevel(state, 'dmg')), hull: lv * (1 + 0.02 * rLevel(state, 'hull')) };
  }
  // forging XP: returns levels gained
  function levelLoop(state) {
    const c = state.cmd, cap = levelCap(c); let gained = 0;
    for (;;) {
      const need = CFG.XP_NEED(c.level);
      if (c.level >= cap) { c.xp = Math.min(c.xp, need); break; }
      if (c.xp < need) break;
      c.xp -= need; c.level++; gained++;
    }
    return gained;
  }
  function addXp(state, tier) { state.cmd.xp += (CFG.XP_TIER[tier] || 10) * (1 + 0.05 * rLevel(state, 'xp')); return levelLoop(state); }
  const atCap = (state) => state.cmd.level >= levelCap(state.cmd) && state.cmd.rank < RANK_NAMES.length - 1;
  function questGoals(state) {
    const k = state.cmd.rank + 1; if (k > 10) return [];
    const fit = QUEST_FIT[k - 1];
    let nFit = 0; SLOTS.forEach((sl) => { const it = state.gear[sl.id]; if (it && it.tier >= fit[0]) nFit++; });
    const goals = [
      { label: 'Clear stage ' + stageLabel(QUEST_STAGE[k - 1]), have: state.combat.best, need: QUEST_STAGE[k - 1], show: (v) => v >= QUEST_STAGE[k - 1] ? 'done' : 'best ' + (state.combat.best ? stageLabel(state.combat.best) : 'none') },
      { label: 'Foundry level ' + QUEST_FOUNDRY[k - 1], have: state.forge.level, need: QUEST_FOUNDRY[k - 1] },
      { label: 'Fit ' + fit[1] + ' parts of ' + TIERS[fit[0]].name + ' or better', have: nFit, need: fit[1] }
    ];
    goals.forEach((g) => { g.ok = g.have >= g.need; });
    return goals;
  }
  const rankReward = (k) => ({ flux: 25 * k, cores: 10 * k, shards: 5 * k });
  function canPromote(state) { return atCap(state) && questGoals(state).every((g) => g.ok); }
  function promote(state) {
    if (!canPromote(state)) return null;
    const k = state.cmd.rank + 1, r = rankReward(k);
    state.cmd.rank = k; state.flux += r.flux; state.cores += r.cores; state.shards += r.shards;
    const before = state.cmd.level; levelLoop(state);
    return { rank: k, reward: r, levels: state.cmd.level - before };
  }

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
      crit: cap('crit', CFG.CRIT_CHANCE + t.crit / 100), critMult: CFG.CRIT_MULT + t.critdmg / 100,
      pierce: cap('pierce', t.pierce / 100), ocMult: CFG.OVERCHARGE_MULT * (1 + t.oc / 100),
      haste: cap('haste', t.haste / 100), armor: cap('armor', t.armor / 100), dodge: cap('dodge', t.dodge / 100), leech: cap('leech', t.leech / 100)
    };
  }
  // A smooth "how good is this build" multiplier. 1.0 means no bonus lines at all.
  function buildFactor(c) {
    const avgShot = (3 + c.ocMult) / 4, base = (3 + CFG.OVERCHARGE_MULT) / 4;
    const off = ((1 + c.crit * (c.critMult - 1)) / (1 + CFG.CRIT_CHANCE * (CFG.CRIT_MULT - 1))) * (avgShot / base) * (1 + c.haste) * ((1 - 0.12) / (1 - 0.12 * (1 - c.pierce)));
    const def = (1 / ((1 - c.armor) * (1 - c.dodge))) * (1 + 2.4 * c.leech);
    return Math.sqrt(off * def);
  }
  function calcPower(gear, codexB, sbn) {
    sbn = sbn || { dmg: 1, hull: 1 };
    let dmg = 0, hull = 0;
    SLOTS.forEach((s) => { const it = gear[s.id]; if (!it) return; const v = itemStat(it); if (s.stat === 'dmg') dmg += v; else hull += v; });
    const sb = setBonus(gear), mul = (1 + sb.bonus) * (1 + codexB);
    dmg = dmg * mul * sbn.dmg; hull = hull * mul * sbn.hull;
    const raw = dmg + hull / 4, cs = gearCombat(gear), bf = buildFactor(cs);
    return { dmg: Math.floor(dmg), hull: Math.floor(hull), power: Math.round(raw), raw, set: sb, codex: codexB, combat: cs, build: bf, rating: raw * bf };
  }
  function power(state) { return calcPower(state.gear, codexBonus(state), statBonus(state)); }
  // what your Power would be with this part fitted instead of what is in its slot
  function powerWith(state, it) { const g = Object.assign({}, state.gear); g[it.slot] = it; return calcPower(g, codexBonus(state), statBonus(state)); }
  function highestTier(state) { let h = -1; SLOTS.forEach((s) => { const it = state.gear[s.id]; if (it && it.tier > h) h = it.tier; }); return h; }
  const autoUnlocked = (state) => state.forge.level >= CFG.AUTO_UNLOCK_LEVEL;

  function addCredits(state, n) { state.credits += n; state.stats.creditsEarned += n; }
  function isUpgrade(state, it) { return powerWith(state, it).rating > power(state).rating + 1e-9; }

  function equip(state, it) {
    const old = state.gear[it.slot];
    let sold = 0;
    if (old) { sold = sellFor(state, old); addCredits(state, sold); state.stats.sold++; }
    state.gear[it.slot] = it; state.stats.equipped++;
    if (it.tier > state.stats.bestTier) state.stats.bestTier = it.tier;
    return sold;
  }
  const sellFor = (state, it) => Math.max(1, Math.round(sellValue(it) * creditMult(state)));
  function sell(state, it) { const v = sellFor(state, it); addCredits(state, v); state.stats.sold++; return v; }

  function forgeCost() { return CFG.ALLOY_COST; }
  // does this part have the bonus lines you asked Auto-Salvage to keep?
  function matchesFilter(state, it) {
    const f = state.settings.filter || [];
    if (!f.length || !it.subs) return false;
    return it.subs.filter((x) => f.includes(x.k)).length >= (state.settings.filterMin || 1);
  }
  function stashItem(state, it) { if (holdFree(state) <= 0) return false; state.hold.push(it); return true; }

  // Single forge. Returns { ok, item, auto: 'equipped'|'sold'|null, isNew, tierDone }
  function forgeOnce(state, rng) {
    const cost = forgeCost(state);
    if (state.alloy < cost) return { ok: false, reason: 'alloy' };
    state.alloy -= cost; state.stats.forged++;
    const it = rollItem(state.forge.level, rng);
    const lv = addXp(state, it.tier);
    const d = discover(state, it);
    if (state.pending) { sell(state, state.pending); state.pending = null; } // an undecided item is salvaged
    state.pendingNew = false;
    if (state.settings.auto && autoUnlocked(state)) {
      if (isUpgrade(state, it)) { equip(state, it); return { ok: true, item: it, auto: 'equipped', isNew: d.isNew, tierDone: d.tierDone, levels: lv }; }
      if (matchesFilter(state, it) && stashItem(state, it)) return { ok: true, item: it, auto: 'kept', isNew: d.isNew, tierDone: d.tierDone, levels: lv };
      sell(state, it); return { ok: true, item: it, auto: 'sold', isNew: d.isNew, tierDone: d.tierDone, levels: lv };
    }
    state.pending = it; state.pendingNew = d.isNew;
    return { ok: true, item: it, auto: null, isNew: d.isNew, tierDone: d.tierDone, levels: lv };
  }

  // Forge many at once: keep upgrades, sell the rest. Returns a summary.
  function forgeBatch(state, n, rng) {
    const sum = { kept: 0, forged: 0, equipped: 0, sold: 0, credits: 0, best: null, newParts: 0, tiersDone: [], levels: 0 };
    const c0 = state.credits;
    if (state.pending) { sell(state, state.pending); state.pending = null; state.pendingNew = false; }
    while (sum.forged < n && state.alloy >= forgeCost(state)) {
      state.alloy -= forgeCost(state); state.stats.forged++; sum.forged++;
      const it = rollItem(state.forge.level, rng);
      sum.levels += addXp(state, it.tier);
      const d = discover(state, it); if (d.isNew) sum.newParts++; if (d.tierDone) sum.tiersDone.push(it.tier);
      if (!sum.best || it.tier > sum.best.tier) sum.best = it;
      if (isUpgrade(state, it)) { equip(state, it); sum.equipped++; } else if (matchesFilter(state, it) && stashItem(state, it)) { sum.kept++; } else { sell(state, it); sum.sold++; }
    }
    sum.credits = state.credits - c0;
    return sum;
  }

  /* ----- cargo hold ----- */
  const holdFree = (state) => state.holdCap - state.hold.length;
  function stashPending(state) {
    if (!state.pending || holdFree(state) <= 0) return false;
    state.hold.push(state.pending); state.pending = null; state.pendingNew = false; return true;
  }
  // swap: the held part is fitted and the old fitted part takes its place in the hold
  function equipFromHold(state, i) {
    const it = state.hold[i]; if (!it) return false;
    const old = state.gear[it.slot];
    state.hold.splice(i, 1);
    if (old) state.hold.push(old);
    state.gear[it.slot] = it; state.stats.equipped++;
    if (it.tier > state.stats.bestTier) state.stats.bestTier = it.tier;
    return true;
  }
  function sellFromHold(state, i) { const it = state.hold[i]; if (!it) return 0; state.hold.splice(i, 1); return sell(state, it); }
  function sellAllHold(state) { let t = 0; while (state.hold.length) t += sell(state, state.hold.pop()); return t; }
  function unfit(state, slot) {
    const it = state.gear[slot]; if (!it || holdFree(state) <= 0) return false;
    state.gear[slot] = null; state.hold.push(it); return true;
  }
  function holdUpgrade(state) {
    const k = (state.holdCap - CFG.HOLD_START) / CFG.HOLD_STEP;
    if (state.holdCap >= CFG.HOLD_MAX) return { maxed: true };
    return { maxed: false, cost: CFG.HOLD_COST(k), to: state.holdCap + CFG.HOLD_STEP };
  }
  function buyHold(state) {
    const u = holdUpgrade(state); if (u.maxed || state.credits < u.cost) return false;
    state.credits -= u.cost; state.holdCap = u.to; return true;
  }

  function equipPending(state) { if (!state.pending) return null; const it = state.pending; state.pending = null; state.pendingNew = false; return { item: it, sold: equip(state, it) }; }
  function sellPending(state) { if (!state.pending) return 0; const it = state.pending; state.pending = null; state.pendingNew = false; return sell(state, it); }


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
    if (isBoss(stage)) return { stage, boss: true, type: 'boss', name: sec.boss, pe, dmg: Math.max(1, Math.round(pe * ATK_SHARE)), hull: Math.max(5, Math.round(pe * HULL_SHARE * BOSS_HM)), speed: 100, armor: 0, crit: 0 };
    const key = PATTERN[(stage % 10) - 1], f = FOES[key];
    return { stage, boss: false, type: key, name: sec.name + ' ' + f.name, pe, dmg: Math.max(1, Math.round(pe * ATK_SHARE * f.dm)), hull: Math.max(5, Math.round(pe * HULL_SHARE * f.hm)), speed: f.speed, armor: f.armor, crit: f.crit };
  }
  /* ===================== WING (companions) ===================== */
  const wingKey = (sp, rank) => sp + ':' + rank;
  const parseKey = (k) => { const [sp, r] = k.split(':'); return { sp: +sp, rank: +r }; };
  const bayLevel = (state) => Math.min(CFG.BAY_MAX, 1 + Math.floor(state.wing.summons / CFG.BAY_STEP));
  function summonOdds(level) {
    const w = CFG.SUMMON_BASE.map((x, r) => x * Math.pow(1 + CFG.SUMMON_SHIFT * (level - 1), r));
    const sum = w.reduce((a, b) => a + b, 0); return w.map((x) => x / sum);
  }
  function usedInWing(state, key) { return state.wing.active.filter((k) => k === key).length; }
  function trimWing(state) {
    const seen = {}, keep = [];
    state.wing.active.forEach((k) => { seen[k] = (seen[k] || 0) + 1; if (seen[k] <= (state.wing.owned[k] || 0)) keep.push(k); });
    state.wing.active = keep;
  }
  function summon(state, n, rng) {
    const cost = n === 10 ? CFG.SUMMON10_COST : CFG.SUMMON_COST * n;
    if (state.cores < cost) return { ok: false, reason: 'cores' };
    state.cores -= cost; const got = [];
    for (let i = 0; i < n; i++) {
      const odds = summonOdds(bayLevel(state)); let r = rng(), rank = 0;
      for (let k = 0; k < odds.length; k++) { r -= odds[k]; if (r <= 0) { rank = k; break; } rank = k; }
      const sp = Math.floor(rng() * SPECIES.length) % SPECIES.length, key = wingKey(sp, rank);
      state.wing.owned[key] = (state.wing.owned[key] || 0) + 1; state.wing.summons++; got.push({ sp, rank });
    }
    // fill empty wing slots automatically with the first companions you ever get
    got.forEach((g) => { if (state.wing.active.length < CFG.WING_SLOTS) state.wing.active.push(wingKey(g.sp, g.rank)); });
    return { ok: true, got };
  }
  function assign(state, key) {
    if (state.wing.active.length >= CFG.WING_SLOTS) return false;
    if (usedInWing(state, key) >= (state.wing.owned[key] || 0)) return false;
    state.wing.active.push(key); return true;
  }
  function unassign(state, i) { if (i < 0 || i >= state.wing.active.length) return false; state.wing.active.splice(i, 1); return true; }
  function canFuse(state, key) { const p = parseKey(key); return (state.wing.owned[key] || 0) >= CFG.FUSE_NEED && p.rank < RANKS.length - 1; }
  function fuse(state, key) {
    if (!canFuse(state, key)) return false;
    const p = parseKey(key), up = wingKey(p.sp, p.rank + 1);
    state.wing.owned[key] -= CFG.FUSE_NEED; if (state.wing.owned[key] <= 0) delete state.wing.owned[key];
    state.wing.owned[up] = (state.wing.owned[up] || 0) + 1; state.stats.fused++;
    trimWing(state); return up;
  }
  function fuseAll(state) {
    let n = 0, again = true;
    while (again) {
      again = false;
      const keys = Object.keys(state.wing.owned).sort((a, b) => parseKey(a).rank - parseKey(b).rank);
      for (const k of keys) if (canFuse(state, k)) { fuse(state, k); n++; again = true; break; }
    }
    return n;
  }
  // numbers for one companion
  function companionInfo(key) {
    const p = parseKey(key), sp = SPECIES[p.sp], f = CFG.RANK_F[p.rank];
    return { sp, rank: p.rank, f, amount: Math.round(sp.a * f), speed: sp.speed, rankName: RANKS[p.rank], color: RANK_COLORS[p.rank], text: sp.blurb.replace('{a}', Math.round(sp.a * f)) };
  }

  /* ===================== FIGHTING ===================== */
  function fighter(state) {
    const p = power(state), c = p.combat;
    return {
      dmg: Math.max(1, p.dmg), hull: Math.max(1, p.hull), speed: 100 * (1 + c.haste),
      crit: c.crit, critMult: c.critMult, ocMult: c.ocMult, armor: c.armor, dodge: c.dodge, leech: c.leech, pierce: c.pierce,
      wing: state.wing.active.map((k) => { const i = companionInfo(k); return { id: i.sp.id, name: i.sp.name, speed: i.speed, f: i.f, a: i.sp.a }; })
    };
  }

  // Plays a whole fight instantly and returns every turn so the screen can replay it.
  function simulateFight(p, e, rng) {
    p = Object.assign({ speed: 100, crit: CFG.CRIT_CHANCE, critMult: CFG.CRIT_MULT, ocMult: CFG.OVERCHARGE_MULT, armor: 0, dodge: 0, leech: 0, pierce: 0, wing: [] }, p);
    const events = [], pmax = p.hull;
    let php = p.hull, ehp = e.hull, shield = 0, np = 0, ne = 0, amp = 1, slowActs = 0, slowF = 0;
    const actors = [{ id: 'p', t: 100 / p.speed, period: 100 / p.speed, order: 0 }];
    p.wing.forEach((c, i) => actors.push({ id: 'c', c, t: 100 / c.speed, period: 100 / c.speed, order: 1 + i }));
    actors.push({ id: 'e', t: 100 / e.speed, period: 100 / e.speed, order: 99 });
    const push = (o) => { o.php = php; o.ehp = ehp; o.shield = Math.round(shield); events.push(o); };
    const hit = (base, ign) => { const ar = e.armor * (1 - (ign ? 1 : p.pierce)); return Math.max(1, Math.round(base * (0.8 + rng() * 0.4) * (1 - ar))); };
    let guard = 0;
    while (php > 0 && ehp > 0 && guard++ < 700) {
      let a = actors[0];
      for (const x of actors) if (x.t < a.t - 1e-9 || (Math.abs(x.t - a.t) <= 1e-9 && x.order < a.order)) a = x;
      if (a.id === 'p') {
        np++; let m = amp, label = null; amp = 1;
        if (np % CFG.OVERCHARGE_EVERY === 0) { m *= p.ocMult; label = 'overcharge'; }
        const crit = rng() < p.crit; if (crit) m *= p.critMult;
        const d = hit(p.dmg * m); ehp = Math.max(0, ehp - d);
        const heal = Math.round(d * p.leech); if (heal) php = Math.min(pmax, php + heal);
        push({ who: 'p', dmg: d, crit, label, heal }); a.t += a.period;
      } else if (a.id === 'c') {
        const c = a.c; let ev = { who: 'c', name: c.name, kind: c.id };
        if (c.id === 'hornet') { const d = hit(p.dmg * c.a / 100 * c.f); ehp = Math.max(0, ehp - d); ev.dmg = d; }
        else if (c.id === 'longbow') { const d = hit(p.dmg * c.a / 100 * c.f, true); ehp = Math.max(0, ehp - d); ev.dmg = d; }
        else if (c.id === 'mender') { const h = Math.round(pmax * c.a / 100 * c.f); const before = php; php = Math.min(pmax, php + h); ev.heal = php - before; }
        else if (c.id === 'aegis') { const sh = Math.round(pmax * c.a / 100 * c.f); shield = Math.min(pmax * 0.6, shield + sh); ev.shieldGain = sh; }
        else if (c.id === 'static') { slowActs = 2; slowF = Math.min(0.9, c.a / 100 * c.f); ev.slow = true; }
        else if (c.id === 'surge') { amp = Math.max(amp, 1 + c.a / 100 * c.f); ev.amp = true; }
        push(ev); a.t += a.period;
      } else {
        ne++; let m = 1, label = null;
        if (e.boss && ne % 3 === 0) { m = 2; label = 'salvo'; }
        const crit = e.crit > 0 && rng() < e.crit; if (crit) m *= CFG.CRIT_MULT;
        let d = Math.max(1, Math.round(e.dmg * m * (0.8 + rng() * 0.4))), dodged = false;
        if (rng() < p.dodge) { d = 0; dodged = true; } else d = Math.max(1, Math.round(d * (1 - p.armor)));
        let absorbed = 0; if (shield > 0 && d > 0) { absorbed = Math.min(shield, d); shield -= absorbed; d -= absorbed; }
        php = Math.max(0, php - d);
        push({ who: 'e', dmg: d, crit, label, dodged, absorbed });
        a.t += a.period * (1 + (slowActs > 0 ? slowF : 0)); if (slowActs > 0) slowActs--;
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

  const creditsWin = (stage, state) => Math.round(CFG.CREDITS_WIN(stage) * (isBoss(stage) ? 3 : 1) * (state ? creditMult(state) : 1));
  const shardsFor = (stage) => isBoss(stage) ? CFG.SHARD_BOSS(stage / 10) : (stage % 10 === 5 ? CFG.SHARD_FIFTH : 0);
  function describeRewards(state, stage) {
    const first = stage > state.combat.best;
    const cr = creditsWin(stage, state) * (first ? CFG.FIRST_CLEAR_X : 1);
    let flux = 0, cores = 0, shards = first ? shardsFor(stage) : 0; if (first) cores = isBoss(stage) ? CFG.CORE_BOSS : CFG.CORE_FIRST;
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
    rep.cores = r.cores + (rng() < CFG.CORE_DROP ? 1 : 0); state.cores += rep.cores;
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
    { id: 'shards', name: 'Data Heist',  glyph: '▤', blurb: 'Raid a data vault for Data Shards.', reward: (n) => ({ shards: 1 + Math.floor((n - 1) / 50) }), text: (r) => r.shards + ' Data Shards' },
    { id: 'cores',  name: 'Clan Convoy', glyph: '✈', blurb: 'Escort the clan convoy for AI Cores. Needs a clan.', reward: (n) => ({ cores: 1 + Math.floor((n - 1) / 25) }), clan: true, text: (r) => r.cores + ' AI Cores' }
  ];
  const dailyById = (id) => DAILIES.find((d) => d.id === id);
  // Everything with a daily limit resets at midnight UTC.
  function rollDaily(state, now) {
    const key = utcDay(now), d = state.daily;
    if (d.day !== key) { d.day = key; d.att = {}; d.arena = 0; d.shop = {}; d.clan = []; d.clanPts = 0; d.gift = false; d.deals = {}; d.ads = {}; }
    return d;
  }
  const attemptsLeft = (state, id, now) => { rollDaily(state, now); return CFG.DAILY_ATTEMPTS - (state.daily.att[id] || 0); };
  function applyReward(state, r) {
    if (r.alloy) { state.alloy += r.alloy; state.stats.alloyEarned += r.alloy; }
    if (r.shards) state.shards += r.shards;
    if (r.cores) state.cores += r.cores;
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
    if (f.win) { state.ladders[id] = n; out.reward = d.reward(n); applyReward(state, out.reward); state.stats.wins++; if (d.clan) addClanPoints(state, CFG.CLAN_WIN_POINTS); } else state.stats.losses++;
    return out;
  }
  // Sweep the last ladder stage you cleared: costs one sweep ticket, no fight, no attempt.
  function ladderSweep(state, id, now) {
    const d = dailyById(id); if (!d || ladderLocked(state, id)) return null;
    const n = state.ladders[id]; if (n < 1) return null;
    if (!useTicket(state, now)) return null;
    const r = d.reward(n); applyReward(state, r); if (d.clan) addClanPoints(state, CFG.CLAN_WIN_POINTS);
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
  const arenaLeft = (state, now) => { rollDaily(state, now); return CFG.ARENA_ATTEMPTS - state.daily.arena; };
  function arenaFight(state, idx, rng, now) {
    const opp = arenaOpponents(state, now)[idx]; if (!opp) return { ok: false, reason: 'none' };
    if (arenaLeft(state, now) <= 0) return { ok: false, reason: 'attempts' };
    state.daily.arena++;
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
    { id: 'credits', name: 'Supply cache',   text: 'about 40 patrol fights of Credits', cap: 4, cdS: 1800 },
    { id: 'speed',   name: 'Rush crew',      text: 'Foundry upgrade 20 minutes faster', cap: 3, cdS: 3600 },
    { id: 'flux',    name: 'Flux cell',      text: '+2 Flux',                      cap: 3, cdS: 3600 }
  ];
  const adCredits = (state) => Math.round(creditsWin(Math.max(1, state.combat.best), state) * 40);
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
    const a = state.daily.ads[id] || (state.daily.ads[id] = { n: 0, at: 0 }); a.n++; a.at = now; return true;
  }
  function claimGift(state, now) { rollDaily(state, now); if (state.daily.gift) return false; state.daily.gift = true; state.alloy += 100; state.stats.alloyEarned += 100; return true; }
  const DEAL_POOL = [
    { id: 'alloy200', name: 'Alloy bundle',   cost: 20, text: '200 Alloy' },
    { id: 'alloy600', name: 'Alloy crate',    cost: 50, text: '600 Alloy' },
    { id: 'cores10',  name: 'Core shipment',  cost: 30, text: '10 AI Cores' },
    { id: 'shards4',  name: 'Data vault',     cost: 40, text: '4 Data Shards' },
    { id: 'credits',  name: 'Credit chest',   cost: 25, text: 'about 150 campaign wins of Credits' },
    { id: 'tickets2', name: 'Sweep voucher',  cost: 15, text: '2 sweep tickets' }
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
    else if (id === 'cores10') applyReward(state, { cores: 10 }); else if (id === 'shards4') applyReward(state, { shards: 4 });
    else if (id === 'credits') addCredits(state, Math.round(creditsWin(Math.max(1, state.combat.best), state) * 150));
    else if (id === 'tickets2') state.sweep.tickets += 2;
    return true;
  }
  // stand-in for the one-time "remove ads" purchase: rewards then claim with no video
  function buyNoAds(state) { state.noAds = true; return true; }

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
    return { maxed: false, from: L, to: L + 1, credits: CFG.UPGRADE_CREDITS(L), seconds: upgradeSecs(state, L) };
  }
  function startUpgrade(state, now) {
    const u = upgradeInfo(state);
    if (u.maxed || state.forge.upgrade) return { ok: false, reason: u.maxed ? 'max' : 'busy' };
    if (state.credits < u.credits) return { ok: false, reason: 'credits' };
    state.credits -= u.credits;
    state.forge.upgrade = { to: u.to, endAt: now + u.seconds * 1000, startAt: now };
    return { ok: true };
  }
  // finishes the upgrade if its time is up; returns the new level or 0
  function checkUpgrade(state, now) {
    const up = state.forge.upgrade;
    if (up && now >= up.endAt) { state.forge.level = up.to; state.forge.upgrade = null; state.stats.upgrades++; return up.to; }
    return 0;
  }

  // Add Alloy for dt seconds while the screen is open.
  function earn(state, dt) {
    const gain = alloyRate(state) * dt;
    state.alloy += gain; state.stats.alloyEarned += gain; state.stats.seconds += dt;
    return gain;
  }

  // Everything that happens while the app was closed. Production counts for your offline time (4 hours to start).
  function offline(state, now) {
    const away = Math.max(0, (now - state.last) / 1000), cap = offlineCapS(state);
    const rep = { away, cap, alloy: 0, levelUp: 0, capped: away > cap };
    if (away < 1) return rep;
    const counted = Math.min(away, cap);
    const gain = alloyRate(state) * counted;
    state.alloy += gain; state.stats.alloyEarned += gain; rep.alloy = gain;
    // Foundry timers run in real time whether or not the app is open
    const l = checkUpgrade(state, now); if (l) rep.levelUp = l;
    // your ship keeps patrolling the best cleared stage while you are away
    rep.patrolCredits = 0; rep.patrolCores = 0;
    if (state.combat.best >= 1) {
      const wins = Math.floor(counted / CFG.FIGHT_SECONDS);
      rep.patrolCredits = Math.floor(wins * creditsWin(state.combat.best, state) * CFG.PATROL_RATE);
      rep.patrolWins = wins; addCredits(state, rep.patrolCredits);
      rep.patrolCores = Math.floor(wins * CFG.CORE_DROP * CFG.PATROL_RATE); state.cores += rep.patrolCores;
    }
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

  const api = { SUBS, SUB_KEYS, SLOT_SUBS, RANKS, RANK_COLORS, SPECIES, gearCombat, buildFactor, rollSubs, matchesFilter, wingKey, parseKey, bayLevel, summonOdds, summon, assign, unassign, canFuse, fuse, fuseAll, companionInfo, usedInWing, CFG, SLOTS, TIERS, LAUNCH_TIERS, slotById, itemStat, itemName, sellValue, sellFor, tierOdds, rollItem, newState, migrate, power, powerWith, calcPower, setBonus, codexKey, codexHas, codexTierCount, codexCount, codexBonus, discover, holdFree, stashPending, equipFromHold, sellFromHold, sellAllHold, unfit, holdUpgrade, buyHold, highestTier, SECTORS, FOES, sectorOf, isBoss, enemyFor, fighter, simulateFight, creditsWin, describeRewards, resolveFight, setStage, winChance, rushCost, rushUpgrade, autoUnlocked, isUpgrade, equip, forgeCost, forgeOnce, forgeBatch, maxForges, equipPending, sellPending, upgradeInfo, startUpgrade, checkUpgrade, earn, offline, fmt, fmtTime, stageLabel, shardsFor, AD_OFFERS, adStatus, claimAd, claimGift, DEAL_POOL, dealsToday, buyDeal, buyNoAds, useTicket, sweepInfo, sweepAd, DAILIES, dailyById, rollDaily, attemptsLeft, ladderEnemy, ladderLocked, ladderFight, ladderSweep, LEAGUES, leagueOf, arenaOpponents, arenaLeft, arenaFight, SHOP, shopBuy, CLANS, CLAN_REWARDS, joinClan, leaveClan, addClanPoints, clanProgress, claimClan, utcDay, RANK_NAMES, RESEARCH, rLevel, researchCost, buyResearch, alloyRate, offlineCapS, creditMult, statBonus, addXp, levelCap, atCap, questGoals, rankReward, canPromote, promote };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.VS = api;
})(typeof self !== 'undefined' ? self : this);
