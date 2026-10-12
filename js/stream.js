/* Lapwall Stream Studio: reads chat from Kick, YouTube and Twitch, gives viewers cars, and runs a chat championship.
   The race itself runs in the frame (index.html?stream); this page only calls its window.__lapwallStream API.
   Chat text is never inserted as HTML. Nothing is sent anywhere except the read-only chat connections. */
(() => {
const $ = id => document.getElementById(id);
const KEY = 'lapwall-stream', SEASON = 'lapwall-stream-season';
const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const BADGE = { kick: ['K', '#53fc18'], youtube: ['Y', '#ff3b3b'], twitch: ['T', '#a970ff'], test: ['•', '#8a94a8'] };
const store = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };

// ---------- settings: saved in this browser, or given in the address ----------
let cfg = Object.assign({ kickRoom: '', ytVideo: '', ytKey: '', twitch: '', laps: 6 }, store(KEY) || {});
const h = new URLSearchParams(location.hash.slice(1));
if (h.get('kick')) cfg.kickRoom = h.get('kick'); if (h.get('twitch')) cfg.twitch = h.get('twitch');
if (h.get('yt')) cfg.ytVideo = h.get('yt'); if (h.get('ytkey')) cfg.ytKey = h.get('ytkey');
cfg.kickRoom = String(cfg.kickRoom).replace(/\D/g, '').slice(0, 12); cfg.twitch = String(cfg.twitch).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 25);
cfg.ytVideo = String(cfg.ytVideo).replace(/[^\w-]/g, '').slice(0, 20); cfg.ytKey = String(cfg.ytKey).replace(/[^\w-]/g, '').slice(0, 60);
['kickRoom', 'ytVideo', 'ytKey', 'twitch'].forEach(k => { $(k).value = cfg[k]; });
$('laps').value = String(cfg.laps);
$('gear').addEventListener('click', () => { $('setup').hidden = !$('setup').hidden; });
$('close').addEventListener('click', () => { $('setup').hidden = true; });
addEventListener('keydown', e => { if (e.key === 'Escape') $('setup').hidden = true; });

// ---------- the race in the frame ----------
let api = null;
const frame = $('app');
function hook() {
  api = frame.contentWindow && frame.contentWindow.__lapwallStream;
  if (!api) { setTimeout(hook, 300); return; }
  api.config({ laps: cfg.laps });
  api.on(onRace);
}
frame.addEventListener('load', hook);

// ---------- chat → commands ----------
const lastCmd = new Map();
function onChat(platform, user, text) {
  user = String(user || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 20); text = String(text || '').trim();
  if (!user || !api || text[0] !== '!') return;
  const key = platform + ':' + user.toLowerCase(), now = Date.now();
  if (now - (lastCmd.get(key) || 0) < 1500) return;          // one command every 1.5 s per viewer
  lastCmd.set(key, now);
  const [cmd, ...rest] = text.slice(1).split(/\s+/), c = cmd.toLowerCase();
  if (c === 'join' || c === 'race') {
    const r = api.join(key, user, platform);
    if (r && r.full) feed(platform, user, 'wants a car · the grid is full');
    else if (r && !r.again) feed(platform, user, `takes car #${r.num}`);
  } else if (c === 'leave') { api.leave(key); feed(platform, user, 'leaves the grid'); }
  else if (['push', 'save', 'normal', 'box', 'boost'].includes(c)) {
    const r = api.act(key, c);
    if (r) feed(platform, user, { push: 'pushes hard', save: 'saves the tyres', normal: 'back to normal pace', box: 'calls BOX THIS LAP', boost: 'fires the OVERTAKE BOOST ⚡' }[r]);
  } else if (c === 'pick' || c === 'predict') {
    const r = api.pick(key, rest.join(' '));
    if (r) feed(platform, user, `picks ${r.code} to win`);
  }
}

