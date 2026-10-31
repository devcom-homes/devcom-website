/* YardSuite design studio controller.
   Step 1: address and lot facts -> what the town allows (js/aru-rules.js)
   Step 2: suite type, Step 3: layout and size (js/plan-engine.js)
   Step 4: 3D model, floor plan, on my lot, on my photo. Oversize designs are allowed and
   flagged as needing a minor variance (size, height, setbacks) or rezoning (unit count). */
(function () {
  'use strict';
  const E = () => window.YS_ENGINE, R = () => window.YS_RULES;
  const LOOKS = {
    modern:    { label: 'Modern black', roof: 'shed', pitch: 0.25, siding: 'board', color: '#1f2023', trim: '#1c1d1f', roofMat: 'metal', roofColor: '#2b2e31', door: '#a86b3d' },
    farmhouse: { label: 'Farmhouse', roof: 'gable', pitch: 8 / 12, siding: 'board', color: '#eceae4', trim: '#1c1d1f', roofMat: 'metal', roofColor: '#1c1d1f', door: '#1c1d1f' },
    cottage:   { label: 'Bay cottage', roof: 'gable', pitch: 6 / 12, siding: 'lap', color: '#8d9a87', trim: '#f2f0ea', roofMat: 'shingle', roofColor: '#4d5156', door: '#C9A84C' },
    cedar:     { label: 'Cedar modern', roof: 'flat', pitch: 0, siding: 'cedar', color: '#a86b3d', trim: '#1c1d1f', roofMat: 'metal', roofColor: '#2b2c2e', door: '#1c1d1f' }
  };
  const COLOURS = [['Arctic white', '#eceae4'], ['Greige', '#b9b2a5'], ['Sage', '#8d9a87'], ['Harbour blue', '#4a5d70'], ['Charcoal', '#3b3d40'], ['Black', '#1f2023'], ['Natural cedar', 'cedar']];
  const ROOF_PITCH = { gable: 7 / 12, shed: 0.25, flat: 0 };
  const COST = [250, 300]; // $ per sq ft of finished floor area, DevCom rough range

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Math.round(n).toLocaleString('en-CA');
  const store = {
    get() { try { return JSON.parse(localStorage.getItem('yardsuite_design2') || 'null'); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem('yardsuite_design2', JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };
  const saved = store.get() || {};
  const S = {
    town: saved.town || 'collingwood',
    lot: Object.assign({ frontage: null, depth: null, gisSqft: null, houseHeightM: 8.5, houseGfaSqft: null, existingSqft: 0, existingArus: 0 }, saved.lot || {}),
    type: saved.type || 'single', layout: saved.layout || 'onebed', W: saved.W || null, D: saved.D || null,
    preset: LOOKS[saved.preset] ? saved.preset : 'farmhouse',
    look: Object.assign({}, LOOKS[LOOKS[saved.preset] ? saved.preset : 'farmhouse'], saved.look || {}),
    view: '3d', floor: 0, photo: null, studio: null, loading3d: null, mapReady: false, p: null, lotFit: null, address: saved.address || ''
  };
  const persist = () => store.set({ town: S.town, lot: S.lot, type: S.type, layout: S.layout, W: S.W, D: S.D, preset: S.preset, look: S.look, address: S.address });

  function lotSqft() {
    if (S.lot.gisSqft) return S.lot.gisSqft;
    if (S.lot.frontage > 0 && S.lot.depth > 0) return S.lot.frontage * S.lot.depth;
    return null;
  }
  function lotInput() { return { lotSqft: lotSqft(), houseHeightM: +S.lot.houseHeightM || null, houseGfaSqft: +S.lot.houseGfaSqft || null, existingSqft: +S.lot.existingSqft || 0, existingArus: +S.lot.existingArus || 0 }; }
  function colourName() { if (S.look.siding === 'cedar') return 'Natural cedar'; const c = COLOURS.find(x => x[1] === S.look.color); return c ? c[0] : ''; }

  // ---------- step 1: lot + rules ----------
  function renderRules() {
    const a = R().allowance(S.town, lotInput()), r = a.rules;
    $('rules-town').textContent = r.name;
    const li = (t) => `<li class="flex gap-2"><span class="text-gold" aria-hidden="true">•</span><span>${t}</span></li>`;
    const L = [];
    L.push(li(`Up to <b>${r.unitsPerBuilding}</b> suite${r.unitsPerBuilding > 1 ? 's' : ''} in a backyard building, <b>${r.maxUnitsLot}</b> homes on the lot in total`));
    if (r.heightM) L.push(li(`Height up to <b>${r.heightM} m</b>${r.heightLesserOfHouse ? ' or your house height, if lower' : ''}${r.flatHeightM ? ` (${r.flatHeightM} m with a flat roof)` : ''}${r.maxStoreys ? `, ${r.maxStoreys} storey` : ''}`));
    if (r.gfaRule === 'greater') L.push(li(`Floor area up to <b>${r.gfaM2} m²</b> or half your house, whichever is greater`));
    else if (r.gfaRule === 'pct') L.push(li(`Floor area up to <b>${r.gfaPctHouse}%</b> of your house`));
    else if (r.gfaRule === 'cap') L.push(li(`Floor area up to <b>${r.gfaM2} m²</b> (${fmt(R().sqft(r.gfaM2))} sq ft)`));
    else if (S.town !== 'other') L.push(li('<b>No size cap</b> on the suite itself'));
    if (r.coverage) L.push(li(r.coverage.note));
    if (r.maxDimM) L.push(li(`No side longer than <b>${r.maxDimM} m</b>`));
    L.push(li('Setbacks: ' + r.setbacks.text));
    L.push(li('Parking: ' + r.parking));
    r.extra.forEach(x => L.push(li(x)));
    $('rules-list').innerHTML = L.join('');
    const cap = $('rules-cap');
    const parts = [];
    if (a.maxFootprintSqft !== null) parts.push(`up to <b>${fmt(a.maxFootprintSqft)} sq ft</b> of footprint`);
    if (a.maxFloorSqft) parts.push(`up to <b>${fmt(a.maxFloorSqft)} sq ft</b> of floor area`);
    if (a.heightM) parts.push(`up to <b>${a.heightM.toFixed(1)} m</b> tall`);
    parts.push(`<b>${a.units}</b> suite${a.units === 1 ? '' : 's'} in the building`);
    const ls = lotSqft();
    cap.innerHTML = (ls ? `Your ${fmt(ls)} sq ft lot: ` : 'Your lot: ') + parts.join(', ') + '.' + (a.units === 0 ? ' <span class="text-amber-300">You already have the most extra units allowed.</span>' : '');
    cap.classList.remove('hidden');
    $('rules-src').innerHTML = `Based on ${r.asOf}. ${r.confidence !== 'high' ? 'Some details still need the Town to confirm. ' : ''}Always confirm with ${r.contact} before you build. Sources: ` +
      r.sources.map(s => `<a href="${s.u}" target="_blank" rel="noopener" class="underline hover:text-white/70">${s.t}</a>`).join('; ') + '. ' + R().PROVINCIAL;
    $('ys-lotarea').textContent = S.lot.gisSqft ? `Lot area from the Town map: ${fmt(S.lot.gisSqft)} sq ft` : (ls ? `Lot area: ${fmt(ls)} sq ft` : 'Enter frontage and depth, or check your address above.');
  }
  function fillLotInputs() {
    const sel = $('ys-town');
    sel.innerHTML = R().townOptions().map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
    sel.value = S.town;
    $('ys-frontage').value = S.lot.frontage || ''; $('ys-depth').value = S.lot.depth || '';
    $('ys-house').value = String(S.lot.houseHeightM || 8.5); $('ys-housegfa').value = S.lot.houseGfaSqft || '';
    $('ys-existing').value = S.lot.existingSqft || ''; $('ys-arus').value = String(S.lot.existingArus || 0);
    $('ys-address').value = S.address || '';
  }
  function wireLot() {
    const num = (id) => { const v = parseFloat($(id).value); return isNaN(v) ? null : v; };
    $('ys-town').addEventListener('change', e => { S.town = e.target.value; update(); });
    ['ys-frontage', 'ys-depth'].forEach(id => $(id).addEventListener('input', () => { S.lot.frontage = num('ys-frontage'); S.lot.depth = num('ys-depth'); S.lot.gisSqft = null; update(); }));
    $('ys-house').addEventListener('change', e => { S.lot.houseHeightM = +e.target.value; update(); });
    $('ys-housegfa').addEventListener('input', () => { S.lot.houseGfaSqft = num('ys-housegfa'); update(); });
    $('ys-existing').addEventListener('input', () => { S.lot.existingSqft = num('ys-existing') || 0; update(); });
    $('ys-arus').addEventListener('change', e => { S.lot.existingArus = +e.target.value; update(); });
    $('addr-form').addEventListener('submit', e => { e.preventDefault(); locate(); });
  }

  // ---------- step 2 + 3: type, layout, size ----------
  function statusFor(type, layout, W, D) {
    const p = E().build(type, layout, W, D);
    return R().check(S.town, lotInput(), p, S.look, E().heightM(p, S.look), null).status;
  }
  const BADGE = { fits: ['Fits the rules', 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'], variance: ['Needs a minor variance', 'text-amber-300 bg-amber-500/10 border-amber-500/30'], rezoning: ['Needs a rezoning', 'text-red-300 bg-red-500/10 border-red-500/30'] };
  function renderTypes() {
    const T = E().TYPES;
    $('type-picker').innerHTML = Object.keys(T).map(k => {
      const t = T[k], lay = t.layouts[0], rng = E().sizeRange(k, lay), st = statusFor(k, lay, rng.minW, rng.minD), b = BADGE[st];
      return `<button class="plan-card" role="radio" data-type="${k}" aria-checked="${k === S.type}">
        ${typeIcon(k)}
        <div class="font-bold text-white text-sm">${t.label}</div>
        <div class="text-white/55 text-[11px] mt-0.5">${t.blurb}</div>
        <div class="inline-block mt-2 text-[10px] font-semibold border rounded-full px-2 py-0.5 ${b[1]}">${b[0]}</div></button>`;
    }).join('');
    document.querySelectorAll('#type-picker .plan-card').forEach(b => b.classList.toggle('active', b.dataset.type === S.type));
  }
  function typeIcon(k) {
    const g = '#C9A84C';
    const shapes = {
      single: `<rect x="30" y="22" width="50" height="34" fill="none" stroke="${g}" stroke-width="2.4"/><path d="M26 24 L55 8 L84 24" fill="none" stroke="${g}" stroke-width="2.4"/>`,
      loft: `<rect x="35" y="14" width="40" height="44" fill="none" stroke="${g}" stroke-width="2.4"/><line x1="35" y1="36" x2="75" y2="36" stroke="${g}" stroke-width="1.6"/><path d="M31 16 L55 4 L79 16" fill="none" stroke="${g}" stroke-width="2.4"/>`,
      side: `<rect x="15" y="24" width="80" height="32" fill="none" stroke="${g}" stroke-width="2.4"/><line x1="55" y1="24" x2="55" y2="56" stroke="${g}" stroke-width="2.4"/><path d="M11 26 L55 10 L99 26" fill="none" stroke="${g}" stroke-width="2.4"/>`,
      stacked: `<rect x="32" y="14" width="46" height="44" fill="none" stroke="${g}" stroke-width="2.4"/><line x1="32" y1="36" x2="78" y2="36" stroke="${g}" stroke-width="2.4"/><path d="M32 36 L18 58" stroke="${g}" stroke-width="1.8"/><path d="M28 16 L55 4 L82 16" fill="none" stroke="${g}" stroke-width="2.4"/>`
    };
    return `<svg viewBox="0 0 110 64" aria-hidden="true">${shapes[k]}</svg>`;
  }
  function renderLayouts() {
    const T = E().TYPES[S.type];
    if (!T.layouts.includes(S.layout)) S.layout = T.layouts[0];
    $('layout-picker').innerHTML = T.layouts.map(l => `<button class="chip ${l === S.layout ? 'active' : ''}" data-layout="${l}">${E().LAYOUT_LABEL[l]}</button>`).join('');
    const rng = E().sizeRange(S.type, S.layout);
    const w = $('sz-w'), d = $('sz-d');
    w.min = rng.minW; w.max = rng.maxW; d.min = rng.minD; d.max = rng.maxD;
    if (!S.W || S.W < rng.minW || S.W > rng.maxW) S.W = rng.minW;
    if (!S.D || S.D < rng.minD || S.D > rng.maxD) S.D = rng.minD;
    w.value = S.W; d.value = S.D;
  }
  function wireSize() {
    $('type-picker').addEventListener('click', e => { const b = e.target.closest('[data-type]'); if (!b) return; S.type = b.dataset.type; S.W = S.D = null; update(); });
    $('layout-picker').addEventListener('click', e => { const b = e.target.closest('[data-layout]'); if (!b) return; S.layout = b.dataset.layout; S.W = S.D = null; update(); });
    let t = null;
    const onSize = () => { S.W = +$('sz-w').value; S.D = +$('sz-d').value; clearTimeout(t); renderMetrics(); t = setTimeout(update, 120); };
    $('sz-w').addEventListener('input', onSize); $('sz-d').addEventListener('input', onSize);
  }
  function renderMetrics() {
    const unitW = S.W, unitD = S.D;
    const p = S.p = E().build(S.type, S.layout, unitW, unitD);
    $('sz-w-val').textContent = `${p.W}'${S.type === 'side' ? ` (2 x ${unitW}')` : ''}`;
    $('sz-d-val').textContent = `${p.D}'`;
    const foot = E().footprint(p), area = E().floorArea(p), h = E().heightM(p, S.look);
    $('m-foot').textContent = `${fmt(foot)} sq ft (${p.W}' x ${p.D}')`;
    $('m-area').textContent = `${fmt(area)} sq ft${p.units > 1 ? `, ${p.units} units` : ''}`;
    $('m-height').textContent = `${h.toFixed(1)} m (${Math.round(h * 3.281)} ft)`;
    $('m-cost').textContent = `$${fmt(area * COST[0] / 1000)}k to $${fmt(area * COST[1] / 1000)}k`;
    renderFit();
  }
  function renderFit() {
    if (!S.p) return;
    const lotFit = S.mapReady ? window.YSMap.lastReport() : null;
    const res = R().check(S.town, lotInput(), S.p, S.look, E().heightM(S.p, S.look), lotFit);
    S.fit = res;
    const el = $('fit-status');
    const head = res.status === 'fits' ? `<div class="font-semibold text-emerald-300">Fits ${res.rules.name}'s rules we can check</div>`
      : res.status === 'variance' ? `<div class="font-semibold text-amber-300">Needs a minor variance</div><div class="text-white/70 text-xs mt-0.5">That's OK. DevCom handles Committee of Adjustment applications as part of the project.</div>`
      : `<div class="font-semibold text-red-300">Needs a rezoning for the number of units</div><div class="text-white/70 text-xs mt-0.5">More suites than ${res.rules.name} allows in one building. Possible, but it's a longer approval. Ask us about it.</div>`;
    const rows = res.items.map(i => `<li class="flex gap-2"><span aria-hidden="true">${i.ok === true ? '✅' : i.ok === false ? '⚠️' : '•'}</span><span><b>${i.label}:</b> ${i.detail}</span></li>`).join('');
    el.className = 'mt-3 rounded-xl p-3 text-sm border ' + (res.status === 'fits' ? 'border-emerald-500/30 bg-emerald-500/5' : res.status === 'variance' ? 'border-amber-500/30 bg-amber-500/5' : 'border-red-500/30 bg-red-500/5');
    const hFail = res.items.some(i => i.label === 'Height' && i.ok === false) && S.look.roof !== 'flat';
    const tip = hFail ? '<div class="text-xs text-white/70 mt-2">Tip: a flat or shed roof brings the height down.</div>' : '';
    el.innerHTML = head + `<ul class="mt-2 space-y-1 text-xs text-white/80">${rows}</ul>` + tip;
  }

  // ---------- look controls ----------
  function buildLookControls() {
    $('look-picker').innerHTML = Object.keys(LOOKS).map(k => `<button class="chip" data-look="${k}">${LOOKS[k].label}</button>`).join('');
    $('look-picker').addEventListener('click', e => { const b = e.target.closest('[data-look]'); if (b) { S.preset = b.dataset.look; S.look = Object.assign({}, LOOKS[b.dataset.look]); update(); } });
    $('siding-picker').innerHTML = COLOURS.map(([n, c]) => `<button class="swatch" data-colour="${c}" style="background:${c === 'cedar' ? 'linear-gradient(135deg,#b97a48,#8a5630)' : c}" title="${n}" aria-label="${n} siding"></button>`).join('');
    $('siding-picker').addEventListener('click', e => {
      const b = e.target.closest('[data-colour]'); if (!b) return; const c = b.dataset.colour;
      if (c === 'cedar') { S.look.siding = 'cedar'; S.look.color = '#a86b3d'; } else { if (S.look.siding === 'cedar') S.look.siding = 'board'; S.look.color = c; }
      S.preset = 'custom'; update();
    });
    $('roof-picker').addEventListener('click', e => { const b = e.target.closest('[data-roof]'); if (!b) return; S.look.roof = b.dataset.roof; S.look.pitch = ROOF_PITCH[b.dataset.roof]; S.preset = 'custom'; update(); });
    $('trim-picker').addEventListener('click', e => { const b = e.target.closest('[data-trim]'); if (!b) return; S.look.trim = b.dataset.trim; S.preset = 'custom'; update(); });
    document.querySelectorAll('.view-btn').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
  }

  // ---------- views ----------
  function show(id, on) { const el = $(id); if (el) el.classList.toggle('hidden', !on); }
  function setView(v) {
    S.view = v;
    document.querySelectorAll('.view-btn').forEach(b => { const on = b.dataset.view === v; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
    const threeD = v === '3d' || v === 'photo';
    show('stage-3d', threeD); show('stage-3d-hint', v === '3d');
    show('stage-photo-empty', v === 'photo' && !S.photo);
    show('stage-plan', v === 'plan'); show('stage-lot', v === 'lot');
    show('ctl-design', threeD); show('ctl-photo', v === 'photo' && !!S.photo);
    show('ctl-lot', v === 'lot'); show('ctl-plan', v === 'plan');
    $('btn-save').classList.toggle('hidden', v === 'lot');
    if (threeD) ensure3D().then(st => { if (st) { st.setPhoto(v === 'photo' ? S.photo : null); st.resize(); } });
    if (v === 'lot') ensureMap().then(() => setTimeout(() => window.YSMap.invalidate(), 60));
    if (v === 'plan') renderPlan();
  }
  function renderPlan() {
    const p = S.p; if (!p) return;
    if (S.floor >= p.floors.length) S.floor = 0;
    $('floor-toggle').innerHTML = p.floors.length > 1 ? p.floors.map((f, i) => `<button class="chip" data-floor="${i}" style="background:${i === S.floor ? '#C9A84C' : '#262626'};color:${i === S.floor ? '#0c0c0c' : '#fff'}">${f.label}</button>`).join('') : '';
    $('floor-toggle').onclick = e => { const b = e.target.closest('[data-floor]'); if (b) { S.floor = +b.dataset.floor; renderPlan(); } };
    $('plan-svg').innerHTML = window.YS_renderFloorPlan(p, S.floor);
    const rooms = [];
    p.floors.forEach(f => (f.rooms || []).forEach(r => { if (!r.small) rooms.push(`<li class="flex justify-between gap-3"><span>${r.name}</span><span class="text-white/50">${r.nodim ? '' : (r.dimText || (r.w + "' x " + r.h + "'"))}</span></li>`); }));
    $('room-list').innerHTML = rooms.join('');
  }
  function ensure3D() {
    if (S.studio) return Promise.resolve(S.studio);
    if (S.loading3d) return S.loading3d;
    const c = document.createElement('canvas');
    if (!(c.getContext('webgl2') || c.getContext('webgl'))) { $('stage-3d-loading').textContent = "This device can't show the 3D model. The floor plan and lot views still work."; return Promise.resolve(null); }
    S.loading3d = import('./studio3d.js').then(() => {
      S.studio = window.YS3D.mount($('stage-3d'));
      S.studio.setDesign(S.p, S.look);
      $('stage-3d-loading').classList.add('hidden');
      return S.studio;
    }).catch(err => { console.warn('3D failed', err); $('stage-3d-loading').textContent = "The 3D model couldn't load. Check your connection, or use the floor plan view."; return null; });
    return S.loading3d;
  }
  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    if (S.leafletLoading) return S.leafletLoading;
    S.leafletLoading = new Promise((res, rej) => {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      css.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='; css.crossOrigin = ''; document.head.appendChild(css);
      const js = document.createElement('script'); js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      js.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='; js.crossOrigin = '';
      js.onload = res; js.onerror = rej; document.head.appendChild(js);
    });
    return S.leafletLoading;
  }
  function ensureMap() {
    if (S.mapReady) return Promise.resolve();
    return loadLeaflet().then(() => {
      window.YSMap.init($('lot-map'), onLot);
      window.YSMap.setPlan(S.p);
      S.mapReady = true;
    }).catch(() => lotMsg("The map couldn't load. Check your connection and try again."));
  }
  function lotMsg(t) { const m = $('lot-msg'); if (!t) { m.classList.add('hidden'); return; } m.textContent = t; m.classList.remove('hidden'); }
  function addrMsg(t) { $('addr-msg').textContent = t || ''; }
  async function locate() {
    const addr = $('ys-address').value.trim();
    if (!addr) { $('ys-address').focus(); return; }
    S.address = addr;
    addrMsg('Finding your property…');
    await ensureMap();
    if (!S.mapReady) { addrMsg("The map couldn't load. You can still enter your lot size below."); return; }
    try {
      const r = await window.YSMap.locate(addr);
      if (!r.ok) { addrMsg("We couldn't find that address. Try adding the town, e.g. \"100 Hume St, Collingwood\"."); return; }
      const town = R().detectTown(addr + ' ' + (r.display || ''));
      if (town && R().RULES[town]) S.town = town; else if (!town) S.town = 'other';
      const area = window.YSMap.parcelAreaSqft();
      S.lot.gisSqft = area || null;
      addrMsg(area ? `Found it. Lot area from the Town map: ${fmt(area)} sq ft.` : `Found it${town ? ' in ' + R().RULES[S.town].name : ''}. Enter your lot frontage and depth below.`);
      $('lot-empty').classList.add('hidden'); lotMsg('');
      $('lot-rot').value = window.YSMap.getRotation(); $('lot-rot-val').textContent = window.YSMap.getRotation() + '°';
      const sv = window.YSMap.streetViewUrl(); if (sv) { $('lot-streetview').href = sv; $('lot-streetview').classList.remove('hidden'); }
      const fe = $('feas-address'); if (fe && !fe.value) fe.value = addr;
      $('ys-town').value = S.town;
      update();
    } catch (e) { addrMsg('Something went wrong looking up that address. Please try again.'); }
  }
  function onLot(o) {
    const el = $('lot-readout');
    if (o.fits !== null) {
      el.classList.remove('hidden');
      el.innerHTML = !o.fits ? '<span class="text-amber-300 font-semibold">Part of the suite is outside your lot line.</span> Drag or turn it to fit.'
        : `<span class="text-emerald-300 font-semibold">Inside your lot.</span> Closest lot line: about ${o.closestM.toFixed(1)} m (${Math.round(o.closestM * 3.281)} ft).`;
    } else el.classList.add('hidden');
    renderFit();
  }

  // ---------- update everything ----------
  function update() {
    renderRules();
    renderLayouts();
    renderTypes();
    renderMetrics();
    document.querySelectorAll('#look-picker [data-look]').forEach(b => b.classList.toggle('active', b.dataset.look === S.preset));
    document.querySelectorAll('#siding-picker [data-colour]').forEach(b => b.classList.toggle('active', S.look.siding === 'cedar' ? b.dataset.colour === 'cedar' : b.dataset.colour === S.look.color));
    document.querySelectorAll('#roof-picker [data-roof]').forEach(b => b.classList.toggle('active', b.dataset.roof === S.look.roof));
    document.querySelectorAll('#trim-picker [data-trim]').forEach(b => b.classList.toggle('active', b.dataset.trim === S.look.trim));
    $('siding-name').textContent = colourName() ? '· ' + colourName() : '';
    const p = S.p;
    $('sum-name').textContent = p.name;
    $('sum-area').textContent = fmt(E().floorArea(p)) + ' sq ft';
    $('sum-meta').textContent = `${p.W}' x ${p.D}'${p.storeys > 1 ? ', 2 storeys' : ''} · ${p.units > 1 ? p.units + ' units · ' : ''}${p.beds ? p.beds + ' bed' : 'studio'} · ${p.baths} bath`;
    if (S.studio) S.studio.setDesign(p, S.look);
    if (S.mapReady) window.YSMap.setPlan(p);
    if (S.view === 'plan') renderPlan();
    persist();
  }

  // ---------- actions ----------
  function designSummary() {
    const p = S.p, st = S.fit ? { fits: 'fits the rules', variance: 'needs a minor variance', rezoning: 'needs a rezoning' }[S.fit.status] : '';
    return `${E().TYPES[S.type].label}: ${p.name} (${p.W}' x ${p.D}', ${fmt(E().floorArea(p))} sq ft), ${LOOKS[S.preset] ? LOOKS[S.preset].label : 'custom'} look, ${colourName()} siding, ${S.look.roof} roof. ${R().RULES[S.town] ? R().RULES[S.town].name + ': ' : ''}${st}.`;
  }
  function download(url, name) { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  async function saveImage() {
    const base = 'yardsuite-' + S.p.key;
    if (S.view === 'plan') {
      const svg = $('plan-svg').querySelector('svg'); if (!svg) return;
      const xml = new XMLSerializer().serializeToString(svg), img = new Image(), vb = svg.viewBox.baseVal;
      img.onload = () => { const c = document.createElement('canvas'); c.width = vb.width * 2; c.height = vb.height * 2; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); download(c.toDataURL('image/png'), base + '-floor-plan.png'); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
      return;
    }
    const st = await ensure3D(); if (!st) return;
    download(await st.snapshot(), base + (S.photo && S.view === 'photo' ? '-in-my-yard' : '-3d') + '.jpg');
  }
  function runNumbers() {
    const a = E().floorArea(S.p);
    const inp = $('adu-size'), sl = $('adu-size-slider');
    if (inp) { inp.max = Math.max(+inp.max || 0, a); inp.value = a; } if (sl) { sl.max = Math.max(+sl.max || 0, a); sl.value = a; }
    if (typeof window.updateCalc === 'function') window.updateCalc();
    if (typeof window.saveCalcState === 'function') window.saveCalcState();
    window.goTab('calculator');
  }
  function quote() {
    const d = $('wl-design'); if (d) d.value = designSummary();
    const wa = $('wl-address'); if (wa && S.address && !wa.value) wa.value = S.address;
    const note = $('wl-design-note'); if (note) { note.textContent = 'Design attached: ' + designSummary(); note.classList.remove('hidden'); }
    window.goTab('home');
    setTimeout(() => { const w = $('waitlist'); if (w) w.scrollIntoView({ behavior: 'smooth' }); const e = $('wl-email'); if (e) e.focus({ preventScroll: true }); }, 120);
  }
  function onPhoto(e) {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    if (!/^image\//.test(f.type)) { addrMsg(''); return; }
    if (S.photo) URL.revokeObjectURL(S.photo);
    S.photo = URL.createObjectURL(f);
    ['ph-scale', 'ph-x', 'ph-y'].forEach(id => { $(id).value = id === 'ph-scale' ? 1 : 0; });
    setView('photo');
  }
  function wireActions() {
    $('btn-save').addEventListener('click', saveImage);
    $('btn-roi').addEventListener('click', runNumbers);
    $('btn-quote').addEventListener('click', quote);
    $('photo-input').addEventListener('change', onPhoto);
    $('photo-input-2').addEventListener('change', onPhoto);
    const adj = () => S.studio && S.studio.setAdjust({ scale: +$('ph-scale').value, x: +$('ph-x').value, y: +$('ph-y').value });
    ['ph-scale', 'ph-x', 'ph-y'].forEach(id => $(id).addEventListener('input', adj));
    $('lot-rot').addEventListener('input', e => { window.YSMap.setRotation(+e.target.value); $('lot-rot-val').textContent = e.target.value + '°'; });
    $('lot-face').addEventListener('click', () => { const r = window.YSMap.faceStreet(); $('lot-rot').value = r; $('lot-rot-val').textContent = r + '°'; });
  }

  window.YSStudio = {
    activate() { setView(S.view); },
    openLot(addr) { window.goTab('visualize'); if (addr) { $('ys-address').value = addr; locate(); } setView('lot'); }
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('type-picker')) return;
    fillLotInputs(); wireLot(); wireSize(); buildLookControls(); wireActions(); update();
  });
})();
