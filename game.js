/* Voidsmith screens and the game loop. Rules live in core.js. */
(function () {
  'use strict';
  const V = window.VS, KEY = 'vs.save.v1';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rng = Math.random;

  /* ---------- save / load ---------- */
  let S;
  function load() {
    let raw = null; try { raw = localStorage.getItem(KEY); } catch (e) { /* blocked */ }
    let parsed = null; try { parsed = raw ? JSON.parse(raw) : null; } catch (e) { parsed = null; }
    S = V.migrate(parsed, Date.now());
  }
  function save() { S.last = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* full or blocked */ } }

  /* ---------- helpers ---------- */
  let tab = 'foundry', toastT = 0;
  function toast(msg) { const t = $('toast'); t.innerHTML = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3200); }
  function buzz(ms) { if (S.settings.vibrate && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* ignore */ } } }
  function modal(html, onClose) {
    $('mbox').innerHTML = html + '<div class="row" style="margin-top:14px"><button class="btn pri" id="mok">Continue</button></div>';
    $('modal').hidden = false; $('mok').onclick = () => { $('modal').hidden = true; if (onClose) onClose(); };
  }
  const tcol = (t) => V.TIERS[t].color;
  function statLabel(slot) { return V.slotById(slot).stat === 'dmg' ? 'Damage' : 'Hull'; }

  function subsLine(it) { return it.subs && it.subs.length ? '<div class="subs">' + it.subs.map((x) => V.SUBS[x.k].name + ' +' + x.v + '%').join(' · ') + '</div>' : ''; }
  function itemCard(it, cmp, opts) {
    opts = opts || {};
    const sl = V.slotById(it.slot), v = V.itemStat(it);
    let delta = '';
    if (cmp) {
      const p0 = V.power(S), p1 = V.powerWith(S, it), d = Math.round(p1.raw - p0.raw);
      const r = p0.rating > 0 ? (p1.rating / p0.rating - 1) * 100 : 100, up = p1.rating > p0.rating + 1e-9, dn = p1.rating < p0.rating - 1e-9;
      delta = '<div class="' + (up ? 'up' : dn ? 'dn' : 'dim tiny') + '">' + (up ? '▲ ' : dn ? '▼ ' : '') + (d >= 0 ? '+' : '-') + V.fmt(Math.abs(d)) + ' Power</div><div class="' + (up ? 'up' : dn ? 'dn' : 'dim tiny') + '" style="font-size:11px">build ' + (r >= 0 ? '+' : '') + r.toFixed(Math.abs(r) < 10 ? 1 : 0) + '%</div>';
    }
    const tag = opts.isNew ? '<span class="chip">NEW</span>' : '';
    const el = opts.btn ? 'button' : 'div';
    return '<' + el + ' class="item" ' + (opts.btn ? 'data-act="part" data-ref="' + (opts.ref || ('g:' + it.slot)) + '" ' : '') + 'style="--tc:' + tcol(it.tier) + (opts.gap ? ';margin-bottom:6px' : '') + '"><div class="gl">' + sl.glyph + '</div><div style="min-width:0"><div class="nm">' + esc(V.itemName(it)) + tag + '</div><div class="sb">' + V.TIERS[it.tier].name + ' · Lv ' + it.level + ' · ' + sl.name + '</div>' + subsLine(it) + '</div><div class="stat">+' + V.fmt(v) + '<div class="sb">' + statLabel(it.slot) + '</div>' + delta + '</div></' + el + '>';
  }

  /* ---------- Foundry ---------- */
  function renderFoundry() {
    const L = S.forge.level, u = V.upgradeInfo(S), up = S.forge.upgrade;
    let h = homeGearHtml() + '<div class="forgewrap"><button class="forge" id="forgeBtn" data-act="forge"><span>FORGE</span><small id="fcost"></small></button>' +
      '<div class="row" style="width:100%"><button class="btn" id="f10" data-act="f10">Forge ×10</button><button class="btn" id="fmax" data-act="fmax">Forge max</button></div></div>';
    h += '<h2>Forge bay</h2><div id="bay">' + bayHtml() + '</div>';
    h += '<h2>Foundry level ' + L + '</h2><div class="panel" id="upg">' + upgradeHtml(u, up) + '</div>';
    h += '<h2>Forge odds · level ' + L + '</h2><div class="panel"><div class="odds">';
    const odds = V.tierOdds(L);
    V.TIERS.forEach((t, i) => {
      if (!t.launch) { h += '<span class="n lock">' + t.name + '</span><span class="lock">locked</span><span></span>'; return; }
      if (odds[i] === 0) { h += '<span class="n" style="--tc:#3d4957;color:#3d4957">' + t.name + '</span><span class="lock">unlocks at Foundry ' + t.unlock + '</span><span></span>'; return; }
      h += '<span class="n" style="--tc:' + t.color + '">' + t.name + '</span><div class="bar" style="--tc:' + t.color + '"><i style="width:' + Math.max(2, odds[i] * 100).toFixed(1) + '%"></i></div><span class="p">' + (odds[i] * 100 < 1 ? '<1' : Math.round(odds[i] * 100)) + '%</span>';
    });
    h += '</div></div>';
    if (!$('arenaWrap')) { $('tab-foundry').innerHTML = '<div id="arenaWrap">' + arenaHtml() + '</div><div id="foundryRest"></div>'; missionStatic(); missionLive(); }
    $('foundryRest').innerHTML = h;
    live();
  }
  function homeGearHtml() {
    const p = V.power(S);
    let h = '<div class="stat3"><div><span class="dim tiny">DAMAGE</span><b>' + V.fmt(p.dmg) + '</b></div><div><span class="dim tiny">HULL</span><b>' + V.fmt(p.hull) + '</b></div><div><span class="dim tiny">POWER</span><b style="color:var(--cyan)">' + V.fmt(p.power) + '</b></div></div><div class="gear8">';
    V.SLOTS.forEach((sl) => {
      const it = S.gear[sl.id];
      h += it ? '<button class="tile" data-act="part" data-ref="g:' + sl.id + '" style="--tc:' + tcol(it.tier) + '"><span class="g">' + sl.glyph + '</span><span class="t">' + V.TIERS[it.tier].name + '</span><span class="l">Lv ' + it.level + '</span></button>'
        : '<div class="tile empty"><span class="g dim">' + sl.glyph + '</span><span class="t dim">Empty</span></div>';
    });
    return h + '</div>';
  }
  function bayHtml() {
    let h = '';
    if (S.pending) {
      const it = S.pending, free = V.holdFree(S) > 0;
      h += itemCard(it, true, { isNew: S.pendingNew }) + '<div class="row3"><button class="btn pri" data-act="equip">Equip</button><button class="btn" data-act="stash"' + (free ? '' : ' disabled') + '>' + (free ? 'Stash' : 'Hold full') + '</button><button class="btn" data-act="sell">Sell ' + V.fmt(V.sellFor(S, it)) + '</button></div>';
      if (S.gear[it.slot]) h += '<div class="sb dim" style="margin-top:6px;font-size:12px">Equipping sells your ' + esc(V.itemName(S.gear[it.slot])) + '.</div>';
    } else {
      h += '<div class="item empty"><div class="gl dim">⚒</div><div><div class="nm dim">Bay empty</div><div class="sb">' + (S.lastMsg ? S.lastMsg : 'Press FORGE to make a part.') + '</div></div></div>';
    }
    return h;
  }
  function upgradeHtml(u, up) {
    if (u.maxed) return '<div class="nm">Foundry at its limit</div><div class="sb dim">Level ' + S.forge.level + ' is the highest for this release. More tiers arrive in later updates.</div>';
    const T = V.TIERS;
    const unlocks = T.findIndex((t) => t.launch && t.unlock === u.to);
    const note = unlocks > 0 ? '<div class="up" style="margin:4px 0">Unlocks ' + T[unlocks].name + ' gear</div>' : '<div class="sb dim" style="margin:4px 0">Stronger gear and better odds.</div>';
    if (up) return '<div class="row" style="align-items:center;justify-content:space-between"><div class="nm">Upgrading to level ' + up.to + '</div><div id="utime" class="nm" style="color:var(--amber);flex:none"></div></div><div class="bar" style="margin-top:8px"><i id="ubar"></i></div>' + note + '<button class="btn" id="rushBtn" data-act="rush" style="margin-top:8px;width:100%"></button>';
    return '<div class="nm">Level ' + u.from + ' → ' + u.to + '</div>' + note + '<div class="sb">Cost <b id="ucost">' + V.fmt(u.credits) + ' Credits</b> · takes ' + V.fmtTime(u.seconds) + '</div><button class="btn pri" id="ubtn" data-act="upgrade" style="margin-top:10px;width:100%">Start upgrade</button>';
  }

  /* ---------- Ship ---------- */
  function shipSvg() {
    const best = V.highestTier(S), c = best >= 0 ? tcol(best) : '#3d4957';
    return '<svg class="ship" viewBox="0 0 300 150" aria-hidden="true"><defs><linearGradient id="hg" x1="0" x2="1"><stop offset="0" stop-color="#1a2430"/><stop offset="1" stop-color="#26323f"/></linearGradient></defs>' +
      '<path d="M20 75 L110 40 L250 55 L285 75 L250 95 L110 110 Z" fill="url(#hg)" stroke="' + c + '" stroke-width="2"/>' +
      '<path d="M110 40 L150 8 L190 50" fill="#18212b" stroke="' + c + '" stroke-width="2"/><path d="M110 110 L150 142 L190 100" fill="#18212b" stroke="' + c + '" stroke-width="2"/>' +
      '<circle cx="215" cy="75" r="9" fill="' + c + '" opacity=".85"/><rect x="6" y="66" width="20" height="18" rx="3" fill="' + c + '" opacity=".6"/></svg>';
  }
  function renderShip() {
    const p = V.power(S), sb = p.set;
    let h = shipSvg() + '<div class="stat3"><div><span class="dim tiny">DAMAGE</span><b>' + V.fmt(p.dmg) + '</b></div><div><span class="dim tiny">HULL</span><b>' + V.fmt(p.hull) + '</b></div><div><span class="dim tiny">POWER</span><b style="color:var(--cyan)">' + V.fmt(p.power) + '</b></div></div>';
    h += '<div class="panel" style="margin-bottom:8px"><div class="kv"><span>Set bonus</span><span style="color:' + (sb.bonus ? 'var(--good)' : 'var(--mute)') + '">' + (sb.bonus ? '+' + Math.round(sb.bonus * 100) + '% · ' + sb.pieces + ' parts ' + V.TIERS[sb.tier].name + '+' : 'none yet') + '</span><span>Codex bonus</span><span style="color:' + (p.codex ? 'var(--good)' : 'var(--mute)') + '">+' + (p.codex * 100).toFixed(1).replace('.0', '') + '%</span></div><div class="sb dim" style="margin-top:6px;font-size:12px">Fit 4 or 8 parts of the same tier or better for a set bonus. Tap a part to see it.</div></div><h2>Fitted systems</h2>';
    V.SLOTS.forEach((s2) => {
      const it = S.gear[s2.id];
      if (it) h += itemCard(it, false, { gap: true, btn: true });
      else h += '<div class="item empty" style="margin-bottom:6px"><div class="gl dim">' + s2.glyph + '</div><div><div class="nm dim">' + s2.name + '</div><div class="sb">Empty · adds ' + (s2.stat === 'dmg' ? 'Damage' : 'Hull') + '</div></div></div>';
    });
    h += commanderHtml() + researchHtml();
    $('tab-ship').innerHTML = h;
  }
  function commanderHtml() {
    const c = S.cmd, need = V.CFG.XP_NEED(c.level), cap = V.atCap(S), maxed = c.level >= V.CFG.LEVEL_MAX;
    let h = '<h2>Commander · level ' + c.level + ' · ' + V.RANK_NAMES[c.rank] + '</h2><div class="panel"><div class="bar"><i style="width:' + Math.min(100, c.xp / need * 100).toFixed(1) + '%"></i></div>' +
      '<div class="kv" style="margin-top:6px"><span>XP</span><span>' + V.fmt(c.xp) + ' / ' + V.fmt(need) + '</span><span>Bonus</span><span style="color:var(--good)">+' + ((c.level - 1) * V.CFG.LEVEL_BONUS * 100).toFixed(1).replace('.0', '') + '% Damage and Hull</span></div>' +
      '<div class="sb dim" style="margin-top:6px;font-size:12px">XP comes only from forging: 10 per Rusted or Refitted part, 20 per Hardened, Classified or Voidborn, 30 per Exotic. Fights give none.</div>';
    if (c.rank < V.RANK_NAMES.length - 1) {
      const goals = V.questGoals(S), r = V.rankReward(c.rank + 1);
      h += '<h2 style="margin:12px 0 6px">Promotion to ' + V.RANK_NAMES[c.rank + 1] + '</h2>' + (cap ? '<div class="up" style="margin-bottom:6px">Level ' + c.level + ' reached. Promotion needed to keep levelling.</div>' : '<div class="sb dim" style="margin-bottom:6px;font-size:12px">Reach level ' + V.levelCap(c) + ', then complete this quest to go further.</div>') +
        goals.map((g) => '<div class="tog" style="padding:6px 0"><div>' + esc(g.label) + '<small>' + V.fmt(Math.min(g.have, g.need)) + ' / ' + V.fmt(g.need) + '</small></div><b style="color:' + (g.ok ? 'var(--good)' : 'var(--mute)') + '">' + (g.ok ? '✔' : '…') + '</b></div>').join('') +
        '<div class="sb dim" style="font-size:12px;margin:4px 0 8px">Reward: ' + r.flux + ' Flux · ' + r.cores + ' AI Cores · ' + r.shards + ' Data Shards</div><button class="btn pri" data-act="promote" style="width:100%"' + (V.canPromote(S) ? '' : ' disabled') + '>' + (V.canPromote(S) ? 'Promote' : cap ? 'Finish the quest' : 'Reach level ' + V.levelCap(c) + ' first') + '</button>';
    } else if (maxed) h += '<div class="sb dim" style="margin-top:8px">Highest rank and level reached for this release.</div>';
    return h + '</div>';
  }
  function researchHtml() {
    let h = '<h2>Research · ' + V.fmt(S.shards) + ' Data Shards</h2><div class="sb dim" style="margin-bottom:8px;font-size:13px">Data Shards come from boss first clears, every fifth stage first clear and promotions.</div>';
    V.RESEARCH.forEach((n) => {
      const l = V.rLevel(S, n.id), max = l >= n.max, cost = V.researchCost(n, l);
      h += '<div class="panel" style="margin-bottom:8px"><div class="row" style="align-items:center;justify-content:space-between"><div><div class="nm">' + n.name + ' <span class="dim tiny">' + l + '/' + n.max + '</span></div><div class="sb">' + n.text(l) + (max ? '' : ' → <span class="up">' + n.text(l + 1) + '</span>') + '</div></div>' +
        (max ? '<span class="dim">MAX</span>' : '<button class="btn" data-act="research" data-id="' + n.id + '" style="flex:none"' + (S.shards >= cost ? '' : ' disabled') + '>' + cost + '</button>') + '</div></div>';
    });
    return h;
  }

  /* ---------- Missions: turn-order combat ---------- */
  let F = null; // the fight on screen (not saved)
  const VERDICTS = [[0.9, 'Easy', 'var(--good)'], [0.65, 'Favorable', 'var(--good)'], [0.4, 'Even match', 'var(--amber)'], [0.15, 'Risky', 'var(--bad)'], [-1, 'Overmatched', 'var(--bad)']];
  function arenaHtml() {
    return '<div class="panel arena"><div class="secline"><b id="secName"></b><span class="dim" id="secSub"></span></div>' +
      '<div class="battle"><div class="sl" id="stageLbl"></div><div class="dim" id="roundLbl" style="font-size:13px"></div><div class="dim" id="stageRw" style="font-size:12px;margin-top:2px"></div></div>' +
      '<div class="duel"><div class="side"><div class="who">Your ship</div><div class="hp"><i id="phb"></i></div><div class="hpn" id="phn"></div></div><div class="vs">VS</div>' +
      '<div class="side"><div id="etag"></div><div class="who" id="ename"></div><div class="hp e"><i id="ehb"></i></div><div class="hpn" id="ehn"></div></div></div>' +
      '<div class="fx" id="fx"></div><div class="flog" id="flog"></div><div id="banner"></div></div>';
  }
  function verdictOf(wc) { return VERDICTS.find((x) => wc >= x[0]); }
  function fightModal(title, f, lines) {
    const ex = f.events.filter((e) => e.who === 'p').length;
    modal('<h3>' + title + '</h3><div class="panel"><div class="kv"><span>Result</span><span style="color:' + (f.win ? 'var(--good)' : 'var(--bad)') + '">' + (f.win ? 'Victory' : 'Defeat') + '</span><span>Exchanges</span><span>' + ex + '</span><span>Hull left</span><span>' + V.fmt(f.events.length ? f.events[f.events.length - 1].php : f.pmax) + ' / ' + V.fmt(f.pmax) + '</span>' + (lines || '') + '</div></div>', renderMissions);
  }
  function renderMissions() {
    const now = Date.now(), ti = V.sweepInfo(S, now); V.rollDaily(S, now);
    let h = '<h2>Sweep tickets · ' + ti.tickets + '</h2><div class="panel"><div class="sb dim" id="tkNote" style="font-size:13px"></div><button class="btn" data-act="sweepAd" id="adBtn" style="width:100%;margin-top:8px"></button></div>';
    h += '<h2>Daily missions</h2><div class="sb dim" style="margin-bottom:8px;font-size:13px">Each mission has its own stage ladder and ' + V.CFG.DAILY_ATTEMPTS + ' tries a day. Win to climb. Sweep spends a ticket to collect the last stage you cleared. Everything resets at midnight UTC.</div>';
    V.DAILIES.forEach((d) => {
      const best = S.ladders[d.id], next = best + 1, locked = V.ladderLocked(S, d.id), left = V.attemptsLeft(S, d.id, now);
      let body;
      if (locked) body = '<div class="sb dim">Join a clan below to run this mission.</div>';
      else {
        const wc = V.winChance(S, next, 40, rng, V.CFG.DAILY_SCALE), v = verdictOf(wc);
        body = '<div class="kv"><span>Next stage</span><span>' + V.stageLabel(next) + '</span><span>Win chance</span><span style="color:' + v[2] + '">' + Math.round(wc * 100) + '% · ' + v[1] + '</span><span>Reward</span><span>' + d.text(d.reward(next)) + '</span><span>Tries left</span><span>' + left + ' / ' + V.CFG.DAILY_ATTEMPTS + '</span></div>' +
          '<div class="row" style="margin-top:8px"><button class="btn pri" data-act="ladderGo" data-id="' + d.id + '"' + (left > 0 && best < V.CFG.MAX_STAGE ? '' : ' disabled') + '>Enter ' + V.stageLabel(next) + '</button><button class="btn" data-act="ladderSweep" data-id="' + d.id + '"' + (best >= 1 && ti.tickets >= 1 ? '' : ' disabled') + '>' + (best >= 1 ? 'Sweep ' + V.stageLabel(best) + ' · ' + d.text(d.reward(best)) : 'Sweep (clear a stage first)') + '</button></div>';
      }
      h += '<div class="panel" style="margin-bottom:8px"><div class="nm">' + d.glyph + ' ' + d.name + (best ? ' <span class="dim tiny">cleared to ' + V.stageLabel(best) + '</span>' : '') + '</div><div class="sb dim" style="margin:2px 0 8px">' + d.blurb + '</div>' + body + '</div>';
    });
    // arena
    const L = V.leagueOf(S.arena.lp), lp = S.arena.lp, lo = V.CFG.LEAGUE_LP[L], hi = V.CFG.LEAGUE_LP[L + 1], aleft = V.arenaLeft(S, now), opp = V.arenaOpponents(S, now);
    h += '<h2>Arena · ' + V.LEAGUES[L] + '</h2><div class="panel"><div class="kv"><span>League points</span><span>' + lp + (hi ? ' / ' + hi : ' (top league)') + '</span><span>Medals</span><span style="color:var(--amber)">' + V.fmt(S.medals) + '</span><span>Fights left today</span><span>' + aleft + ' / ' + V.CFG.ARENA_ATTEMPTS + '</span></div>' +
      (hi ? '<div class="bar" style="margin:8px 0"><i style="width:' + Math.min(100, (lp - lo) / (hi - lo) * 100) + '%"></i></div>' : '') +
      opp.map((o, i) => '<div class="tog" style="padding:8px 0"><div><b>' + esc(o.name) + '</b><small>' + o.tag + ' · ' + Math.round(o.f * 100) + '% of your ship</small></div><button class="btn pri" data-act="arenaGo" data-i="' + i + '" style="flex:none"' + (aleft > 0 ? '' : ' disabled') + '>Fight</button></div>').join('') +
      '<div class="sb dim" style="font-size:12px;margin-top:6px">The league is simulated: no other players, just rivals built to your level. Win +25 points and Medals, lose −12.</div></div>';
    h += '<h2>Medal shop</h2><div class="panel">' + V.SHOP.map((it) => { const used = S.daily.shop[it.id] || 0; return '<div class="tog" style="padding:8px 0"><div>' + it.name + '<small>' + it.text + ' · ' + used + ' / ' + V.CFG.SHOP_LIMIT + ' today</small></div><button class="btn" data-act="shopBuy" data-id="' + it.id + '" style="flex:none"' + (used < V.CFG.SHOP_LIMIT && S.medals >= it.cost ? '' : ' disabled') + '>' + it.cost + '</button></div>'; }).join('') + '</div>';
    // clan
    const cp = V.clanProgress(S, now);
    h += '<h2>Clan</h2>';
    if (!cp) {
      h += V.CLANS.map((c) => '<div class="panel" style="margin-bottom:8px"><div class="row" style="align-items:center;justify-content:space-between"><div><div class="nm">' + c.name + '</div><div class="sb dim">' + c.members + ' members · ' + c.motto + '</div></div><button class="btn pri" data-act="clanJoin" data-id="' + c.id + '" style="flex:none">Join</button></div></div>').join('') +
        '<div class="sb dim" style="font-size:12px">Clans are simulated crews that play on their own schedule. Joining unlocks the Clan Convoy mission.</div>';
    } else {
      h += '<div class="panel"><div class="nm">' + cp.clan.name + '</div><div class="sb dim">' + cp.clan.members + ' members · ' + cp.clan.motto + '</div><div class="kv" style="margin-top:8px"><span>Clan goal today</span><span>' + cp.total + ' / ' + V.CFG.CLAN_TARGET + '</span><span>Crew</span><span>' + cp.members + '</span><span>You</span><span>' + cp.you + '</span></div><div class="bar" style="margin:8px 0"><i style="width:' + cp.total + '%"></i></div>' +
        cp.steps.map((st, i) => '<div class="tog" style="padding:7px 0"><div>' + st.at + ' points<small>' + Object.keys(st.reward).map((k) => st.reward[k] + ' ' + ({ alloy: 'Alloy', flux: 'Flux', cores: 'AI Cores', shards: 'Data Shards' }[k])).join(' + ') + '</small></div><button class="btn" data-act="clanClaim" data-i="' + i + '" style="flex:none"' + (st.reached && !st.claimed ? '' : ' disabled') + '>' + (st.claimed ? 'Claimed' : st.reached ? 'Claim' : 'Locked') + '</button></div>').join('') +
        '<div class="sb dim" style="font-size:12px;margin:6px 0">Your crew fills most of the goal as the day goes. Convoy wins and sweeps add ' + V.CFG.CLAN_WIN_POINTS + ' points each.</div><button class="btn" data-act="clanLeave" style="width:100%">Leave clan</button></div>';
    }
    h += '<h2>Matchup</h2><div class="panel" id="matchup"></div><h2>Chapters</h2><div class="panel" id="sectors"></div>';
    $('tab-missions').innerHTML = h;
    ticketLabel(); missionStatic();
  }
  function ticketLabel() {
    const i = V.sweepInfo(S, Date.now()), n = $('tkNote'); if (!n) return;
    n.textContent = (i.tickets < V.CFG.SWEEP_MAX ? 'Next ticket in ' + V.fmtTime(i.nextIn) : 'Tickets full') + ' · 1 every 2 hours, up to ' + V.CFG.SWEEP_MAX + ' stored';
    const ad = $('adBtn'); if (ad) { ad.disabled = i.adsLeft <= 0; ad.textContent = i.adsLeft > 0 ? 'Watch ad · +1 ticket (' + i.adsLeft + ' left today)' : 'No ad tickets left today'; }
  }
  function missionStatic() {
    const c = S.combat, e = V.enemyFor(c.stage), sec = V.SECTORS[Math.min(V.SECTORS.length - 1, V.sectorOf(c.stage))];
    if ($('secName')) {
    $('secName').textContent = 'Chapter ' + (V.sectorOf(c.stage) + 1) + ' · ' + sec.name;
    $('secSub').textContent = 'Best cleared: ' + (c.best ? V.stageLabel(c.best) : 'none');
    $('stageLbl').textContent = 'Sortie ' + V.stageLabel(c.stage);
    const rw0 = V.describeRewards(S, c.stage);
    $('stageRw').textContent = (rw0.first ? 'First clear: ' : 'Reward: ') + V.fmt(rw0.credits) + ' Credits' + (rw0.cores ? ' · ' + rw0.cores + ' AI Cores' : '') + (rw0.flux ? ' · ' + rw0.flux + ' Flux' : '') + (rw0.shards ? ' · ' + rw0.shards + ' Data Shards' : '');
    $('ename').textContent = e.name; $('etag').innerHTML = '<span class="foe' + (e.boss ? ' boss' : '') + '">' + (e.boss ? 'BOSS' : e.type.toUpperCase()) + '</span>';
    }
    if (!$('matchup')) return;
    const pw = V.power(S), wc = V.winChance(S, c.stage, 80, rng), v = VERDICTS.find((x) => wc >= x[0]), rw = V.describeRewards(S, c.stage);
    const wing = S.wing.active.map((k) => V.companionInfo(k).sp.name).join(', ') || 'none';
    $('matchup').innerHTML = '<div class="kv"><span>Your Power</span><span style="color:var(--cyan)">' + V.fmt(pw.power) + '</span><span>Build bonus</span><span>' + (pw.build >= 1 ? '+' : '') + ((pw.build - 1) * 100).toFixed(1) + '%</span><span>Wing</span><span>' + esc(wing) + '</span><span>Win chance</span><span class="verdict" style="color:' + v[2] + '">' + Math.round(wc * 100) + '% · ' + v[1] + '</span><span>' + (rw.first ? 'First clear' : 'Win') + '</span><span>' + V.fmt(rw.credits) + ' Cr' + (rw.cores ? ' · ' + rw.cores + ' Cores' : '') + (rw.flux ? ' · ' + rw.flux + ' Flux' : '') + (rw.shards ? ' · ' + rw.shards + ' Shards' : '') + '</span></div>' +
      '<div class="sb dim" style="margin-top:8px;font-size:12px">Power is only part of it. Bonus lines on your parts and your Wing change how a fight plays out, so two ships with equal Power can win very differently. Win chance comes from simulated fights.</div>';
    let sh = '';
    V.SECTORS.forEach((sc, i) => {
      const n = Math.max(0, Math.min(10, c.best - i * 10)), cur = V.sectorOf(c.stage) === i;
      sh += '<div class="secrow' + (cur ? ' cur' : '') + '"><span class="n">' + (i + 1) + ' · ' + sc.name + '</span><div class="bar"><i style="width:' + n * 10 + '%"></i></div><span class="dim" style="text-align:right">' + n + '/10</span></div>';
    });
    $('sectors').innerHTML = sh + '<div class="sb dim" style="font-size:12px;margin-top:6px">More chapters arrive in later updates.</div>';
  }
  function missionLive() {
    if (!$('phb')) return;
    if (!F) { $('phb').style.width = '100%'; $('ehb').style.width = '100%'; return; }
    const lastEv = F.events[F.i - 1];
    const php = lastEv ? lastEv.php : F.pmax, ehp = lastEv ? lastEv.ehp : F.emax;
    const sh = lastEv ? lastEv.shield : 0;
    $('phb').style.width = (php / F.pmax * 100).toFixed(1) + '%'; $('ehb').style.width = (ehp / F.emax * 100).toFixed(1) + '%';
    $('phn').textContent = V.fmt(php) + ' / ' + V.fmt(F.pmax) + (sh > 0 ? ' · shield ' + V.fmt(sh) : ''); $('ehn').textContent = V.fmt(ehp) + ' / ' + V.fmt(F.emax);
  }
  function floatNum(side, text, cls) {
    const fx = $('fx'); if (!fx) return;
    const n = document.createElement('span'); n.className = 'fnum ' + side + ' ' + (cls || ''); n.textContent = text; fx.appendChild(n); setTimeout(() => n.remove(), 950);
  }
  function startFight() {
    const stage = S.combat.stage, e = V.enemyFor(stage), p = V.fighter(S), r = V.simulateFight(p, e, rng);
    F = { stage, enemy: e, events: r.events, win: r.win, pmax: r.pmax, emax: r.emax, i: 0, round: 0, nextAt: Date.now() + 500, done: false, log: [] };
    if ($('banner')) { $('banner').innerHTML = ''; $('flog').innerHTML = ''; $('roundLbl').textContent = 'Exchange 0'; }
    missionLive();
  }
  function fightStep() {
    const now = Date.now();
    if (!F) { startFight(); return; }
    if (now < F.nextAt) return;
    const sp = 1;
    if (F.i < F.events.length) {
      const ev = F.events[F.i++];
      if (ev.who === 'p') { F.round++; if ($('roundLbl')) $('roundLbl').textContent = 'Exchange ' + F.round; }
      if ($('fx')) {
        let line;
        if (ev.who === 'p') {
          floatNum('e', '-' + V.fmt(ev.dmg), ev.label ? 'big' : ev.crit ? 'crit' : '');
          if (ev.heal) floatNum('p', '+' + V.fmt(ev.heal), 'heal');
          line = 'You hit for ' + V.fmt(ev.dmg) + (ev.label === 'overcharge' ? ' <b>OVERCHARGE</b>' : '') + (ev.crit ? ' <b>critical</b>' : '');
        } else if (ev.who === 'c') {
          if (ev.dmg) { floatNum('e', '-' + V.fmt(ev.dmg), ''); line = ev.name + ' hits for ' + V.fmt(ev.dmg); }
          else if (ev.heal !== undefined) { floatNum('p', '+' + V.fmt(ev.heal), 'heal'); line = ev.name + ' repairs ' + V.fmt(ev.heal); }
          else if (ev.shieldGain) { floatNum('p', '+' + V.fmt(ev.shieldGain), 'shield'); line = ev.name + ' raises a shield'; }
          else if (ev.slow) line = ev.name + ' jams the enemy';
          else line = ev.name + ' amps your next shot';
        } else {
          if (ev.dodged) { floatNum('p', 'DODGE', 'dodge'); line = 'You dodge ' + F.enemy.name; }
          else { floatNum('p', '-' + V.fmt(ev.dmg), ev.crit || ev.label ? 'crit' : ''); line = F.enemy.name + ' hits for ' + V.fmt(ev.dmg) + (ev.label === 'salvo' ? ' <b>HEAVY SALVO</b>' : '') + (ev.crit ? ' <b>critical</b>' : '') + (ev.absorbed ? ' (shield took ' + V.fmt(ev.absorbed) + ')' : ''); }
        }
        F.log.push(line); $('flog').innerHTML = F.log.slice(-3).join('<br>');
        missionLive();
      }
      F.nextAt = now + 550; return;
    }
    if (!F.done) {
      F.done = true;
      const rep = V.resolveFight(S, F.stage, F.win, rng);
      if ($('banner')) {
        $('banner').innerHTML = rep.win ? '<div class="banner win">Victory · +' + V.fmt(rep.credits) + ' Credits' + (rep.cores ? ' · +' + rep.cores + ' Cores' : '') + (rep.flux ? ' · +' + rep.flux + ' Flux' : '') + '</div>' : '<div class="banner loss">Defeated · falling back</div>';
      }
      if (rep.win && rep.first) toast(F.enemy.boss ? '<b>Boss defeated: ' + esc(F.enemy.name) + '</b>' + (rep.flux ? '<br>+' + rep.flux + ' Flux' : '') + (rep.cores ? '<br>+' + rep.cores + ' AI Cores' : '') + (rep.shards ? '<br>+' + rep.shards + ' Data Shards' : '') : 'Stage ' + V.stageLabel(F.stage) + ' cleared · +' + rep.cores + ' AI Cores' + (rep.shards ? ' · +' + rep.shards + ' Data Shards' : ''));
      save(); head(); live(); if (tab === 'wing') renderWing();
      F.nextAt = now + 1200; return;
    }
    F = null; missionStatic(); startFight();
  }

  /* ---------- Wing: companions ---------- */
  let lastSummon = [];
  function companionCard(key, extra) {
    const i = V.companionInfo(key);
    return '<div class="wcard" style="--tc:' + i.color + '"><div class="gl">' + i.sp.glyph + '</div><div style="min-width:0"><div class="nm">' + i.sp.name + ' <span class="rk" style="color:' + i.color + '">' + i.rankName + '</span></div><div class="sb">' + i.sp.role + ' · speed ' + i.speed + '</div><div class="sb" style="color:var(--fg)">' + i.text + '</div></div><div>' + (extra || '') + '</div></div>';
  }
  function renderWing() {
    const lvl = V.bayLevel(S), odds = V.summonOdds(lvl), into = S.wing.summons % V.CFG.BAY_STEP;
    let h = '<h2>Summon bay · level ' + lvl + '</h2><div class="panel"><div class="kv"><span>AI Cores</span><span style="color:var(--cyan);font-size:18px">' + V.fmt(S.cores) + '</span></div>' +
      '<div class="chips">' + odds.map((o, r) => o > 0.0005 ? '<span class="chipx" style="--tc:' + V.RANK_COLORS[r] + '">' + V.RANKS[r] + ' ' + (o * 100 < 1 ? '<1' : (o * 100 < 10 ? (o * 100).toFixed(1) : Math.round(o * 100))) + '%</span>' : '').join('') + '</div>' +
      (lvl < V.CFG.BAY_MAX ? '<div class="bar" style="margin:6px 0"><i style="width:' + (into / V.CFG.BAY_STEP * 100) + '%"></i></div><div class="sb dim" style="font-size:12px">' + (V.CFG.BAY_STEP - into) + ' more summons to level ' + (lvl + 1) + ' (better odds)</div>' : '<div class="sb dim" style="font-size:12px">Summon bay at maximum level</div>') +
      '<div class="row" style="margin-top:10px"><button class="btn pri" data-act="sum1"' + (S.cores < V.CFG.SUMMON_COST ? ' disabled' : '') + '>Summon · ' + V.CFG.SUMMON_COST + '</button><button class="btn pri" data-act="sum10"' + (S.cores < V.CFG.SUMMON10_COST ? ' disabled' : '') + '>×10 · ' + V.CFG.SUMMON10_COST + '</button></div>' +
      '<div class="sb dim" style="margin-top:8px;font-size:12px">Earn AI Cores from first clears (' + V.CFG.CORE_FIRST + '), boss first clears (' + V.CFG.CORE_BOSS + ') and a ' + Math.round(V.CFG.CORE_DROP * 100) + '% chance on every win.</div>';
    if (lastSummon.length) h += '<div class="chips" style="margin-top:8px">' + lastSummon.map((g) => '<span class="chipx" style="--tc:' + V.RANK_COLORS[g.rank] + '">' + V.SPECIES[g.sp].name + ' · ' + V.RANKS[g.rank] + '</span>').join('') + '</div>';
    h += '</div><h2>Active wing · ' + S.wing.active.length + ' / ' + V.CFG.WING_SLOTS + '</h2>';
    for (let i = 0; i < V.CFG.WING_SLOTS; i++) {
      const k = S.wing.active[i];
      h += k ? companionCard(k, '<button class="btn" data-act="unassign" data-i="' + i + '" style="padding:8px 10px">Remove</button>') : '<div class="item empty" style="margin-bottom:6px"><div class="gl dim">✈</div><div><div class="nm dim">Empty slot</div><div class="sb">Assign a companion from the hangar below.</div></div></div>';
    }
    const keys = Object.keys(S.wing.owned).sort((a, b) => { const pa = V.parseKey(a), pb = V.parseKey(b); return pb.rank - pa.rank || pa.sp - pb.sp; });
    const fusable = keys.some((k) => V.canFuse(S, k));
    h += '<h2>Hangar</h2>';
    if (fusable) h += '<button class="btn" data-act="fuseAll" style="width:100%;margin-bottom:8px">Fuse everything possible</button>';
    if (!keys.length) h += '<div class="item empty"><div class="gl dim">✈</div><div><div class="nm dim">No companions yet</div><div class="sb">Win fights to earn AI Cores, then summon.</div></div></div>';
    keys.forEach((k) => {
      const n = S.wing.owned[k], used = V.usedInWing(S, k), free = n - used;
      h += companionCard(k, '<div style="text-align:right"><div class="nm">×' + n + '</div><div class="row" style="margin-top:4px;gap:6px">' +
        '<button class="btn" data-act="assign" data-key="' + k + '" style="padding:6px 8px"' + (free > 0 && S.wing.active.length < V.CFG.WING_SLOTS ? '' : ' disabled') + '>Assign</button>' +
        (V.canFuse(S, k) ? '<button class="btn pri" data-act="fuse" data-key="' + k + '" style="padding:6px 8px">Fuse 3→1</button>' : '') + '</div></div>');
    });
    h += '<div class="sb dim" style="margin-top:8px;font-size:12px">Fuse three of the same companion and rank into one of the next rank. Companions act in turn order alongside your ship.</div>';
    $('tab-wing').innerHTML = h;
  }

  /* ---------- Armory: cargo hold, set bonuses, codex ---------- */
  function renderArmory() {
    const hu = V.holdUpgrade(S);
    let h = '<h2>Cargo hold · ' + S.hold.length + ' / ' + S.holdCap + '</h2>';
    if (!S.hold.length) h += '<div class="item empty"><div class="gl dim">▦</div><div><div class="nm dim">Hold empty</div><div class="sb">Stash parts from the forge bay to keep them for later.</div></div></div>';
    S.hold.forEach((it, i) => {
      h += '<div style="margin-bottom:8px">' + itemCard(it, true) + '<div class="row" style="margin-top:6px"><button class="btn pri" data-act="hEquip" data-i="' + i + '">Fit' + (S.gear[it.slot] ? ' (swap)' : '') + '</button><button class="btn" data-act="part" data-ref="h:' + i + '">Details</button><button class="btn" data-act="hSell" data-i="' + i + '">Sell ' + V.fmt(V.sellFor(S, it)) + '</button></div></div>';
    });
    h += '<div class="row" style="margin-top:6px">' + (S.hold.length ? '<button class="btn" data-act="hSellAll">Sell everything</button>' : '') +
      (hu.maxed ? '<button class="btn" disabled>Hold at maximum</button>' : '<button class="btn" data-act="hBuy"' + (S.credits < hu.cost ? ' disabled' : '') + '>+' + V.CFG.HOLD_STEP + ' slots · ' + V.fmt(hu.cost) + ' Cr</button>') + '</div>';
    const cur = V.power(S).set;
    h += '<h2>Set bonuses</h2><div class="panel"><div class="setrow dim tiny"><span>TIER OR BETTER</span><span>4 PARTS</span><span>8 PARTS</span></div>';
    for (let t = 0; t < V.LAUNCH_TIERS; t++) {
      const isCur = cur.tier === t;
      h += '<div class="setrow' + (isCur ? ' cur' : '') + '"><span style="color:' + tcol(t) + ';font-weight:700">' + V.TIERS[t].name + '</span><span>+' + Math.round(V.CFG.SET4[t] * 100) + '%</span><span>+' + Math.round(V.CFG.SET8[t] * 100) + '%</span></div>';
    }
    h += '<div class="sb dim" style="font-size:12px;margin-top:6px">Only your best set counts. They do not add together.</div></div>';
    h += '<h2>Codex · ' + V.codexCount(S) + ' / ' + V.LAUNCH_TIERS * 8 + ' parts</h2><div class="sb dim" style="margin-bottom:8px;font-size:13px">Every new part you forge adds +' + (V.CFG.CODEX_PART * 100) + '% to all stats. Finishing a whole tier adds +' + Math.round(V.CFG.CODEX_TIER * 100) + '% more. Current: +' + (V.codexBonus(S) * 100).toFixed(2).replace(/\.?0+$/, '') + '%</div>';
    V.TIERS.forEach((t, i) => {
      if (!t.launch) { h += '<div class="tierbox"><div class="odds" style="padding:6px 0"><span class="n lock">' + t.name + '</span><span class="lock">locked · arrives in a later update</span><span></span></div></div>'; return; }
      const n = V.codexTierCount(S, i);
      h += '<details class="tierbox" style="--tc:' + t.color + '"><summary><span class="n">' + t.name + '</span><div class="bar"><i style="width:' + (n / 8 * 100) + '%"></i></div><span class="dim" style="text-align:right">' + n + '/8</span></summary><ul>' +
        V.SLOTS.map((s2) => { const got = S.codex[i + ':' + s2.id]; return '<li class="' + (got ? 'ok' : 'no') + '">' + (got ? esc(t.names[s2.id]) : '? ' + s2.name) + '</li>'; }).join('') + '</ul></details>';
    });
    $('tab-armory').innerHTML = h;
  }

  /* ---------- Records ---------- */
  function statsHtml() {
    const st = S.stats, kv = [
      ['Parts forged', V.fmt(st.forged)], ['Medals', V.fmt(S.medals)], ['Arena league', V.LEAGUES[V.leagueOf(S.arena.lp)]], ['Codex', V.codexCount(S) + ' / ' + V.LAUNCH_TIERS * 8], ['Parts fitted', V.fmt(st.equipped)], ['Parts sold', V.fmt(st.sold)],
      ['Alloy produced', V.fmt(st.alloyEarned)], ['Credits earned', V.fmt(st.creditsEarned)],
      ['Commander level', S.cmd.level + ' · ' + V.RANK_NAMES[S.cmd.rank]], ['Foundry upgrades', V.fmt(st.upgrades)], ['Foundry level', S.forge.level + ' / ' + V.CFG.MAX_FORGE_LEVEL],
      ['Best tier fitted', V.highestTier(S) >= 0 ? V.TIERS[V.highestTier(S)].name : 'none'],
      ['Best stage cleared', S.combat.best ? V.stageLabel(S.combat.best) : 'none'], ['Fights won / lost', V.fmt(st.wins) + ' / ' + V.fmt(st.losses)], ['Bosses defeated', V.fmt(st.bosses)], ['Companions summoned', V.fmt(S.wing.summons)], ['Fusions', V.fmt(st.fused || 0)],
      ['Time at the forge', V.fmtTime(st.seconds)], ['Service began', new Date(S.created).toLocaleDateString()]
    ];
    return '<h2>Service record</h2><div class="panel"><div class="kv">' + kv.map((r) => '<span>' + r[0] + '</span><span>' + r[1] + '</span>').join('') + '</div></div>' +
      '<h2>Coming in later updates</h2><div class="panel dim" style="font-size:13px">Ascension and more tiers · Balance pass</div>';
  }

  /* ---------- Settings ---------- */
  let wipeT = 0;
  function settingsHtml() {
    const au = V.autoUnlocked(S);
    return       '<h2>Callsign</h2><input type="text" id="nameIn" maxlength="20" value="' + esc(S.name) + '" aria-label="Callsign">' +
      '<h2>Options</h2><div class="panel">' +
      '<div class="tog"><div>Vibration<small>A small buzz when you forge</small></div><label class="sw"><input type="checkbox" id="vibIn"' + (S.settings.vibrate ? ' checked' : '') + '><i></i></label></div>' +
      '<div class="tog"><div>Auto-Salvage<small>' + (au ? 'Fit upgrades automatically, sell everything else' : 'Unlocks at Foundry level ' + V.CFG.AUTO_UNLOCK_LEVEL) + '</small></div><label class="sw"><input type="checkbox" id="autoIn"' + (S.settings.auto && au ? ' checked' : '') + (au ? '' : ' disabled') + '><i></i></label></div></div>' +
      '<h2>Keep list</h2><div class="panel"><div class="sb dim" style="margin-bottom:8px;font-size:13px">When Auto-Salvage or Forge ×10 / max finds a part that is not an upgrade but has these bonus lines, it goes to the cargo hold instead of being sold (if there is room).</div><div class="fgrid">' + V.SUB_KEYS.map((k) => '<label><input type="checkbox" class="flt" data-k="' + k + '"' + (S.settings.filter.includes(k) ? ' checked' : '') + '>' + V.SUBS[k].name + '</label>').join('') + '</div><div class="tog" style="border:0;padding-bottom:0"><div>Lines needed</div><select id="fltMin"><option value="1"' + (S.settings.filterMin === 2 ? '' : ' selected') + '>At least 1</option><option value="2"' + (S.settings.filterMin === 2 ? ' selected' : '') + '>At least 2</option></select></div></div>' +
      '<h2>Save backup</h2><div class="panel"><div class="sb dim" style="margin-bottom:8px">Your game saves itself on this device. Copy this code somewhere safe to keep a backup, or paste a code to restore.</div>' +
      '<textarea id="codeBox" aria-label="Save code" placeholder="Save code"></textarea><div class="row" style="margin-top:8px"><button class="btn" data-act="export">Make code</button><button class="btn" data-act="copy">Copy</button><button class="btn" data-act="import">Load code</button></div></div>' +
      '<h2>Danger zone</h2><button class="btn bad" id="wipeBtn" data-act="wipe" style="width:100%">Erase everything</button>' +
      '<p class="dim tiny" style="text-align:center;margin-top:18px">' + V.CFG.NAME + ' · v8 · depot build</p>';
  }

  /* ---------- Depot: gift, deals, rewarded ads ---------- */
  // Stand-in for a rewarded video: a placeholder screen with a countdown. With the remove-ads pack the reward is claimed at once.
  function adStandIn(title, rewardText, grant) {
    if (S.noAds) { if (grant()) toast('<b>' + esc(rewardText) + '</b><br>claimed without video'); return; }
    let n = 5; $('modal').hidden = false;
    const draw = () => { $('mbox').innerHTML = '<div class="adbox"><h3>' + esc(title) + '</h3><div class="sb dim">Optional · ' + esc(rewardText) + '</div><div class="adscreen"><span class="dim tiny">AD STAND-IN</span><b>' + n + '</b>A real ad plays here later</div><div class="row"><button class="btn" id="adSkip">Cancel</button><button class="btn pri" id="adGo"' + (n > 0 ? ' disabled' : '') + '>' + (n > 0 ? 'Reward in ' + n + 's' : 'Claim reward') + '</button></div></div>'; };
    draw(); let t = setInterval(() => { if (n > 0) n--; if ($('adGo')) draw(); else clearInterval(t); if (n === 0) clearInterval(t); }, 1000);
    document.addEventListener('click', function h(e) {
      const id = e.target.id; if (id !== 'adGo' && id !== 'adSkip') return;
      document.removeEventListener('click', h); clearInterval(t); $('modal').hidden = true;
      if (id === 'adGo' && n === 0) { if (grant()) { buzz(25); toast('<b>' + esc(rewardText) + '</b>'); } save(); head(); live(); refreshDepotish(); }
    });
  }
  function refreshDepotish() { if (tab === 'depot') renderDepot(); else if (tab === 'missions') renderMissions(); else if (tab === 'foundry') renderFoundry(); }
  function renderDepot() {
    const now = Date.now(); V.rollDaily(S, now);
    let h = '<h2>Daily gift</h2><div class="panel"><div class="row" style="align-items:center;justify-content:space-between"><div><div class="nm">Supply drop</div><div class="sb dim">100 Alloy, free every day</div></div><button class="btn pri" data-act="gift" style="flex:none"' + (S.daily.gift ? ' disabled' : '') + '>' + (S.daily.gift ? 'Claimed' : 'Claim') + '</button></div></div>';
    h += '<h2>Daily deals</h2><div class="sb dim" style="margin-bottom:8px;font-size:13px">Paid in Flux. The shelf changes every day at midnight UTC.</div>';
    V.dealsToday(now).forEach((d) => {
      const bought = !!S.daily.deals[d.id];
      h += '<div class="panel" style="margin-bottom:8px"><div class="row" style="align-items:center;justify-content:space-between"><div><div class="nm">' + d.name + '</div><div class="sb dim">' + d.text + '</div></div><button class="btn" data-act="deal" data-id="' + d.id + '" style="flex:none"' + (bought || S.flux < d.cost ? ' disabled' : '') + '>' + (bought ? 'Bought' : d.cost + ' Flux') + '</button></div></div>';
    });
    h += '<h2>Optional ads</h2><div class="sb dim" style="margin-bottom:8px;font-size:13px">Never forced. Each one has a daily limit and a cooldown, and each is a small help rather than a shortcut.</div>';
    const ti = V.sweepInfo(S, now);
    h += '<div class="panel" style="margin-bottom:8px"><div class="row" style="align-items:center;justify-content:space-between"><div><div class="nm">Sweep ticket</div><div class="sb dim">+1 ticket · ' + ti.adsLeft + ' left today</div></div><button class="btn" data-act="sweepAd" style="flex:none"' + (ti.adsLeft > 0 ? '' : ' disabled') + '>Watch</button></div></div>';
    V.AD_OFFERS.forEach((o) => {
      const st = V.adStatus(S, o.id, now);
      h += '<div class="panel" style="margin-bottom:8px"><div class="row" style="align-items:center;justify-content:space-between"><div><div class="nm">' + o.name + '</div><div class="sb dim">' + (o.id === 'credits' ? 'about ' + V.fmt(adCreditsPreview()) + ' Credits' : o.text) + ' · ' + st.left + ' left today' + (st.cdLeft > 0 && st.left > 0 ? ' · ready in ' + V.fmtTime(st.cdLeft) : '') + (st.needs ? ' · needs a Foundry upgrade running' : '') + '</div></div><button class="btn" data-act="ad" data-id="' + o.id + '" style="flex:none"' + (st.ready ? '' : ' disabled') + '>Watch</button></div></div>';
    });
    h += '<h2>Remove ads</h2><div class="panel"><div class="sb dim" style="margin-bottom:8px;font-size:13px">One-time pack. Every optional ad reward is then claimed instantly with no video. The reward limits stay the same.</div>' + (S.noAds ? '<div class="nm" style="color:var(--good)">Active</div>' : '<button class="btn" data-act="noAds" style="width:100%">Get the pack (stand-in, no real payment)</button>') + '</div>';
    $('tab-depot').innerHTML = h;
  }
  function adCreditsPreview() { return Math.round(V.creditsWin(Math.max(1, S.combat.best), S) * 40); }
  function badges() {
    const now = Date.now(), set = (t, on) => { const b = document.querySelector('nav button[data-tab=' + t + '] .dot'); if (b) b.hidden = !on; };
    V.rollDaily(S, now);
    const cp = V.clanProgress(S, now);
    set('depot', !S.daily.gift);
    set('missions', V.DAILIES.some((d) => !V.ladderLocked(S, d.id) && V.attemptsLeft(S, d.id, now) > 0 && S.ladders[d.id] < V.CFG.MAX_STAGE) || V.arenaLeft(S, now) > 0 || !!(cp && cp.steps.some((st) => st.reached && !st.claimed)));
    set('ship', V.canPromote(S) || V.RESEARCH.some((n) => V.rLevel(S, n.id) < n.max && S.shards >= V.researchCost(n, V.rLevel(S, n.id))));
  }
  function renderMore() {
    $('tab-more').innerHTML = statsHtml() + settingsHtml();
    $('nameIn').onchange = (e) => { S.name = e.target.value.trim() || 'Commander'; save(); head(); };
    $('vibIn').onchange = (e) => { S.settings.vibrate = e.target.checked; save(); };
    $('autoIn').onchange = (e) => { S.settings.auto = e.target.checked; save(); };
    document.querySelectorAll('.flt').forEach((c) => { c.onchange = () => { const k = c.dataset.k, f = S.settings.filter; if (c.checked && !f.includes(k)) f.push(k); if (!c.checked) S.settings.filter = f.filter((x) => x !== k); save(); }; });
    $('fltMin').onchange = (e) => { S.settings.filterMin = +e.target.value; save(); };
  }
  function encode() { return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }
  function decode(t) { return JSON.parse(decodeURIComponent(escape(atob(t.trim())))); }

  /* ---------- live updates ---------- */
  function head() {
    $('callsign').textContent = S.name;
    $('power').textContent = V.fmt(V.power(S).power);
  }
  function live() {
    $('alloy').textContent = V.fmt(S.alloy);
    $('credits').textContent = V.fmt(S.credits);
    $('flux').textContent = V.fmt(S.flux);
    $('rate').textContent = '+' + (V.alloyRate(S) * 60).toFixed(2).replace(/0$/, '') + '/min';
    $('lvl').textContent = 'LV ' + S.cmd.level + ' · ' + V.RANK_NAMES[S.cmd.rank];
    $('xpfill').style.width = Math.min(100, S.cmd.xp / V.CFG.XP_NEED(S.cmd.level) * 100).toFixed(1) + '%';
    $('shards').textContent = V.fmt(S.shards);
    if (tab === 'missions') ticketLabel();
    badges();
    const fb = $('forgeBtn');
    if (fb) {
      const c = V.forgeCost(S), can = S.alloy >= c;
      fb.disabled = !can; $('fcost').textContent = c + ' Alloy';
      const m = V.maxForges(S); $('f10').disabled = m < 2; $('fmax').disabled = m < 2; $('fmax').textContent = 'Forge max' + (m >= 2 ? ' (' + V.fmt(m) + ')' : '');
      const up = S.forge.upgrade;
      if (up) {
        const total = up.endAt - up.startAt, left = Math.max(0, up.endAt - Date.now());
        const ut = $('utime'), ub = $('ubar');
        if (ut) ut.textContent = V.fmtTime(left / 1000);
        if (ub) ub.style.width = Math.min(100, (1 - left / total) * 100).toFixed(1) + '%';
        const rb = $('rushBtn'); if (rb) { const c = V.rushCost(S, Date.now()); rb.textContent = 'Rush · ' + c + ' Flux'; rb.disabled = S.flux < c; }
      } else {
        const ub = $('ubtn'), u = V.upgradeInfo(S);
        if (ub && !u.maxed) { ub.disabled = S.credits < u.credits; ub.textContent = S.credits < u.credits ? 'Need ' + V.fmt(u.credits - S.credits) + ' more Credits' : 'Start upgrade'; }
      }
    }
  }
  function refresh() { head(); live(); if (tab === 'foundry') renderFoundry(); else if (tab === 'ship') renderShip(); else if (tab === 'armory') renderArmory(); else if (tab === 'missions') renderMissions(); else if (tab === 'wing') renderWing(); else if (tab === 'depot') renderDepot(); }

  /* ---------- actions ---------- */
  function doForge() {
    const r = V.forgeOnce(S, rng);
    if (!r.ok) return;
    buzz(12);
    const fb = $('forgeBtn'); if (fb) { fb.classList.add('hit'); setTimeout(() => fb.classList.remove('hit'), 90); }
    if (r.auto) S.lastMsg = (r.auto === 'equipped' ? 'Fitted ' : 'Sold ') + esc(V.itemName(r.item)) + ' (' + V.TIERS[r.item.tier].name + ')';
    else S.lastMsg = '';
    if (r.tierDone) toast('<b>Tier complete: ' + V.TIERS[r.item.tier].name + '!</b><br>Codex bonus increased'); else if (r.isNew && r.auto) toast('New Codex part: ' + esc(V.itemName(r.item)));
    if (r.levels) { toast('<b>Commander level ' + S.cmd.level + '</b>'); buzz([20, 30, 20]); }
    save(); refresh();
  }
  function act(a, el) {
    if (a === 'forge') return doForge();
    if (a === 'f10' || a === 'fmax') {
      const n = a === 'f10' ? 10 : V.maxForges(S);
      const r = V.forgeBatch(S, n, rng); if (!r.forged) return;
      buzz(25);
      S.lastMsg = 'Last batch: ' + r.forged + ' forged · ' + r.equipped + ' fitted · ' + r.sold + ' sold';
      toast('<b>' + r.forged + ' parts forged</b><br>' + r.equipped + ' fitted upgrades · ' + (r.kept ? r.kept + ' kept · ' : '') + r.sold + ' sold for ' + V.fmt(r.credits) + ' Credits' + (r.newParts ? '<br><span style="color:var(--cyan)">' + r.newParts + ' new Codex part' + (r.newParts > 1 ? 's' : '') + '</span>' : '') + (r.tiersDone.length ? '<br><b>Tier complete: ' + r.tiersDone.map((t) => V.TIERS[t].name).join(', ') + '!</b>' : '') + (r.levels ? '<br><b>Commander level ' + S.cmd.level + '</b>' : '') + (r.best ? '<br>Best: <span style="color:' + tcol(r.best.tier) + '">' + esc(V.itemName(r.best)) + '</span>' : ''));
      save(); return refresh();
    }
    if (a === 'equip') { const r = V.equipPending(S); if (r) { buzz(18); S.lastMsg = 'Fitted ' + esc(V.itemName(r.item)); save(); refresh(); } return; }
    if (a === 'sell') { const v = V.sellPending(S); if (v) { S.lastMsg = 'Sold for ' + V.fmt(v) + ' Credits'; save(); refresh(); } return; }
    if (a === 'sum1' || a === 'sum10') {
      const r = V.summon(S, a === 'sum1' ? 1 : 10, rng);
      if (r.ok) { lastSummon = r.got; buzz(25); const best = r.got.reduce((m, g) => g.rank > m ? g.rank : m, 0); toast('Summoned ' + r.got.length + (r.got.length > 1 ? ' companions' : ' companion') + ' · best: <span style="color:' + V.RANK_COLORS[best] + '">' + V.RANKS[best] + '</span>'); save(); head(); live(); renderWing(); }
      return;
    }
    if (a === 'assign') { if (V.assign(S, el.dataset.key)) { save(); renderWing(); } return; }
    if (a === 'unassign') { if (V.unassign(S, +el.dataset.i)) { save(); renderWing(); } return; }
    if (a === 'fuse') { const up = V.fuse(S, el.dataset.key); if (up) { buzz(30); const i = V.companionInfo(up); toast('Fused into <span style="color:' + i.color + '">' + i.sp.name + ' · ' + i.rankName + '</span>'); save(); renderWing(); } return; }
    if (a === 'fuseAll') { const n = V.fuseAll(S); toast(n ? n + ' fusions' : 'Nothing to fuse'); save(); renderWing(); return; }
    if (a === 'sweepAd') { adStandIn('Sweep ticket', '+1 sweep ticket', () => V.sweepAd(S, Date.now())); return; }
    if (a === 'ad') { const o = V.AD_OFFERS.find((x) => x.id === el.dataset.id); adStandIn(o.name, o.id === 'credits' ? '+' + V.fmt(adCreditsPreview()) + ' Credits' : o.text, () => V.claimAd(S, o.id, Date.now())); return; }
    if (a === 'gift') { if (V.claimGift(S, Date.now())) { buzz(25); toast('<b>Supply drop</b><br>+100 Alloy'); save(); head(); live(); renderDepot(); } return; }
    if (a === 'deal') { if (V.buyDeal(S, el.dataset.id, Date.now())) { buzz(25); save(); head(); live(); renderDepot(); } return; }
    if (a === 'noAds') { V.buyNoAds(S); toast('Remove-ads pack active (stand-in)'); save(); renderDepot(); return; }
    if (a === 'ladderGo') {
      const id = el.dataset.id, d = V.dailyById(id), r = V.ladderFight(S, id, rng, Date.now()); if (!r.ok) return;
      save(); head(); live();
      fightModal(d.name + ' · ' + V.stageLabel(r.stage), r.fight, r.win ? '<span>Reward</span><span style="color:var(--amber)">' + d.text(r.reward) + '</span>' : '<span>Reward</span><span class="dim">none</span>'); return;
    }
    if (a === 'ladderSweep') { const d = V.dailyById(el.dataset.id), r = V.ladderSweep(S, el.dataset.id, Date.now()); if (r) { buzz(15); toast('Swept ' + d.name + ' ' + V.stageLabel(r.stage) + ' · +' + d.text(r.reward)); save(); head(); live(); renderMissions(); } return; }
    if (a === 'arenaGo') {
      const r = V.arenaFight(S, +el.dataset.i, rng, Date.now()); if (!r.ok) return; save(); head(); live();
      fightModal('Arena', r.fight, '<span>League points</span><span>' + (r.lp > 0 ? '+' : '') + r.lp + '</span><span>Medals</span><span style="color:var(--amber)">+' + r.medals + '</span>' + (r.up ? '<span>Promoted</span><span style="color:var(--good)">' + V.LEAGUES[r.league] + '</span>' : '')); return;
    }
    if (a === 'shopBuy') { if (V.shopBuy(S, el.dataset.id, Date.now())) { buzz(20); save(); head(); live(); renderMissions(); } return; }
    if (a === 'clanJoin') { if (V.joinClan(S, el.dataset.id)) { toast('Joined ' + V.CLANS.find((c) => c.id === el.dataset.id).name); save(); renderMissions(); } return; }
    if (a === 'clanLeave') { V.leaveClan(S); save(); renderMissions(); return; }
    if (a === 'clanClaim') { if (V.claimClan(S, +el.dataset.i, Date.now())) { buzz(20); save(); head(); live(); renderMissions(); } return; }
    if (a === 'research') { if (V.buyResearch(S, el.dataset.id)) { buzz(20); save(); renderShip(); head(); live(); } return; }
    if (a === 'promote') { const r = V.promote(S); if (r) { buzz([40, 40, 40]); toast('<b>Promoted to ' + V.RANK_NAMES[r.rank] + '</b><br>+' + r.reward.flux + ' Flux · +' + r.reward.cores + ' AI Cores · +' + r.reward.shards + ' Data Shards'); save(); head(); live(); renderShip(); } return; }
    if (a === 'rush') { if (V.rushUpgrade(S, Date.now())) { buzz(30); save(); tick(); } return; }
    if (a === 'stash') { if (V.stashPending(S)) { S.lastMsg = 'Stashed in the cargo hold'; save(); refresh(); } return; }
    if (a === 'hEquip') { if (V.equipFromHold(S, +el.dataset.i)) { buzz(18); save(); refresh(); } return; }
    if (a === 'hSell') { const v = V.sellFromHold(S, +el.dataset.i); if (v) { save(); refresh(); } return; }
    if (a === 'hSellAll') { const v = V.sellAllHold(S); toast('Sold the whole hold for ' + V.fmt(v) + ' Credits'); save(); refresh(); return; }
    if (a === 'hBuy') { if (V.buyHold(S)) { save(); refresh(); } return; }
    if (a === 'part') { partSheet(el.dataset.ref); return; }
    if (a === 'unfit') { $('modal').hidden = true; if (V.unfit(S, el.dataset.slot)) { save(); refresh(); } return; }
    if (a === 'close') { $('modal').hidden = true; return; }
    if (a === 'upgrade') { const r = V.startUpgrade(S, Date.now()); if (r.ok) { buzz(30); save(); refresh(); } return; }
    if (a === 'export') { $('codeBox').value = encode(); return; }
    if (a === 'copy') {
      const b = $('codeBox'); if (!b.value) b.value = encode(); b.select();
      try { navigator.clipboard.writeText(b.value).then(() => toast('Code copied'), () => document.execCommand('copy')); } catch (e) { document.execCommand('copy'); }
      return;
    }
    if (a === 'import') {
      try { const o = V.migrate(decode($('codeBox').value), Date.now()); S = o; F = null; save(); toast('Save loaded'); tab = 'foundry'; showTab(); refresh(); }
      catch (e) { toast('That code did not work. Copy the whole thing and try again.'); }
      return;
    }
    if (a === 'wipe') {
      const b = $('wipeBtn');
      if (b.dataset.arm) { clearTimeout(wipeT); try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } S = V.newState(Date.now()); F = null; save(); toast('Everything erased'); tab = 'foundry'; showTab(); refresh(); return; }
      b.dataset.arm = '1'; b.textContent = 'Tap again to erase everything'; wipeT = setTimeout(() => { b.dataset.arm = ''; b.textContent = 'Erase everything'; }, 4000);
    }
  }
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b && !b.disabled) act(b.dataset.act, b); });

  function showTab() {
    if (tab !== 'missions' && F && false) F = null;
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.id === 'tab-' + tab));
    document.querySelectorAll('nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    if (tab === 'foundry') renderFoundry(); else if (tab === 'ship') renderShip(); else if (tab === 'armory') renderArmory(); else if (tab === 'missions') renderMissions(); else if (tab === 'wing') renderWing(); else if (tab === 'depot') renderDepot(); else renderMore();
  }
  document.querySelectorAll('nav button').forEach((b) => { b.onclick = () => { tab = b.dataset.tab; showTab(); }; });

  function partOf(ref) { const [k, x] = ref.split(':'); return k === 'g' ? S.gear[x] : S.hold[+x]; }
  function partSheet(ref) {
    const it = partOf(ref); if (!it) return;
    const free = V.holdFree(S) > 0, fitted = ref[0] === 'g';
    let lines = '';
    if (it.subs.length) {
      lines = '<h2 style="margin:12px 0 6px">Bonus lines</h2>' + it.subs.map((x) => '<div class="tog" style="padding:7px 0"><div><b style="color:var(--cyan)">' + V.SUBS[x.k].name + ' +' + x.v + '%</b><small>' + V.SUBS[x.k].note + '</small></div></div>').join('');
    } else lines = '<div class="sb dim" style="margin-top:10px">Rusted parts have no bonus lines. Refitted and better parts roll them.</div>';
    $('mbox').innerHTML = '<h3>' + esc(V.itemName(it)) + '</h3>' + itemCard(it, false) + '<div class="panel" style="margin-top:10px"><div class="kv"><span>Tier</span><span style="color:' + tcol(it.tier) + '">' + V.TIERS[it.tier].name + '</span><span>Made at Foundry</span><span>Level ' + it.level + '</span><span>Sell value</span><span>' + V.fmt(V.sellFor(S, it)) + ' Credits</span></div></div>' + lines +
      '<div class="row" style="margin-top:14px">' + (fitted ? '<button class="btn" data-act="unfit" data-slot="' + it.slot + '"' + (free ? '' : ' disabled') + '>' + (free ? 'Move to hold' : 'Hold full') + '</button>' : '') + '<button class="btn pri" data-act="close">Close</button></div>';
    $('modal').hidden = false;
  }

  /* ---------- time ---------- */
  function welcome(rep) {
    if (rep.away < 60) return;
    let h = '<h3>Welcome back, ' + esc(S.name) + '</h3><div class="sb">You were away ' + V.fmtTime(rep.away) + '.' + (rep.capped ? ' Production counts up to ' + V.fmtTime(rep.cap) + ' (raise it in Research).' : '') + '</div>' +
      '<div class="panel" style="margin-top:10px"><div class="kv"><span>Alloy produced</span><span style="color:var(--amber)">+' + V.fmt(rep.alloy) + '</span>' + (rep.patrolCores ? '<span>AI Cores from patrol</span><span style="color:var(--cyan)">+' + V.fmt(rep.patrolCores) + '</span>' : '') + (rep.patrolCredits ? '<span>Patrol on stage ' + S.combat.best + ' (' + V.fmt(rep.patrolWins) + ' fights, half pay)</span><span style="color:var(--amber)">+' + V.fmt(rep.patrolCredits) + ' Cr</span>' : '') + (rep.levelUp ? '<span>Foundry upgrade done</span><span style="color:var(--good)">Level ' + rep.levelUp + '</span>' : '') + '</div></div>';
    modal(h);
  }
  let lastSave = 0;
  function tick() {
    const now = Date.now(), dt = (now - S.last) / 1000;
    if (dt > 5) { const rep = V.offline(S, now); S.last = now; save(); welcome(rep); refresh(); return; }
    S.last = now;
    V.earn(S, dt);
    const lv = V.checkUpgrade(S, now);
    if (lv) { buzz([40, 40, 40]); toast('<b>Foundry upgraded to level ' + lv + '</b>'); save(); refresh(); return; }
    if (now - lastSave > 5000) { lastSave = now; save(); }
    live();
  }

  /* ---------- start ---------- */
  load();
  const rep = V.offline(S, Date.now());
  S.last = Date.now(); save();
  showTab(); head(); live();
  welcome(rep);
  setInterval(tick, 250);
  setInterval(() => { if (!document.hidden) fightStep(); }, 120);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); else save(); });
  window.addEventListener('pagehide', save);
})();