// ---------- the chat championship ----------
let season = store(SEASON) || { races: 0, pts: {} };
function onRace(m) {
  if (m.type === 'lights-out') moment('Lights out · picks are closed', 2500);
  if (m.type === 'done' && m.finish) {
    season.races++;
    m.finish.forEach(f => { if (!f.viewer) return; const r = season.pts[f.viewer] || (season.pts[f.viewer] = { name: f.name, pts: 0, wins: 0 }); r.name = f.name; r.pts += POINTS[f.pos - 1] || 0; if (f.pos === 1) r.wins++; });
    const win = m.finish[0]; let right = 0;
    (m.picks || []).forEach(([key, slot]) => { if (win && slot === win.slot) { right++; const r = season.pts[key] || (season.pts[key] = { name: key.split(':')[1], pts: 0, wins: 0 }); r.pts += 5; } });
    store(SEASON, season);
    if (win) moment(`🏆 ${win.name} wins${win.viewer ? ' for chat' : ''}${right ? ` · ${right} called it (+5)` : ''}`, 9000);
  }
  if (m.type === 'crash' && m.car && m.car.viewer) moment(`💥 ${m.car.name} crashes out`, 3500);
}
function renderChamp() {
  const rows = Object.entries(season.pts).sort((a, b) => b[1].pts - a[1].pts).slice(0, 8);
  const ol = $('champList'); ol.textContent = '';
  if (!rows.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'Finish a race in a chat car to score'; ol.appendChild(li); }
  rows.forEach(([key, r]) => { const li = document.createElement('li'); li.appendChild(badge(key.split(':')[0])); const n = document.createElement('span'); n.className = 'n'; n.textContent = r.name; const p = document.createElement('span'); p.className = 'p'; p.textContent = r.pts; li.append(n, p); ol.appendChild(li); });
  $('raceCount').textContent = season.races;
}
$('reset').addEventListener('click', () => { if (confirm('Reset the chat championship?')) { season = { races: 0, pts: {} }; store(SEASON, season); renderChamp(); } });

// ---------- overlay ----------
function badge(platform) { const [ch, col] = BADGE[platform] || BADGE.test, b = document.createElement('i'); b.className = 'badge'; b.textContent = ch; b.style.background = col; return b; }
function feed(platform, user, what) {
  const li = document.createElement('li'); li.appendChild(badge(platform));
  const n = document.createElement('b'); n.textContent = user; li.append(n, document.createTextNode(' ' + what));
  const ul = $('feed'); ul.appendChild(li); while (ul.children.length > 6) ul.firstChild.remove();
  setTimeout(() => li.classList.add('old'), 12000);
}
let momentT;
function moment(text, ms) { const el = $('moment'); el.textContent = text; el.hidden = false; clearTimeout(momentT); momentT = setTimeout(() => { el.hidden = true; }, ms); }
let lastState = '';
setInterval(() => {
  if (!api) return;
  const s = api.state(), ol = $('seatList');
  $('seatCount').textContent = s.seats.length;
  ol.textContent = '';
  s.seats.sort((a, b) => (a.pos || 99) - (b.pos || 99)).slice(0, 10).forEach(v => {
    const li = document.createElement('li');
    const p = document.createElement('span'); p.className = 'pos'; p.textContent = v.pos ? 'P' + v.pos : '–';
    const bar = document.createElement('span'); bar.className = 'bar'; bar.style.background = v.color;
    const n = document.createElement('span'); n.className = 'n'; n.textContent = v.name;
    const m = document.createElement('span'); m.className = 'm'; m.textContent = v.mode === 'push' ? 'PUSH' : v.mode === 'save' ? 'SAVE' : '';
    li.append(p, bar, badge(v.platform), n, m); ol.appendChild(li);
  });
  const st = s.state + s.id;
  if (st !== lastState) { lastState = st; if (s.state === 'grid' && s.lap === 0) moment(`${s.track} · type !join for a car · !pick CODE to call the winner`, 8000); }
  renderChamp();
}, 500);

