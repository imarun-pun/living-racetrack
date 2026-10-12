/* Canvas renderer: static circuit layer + live cars, effects and weather. */
window.PW = window.PW || {};
(() => {
const mod = PW.mod;

/* Top-down single-seater, drawn facing +x. len/wid in px. */
PW.drawCarTop = function (g, len, wid, c1, c2, detail, noTyres) {
  if (!detail || len < 13) {
    g.fillStyle = c1; g.beginPath(); g.roundRect(-len / 2, -wid / 2, len, wid, wid / 2); g.fill();
    g.fillStyle = 'rgba(5,7,10,.55)'; g.fillRect(-len * .05, -wid * .2, len * .24, wid * .4);
    return;
  }
  const X = x => x * len, Y = y => y * wid;
  g.fillStyle = '#0b0c0f';
  if (!noTyres) { g.fillRect(X(-.41), Y(-.52), X(.19), Y(.22)); g.fillRect(X(-.41), Y(.30), X(.19), Y(.22)); } // rear tyres
  if (!noTyres) { g.fillRect(X(.17), Y(-.49), X(.15), Y(.19)); g.fillRect(X(.17), Y(.30), X(.15), Y(.19)); } // front tyres
  g.fillStyle = c1; g.beginPath();
  [[-.42,-.16],[-.2,-.22],[-.12,-.34],[.06,-.3],[.12,-.16],[.36,-.07],[.47,-.035],[.47,.035],[.36,.07],[.12,.16],[.06,.3],[-.12,.34],[-.2,.22],[-.42,.16]]
    .forEach(([x, y], k) => k ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)));
  g.closePath(); g.fill();
  g.fillStyle = c2; g.fillRect(X(-.5), Y(-.46), X(.08), Y(.92));            // rear wing
  g.fillRect(X(.41), Y(-.5), X(.07), Y(1));                                    // front wing
  g.fillStyle = c1; g.fillRect(X(.44), Y(-.5), X(.03), Y(1));
  g.fillStyle = 'rgba(5,7,10,.8)'; g.beginPath(); g.ellipse(X(.02), 0, X(.075), Y(.11), 0, 0, 6.29); g.fill(); // cockpit
  g.fillStyle = c2; g.beginPath(); g.arc(X(.0), 0, Y(.075), 0, 6.29); g.fill();                              // helmet
  g.strokeStyle = 'rgba(10,12,16,.9)'; g.lineWidth = Math.max(1, wid * .07); g.beginPath();                  // halo
  g.moveTo(X(.1), 0); g.lineTo(X(.05), Y(-.12)); g.moveTo(X(.1), 0); g.lineTo(X(.05), Y(.12)); g.stroke();
};

