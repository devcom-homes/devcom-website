// YardSuite 3D studio: builds a to-scale garden suite from the floor plan data
// (window and door positions come straight from js/floorplans.js) and renders it
// in a backyard scene, or over the homeowner's own photo.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const STOREY = 9;      // ft, floor to floor
const BASE = 0.9;      // ft, foundation showing above grade
const TE = 0.5;        // ft, wall thickness

export const LOOKS = {
  modern:    { label: 'Modern black',      roof: 'shed',  pitch: 0.25, siding: 'board', color: '#1f2023', trim: '#141517', roofMat: 'metal',   roofColor: '#2b2e31', door: '#a86b3d' },
  farmhouse: { label: 'Farmhouse',         roof: 'gable', pitch: 8 / 12, siding: 'board', color: '#eceae4', trim: '#1c1d1f', roofMat: 'metal',   roofColor: '#1c1d1f', door: '#1c1d1f' },
  cottage:   { label: 'Georgian Bay cottage', roof: 'gable', pitch: 6 / 12, siding: 'lap', color: '#8d9a87', trim: '#f2f0ea', roofMat: 'shingle', roofColor: '#4d5156', door: '#C9A84C' },
  cedar:     { label: 'Cedar modern',      roof: 'flat',  pitch: 0,    siding: 'cedar', color: '#a86b3d', trim: '#1c1d1f', roofMat: 'metal',   roofColor: '#2b2c2e', door: '#1c1d1f' }
};
export const SIDING_COLOURS = [
  ['Arctic white', '#eceae4'], ['Greige', '#b9b2a5'], ['Sage', '#8d9a87'], ['Harbour blue', '#4a5d70'],
  ['Charcoal', '#3b3d40'], ['Black', '#1f2023'], ['Natural cedar', '#a86b3d']
];

// ---------- procedural textures (no image downloads) ----------
const texCache = new Map();
function canvasTex(key, draw, size = 512) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  texCache.set(key, t);
  return t;
}
function shade(hex, amt) {
  const c = new THREE.Color(hex); const hsl = {}; c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amt)));
  return '#' + c.getHexString();
}
function rand(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function sidingTexture(kind, color) {
  // one tile = 4 ft x 4 ft (128 px per ft)
  return canvasTex('siding-' + kind + color, (g, n) => {
    const r = rand(7);
    g.fillStyle = color; g.fillRect(0, 0, n, n);
    if (kind === 'board') {
      const step = n / 3;
      for (let i = 0; i < 3; i++) {
        const x = i * step;
        g.fillStyle = shade(color, -0.08); g.fillRect(x + 4, 0, 6, n);
        g.fillStyle = shade(color, 0.05); g.fillRect(x - 10, 0, 14, n);
        g.fillStyle = shade(color, -0.04); g.fillRect(x + 2, 0, 2, n);
      }
    } else if (kind === 'lap') {
      const step = n / 8;
      for (let i = 0; i < 8; i++) {
        const y = i * step;
        const grd = g.createLinearGradient(0, y, 0, y + step);
        grd.addColorStop(0, shade(color, 0.04)); grd.addColorStop(0.85, color); grd.addColorStop(1, shade(color, -0.16));
        g.fillStyle = grd; g.fillRect(0, y, n, step);
      }
    } else if (kind === 'cedar') {
      const step = n / 10;
      for (let i = 0; i < 10; i++) {
        let x = -r() * 200;
        while (x < n) {
          const len = 420 + r() * 520;
          g.fillStyle = shade(color, (r() - 0.5) * 0.08);
          g.fillRect(x, i * step + 1, len - 2, step - 2);
          g.strokeStyle = 'rgba(60,30,10,0.18)'; g.lineWidth = 1;
          for (let k = 0; k < 3; k++) { g.beginPath(); const yy = i * step + 4 + r() * (step - 8); g.moveTo(x, yy); g.bezierCurveTo(x + len * 0.3, yy + 2, x + len * 0.6, yy - 2, x + len, yy); g.stroke(); }
          x += len;
        }
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, i * step + step - 2, n, 2);
      }
    }
    // subtle grime/noise so flat colours don't look plastic
    const img = g.getImageData(0, 0, n, n);
    for (let i = 0; i < img.data.length; i += 4) { const v = (r() - 0.5) * 10; img.data[i] += v; img.data[i + 1] += v; img.data[i + 2] += v; }
    g.putImageData(img, 0, 0);
  });
}
function roofTexture(kind, color) {
  return canvasTex('roof-' + kind + color, (g, n) => {
    const r = rand(11);
    g.fillStyle = color; g.fillRect(0, 0, n, n);
    if (kind === 'metal') {
      const step = n / (4 / 1.5);
      for (let x = 0; x < n + step; x += step) {
        g.fillStyle = shade(color, 0.12); g.fillRect(x, 0, 5, n);
        g.fillStyle = shade(color, -0.08); g.fillRect(x + 5, 0, 3, n);
      }
    } else {
      const rows = 12, h = n / rows;
      for (let i = 0; i < rows; i++) {
        const off = (i % 2) * 40;
        for (let x = -off; x < n; x += 80) {
          g.fillStyle = shade(color, (r() - 0.5) * 0.05);
          g.fillRect(x + 1, i * h + 1, 78, h - 1);
        }
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, i * h + h - 3, n, 3);
      }
    }
  });
}
function grassTexture() {
  return canvasTex('grass', (g, n) => {
    const r = rand(3);
    g.fillStyle = '#5f7f45'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = `hsl(${85 + r() * 25},${30 + r() * 25}%,${26 + r() * 18}%)`;
      g.fillRect(r() * n, r() * n, 2, 3 + r() * 4);
    }
  });
}
function plankTexture(color) {
  return canvasTex('plank' + color, (g, n) => {
    const r = rand(5);
    const step = n / 8;
    for (let i = 0; i < 8; i++) { g.fillStyle = shade(color, (r() - 0.5) * 0.1); g.fillRect(i * step, 0, step - 3, n); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(i * step + step - 3, 0, 3, n); }
  });
}

