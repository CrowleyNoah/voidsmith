const V = require('../core.js'); const assert = require('assert');
const S = () => V.newState(0);
const part = (slot, tier, level) => ({ slot, tier, level: level || 1 });
let s = S();
// set bonus
V.SLOTS.slice(0, 4).forEach((x) => { s.gear[x.id] = part(x.id, 2); });
assert.strictEqual(V.setBonus(s.gear).bonus, V.CFG.SET4[2]); assert.strictEqual(V.setBonus(s.gear).tier, 2);
V.SLOTS.slice(4).forEach((x) => { s.gear[x.id] = part(x.id, 2); });
assert.strictEqual(V.setBonus(s.gear).bonus, V.CFG.SET8[2]); assert.strictEqual(V.setBonus(s.gear).pieces, 8);
// 3 high + 5 low: counts tier-or-better, best of tiers
s = S(); V.SLOTS.forEach((x, i) => { s.gear[x.id] = part(x.id, i < 3 ? 4 : 0); });
assert.strictEqual(V.setBonus(s.gear).bonus, V.CFG.SET8[0]); // all 8 are tier >= 0
// codex
s = S(); assert.ok(V.discover(s, part('cannon', 0)).isNew); assert.ok(!V.discover(s, part('cannon', 0)).isNew);
V.SLOTS.forEach((x) => V.discover(s, part(x.id, 1)));
assert.strictEqual(V.codexTierCount(s, 1), 8); assert.strictEqual(V.codexCount(s), 9);
assert.ok(Math.abs(V.codexBonus(s) - (9 * V.CFG.CODEX_PART + V.CFG.CODEX_TIER)) < 1e-9);
// powerWith / upgrade decision is power-based
s = S(); const a = part('cannon', 0, 1); assert.ok(V.isUpgrade(s, a)); s.gear.cannon = a;
assert.ok(!V.isUpgrade(s, part('cannon', 0, 1))); assert.ok(V.isUpgrade(s, part('cannon', 1, 1)));
// migrate old save (step 1) keeps working
const old = JSON.parse(JSON.stringify(S())); delete old.codex; old.hold = [part('pod', 1, 1)];
const m = V.migrate(old, 0); assert.ok(!('hold' in m) && typeof m.codex === 'object' && m.credits > 0);
// forge flow stays sane over many random forges
let seed = 3; const rng = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
s = S(); s.alloy = 1e6; V.forgeBatch(s, 3000, rng); assert.ok(V.codexCount(s) > 0 && isFinite(V.power(s).power));
// a step-1 style save with partial stats must get every default key (no NaN)
const p1 = V.migrate({ v: 1, name: 'N', alloy: 5, credits: 5, forge: { level: 3, upgrade: null }, gear: {}, stats: { forged: 4 }, settings: {} }, 0);
assert.strictEqual(p1.stats.wins, 0); assert.strictEqual(p1.stats.seconds, 0); assert.strictEqual(p1.combat.best, 0); assert.strictEqual(p1.flux, 0); assert.strictEqual(p1.stats.forged, 4);
// combat: rewards, first clear, fall-back, boss flux
s = S(); let r0 = V.resolveFight(s, 1, true); assert.ok(r0.first && s.combat.best === 1 && s.combat.stage === 2 && r0.credits === V.CFG.CREDITS_WIN(1) * V.CFG.FIRST_CLEAR_X);
r0 = V.resolveFight(s, 2, false); assert.strictEqual(s.combat.stage, 1);
s.combat.best = 9; s.combat.stage = 10; r0 = V.resolveFight(s, 10, true); assert.strictEqual(r0.flux, V.CFG.FLUX_BOSS); assert.strictEqual(s.flux, V.CFG.FLUX_BOSS);
s.combat.push = false; s.combat.best = 20; s.combat.stage = 5; V.resolveFight(s, 5, true); assert.strictEqual(s.combat.stage, 5);
// rush
s = S(); s.flux = 50; s.forge.upgrade = { to: 2, startAt: 0, endAt: 1000 * 600 }; assert.strictEqual(V.rushCost(s, 0), 2); assert.ok(V.rushUpgrade(s, 0)); assert.strictEqual(s.flux, 48); assert.ok(V.checkUpgrade(s, 0));
// fights are finite and never produce NaN
for (let st = 1; st <= V.CFG.MAX_STAGE; st++) { const e = V.enemyFor(st); const f = V.simulateFight({ dmg: 100, hull: 500, speed: 100 }, e, rng); assert.ok(f.events.length > 0 && f.events.length <= 240 && isFinite(e.dmg) && isFinite(e.hull)); }
// ---- step 4: bonus lines, build factor, reforge, filter
let sd = 9; const rg = () => (sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296;
s = S(); assert.ok(Math.abs(V.power(s).build - 1) < 1e-9);
for (let t = 0; t < 6; t++) for (const sl of V.SLOTS) { const it = { slot: sl.id, tier: t, level: 1, subs: V.rollSubs(sl.id, t, rg) }; assert.strictEqual(it.subs.length, Math.min(V.CFG.SUB_COUNT[t], 6)); assert.strictEqual(new Set(it.subs.map((x) => x.k)).size, it.subs.length); it.subs.forEach((x) => assert.ok(V.SLOT_SUBS[sl.id].includes(x.k) && x.v > 0)); }
s = S(); s.gear.cannon = { slot: 'cannon', tier: 3, level: 5, subs: [{ k: 'crit', v: 8 }, { k: 'critdmg', v: 30 }, { k: 'haste', v: 6 }] };
assert.ok(V.power(s).build > 1); const cc = V.gearCombat(s.gear); assert.ok(cc.crit > 0 && cc.haste > 0);
const base = { slot: 'cannon', tier: 3, level: 5, subs: [] }; const better = { slot: 'cannon', tier: 3, level: 5, subs: [{ k: 'crit', v: 20 }, { k: 'critdmg', v: 40 }] };
s.gear.cannon = base; assert.ok(V.isUpgrade(s, better)); s.gear.cannon = better; assert.ok(!V.isUpgrade(s, base));
// sub counts and auto filter
[0, 0, 1, 1, 1, 1, 2, 2, 2, 2].forEach((n, t) => assert.strictEqual(V.CFG.SUB_COUNT[t], n));
{ const a = S(); a.forge.level = 5; a.settings.auto = true; const two = { slot: 'cannon', tier: 7, level: 5, subs: [{ k: 'crit', v: 5 }, { k: 'haste', v: 5 }] };
  assert.ok(!V.autoFiltered(a, two)); a.settings.autoSubs = ['haste']; assert.ok(!V.autoFiltered(a, two)); a.settings.autoSubs = ['leech']; assert.ok(V.autoFiltered(a, two));
  a.settings.autoSubs = []; a.settings.autoTiers = [7]; assert.ok(V.autoFiltered(a, two)); a.settings.auto = false; assert.ok(!V.autoFiltered(a, two)); }
// hold bar: holds as many as you can forge at once, equipping keeps the old part for swapping back
{ const h = S(); h.alloy = 100; const mk = (t, l) => ({ slot: 'cannon', tier: t, level: l, subs: [] });
  V.holdAdd(h, mk(0, 1), true); assert.strictEqual(V.holdFree(h), 0); assert.strictEqual(V.forgeOnce(h, () => 0.5).reason, 'full'); assert.strictEqual(h.held.length, 1);   // batch size 1: bar full, cannot forge
  h.held[0].it = mk(1, 1);
  h.gear.cannon = mk(0, 1); const r = V.equipHeld(h, 0); assert.ok(r && r.old && h.gear.cannon.tier === 1 && h.held.length === 1 && h.held[0].it.tier === 0 && r.index === 0);   // old part stays
  const r2 = V.equipHeld(h, 0); assert.ok(r2 && h.gear.cannon.tier === 0 && h.held[0].it.tier === 1);   // swapped back
  const cr = h.credits; assert.ok(V.sellHeld(h, 0) > 0 && h.held.length === 0 && h.credits > cr);
  h.alloy = 50; h.research.batch = 2; const bs = V.batchSize(h); const f = V.forgeHold(h, bs, () => 0.5); assert.strictEqual(f.forged, bs); assert.strictEqual(h.held.length, bs);
  // run: keeps only the target tier or better, stops when full
  const q = S(); q.alloy = 5000; q.forge.level = 12; q.research.batch = 2; const cap = V.batchSize(q); let rr = { full: false }, rounds = 0; q.credits = 0;
  while (!rr.full && rounds++ < 2000) rr = V.forgeRun(q, cap, rg, [2, 4]);
  assert.ok(rr.full && q.held.length === cap && q.held.every((x) => x.it.tier === 2 || x.it.tier === 4) && q.credits > 0); assert.strictEqual(V.forgeRun(q, cap, rg, [2, 4]).forged, 0);
  const q2 = S(); q2.alloy = 3; q2.research.batch = 2; assert.ok(V.forgeRun(q2, 4, rg, [9]).out); }
// gear level follows commander level +-2, never below 1 or above the max
{ const g = S(); [1, 3, 150, V.CFG.LEVEL_MAX].forEach((cl) => { const seen = new Set(); for (let i = 0; i < 300; i++) { const it = V.rollItem(12, rg, cl); seen.add(it.level); assert.ok(it.level >= Math.max(1, cl - 2) && it.level <= Math.min(V.CFG.LEVEL_MAX, cl + 2)); } assert.ok(seen.size >= (cl === 1 || cl === V.CFG.LEVEL_MAX ? 3 : 5)); }); }
// drones: summon (3 at a time), stars from copies, levels, reset, links, abilities
s = S(); s.cores = 100; const sr = V.summon(s, rg); assert.ok(sr.ok && sr.got.length === 3 && s.cores === 100 - V.CFG.SUMMON_COST && s.drones.summons === 1 && s.drones.active);
s = S(); s.cores = 29; assert.ok(!V.summon(s, rg).ok);
s = S(); assert.strictEqual(V.freeSummonsLeft(s, 1000), 3); for (let i = 0; i < 3; i++) assert.ok(V.summonFree(s, rg, 1000).ok); assert.ok(!V.summonFree(s, rg, 1000).ok); assert.strictEqual(V.freeSummonsLeft(s, 86400000 * 2), 3);
{ const odds = V.CFG.DRONE_ODDS, tot = odds.reduce((x, y) => x + y, 0); assert.ok(Math.abs(tot - 100) < 1e-9 && odds[4] < odds[3] && odds[3] < odds[2]);
  const cnt = [0, 0, 0, 0, 0]; const t = S(); for (let i = 0; i < 4000; i++) V.summon(Object.assign(t, { cores: 99 }), rg).got.forEach((g) => cnt[g.rar]++); assert.ok(cnt[0] > cnt[1] && cnt[1] > cnt[2] && cnt[2] > cnt[3] && cnt[3] > cnt[4] && cnt[4] > 0, cnt.join()); }
{ const rar = [0, 0, 0, 0, 0]; V.DRONES.forEach((d) => rar[d.rar]++); assert.deepStrictEqual(rar, [10, 9, 8, 6, 4]); assert.strictEqual(V.DRONES.length, 37);
  const seen = {}; V.LINKS.forEach((L) => L.ids.forEach((id) => { assert.ok(V.DRONE_BY[id], id); seen[id] = (seen[id] || 0) + 1; })); assert.ok(V.DRONES.every((d) => seen[d.id] === 1), 'every drone is in exactly one link'); assert.ok(V.LINKS.every((L) => new Set(L.ids.map((id) => V.DRONE_BY[id].rar)).size >= 3), 'links mix rarities'); }
s = S(); V.giveDrone(s, 'hornet', 1); assert.strictEqual(s.drones.active, 'hornet'); assert.ok(!V.canFuse(s, 'hornet'));
for (let i = 0; i < 12; i++) V.giveDrone(s, 'hornet', 1); // 13 copies in total
assert.strictEqual(V.fuseAll(s), 10); assert.strictEqual(s.drones.own.hornet.s, 10); assert.strictEqual(s.drones.own.hornet.c, 2); assert.ok(!V.canFuse(s, 'hornet'));
assert.deepStrictEqual(V.abilityLevels(0), [1, 0, 0]); assert.deepStrictEqual(V.abilityLevels(3), [2, 1, 0]); assert.deepStrictEqual(V.abilityLevels(10), [4, 4, 3]); assert.deepStrictEqual(V.abilityLevels(6), [3, 2, 1]);
// first ability at star 0, a star-0 drone has exactly 1 ability, 11 copies reach star 10
s = S(); V.giveDrone(s, 'nova', 11); assert.strictEqual(V.droneAbilities(s, 'nova').length, 1); V.fuseAll(s); assert.strictEqual(s.drones.own.nova.s, 10); assert.strictEqual(V.droneAbilities(s, 'nova').length, 3);
{ const t = S(); V.giveDrone(t, 'hornet', 1); const a0 = V.droneAbilities(t, 'hornet')[0].fx[0].a; t.drones.own.hornet.s = 1; const a1 = V.droneAbilities(t, 'hornet')[0].fx[0].a; assert.ok(Math.abs(a1 / a0 - 1.22) < 1e-9, 'each upgrade is +22% (45% -> 55%)'); }
// levels cost Nanites, rarer drones start and grow stronger, reset refunds everything for Flux
s = S(); V.giveDrone(s, 'hornet', 1); s.nanites = 1e6; assert.strictEqual(V.levelCost(1), 500); assert.ok(V.levelCost(2) > V.levelCost(1)); assert.ok(Math.abs(V.levelCost(64) - 7000) < 600);
assert.strictEqual(V.levelUp(s, 'hornet', 5), 5); assert.strictEqual(s.drones.own.hornet.l, 6); const spent = 1e6 - s.nanites; assert.ok(spent > 2500);
s.flux = 9; assert.ok(!V.resetDrone(s, 'hornet')); s.flux = 10; assert.ok(V.resetDrone(s, 'hornet')); assert.strictEqual(s.nanites, 1e6); assert.strictEqual(s.drones.own.hornet.l, 1); assert.strictEqual(s.flux, 0);
V.levelUp(s, 'hornet', 999); assert.strictEqual(s.drones.own.hornet.l, V.CFG.DRONE_LEVEL_MAX);
assert.ok(V.droneStat(V.DRONE_BY.nova, 1) === 16 && V.droneStat(V.DRONE_BY.hornet, 1) === 6 && V.droneStat(V.DRONE_BY.nova, 60) > V.droneStat(V.DRONE_BY.hornet, 60));
// the active drone and links change your stats
s = S(); s.gear.cannon = part('cannon', 3, 5); const dm0 = V.power(s).dmg; V.giveDrone(s, 'nova', 1); const dm1 = V.power(s).dmg; assert.ok(dm1 > dm0 * 1.15 && dm1 < dm0 * 1.17, 'UR level 1 = +16%: ' + dm1 / dm0);
V.giveDrone(s, 'hornet', 1); s.drones.active = 'nova';
{ const L = V.LINKS[0], t = S(); L.ids.forEach((id) => V.giveDrone(t, id, 1)); t.drones.active = ''; const i0 = V.linkInfo(t, L); assert.ok(i0.all && Math.abs(i0.bonus - 0.5 * 4) < 1e-9, 'own all = 0.5% x N'); L.ids.forEach((id) => { t.drones.own[id].s = 5; }); const i1 = V.linkInfo(t, L); assert.strictEqual(i1.steps, 4); assert.ok(Math.abs(i1.bonus - (2 + 0.4 * 4)) < 1e-9);
  L.ids.forEach((id) => { t.drones.own[id].s = 10; }); assert.strictEqual(V.linkInfo(t, L).steps, 8); assert.ok(Math.abs(V.linkInfo(t, L).bonus - 5.2) < 1e-9);
  const t2 = S(); L.ids.slice(1).forEach((id) => V.giveDrone(t2, id, 1)); assert.strictEqual(V.linkInfo(t2, L).bonus, 0); }
// a defense link makes you take less damage, and never past the cap
{ const t = S(); t.gear.plating = part('plating', 3, 5); t.drones.active = ''; V.LINKS.filter((L) => L.stat === 'defense').forEach((L) => L.ids.forEach((id) => { V.giveDrone(t, id, 1); t.drones.own[id].s = 10; })); V.DRONES.forEach((d) => V.giveDrone(t, d.id, 1)); t.drones.active = 'oblivion'; V.levelUp(Object.assign(t, { nanites: 1e12 }), 'oblivion', 99); assert.ok(V.power(t).combat.armor > 0 && V.power(t).combat.armor <= V.CFG.ARMOR_MAX); }
// drone abilities change fights
const foe = V.enemyFor(12), pb = { dmg: 4000, hull: 20000, speed: 100 };
const avg = (p) => { let w = 0; for (let i = 0; i < 300; i++) if (V.simulateFight(p, foe, rg).win) w++; return w / 300; };
const mk = (id, stars) => { const t = S(); V.giveDrone(t, id, 1); t.drones.own[id].s = stars; t.drones.active = id; return V.fighter(t).drone; };
const w0 = avg(pb), w1 = avg(Object.assign({}, pb, { armor: 0.3, dodge: 0.2 })), w2 = avg(Object.assign({}, pb, { drone: mk('nova', 10) })), w3 = avg(Object.assign({}, pb, { drone: mk('leviathan', 10) }));
assert.ok(w1 >= w0 && w2 >= w0 && w3 >= w0, 'build and drone should not hurt: ' + [w0, w1, w2, w3]);
// every drone, at every star count, plays a clean fight: no NaN, events in order, and each ability does what its text says it can
V.DRONES.forEach((d) => { [0, 3, 6, 10].forEach((st) => { const r = V.simulateFight(Object.assign({ dmg: 700, hull: 90000, speed: 100 }, { drone: mk(d.id, st) }), V.enemyFor(60), rg); assert.ok(r.events.every((x) => isFinite(x.php) && isFinite(x.ehp) && x.php >= 0 && x.ehp >= 0), d.id + ' ' + st); }); });
{ const fire = (id) => V.simulateFight({ dmg: 700, hull: 90000, speed: 100, drone: mk(id, 10) }, V.enemyFor(60), rg).events.filter((x) => x.who === 'c');
  assert.ok(fire('nova').some((x) => x.dmg > 0)); assert.ok(fire('aurora').some((x) => x.heal > 0)); assert.ok(fire('leviathan').some((x) => x.shieldGain > 0)); assert.ok(fire('flare').some((x) => x.note)); assert.ok(fire('torch').some((x) => x.note === 'BURN'));
  const stunned = V.simulateFight({ dmg: 700, hull: 90000, speed: 100, drone: mk('nullifier', 10) }, V.enemyFor(60), rg).events; assert.ok(stunned.some((x) => x.stunned)); assert.ok(V.simulateFight({ dmg: 700, hull: 90000, speed: 100, dodge: 0, drone: mk('phantom', 10) }, V.enemyFor(60), rg).events.some((x) => x.dodged));
  // revive: a drone with Rebirth brings the ship back once
  const weak = V.simulateFight({ dmg: 1, hull: 50, speed: 100, drone: mk('phoenix', 10) }, V.enemyFor(60), rg).events; assert.ok(weak.some((x) => x.note === 'REVIVE'));
  assert.strictEqual(V.simulateFight({ dmg: 1, hull: 50, speed: 100, drone: mk('phoenix', 5) }, V.enemyFor(60), rg).events.filter((x) => x.note === 'REVIVE').length, 0, 'revive unlocks at star 6'); }
// a drone with a stun ability beats the same ship without it more often against a hard enemy
{ const hard = V.enemyFor(30), a = (p) => { let w = 0; for (let i = 0; i < 400; i++) if (V.simulateFight(p, hard, rg).win) w++; return w / 400; }; const base = { dmg: 3000, hull: 16000, speed: 100 }; assert.ok(a(Object.assign({}, base, { drone: mk('titan', 10) })) >= a(base)); }
// old Wing saves become drones
{ const old = V.newState(0); delete old.drones; old.wing = { owned: { '0:0': 2, '2:1': 1, '5:0': 1 }, active: ['2:1'], summons: 9 }; const m = V.migrate(old, 0); assert.ok(m.drones.own.hornet && m.drones.own.hornet.s + m.drones.own.hornet.c === 1 && m.drones.own.mender && m.drones.own.surge && m.drones.active === 'mender' && !m.wing);
  assert.strictEqual(m.drones.own.mender.s, 2); assert.strictEqual(V.migrate(m, 0).drones.own.mender.s, 2); }
// first clears no longer give AI Cores; a fight pays 1 Credit
{ const t = S(); const c0 = t.cores; const r = V.resolveFight(t, 10, true, rg); assert.strictEqual(t.cores, c0); assert.strictEqual(r.cores, 0); assert.strictEqual(V.describeRewards(S(), 10).cores, 0); }
// Drone Hangar: Nanites, growing with the ladder stage
{ const t = S(); t.ladders.nanites = 0; const d = V.dailyById('nanites'); assert.strictEqual(d.reward(1).nanites, 200); assert.ok(d.reward(100).nanites > 600 && d.reward(200).nanites < 3000); const n0 = t.nanites; let w = 0; for (let i = 0; i < 3; i++) { const r = V.ladderFight(Object.assign(t, { gear: Object.assign({}, t.gear) }), 'nanites', () => 0.5, 1000); if (r.ok && r.win) w++; } assert.ok(t.nanites >= n0); }
// flux store
{ const t = S(); t.flux = 1000; const n0 = t.nanites; assert.ok(V.fluxBuy(t, 'na200', 0) && t.nanites === n0 + 200 && t.flux === 925); assert.ok(V.fluxBuy(t, 'co10', 0) && t.cores === 10); for (let i = 0; i < 20; i++) V.fluxBuy(t, 'ar1', 0); assert.strictEqual(V.arenaLeft(t, 0), V.CFG.ARENA_ATTEMPTS + 15);
  t.flux = 10; assert.ok(!V.fluxBuy(t, 'cr2', 0)); t.flux = 50; const c0 = t.credits; assert.ok(V.fluxBuy(t, 'cr2', 0) && t.credits > c0 && t.flux === 0); assert.ok(V.FLUX_PACKS.length === 9 && V.FLUX_PACKS[0][0] === 30); }
// rank orders: 3 per rank, the level one always there
{ for (let r = 0; r < 25; r++) { const q = V.QUESTS.filter((x) => x.rank === r); assert.strictEqual(q.length, 3); assert.ok(q.some((x) => x.kind === 'level' && x.need === Math.min(V.CFG.LEVEL_MAX, (r + 1) * V.CFG.RANK_LEVELS))); }
  const t = S(); assert.ok(V.visibleQuests(t).every((x) => x.rank === undefined || x.rank === 0)); t.cmd.level = 20; const qa = t.nanites; assert.ok(V.claimQuest(t, 'r0a') && t.flux === 2 && t.cores === 6); assert.ok(!V.claimQuest(t, 'r0a')); assert.ok(!V.claimQuest(t, 'r1a')); t.combat.best = 12; assert.ok(V.claimQuest(t, 'r0c') && t.nanites === qa + 150); }
// rewards now include AI Cores
// older saves (no subs / wing) load fine
const o2 = V.migrate({ v: 1, gear: { cannon: { slot: 'cannon', tier: 1, level: 2 } }, pending: { slot: 'pod', tier: 0, level: 1 }, hold: [{ slot: 'pod', tier: 0, level: 1 }] }, 0);
assert.deepStrictEqual(o2.gear.cannon.subs, []); assert.deepStrictEqual(o2.held[0].it.subs, []); assert.strictEqual(o2.held.length, 1); assert.strictEqual(o2.cores, 0); assert.deepStrictEqual(o2.settings.filter, []);
// ---- step 5: unlimited stock, XP by tier, rank gate, research, stage labels, sweep, offline cap
assert.strictEqual(V.stageLabel(1), '1-1'); assert.strictEqual(V.stageLabel(10), '1-10'); assert.strictEqual(V.stageLabel(11), '2-1'); assert.strictEqual(V.stageLabel(200), '20-10');
s = S(); s.alloy = 1e9; s.credits = 1e15; assert.ok(V.forgeOnce(s, rg).ok); assert.strictEqual(V.forgeCost(s), 1); assert.ok(s.alloy > 9.9e8); // no cap on holding Alloy
// one Alloy a minute, 4 hours offline to start, research raises both
s = S(); assert.ok(Math.abs(V.alloyRate(s) * 60 - 1) < 1e-9); assert.strictEqual(V.offlineCapS(s), 4 * 3600);
s.last = 0; s.alloy = 0; let rp = V.offline(s, 10 * 3600 * 1000); assert.ok(rp.capped && Math.abs(s.stock.alloy - 240) < 1e-6 && Math.abs(s.stock.credits - 14400) < 1e-6 && s.alloy === 0); let col = V.collect(s, 1); assert.ok(col.ok && col.alloy === 240 && col.credits === 14400 && s.alloy === 240 && s.credits === 14400); assert.strictEqual(V.collect(s, 2).reason, 'wait'); V.earn(s, 90); col = V.collect(s, 10000); assert.ok(col.ok && col.alloy === 1 && col.credits === 90 && Math.abs(s.stock.alloy - 0.5) < 1e-6);
assert.strictEqual(V.sellValue({ tier: 9, level: 1 }), 40); assert.ok(V.sellValue({ tier: 9, level: 25 }) < 70 && V.sellValue({ tier: 0, level: 25 }) <= 2);
s = S(); s.last = 0; s.alloy = 0; rp = V.offline(s, 2 * 3600 * 1000); assert.ok(!rp.capped && Math.abs(s.stock.alloy - 120) < 1e-6);
// research: costs Shards and takes real time, one at a time
s = S(); s.shards = 1e6; s.cmd.level = 10; assert.ok(V.startTech(s, 'offline', 0)); assert.ok(s.tech && s.shards < 1e6); assert.ok(!V.startTech(s, 'sell', 0)); // one at a time
assert.strictEqual(V.checkTech(s, 1000), ''); const tt = s.tech.endAt; assert.strictEqual(V.checkTech(s, tt), 'offline'); assert.ok(Math.abs(V.offlineCapS(s) - 4 * 1.16 * 3600) < 1e-6);
assert.ok(V.startTech(s, 'sell', tt)); V.checkTech(s, s.tech.endAt); assert.ok(V.creditMult(s) > 1);
s.shards = 0; assert.ok(!V.startTech(s, 'sell', 0));
// flux finishes it early, cheaper the less is left
s = S(); s.shards = 1e6; s.flux = 1e6; V.startTech(s, 'ftimer', 0); const rc0 = V.techRushCost(s, 0), rc1 = V.techRushCost(s, s.tech.endAt / 2); assert.ok(rc0 >= rc1 && rc1 >= 1); assert.ok(V.rushTech(s, 0)); assert.strictEqual(V.checkTech(s, 0), 'ftimer');
// five tiers of five levels: tier II opens at a higher commander level
s = S(); s.shards = 1e9; s.cmd.level = 5; s.cmd.rank = 14; for (let i = 0; i < 5; i++) { assert.ok(V.startTech(s, 'ftimer', 0)); V.checkTech(s, s.tech.endAt); } assert.strictEqual(V.techInfo(s, 'ftimer').tier, 2); assert.ok(V.techInfo(s, 'ftimer').locked); s.cmd.level = 80; assert.ok(!V.techInfo(s, 'ftimer').locked);
// cost and time follow the tables (time x1.5) and grow with each level
{ const i0 = V.techInfo(S(), 'ftimer'); assert.strictEqual(i0.secs, Math.round(250 * 1.5)); assert.strictEqual(i0.cost, Math.max(1, Math.round(27 * V.CFG.SHARD_SCALE))); }
// research effects
s = S(); s.research.ftimer = 10; assert.ok(V.upgradeInfo(s).seconds < V.CFG.UPGRADE_SECONDS(1)); s.research.fcost = 10; assert.ok(V.upgradeInfo(s).credits < V.CFG.UPGRADE_CREDITS(1));
s = S(); s.gear.cannon = part('cannon', 1, 3); const pm0 = V.power(s).dmg; s.research.dmgc = 25; assert.ok(V.power(s).dmg > pm0 * 1.3); s.research.dmgp = 25; // a mastery only touches its own slot
s = S(); s.alloy = 1000; s.research.free = 25; const af0 = s.alloy; for (let i = 0; i < 400; i++) V.forgeOnce(s, rg); assert.ok(s.alloy > af0 - 400 + 40);
s = S(); s.cores = 1000; s.research.wtwin = 25; { const g = V.summon(s, () => 0.01).got; assert.ok(g.every((x) => x.copies === 2)); }
s = S(); s.research.salv = 25; s.clan = null; const d0 = V.dailyBonus(s, 'alloy', { alloy: 100 }).alloy; assert.ok(d0 > 100);
// old saves: unknown research is wiped and refunded
const ol = V.migrate({ v: 1, shards: 1, research: { alloy: 2, 'dmg:1': 3, ftimer: 4 } }, 0); assert.ok(ol.shards > 1 && !('alloy' in ol.research) && ol.research.ftimer === 4); assert.strictEqual(V.migrate(Object.assign(V.newState(0), { rv: 26, research: { alloy: 3 } }), 0).research.alloy, 3);
// XP: 10 for the first two tiers, 20 for the next three, 30 for the sixth
assert.deepStrictEqual(V.CFG.XP_TIER.slice(0, 6), [10, 10, 20, 20, 20, 30]);
s = S(); s.cmd.rank = 5; s.cmd.level = 50; const x0 = s.cmd.xp; V.addXp(s, 0); assert.strictEqual(s.cmd.xp - x0, 10); V.addXp(s, 3); assert.strictEqual(s.cmd.xp - x0, 30); V.addXp(s, 5); assert.strictEqual(s.cmd.xp - x0, 60);
// level curve is steep and comes only from forging
assert.ok(V.CFG.XP_NEED(50) > 10 * V.CFG.XP_NEED(1)); s = S(); V.resolveFight(s, 1, true, () => 0.9); assert.strictEqual(s.cmd.level, 1); assert.strictEqual(s.cmd.xp, 0);
// rank gate: every 20 levels; at level 20 the bar fills for level 21, then you are promoted
s = S(); s.cmd.xp = 1e9; V.addXp(s, 0); assert.strictEqual(s.cmd.level, 20); assert.ok(V.atCap(s)); assert.ok(V.canPromote(s)); assert.strictEqual(s.cmd.xp, V.CFG.XP_NEED(20));
s.cmd.xp = V.CFG.XP_NEED(20) - 1; assert.ok(!V.canPromote(s)); assert.strictEqual(V.promote(s), null); s.cmd.xp = V.CFG.XP_NEED(20);
const pr = V.promote(s); assert.ok(pr && pr.rank === 1 && s.cmd.rank === 1 && s.cmd.level === 21 && s.cmd.xp === 0 && s.shards === 1 && s.flux === 6 && s.cores === 6);
assert.strictEqual(V.RANK_NAMES.length, 25); assert.strictEqual(V.CFG.LEVEL_MAX, 500); assert.strictEqual(V.levelCap({ rank: 24 }), 500); assert.strictEqual(V.RANK_NAMES[0], 'Cadet I'); assert.strictEqual(V.RANK_NAMES[8], 'Lieutenant III'); assert.strictEqual(V.RANK_NAMES[3], 'Ensign I'); assert.strictEqual(V.RANK_NAMES[23], 'Rear Admiral III'); assert.strictEqual(V.RANK_NAMES[24], 'Fleet Admiral');
s = S(); s.cmd.rank = 24; s.cmd.level = 500; s.cmd.xp = 1e9; V.addXp(s, 0); assert.ok(!V.atCap(s) && !V.canPromote(s) && s.cmd.level === 500);
// profile: free first rename, then Flux
s = S(); assert.strictEqual(V.renameCost(s), 0); assert.ok(V.renameCommander(s, 'Noah').ok && s.name === 'Noah' && s.flux === 0); assert.strictEqual(V.renameCost(s), V.CFG.RENAME_FLUX);
assert.ok(!V.renameCommander(s, 'Ace').ok); s.flux = 60; assert.ok(V.renameCommander(s, 'Ace').ok && s.flux === 10 && s.name === 'Ace'); assert.ok(!V.renameCommander(s, 'x').ok);
assert.ok(V.setAvatar(s, 5) && s.avatar === 5 && !V.setAvatar(s, 99));
// commander level and research raise Damage/Hull
s = S(); s.gear.cannon = part('cannon', 3, 40); const p0 = V.power(s).dmg; s.cmd.level = 51; assert.ok(V.power(s).dmg > p0 * (1 + V.CFG.LEVEL_BONUS * 50 * 0.95)); s.research.odmg = 5; const pq = V.power(s).dmg; assert.ok(pq > V.calcPower(s.gear, 0).dmg);
// shards: boss first clears and every fifth stage
s = S(); s.combat.best = 4; s.combat.stage = 5; V.resolveFight(s, 5, true, () => 0.9); assert.strictEqual(s.shards, V.CFG.SHARD_FIFTH);
s.combat.best = 9; s.combat.stage = 10; const sh0 = s.shards; V.resolveFight(s, 10, true, () => 0.9); assert.strictEqual(s.shards - sh0, V.CFG.SHARD_BOSS(1));
// a kill pays one Credit, a boss too
assert.strictEqual(V.creditsWin(1), 1); assert.strictEqual(V.creditsWin(10), 1); assert.strictEqual(V.creditsWin(200), 1);
// sweep tickets (for daily missions): start with 4, one per 2 hours, 2 extra from ads a day, no cooldown. The campaign has none.
s = S(); s.sweep.at = 0; assert.ok(V.useTicket(s, 1000) && V.useTicket(s, 1000) && V.useTicket(s, 1000) && V.useTicket(s, 1000)); assert.ok(!V.useTicket(s, 1000));
assert.strictEqual(V.sweepInfo(s, 1000 + 2 * 3600 * 1000).tickets, 1); assert.strictEqual(V.sweepInfo(s, 1000 + 20 * 3600 * 1000).tickets, 4);
const t0 = Date.UTC(2026, 0, 1, 12); s.sweep = { tickets: 4, at: t0, day: '', ads: 0 };
assert.ok(V.sweepAd(s, t0) && V.sweepAd(s, t0) && !V.sweepAd(s, t0)); assert.strictEqual(s.sweep.tickets, 6);
assert.ok(V.sweepAd(s, Date.UTC(2026, 0, 2, 0, 1))); // new UTC day, ads refill
// upgrade timers: seconds early, days late; tiers unlock in order
assert.ok(V.CFG.UPGRADE_SECONDS(1) <= 1800); assert.ok(V.CFG.UPGRADE_SECONDS(V.CFG.MAX_FORGE_LEVEL - 1) >= 7 * 86400);
for (let t = 1; t < V.LAUNCH_TIERS; t++) assert.ok(V.TIERS[t].unlock > V.TIERS[t - 1].unlock && V.TIERS[t].unlock <= V.CFG.MAX_FORGE_LEVEL);
// older step-4 save still loads and gets the new fields
const o3 = V.migrate({ v: 1, alloy: 5, forge: { level: 30 } }, 0); assert.strictEqual(o3.forge.level, V.CFG.MAX_FORGE_LEVEL); assert.strictEqual(o3.cmd.level, 1); assert.strictEqual(o3.shards, 0);
// ---- step 6: daily ladders, arena, shop, clan
const D0 = Date.UTC(2026, 0, 5, 10), D1 = Date.UTC(2026, 0, 6, 1);
s = S(); s.sweep.at = D0; V.SLOTS.forEach((x) => { s.gear[x.id] = part(x.id, 2, 3); });
assert.strictEqual(V.attemptsLeft(s, 'alloy', D0), V.CFG.DAILY_ATTEMPTS);
let wins = 0; for (let i = 0; i < 3; i++) { const r = V.ladderFight(s, 'alloy', rg, D0); assert.ok(r.ok); if (r.win) wins++; }
assert.strictEqual(V.attemptsLeft(s, 'alloy', D0), 0); assert.strictEqual(V.ladderFight(s, 'alloy', rg, D0).reason, 'attempts');
assert.strictEqual(s.ladders.alloy, wins); assert.strictEqual(V.attemptsLeft(s, 'alloy', D1), 3); // midnight UTC resets
assert.strictEqual(V.dailyById('alloy').reward(1).alloy, 20); assert.strictEqual(V.dailyById('alloy').reward(5).alloy, 21);
// a weak ship cannot clear a hard ladder stage; a strong one can
s = S(); s.ladders.shards = 60; const weak = V.ladderFight(s, 'shards', rg, D0); assert.ok(weak.ok && !weak.win && s.ladders.shards === 60);
// sweep spends tickets, not attempts
s = S(); s.sweep.at = D0; s.ladders.alloy = 5; const a0 = s.alloy; const sw0 = V.ladderSweep(s, 'alloy', D0); assert.ok(sw0 && s.alloy - a0 === 21 && s.sweep.tickets === 3 && V.attemptsLeft(s, 'alloy', D0) === 3);
s.sweep.tickets = 0; assert.strictEqual(V.ladderSweep(s, 'alloy', D0), null); s.ladders.alloy = 0; s.sweep.tickets = 2; assert.strictEqual(V.ladderSweep(s, 'alloy', D0), null);
// convoy needs a clan
s = S(); assert.ok(V.ladderLocked(s, 'cores')); assert.strictEqual(V.ladderFight(s, 'cores', rg, D0).reason, 'locked'); assert.ok(V.joinClan(s, 'vanguard')); assert.ok(!V.ladderLocked(s, 'cores'));
// arena
s = S(); V.SLOTS.forEach((x) => { s.gear[x.id] = part(x.id, 2, 3); }); assert.strictEqual(V.arenaOpponents(s, D0).length, 3);
let done = 0; for (let i = 0; i < 5; i++) { const r = V.arenaFight(s, 1, rg, D0); assert.ok(r.ok); done++; assert.ok(r.medals >= 2); }
assert.strictEqual(V.arenaFight(s, 0, rg, D0).reason, 'attempts'); assert.ok(s.medals >= 10); assert.strictEqual(V.arenaLeft(s, D1), 5);
assert.strictEqual(V.leagueOf(0), 0); assert.strictEqual(V.leagueOf(100), 1); assert.strictEqual(V.leagueOf(2500), 6);
// shop: daily limit, needs medals
s = S(); s.medals = 1000; assert.ok(V.shopBuy(s, 'alloy', D0) && V.shopBuy(s, 'alloy', D0) && !V.shopBuy(s, 'alloy', D0)); assert.ok(V.shopBuy(s, 'flux', D0) && s.flux === 10); assert.ok(V.shopBuy(s, 'alloy', D1)); s.medals = 0; assert.ok(!V.shopBuy(s, 'cores', D0));
// clan: members fill the goal over the day, you add the rest, claims once per step
s = S(); assert.strictEqual(V.clanProgress(s, D0), null); V.joinClan(s, 'redline');
const noon = Date.UTC(2026, 0, 5, 12); let cp = V.clanProgress(s, noon); assert.ok(cp.members > 0 && cp.members < 100); assert.ok(!cp.steps[3].reached);
s.daily.clanPts = 100; cp = V.clanProgress(s, noon); assert.strictEqual(cp.total, 100); assert.ok(V.claimClan(s, 0, noon)); assert.ok(!V.claimClan(s, 0, noon)); assert.strictEqual(s.alloy, V.CFG.START_ALLOY + 30);
assert.ok(V.claimClan(s, 3, noon)); assert.strictEqual(s.flux, 10); assert.strictEqual(V.clanProgress(s, D1 + 86400000).you, 0); // next day resets
// old saves load with the new fields
const o4 = V.migrate({ v: 1 }, 0); assert.strictEqual(o4.medals, 0); assert.strictEqual(o4.ladders.alloy, 0); assert.strictEqual(o4.clan, null); assert.ok(Array.isArray(o4.arena.opp));
// ---- step 7: gift, deals, ads
s = S(); assert.ok(V.claimGift(s, D0)); assert.ok(!V.claimGift(s, D0)); assert.strictEqual(s.alloy, V.CFG.START_ALLOY + 100); assert.ok(V.claimGift(s, D1));
s = S(); assert.strictEqual(V.dealsToday(D0).length, 4); assert.deepStrictEqual(V.dealsToday(D0), V.dealsToday(D0 + 1000)); assert.strictEqual(new Set(V.dealsToday(D0).map((d) => d.id)).size, 4);
s.flux = 1000; const dl = V.dealsToday(D0)[0]; assert.ok(V.buyDeal(s, dl.id, D0)); assert.ok(!V.buyDeal(s, dl.id, D0)); assert.strictEqual(s.flux, 1000 - dl.cost); assert.ok(!V.buyDeal(s, 'nope', D0));
s = S(); s.flux = 5; assert.ok(!V.buyDeal(s, V.dealsToday(D0)[0].id, D0));
// ads: caps, cooldowns, and the speed-up needs an upgrade running
s = S(); assert.ok(V.claimAd(s, 'alloy', D0)); assert.ok(!V.claimAd(s, 'alloy', D0 + 1000)); assert.ok(V.claimAd(s, 'alloy', D0 + 1300 * 1000)); assert.strictEqual(s.alloy, V.CFG.START_ALLOY + 60);
for (let i = 0; i < 6; i++) V.claimAd(s, 'alloy', D0 + (i + 3) * 1300 * 1000); assert.strictEqual(V.adStatus(s, 'alloy', D0 + 20000 * 1000).left, 0);
assert.ok(!V.adStatus(s, 'speed', D0).ready); s.forge.upgrade = { to: 2, startAt: D0, endAt: D0 + 3600 * 1000 }; assert.ok(V.claimAd(s, 'speed', D0)); assert.strictEqual(s.forge.upgrade.endAt, D0 + 40 * 60000);
s = S(); assert.ok(V.claimAd(s, 'flux', D0) && s.flux === 2); assert.ok(V.claimAd(s, 'credits', D0) && s.credits > 0); assert.ok(V.adStatus(s, 'alloy', D1).left === 4);
assert.ok(V.buyNoAds(s) && s.noAds);
console.log('rules ok');
{ const V2 = require('../core.js'), st = V2.newState(0); const assert2 = require('assert');
  assert2.strictEqual(V2.batchSize(st), 1); st.shards = 1e9; st.cmd.level = 29; assert2.ok(V2.techInfo(st, 'batch').locked); // locked by commander level
  st.cmd.level = 30; assert2.ok(V2.startTech(st, 'batch', 0)); V2.checkTech(st, st.tech.endAt); assert2.strictEqual(V2.batchSize(st), 3); assert2.ok(V2.techInfo(st, 'batch').locked);
  st.cmd.level = 500; for (let i = 0; i < 12; i++) { if (V2.startTech(st, 'batch', 0)) V2.checkTech(st, st.tech.endAt); } assert2.strictEqual(V2.batchSize(st), 10);
  // campaign orders: claim once, only when done and unlocked
  const q = V2.newState(0); assert2.ok(!V2.claimQuest(q, 'c0a')); q.combat.best = 10; assert2.ok(V2.claimQuest(q, 'c0a')); assert2.ok(!V2.claimQuest(q, 'c0a')); assert2.ok(q.alloy > V2.CFG.START_ALLOY);
  assert2.ok(!V2.claimQuest(q, 'c1a')); V2.QUESTS.filter((x) => x.rank === undefined).forEach((x) => { assert2.ok((x.reward.alloy || 0) <= 200 && (x.reward.flux || 0) <= 2); });
  console.log('batch ok'); }

// installments: late upgrades take several payments before the timer starts
{ const s = V.newState(0); assert.strictEqual(V.CFG.INSTALL(1), 1); assert.ok(V.CFG.INSTALL(24) >= 8 && V.CFG.INSTALL(24) <= 10); s.forge.level = 20; const n = V.CFG.INSTALL(20); s.credits = 1e15; for (let i = 0; i < n - 1; i++) { const r = V.startUpgrade(s, 0); assert.ok(r.ok && r.partial && !s.forge.upgrade); } assert.ok(V.startUpgrade(s, 0).ok && s.forge.upgrade && s.forge.paid === 0); s.research.alloy = 10; assert.ok(V.alloyRate(s) > V.CFG.ALLOY_PER_SEC); console.log('installments ok'); }

// starship hulls: 10 archetypes, scale grows with tier, hull follows the fitted Hull Plating
assert.strictEqual(V.SHIPS.length, 10);
V.SHIPS.forEach((sh, i) => { assert.strictEqual(sh.tier, i); assert.strictEqual(sh.name, V.TIERS[i].name); assert.ok(sh.archetype && sh.theme && sh.kw); if (i) assert.ok(sh.scale > V.SHIPS[i - 1].scale); });
assert.strictEqual(V.SHIPS[0].scale, 0.85); assert.strictEqual(V.SHIPS[9].scale, 1.25);
s = S(); assert.strictEqual(V.hullTier(s), 0); s.gear.cannon = part('cannon', 7); assert.strictEqual(V.hullTier(s), 0);
s.gear.plating = part('plating', 4); assert.strictEqual(V.hullTier(s), 4); assert.strictEqual(V.shipOf(s).name, 'Voidborn');
// ship rig: placement and asset paths
const R = require('../ship.js');
assert.strictEqual(R.iconSrc('cannon', 0, 0), 'assets/icons/gear_cannon_t01_a.png'); assert.strictEqual(R.layerSrc('cannon', 1, 1), 'assets/ship/cannon_t02_b.png');
assert.ok(R.hasHull(0) && R.hasHull(1) && !R.hasHull(2));
const pl = R.place('cannon', 0, { slot: 'cannon', tier: 1, v: 0 }); assert.ok(pl && pl.width > 5 && pl.width < 60 && pl.ty === -100);
const html = R.rig({ gear: { cannon: part('cannon', 0) } }, V.SHIPS[0], 0, '<svg></svg>'); assert.ok(html.includes('hull_t01.png') && html.includes('cannon_t01_a.png') && html.includes('--hs:0.85'));
assert.ok(R.rig({ gear: {} }, V.SHIPS[5], 5, '<svg id="fb"></svg>').includes('id="fb"'));   // no hull art yet: code-drawn fallback
console.log('ships ok');
