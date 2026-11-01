/* YardSuite "On my lot": satellite view of the homeowner's property with the chosen
   suite drawn to scale. Drag the gold handle to move it, use the slider to rotate.
   Collingwood addresses also get the real lot line from the Town's public parcel map. */
(function () {
  'use strict';
  const FT = 0.3048;
  const PARCEL_URL = 'https://services2.arcgis.com/uCcNfl5unz1svB8n/ArcGIS/rest/services/Planning_Interactive_Web_Map_WFL1/FeatureServer/3/query';
  // Esri World Imagery. Add an ArcGIS Location Platform key (free tier) in ESRI_KEY before heavy commercial use.
  const ESRI_KEY = '';
  const TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' + (ESRI_KEY ? '?token=' + ESRI_KEY : '');

  const state = { setbacks: null, buildings: [], zoneLayer: null, bldLayer: null, map: null, centre: null, rot: 0, plan: null, poly: null, handle: null, parcel: null, parcelLayer: null, street: null, onChange: null };

  function toLocal(lat, lng, o) { // metres east/north of origin o
    return { e: (lng - o.lng) * 111320 * Math.cos(o.lat * Math.PI / 180), n: (lat - o.lat) * 110540 };
  }
  function toLatLng(e, n, o) {
    return [o.lat + n / 110540, o.lng + e / (111320 * Math.cos(o.lat * Math.PI / 180))];
  }
  function corners() {
    const p = state.plan, w = p.W * FT, d = p.D * FT, t = state.rot * Math.PI / 180;
    // plan local: x east, y south -> e = x, n = -y, centred
    return [[-w / 2, d / 2], [w / 2, d / 2], [w / 2, -d / 2], [-w / 2, -d / 2]].map(([e, n]) => {
      const er = e * Math.cos(t) + n * Math.sin(t), nr = -e * Math.sin(t) + n * Math.cos(t);
      return { e: er, n: nr };
    });
  }
  function entryPoint() { // middle of the plan's south (entry) side
    const p = state.plan, d = p.D * FT, t = state.rot * Math.PI / 180, e = 0, n = -d / 2;
    return { e: e * Math.cos(t) + n * Math.sin(t), n: -e * Math.sin(t) + n * Math.cos(t) };
  }
  function segDist(p, a, b) {
    const dx = b.e - a.e, dn = b.n - a.n, l2 = dx * dx + dn * dn;
    let k = l2 ? ((p.e - a.e) * dx + (p.n - a.n) * dn) / l2 : 0; k = Math.max(0, Math.min(1, k));
    return Math.hypot(p.e - (a.e + k * dx), p.n - (a.n + k * dn));
  }
  function inside(pt, ring) {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i], b = ring[j];
      if (((a.n > pt.n) !== (b.n > pt.n)) && (pt.e < (b.e - a.e) * (pt.n - a.n) / (b.n - a.n) + a.e)) c = !c;
    }
    return c;
  }

  function draw() {
    if (!state.map || !state.plan || !state.centre) return;
    const c = state.centre;
    const pts = corners().map(k => toLatLng(k.e, k.n, c));
    if (state.poly) state.poly.setLatLngs(pts);
    else {
      state.poly = L.polygon(pts, { color: '#C9A84C', weight: 2.5, fillColor: '#C9A84C', fillOpacity: 0.38 }).addTo(state.map);
    }
    const ep = entryPoint(); const epLL = toLatLng(ep.e, ep.n, c);
    if (state.entry) state.entry.setLatLng(epLL); else state.entry = L.circleMarker(epLL, { radius: 4, color: '#fff', weight: 2, fillColor: '#0c0c0c', fillOpacity: 1, interactive: false }).addTo(state.map);
    state.poly.bindTooltip(`${state.plan.name} · ${state.plan.W}' x ${state.plan.D}'`, { permanent: true, direction: 'bottom', offset: [0, 14], className: 'ys-tip' });
    if (state.handle) state.handle.setLatLng([c.lat, c.lng]);
    report();
  }

  function report() {
    const out = { fits: null, closestM: null };
    if (state.parcel && state.centre) {
      const o = state.centre;
      const ring = state.parcel.map(([lng, lat]) => toLocal(lat, lng, o));
      const cs = corners();
      out.fits = cs.every(k => inside(k, ring));
      let best = Infinity;
      cs.forEach(k => { for (let i = 0; i < ring.length - 1; i++) best = Math.min(best, segDist(k, ring[i], ring[i + 1])); });
      out.closestM = isFinite(best) ? best : null;
    }
    if (state.buildings.length && state.centre) {
      const o = state.centre, cs = corners();
      let near = Infinity, overlap = false;
      state.buildings.forEach(b => {
        const ring = b.map(([lat, lng]) => toLocal(lat, lng, o));
        if (cs.some(k => inside(k, ring)) || ring.some(k => inside(k, cs.concat([cs[0]])))) overlap = true;
        cs.forEach(k => { for (let i = 0; i < ring.length - 1; i++) near = Math.min(near, segDist(k, ring[i], ring[i + 1])); });
        ring.forEach(k => { for (let i = 0; i < 4; i++) near = Math.min(near, segDist(k, cs[i], cs[(i + 1) % 4])); });
      });
      out.houseM = isFinite(near) ? near : null; out.overlap = overlap;
      if (overlap) out.fits = false;
    }
    if (state.street && state.centre) { const ep = entryPoint(), st = toLocal(state.street.lat, state.street.lng, state.centre); out.streetM = Math.hypot(ep.e - st.e, ep.n - st.n); }
    state.last = out;
    if (state.onChange) state.onChange(out);
  }

  function ensureMap(el) {
    if (state.map) return state.map;
    state.map = L.map(el, { zoomControl: true, attributionControl: true, maxZoom: 21, tap: true });
    L.tileLayer(TILE_URL, { maxNativeZoom: 19, maxZoom: 21, attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics' }).addTo(state.map);
    state.map.setView([44.5016, -80.2144], 15);
    return state.map;
  }

  async function geocode(addr) {
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ca&q=' + encodeURIComponent(addr);
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    const d = await r.json();
    if (!d || !d.length) return null;
    return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon), display: d[0].display_name || '' };
  }

  async function collingwoodParcel(lat, lng, addr) {
    const q = `geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326&distance=30&units=esriSRUnit_Meter&spatialRel=esriSpatialRelIntersects&outFields=${encodeURIComponent('ARN,Location')}&returnGeometry=true&outSR=4326&f=json`;
    const r = await fetch(PARCEL_URL + '?' + q);
    const d = await r.json();
    const feats = (d && d.features) || [];
    if (!feats.length) return null;
    const num = (addr.match(/^\s*(\d+)/) || [])[1];
    let f = num ? feats.find(x => new RegExp('^' + num + '\\b').test((x.attributes && x.attributes.Location) || '')) : null;
    if (!f) f = feats.find(x => x.geometry && x.geometry.rings && inside(toLocal(lat, lng, { lat, lng }), x.geometry.rings[0].map(([a, b]) => toLocal(b, a, { lat, lng }))));
    if (!f) return null;
    return { ring: f.geometry.rings[0], location: f.attributes.Location };
  }

  function centroid(ring) {
    let lat = 0, lng = 0; const n = ring.length - 1 || 1;
    for (let i = 0; i < n; i++) { lng += ring[i][0]; lat += ring[i][1]; }
    return { lat: lat / n, lng: lng / n };
  }

  // Put the suite in the back half of the lot, entry facing the house/street.
  function autoPlace(street, parcelRing) {
    let target = { lat: street.lat, lng: street.lng };
    if (parcelRing) {
      const c = centroid(parcelRing);
      const v = toLocal(c.lat, c.lng, street);
      const ll = toLatLng(v.e * 1.55, v.n * 1.55, street);
      target = { lat: ll[0], lng: ll[1] };
      const ring = parcelRing.map(([lng, lat]) => toLocal(lat, lng, street));
      if (!inside(toLocal(target.lat, target.lng, street), ring)) target = c;
    } else {
      const ll = toLatLng(0, -22, street); target = { lat: ll[0], lng: ll[1] };
    }
    state.centre = target;
    const g = toLocal(street.lat, street.lng, target);
    const len = Math.hypot(g.e, g.n) || 1;
    state.rot = Math.round(Math.atan2(-g.e / len, -g.n / len) * 180 / Math.PI);
  }

  // Inset the lot by the setbacks (front edge = the one nearest the street point).
  function drawZone() {
    if (state.zoneLayer) { state.map.removeLayer(state.zoneLayer); state.zoneLayer = null; }
    if (!state.parcel || !state.setbacks || !state.street) return;
    const sb = state.setbacks, o = state.street;
    let pts = state.parcel.map(([lng, lat]) => toLocal(lat, lng, o));
    if (pts.length > 1 && Math.hypot(pts[0].e - pts[pts.length - 1].e, pts[0].n - pts[pts.length - 1].n) < 0.01) pts = pts.slice(0, -1);
    if (pts.length < 3) return;
    let area = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; area += a.e * b.n - b.e * a.n; }
    const ccw = area > 0, n = pts.length;
    let frontIdx = 0, fd = Infinity;
    for (let i = 0; i < n; i++) { const d = segDist({ e: 0, n: 0 }, pts[i], pts[(i + 1) % n]); if (d < fd) { fd = d; frontIdx = i; } }
    const lines = [];
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n], dx = b.e - a.e, dn = b.n - a.n, L = Math.hypot(dx, dn) || 1;
      const nx = ccw ? -dn / L : dn / L, nn = ccw ? dx / L : -dx / L; // inward normal
      const d = i === frontIdx ? (sb.front || sb.side || 0) : Math.max(sb.side || 0, sb.rear || 0);
      lines.push({ p: { e: a.e + nx * d, n: a.n + nn * d }, v: { e: dx, n: dn } });
    }
    const out = [];
    for (let i = 0; i < n; i++) {
      const l1 = lines[(i - 1 + n) % n], l2 = lines[i], den = l1.v.e * l2.v.n - l1.v.n * l2.v.e;
      if (Math.abs(den) < 1e-9) { out.push(l2.p); continue; }
      const t = ((l2.p.e - l1.p.e) * l2.v.n - (l2.p.n - l1.p.n) * l2.v.e) / den;
      out.push({ e: l1.p.e + l1.v.e * t, n: l1.p.n + l1.v.n * t });
    }
    state.zoneLayer = L.polygon(out.map(k => toLatLng(k.e, k.n, o)), { color: '#4ade80', weight: 1.5, dashArray: '4 4', fillColor: '#4ade80', fillOpacity: 0.08, interactive: false }).addTo(state.map);
    if (state.poly) state.poly.bringToFront();
  }
  async function fetchBuildings(geo) {
    state.buildings = [];
    if (state.bldLayer) { state.map.removeLayer(state.bldLayer); state.bldLayer = null; }
    try {
      const q = `[out:json][timeout:10];way["building"](around:70,${geo.lat},${geo.lng});out geom;`;
      const r = await fetch('https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(q));
      const d = await r.json();
      let ways = (d.elements || []).filter(w => w.geometry && w.geometry.length > 3).map(w => w.geometry.map(g => [g.lat, g.lon]));
      if (state.parcel) {
        const o = { lat: geo.lat, lng: geo.lng }, ring = state.parcel.map(([lng, lat]) => toLocal(lat, lng, o));
        ways = ways.filter(w => w.some(([lat, lng]) => inside(toLocal(lat, lng, o), ring)));
      }
      state.buildings = ways;
      if (ways.length) state.bldLayer = L.layerGroup(ways.map(w => L.polygon(w, { color: '#e5e7eb', weight: 1.5, fillColor: '#9ca3af', fillOpacity: 0.35, interactive: false }))).addTo(state.map);
      if (state.poly) state.poly.bringToFront();
      report();
    } catch (e) { /* building outlines are a nice-to-have */ }
  }

  const api = {
    init(el, onChange) { state.onChange = onChange; return ensureMap(el); },
    setPlan(plan) { state.plan = plan; draw(); },
    setSetbacks(sb) { state.setbacks = sb; if (state.map) drawZone(); },
    setRotation(deg) { state.rot = deg; draw(); },
    getRotation() { return state.rot; },
    faceStreet() { if (state.street && state.centre) { const g = toLocal(state.street.lat, state.street.lng, state.centre); const l = Math.hypot(g.e, g.n) || 1; state.rot = Math.round(Math.atan2(-g.e / l, -g.n / l) * 180 / Math.PI); draw(); } return state.rot; },
    invalidate() { if (state.map) state.map.invalidateSize(); },
    streetViewUrl() { const p = state.street || state.centre; return p ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${p.lat.toFixed(6)},${p.lng.toFixed(6)}` : null; },
    mapsUrl() { const p = state.centre; return p ? `https://www.google.com/maps/@?api=1&map_action=map&center=${p.lat.toFixed(6)},${p.lng.toFixed(6)}&zoom=20&basemap=satellite` : null; },
    hasLocation() { return !!state.centre; },
    parcelAreaSqft() {
      if (!state.parcel) return null;
      const o = { lat: state.parcel[0][1], lng: state.parcel[0][0] };
      const pts = state.parcel.map(([lng, lat]) => toLocal(lat, lng, o));
      let a = 0; for (let i = 0; i < pts.length - 1; i++) a += pts[i].e * pts[i + 1].n - pts[i + 1].e * pts[i].n;
      return Math.round(Math.abs(a / 2) * 10.7639);
    },
    lastReport() { return state.last || { fits: null, closestM: null }; },
    async locate(addr) {
      const geo = await geocode(/ontario|,\s*on\b/i.test(addr) ? addr : addr + ', Ontario');
      if (!geo) return { ok: false, reason: 'notfound' };
      state.street = geo;
      let parcel = null;
      if (/collingwood/i.test(addr) || /collingwood/i.test(geo.display)) { try { parcel = await collingwoodParcel(geo.lat, geo.lng, addr); } catch (e) { parcel = null; } }
      state.parcel = parcel ? parcel.ring : null;
      if (state.parcelLayer) { state.map.removeLayer(state.parcelLayer); state.parcelLayer = null; }
      if (parcel) state.parcelLayer = L.polygon(parcel.ring.map(([lng, lat]) => [lat, lng]), { color: '#ffffff', weight: 2, dashArray: '6 5', fill: false, interactive: false }).addTo(state.map);
      autoPlace(geo, state.parcel);
      drawZone();
      fetchBuildings(geo);
      if (!state.handle) {
        const icon = L.divIcon({ className: 'ys-handle', html: '<span aria-hidden="true">&#x2725;</span>', iconSize: [34, 34], iconAnchor: [17, 17] });
        state.handle = L.marker([state.centre.lat, state.centre.lng], { draggable: true, icon, keyboard: true, title: 'Drag to move the suite', alt: 'Drag to move the suite' }).addTo(state.map);
        state.handle.on('drag', e => { const ll = e.target.getLatLng(); state.centre = { lat: ll.lat, lng: ll.lng }; draw(); });
      }
      if (state.parcelLayer) state.map.fitBounds(state.parcelLayer.getBounds(), { padding: [30, 30], maxZoom: 20 });
      else state.map.setView([state.centre.lat, state.centre.lng], 19);
      draw();
      return { ok: true, parcel: !!parcel, display: geo.display };
    }
  };
  window.YSMap = api;
})();
