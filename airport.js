/* LGA Configuration Playbook — airport definition for playbook-core v1.
   Source: vZNY LGA SOP Rev. 5 and its N90, EWR and JFK letters of agreement. For VATSIM use only. */
Playbook.start(H => {
'use strict';
const {$, esc, parseAtis, uniq, inRange, minRvr, isVMC, meets, windStr, wxStr, verdict, gateCell, cur, pad, fmtVis, num, checked, zulu} = H;
const GATE = {N:'North', E:'East', S:'South', W:'West'};

const PAGES = [
  {id:'overview', n:'Start', r:'Overview'},
  {id:'p1', n:'Page 1', r:'22 / 13'},
  {id:'p2', n:'Page 2', r:'31 / 4'},
  {id:'p3', n:'Page 3', r:'4 / 13'},
  {id:'p4', n:'Page 4', r:'22 / 31'},
  {id:'p5', n:'Page 5', r:'ILS 4 / 31'},
  {id:'p6', n:'Page 6', r:'ILS 13 / 4'},
  {id:'p7', n:'Page 7', r:'CAT II 22/13'},
  {id:'p8', n:'Page 8', r:'CAT II 22/31'},
  {id:'p9', n:'Page 9', r:'28+ kt'},
  {id:'v4', n:'VFR', r:'Depart 4'},
  {id:'v31', n:'VFR', r:'Depart 31'},
  {id:'v22', n:'VFR', r:'Depart 22'},
  {id:'v13w', n:'VFR', r:'13 Whitestone'},
  {id:'v13c', n:'VFR', r:'13 All climbs'},
  {id:'v13f', n:'VFR', r:'13 Flushing/TNNIS'},
  {id:'taxi', n:'Ground', r:'Taxi routes'},
  {id:'p10', n:'Page 10', r:'Live strips'}
];
const PAGE_BY_PAIR = {'22/13':'p1','31/4':'p2','4/13':'p3','22/31':'p4','4/31':'p5','13/4':'p6','4/4':'p9','13/13':'p9','22/22':'p9','31/31':'p9'};
const PAGE_LABEL = Object.fromEntries(PAGES.map(p => [p.id, p.n]));
function pairFrom(parsed){
  if (!parsed) return null;
  const L = parsed.land.filter(r => /^(4|13|22|31)$/.test(r));
  const D = parsed.dep.filter(r => /^(4|13|22|31)$/.test(r));
  if (!L.length || !D.length) return {land:L[0] || null, dep:D[0] || null};
  return {land:L[0], dep:D[0]};
}
function pageFor(pair, p){
  if (!pair || !pair.land || !pair.dep) return null;
  const key = pair.land + '/' + pair.dep;
  let id = PAGE_BY_PAIR[key] || null;
  const rvr = minRvr(p);
  if (rvr !== null && rvr < 2400 && rvr >= 1200){
    if (key === '22/13') id = 'p7';
    if (key === '22/31') id = 'p8';
  }
  return id;
}

// SOP runway selection table → {land, dep, appr, page, why}
function sopPick(p, jfk){
  if (jfk && jfk.ils13L) return {land:'13', dep:'4', appr:'ILS 13', page:'p6', why:'JFK landing ILS 13L forces ILS 13 (depart 4 or 13)'};
  if (!p || !p.wind) return null;
  const rvr = minRvr(p);
  const {dir, spd, vrb} = p.wind;
  if (rvr !== null && rvr < 1200) return {land:null, dep:null, appr:'—', page:null, why:'RVR below 1,200 ft: LGA closed (CAT III)'};
  if (rvr !== null && rvr < 2400){
    if (spd <= 4 || vrb || inRange(dir, 45, 224)) return {land:'22', dep:'13', appr:'ILS 22 (CAT II)', page:'p7', why:'CAT II, wind ' + windStr(p.wind)};
    return {land:'22', dep:'31', appr:'ILS 22 (CAT II)', page:'p8', why:'CAT II, wind ' + windStr(p.wind)};
  }
  if (spd <= 4) return {land:'22', dep:'13', appr:'ILS 22', page:'p1', why:'Wind 0–4 kt'};
  if (vrb) return null;
  const vmc = isVMC(p);
  if (spd <= 27){
    if (inRange(dir, 315, 44)){
      if (vmc) return {land:'31', dep:'4', appr:'RNAV X 31', page:'p2', why:'5–27 kt from 315–044, VMC'};
      if (meets(p, 600, 1.75)) return {land:'31', dep:'4', appr:'RNAV Z 31', page:'p2', why:'5–27 kt from 315–044, IMC ≥ 600/1¾'};
      if (meets(p, 300, 1)) return {land:'4', dep:'31', appr:'ILS 4', page:'p5', why:'5–27 kt from 315–044, IMC < 600/1¾'};
      return {land:null, dep:null, appr:'—', page:null, why:'315–044 wind below 300/1: not covered by the SOP'};
    }
    if (inRange(dir, 45, 134)){
      if (vmc || meets(p, 300, 1)) return {land:'4', dep:'13', appr:'ILS 4', page:'p3', why:'5–27 kt from 045–134'};
      return {land:'13', dep:'4', appr:'ILS 13', page:'p6', why:'045–134 wind, below 300/1'};
    }
    const split = spd <= 14 ? 259 : 224;
    if (dir >= 135 && dir <= split) return {land:'22', dep:'13', appr:'ILS 22', page:'p1', why:(spd <= 14 ? '5–14 kt from 135–259' : '15–27 kt from 135–224')};
    return {land:'22', dep:'31', appr:'ILS 22', page:'p4', why:(spd <= 14 ? '5–14 kt from 260–314' : '15–27 kt from 225–314')};
  }
  if (inRange(dir, 360, 89) || dir === 0) return {land:'4', dep:'4', appr:'ILS 4', page:'p9', why:'28+ kt from 360–089'};
  if (inRange(dir, 90, 179)) return {land:'13', dep:'13', appr: vmc ? 'RNAV Y 13' : 'ILS 13', page:'p9', why:'28+ kt from 090–179'};
  if (inRange(dir, 180, 269)) return {land:'22', dep:'22', appr:'ILS 22', page:'p9', why:'28+ kt from 180–269'};
  return {land:'31', dep:'31', appr:'RNAV Z 31', page:'p9', why:'28+ kt from 270–359'};
}

function jfkState(p, present){
  if (!present) return {present:false, belmont:true, coney:true, ils13L:false, ext:false, land:[], dep:[], note:'JFK ATIS not available: per the SOP, treat all conditional airspace as JFK\'s.'};
  const land = p.land, dep = p.dep;
  const ils13L = p.appr.some(a => a.rwy === '13L' && a.kind === 'ILS');
  const coney13 = p.appr.some(a => a.rwy === '13L' && /RNAV|GPS|VOR|PARKWAY|PARK/.test(a.kind));
  const dep31 = dep.some(r => /^31[LR]?$/.test(r));
  const belmont = land.some(r => r === '22L' || r === '22R');
  const coney = ils13L || coney13 || dep31;
  const both22 = land.includes('22L') && land.includes('22R');
  return {present:true, belmont, coney, ils13L, coney13, dep31, both22, land, dep};
}
/* Exit fixes per departure gate (SOP Valid Exits) */
const GATE_FIXES = {
  North:['COATE','NEION','HAAYS','GAYEL','SAX'],
  East: ['MERIT','GREKI','BAAYS','CMK','BDR'],
  South:['WHITE','DIXIE','SHIPP','WAVEY'],
  West: ['BIGGY','LANNA','PARKE','ELIOT','NEWEL','ZIMMZ','SBJ']
};
/* SID assignment by gate for the current LGA config */
function sidRows(pair, owns, jfk, lgaP){
  if (!pair || !pair.dep) return [];
  const d = pair.dep, L = pair.land;
  const lgaRnav13 = lgaP && lgaP.appr.some(a => a.rwy === '13' && /RNAV|GPS|RIVER/.test(a.kind));
  if (d === '13'){
    let rows;
    if (jfk.ils13L) rows = [['All gates','FLUSHING']];
    else if (owns.belmont && !owns.coney) rows = [['All gates','WHITESTONE']];
    else if (!owns.belmont && owns.coney){
      const nw = (L === '4' || lgaRnav13) ? 'TNNIS# / FLUSHING' : 'GLDMN# / MASPETH (climb via SID)';
      rows = [['North','' + nw],['East','TNNIS# / FLUSHING'],['South','NTHNS# / CONEY (climb via SID)'],['West', nw]];
    } else if (owns.belmont && owns.coney) rows = [['North','WHITESTONE'],['East','WHITESTONE'],['South','CONEY / NTHNS# (climb via SID)'],['West','WHITESTONE']];
    else rows = [['All gates','TNNIS# / FLUSHING'],['Props','FLUSHING']];
    if (jfk.extActive) rows = rows.map(([g, s]) => [g, /FLUSHING|TNNIS/.test(s) && !/WHITESTONE/.test(s) ? 'RWY HDG to LGA 2.5 DME, then left HDG 040' : s]);
    return rows;
  }
  if (d === '4'){
    if (L === '13') return [['All gates','LaGuardia# except fly heading 070']];
    return [['West','BRONX climb'],['WHITE (jets)','BRONX climb'],['North / East / South (not WHITE jets)','PELHAM climb']];
  }
  if (d === '31'){
    if (L === '4') return [['All gates','LaGuardia# except fly heading 360']];
    if (L === '22') return [['All gates','LaGuardia# except fly heading 355']];
    if (L === '31') return [['West, WHITE jets','LaGuardia# except fly heading 360'],['North / East / South (not WHITE jets)','LaGuardia# except fly heading 020']];
  }
  if (d === '22'){
    return owns.coney
      ? [['South (jets)','HOPEA# (or LaGuardia# except fly heading 190)'],['North / East / West · South props','JUTES#']]
      : [['All gates','JUTES# (or LaGuardia# as published)']];
  }
  return [];
}

const MISSED = {
  '4/4':'HDG 340 · 2,000 (coord 3,000) · Departure · stop LGA departures',
  '4/13':'RWY HDG · 2,000 (coord 3,000) · HAARP',
  '4/31':'RWY HDG · 2,000 (coord 3,000) · HAARP',
  '13/4':'RWY HDG · 2,000 (coord 3,000) · Departure · stop LGA departures',
  '13/13':'HDG 080 · 2,000 (coord 3,000) · Departure · stop LGA departures',
  '22/13':'RWY HDG · 2,000 (coord 3,000) · EMPYR · stop LGA departures when MASPETH/GLDMN# in use',
  '22/22':'RWY HDG · 2,000 (coord 3,000) · EMPYR · stop LGA departures',
  '22/31':'RWY HDG · 2,000 (coord 3,000) · EMPYR',
  '31/4':'HDG 340 · 3,000 · Departure · stop LGA departures',
  '31/31':'HDG 040 · 3,000 · FINAL · stop LGA departures'
};
function active(){
  const lgaA = cur('LGA'), jfkA = cur('JFK'), ewrA = cur('EWR');
  const lga = lgaA ? parseAtis(lgaA.text) : null;
  const jfkP = jfkA ? parseAtis(jfkA.text) : null;
  const ewr = ewrA ? parseAtis(ewrA.text) : null;
  // A real-world JFK ATIS means JFK isn't staffed on VATSIM: the SOP's unstaffed rule applies to airspace.
  const jfkRw = !!(jfkA && jfkA.rw);
  const jfk = jfkState(jfkP, !!jfkA && !jfkRw);
  const unstaffedTxt = jfkRw ? 'JFK (not staffed on VATSIM)' : 'JFK (unstaffed rule)';
  const pair = pairFrom(lga);
  const pageId = pageFor(pair, lga);
  const pick = sopPick(lga, jfk);

  // LGA ownership
  const lgaDep13or22 = pair && (pair.dep === '13' || pair.dep === '22');
  const owns = {
    belmont: jfk.present ? !jfk.belmont : false,
    coney: jfk.present ? (!jfk.coney && lgaDep13or22 && jfk.land.some(r => /^(4|22)[LR]?$/.test(r)) && !jfk.land.some(r => /^13/.test(r))) : false
  };
  const ifr = lga && lga.ceil !== null && lga.vis !== null && !isVMC(lga);
  const extEligible = jfk.present && jfk.both22 && pair && pair.land === '22' && pair.dep === '13' && ifr && !(lga && lga.climbs.includes('FLUSHING'));
  jfk.extActive = false; // ownership of the Extension is by coordination; show as eligible only

  // Shared with Page 10 so strips get departure procedures for the active configuration.
  const ctx = (lga && pair && pair.land && pair.dep) ? {pair, owns, jfk, lga} : null;
  const liveVfr = vfrPageFor(ctx);

  if (!lga){
    return {ctx, liveVfr, pageId: null, html: '<div class="col"><div class="cfg-big"><small>Active LGA configuration</small>No LGA ATIS</div>' +
      '<p>Refresh live ATIS, or paste the LGA ATIS above. The Playbook pages below work without it.</p></div>'};
  }
  const cfgTxt = pair && pair.land && pair.dep ? 'Land ' + pair.land + ' / Depart ' + pair.dep : 'Runways not found in ATIS';
  const apprTxt = lga.appr.length ? uniq(lga.appr.map(a => a.kind + (a.variant ? ' ' + a.variant : '') + ' ' + a.rwy)).join(', ') : '—';

  // checks
  const checks = [];
  if (pick){
    const match = pick.land && pair && pick.land === pair.land && pick.dep === pair.dep;
    checks.push(['SOP selection table', pick.land ? 'Land ' + pick.land + ' / Depart ' + pick.dep + ' (' + pick.appr + ') — ' + pick.why : pick.why,
      !pick.land ? verdict('warn', 'Check') : match ? verdict('pass', 'Pass') : verdict('fail', 'Fail')]);
  } else {
    checks.push(['SOP selection table', 'Wind not readable from the ATIS', verdict('na', 'n/a')]);
  }
  if (jfk.ils13L) checks.push(['JFK ILS 13L override', 'LGA must land ILS 13', pair && pair.land === '13' ? verdict('pass','Pass') : verdict('fail','Fail')]);
  if (pair && pair.dep === '22' && !(pick && pick.dep === '22')) checks.push(['Avoid departing 22', 'Departing 22 outside 28+ kt winds', verdict('warn','Check')]);
  if (pair && pair.dep === '13' && jfk.present && jfk.land.includes('13L') && lga.appr.length && jfk.both22) checks.push(['JFK 22L/R + 13L overflow', 'Jets/turboprops on TNNIS#, props on FLUSHING', verdict('warn','Check')]);
  if (pair && pair.land === '31' && jfk.present && jfk.land.some(r => /^13/.test(r)) && !jfk.coney13) checks.push(['JFK approaches to 13L/R', 'Not allowed with LGA on LOC/RNAV Z 31 (Parkway Visual OK)', verdict('fail','Fail')]);

  const sids = sidRows(pair, owns, jfk, lga);
  const missKey = pair ? pair.land + '/' + pair.dep : '';

  const html =
    '<div class="col">' +
      '<div class="cfg-big"><small>' + (H.test.on ? '<span class="v-fail">Test configuration · not live</span>' : 'Active LGA configuration · ATIS ' + esc(lgaA.code || '–')) + '</small>' + esc(cfgTxt) + '</div>' +
      '<div class="atis-meta"><span class="chip">APCH <b>' + esc(apprTxt) + '</b></span><span class="chip">' + esc(windStr(lga.wind)) + '</span><span class="chip">' + esc(wxStr(lga)) + '</span>' +
      (pageId ? '<a class="chip" href="#' + pageId + '"><b>' + esc(PAGE_LABEL[pageId]) + '</b> →</a>' : '<span class="chip">No Playbook page for this pair</span>') + '</div>' +
      '<div class="tw"><table><thead><tr><th>Check</th><th>Detail</th><th>Verdict</th></tr></thead><tbody>' +
        checks.map(c => '<tr><td>' + esc(c[0]) + '</td><td>' + esc(c[1]) + '</td><td>' + c[2] + '</td></tr>').join('') +
      '</tbody></table></div>' +
      (MISSED[missKey] ? '<p style="font-size:.9rem"><b>Missed approach:</b> ' + esc(MISSED[missKey]) + '</p>' : '') +
    '</div>' +
    '<div class="col">' +
      '<div class="tw"><table><thead><tr><th>Airspace</th><th>Owner</th></tr></thead><tbody>' +
        '<tr><td>Belmont</td><td>' + (jfk.present ? (jfk.belmont ? 'JFK (landing 22L/R)' : 'LGA') : unstaffedTxt) + '</td></tr>' +
        '<tr><td>Coney</td><td>' + (jfk.present ? (jfk.coney ? 'JFK' + (jfk.ils13L ? ' (ILS 13L)' : jfk.dep31 ? ' (departing 31)' : ' (13L approach)') : owns.coney ? 'LGA (by coordination)' : 'Not delegated to LGA') : unstaffedTxt) + '</td></tr>' +
        '<tr><td>Belmont Extension</td><td>' + (extEligible ? 'JFK may request it (confirm HPN not landing 34)' : 'Stays with LGA') + '</td></tr>' +
        '<tr><td>JFK runways' + (jfkRw ? ' (real world)' : '') + '</td><td class="num">' + (jfkP ? 'LDG ' + esc(jfkP.land.join(', ') || '—') + ' · DEP ' + esc(jfkP.dep.join(', ') || '—') : '—') + '</td></tr>' +
        '<tr><td>EWR runways</td><td class="num">' + (ewr ? 'LDG ' + esc(ewr.land.join(', ') || '—') + ' · DEP ' + esc(ewr.dep.join(', ') || '—') : '—') + '</td></tr>' +
      '</tbody></table></div>' +
      (sids.length ? '<div class="tw"><table><thead><tr><th>Gate</th><th>Assign</th></tr></thead><tbody>' +
        sids.map(r => '<tr><td>' + gateCell(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>').join('') +
        '</tbody></table></div><p class="note">Initial altitude 5,000 ft. DIXIE via the JFK VOR when departing 4 or 31, or without Coney.</p>' : '') +
    '</div>';
  return {ctx, liveVfr, pageId, html};
}
const DD_GROUPS = [
  {key:'cfg', ids:['p1','p2','p3','p4','p5','p6','p7','p8','p9'], n:'Pages 1–9', r:'Configurations', live: () => H.state.livePage, pageN: true, subLabel: 'Configuration pages'},
  {key:'vfr', ids:['v4','v31','v22','v13w','v13c','v13f'], n:'VFR', r:'Departures', live: () => H.state.liveVfr, dropN: true, subLabel: 'VFR Departures pages'}
];
// VFR page for the active configuration: by departure runway; runway 13 by the airspace ownership the IFR SID picks use
function vfrPageFor(ctx){
  if (!ctx || !ctx.pair || !ctx.pair.dep) return null;
  const d = ctx.pair.dep, o = ctx.owns, j = ctx.jfk;
  if (d === '4') return 'v4';
  if (d === '31') return 'v31';
  if (d === '22') return 'v22';
  if (d !== '13') return null;
  if (j.ils13L) return 'v13f';
  if (o.belmont) return 'v13w';
  if (o.coney) return 'v13c';
  return 'v13f';
}
/* ---------- taxi routes (SOP › Ground Control › Preferred Taxi Routes) ---------- */
// key 'depart/land'. E = east of runway 4/22 (Terminals B and C), W = west (Terminal A / MAT).
const TAXI = {
  '4/4':  {E:{in:'B', out:'A, E, B'},      W:{in:'R, B, cross RWY 4 at E, D or CY (if rolling through the RWY 13 intersection)', out:'AA'}},
  '4/13': {E:{in:'B', out:'A, E, B'},      W:{in:'B, P', out:'AA'}},
  '4/31': {E:{in:'B, E, A', out:'B'},      W:{in:'A, G', out:'AA'}},
  '13/4': {E:{in:'B', out:'A, E'},         W:{in:'R, B, cross RWY 4 at E, D or CY (if rolling through the RWY 13 intersection)', out:'AA or BB, sequenced with the east side'}},
  '13/13':{E:{in:'A', out:'A, E'},         W:{in:'A, E, cross RWY 4 at F, E, D or CY', out:'AA or BB, sequenced with the east side'}},
  '13/22':{E:{in:'B, E, A', out:'B, P'},   W:{in:'AA (Local may coordinate to taxi to the MAT)', out:'AA or BB, sequenced with the east side'}},
  '31/4': {E:{in:'A', out:'B'},            W:{in:'R, B, cross RWY 4 at E, D or CY (if rolling through the RWY 13 intersection)', out:'E, B'}},
  '31/22':{E:{in:'B, E, A', out:'B'},      W:{in:'AA (Local may coordinate to taxi to the MAT)', out:'P, B'}},
  '31/31':{E:{in:'B, E, A', out:'A or B'}, W:{in:'B, E', out:'E, A'}}
};
// Stands: [area, ref, lat, lon]; A Terminal A, BW / BE Terminal B West / East concourse, C Terminal C, R remote, W west ramp. © OpenStreetMap contributors
const STANDS = [["C","93",40.76796,-73.85962],["C","92",40.7677,-73.85989],["A","6",40.77398,-73.88365],["A","5",40.77379,-73.88345],["A","4",40.77354,-73.88349],["A","3",40.77343,-73.88378],["A","2",40.77345,-73.88417],["A","1",40.77344,-73.88477],["A","1A",40.77343,-73.88476],["BE","58",40.77296,-73.86945],["BE","58A",40.7729,-73.86939],["BE","57",40.77266,-73.86902],["BE","56",40.77241,-73.86861],["BE","55",40.77217,-73.86815],["BE","54",40.77249,-73.86766],["BE","53",40.77289,-73.8672],["BE","52",40.77325,-73.867],["BE","51",40.77363,-73.86712],["BE","51A",40.77366,-73.86719],["BE","47A",40.77433,-73.86803],["BE","47",40.77433,-73.86805],["BE","46",40.77467,-73.86805],["BE","45",40.77528,-73.86937],["BE","44",40.77511,-73.86964],["BE","43",40.77475,-73.86994],["BE","43A",40.77474,-73.87],["BW","28",40.7757,-73.87075],["BW","28A",40.77572,-73.87072],["BW","27",40.77602,-73.87066],["C","98",40.76942,-73.8585],["C","97",40.7691,-73.85873],["C","96",40.76886,-73.85901],["C","95",40.76862,-73.8593],["C","94",40.76838,-73.85959],["C","93",40.76814,-73.85989],["C","92",40.76797,-73.86008],["W","A",40.77912,-73.88223],["W","B",40.77946,-73.88195],["W","C",40.77981,-73.88167],["W","1",40.77942,-73.88366],["W","2",40.77948,-73.8831],["A","6",40.77418,-73.88298],["A","5",40.77365,-73.88294],["A","4",40.77316,-73.88321],["A","3",40.77313,-73.88383],["A","1",40.77308,-73.88475],["A","1A",40.77336,-73.88483],["BE","48",40.77394,-73.86812],["BE","48A",40.7741,-73.86794],["BE","48R",40.77403,-73.86814],["BE","42",40.77431,-73.87006],["C","61",40.77225,-73.86675],["C","63",40.77255,-73.8664],["C","65",40.7728,-73.8661],["C","67",40.77309,-73.86574],["C","69",40.77342,-73.86536],["C","73",40.77122,-73.86421],["C","79",40.77216,-73.86308],["C","78",40.77143,-73.86171],["C","76",40.77108,-73.86206],["C","74",40.77075,-73.86245],["C","72",40.77042,-73.86284],["C","70",40.77009,-73.86318],["C","86",40.76913,-73.86035],["C","88B",40.76979,-73.85968],["C","88A",40.76944,-73.85998],["C","62",40.77154,-73.86498],["C","64",40.77187,-73.86463],["C","68",40.77286,-73.86437],["C","66",40.77229,-73.86443],["BW","11",40.77473,-73.87224],["BW","12",40.77479,-73.87279],["BW","12A",40.77478,-73.87272],["BW","14",40.77513,-73.87305],["BW","14A",40.77497,-73.8732],["BW","15",40.77517,-73.87377],["BW","15A",40.77516,-73.87371],["BW","16",40.7752,-73.87427],["BW","16A",40.77519,-73.87421],["BW","17",40.77542,-73.87473],["BW","18",40.77581,-73.87443],["BW","18A",40.77577,-73.87448],["BW","19",40.77613,-73.87417],["BW","20",40.77638,-73.87383],["BW","22",40.77629,-73.87329],["BW","22A",40.77634,-73.87318],["BW","24A",40.77625,-73.87247],["BW","23",40.77629,-73.87277],["BW","24",40.77661,-73.87243],["BW","26",40.77644,-73.8719],["BW","29A",40.77543,-73.87123],["BW","29",40.77541,-73.87125],["BW","30A",40.77511,-73.87145],["BW","30",40.77495,-73.87138],["BW","31",40.77472,-73.87177],["C","89A",40.77072,-73.86122],["C","87",40.77042,-73.86148],["C","85",40.77009,-73.86176],["C","83",40.76969,-73.86228],["C","81",40.76945,-73.86253],["C","71",40.77099,-73.8646],["R","R2",40.77153,-73.86729],["R","R3",40.77141,-73.86768],["BE","41",40.77395,-73.87035],["BE","40/40A",40.77368,-73.87033],["BE","59",40.77334,-73.86969],["BE","59A",40.77328,-73.86966],["R","R18",40.77341,-73.87827],["R","R17",40.77375,-73.87789],["R","R16",40.774,-73.87775],["R","R15",40.77426,-73.87746],["R","R14",40.77462,-73.8772],["R","R13",40.77486,-73.87696],["R","R12",40.7752,-73.87672],["R","R11",40.77501,-73.87633],["R","R10",40.7748,-73.8759],["R","R9",40.77459,-73.87546],["R","R8",40.77441,-73.87516],["R","R7",40.77412,-73.87489],["R","R6",40.77432,-73.87464],["R","R5",40.77413,-73.87435],["R","R4",40.77431,-73.874],["C","80",40.76826,-73.86156],["W","5",40.77893,-73.88241],["W","7",40.77965,-73.88178],["W","6",40.77933,-73.88207],["W","8",40.77996,-73.88157],["A","2",40.77311,-73.88438],["C","89B",40.77019,-73.85983],["R","R1",40.77176,-73.86713],["C","77",40.77179,-73.86347],["C","75",40.77148,-73.86381],["C","84",40.76885,-73.86078]];
const AREA = {A:'Terminal A', BW:'Terminal B West', BE:'Terminal B East', C:'Terminal C', R:'Remote', W:'West ramp'};
const AREA_TAG = {A:'A', BW:'B', BE:'B', C:'C', R:'', W:'W'};
// Side of the runway 4/22 centerline (threshold 4 → threshold 22), in a local flat frame
const RWY422 = [[40.769167, -73.884123], [40.785438, -73.870683]];
function sideOf(lat, lon){
  const k = Math.cos(40.776 * Math.PI / 180), [a, b] = RWY422;
  const cross = (b[1] - a[1]) * k * (lat - a[0]) - (b[0] - a[0]) * (lon - a[1]) * k;
  return cross > 0 ? 'W' : 'E';
}
function nearestStand(lat, lon){
  const k = Math.cos(lat * Math.PI / 180);
  let best = null, bd = Infinity;
  STANDS.forEach(s => { const dy = (s[2] - lat) * 111320, dx = (s[3] - lon) * 111320 * k, d = Math.hypot(dx, dy); if (d < bd){ bd = d; best = s; } });
  return best && bd <= 45 ? {area: best[0], ref: best[1], m: Math.round(bd)} : null;
}
function taxiKey(ctx){ return ctx && ctx.pair && ctx.pair.dep && ctx.pair.land ? ctx.pair.dep + '/' + ctx.pair.land : null; }
// For one strip: where it is, which side, and the SOP outbound route for the active configuration
function taxiFor(x){
  const fp = x.fp || {};
  let side = null, stand = null, predicted = false;
  if (typeof x.lat === 'number'){ side = sideOf(x.lat, x.lon); stand = nearestStand(x.lat, x.lon); }
  else { side = /^NKS/.test(x.callsign || '') ? 'W' : 'E'; predicted = true; }
  const key = taxiKey(H.state.ctx), row = key && TAXI[key];
  return {side, stand, predicted, key, rwy: H.state.ctx ? H.state.ctx.pair.dep : null, out: row ? row[side].out : null,
    where: stand ? standTag(stand) + ' · ' + AREA[stand.area] : (predicted ? 'Not parked yet' : 'Off-stand'),
    sideLabel: side === 'W' ? 'WEST' : 'EAST', m: stand ? stand.m : undefined};
}
function standTag(s){ return s ? (AREA_TAG[s.area] + s.ref) : ''; }
function renderTaxi(){
  const key = taxiKey(H.state.ctx), row = key && TAXI[key];
  $('taxi-rows').innerHTML = Object.entries(TAXI).map(([k, r]) => {
    const [d, l] = k.split('/');
    return '<tr' + (k === key ? ' class="on"' : '') + '><td>' + d + '</td><td>' + l + '</td><td>' + esc(r.E.in) + '</td><td>' + esc(r.E.out) + '</td><td>' + esc(r.W.in) + '</td><td>' + esc(r.W.out) + '</td></tr>';
  }).join('');
  const box = $('taxi-live');
  if (!H.state.ctx){ box.innerHTML = '<p class="note">No active configuration: load or paste the LGA ATIS to highlight the routes in use.</p>'; return; }
  if (!row){ box.innerHTML = '<p class="note">Active configuration Depart ' + esc(H.state.ctx.pair.dep) + ' / Land ' + esc(H.state.ctx.pair.land) + ' has no row in the SOP taxi table.</p>'; return; }
  const side = (s, name) => '<div class="taxi-side"><h4>' + name + '</h4>' +
    '<span class="lbl">Outbound to RWY ' + esc(H.state.ctx.pair.dep) + '</span><span class="rt">' + esc(row[s].out) + '</span>' +
    '<span class="lbl">Inbound from RWY ' + esc(H.state.ctx.pair.land) + '</span><span class="rt">' + esc(row[s].in) + '</span></div>';
  box.innerHTML = '<p><b>Active: Depart ' + esc(H.state.ctx.pair.dep) + ' / Land ' + esc(H.state.ctx.pair.land) + '</b></p><div class="taxi-live">' +
    side('E', 'East side · Terminals B and C') + side('W', 'West side · Terminal A / MAT') + '</div>';
}
function buildTest(){
  const z = zulu();
  // LGA
  const appr = $('t-lga-appr').value, dep = $('t-lga-dep').value;
  const wd = num('t-lga-wd') ?? 0, ws = num('t-lga-ws') ?? 0, wg = num('t-lga-wg');
  const wind = ws === 0 ? '00000KT' : pad(wd === 0 ? 360 : wd, 3) + pad(ws, 2) + (wg ? 'G' + pad(wg, 2) : '') + 'KT';
  const ceil = num('t-lga-ceil'), vis = num('t-lga-vis') ?? 10, rvr = num('t-lga-rvr');
  const sky = ceil === null ? 'FEW250' : 'OVC' + pad(ceil / 100, 3);
  const landRwy = (appr.match(/(\d{1,2})$/) || [])[1] || '22';
  const rvrTxt = rvr === null ? '' : ' R' + landRwy + '/' + pad(rvr, 4) + 'FT';
  const test = H.test;
  test.atis.LGA = {text:'LGA ATIS INFO T ' + z + 'Z. ' + wind + ' ' + fmtVis(vis) + 'SM ' + sky + rvrTxt + ' 15/10 A2992. ' + appr + ' APCH IN USE. DEPG RWY ' + dep + '.', code:'T', time:z + 'Z', origin:'Test settings', rw:false};
  // JFK
  const ja = checked('t-jfk-appr'), jd = checked('t-jfk-dep');
  const jOn = $('t-jfk-on').checked;
  test.atis.JFK = (ja.length || jd.length)
    ? {text:'JFK ATIS INFO T ' + z + 'Z. 21010KT 10SM FEW250 15/10 A2992. ' + ja.map(a => a + ' APCH IN USE.').join(' ') + ' ' + jd.map(r => 'DEPG RWY ' + r + '.').join(' '), code:'T', time:z + 'Z', origin: jOn ? 'Test settings' : 'Test settings · not staffed on VATSIM', rw:!jOn}
    : null;
  if (!jOn && !test.atis.JFK) test.atis.JFK = null;
  // EWR
  test.atis.EWR = $('t-ewr-on').checked
    ? {text:'EWR ATIS INFO T ' + z + 'Z. 21010KT 10SM FEW250 15/10 A2992. ' + $('t-ewr-appr').value + ' APCH IN USE. DEPG RWY ' + $('t-ewr-dep').value + '.', code:'T', time:z + 'Z', origin:'Test settings', rw:false}
    : null;
}

const PRESETS = [
  {label:'Page 1 · 22/13', lga:['ILS RWY 22','13',200,10,null,null,10,null], jfk:[true,['ILS RWY 22L','ILS RWY 22R'],['22R']], ewr:[true,'ILS RWY 22L','22R']},
  {label:'Page 2 · 31/4', lga:['RNAV X RWY 31','4',340,12,null,null,10,null], jfk:[true,['ILS RWY 31R'],['31L']], ewr:[true,'ILS RWY 4R','4L']},
  {label:'Page 3 · 4/13', lga:['ILS RWY 4','13',70,12,null,2500,5,null], jfk:[true,['ILS RWY 4R'],['4L']], ewr:[true,'ILS RWY 4R','4L']},
  {label:'Page 4 · 22/31', lga:['ILS RWY 22','31',280,14,null,null,10,null], jfk:[true,['ILS RWY 22L'],['22R']], ewr:[true,'ILS RWY 22L','22R']},
  {label:'Page 5 · ILS 4/31', lga:['ILS RWY 4','31',360,14,null,500,1.5,null], jfk:[true,['ILS RWY 4R'],['4L']], ewr:[true,'ILS RWY 4R','4L']},
  {label:'Page 6 · JFK ILS 13L', lga:['ILS RWY 13','4',120,10,null,1500,4,null], jfk:[true,['ILS RWY 13L'],['13R']], ewr:[true,'ILS RWY 22L','22R']},
  {label:'Page 7 · CAT II', lga:['ILS RWY 22','13',180,6,null,100,0.25,1800], jfk:[true,['ILS RWY 22L','ILS RWY 22R'],['22R']], ewr:[true,'ILS RWY 22L','22R']},
  {label:'Page 9 · 28+ kt', lga:['ILS RWY 22','22',220,32,44,3000,10,null], jfk:[true,['ILS RWY 22L'],['22R']], ewr:[true,'ILS RWY 22L','22R']},
  {label:'JFK unstaffed', lga:['ILS RWY 22','13',200,8,null,null,10,null], jfk:[false,[],[]], ewr:[true,'ILS RWY 22L','22R']},
  {label:'SOP mismatch', lga:['ILS RWY 4','13',20,8,null,null,10,null], jfk:[true,['ILS RWY 22L','ILS RWY 22R'],['31L']], ewr:[true,'ILS RWY 4R','4L']}
];
function applyPreset(p){
  const [appr, dep, wd, ws, wg, ceil, vis, rvr] = p.lga;
  $('t-lga-appr').value = appr; $('t-lga-dep').value = dep;
  $('t-lga-wd').value = wd; $('t-lga-ws').value = ws; $('t-lga-wg').value = wg ?? '';
  $('t-lga-ceil').value = ceil ?? ''; $('t-lga-vis').value = vis; $('t-lga-rvr').value = rvr ?? '';
  $('t-jfk-on').checked = p.jfk[0];
  $('t-jfk-appr').querySelectorAll('input').forEach(i => { i.checked = p.jfk[1].includes(i.value); });
  $('t-jfk-dep').querySelectorAll('input').forEach(i => { i.checked = p.jfk[2].includes(i.value); });
  $('t-ewr-on').checked = p.ewr[0]; $('t-ewr-appr').value = p.ewr[1]; $('t-ewr-dep').value = p.ewr[2];
  H.onTestChange();
}
// SOP › Clearance Delivery › Valid Exits
const EXITS = {SAX:'N', COATE:'N', NEION:'N', HAAYS:'N', GAYEL:'N',
  GREKI:'E', MERIT:'E', BAAYS:'E', CMK:'E', BDR:'E',
  DIXIE:'S', WHITE:'S', SHIPP:'S', WAVEY:'S',
  SBJ:'W', BIGGY:'W', LANNA:'W', PARKE:'W', ELIOT:'W', NEWEL:'W', ZIMMZ:'W'};
EXITS.BAYYS = 'E';   // the exit diagram spells it BAYYS; the SOP table spells it BAAYS
// SOP › Valid Exits diagram legend
const EXIT_RULES = {
  SAX:{tprop:true}, CMK:{tprop:true}, BDR:{tprop:true}, SBJ:{tprop:true},   // turboprop only, as much as practicable
  ZIMMZ:{rnav:true, minAlt:18000},                                          // RNAV only; ** FL180 and above
  NEWEL:{minAlt:18000},                                                     // ** FL180 and above
  ELIOT:{alts:[14000, 16000]},                                              // * 14,000 and 16,000 only
  NYACK:{sat:true}                                                          // satellite (KHPN/KDXR) only
};
// SOP › Common Amendments (airway → join). Objects = SOP lists two joins.
const AMD_AIRWAY = {L454:'WAVEY OWENZ', L455:'WAVEY OWENZ', L457:'WAVEY OWENZ', L459:'WAVEY OWENZ',
  J6:'PARKE J6', J37:'GREKI ALB J37', J42:'MERIT HFD J42', J48:'LANNA J48', J60:'NEWEL J60',
  J63:'=HAAYS HUO Q812', J64:'NEWEL J60 DANNR RAV J64', J70:'SAX LVZ J70',
  J79:{East:'BDR HOFFI J79', South:'WHITE Q409 VILLS J79'}, J95:'GAYEL J95', J106:'SAX LVZ J106',
  J146:'PARKE FJC J146', J174:'WAVEY EMJAY J174', J222:'GREKI J222', J223:'NEION J223', J225:'BDR RAALF J225',
  J584:'SAX LVZ FQM J584', Q42:'ZIMMZ Q42', Q75:{North:'GREKI Q75', South:'BIGGY Q75'}, Q409:'WHITE Q409',
  Q436:'COATE Q436', Q480:'ZIMMZ SPOTZ Q480'};
// SOP › Common Amendments (filed exit → from KLGA)
const AMD_FIX = {ARD:'BIGGY', BOUND:'WAVEY', CCC:'DPK', COL:'WHITE', ETX:'PARKE', FJC:'PARKE', GEDIC:'WAVEY GEDIC',
  HFD:'MERIT HFD', HOFFI:'BDR HOFFI', HTO:'BDR HOFFI HTO', HUO:'HAAYS', IGN:'GREKI', JOANI:'WHITE', LAURN:'WHITE',
  MARIO:'MERIT', NEWES:'MERIT', OWENZ:'WAVEY OWENZ', PACER:'MERIT', PNE:'BIGGY PNE', PUT:'MERIT', RAALF:'MERIT',
  RBV:{West:'BIGGY', South:'WHITE'}, STW:'SAX'};
const SID_RE = /^(LGA|TNNIS|NTHNS|GLDMN|HOPEA|JUTES)(\d|#)$/;
// SOP › IFR Departures (Depart 4 / 13 / 22 / 31 tabs)
function assignSid(ctx, gate, exitFix, cls, rnav){
  const {pair, owns, jfk, lga} = ctx, dep = pair.dep, land = pair.land;
  const S = (sid, why) => ({text: sid, base: sid, extra: '', why, climbVia: true});
  const C = (climb, why) => ({text: 'LGA# ' + climb + ' CLIMB', base: 'LGA#', extra: climb + ' CLIMB', why, climbVia: climb === 'MASPETH' || climb === 'CONEY'});
  const H = (hdg, why) => ({text: 'LGA# HDG ' + hdg, base: 'LGA#', extra: 'HDG ' + hdg, why, climbVia: false});
  const pick = (sid, climb, why) => rnav ? S(sid, why) : C(climb, why + ' — not RNAV capable, climb instead of ' + sid);
  const jet = cls === 'JET';
  if (dep === '4'){
    if (land === '13') return H('070', 'Depart 4, landing 13: all gates heading 070');
    if (gate === 'W') return C('BRONX', 'Depart 4: West gates on BRONX');
    if (exitFix === 'WHITE' && jet) return C('BRONX', 'Depart 4: jets to WHITE on BRONX');
    return C('PELHAM', 'Depart 4: North, East and South gates on PELHAM');
  }
  if (dep === '31'){
    if (land === '4') return H('360', 'Depart 31, landing 4: heading 360');
    if (land === '22') return H('355', 'Depart 31, landing 22: heading 355');
    if (land === '31') return (gate === 'W' || (exitFix === 'WHITE' && jet))
      ? H('360', 'Depart 31, landing 31: West gates and WHITE jets heading 360')
      : H('020', 'Depart 31, landing 31: all others heading 020');
    return null;
  }
  if (dep === '22'){
    if (gate === 'S' && jet && owns.coney)
      return rnav ? S('HOPEA#', 'Depart 22: south-gate jet, LGA owns Coney') : H('190', 'Depart 22: south-gate jet can’t fly HOPEA#, heading 190');
    return rnav ? S('JUTES#', 'Depart 22: all others on JUTES#') : {text: 'LGA#', base: 'LGA#', extra: '', why: 'Depart 22: can’t fly JUTES#, LGA# as published', climbVia: false};
  }
  if (dep === '13'){
    const B = owns.belmont, Cn = owns.coney;
    const rnav13 = lga && lga.appr.some(a => a.rwy === '13' && /RNAV|GPS|RIVER/.test(a.kind));
    if (jfk.ils13L) return C('FLUSHING', 'Depart 13, JFK on ILS 13L: FLUSHING');
    if (B && !Cn) return C('WHITESTONE', 'Depart 13, LGA owns Belmont, JFK owns Coney: WHITESTONE');
    if (!B && Cn){
      const row = 'Depart 13, LGA owns Coney, JFK owns Belmont';
      if (gate === 'E') return pick('TNNIS#', 'FLUSHING', row + ', East');
      if (gate === 'S') return pick('NTHNS#', 'CONEY', row + ', South');
      if (land === '4' || rnav13) return pick('TNNIS#', 'FLUSHING', row + ', North/West with landing ' + (land === '4' ? '4' : 'RNAV/River 13'));
      return pick('GLDMN#', 'MASPETH', row + ', North/West');
    }
    if (B && Cn) return gate === 'S' ? C('CONEY', 'Depart 13, LGA owns Belmont and Coney, South: CONEY')
                                     : C('WHITESTONE', 'Depart 13, LGA owns Belmont and Coney, ' + GATE[gate] + ': WHITESTONE');
    if (cls !== 'JET') return C('FLUSHING', 'Depart 13, JFK owns Belmont and Coney: props (incl. turboprops) on FLUSHING');
    return pick('TNNIS#', 'FLUSHING', 'Depart 13, JFK owns Belmont and Coney');
  }
  return null;
}

// 50 sample LGA departures for testing. [callsign, type, arrival, altitude, route, remarks, rules]
const SAMPLE_FLIGHTS = [
  ['DAL123','B738/L','KDJT','34000','WHITE Q409 CRPLR PAACK Q97 JEVED Q97 KENLL CPTAN4','/V/','I'],
  ['UAL1251','B738/L','KORD','34000','GAYEL J95 SLT WATSN4','/V/ TCAS','I'],
  ['AAL2215','A321/L','KDFW','36000','NEWEL J60 PSB J64 BDF BRDJE4','/V/','I'],
  ['JBU1001','A320/L','KFLL','35000','WHITE Q409 ESENT LUNNI1','/V/','I'],
  ['DAL402','A333/L','KATL','35000','LANNA J48 MOL FLASK OZZZI2','/V/','I'],
  ['SWA3321','B38M/L','KMDW','37000','ZIMMZ Q42 PSB HAGUD MSTRS2','/V/','I'],
  ['RPA4532','E75L/L','KDCA','21000','WHITE J209 SBY TRUPS4','/V/','I'],
  ['AAL1023','A321/L','KMIA','35000','WAVEY EMJAY J174 ORF J121 CHS IGARY Q85 LPERD GTOUT1','/V/','I'],
  ['DAL2101','B752/L','KBOS','21000','MERIT HFD PUT BOSOX4','/V/','I'],
  ['JBU55','A320/L','KBOS','23000','BAAYS BDR V229 PUT BOSOX4','/V/','I'],
  ['ACA711','A223/L','CYYZ','33000','SAX V188 LVZ J70 SYR BEFFY','/V/','I'],
  ['UAL389','B39M/L','KDEN','38000','COATE Q436 EMMMA WYNDE PWE','/V/','I'],
  ['DAL893','A21N/L','KMSP','36000','NEION J223 HNK J190 MSP','/V/','I'],
  ['AAL501','B738/L','KCLT','33000','LANNA J48 CSN FAK JOHNS ICONS5','/V/','I'],
  ['NKS612','A20N/L','KMCO','36000','WAVEY EMJAY J174 SWL CEBEE WETRO DIW AR22 JORAY HIBAC4','/V/','I'],
  ['FFT2271','A20N/L','KDEN','38000','HAAYS HUO Q812 MSLIN Q480 PWE','/V/','I'],
  ['DAL1188','B712/L','KBUF','24000','GREKI J222 GGT','/V/','I'],
  ['AAL1430','A319/L','KPHL','8000','SHIPP V1 ATR V139 RBV','/V/','I'],
  ['UAL2002','B772/L','KSFO','39000','BIGGY J80 SPOTZ Q480 DBQ J94 OAL INYOE DYAMD5','/V/','I'],
  ['DAL1555','A221/L','KDTW','35000','PARKE J6 DJB CLVIN1','/V/','I'],
  ['EDV5281','CRJ9/L','KRDU','27000','ELIOT J48 MOL J22 SPA RDU','/V/','I'],
  ['RPA3402','E170/L','KIAD','23000','SBJ V30 ETX J48 HAGEE CAVLR4','/V/','I'],
  ['AAL2909','B738/L','KORD','35000','J60 PSB J64 BDF NEWEL','/V/','I'],
  ['JBU823','A321/L','KBOS','21000','HFD V3 PUT BOSOX4','/V/','I'],
  ['DAL1999','B739/L','KBDL','11000','J42 HFD BDL','/V/','I'],
  ['UAL455','A320/L','KIAH','37000','J6 DJB J83 TTORO3','/V/','I'],
  ['SWA4410','B737/L','KBNA','36000','J79 BNA','/V/','I'],
  ['AAL771','A321/L','KBOS','23000','PUT BOSOX4','/V/','I'],
  ['DAL211','B738/L','KALB','11000','HUO V489 ALB','/V/','I'],
  ['UAL1789','A319/L','KBTV','25000','IGN V487 BTV','/V/','I'],
  ['JBU999','A320/L','KCHS','33000','COL WHITE Q409 CHS','/V/','I'],
  ['DAL777','B738/L','KPIT','28000','PNE J60 SKOOT PIT','/V/','I'],
  ['AAL3150','E175/L','KSYR','17000','STW V2 SYR','/V/','I'],
  ['DAL2440','A321/L','TJSJ','35000','OWENZ L455 LAMER M330 SAALR','/V/','I'],
  ['UAL622','B753/L','KIAH','37000','LGA7 GAYEL J95 SLT IAH','/V/','I'],
  ['DAL303','B739/L','KBOS','23000','TNNIS6 MERIT HFD PUT BOSOX4','/V/','I'],
  ['JBU1512','A320/L','KTPA','35000','JUTES2 WHITE Q409 ESENT TPA','/V/','I'],
  ['AAL1890','A321/L','KMIA','35000','NTHNS2 WHITE Q409 CRPLR MIA','/V/','I'],
  ['SWA1199','B737/L','KSTL','37000','GLDMN2 NEWEL J60 BUM STL','/V/','I'],
  ['DAL95','A339/L','KATL','35000','HOPEA2 WAVEY EMJAY J174 ATL','/V/','I'],
  ['RPA4720','DH8D/G','KBWI','17000','WHITE V44 BWI','/V/','I'],
  ['ASH5301','AT76/G','KBTV','19000','GREKI V487 BTV','/V/','I'],
  ['N412PC','PC12/G','KACK','16000','BDR V46 ACK','/V/','I'],
  ['N208CS','C208/G','KHYA','9000','MERIT HFD V46 HYA','/V/','I'],
  ['N123','C172/G','KABE','6000','SAX','/V/','I'],
  ['N22SR','SR22/G','KMMU','5000','SBJ V249 MMU','/V/','I'],
  ['N58BE','BE58/A','KBDL','7000','BDR V229 HFD','/V/','I'],
  ['N44PA','PA28/G','KILG','5000','DIXIE V16 ENO','/V/','I'],
  ['N172VF','C172/G','KHPN','4500','','/V/ VFR TRAINING','V'],
  ['AAL2500','B738/L','KBOS','21000','LIZZI J42 BOS','/V/','I'],
  ['DAL1777','B712/W','KCLE','29000','ELIOT J60 CLE','/V/','I'],
  ['UAL911','B738/L','KMSP','36000','Q75 MSP','/V/','I'],
  ['JBU1622','E190/L','KRIC','27000','RBV V16 RIC','/V/','I'],
  ['CMB12','E145/L','KPIT','16000','NEWEL J60 PIT','/V/','I'],
  ['N310BE','BE58/A','KPIT','19000','ZIMMZ Q42 PIT','/V/','I'],
  ['N88NY','PA28/G','KPOU','5000','NYACK V3 POU','/V/','I'],
  ['GJS4410','CRJ7/L','KCLE','16000','ELIOT J60 CLE','/V/','I']
];
/* ---------- clearance phraseology (SOP › Clearance Delivery) ---------- */
const DEP_FREQS = [   // SOP › Departure Frequency, in order
  {name: 'LGA Departure', freq: '120.400', say: '120.4', ok: c => /_(DEP|APP)$/.test(c.callsign)},
  {name: 'HAARP', freq: '120.800', say: '120.8', ok: c => /_(DEP|APP)$/.test(c.callsign)},
  {name: 'New York Center (Sector 56)', freq: '125.325', say: '125.325', ok: c => /_CTR$/.test(c.callsign)}
];
function svdFor(ctx, gate, cls){   // SOP › VFR Departures (SVD)
  const d = ctx.pair.dep;
  if (d === '4') return {via: 'FLY RUNWAY HEADING, AT 600 FEET TURN RIGHT HEADING 055', alt: 2500};
  if (d === '22') return {via: 'FLY RUNWAY HEADING UNTIL LGA 2.5 DME, THEN TURN LEFT HEADING 070', alt: 2500};
  if (d === '31'){
    if (gate === 'N' || gate === 'E') return {via: 'FLY HEADING 359', alt: 2500};
    if (gate === 'S' || gate === 'W') return {via: 'FLY HEADING 340', alt: 2500};
    return {via: 'FLY HEADING 359 (NORTH/EAST) OR 340 (SOUTH/WEST)', alt: 2500, note: 'No exit filed: pick 359 for north/east or 340 for south/west.'};
  }
  if (d === '13'){
    const B = ctx.owns.belmont, C = ctx.owns.coney;
    if (ctx.jfk.ils13L || (!B && !C)) return {via: 'FLY RUNWAY HEADING UNTIL LGA 2.5 DME, THEN TURN LEFT HEADING 050', alt: 2500, note: 'SVD 13 (Flushing/TNNIS).'};
    if (B && !C) return {via: 'TURN RIGHT HEADING 180 UNTIL LGA 2.5 DME, THEN TURN LEFT HEADING 040', alt: 2500, note: 'SVD 13 (Whitestone).'};
    return cls === 'JET' ? {via: 'TURN RIGHT HEADING 180 UNTIL 3,000, THEN TURN RIGHT HEADING 340', alt: 4500, note: 'SVD 13 (all climbs), jets.'}
                         : {via: 'FLY RUNWAY HEADING UNTIL LGA 2.5 DME, THEN TURN LEFT HEADING 050', alt: 2500, note: 'SVD 13 (all climbs), props.'};
  }
  return null;
}

return {
  id: 'LGA', store: 'lgapb', airports: ['LGA','JFK','EWR'], cards: ['LGA','JFK'],
  pos: {lat: 40.7772, lon: -73.8726},
  pages: PAGES,
  groups: DD_GROUPS,
  climbWords: ['WHITESTONE','FLUSHING','MASPETH','CONEY','TNNIS','NTHNS','GLDMN','HOPEA','JUTES','BRONX','PELHAM'],
  noAtisText: ap => ap === 'JFK' ? 'With no JFK ATIS, the SOP treats Belmont and Coney as JFK\'s.' : 'Refresh, or paste an ATIS.',
  active,
  renderPages: renderTaxi,
  taxiFor,
  presets: PRESETS, buildTest, applyPreset,
  gateFixes: GATE_FIXES, exits: EXITS, exitRules: EXIT_RULES, amdAirway: AMD_AIRWAY, amdFix: AMD_FIX, sidRe: SID_RE,
  assignSid,
  // SOP: DIXIE filers go via the JFK VOR when departing 4 or 31 or LGA lacks Coney
  amendRoute: (ctx, exitFix, amd) => (ctx && exitFix === 'DIXIE' && (ctx.pair.dep === '4' || ctx.pair.dep === '31' || !ctx.owns.coney))
    ? {amd: ['JFK'].concat(amd), note: 'DIXIE → JFK DIXIE (via JFK VOR)'} : null,
  initialAlt: 5000,
  samples: SAMPLE_FLIGHTS,
  depFreqs: DEP_FREQS,
  svdFor,
  apreq: ['KEWR','KJFK','KTEB','KHPN'],
  depPhrase: p => /^LGA# HDG /.test(p.text) ? 'LAGUARDIA# DEPARTURE EXCEPT FLY HEADING ' + p.text.slice(9)
    : /^LGA# .* CLIMB$/.test(p.text) ? 'LAGUARDIA# DEPARTURE, ' + p.extra
    : p.text === 'LGA#' ? 'LAGUARDIA# DEPARTURE' : p.text + ' DEPARTURE',
  sidSpoken: base => base === 'LGA#' ? 'LAGUARDIA' : base.replace('#', ''),
  altNote: p => p.climbVia ? 'SOP: RNAV SIDs and the MASPETH/CONEY climbs climb via SID' : 'SOP initial altitude 5,000, or cruise if lower'
};
});