// ---------- geometry helpers ----------
function texMat(tex, repeatX, repeatY, opts = {}) {
  const t = tex.clone(); t.needsUpdate = true; t.repeat.set(repeatX, repeatY);
  return new THREE.MeshStandardMaterial(Object.assign({ map: t, roughness: 0.85, metalness: 0 }, opts));
}

// A side frame: local x runs along the wall (plan coordinate), y up from floor level, z points outward.
function sideFrame(side, W, D) {
  const m = new THREE.Matrix4();
  const X = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(), O = new THREE.Vector3();
  if (side === 'N') { X.set(1, 0, 0); Z.set(0, 0, -1); O.set(0, BASE, 0); }
  if (side === 'S') { X.set(1, 0, 0); Z.set(0, 0, 1); O.set(0, BASE, D); }
  if (side === 'W') { X.set(0, 0, 1); Z.set(-1, 0, 0); O.set(0, BASE, 0); }
  if (side === 'E') { X.set(0, 0, 1); Z.set(1, 0, 0); O.set(W, BASE, 0); }
  m.makeBasis(X, Y, Z); m.setPosition(O);
  const g = new THREE.Group(); g.matrixAutoUpdate = false; g.matrix.copy(m);
  return g;
}

function box(w, h, d, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = true; m.receiveShadow = true; return m; }

