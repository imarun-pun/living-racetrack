/* App shell: race weekend loop, HUD, settings, cameras and controls. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const KEY = 'pitwall-settings';

// ---------- Settings ----------
function load() {
  let s = structuredClone(PW.DEFAULT_SETTINGS);
  try { const j = JSON.parse(localStorage.getItem(KEY) || 'null'); if (j && typeof j === 'object') s = { ...s, ...j, reminders: { ...s.reminders, ...((j && j.reminders) || {}) } }; else if (localStorage.getItem('pitwall-mode') === 'ambient') s.mode = 'ambient'; } catch (e) {}
  // imported tracks come back from storage: keep only well-formed ones
  s.custom = Array.isArray(s.custom) ? s.custom.filter(t => t && typeof t.id === 'string' && Array.isArray(t.pts) && t.pts.length >= 8 && t.pts.length <= 20000 &&
    t.pts.every(p => Array.isArray(p) && isFinite(p[0]) && isFinite(p[1]))).map(t => ({ ...t, kind: 'custom', name: String(t.name || 'Custom track').replace(/[<>]/g, '').slice(0, 40), hue: '#ff6fb1', length: +t.length || undefined })) : [];
  if (!['race', 'ambient', 'art'].includes(s.mode)) s.mode = 'race';
  if (!['clock', 'day', 'night'].includes(s.light)) s.light = 'clock';
  s.players = Array.isArray(s.players) ? s.players.slice(0, 8).map(p => ({ name: String((p && p.name) || 'Player').replace(/[<>\u0000-\u001f]/g, '').slice(0, 16), a: Math.max(0, Math.min(19, +(p && p.a) || 0)), b: Math.max(0, Math.min(19, +(p && p.b) || 0)) })) : [];
  if (!['circuit', 'neon'].includes(s.mapStyle)) s.mapStyle = 'circuit';
  if (!['close', 'normal', 'wide'].includes(s.mapZoom)) s.mapZoom = 'normal';
  if (!['standard', 'reverse', 'elimination'].includes(s.format)) s.format = 'standard';
  if (!['map', 'chase', 'onboard'].includes(s.view)) s.view = 'map';
  if (!['auto', 'on', 'off'].includes(s.locator)) s.locator = 'auto';
  s.camCar = Number.isInteger(+s.camCar) && +s.camCar >= -1 && +s.camCar < 20 ? +s.camCar : 0;
  const slots = a => Array.isArray(a) ? [...new Set(a.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < 20))] : [];
  s.cup = s.cup && typeof s.cup === 'object' ? { alive: slots(s.cup.alive), round: Math.max(1, +s.cup.round || 1), champs: Array.isArray(s.cup.champs) ? s.cup.champs.slice(-10) : [] } : null;
  if (s.cup && s.cup.alive.length < 2) s.cup = null;
  const k = s.career && typeof s.career === 'object' ? s.career : {};
  s.career = k.on ? { on: true, slot: Math.max(0, Math.min(19, +k.slot || 0)), season: Math.max(1, +k.season || 1), race: Math.max(0, +k.race || 0), per: 8,
    dev: Math.max(0, +k.dev || 0), up: { engine: Math.min(5, +(k.up && k.up.engine) || 0), aero: Math.min(5, +(k.up && k.up.aero) || 0), tyres: Math.min(5, +(k.up && k.up.tyres) || 0) },
    order: slots(k.order).length === 10 ? slots(k.order) : PW.DEFAULT_TEAMS.map((t, i) => i), offers: Array.isArray(k.offers) ? slots(k.offers) : null,
    history: Array.isArray(k.history) ? k.history.slice(-20) : [] } : { on: false };
  s.drivebyDriver = Number.isInteger(+s.drivebyDriver) && +s.drivebyDriver >= -1 && +s.drivebyDriver < 20 ? +s.drivebyDriver : -1;
  return s;
}
let S = load();
/* Recording TV videos (?capture&track=…&light=night&laps=…): Live Art, no reminders, nothing saved. */
const CAP = /[?&]capture\b/.test(location.search) ? new URLSearchParams(location.search) : null;
if (CAP) {
  S.mode = 'art'; S.weekendSync = false; S.driveby = false;
  S.reminders = { ...S.reminders, water: false, stretch: false, eyes: false, customMins: 0 };
  if (['clock', 'day', 'night'].includes(CAP.get('light'))) S.light = CAP.get('light');
  if (CAP.get('track')) { S.rotation = 'single'; S.single = CAP.get('track'); }
  if ([6, 12, 20].includes(+CAP.get('laps'))) S.laps = +CAP.get('laps');
  if (CAP.get('garage') === '0') S.garage = false;
}
const save = () => { if (CAP) return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
const teams = () => PW.resolveTeams(S);
const drivers = () => PW.resolveDrivers(S);
const allTracks = () => [...PW.ORIGINAL_CIRCUITS, ...(PW.REAL_CIRCUITS || []), ...S.custom];
function playlist() {
  const all = allTracks();
  const by = { original: PW.ORIGINAL_CIRCUITS, real: PW.REAL_CIRCUITS || [], custom: S.custom }[S.rotation];
  return by && by.length ? by : all;
}
function pickNext(cur) {
  const wk = S.weekendSync && S.rotation !== 'single' && PW.weekendNow && PW.weekendNow();
  if (wk) { const d = (PW.REAL_CIRCUITS || []).find(t => t.id === wk.track); if (d) return d; }
  if (S.rotation === 'single') return allTracks().find(t => t.id === S.single) || PW.ORIGINAL_CIRCUITS[0];
  const list = playlist().filter(t => !cur || t.id !== cur.id);
  return list.length ? list[Math.floor(Math.random() * list.length)] : cur;
}

// ---------- State ----------
const renderer = new PW.Renderer($('track'));
const pitcam = new PW.PitCam($('pitcam'));
const garage = new PW.Garage($('garage'));
const driveBy = new PW.DriveBy($('driveby'));
const celebration = new PW.Celebration($('celebrate'));
const onboard = new PW.Onboard($('onboard'));
const VIEWS = { map: 'TV map', chase: 'Chase cam', onboard: 'Onboard' };
const MODES = { race: 'Race view', ambient: 'Ambient', art: 'Live Art' };
/* Wall display lock: the desktop app's display mode, or #display in the address for a kiosk browser.
   Live Art only, no controls, no keys; the desktop app unlocks it with the owner's PIN. */
const HOST = window.lapwall || null;
const LOCK = !!(HOST && HOST.display) || /(^|[#&])display\b/.test(location.hash);
/* Live Art camera director: wide map most of the time, cutting to chase and onboard shots of a close battle. */
const art = { view: 'map', t: 0, car: -1, shot: 0, cut: null, cap: 0 };
const ART_SHOTS = [['map', 48], ['chase', 20], ['map', 40], ['onboard', 16]];
const curView = () => S.mode === 'art' ? art.view : S.view;
/* The car the cameras follow: your chosen driver, or the leader if that car is out or not in this race. */
function camCar() {
  const want = S.mode === 'art' ? art.car : S.camCar;
  const c = want >= 0 ? race.cars.find(x => x.i === want) : null;
  return c && !c.cleared ? c : race.running()[0] || race.cars[0];
}
let nextDrive = performance.now() + 45000;
let C, race, TS = 3, phase = 'race', phaseT = 0, round = 1, lightsT = 0, hold = 1, paused = false, nextDef = null, fade = null;
const pairT = {};
let msgs = [], bannerT = 0, firstStart = true, pendT = 0, garageInfo = null, radioT = 0;

function newRace(def) {
  C = PW.buildCircuit(def); renderer.setCircuit(C);
  TS = C.T / S.lapSeconds;
  if (S.format === 'elimination' && !S.cup) S.cup = { alive: drivers().map((d, i) => i), round: 1, champs: [] };
  const K = S.career;
  race = new PW.Race(C, { laps: S.laps, incidents: S.incidents, weather: S.weather, teams: teams(), drivers: drivers(), format: S.format,
    entrants: S.format === 'elimination' ? S.cup.alive : null,
    teamOrder: K.on ? K.order : null, bonus: K.on ? { [K.slot]: (K.up.engine + K.up.aero + K.up.tyres) * .0013 } : null });
  race.on(onEvent);
  phase = 'race'; phaseT = 0; lightsT = 0; hold = rnd(.6, 2.2); firstStart = true; fade = null;
  pitcam.clear(); garage.hide(); $('podium').hidden = true; celebration.stop(); hideBanner(); $('fader').classList.remove('on');
  document.documentElement.style.setProperty('--accent', def.hue || '#38c6ff');
  const wk = PW.weekendNow && PW.weekendNow();
  const kind = wk && def.id === wk.track ? 'Real race weekend · ' + PW.weekendLabel(wk) : def.kind === 'real' ? 'Real-layout replica' : def.kind === 'custom' ? 'Imported track' : 'Original circuit';
  const fmt = S.format === 'elimination' ? ` · Elimination Cup ${S.cup.alive.length <= 4 ? 'final' : 'round ' + S.cup.round} · ${S.cup.alive.length} drivers` : S.format === 'reverse' ? ' · Reverse grid' : '';
  const car = K.on ? ` · Career S${K.season} race ${K.race + 1}/${K.per}` : '';
  $('round').textContent = round; $('kind').textContent = kind + fmt + car + ' · Simulated race';
  $('cname').textContent = def.name; $('aname').textContent = def.name; $('aplace').textContent = def.place || kind;
  $('alen').textContent = (C.L / 1000).toFixed(3) + ' km'; $('acorn').textContent = C.corners.length; $('alaps').textContent = S.laps;
  nextDef = pickNext(def);
  msgs = []; renderTicker(); buildRows(); layout(); drawLocator(); artCaption();
  art.view = 'map'; art.shot = 0; art.t = 0; art.cut = null;
  const nx = PW.weekendNext && PW.weekendNext();
  $('anext-wrap').hidden = !nx && !wk;
  $('anext').textContent = wk ? 'This weekend · ' + wk.place : nx ? `${nx.place} · in ${nx.days} day${nx.days === 1 ? '' : 's'}` : '';
  if (race.weather.kind === 'wet') say('Wet race · everyone starts on intermediates', 'wx');
}

// ---------- Events → ticker, banners, cameras ----------
function onEvent(type, d) {
  const c = d.car, fav = !!c && c.team === S.favTeam;
  switch (type) {
    case 'pit':
      say(`${c.code} pits · ${PW.TYRES[d.tyre].n} · ${d.dur.toFixed(1)}s${d.slow ? ' · slow stop' : ''}`, d.slow ? 'sc' : '', fav);
      if (S.pitcam && S.mode === 'race' && !LOCK && innerWidth >= 760) pitcam.push({ car: c, dur: d.dur, tyre: d.tyre, prevTyre: c.tyre, slow: d.slow, priority: fav });
      break;
    case 'spin': say(`${c.code} spins at turn ${d.corner}!`, 'sc', fav); renderer.addMark(c.dist, c.lat); break;
    case 'crash': renderer.addMark(c.dist, c.lat); say(`Crash! ${c.code} hits the barrier at turn ${d.corner}`, 'red', fav); banner('Crash', `${c.code} · turn ${d.corner}`, 'crash', 2.6); break;
    case 'out': say(`${c.code} is out of the race`, 'red', fav); break;
    case 'sc': say(d.reason === 'crash' ? 'Safety car deployed to clear the crash' : 'Safety car deployed · debris on track', 'sc'); banner('Safety car', 'No overtaking', 'sc', 2.4); break;
    case 'sc-in': say('Safety car in this lap', 'sc'); break;
    case 'green': say('Green flag · racing resumes'); banner('Green flag', '', 'go', 1.4); break;
    case 'red': say('Red flag · the session is stopped', 'red'); banner('Red flag', 'Session stopped · cars return to the grid', 'red', 999); pitcam.clear(); break;
    case 'red-stopped':
      fade = { t: 0, did: false, mid: () => { race.regrid(); hideBanner(); lightsT = 0; hold = rnd(.6, 2.2); } };
      break;
    case 'regrid': say(`Standing restart from the grid · lap ${d.lap} · fresh tyres for everyone`, 'red'); break;
    case 'contact': say(`Contact! ${d.a.code} and ${d.b.code} touch · ${d.victim.code} has a puncture`, 'sc', d.victim.team === S.favTeam); break;
    case 'fastest': say(`Fastest lap · ${c.code} ${PW.fmtLap(d.t)}`, 'fl', fav); break;
    case 'rain': say('Rain is falling · teams call for intermediates', 'wx'); break;
    case 'drying': say('The track is drying · slicks are coming back', 'wx'); break;
    case 'chequered': say(`Chequered flag · ${c.code} wins at ${C.def.name}`, 'red', fav); break;
    case 'done': showPodium(); break;
    case 'recovery': say(`Recovery crane lifts ${c.code}'s car over the wall`, 'sc', fav); break;
    case 'cleared': say(`Track clear · ${c.code}'s car is taken away`, 'sc'); break;
    case 'radio': {
      const pos = race.order.indexOf(c), T = PW.TYRES;
      if (!(fav || pos < 6) || performance.now() - radioT < 9000) break;
      radioT = performance.now();
      const pick = a => a[Math.floor(Math.random() * a.length)];
      const line = {
        plan: pick(['Box, box. Box this lap.', 'Box this lap, box this lap.', 'Okay, box now. Plan A.']),
        inters: pick(['Box for inters, box for inters.', 'It’s raining at the last corner. Box for inters.']),
        slicks: pick(['Track is drying. Box for slicks.', 'Inters are done. Box this lap for slicks.']),
        puncture: pick(['I’ve got a puncture! Coming in.', 'Puncture, puncture! Bringing it home.']),
        sc: pick(['Safety car. Box, box, cheap stop.', 'Box under the safety car.'])
      }[d.kind] || 'Box, box.';
      say(`${c.code}: “${line}”`, 'radio', fav, 'RADIO');
      break;
    }
  }
}
function say(text, cls = '', fav = false, tag = null) {
  msgs.unshift({ text, tag, cls: cls + (fav ? ' fav' : ''), lap: race ? (race.state === 'grid' && !race.startT ? 0 : race.leaderLap()) : 0, at: performance.now() });
  msgs = msgs.slice(0, 3); renderTicker();
}
function renderTicker() {
  $('ticker').innerHTML = msgs.slice().reverse().map((m, k, a) => `<div class="msg ${m.cls}${k < a.length - 1 ? ' old' : ''}"><span class="t">${m.tag || 'L' + m.lap}</span><span>${PW.esc(m.text)}</span></div>`).join('');
}
function banner(text, sub, cls, secs) {
  const b = $('banner'); b.className = 'banner ' + cls; b.innerHTML = text + (sub ? `<small>${sub}</small>` : ''); b.hidden = false; bannerT = secs;
}
function hideBanner() { $('banner').hidden = true; bannerT = 0; }

const flagImg = (code, w = 21, h = 14) => code && PW.FLAG_NAMES[code] ? `<img src="${PW.flagURL(code, w, h)}" alt="${PW.FLAG_NAMES[code]}">` : '<span></span>';
function awardPoints() {
  if (race.awarded) return; race.awarded = true;
  const se = S.season || (S.season = { pts: [], wins: [], races: 0 });
  race.finishOrder.forEach((c, p) => { if (p < 10) se.pts[c.i] = (se.pts[c.i] || 0) + PW.POINTS[p]; });
  const fl = race.fl.car; if (fl && fl.finished && fl.fpos < 10) se.pts[fl.i] = (se.pts[fl.i] || 0) + 1;
  if (race.finishOrder[0]) se.wins[race.finishOrder[0].i] = (se.wins[race.finishOrder[0].i] || 0) + 1;
  se.races = (se.races || 0) + 1;
  if (S.career.on) careerAfterRace();
  if (S.format === 'elimination' && S.cup) cupAfterRace();
  save(); renderSeason(); renderCareer(); renderCupInfo();
}
// ---------- Career ----------
const UPGRADES = [['engine', 'Engine', 'More straight-line speed'], ['aero', 'Aerodynamics', 'Faster through corners'], ['tyres', 'Tyre management', 'Less wear, better grip']];
const upCost = lvl => 15 * (lvl + 1);
function careerStart(slot) {
  const team = Math.floor(slot / 2), order = PW.DEFAULT_TEAMS.map((t, i) => i).filter(t => t !== team).sort(() => Math.random() - .5);
  order.push(team);                                         // you start in the slowest car
  S.career = { on: true, slot, season: 1, race: 0, per: 8, dev: 0, up: { engine: 0, aero: 0, tyres: 0 }, order, offers: null, history: [] };
  S.season = { pts: [], wins: [], races: 0 }; S.favTeam = team; S.camCar = slot; save();
}
function careerAfterRace() {
  const K = S.career, me = race.cars.find(c => c.i === K.slot); if (!me) return;
  const mate = race.cars.find(c => c.i === (K.slot ^ 1)), pos = me.finished ? me.fpos : -1;
  let dev = pos >= 0 ? (PW.POINTS[pos] || 0) + 2 : 0;
  if (pos >= 0 && mate && (!mate.finished || mate.fpos > pos)) dev += 5;
  if (race.fl.car === me) dev += 3;
  K.dev += dev; K.race++; K.last = dev;
  say(pos >= 0 ? `Career: P${pos + 1} · +${dev} development points` : 'Career: no finish · no development points', 'radio', true, 'CAREER');
  if (K.race >= K.per) {
    const p = standings(20).findIndex(d => d.i === K.slot) + 1, r = K.order.indexOf(Math.floor(K.slot / 2));
    const best = p <= 3 ? 0 : p <= 6 ? Math.max(0, r - 3) : p <= 10 ? Math.max(0, r - 1) : r;
    K.offers = K.order.slice(best, r).sort(() => Math.random() - .5).slice(0, 3);
    K.history.push({ season: K.season, pos: p, team: teams()[Math.floor(K.slot / 2)].name, pts: (S.season.pts[K.slot] || 0) });
    K.final = p;
    say(`Season ${K.season} over · you finished P${p}${K.offers.length ? ' · ' + K.offers.length + ' team offer' + (K.offers.length > 1 ? 's' : '') + ' waiting in Customize' : ''}`, 'fl', true, 'CAREER');
  }
}
function careerSign(teamIdx) {
  const K = S.career, cur = Math.floor(K.slot / 2);
  if (teamIdx !== cur) {
    const D = drivers(), a = K.slot, b = teamIdx * 2, A = { name: D[a].name, flag: D[a].flag, num: D[a].num }, B = { name: D[b].name, flag: D[b].flag, num: D[b].num };
    S.drivers = D.map(d => ({ name: d.name, flag: d.flag, num: d.num })); S.drivers[a] = B; S.drivers[b] = A;
    K.slot = b; K.up = { engine: 0, aero: 0, tyres: 0 }; S.favTeam = teamIdx; S.camCar = b;
  }
  const i = Math.floor(Math.random() * 9); [K.order[i], K.order[i + 1]] = [K.order[i + 1], K.order[i]];   // a little shake-up each winter
  K.season++; K.race = 0; K.offers = null; K.final = null; S.season = { pts: [], wins: [], races: 0 };
  save(); syncForm(); round++; newRace(pickNext(C.def));
}
function renderCareer() {
  const el = $('s-career'), K = S.career, D = drivers(), T = teams();
  if (!K.on) {
    el.innerHTML = `<label class="field">You are <select id="cr-slot">${D.map((d, i) => `<option value="${i}">#${d.num} ${PW.esc(d.name)}</option>`).join('')}</select></label>` +
      '<div class="row-btns"><button type="button" id="cr-start">Start my career</button></div>';
    $('cr-slot').value = S.camCar >= 0 ? S.camCar : 0;
    $('cr-start').onclick = () => { careerStart(+$('cr-slot').value); syncForm(); round++; newRace(pickNext(C.def)); };
    return;
  }
  const me = D[K.slot], team = T[Math.floor(K.slot / 2)], rank = K.order.indexOf(Math.floor(K.slot / 2)) + 1;
  const p = standings(20).findIndex(d => d.i === K.slot) + 1;
  el.innerHTML = `<div class="stat"><div><span>Season ${K.season}</span><b>Race ${Math.min(K.race + 1, K.per)}/${K.per}</b></div><div><span>Standing</span><b>P${p || '–'}</b></div><div><span>Dev points</span><b>${K.dev}</b></div></div>` +
    `<p class="hint">${PW.esc(me.name)} · ${PW.esc(team.name)} (car ranked ${rank} of 10)</p>` +
    UPGRADES.map(([k, n, d]) => `<div class="up"><span>${n}<br><small class="hint">${d}</small></span><span class="pips">${'■'.repeat(K.up[k])}${'□'.repeat(5 - K.up[k])}</span>` +
      `<button type="button" data-up="${k}" ${K.up[k] >= 5 || K.dev < upCost(K.up[k]) ? 'disabled' : ''}>${K.up[k] >= 5 ? 'Maxed' : 'Upgrade · ' + upCost(K.up[k])}</button></div>`).join('') +
    (K.offers ? `<p class="hint"><b>Season over: you finished P${K.final}.</b> Choose where to race next season.</p>` +
      K.offers.map(t => `<div class="offer"><span>${PW.esc(T[t].name)} · car ranked ${K.order.indexOf(t) + 1}</span><button type="button" data-sign="${t}">Sign</button></div>`).join('') +
      `<div class="offer"><span>Stay at ${PW.esc(team.name)}</span><button type="button" data-sign="${Math.floor(K.slot / 2)}">Stay</button></div>` : '') +
    (K.history.length ? `<p class="hint">History: ${K.history.map(h => `S${h.season} P${h.pos} (${PW.esc(h.team)})`).join(' · ')}</p>` : '') +
    '<div class="row-btns"><button type="button" id="cr-end">End career</button></div>';
  el.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { const k = b.dataset.up; if (K.dev >= upCost(K.up[k]) && K.up[k] < 5) { K.dev -= upCost(K.up[k]); K.up[k]++; save(); renderCareer(); say(`Upgrade fitted: ${UPGRADES.find(u => u[0] === k)[1]} level ${K.up[k]} · from the next race`, 'radio', true, 'CAREER'); } });
  el.querySelectorAll('[data-sign]').forEach(b => b.onclick = () => careerSign(+b.dataset.sign));
  $('cr-end').onclick = () => { S.career = { on: false }; save(); renderCareer(); };
}
// ---------- Elimination Cup ----------
function cupAfterRace() {
  const cup = S.cup, D = drivers();
  const cls = [...race.finishOrder, ...race.order.filter(c => !c.finished && !c.out), ...race.order.filter(c => c.out)].map(c => c.i);
  if (cup.alive.length <= 4) {
    const champ = race.finishOrder[0];
    if (champ) { cup.champs.push({ name: champ.name, flag: champ.flag }); say(`${champ.name} wins the Elimination Cup!`, 'fl', champ.team === S.favTeam, 'CUP'); banner('Cup champion', champ.name, 'go', 4); }
    S.cup = { alive: D.map((d, i) => i), round: 1, champs: cup.champs.slice(-10) };
    return;
  }
  const k = Math.max(2, Math.round(cup.alive.length * .25)), out = cls.slice(-k);
  cup.alive = cls.slice(0, -k); cup.round++;
  say(`Eliminated: ${out.map(i => D[i].code).join(', ')} · ${cup.alive.length} drivers go through${cup.alive.length <= 4 ? ' to the final' : ''}`, 'red', false, 'CUP');
}
function standings(n = 20) {
  const se = S.season || { pts: [] }, D = drivers(), T = teams();
  return D.map((d, i) => ({ ...d, i, pts: se.pts[i] || 0, wins: (se.wins || [])[i] || 0, color: T[Math.floor(i / 2)].color }))
    .sort((a, b) => b.pts - a.pts || b.wins - a.wins || a.i - b.i).slice(0, n);
}
function league() {
  const se = S.season || { pts: [] };
  return S.players.map(p => ({ ...p, pts: (se.pts[p.a] || 0) + (p.b !== p.a ? se.pts[p.b] || 0 : 0) })).sort((a, b) => b.pts - a.pts);
}
function showPodium() {
  phase = 'podium'; phaseT = 0; pitcam.clear(); hideBanner();
  const [p1, p2, p3] = race.finishOrder, T = teams();
  if (!p1) { phaseT = 12; return; }
  awardPoints();
  $('pcode').textContent = p1.code;
  $('pteam').innerHTML = `<span class="name">${flagImg(p1.flag)}${PW.esc(p1.name)}</span>${PW.esc(T[p1.team].name)} · #${p1.num} · Winner`;
  $('pbar').style.background = p1.color; $('ptitle').textContent = `Chequered flag · ${C.def.name}`;
  const fl = race.fl.car;
  $('places').innerHTML = [p2, p3].filter(Boolean).map((c, k) => `<div><span class="p">P${k + 2}</span><span class="bar" style="background:${c.color}"></span>${flagImg(c.flag)}<span>${PW.esc(PW.shortName(c.name))}</span><span class="v">+${(c.ftime - p1.ftime).toFixed(3)}</span></div>`).join('') +
    (fl ? `<div class="flrow"><span class="p">FL</span><span class="bar" style="background:${fl.color}"></span>${flagImg(fl.flag)}<span>${PW.esc(PW.shortName(fl.name))}</span><span class="v">${PW.fmtLap(race.fl.t)}</span></div>` : '') +
    (race.cars.some(c => c.out) ? `<div><span class="p">DNF</span><span class="bar" style="background:var(--red)"></span><span></span><span>${race.cars.filter(c => c.out).map(c => c.code).join(' ')}</span><span class="v"></span></div>` : '');
  const lead = standings(1)[0];
  $('pnext').dataset.season = lead ? `Championship leader: ${PW.shortName(lead.name)} · ${lead.pts} pts` : '';
  $('podium').hidden = false;
  celebration.start(race.finishOrder.slice(0, 3).map(c => ({ name: c.name, code: c.code, flag: c.flag, color: c.color, color2: c.color2 })));
  const lg = league(); $('pnext').dataset.season += lg.length ? ` · League: ${lg.slice(0, 2).map(p => `${p.name} ${p.pts}`).join(', ')}` : '';
  const useFav = S.favTeam >= 0 && round % 2 === 0;
  const ti = useFav ? S.favTeam : p1.team, slotCar = i => race.cars.find(c => c.i === i) || { num: drivers()[i].num, name: drivers()[i].name }, a = slotCar(ti * 2), b = slotCar(ti * 2 + 1);
  garageInfo = { team: T[ti], num: ti === p1.team ? p1.num : a.num, drivers: [a, b].map(c => `#${c.num} ${c.name}`),
    fact: PW.FACTS[Math.floor(Math.random() * PW.FACTS.length)], why: useFav ? 'Your team' : 'Race winner', tyreC: PW.TYRES[p1.tyre].c,
    seasonTitle: `Championship · after ${S.season.races} race${S.season.races === 1 ? '' : 's'}`, standings: standings(6) };
  if (S.players.length && round % 2) {
    const D = drivers(), T2 = teams();
    garageInfo.seasonTitle = `Fantasy league · after ${S.season.races} race${S.season.races === 1 ? '' : 's'}`;
    garageInfo.standings = league().slice(0, 6).map(p => ({ name: `${p.name} (${D[p.a].code}, ${D[p.b].code})`, flag: D[p.a].flag, color: T2[Math.floor(p.a / 2)].color, pts: p.pts }));
  }
}

// ---------- HUD ----------
const rowEls = new Map();
function buildRows() {
  const rows = $('rows'); rows.innerHTML = ''; rowEls.clear();
  race.cars.forEach(c => {
    const el = document.createElement('div'); el.className = 'row';
    el.innerHTML = `<span class="pos"></span><span class="bar" style="background:${c.color}"></span>${c.flag && PW.FLAG_NAMES[c.flag] ? `<img class="flag" src="${PW.flagURL(c.flag, 18, 12)}" alt="${PW.FLAG_NAMES[c.flag]}">` : '<span></span>'}<span class="code" title="${PW.esc(c.name)}">${c.code}</span><span class="gap"></span><span class="tyre"></span>`;
    rows.appendChild(el); rowEls.set(c, { el, pos: el.children[0], bar: el.children[1], gap: el.children[4], tyre: el.children[5] });
  });
}
function renderHUD() {
  const row = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--row')) || 26;
  const now = performance.now();
  race.order.forEach((c, p) => {
    const r = rowEls.get(c); if (!r) return;
    r.el.style.transform = `translateY(${p * row}px)`;
    r.pos.textContent = c.out ? '–' : p + 1;
    const g = race.gapText(c, p);
    r.gap.textContent = g; r.gap.className = 'gap' + (g === 'PIT' ? ' pit' : g === 'SPIN' ? ' spin' : '');
    r.tyre.style.borderColor = PW.TYRES[c.tyre].c; r.bar.style.background = c.color;
    r.el.classList.toggle('fl', race.fl.car === c); r.el.classList.toggle('lead', p === 0);
    r.el.classList.toggle('out', c.out); r.el.classList.toggle('fav', c.team === S.favTeam); r.el.classList.toggle('punct', c.puncture); r.el.classList.toggle('drs', !!c.drs && !c.inPit && race.state === 'racing');
    r.el.classList.toggle('gain', p < c.lastPos && race.state === 'racing');
    if (p !== c.lastPos && !c.shiftAt) c.shiftAt = now;
    if (c.shiftAt && now - c.shiftAt > 3000) { c.lastPos = p; c.shiftAt = 0; }
  });
  const started = race.startT !== undefined;
  $('lap').innerHTML = `LAP ${started ? race.leaderLap() : 0} <span>/ ${race.laps}</span>`;
  const f = $('flag');
  if (race.state === 'red') { f.className = 'pill red'; f.textContent = 'Red flag'; }
  else if (race.state === 'grid') { f.className = 'pill grid'; f.textContent = started ? 'Restart' : 'Grid'; }
  else if (race.state === 'finished' || race.state === 'done') { f.className = 'pill chq'; f.textContent = 'Chequered'; }
  else if (race.sc) { f.className = 'pill sc'; f.textContent = race.sc.state === 'in' ? 'SC in this lap' : 'Safety car'; }
  else if (race.yellow) { f.className = 'pill yellow'; f.textContent = 'Yellow · T' + race.yellow.corner; }
  else { f.className = 'pill green'; f.textContent = 'Green flag'; }
  const w = race.weather, wx = $('wx');
  wx.hidden = w.rain < .05;
  wx.textContent = w.target === 0 ? 'Drying' : w.rain > .55 ? 'Heavy rain' : 'Rain';
  const lead = race.running()[0];
  $('alead').textContent = !started ? 'Grid' : lead ? lead.code : '–';
}
function renderClock() {
  const d = new Date();
  $('clock').firstChild.nodeValue = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  $('date').textContent = d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  const h = d.getHours(), a = +S.dimFrom, b = +S.dimTo;
  const inWindow = a === b ? false : a < b ? h >= a && h < b : h >= a || h < b;
  document.body.classList.toggle('dim', !!S.nightDim && inWindow);
  applyLight(d);
}
/* Floodlights follow the local time: dusk from about 6:30 pm, full night 8:30 pm to 5:30 am, golden light around sunrise and sunset. */
function lightAt(d) {
  if (S.light === 'day') return { night: 0, golden: 0 };
  if (S.light === 'night') return { night: 1, golden: 0 };
  const h = d.getHours() + d.getMinutes() / 60, ss = v => v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v);
  const night = h >= 12 ? ss((h - 18.5) / 2) : 1 - ss((h - 5.5) / 2);
  const golden = Math.max(Math.exp(-Math.pow((h - 18.3) / .9, 2)), Math.exp(-Math.pow((h - 6.8) / .9, 2)));
  return { night, golden: golden * (1 - night * .7) };
}
function applyLight(d) { if (renderer.C) renderer.setLight(lightAt(d || new Date())); }

// ---------- Layout ----------
function drawLocator() {
  const d = C && C.def, el = $('locator');
  el.hidden = !(d && typeof d.lat === 'number') || S.locator === 'off' || curView() !== 'map' || S.mode === 'art';
  if (el.hidden) return;
  PW.drawLocator(el.querySelector('canvas'), d.lat, d.lon, d.hue || '#38c6ff');
  $('loccap').textContent = PW.fmtCoord(d.lat, d.lon);
  if (S.locator === 'auto') {                         // hide it if it sits on top of the track
    const b = renderer.bounds(), r = el.getBoundingClientRect();
    if (r.left < b.x1 && r.right > b.x0 && r.top < b.y1 && r.bottom > b.y0) el.hidden = true;
  }
}
function layout() {
  const DPR = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight, narrow = W < 760;
  const row = narrow ? 24 : Math.max(16, Math.min(28, (H - 122 - 60) / 20));
  document.documentElement.style.setProperty('--row', row + 'px');
  let r;
  if (S.mode === 'art') r = { x: W * .04, y: H * .06, w: W * .92, h: H * .88 };
  else if (S.mode === 'ambient') r = narrow ? { x: 16, y: H * .16, w: W - 32, h: H * .5 } : { x: W * .05, y: H * .1, w: W * .9, h: H * .62 };
  else if (narrow) r = { x: 16, y: 150, w: W - 32, h: Math.max(140, H - 150 - (5 * row + 120)) };
  else r = { x: 290, y: 104, w: W - 290 - 36, h: H - 104 - 120 };
  renderer.layout(W, H, DPR, r, { style: S.mapStyle, zoom: S.mapZoom, hires: curView() === 'chase' || S.mode === 'art' });
  applyLight();
}

// ---------- Loop ----------
let last = performance.now(), hudT = 0, clockT = 0;
const lightsEl = $('lights'), units = [...lightsEl.querySelectorAll('.unit')];
function frame(now) {
  const dtR = Math.min(.05, (now - last) / 1000); last = now;
  if (!paused) {
    if (fade) {
      fade.t += dtR; $('fader').classList.toggle('on', fade.t < 1.6);
      if (fade.t > .9 && !fade.did) { fade.did = true; fade.mid(); }
      if (fade.t > 2.4) fade = null;
    }
    if (phase !== 'garage') {
      if (race.state === 'grid') {
        if (!fade) {
          lightsT += dtR; lightsEl.hidden = false;
          const on = Math.min(5, Math.floor((lightsT - 1) / .9) + 1);
          units.forEach((u, k) => u.classList.toggle('on', k < on && lightsT > 1));
          if (lightsT > 1 + 4 * .9 + .9 + hold) {
            race.start(); units.forEach(u => u.classList.remove('on')); lightsOff = now;
            say(firstStart ? `Lights out · ${race.laps} laps at ${C.def.name}` : 'Lights out · racing resumes', 'red'); firstStart = false;
          }
        }
      } else {
        if (lightsOff && now - lightsOff > 1400) { lightsEl.hidden = true; lightsOff = 0; }
        let sim = dtR * TS; while (sim > 0) { const d = Math.min(.05, sim); race.step(d); sim -= d; }
      }
    }
    if (phase === 'podium') {
      phaseT += dtR; $('pnext').textContent = `${$('pnext').dataset.season ? $('pnext').dataset.season + ' · ' : ''}Next: ${nextDef.name} in ${Math.max(0, Math.ceil(12 - phaseT))}s`;
      if (phaseT > 12) {
        $('podium').hidden = true; celebration.stop();
        if (S.garage && garageInfo) { phase = 'garage'; phaseT = 0; garage.show(garageInfo); } else { round++; newRace(nextDef); }
      }
    } else if (phase === 'garage') {
      phaseT += dtR; garage.update(dtR, 20 - phaseT, nextDef.name);
      if (phaseT > 20) { round++; newRace(nextDef); }
    }
    if (phase === 'podium') celebration.update(dtR);
    pitcam.update(dtR);
    if (race.pending && now - pendT > 2200) {
      const p = race.pending, pair = [p.a.i, p.b.i].sort().join('-');
      if (!(pairT[pair] && now - pairT[pair] < 25000)) { say(`${p.a.code} passes ${p.b.code} for P${p.p + 1}`, '', p.a.team === S.favTeam); pairT[pair] = now; }
      race.pending = null; pendT = now;
    }
    if (bannerT > 0) { bannerT -= dtR; if (bannerT <= 0) hideBanner(); }
  }
  if (S.mode === 'art' && !paused) direct(dtR);
  const view = curView(), onb = view === 'onboard' && phase !== 'garage';
  $('onboard').hidden = !onb;
  const drift = S.mode === 'art' && view === 'map' ? { k: 1.03 + .03 * Math.sin(now / 47000), x: Math.sin(now / 61000) * innerWidth * .012, y: Math.cos(now / 53000) * innerHeight * .012 } : null;
  if (phase !== 'garage' && !onb) renderer.draw(race, now, paused ? 0 : dtR, { labels: S.mode === 'race' && view === 'map', fav: S.mode === 'art' ? -2 : S.favTeam, cam: view === 'chase' ? camCar() : null, drift });
  if (onb) onboard.draw(race, camCar(), now, paused ? 0 : dtR);
  if (!driveBy.active && phase !== 'garage' && !paused) checkReminders(now);
  if (S.driveby && S.mode === 'ambient' && phase === 'race' && !driveBy.active && now > nextDrive) startDriveBy();
  if (driveBy.active) driveBy.update(paused ? 0 : dtR);
  if (now - hudT > 200) { renderHUD(); hudT = now; }
  if (now - clockT > 1000) {
    renderClock(); clockT = now;
    const before = msgs.length; msgs = msgs.filter(m => now - m.at < 16000); if (msgs.length !== before) renderTicker();
  }
  requestAnimationFrame(frame);
}
let lightsOff = 0;

// ---------- Live Art ----------
/* Pick the closest fight in the top ten for the close-up shots. */
function battleCar() {
  const run = race.running().filter(c => !c.inPit && !c.finished);
  let best = run[0], gap = Infinity;
  for (let p = 1; p < Math.min(10, run.length); p++) { const g = run[p - 1].dist - run[p].dist; if (g > 0 && g < gap) { gap = g; best = run[p]; } }
  return best ? best.i : -1;
}
function direct(dtR) {
  const racing = phase === 'race' && race.state === 'racing';
  if (art.cut) {                                         // a short dip to black between shots
    art.cut.t += dtR; $('fader').classList.toggle('on', art.cut.t < .7);
    if (art.cut.t > .65 && !art.cut.done) { art.cut.done = true; art.view = art.cut.to; art.car = battleCar(); document.body.classList.toggle('onboard', art.view === 'onboard'); layout(); }
    if (art.cut.t > 1.4) art.cut = null;
    return;
  }
  if (!racing) { if (art.view !== 'map') cutTo('map'); return; }
  art.t += dtR;
  const [, dur] = ART_SHOTS[art.shot];
  if (art.t > dur) { art.shot = (art.shot + 1) % ART_SHOTS.length; art.t = 0; if (ART_SHOTS[art.shot][0] !== art.view) cutTo(ART_SHOTS[art.shot][0]); }
}
function cutTo(v) { if (!art.cut) art.cut = { to: v, t: 0, done: false }; }
/* A museum-style caption that fades in for a few seconds when a race starts. */
function artCaption() {
  const el = $('artcap'); if (!el || !C) return;
  el.querySelector('b').textContent = C.def.name; el.querySelector('span').textContent = C.def.place || (C.def.kind === 'real' ? 'Real-layout replica' : 'Original circuit');
  el.classList.remove('show'); clearTimeout(art.cap); void el.offsetWidth;
  if (S.mode === 'art') { el.classList.add('show'); art.cap = setTimeout(() => el.classList.remove('show'), 9000); }
}

// ---------- Zoom-by ----------
function startDriveBy(board) {
  const pool = race.cars.filter(c => !c.out), favs = pool.filter(c => c.team === S.favTeam);
  const list = favs.length && Math.random() < .5 ? favs : pool;
  const car = S.drivebyDriver >= 0 ? (race.cars.find(c => c.i === S.drivebyDriver) || { ...drivers()[S.drivebyDriver], i: S.drivebyDriver, team: Math.floor(S.drivebyDriver / 2), tyre: 'M' }) : list[Math.floor(Math.random() * list.length)] || race.cars[0];
  driveBy.start({ name: car.name, flag: car.flag, num: car.num, team: teams()[car.team], tyre: car.tyre, sound: false,
    seconds: PW.DRIVEBY_SPEEDS[S.drivebySpeed] || PW.DRIVEBY_SPEEDS.cruise, board });
  if (!board) nextDrive = performance.now() + S.drivebyMins * 60000 * (.6 + Math.random() * .8);
}
/* Pit-board reminders: each kind keeps its own clock. */
const remDue = {};
function reminderBoard(kind) {
  if (kind === 'custom') return { title: String(S.reminders.custom || '').toUpperCase().slice(0, 28), sub: 'Pit board from you', icon: 'star' };
  return PW.REMINDERS[kind];
}
function checkReminders(now) {
  const R = S.reminders;
  const kinds = [['water', R.water, R.waterMins], ['stretch', R.stretch, R.stretchMins], ['eyes', R.eyes, R.eyesMins], ['custom', !!(R.custom && R.customMins > 0), R.customMins]];
  for (const [k, on, mins] of kinds) {
    if (!on) { delete remDue[k]; continue; }
    if (!remDue[k]) { remDue[k] = now + mins * 60000; continue; }
    if (now >= remDue[k]) { remDue[k] = now + mins * 60000; startDriveBy(reminderBoard(k)); return; }
  }
}

function setView(v) {
  S.view = v; save(); $('bview').textContent = 'View: ' + VIEWS[v]; $('s-view').value = v;
  document.body.classList.toggle('onboard', curView() === 'onboard'); layout(); drawLocator();
}

// ---------- Controls ----------
function setMode(m) {
  S.mode = m; if (!LOCK) save();
  document.body.classList.toggle('ambient', m === 'ambient'); document.body.classList.toggle('art', m === 'art');
  $('bmode').textContent = 'Mode: ' + MODES[m];
  if (m !== 'race') pitcam.clear();
  art.view = 'map'; art.cut = null; art.t = 0; $('fader').classList.remove('on');
  document.body.classList.toggle('onboard', curView() === 'onboard');
  layout(); drawLocator(); artCaption();
}
const nextMode = () => { const k = Object.keys(MODES); return k[(k.indexOf(S.mode) + 1) % k.length]; };
const nextRace = () => { round++; newRace(phase === 'race' && race.state !== 'done' ? pickNext(C.def) : nextDef); };
async function fullscreen() {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch (e) {}
  try { await navigator.wakeLock?.request('screen'); } catch (e) {}
}
const openSettings = open => { $('settings').hidden = !open; if (open) { document.body.classList.remove('idle'); $('sclose').focus(); } };
$('bmode').addEventListener('click', () => setMode(nextMode()));
$('bnext').addEventListener('click', nextRace);
$('bview').addEventListener('click', () => { const k = Object.keys(VIEWS); setView(k[(k.indexOf(S.view) + 1) % k.length]); });
$('bfull').addEventListener('click', fullscreen);
$('bset').addEventListener('click', () => openSettings($('settings').hidden));
$('sclose').addEventListener('click', () => openSettings(false));
addEventListener('keydown', e => {
  if (LOCK) { e.preventDefault(); return; }
  if (e.target.closest && e.target.closest('input, select')) return;
  const k = e.key.toLowerCase();
  if (k === 'a') setMode(nextMode());
  else if (k === 'n') nextRace();
  else if (k === 'c') openSettings($('settings').hidden);
  else if (k === 'f') fullscreen();
  else if (k === 'p') { paused = !paused; say(paused ? 'Paused' : 'Resumed'); }
  else if (k === 'd' && !driveBy.active) startDriveBy();
  else if (k === 'v') { const v = Object.keys(VIEWS); setView(v[(v.indexOf(S.view) + 1) % v.length]); }
  else if (k === 'w' && !driveBy.active) startDriveBy(PW.REMINDERS.water);
  else if (k === 'escape') openSettings(false);
});
let idleT;
const wake = () => { document.body.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(() => { if ($('settings').hidden) document.body.classList.add('idle'); }, 4000); };
['pointermove', 'pointerdown', 'keydown'].forEach(e => addEventListener(e, wake)); wake();
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { layout(); drawLocator(); }, 120); });

