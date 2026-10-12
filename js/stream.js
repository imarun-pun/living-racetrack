/* Lapwall Stream Studio (the streamer's side of live join).
   Viewers open play.html from your chat on their phones. Their name goes on a car in this race and they call its
   strategy; this page relays that to the race running in the frame (index.html?stream) and sends everyone the race
   state once a second. Nothing is stored online. Names are always shown as plain text. */
(() => {
const $ = id => document.getElementById(id);
const ROOM = 'lapwall-stream-room', SEASON = 'lapwall-stream-season', OPTS = 'lapwall-stream-opts';
const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const store = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };
const clean = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20);

// ---------- room and settings ----------
let room = store(ROOM) || PW.newRoomId(); store(ROOM, room);
let opts = Object.assign({ laps: 6 }, store(OPTS) || {});
const TEST = /(^|[#&])test\b/.test(location.hash);   // stream.html#test: phones in other tabs of this browser, no internet
$('laps').value = String(opts.laps);
$('gear').addEventListener('click', () => { $('setup').hidden = !$('setup').hidden; renderKick(); });
$('close').addEventListener('click', () => { $('setup').hidden = true; });
addEventListener('keydown', e => { if (e.key === 'Escape') $('setup').hidden = true; });

function joinLink() {
  const base = /^https?:$/.test(location.protocol) && !/claude\.ai$|claudeusercontent/.test(location.hostname) ? new URL('play.html', location.href).href : 'https://imarun-pun.github.io/living-racetrack/play.html';
  return `${base}#r=${room}` + (TEST ? '&test' : '');
}
function showLink() {
  const link = joinLink();
  $('link').value = link;
  $('short').textContent = 'Link in chat · room ' + room.slice(0, 4).toUpperCase();
  const cv = $('qr'), g = cv.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
  if (!link) return;
  const q = qrcode(0, 'L'); q.addData(link); q.make();
  const n = q.getModuleCount(), px = Math.max(1, Math.floor(cv.width / (n + 4))), off = Math.floor((cv.width - n * px) / 2);
  g.fillStyle = '#07090d';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) g.fillRect(off + x * px, off + y * px, px, px);
}
$('copy').addEventListener('click', () => { const v = $('link').value; (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => { $('copy').textContent = 'Copied'; setTimeout(() => { $('copy').textContent = 'Copy'; }, 1500); }).catch(() => { $('link').select(); }); });
$('newroom').addEventListener('click', () => { if (!confirm('Make a new link? People on the old link will be disconnected.')) return; room = PW.newRoomId(); store(ROOM, room); connect(); });
$('testphone').addEventListener('click', () => window.open(joinLink(), '_blank', 'noopener'));
$('laps').addEventListener('change', () => { opts.laps = +$('laps').value; store(OPTS, opts); if (api) api.config({ laps: opts.laps }); });

// ---------- the race in the frame ----------
let api = null;
const frame = $('app');
function hook() {
  api = frame.contentWindow && frame.contentWindow.__lapwallStream;
  if (!api) { setTimeout(hook, 300); return; }
  api.config({ laps: opts.laps }); api.on(onRace);
}
frame.addEventListener('load', hook);

// ---------- viewers ----------
let conn = null;
const ids = new Map(), lastMsg = new Map(), banned = new Set();
const sha = async s => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))), b => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
async function onViewer(m) {
  if (!m || typeof m !== 'object' || typeof m.id !== 'string' || !/^[a-f0-9]{16,40}$/.test(m.id) || !api) return;
  const now = Date.now(); if (now - (lastMsg.get(m.id) || 0) < 500) return;   // two messages a second per phone, at most
  lastMsg.set(m.id, now);
  const pub = ids.get(m.id) || await sha(m.id); ids.set(m.id, pub);
  const key = 'v:' + pub;
  if (banned.has(key)) return;
  if (m.t === 'join') {
    const name = clean(m.name); if (!name) return;
    const r = api.join(key, name, 'live');
    if (r && r.full) feed(name, 'wants a car · the grid is full');
    else if (r && !r.again) feed(name, `takes car #${r.num}`);
  } else if (m.t === 'cmd' && ['push', 'save', 'normal', 'box', 'boost'].includes(m.cmd)) {
    const r = api.act(key, m.cmd), s = api.state().seats.find(x => x.key === key);
    if (r && s) feed(s.name, { push: 'pushes hard', save: 'saves the tyres', normal: 'back to normal pace', box: 'calls BOX THIS LAP', boost: 'fires the OVERTAKE BOOST ⚡' }[r]);
  } else if (m.t === 'pick') {
    const r = api.pick(key, String(m.code || '').slice(0, 20)), s = api.state().seats.find(x => x.key === key);
    if (r) feed(s ? s.name : 'A viewer', `picks ${r.code} to win`);
  } else if (m.t === 'leave') api.leave(key);
}
function connect() {
  if (conn) conn.close();
  showLink(); setStatus('Connecting…', false);
  conn = PW.liveListen(room, TEST, onViewer, (s, ok) => setStatus(`Live join: ${s} · room ${room.slice(0, 4).toUpperCase()}`, ok));
}