PW.Renderer = class Renderer {
  constructor(canvas) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.layer = document.createElement('canvas'); this.puffs = []; this.drops = [];
    for (let k = 0; k < 220; k++) this.drops.push({ x: Math.random(), y: Math.random(), l: .6 + Math.random() * .8, v: .7 + Math.random() * .6 });
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  setCircuit(C) { this.C = C; }
  layout(W, H, DPR, r, opts = {}) {
    const C = this.C, N = PW.N;
    this.style = opts.style || 'circuit';
    this.ls = Math.min(DPR * (opts.hires ? 2.4 : 1), 8192 / Math.max(W, H));   // layer resolution; higher for the chase cam
    this.W = W; this.H = H; this.DPR = DPR;
    this.cv.width = Math.round(W * DPR); this.cv.height = Math.round(H * DPR);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < N; i++) { minX = Math.min(minX, C.X[i]); maxX = Math.max(maxX, C.X[i]); minY = Math.min(minY, C.Y[i]); maxY = Math.max(maxY, C.Y[i]); }
    const pad = opts.zoom === 'close' ? 12 : opts.zoom === 'wide' ? 30 + Math.min(r.w, r.h) * .09 : 30, S = Math.min((r.w - 2 * pad) / (maxX - minX), (r.h - 2 * pad) / (maxY - minY));
    const ox = r.x + (r.w - (maxX - minX) * S) / 2, oy = r.y + (r.h - (maxY - minY) * S) / 2;
    this.SX = new Float64Array(N); this.SY = new Float64Array(N);
    for (let i = 0; i < N; i++) { this.SX[i] = ox + (C.X[i] - minX) * S; this.SY[i] = oy + (C.Y[i] - minY) * S; }
    this.w = Math.max(7, Math.min(22, Math.min(r.w, r.h) * .024, S * 14 * 1.4));
    this.path = new Path2D(); this.path.moveTo(this.SX[0], this.SY[0]);
    for (let i = 1; i < N; i++) this.path.lineTo(this.SX[i], this.SY[i]); this.path.closePath();
    this.drawStatic();
  }
  at(s, off) {
    const C = this.C, N = PW.N, SX = this.SX, SY = this.SY;
    s = mod(s, C.L); const fi = s / C.ds, i = fi | 0, j = (i + 1) % N, f = fi - i;
    const dx = SX[j] - SX[i], dy = SY[j] - SY[i], a = Math.atan2(dy, dx);
    return [SX[i] + dx * f - Math.sin(a) * off, SY[i] + dy * f + Math.cos(a) * off, a];
  }
  offPath(s0, s1, off, step = 6) {
    const p = new Path2D(); let first = true;
    for (let s = s0; s <= s1; s += step) { const [x, y] = this.at(s, off); first ? p.moveTo(x, y) : p.lineTo(x, y); first = false; }
    return p;
  }
  drawStatic() {
    this.layer.width = Math.round(this.W * this.ls); this.layer.height = Math.round(this.H * this.ls);
    const g = this.layer.getContext('2d'); g.setTransform(this.ls, 0, 0, this.ls, 0, 0);
    if (this.style === 'circuit') this.drawCircuit(g); else this.drawNeon(g);
  }
  /* Realistic circuit: grass, run-off, gravel traps, tyre walls, grandstands, pit garages, grid boxes. */
  drawCircuit(g) {
    const { W, H, C, w } = this, L = C.L, inside = C.inside;
    // dark night background, so the circuit pops
    const hue = C.def.hue || '#38c6ff';
    g.fillStyle = '#07090d'; g.fillRect(0, 0, W, H);
    const rg = g.createRadialGradient(W * .6, H * .5, 0, W * .6, H * .5, Math.max(W, H) * .7);
    rg.addColorStop(0, hue + '16'); rg.addColorStop(1, hue + '00'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(200,215,240,.05)';
    for (let x = 14; x < W; x += 28) for (let y = 14; y < H; y += 28) g.fillRect(x, y, 1.2, 1.2);
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.save(); g.strokeStyle = hue; g.globalAlpha = .1; g.lineWidth = w * 4.2; g.shadowColor = hue; g.shadowBlur = 36; g.stroke(this.path); g.restore();
    // verge and run-off
    g.strokeStyle = '#2a2f37'; g.globalAlpha = .7; g.lineWidth = w * 1.9; g.stroke(this.path); g.globalAlpha = 1;
    // gravel traps and tyre walls on the outside of corners
    C.corners.forEach(ci => {
      const s = ci * C.ds, side = -Math.sign(C.K[ci]);
      g.save(); g.lineCap = 'round'; g.strokeStyle = '#bda87e'; g.lineWidth = w * 1.5;
      g.stroke(this.offPath(s - 55, s + 45, side * w * 1.55, 4));
      g.globalAlpha = .25; g.strokeStyle = '#8c7a55'; g.lineWidth = w * .5; g.stroke(this.offPath(s - 50, s + 40, side * w * 1.7, 4)); g.globalAlpha = 1;
      g.lineCap = 'butt'; g.lineWidth = Math.max(2, w * .22); g.strokeStyle = '#e8eaee'; const wall = this.offPath(s - 60, s + 50, side * w * 2.45, 3); g.stroke(wall);
      g.setLineDash([4, 4]); g.strokeStyle = '#d6332b'; g.stroke(wall); g.restore();
    });
    // grandstands along the main straight, outside
    const out = -inside;
    for (let k = 0; k < 3; k++) {
      const s0 = -L * .055 + k * L * .022, [x, y, a] = this.at(s0, out * w * 2.9);
      g.save(); g.translate(x, y); g.rotate(a);
      const gw = this.segPx(s0, s0 + L * .018), gh = w * 1.5;
      g.fillStyle = '#3d434c'; g.fillRect(0, out > 0 ? 0 : -gh, gw, gh);
      for (let r = 1; r < 5; r++) { g.fillStyle = r % 2 ? '#2f6db5' : '#d9dde5'; g.fillRect(2, (out > 0 ? 0 : -gh) + r * gh / 5 - 1, gw - 4, 1.5); }
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, out > 0 ? gh : -gh - 3, gw, 3);
      g.restore();
    }
    // pit lane, pit wall and garages, inside
    const pitOff = inside * w * .95;
    g.save(); g.lineCap = 'butt'; g.strokeStyle = '#3b3f45'; g.lineWidth = w * .7; g.stroke(this.offPath(-L * .085, L * .065, pitOff, 4));
    g.strokeStyle = '#e8eaee'; g.lineWidth = 1.5; g.stroke(this.offPath(-L * .07, L * .05, inside * w * .6, 4)); g.restore();
    for (let b = 0; b < 10; b++) {
      const s0 = L * (.004 + b * .0035), [x, y, a] = this.at(s0, inside * w * 1.75), bw = Math.max(4, this.segPx(s0, s0 + L * .003)), bh = w * .9;
      g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = '#4a5059'; g.fillRect(0, -bh / 2, bw, bh);
      g.fillStyle = (PW.DEFAULT_TEAMS[b] || {}).color || '#888'; g.fillRect(0, inside > 0 ? -bh / 2 : bh / 2 - 2, bw, 2); g.restore();
    }
    // track: white edge lines and asphalt
    g.strokeStyle = '#eef0f3'; g.lineWidth = w + 2.4; g.stroke(this.path);
    g.strokeStyle = '#3a3e44'; g.lineWidth = w; g.stroke(this.path);
    g.save(); g.globalAlpha = .18; g.strokeStyle = '#1d2024'; g.lineWidth = w * .35; g.stroke(this.path); g.restore();   // racing line rubber
    this.kerbs(g, '#f2f4f8', '#d6332b');
    // grid boxes
    for (let k = 0; k < 20; k++) {
      const [x, y, a] = this.at(-10 - k * 8, (k % 2 ? 1.1 : -1.1) * w * .3);
      g.save(); g.translate(x, y); g.rotate(a); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(w * .25, -w * .17); g.lineTo(w * .3, -w * .17); g.lineTo(w * .3, w * .17); g.lineTo(w * .25, w * .17); g.stroke(); g.restore();
    }
    this.labels(g, 'rgba(240,244,250,.65)', '#ffd43b');
    this.startLine(g);
    // start gantry
    const [gx, gy, ga] = this.at(4, 0); g.save(); g.translate(gx, gy); g.rotate(ga);
    g.fillStyle = '#111317'; g.fillRect(-2, -w * .9, 4, w * 1.8); g.fillStyle = '#ff2b2b';
    for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(0, -w * .6 + k * w * .3, 1.4, 0, 6.29); g.fill(); }
    g.restore();
  }
  bounds() {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, m = this.w * 3;
    for (let i = 0; i < PW.N; i += 8) { x0 = Math.min(x0, this.SX[i]); x1 = Math.max(x1, this.SX[i]); y0 = Math.min(y0, this.SY[i]); y1 = Math.max(y1, this.SY[i]); }
    return { x0: x0 - m, y0: y0 - m, x1: x1 + m, y1: y1 + m };
  }
  segPx(a, b) { const [x1, y1] = this.at(a, 0), [x2, y2] = this.at(b, 0); return Math.hypot(x2 - x1, y2 - y1); }
  kerbs(g, c1, c2) {
    const { C, w } = this;
    C.corners.forEach(ci => {
      const s = ci * C.ds, side = -Math.sign(C.K[ci]);
      const p = this.offPath(s - 35, s + 35, side * (w / 2 + 2), 3);
      g.save(); g.lineCap = 'butt'; g.lineWidth = 3.5; g.strokeStyle = c1; g.stroke(p); g.setLineDash([5, 5]); g.strokeStyle = c2; g.stroke(p); g.restore();
    });
  }
  labels(g, corner, sector) {
    const { C, w } = this, L = C.L;
    C.corners.forEach((ci, n) => {
      const [lx, ly] = this.at(ci * C.ds, -Math.sign(C.K[ci]) * (w * (this.style === 'circuit' ? 3.1 : 2.1) + 6));
      g.font = `600 ${Math.max(9, w * .6)}px "JetBrains Mono", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = corner; g.fillText('T' + (n + 1), lx, ly);
    });
    [[0, 'S1'], [L / 3, 'S2'], [2 * L / 3, 'S3']].forEach(([s, lab], k) => {
      if (k) { const [x, y, a] = this.at(s, 0); g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = sector; g.globalAlpha = .8; g.fillRect(-1.5, -w / 2, 3, w); g.restore(); }
      const [lx, ly] = this.at(s + (k ? 0 : 60), -C.inside * (w * 1.6 + 6));
      g.font = `600 ${Math.max(9, w * .55)}px "JetBrains Mono", monospace`; g.fillStyle = sector; g.globalAlpha = .7; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(lab, lx, ly); g.globalAlpha = 1;
    });
    (C.drs || []).forEach(([a, b]) => {
      const e = b < a ? b + L : b, side = -C.inside;
      g.save(); g.setLineDash([6, 5]); g.strokeStyle = '#2fd780'; g.globalAlpha = .6; g.lineWidth = 2; g.lineCap = 'butt';
      g.stroke(this.offPath(a, e, side * (w / 2 + 6), 5)); g.restore();
      const [lx, ly] = this.at(a + 25, side * (w * 1.15 + 10));
      g.font = `600 ${Math.max(8, w * .5)}px "JetBrains Mono", monospace`; g.fillStyle = '#2fd780'; g.globalAlpha = .8; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DRS', lx, ly); g.globalAlpha = 1;
    });
  }
  startLine(g) {
    const w = this.w, [sx, sy, sa] = this.at(0, 0); g.save(); g.translate(sx, sy); g.rotate(sa);
    const sq = w / 6; for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) { g.fillStyle = (r + c) % 2 ? '#0a0c10' : '#f2f4f8'; g.fillRect(-sq + r * sq, -w / 2 + c * sq, sq, sq); }
    g.restore();
  }
  /* Neon night look: glowing track on a dark grid. */
  drawNeon(g) {
    const { W, H, C, w } = this, L = C.L, hue = C.def.hue;
    g.fillStyle = '#07090d'; g.fillRect(0, 0, W, H);
    const rg = g.createRadialGradient(W * .6, H * .5, 0, W * .6, H * .5, Math.max(W, H) * .7);
    rg.addColorStop(0, hue + '1c'); rg.addColorStop(1, hue + '00'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(200,215,240,.055)';
    for (let x = 14; x < W; x += 28) for (let y = 14; y < H; y += 28) g.fillRect(x, y, 1.2, 1.2);
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.save(); g.strokeStyle = hue; g.globalAlpha = .16; g.lineWidth = w * 2.8; g.shadowColor = hue; g.shadowBlur = 40; g.stroke(this.path); g.restore();
    g.strokeStyle = 'rgba(232,238,250,.6)'; g.lineWidth = w + 3; g.stroke(this.path);
    g.strokeStyle = '#151a23'; g.lineWidth = w; g.stroke(this.path);
    g.save(); g.setLineDash([2, 10]); g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1; g.stroke(this.path); g.restore();
    const pitOff = C.inside * w * .95;
    g.save(); g.strokeStyle = 'rgba(232,238,250,.22)'; g.lineWidth = Math.max(2, w * .28); g.stroke(this.offPath(-L * .085, L * .065, pitOff)); g.restore();
    for (let b = 0; b < 10; b++) { const [x, y, a] = this.at(L * (.006 + b * .0035), pitOff + C.inside * w * .3); g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = 'rgba(232,238,250,.22)'; g.fillRect(-1, -w * .12, 2, w * .24); g.restore(); }
    C.corners.forEach((ci, n) => {
      const s = ci * C.ds, side = -Math.sign(C.K[ci]);
      const p = this.offPath(s - 35, s + 35, side * (w / 2 + 2), 3);
      g.save(); g.lineCap = 'butt'; g.lineWidth = 3.5; g.strokeStyle = '#f2f4f8'; g.stroke(p); g.setLineDash([5, 5]); g.strokeStyle = '#e8322e'; g.stroke(p); g.restore();
      const [lx, ly] = this.at(s, side * (w * 2.1 + 6));
      g.font = `600 ${Math.max(9, w * .6)}px "JetBrains Mono", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = 'rgba(200,212,235,.42)'; g.fillText('T' + (n + 1), lx, ly);
    });
    [[0, 'S1'], [L / 3, 'S2'], [2 * L / 3, 'S3']].forEach(([s, lab], k) => {
      if (k) { const [x, y, a] = this.at(s, 0); g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = hue; g.globalAlpha = .8; g.fillRect(-1.5, -w / 2, 3, w); g.restore(); }
      const [lx, ly] = this.at(s + (k ? 0 : 60), -C.inside * (w * 1.6 + 6));
      g.font = `600 ${Math.max(9, w * .55)}px "JetBrains Mono", monospace`; g.fillStyle = hue; g.globalAlpha = .7; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(lab, lx, ly); g.globalAlpha = 1;
    });
    // DRS zones along the outside edge
    (C.drs || []).forEach(([a, b]) => {
      const e = b < a ? b + L : b, side = -C.inside;
      g.save(); g.setLineDash([6, 5]); g.strokeStyle = '#2fd780'; g.globalAlpha = .55; g.lineWidth = 2; g.lineCap = 'butt';
      g.stroke(this.offPath(a, e, side * (w / 2 + 6), 5)); g.restore();
      const [lx, ly] = this.at(a + 25, side * (w * 1.15 + 10));
      g.font = `600 ${Math.max(8, w * .5)}px "JetBrains Mono", monospace`; g.fillStyle = '#2fd780'; g.globalAlpha = .75; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DRS', lx, ly); g.globalAlpha = 1;
    });
    const [sx, sy, sa] = this.at(0, 0); g.save(); g.translate(sx, sy); g.rotate(sa);
    const sq = w / 6; for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) { g.fillStyle = (r + c) % 2 ? '#0a0c10' : '#f2f4f8'; g.fillRect(-sq + r * sq, -w / 2 + c * sq, sq, sq); }
    g.restore();
  }

  /* Recovery timeline (simulated seconds): truck arrives 0–7, crane lifts the car over the wall 7–15, truck leaves with it 15–24. */
  recoveryPose(c) {
    const t = c.recov.t, side = c.outSide || 1, e = v => v < 0 ? 0 : v > 1 ? 1 : v * v * (3 - 2 * v);
    const lift = e((t - 7) / 8), go = e((t - 15) / 9);
    return { s: c.dist + go * 160, lat: c.lat + (side * 6.4 - c.lat) * lift, k: 1 + .3 * Math.sin(Math.PI * Math.min(1, lift)) * (1 - go) + (lift >= 1 ? 0 : 0), alpha: 1 - e((t - 21) / 3) };
  }
  drawRecovery(ctx, c, latPx, len, wid, now) {
    const t = c.recov.t, side = c.outSide || 1, e = v => v < 0 ? 0 : v > 1 ? 1 : v * v * (3 - 2 * v);
    const arrive = e(t / 7), go = e((t - 15) / 9), alpha = Math.min(arrive * 1.5, 1) * (1 - e((t - 21) / 3));
    const s = c.dist - 110 * (1 - arrive) + 14 + go * 160, lat = side * 7.6;
    const [x, y, a] = this.at(s, lat * latPx), tl = len * 1.6, tw = wid * 1.55;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-tl / 2 + 1.5, -tw / 2 + 1.5, tl, tw);
    ctx.fillStyle = '#d9dde5'; ctx.fillRect(-tl / 2, -tw / 2, tl * .68, tw);                 // flatbed
    ctx.fillStyle = '#ff8a00'; ctx.fillRect(tl * .2, -tw / 2, tl * .3, tw);                  // cab
    ctx.fillStyle = Math.floor(now / 220) % 2 ? '#ffc21a' : '#5a3a00'; ctx.fillRect(tl * .2, -tw * .45, tl * .06, tw * .9);   // beacon
    ctx.restore();
    // crane arm from the truck to the car while lifting
    if (t > 6 && t < 16) {
      const [cx, cy] = this.at(c.dist, (c.lat + (side * 6.4 - c.lat) * e((t - 7) / 8)) * latPx);
      ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = '#ffc21a'; ctx.lineWidth = Math.max(2, wid * .3); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(cx, cy); ctx.stroke();
      ctx.strokeStyle = '#1a1300'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(cx, cy); ctx.stroke(); ctx.restore();
    }
  }
  draw(race, now, dtR, view) {
    const ctx = this.ctx, C = this.C, w = this.w, W = this.W, H = this.H, L = C.L;
    ctx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);
    const cam = view.cam && !view.cam.cleared ? view.cam : null;
    if (cam) {
      // chase cam: zoomed in, rotating with the car so it always points up the screen
      ctx.fillStyle = '#07090d'; ctx.fillRect(0, 0, W, H);
      const [cx, cy, ca] = this.at(cam.dist, cam.lat * w * .3);
      const target = ca + Math.PI / 2; let da = target - (this.camA ?? target); da = Math.atan2(Math.sin(da), Math.cos(da));
      this.camA = (this.camA ?? target) + da * Math.min(1, (dtR || .016) * 3);
      const Z = Math.max(2.2, Math.min(5, 38 / w * 1.3));
      ctx.save(); ctx.translate(W / 2, H * .62); ctx.rotate(-this.camA); ctx.scale(Z, Z); ctx.translate(-cx, -cy);
    }
    ctx.drawImage(this.layer, 0, 0, W, H);
    const rain = race.weather.rain;
    if (rain > .02) { ctx.save(); ctx.strokeStyle = '#8fc7ff'; ctx.globalAlpha = .12 * rain; ctx.lineWidth = w * .7; ctx.lineJoin = 'round'; ctx.stroke(this.path); ctx.restore(); }
    if (race.sc) { ctx.save(); ctx.strokeStyle = '#ffc21a'; ctx.globalAlpha = .18 + .1 * Math.sin(now / 300); ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.stroke(this.path); ctx.restore(); }
    if (race.yellow && !race.sc) {
      ctx.save(); ctx.strokeStyle = '#ffc21a'; ctx.globalAlpha = .35 + .25 * Math.sin(now / 160); ctx.lineWidth = w * .5; ctx.lineCap = 'round';
      ctx.stroke(this.offPath(race.yellow.s - 160, race.yellow.s + 160, 0, 6)); ctx.restore();
    }
    // debris
    for (const d of race.debris) {
      const [x, y, a] = this.at(d.s, d.lat * w * .3);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a + d.a); ctx.fillStyle = d.c; ctx.fillRect(-d.r, -d.r * .4, d.r * 2, d.r * .8); ctx.restore();
    }
    const latPx = w * .3, len = Math.max(10, w * 1.05), wid = Math.max(4.5, w * .42), detail = w >= 12 || !!cam;
    const order = race.order.slice().reverse();
    // trails
    if (!this.reduce) for (const c of order) {
      if (c.out || c.spin) continue;
      const tl = c.v * .5; if (tl < 6) continue;
      for (let k = 0; k < 5; k++) {
        const a = c.dist - tl + tl * k / 5, b = c.dist - tl + tl * (k + 1) / 5;
        ctx.beginPath(); let first = true;
        for (let s = a; s <= b + .1; s += Math.max(2, (b - a) / 3)) { const [x, y] = this.at(s, c.lat * latPx); first ? ctx.moveTo(x, y) : ctx.lineTo(x, y); first = false; }
        ctx.strokeStyle = c.color; ctx.globalAlpha = (.05 + .28 * (k + 1) / 5) * (1 - .5 * rain); ctx.lineWidth = wid * .8; ctx.lineCap = 'round'; ctx.stroke();
      }
      if (rain > .3) { // spray
        const [x, y] = this.at(c.dist - 6, c.lat * latPx);
        ctx.globalAlpha = .1 * rain * Math.min(1, c.v / 60); ctx.fillStyle = '#cfe6ff'; ctx.beginPath(); ctx.arc(x, y, wid * 1.4, 0, 6.29); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // smoke puffs from spins and crashes
    for (const c of race.cars) if ((c.spin && c.spin.t < c.spin.dur * .7) || c.crash) {
      if (Math.random() < .6) { const [x, y] = this.at(c.dist, c.lat * latPx); this.puffs.push({ x, y, r: wid * .8, life: 1 }); }
    }
    this.puffs = this.puffs.filter(p => (p.life -= dtR * .9) > 0);
    for (const p of this.puffs) { ctx.fillStyle = `rgba(210,215,225,${.22 * p.life})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (2.6 - 1.6 * p.life), 0, 6.29); ctx.fill(); }
    // safety car
    if (race.scCar) {
      const sc = race.scCar, [x, y, a] = this.at(sc.dist, sc.lat * latPx);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.shadowColor = '#ffc21a'; ctx.shadowBlur = 14 + 8 * Math.sin(now / 120);
      ctx.fillStyle = '#ffc21a'; ctx.beginPath(); ctx.roundRect(-len * .55, -wid * .65, len * 1.1, wid * 1.3, wid * .4); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = '#1a1300'; ctx.fillRect(len * .1, -wid * .45, len * .22, wid * .9);           // windscreen
      ctx.fillStyle = Math.floor(now / 250) % 2 ? '#ff8a00' : '#2a6cff'; ctx.fillRect(-len * .12, -wid * .55, len * .1, wid * 1.1); // light bar
      ctx.restore();
      if (w >= 9) { const [lx, ly] = this.at(sc.dist, sc.lat * latPx - C.inside * (w * 1.3 + 6)); ctx.font = `700 ${Math.max(9, w * .55)}px "JetBrains Mono", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffc21a'; ctx.fillText('SC', lx, ly); }
    }
    // recovery trucks
    for (const c of race.cars) if (c.recov && !c.cleared) this.drawRecovery(ctx, c, latPx, len, wid, now);
    // cars
    for (const c of order) {
      if (c.cleared) continue;
      const pose = c.recov ? this.recoveryPose(c) : null;
      const [x, y, a] = this.at(pose ? pose.s : c.dist, (pose ? pose.lat : c.lat) * latPx);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a + c.yaw);
      if (pose) { ctx.scale(pose.k, pose.k); ctx.globalAlpha = pose.alpha; }
      else if (c.out) ctx.globalAlpha = .55;
      if (this.style === 'circuit') { ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 3; ctx.shadowOffsetY = 1.5; }
      else { ctx.shadowColor = c.color; ctx.shadowBlur = this.reduce || c.out ? 0 : w * .8; }
      PW.drawCarTop(ctx, len, wid, c.color, c.color2, detail);
      ctx.restore();
      if (c.out && !pose && Math.floor(now / 400) % 2) { ctx.strokeStyle = '#ffc21a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, len * .9, 0, 6.29); ctx.stroke(); }
      if (view.fav === c.team && !c.out) { ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = .5 + .3 * Math.sin(now / 250); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, len * .85, 0, 6.29); ctx.stroke(); ctx.globalAlpha = 1; }
    }
    // labels
    if (view.labels && race.state !== 'grid') {
      ctx.font = `600 ${Math.max(10, w * .6)}px "JetBrains Mono", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const placed = [];
      race.order.forEach((c, p) => {
        if (c.out || c.cleared || !(p < 5 || view.fav === c.team || c.spin || c.crash)) return;
        let [x, y] = this.at(c.dist, -C.inside * (w * 1.35 + 8) + c.lat * latPx);
        const t = `${p + 1} ${c.code}`, th = Math.max(14, w * .95), fw = c.flag && PW.FLAG_NAMES[c.flag] ? th * .9 : 0, tw = ctx.measureText(t).width + 8 + (fw ? fw + 4 : 0);
        let yy = y;
        for (let k = 0; k < 6 && placed.some(r => Math.abs(r.x - x) < (r.w + tw) / 2 && Math.abs(r.y - yy) < th + 1); k++) yy += th + 2;
        placed.push({ x, y: yy, w: tw });
        if (yy !== y) { ctx.strokeStyle = 'rgba(238,242,248,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, yy - th / 2); ctx.stroke(); }
        y = yy;
        ctx.fillStyle = 'rgba(7,9,13,.85)'; ctx.fillRect(x - tw / 2, y - th / 2, tw, th);
        ctx.fillStyle = c.spin || c.crash ? '#ffc21a' : c.drs ? '#2fd780' : c.color; ctx.fillRect(x - tw / 2, y - th / 2, 2, th);
        if (fw) PW.drawFlag(ctx, c.flag, x - tw / 2 + 5, y - th * .3, fw, th * .6);
        ctx.fillStyle = '#eef2f8'; ctx.fillText(t, x + (fw ? (fw + 4) / 2 : 0) + 1, y + .5);
      });
    }
    if (cam) ctx.restore();
    // rain
    if (rain > .02) {
      ctx.fillStyle = `rgba(6,12,24,${.28 * rain})`; ctx.fillRect(0, 0, W, H);
      if (!this.reduce) {
        ctx.strokeStyle = 'rgba(190,215,255,.35)'; ctx.lineWidth = 1; ctx.beginPath();
        const n = Math.floor(this.drops.length * rain);
        for (let k = 0; k < n; k++) {
          const d = this.drops[k]; d.y += dtR * d.v * 1.6; if (d.y > 1.05) { d.y = -.05; d.x = Math.random(); }
          const x = d.x * W, y = d.y * H; ctx.moveTo(x, y); ctx.lineTo(x - 4 * d.l, y + 16 * d.l);
        }
        ctx.stroke();
      }
    }
    if (race.state === 'red') {
      const gr = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75);
      gr.addColorStop(0, 'rgba(255,30,30,0)'); gr.addColorStop(1, `rgba(255,30,30,${.25 + .1 * Math.sin(now / 250)})`);
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    }
  }
};
})();