// ---------- Settings panel ----------
function fillTrackSelect() {
  const sel = $('s-single'), grp = (label, list) => list.length ? `<optgroup label="${label}">${list.map(t => `<option value="${PW.esc(t.id)}">${PW.esc(t.name)}</option>`).join('')}</optgroup>` : '';
  sel.innerHTML = grp('Original circuits', PW.ORIGINAL_CIRCUITS) + grp('Real-layout replicas', PW.REAL_CIRCUITS || []) + grp('Imported', S.custom);
  sel.value = S.single;
}
function fillTeams() {
  const T = teams();
  $('s-fav').innerHTML = '<option value="-1">None</option>' + T.map((t, i) => `<option value="${i}">${PW.esc(t.name)}</option>`).join('');
  $('s-fav').value = S.favTeam;
  $('s-teams').innerHTML = T.map((t, i) => `<div class="team-row"><input type="color" id="tc1-${i}" value="${t.color}" aria-label="${PW.esc(t.name)} main colour"><input type="color" id="tc2-${i}" value="${t.color2}" aria-label="${PW.esc(t.name)} second colour"><input type="text" id="tn-${i}" value="${PW.esc(t.name)}" maxlength="16" aria-label="Team ${i + 1} name"></div>`).join('');
  T.forEach((t, i) => ['tc1', 'tc2', 'tn'].forEach(p => $(`${p}-${i}`).addEventListener('input', () => {
    S.teams = S.teams || [];
    S.teams[i] = { name: $(`tn-${i}`).value.trim() || PW.DEFAULT_TEAMS[i].name, color: $(`tc1-${i}`).value, color2: $(`tc2-${i}`).value };
    save(); applyTeams();
    if (p === 'tn') { const o = $('s-fav').options[i + 1]; if (o) o.textContent = S.teams[i].name; }
  })));
}
const flagOpts = PW.flagOptions().map(([c, n]) => `<option value="${c}">${n}</option>`).join('');
function fillDrivers() {
  const D = drivers(), T = teams();
  $('s-drivers').innerHTML = D.map((d, i) => `<div class="drv-row"><span class="dot" style="background:${T[Math.floor(i / 2)].color}" title="${PW.esc(T[Math.floor(i / 2)].name)}"></span>` +
    `<select id="df-${i}" aria-label="Driver ${i + 1} flag"><option value="">No flag</option>${flagOpts}</select>` +
    `<input type="text" id="dn-${i}" value="${PW.esc(d.name)}" maxlength="24" aria-label="Driver ${i + 1} name">` +
    `<input type="number" id="dnum-${i}" value="${d.num}" min="0" max="99" aria-label="Driver ${i + 1} number"></div>`).join('');
  D.forEach((d, i) => {
    $(`df-${i}`).value = d.flag || '';
    ['df', 'dn', 'dnum'].forEach(p => $(`${p}-${i}`).addEventListener(p === 'df' ? 'change' : 'input', () => {
      S.drivers = S.drivers || [];
      S.drivers[i] = { name: $(`dn-${i}`).value.trim() || PW.DEFAULT_DRIVERS[i].name, flag: $(`df-${i}`).value, num: Math.max(0, Math.min(99, parseInt($(`dnum-${i}`).value, 10) || 0)) };
      save(); applyDrivers(); renderSeason(); fillDriveCar();
    }));
  });
}
function applyDrivers() {
  const D = drivers();
  race.opt.drivers = D;
  race.cars.forEach(c => { const d = D[c.i]; c.name = d.name; c.code = d.code; c.flag = d.flag; c.num = d.num; });
  buildRows(); renderHUD();
}
function fillDriveCar() {
  const D = drivers();
  $('s-dbcar').innerHTML = '<option value="-1">Random driver</option>' + D.map((d, i) => `<option value="${i}">#${d.num} ${PW.esc(d.name)}</option>`).join('');
  $('s-dbcar').value = S.drivebyDriver;
}
function fillPlayers() {
  const D = drivers(), opts = D.map((d, i) => `<option value="${i}">${PW.esc(d.code)} · ${PW.esc(d.name)}</option>`).join('');
  $('s-players').innerHTML = S.players.map((p, i) => `<div class="player-row"><input type="text" id="pn-${i}" value="${PW.esc(p.name)}" maxlength="16" aria-label="Player ${i + 1} name">` +
    `<select id="pa-${i}" aria-label="Player ${i + 1} first driver">${opts}</select><select id="pb-${i}" aria-label="Player ${i + 1} second driver">${opts}</select>` +
    `<button type="button" id="px-${i}" aria-label="Remove player ${i + 1}">✕</button></div>`).join('');
  S.players.forEach((p, i) => {
    $(`pa-${i}`).value = p.a; $(`pb-${i}`).value = p.b;
    $(`pn-${i}`).addEventListener('input', e => { p.name = e.target.value.replace(/[<>]/g, '').slice(0, 16) || 'Player'; save(); renderSeason(); });
    $(`pa-${i}`).addEventListener('change', e => { p.a = +e.target.value; save(); renderSeason(); });
    $(`pb-${i}`).addEventListener('change', e => { p.b = +e.target.value; save(); renderSeason(); });
    $(`px-${i}`).addEventListener('click', () => { S.players.splice(i, 1); save(); fillPlayers(); renderSeason(); });
  });
  $('s-addplayer').disabled = S.players.length >= 8;
}
function renderSeason() {
  const se = S.season || { races: 0 };
  $('s-season').textContent = se.races ? `${se.races} race${se.races === 1 ? '' : 's'} so far. Points: 25-18-15-12-10-8-6-4-2-1, plus 1 for the fastest lap in the top ten.` : 'No races yet. Points start counting from the next chequered flag.';
  const D = drivers();
  $('s-league').innerHTML = S.players.length ? league().map(p => `<li><span class="b" style="background:${teams()[Math.floor(p.a / 2)].color}"></span>${flagImg(D[p.a].flag)}<span class="n">${PW.esc(p.name)} · ${D[p.a].code} + ${D[p.b].code}</span><span class="p">${p.pts}</span></li>`).join('') : '';
  $('s-standings').innerHTML = se.races ? standings(10).map(d => `<li><span class="b" style="background:${d.color}"></span>${flagImg(d.flag)}<span class="n">${PW.esc(d.name)}</span><span class="p">${d.pts}</span></li>`).join('') : '';
}
function applyTeams() {
  const T = teams();
  race.opt.teams = T;
  race.cars.forEach(c => { c.color = T[c.team].color; c.color2 = T[c.team].color2; });
}
function syncForm() {
  $('s-rotation').value = S.rotation; fillTrackSelect();
  $('s-laps').value = S.laps; $('s-pace').value = S.lapSeconds; $('s-weather').value = S.weather;
  $('s-incidents').checked = S.incidents; $('s-pitcam').checked = S.pitcam; $('s-garage').checked = S.garage;
  $('s-dim').checked = S.nightDim; $('s-from').value = S.dimFrom; $('s-to').value = S.dimTo;
  $('s-driveby').checked = S.driveby; $('s-dbspeed').value = S.drivebySpeed;
  const R = S.reminders;
  $('s-rw').checked = R.water; $('s-rwm').value = R.waterMins; $('s-rs').checked = R.stretch; $('s-rsm').value = R.stretchMins;
  $('s-re').checked = R.eyes; $('s-rem').value = R.eyesMins; $('s-rc').value = R.custom || ''; $('s-rcm').value = R.customMins;
  $('s-weekend').checked = S.weekendSync; $('s-style').value = S.mapStyle; $('s-zoom').value = S.mapZoom;
  $('s-format').value = S.format; $('s-view').value = S.view; $('s-loc').value = S.locator; $('s-light').value = S.light;
  $('s-cam').innerHTML = '<option value="-1">Race leader</option>' + drivers().map((d, i) => `<option value="${i}">#${d.num} ${PW.esc(d.name)}</option>`).join('');
  $('s-cam').value = S.camCar; renderCupInfo(); renderCareer();
  fillTeams(); fillDrivers(); fillDriveCar(); fillPlayers(); renderSeason();
}
const bind = (id, fn, ev = 'change') => $(id).addEventListener(ev, e => { fn(e.target); save(); });
bind('s-rotation', el => { S.rotation = el.value; nextDef = pickNext(C.def); });
bind('s-single', el => { S.single = el.value; if (S.rotation !== 'single') { S.rotation = 'single'; $('s-rotation').value = 'single'; } round++; newRace(pickNext(null)); });
bind('s-laps', el => { S.laps = +el.value; });
bind('s-pace', el => { S.lapSeconds = +el.value; TS = C.T / S.lapSeconds; });
bind('s-weather', el => { S.weather = el.value; });
bind('s-incidents', el => { S.incidents = el.checked; race.opt.incidents = el.checked; });
bind('s-pitcam', el => { S.pitcam = el.checked; if (!el.checked) pitcam.clear(); });
bind('s-garage', el => { S.garage = el.checked; });
bind('s-fav', el => { S.favTeam = +el.value; });
bind('s-dbspeed', el => { S.drivebySpeed = el.value; });
bind('s-dbcar', el => { S.drivebyDriver = +el.value; });
bind('s-weekend', el => { S.weekendSync = el.checked; nextDef = pickNext(C.def); });
bind('s-format', el => { S.format = el.value; if (el.value !== 'elimination') S.cup = null; renderCupInfo(); });
bind('s-view', el => setView(el.value));
bind('s-cam', el => { S.camCar = +el.value; });
bind('s-loc', el => { S.locator = el.value; drawLocator(); });
bind('s-light', el => { S.light = el.value; applyLight(); });
function renderCupInfo() {
  const c = S.cup, D = drivers();
  $('s-cupinfo').textContent = S.format !== 'elimination' ? '' : !c ? 'Starts with the next race: the slowest quarter is knocked out each race until four drivers race the final.'
    : `Round ${c.round} · ${c.alive.length} drivers left: ${c.alive.map(i => D[i].code).join(' ')}${c.champs.length ? ' · Past champions: ' + c.champs.map(x => x.name).join(', ') : ''}`;
}
bind('s-style', el => { S.mapStyle = el.value; layout(); });
bind('s-zoom', el => { S.mapZoom = el.value; layout(); });
$('s-addplayer').addEventListener('click', () => {
  if (S.players.length >= 8) return;
  const n = S.players.length; S.players.push({ name: 'Player ' + (n + 1), a: (n * 2) % 20, b: (n * 2 + 1) % 20 }); save(); fillPlayers(); renderSeason();
});
const remBind = (id, key, num) => bind(id, el => { S.reminders[key] = num ? +el.value : el.checked; delete remDue[key.replace(/Mins$/, '')]; });
remBind('s-rw', 'water'); remBind('s-rwm', 'waterMins', true); remBind('s-rs', 'stretch'); remBind('s-rsm', 'stretchMins', true);
remBind('s-re', 'eyes'); remBind('s-rem', 'eyesMins', true); remBind('s-rcm', 'customMins', true);
bind('s-rc', el => { S.reminders.custom = el.value.replace(/[<>]/g, '').trim().slice(0, 28); }, 'input');
$('s-rtest').addEventListener('click', () => { if (driveBy.active) return; const R = S.reminders; startDriveBy(R.custom && R.customMins > 0 ? reminderBoard('custom') : R.water ? PW.REMINDERS.water : undefined); });
bind('s-driveby', el => { S.driveby = el.checked; nextDrive = performance.now() + 15000; });
$('s-season-reset').addEventListener('click', () => { S.season = { pts: [], wins: [], races: 0 }; save(); renderSeason(); });
bind('s-dim', el => { S.nightDim = el.checked; renderClock(); });
bind('s-from', el => { S.dimFrom = Math.max(0, Math.min(23, +el.value || 0)); renderClock(); });
bind('s-to', el => { S.dimTo = Math.max(0, Math.min(23, +el.value || 0)); renderClock(); });
$('s-import').addEventListener('change', e => {
  const f = e.target.files && e.target.files[0], msg = $('s-imsg'); if (!f) return;
  if (f.size > 5 * 1024 * 1024) { msg.className = 'hint err'; msg.textContent = 'That file is over 5 MB. Track files are usually under 200 KB.'; e.target.value = ''; return; }
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const def = PW.parseTrackFile(rd.result, f.name.replace(/\.(geo)?json$/i, ''));
      PW.buildCircuit(def);
      S.custom = [...S.custom.slice(-11), def]; S.single = def.id; S.rotation = 'single'; save(); syncForm();
      msg.className = 'hint ok'; msg.textContent = `Imported ${def.name} · ${(def.length / 1000).toFixed(2)} km. It is racing now.`;
      round++; newRace(def);
    } catch (err) { msg.className = 'hint err'; msg.textContent = 'Could not import this file. ' + err.message; }
    e.target.value = '';
  };
  rd.onerror = () => { msg.className = 'hint err'; msg.textContent = 'Could not read this file. Try saving it again as .geojson.'; };
  rd.readAsText(f);
});
$('s-clear').addEventListener('click', () => {
  S.custom = []; if (S.rotation === 'custom' || (S.rotation === 'single' && S.single.startsWith('custom-'))) { S.rotation = 'all'; S.single = PW.ORIGINAL_CIRCUITS[0].id; }
  save(); syncForm(); $('s-imsg').className = 'hint'; $('s-imsg').textContent = 'Imported tracks removed.';
});
$('s-reset').addEventListener('click', () => { S = { ...structuredClone(PW.DEFAULT_SETTINGS), mode: S.mode }; save(); syncForm(); applyTeams(); round++; newRace(pickNext(null)); });

