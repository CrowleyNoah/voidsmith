// How often does a player win at different Power ratios? (ratio 1.0 = same Power as the enemy)
const V = require('../core.js');
let seed = 11; const rng = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const types = { drone: 11, gunship: 12, raider: 13, bulwark: 14, boss: 20 };
console.log('ratio ' + Object.keys(types).map((k) => k.padEnd(8)).join(''));
for (const r of [0.6, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 2]) {
  let line = String(r).padEnd(6);
  for (const k of Object.keys(types)) {
    const st = types[k], e = V.enemyFor(st), pe = e.pe * (e.boss ? 1.35 : 1), P = r * pe;
    const p = { dmg: Math.round(P * 0.46), hull: Math.round(P * 2.17 ), speed: 100 };
    let w = 0; for (let i = 0; i < 1500; i++) if (V.simulateFight(p, e, rng).win) w++;
    line += (Math.round(w / 15) + '%').padEnd(8);
  }
  console.log(line);
}
