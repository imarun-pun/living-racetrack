/* Zoom-by: a realistic single-seater sweeps across the bottom of the screen, right to left,
   with a slim liquid-glass name tag (or a glass pit board) floating above it on a soft tether.
   Pass-by mode: fast in, slow through the middle, fast out.
   Park mode (the recipient page): it brakes hard into the centre with tyre smoke, idles, can be
   tapped to rev, then launches off when told to leave.
   Used by the web app, the send page preview, the recipient page and the desktop overlay. */
window.PW = window.PW || {};
(() => {
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hexA = (hex, a) => { const n = parseInt(String(hex).slice(1, 7), 16) || 0; return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
const backOut = p => { const c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
const DISPLAY = '"Saira Condensed", "Arial Narrow", sans-serif', BODY = '"Saira", "Segoe UI", sans-serif', MONO = '"JetBrains Mono", monospace';

PW.DRIVEBY_SPEEDS = { fast: 5, cruise: 9, parade: 14 };   // seconds to cross the screen
PW.REMINDERS = {
  water:   { title: 'DRINK WATER',      sub: 'Hydration stop · one glass now', icon: 'drop' },
  stretch: { title: 'STRETCH BREAK',    sub: 'Stand up · roll the shoulders',  icon: 'stretch' },
  eyes:    { title: 'REST YOUR EYES',   sub: 'Look 20 ft away for 20 seconds', icon: 'eye' }
};

function icon(g, kind, x, y, r) {
  g.save(); g.translate(x, y); g.lineWidth = Math.max(1.5, r * .16); g.lineCap = 'round'; g.lineJoin = 'round';
  if (kind === 'drop') {
    g.fillStyle = '#6fd0ff'; g.beginPath(); g.moveTo(0, -r); g.bezierCurveTo(r * .9, -r * .1, r * .8, r * .9, 0, r * .9); g.bezierCurveTo(-r * .8, r * .9, -r * .9, -r * .1, 0, -r); g.fill();
    g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(-r * .28, r * .25, r * .12, r * .25, -.4, 0, TAU); g.fill();
  } else if (kind === 'stretch') {
    g.strokeStyle = '#4be89a'; g.beginPath(); g.arc(0, -r * .7, r * .22, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(0, -r * .45); g.lineTo(0, r * .35); g.moveTo(-r * .8, -r * .85); g.lineTo(0, -r * .2); g.lineTo(r * .8, -r * .85);
    g.moveTo(0, r * .35); g.lineTo(-r * .5, r); g.moveTo(0, r * .35); g.lineTo(r * .5, r); g.stroke();
  } else if (kind === 'eye') {
    g.strokeStyle = '#ffd04a'; g.beginPath(); g.moveTo(-r, 0); g.quadraticCurveTo(0, -r * .9, r, 0); g.quadraticCurveTo(0, r * .9, -r, 0); g.stroke();
    g.fillStyle = '#ffd04a'; g.beginPath(); g.arc(0, 0, r * .3, 0, TAU); g.fill();
  } else if (kind === 'cake') {
    g.fillStyle = '#ff7fbc'; g.fillRect(-r * .8, -r * .05, r * 1.6, r * .9);
    g.fillStyle = '#fff'; g.fillRect(-r * .8, -r * .05, r * 1.6, r * .22);
    g.fillStyle = '#ffd43b'; [-.45, 0, .45].forEach(k => { g.fillRect(r * k - r * .06, -r * .55, r * .12, r * .45); });
    g.fillStyle = '#ff8a00'; [-.45, 0, .45].forEach(k => { g.beginPath(); g.ellipse(r * k, -r * .7, r * .09, r * .16, 0, 0, TAU); g.fill(); });
  } else if (kind === 'trophy') {
    g.fillStyle = '#ffd43b'; g.beginPath(); g.moveTo(-r * .6, -r * .85); g.lineTo(r * .6, -r * .85); g.quadraticCurveTo(r * .55, r * .2, 0, r * .3); g.quadraticCurveTo(-r * .55, r * .2, -r * .6, -r * .85); g.fill();
    g.fillRect(-r * .1, r * .25, r * .2, r * .4); g.fillRect(-r * .45, r * .62, r * .9, r * .22);
    g.strokeStyle = '#ffd43b'; g.beginPath(); g.arc(-r * .6, -r * .45, r * .3, Math.PI * .5, Math.PI * 1.5); g.moveTo(r * .6, -r * .75); g.arc(r * .6, -r * .45, r * .3, -Math.PI * .5, Math.PI * .5); g.stroke();
  } else if (kind === 'heart') {
    g.fillStyle = '#ff5a7a'; g.beginPath(); g.moveTo(0, r * .85);
    g.bezierCurveTo(-r * 1.2, 0, -r * .7, -r * 1, 0, -r * .35); g.bezierCurveTo(r * .7, -r * 1, r * 1.2, 0, 0, r * .85); g.fill();
  } else if (kind === 'flag') {
    g.strokeStyle = '#cfd5e2'; g.beginPath(); g.moveTo(-r * .8, -r); g.lineTo(-r * .8, r); g.stroke();
    const sq = r * .32; for (let a = 0; a < 3; a++) for (let b = 0; b < 4; b++) { g.fillStyle = (a + b) % 2 ? '#111' : '#f2f4f8'; g.fillRect(-r * .75 + b * sq, -r * .95 + a * sq, sq, sq); }
  } else {
    g.fillStyle = '#ffd04a'; g.beginPath();
    for (let k = 0; k < 10; k++) { const rr = k % 2 ? r * .4 : r, a = -Math.PI / 2 + k * Math.PI / 5; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    g.closePath(); g.fill();
  }
  g.restore();
}
PW.drawIcon = icon;

/* Liquid glass panel on canvas: smoky translucent body, team-tinted refraction, a glossy top,
   a slow light sweep and a bright hairline rim. */
function glass(g, x, y, w, h, rad, tint, t) {
  g.save();
  g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = Math.min(28, h * .5); g.shadowOffsetY = Math.min(10, h * .15);
  g.fillStyle = 'rgba(16,20,30,.62)'; g.beginPath(); g.roundRect(x, y, w, h, rad); g.fill();
  g.restore();
  g.save(); g.beginPath(); g.roundRect(x, y, w, h, rad); g.clip();
  const tg = g.createLinearGradient(x, y, x + w, y + h);
  tg.addColorStop(0, hexA(tint, .34)); tg.addColorStop(.45, hexA(tint, .06)); tg.addColorStop(1, hexA(tint, .2));
  g.fillStyle = tg; g.fillRect(x, y, w, h);
  const gl = g.createLinearGradient(0, y, 0, y + h);
  gl.addColorStop(0, 'rgba(255,255,255,.26)'); gl.addColorStop(.42, 'rgba(255,255,255,.07)'); gl.addColorStop(.43, 'rgba(255,255,255,.02)'); gl.addColorStop(1, 'rgba(255,255,255,.05)');
  g.fillStyle = gl; g.fillRect(x, y, w, h);
  const sweep = ((t * .28) % 1.8) - .4, sx = x + sweep * w * 1.4;
  const sg = g.createLinearGradient(sx - h, y, sx + h, y + h);
  sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(255,255,255,.16)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sg; g.fillRect(x, y, w, h);
  g.restore();
  const rim = g.createLinearGradient(0, y, 0, y + h);
  rim.addColorStop(0, 'rgba(255,255,255,.75)'); rim.addColorStop(.35, 'rgba(255,255,255,.12)'); rim.addColorStop(1, 'rgba(255,255,255,.32)');
  g.strokeStyle = rim; g.lineWidth = 1; g.beginPath(); g.roundRect(x + .5, y + .5, w - 1, h - 1, rad); g.stroke();
}
PW.drawGlass = glass;

PW.DriveBy = class DriveBy {
  constructor(canvas) { this.cv = canvas; this.g = canvas.getContext('2d'); this.run = null; this.audio = null; this.puffs = []; this.geom = null; }
  get active() { return !!this.run; }
  get parked() { return !!(this.run && this.run.phase === 'park'); }
  /* info: { name, flag, num, team: { name, color, color2 }, tyre, sound, seconds, board: { title, sub, icon }, big,
             park: true to stop in the middle, fit: car width as a fraction of the screen, dom: true when the page draws the card,
             onPark: called once the car has stopped } */
  start(info) {
    this.run = { ...info, t: 0, pt: 0, phase: info.park ? 'in' : 'pass', dist: 0, seconds: info.seconds || PW.DRIVEBY_SPEEDS.cruise,
      revT: 9, card: null, popT: -1, x: null };
    this.puffs = [];
    this.cv.hidden = false;
    if (info.sound && !info.park) this.engine(this.run.seconds);
    if (info.sound && info.park) this.arrive();
  }
  stop() { this.run = null; this.geom = null; this.cv.hidden = true; }
  leave() { const r = this.run; if (r && r.phase === 'park') { r.phase = 'out'; r.pt = 0; if (r.sound) this.launch(); } }
  rev() { const r = this.run; if (!r || r.phase !== 'park') return false; r.revT = 0; if (r.sound) this.revSound(); return true; }
  setSound(on) { if (this.run) this.run.sound = on; }
  /* Is this point (CSS px, relative to the canvas) on the car? */
  hit(px, py) { const q = this.geom; return !!q && px > q.x && px < q.x + q.w && py > q.top - 10 && py < q.ground + 6; }

  update(dtR) {
    const r = this.run; if (!r) return false;
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = this.cv.clientWidth, H = this.cv.clientHeight;
    if (this.cv.width !== Math.round(W * dpr) || this.cv.height !== Math.round(H * dpr)) { this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr); }
    const g = this.g; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const dt = Math.max(0, dtR || 0); r.t += dt; r.pt += dt; r.revT += dt;
    const hasCard = !r.dom;
    const s = r.fit ? Math.min(W * r.fit / 1000, H * .92 / 260) : (H * (hasCard ? (r.board ? .4 : .58) : .7)) / 260;
    const carW = 1000 * s, ground = H - Math.max(3, 4 * s);
    const xStart = W + 40, xPark = (W - carW) / 2 - 20 * s, xGone = -carW - 120;
    let x, vel, brake = false, pitch = 0, launch = 0;
    if (r.phase === 'pass') {
      const travel = W + carW + 260, u = r.t / r.seconds;
      if (u >= 1) { this.stop(); return false; }
      const a = .6, f = u + a * Math.sin(TAU * u) / TAU;
      vel = (1 + a * Math.cos(TAU * u)) * travel / r.seconds;
      x = W + 60 - travel * f;
      const decel = Math.sin(TAU * u);                       // > 0 while slowing for the middle
      brake = decel > .25 && u < .5; pitch = -.012 * decel;
    } else if (r.phase === 'in') {
      const T = r.reduce ? 1.2 : 2.3, p = Math.min(1, r.pt / T), k = 1 - p;
      x = xStart + (xPark - xStart) * (1 - k * k * k); vel = 3 * k * k * (xStart - xPark) / T;
      brake = p > .3; pitch = -.03 * Math.sin(Math.PI * clamp((p - .3) / .7, 0, 1));
      if (p > .45 && p < .97 && !r.reduce) this.smoke(x + 770 * s, ground, s, 2, 140 * s);
      if (p >= 1) { r.phase = 'park'; r.pt = 0; if (r.onPark) r.onPark(); }
    } else if (r.phase === 'park') {
      x = xPark; vel = 0;
      pitch = .028 * Math.exp(-5 * r.pt) * Math.cos(13 * r.pt);   // settles on the springs
    } else {
      const T = 1.5, p = Math.min(1, r.pt / T);
      x = xPark + (xGone - xPark) * Math.pow(p, 2.3); vel = 2.3 * Math.pow(p, 1.3) * (xPark - xGone) / T;
      launch = 1 - p; pitch = .022 * Math.sin(Math.PI * Math.min(1, p * 2));
      if (p < .5 && !r.reduce) this.smoke(x + 770 * s, ground, s, 3, -60 * s);
      if (p >= 1 && !this.puffs.length) { this.stop(); return false; }
    }
    r.dist += vel * dt;
    // rev: a hop on the springs and flames from the exhaust
    const rv = r.revT < 2 ? Math.exp(-r.revT * 3) : 0;
    const hop = rv ? -Math.abs(Math.sin(r.revT * 16)) * 7 * s * Math.exp(-r.revT * 5) : 0;
    if (rv) pitch += .012 * Math.sin(r.revT * 30) * rv;
    const idle = r.phase === 'park' ? Math.sin(r.t * 47) * .35 : Math.sin(r.t * 60) * .4 * Math.min(1, vel / 900);
    const y = ground - 250 * s + hop + idle;

    // speed streaks
    const streak = Math.min(1, vel / 1100);
    if (streak > .05) {
      g.save(); g.lineCap = 'round';
      for (let k = 0; k < 6; k++) {
        const ly = ground - (34 + k * 30) * s, len = (140 + (k * 53) % 160) * s * 2.4 * streak;
        const gx = x + carW * (.7 + (k % 3) * .1), gr = g.createLinearGradient(gx, 0, gx + len, 0);
        gr.addColorStop(0, `rgba(230,236,248,${.28 * streak})`); gr.addColorStop(1, 'rgba(230,236,248,0)');
        g.strokeStyle = gr; g.lineWidth = Math.max(1, 2 * s); g.beginPath(); g.moveTo(gx, ly); g.lineTo(gx + len, ly); g.stroke();
      }
      g.restore();
    }
    // reflection on a glossy track
    g.save(); g.globalAlpha = .13; g.translate(x, ground * 2 - y); g.scale(s, -s);
    g.beginPath(); g.rect(0, 120, 1000, 140); g.clip();
    PW.drawRaceCar(g, { c1: r.team.color, c2: r.team.color2, tyre: (PW.TYRES && PW.TYRES[r.tyre] || { c: '#ffd21f' }).c, spin: 0 });
    g.restore();
    g.save(); g.translate(x, y); g.scale(s, s);
    PW.drawRaceCar(g, { c1: r.team.color, c2: r.team.color2, num: r.num, team: r.team.name, tyre: (PW.TYRES && PW.TYRES[r.tyre] || { c: '#ffd21f' }).c,
      spin: -r.dist / (62 * s), blur: Math.min(1, vel / 1500), brake: brake || r.phase === 'park', pitch, rev: Math.max(rv, launch * .9) });
    g.restore();
    this.drawPuffs(g, dt);
    this.geom = { x, w: carW, top: y + 74 * s, restTop: ground - 176 * s, ground, s, cx: x + 470 * s, helmetX: x + 420 * s, helmetY: y + 116 * s, vel, W, H };
    if (hasCard) this.drawCard(g, r, x, y, s, W, H, dt);
    return true;
  }

  smoke(x, y, s, n, vx) {
    if (this.puffs.length > 140) return;
    for (let k = 0; k < n; k++) this.puffs.push({ x: x + (Math.random() - .5) * 40 * s, y: y - Math.random() * 14 * s, vx: vx * (.5 + Math.random()), vy: -(20 + Math.random() * 40) * s,
      r: (18 + Math.random() * 20) * s, life: 0, max: 1.1 + Math.random() * .9 });
  }
  drawPuffs(g, dt) {
    if (!this.puffs.length) return;
    this.puffs = this.puffs.filter(p => (p.life += dt) < p.max);
    for (const p of this.puffs) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .97; p.r += 36 * dt;
      const a = .32 * (1 - p.life / p.max), rg = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      rg.addColorStop(0, `rgba(215,220,230,${a})`); rg.addColorStop(1, 'rgba(215,220,230,0)');
      g.fillStyle = rg; g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill();
    }
  }

  /* Name tag or pit board, floating above the car on a spring so it trails a little like liquid. */
  drawCard(g, r, x, y, s, W, H, dt) {
    const b = r.board, tint = r.team.color, carCx = x + 470 * s, carTop = y + 74 * s;
    let w, h, lay;
    if (b) {
      h = Math.min(H * .44, r.big ? H * .48 : 78);
      for (let pass = 0; pass < 2; pass++) {
        const pad = h * .16, titleF = Math.round(h * .3), subF = Math.round(h * .15), topF = Math.round(h * .13), iconD = h * .62;
        g.font = `700 ${titleF}px ${DISPLAY}`; const w1 = g.measureText(b.title).width;
        g.font = `400 ${subF}px ${BODY}`; const w2 = g.measureText(b.sub || '').width;
        w = Math.max(w1, w2) + iconD + pad * 3.2;
        lay = { pad, titleF, subF, topF, iconD };
        if (w <= W - 24) break; h *= (W - 24) / w;
      }
    } else {
      h = clamp(H * .16, 18, 30);
      const fs = Math.round(h * .56); g.font = `600 ${fs}px ${DISPLAY}`;
      const name = String(r.name || '').toUpperCase(), fw = r.flag && PW.FLAG_NAMES[r.flag] ? h * .78 : 0;
      g.font = `600 ${Math.round(fs * .82)}px ${MONO}`; const nw = g.measureText(String(r.num)).width;
      g.font = `600 ${fs}px ${DISPLAY}`;
      w = h * .5 + nw + h * .35 + (fw ? fw + h * .3 : 0) + g.measureText(name).width + h * .55;
      lay = { fs, name, fw, nw };
    }
    // spring-follow the car horizontally
    const target = carCx;
    if (!r.card) r.card = { x: target, v: 0 };
    const k = 70, c = 9;
    r.card.v += (k * (target - r.card.x) - c * r.card.v) * dt; r.card.x += r.card.v * dt;
    if (r.popT < 0 && carCx < W + 20) r.popT = 0;
    if (r.popT < 0) return;
    r.popT += dt;
    const pop = r.reduce ? 1 : backOut(Math.min(1, r.popT / .55));
    const cx = r.card.x, gap = b ? Math.max(14, h * .35) : Math.max(10, h * .5);
    const by = Math.max(2, carTop - gap - h), bx = cx - w / 2;
    // tether from the card to the driver's helmet
    const hx = x + 420 * s, hy = y + 112 * s;
    g.save(); g.globalAlpha = clamp(pop, 0, 1) * .8;
    g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1; g.setLineDash([2, 3]);
    g.beginPath(); g.moveTo(cx, by + h); g.quadraticCurveTo(cx + (hx - cx) * .2, (by + h + hy) / 2 + 6, hx, hy - 14 * s); g.stroke();
    g.setLineDash([]); g.fillStyle = hexA(tint, .9); g.beginPath(); g.arc(hx, hy - 14 * s, Math.max(2, 3 * s), 0, TAU); g.fill();
    g.restore();
    g.save();
    g.translate(cx, by + h); g.transform(1, 0, clamp(-r.card.v / 3000, -.14, .14), 1, 0, 0); g.scale(pop, pop); g.translate(-cx, -(by + h));
    if (b) this.drawBoard(g, r, bx, by, w, h, lay, tint); else this.drawTag(g, r, bx, by, w, h, lay, tint);
    g.restore();
  }
  drawTag(g, r, x, y, w, h, L, tint) {
    glass(g, x, y, w, h, h / 2, tint, r.t);
    let tx = x + h * .32;
    g.fillStyle = tint; g.beginPath(); g.arc(tx + h * .1, y + h / 2, h * .13, 0, TAU); g.fill();
    tx += h * .32;
    g.textBaseline = 'middle'; g.textAlign = 'left';
    g.font = `600 ${Math.round(L.fs * .82)}px ${MONO}`; g.fillStyle = 'rgba(238,242,248,.72)'; g.fillText(String(r.num), tx, y + h / 2 + 1);
    tx += L.nw + h * .3;
    if (L.fw) { g.save(); g.beginPath(); g.roundRect(tx, y + h * .27, L.fw, h * .46, 2); g.clip(); PW.drawFlag(g, r.flag, tx, y + h * .27, L.fw, h * .46); g.restore(); tx += L.fw + h * .3; }
    g.font = `600 ${L.fs}px ${DISPLAY}`; g.fillStyle = '#f4f7fc'; g.fillText(L.name, tx, y + h / 2 + 1);
  }
  drawBoard(g, r, x, y, w, h, L, tint) {
    const b = r.board;
    glass(g, x, y, w, h, Math.min(18, h * .28), tint, r.t);
    const icx = x + L.pad + L.iconD / 2, icy = y + h / 2;
    g.save(); g.beginPath(); g.arc(icx, icy, L.iconD / 2, 0, TAU);
    const ig = g.createRadialGradient(icx - L.iconD * .2, icy - L.iconD * .25, 1, icx, icy, L.iconD / 2);
    ig.addColorStop(0, 'rgba(255,255,255,.22)'); ig.addColorStop(1, 'rgba(255,255,255,.04)');
    g.fillStyle = ig; g.fill(); g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 1; g.stroke(); g.restore();
    icon(g, b.icon, icx, icy, L.iconD * .3);
    const tx = x + L.pad * 2 + L.iconD;
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.font = `600 ${L.topF}px ${MONO}`; g.fillStyle = 'rgba(238,242,248,.62)';
    const top = `#${r.num} ${PW.shortName ? PW.shortName(r.name).toUpperCase() : String(r.name).toUpperCase()}`;
    const ty = y + L.pad + L.topF * .85;
    g.fillText(top, tx, ty);
    if (r.flag && PW.FLAG_NAMES[r.flag]) PW.drawFlag(g, r.flag, tx + g.measureText(top).width + 7, ty - L.topF * .78, L.topF * 1.3, L.topF * .86);
    g.font = `700 ${L.titleF}px ${DISPLAY}`; g.fillStyle = '#ffffff';
    g.fillText(b.title, tx, ty + L.titleF * 1.02);
    if (b.sub) { g.font = `400 ${L.subF}px ${BODY}`; g.fillStyle = 'rgba(238,242,248,.8)'; g.fillText(b.sub, tx, y + h - L.pad * .95); }
  }

  /* Synthesized engine sounds (no audio files). */
  ctx() { try { return this.audio || (this.audio = new (window.AudioContext || window.webkitAudioContext)()); } catch (e) { return null; } }
  unlock() { const A = this.ctx(); if (A && A.state === 'suspended') A.resume(); }
  voice(t0, d, pts, peak) {
    const A = this.ctx(); if (!A) return;
    const o = A.createOscillator(), o2 = A.createOscillator(), f = A.createBiquadFilter(), v = A.createGain();
    o.type = 'sawtooth'; o2.type = 'square';
    o.frequency.setValueAtTime(pts[0][1], t0); o2.frequency.setValueAtTime(pts[0][1] / 2, t0);
    for (const [k, hz] of pts.slice(1)) { o.frequency.exponentialRampToValueAtTime(hz, t0 + d * k); o2.frequency.exponentialRampToValueAtTime(hz / 2, t0 + d * k); }
    f.type = 'lowpass'; f.frequency.value = 1500;
    v.gain.setValueAtTime(0.0001, t0); v.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(.08, d * .2)); v.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    o.connect(f); o2.connect(f); f.connect(v); v.connect(A.destination);
    o.start(t0); o2.start(t0); o.stop(t0 + d); o2.stop(t0 + d);
  }
  engine(seconds) { try { const A = this.ctx(); if (!A) return; const d = Math.min(seconds, 6); this.voice(A.currentTime, d, [[0, 330], [.5, 260], [1, 380]], .1); } catch (e) { /* optional */ } }
  arrive() { try { const A = this.ctx(); if (!A) return; this.voice(A.currentTime, 2.4, [[0, 420], [.5, 230], [1, 90]], .09); } catch (e) { /* optional */ } }
  revSound() { try { const A = this.ctx(); if (!A) return; this.voice(A.currentTime, .9, [[0, 110], [.3, 520], [1, 120]], .12); } catch (e) { /* optional */ } }
  launch() { try { const A = this.ctx(); if (!A) return; this.voice(A.currentTime, 1.8, [[0, 160], [.35, 520], [.45, 380], [1, 640]], .12); } catch (e) { /* optional */ } }
};
})();