// Send-a-Zoom-by opens next to this page on the web, or on the public site otherwise
if (!/^https?:$/.test(location.protocol) || /claude\.ai$|claudeusercontent/.test(location.hostname)) $('bsend').href = PW.HOME + 'send.html';

// ---------- Wall display lock ----------
function setupLock() {
  document.body.classList.add('locked');
  $('settings').hidden = true;
  addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  if (!HOST || !HOST.onAskPin) return;                    // a kiosk browser: reload without #display to leave
  const pad = $('pinpad'), dots = $('pindots'), msg = $('pinmsg'); let pin = '', closeT;
  const show = on => { pad.hidden = !on; pin = ''; dots.textContent = ''; msg.textContent = HOST.hasPin ? 'Enter the PIN to leave display mode' : 'No PIN is set. Press OK to leave display mode.'; clearTimeout(closeT); if (on) closeT = setTimeout(() => show(false), 30000); };
  HOST.onAskPin(() => show(true));
  pad.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    const k = b.dataset.k; clearTimeout(closeT); closeT = setTimeout(() => show(false), 30000);
    if (k === 'x') { show(false); return; }
    if (k === 'b') pin = pin.slice(0, -1);
    else if (k === 'ok') {
      const r = await HOST.submitPin(pin); pin = '';
      if (r && r.ok) { show(false); return; }
      msg.textContent = r && r.wait ? `Too many tries. Wait ${r.wait} seconds.` : 'Wrong PIN';
    } else if (pin.length < 12) pin += k;
    dots.textContent = '•'.repeat(pin.length);
  });
}
/* Unlicensed copies and the free web version say so, quietly, in Live Art. */
(function watermark() {
  const el = $('wm'); if (!el) return;
  const lic = HOST && HOST.licence;
  el.hidden = !!lic || !!CAP;
  el.textContent = HOST ? 'Lapwall preview · unlicensed copy' : 'Lapwall · free web preview';
})();

// ---------- Boot ----------
syncForm();
if (LOCK) setupLock();
newRace(pickNext(null));
setMode(LOCK ? 'art' : S.mode);
setView(S.view);
document.fonts?.ready.then(() => layout());
try { if (!CAP && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol) && window.top === window) navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) {}
window.__pw = {
  get race() { return race; }, get C() { return C; }, get phase() { return phase; }, get round() { return round; },
  ff(s) { while (s > 0) { if (race.state !== 'grid') race.step(.05); s -= .05; } renderHUD(); },
  start() { lightsT = 99; },
  crash(i = 0) { const c = race.running()[i]; race.startCrash(c, Math.floor(PW.mod(c.dist, C.L) / C.ds)); },
  spin(i = 0) { const c = race.running()[i]; race.startSpin(c, Math.floor(PW.mod(c.dist, C.L) / C.ds)); },
  garage() { showPodium(); phaseT = 12; }
};
requestAnimationFrame(frame);
})();
