/* YardSuite plan engine: turns a suite type + layout + chosen size into a full plan
   (same data format as js/floorplans.js), by stretching the base layouts along
   "stretch lines" that run through living space, mirroring for side-by-side pairs,
   and stacking for over/under units. */
(function () {
  'use strict';
  const B = window.YS_PLANS;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const ftIn = (f) => { const ft = Math.floor(f + 1e-6), i = Math.round((f - ft) * 12); return i === 12 ? (ft + 1) + "'-0\"" : ft + "'-" + i + '"'; };

  // Where each base layout stretches (feet). Lines pass through living space, never baths or stairs.
  // wx / wy: share of the extra width / depth each line takes (equal when left out).
  const STRETCH = {
    studio: { sx: [14], sy: [11.5] },
    onebed: { sx: [5, 21], sy: [9, 15.5], wy: [0.3, 0.7] },
    twobed: { sx: [5, 23.5], sy: [9, 17.5], wy: [0.3, 0.7] },
    threebed: { sx: [5, 29.5, 39], sy: [9, 17.5], wy: [0.3, 0.7] },
    onebedN: { sx: [5], sy: [9, 19], wy: [0.3, 0.7] },
    twobedN: { sx: [9, 13], sy: [6, 27], wy: [0.35, 0.65] },
    loft: { sx: [14], sy: [21.5] }
  };
  // How much bigger than its starting (smallest) size each layout can get, in feet.
  // The starting sizes in js/floorplans.js are the smallest we draw each layout at:
  // below that a bedroom would fall under our minimum (MIN_BED).
  const GROW = { studio: { w: 16, d: 12 }, onebed: { w: 20, d: 15 }, twobed: { w: 20, d: 17 }, threebed: { w: 16, d: 12 }, onebedN: { w: 8, d: 16 }, twobedN: { w: 8, d: 14 }, loft: { w: 16, d: 12 } };
  // Smallest bedroom we draw, in feet, measured the same way the plan labels it.
  // Ontario Building Code 9.5.7 minimums with a built-in closet are 95 sq ft (main bedroom) and 65 sq ft (others).
  const MIN_BED = { main: { w: 10, d: 10, sqft: 95 }, other: { w: 9, d: 9, sqft: 65 } };

  const TYPES = {
    single: { label: 'One storey', units: 1, storeys: 1, blurb: 'One suite on one level', layouts: ['studio', 'onebed', 'onebedN', 'twobed', 'twobedN', 'threebed'] },
    loft: { label: 'Two storey', units: 1, storeys: 2, blurb: 'One suite, living down, bedrooms up', layouts: ['loft'] },
    side: { label: 'Two units, side by side', units: 2, storeys: 1, blurb: 'Two suites sharing one wall', layouts: ['studio', 'onebed'] },
    stacked: { label: 'Two units, stacked', units: 2, storeys: 2, blurb: 'One suite up, one down, outside stair', layouts: ['onebed', 'onebedN', 'studio'] },
    lower: { label: 'Two units, raised lower level', units: 2, storeys: 2, aboveGrade: 1, blurb: 'One storey tall, second suite in a raised lower level', layouts: ['onebed', 'onebedN', 'studio', 'twobed', 'twobedN'] }
  };
  const LAYOUT_LABEL = { studio: 'Studio', onebed: 'One bedroom', twobed: 'Two bedroom', threebed: 'Three bedroom', onebedN: 'One bedroom, narrow', twobedN: 'Two bedroom, narrow', loft: 'Two bedroom loft' };

  function stretchFloor(f, base, W, D) {
    const s = STRETCH[base.key], dW = W - base.W, dD = D - base.D;
    const share = (lines, wts) => lines.map((l, i) => wts ? wts[i] : 1 / lines.length);
    const shx = share(s.sx, s.wx), shy = share(s.sy, s.wy);
    const mk = (lines, sh, d) => (v) => lines.reduce((acc, l, i) => acc + (v > l + 1e-6 ? d * sh[i] : 0), v);
    const tx = mk(s.sx, shx, dW), ty = mk(s.sy, shy, dD);
    const spanX = (x, w) => s.sx.some(l => x < l && x + w > l), spanY = (y, h) => s.sy.some(l => y < l && y + h > l);
    const n = clone(f);
    n.walls = n.walls.map(w => { const r = [tx(w[0]), ty(w[1]), tx(w[2]), ty(w[3])]; if (w[4]) r.push(w[4]); return r; });
    n.rooms = n.rooms.map(r => {
      const x2 = tx(r.x + r.w), y2 = ty(r.y + r.h), nx = tx(r.x), ny = ty(r.y);
      const o = Object.assign({}, r, { x: nx, y: ny, w: x2 - nx, h: y2 - ny });
      o.lx = spanX(r.x, r.w) ? nx + (r.lx - r.x) * (o.w / r.w) : tx(r.lx);
      o.ly = spanY(r.y, r.h) ? ny + (r.ly - r.y) * (o.h / r.h) : ty(r.ly);
      if (o.dimText) o.dimText = ftIn(o.w) + ' x ' + ftIn(o.h);
      return o;
    });
    const along = (o) => (o.wall === 'N' || o.wall === 'S' || o.side === 'N' || o.side === 'S' || o.h !== undefined) ? 'x' : 'y';
    n.doors = n.doors.map(d => {
      const o = Object.assign({}, d);
      if (along(d) === 'x') o.at = tx(d.at); else o.at = ty(d.at);
      if (d.h !== undefined) o.h = ty(d.h); if (d.v !== undefined) o.v = tx(d.v);
      return o;
    });
    n.windows = n.windows.map(w => { const o = Object.assign({}, w); if (along(w) === 'x') o.at = tx(w.at); else o.at = ty(w.at); return o; });
    const stretchy = { counter: 1, closet: 1, rod: 1 };
    n.fixtures = n.fixtures.map(fx => {
      const o = Object.assign({}, fx);
      if (fx.x !== undefined) {
        if (stretchy[fx.t] && spanX(fx.x, fx.w)) { o.x = tx(fx.x); o.w = tx(fx.x + fx.w) - o.x; } else o.x = fx.x + (tx(fx.x + fx.w / 2) - (fx.x + fx.w / 2));
        if (stretchy[fx.t] && spanY(fx.y, fx.h)) { o.y = ty(fx.y); o.h = ty(fx.y + fx.h) - o.y; } else o.y = fx.y + (ty(fx.y + fx.h / 2) - (fx.y + fx.h / 2));
      } else {
        o.cx = tx(fx.cx);
        if (fx.cy !== undefined) o.cy = ty(fx.cy); else o.y = ty(fx.y);
      }
      return o;
    });
    // add a window in long new stretches of blank wall
    const clear = (side, a, b) => n.windows.concat(n.doors.filter(d => d.wall)).every(o => { const sd = o.side || o.wall; return sd !== side || o.at + o.len < a - 0.5 || o.at > b + 0.5; });
    s.sx.forEach((l, i) => { const g = dW * shx[i]; if (g >= 6) ['N', 'S'].forEach(side => { const a = tx(l) + g / 2 - 2 - g; const at = l + g / 2 - 2 + (tx(l) - l); if (clear(side, at, at + 4)) n.windows.push({ side, at, len: 4 }); }); });
    s.sy.forEach((l, i) => { const g = dD * shy[i]; if (g >= 6) ['E', 'W'].forEach(side => { const at = l + g / 2 - 2 + (ty(l) - l); if (clear(side, at, at + 4)) n.windows.push({ side, at, len: 4 }); }); });
    return n;
  }

  function stretch(baseKey, W, D) {
    const base = B[baseKey];
    const p = clone(base);
    p.W = W; p.D = D;
    p.floors = base.floors.map(f => stretchFloor(f, base, W, D));
    return p;
  }

  function mirrorFloor(f, W) {
    const n = clone(f);
    const mx = (x) => 2 * W - x;
    n.walls = n.walls.map(w => { const r = [mx(w[0]), w[1], mx(w[2]), w[3]]; if (w[4]) r.push(w[4]); return r; });
    n.rooms = n.rooms.map(r => Object.assign({}, r, { x: mx(r.x + r.w), lx: mx(r.lx), anchor: r.anchor === 'end' ? 'start' : r.anchor === 'start' ? 'end' : r.anchor }));
    n.doors = n.doors.map(d => {
      const o = Object.assign({}, d);
      if (d.wall === 'N' || d.wall === 'S' || d.h !== undefined) { o.at = mx(d.at + d.len); o.hingeEnd = !d.hingeEnd; }
      if (d.wall === 'W') o.wall = 'E'; else if (d.wall === 'E') o.wall = 'W';
      if (d.v !== undefined) { o.v = mx(d.v); o.swing = -(d.swing || 1); }
      return o;
    });
    n.windows = n.windows.map(w => { const o = Object.assign({}, w); if (w.side === 'N' || w.side === 'S') o.at = mx(w.at + w.len); else o.side = w.side === 'W' ? 'E' : 'W'; return o; });
    const flip = { E: 'W', W: 'E' };
    n.fixtures = n.fixtures.map(fx => {
      const o = Object.assign({}, fx);
      if (fx.x !== undefined) o.x = mx(fx.x + fx.w);
      if (fx.cx !== undefined) o.cx = mx(fx.cx);
      if (fx.head && flip[fx.head]) o.head = flip[fx.head];
      if (fx.facing && flip[fx.facing]) o.facing = flip[fx.facing];
      if (fx.dir && flip[fx.dir]) o.dir = flip[fx.dir];
      return o;
    });
    return n;
  }

  function sideBySide(baseKey, W, D) {
    const unit = stretch(baseKey, W, D);
    const p = clone(unit);
    p.W = W * 2;
    p.floors = unit.floors.map(f => {
      const a = clone(f);
      a.windows = a.windows.filter(w => w.side !== 'E');           // party wall has no windows
      const b = mirrorFloor(a, W);
      const tag = (rooms, u) => rooms.map(r => Object.assign({}, r, { name: r.small ? r.name : r.name }));
      const merged = {
        label: 'Main floor',
        walls: a.walls.concat(b.walls, [[W, 0, W, D, 'party']]),
        doors: a.doors.concat(b.doors),
        windows: a.windows.concat(b.windows),
        rooms: tag(a.rooms, 'A').concat(tag(b.rooms, 'B')),
        fixtures: a.fixtures.concat(b.fixtures),
        unitLabels: [{ x: W / 2, text: 'UNIT A' }, { x: W * 1.5, text: 'UNIT B' }]
      };
      return merged;
    });
    return p;
  }

  function stacked(baseKey, W, D) {
    const unit = stretch(baseKey, W, D);
    const p = clone(unit);
    p.storeys = 2;
    const lower = clone(unit.floors[0]);
    lower.label = 'Lower unit';
    // keep the east wall clear under the outside stair landing
    lower.windows = lower.windows.filter(w => !(w.side === 'E' && w.at + w.len > D - 9));
    const upper = clone(unit.floors[0]);
    upper.label = 'Upper unit';
    const entry = upper.doors.find(d => d.entry);
    upper.doors = upper.doors.filter(d => !d.entry);
    upper.doors.push({ wall: 'E', at: D - 6, len: 3, swing: -1, entry: true, upper: true });
    upper.windows = upper.windows.filter(w => !(w.side === 'E' && w.at + w.len > D - 9));
    if (entry) upper.windows.push({ side: 'S', at: entry.at, len: entry.len });
    p.floors = [lower, upper];
    p.extStair = { side: 'E', topAt: D - 6.5, width: 3.5 };
    return p;
  }

  // A one-storey suite over a raised lower-level suite. The lower level sits about half
  // below grade (SINK feet), so the building reads as one storey from the yard.
  const SINK = 4.5;
  function lowerLevel(baseKey, W, D) {
    const unit = stretch(baseKey, W, D);
    const p = clone(unit);
    const lower = clone(unit.floors[0]);
    lower.label = 'Lower level unit';
    const entry = lower.doors.find(d => d.entry);
    lower.doors = lower.doors.filter(d => !d.entry);
    lower.windows = lower.windows.filter(w => !(w.side === 'E' && w.at + w.len > D - 9));
    lower.doors.push({ wall: 'E', at: D - 6, len: 3, swing: -1, entry: true, walkdown: true });
    if (entry) lower.windows.push({ side: 'S', at: entry.at, len: entry.len });
    const upper = clone(unit.floors[0]);
    upper.label = 'Main floor unit';
    upper.doors.forEach(d => { if (d.entry) d.stepsUp = true; });
    p.floors = [lower, upper];
    p.lowerLevel = { sink: SINK, well: { side: 'E', at: D - 6, len: 3 } };
    return p;
  }

  function build(typeKey, layoutKey, W, D) {
    const t = TYPES[typeKey];
    let p;
    if (typeKey === 'side') p = sideBySide(layoutKey, W, D);
    else if (typeKey === 'stacked') p = stacked(layoutKey, W, D);
    else if (typeKey === 'lower') p = lowerLevel(layoutKey, W, D);
    else p = stretch(layoutKey, W, D);
    p.type = typeKey; p.layout = layoutKey; p.units = t.units; p.storeys = t.storeys; p.aboveGrade = t.aboveGrade || t.storeys;
    p.key = typeKey === 'loft' ? 'two-storey' : typeKey === 'single' ? layoutKey : typeKey + '-' + layoutKey;
    p.name = typeKey === 'single' ? LAYOUT_LABEL[layoutKey] : typeKey === 'loft' ? 'Two-storey loft' : typeKey === 'side' ? '2 x ' + LAYOUT_LABEL[layoutKey].toLowerCase() + ', side by side' : typeKey === 'lower' ? '2 x ' + LAYOUT_LABEL[layoutKey].toLowerCase() + ', raised lower level' : '2 x ' + LAYOUT_LABEL[layoutKey].toLowerCase() + ', stacked';
    const unitBeds = B[layoutKey].beds;
    p.beds = unitBeds * t.units; p.baths = B[layoutKey].baths * t.units;
    p.tagline = t.blurb;
    return p;
  }

  function sizeRange(typeKey, layoutKey) {
    const b = B[layoutKey], g = GROW[layoutKey];
    return { minW: b.W, maxW: b.W + g.w, minD: b.D, maxD: b.D + g.d, step: 1 };
  }
  // footprint in sq ft, finished floor area in sq ft
  function footprint(p) { return p.W * p.D; }
  function floorArea(p) { return p.W * p.D * p.storeys; }
  // approximate height to the peak, in metres, for the chosen roof
  function heightM(p, look) {
    const span = Math.min(p.W, p.D);
    const roofFt = look.roof === 'gable' ? (span / 2) * look.pitch : look.roof === 'shed' ? p.D * look.pitch : 1.1;
    const sunk = p.lowerLevel ? p.lowerLevel.sink : 0; // part of a raised lower level below grade
    return (0.9 + p.storeys * 9 + roofFt - sunk) * 0.3048;
  }

  window.YS_ENGINE = { TYPES, LAYOUT_LABEL, MIN_BED, build, sizeRange, footprint, floorArea, heightM };
})();
