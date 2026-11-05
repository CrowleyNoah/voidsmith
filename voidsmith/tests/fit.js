// Calibration helper: runs the casual bot against the current enemy curve and suggests new ENEMY_POINTS
// so that the campaign lasts as long as SCHEDULE says. Usage: node tests/fit.js [days]
const V = require('../core.js'); const { play } = require('./sim.js');
const SCHEDULE = [[1, 0.0], [10, 0.04], [20, 0.3], [50, 10], [100, 75], [150, 180], [200, 330]]; // [stage, day the bot should first clear it]
const days = +process.argv[2] || 420;
const r = play(days, 3, 10), tr = r.trace;
const ratingAt = (d) => { let best = tr[0]; for (const e of tr) if (e.day <= d) best = e; return best.rating; };
// ratio of bot rating to enemy power at the moment of first clear (typical clearing margin)
const ratios = []; let seen = 0;
tr.forEach((e) => { if (e.best > seen && e.best > 20) { ratios.push(e.rating / V.enemyFor(e.best).pe); seen = e.best; } });
ratios.sort((a, b) => a - b); const margin = ratios.length ? ratios[Math.floor(ratios.length / 2)] : 1;
console.log('stage reached by day:', [1, 5, 10, 30, 60, 90, 120, 180, 240, 300, 360, 420].map((d) => d + 'd=' + V.stageLabel(Math.max(1, (tr.filter((e) => e.day <= d).pop() || { best: 1 }).best))).join('  '));
console.log('median clear margin (rating/enemy power):', margin.toFixed(2));
console.log('suggested ENEMY_POINTS (scale 1):', JSON.stringify(SCHEDULE.map(([n, d]) => [n, Math.round(ratingAt(d) / margin / V.CFG.ENEMY_SCALE)])));
