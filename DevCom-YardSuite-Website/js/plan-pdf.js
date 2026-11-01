/* YardSuite "My plan" PDF, built in the browser with jsPDF (loaded on demand).
   Page 1: picture, design summary, town rules check, rough cost, financing options.
   Page 2+: floor plans. Pricing is a rough range only; final pricing comes at the consult. */
(function () {
  'use strict';
  const JSPDF_URL = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
  const JSPDF_SRI = 'sha384-en/ztfPSRkGfME4KIm05joYXynqzUgbsG5nMrj/xEFAHXkeZfO3yMK8QQ+mP7p1/';
  const GOLD = [201, 168, 76], INK = [28, 28, 28], SOFT = [110, 106, 98], DARK = [12, 12, 12];

  function loadJsPdf() {
    if (window.jspdf) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = JSPDF_URL; s.integrity = JSPDF_SRI; s.crossOrigin = 'anonymous';
      s.onload = res; s.onerror = () => rej(new Error('jspdf')); document.head.appendChild(s);
    });
  }
  // keep to characters the built-in PDF font can print
  const clean = (t) => String(t || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...').replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ]/g, '');

  function svgToPng(svgEl, scale) {
    return new Promise((res) => {
      const xml = new XMLSerializer().serializeToString(svgEl), vb = svgEl.viewBox.baseVal, img = new Image();
      img.onload = () => { const c = document.createElement('canvas'); c.width = vb.width * scale; c.height = vb.height * scale; const g = c.getContext('2d'); g.fillStyle = '#fbf9f4'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); res({ url: c.toDataURL('image/png'), w: vb.width, h: vb.height }); };
      img.onerror = () => res(null);
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
    });
  }

  async function make(ctx) {
    await loadJsPdf();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'letter' });
    const W = 215.9, H = 279.4, M = 16;
    let y = 0;
    const text = (t, x, yy, o) => doc.text(clean(t), x, yy, o);
    const wrap = (t, w) => doc.splitTextToSize(clean(t), w);
    const head = () => {
      doc.setFillColor(...DARK); doc.rect(0, 0, W, 24, 'F');
      doc.setFillColor(...GOLD); doc.rect(0, 24, W, 1.2, 'F');
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); text('YardSuite', M, 15);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(220, 220, 220);
      text('My garden suite plan  |  ' + ctx.date, W - M, 15, { align: 'right' });
    };
    const foot = (n) => {
      doc.setDrawColor(220, 215, 205); doc.line(M, H - 16, W - M, H - 16);
      doc.setFontSize(7.5); doc.setTextColor(...SOFT); doc.setFont('helvetica', 'normal');
      wrap('Concept only. Models, plans, rules and prices are a planning guide, not architectural drawings, a quote or a zoning approval. Final design, siting, price and approvals are confirmed with you and the Town. DevCom Homes  |  info@devcomhomes.ca  |  (705) 242-7323', W - 2 * M - 12).forEach((l, i) => text(l, M, H - 11.5 + i * 3.4));
      text(String(n), W - M, H - 8, { align: 'right' });
    };
    const h2 = (t) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...INK); text(t, M, y); doc.setFillColor(...GOLD); doc.rect(M, y + 1.6, 14, 0.8, 'F'); y += 7.5; };
    const para = (t, size, colour) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(size || 9.5); doc.setTextColor(...(colour || INK)); wrap(t, W - 2 * M).forEach(l => { text(l, M, y); y += (size || 9.5) * 0.45; }); y += 1.5; };
    const ensure = (need, n) => { if (y + need > H - 20) { foot(n.page); doc.addPage(); n.page++; head(); y = 34; } };

    const pg = { page: 1 };
    head(); y = 34;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(19); doc.setTextColor(...INK);
    text(ctx.p.name, M, y); y += 6.5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...SOFT);
    text((ctx.firstName ? 'Prepared for ' + ctx.firstName + '  |  ' : '') + (ctx.address || ctx.townName), M, y); y += 6;

    if (ctx.image) {
      const iw = W - 2 * M, ih = iw * 0.56;
      try { doc.addImage(ctx.image, 'JPEG', M, y, iw, ih); y += ih + 6; } catch (e) { /* no picture */ }
    }

    // summary grid
    const cells = [
      ['Suite type', ctx.typeLabel], ['Size', `${ctx.p.W}' x ${ctx.p.D}' footprint`],
      ['Floor area', `${ctx.area.toLocaleString('en-CA')} sq ft${ctx.p.units > 1 ? ', ' + ctx.p.units + ' units' : ''}`], ['Bedrooms / baths', `${ctx.p.beds || 'Studio'} / ${ctx.p.baths}`],
      ['Height (approx.)', `${ctx.heightM.toFixed(1)} m to the peak`], ['Look', ctx.lookText]
    ];
    const cw = (W - 2 * M - 6) / 2;
    cells.forEach((c, i) => {
      const cx = M + (i % 2) * (cw + 6), cy = y + Math.floor(i / 2) * 13;
      doc.setFillColor(246, 243, 236); doc.roundedRect(cx, cy, cw, 11, 1.5, 1.5, 'F');
      doc.setFontSize(7.5); doc.setTextColor(...SOFT); text(c[0].toUpperCase(), cx + 3, cy + 4.2);
      doc.setFontSize(10); doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); text(c[1], cx + 3, cy + 9); doc.setFont('helvetica', 'normal');
    });
    y += 13 * 3 + 4;

    // cost
    ensure(26, pg);
    h2('Rough build cost');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...GOLD); text(ctx.costText, M, y + 1); y += 7;
    para('A rough range for planning only, at about $250 to $300 per sq ft of finished space. Site servicing, permits, design and finishes change it. Final pricing is set at your free consult after we see the site.', 9, SOFT);

    // rules
    foot(pg.page); doc.addPage(); pg.page++; head(); y = 34;
    h2('What ' + ctx.townName + ' allows');
    ctx.ruleLines.forEach(l => { ensure(6, pg); doc.setFillColor(...GOLD); doc.circle(M + 1.2, y - 1.2, 0.8, 'F'); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...INK); wrap(l, W - 2 * M - 6).forEach((t, i) => { text(t, M + 5, y); y += 4.3; }); y += 0.8; });
    y += 2;
    ensure(20, pg);
    h2('How your design fits');
    const st = { fits: ['Fits the rules we can check', [34, 139, 84]], variance: ['Needs a minor variance (DevCom handles the application)', [190, 130, 20]], rezoning: ['Needs a rezoning for the number of units', [190, 50, 50]] }[ctx.fit.status];
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...st[1]); text(st[0], M, y); y += 6;
    ctx.fit.items.forEach(it => {
      ensure(6, pg);
      const col = it.ok === true ? [34, 139, 84] : it.ok === false ? [190, 130, 20] : [150, 150, 150];
      doc.setFillColor(...col); doc.circle(M + 1.2, y - 1.2, 1.1, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...INK); text(it.label + ':', M + 5, y);
      const lw = doc.getTextWidth(clean(it.label + ': '));
      doc.setFont('helvetica', 'normal'); wrap(it.detail, W - 2 * M - 6 - lw).forEach((t, i) => { text(t, M + 5 + (i ? 0 : lw), y); y += 4.3; });
      y += 0.6;
    });
    y += 2;
    para('Sources: ' + ctx.sourcesText + '. Rules checked ' + ctx.rulesAsOf + '. Always confirm with the Town before you build.', 8, SOFT);

    // financing
    ensure(40, pg);
    h2('Ways to pay for it');
    [
      'HELOC or refinance: borrow against the equity in your home, usually up to 80% of its current value.',
      'Refinance on the finished value: some lenders and insured programs for added suites look at your home\'s value once the suite is built, which can free up more.',
      'Construction financing: money released in draws as the build moves along, so you only carry what you\'ve used.',
      'Rent from the suite can help you qualify and carry the payments.'
    ].forEach(l => { ensure(8, pg); doc.setFillColor(...GOLD); doc.circle(M + 1.2, y - 1.2, 0.8, 'F'); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...INK); wrap(l, W - 2 * M - 6).forEach(t => { text(t, M + 5, y); y += 4.3; }); y += 0.8; });
    para('Financing through The Mortgage Coach Greater Simcoe. We\'ll run your real numbers at the consult; nothing here is a mortgage offer.', 8.5, SOFT);

    ensure(30, pg);
    h2('Next steps');
    ['Free consult: we look at your lot, confirm the rules and setbacks, and firm up size and siting.', 'Fixed price and financing plan for your design.', 'Drawings, permits and any minor variance, handled by DevCom.', 'Build.'].forEach((l, i) => {
      ensure(6, pg); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...GOLD); text(String(i + 1), M + 0.5, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...INK); wrap(l, W - 2 * M - 6).forEach(t => { text(t, M + 5, y); y += 4.3; }); y += 0.8;
    });
    para('Book your consult: info@devcomhomes.ca  |  (705) 242-7323', 10, INK);

    // floor plans
    for (let i = 0; i < ctx.plans.length; i++) {
      const pl = ctx.plans[i]; if (!pl) continue;
      foot(pg.page); doc.addPage(); pg.page++; head(); y = 34;
      h2('Floor plan' + (ctx.plans.length > 1 ? ': ' + ctx.p.floors[i].label : ''));
      const maxW = W - 2 * M, maxH = H - y - 26, k = Math.min(maxW / pl.w, maxH / pl.h);
      doc.addImage(pl.url, 'PNG', M + (maxW - pl.w * k) / 2, y, pl.w * k, pl.h * k);
    }
    foot(pg.page);
    return doc.output('blob');
  }

  window.YSPdf = { make, svgToPng };
})();
