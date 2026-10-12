/* App shell: race weekend loop, HUD, settings, cameras and controls. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const KEY = 'pitwall-settings';

// ---------- Settings ----------
function load() {
  let s = { ...PW.DEFAULT_SETTINGS };
  try { const j = JSON.parse(localStorage.getItem(KEY) || 'null'); if (j) s = { ...s, ...j }; else if (localStorage.getItem('pitwall-mode') === 'ambient') s.mode = 'ambient'; } catch (e) {}
  return s;
}
let S = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
const teams = () => PW.DEFAULT_TEAMS.map((t, i) => ({ ...t, ...((S.teams && S.teams[i]) || {}) }));
const allTracks = () => [...PW.ORIGINAL_CIRCUITS, ...(PW.REAL_CIRCUITS || []), ...S.custom];
function playlist() {
  const all = allTracks();
  const by = { original: PW.ORIGINAL_CIRCUITS, real: PW.REAL_CIRCUITS || [], custom: S.custom }[S.rotation];
  return by && by.length ? by : all;
}
function pickNext(cur) {
  if (S.rotation === 'single') return allTracks().find(t => t.id === S.single) || PW.ORIGINAL_CIRCUITS[0];
  const list = playlist().filter(t => !cur || t.id !== cur.id);
  return list.length ? list[Math.floor(Math.random() * list.length)] : cur;
}

// ---------- State ----------
const renderer = new PW.Renderer($('track'));
const pitcam = new PW.PitCam($('pitcam'));
const garage = new PW.Garage($('garage'));
let C, race, TS = 3, phase = 'race', phaseT = 0, round = 1, lightsT = 0, hold = 1, paused = false, nextDef = null, fade = null;
let msgs = [], bannerT = 0, firstStart = true, pendT = 0, garageInfo = null;

function newRace(def) {
  C = PW.buildCircuit(def); renderer.setCircuit(C);
  TS = C.T / S.lapSeconds;
  race = new PW.Race(C, { laps: S.laps, incidents: S.incidents, weather: S.weather, teams: teams() });
  race.on(onEvent);
  phase = 'race'; phaseT = 0; lightsT = 0; hold = rnd(.6, 2.2); firstStart = true; fade = null;
  pitcam.clear(); garage.hide(); $('podium').hidden = true; hideBanner(); $('fader').classList.remove('on');
  document.documentElement.style.setProperty('--accent', def.hue || '#38c6ff');
  const kind = def.kind === 'real' ? 'Real-layout replica' : def.kind === 'custom' ? 'Imported track' : 'Original circuit';
  $('round').textContent = round; $('kind').textContent = kind + ' · Simulated race';
  $('cname').textContent = def.name; $('aname').textContent = def.name; $('aplace').textContent = def.place || kind;
  $('alen').textContent = (C.L / 1000).toFixed(3) + ' km'; $('acorn').textContent = C.corners.length; $('alaps').textContent = S.laps;
  nextDef = pickNext(def);
  msgs = []; renderTicker(); buildRows(); layout();
  if (race.weather.kind === 'wet') say('Wet race · everyone starts on intermediates', 'wx');
}

// ---------- Events → ticker, banners, cameras ----------
function onEvent(type, d) {
  const c = d.car, fav = !!c && c.team === S.favTeam;
  switch (type) {
    case 'pit':
      say(`${c.code} pits · ${PW.TYRES[d.tyre].n} · ${d.dur.toFixed(1)}s${d.slow ? ' · slow stop' : ''}`, d.slow ? 'sc' : '', fav);
      if (S.pitcam && S.mode === 'race' && innerWidth >= 760) pitcam.push({ car: c, dur: d.dur, tyre: d.tyre, prevTyre: c.tyre, slow: d.slow, priority: fav });
      break;
    case 'spin': say(`${c.code} spins at turn ${d.corner}!`, 'sc', fav); break;
    case 'crash': say(`Crash! ${c.code} hits the barrier at turn ${d.corner}`, 'red', fav); banner('Crash', `${c.code} · turn ${d.corner}`, 'crash', 2.6); break;
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
  }
}
function say(text, cls = '', fav = false) {
  msgs.unshift({ text, cls: cls + (fav ? ' fav' : ''), lap: race ? (race.state === 'grid' && !race.startT ? 0 : race.leaderLap()) : 0, at: performance.now() });
  msgs = msgs.slice(0, 3); renderTicker();
}
function renderTicker() {
  $('ticker').innerHTML = msgs.slice().reverse().map((m, k, a) => `<div class="msg ${m.cls}${k < a.length - 1 ? ' old' : ''}"><span class="t">L${m.lap}</span><span>${m.text}</span></div>`).join('');
}
function banner(text, sub, cls, secs) {
  const b = $('banner'); b.className = 'banner ' + cls; b.innerHTML = text + (sub ? `<small>${sub}</small>` : ''); b.hidden = false; bannerT = secs;
}
function hideBanner() { $('banner').hidden = true; bannerT = 0; }

function showPodium() {
  phase = 'podium'; phaseT = 0; pitcam.clear(); hideBanner();
  const [p1, p2, p3] = race.finishOrder, T = teams();
  if (!p1) { phaseT = 12; return; }
  $('pcode').textContent = p1.code; $('pteam').textContent = T[p1.team].name + ' · Winner';
  $('pbar').style.background = p1.color; $('ptitle').textContent = `Chequered flag · ${C.def.name}`;
  const fl = race.fl.car;
  $('places').innerHTML = [p2, p3].filter(Boolean).map((c, k) => `<div><span class="p">P${k + 2}</span><span class="bar" style="background:${c.color}"></span><span>${c.code}</span><span class="v">+${(c.ftime - p1.ftime).toFixed(3)}</span></div>`).join('') +
    (fl ? `<div class="flrow"><span class="p">FL</span><span class="bar" style="background:${fl.color}"></span><span>${fl.code}</span><span class="v">${PW.fmtLap(race.fl.t)}</span></div>` : '') +
    (race.cars.some(c => c.out) ? `<div><span class="p">DNF</span><span class="bar" style="background:var(--red)"></span><span>${race.cars.filter(c => c.out).map(c => c.code).join(' ')}</span><span class="v"></span></div>` : '');
  $('podium').hidden = false;
  const useFav = S.favTeam >= 0 && round % 2 === 0;
  const ti = useFav ? S.favTeam : p1.team;
  garageInfo = { team: T[ti], num: race.cars[ti * 2].num, drivers: [race.cars[ti * 2].code, race.cars[ti * 2 + 1].code],
    fact: PW.FACTS[Math.floor(Math.random() * PW.FACTS.length)], why: useFav ? 'Your team' : 'Race winner', tyreC: PW.TYRES[p1.tyre].c };
}

// ---------- HUD ----------
const rowEls = new Map();
function buildRows() {
  const rows = $('rows'); rows.innerHTML = ''; rowEls.clear();
  race.cars.forEach(c => {
    const el = document.createElement('div'); el.className = 'row';
    el.innerHTML = `<span class="pos"></span><span class="bar" style="background:${c.color}"></span><span class="code">${c.code}</span><span class="gap"></span><span class="tyre"></span>`;
    rows.appendChild(el); rowEls.set(c, { el, pos: el.children[0], bar: el.children[1], gap: el.children[3], tyre: el.children[4] });
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
    r.el.classList.toggle('out', c.out); r.el.classList.toggle('fav', c.team === S.favTeam); r.el.classList.toggle('punct', c.puncture);
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
}

// ---------- Layout ----------
function layout() {
  const DPR = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight, narrow = W < 760;
  const row = narrow ? 24 : Math.max(16, Math.min(28, (H - 122 - 60) / 20));
  document.documentElement.style.setProperty('--row', row + 'px');
  let r;
  if (S.mode === 'ambient') r = narrow ? { x: 16, y: H * .16, w: W - 32, h: H * .5 } : { x: W * .05, y: H * .1, w: W * .9, h: H * .62 };
  else if (narrow) r = { x: 16, y: 150, w: W - 32, h: Math.max(140, H - 150 - (5 * row + 120)) };
  else r = { x: 290, y: 104, w: W - 290 - 36, h: H - 104 - 120 };
  renderer.layout(W, H, DPR, r);
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
      phaseT += dtR; $('pnext').textContent = `Next: ${nextDef.name} in ${Math.max(0, Math.ceil(12 - phaseT))}s`;
      if (phaseT > 12) {
        $('podium').hidden = true;
        if (S.garage && garageInfo) { phase = 'garage'; phaseT = 0; garage.show(garageInfo); } else { round++; newRace(nextDef); }
      }
    } else if (phase === 'garage') {
      phaseT += dtR; garage.update(dtR, 20 - phaseT, nextDef.name);
      if (phaseT > 20) { round++; newRace(nextDef); }
    }
    pitcam.update(dtR);
    if (race.pending && now - pendT > 2200) {
      const p = race.pending; say(`${p.a.code} passes ${p.b.code} for P${p.p + 1}`, '', p.a.team === S.favTeam); race.pending = null; pendT = now;
    }
    if (bannerT > 0) { bannerT -= dtR; if (bannerT <= 0) hideBanner(); }
  }
  if (phase !== 'garage') renderer.draw(race, now, paused ? 0 : dtR, { labels: S.mode === 'race', fav: S.favTeam });
  if (now - hudT > 200) { renderHUD(); hudT = now; }
  if (now - clockT > 1000) {
    renderClock(); clockT = now;
    const before = msgs.length; msgs = msgs.filter(m => now - m.at < 16000); if (msgs.length !== before) renderTicker();
  }
  requestAnimationFrame(frame);
}
let lightsOff = 0;

// ---------- Controls ----------
function setMode(m) {
  S.mode = m; save(); document.body.classList.toggle('ambient', m === 'ambient');
  $('bmode').textContent = m === 'ambient' ? 'Race view' : 'Ambient';
  if (m === 'ambient') pitcam.clear();
  layout();
}
const nextRace = () => { round++; newRace(phase === 'race' && race.state !== 'done' ? pickNext(C.def) : nextDef); };
async function fullscreen() {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch (e) {}
  try { await navigator.wakeLock?.request('screen'); } catch (e) {}
}
const openSettings = open => { $('settings').hidden = !open; if (open) { document.body.classList.remove('idle'); $('sclose').focus(); } };
$('bmode').addEventListener('click', () => setMode(S.mode === 'ambient' ? 'race' : 'ambient'));
$('bnext').addEventListener('click', nextRace);
$('bfull').addEventListener('click', fullscreen);
$('bset').addEventListener('click', () => openSettings($('settings').hidden));
$('sclose').addEventListener('click', () => openSettings(false));
addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input, select')) return;
  const k = e.key.toLowerCase();
  if (k === 'a') setMode(S.mode === 'ambient' ? 'race' : 'ambient');
  else if (k === 'n') nextRace();
  else if (k === 'c') openSettings($('settings').hidden);
  else if (k === 'f') fullscreen();
  else if (k === 'p') { paused = !paused; say(paused ? 'Paused' : 'Resumed'); }
  else if (k === 'escape') openSettings(false);
});
let idleT;
const wake = () => { document.body.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(() => { if ($('settings').hidden) document.body.classList.add('idle'); }, 4000); };
['pointermove', 'pointerdown', 'keydown'].forEach(e => addEventListener(e, wake)); wake();
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(layout, 120); });

// ---------- Settings panel ----------
function fillTrackSelect() {
  const sel = $('s-single'), grp = (label, list) => list.length ? `<optgroup label="${label}">${list.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}</optgroup>` : '';
  sel.innerHTML = grp('Original circuits', PW.ORIGINAL_CIRCUITS) + grp('Real-layout replicas', PW.REAL_CIRCUITS || []) + grp('Imported', S.custom);
  sel.value = S.single;
}
function fillTeams() {
  const T = teams();
  $('s-fav').innerHTML = '<option value="-1">None</option>' + T.map((t, i) => `<option value="${i}">${t.name}</option>`).join('');
  $('s-fav').value = S.favTeam;
  $('s-teams').innerHTML = T.map((t, i) => `<div class="team-row"><input type="color" id="tc1-${i}" value="${t.color}" aria-label="${t.name} main colour"><input type="color" id="tc2-${i}" value="${t.color2}" aria-label="${t.name} second colour"><input type="text" id="tn-${i}" value="${t.name}" maxlength="16" aria-label="Team ${i + 1} name"></div>`).join('');
  T.forEach((t, i) => ['tc1', 'tc2', 'tn'].forEach(p => $(`${p}-${i}`).addEventListener('input', () => {
    S.teams = S.teams || [];
    S.teams[i] = { name: $(`tn-${i}`).value.trim() || PW.DEFAULT_TEAMS[i].name, color: $(`tc1-${i}`).value, color2: $(`tc2-${i}`).value };
    save(); applyTeams();
    if (p === 'tn') { const o = $('s-fav').options[i + 1]; if (o) o.textContent = S.teams[i].name; }
  })));
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
  fillTeams();
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
bind('s-dim', el => { S.nightDim = el.checked; renderClock(); });
bind('s-from', el => { S.dimFrom = Math.max(0, Math.min(23, +el.value || 0)); renderClock(); });
bind('s-to', el => { S.dimTo = Math.max(0, Math.min(23, +el.value || 0)); renderClock(); });
$('s-import').addEventListener('change', e => {
  const f = e.target.files && e.target.files[0], msg = $('s-imsg'); if (!f) return;
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
$('s-reset').addEventListener('click', () => { S = { ...PW.DEFAULT_SETTINGS, mode: S.mode }; save(); syncForm(); applyTeams(); round++; newRace(pickNext(null)); });

// ---------- Boot ----------
syncForm();
newRace(S.rotation === 'single' ? pickNext(null) : pickNext(null));
setMode(S.mode);
document.fonts?.ready.then(() => layout());
try { if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && window.top === window) navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) {}
window.__pw = {
  get race() { return race; }, get C() { return C; }, get phase() { return phase; },
  ff(s) { while (s > 0) { if (race.state !== 'grid') race.step(.05); s -= .05; } renderHUD(); },
  start() { lightsT = 99; },
  crash(i = 0) { const c = race.running()[i]; race.startCrash(c, Math.floor(PW.mod(c.dist, C.L) / C.ds)); },
  spin(i = 0) { const c = race.running()[i]; race.startSpin(c, Math.floor(PW.mod(c.dist, C.L) / C.ds)); },
  garage() { showPodium(); phaseT = 12; }
};
requestAnimationFrame(frame);
})();
