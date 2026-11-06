/* Voidsmith ship rig: stacks equipment layers (paper-doll) over a hull chassis.
 *
 * Two separate asset folders, on purpose:
 *   assets/icons/  inventory and Forge-grid icons, 3/4 isometric view   gear_<slot>_t<NN>_<a|b|c>.png
 *   assets/ship/   battle layers, strict flat side-profile cut-outs      hull_t<NN>.png, <slot>_t<NN>_<a|b|c>.png
 *
 * ART lists what exists. Anything not listed is skipped, so a missing image never 404s;
 * the code-drawn ship stays as the fallback until a hull image is added.
 * Add a file, add its entry here, bump sw.js VERSION. Nothing else changes.
 */
(function (root) {
  'use strict';
  const nn = (t) => String(t + 1).padStart(2, '0');
  const VAR = 'abc';

  /* ----- what art is on disk (tier numbers are 1-based, like the file names) ----- */
  const ICON_SLOTS = ['cannon', 'pod', 'array', 'coil', 'plating', 'bulkhead', 'emitter', 'spar'];
  const ICONS = {}; [1, 2, 3].forEach((t) => ICON_SLOTS.forEach((s) => { ICONS[s + ':' + t + ':a'] = 1; }));

  // Hull chassis: ar = width/height of the image (it has headroom on top for turrets);
  // sx, sy = where a turret's base sits (fractions of the image); ring = socket width as a fraction of image width.
  const HULLS = {
    1: { ar: 1.7928, sx: 0.5343, sy: 0.7175, ring: 0.0958 },
    2: { ar: 1.3534, sx: 0.5769, sy: 0.6246, ring: 0.1040 }
  };
  // Side-profile layers. px = pivot x inside the image (the turret's base centre), hf = housing width as a share of the image,
  // fit = how far the housing overhangs the socket ring, ar = image width/height. Size on any hull = ring * fit / hf.
  const LAYERS = {
    cannon: {
      1: { a: { px: 0.1987, hf: 0.3974, fit: 1.25, ar: 4.0 } },
      2: { a: { px: 0.3438, hf: 0.4911, fit: 1.85, ar: 2.905 } }
    }
  };

  /* ----- default anchors for the other slots, as offsets from the hull's turret socket (fractions of hull width).
     They are used the moment art for that slot is added to LAYERS; adjust per hull in HULLS[t].anchors if a hull needs it. ----- */
  const ANCHOR = {
    pod:      { dx: -0.17, dy: 0.015, w: 0.15, px: 0.5, py: 1 },
    array:    { dx:  0.20, dy: 0.005, w: 0.09, px: 0.5, py: 1 },
    emitter:  { dx: -0.40, dy: 0.0,   w: 0.10, px: 0.5, py: 1 },
    bulkhead: { dx:  0.00, dy: 0.10,  w: 0.14, px: 0.5, py: 0.5 },
    spar:     { dx:  0.00, dy: 0.20,  w: 0.50, px: 0.5, py: 0.5 },
    plating:  { dx:  0.00, dy: 0.00,  w: 1.00, px: 0.0, py: 0.0, overlay: true }
  };
  // back to front
  const ORDER = ['spar', 'emitter', 'bulkhead', 'hull', 'plating', 'array', 'pod', 'cannon'];

  const iconSrc = (slot, tier, v) => 'assets/icons/gear_' + slot + '_t' + nn(tier) + '_' + VAR[v || 0] + '.png';
  const layerSrc = (slot, tier, v) => 'assets/ship/' + slot + '_t' + nn(tier) + '_' + VAR[v || 0] + '.png';
  const hullSrc = (tier) => 'assets/ship/hull_t' + nn(tier) + '.png';
  const hasIcon = (slot, tier, v) => !!ICONS[slot + ':' + (tier + 1) + ':' + VAR[v || 0]];
  const hasLayer = (slot, tier, v) => !!(LAYERS[slot] && LAYERS[slot][tier + 1] && LAYERS[slot][tier + 1][VAR[v || 0]]);
  const hasHull = (tier) => !!HULLS[tier + 1];

  /* Inventory icon (3/4 view). Falls back to null so the caller can draw its code icon. */
  function icon(it, cls) {
    if (!it || !hasIcon(it.slot, it.tier, it.v)) return null;
    return '<img class="gi ' + (cls || '') + '" src="' + iconSrc(it.slot, it.tier, it.v) + '" alt="" draggable="false">';
  }

  /* Placement of a layer on a hull: { left, top, width, tx, ty } in percent of the rig box. */
  function place(slot, hullTier, it) {
    const h = HULLS[hullTier + 1]; if (!h) return null;
    const v = VAR[it.v || 0];
    if (slot === 'cannon') {
      const L = LAYERS.cannon[it.tier + 1] && LAYERS.cannon[it.tier + 1][v]; if (!L) return null;
      const w = h.ring * L.fit / L.hf;                   // width as a share of the hull width
      return { left: h.sx * 100, top: h.sy * 100, width: w * 100, tx: -L.px * 100, ty: -100 };
    }
    const A = (h.anchors && h.anchors[slot]) || ANCHOR[slot]; if (!A) return null;
    const L = LAYERS[slot] && LAYERS[slot][it.tier + 1] && LAYERS[slot][it.tier + 1][v]; if (!L) return null;
    if (A.overlay) return { left: 0, top: 0, width: 100, tx: 0, ty: 0 };
    return { left: (h.sx + A.dx) * 100, top: (h.sy + A.dy * h.ar) * 100, width: A.w * 100, tx: -A.px * 100, ty: -A.py * 100 };
  }

  /* The full ship. hullTier is 0-based (from VS.hullTier). fallbackSvg is the code-drawn ship, used until the hull has art.
     Returns HTML: <div class="shipbob"><div class="rig" style="--hs:.85"> ...layers... </div></div> */
  function rig(state, ship, hullTier, fallbackSvg) {
    const gear = state.gear || {};
    let inner = '', ar = 200 / 110;
    if (hasHull(hullTier)) {
      const hh = HULLS[hullTier + 1]; ar = hh.ar;
      ORDER.forEach((slot) => {
        if (slot === 'hull') { inner += '<img class="lay lay-hull" src="' + hullSrc(hullTier) + '" alt="" draggable="false" style="inset:0;width:100%;height:100%">'; return; }
        const it = gear[slot]; if (!it || !hasLayer(slot, it.tier, it.v)) return;
        const p = place(slot, hullTier, it); if (!p) return;
        const st = 'left:' + p.left.toFixed(2) + '%;top:' + p.top.toFixed(2) + '%;width:' + p.width.toFixed(2) + '%;transform:translate(' + p.tx.toFixed(1) + '%,' + p.ty.toFixed(1) + '%)';
        inner += '<img class="lay lay-' + slot + '" src="' + layerSrc(slot, it.tier, it.v) + '" alt="" draggable="false" style="' + st + '">';
      });
    } else inner = fallbackSvg;
    return '<div class="shipbob"><div class="rig' + (hasHull(hullTier) ? '' : ' fb') + '" data-hull="' + (hullTier + 1) + '" title="' + ship.archetype + '" style="--hs:' + ship.scale + ';aspect-ratio:' + ar.toFixed(4) + '">' + inner + '</div></div>';
  }

  const api = { rig, icon, place, iconSrc, layerSrc, hullSrc, hasIcon, hasLayer, hasHull, ICONS, HULLS, LAYERS, ANCHOR, ORDER };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.VSShip = api;
})(typeof window !== 'undefined' ? window : globalThis);
