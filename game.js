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
  function save() { if (window.vsNoSave) return; S.last = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* full or blocked */ } }

  /* ---------- helpers ---------- */
  let tab = 'foundry', toastT = 0;
  function toast(msg) { const t = $('toast'); t.innerHTML = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3200); }
  function buzz(ms) { if (S.settings.vibrate && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* ignore */ } } }
  function modal(html, onClose) {
    modalKind = null;
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
    return '<' + el + ' class="item" ' + (opts.btn ? 'data-act="part" data-ref="' + (opts.ref || ('g:' + it.slot)) + '" ' : '') + 'style="--tc:' + tcol(it.tier) + (opts.gap ? ';margin-bottom:6px' : '') + '"><div class="gl">' + ((USE_RIG && window.VSShip.icon(it, 'gl')) || sl.glyph) + '</div><div style="min-width:0"><div class="nm">' + esc(V.itemName(it)) + tag + '</div><div class="sb">' + V.TIERS[it.tier].name + ' · Lv ' + it.level + ' · ' + sl.name + '</div>' + subsLine(it) + '</div><div class="stat">+' + V.fmt(v) + '<div class="sb">' + statLabel(it.slot) + '</div>' + delta + '</div></' + el + '>';
  }

  /* ---------- art ---------- */
  const SVGH = (w, h, body, cls) => '<svg class="' + (cls || '') + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true">' + body + '</svg>';
  const ICON = {
    cannon: '<rect x="6" y="20" width="30" height="9" rx="2" fill="#fff"/><rect x="34" y="22" width="9" height="5" fill="#cfd8e3"/><rect x="10" y="29" width="14" height="9" rx="2" fill="#aab6c4"/><circle cx="17" cy="24.5" r="2.5" fill="#222"/>',
    pod: '<g fill="#fff"><path d="M8 14h24l6 4-6 4H8z"/><path d="M8 24h24l6 4-6 4H8z"/></g><g fill="#ff6b5e"><path d="M32 14l6 4-6 4z"/><path d="M32 24l6 4-6 4z"/></g><rect x="8" y="36" width="30" height="3" fill="#aab6c4"/>',
    array: '<circle cx="24" cy="24" r="14" fill="none" stroke="#fff" stroke-width="3"/><circle cx="24" cy="24" r="6" fill="none" stroke="#fff" stroke-width="3"/><path d="M24 4v12M24 32v12M4 24h12M32 24h12" stroke="#fff" stroke-width="3"/>',
    coil: '<path d="M27 3L10 27h11l-4 18 21-26H26z" fill="#ffe066" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>',
    plating: '<path d="M8 8h32v22L24 44 8 30z" fill="#fff"/><path d="M13 13h22v15L24 38 13 28z" fill="#aab6c4"/><circle cx="12" cy="12" r="2" fill="#333"/><circle cx="36" cy="12" r="2" fill="#333"/>',
    bulkhead: '<rect x="6" y="8" width="36" height="9" rx="2" fill="#fff"/><rect x="6" y="20" width="36" height="9" rx="2" fill="#cfd8e3"/><rect x="6" y="32" width="36" height="9" rx="2" fill="#aab6c4"/>',
    emitter: '<path d="M24 4l17 10v20L24 44 7 34V14z" fill="none" stroke="#fff" stroke-width="3"/><circle cx="24" cy="24" r="7" fill="#7ee7ff"/><circle cx="24" cy="24" r="3" fill="#fff"/>',
    spar: '<rect x="8" y="6" width="32" height="7" fill="#fff"/><rect x="8" y="35" width="32" height="7" fill="#fff"/><rect x="20" y="13" width="8" height="22" fill="#cfd8e3"/>'
  };
  const slotIcon = (id) => SVGH(48, 48, ICON[id], 'ico');
  const COIN = {
    alloy: '<path d="M8 2l5 3v6l-5 3-5-3V5z" fill="#9fb0c2" stroke="#e5edf5" stroke-width="1"/>',
    credits: '<circle cx="8" cy="8" r="6.5" fill="#ffc83d" stroke="#b07a00" stroke-width="1.2"/><path d="M8 4.5v7M5.5 6.5h4a1.5 1.5 0 010 3h-4" stroke="#8a5d00" stroke-width="1.2" fill="none"/>',
    flux: '<path d="M8 1l5 7-5 7-5-7z" fill="#4db8ff" stroke="#bfe6ff" stroke-width="1"/>',
    shards: '<path d="M8 1l4 5-2 9H6L4 6z" fill="#b57bff" stroke="#e3ccff" stroke-width="1"/>'
  };
  const coinIcon = (k) => SVGH(16, 16, COIN[k], 'coin');
  function playerShip(c) {
    return SVGH(200, 110, '<defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#46586b"/><stop offset="1" stop-color="#1c2631"/></linearGradient></defs>' +
      '<path class="flame" d="M24 55L2 42v26z" fill="#ff9a1f"/><path d="M22 55L8 48v14z" fill="#ffe08a"/>' +
      '<path d="M26 38L60 14h40l8 12-18 12z" fill="#2a3644" stroke="' + c + '" stroke-width="2"/><path d="M26 72L60 96h40l8-12-18-12z" fill="#2a3644" stroke="' + c + '" stroke-width="2"/>' +
      '<path d="M22 55l14-20h96l44 16 8 4-8 4-44 16H36z" fill="url(#pg)" stroke="' + c + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M120 42l26 10-26 8z" fill="#7ee7ff" opacity=".9"/><rect x="60" y="50" width="44" height="10" rx="3" fill="' + c + '" opacity=".75"/><circle cx="178" cy="55" r="3" fill="' + c + '"/>', 'sh');
  }
  // Paper-doll ship: hull chassis by Hull Plating tier, equipment layers over it, scaled by hull tier (see ship.js and V.SHIPS).
  const USE_RIG = false;   // paper-doll ship + 3/4 gear icons (ship.js) are built but switched off until the art set is complete
  function shipHtml() {
    if (!USE_RIG) { const bt = V.highestTier(S); return playerShip(bt >= 0 ? tcol(bt) : '#35d0e0'); }
    const ht = V.hullTier(S), sh = V.SHIPS[ht];
    return window.VSShip.rig(S, sh, ht, playerShip(S.gear.plating ? tcol(ht) : '#35d0e0'));
  }
  const gearIcon = (it) => (USE_RIG && window.VSShip.icon(it)) || slotIcon(it.slot);
  function foeShip(type, boss) {
    const c = boss ? '#ff4d4d' : '#ff6b5e';
    const art = {
      drone: '<circle cx="100" cy="55" r="30" fill="#3a2230" stroke="' + c + '" stroke-width="3"/><circle cx="88" cy="55" r="12" fill="' + c + '"/><circle cx="85" cy="52" r="4" fill="#fff"/><path d="M130 55h30M70 30l-18-14M70 80l-18 14" stroke="' + c + '" stroke-width="5" stroke-linecap="round"/>',
      gunship: '<path d="M30 55l30-20h80l30 20-30 20H60z" fill="#3a2230" stroke="' + c + '" stroke-width="3" stroke-linejoin="round"/><rect x="2" y="50" width="42" height="10" fill="#6b3b4a"/><path d="M110 35l20-22h30l-14 22zM110 75l20 22h30l-14-22z" fill="#2a1822" stroke="' + c + '" stroke-width="2.5"/><circle cx="78" cy="55" r="9" fill="' + c + '"/>',
      raider: '<path d="M10 55l60-34 50 14 70-14-30 34 30 34-70-14-50 14z" fill="#3a2230" stroke="' + c + '" stroke-width="3" stroke-linejoin="round"/><path d="M40 55l50-8v16z" fill="' + c + '"/>',
      bulwark: '<path d="M20 30h110l50 25-50 25H20z" fill="#2e2630" stroke="' + c + '" stroke-width="3.5" stroke-linejoin="round"/><path d="M32 40h86M32 70h86" stroke="#6b3b4a" stroke-width="6"/><rect x="2" y="46" width="30" height="18" fill="#5a2f3d"/><circle cx="92" cy="55" r="10" fill="' + c + '"/>'
    };
    const spikes = boss ? '<path d="M60 14l10 18M100 6l6 22M140 14l-8 18M60 96l10-18M100 104l6-22M140 96l-8-18" stroke="#ff4d4d" stroke-width="5" stroke-linecap="round"/>' : '';
    return SVGH(200, 110, spikes + (art[type] || art.gunship), 'sh foeart' + (boss ? ' boss' : ''));
  }
  const NAVICON = {
    foundry: '<path d="M4 10h14l-2 4h-4v3h6v3H6v-3h4v-3H6z" fill="currentColor"/><path d="M18 10l3-2" stroke="currentColor" stroke-width="2"/>',
    missions: '<path d="M12 2l2.5 6 6.5.5-5 4.3 1.6 6.4L12 15.6 6.4 19.2 8 12.8 3 8.5 9.5 8z" fill="currentColor"/>',
    ship: '<path d="M12 2l7 18-7-4-7 4z" fill="currentColor"/>',
    armory: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" fill="currentColor"/>',
    wing: '<path d="M2 14l10-3 10 3-10 2zM10 11l2-8 2 8z" fill="currentColor"/>',
    depot: '<path d="M3 6h12v9H3zM15 9h4l3 3v3h-7z" fill="currentColor"/><circle cx="7" cy="17" r="2" fill="currentColor"/><circle cx="18" cy="17" r="2" fill="currentColor"/>',
    more: '<path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'
  };
  function decorateChrome() {
    $('modal').addEventListener('click', (e) => { if (e.target === $('modal') && modalKind !== 'ad') { $('modal').hidden = true; modalKind = null; } });
    document.querySelectorAll('nav button').forEach((b) => { const i = b.querySelector('i'); if (i) i.innerHTML = SVGH(24, 24, NAVICON[b.dataset.tab] || ''); });
    document.querySelectorAll('.cur[data-coin]').forEach((c) => { c.insertAdjacentHTML('afterbegin', coinIcon(c.dataset.coin)); });
  }

  /* ---------- more art ---------- */
  COIN.cores = '<rect x="3" y="3" width="10" height="10" rx="2" fill="#35f0ff" stroke="#c9fbff" stroke-width="1"/><rect x="6" y="6" width="4" height="4" fill="#06323a"/>';
  COIN.medals = '<circle cx="8" cy="9" r="5.5" fill="#ff9a3d" stroke="#ffe0b8" stroke-width="1"/><path d="M5 1h6l-1.5 4h-3z" fill="#ff5a6a"/>';
  const PIC = {
    ticket: '<path d="M3 9a3 3 0 000 6v5h18v-5a3 3 0 000-6V4H3z" fill="currentColor"/><path d="M9 6v12" stroke="#0006" stroke-width="2" stroke-dasharray="2 2"/>',
    video: '<rect x="2" y="6" width="14" height="12" rx="3" fill="currentColor"/><path d="M16 10l6-3v10l-6-3z" fill="currentColor"/>',
    trophy: '<path d="M7 3h10v6a5 5 0 01-10 0z" fill="#ffc83d"/><path d="M7 5H3v2a4 4 0 004 4M17 5h4v2a4 4 0 01-4 4" fill="none" stroke="#ffc83d" stroke-width="2"/><rect x="10" y="13" width="4" height="4" fill="#ffc83d"/><rect x="7" y="18" width="10" height="3" rx="1" fill="#c98a00"/>',
    medal: '<circle cx="12" cy="14" r="7" fill="#ff9a3d" stroke="#ffe0b8" stroke-width="2"/><path d="M7 2h10l-3 8h-4z" fill="#ff5a6a"/><path d="M12 10l1.5 3 3 .4-2.2 2 .6 3-2.9-1.6-2.9 1.6.6-3-2.2-2 3-.4z" fill="#fff"/>',
    clan: '<path d="M12 2l9 3v7c0 5-4 8-9 10-5-2-9-5-9-10V5z" fill="#4aa3ff" stroke="#bfe0ff" stroke-width="2"/><path d="M12 7l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6z" fill="#fff"/>',
    chest: '<path d="M3 11h18v9H3z" fill="#b8742e"/><path d="M3 11a9 7 0 0118 0z" fill="#e39a45"/><rect x="10" y="10" width="4" height="5" fill="#ffd54a"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 018 0v3" fill="none" stroke="currentColor" stroke-width="2.5"/>',
    sword: '<path d="M5 19L18 6l1 1L6 20zM15 4h5v5l-2-2z" fill="currentColor"/><path d="M4 17l3 3-2 2-3-3z" fill="currentColor"/>',
    fast: '<path d="M3 5l8 7-8 7zM12 5l8 7-8 7z" fill="currentColor"/>',
    star: '<path d="M12 2l3 7 7 .6-5.4 4.6 1.7 7.2L12 17.8 5.7 21.4l1.7-7.2L2 9.6 9 9z" fill="currentColor"/>',
    clock: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="3"/><path d="M12 6v6l4 3" stroke="currentColor" stroke-width="3" fill="none"/>',
    bolt: '<path d="M13 2L5 14h6l-1 8 9-13h-6z" fill="currentColor"/>',
    gear: '<circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3" stroke="currentColor" stroke-width="3"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2" stroke="currentColor" stroke-width="3" fill="none"/>',
    user: '<circle cx="12" cy="8" r="4.5" fill="currentColor"/><path d="M3 21c0-5 4-8 9-8s9 3 9 8z" fill="currentColor"/>',
    save: '<path d="M4 3h13l3 3v15H4z" fill="currentColor"/><rect x="7" y="3" width="9" height="6" fill="#0006"/><rect x="7" y="13" width="10" height="8" fill="#0006"/>',
    filter: '<path d="M3 4h18l-7 9v7l-4-2v-5z" fill="currentColor"/>',
    trash: '<path d="M5 7h14l-1 14H6zM9 3h6v3H9z" fill="currentColor"/>',
    crown: '<path d="M3 18l-1-11 6 5 4-8 4 8 6-5-1 11z" fill="#ffc83d" stroke="#c98a00" stroke-width="1.5"/>',
    box: '<path d="M3 8l9-5 9 5v10l-9 5-9-5z" fill="#b8742e"/><path d="M3 8l9 5 9-5M12 13v10" stroke="#ffd08a" stroke-width="2" fill="none"/>',
    plus: '<path d="M12 4v16M4 12h16" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>',
    minus: '<path d="M4 12h16" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>',
    blade: '<g transform="rotate(45 12 12)"><path d="M12 .5l2.9 3.2V14H9.1V3.700z" fill="#e3ecf6" stroke="#8fa3ba" stroke-width=".8" stroke-linejoin="round"/><path d="M12 2.500V14" stroke="#9db0c6" stroke-width="1"/><rect x="5.500" y="14" width="13" height="3.200" rx="1.600" fill="#ffb43a" stroke="#a86400" stroke-width=".8"/><rect x="10.700" y="17.200" width="2.600" height="4" fill="#8a5a2b"/><circle cx="12" cy="22.100" r="1.800" fill="#ffb43a" stroke="#a86400" stroke-width=".8"/></g>',
    heart: '<path d="M12 21.500S3.500 16 3.500 9.800A4.800 4.800 0 0112 7a4.800 4.800 0 018.500 2.800C20.500 16 12 21.500 12 21.500z" fill="#ff4d5e" stroke="#a31527" stroke-width="1.200" stroke-linejoin="round"/><path d="M7 9.500a2.600 2.600 0 012.600-2" stroke="#ffb3bb" stroke-width="1.600" fill="none" stroke-linecap="round"/>',
    fist: '<rect x="5" y="10" width="14" height="10" rx="3.5" fill="currentColor"/><rect x="5.2" y="4.5" width="3.2" height="8" rx="1.6" fill="currentColor"/><rect x="8.9" y="3.5" width="3.2" height="9" rx="1.6" fill="currentColor"/><rect x="12.6" y="3.8" width="3.2" height="8.700" rx="1.6" fill="currentColor"/><rect x="16.2" y="5" width="3" height="7.500" rx="1.5" fill="currentColor"/>',
    merge: '<path d="M4 5l8 8 8-8M12 13v8" stroke="currentColor" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
  };
  const pic = (k, cls) => SVGH(24, 24, PIC[k], 'pic ' + (cls || ''));
  const SPIC = {
    hornet: '<path d="M6 24l16-12 20 12-20 12z" fill="#fff"/><path d="M22 12v24" stroke="#ffb02e" stroke-width="3"/><path d="M36 24h10" stroke="#ff6b5e" stroke-width="4"/>',
    longbow: '<path d="M10 24h30" stroke="#fff" stroke-width="5"/><path d="M40 24l6-4v8z" fill="#ff6b5e"/><circle cx="16" cy="24" r="7" fill="none" stroke="#7ee7ff" stroke-width="3"/><path d="M16 12v24M4 24h24" stroke="#7ee7ff" stroke-width="2"/>',
    mender: '<rect x="18" y="6" width="12" height="36" rx="3" fill="#fff"/><rect x="6" y="18" width="36" height="12" rx="3" fill="#fff"/><rect x="21" y="9" width="6" height="30" rx="2" fill="#43e88a"/><rect x="9" y="21" width="30" height="6" rx="2" fill="#43e88a"/>',
    aegis: '<path d="M24 4l17 6v13c0 10-7 16-17 21C14 39 7 33 7 23V10z" fill="#fff"/><path d="M24 10l11 4v9c0 7-4 11-11 15-7-4-11-8-11-15v-9z" fill="#4aa3ff"/>',
    static: '<path d="M4 24q6-14 10 0t10 0 10 0 10 0" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M4 33q6-10 10 0t10 0 10 0 10 0" stroke="#b27cff" stroke-width="4" fill="none" stroke-linecap="round"/>',
    surge: '<path d="M28 3L10 27h11l-4 18 21-26H26z" fill="#ffe066" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>'
  };
  const COMP_ART = { hornet: 1, longbow: 1, mender: 1, aegis: 1, static: 1, surge: 1 };   // assets/comp/comp_<species>.png, painted, facing right like the ship
  const spic = (id) => COMP_ART[id] ? '<img class="ico cimg" src="assets/comp/comp_' + id + '.png" alt="" draggable="false">' : SVGH(48, 48, SPIC[id] || SPIC.hornet, 'ico');
  const TECH_ICON = { ftimer: () => pic('bolt'), fcost: () => coinIcon('credits'), sell: () => pic('chest'), batch: () => pic('merge'), free: () => pic('star'), offline: () => pic('clock'), salv: () => coinIcon('alloy'), alloy: () => coinIcon('alloy'), patrol: () => pic('sword'),
    dmgc: () => slotIcon('cannon'), dmgp: () => slotIcon('pod'), dmga: () => slotIcon('array'), dmgr: () => slotIcon('coil'), hulp: () => slotIcon('plating'), hulb: () => slotIcon('bulkhead'), hule: () => slotIcon('emitter'), huls: () => slotIcon('spar'),
    techspd: () => pic('fast'), techcst: () => coinIcon('shards'), odmg: () => pic('sword'), ohull: () => pic('crown'), woff: () => pic('clan'), wsup: () => pic('user'), summon: () => pic('box'), wtwin: () => pic('plus'), heist: () => coinIcon('shards'), convoy: () => coinIcon('cores') };
  const TECH_NAME = { ftimer: 'Forge Timer', fcost: 'Forge Upgrade Cost', sell: 'Sell Price', batch: 'Multi-Forge', free: 'Free Forge', offline: 'Deep-Range Comms', salv: 'Salvage Run Bonus', alloy: 'Alloy Output', patrol: 'Offline Credits',
    dmgc: 'Cannon Mastery', dmgp: 'Pod Mastery', dmga: 'Array Mastery', dmgr: 'Coil Mastery', hulp: 'Plating Mastery', hulb: 'Bulkhead Mastery', hule: 'Emitter Mastery', huls: 'Spar Mastery',
    techspd: 'Research Time', techcst: 'Research Cost', odmg: 'Damage Doctrine', ohull: 'Hull Doctrine', woff: 'Attack Wing', wsup: 'Support Wing', summon: 'Summon Cost', wtwin: 'Twin Summon', heist: 'Data Heist Bonus', convoy: 'Convoy Bonus' };
  const BRANCH_ICON = { forge: () => pic('gear'), power: () => pic('sword'), fleet: () => pic('clan') };
  const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
  const RICON = { alloy: () => coinIcon('alloy'), offline: () => pic('clock'), credits: () => coinIcon('credits'), speed: () => pic('bolt'), xp: () => pic('star'), dmg: () => slotIcon('cannon'), hull: () => slotIcon('plating'), batch: () => pic('fast') };
  const DICON = { alloy: () => coinIcon('alloy'), shards: () => coinIcon('shards'), cores: () => coinIcon('cores') };
  const pipsRow = (n, max) => { let s = ''; for (let i = 0; i < max; i++) s += '<i class="' + (i < n ? 'on' : '') + '"></i>'; return '<span class="pp">' + s + '</span>'; };
  const infoBtn = (k) => '<button class="info" data-act="info" data-k="' + k + '" aria-label="Info">i</button>';
  function autoSheet() {
    const au = V.autoUnlocked(S), st = S.settings;
    const tiers = V.TIERS.slice(0, V.LAUNCH_TIERS).map((t, i) => '<button class="fchip' + (st.autoTiers.includes(i) ? ' on' : '') + '" style="--tc:' + t.color + '" data-act="autoTier" data-k="' + i + '">' + esc(t.name) + '</button>').join('');
    const odds = V.tierOdds(S.forge.level);
    const runChips = V.TIERS.slice(0, V.LAUNCH_TIERS).map((t, i) => odds[i] > 0 ? '<button class="fchip' + (st.runTiers.includes(i) ? ' on' : '') + '" style="--tc:' + t.color + '" data-act="runTier" data-k="' + i + '">' + esc(t.name) + '</button>' : '').join('');
    const subs = V.SUB_KEYS.map((k) => '<button class="fchip' + (st.autoSubs.includes(k) ? ' on' : '') + '" style="--tc:var(--cyan)" data-act="autoSub" data-k="' + k + '">' + V.SUBS[k].name + '</button>').join('');
    sheet('<h3>Auto</h3><div class="tog"><div>Auto-Salvage<small>' + (au ? 'Fits upgrades, sells the rest' : 'Forge ' + V.CFG.AUTO_UNLOCK_LEVEL) + '</small></div><button class="fchip' + (st.auto && au ? ' on' : '') + '" data-act="autoOn"' + (au ? '' : ' disabled') + '>' + (st.auto && au ? 'ON' : 'OFF') + '</button></div>' +
      '<div class="fh">Always sell these tiers</div><div class="fchips">' + tiers + '</div>' +
      '<div class="fh">Multi-forge run: keep only these tiers <button class="info" data-act="info" data-k="runf" aria-label="Info">i</button></div><div class="fchips">' + runChips + '</div>' +
      '<div class="fh">Only keep parts with one of these lines <button class="info" data-act="info" data-k="autof" aria-label="Info">i</button></div><div class="fchips">' + subs + '</div>', 'auto');
  }
  function sheet(html, kind) {
    $('mbox').innerHTML = html + '<div class="row" style="margin-top:12px"><button class="btn pri" data-act="close">OK</button></div>';
    modalKind = kind || 'sheet'; $('modal').hidden = false;
  }
  const INFO = {
    home: () => { const p = V.power(S), sb = p.set; return '<h3>Your ship</h3><div class="kv"><span>Damage</span><span>' + V.fmt(p.dmg) + '</span><span>Hull</span><span>' + V.fmt(p.hull) + '</span><span>Power</span><span style="color:var(--cyan)">' + V.fmt(p.power) + '</span><span>Set bonus</span><span>' + (sb.bonus ? '+' + Math.round(sb.bonus * 100) + '%' : 'none') + '</span><span>Codex bonus</span><span>+' + (p.codex * 100).toFixed(1).replace('.0', '') + '%</span></div><p class="sb dim">Tap a part to see it. Fit 4 or 8 parts of one tier or better for a set bonus. An undecided part is sold when you forge again.</p>'; },
    sweep: () => '<h3>Sweep tickets</h3><p class="sb">One ticket every 2 hours, up to ' + V.CFG.SWEEP_MAX + '. Watching an ad adds one (' + V.CFG.SWEEP_ADS + ' a day). Tickets replay a mission stage you already cleared. Everything resets at midnight UTC.</p>',
    runf: () => '<h3>Multi-forge run</h3><p class="sb">Pick a tier and the multi-forge button becomes a run (▶). It keeps forging, sells every part below that tier (or that your line filter rejects) and holds the rest, until the bar is full or you run out of Alloy. Tap ■ any time to stop and decide on what it caught. Needs a multi-forge of 2 or more.</p>',
    autof: () => '<h3>Line filter</h3><p class="sb">Pick the bonus lines you want. A part with lines is sold unless at least one of its lines is on your list, so a part with 2 lines only needs 1 match. Parts of tiers with no lines (Rusted, Refitted) are not affected by this filter. Selling a tier always wins.</p>',
    daily: () => '<h3>Daily missions</h3><p class="sb">Each has its own stage ladder and ' + V.CFG.DAILY_ATTEMPTS + ' tries a day. Win to climb one stage. The sword fights the next stage, the arrows spend a ticket to collect the last stage you cleared. The % is your win chance.</p>',
    arena: () => '<h3>Arena</h3><p class="sb">Simulated rivals built to your level. Win +25 league points and Medals, lose −12. ' + V.CFG.ARENA_ATTEMPTS + ' fights a day.</p>',
    shop: () => '<h3>Medal shop</h3><p class="sb">Spend Medals from the Arena. Each item can be bought ' + V.CFG.SHOP_LIMIT + ' times a day.</p>',
    clan: () => '<h3>Clans</h3><p class="sb">Simulated crews that play on their own schedule. Your crew fills most of the daily goal. Convoy wins and sweeps add ' + V.CFG.CLAN_WIN_POINTS + ' points each. Joining unlocks the Clan Convoy mission.</p>',
    xp: () => '<h3>Commander XP</h3><p class="sb">XP comes only from forging: better tiers give more XP per part. Fights give none. Each level adds +' + (V.CFG.LEVEL_BONUS * 100).toFixed(1).replace('.0', '') + '% Damage and Hull. Max level ' + V.CFG.LEVEL_MAX + '. Every ' + V.CFG.RANK_LEVELS + ' levels you must fill the bar once more and tap the rank button to be promoted.</p>',
    research: () => '<h3>Research</h3><p class="sb">Data Shards come from boss first clears, every fifth stage first clear, Data Heist and promotions. Tap a node to upgrade it.</p>',
    research: () => '<h3>Research</h3><p class="sb">Three branches: Forge, Power and Fleet. Every upgrade has 5 tiers of 5 levels. Each level costs Data Shards and takes real time, and later tiers cost more and take longer. One research at a time. Flux finishes it early. A higher tier needs a higher commander level. Multi-Forge adds parts per forge, up to 10.</p>',
    codex: () => '<h3>Codex</h3><p class="sb">Every new part you forge adds +' + (V.CFG.CODEX_PART * 100) + '% to all stats. Finishing a whole tier adds +' + Math.round(V.CFG.CODEX_TIER * 100) + '% more. Now: +' + (V.codexBonus(S) * 100).toFixed(2).replace(/\.?0+$/, '') + '%. The numbers on the right are set bonuses for 4 and 8 parts of that tier or better. Only your best set counts.</p>',
    wing: () => { const lvl = V.bayLevel(S), odds = V.summonOdds(lvl); return '<h3>Summon bay ' + lvl + '</h3><div class="chips">' + odds.map((o, r) => o > 0.0005 ? '<span class="chipx" style="--tc:' + V.RANK_COLORS[r] + '">' + V.RANKS[r] + ' ' + (o * 100 < 1 ? '<1' : (o * 100 < 10 ? (o * 100).toFixed(1) : Math.round(o * 100))) + '%</span>' : '').join('') + '</div><p class="sb">AI Cores come from first clears (' + V.CFG.CORE_FIRST + '), boss first clears (' + V.CFG.CORE_BOSS + ') and a ' + Math.round(V.CFG.CORE_DROP * 100) + '% chance on every win. Every ' + V.CFG.BAY_STEP + ' summons raises the bay for better odds. Fuse 3 of the same companion and rank into 1 of the next rank. Companions act in turn order beside your ship.</p>'; },
    depot: () => '<h3>Depot</h3><p class="sb">Ads are never forced. Each has a daily limit and a cooldown and is a small help, not a shortcut. Deals are paid in Flux and change at midnight UTC.</p>',
    orders: () => '<h3>Orders</h3><p class="sb">A few small bonus jobs for every 20 campaign stages. Finish one, tap it to collect. Small rewards only. A new set opens when you clear the stages before it.</p>'
  };
  function infoSheet(k) { sheet(INFO[k](), 'info'); }

  /* ---------- Forge ---------- */
  let modalKind = null;
  function renderForge() {
    const L = S.forge.level;
    if (!$('arenaWrap')) { $('tab-foundry').innerHTML = '<div id="arenaWrap">' + arenaHtml() + '</div><div id="foundryRest"></div>'; missionStatic(); missionLive(); }
    $('foundryRest').innerHTML = '' +
      '<div class="hud"><div class="xpr"><b id="lvl"></b><div class="bar xl"><i id="xpfill"></i><span id="xpt"></span></div><button class="rankbtn" id="rankbtn" data-act="rank" aria-label="Rank">' + pic('star') + '</button></div><div class="srow">' + statRow() + '<button class="autob" id="autoBtn" data-act="auto">AUTO</button>' + infoBtn('home') + '</div></div>' +
      '<div class="deck">' + homeGearHtml() + wingBtn() + '</div>' +
      '<div class="actbar">' + holdHtml() + '<button class="collect" id="collectBtn" data-act="collect" aria-label="Collect"><span class="cr">' + coinIcon('credits') + '<b id="cCr"></b></span><span class="ca">' + coinIcon('alloy') + '<b id="cAl"></b></span></button><button class="anvil" id="forgeBtn" data-act="forge" aria-label="Forge">' + anvilSvg() + '<span class="ac">' + coinIcon('alloy') + '<b id="fcost"></b></span></button>' +
      '<button class="btn sm" id="f10" data-act="f10"></button>' +
      '<div class="fcol"><div class="ftime" id="ftime"></div><button class="fbtn" id="fbtn" data-act="foundry"><small>Forge</small><b>Level ' + L + '</b><em class="dot" id="fdot" hidden></em></button></div></div>';
    if (modalKind === 'foundry' && !$('modal').hidden) foundryModal();
    live();
  }
  function statRow() { const p = V.power(S); return '<span class="st-atk"><s class="stic">' + pic('blade') + '<i>ATK</i></s><b id="sDmg">' + V.fmt(p.dmg) + '</b></span><span class="st-hp"><s class="stic">' + pic('heart') + '<i>HP</i></s><b id="sHull">' + V.fmt(p.hull) + '</b></span>'; }
  function anvilSvg() {
    return SVGH(120, 76, '<defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3eaf2"/><stop offset="1" stop-color="#8795a5"/></linearGradient><linearGradient id="ab" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5b6877"/><stop offset="1" stop-color="#37424e"/></linearGradient></defs><path d="M6 4h86l20 8-24 6H72l6 14H42l6-14H30C16 18 8 12 6 4z" fill="url(#ag)" stroke="#f1f5f9" stroke-width="2" stroke-linejoin="round"/><rect x="30" y="32" width="54" height="10" rx="2" fill="#6b7886" stroke="#2b333c" stroke-width="1.5"/><rect x="12" y="42" width="90" height="31" rx="5" fill="url(#ab)" stroke="#262d36" stroke-width="2"/><rect x="12" y="42" width="90" height="4" rx="2" fill="#ffffff22"/>', 'anv');
  }
  function homeGearHtml() {
    let h = '<div class="gear5">';
    V.SLOTS.forEach((sl) => {
      const it = S.gear[sl.id];
      h += it ? '<button class="tile" data-act="part" data-ref="g:' + sl.id + '" style="--tc:' + tcol(it.tier) + '">' + gearIcon(it) + '<span class="lv">Lv.' + it.level + '</span></button>'
        : '<div class="tile empty">' + slotIcon(sl.id) + '</div>';
    });
    return h + '</div>';
  }
  function wingBtn() {
    const w = S.wing.active.map((k) => spic(V.companionInfo(k).sp.id)).join('');
    return '<button class="tile wingtile" data-act="goto" data-tab="wing">' + (w || '<span class="plus">+</span>') + '</button>';
  }
  // Hold bar: parts you have not decided on. Tap away and the card shrinks to the icons above the forge; tap an icon to open its card again.
  let holdSel = null;
  function holdHtml() {
    const h = S.held; if (!h.length) return '';
    if (holdSel !== null && !h[holdSel]) holdSel = null;
    let out = '<div class="holdbar">' + h.map((x, i) => '<button class="tile holdtile' + (i === holdSel ? ' sel' : '') + '" style="--tc:' + tcol(x.it.tier) + '" data-act="holdSel" data-i="' + i + '" aria-label="' + esc(V.itemName(x.it)) + '">' + gearIcon(x.it) + '<span class="lv">Lv.' + x.it.level + '</span></button>').join('') + '</div>';
    if (holdSel === null) return out;
    const x = h[holdSel], it = x.it;
    const p0 = V.power(S), p1 = V.powerWith(S, it), up = p1.rating > p0.rating + 1e-9, dn = p1.rating < p0.rating - 1e-9;
    const r = p0.rating > 0 ? (p1.rating / p0.rating - 1) * 100 : 100;
    return out + '<div class="holdcard pend" style="--tc:' + tcol(it.tier) + '"><div class="tile big">' + gearIcon(it) + '<span class="lv">Lv.' + it.level + '</span></div>' +
      '<div class="pinfo"><div class="pn">' + esc(V.itemName(it)) + (x.isNew ? '<span class="chip">NEW</span>' : '') + '</div><div class="pst">+' + V.fmt(V.itemStat(it)) + ' ' + statLabel(it.slot) + '</div>' +
      (it.subs && it.subs.length ? '<div class="psubs">' + it.subs.map((q) => '<span>' + V.SUBS[q.k].name + ' +' + q.v + '%</span>').join('') + '</div>' : '') +
      '<div class="' + (up ? 'up' : dn ? 'dn' : 'dim') + ' pd">' + (up ? '▲ ' : dn ? '▼ ' : '') + (r >= 0 ? '+' : '') + r.toFixed(Math.abs(r) < 10 ? 1 : 0) + '%</div></div>' +
      '<div class="pbtn"><button class="btn pri" data-act="equip" data-i="' + holdSel + '">Equip</button><button class="btn sm" data-act="sell" data-i="' + holdSel + '">' + coinIcon('credits') + V.fmt(V.sellFor(S, it)) + '</button></div></div>';
  }
  const TGLYPH = [
    '<circle cx="12" cy="12" r="4.5"/>',
    '<path d="M12 6l5 3v6l-5 3-5-3V9z M12 9.5l2 1.2v2.6l-2 1.2-2-1.2v-2.6z" fill-rule="evenodd"/>',
    '<path d="M12 5l7 13H5z"/>',
    '<path d="M12 4l7 8-7 8-7-8z"/>',
    '<path d="M12 4l7 4v8l-7 4-7-4V8z M12 9l3 1.7v2.6L12 15l-3-1.7v-2.6z" fill-rule="evenodd"/>',
    '<path d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z"/>',
    '<path d="M5 12l7-7 7 7-2.5 2.5L12 10l-4.5 4.5z M5 18l7-7 7 7-2.5 2.5L12 16l-4.5 4.5z"/>',
    '<path d="M12 3l8 3v6c0 4.5-3.2 7.6-8 9-4.8-1.4-8-4.5-8-9V6z"/>',
    '<path d="M12 3l3 6 6 .8-4.4 4.2 1 6L12 17l-5.600 3 1-6L3 9.800 9 9z"/>',
    '<path d="M12 2l2 5.500 5.500-2-2 5.500L23 12l-5.500 1.500 2 5.500-5.500-2L12 22l-2-5.500-5.500 2 2-5.500L1 12l5.500-1.500-2-5.500 5.500 2z"/>'
  ];
  function tierIcon(i) {
    const c = V.TIERS[i].color;
    return SVGH(48, 48, '<path d="M24 2l19 11v22L24 46 5 35V13z" fill="#0b1020" stroke="' + c + '" stroke-width="3"/><g transform="translate(9 9) scale(1.25)" fill="' + c + '">' + TGLYPH[i % TGLYPH.length] + '</g>', 'ti');
  }
  function foundryModal() {
    const L = S.forge.level, u = V.upgradeInfo(S), up = S.forge.upgrade, o1 = V.tierOdds(L), o2 = u.maxed ? o1 : V.tierOdds(L + 1);
    const pc = (x) => x === 0 ? '0%' : x * 100 < 1 ? (x * 100).toFixed(2).replace(/0$/, '') + '%' : x * 100 < 10 ? (x * 100).toFixed(1).replace('.0', '') + '%' : Math.round(x * 100) + '%';
    let h = '<div class="prob"><h3 class="outl">Forge odds</h3><div class="phead"><span class="pl">Lv.' + L + '</span><span class="pa">▶</span><span class="pl nx">Lv.' + (u.maxed ? L : L + 1) + '</span></div>';
    V.TIERS.forEach((t, i) => {
      if (!t.launch) return;
      const lock = o1[i] === 0 && o2[i] === 0, nw = o1[i] === 0 && o2[i] > 0;
      h += '<div class="prow" style="--tc:' + t.color + '">' + tierIcon(i) + '<b>' + t.name + '</b><span class="p1' + (o1[i] === 0 ? ' z' : '') + '">' + pc(o1[i]) + '</span><span class="p2' + (o2[i] === 0 ? ' z' : '') + '">' + pc(o2[i]) + '</span></div>'
    });
    h += '<div id="upg">' + upgradeHtml(u, up) + '</div></div>';
    $('mbox').innerHTML = h + '<button class="xbtn" data-act="close" aria-label="Close">✕</button>';
    modalKind = 'foundry'; $('modal').hidden = false; live();
  }
  function upgradeHtml(u, up) {
    if (u.maxed) return '<div class="segbar"><i style="width:100%"></i></div>';
    const T = V.TIERS, unlocks = T.findIndex((t) => t.launch && t.unlock === u.to);
    const pips = '<div class="pips2" aria-label="Installments">' + Array.from({ length: u.parts }, (_, i) => '<i class="' + (up || i < u.paid ? 'on' : i === u.paid ? 'next' : '') + '"></i>').join('') + '</div>';
    if (up) return pips + '<div class="segbar thin"><i id="ubar"></i></div><div class="utimer">' + pic('clock') + '<b id="utime"></b></div><button class="btn big3 fl" id="rushBtn" data-act="rush"></button>';
    return pips + '<div class="utimer tt">' + pic('clock') + '<b>' + V.fmtTime(u.seconds) + '</b></div><button class="btn big3" id="ubtn" data-act="upgrade"><span>Upgrade</span><b>' + coinIcon('credits') + V.fmt(u.credits) + '</b></button>';
  }

  /* ---------- Missions ---------- */
  let F = null; // the fight on screen (not saved)
  const VERDICTS = [[0.9, 'Easy', 'var(--good)'], [0.65, 'Favorable', 'var(--good)'], [0.4, 'Even match', 'var(--amber)'], [0.15, 'Risky', 'var(--bad)'], [-1, 'Overmatched', 'var(--bad)']];
  function arenaHtml() {
    return '<div class="scene" id="scene"><div class="sky"></div><div class="planet"></div><div class="gnd"></div>' +
      '<div class="stagetop"><div class="sl" id="stageLbl"></div><div class="pips" id="pips"></div></div>' +
      '<div class="rw" id="rwLine"></div>' +
      '<div class="unit pl" id="pship"><div class="hp"><i id="phb"></i><span id="phn"></span></div><div id="pshipart">' + shipHtml() + '</div></div>' +
      '<div class="unit en" id="eship"><div class="hp e"><i id="ehb"></i><span id="ehn"></span></div><div class="ename" id="ename"></div><div id="eart"></div></div>' +
      '<div class="fx" id="fx"></div><div id="banner"></div></div>';
  }
  function verdictOf(wc) { return VERDICTS.find((x) => wc >= x[0]); }
  function fightModal(title, f, lines) {
    const prev = modalKind, win = f.win;
    modal('<div class="res ' + (win ? 'w' : 'l') + '">' + (win ? 'VICTORY' : 'DEFEAT') + '</div><h3 style="text-align:center">' + title + '</h3><div class="kv">' + (lines || '') + '</div>', () => { renderMissions(); if (isMS(prev)) missionSheet(prev); });
    modalKind = null;
  }
  const isMS = (k) => !!k && (k === 'arena' || k === 'shop' || k === 'clan' || k === 'orders' || k.indexOf('daily:') === 0);
  function banArt(id) {
    const A = {
      alloy: '<defs><linearGradient id="ba1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb36b"/><stop offset="1" stop-color="#d9603a"/></linearGradient></defs><rect width="400" height="120" fill="url(#ba1)"/><circle cx="310" cy="38" r="26" fill="#ffe9a8" opacity=".8"/><path d="M0 95l40-30 30 18 50-40 40 32 60-26 50 30 40-22 90 36v27H0z" fill="#8a3a2a"/><path d="M0 108l60-18 70 14 80-16 90 16 100-10v26H0z" fill="#4a1f1f"/><g transform="translate(250 40)"><circle cx="40" cy="40" r="26" fill="#9fb0c2" stroke="#2a3340" stroke-width="4"/><circle cx="40" cy="40" r="9" fill="#2a3340"/><path d="M40 6v10M40 64v10M6 40h10M64 40h10M16 16l7 7M57 57l7 7M64 16l-7 7M23 57l-7 7" stroke="#9fb0c2" stroke-width="9"/></g><path d="M40 82l50-22 40 8 30 18-20 10H50z" fill="#3a4350" stroke="#1a1f27" stroke-width="3"/>',
      shards: '<defs><linearGradient id="ba2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1a6a"/><stop offset="1" stop-color="#7a3ad6"/></linearGradient></defs><rect width="400" height="120" fill="url(#ba2)"/><g fill="#fff" opacity=".7"><circle cx="40" cy="20" r="1.5"/><circle cx="120" cy="12" r="1.5"/><circle cx="200" cy="30" r="1.5"/><circle cx="360" cy="16" r="1.5"/></g><g fill="#1a1245" stroke="#4a3aa0" stroke-width="2"><rect x="30" y="50" width="40" height="70"/><rect x="80" y="30" width="34" height="90"/><rect x="300" y="44" width="44" height="76"/><rect x="352" y="62" width="36" height="58"/></g><g fill="#7ee7ff" opacity=".8"><rect x="38" y="60" width="8" height="5"/><rect x="38" y="78" width="8" height="5"/><rect x="88" y="44" width="8" height="5"/><rect x="88" y="64" width="8" height="5"/><rect x="310" y="58" width="8" height="5"/></g><path d="M215 20l30 30-30 60-30-60z" fill="#d6a8ff" stroke="#fff" stroke-width="3"/><path d="M215 20l-30 30h60z" fill="#f0d8ff"/><rect y="108" width="400" height="12" fill="#0e0a2e"/>',
      cores: '<defs><linearGradient id="ba3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c8fb0"/><stop offset="1" stop-color="#e8b06a"/></linearGradient></defs><rect width="400" height="120" fill="url(#ba3)"/><circle cx="70" cy="40" r="22" fill="#fff4c8" opacity=".85"/><path d="M0 92h400v28H0z" fill="#5a3a2a"/><path d="M0 100h400" stroke="#ffd08a" stroke-width="3" stroke-dasharray="18 12"/><g fill="#2a3340" stroke="#0e131a" stroke-width="3"><path d="M120 86l24-16h60l14 16z"/><path d="M230 86l20-12h46l12 12z"/><path d="M40 90l16-10h36l10 10z"/></g><path d="M150 70l30-12v12z" fill="#7ee7ff"/><circle cx="168" cy="88" r="5" fill="#ffb02e"/><circle cx="262" cy="88" r="5" fill="#ffb02e"/>'
    };
    return '<svg class="banart" viewBox="0 0 400 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + (A[id] || '') + '</svg>';
  }
  function renderMissions() {
    const now = Date.now(), ti = V.sweepInfo(S, now); V.rollDaily(S, now);
    let h = '<div class="pg"><h2 class="stitle">Missions</h2><div class="trow"><div class="tk">' + Array.from({ length: V.CFG.SWEEP_MAX }, (_, i) => '<span class="tkt' + (i < ti.tickets ? ' on' : '') + '">' + pic('ticket') + '</span>').join('') + '</div><span class="tkn" id="tkNote"></span>' +
      '<button class="btn sm vid" id="adBtn" data-act="sweepAd">' + pic('video') + '<b>+1</b></button>' + infoBtn('sweep') + '</div><div class="bans">';
    V.DAILIES.forEach((d) => {
      const left = V.attemptsLeft(S, d.id, now), locked = V.ladderLocked(S, d.id);
      h += '<div class="ban">' + banArt(d.id) + '<div class="bshade"></div><div class="btitle">' + DICON[d.id]() + '<b class="outl">' + d.name + '</b></div>' +
        '<div class="bside">' + (locked ? '<span class="lockd">' + pic('lock') + '</span>' : '<span class="keys">' + pic('ticket') + '<b class="outl">' + left + '/' + V.CFG.DAILY_ATTEMPTS + '</b></span>') +
        '<button class="btn openb" data-act="sheet" data-k="daily:' + d.id + '"' + (locked ? ' disabled' : '') + '>Open</button></div></div>';
    });
    const L = V.leagueOf(S.arena.lp), lo = V.CFG.LEAGUE_LP[L], hi = V.CFG.LEAGUE_LP[L + 1], aleft = V.arenaLeft(S, now), cp = V.clanProgress(S, now);
    const claimable = cp && cp.steps.some((st) => st.reached && !st.claimed);
    const oq = V.visibleQuests(S).filter((q) => !S.quests[q.id]), ordersLeft = oq.length, ordersReady = oq.some((q) => V.questProgress(S, q) >= q.need);
    h += '</div><div class="mtiles">' +
      '<button class="mt" data-act="sheet" data-k="arena">' + pic('trophy') + '<b>' + V.LEAGUES[L].replace(' League', '') + '</b><div class="bar"><i style="width:' + (hi ? Math.min(100, (S.arena.lp - lo) / (hi - lo) * 100) : 100) + '%"></i></div>' + pipsRow(aleft, V.CFG.ARENA_ATTEMPTS) + '</button>' +
      '<button class="mt' + (ordersReady ? ' hot' : '') + '" data-act="sheet" data-k="orders">' + pic('chest') + '<b>' + ordersLeft + '</b></button>' +
      '<button class="mt" data-act="sheet" data-k="shop">' + pic('medal') + '<b>' + V.fmt(S.medals) + '</b></button>' +
      '<button class="mt' + (claimable ? ' hot' : '') + '" data-act="sheet" data-k="clan">' + pic('clan') + '<b>' + (cp ? cp.total + '/' + V.CFG.CLAN_TARGET : '') + '</b></button></div></div>';
    $('tab-missions').innerHTML = h;
    ticketLabel(); missionStatic();
    if (isMS(modalKind) && !$('modal').hidden) missionSheet(modalKind);
  }
  function missionSheet(k) {
    const now = Date.now();
    if (k.indexOf('daily:') === 0) {
      const d = V.dailyById(k.slice(6)), best = S.ladders[d.id], next = best + 1, left = V.attemptsLeft(S, d.id, now), ti = V.sweepInfo(S, now);
      const wc = V.winChance(S, next, 40, rng, V.CFG.DAILY_SCALE), v = verdictOf(wc);
      sheet('<div class="sban">' + banArt(d.id) + '<b class="outl">' + d.name + '</b>' + infoBtn('daily') + '</div><div class="dstage"><span>' + V.stageLabel(Math.max(1, next)) + '</span><em style="color:' + v[2] + '">' + Math.round(wc * 100) + '%</em></div>' +
        '<div class="rwbox">' + DICON[d.id]() + '<b>' + d.text(d.reward(next)) + '</b></div><div class="sh-row" style="justify-content:center;gap:10px">' + pic('ticket') + pipsRow(left, V.CFG.DAILY_ATTEMPTS) + '</div>' +
        '<div class="row"><button class="btn big3 sw3" data-act="ladderSweep" data-id="' + d.id + '"' + (best >= 1 && ti.tickets >= 1 ? '' : ' disabled') + '><span>Sweep last</span><small>' + (best >= 1 ? V.stageLabel(best) + ' · ' + d.text(d.reward(best)) : '') + '</small></button><button class="btn big3 pri" data-act="ladderGo" data-id="' + d.id + '"' + (left > 0 && best < V.CFG.MAX_STAGE ? '' : ' disabled') + '><span>Enter</span></button></div>', k);
    } else if (k === 'arena') {
      const L = V.leagueOf(S.arena.lp), lo = V.CFG.LEAGUE_LP[L], hi = V.CFG.LEAGUE_LP[L + 1], aleft = V.arenaLeft(S, now), opp = V.arenaOpponents(S, now);
      sheet('<div class="sh-h">' + pic('trophy') + '<b>' + V.LEAGUES[L] + '</b>' + infoBtn('arena') + '</div><div class="bar xl"><i style="width:' + (hi ? Math.min(100, (S.arena.lp - lo) / (hi - lo) * 100) : 100) + '%"></i><span>' + S.arena.lp + (hi ? ' / ' + hi : '') + '</span></div><div class="sh-row">' + pipsRow(aleft, V.CFG.ARENA_ATTEMPTS) + '<span class="mcount">' + coinIcon('medals') + V.fmt(S.medals) + '</span></div>' +
        opp.map((o, i) => '<div class="opp"><div class="oav">' + foeShip(['drone', 'gunship', 'raider'][i % 3], false) + '</div><div class="oi"><b>' + esc(o.name) + '</b><span>' + Math.round(o.f * 100) + '%</span></div><button class="btn pri go" data-act="arenaGo" data-i="' + i + '"' + (aleft > 0 ? '' : ' disabled') + '>' + pic('sword') + '</button></div>').join(''), 'arena');
    } else if (k === 'orders') {
      const oq = V.visibleQuests(S).filter((q) => !S.quests[q.id]);
      const rw = (r) => (r.alloy ? coinIcon('alloy') + r.alloy : '') + (r.flux ? coinIcon('flux') + r.flux : '');
      sheet('<div class="sh-h">' + pic('chest') + '<b>' + oq.length + '</b>' + infoBtn('orders') + '</div>' + (oq.length ? oq.map((q) => { const have = V.questProgress(S, q), ok = have >= q.need;
        return '<div class="opp"><div class="oi"><b>' + (q.kind === 'stage' ? pic('sword') + ' ' + V.stageLabel(q.need) : pic('gear') + ' ' + V.fmt(q.need)) + '</b><div class="bar"><i style="width:' + Math.min(100, have / q.need * 100).toFixed(1) + '%"></i></div></div><button class="btn' + (ok ? ' pri' : '') + '" data-act="quest" data-id="' + q.id + '"' + (ok ? '' : ' disabled') + '>' + rw(q.reward) + '</button></div>'; }).join('') : '<p class="sb" style="text-align:center">' + pic('star') + '</p>'), 'orders');
    } else if (k === 'shop') {
      sheet('<div class="sh-h">' + pic('medal') + '<b>' + V.fmt(S.medals) + '</b>' + infoBtn('shop') + '</div>' + V.SHOP.map((it) => { const used = S.daily.shop[it.id] || 0; const kk = Object.keys(it.give)[0]; return '<div class="opp"><div class="oav sq">' + coinIcon(kk) + '</div><div class="oi"><b>' + it.text + '</b>' + pipsRow(V.CFG.SHOP_LIMIT - used, V.CFG.SHOP_LIMIT) + '</div><button class="btn" data-act="shopBuy" data-id="' + it.id + '"' + (used < V.CFG.SHOP_LIMIT && S.medals >= it.cost ? '' : ' disabled') + '>' + coinIcon('medals') + it.cost + '</button></div>'; }).join(''), 'shop');
    } else {
      const cp = V.clanProgress(S, now);
      if (!cp) sheet('<div class="sh-h">' + pic('clan') + infoBtn('clan') + '</div>' + V.CLANS.map((c) => '<div class="opp"><div class="oav sq">' + pic('clan') + '</div><div class="oi"><b>' + c.name + '</b><span>' + c.members + '</span></div><button class="btn pri" data-act="clanJoin" data-id="' + c.id + '">+</button></div>').join(''), 'clan');
      else sheet('<div class="sh-h">' + pic('clan') + '<b>' + cp.clan.name + '</b>' + infoBtn('clan') + '</div><div class="bar xl"><i style="width:' + cp.total + '%"></i><span>' + cp.total + ' / ' + V.CFG.CLAN_TARGET + '</span></div><div class="chests">' +
        cp.steps.map((st, i) => '<button class="chb' + (st.claimed ? ' done' : st.reached ? ' hot' : '') + '" data-act="clanClaim" data-i="' + i + '"' + (st.reached && !st.claimed ? '' : ' disabled') + '>' + pic('chest') + '<b>' + st.at + '</b></button>').join('') + '</div><button class="btn sm" data-act="clanLeave" style="width:100%;margin-top:10px">Leave</button>', 'clan');
    }
  }
  function ticketLabel() {
    const i = V.sweepInfo(S, Date.now()), n = $('tkNote'); if (!n) return;
    n.textContent = i.tickets < V.CFG.SWEEP_MAX ? V.fmtTime(i.nextIn) : 'FULL';
    const ad = $('adBtn'); if (ad) ad.disabled = i.adsLeft <= 0;
  }
  function missionStatic() {
    const c = S.combat, e = V.enemyFor(c.stage), sec = V.SECTORS[Math.min(V.SECTORS.length - 1, V.sectorOf(c.stage))];
    if ($('stageLbl')) {
      $('stageLbl').textContent = 'Battle ' + V.stageLabel(c.stage);
      const k = ((c.stage - 1) % 10) + 1; let pp = ''; for (let i = 1; i <= 10; i++) pp += '<i class="' + (i < k ? 'd' : i === k ? 'c' : '') + (i === 10 ? ' b' : '') + '"></i>'; $('pips').innerHTML = pp;
      const rw0 = V.describeRewards(S, c.stage);
      $('rwLine').innerHTML = coinIcon('credits') + V.fmt(rw0.credits) + (rw0.cores ? ' <span class="rc">◆' + rw0.cores + '</span>' : '');
      $('ename').textContent = e.name; $('eart').innerHTML = foeShip(e.type, e.boss);
      const sc = $('scene'); sc.style.setProperty('--hue', (V.sectorOf(c.stage) * 41 % 360) + 'deg');
      $('pshipart').innerHTML = shipHtml();
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
    $('phb').style.width = (php / F.pmax * 100).toFixed(1) + '%'; $('ehb').style.width = (ehp / F.emax * 100).toFixed(1) + '%';
    $('phn').textContent = V.fmt(php); $('ehn').textContent = V.fmt(ehp);
  }
  function floatNum(side, text, cls) {
    const fx = $('fx'); if (!fx) return;
    const n = document.createElement('span'); n.className = 'fnum ' + side + ' ' + (cls || ''); n.textContent = text; fx.appendChild(n); setTimeout(() => n.remove(), 950);
  }
  function beam(from, cls) {
    const fx = $('fx'); if (!fx) return;
    const b = document.createElement('i'); b.className = 'beam ' + from + ' ' + (cls || ''); fx.appendChild(b); setTimeout(() => b.remove(), 260);
    const tgt = $(from === 'p' ? 'eship' : 'pship'); if (tgt) { tgt.classList.remove('hit'); void tgt.offsetWidth; tgt.classList.add('hit'); }
  }
  const hasGear = () => V.SLOTS.some((sl) => S.gear[sl.id]);
  function startFight() {
    const stage = S.combat.stage, e = V.enemyFor(stage), p = V.fighter(S), r = V.simulateFight(p, e, rng);
    F = { stage, enemy: e, events: r.events, win: r.win, pmax: r.pmax, emax: r.emax, i: 0, round: 0, nextAt: Date.now() + 500, done: false };
    if ($('banner')) $('banner').innerHTML = '';
    missionLive();
  }
  function fightStep() {
    const now = Date.now();
    if (tab !== 'foundry' && tab !== 'missions') return;
    if (!hasGear()) { if ($('banner')) $('banner').innerHTML = '<div class="banner idle">Forge gear to launch</div>'; F = null; return; }
    if (!F) { startFight(); return; }
    if (now < F.nextAt) return;
    if (F.i < F.events.length) {
      const ev = F.events[F.i++];
      if ($('fx')) {
        if (ev.who === 'p') {
          beam('p', ev.label ? 'big' : ''); floatNum('e', '-' + V.fmt(ev.dmg), ev.label ? 'big' : ev.crit ? 'crit' : '');
          if (ev.heal) floatNum('p', '+' + V.fmt(ev.heal), 'heal');
        } else if (ev.who === 'c') {
          if (ev.dmg) { beam('p', 'c'); floatNum('e', '-' + V.fmt(ev.dmg), ''); }
          else if (ev.heal !== undefined) floatNum('p', '+' + V.fmt(ev.heal), 'heal');
          else if (ev.shieldGain) floatNum('p', '+' + V.fmt(ev.shieldGain), 'shield');
        } else if (ev.dodged) floatNum('p', 'DODGE', 'dodge');
        else { beam('e', ev.label ? 'big' : ''); floatNum('p', '-' + V.fmt(ev.dmg), ev.crit || ev.label ? 'crit' : ''); }
        missionLive();
      }
      F.nextAt = now + 550; return;
    }
    if (!F.done) {
      F.done = true;
      const rep = V.resolveFight(S, F.stage, F.win, rng);
      const dead = $(F.win ? 'eship' : 'pship'); if (dead) dead.classList.add('dead');
      if ($('banner')) $('banner').innerHTML = rep.win ? '<div class="banner win">VICTORY<small>+' + V.fmt(rep.credits) + (rep.cores ? ' · +' + rep.cores + ' Cores' : '') + (rep.flux ? ' · +' + rep.flux + ' Flux' : '') + '</small></div>' : '<div class="banner loss">DEFEAT</div>';
      if (rep.win && rep.first) toast(F.enemy.boss ? '<b>Boss defeated: ' + esc(F.enemy.name) + '</b>' + (rep.flux ? '<br>+' + rep.flux + ' Flux' : '') + (rep.cores ? '<br>+' + rep.cores + ' AI Cores' : '') + (rep.shards ? '<br>+' + rep.shards + ' Data Shards' : '') : 'Stage ' + V.stageLabel(F.stage) + ' cleared · +' + rep.cores + ' AI Cores' + (rep.shards ? ' · +' + rep.shards + ' Data Shards' : ''));
      save(); head(); live(); if (tab === 'wing') renderWing();
      F.nextAt = now + 1200; return;
    }
    F = null; missionStatic();
    ['eship', 'pship'].forEach((id) => { const el = $(id); if (el) el.classList.remove('dead', 'hit'); });
    startFight();
  }

  /* ---------- Wing: companions ---------- */
  let lastSummon = [];
  /* ---------- Wing ---------- */
  function wtile(key, extra, act) {
    const i = V.companionInfo(key);
    return '<button class="tile wt" ' + (act || '') + ' style="--tc:' + i.color + '">' + spic(i.sp.id) + '<span class="lv">' + i.rankName + '</span>' + (extra || '') + '</button>';
  }
  function renderWing() {
    const lvl = V.bayLevel(S), into = S.wing.summons % V.CFG.BAY_STEP;
    let h = '<div class="pg"><h2 class="stitle">Wing</h2><div class="wslots">';
    for (let i = 0; i < V.CFG.WING_SLOTS; i++) { const k = S.wing.active[i]; h += k ? wtile(k, '', 'data-act="unassign" data-i="' + i + '"') : '<div class="tile empty wt">' + pic('plus', 'ghost') + '</div>'; }
    h += '</div><div class="bay"><div class="baytop"><span class="cores">' + coinIcon('cores') + '<b>' + V.fmt(S.cores) + '</b></span><span class="baylv">Lv.' + lvl + '</span><div class="bar"><i style="width:' + (lvl < V.CFG.BAY_MAX ? into / V.CFG.BAY_STEP * 100 : 100) + '%"></i></div>' + infoBtn('wing') + '</div>' +
      '<div class="row"><button class="btn pri big2" data-act="sum1"' + (S.cores < V.CFG.SUMMON_COST ? ' disabled' : '') + '>' + pic('box') + ' ' + coinIcon('cores') + V.CFG.SUMMON_COST + '</button><button class="btn pri big2" data-act="sum10"' + (S.cores < V.CFG.SUMMON10_COST ? ' disabled' : '') + '>×10 ' + coinIcon('cores') + V.CFG.SUMMON10_COST + '</button></div>';
    if (lastSummon.length) h += '<div class="got">' + lastSummon.slice(0, 10).map((g) => '<span style="--tc:' + V.RANK_COLORS[g.rank] + '">' + SVGH(48, 48, SPIC[V.SPECIES[g.sp].id] || SPIC.hornet, 'ico') + '</span>').join('') + '</div>';
    const keys = Object.keys(S.wing.owned).sort((a, b) => { const pa = V.parseKey(a), pb = V.parseKey(b); return pb.rank - pa.rank || pa.sp - pb.sp; });
    const fusable = keys.some((k) => V.canFuse(S, k));
    h += '</div><div class="hanghd"><span>' + pic('box') + '</span>' + (fusable ? '<button class="btn sm" data-act="fuseAll">' + pic('merge') + ' ALL</button>' : '') + '</div><div class="scroll"><div class="hang">';
    keys.forEach((k) => { const n = S.wing.owned[k]; h += wtile(k, '<span class="cnt">×' + n + '</span>' + (V.canFuse(S, k) ? '<span class="fz">' + pic('merge') + '</span>' : ''), 'data-act="wsheet" data-key="' + k + '"'); });
    $('tab-wing').innerHTML = h + '</div></div></div>';
  }
  function wingSheet(k) {
    const i = V.companionInfo(k), n = S.wing.owned[k], free = n - V.usedInWing(S, k);
    sheet('<div class="sh-h"><div class="tile wt" style="--tc:' + i.color + ';width:64px">' + spic(i.sp.id) + '</div><div><b>' + i.sp.name + '</b><div class="sb" style="color:' + i.color + '">' + i.rankName + ' · ' + i.sp.role + '</div></div></div><p class="sb">' + i.text + '</p><div class="row"><button class="btn pri" data-act="assign" data-key="' + k + '"' + (free > 0 && S.wing.active.length < V.CFG.WING_SLOTS ? '' : ' disabled') + '>' + pic('plus') + '</button>' + (V.canFuse(S, k) ? '<button class="btn" data-act="fuse" data-key="' + k + '">' + pic('merge') + ' 3→1</button>' : '') + '</div>', 'wing');
  }

  /* ---------- Armory ---------- */
  let labView = 'research', labBranch = null;
  function techNodeHtml(n) {
    const o = V.techInfo(S, n.id), doing = S.tech && S.tech.id === n.id;
    const st = o.maxed ? 'MAX' : doing ? pic('clock') : o.locked ? pic('lock') + 'Lv.' + o.gate : coinIcon('shards') + o.cost;
    return '<button class="rnode' + (!o.maxed && !o.locked && !S.tech && S.shards >= o.cost ? ' can' : '') + (doing ? ' doing' : '') + (o.maxed ? ' done' : '') + '" data-act="tech" data-id="' + n.id + '"><span class="ri">' + TECH_ICON[n.id]() + '</span><span class="rl">' + ROMAN[Math.min(4, Math.floor(o.level / 5))] + ' · ' + o.level + '/' + o.max + '</span><span class="rc2">' + st + '</span></button>';
  }
  function techBarHtml() {
    if (!S.tech) return '<div class="techbar idle">' + coinIcon('shards') + '<b>' + V.fmt(S.shards) + '</b></div>';
    const c = V.techRushCost(S, Date.now());
    return '<div class="techbar">' + TECH_ICON[S.tech.id]() + '<div class="bar"><i id="techbar"></i><span id="techtime"></span></div><button class="btn sm fl" id="techRush" data-act="techRush">' + pic('bolt') + coinIcon('flux') + '<b id="techflux">' + c + '</b></button></div>';
  }
  function renderArmory() {
    const cur = V.power(S).set;
    let h = '<div class="pg"><h2 class="stitle">' + (labView === 'codex' ? 'Codex' : 'Tech Tree') + '</h2>';
    if (labView === 'codex') {
      h += '<div class="seg"><button data-act="labHome">‹</button><button class="on">' + pic('star') + '<b>' + V.codexCount(S) + '/' + V.LAUNCH_TIERS * 8 + '</b></button>' + infoBtn('codex') + '</div><div class="scroll"><div class="codex">';
      V.TIERS.forEach((t, i) => {
        h += '<div class="crow' + (cur.tier === i ? ' cur' : '') + '" style="--tc:' + t.color + '"><div class="cmini">' + V.SLOTS.map((s2) => '<span class="' + (S.codex[i + ':' + s2.id] ? 'got' : '') + '">' + slotIcon(s2.id) + '</span>').join('') + '</div><div class="cset"><b>4</b>+' + Math.round(V.CFG.SET4[i] * 100) + '<b>8</b>+' + Math.round(V.CFG.SET8[i] * 100) + '</div></div>';
      });
      h += '</div></div>';
    } else if (!labBranch) {
      h += techBarHtml() + '<div class="labgrid">' + V.TECH_BRANCHES.map((b) => {
        const ns = V.TECH_NODES.filter((n) => n.branch === b.id); let have = 0, all = 0, can = false;
        ns.forEach((n) => { const o = V.techInfo(S, n.id); have += o.level; all += o.max; if (!o.maxed && !o.locked && !S.tech && S.shards >= o.cost) can = true; });
        return '<button class="labtile t-' + b.id + (can ? ' can' : '') + '" data-act="labBranch" data-v="' + b.id + '">' + BRANCH_ICON[b.id]() + '<b>' + b.name + '</b><span class="bar"><i style="width:' + (have / all * 100).toFixed(0) + '%"></i></span></button>';
      }).join('') + '<button class="labtile codex" data-act="lab" data-v="codex">' + pic('star') + '<b>Codex</b><span class="bar"><i style="width:' + (V.codexCount(S) / (V.LAUNCH_TIERS * 8) * 100).toFixed(0) + '%"></i></span></button></div><div class="row" style="justify-content:center">' + infoBtn('research') + '</div>';
    } else {
      const br = V.TECH_BRANCHES.find((b) => b.id === labBranch);
      h += '<div class="seg"><button data-act="labHome">‹</button><button class="on">' + BRANCH_ICON[labBranch]() + '<b>' + br.name + '</b></button>' + infoBtn('research') + '</div>' + techBarHtml();
      h += '<div class="scroll"><div class="rgrid">' + V.TECH_NODES.filter((n) => n.branch === labBranch).map(techNodeHtml).join('') + '</div></div>';
    }
    $('tab-armory').innerHTML = h + '</div>';
    if (labBranch && labView !== 'codex') liveTech();
    else if (!labBranch && labView !== 'codex') liveTech();
    if (isTS(modalKind) && !$('modal').hidden) techSheet(modalKind.slice(5));
  }
  const isTS = (k) => !!k && k.indexOf('tech:') === 0;
  function liveTech() {
    const t = S.tech; if (!t || !$('techbar')) return;
    const left = Math.max(0, t.endAt - Date.now()), total = Math.max(1, t.endAt - t.startAt);
    $('techbar').style.width = Math.min(100, (1 - left / total) * 100).toFixed(1) + '%'; $('techtime').textContent = V.fmtTime(left / 1000);
    const c = V.techRushCost(S, Date.now()); $('techflux').textContent = c; $('techRush').disabled = S.flux < c;
  }
  function techSheet(id) {
    const o = V.techInfo(S, id), n = o.node;
    const inTier = o.maxed ? 5 : o.level % 5;
    const pips = Array.from({ length: 5 }, (_, i) => '<i class="' + (i < inTier || o.maxed ? 'on' : '') + '"></i>').join('');
    let body = '<div class="sh-h"><div class="tile big">' + TECH_ICON[id]() + '</div><div><b>' + TECH_NAME[id] + '</b><div class="sb">' + ROMAN[Math.min(4, Math.floor(o.level / 5))] + ' · ' + o.level + '/' + o.max + '</div></div></div><div class="pp techpips">' + pips + '</div>' +
      '<div class="rwbox" style="flex-direction:column;gap:2px"><b>' + n.text(o.level) + '</b>' + (o.maxed ? '' : '<b style="color:var(--good)">▶ ' + n.text(o.level + 1) + '</b>') + '</div>';
    if (!o.maxed) {
      body += '<div class="sh-row" style="justify-content:center;gap:16px"><span>' + coinIcon('shards') + '<b>' + V.fmt(o.cost) + '</b></span><span>' + pic('clock') + '<b>' + V.fmtTime(o.secs) + '</b></span><span>' + coinIcon('flux') + '<b>' + V.fmt(o.flux) + '</b></span></div>';
      const why = o.locked ? pic('lock') + ' Lv.' + o.gate : S.tech ? pic('clock') : '';
      body += '<div class="row"><button class="btn big3 pri" data-act="techGo" data-id="' + o.id + '"' + (!o.locked && !S.tech && S.shards >= o.cost ? '' : ' disabled') + '><span>' + (why || 'Research') + '</span></button></div>';
    }
    sheet(body, 'tech:' + id);
  }
  /* ---------- Records ---------- */
  function statsHtml() {
    const st = S.stats, kv = [
      ['Parts forged', V.fmt(st.forged)], ['Medals', V.fmt(S.medals)], ['Arena league', V.LEAGUES[V.leagueOf(S.arena.lp)]], ['Codex', V.codexCount(S) + ' / ' + V.LAUNCH_TIERS * 8], ['Parts fitted', V.fmt(st.equipped)], ['Parts sold', V.fmt(st.sold)],
      ['Alloy produced', V.fmt(st.alloyEarned)], ['Credits earned', V.fmt(st.creditsEarned)],
      ['Commander level', S.cmd.level + ' · ' + V.RANK_NAMES[S.cmd.rank]], ['Forge upgrades', V.fmt(st.upgrades)], ['Forge level', S.forge.level + ' / ' + V.CFG.MAX_FORGE_LEVEL],
      ['Best tier fitted', V.highestTier(S) >= 0 ? V.TIERS[V.highestTier(S)].name : 'none'],
      ['Best stage cleared', S.combat.best ? V.stageLabel(S.combat.best) : 'none'], ['Fights won / lost', V.fmt(st.wins) + ' / ' + V.fmt(st.losses)], ['Bosses defeated', V.fmt(st.bosses)], ['Companions summoned', V.fmt(S.wing.summons)], ['Fusions', V.fmt(st.fused || 0)],
      ['Time at the forge', V.fmtTime(st.seconds)], ['Service began', new Date(S.created).toLocaleDateString()]
    ];
    return '<h2>Service record</h2><div class="panel"><div class="kv">' + kv.map((r) => '<span>' + r[0] + '</span><span>' + r[1] + '</span>').join('') + '</div></div>' +
      '<h2>Coming in later updates</h2><div class="panel dim" style="font-size:13px">Ascension (after Forge level 25) · Balance pass</div>';
  }

  /* ---------- Settings ---------- */
  let wipeT = 0;

  /* ---------- Depot ---------- */
  function adStandIn(title, rewardText, grant) {
    if (S.noAds) { if (grant()) toast('<b>' + esc(rewardText) + '</b>'); return; }
    let n = 5; $('modal').hidden = false; modalKind = 'ad';
    const draw = () => { $('mbox').innerHTML = '<div class="adbox"><div class="adscreen"><span class="dim tiny">AD</span><b>' + n + '</b></div><div class="row"><button class="btn" id="adSkip">✕</button><button class="btn pri" id="adGo"' + (n > 0 ? ' disabled' : '') + '>' + (n > 0 ? n : '✔') + '</button></div></div>'; };
    draw(); let t = setInterval(() => { if (n > 0) n--; if ($('adGo')) draw(); else clearInterval(t); if (n === 0) clearInterval(t); }, 1000);
    document.addEventListener('click', function h(e) {
      const id = e.target.closest('#adGo,#adSkip'); if (!id) return; const idn = id.id;
      document.removeEventListener('click', h); clearInterval(t); $('modal').hidden = true; modalKind = null;
      if (idn === 'adGo' && n === 0) { if (grant()) { buzz(25); toast('<b>' + esc(rewardText) + '</b>'); } save(); head(); live(); refreshDepotish(); }
    });
  }
  function refreshDepotish() { if (tab === 'depot') renderDepot(); else if (tab === 'missions') renderMissions(); else if (tab === 'foundry') renderForge(); }
  const ADIC = { alloy: () => coinIcon('alloy'), credits: () => coinIcon('credits'), speed: () => pic('bolt'), flux: () => coinIcon('flux') };
  const DEALIC = { alloy200: 'alloy', alloy600: 'alloy', cores10: 'cores', shards4: 'shards', credits: 'credits', tickets2: null };
  function renderDepot() {
    const now = Date.now(); V.rollDaily(S, now);
    const ti = V.sweepInfo(S, now);
    let h = '<div class="pg"><h2 class="stitle">Store</h2><div class="dep-top"><button class="gift' + (S.daily.gift ? ' done' : '') + '" data-act="gift"' + (S.daily.gift ? ' disabled' : '') + '>' + pic('box') + '<b>+100</b>' + coinIcon('alloy') + '</button>' +
      '<button class="gift noads' + (S.noAds ? ' done' : '') + '" data-act="noAds"' + (S.noAds ? ' disabled' : '') + '>' + pic('crown') + '<b>' + (S.noAds ? '✔' : 'NO ADS') + '</b></button>' + infoBtn('depot') + '</div>' +
      '<div class="dgrid2">';
    V.dealsToday(now).forEach((d) => {
      const bought = !!S.daily.deals[d.id], ic = DEALIC[d.id];
      h += '<button class="deal' + (bought ? ' done' : '') + '" data-act="deal" data-id="' + d.id + '"' + (bought || S.flux < d.cost ? ' disabled' : '') + '><span class="dic2">' + (ic ? coinIcon(ic) : pic('ticket')) + '</span><b>' + d.text.replace('about ', '~') + '</b><span class="price">' + (bought ? '✔' : coinIcon('flux') + d.cost) + '</span></button>';
    });
    h += '</div><div class="adrow">';
    h += '<button class="adt" data-act="sweepAd"' + (ti.adsLeft > 0 ? '' : ' disabled') + '>' + pic('ticket') + pic('video', 'vi') + pipsRow(ti.adsLeft, V.CFG.SWEEP_ADS) + '</button>';
    V.AD_OFFERS.forEach((o) => {
      const st = V.adStatus(S, o.id, now);
      h += '<button class="adt" data-act="ad" data-id="' + o.id + '"' + (st.ready ? '' : ' disabled') + '>' + ADIC[o.id]() + pic('video', 'vi') + pipsRow(st.left, o.cap) + (st.cdLeft > 0 && st.left > 0 ? '<small>' + V.fmtTime(st.cdLeft) + '</small>' : '') + '</button>';
    });
    $('tab-depot').innerHTML = h + '</div></div>';
  }
  function adCreditsPreview() { return Math.round(V.creditRate(S) * 1200); }
  function badges() {
    const now = Date.now(), set = (t, on) => { const b = document.querySelector('nav button[data-tab=' + t + '] .dot'); if (b) b.hidden = !on; };
    V.rollDaily(S, now);
    const cp = V.clanProgress(S, now);
    set('depot', !S.daily.gift);
    set('missions', V.DAILIES.some((d) => !V.ladderLocked(S, d.id) && V.attemptsLeft(S, d.id, now) > 0 && S.ladders[d.id] < V.CFG.MAX_STAGE) || V.arenaLeft(S, now) > 0 || V.visibleQuests(S).some((q) => !S.quests[q.id] && V.questProgress(S, q) >= q.need) || !!(cp && cp.steps.some((st) => st.reached && !st.claimed)));
    const pb = document.querySelector('.who'); if (pb) pb.classList.toggle('hot', V.canPromote(S));
    set('armory', V.techReady(S));
  }
  /* ---------- Profile ---------- */
  const AV = [['#2b3190','#7d8cff','#35f0ff'],['#7a1d2a','#ff6b6b','#ffd166'],['#0f5a3c','#3ddc97','#e8ffb0'],['#5b2a86','#c77dff','#fff'],['#8a4b00','#ffb347','#2b1600'],['#003f5c','#4cc9f0','#fff'],['#3a3a3a','#b8c0cc','#ff4d4d'],['#6b0f5a','#ff5cc8','#ffe3f6'],['#1d3b1d','#8bd450','#0b1d0b'],['#4a1d00','#ff7a2f','#ffe08a'],['#10314a','#7be0ff','#ff9a1f'],['#2a2a5a','#a0a8ff','#ffd24a']];
  function avatarSvg(i) {
    const c = AV[((i % AV.length) + AV.length) % AV.length], k = i % 3;
    const body = k === 0 ? '<path d="M9 26c0-10 4-15 11-15s11 5 11 15z" fill="' + c[1] + '"/><rect x="11" y="19" width="18" height="7" rx="3" fill="' + c[2] + '"/><path d="M20 4l3 8h-6z" fill="#ffc83d"/>'
      : k === 1 ? '<circle cx="20" cy="21" r="11" fill="' + c[1] + '"/><path d="M9 21h22v5a11 11 0 01-22 0z" fill="#0004"/><rect x="12" y="17" width="16" height="6" rx="3" fill="' + c[2] + '"/><rect x="18" y="5" width="4" height="7" fill="' + c[2] + '"/>'
      : '<path d="M20 5l11 8v12l-11 9-11-9V13z" fill="' + c[1] + '"/><path d="M12 18h16l-3 8h-10z" fill="' + c[2] + '"/><circle cx="20" cy="13" r="2.5" fill="' + c[2] + '"/>';
    return '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="' + c[0] + '"/>' + body + '</svg>';
  }
  function profile(v) {
    v = v || 'main';
    const back = '<button class="btn" data-act="profile" data-v="main">‹</button>';
    if (v === 'avatar') {
      sheet('<div class="avgrid">' + AV.map((_, i) => '<button class="avpick' + (S.avatar === i ? ' on' : '') + '" data-act="avatar" data-i="' + i + '">' + avatarSvg(i) + '</button>').join('') + '</div>' + '<div class="row" style="margin-top:8px">' + back + '</div>', 'prof');
      return;
    }
    if (v === 'name') {
      const cost = V.renameCost(S);
      sheet('<input type="text" id="nameIn" maxlength="14" value="' + esc(S.name) + '" aria-label="Name" autocomplete="off"><div class="row" style="margin-top:8px">' + back + '<button class="btn pri" data-act="rename">' + (cost ? coinIcon('flux') + cost : 'Free') + '</button></div><div class="e" id="nameErr"></div>', 'prof');
      return;
    }
    if (v === 'opts') {
      const au = V.autoUnlocked(S);
      sheet('<div class="tog"><div>Vibration</div><label class="sw"><input type="checkbox" id="vibIn"' + (S.settings.vibrate ? ' checked' : '') + '><i></i></label></div><div class="tog"><div>Auto-Salvage<small>' + (au ? '' : 'Forge ' + V.CFG.AUTO_UNLOCK_LEVEL) + '</small></div><label class="sw"><input type="checkbox" id="autoIn"' + (S.settings.auto && au ? ' checked' : '') + (au ? '' : ' disabled') + '><i></i></label></div><div class="row" style="margin-top:8px">' + back + '</div>', 'prof');
      $('vibIn').onchange = (e) => { S.settings.vibrate = e.target.checked; save(); }; $('autoIn').onchange = (e) => { S.settings.auto = e.target.checked; save(); };
      return;
    }
    if (v === 'backup') return sheet('<textarea id="codeBox" aria-label="Save code" placeholder="Save code"></textarea><div class="row" style="margin-top:8px">' + back + '<button class="btn" data-act="export">Make</button><button class="btn" data-act="copy">Copy</button><button class="btn" data-act="import">Load</button></div>', 'prof');
    if (v === 'wipe') return sheet('<button class="btn bad" id="wipeBtn" data-act="wipe" style="width:100%">Erase everything</button><div class="row" style="margin-top:8px">' + back + '</div>', 'prof');
    if (v === 'more') {
      const p = V.power(S), tot = subTotals(), keys = Object.keys(tot), st = S.stats;
      const row = (n, x) => '<span>' + n + '</span><b>' + x + '</b>';
      return sheet('<h3>Stats</h3><div class="ovb"><h4>Basic</h4><div class="ov2">' + row('Damage', V.fmt(p.dmg)) + row('Hull', V.fmt(p.hull)) + row('Power', V.fmt(p.power)) + row('Codex', '+' + (V.codexBonus(S) * 100).toFixed(1) + '%') + '</div></div>' +
        '<div class="ovb"><h4>Gear bonuses</h4><div class="ov2">' + (keys.length ? keys.map((k) => row(V.SUBS[k].name, '+' + Math.round(tot[k] * 10) / 10 + '%')).join('') : '<span class="dim">–</span>') + '</div></div>' +
        '<div class="ovb"><h4>Record</h4><div class="ov2">' + row('Best stage', S.combat.best ? V.stageLabel(S.combat.best) : '–') + row('Forge', S.forge.level) + row('Forged', V.fmt(st.forged)) + row('Codex', V.codexCount(S) + '/' + V.LAUNCH_TIERS * 8) + row('Arena', V.LEAGUES[V.leagueOf(S.arena.lp)]) + row('Medals', V.fmt(S.medals)) + row('Wins', V.fmt(st.wins)) + row('Bosses', V.fmt(st.bosses)) + row('Research', st.researched || 0) + row('Playtime', V.fmtTime(st.seconds)) + '</div></div><div class="row" style="margin-top:8px">' + back + '</div>', 'prof');
    }
    const p = V.power(S), c = S.cmd, need = V.CFG.XP_NEED(c.level);
    const tot = subTotals(), keys = Object.keys(tot).slice(0, 3);
    const lg = V.LEAGUES[V.leagueOf(S.arena.lp)];
    const comp = S.wing.active[0] ? '<div class="pdrone">' + spic(V.companionInfo(S.wing.active[0]).sp.id) + '</div>' : '';
    const gear = V.SLOTS.map((sl) => { const it = S.gear[sl.id]; return it ? '<div class="ptile" style="--tc:' + tcol(it.tier) + '">' + gearIcon(it) + '<span class="lv">Lv.' + it.level + '</span></div>' : '<div class="ptile empty">' + slotIcon(sl.id) + '</div>'; }).join('');
    const wg = []; for (let i = 0; i < V.CFG.WING_SLOTS; i++) { const k = S.wing.active[i]; if (k) { const ci = V.companionInfo(k); wg.push('<div class="ptile" style="--tc:' + ci.color + '">' + spic(ci.sp.id) + '<span class="lv">' + ci.rankName.slice(0, 3) + '</span></div>'); } else wg.push('<div class="ptile empty"><span class="plus">+</span></div>'); }
    sheet('<div class="prof"><h3 class="ptitle">Profile</h3><div class="pscene"><div class="pbg"></div>' +
      '<div class="phd"><button class="avs" data-act="profile" data-v="avatar" aria-label="Picture">' + avatarSvg(S.avatar) + '</button><div><button class="nm" data-act="profile" data-v="name">' + esc(S.name) + ' <small>Lv.' + c.level + '</small> <em>✎</em></button><div class="rk">' + pic('star') + V.RANK_NAMES[c.rank] + '</div></div></div>' +
      '<button class="pbanner' + (V.canPromote(S) ? ' hot' : '') + '" data-act="rank" aria-label="Rank">' + pic('star') + '<b>' + (c.rank + 1) + '</b></button>' +
      '<div class="pship">' + comp + shipHtml() + '</div>' +
      '<div class="ppow"><span class="wl">' + lg + '</span><b>' + pic('fist') + V.fmt(p.power) + '</b></div>' +
      '<div class="pstats"><h4>Stats</h4><div><span>Damage</span><b>' + V.fmt(p.dmg) + '</b></div><div><span>Hull</span><b>' + V.fmt(p.hull) + '</b></div>' + keys.map((k) => '<div class="s2"><span>' + V.SUBS[k].name + '</span><b>' + Math.round(tot[k] * 10) / 10 + '%</b></div>').join('') + '<button class="more" data-act="profile" data-v="more">More</button></div></div>' +
      '<div class="pgear">' + gear + wg.join('') + '</div>' +
      '<div class="pbtns"><button data-act="cloudOpen">' + pic('user') + '<b>Cloud</b></button><button data-act="profile" data-v="opts">' + pic('gear') + '<b>Options</b></button><button data-act="profile" data-v="backup">' + pic('save') + '<b>Backup</b></button><button class="bad" data-act="profile" data-v="wipe">' + pic('trash') + '<b>Erase</b></button></div></div>', 'prof');
  }
  function subTotals() {
    const tot = {}; V.SLOTS.forEach((sl) => { const it = S.gear[sl.id]; if (it && it.subs) it.subs.forEach((x) => { tot[x.k] = (tot[x.k] || 0) + x.v; }); }); return tot;
  }
  /* rank screen: current rank -> next, stats before/after, the XP bar and Promote */
  function rankSheet() {
    const c = S.cmd, top = c.rank >= V.RANK_NAMES.length - 1, need = V.CFG.XP_NEED(c.level), p = V.power(S);
    const t = JSON.parse(JSON.stringify(S)); if (!top) { t.cmd.rank++; t.cmd.level++; } const q = V.power(t), rw = V.rankReward(c.rank + 1), canP = V.canPromote(S);
    const badge = (n, nm) => '<div class="rb"><div class="rbi">' + pic('star') + '<b>' + n + '</b></div><span>' + nm + '</span></div>';
    sheet('<h3 class="ptitle">Rank</h3><div class="rankrow">' + badge(c.rank + 1, V.RANK_NAMES[c.rank]) + (top ? '' : '<span class="arr">▶</span>' + badge(c.rank + 2, V.RANK_NAMES[c.rank + 1])) + '</div>' +
      '<div class="ovb"><div class="lvrow"><span>Lv.' + c.level + ' (max ' + V.levelCap(c) + ')</span>' + (top ? '' : '<span class="nx">Lv.' + (c.level >= V.levelCap(c) ? c.level + 1 : V.levelCap(c) + 1) + ' (max ' + V.levelCap({ rank: c.rank + 1 }) + ')</span>') + '</div>' +
      '<div class="ov3"><span>Damage</span><b>' + V.fmt(p.dmg) + '</b><i>▶</i><b class="g">' + V.fmt(q.dmg) + '</b><span>Hull</span><b>' + V.fmt(p.hull) + '</b><i>▶</i><b class="g">' + V.fmt(q.hull) + '</b></div></div>' +
      (top ? '' : '<div class="rkrw">' + coinIcon('flux') + rw.flux + ' ' + coinIcon('cores') + rw.cores + ' ' + coinIcon('shards') + rw.shards + '</div>') +
      '<div class="bar xl"><i style="width:' + Math.min(100, c.xp / need * 100).toFixed(1) + '%"></i><span>' + V.fmt(c.xp) + ' / ' + V.fmt(need) + '</span></div>' +
      (top ? '<p class="sb">Top rank.</p>' : '<p class="sb">' + (V.atCap(S) ? 'Fill the bar to promote.' : 'Reach Lv.' + V.levelCap(c) + ' first. Forging gives XP.') + '</p><button class="btn pri" style="width:100%" data-act="promote"' + (canP ? '' : ' disabled') + '>Promote</button>'), 'rank');
  }
  function encode() { return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }
  function decode(t) { return JSON.parse(decodeURIComponent(escape(atob(t.trim())))); }

  /* ---------- live updates ---------- */
  function head() {
    $('callsign').textContent = S.name; const av = $('avatar'); if (av && av.dataset.i !== String(S.avatar)) { av.dataset.i = S.avatar; av.innerHTML = avatarSvg(S.avatar); }
    $('power').textContent = V.fmt(V.power(S).power);
  }
  function live() {
    
    $('credits').textContent = V.fmt(S.credits);
    $('flux').textContent = V.fmt(S.flux);
    $('rate').textContent = '+' + (V.alloyRate(S) * 60).toFixed(2).replace(/0$/, '') + '/min';
    if ($('lvl')) { $('lvl').textContent = 'Lv.' + S.cmd.level; $('xpfill').style.width = Math.min(100, S.cmd.xp / V.CFG.XP_NEED(S.cmd.level) * 100).toFixed(1) + '%'; $('xpt').textContent = V.fmt(S.cmd.xp) + ' / ' + V.fmt(V.CFG.XP_NEED(S.cmd.level)); }
    $('shards').textContent = V.fmt(S.shards);
    { const rb = $('rankbtn'); if (rb) rb.classList.toggle('hot', V.canPromote(S)); const sd = $('sDmg'); if (sd) { const p = V.power(S); sd.textContent = V.fmt(p.dmg); $('sHull').textContent = V.fmt(p.hull) } }
    if (tab === 'missions') ticketLabel();
    if (tab === 'armory') liveTech();
    badges();
    { const ab = $('autoBtn'); if (ab) ab.classList.toggle('on', !!(S.settings.auto && V.autoUnlocked(S))); }
    const fb = $('forgeBtn');
    if (fb) {
      const c = V.forgeCost(S), can = S.alloy >= c;
      const manual = !(S.settings.auto && V.autoUnlocked(S)), full = manual && !V.holdFree(S);
      fb.disabled = !can || full || running; $('fcost').textContent = V.fmt(S.alloy);
      { const cb = $('collectBtn'), st = S.stock, a = Math.floor(st.alloy), c = Math.floor(st.credits), wait = Date.now() < st.lock;
        $('cCr').textContent = V.fmt(c); $('cAl').textContent = V.fmt(a); cb.disabled = wait || (a < 1 && c < 1);
        const capS = V.offlineCapS(S); cb.classList.toggle('full', st.credits >= V.creditRate(S) * capS - 1); }
      const fu = S.forge.upgrade, uu = V.upgradeInfo(S);
      $('ftime').textContent = fu ? V.fmtTime(Math.max(0, fu.endAt - Date.now()) / 1000) : '';
      $('fdot').hidden = !!fu || uu.maxed || S.credits < uu.credits;
      const m = V.maxForges(S), bs = V.batchSize(S), runMode = bs > 1 && runList().length > 0;
      $('f10').disabled = bs < 2 || (!running && (m < 2 || ((manual || runMode) && V.holdFree(S) < 1))); $('f10').classList.toggle('run', running);
      $('f10').innerHTML = bs < 2 ? pic('lock') : running ? '■' : runMode ? '▶×' + bs : '×' + bs;
      const up = S.forge.upgrade;
      if (up) {
        const total = up.endAt - up.startAt, left = Math.max(0, up.endAt - Date.now());
        const ut = $('utime'), ub = $('ubar');
        if (ut) ut.textContent = V.fmtTime(left / 1000);
        if (ub) ub.style.width = Math.min(100, (1 - left / total) * 100).toFixed(1) + '%';
        const rb = $('rushBtn'); if (rb) { const c = V.rushCost(S, Date.now()); rb.innerHTML = pic('bolt') + ' ' + coinIcon('flux') + c; rb.disabled = S.flux < c; }
      } else {
        const ub = $('ubtn'), u = V.upgradeInfo(S);
        if (ub && !u.maxed) ub.disabled = S.credits < u.credits;
      }
    }
  }
  function refresh() { head(); live(); if (tab === 'foundry') renderForge(); else if (tab === 'armory') renderArmory(); else if (tab === 'missions') renderMissions(); else if (tab === 'wing') renderWing(); else if (tab === 'depot') renderDepot(); }

  /* ---------- actions ---------- */
  /* ---------- multi-forge run: keep going until the bar is full of the target tier ---------- */
  let running = false, runT = 0;
  const runList = () => { const o = V.tierOdds(S.forge.level); return S.settings.runTiers.filter((t) => o[t] > 0); };   // ticked tiers that can still drop at your Foundry level
  function stopRun(why) {
    if (!running) return; running = false; clearInterval(runT);
    holdSel = S.held.length ? S.held.length - 1 : null;
    if (why) toast(why); save(); if (tab === 'foundry') renderForge();
  }
  function runStep() {
    if (tab !== 'foundry') return stopRun();
    const r = V.forgeRun(S, V.batchSize(S), rng, runList());
    if (r.forged) { buzz(10); const fb = $('forgeBtn'); if (fb) { fb.classList.add('hit'); setTimeout(() => fb.classList.remove('hit'), 90); } }
    if (r.levels) toast('<b>Commander level ' + S.cmd.level + '</b>');
    if (r.full) return stopRun('<b>Bar full</b><br>' + S.held.length + ' parts ready to decide');
    if (r.out) return stopRun('<b>Out of Alloy</b>' + (S.held.length ? '<br>' + S.held.length + ' parts waiting' : ''));
    save(); head(); live(); if (tab === 'foundry') renderForge();
  }
  function startRun() {
    if (running) return;
    if (!V.holdFree(S)) return toast('Hold bar full: equip or sell a part first');
    if (S.alloy < V.forgeCost(S)) return;
    running = true; holdSel = null; runStep(); if (running) runT = setInterval(runStep, 380);
  }
  function doForge() {
    const r = V.forgeOnce(S, rng);
    if (!r.ok) { if (r.reason === 'full') toast('Hold bar full: equip or sell a part first'); return; }
    buzz(12);
    const fb = $('forgeBtn'); if (fb) { fb.classList.add('hit'); setTimeout(() => fb.classList.remove('hit'), 90); }
    if (r.auto) S.lastMsg = (r.auto === 'equipped' ? 'Fitted ' : 'Sold ') + esc(V.itemName(r.item)) + ' (' + V.TIERS[r.item.tier].name + ')';
    else S.lastMsg = '';
    holdSel = r.auto ? null : S.held.length - 1;
    if (r.tierDone) toast('<b>Tier complete: ' + V.TIERS[r.item.tier].name + '!</b><br>Codex bonus increased'); else if (r.isNew && r.auto) toast('New Codex part: ' + esc(V.itemName(r.item)));
    if (r.levels) { toast('<b>Commander level ' + S.cmd.level + '</b>'); buzz([20, 30, 20]); }
    save(); refresh();
  }
  function act(a, el) {
    if (['assign', 'unassign', 'fuse'].includes(a)) { $('modal').hidden = true; modalKind = null; }
    if (a === 'info') return infoSheet(el.dataset.k);
    if (a === 'sheet') return missionSheet(el.dataset.k);
    if (a === 'wsheet') return wingSheet(el.dataset.key);
    if (a === 'profile') return profile(el.dataset.v);
    if (a === 'rank') return rankSheet();
    if (a === 'cloudOpen') { $('modal').hidden = true; modalKind = null; if (window.Cloud) Cloud.open(); return; }
    if (a === 'avatar') { if (V.setAvatar(S, +el.dataset.i)) { save(); head(); profile('avatar'); } return; }
    if (a === 'rename') { const r = V.renameCommander(S, $('nameIn').value); if (r.ok) { buzz(20); save(); head(); live(); profile('main'); } else $('nameErr').innerHTML = r.reason === 'flux' ? 'Need ' + coinIcon('flux') + r.cost : r.reason === 'same' ? 'Same name' : '2–14 letters'; return; }
    if (a === 'lab') { labView = el.dataset.v; return renderArmory(); }
    if (a === 'labHome') { labBranch = null; labView = 'research'; return renderArmory(); }
    if (a === 'auto') return autoSheet();
    if (a === 'autoOn') { if (V.autoUnlocked(S)) { S.settings.auto = !S.settings.auto; save(); autoSheet(); live(); } return; }
    if (a === 'autoTier') { const t = +el.dataset.k, l = S.settings.autoTiers, i = l.indexOf(t); if (i < 0) l.push(t); else l.splice(i, 1); save(); autoSheet(); return; }
    if (a === 'runTier') { const t = +el.dataset.k, l = S.settings.runTiers, i = l.indexOf(t); if (i < 0) l.push(t); else l.splice(i, 1); save(); autoSheet(); live(); return; }
    if (a === 'autoSub') { const k = el.dataset.k, l = S.settings.autoSubs, i = l.indexOf(k); if (i < 0) l.push(k); else l.splice(i, 1); save(); autoSheet(); return; }
    if (a === 'collect') { const r = V.collect(S, Date.now()); if (r.ok) { buzz(14); S.lastMsg = ''; toast('<b>Collected</b><br>' + coinIcon('credits') + ' +' + V.fmt(r.credits) + ' &nbsp; ' + coinIcon('alloy') + ' +' + V.fmt(r.alloy)); save(); refresh(); } return; }
    if (a === 'forge') return doForge();
    if (a === 'foundry') return foundryModal();
    if (a === 'goto') { if (running) stopRun(); tab = el.dataset.tab; showTab(); return; }
    if (a === 'f10') {
      if (running) return stopRun();
      if (V.batchSize(S) > 1 && runList().length) return startRun();
      const n = Math.min(V.batchSize(S), V.maxForges(S), (S.settings.auto && V.autoUnlocked(S)) ? 99 : V.holdFree(S)); if (n < 1) return;
      if (!(S.settings.auto && V.autoUnlocked(S))) {
        const h = V.forgeHold(S, n, rng); if (!h.forged) return;
        buzz(25); holdSel = null; S.lastMsg = '';
        toast('<b>' + h.forged + ' parts forged</b><br>Tap an icon above the forge to decide' + (h.newParts ? '<br><span style="color:var(--cyan)">' + h.newParts + ' new Codex part' + (h.newParts > 1 ? 's' : '') + '</span>' : ''));
        if (h.levels) { toast('<b>Commander level ' + S.cmd.level + '</b>'); buzz([20, 30, 20]); }
        save(); return refresh();
      }
      const r = V.forgeBatch(S, n, rng); if (!r.forged) return;
      buzz(25);
      S.lastMsg = 'Last batch: ' + r.forged + ' forged · ' + r.equipped + ' fitted · ' + r.sold + ' sold';
      toast('<b>' + r.forged + ' parts forged</b><br>' + r.equipped + ' fitted upgrades · ' + r.sold + ' sold for ' + V.fmt(r.credits) + ' Credits' + (r.newParts ? '<br><span style="color:var(--cyan)">' + r.newParts + ' new Codex part' + (r.newParts > 1 ? 's' : '') + '</span>' : '') + (r.tiersDone.length ? '<br><b>Tier complete: ' + r.tiersDone.map((t) => V.TIERS[t].name).join(', ') + '!</b>' : '') + (r.levels ? '<br><b>Commander level ' + S.cmd.level + '</b>' : '') + (r.best ? '<br>Best: <span style="color:' + tcol(r.best.tier) + '">' + esc(V.itemName(r.best)) + '</span>' : ''));
      save(); return refresh();
    }
    if (a === 'holdSel') { const i = +el.dataset.i; holdSel = holdSel === i ? null : i; return renderForge(); }
    if (a === 'equip') { const r = V.equipHeld(S, +el.dataset.i); if (r) { buzz(18); S.lastMsg = 'Fitted ' + esc(V.itemName(r.item)); holdSel = r.index >= 0 ? r.index : null; save(); refresh(); } return; }
    if (a === 'sell') { const v = V.sellHeld(S, +el.dataset.i); if (v) { S.lastMsg = 'Sold for ' + V.fmt(v) + ' Credits'; holdSel = null; save(); refresh(); } return; }
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
    if (a === 'labBranch') { labBranch = el.dataset.v; labView = 'research'; return renderArmory(); }
    if (a === 'tech') return techSheet(el.dataset.id);
    if (a === 'techGo') { if (V.startTech(S, el.dataset.id, Date.now())) { buzz(20); $('modal').hidden = true; modalKind = null; save(); head(); live(); renderArmory(); } return; }
    if (a === 'techRush') { if (V.rushTech(S, Date.now())) { buzz(30); save(); tick(); } return; }
    if (a === 'promote') { const r = V.promote(S); if (r) { buzz([40, 40, 40]); toast('<b>Promoted to ' + V.RANK_NAMES[r.rank] + '</b><br>+' + r.reward.flux + ' Flux · +' + r.reward.cores + ' AI Cores · +' + r.reward.shards + ' Data Shards'); save(); head(); live(); rankSheet(); } return; }
    if (a === 'rush') { if (V.rushUpgrade(S, Date.now())) { buzz(30); save(); tick(); } return; }
    if (a === 'part') { partSheet(el.dataset.ref); return; }
    if (a === 'quest') { if (V.claimQuest(S, el.dataset.id)) { buzz(20); save(); head(); live(); renderMissions(); missionSheet('orders'); } return; }
    if (a === 'close') { $('modal').hidden = true; modalKind = null; return; }
    if (a === 'upgrade') { const r = V.startUpgrade(S, Date.now()); if (r.ok) { buzz(30); save(); refresh(); } return; }
    if (a === 'export') { $('codeBox').value = encode(); return; }
    if (a === 'copy') {
      const b = $('codeBox'); if (!b.value) b.value = encode(); b.select();
      try { navigator.clipboard.writeText(b.value).then(() => toast('Code copied'), () => document.execCommand('copy')); } catch (e) { document.execCommand('copy'); }
      return;
    }
    if (a === 'import') {
      try { const o = V.migrate(decode($('codeBox').value), Date.now()); S = o; F = null; $('modal').hidden = true; modalKind = null; save(); toast('Save loaded'); tab = 'foundry'; showTab(); refresh(); }
      catch (e) { toast('That code did not work. Copy the whole thing and try again.'); }
      return;
    }
    if (a === 'wipe') {
      const b = $('wipeBtn');
      if (b.dataset.arm) { clearTimeout(wipeT); try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } S = V.newState(Date.now()); F = null; $('modal').hidden = true; modalKind = null; save(); toast('Everything erased'); tab = 'foundry'; showTab(); refresh(); return; }
      b.dataset.arm = '1'; b.textContent = 'Tap again to erase everything'; wipeT = setTimeout(() => { b.dataset.arm = ''; b.textContent = 'Erase everything'; }, 4000);
    }
  }
  document.addEventListener('click', (e) => {
    if (holdSel !== null && !e.target.closest('.holdcard,.holdtile')) { holdSel = null; if (tab === 'foundry') renderForge(); }
    const b = e.target.closest('[data-act]'); if (b && !b.disabled) act(b.dataset.act, b);
  });

  function showTab() {
    if (tab !== 'missions' && F && false) F = null;
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.id === 'tab-' + tab));
    $('app').classList.toggle('onfoundry', tab === 'foundry');
    document.querySelectorAll('nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    if (tab === 'foundry') renderForge(); else if (tab === 'armory') renderArmory(); else if (tab === 'missions') renderMissions(); else if (tab === 'wing') renderWing(); else if (tab === 'depot') renderDepot(); else renderMore();
  }
  document.querySelectorAll('nav button').forEach((b) => { b.onclick = () => { tab = b.dataset.tab; showTab(); }; });

  // details of a fitted part (read only)
  function partSheet(ref) {
    const it = S.gear[ref.split(':')[1]]; if (!it) return;
    sheet('<div class="sh-h"><div class="tile big" style="--tc:' + tcol(it.tier) + '">' + gearIcon(it) + '<span class="lv">Lv.' + it.level + '</span></div><div><b style="color:' + tcol(it.tier) + '">' + esc(V.itemName(it)) + '</b><div class="pst">+' + V.fmt(V.itemStat(it)) + ' ' + statLabel(it.slot) + '</div></div></div>' +
      (it.subs.length ? '<div class="chips">' + it.subs.map((x) => '<span class="chipx" style="--tc:var(--cyan)">' + V.SUBS[x.k].name + ' +' + x.v + '%</span>').join('') + '</div>' : ''), 'part');
  }

  /* ---------- time ---------- */
  function welcome() { /* nothing to announce: whatever built up while you were away is waiting in the stockpile (Collect) */ }
  let lastSave = 0;
  function tick() {
    const now = Date.now(), dt = (now - S.last) / 1000;
    if (dt > 5) { const rep = V.offline(S, now); S.last = now; save(); welcome(rep); refresh(); return; }
    S.last = now;
    V.earn(S, dt);
    const td = V.checkTech(S, now); if (td) { buzz([30, 30]); toast('<b>Research done</b><br>' + TECH_NAME[td] + ' · ' + V.techNode(td).text(V.rLevel(S, td))); save(); refresh(); }
    const lv = V.checkUpgrade(S, now);
    if (lv) { buzz([40, 40, 40]); toast('<b>Forge upgraded to level ' + lv + '</b>'); save(); refresh(); return; }
    if (now - lastSave > 5000) { lastSave = now; save(); }
    live();
  }

  /* ---------- start ---------- */
  load();
  if (window.Cloud) Cloud.init({
    app: 'voidsmith',
    read: () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
    write: (s) => { window.vsNoSave = true; try { localStorage.setItem(KEY, s); } catch (e) { /* ignore */ } },
    score: (s) => { try { const o = JSON.parse(s), t = o.stats || {}; return (t.seconds || 0) + (t.forged || 0); } catch (e) { return 0; } },
    describe: (s) => { try { const o = JSON.parse(s); return 'Forge ' + ((o.forge && o.forge.level) || 1) + ', stage ' + V.stageLabel(Math.max(1, (o.combat && o.combat.best) || 1)) + ', commander ' + ((o.cmd && o.cmd.level) || 1); } catch (e) { return 'empty'; } }
  });
  const rep = V.offline(S, Date.now());
  S.last = Date.now(); save();
  decorateChrome(); showTab(); head(); live();
  welcome(rep);
  setInterval(tick, 250);
  setInterval(() => { if (!document.hidden) fightStep(); }, 120);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); else save(); });
  window.addEventListener('pagehide', save);
})();
