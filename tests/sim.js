// Pace simulator: a bot plays like a casual free player and reports how long each stage of the game takes.
// usage: node tests/sim.js [days] [sessionsPerDay] [minutesPerSession]
const V = require('../core.js');
function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function manageWing(s, rng) {
  while (s.cores >= V.CFG.SUMMON_COST) V.summon(s, 1, rng);
  V.fuseAll(s);
  const owned = Object.keys(s.wing.owned).map((k) => ({ k, p: V.parseKey(k) })).sort((a, b) => b.p.rank - a.p.rank);
  const pick = [], roles = new Set();
  for (const o of owned) { if (pick.length < 3 && !roles.has(o.p.sp)) { pick.push(o.k); roles.add(o.p.sp); } }
  for (const o of owned) { for (let i = 0; i < s.wing.owned[o.k] && pick.length < 3; i++) if (pick.filter((x) => x === o.k).length < s.wing.owned[o.k] && !pick.includes(o.k)) pick.push(o.k); }
  s.wing.active = pick;
}
const PRIORITY = ['ftimer', 'alloy', 'batch', 'offline', 'patrol', 'techspd', 'fcost', 'techcst', 'sell', 'odmg', 'ohull', 'woff', 'wsup', 'free', 'dmgc', 'dmgp', 'dmga', 'dmgr', 'hulp', 'hulb', 'hule', 'huls', 'summon', 'wtwin', 'heist', 'convoy', 'salv'];
function bank(s, now) { // follow the Forge Master advice: efficiency first, power later. Save up for the top pick.
  V.checkTech(s, now); if (s.tech) return;
  for (const id of PRIORITY) {
    const o = V.techInfo(s, id); if (o.maxed || o.locked) continue;
    V.startTech(s, id, now); return;
  }
}
function dailies(s, rng, now) { // a casual player does their daily missions, arena and clan claims at every check-in
  if (!s.clan) V.joinClan(s, 'vanguard');
  V.DAILIES.forEach((d) => { for (let i = 0; i < 3; i++) { const r = V.ladderFight(s, d.id, rng, now); if (!r.ok) break; } while (V.ladderSweep(s, d.id, now)) { /* spend tickets */ } });
  for (let i = 0; i < 5; i++) { const r = V.arenaFight(s, 1, rng, now); if (!r.ok) break; }
  V.SHOP.forEach((it) => { while (V.shopBuy(s, it.id, now)) { /* spend Medals */ } });
  for (let i = 0; i < 4; i++) V.claimClan(s, i, now);
  V.claimGift(s, now);
}
function play(days, perDay, minutes) {
  const rng = seeded(7), s = V.newState(0), dayS = 86400, gap = dayS / perDay;
  let t = 0, nextCheck = 0; const log = [], marks = {}, trace = [];
  const mark = (k, v) => { if (!(k in marks)) marks[k] = +(t / dayS).toFixed(1); };
  while (t < days * dayS) {
    if (t >= nextCheck) {
      const rep = V.offline(Object.assign(s, { last: s.last }), t * 1000);
      for (let k = 0; k < minutes * 60; k++) {
        t += 1; const n = t * 1000;
        V.earn(s, 1); V.checkUpgrade(s, n); V.checkTech(s, n);
        if (!s.forge.upgrade) { for (let q = 0; q < 12; q++) { const r = V.startUpgrade(s, n); if (!r.ok || !r.partial) break; } }
        if (k % 10 === 0) { V.forgeBatch(s, 999, rng); V.promote(s); bank(s, n); }
        if (k % 12 === 11) { const st = s.combat.stage, e = V.enemyFor(st); const r = V.simulateFight(V.fighter(s), e, rng); V.resolveFight(s, st, r.win, rng); manageWing(s, rng); }
      }
      dailies(s, rng, t * 1000); V.forgeBatch(s, 9999, rng); V.promote(s); bank(s, t * 1000);
      trace.push({ day: t / dayS, rating: V.power(s).rating, best: s.combat.best, L: s.forge.level });
      s.last = t * 1000; nextCheck = t + gap - minutes * 60;
      const L = s.forge.level;
      [3, 5, 8, 11, 14, 17, 20, 25].forEach((m) => { if (L >= m) mark('F' + m); });
      [10, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200].forEach((m) => { if (s.combat.best >= m) mark('S' + V.stageLabel(m)); });
      [10, 25, 50, 75, 100].forEach((m) => { if (s.cmd.level >= m) mark('Lv' + m); });
      if (Math.floor(t / dayS) % (+process.env.EVERY || 30) === 0 && !log.some((e) => e.day === Math.floor(t / dayS))) log.push({ day: Math.floor(t / dayS), foundry: L, stage: V.stageLabel(Math.max(1, s.combat.best)), lv: s.cmd.level, rank: V.RANK_NAMES[s.cmd.rank], power: V.fmt(V.power(s).power), rating: Math.round(V.power(s).rating), credits: V.fmt(s.credits), alloy: V.fmt(s.alloy) });
    } else t = nextCheck;
  }
  return { s, log, marks, trace };
}
module.exports = { play };
if (require.main === module) {
const days = +process.argv[2] || 365, perDay = +process.argv[3] || 3, minutes = +process.argv[4] || 10;
if (process.env.OPEN) V.CFG.ENEMY_SCALE = 1e-6;
const r = play(days, perDay, minutes);
console.log('player: ' + perDay + ' check-ins a day, ' + minutes + ' min each, ' + days + ' days');
console.log('milestone day:', JSON.stringify(r.marks));
console.table(r.log);
console.log('forged', r.s.stats.forged, 'wins', r.s.stats.wins, 'losses', r.s.stats.losses, 'shards unspent', r.s.shards, 'research', JSON.stringify(r.s.research));
for (let L = 1; L <= V.CFG.MAX_FORGE_LEVEL; L++) { const o = V.tierOdds(L).reduce((a, b) => a + b, 0); if (Math.abs(o - 1) > 1e-9) throw new Error('odds at ' + L); }
if (process.argv[5] === 'table') for (const L of [1, 5, 10, 15, 20, 24]) console.log('L' + L, 'wait', V.fmtTime(V.CFG.UPGRADE_SECONDS(L)), 'credits', V.fmt(V.CFG.UPGRADE_CREDITS(L)));
}