// ---------- the viewer championship ----------
let season = store(SEASON) || { races: 0, pts: {} };
function onRace(m) {
  if (m.type === 'lights-out') moment('Lights out · picks are closed', 2500);
  if (m.type === 'done' && m.finish) {
    season.races++;
    m.finish.forEach(f => { if (!f.viewer) return; const r = season.pts[f.viewer] || (season.pts[f.viewer] = { name: f.name, pts: 0, wins: 0 }); r.name = f.name; r.pts += POINTS[f.pos - 1] || 0; if (f.pos === 1) r.wins++; });
    const win = m.finish[0]; let right = 0;
    (m.picks || []).forEach(([key, slot]) => { if (win && slot === win.slot) { right++; const r = season.pts[key]; if (r) r.pts += 5; } });
    store(SEASON, season);
    if (win) moment(`🏆 ${win.name} wins${win.viewer ? '!' : ''}${right ? ` · ${right} called it (+5)` : ''}`, 9000);
  }
  if (m.type === 'crash' && m.car && m.car.viewer) moment(`💥 ${m.car.name} crashes out`, 3500);
}
function renderChamp() {
  const rows = Object.entries(season.pts).sort((a, b) => b[1].pts - a[1].pts).slice(0, 8), ol = $('champList');
  ol.textContent = '';
  if (!rows.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'Finish a race in a viewer car to score'; ol.appendChild(li); }
  rows.forEach(([, r], i) => { const li = document.createElement('li'); const p = document.createElement('span'); p.className = 'pos'; p.textContent = i + 1; const n = document.createElement('span'); n.className = 'n'; n.textContent = r.name; const b = document.createElement('span'); b.className = 'p'; b.textContent = r.pts; li.append(p, n, b); ol.appendChild(li); });
  $('raceCount').textContent = season.races;
}
$('reset').addEventListener('click', () => { if (confirm('Reset the viewer championship?')) { season = { races: 0, pts: {} }; store(SEASON, season); renderChamp(); } });
function renderKick() {
  const ol = $('kickList'); ol.textContent = ''; if (!api) return;
  const seats = api.state().seats;
  if (!seats.length) { const li = document.createElement('li'); li.textContent = 'Nobody has joined yet'; ol.appendChild(li); }
  seats.forEach(s => { const li = document.createElement('li'); const n = document.createElement('span'); n.textContent = `#${s.num} ${s.name}`; const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Remove'; b.onclick = () => { banned.add(s.key); api.leave(s.key); renderKick(); }; li.append(n, b); ol.appendChild(li); });
}

// ---------- overlay ----------
function feed(user, what) {
  const li = document.createElement('li'), n = document.createElement('b'); n.textContent = user; li.append(n, document.createTextNode(' ' + what));
  const ul = $('feed'); ul.appendChild(li); while (ul.children.length > 6) ul.firstChild.remove();
  setTimeout(() => li.classList.add('old'), 12000);
}
let momentT;
function moment(text, ms) { const el = $('moment'); el.textContent = text; el.hidden = false; clearTimeout(momentT); momentT = setTimeout(() => { el.hidden = true; }, ms); }
function setStatus(text, ok) { const el = $('status'); el.textContent = text; el.className = 'status ' + (ok ? 'ok' : 'bad'); }
let lastState = '';
setInterval(() => {
  if (!api) return;
  const s = api.state(), ol = $('seatList');
  $('seatCount').textContent = s.seats.length; ol.textContent = '';
  s.seats.sort((a, b) => (a.pos || 99) - (b.pos || 99)).slice(0, 10).forEach(v => {
    const li = document.createElement('li');
    const p = document.createElement('span'); p.className = 'pos'; p.textContent = v.pos ? 'P' + v.pos : '–';
    const bar = document.createElement('span'); bar.className = 'bar'; bar.style.background = v.color;
    const n = document.createElement('span'); n.className = 'n'; n.textContent = v.name;
    const m = document.createElement('span'); m.className = 'm'; m.textContent = v.boosting ? 'BOOST' : v.box ? 'BOX' : v.mode === 'push' ? 'PUSH' : v.mode === 'save' ? 'SAVE' : '';
    li.append(p, bar, n, m); ol.appendChild(li);
  });
  const st = s.state + s.id;
  if (st !== lastState) { lastState = st; if (s.state === 'grid' && s.lap === 0) moment(`${s.track} · scan to get a car · pick the winner before lap 2`, 8000); }
  renderChamp();
}, 500);

renderChamp();
connect();
})();
