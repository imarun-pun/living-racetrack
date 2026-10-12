/* Pit cam: an overhead view of the pit box, played in real time whenever a car stops. */
window.PW = window.PW || {};
(() => {
const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);

PW.PitCam = class PitCam {
  constructor(wrap) {
    this.wrap = wrap; this.cv = wrap.querySelector('canvas'); this.ctx = this.cv.getContext('2d');
    this.title = wrap.querySelector('[data-title]'); this.queue = []; this.cur = null;
  }
  push(ev) {
    if (this.cur && ev.priority && !this.cur.priority) { this.queue.unshift(this.cur); this.cur = null; }
    if (!this.cur) this.play(ev); else if (this.queue.length < 2) this.queue.push(ev);
  }
  play(ev) {
    this.cur = { ...ev, t: 0, total: 1.1 + ev.dur + 1.0 };
    const c = ev.car;
    this.title.innerHTML = `<b style="color:${c.color}">${c.code}</b> · Box ${c.team + 1} · ${PW.TYRES[ev.tyre].n}${ev.slow ? ' · <span class="warn">slow stop</span>' : ''}`;
    this.wrap.hidden = false;
  }
  clear() { this.cur = null; this.queue = []; this.wrap.hidden = true; }
  update(dtR) {
    if (!this.cur) return;
    const e = this.cur; e.t += dtR;
    if (e.t > e.total) { this.cur = null; const n = this.queue.shift(); if (n) this.play(n); else this.wrap.hidden = true; return; }
    this.draw(e);
  }
  draw(e) {
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = this.cv.clientWidth, H = this.cv.clientHeight;
    if (this.cv.width !== Math.round(W * dpr)) { this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr); }
    const g = this.ctx, c = e.car; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // pit lane surface
    g.fillStyle = '#14181f'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1b2029'; g.fillRect(0, H * .18, W, H * .64);
    g.strokeStyle = 'rgba(232,238,250,.35)'; g.lineWidth = 2; g.setLineDash([10, 8]);
    g.beginPath(); g.moveTo(0, H * .18); g.lineTo(W, H * .18); g.moveTo(0, H * .82); g.lineTo(W, H * .82); g.stroke(); g.setLineDash([]);
    // box markings in team colour
    g.strokeStyle = c.color; g.globalAlpha = .7; g.lineWidth = 2; g.strokeRect(W * .2, H * .26, W * .6, H * .48); g.globalAlpha = 1;
    g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, 0, W, H * .12);
    g.font = `600 10px "JetBrains Mono", monospace`; g.fillStyle = 'rgba(200,212,235,.5)'; g.textAlign = 'left'; g.fillText('PIT LANE · 80 km/h', 10, 13);

    const tIn = 1.1, tStop = tIn + e.dur;
    const len = Math.min(W * .5, H * 1.3), wid = len * .36, cy = H * .5;
    let cx;
    if (e.t < tIn) cx = -len + (W / 2 + len) * ease(e.t / tIn);
    else if (e.t < tStop) cx = W / 2;
    else cx = W / 2 + (W / 2 + len) * Math.pow((e.t - tStop) / 1.0, 1.6);
    const st = Math.max(0, Math.min(1, (e.t - tIn) / e.dur)); // stop progress
    const stopping = e.t >= tIn && e.t < tStop;
    // crew: fronts and rears + jacks
    const crewIn = ease((e.t - (tIn - .5)) / .4) * (1 - ease((e.t - tStop) / .4));
    const wheels = [[.245, -1], [.245, 1], [-.31, -1], [-.31, 1]];
    const wheelOff = stopping ? Math.sin(Math.PI * Math.min(1, Math.max(0, (st - .18) / .55))) : 0;
    const newOn = st > .45;
    // jack men
    if (crewIn > 0) {
      g.globalAlpha = crewIn;
      [[.62, 0], [-.62, 0]].forEach(([dx]) => { const x = cx + dx * len, y = cy; g.fillStyle = c.color2; g.beginPath(); g.arc(x + Math.sign(dx) * 10, y, 8, 0, 6.29); g.fill(); g.fillStyle = c.color; g.beginPath(); g.arc(x + Math.sign(dx) * 10, y, 4.5, 0, 6.29); g.fill(); });
    }
    g.globalAlpha = 1;
    // car
    g.save(); g.translate(cx, cy);
    g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 12;
    PW.drawCarTop(g, len, wid, c.color, c.color2, true, true);
    g.restore();
    // tyres
    wheels.forEach(([fx, side]) => {
      const tw = fx > 0 ? len * .15 : len * .19, th = wid * (fx > 0 ? .19 : .22);
      const x = cx + fx * len, y0 = cy + side * wid * (fx > 0 ? .395 : .41);
      const out = wheelOff * wid * .55;
      const showNew = newOn && stopping || e.t >= tStop;
      const comp = PW.TYRES[showNew ? e.tyre : e.prevTyre].c;
      g.fillStyle = '#0b0c0f'; g.fillRect(x - tw / 2, y0 + side * out - th / 2, tw, th);
      g.fillStyle = comp; g.fillRect(x - tw / 2, y0 + side * out - th / 2 + (side > 0 ? th - 2 : 0), tw, 2);
      // crew member on each corner: gunner
      if (crewIn > 0) {
        g.globalAlpha = crewIn;
        const gx = x + (fx > 0 ? 14 : -14), gy = cy + side * (wid * .5 + 14 + 6 * (1 - crewIn));
        g.fillStyle = c.color2; g.beginPath(); g.arc(gx, gy, 7, 0, 6.29); g.fill();
        g.fillStyle = c.color; g.beginPath(); g.arc(gx, gy, 4, 0, 6.29); g.fill();
        const cx2 = x - (fx > 0 ? 14 : -14), cy2 = gy + side * 10;
        g.fillStyle = c.color2; g.beginPath(); g.arc(cx2, cy2, 7, 0, 6.29); g.fill();
        g.fillStyle = c.color; g.beginPath(); g.arc(cx2, cy2, 4, 0, 6.29); g.fill();
        g.globalAlpha = 1;
      }
    });
    // release light
    const lx = W - 26, ly = H * .5;
    g.fillStyle = '#07090d'; g.fillRect(lx - 9, ly - 22, 18, 44);
    const green = e.t >= tStop - .05;
    g.fillStyle = green ? '#2b3a30' : '#ff2b2b'; g.beginPath(); g.arc(lx, ly - 10, 6, 0, 6.29); g.fill();
    g.fillStyle = green ? '#2fd780' : '#2a1414'; g.beginPath(); g.arc(lx, ly + 10, 6, 0, 6.29); g.fill();
    // stop clock
    const clock = e.t < tIn ? 0 : Math.min(e.dur, e.t - tIn);
    const fs = Math.round(H * .17);
    g.font = `800 ${fs}px "Saira Condensed", "Arial Narrow", sans-serif`; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    const txt = clock.toFixed(2) + 's', tw = g.measureText(txt).width;
    g.fillStyle = 'rgba(7,9,13,.85)'; g.fillRect(8, H - fs - 12, tw + 16, fs + 6);
    g.fillStyle = e.t >= tStop ? (e.slow ? '#ffc21a' : '#2fd780') : '#eef2f8';
    g.fillText(txt, 16, H - 10);
  }
};
})();