function buildSuite(plan, look) {
  const W = plan.W, D = plan.D, Hw = plan.storeys * STOREY;
  const root = new THREE.Group();
  const sidingTex = sidingTexture(look.siding, look.color);
  const wallMat = texMat(sidingTex, 0.25, 0.25, { roughness: look.siding === 'cedar' ? 0.75 : 0.88 });
  const trimMat = new THREE.MeshStandardMaterial({ color: look.trim, roughness: 0.6 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x1a252d, roughness: 0.04, metalness: 0.1, envMapIntensity: 1.4, clearcoat: 1 });
  const doorMat = new THREE.MeshStandardMaterial({ color: look.door, roughness: 0.55 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0x9c9a95, roughness: 0.95 });
  const deckMat = texMat(plankTexture('#9a6a42'), 1, 1, { roughness: 0.8 });

  // collect openings per side from every floor
  const openings = { N: [], S: [], E: [], W: [] };
  plan.floors.forEach((f, fi) => {
    const v0 = fi * STOREY;
    (f.windows || []).forEach(w => openings[w.side].push({ kind: 'window', a: w.at, b: w.at + w.len, v1: v0 + (w.slider ? 0.15 : 3), v2: v0 + 7.2, slider: !!w.slider }));
    (f.doors || []).filter(d => d.wall).forEach(d => openings[d.wall].push({ kind: 'door', a: d.at, b: d.at + d.len, v1: v0, v2: v0 + 7, entry: d.entry }));
  });

  // foundation
  const fnd = box(W + 0.3, BASE, D + 0.3, concrete); fnd.position.set(W / 2, BASE / 2, D / 2); root.add(fnd);

  ['N', 'S', 'W', 'E'].forEach(side => {
    const along = (side === 'N' || side === 'S') ? W : D;
    const u0 = (side === 'W' || side === 'E') ? TE : 0, u1 = along - u0;
    const shape = new THREE.Shape();
    shape.moveTo(u0, 0); shape.lineTo(u1, 0); shape.lineTo(u1, Hw); shape.lineTo(u0, Hw); shape.closePath();
    openings[side].forEach(o => {
      const h = new THREE.Path();
      h.moveTo(o.a, o.v1); h.lineTo(o.a, o.v2); h.lineTo(o.b, o.v2); h.lineTo(o.b, o.v1); h.closePath();
      shape.holes.push(h);
    });
    const geo = new THREE.ExtrudeGeometry(shape, { depth: TE, bevelEnabled: false });
    const wall = new THREE.Mesh(geo, wallMat); wall.position.z = -TE; wall.castShadow = true; wall.receiveShadow = true;
    const fr = sideFrame(side, W, D); fr.add(wall);

    openings[side].forEach(o => {
      const w = o.b - o.a, h = o.v2 - o.v1, cx = (o.a + o.b) / 2, cy = (o.v1 + o.v2) / 2, t = 0.32;
      // trim surround
      [[cx, o.v2 + t / 2, w + 2 * t, t], [cx, o.v1 - t / 2, w + 2 * t, t]].forEach(([x, y, bw, bh]) => { if (o.kind === 'door' && y < o.v1) return; const b = box(bw, bh, 0.28, trimMat); b.position.set(x, y, 0.06); fr.add(b); });
      [o.a - t / 2, o.b + t / 2].forEach(x => { const b = box(t, h, 0.28, trimMat); b.position.set(x, cy, 0.06); fr.add(b); });
      if (o.kind === 'window') {
        const gl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassMat); gl.position.set(cx, cy, -TE * 0.45); fr.add(gl);
        const frameMat = trimMat;
        const n = Math.max(1, Math.round(w / 3));
        for (let i = 1; i < n; i++) { const m = box(0.14, h, 0.12, frameMat); m.position.set(o.a + (w / n) * i, cy, -TE * 0.42); fr.add(m); }
        if (!o.slider) { const sill = box(w + 0.9, 0.16, 0.5, trimMat); sill.position.set(cx, o.v1 - t - 0.08, 0.16); fr.add(sill); }
        // reveal (inside of the opening)
        const rev = new THREE.MeshStandardMaterial({ color: 0xd9d4c8, roughness: 0.9 });
        [[cx, o.v2, w, 0.02], [cx, o.v1, w, 0.02]].forEach(([x, y, bw]) => { const b = box(bw, 0.02, TE * 0.45, rev); b.position.set(x, y, -TE * 0.22); fr.add(b); });
      } else {
        const slab = box(w - 0.1, h - 0.05, 0.16, doorMat); slab.position.set(cx, cy, -TE * 0.5); fr.add(slab);
        const lite = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.28, h * 0.72), glassMat); lite.position.set(cx - w * 0.18, cy + 0.2, -TE * 0.5 + 0.09); fr.add(lite);
        const handle = box(0.08, 0.9, 0.14, new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.3 })); handle.position.set(cx + w * 0.32, cy, -TE * 0.5 + 0.15); fr.add(handle);
        const light = box(0.4, 0.7, 0.3, trimMat); light.position.set(o.b + 0.9, 6.3, 0.15); fr.add(light);
        const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.4, 0.05), new THREE.MeshStandardMaterial({ color: 0xffe3a8, emissive: 0xffc36a, emissiveIntensity: 0.6 })); bulb.position.set(o.b + 0.9, 6.3, 0.31); fr.add(bulb);
        if (o.entry && o.v1 > 0.5) {
          // upper unit: landing and an outside stair running along the wall
          const lw = Math.max(5.5, w + 2), ld = 4.5, top = o.v1;
          const land = box(lw, 0.35, ld, deckMat); land.position.set(cx, top - 0.18, ld / 2); fr.add(land);
          const rise = top + BASE, n = Math.ceil(rise / 0.62), r = rise / n, run = 0.85, sw = 3.4;
          const startU = cx - lw / 2;
          for (let i = 1; i <= n; i++) {
            const st = box(run + 0.05, 0.16, sw, deckMat);
            st.position.set(startU - i * run + run / 2, top - i * r - 0.08, ld - sw / 2); fr.add(st);
          }
          const len = n * run, ang = Math.atan2(rise, len);
          [ld - sw, ld].forEach(zz => { const s2 = box(Math.hypot(len, rise), 0.7, 0.18, trimMat); s2.position.set(startU - len / 2, top - rise / 2 - 0.2, zz); s2.rotation.z = ang; fr.add(s2); });
          const rail = box(Math.hypot(len, rise), 0.12, 0.12, trimMat); rail.position.set(startU - len / 2, top - rise / 2 + 3, ld); rail.rotation.z = ang; fr.add(rail);
          [[cx - lw / 2, ld], [cx + lw / 2, ld], [cx + lw / 2, 0.3]].forEach(([u, zz]) => { const pst = box(0.3, 3.2 + top + BASE, 0.3, trimMat); pst.position.set(u, (top + 3.2 - BASE) / 2 - BASE / 2 + 0.2, zz); fr.add(pst); });
          const lr = box(lw, 0.12, 0.12, trimMat); lr.position.set(cx, top + 3, ld); fr.add(lr);
        } else if (o.entry) {
          // deck and step at the entry
          const dw = Math.max(8, w + 5), dd = 5.5;
          const deck = box(dw, 0.3, dd, deckMat); deck.position.set(cx, -0.15, dd / 2); fr.add(deck);
          const posts = box(dw, BASE - 0.3, dd, concrete); posts.position.set(cx, -0.3 - (BASE - 0.3) / 2, dd / 2); fr.add(posts);
          const step = box(4, 0.3, 1.3, deckMat); step.position.set(cx, -BASE / 2 - 0.15, dd + 0.65); fr.add(step);
          for (let i = 0; i < 4; i++) { const st = box(1.6, 0.12, 1.3, concrete); st.position.set(cx + (i % 2 ? 0.5 : -0.4), -BASE + 0.06, dd + 3 + i * 2.6); fr.add(st); }
        }
      }
    });
    root.add(fr);
  });

  // corner boards
  [[0, 0], [W, 0], [0, D], [W, D]].forEach(([x, z]) => {
    const c = box(0.55, Hw, 0.55, trimMat); c.position.set(x + (x ? -0.2 : 0.2), BASE + Hw / 2, z + (z ? -0.2 : 0.2)); root.add(c);
  });
  // floor band between storeys
  if (plan.storeys > 1) {
    const band = box(W + 0.25, 0.45, D + 0.25, trimMat); band.position.set(W / 2, BASE + STOREY, D / 2); root.add(band);
  }

  // roof
  const roofTex = roofTexture(look.roofMat, look.roofColor);
  const top = BASE + Hw, oh = 1.2;
  const fascia = new THREE.MeshStandardMaterial({ color: look.trim, roughness: 0.6 });
  if (look.roof === 'flat') {
    const slab = box(W + 1.4, 1.1, D + 1.4, [fascia, fascia, texMat(roofTex, (W + 1.4) / 4, (D + 1.4) / 4, { roughness: 0.7, metalness: 0.2 }), fascia, fascia, fascia]);
    slab.position.set(W / 2, top + 0.55, D / 2); root.add(slab);
  } else if (look.roof === 'shed') {
    const rise = D * look.pitch, slope = Math.hypot(D + 2 * oh, rise + 2 * oh * look.pitch), ang = Math.atan2(rise, D);
    const mat = [fascia, fascia, texMat(roofTex, (W + 2 * oh) / 4, slope / 4, { roughness: 0.55, metalness: 0.35 }), fascia, fascia, fascia];
    const slab = box(W + 2 * oh, 0.5, slope, mat);
    slab.rotation.x = -ang; slab.position.set(W / 2, top + rise / 2 + 0.3, D / 2); root.add(slab);
    // side infill triangles (E and W) using siding
    ['W', 'E'].forEach(side => {
      const s = new THREE.Shape(); s.moveTo(TE * 0, 0); s.lineTo(D, 0); s.lineTo(D, rise); s.closePath();
      const tri = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: TE, bevelEnabled: false }), wallMat); tri.position.set(0, Hw, -TE); tri.castShadow = true;
      const fr = sideFrame(side, W, D); fr.add(tri); root.add(fr);
    });
    // high wall on the south also needs fill
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(W, 0); s.lineTo(W, rise); s.lineTo(0, rise); s.closePath();
    const hi = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: TE, bevelEnabled: false }), wallMat); hi.position.set(0, Hw, -TE);
    const frS = sideFrame('S', W, D); frS.add(hi); root.add(frS);
    // clerestory windows on the high wall
    const glassMat2 = glassMat, n = Math.floor(W / 6);
    for (let i = 0; i < n; i++) {
      const cw = 3.6, cx = (W / n) * (i + 0.5), ch = Math.max(0.8, rise - 1.2);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch), glassMat2); gl.position.set(cx, Hw + rise / 2 - 0.1, 0.03); frS.add(gl);
      const tb = box(cw + 0.3, ch + 0.3, 0.05, trimMat); tb.position.set(cx, Hw + rise / 2 - 0.1, 0.0); frS.add(tb);
    }
  } else {
    // gable: ridge along the longer side
    const ridgeX = W >= D, Lr = ridgeX ? W : D, Sp = ridgeX ? D : W, rise = (Sp / 2) * look.pitch;
    const ang = Math.atan2(rise, Sp / 2), slope = (Sp / 2 + oh) / Math.cos(ang);
    const g = new THREE.Group();
    const mk = () => [fascia, fascia, texMat(roofTex, (Lr + 2 * oh) / 4, slope / 4, { roughness: look.roofMat === 'metal' ? 0.5 : 0.9, metalness: look.roofMat === 'metal' ? 0.35 : 0 }), fascia, fascia, fascia];
    [-1, 1].forEach(sgn => {
      const slab = box(Lr + 2 * oh, 0.45, slope, mk());
      slab.rotation.x = sgn * ang;
      const run = (Sp / 2 + oh) / 2;
      slab.position.set(0, top + rise - Math.tan(ang) * run + 0.25, sgn * run);
      g.add(slab);
    });
    const ridge = box(Lr + 2 * oh, 0.35, 0.6, fascia); ridge.position.set(0, top + rise + 0.35, 0); g.add(ridge);
    // gable end triangles
    [-1, 1].forEach(sgn => {
      const s = new THREE.Shape(); s.moveTo(-Sp / 2, 0); s.lineTo(Sp / 2, 0); s.lineTo(0, rise); s.closePath();
      const tri = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: TE, bevelEnabled: false }), wallMat);
      tri.castShadow = true;
      tri.rotation.y = Math.PI / 2;
      tri.position.set(sgn * (Lr / 2) - (sgn > 0 ? TE : 0), top, 0);
      g.add(tri);
      // gable vent
      const v = box(0.2, 1.4, 1.4, trimMat); v.position.set(sgn * (Lr / 2 + 0.05), top + rise * 0.45, 0); v.rotation.x = Math.PI / 4; g.add(v);
    });
    if (ridgeX) g.position.set(W / 2, 0, D / 2); else { g.rotation.y = Math.PI / 2; g.position.set(W / 2, 0, D / 2); }
    root.add(g);
  }

  root.position.set(-W / 2, 0, -D / 2);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  root.userData.height = top + (look.roof === 'gable' ? ((W >= D ? D : W) / 2) * look.pitch : look.roof === 'shed' ? D * look.pitch : 1);
  return root;
}

