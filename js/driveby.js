/* Drive-by: a full-size single-seater with the driver's name and flag sweeps across the bottom
   of the screen, right to left. It slows down in the middle so the name is easy to read.
   With a `board`, it carries a pit board instead: drink water, stretch, rest your eyes or your own message.
   Used inside the web app and by the desktop app's overlay above the taskbar. */
window.PW = window.PW || {};
(() => {
const TAU = Math.PI * 2;
PW.DRIVEBY_SPEEDS = { fast: 5, cruise: 9, parade: 14 };   // seconds to cross the screen
PW.REMINDERS = {
  water:   { title: 'DRINK WATER',      sub: 'Hydration stop · one glass now', icon: 'drop' },
  stretch: { title: 'STRETCH BREAK',    sub: 'Stand up · roll the shoulders',  icon: 'stretch' },
  eyes:    { title: 'REST YOUR EYES',   sub: 'Look 20 ft away for 20 seconds', icon: 'eye' }
};

function icon(g, kind, x, y, r) {
  g.save(); g.translate(x, y); g.lineWidth = Math.max(1.5, r * .16); g.lineCap = 'round'; g.lineJoin = 'round';
  if (kind === 'drop') {
    g.fillStyle = '#4cc3ff'; g.beginPath(); g.moveTo(0, -r); g.bezierCurveTo(r * .9, -r * .1, r * .8, r * .9, 0, r * .9); g.bezierCurveTo(-r * .8, r * .9, -r * .9, -r * .1, 0, -r); g.fill();
    g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(-r * .28, r * .25, r * .12, r * .25, -.4, 0, TAU); g.fill();
  } else if (kind === 'stretch') {
    g.strokeStyle = '#2fd780'; g.beginPath(); g.arc(0, -r * .7, r * .22, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(0, -r * .45); g.lineTo(0, r * .35); g.moveTo(-r * .8, -r * .85); g.lineTo(0, -r * .2); g.lineTo(r * .8, -r * .85);
    g.moveTo(0, r * .35); g.lineTo(-r * .5, r); g.moveTo(0, r * .35); g.lineTo(r * .5, r); g.stroke();
  } else if (kind === 'eye') {
    g.strokeStyle = '#ffc21a'; g.beginPath(); g.moveTo(-r, 0); g.quadraticCurveTo(0, -r * .9, r, 0); g.quadraticCurveTo(0, r * .9, -r, 0); g.stroke();
    g.fillStyle = '#ffc21a'; g.beginPath(); g.arc(0, 0, r * .3, 0, TAU); g.fill();
  } else {
    g.fillStyle = '#ffc21a'; g.beginPath(); g.arc(0, 0, r * .5, 0, TAU); g.fill();
  }
  g.restore();
}

PW.DriveBy = class DriveBy {
  constructor(canvas) { this.cv = canvas; this.g = canvas.getContext('2d'); this.run = null; this.audio = null; }
  get active() { return !!this.run; }
  /* info: { name, flag, num, team: { name, color, color2 }, tyre, sound, seconds, board: { title, sub, icon } } */
  start(info) {
    this.run = { ...info, t: 0, seconds: info.seconds || PW.DRIVEBY_SPEEDS.cruise };
    this.cv.hidden = false;
    if (info.sound) this.engine(this.run.seconds);
  }
  stop() { this.run = null; this.cv.hidden = true; }
  /* Advance and draw. Returns false once the car has left the screen. */
  update(dtR) {
    const r = this.run; if (!r) return false;
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = this.cv.clientWidth, H = this.cv.clientHeight;
    if (this.cv.width !== Math.round(W * dpr) || this.cv.height !== Math.round(H * dpr)) { this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr); }
    const g = this.g; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    r.t += dtR;
    const ground = H - 6, s = (H * (r.board ? .5 : .56)) / 214, carW = 1000 * s;
    const travel = W + carW + 260, u = r.t / r.seconds;
    if (u >= 1) { this.stop(); return false; }
    // fast in, slow through the middle (about 40% speed), fast out
    const a = .6, f = u + a * Math.sin(TAU * u) / TAU, vel = (1 + a * Math.cos(TAU * u)) * travel / r.seconds;
    const dist = travel * f, x = W + 60 - dist, y = ground - 266 * s;
    // speed streaks scale with the current speed
    const streak = Math.min(1, vel / 900);
    g.save(); g.lineCap = 'round';
    for (let k = 0; k < 7; k++) {
      const ly = ground - (40 + k * 26) * s, len = (120 + (k * 53) % 140) * s * 2.2 * (.3 + streak);
      const gx = x + carW * (.55 + (k % 3) * .12), gr = g.createLinearGradient(gx, 0, gx + len, 0);
      gr.addColorStop(0, `rgba(230,236,248,${.35 * (.3 + streak)})`); gr.addColorStop(1, 'rgba(230,236,248,0)');
      g.strokeStyle = gr; g.lineWidth = Math.max(1, 3 * s); g.beginPath(); g.moveTo(gx, ly); g.lineTo(gx + len, ly); g.stroke();
    }
    g.restore();
    const sh = g.createRadialGradient(x + 500 * s, ground, 2, x + 500 * s, ground, 480 * s);
    sh.addColorStop(0, 'rgba(0,0,0,.45)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sh; g.fillRect(x, ground - 14 * s, carW, 22 * s);
    g.save(); g.translate(x, y + Math.sin(r.t * 60) * .5 * streak); g.scale(s, s);
    PW.drawCarSide(g, r.team.color, r.team.color2, r.num, r.team.name, (PW.TYRES[r.tyre] || PW.TYRES.M).c, -dist / (60 * s));
    g.restore();
    if (r.board) this.drawBoard(g, r, x, y, s, H); else this.drawTag(g, r, x, y, s, H);
    return true;
  }
  drawTag(g, r, x, y, s, H) {
    const tagH = Math.max(22, H * .22), fs = Math.round(tagH * .5);
    g.font = `700 ${fs}px "Saira Condensed", "Arial Narrow", sans-serif`;
    const label = `${r.num}  ${String(r.name || '').toUpperCase()}`;
    const fw = r.flag && PW.FLAG_NAMES[r.flag] ? tagH * 1.05 : 0;
    const tw = g.measureText(label).width + 22 + (fw ? fw + 10 : 0);
    const tx = x + 470 * s - tw / 2, ty = Math.max(2, y + 40 * s - tagH - 6);
    g.fillStyle = 'rgba(7,9,13,.9)'; g.beginPath(); g.roundRect(tx, ty, tw, tagH, 5); g.fill();
    g.fillStyle = r.team.color; g.fillRect(tx, ty, 5, tagH);
    if (fw) PW.drawFlag(g, r.flag, tx + 13, ty + tagH * .2, fw, tagH * .6);
    g.fillStyle = '#eef2f8'; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillText(label, tx + 13 + (fw ? fw + 10 : 0), ty + tagH / 2 + 1);
  }
  /* Pit board on a pole, held up from the cockpit side like a crew board. */
  drawBoard(g, r, x, y, s, H) {
    const b = r.board, bh = Math.min(H * .52, 92), pad = bh * .12;
    const titleF = Math.round(bh * .3), subF = Math.round(bh * .15), topF = Math.round(bh * .14);
    g.font = `800 ${titleF}px "Saira Condensed", "Arial Narrow", sans-serif`; const tw1 = g.measureText(b.title).width;
    g.font = `500 ${subF}px "Saira", "Segoe UI", sans-serif`; const tw2 = g.measureText(b.sub || '').width;
    const iconW = bh * .55, bw = Math.max(tw1, tw2) + iconW + pad * 3;
    const cx = x + 480 * s, bx = cx - bw / 2, by = Math.max(2, y + 40 * s - bh - 10);
    g.strokeStyle = '#9aa3b5'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, by + bh); g.lineTo(cx, y + 110 * s); g.stroke();
    g.fillStyle = '#0b0d12'; g.beginPath(); g.roundRect(bx, by, bw, bh, 4); g.fill();
    g.strokeStyle = r.team.color; g.lineWidth = 3; g.stroke();
    icon(g, b.icon, bx + pad + iconW / 2, by + bh / 2, iconW * .42);
    const tx = bx + pad * 2 + iconW;
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.font = `600 ${topF}px "JetBrains Mono", monospace`; g.fillStyle = r.team.color;
    const top = `#${r.num} ${PW.shortName(r.name).toUpperCase()}`;
    g.fillText(top, tx, by + pad + topF * .9);
    if (r.flag && PW.FLAG_NAMES[r.flag]) PW.drawFlag(g, r.flag, tx + g.measureText(top).width + 8, by + pad + topF * .05, topF * 1.4, topF * .95);
    g.font = `800 ${titleF}px "Saira Condensed", "Arial Narrow", sans-serif`; g.fillStyle = '#ffd43b';
    g.fillText(b.title, tx, by + pad + topF + titleF * .95);
    g.font = `500 ${subF}px "Saira", "Segoe UI", sans-serif`; g.fillStyle = '#eef2f8';
    if (b.sub) g.fillText(b.sub, tx, by + bh - pad);
  }
  /* Optional engine pass: a Doppler sweep, synthesized (no audio files). */
  engine(seconds) {
    try {
      const A = this.audio || (this.audio = new (window.AudioContext || window.webkitAudioContext)());
      const t0 = A.currentTime, d = Math.min(seconds, 6);
      const o = A.createOscillator(), o2 = A.createOscillator(), f = A.createBiquadFilter(), v = A.createGain();
      o.type = 'sawtooth'; o2.type = 'square';
      o.frequency.setValueAtTime(330, t0); o.frequency.linearRampToValueAtTime(260, t0 + d * .5); o.frequency.exponentialRampToValueAtTime(380, t0 + d);
      o2.frequency.setValueAtTime(165, t0); o2.frequency.linearRampToValueAtTime(130, t0 + d * .5); o2.frequency.exponentialRampToValueAtTime(190, t0 + d);
      f.type = 'lowpass'; f.frequency.value = 1400;
      v.gain.setValueAtTime(0, t0); v.gain.linearRampToValueAtTime(.1, t0 + d * .45); v.gain.exponentialRampToValueAtTime(.001, t0 + d);
      o.connect(f); o2.connect(f); f.connect(v); v.connect(A.destination);
      o.start(t0); o2.start(t0); o.stop(t0 + d); o2.stop(t0 + d);
    } catch (e) { /* sound is optional */ }
  }
};
})();
