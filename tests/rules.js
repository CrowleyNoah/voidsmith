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
s = S(); s.gear.cannon = { slot: 'cannon', tier: 3, level: 5, subs: [{ k: 'crit', v: 8 }, { k: 'haste', v: 6 }] };
assert.ok(V.power(s).build > 1); const cc = V.gearCombat(s.gear); assert.ok(cc.crit > 0.12 && cc.haste > 0);
const base = { slot: 'cannon', tier: 3, level: 5, subs: [] }; const better = { slot: 'cannon', tier: 3, level: 5, subs: [{ k: 'crit', v: 20 }] };
s.gear.cannon = base; assert.ok(V.isUpgrade(s, better)); s.gear.cannon = better; assert.ok(!V.isUpgrade(s, base));
// wing: summon, auto-fill, fuse, trim
s = S(); s.cores = 1000; assert.ok(V.summon(s, 10, rg).ok); assert.strictEqual(s.cores, 910); assert.strictEqual(s.wing.summons, 10); assert.strictEqual(s.wing.active.length, 3);
s = S(); s.wing.owned = { '0:0': 3, '1:0': 1 }; s.wing.active = ['0:0', '0:0', '1:0']; assert.ok(V.canFuse(s, '0:0')); assert.strictEqual(V.fuse(s, '0:0'), '0:1'); assert.ok(!s.wing.owned['0:0']); assert.deepStrictEqual(s.wing.active, ['1:0']);
s.wing.owned = { '2:0': 9 }; assert.ok(V.fuseAll(s) >= 4); assert.ok(V.parseKey(Object.keys(s.wing.owned).sort()[0]).rank >= 0);
s = S(); s.wing.owned = { '0:5': 3 }; assert.ok(!V.canFuse(s, '0:5'));
assert.ok(Math.abs(V.summonOdds(1).reduce((a, b) => a + b, 0) - 1) < 1e-9); assert.ok(V.summonOdds(10)[3] > V.summonOdds(1)[3]);
// companions change fights: a medic + shield beat nothing; dodge and armor matter at equal Power
const foe = V.enemyFor(12), pb = { dmg: 4000, hull: 20000, speed: 100 };
const avg = (p) => { let w = 0; for (let i = 0; i < 300; i++) if (V.simulateFight(p, foe, rg).win) w++; return w / 300; };
const w0 = avg(pb), w1 = avg(Object.assign({}, pb, { armor: 0.3, dodge: 0.2 })), w2 = avg(Object.assign({}, pb, { wing: [{ id: 'hornet', name: 'H', speed: 110, f: 6.5, a: 30 }] }));
assert.ok(w1 >= w0 && w2 >= w0, 'build and wing should not hurt: ' + [w0, w1, w2]);
const evs = V.simulateFight(Object.assign({}, { dmg: 700, hull: 90000, speed: 100 }, { dodge: 0.5, wing: [{ id: 'aegis', name: 'A', speed: 85, f: 3, a: 10 }, { id: 'static', name: 'S', speed: 95, f: 3, a: 25 }, { id: 'surge', name: 'U', speed: 90, f: 3, a: 50 }, { id: 'mender', name: 'M', speed: 90, f: 3, a: 5 }, { id: 'longbow', name: 'L', speed: 70, f: 3, a: 80 }] }), V.enemyFor(60), rg).events;
assert.ok(evs.some((x) => x.who === 'c') && evs.some((x) => x.dodged) && evs.every((x) => isFinite(x.php) && isFinite(x.ehp)));
// rewards now include AI Cores
s = S(); let rr = V.resolveFight(s, 1, true, () => 0.99); assert.strictEqual(rr.cores, V.CFG.CORE_FIRST); rr = V.resolveFight(s, 1, true, () => 0.0); assert.strictEqual(rr.cores, 1);
s.combat.best = 9; s.combat.stage = 10; rr = V.resolveFight(s, 10, true, () => 0.99); assert.strictEqual(rr.cores, V.CFG.CORE_BOSS);
// older saves (no subs / wing) load fine
const o2 = V.migrate({ v: 1, gear: { cannon: { slot: 'cannon', tier: 1, level: 2 } }, pending: { slot: 'pod', tier: 0, level: 1 }, hold: [{ slot: 'pod', tier: 0, level: 1 }] }, 0);
assert.deepStrictEqual(o2.gear.cannon.subs, []); assert.deepStrictEqual(o2.pending.subs, []); assert.strictEqual(o2.cores, 0); assert.deepStrictEqual(o2.settings.filter, []);
// ---- step 5: unlimited stock, XP by tier, rank gate, research, stage labels, sweep, offline cap
assert.strictEqual(V.stageLabel(1), '1-1'); assert.strictEqual(V.stageLabel(10), '1-10'); assert.strictEqual(V.stageLabel(11), '2-1'); assert.strictEqual(V.stageLabel(200), '20-10');
s = S(); s.alloy = 1e9; s.credits = 1e15; assert.ok(V.forgeOnce(s, rg).ok); assert.strictEqual(V.forgeCost(s), 1); assert.ok(s.alloy > 9.9e8); // no cap on holding Alloy
// one Alloy a minute, 4 hours offline to start, research raises both
s = S(); assert.ok(Math.abs(V.alloyRate(s) * 60 - 1) < 1e-9); assert.strictEqual(V.offlineCapS(s), 4 * 3600);
s.last = 0; s.alloy = 0; let rp = V.offline(s, 10 * 3600 * 1000); assert.ok(rp.capped && Math.abs(rp.alloy - 240) < 1e-6);
s = S(); s.last = 0; s.alloy = 0; rp = V.offline(s, 2 * 3600 * 1000); assert.ok(!rp.capped && Math.abs(rp.alloy - 120) < 1e-6);
// research: costs Shards and takes real time, one at a time
s = S(); s.shards = 1e6; s.cmd.level = 10; assert.ok(V.startTech(s, 'offline', 0)); assert.ok(s.tech && s.shards < 1e6); assert.ok(!V.startTech(s, 'sell', 0)); // one at a time
assert.strictEqual(V.checkTech(s, 1000), ''); const tt = s.tech.endAt; assert.strictEqual(V.checkTech(s, tt), 'offline'); assert.ok(Math.abs(V.offlineCapS(s) - 4 * 1.128 * 3600) < 1e-6);
assert.ok(V.startTech(s, 'sell', tt)); V.checkTech(s, s.tech.endAt); assert.ok(V.creditMult(s) > 1);
s.shards = 0; assert.ok(!V.startTech(s, 'sell', 0));
// flux finishes it early, cheaper the less is left
s = S(); s.shards = 1e6; s.flux = 1e6; V.startTech(s, 'ftimer', 0); const rc0 = V.techRushCost(s, 0), rc1 = V.techRushCost(s, s.tech.endAt / 2); assert.ok(rc0 >= rc1 && rc1 >= 1); assert.ok(V.rushTech(s, 0)); assert.strictEqual(V.checkTech(s, 0), 'ftimer');
// five tiers of five levels: tier II opens at a higher commander level
s = S(); s.shards = 1e9; s.cmd.level = 5; s.cmd.rank = 14; for (let i = 0; i < 5; i++) { assert.ok(V.startTech(s, 'ftimer', 0)); V.checkTech(s, s.tech.endAt); } assert.strictEqual(V.techInfo(s, 'ftimer').tier, 2); assert.ok(V.techInfo(s, 'ftimer').locked); s.cmd.level = 48; assert.ok(!V.techInfo(s, 'ftimer').locked);
// cost and time follow the tables (time x1.5) and grow with each level
{ const i0 = V.techInfo(S(), 'ftimer'); assert.strictEqual(i0.secs, Math.round(250 * 1.5)); assert.strictEqual(i0.cost, Math.max(1, Math.round(27 * V.CFG.SHARD_SCALE))); }
// research effects
s = S(); s.research.ftimer = 10; assert.ok(V.upgradeInfo(s).seconds < V.CFG.UPGRADE_SECONDS(1)); s.research.fcost = 10; assert.ok(V.upgradeInfo(s).credits < V.CFG.UPGRADE_CREDITS(1));
s = S(); s.gear.cannon = part('cannon', 1, 3); const pm0 = V.power(s).dmg; s.research.dmgc = 25; assert.ok(V.power(s).dmg > pm0 * 1.3); s.research.dmgp = 25; // a mastery only touches its own slot
s = S(); s.alloy = 1000; s.research.free = 25; const af0 = s.alloy; for (let i = 0; i < 400; i++) V.forgeOnce(s, rg); assert.ok(s.alloy > af0 - 400 + 40);
s = S(); s.cores = 1000; s.research.wtwin = 25; V.summon(s, 10, () => 0.01); assert.ok(Object.values(s.wing.owned).reduce((x, y) => x + y, 0) > 10);
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
const pr = V.promote(s); assert.ok(pr && pr.rank === 1 && s.cmd.rank === 1 && s.cmd.level === 21 && s.cmd.xp === 0 && s.shards === 2 && s.flux === 10 && s.cores === 10);
assert.strictEqual(V.RANK_NAMES.length, 15); assert.strictEqual(V.CFG.LEVEL_MAX, 300); assert.strictEqual(V.levelCap({ rank: 14 }), 300);
s = S(); s.cmd.rank = 14; s.cmd.level = 300; s.cmd.xp = 1e9; V.addXp(s, 0); assert.ok(!V.atCap(s) && !V.canPromote(s) && s.cmd.level === 300);
// profile: free first rename, then Flux
s = S(); assert.strictEqual(V.renameCost(s), 0); assert.ok(V.renameCommander(s, 'Noah').ok && s.name === 'Noah' && s.flux === 0); assert.strictEqual(V.renameCost(s), V.CFG.RENAME_FLUX);
assert.ok(!V.renameCommander(s, 'Ace').ok); s.flux = 60; assert.ok(V.renameCommander(s, 'Ace').ok && s.flux === 10 && s.name === 'Ace'); assert.ok(!V.renameCommander(s, 'x').ok);
assert.ok(V.setAvatar(s, 5) && s.avatar === 5 && !V.setAvatar(s, 99));
// commander level and research raise Damage/Hull
s = S(); s.gear.cannon = part('cannon', 3, 40); const p0 = V.power(s).dmg; s.cmd.level = 51; assert.ok(V.power(s).dmg > p0 * 1.14); s.research.odmg = 5; const pq = V.power(s).dmg; assert.ok(pq > V.calcPower(s.gear, 0).dmg);
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
  assert2.strictEqual(V2.batchSize(st), 1); st.shards = 1e9; st.cmd.level = 17; assert2.ok(V2.techInfo(st, 'batch').locked); // locked by commander level
  st.cmd.level = 18; assert2.ok(V2.startTech(st, 'batch', 0)); V2.checkTech(st, st.tech.endAt); assert2.strictEqual(V2.batchSize(st), 3); assert2.ok(V2.techInfo(st, 'batch').locked);
  st.cmd.level = 300; for (let i = 0; i < 12; i++) { if (V2.startTech(st, 'batch', 0)) V2.checkTech(st, st.tech.endAt); } assert2.strictEqual(V2.batchSize(st), 10);
  // campaign orders: claim once, only when done and unlocked
  const q = V2.newState(0); assert2.ok(!V2.claimQuest(q, 'c0a')); q.combat.best = 10; assert2.ok(V2.claimQuest(q, 'c0a')); assert2.ok(!V2.claimQuest(q, 'c0a')); assert2.ok(q.alloy > V2.CFG.START_ALLOY);
  assert2.ok(!V2.claimQuest(q, 'c1a')); V2.QUESTS.forEach((x) => { assert2.ok((x.reward.alloy || 0) <= 200 && (x.reward.flux || 0) <= 2); });
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