function buildYard(plan) {
  const g = new THREE.Group();
  const grass = grassTexture().clone(); grass.needsUpdate = true; grass.repeat.set(30, 30);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(160, 64), new THREE.MeshStandardMaterial({ map: grass, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);
  // back and side fence
  const fenceMat = texMat(plankTexture('#8a6a4c'), 1, 1, { roughness: 0.9 });
  const back = -plan.D / 2 - 10, half = Math.max(plan.W, plan.D) / 2 + 22;
  const fb = box(half * 2, 6, 0.3, fenceMat); fb.material.map.repeat.set(half * 2 / 4, 1.5); fb.position.set(0, 3, back); g.add(fb);
  [-1, 1].forEach(s => { const f = box(0.3, 6, 40, fenceMat.clone()); f.material.map = fenceMat.map.clone(); f.material.map.repeat.set(10, 1.5); f.material.map.needsUpdate = true; f.position.set(s * half, 3, back + 20); g.add(f); });
  // trees
  const leaf = new THREE.MeshStandardMaterial({ color: 0x3f5f36, roughness: 0.9, flatShading: true });
  const leaf2 = new THREE.MeshStandardMaterial({ color: 0x4f7040, roughness: 0.9, flatShading: true });
  const trunk = new THREE.MeshStandardMaterial({ color: 0x5b4636, roughness: 1 });
  [[-half + 6, back + 6, 1.3, leaf], [half - 5, back + 4, 1.0, leaf2], [-half - 2, back + 18, 0.9, leaf2], [half + 5, back + 15, 1.15, leaf]].forEach(([x, z, s, m]) => {
    const t = new THREE.Group();
    const tr = box(0.9 * s, 7 * s, 0.9 * s, trunk); tr.position.y = 3.5 * s; t.add(tr);
    const c1 = new THREE.Mesh(new THREE.IcosahedronGeometry(5.5 * s, 1), m); c1.position.y = 10 * s; c1.castShadow = true; t.add(c1);
    const c2 = new THREE.Mesh(new THREE.IcosahedronGeometry(3.8 * s, 1), m); c2.position.set(2 * s, 13 * s, 1 * s); c2.castShadow = true; t.add(c2);
    t.position.set(x, 0, z); g.add(t);
  });
  // shrubs along the suite
  const shrub = new THREE.MeshStandardMaterial({ color: 0x47663b, roughness: 1, flatShading: true });
  for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + (i % 2) * 0.4, 0), shrub); s.position.set(-plan.W / 2 + 2 + i * (plan.W - 4) / 4, 0.9, -plan.D / 2 - 1.6); s.castShadow = true; g.add(s); }
  return g;
}