// ---------- chat connections ----------
const status = {};
function setStatus(p, txt, ok) { status[p] = [txt, ok]; const el = $('status'); el.textContent = ''; Object.entries(status).forEach(([k, [t, good]]) => { const s = document.createElement('span'); s.className = good ? 'ok' : 'bad'; s.appendChild(badge(k)); s.append(' ' + t); el.appendChild(s); }); }
const sockets = [];
function connectKick(room) {
  const ws = new WebSocket('wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0&flash=false'); sockets.push(ws);
  ws.onopen = () => ws.send(JSON.stringify({ event: 'pusher:subscribe', data: { auth: '', channel: `chatrooms.${room}.v2` } }));
  ws.onmessage = e => {
    let m; try { m = JSON.parse(e.data); } catch (err) { return; }
    if (m.event === 'pusher:ping') ws.send(JSON.stringify({ event: 'pusher:pong', data: {} }));
    else if (m.event === 'pusher_internal:subscription_succeeded') setStatus('kick', 'Kick connected', true);
    else if (m.event === 'App\\Events\\ChatMessageEvent') { try { const d = JSON.parse(m.data); onChat('kick', d.sender && d.sender.username, d.content); } catch (err) { /* ignore */ } }
  };
  ws.onclose = () => { setStatus('kick', 'Kick reconnecting…', false); setTimeout(() => connectKick(room), 5000); };
}
function connectTwitch(ch) {
  const ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443'); sockets.push(ws);
  ws.onopen = () => { ws.send('CAP REQ :twitch.tv/tags'); ws.send('PASS SCHMOOPIIE'); ws.send('NICK justinfan' + (10000 + Math.floor(Math.random() * 80000))); ws.send('JOIN #' + ch); };
  ws.onmessage = e => String(e.data).split('\r\n').forEach(line => {
    if (line.startsWith('PING')) { ws.send('PONG :tmi.twitch.tv'); return; }
    if (line.includes(' 366 ')) setStatus('twitch', 'Twitch connected', true);
    const m = /^(?:@(\S+) )?:(\w+)!\S+ PRIVMSG #\w+ :(.*)$/.exec(line); if (!m) return;
    const dn = m[1] && /(?:^|;)display-name=([^;]*)/.exec(m[1]);
    onChat('twitch', (dn && dn[1]) || m[2], m[3]);
  });
  ws.onclose = () => { setStatus('twitch', 'Twitch reconnecting…', false); setTimeout(() => connectTwitch(ch), 5000); };
}
async function connectYouTube(video, key) {
  const api = 'https://www.googleapis.com/youtube/v3/';
  try {
    const v = await (await fetch(`${api}videos?part=liveStreamingDetails&id=${encodeURIComponent(video)}&key=${encodeURIComponent(key)}`)).json();
    const chat = v.items && v.items[0] && v.items[0].liveStreamingDetails && v.items[0].liveStreamingDetails.activeLiveChatId;
    if (!chat) { setStatus('youtube', v.error ? 'YouTube: ' + (v.error.message || 'key error').slice(0, 60) : 'YouTube: that video is not live', false); return; }
    setStatus('youtube', 'YouTube connected', true);
    let page = '', first = true;
    const poll = async () => {
      try {
        const r = await (await fetch(`${api}liveChat/messages?liveChatId=${encodeURIComponent(chat)}&part=snippet,authorDetails&maxResults=200&key=${encodeURIComponent(key)}${page ? '&pageToken=' + page : ''}`)).json();
        if (r.error) { setStatus('youtube', 'YouTube: ' + String(r.error.message || 'error').slice(0, 60), false); setTimeout(poll, 30000); return; }
        page = r.nextPageToken || page;
        if (!first) (r.items || []).forEach(it => onChat('youtube', it.authorDetails && it.authorDetails.displayName, it.snippet && it.snippet.displayMessage));
        first = false;
        setTimeout(poll, Math.max(5000, r.pollingIntervalMillis || 5000));
      } catch (e) { setStatus('youtube', 'YouTube: connection lost, retrying', false); setTimeout(poll, 15000); }
    };
    poll();
  } catch (e) { setStatus('youtube', 'YouTube: could not connect', false); }
}
function connectAll() {
  sockets.forEach(s => { s.onclose = null; s.close(); }); sockets.length = 0;
  if (cfg.kickRoom) connectKick(cfg.kickRoom);
  if (cfg.twitch) connectTwitch(cfg.twitch);
  if (cfg.ytVideo && cfg.ytKey) connectYouTube(cfg.ytVideo, cfg.ytKey);
  if (!cfg.kickRoom && !cfg.twitch && !cfg.ytVideo) setStatus('test', 'No chat connected · open Settings', false);
}
$('connect').addEventListener('click', () => {
  cfg = { kickRoom: $('kickRoom').value.replace(/\D/g, '').slice(0, 12), ytVideo: $('ytVideo').value.replace(/[^\w-]/g, '').slice(0, 20), ytKey: $('ytKey').value.replace(/[^\w-]/g, '').slice(0, 60),
    twitch: $('twitch').value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 25), laps: +$('laps').value };
  store(KEY, cfg); delete status.test; if (api) api.config({ laps: cfg.laps }); connectAll(); $('setup').hidden = true;
});

// ---------- fake chat, to try it before going live ----------
let testT = null;
$('test').addEventListener('click', () => {
  if (testT) { clearInterval(testT); testT = null; $('test').textContent = 'Test with fake chat'; return; }
  $('test').textContent = 'Stop fake chat'; $('setup').hidden = true;
  const names = ['turbo_tom', 'Ana.Racing', 'pitlane_pete', 'mia_k', 'GridGhost', 'LateBraker', 'sofia_rx', 'DRSdaddy', 'nori', 'apex_hunter', 'Kai99', 'LapLegend'];
  const plats = ['kick', 'youtube', 'twitch'];
  let n = 0;
  testT = setInterval(() => {
    const who = names[Math.floor(Math.random() * Math.min(names.length, 2 + n / 2))], p = plats[who.length % 3]; n++;
    const r = Math.random(), s = api && api.state();
    const msg = n < 14 || r < .15 ? '!join' : s && s.picksOpen && r < .45 ? '!pick ' + (s.leader || 'VER') : ['!push', '!save', '!box', '!boost', '!boost', '!push'][Math.floor(Math.random() * 6)];
    lastCmd.delete(p + ':' + who.toLowerCase());
    onChat(p, who, msg);
  }, 900);
});

renderChamp();
connectAll();
})();
