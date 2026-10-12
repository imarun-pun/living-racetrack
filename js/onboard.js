/* Onboard camera: a driver's-eye view of the chosen car, built from the circuit's real curvature.
   Classic "pseudo-3D" road rendering: the road ahead is cut into slices, each slice is turned by the
   curvature at that point and projected onto the screen. Other cars appear as rear-view sprites. */
window.PW = window.PW || {};
(() => {
const STEP = 4, AHEAD = 120, LAT_M = 4.2, HALF = 7;   // metres per slice, slices drawn, metres per lateral unit, half track width
const GEARS = [0, 20, 30, 40, 50, 60, 70, 80, 999];

PW.Onboard = class Onboard {
  constructor(canvas) { this.cv = canvas; this.g = canvas.getContext('2d'); this.wheel = 0; this.shake = 0; }
  draw(race, car, now, dt) {
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = this.cv.clientWidth, H = this.cv.clientHeight;
    if (this.cv.width !== Math.round(W * dpr) || this.cv.height !== Math.round(H * dpr)) { this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr); }
    const g = this.g, C = race.C, L = C.L, mod = PW.mod;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const v = car.v, sh = Math.min(1.5, v / 60) * (Math.random() - .5) * 1.6;
    g.save(); g.translate(0, sh);
    const horizon = H * .44, focal = W * .78, camH = 1.0, camX = car.lat * LAT_M, hue = C.def.hue || '#38c6ff';
    // sky
    const sky = g.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#05070b'); sky.addColorStop(1, '#16243a');
    g.fillStyle = sky; g.fillRect(0, -4, W, horizon + 4);
    g.fillStyle = 'rgba(238,242,248,.5)';
    for (let k = 0; k < 60; k++) { const x = (k * 137.5 + car.dist * .02) % W, y = (k * 53.3) % (horizon * .8); g.fillRect(x, y, 1, 1); }
    const glow = g.createLinearGradient(0, horizon - 30, 0, horizon + 6); glow.addColorStop(0, 'rgba(56,198,255,0)'); glow.addColorStop(1, 'rgba(56,198,255,.25)');
    g.fillStyle = glow; g.fillRect(0, horizon - 30, W, 36);
    g.fillStyle = '#07090d'; g.fillRect(0, horizon, W, H - horizon);
    // road slices ahead
    const pts = []; let hd = 0, x = 0;
    for (let k = 0; k <= AHEAD; k++) {
      const s = car.dist + k * STEP, i = Math.floor(mod(s, L) / C.ds) % PW.N;
      if (k) { hd -= C.K[i] * STEP; x += Math.sin(hd) * STEP; }
      const z = k * STEP + 3, sc = focal / z;
      pts.push({ s, i, z, sc, sx: W / 2 + (x - camX) * sc, sy: horizon + camH * sc, x });
    }
    for (let k = AHEAD; k > 0; k--) {
      const a = pts[k], b = pts[k - 1], band = Math.floor(mod(a.s, L) / 16) % 2;
      const quad = (wa, wb, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(a.sx - wa * a.sc, a.sy); g.lineTo(a.sx + wa * a.sc, a.sy); g.lineTo(b.sx + wb * b.sc, b.sy); g.lineTo(b.sx - wb * b.sc, b.sy); g.fill(); };
      const fog = Math.min(1, a.z / (AHEAD * STEP));
      quad(HALF * 2.1, HALF * 2.1, band ? '#141920' : '#181e26');                 // run-off
      if (Math.abs(C.K[a.i]) > 1 / 260) quad(HALF * 1.18, HALF * 1.18, band ? '#e8eaee' : '#d6332b');   // kerbs on corners
      else quad(HALF * 1.04, HALF * 1.04, '#e8eaee');                             // white edge lines
      quad(HALF, HALF, band ? '#25282d' : '#2a2d33');                             // asphalt
      // barrier walls with a lit top edge, both sides
      const wall = (side) => {
        const xa = a.sx + side * HALF * 2.1 * a.sc, xb = b.sx + side * HALF * 2.1 * b.sc, ha = 1.1 * a.sc, hb = 1.1 * b.sc;
        g.fillStyle = band ? '#1b1f27' : '#232833'; g.beginPath(); g.moveTo(xa, a.sy); g.lineTo(xa, a.sy - ha); g.lineTo(xb, b.sy - hb); g.lineTo(xb, b.sy); g.fill();
        g.strokeStyle = hue; g.globalAlpha = .55 * (1 - fog * .6); g.lineWidth = Math.max(1, .06 * b.sc); g.beginPath(); g.moveTo(xa, a.sy - ha); g.lineTo(xb, b.sy - hb); g.stroke(); g.globalAlpha = 1;
        if (Math.floor(PW.mod(a.s, L) / STEP) % 6 === 0) { g.fillStyle = '#3a4150'; g.fillRect(xa - .04 * a.sc, a.sy - 3.2 * a.sc, Math.max(1, .08 * a.sc), 3.2 * a.sc); }   // fence posts
      };
      wall(-1); wall(1);
      if (Math.abs(mod(a.s, L)) < STEP * 1.2 || mod(a.s, L) > L - STEP * .2) {      // start / finish line
        for (let c = 0; c < 8; c++) { g.fillStyle = c % 2 ? '#111' : '#f2f4f8'; const x0 = a.sx - HALF * a.sc + c * HALF * 2 * a.sc / 8; g.fillRect(x0, b.sy - (b.sy - a.sy), HALF * 2 * a.sc / 8 + 1, Math.max(1, b.sy - a.sy)); }
      }
      if (fog > .55) { g.fillStyle = `rgba(7,9,13,${(fog - .55) * 1.8})`; g.fillRect(Math.min(a.sx, b.sx) - HALF * 3.4 * b.sc, a.sy, HALF * 6.8 * b.sc, b.sy - a.sy + 1); }
    }
    // cars ahead (and the safety car), far to near
    const others = [];
    for (const o of race.cars) {
      if (o === car || o.cleared || (o.inPit && !car.inPit)) continue;
      const d = mod(o.dist - car.dist, L); if (d < 2.5 || d > AHEAD * STEP - 8) continue;
      others.push({ d, lat: o.lat, color: o.color, color2: o.color2, brake: o.v < car.v - 3, rain: race.weather.rain > .3, out: o.out });
    }
    if (race.scCar) { const d = mod(race.scCar.dist - car.dist, L); if (d > 2.5 && d < AHEAD * STEP - 8) others.push({ d, lat: race.scCar.lat, sc: true }); }
    others.sort((a, b) => b.d - a.d);
    for (const o of others) {
      const k = o.d / STEP, k0 = Math.floor(k), f = k - k0, p0 = pts[k0], p1 = pts[Math.min(AHEAD, k0 + 1)];
      const xr = p0.x + (p1.x - p0.x) * f + o.lat * LAT_M, z = o.d + 3, sc = focal / z;
      const sx = W / 2 + (xr - camX) * sc, sy = horizon + camH * sc;
      this.rear(g, sx, sy, sc, o, now);
      if (o.rain && !o.sc) { g.fillStyle = `rgba(200,220,240,${Math.min(.35, 6 / z)})`; g.beginPath(); g.ellipse(sx, sy - .4 * sc, 1.6 * sc, .6 * sc, 0, 0, 6.29); g.fill(); }
    }
    // rain on the visor
    if (race.weather.rain > .05) {
      g.strokeStyle = `rgba(200,220,255,${.25 * race.weather.rain})`; g.lineWidth = 1; g.beginPath();
      for (let k = 0; k < 90 * race.weather.rain; k++) { const rx = Math.random() * W, ry = Math.random() * H; g.moveTo(rx, ry); g.lineTo(rx - 3, ry + 14); }
      g.stroke();
    }
    g.restore();
    this.cockpit(g, W, H, car, race, dt, now);
  }
  /* A car seen from behind: tyres, diffuser, body, rear wing, rain light. */
  rear(g, x, y, sc, o, now) {
    const w = 1.9 * sc, h = 1.0 * sc;
    if (w < 1.5) return;
    g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(x, y, w * .62, h * .12, 0, 0, 6.29); g.fill();
    if (o.sc) {
      g.fillStyle = '#ffc21a'; g.beginPath(); g.roundRect(x - w * .5, y - h * 1.1, w, h * 1.05, h * .15); g.fill();
      g.fillStyle = '#1a1300'; g.fillRect(x - w * .38, y - h * 1.0, w * .76, h * .35);
      g.fillStyle = Math.floor(now / 250) % 2 ? '#ff8a00' : '#2a6cff'; g.fillRect(x - w * .3, y - h * 1.22, w * .6, h * .12);
      return;
    }
    g.fillStyle = '#0b0c0f'; g.fillRect(x - w * .5, y - h * .66, w * .26, h * .66); g.fillRect(x + w * .24, y - h * .66, w * .26, h * .66);    // rear tyres
    g.fillStyle = o.color; g.beginPath(); g.moveTo(x - w * .22, y - h * .12); g.lineTo(x - w * .14, y - h * .78); g.lineTo(x + w * .14, y - h * .78); g.lineTo(x + w * .22, y - h * .12); g.fill();
    g.fillStyle = '#16181d'; g.fillRect(x - w * .24, y - h * .18, w * .48, h * .16);                                                                // diffuser
    g.fillStyle = o.color2; g.fillRect(x - w * .3, y - h * 1.05, w * .06, h * .42); g.fillRect(x + w * .24, y - h * 1.05, w * .06, h * .42);      // endplates
    g.fillStyle = o.color; g.fillRect(x - w * .3, y - h * 1.06, w * .6, h * .12);                                                                  // wing
    g.fillStyle = '#16181d'; g.fillRect(x - w * .27, y - h * .9, w * .54, h * .07);
    if (o.brake || o.rain) { g.fillStyle = Math.floor(now / 120) % 2 || !o.rain ? '#ff2b2b' : '#5a0d0d'; g.fillRect(x - w * .04, y - h * .32, w * .08, h * .1); }
    if (o.out) { g.fillStyle = 'rgba(255,194,26,.6)'; g.fillRect(x - w * .5, y - h * 1.1, w, h * .08); }
  }
  /* Halo, nose, front tyres and a steering wheel with a live dash. */
  cockpit(g, W, H, car, race, dt, now) {
    const C = race.C, i = Math.floor(PW.mod(car.dist + 25, C.L) / C.ds) % PW.N;
    this.wheel += (Math.max(-1, Math.min(1, -C.K[i] * 60)) - this.wheel) * Math.min(1, dt * 6);
    // nose and front tyres
    g.fillStyle = car.color; g.beginPath(); g.moveTo(W * .46, H); g.lineTo(W * .485, H * .74); g.lineTo(W * .515, H * .74); g.lineTo(W * .54, H); g.fill();
    g.fillStyle = car.color2; g.fillRect(W * .495, H * .76, W * .01, H * .24);
    g.fillStyle = '#0b0c0f'; g.beginPath(); g.roundRect(-W * .02, H * .7, W * .17, H * .38, 18); g.fill(); g.beginPath(); g.roundRect(W * .85, H * .7, W * .17, H * .38, 18); g.fill();
    g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(W * .02, H * .74, W * .1, H * .02); g.fillRect(W * .88, H * .74, W * .1, H * .02);
    // halo: centre pillar and the hoop overhead
    g.strokeStyle = '#0d0f13'; g.lineCap = 'round';
    g.lineWidth = W * .013; g.beginPath(); g.moveTo(W / 2, H * .8); g.lineTo(W / 2, H * .02); g.stroke();
    g.lineWidth = W * .03; g.beginPath(); g.ellipse(W / 2, H * .06, W * .44, H * .2, 0, Math.PI * .05, Math.PI * .95, true); g.stroke();
    // steering wheel
    const cx = W / 2, cy = H * .93, ww = Math.min(W * .4, 560), wh = ww * .42;
    g.save(); g.translate(cx, cy); g.rotate(this.wheel * .5);
    g.fillStyle = '#121418'; g.beginPath(); g.roundRect(-ww / 2, -wh / 2, ww, wh, wh * .3); g.fill();
    g.fillStyle = '#1d2026'; g.beginPath(); g.roundRect(-ww / 2 - ww * .03, -wh / 2, ww * .16, wh * 1.05, wh * .25); g.fill(); g.beginPath(); g.roundRect(ww / 2 - ww * .13, -wh / 2, ww * .16, wh * 1.05, wh * .25); g.fill();
    // dash
    const dw = ww * .44, dh = wh * .5, gear = Math.max(1, Math.min(8, GEARS.findIndex(s => car.v < s))), lo = GEARS[gear - 1], hi = GEARS[gear] === 999 ? 92 : GEARS[gear];
    const rpm = Math.max(0, Math.min(1, (car.v - lo) / Math.max(1, hi - lo)));
    g.fillStyle = '#05070a'; g.fillRect(-dw / 2, -wh * .36, dw, dh);
    for (let k = 0; k < 12; k++) { const on = rpm > k / 12; g.fillStyle = on ? (k < 5 ? '#2fd780' : k < 9 ? '#ff2b2b' : '#4c7dff') : '#1a1d22'; g.beginPath(); g.arc(-dw / 2 + dw * (k + .5) / 12, -wh * .43, wh * .035, 0, 6.29); g.fill(); }
    const pos = race.order.indexOf(car) + 1;
    g.textBaseline = 'middle'; g.fillStyle = '#eef2f8';
    g.font = `800 ${Math.round(dh * .55)}px "Saira Condensed", "Arial Narrow", sans-serif`; g.textAlign = 'center'; g.fillText(car.inPit ? 'N' : String(gear), 0, -wh * .1);
    g.font = `600 ${Math.round(dh * .2)}px "JetBrains Mono", monospace`;
    g.textAlign = 'left'; g.fillText(`${Math.round(car.v * 3.6)} km/h`, -dw / 2 + 6, -wh * .27);
    g.textAlign = 'right'; g.fillText(`P${pos}  L${Math.min(race.laps, Math.max(1, Math.floor(car.dist / C.L) + 1))}`, dw / 2 - 6, -wh * .27);
    g.textAlign = 'left'; g.fillStyle = car.drs ? '#2fd780' : '#3a3f47'; g.fillText('DRS', -dw / 2 + 6, wh * .05);
    g.textAlign = 'right'; g.fillStyle = (PW.TYRES[car.tyre] || PW.TYRES.M).c; g.fillText(PW.TYRES[car.tyre] ? PW.TYRES[car.tyre].n.toUpperCase() : '', dw / 2 - 6, wh * .05);
    // buttons
    [[-.32, -.05, '#ff2b2b'], [.32, -.05, '#ffd43b'], [-.3, .22, '#2fd780'], [.3, .22, '#4c7dff']].forEach(([a, b, c]) => { g.fillStyle = c; g.beginPath(); g.arc(ww * a, wh * b, wh * .06, 0, 6.29); g.fill(); });
    g.restore();
    // driver tag
    g.font = `700 ${Math.max(13, Math.round(H * .024))}px "Saira Condensed", "Arial Narrow", sans-serif`; g.textAlign = 'center'; g.fillStyle = 'rgba(238,242,248,.85)';
    g.fillText(`ONBOARD · #${car.num} ${String(car.name || '').toUpperCase()}`, W / 2, H * .12);
  }
};
})();
