/* Send-a-Zoom-by: the whole message travels inside the link, after the # sign.
   That part of a URL is never sent to any server, so messages stay between sender and recipient. */
window.PW = window.PW || {};
(() => {
PW.HOME = 'https://imarun-pun.github.io/living-racetrack/';
PW.OCCASIONS = {
  birthday:    { label: 'Birthday',        title: 'HAPPY BIRTHDAY',    icon: 'cake',   sub: 'Have the best day' },
  congrats:    { label: 'Congratulations', title: 'CONGRATULATIONS',   icon: 'trophy', sub: 'P1. You earned it' },
  luck:        { label: 'Good luck',       title: 'GOOD LUCK',         icon: 'flag',   sub: 'Lights out and go get it' },
  thanks:      { label: 'Thank you',       title: 'THANK YOU',         icon: 'heart',  sub: 'You are a champion' },
  anniversary: { label: 'Anniversary',     title: 'HAPPY ANNIVERSARY', icon: 'heart',  sub: 'Still my favourite co-driver' },
  welcome:     { label: 'Welcome home',    title: 'WELCOME HOME',      icon: 'star',   sub: 'Back in the garage' },
  custom:      { label: 'My own words',    title: '',                  icon: 'star',   sub: '' }
};
const clean = (v, n) => (typeof v === 'string' ? v : '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const hex = (v, d) => /^#[0-9a-fA-F]{6}$/.test(v) ? v : d;

/* Validate and normalise a Zoom-by card. Anything unexpected falls back to a safe default. */
PW.cleanCard = c => {
  c = c && typeof c === 'object' ? c : {};
  const o = PW.OCCASIONS[c.o] ? c.o : 'custom';
  const flag = typeof c.fl === 'string' && PW.FLAG_NAMES && PW.FLAG_NAMES[c.fl] ? c.fl : '';
  const n = Number.isInteger(+c.n) && +c.n >= 0 && +c.n <= 99 ? +c.n : 1;
  return {
    o, t: clean(c.t, 24) || PW.OCCASIONS[o].title || 'PIT BOARD', to: clean(c.to, 20), m: clean(c.m, 60),
    fr: clean(c.fr, 24), fl: flag, n, c: hex(c.c, '#ff4a3d'), c2: hex(c.c2, '#1b1f27'), tm: clean(c.tm, 16) || 'Lapwall'
  };
};
const toB64 = s => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64 = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), ch => ch.charCodeAt(0)));
/* Compact form keeps links short: an array, empty fields dropped from the end, defaults left out.
   [occasion, to, message, from, flag, number, colour, colour2, customTitle] */
const OCC = Object.keys(PW.OCCASIONS);
PW.encodeCard = card => {
  const c = PW.cleanCard(card);
  const a = [OCC.indexOf(c.o), c.to, c.m, c.fr, c.fl, c.n === 1 ? '' : c.n, c.c === '#ff4a3d' ? '' : c.c.slice(1), c.c2 === '#1b1f27' ? '' : c.c2.slice(1), c.o === 'custom' ? c.t : ''];
  while (a.length > 1 && (a[a.length - 1] === '' || a[a.length - 1] === undefined)) a.pop();
  return toB64(JSON.stringify(a));
};
PW.decodeCard = hash => {
  try {
    const raw = String(hash || '').replace(/^#/, '');
    if (!raw || raw.length > 2000) return null;
    const v = JSON.parse(fromB64(raw));
    if (!Array.isArray(v)) return PW.cleanCard(v);                      // first-version links
    const [o, to, m, fr, fl, n, c, c2, t] = v;
    return PW.cleanCard({ o: OCC[o] || 'custom', to, m, fr, fl, n: n === '' || n === undefined ? 1 : n,
      c: c ? '#' + c : undefined, c2: c2 ? '#' + c2 : undefined, t });
  } catch (e) { return null; }
};
/* Where the recipient page lives: next to this page on the web, or the public site when opened from a file. */
PW.cardLink = card => {
  const base = /^https?:$/.test(location.protocol) && !/claude\.ai$|claudeusercontent/.test(location.hostname) ? new URL('z/', location.href.replace(/z\/[^/]*$/, '')).href : PW.HOME + 'z/';
  return base + '#' + PW.encodeCard(card);
};
/* Turn a card into what the Zoom-by draws. */
PW.cardBoard = card => {
  const occ = PW.OCCASIONS[card.o] || PW.OCCASIONS.custom;
  const title = (card.t + (card.to ? ' ' + card.to : '')).toUpperCase().slice(0, 40);
  return { title, sub: card.m || occ.sub || (card.fr ? 'From ' + card.fr : ''), icon: occ.icon };
};

/* Lightweight confetti, shared by the share pages and the podium. */
PW.Confetti = class Confetti {
  constructor(canvas) { this.cv = canvas; this.g = canvas.getContext('2d'); this.p = []; }
  burst(n, colors, x, y, spread = 1) {
    const W = this.cv.clientWidth, H = this.cv.clientHeight;
    for (let k = 0; k < n; k++) this.p.push({
      x: x ?? Math.random() * W, y: y ?? -10 - Math.random() * H * .3,
      vx: (Math.random() - .5) * 260 * spread, vy: (y !== undefined ? -Math.random() * 420 : Math.random() * 60) * spread,
      r: 3 + Math.random() * 4, a: Math.random() * 6.28, va: (Math.random() - .5) * 10,
      c: colors[k % colors.length], life: 1, shape: Math.random() < .5 });
  }
  get busy() { return this.p.length > 0; }
  update(dt) {
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = this.cv.clientWidth, H = this.cv.clientHeight;
    if (this.cv.width !== Math.round(W * dpr)) { this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr); }
    const g = this.g; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    this.p = this.p.filter(q => q.y < H + 20 && (q.life -= dt * .12) > 0);
    for (const q of this.p) {
      q.vy += 380 * dt; q.vx *= (1 - .9 * dt); q.vy = Math.min(q.vy, 260 + q.r * 20);
      q.x += q.vx * dt + Math.sin(q.a) * 20 * dt; q.y += q.vy * dt; q.a += q.va * dt;
      g.save(); g.translate(q.x, q.y); g.rotate(q.a); g.globalAlpha = Math.min(1, q.life * 2); g.fillStyle = q.c;
      if (q.shape) g.fillRect(-q.r, -q.r * .45, q.r * 2, q.r * .9); else { g.beginPath(); g.arc(0, 0, q.r * .6, 0, 6.28); g.fill(); }
      g.restore();
    }
  }
};
})();
