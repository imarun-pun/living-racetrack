/* Synced races without a server.
   A race is fully decided by its seed, so every screen that knows the seed and the start time runs the same race
   at the same moment. Nothing is uploaded, nobody needs an account, and late arrivals simply fast-forward.

   World Race: every Lapwall on Earth races together. A new race starts every few minutes on the UTC clock;
   the circuit and the seed come from the slot number, so every device picks the same ones.
   Race Room: a private race for friends. The invite link carries the seed, start time, circuit and names. */
window.PW = window.PW || {};
(() => {
PW.WORLD_RACE = { slotMin: 6, laps: 8, lapSeconds: 24, epoch: Date.UTC(2026, 0, 1) };

/* The World Race slot for a moment in time. */
PW.worldSlot = function (now = Date.now()) {
  const len = PW.WORLD_RACE.slotMin * 60000, n = Math.floor((now - PW.WORLD_RACE.epoch) / len);
  const seed = PW.hashSeed('lapwall-world-' + n), pool = PW.REAL_CIRCUITS && PW.REAL_CIRCUITS.length ? PW.REAL_CIRCUITS : PW.ORIGINAL_CIRCUITS;
  const track = pool[PW.rng(seed ^ 0x9e3779b9)() * pool.length | 0];
  return { kind: 'world', n, start: PW.WORLD_RACE.epoch + n * len, end: PW.WORLD_RACE.epoch + (n + 1) * len, seed, track, laps: PW.WORLD_RACE.laps, lapSeconds: PW.WORLD_RACE.lapSeconds, title: `World Race #${n.toLocaleString('en-US')}` };
};

// ---------- Race Room links ----------
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const b64 = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
const allTracks = () => [...(PW.ORIGINAL_CIRCUITS || []), ...(PW.REAL_CIRCUITS || [])];

/* Check and tidy a room. Returns null if anything is off. */
PW.cleanRoom = function (o) {
  if (!o || typeof o !== 'object') return null;
  const track = allTracks().find(t => t.id === o.t); if (!track) return null;
  const start = Math.round(+o.s), now = Date.now();
  if (!isFinite(start) || start < now - 7 * 864e5 || start > now + 60 * 864e5) return null;
  const seed = (+o.d) >>> 0, laps = [6, 8, 12].includes(+o.l) ? +o.l : 8;
  const names = Array.isArray(o.g) ? o.g.slice(0, 20).map(n => clean(n, 20)).filter(Boolean) : [];
  return { kind: 'room', t: track.id, track, s: start, start, d: seed, seed, l: laps, laps, lapSeconds: 24,
    n: clean(o.n, 40) || 'Race Room', h: clean(o.h, 20), g: names, title: clean(o.n, 40) || 'Race Room' };
};
PW.encodeRoom = r => b64(JSON.stringify({ v: 1, n: r.n, h: r.h, t: r.t, l: r.l, s: r.s, d: r.d, g: r.g }));
PW.decodeRoom = function (hash) {
  const m = /(?:^|[#&])room=([A-Za-z0-9_-]{10,3000})/.exec(hash || ''); if (!m) return null;
  try { return PW.cleanRoom(JSON.parse(unb64(m[1]))); } catch (e) { return null; }
};
PW.roomLink = r => {
  const local = /^https?:$/.test(location.protocol) && !/claude\.ai$|claudeusercontent/.test(location.hostname);
  return (local ? new URL('./', location.href).href : PW.HOME) + '#room=' + PW.encodeRoom(r);
};

/* Drivers for a synced race: the room's names in grid slots, the default line-up for everyone else. */
PW.syncDrivers = function (spec) {
  const D = PW.resolveDrivers({}), T = PW.resolveTeams({});
  if (spec.kind === 'room') spec.g.forEach((name, i) => { if (i < D.length) D[i] = { ...D[i], name, flag: '', code: PW.driverCode(name) }; });
  return { drivers: D, teams: T };
};

/* Calendar file for a room, so friends get a reminder. */
PW.roomICS = function (r, link) {
  const d = t => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = s => String(s).replace(/[\\,;]/g, m => '\\' + m).replace(/\n/g, '\\n');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lapwall//Race Room//EN', 'BEGIN:VEVENT', `UID:${r.d}-${r.s}@lapwall`, `DTSTAMP:${d(Date.now())}`,
    `DTSTART:${d(r.s)}`, `DTEND:${d(r.s + 10 * 60000)}`, `SUMMARY:${esc('Lapwall: ' + r.n + ' at ' + r.track.name)}`,
    `DESCRIPTION:${esc((r.h ? r.h + ' invited you. ' : '') + 'Open the link a minute early: ' + link)}`, 'BEGIN:VALARM', 'TRIGGER:-PT5M', 'ACTION:DISPLAY', 'DESCRIPTION:Race starts in 5 minutes', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
};
})();