// ---------- the viewer ----------
class Studio {
  constructor(el) {
    this.el = el;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none';

    this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.sky = new THREE.Color(0xcfdfe9);
    this.scene.background = this.sky;
    this.scene.fog = new THREE.Fog(0xcfdfe9, 140, 320);

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.5, 1000);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minDistance = 20; this.controls.maxDistance = 160;
    this.controls.autoRotate = true; this.controls.autoRotateSpeed = 0.6;
    this.controls.addEventListener('start', () => { this.controls.autoRotate = false; this.userMoved = true; });

    this.scene.add(new THREE.HemisphereLight(0xdfeeff, 0x4d5a3a, 0.9));
    const sun = new THREE.DirectionalLight(0xfff2dc, 2.4);
    sun.position.set(-40, 60, 45); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60; sc.near = 10; sc.far = 200;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    this.scene.add(sun);

    this.shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.ShadowMaterial({ opacity: 0.35 }));
    this.shadowCatcher.rotation.x = -Math.PI / 2; this.shadowCatcher.receiveShadow = true; this.shadowCatcher.visible = false;
    this.scene.add(this.shadowCatcher);

    this.photo = null; this.adjust = { scale: 1, x: 0, y: 0 };
    this.visible = true; this.running = false;
    const ro = new ResizeObserver(() => this.resize()); ro.observe(el);
    const io = new IntersectionObserver(es => { this.visible = es[0].isIntersecting; if (this.visible) this.loop(); }, { threshold: 0.01 });
    io.observe(el);
    this.resize();
  }
  resize() {
    const w = this.el.clientWidth || 600, h = this.el.clientHeight || 400;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    if (!this.userMoved && !this.photo) this.frame();
    this.applyAdjust();
    this.render();
  }
  setDesign(plan, look) {
    if (this.model) { this.scene.remove(this.model); this.model.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    if (this.yard) this.scene.remove(this.yard);
    this.plan = plan; this.look = look;
    this.model = buildSuite(plan, look); this.scene.add(this.model);
    this.yard = buildYard(plan); this.yard.visible = !this.photo; this.scene.add(this.yard);
    const size = Math.max(plan.W, plan.D, this.model.userData.height * 1.2);
    if (!this.userMoved || this.lastSize !== size) { this.lastSize = size; this.frame(); }
    this.controls.update();
    this.render();
  }
  frame() {
    if (!this.model) return;
    const size = this.lastSize, k = this.camera.aspect < 1.25 ? Math.pow(1.4 / this.camera.aspect, 0.85) : 1;
    this.camera.position.set(size * 1.25 * k, size * 0.62 * k, size * 1.75 * k);
    this.controls.target.set(0, this.model.userData.height * 0.42, 0);
    this.controls.update();
  }
  setPhoto(url) {
    this.photo = url || null;
    this.el.style.backgroundImage = url ? `url("${url}")` : '';
    this.el.style.backgroundSize = 'cover'; this.el.style.backgroundPosition = 'center';
    this.scene.background = url ? null : this.sky;
    this.scene.fog = url ? null : new THREE.Fog(0xcfdfe9, 140, 320);
    if (this.yard) this.yard.visible = !url;
    this.shadowCatcher.visible = !!url;
    if (url) { this.controls.autoRotate = false; this.camera.position.set(this.lastSize * 0.35, this.lastSize * 0.32, this.lastSize * 2.0); this.controls.update(); }
    this.adjust = { scale: 1, x: 0, y: 0 }; this.applyAdjust();
    this.render();
  }
  setAdjust(a) { Object.assign(this.adjust, a); this.applyAdjust(); this.render(); }
  applyAdjust() {
    const w = this.el.clientWidth || 600, h = this.el.clientHeight || 400;
    if (!this.photo) { this.camera.clearViewOffset(); this.camera.zoom = 1; this.camera.updateProjectionMatrix(); return; }
    this.camera.zoom = this.adjust.scale;
    this.camera.setViewOffset(w, h, -this.adjust.x * w * 0.5, -this.adjust.y * h * 0.5, w, h);
    this.camera.updateProjectionMatrix();
  }
  render() { this.renderer.render(this.scene, this.camera); }
  loop() {
    if (this.running) return; this.running = true;
    const tick = () => {
      if (!this.visible || document.hidden) { this.running = false; return; }
      this.controls.update(); this.render();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  async snapshot() {
    this.render();
    const src = this.renderer.domElement, c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const g = c.getContext('2d');
    if (this.photo) {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = this.photo; });
      const s = Math.max(c.width / img.width, c.height / img.height);
      g.drawImage(img, (c.width - img.width * s) / 2, (c.height - img.height * s) / 2, img.width * s, img.height * s);
    }
    g.drawImage(src, 0, 0);
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, c.height - 34, c.width, 34);
    g.fillStyle = '#fff'; g.font = `${Math.round(13 * (c.width / 900 + 0.5))}px Inter, Arial, sans-serif`;
    g.fillText(`${this.plan.name} · ${this.plan.W}' x ${this.plan.D}' · YardSuite concept, not to be used for construction`, 14, c.height - 12);
    return c.toDataURL('image/jpeg', 0.92);
  }
}

window.YS3D = {
  LOOKS, SIDING_COLOURS,
  mount(el) { const s = new Studio(el); window.YS3D.instance = s; return s; }
};
window.dispatchEvent(new Event('ys3d-ready'));
