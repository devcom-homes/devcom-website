/* YardSuite: detached ARU (garden suite) rules by town, and the checker that compares
   a design against them. Rules researched Oct 31, 2026 from each town's newest by-law
   text and ARU pages. Every result is a planning guide only; the Town confirms. */
(function () {
  'use strict';
  const M2 = 10.7639;

  const PROVINCIAL = 'Ontario Reg. 462/24 (Nov 2024): on serviced urban lots a town cannot cap total lot coverage below 45%, set a minimum lot size for ARUs, or require more than 4 m between buildings. Where a town rule is stricter, the Province may override it; confirm with the Town.';

  const RULES = {
    collingwood: {
      name: 'Collingwood', asOf: 'Zoning By-law 2010-040 (consolidated Apr 2026) and By-law 2024-053', confidence: 'high',
      unitsPerBuilding: 2, maxArus: 3, maxUnitsLot: 4,
      heightM: 7.5, heightLesserOfHouse: true, flatHeightM: null, maxStoreys: null,
      gfaM2: null, gfaPctHouse: null, gfaRule: null,
      coverage: { pct: 15, scope: 'accessory', note: 'All detached accessory buildings together, including the suite, up to 15% of the lot.' },
      maxDimM: null,
      setbacks: { side: 1.5, rear: 1.5, extSide: 3, front: 6, text: '1.5 m side and rear, 3 m on a corner side, 6 m front and never closer to the street than the house' },
      parking: '1 space per suite, 2 at most for all suites',
      extra: ['Each suite needs its own outside door.', 'Rapid ARU incentive and pre-approved designs may apply; ask the Town.'],
      sources: [{ t: 'Town of Collingwood, Rapid ARU Initiative', u: 'https://www.collingwood.ca/rapidARU' }, { t: 'Zoning By-law 2010-040, consolidated Apr 2026', u: 'https://www.collingwood.ca/zoning-law' }],
      contact: 'ARU@collingwood.ca or planning@collingwood.ca'
    },
    bluemountains: {
      name: 'The Blue Mountains', asOf: 'By-law 2024-31 amending Zoning By-law 2018-65', confidence: 'medium',
      unitsPerBuilding: 2, maxArus: 2, maxUnitsLot: 3,
      heightM: 5, heightLesserOfHouse: false, flatHeightM: null, maxStoreys: null,
      gfaM2: 100, gfaPctHouse: 50, gfaRule: 'greater',
      coverage: { pct: 10, perUnitBonus: 5, scope: 'accessory', note: 'Accessory buildings up to 10% of the lot, plus 5% for each suite in the building.' },
      maxDimM: null,
      setbacks: { side: null, rear: 1.2, extSide: null, front: null, text: '1.2 m rear; other yards the same as the house in your zone' },
      parking: '1 space per suite',
      extra: ['Suite floor area up to 100 m² or half of the house, whichever is greater.', 'Height 5 m (8 m if the suite sits over a garage).', 'No detached suites on Niagara Escarpment Plan lots.', 'Not allowed on a lot used for short-term rentals.'],
      sources: [{ t: 'The Blue Mountains, Additional Residential Units Guide (2024)', u: 'https://thebluemountains.ca/sites/default/files/2024-08/Additional%20Residential%20Units%20Guide.pdf' }, { t: 'Notice of Decision, By-law 2024-31', u: 'https://www.thebluemountains.ca/sites/default/files/2024-04/Notice%20of%20Decision%20-%20P3354%20Additional%20Residential%20Unit%20%28ARU%29%20Zoning%20By-law%20Amendment.pdf' }],
      contact: 'Planning, 519-599-3131 ext. 263'
    },
    wasaga: {
      name: 'Wasaga Beach', asOf: 'Zoning By-law 2003-60 (June 2025 consolidation); new by-law in draft', confidence: 'low',
      unitsPerBuilding: 1, maxArus: 2, maxUnitsLot: 3,
      heightM: 5, heightLesserOfHouse: false, flatHeightM: 3.5, maxStoreys: 1,
      gfaM2: null, gfaPctHouse: 45, gfaRule: 'pct',
      coverage: { capM2: 65, scope: 'accessory', note: 'All detached accessory buildings together up to 65 m² (about 700 sq ft).' },
      maxDimM: 9,
      setbacks: { side: 0.9, rear: 0.9, extSide: null, front: null, text: '0.9 m side and rear, behind the front of the house, 1.2 m from other buildings' },
      parking: '1 extra space for the suite',
      extra: ['The Town\'s by-law has not been updated for detached suites; Provincial rules allow one on serviced lots. A new zoning by-law is in draft and may change these numbers.', 'One storey, 5 m to the peak (3.5 m flat roof), no side longer than 9 m.', 'No short-term rental of the suite.'],
      sources: [{ t: 'Wasaga Beach Zoning By-law 2003-60, 2025 consolidation', u: 'https://www.wasagabeach.com/media/lcrkd0rm/zoning-by-law-2003-60-2025-office-consolidation.pdf' }, { t: 'Engage Wasaga, new zoning by-law', u: 'https://engagewasaga.ca/zoning-bylaw-update' }],
      contact: 'Planning, 705-429-3844 ext. 2283'
    },
    meaford: {
      name: 'Meaford', asOf: 'By-law 2024-24 amending Zoning By-law 60-2009', confidence: 'medium',
      unitsPerBuilding: 1, maxArus: 2, maxUnitsLot: 3,
      heightM: 5.5, heightLesserOfHouse: false, flatHeightM: null, maxStoreys: null,
      gfaM2: null, gfaPctHouse: 90, gfaRule: 'pct',
      coverage: { pct: 15, scope: 'suite', note: 'The suite building up to 15% of the lot (urban zones).' },
      maxDimM: null,
      setbacks: { side: null, rear: 4, extSide: null, front: null, text: '4 m rear; side yards the same as the house; not in front of the house' },
      parking: 'Up to 1 space per suite',
      extra: ['Suite up to 90% of the house\'s floor area.', 'Urban zones 5.5 m tall; rural zones 6 m.', 'Rural lots need 0.8 ha unless on Town services.'],
      sources: [{ t: 'Meaford, Notice of Passing, By-law 2024-24 (ARUs)', u: 'https://www.meaford.ca/en/business-development/resources/Documents/Zoning-Updates/Notice-of-Passing-ZBA-2024-24-ARU-Update.pdf' }],
      contact: 'planning@meaford.ca, 519-538-1060 ext. 1127'
    },
    clearview: {
      name: 'Clearview', asOf: 'Zoning By-law 06-54 (consolidated Apr 2025); new by-law in draft', confidence: 'medium',
      unitsPerBuilding: 1, maxArus: 2, maxUnitsLot: 3,
      heightM: 4.5, heightLesserOfHouse: false, flatHeightM: null, maxStoreys: null,
      gfaM2: 111, gfaPctHouse: null, gfaRule: 'cap',
      coverage: null,
      maxDimM: null,
      setbacks: { side: 1.2, rear: 1.2, extSide: null, front: null, text: '1.2 m side and rear, behind the front of the house' },
      parking: '1 space per suite',
      extra: ['Suite living space up to 111 m² (about 1,195 sq ft).', 'Height 4.5 m in Stayner, Creemore and New Lowell residential zones (6 m to 8 m in rural zones).', 'Accessory building size caps of 52 to 100 m² by zone may also apply; the Township confirms.', 'A new zoning by-law in draft would drop the size cap and allow 2 suites per lot in towns.'],
      sources: [{ t: 'Clearview Zoning By-law 06-54, April 2025 consolidation', u: 'https://www.clearview.ca/sites/default/files/2025-12/Consolidated_Copy_of_Zoning_By-law_06-54_April%202025.pdf' }, { t: 'Clearview Zoning By-law Review', u: 'https://www.clearview.ca/ZBLReview' }],
      contact: 'plan@clearview.ca, 705-428-6230'
    },
    other: {
      name: 'Another town', asOf: 'Provincial minimum only', confidence: 'low',
      unitsPerBuilding: 1, maxArus: 2, maxUnitsLot: 3,
      heightM: null, heightLesserOfHouse: false, flatHeightM: null, maxStoreys: null,
      gfaM2: null, gfaPctHouse: null, gfaRule: null, coverage: null, maxDimM: null,
      setbacks: { side: null, rear: null, extSide: null, front: null, text: 'Set by your town\'s zoning by-law' },
      parking: 'Up to 1 space per suite (Planning Act cap)',
      extra: ['Ontario allows at least one suite in a detached building on serviced urban lots. We\'ll check your town\'s by-law in your assessment.'],
      sources: [{ t: 'O. Reg. 462/24, Additional Residential Units', u: 'https://www.ontario.ca/laws/regulation/r24462' }],
      contact: 'your town\'s planning department'
    }
  };

  const TOWN_MATCH = [
    ['collingwood', /collingwood/i],
    ['bluemountains', /blue mountains|thornbury|clarksburg|craigleith|camperdown|ravenna/i],
    ['wasaga', /wasaga/i],
    ['meaford', /meaford|leith|annan|bognor/i],
    ['clearview', /clearview|stayner|creemore|new lowell|nottawa|duntroon|singhampton|batteaux/i]
  ];
  function detectTown(text) { for (const [k, re] of TOWN_MATCH) if (re.test(text || '')) return k; return null; }

  const sqft = (m2) => Math.round(m2 * M2);
  const fmt = (n) => Math.round(n).toLocaleString('en-CA');

  // What the lot allows, before any design is chosen.
  function allowance(townKey, lot) {
    const r = RULES[townKey] || RULES.other;
    const out = { rules: r, units: Math.max(0, Math.min(r.unitsPerBuilding, r.maxArus - (lot.existingArus || 0))), maxFootprintSqft: null, maxFloorSqft: null, heightM: r.heightM, lines: [] };
    if (r.heightM && r.heightLesserOfHouse && lot.houseHeightM) out.heightM = Math.min(r.heightM, lot.houseHeightM);
    if (r.coverage && lot.lotSqft) {
      if (r.coverage.pct) {
        const pct = r.coverage.pct + (r.coverage.perUnitBonus || 0) * Math.max(1, out.units);
        const existing = r.coverage.scope === 'accessory' ? (lot.existingSqft || 0) : 0;
        out.maxFootprintSqft = Math.max(0, lot.lotSqft * pct / 100 - existing);
        out.coveragePct = pct;
      }
    }
    if (r.coverage && r.coverage.capM2) out.maxFootprintSqft = Math.max(0, sqft(r.coverage.capM2) - (lot.existingSqft || 0));
    const house = lot.houseGfaSqft || 0;
    if (r.gfaRule === 'greater') out.maxFloorSqft = Math.max(sqft(r.gfaM2), house * r.gfaPctHouse / 100);
    else if (r.gfaRule === 'pct' && house) out.maxFloorSqft = house * r.gfaPctHouse / 100;
    else if (r.gfaRule === 'cap') out.maxFloorSqft = sqft(r.gfaM2);
    return out;
  }

  // Compare a design to the rules. kind: 'variance' (size, height, setbacks) or 'rezoning' (number of units)
  function check(townKey, lot, design, look, heightM, lotFit) {
    const r = RULES[townKey] || RULES.other;
    const a = allowance(townKey, lot);
    const items = [];
    const add = (ok, label, detail, kind) => items.push({ ok, label, detail, kind: ok === false ? (kind || 'variance') : null });

    const foot = design.W * design.D, floor = foot * design.storeys;
    // units
    const unitsOk = design.units <= r.unitsPerBuilding && (lot.existingArus || 0) + design.units <= r.maxArus;
    add(unitsOk, 'Number of suites', unitsOk ? `${design.units} allowed in one building` : `${r.name} allows ${r.unitsPerBuilding} suite${r.unitsPerBuilding > 1 ? 's' : ''} per building and ${r.maxArus} extra units per lot`, 'rezoning');
    // height
    if (a.heightM) {
      const cap = (look.roof === 'flat' && r.flatHeightM) ? Math.min(a.heightM, r.flatHeightM) : a.heightM;
      add(heightM <= cap + 0.01, 'Height', `about ${heightM.toFixed(1)} m vs ${cap.toFixed(1)} m allowed${r.heightLesserOfHouse ? ' (or your house height, if lower)' : ''}`);
    }
    if (r.maxStoreys) add(design.storeys <= r.maxStoreys, 'Storeys', `${design.storeys} vs ${r.maxStoreys} allowed`);
    // floor area
    if (a.maxFloorSqft) add(floor <= a.maxFloorSqft + 1, 'Floor area', `${fmt(floor)} sq ft vs ${fmt(a.maxFloorSqft)} sq ft allowed`);
    else if (r.gfaRule === 'pct' && !lot.houseGfaSqft) add(null, 'Floor area', `limit is ${r.gfaPctHouse}% of your house; add your house size to check`);
    // coverage
    if (a.maxFootprintSqft !== null) add(foot <= a.maxFootprintSqft + 1, 'Lot coverage', `${fmt(foot)} sq ft footprint vs ${fmt(a.maxFootprintSqft)} sq ft available`);
    else if (r.coverage && r.coverage.pct && !lot.lotSqft) add(null, 'Lot coverage', 'add your lot size to check');
    // longest side
    if (r.maxDimM) { const longest = Math.max(design.W, design.D) * 0.3048; add(longest <= r.maxDimM + 0.01, 'Longest side', `${longest.toFixed(1)} m vs ${r.maxDimM} m allowed`); }
    // setbacks from the lot map
    if (lotFit && lotFit.fits !== null) {
      const need = Math.min(...[r.setbacks.side, r.setbacks.rear].filter(v => v != null).concat([99]));
      if (!lotFit.fits) add(false, 'Setbacks', 'part of the suite is outside your lot line on the map');
      else if (need < 99) add(lotFit.closestM >= need - 0.01, 'Setbacks', `closest lot line ${lotFit.closestM.toFixed(1)} m vs ${need} m minimum (side/rear)`);
    }
    const fails = items.filter(i => i.ok === false);
    const status = fails.length === 0 ? 'fits' : fails.some(f => f.kind === 'rezoning') ? 'rezoning' : 'variance';
    return { status, items, allowance: a, rules: r };
  }

  function townOptions() { return Object.keys(RULES).filter(k => RULES[k]).map(k => [k, RULES[k].name]); }

  window.YS_RULES = { RULES, PROVINCIAL, detectTown, allowance, check, townOptions, sqft };
})();
