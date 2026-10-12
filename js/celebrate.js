/* Podium celebration: the top three on the steps, champagne spraying, confetti falling. */
window.PW = window.PW || {};
(() => {
const TAU = Math.PI * 2;
PW.Celebration = class Celebration {
  constructor(canvas) { this.cv = canvas; this.g = canvas.getContext('2d'); this.on = false; this.drops = []; this.fx = new PW.Confetti(canvas); }
  /* top: [{ name, code, flag, color, color2 }] in finishing order */
  start(top) {
    this.top = top.slice(0, 3); this.t = 0; this.on = true; this.drops = []; this.fx.p = [];
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  stop() { this.on = false; }
  update(dt) {
    if (!this.on) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = this.cv.clientWidth, H = this.cv.clientHeight;
    if (this.cv.width !== Math.round(W * dpr) || this.cv.height !== Math.round(H * dpr)) { this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr); }
    const g = this.g; this.t += dt;
    // confetti layer is drawn first by its own update (it clears the canvas)
    if (!this.reduce && Math.abs(this.t - 1.4) < dt) this.fx.burst(160, this.top.map(d => d.color).concat(['#ffd43b', '#eef2f8']));
    if (!this.reduce && Math.abs(this.t - 4.5) < dt) this.fx.burst(120, ['#ffd43b', '#eef2f8', '#ff4a3d', '#33b8ff']);
    this.fx.update(this.reduce ? 0 : dt);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const base = H - Math.max(16, H * .04), bw = Math.min(W * .2, 230), cx = W / 2;
    const steps = [{ i: 1, x: cx - bw, h: Math.max(90, H * .14) }, { i: 0, x: cx, h: Math.max(120, H * .2) }, { i: 2, x: cx + bw, h: Math.max(78, H * .11) }];
    const rise = k => 1 - Math.pow(1 - Math.min(1, Math.max(0, (this.t - k * .25) / .7)), 3);
    // floor glow
    const fl = g.createRadialGradient(cx, base, 10, cx, base, bw * 2.4);
    fl.addColorStop(0, 'rgba(255,212,59,.18)'); fl.addColorStop(1, 'rgba(255,212,59,0)');
    g.fillStyle = fl; g.fillRect(0, base - bw, W, bw * 1.4);
    steps.forEach((st, k) => {
      const d = this.top[st.i]; if (!d) return;
      const h = st.h * rise(k), x = st.x - bw / 2 + 4, w = bw - 8, y = base - h;
      g.fillStyle = '#151a23'; g.fillRect(x, y, w, h);
      g.fillStyle = d.color; g.fillRect(x, y, w, 4);
      g.fillStyle = 'rgba(238,242,248,.92)'; g.font = `800 ${Math.round(Math.min(h * .36, bw * .36))}px "Saira Condensed", "Arial Narrow", sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle'; if (h > 30) g.fillText(String(st.i + 1), st.x, y + h * .32);
      if (rise(k) < 1) return;
      // driver
      const s = bw / 200, fx = st.x, fy = y;
      this.figure(g, fx, fy, s, d, st.i, k);
      // name plate
      g.font = `700 ${Math.round(14 * s + 6)}px "Saira Condensed", "Arial Narrow", sans-serif`; g.fillStyle = '#eef2f8';
      const label = PW.shortName(d.name).toUpperCase(), lw = g.measureText(label).width, fw = d.flag && PW.FLAG_NAMES[d.flag] ? 22 * s + 6 : 0;
      if (fw) PW.drawFlag(g, d.flag, fx - (lw + fw + 6) / 2, y + h - 30 * s - 4, fw, fw * .66);
      g.textAlign = 'left'; g.fillText(label, fx - (lw + fw + 6) / 2 + (fw ? fw + 6 : 0), y + h - 30 * s - 4 + fw * .33);
    });
    // champagne droplets
    this.drops = this.drops.filter(p => (p.life -= dt) > 0 && p.y < H);
    for (const p of this.drops) {
      p.vy += 520 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      g.fillStyle = p.foam ? `rgba(255,255,255,${.75 * p.life})` : `rgba(255,226,140,${.85 * p.life})`;
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill();
    }
  }
  /* Driver in race suit, arms up, champagne bottle aimed inwards. */
  figure(g, x, y, s, d, place, k) {
    const bob = Math.sin(this.t * 4 + k) * 2 * s;
    const top = y - 120 * s + bob;
    g.save();
    // legs and body
    g.fillStyle = d.color; g.beginPath(); g.roundRect(x - 24 * s, top + 40 * s, 48 * s, 70 * s, 12 * s); g.fill();
    g.fillStyle = d.color2; g.fillRect(x - 24 * s, top + 70 * s, 48 * s, 6 * s);
    g.fillStyle = '#0b0c10'; g.fillRect(x - 20 * s, top + 108 * s, 16 * s, 12 * s); g.fillRect(x + 4 * s, top + 108 * s, 16 * s, 12 * s);
    // head with cap
    g.fillStyle = '#e8c4a0'; g.beginPath(); g.arc(x, top + 26 * s, 15 * s, 0, TAU); g.fill();
    g.fillStyle = d.color2; g.beginPath(); g.arc(x, top + 22 * s, 16 * s, Math.PI, TAU); g.fill(); g.fillRect(x - 2 * s, top + 18 * s, 22 * s, 5 * s);
    // arms and bottle (P1 sprays both ways; others spray towards the middle)
    const dir = place === 1 ? 1 : place === 2 ? -1 : (Math.floor(this.t * .5) % 2 ? 1 : -1);
    const spraying = this.t > 1.6 && this.t < 9;
    const ang = -Math.PI / 2 + dir * (spraying ? .55 + .25 * Math.sin(this.t * 5 + k) : .2);
    const sx = x + dir * 18 * s, sy = top + 48 * s;
    const hx = sx + Math.cos(ang) * 46 * s, hy = sy + Math.sin(ang) * 46 * s;
    g.strokeStyle = d.color; g.lineWidth = 9 * s; g.lineCap = 'round';
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(hx, hy); g.stroke();
    g.beginPath(); g.moveTo(x - dir * 18 * s, sy); g.lineTo(x - dir * 34 * s, sy - 40 * s); g.stroke();   // other arm up
    g.save(); g.translate(hx, hy); g.rotate(ang + Math.PI / 2);
    g.fillStyle = '#1f5c33'; g.beginPath(); g.roundRect(-7 * s, -36 * s, 14 * s, 36 * s, 4 * s); g.fill();
    g.fillRect(-3 * s, -48 * s, 6 * s, 14 * s); g.fillStyle = '#ffd43b'; g.fillRect(-3.5 * s, -50 * s, 7 * s, 8 * s);
    g.restore();
    if (spraying && !this.reduce) {
      const tipx = hx + Math.cos(ang) * 48 * s, tipy = hy + Math.sin(ang) * 48 * s;
      for (let n = 0; n < 6; n++) {
        const a = ang + (Math.random() - .5) * .35, v = (380 + Math.random() * 260) * Math.max(.6, s);
        this.drops.push({ x: tipx, y: tipy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: (1.4 + Math.random() * 2.2) * Math.max(.7, s), life: 1.2, foam: Math.random() < .25 });
      }
    }
    g.restore();
  }
};
})();
