/* YardSuite design studio controller: layout picker, look options, and the four views
   (3D model, floor plan, on my lot, on my photo). Heavy parts (three.js, Leaflet) load
   only when someone opens the Visualize tab. */
(function () {
  'use strict';
  const PLANS = window.YS_PLANS;
  const ORDER = ['studio', 'onebed', 'twobed', 'loft'];
  const LOOKS = {
    modern:    { label: 'Modern black', roof: 'shed', pitch: 0.25, siding: 'board', color: '#1f2023', trim: '#1c1d1f', roofMat: 'metal', roofColor: '#2b2e31', door: '#a86b3d' },
    farmhouse: { label: 'Farmhouse', roof: 'gable', pitch: 8 / 12, siding: 'board', color: '#eceae4', trim: '#1c1d1f', roofMat: 'metal', roofColor: '#1c1d1f', door: '#1c1d1f' },
    cottage:   { label: 'Bay cottage', roof: 'gable', pitch: 6 / 12, siding: 'lap', color: '#8d9a87', trim: '#f2f0ea', roofMat: 'shingle', roofColor: '#4d5156', door: '#C9A84C' },
    cedar:     { label: 'Cedar modern', roof: 'flat', pitch: 0, siding: 'cedar', color: '#a86b3d', trim: '#1c1d1f', roofMat: 'metal', roofColor: '#2b2c2e', door: '#1c1d1f' }
  };
  const COLOURS = [['Arctic white', '#eceae4'], ['Greige', '#b9b2a5'], ['Sage', '#8d9a87'], ['Harbour blue', '#4a5d70'], ['Charcoal', '#3b3d40'], ['Black', '#1f2023'], ['Natural cedar', 'cedar']];
  const ROOF_PITCH = { gable: 7 / 12, shed: 0.25, flat: 0 };

  const $ = (id) => document.getElementById(id);
  const store = {
    get() { try { return JSON.parse(localStorage.getItem('yardsuite_design') || 'null'); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem('yardsuite_design', JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };
  const saved = store.get() || {};
  const S = {
    plan: PLANS[saved.plan] ? saved.plan : 'onebed',
    preset: LOOKS[saved.preset] ? saved.preset : 'farmhouse',
    look: Object.assign({}, LOOKS[LOOKS[saved.preset] ? saved.preset : 'farmhouse'], saved.look || {}),
    view: '3d', floor: 0, photo: null, studio: null, loading3d: null, mapReady: false
  };

  const area = (p) => p.W * p.D * p.storeys;
  const persist = () => store.set({ plan: S.plan, preset: S.preset, look: S.look });

  function colourName() {
    if (S.look.siding === 'cedar') return 'Natural cedar';
    const c = COLOURS.find(x => x[1] === S.look.color); return c ? c[0] : '';
  }
  function designSummary() {
    const p = PLANS[S.plan];
    const roof = { gable: 'gable roof', shed: 'shed roof', flat: 'flat roof' }[S.look.roof];
    return `${p.name} (${p.W}' x ${p.D}', ${area(p).toLocaleString('en-CA')} sq ft), ${LOOKS[S.preset] ? LOOKS[S.preset].label : 'custom'} look, ${colourName()} siding, ${roof}, ${S.look.trim === '#f2f0ea' ? 'white' : 'black'} trim`;
  }

  // ---------- builders ----------
  function miniPlan(p) {
    const f = p.floors[0], s = 64 / Math.max(p.W, p.D), w = p.W * s, h = p.D * s, ox = (110 - w) / 2, oy = (64 - h) / 2;
    const walls = (f.walls || []).map(x => `<line x1="${ox + x[0] * s}" y1="${oy + x[1] * s}" x2="${ox + x[2] * s}" y2="${oy + x[3] * s}" stroke="#C9A84C" stroke-width="1.4"/>`).join('');
    return `<svg viewBox="0 0 110 64" aria-hidden="true"><rect x="${ox}" y="${oy}" width="${w}" height="${h}" fill="rgba(201,168,76,.08)" stroke="#C9A84C" stroke-width="2.4"/>${walls}</svg>`;
  }
  function buildPicker() {
    $('plan-picker').innerHTML = ORDER.map(k => {
      const p = PLANS[k];
      const beds = p.beds ? p.beds + ' bed' : 'Studio';
      return `<button class="plan-card" role="radio" data-plan="${k}" aria-checked="false">${miniPlan(p)}
        <div class="font-bold text-white text-sm">${p.name}</div>
        <div class="text-gold text-xs font-semibold mt-0.5">${area(p).toLocaleString('en-CA')} sq ft</div>
        <div class="text-white/55 text-[11px] mt-0.5">${p.W}' x ${p.D}'${p.storeys > 1 ? ' · 2 storeys' : ''} · ${beds} · ${p.baths} bath</div></button>`;
    }).join('');
    $('plan-picker').addEventListener('click', e => { const b = e.target.closest('.plan-card'); if (b) setPlan(b.dataset.plan); });
    $('look-picker').innerHTML = Object.keys(LOOKS).map(k => `<button class="chip" data-look="${k}">${LOOKS[k].label}</button>`).join('');
    $('look-picker').addEventListener('click', e => { const b = e.target.closest('[data-look]'); if (b) setPreset(b.dataset.look); });
    $('siding-picker').innerHTML = COLOURS.map(([n, c]) => {
      const bg = c === 'cedar' ? 'linear-gradient(135deg,#b97a48,#8a5630)' : c;
      return `<button class="swatch" data-colour="${c}" style="background:${bg}" title="${n}" aria-label="${n} siding"></button>`;
    }).join('');
    $('siding-picker').addEventListener('click', e => { const b = e.target.closest('[data-colour]'); if (b) setColour(b.dataset.colour); });
    $('roof-picker').addEventListener('click', e => { const b = e.target.closest('[data-roof]'); if (!b) return; S.look.roof = b.dataset.roof; S.look.pitch = ROOF_PITCH[b.dataset.roof]; S.preset = 'custom'; update(); });
    $('trim-picker').addEventListener('click', e => { const b = e.target.closest('[data-trim]'); if (!b) return; S.look.trim = b.dataset.trim; S.preset = 'custom'; update(); });
    document.querySelectorAll('.view-btn').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
  }

  function setPlan(k) { S.plan = k; S.floor = 0; update(); }
  function setPreset(k) { S.preset = k; S.look = Object.assign({}, LOOKS[k]); update(); }
  function setColour(c) {
    if (c === 'cedar') { S.look.siding = 'cedar'; S.look.color = '#a86b3d'; }
    else { if (S.look.siding === 'cedar') S.look.siding = 'board'; S.look.color = c; }
    S.preset = 'custom'; update();
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
    if (v === 'lot') ensureMap();
    if (v === 'plan') renderPlan();
  }

  function renderPlan() {
    const p = PLANS[S.plan];
    $('floor-toggle').innerHTML = p.floors.length > 1 ? p.floors.map((f, i) => `<button class="chip ${i === S.floor ? 'active' : ''}" data-floor="${i}" style="background:${i === S.floor ? '#C9A84C' : '#262626'};color:${i === S.floor ? '#0c0c0c' : '#fff'}">${f.label}</button>`).join('') : '';
    $('floor-toggle').onclick = e => { const b = e.target.closest('[data-floor]'); if (b) { S.floor = +b.dataset.floor; renderPlan(); } };
    $('plan-svg').innerHTML = window.YS_renderFloorPlan(p, S.floor);
    const rooms = [];
    p.floors.forEach(f => (f.rooms || []).forEach(r => { if (!r.small) rooms.push(`<li class="flex justify-between gap-3"><span>${r.name}</span><span class="text-white/50">${r.nodim ? '' : (r.dimText || (r.w + "' x " + r.h + "'"))}</span></li>`); }));
    $('room-list').innerHTML = rooms.join('');
  }

  function ensure3D() {
    if (S.studio) return Promise.resolve(S.studio);
    if (S.loading3d) return S.loading3d;
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
    if (!gl) { $('stage-3d-loading').textContent = "This device can't show the 3D model. The floor plan and lot views still work."; return Promise.resolve(null); }
    S.loading3d = import('./studio3d.js').then(() => {
      S.studio = window.YS3D.mount($('stage-3d'));
      S.studio.setDesign(PLANS[S.plan], S.look);
      $('stage-3d-loading').classList.add('hidden');
      return S.studio;
    }).catch(err => {
      console.warn('3D failed', err);
      $('stage-3d-loading').textContent = "The 3D model couldn't load. Check your connection, or use the floor plan view.";
      return null;
    });
    return S.loading3d;
  }

  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    return new Promise((res, rej) => {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      css.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='; css.crossOrigin = '';
      document.head.appendChild(css);
      const js = document.createElement('script'); js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      js.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='; js.crossOrigin = '';
      js.onload = res; js.onerror = rej; document.head.appendChild(js);
    });
  }
  function lotMsg(t) { const m = $('lot-msg'); if (!t) { m.classList.add('hidden'); return; } m.textContent = t; m.classList.remove('hidden'); }
  function ensureMap() {
    if (S.mapReady) { setTimeout(() => window.YSMap.invalidate(), 50); return; }
    loadLeaflet().then(() => {
      window.YSMap.init($('lot-map'), onLot);
      window.YSMap.setPlan(PLANS[S.plan]);
      S.mapReady = true;
      setTimeout(() => window.YSMap.invalidate(), 50);
      const pre = $('lot-address').value || ($('feas-address') && $('feas-address').value) || ($('wl-address') && $('wl-address').value) || '';
      if (pre) { $('lot-address').value = pre; locate(); }
    }).catch(() => lotMsg("The map couldn't load. Check your connection and try again."));
  }
  async function locate() {
    const addr = $('lot-address').value.trim();
    if (!addr) { $('lot-address').focus(); return; }
    if (!S.mapReady) { ensureMap(); return; }
    lotMsg('Finding your property…');
    try {
      const r = await window.YSMap.locate(addr);
      if (!r.ok) { lotMsg("We couldn't find that address. Try adding the town, e.g. \"100 Hume St, Collingwood\"."); return; }
      $('lot-empty').classList.add('hidden');
      lotMsg(r.parcel ? '' : 'Lot lines are only available for Collingwood right now. Drag the suite into your backyard.');
      if (!r.parcel) setTimeout(() => lotMsg(''), 6000);
      $('lot-rot').value = window.YSMap.getRotation(); $('lot-rot-val').textContent = window.YSMap.getRotation() + '°';
      const sv = window.YSMap.streetViewUrl(); if (sv) { $('lot-streetview').href = sv; $('lot-streetview').classList.remove('hidden'); }
      try { const fe = $('feas-address'); if (fe && !fe.value) fe.value = addr; } catch (e) { /* noop */ }
    } catch (e) { lotMsg("Something went wrong looking up that address. Please try again."); }
  }
  function onLot(o) {
    const el = $('lot-readout');
    if (o.fits === null) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    if (!o.fits) { el.innerHTML = '<span class="text-amber-300 font-semibold">Part of the suite is outside your lot line.</span> Drag or turn it to fit.'; return; }
    const m = o.closestM, ft = m * 3.281;
    el.innerHTML = `<span class="text-emerald-300 font-semibold">Fits inside your lot.</span> Closest lot line: about ${m.toFixed(1)} m (${Math.round(ft)} ft). Required setbacks are confirmed in your assessment.`;
  }

  // ---------- update everything ----------
  function update() {
    const p = PLANS[S.plan];
    document.querySelectorAll('.plan-card').forEach(b => { const on = b.dataset.plan === S.plan; b.classList.toggle('active', on); b.setAttribute('aria-checked', on); });
    document.querySelectorAll('#look-picker [data-look]').forEach(b => b.classList.toggle('active', b.dataset.look === S.preset));
    document.querySelectorAll('#siding-picker [data-colour]').forEach(b => b.classList.toggle('active', S.look.siding === 'cedar' ? b.dataset.colour === 'cedar' : b.dataset.colour === S.look.color));
    document.querySelectorAll('#roof-picker [data-roof]').forEach(b => b.classList.toggle('active', b.dataset.roof === S.look.roof));
    document.querySelectorAll('#trim-picker [data-trim]').forEach(b => b.classList.toggle('active', b.dataset.trim === S.look.trim));
    $('siding-name').textContent = colourName() ? '· ' + colourName() : '';
    $('sum-name').textContent = p.name;
    $('sum-area').textContent = area(p).toLocaleString('en-CA') + ' sq ft';
    $('sum-meta').textContent = `${p.W}' x ${p.D}' footprint${p.storeys > 1 ? ', 2 storeys' : ''} · ${p.beds ? p.beds + ' bed' : 'studio'} · ${p.baths} bath · ${p.tagline}`;
    if (S.studio) S.studio.setDesign(p, S.look);
    if (S.mapReady) window.YSMap.setPlan(p);
    if (S.view === 'plan') renderPlan();
    persist();
  }

  // ---------- actions ----------
  function download(url, name) { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  async function saveImage() {
    const p = PLANS[S.plan], base = 'yardsuite-' + p.key;
    if (S.view === 'plan') {
      const svg = $('plan-svg').querySelector('svg'); if (!svg) return;
      const xml = new XMLSerializer().serializeToString(svg);
      const img = new Image(); const vb = svg.viewBox.baseVal;
      img.onload = () => { const c = document.createElement('canvas'); c.width = vb.width * 2; c.height = vb.height * 2; const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height); download(c.toDataURL('image/png'), base + '-floor-plan.png'); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
      return;
    }
    const st = await ensure3D(); if (!st) return;
    download(await st.snapshot(), base + (S.photo && S.view === 'photo' ? '-in-my-yard' : '-3d') + '.jpg');
  }
  function runNumbers() {
    const a = area(PLANS[S.plan]);
    const inp = $('adu-size'), sl = $('adu-size-slider');
    if (inp) inp.value = a; if (sl) sl.value = a;
    if (typeof window.updateCalc === 'function') window.updateCalc();
    if (typeof window.saveCalcState === 'function') window.saveCalcState();
    window.goTab('calculator');
  }
  function quote() {
    const d = $('wl-design'); if (d) d.value = designSummary();
    const wa = $('wl-address'), la = $('lot-address'); if (wa && la && la.value && !wa.value) wa.value = la.value;
    const note = $('wl-design-note'); if (note) { note.textContent = 'Design attached: ' + designSummary(); note.classList.remove('hidden'); }
    window.goTab('home');
    setTimeout(() => { const w = $('waitlist'); if (w) w.scrollIntoView({ behavior: 'smooth' }); const e = $('wl-email'); if (e) e.focus({ preventScroll: true }); }, 120);
  }
  function onPhoto(e) {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    if (!/^image\//.test(f.type)) { alert('Please choose an image file.'); return; }
    if (S.photo) URL.revokeObjectURL(S.photo);
    S.photo = URL.createObjectURL(f);
    ['ph-scale', 'ph-x', 'ph-y'].forEach(id => { $(id).value = id === 'ph-scale' ? 1 : 0; });
    setView('photo');
  }

  function wire() {
    $('btn-save').addEventListener('click', saveImage);
    $('btn-roi').addEventListener('click', runNumbers);
    $('btn-quote').addEventListener('click', quote);
    $('photo-input').addEventListener('change', onPhoto);
    $('photo-input-2').addEventListener('change', onPhoto);
    const adj = () => S.studio && S.studio.setAdjust({ scale: +$('ph-scale').value, x: +$('ph-x').value, y: +$('ph-y').value });
    ['ph-scale', 'ph-x', 'ph-y'].forEach(id => $(id).addEventListener('input', adj));
    $('lot-form').addEventListener('submit', e => { e.preventDefault(); locate(); });
    $('lot-rot').addEventListener('input', e => { window.YSMap.setRotation(+e.target.value); $('lot-rot-val').textContent = e.target.value + '°'; });
    $('lot-face').addEventListener('click', () => { const r = window.YSMap.faceStreet(); $('lot-rot').value = r; $('lot-rot-val').textContent = r + '°'; });
  }

  window.YSStudio = {
    activate() { setView(S.view); },
    openLot(addr) { if (addr) $('lot-address').value = addr; window.goTab('visualize'); setView('lot'); if (S.mapReady && addr) locate(); }
  };

  document.addEventListener('DOMContentLoaded', () => { if (!$('plan-picker')) return; buildPicker(); wire(); update(); });
})();
