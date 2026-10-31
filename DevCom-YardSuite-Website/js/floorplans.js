/* YardSuite floor plans: plan data (in feet) and an SVG renderer.
   Origin is the top-left (north-west) outside corner. x runs east, y runs south.
   The same data drives the 3D model and the backyard footprint, so they always match. */
(function () {
  'use strict';

  const PLANS = {
    studio: {
      key: 'studio', name: 'Studio', tagline: 'Open studio with full bath and laundry',
      W: 24, D: 20, storeys: 1, beds: 0, baths: 1,
      floors: [{
        label: 'Main floor',
        walls: [[8, 0, 8, 7], [0, 7, 8, 7], [4, 7, 4, 10.5], [0, 10.5, 4, 10.5]],
        doors: [
          { wall: 'S', at: 10, len: 3, swing: -1, entry: true },
          { v: 8, at: 4, len: 2.5, swing: -1 },
          { v: 4, at: 7.5, len: 2.5, swing: 1, type: 'bifold' }
        ],
        windows: [
          { side: 'N', at: 13, len: 3 }, { side: 'S', at: 2, len: 5 }, { side: 'S', at: 16, len: 5 },
          { side: 'E', at: 7, len: 4 }, { side: 'W', at: 13, len: 4 }
        ],
        rooms: [
          { name: 'Bath', x: 0, y: 0, w: 8, h: 7, lx: 5.6, ly: 4.6 },
          { name: 'Kitchen', x: 8, y: 0, w: 16, h: 6, lx: 16, ly: 3.6, nodim: true },
          { name: 'Living / sleep', x: 4, y: 7, w: 20, h: 13, lx: 9.5, ly: 12.2, dimText: "24'-0\" x 13'-0\"" }
        ],
        fixtures: [
          { t: 'tub', x: 0.3, y: 0.3, w: 5, h: 2.5 },
          { t: 'toilet', cx: 6.6, y: 0.3, dir: 'N' },
          { t: 'vanity', x: 0.3, y: 3.3, w: 1.8, h: 3, vertical: true },
          { t: 'wd', x: 0.4, y: 7.4, w: 3.2, h: 2.7, label: 'W/D' },
          { t: 'counter', x: 9, y: 0.3, w: 12, h: 2 },
          { t: 'sink', cx: 14.5, cy: 1.3 },
          { t: 'range', x: 18, y: 0.3, w: 2.5, h: 2 },
          { t: 'fridge', x: 21.1, y: 0.3, w: 2.6, h: 2.5 },
          { t: 'roundtable', cx: 11.5, cy: 5.6, r: 1.6 },
          { t: 'bed', x: 16.6, y: 12.2, w: 6.8, h: 5, head: 'E' },
          { t: 'sofa', x: 0.4, y: 11.6, w: 3, h: 7, facing: 'E' },
          { t: 'coffee', x: 4.4, y: 13.6, w: 2, h: 3.6 }
        ]
      }]
    },

    onebed: {
      key: 'onebed', name: 'One Bedroom', tagline: 'Separate bedroom, open kitchen and living',
      W: 28, D: 24, storeys: 1, beds: 1, baths: 1,
      floors: [{
        label: 'Main floor',
        walls: [[12, 0, 12, 13.5], [0, 11, 12, 11], [0, 13.5, 12, 13.5], [6, 11, 6, 13.5], [12, 8, 19, 8], [19, 0, 19, 8]],
        doors: [
          { wall: 'S', at: 14, len: 3, swing: -1, entry: true },
          { v: 12, at: 8.3, len: 2.5, swing: -1 },
          { h: 11, at: 0.6, len: 5, swing: -1, type: 'bifold' },
          { h: 13.5, at: 6.6, len: 4.8, swing: 1, type: 'bifold' },
          { h: 8, at: 13, len: 2.5, swing: -1 }
        ],
        windows: [
          { side: 'N', at: 3, len: 5 }, { side: 'N', at: 21.6, len: 3 }, { side: 'E', at: 13, len: 4 },
          { side: 'S', at: 3, len: 6 }, { side: 'S', at: 21, len: 5 }, { side: 'W', at: 16, len: 4 }
        ],
        rooms: [
          { name: 'Bedroom', x: 0, y: 0, w: 12, h: 11, lx: 9, ly: 9.3, anchor: 'end' },
          { name: 'Bath', x: 12, y: 0, w: 7, h: 8, lx: 15.5, ly: 4.6 },
          { name: 'Closet', x: 0, y: 11, w: 6, h: 2.5, lx: 3, ly: 12.6, small: true, nodim: true },
          { name: 'Laundry', x: 6, y: 11, w: 6, h: 2.5, lx: 9, ly: 12.6, small: true, nodim: true },
          { name: 'Kitchen', x: 19, y: 0, w: 9, h: 11, lx: 22.6, ly: 9.6, nodim: true },
          { name: 'Living / dining', x: 0, y: 13.5, w: 28, h: 10.5, lx: 13.8, ly: 17.4, dimText: "28'-0\" x 10'-6\"" }
        ],
        fixtures: [
          { t: 'bed', x: 0.3, y: 2.5, w: 6.8, h: 5, head: 'W' },
          { t: 'nightstand', x: 0.3, y: 1.1, w: 1.4, h: 1.2 }, { t: 'nightstand', x: 0.3, y: 7.7, w: 1.4, h: 1.2 },
          { t: 'tub', x: 12.3, y: 0.3, w: 4.6, h: 2.5 },
          { t: 'toilet', cx: 18, y: 0.3, dir: 'N' },
          { t: 'vanity', x: 15.9, y: 6, w: 2.8, h: 1.8 },
          { t: 'rod', x: 0.4, y: 11.2, w: 5.2, h: 2.1 },
          { t: 'wd', x: 6.6, y: 11.2, w: 4.8, h: 2.1, label: 'W   D', pair: true },
          { t: 'counter', x: 19.3, y: 0.3, w: 6.7, h: 2 },
          { t: 'counter', x: 25.7, y: 0.3, w: 2, h: 7.2 },
          { t: 'sink', cx: 23.1, cy: 1.3 },
          { t: 'range', x: 25.7, y: 3.2, w: 2, h: 2.5 },
          { t: 'fridge', x: 25.1, y: 7.7, w: 2.6, h: 2.6 },
          { t: 'island', x: 20.2, y: 4.6, w: 4.4, h: 2.4 },
          { t: 'table', x: 20.6, y: 14.4, w: 3.4, h: 5 },
          { t: 'sofa', x: 2, y: 20.6, w: 7.4, h: 3, facing: 'N' },
          { t: 'coffee', x: 3.7, y: 17.6, w: 4, h: 2 }
        ]
      }]
    },

    twobed: {
      key: 'twobed', name: 'Two Bedroom', tagline: 'Two bedrooms, kitchen island, family living',
      W: 32, D: 30, storeys: 1, beds: 2, baths: 1,
      floors: [{
        label: 'Main floor',
        walls: [[12, 0, 12, 12], [20, 0, 20, 12], [12, 8, 20, 8], [0, 12, 12, 12], [20, 12, 32, 12]],
        doors: [
          { wall: 'S', at: 15, len: 3, swing: -1, entry: true },
          { v: 12, at: 9.1, len: 2.5, swing: -1 },
          { v: 20, at: 9.1, len: 2.5, swing: 1 },
          { h: 8, at: 13.4, len: 2.5, swing: -1 }
        ],
        windows: [
          { side: 'N', at: 3, len: 5 }, { side: 'N', at: 14, len: 2 }, { side: 'N', at: 24, len: 5 },
          { side: 'W', at: 17, len: 5 }, { side: 'E', at: 23.5, len: 4 },
          { side: 'S', at: 3, len: 6 }, { side: 'S', at: 22, len: 6 }
        ],
        rooms: [
          { name: 'Bedroom 1', x: 0, y: 0, w: 12, h: 12, lx: 8.8, ly: 8.6, anchor: 'end' },
          { name: 'Bath', x: 12, y: 0, w: 8, h: 8, lx: 15.6, ly: 4.3 },
          { name: 'Bedroom 2', x: 20, y: 0, w: 12, h: 12, lx: 23.2, ly: 8.6, anchor: 'start' },
          { name: 'Hall', x: 12, y: 8, w: 8, h: 4, lx: 16, ly: 10.6, small: true, nodim: true },
          { name: 'Kitchen', x: 20, y: 12, w: 12, h: 10, lx: 24.4, ly: 21.6, nodim: true },
          { name: 'Living / dining', x: 0, y: 12, w: 32, h: 18, lx: 11, ly: 16.4, dimText: "32'-0\" x 18'-0\"" }
        ],
        fixtures: [
          { t: 'bed', x: 0.3, y: 2.5, w: 6.8, h: 5, head: 'W' },
          { t: 'nightstand', x: 0.3, y: 1.1, w: 1.4, h: 1.2 }, { t: 'nightstand', x: 0.3, y: 7.7, w: 1.4, h: 1.2 },
          { t: 'closet', x: 1, y: 9.8, w: 7, h: 2 },
          { t: 'tub', x: 12.3, y: 0.3, w: 2.5, h: 5, vertical: true },
          { t: 'toilet', cx: 16.1, y: 0.3, dir: 'N' },
          { t: 'vanity', x: 17.3, y: 0.3, w: 2.4, h: 1.8 },
          { t: 'wd', x: 17.1, y: 5, w: 2.6, h: 2.7, label: 'W/D' },
          { t: 'bed', x: 25, y: 3, w: 6.7, h: 4.6, head: 'E' },
          { t: 'nightstand', x: 30.3, y: 1.6, w: 1.4, h: 1.2 },
          { t: 'closet', x: 23.5, y: 9.8, w: 7.5, h: 2 },
          { t: 'counter', x: 21, y: 12.3, w: 10.7, h: 2 },
          { t: 'counter', x: 29.7, y: 14.3, w: 2, h: 7.2 },
          { t: 'sink', cx: 25.6, cy: 13.3 },
          { t: 'range', x: 29.7, y: 16.4, w: 2, h: 2.5 },
          { t: 'fridge', x: 29.1, y: 21.8, w: 2.6, h: 2.6 },
          { t: 'island', x: 22.6, y: 16.6, w: 5, h: 2.6 },
          { t: 'table', x: 13.4, y: 18.2, w: 3.6, h: 5.2 },
          { t: 'sofa', x: 2, y: 26.6, w: 7.6, h: 3, facing: 'N' },
          { t: 'coffee', x: 3.8, y: 23.2, w: 4, h: 2 },
          { t: 'sofa', x: 0.4, y: 18.4, w: 3, h: 5.4, facing: 'E' }
        ]
      }]
    },

    loft: {
      key: 'loft', name: 'Two-Storey', tagline: 'Living down, two bedrooms and loft up',
      W: 24, D: 24, storeys: 2, beds: 2, baths: 1.5,
      floors: [{
        label: 'Ground floor',
        walls: [[5, 0, 5, 6], [0, 6, 5, 6], [3.5, 8, 3.5, 21, 'guard']],
        doors: [
          { wall: 'S', at: 6, len: 3, swing: -1, entry: true },
          { h: 6, at: 1.4, len: 2.4, swing: -1 }
        ],
        windows: [
          { side: 'N', at: 9.6, len: 3 }, { side: 'E', at: 5, len: 4 }, { side: 'E', at: 15, len: 5 },
          { side: 'S', at: 13, len: 7, slider: true }, { side: 'W', at: 1, len: 2.5 }
        ],
        rooms: [
          { name: 'Powder', x: 0, y: 0, w: 5, h: 6, lx: 2.5, ly: 3.4, small: true, nodim: true },
          { name: 'Kitchen', x: 5, y: 0, w: 19, h: 8, lx: 12, ly: 9.4, nodim: true },
          { name: 'Living / dining', x: 3.5, y: 8, w: 20.5, h: 16, lx: 11.5, ly: 15.6, dimText: "20'-6\" x 16'-0\"" }
        ],
        fixtures: [
          { t: 'toilet', cx: 1.2, y: 0.3, dir: 'N' },
          { t: 'vanity', x: 2.6, y: 0.3, w: 2.2, h: 1.6 },
          { t: 'counter', x: 6, y: 0.3, w: 14.5, h: 2 },
          { t: 'sink', cx: 11.1, cy: 1.3 },
          { t: 'range', x: 15.2, y: 0.3, w: 2.5, h: 2 },
          { t: 'fridge', x: 21, y: 0.3, w: 2.7, h: 2.5 },
          { t: 'island', x: 8.6, y: 4.6, w: 6, h: 2.6 },
          { t: 'table', x: 17.6, y: 6.6, w: 3.6, h: 5.2 },
          { t: 'stair', x: 0.3, y: 8, w: 3.2, h: 13, dir: 'S', label: 'UP' },
          { t: 'sofa', x: 20.6, y: 14.2, w: 3, h: 7, facing: 'W' },
          { t: 'coffee', x: 17.2, y: 15.8, w: 2, h: 3.8 }
        ]
      }, {
        label: 'Upper floor',
        walls: [[8, 0, 8, 8], [0, 8, 3.5, 8], [12, 0, 12, 24], [12, 12, 24, 12], [3.5, 8, 3.5, 21, 'guard']],
        doors: [
          { v: 8, at: 5.2, len: 2.5, swing: -1 },
          { v: 12, at: 8.6, len: 2.5, swing: 1 },
          { v: 12, at: 13.4, len: 2.5, swing: 1 }
        ],
        windows: [
          { side: 'N', at: 2.6, len: 2.5 }, { side: 'N', at: 15, len: 6 }, { side: 'E', at: 3, len: 5 },
          { side: 'E', at: 16, len: 5 }, { side: 'S', at: 15, len: 6 }, { side: 'W', at: 12, len: 5 }
        ],
        rooms: [
          { name: 'Bath', x: 0, y: 0, w: 8, h: 8, lx: 4.6, ly: 5.6 },
          { name: 'Bedroom 1', x: 12, y: 0, w: 12, h: 12, lx: 12.9, ly: 7.3, anchor: 'start' },
          { name: 'Bedroom 2', x: 12, y: 12, w: 12, h: 12, lx: 14, ly: 21.6, anchor: 'start' },
          { name: 'Loft', x: 3.5, y: 8, w: 8.5, h: 16, lx: 7.8, ly: 19.6, dimText: "8'-6\" x 16'-0\"" }
        ],
        fixtures: [
          { t: 'tub', x: 0.3, y: 0.3, w: 2.5, h: 5, vertical: true },
          { t: 'toilet', cx: 3.9, y: 0.3, dir: 'N' },
          { t: 'vanity', x: 5.3, y: 0.3, w: 2.4, h: 1.8 },
          { t: 'wd', x: 8.6, y: 0.4, w: 3, h: 2.8, label: 'W/D' },
          { t: 'bed', x: 16.9, y: 1.2, w: 6.8, h: 5, head: 'E' },
          { t: 'nightstand', x: 22.3, y: 6.5, w: 1.4, h: 1.2 },
          { t: 'closet', x: 16.6, y: 9.9, w: 7.1, h: 1.9 },
          { t: 'bed', x: 17, y: 16.2, w: 6.7, h: 4.6, head: 'E' },
          { t: 'closet', x: 15.2, y: 12.2, w: 8.5, h: 1.9 },
          { t: 'stair', x: 0.3, y: 8, w: 3.2, h: 13, dir: 'S', label: 'DN', hole: true },
          { t: 'desk', x: 4, y: 11.6, w: 2, h: 4.4 }
        ]
      }]
    }
  };

  // ---------- helpers ----------
  const ftIn = (f) => {
    const ft = Math.floor(f + 1e-6);
    const inch = Math.round((f - ft) * 12);
    return inch === 12 ? (ft + 1) + "'-0\"" : ft + "'-" + inch + '"';
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function area(p) { return p.W * p.D * p.storeys; }

  function renderFloor(plan, floorIdx, opts) {
    opts = opts || {};
    const f = plan.floors[floorIdx];
    const S = opts.scale || 18;          // px per foot
    const pad = 64;
    const TE = 0.5, TI = 0.36;           // wall thickness, feet
    const ink = '#1d1d1d', paper = '#fbf9f4', soft = '#7b7466', gold = '#b8963a', glass = '#8fb6d6';
    const W = plan.W, D = plan.D;
    const X = (v) => (pad + v * S).toFixed(1);
    const Y = (v) => (pad + v * S).toFixed(1);
    const L = (v) => (v * S).toFixed(1);
    const out = [];
    const vw = W * S + pad * 2, vh = D * S + pad * 2 + 26;

    out.push(`<svg viewBox="0 0 ${vw} ${vh}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(plan.name + ' ' + f.label + ' floor plan, ' + W + ' by ' + D + ' feet')}" style="width:100%;height:auto;display:block;font-family:Inter,Arial,sans-serif">`);
    out.push(`<rect width="${vw}" height="${vh}" fill="${paper}"/>`);

    // room floor tints
    (f.rooms || []).forEach(r => {
      const wet = /bath|powder|laundry/i.test(r.name);
      const tint = wet ? '#eef3f6' : /kitchen/i.test(r.name) ? '#f5f1e6' : '#ffffff';
      out.push(`<rect x="${X(r.x)}" y="${Y(r.y)}" width="${L(r.w)}" height="${L(r.h)}" fill="${tint}"/>`);
    });

    // exterior wall frame (even-odd ring)
    out.push(`<path fill-rule="evenodd" fill="${ink}" d="M${X(0)} ${Y(0)}h${L(W)}v${L(D)}h-${L(W)}z M${X(TE)} ${Y(TE)}v${L(D - 2 * TE)}h${L(W - 2 * TE)}v-${L(D - 2 * TE)}z"/>`);

    // interior walls
    (f.walls || []).forEach(w => {
      const guard = w[4] === 'guard', party = w[4] === 'party';
      out.push(`<line x1="${X(w[0])}" y1="${Y(w[1])}" x2="${X(w[2])}" y2="${Y(w[3])}" stroke="${ink}" stroke-width="${L(guard ? 0.22 : party ? TE * 1.3 : TI)}" stroke-linecap="square"/>`);
    });

    // openings
    const wallLine = (o) => {
      if (o.wall === 'N') return { horiz: true, c: TE / 2, t: TE };
      if (o.wall === 'S') return { horiz: true, c: D - TE / 2, t: TE };
      if (o.wall === 'W') return { horiz: false, c: TE / 2, t: TE };
      if (o.wall === 'E') return { horiz: false, c: W - TE / 2, t: TE };
      if (o.h !== undefined) return { horiz: true, c: o.h, t: TI };
      return { horiz: false, c: o.v, t: TI };
    };
    const gap = (wl, a, len) => {
      const pad2 = 0.06;
      return wl.horiz
        ? `<rect x="${X(a)}" y="${Y(wl.c - wl.t / 2 - pad2)}" width="${L(len)}" height="${L(wl.t + 2 * pad2)}" fill="${paper}"/>`
        : `<rect x="${X(wl.c - wl.t / 2 - pad2)}" y="${Y(a)}" width="${L(wl.t + 2 * pad2)}" height="${L(len)}" fill="${paper}"/>`;
    };

    (f.windows || []).forEach(w => {
      const wl = wallLine({ wall: w.side });
      out.push(gap(wl, w.at, w.len));
      const a = w.at, b = w.at + w.len;
      if (wl.horiz) {
        [-wl.t / 2, 0, wl.t / 2].forEach((d, i) => out.push(`<line x1="${X(a)}" y1="${Y(wl.c + d)}" x2="${X(b)}" y2="${Y(wl.c + d)}" stroke="${i === 1 ? glass : ink}" stroke-width="${i === 1 ? 2 : 1.1}"/>`));
        out.push(`<line x1="${X(a)}" y1="${Y(wl.c - wl.t / 2)}" x2="${X(a)}" y2="${Y(wl.c + wl.t / 2)}" stroke="${ink}" stroke-width="1.4"/><line x1="${X(b)}" y1="${Y(wl.c - wl.t / 2)}" x2="${X(b)}" y2="${Y(wl.c + wl.t / 2)}" stroke="${ink}" stroke-width="1.4"/>`);
      } else {
        [-wl.t / 2, 0, wl.t / 2].forEach((d, i) => out.push(`<line x1="${X(wl.c + d)}" y1="${Y(a)}" x2="${X(wl.c + d)}" y2="${Y(b)}" stroke="${i === 1 ? glass : ink}" stroke-width="${i === 1 ? 2 : 1.1}"/>`));
        out.push(`<line x1="${X(wl.c - wl.t / 2)}" y1="${Y(a)}" x2="${X(wl.c + wl.t / 2)}" y2="${Y(a)}" stroke="${ink}" stroke-width="1.4"/><line x1="${X(wl.c - wl.t / 2)}" y1="${Y(b)}" x2="${X(wl.c + wl.t / 2)}" y2="${Y(b)}" stroke="${ink}" stroke-width="1.4"/>`);
      }
    });

    (f.doors || []).forEach(d => {
      const wl = wallLine(d);
      out.push(gap(wl, d.at, d.len));
      const s = d.swing || 1;
      if (d.type === 'bifold') {
        // two zig-zag leaves
        const n = 4, seg = d.len / n, depth = Math.min(1, d.len / 4);
        let pts = [];
        for (let i = 0; i <= n; i++) {
          const along = d.at + i * seg, off = (i % 2) * depth * s;
          pts.push(wl.horiz ? `${X(along)},${Y(wl.c + off)}` : `${X(wl.c + off)},${Y(along)}`);
        }
        out.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${ink}" stroke-width="1.1"/>`);
        return;
      }
      const len = d.len, hx = d.hingeEnd ? d.at + len : d.at, far = d.hingeEnd ? d.at : d.at + len;
      if (wl.horiz) {
        const leafEndY = wl.c + s * len;
        const sweep = (s > 0) !== !!d.hingeEnd ? 0 : 1;
        out.push(`<line x1="${X(hx)}" y1="${Y(wl.c)}" x2="${X(hx)}" y2="${Y(leafEndY)}" stroke="${ink}" stroke-width="1.6"/>`);
        out.push(`<path d="M${X(hx)} ${Y(leafEndY)} A${L(len)} ${L(len)} 0 0 ${sweep} ${X(far)} ${Y(wl.c)}" fill="none" stroke="${soft}" stroke-width="0.9" stroke-dasharray="3 2"/>`);
      } else {
        const leafEndX = wl.c + s * len;
        out.push(`<line x1="${X(wl.c)}" y1="${Y(hx)}" x2="${X(leafEndX)}" y2="${Y(hx)}" stroke="${ink}" stroke-width="1.6"/>`);
        out.push(`<path d="M${X(leafEndX)} ${Y(hx)} A${L(len)} ${L(len)} 0 0 ${s > 0 ? 1 : 0} ${X(wl.c)} ${Y(hx + len)}" fill="none" stroke="${soft}" stroke-width="0.9" stroke-dasharray="3 2"/>`);
      }
      if (d.entry) {
        const lbl = d.upper ? 'ENTRY (OUTSIDE STAIR)' : 'ENTRY';
        if (wl.horiz) {
          out.push(`<text x="${X(d.at + len / 2)}" y="${Y(wl.c > D / 2 ? D + 1.4 : -1.4)}" font-size="10" font-weight="700" fill="${gold}" text-anchor="middle" letter-spacing="1.5">${lbl}</text>`);
        } else {
          const ex = wl.c > W / 2 ? W + 1.1 : -0.9;
          out.push(`<text transform="translate(${X(ex)} ${Y(d.at + len / 2)}) rotate(-90)" font-size="9" font-weight="700" fill="${gold}" text-anchor="middle" letter-spacing="1.2">${lbl}</text>`);
        }
      }
    });

    // fixtures
    const fx = (attrs) => `stroke="${ink}" stroke-width="0.9" fill="#fff" ${attrs || ''}`;
    (f.fixtures || []).forEach(o => {
      switch (o.t) {
        case 'tub': {
          out.push(`<rect x="${X(o.x)}" y="${Y(o.y)}" width="${L(o.w)}" height="${L(o.h)}" rx="3" ${fx()}/>`);
          out.push(`<rect x="${X(o.x + 0.3)}" y="${Y(o.y + 0.3)}" width="${L(o.w - 0.6)}" height="${L(o.h - 0.6)}" rx="${L(0.6)}" fill="#e9f1f7" stroke="${soft}" stroke-width="0.7"/>`);
          const dx = o.vertical ? o.x + o.w / 2 : o.x + o.w - 0.7, dy = o.vertical ? o.y + o.h - 0.7 : o.y + o.h / 2;
          out.push(`<circle cx="${X(dx)}" cy="${Y(dy)}" r="${L(0.12)}" fill="${soft}"/>`);
          break;
        }
        case 'toilet': {
          const rot = { N: 0, E: 90, S: 180, W: 270 }[o.dir || 'N'];
          out.push(`<g transform="translate(${X(o.cx)} ${Y(o.y)}) rotate(${rot})">` +
            `<rect x="${L(-0.8)}" y="0" width="${L(1.6)}" height="${L(0.65)}" rx="2" ${fx()}/>` +
            `<ellipse cx="0" cy="${L(1.55)}" rx="${L(0.62)}" ry="${L(0.9)}" ${fx()}/>` +
            `<ellipse cx="0" cy="${L(1.62)}" rx="${L(0.38)}" ry="${L(0.6)}" fill="#eef4f8" stroke="${soft}" stroke-width="0.6"/></g>`);
          break;
        }
        case 'vanity': {
          out.push(`<rect x="${X(o.x)}" y="${Y(o.y)}" width="${L(o.w)}" height="${L(o.h)}" ${fx()}/>`);
          out.push(`<ellipse cx="${X(o.x + o.w / 2)}" cy="${Y(o.y + o.h / 2)}" rx="${L(o.vertical ? 0.55 : 0.75)}" ry="${L(o.vertical ? 0.75 : 0.55)}" fill="#eef4f8" stroke="${soft}" stroke-width="0.7"/>`);
          break;
        }
        case 'counter':
          out.push(`<rect x="${X(o.x)}" y="${Y(o.y)}" width="${L(o.w)}" height="${L(o.h)}" fill="#efe9da" stroke="${ink}" stroke-width="0.9"/>`);
          break;
        case 'island':
          out.push(`<rect x="${X(o.x)}" y="${Y(o.y)}" width="${L(o.w)}" height="${L(o.h)}" fill="#efe9da" stroke="${ink}" stroke-width="0.9"/>`);
          for (let i = 0; i < Math.floor(o.w / 1.8); i++) out.push(`<circle cx="${X(o.x + 0.9 + i * 1.8)}" cy="${Y(o.y + o.h + 0.75)}" r="${L(0.5)}" ${fx()}/>`);
          break;
        case 'sink':
          out.push(`<rect x="${X(o.cx - 1.4)}" y="${Y(o.cy - 0.7)}" width="${L(1.3)}" height="${L(1.4)}" rx="2" fill="#eef4f8" stroke="${soft}" stroke-width="0.8"/><rect x="${X(o.cx + 0.1)}" y="${Y(o.cy - 0.7)}" width="${L(1.3)}" height="${L(1.4)}" rx="2" fill="#eef4f8" stroke="${soft}" stroke-width="0.8"/>`);
          break;
        case 'range': {
          out.push(`<rect x="${X(o.x)}" y="${Y(o.y)}" width="${L(o.w)}" height="${L(o.h)}" ${fx()}/>`);
          const cx = o.x + o.w / 2, cy = o.y + o.h / 2, dx = o.w / 4, dy = o.h / 4;
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => out.push(`<circle cx="${X(cx + a * dx)}" cy="${Y(cy + b * dy)}" r="${L(Math.min(o.w, o.h) / 6)}" fill="none" stroke="${soft}" stroke-width="0.8"/>`));
          break;
        }
        case 'fridge':
          out.push(`<rect x="${X(o.x)}" y="${Y(o.y)}" width="${L(o.w)}" height="${L(o.h)}" ${fx()}/><text x="${X(o.x + o.w / 2)}" y="${Y(o.y + o.h / 2 + 0.25)}" font-size="8" fill="${soft}" text-anchor="middle">REF</text>`);
          break;
        case 'table': {
          out.push(`<rect x="${X(o.x)}" y="${Y(o.y)}" width="${L(o.w)}" height="${L(o.h)}" rx="2" ${fx()}/>`);
          const n = Math.max(1, Math.round(o.h / 2.4));
          for (let i = 0; i < n; i++) {
            const cy = o.y + (o.h / n) * (i + 0.5);
            out.push(`<rect x="${X(o.x - 1.25)}" y="${Y(cy - 0.6)}" width="${L(1.05)}" height="${L(1.2)}" rx="2" ${fx()}/><rect x="${X(o.x + o.w + 0.2)}" y="${Y(cy - 0.6)}" width="${L(1.05)}" height="${L(1.2)}" rx="2" ${fx()}/>`);
          }
          break;
        }
        case 'roundtable':
          out.push(`<circle cx="${X(o.cx)}" cy="${Y(o.cy)}" r="${L(o.r)}" ${fx()}/>`);
          [0, 90, 180, 270].forEach(a => {
            const r = (a * Math.PI) / 180, px = o.cx + Math.cos(r) * (o.r + 0.75), py = o.cy + Math.sin(r) * (o.r + 0.75);
            out.push(`<rect x="${X(px - 0.55)}" y="${Y(py - 0.55)}" width="${L(1.1)}" height="${L(1.1)}" rx="2" ${fx()}/>`);
          });
          break;
        case 'bed': {
          out.push(`<rect x="${X(o.x)}" y="${Y(o.y)}" width="${L(o.w)}" height="${L(o.h)}" rx="2" ${fx()}/>`);
          const horiz = o.head === 'W' || o.head === 'E';
          if (horiz) {
            const px = o.head === 'W' ? o.x + 0.3 : o.x + o.w - 1.5;
            out.push(`<rect x="${X(px)}" y="${Y(o.y + 0.35)}" width="${L(1.2)}" height="${L(o.h / 2 - 0.5)}" rx="3" fill="#f3efe4" stroke="${soft}" stroke-width="0.7"/><rect x="${X(px)}" y="${Y(o.y + o.h / 2 + 0.15)}" width="${L(1.2)}" height="${L(o.h / 2 - 0.5)}" rx="3" fill="#f3efe4" stroke="${soft}" stroke-width="0.7"/>`);
            const fold = o.head === 'W' ? o.x + 2.3 : o.x + o.w - 2.3;
            out.push(`<line x1="${X(fold)}" y1="${Y(o.y)}" x2="${X(fold)}" y2="${Y(o.y + o.h)}" stroke="${soft}" stroke-width="0.7"/>`);
          } else {
            const py = o.head === 'N' ? o.y + 0.3 : o.y + o.h - 1.5;
            out.push(`<rect x="${X(o.x + 0.35)}" y="${Y(py)}" width="${L(o.w / 2 - 0.5)}" height="${L(1.2)}" rx="3" fill="#f3efe4" stroke="${soft}" stroke-width="0.7"/><rect x="${X(o.x + o.w / 2 + 0.15)}" y="${Y(py)}" width="${L(o.w / 2 - 0.5)}" height="${L(1.2)}" rx="3" fill="#f3efe4" stroke="${soft}" stroke-width="0.7"/>`);
          }
          break;
        }
        case 'nightstand':
        case 'coffee':
        case 'desk':
          out.push(`<rect x="${X(o.x)}" y="${Y(o.y)}" width="${L(o.w)}" height="${L(o.h)}" rx="1.5" ${fx()}/>`);
          break;
        case 'sofa': {
          out.push(`<rect x="${X(o.x)}" y="${Y(o.y)}" width="${L(o.w)}" height="${L(o.h)}" rx="4" ${fx()}/>`);
          const back = 0.8;
          if (o.facing === 'N') out.push(`<rect x="${X(o.x)}" y="${Y(o.y + o.h - back)}" width="${L(o.w)}" height="${L(back)}" rx="3" fill="#ece6d7" stroke="${ink}" stroke-width="0.8"/>`);
          if (o.facing === 'S') out.push(`<rect x="${X(o.x)}" y="${Y(o.y)}" width="${L(o.w)}" height="${L(back)}" rx="3" fill="#ece6d7" stroke="${ink}" stroke-width="0.8"/>`);
          if (o.facing === 'E') out.push(`<rect x="${X(o.x)}" y="${Y(o.y)}" width="${L(back)}" height="${L(o.h)}" rx="3" fill="#ece6d7" stroke="${ink}" stroke-width="0.8"/>`);
          if (o.facing === 'W') out.push(`<rect x="${X(o.x + o.w - back)}" y="${Y(o.y)}" width="${L(back)}" height="${L(o.h)}" rx="3" fill="#ece6d7" stroke="${ink}" stroke-width="0.8"/>`);
          break;
        }
        case 'closet':
          out.push(`<rect x="${X(o.x)}" y="${Y(o.y)}" width="${L(o.w)}" height="${L(o.h)}" fill="none" stroke="${soft}" stroke-width="0.9" stroke-dasharray="4 3"/>`);
          out.push(`<line x1="${X(o.x + 0.3)}" y1="${Y(o.y + o.h / 2)}" x2="${X(o.x + o.w - 0.3)}" y2="${Y(o.y + o.h / 2)}" stroke="${soft}" stroke-width="0.9"/>`);
          out.push(`<text x="${X(o.x + o.w / 2)}" y="${Y(o.y + o.h / 2 - 0.25)}" font-size="7.5" fill="${soft}" text-anchor="middle">CLOSET</text>`);
          break;
        case 'rod':
          out.push(`<line x1="${X(o.x + 0.3)}" y1="${Y(o.y + o.h / 2)}" x2="${X(o.x + o.w - 0.3)}" y2="${Y(o.y + o.h / 2)}" stroke="${soft}" stroke-width="0.9"/>`);
          break;
        case 'wd': {
          out.push(`<rect x="${X(o.x)}" y="${Y(o.y)}" width="${L(o.w)}" height="${L(o.h)}" ${fx()}/>`);
          if (o.pair) {
            out.push(`<line x1="${X(o.x + o.w / 2)}" y1="${Y(o.y)}" x2="${X(o.x + o.w / 2)}" y2="${Y(o.y + o.h)}" stroke="${ink}" stroke-width="0.8"/>`);
            [0.25, 0.75].forEach(k => out.push(`<circle cx="${X(o.x + o.w * k)}" cy="${Y(o.y + o.h / 2)}" r="${L(Math.min(o.h, o.w / 2) * 0.32)}" fill="none" stroke="${soft}" stroke-width="0.8"/>`));
          } else {
            out.push(`<circle cx="${X(o.x + o.w / 2)}" cy="${Y(o.y + o.h / 2)}" r="${L(Math.min(o.w, o.h) * 0.3)}" fill="none" stroke="${soft}" stroke-width="0.8"/><text x="${X(o.x + o.w / 2)}" y="${Y(o.y + o.h / 2 + 0.22)}" font-size="7.5" fill="${soft}" text-anchor="middle">${esc(o.label || 'W/D')}</text>`);
          }
          break;
        }
        case 'stair': {
          out.push(`<rect x="${X(o.x)}" y="${Y(o.y)}" width="${L(o.w)}" height="${L(o.h)}" fill="${o.hole ? '#f1ede3' : '#fff'}" stroke="${ink}" stroke-width="0.9"/>`);
          const n = 15, step = o.h / n;
          for (let i = 1; i < n; i++) out.push(`<line x1="${X(o.x)}" y1="${Y(o.y + i * step)}" x2="${X(o.x + o.w)}" y2="${Y(o.y + i * step)}" stroke="${soft}" stroke-width="0.6"/>`);
          const cx = o.x + o.w / 2;
          out.push(`<line x1="${X(cx)}" y1="${Y(o.y + 0.8)}" x2="${X(cx)}" y2="${Y(o.y + o.h - 1.2)}" stroke="${gold}" stroke-width="1.4"/><path d="M${X(cx - 0.45)} ${Y(o.y + o.h - 1.8)} L${X(cx)} ${Y(o.y + o.h - 0.9)} L${X(cx + 0.45)} ${Y(o.y + o.h - 1.8)}" fill="none" stroke="${gold}" stroke-width="1.4"/>`);
          out.push(`<rect x="${X(cx - 0.9)}" y="${Y(o.y + o.h / 2 - 0.55)}" width="${L(1.8)}" height="${L(1.1)}" fill="#fff"/><text x="${X(cx)}" y="${Y(o.y + o.h / 2 + 0.3)}" font-size="9" font-weight="700" fill="${gold}" text-anchor="middle">${esc(o.label || 'UP')}</text>`);
          break;
        }
      }
    });

    // room labels
    (f.rooms || []).forEach(r => {
      const anchor = r.anchor || 'middle';
      const name = r.name.toUpperCase();
      const dim = r.nodim ? '' : (r.dimText || ftIn(r.w) + ' x ' + ftIn(r.h));
      const fs = r.small ? 8.5 : 11;
      out.push(`<text x="${X(r.lx)}" y="${Y(r.ly)}" font-size="${fs}" font-weight="700" fill="${ink}" text-anchor="${anchor}" letter-spacing="0.8" paint-order="stroke" stroke="#fff" stroke-width="3">${esc(name)}</text>`);
      if (dim) out.push(`<text x="${X(r.lx)}" y="${(parseFloat(Y(r.ly)) + 13).toFixed(1)}" font-size="9.5" fill="${soft}" text-anchor="${anchor}" paint-order="stroke" stroke="#fff" stroke-width="3">${esc(dim)}</text>`);
    });

    (f.unitLabels || []).forEach(u => out.push(`<text x="${X(u.x)}" y="${pad - 9}" font-size="10" font-weight="800" fill="${gold}" text-anchor="middle" letter-spacing="2">${esc(u.text)}</text>`));

    // overall dimensions
    const dimH = (y, a, b, txt) => {
      out.push(`<line x1="${X(a)}" y1="${y}" x2="${X(b)}" y2="${y}" stroke="${soft}" stroke-width="0.8"/>`);
      [a, b].forEach(v => out.push(`<line x1="${(parseFloat(X(v)) - 4).toFixed(1)}" y1="${y + 4}" x2="${(parseFloat(X(v)) + 4).toFixed(1)}" y2="${y - 4}" stroke="${ink}" stroke-width="1.1"/><line x1="${X(v)}" y1="${y - 7}" x2="${X(v)}" y2="${y + 7}" stroke="${soft}" stroke-width="0.6"/>`));
      out.push(`<rect x="${(parseFloat(X((a + b) / 2)) - 24).toFixed(1)}" y="${y - 8}" width="48" height="14" fill="${paper}"/><text x="${X((a + b) / 2)}" y="${y + 3.5}" font-size="10.5" font-weight="600" fill="${ink}" text-anchor="middle">${txt}</text>`);
    };
    const dimV = (x, a, b, txt) => {
      out.push(`<line x1="${x}" y1="${Y(a)}" x2="${x}" y2="${Y(b)}" stroke="${soft}" stroke-width="0.8"/>`);
      [a, b].forEach(v => out.push(`<line x1="${x - 4}" y1="${(parseFloat(Y(v)) + 4).toFixed(1)}" x2="${x + 4}" y2="${(parseFloat(Y(v)) - 4).toFixed(1)}" stroke="${ink}" stroke-width="1.1"/><line x1="${x - 7}" y1="${Y(v)}" x2="${x + 7}" y2="${Y(v)}" stroke="${soft}" stroke-width="0.6"/>`));
      const cy = parseFloat(Y((a + b) / 2));
      out.push(`<rect x="${x - 8}" y="${(cy - 24).toFixed(1)}" width="14" height="48" fill="${paper}"/><text transform="translate(${x + 3.5} ${cy}) rotate(-90)" font-size="10.5" font-weight="600" fill="${ink}" text-anchor="middle">${txt}</text>`);
    };
    dimH(pad - 30, 0, W, ftIn(W));
    dimV(pad - 30, 0, D, ftIn(D));

    // north arrow + scale bar
    const nx = pad + W * S + 30, ny = pad - 34;
    out.push(`<g transform="translate(${nx} ${ny})"><circle r="12" fill="none" stroke="${soft}" stroke-width="0.8"/><path d="M0 -9 L4.5 6 L0 2.5 L-4.5 6 Z" fill="${gold}"/><text y="-15" font-size="8.5" font-weight="700" fill="${gold}" text-anchor="middle">N</text></g>`);
    const sy = pad + D * S + 34, sx = pad;
    out.push(`<g font-size="8.5" fill="${soft}">`);
    for (let i = 0; i < 4; i++) out.push(`<rect x="${sx + i * 2 * S}" y="${sy}" width="${2 * S}" height="5" fill="${i % 2 ? paper : ink}" stroke="${ink}" stroke-width="0.6"/>`);
    out.push(`<text x="${sx}" y="${sy + 17}">0</text><text x="${sx + 4 * S}" y="${sy + 17}" text-anchor="middle">4</text><text x="${sx + 8 * S}" y="${sy + 17}" text-anchor="middle">8 ft</text></g>`);
    out.push(`<text x="${pad + W * S}" y="${sy + 9}" font-size="10" fill="${soft}" text-anchor="end">${esc(plan.name)} · ${esc(f.label)} · ${(W * D).toLocaleString('en-CA')} sq ft footprint</text>`);
    out.push('</svg>');
    return out.join('');
  }

  window.YS_PLANS = PLANS;
  window.YS_renderFloorPlan = renderFloor;
  window.YS_planArea = area;
})();
