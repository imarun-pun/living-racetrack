/* Onboard camera: the driver's view of the chosen car, built from the circuit's real curvature.
   Pseudo-3D road: the road ahead is cut into slices, each turned by the curvature at that point and
   projected onto the screen. Kerbs, gravel, walls, catch fences and floodlights come from the same corner
   data as the map. Then the cockpit on top: front tyres turning, nose, mirrors that show the car behind,
   the halo, and a steering wheel with a live display held in the driver's gloves. */
window.PW = window.PW || {};
(() => {
const STEP = 3, AHEAD = 150, LAT_M = 3.6, HALF = 7;   // metres per slice, slices drawn, metres per lateral unit, half track width
const GEARS = [0, 20, 30, 40, 50, 60, 70, 80, 999];
const TAU = Math.PI * 2;

PW.Onboard = class Onboard {
  constructor(canvas) { this.cv = canvas; this.g = canvas.getContext('2d'); this.wheel = 0; this.light = { night: 1, golden: 0 }; this.C = null; this.prevV = 0; this.acc = 0; }

  /* Per-sample furniture for this circuit: kerbs on either side, and run-off type. */
  prep(C) {
    if (this.C === C) return; this.C = C;
    const N = PW.N, kerb = new Int8Array(N), runoff = new Int8Array(N), ds = C.ds;
    const mark = (s0, s1, side, arr, val) => { for (let s = s0; s <= s1; s += ds) { const i = Math.floor(PW.mod(s, C.L) / ds) % N; arr[i] |= side > 0 ? val : val << 1; } };
    for (const f of PW.cornerFeatures(C)) {
      const lk = Math.max(10, Math.min(38, (f.s1 - f.s0) * .28));
      mark(f.apex - lk, f.apex + lk, -f.side, kerb, 1);
      mark(f.s0 - 14, f.s0 + 12, f.side, kerb, 1);
      mark(f.s1 - 16, f.s1 + 22, f.side, kerb, 1);
      mark(f.s0 - 12, f.s1 + 40, f.side, runoff, f.fast ? 4 : 1);
    }
    this.kerb = kerb; this.runoff = runoff; this.street = PW.STREET_CIRCUITS && PW.STREET_CIRCUITS.has(C.def.id);
  }

  draw(race, car, now, dt) {
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = this.cv.clientWidth, H = this.cv.clientHeight;
    if (this.cv.width !== Math.round(W * dpr) || this.cv.height !== Math.round(H * dpr)) { this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr); }
    const g = this.g, C = race.C, L = C.L, mod = PW.mod;
    this.prep(C);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const v = car.v, si = Math.floor(mod(car.dist, L) / C.ds) % PW.N;
    // acceleration for the pitch of the car (nose dips under braking) and the throttle/brake display
    if (dt > 0) { this.acc += ((v - this.prevV) / dt - this.acc) * Math.min(1, dt * 6); this.prevV = v; }
    const onKerb = !!this.kerb[si] && Math.abs(car.lat) > .8;
    const shake = (Math.min(1.2, v / 70) + (onKerb ? 2.5 : 0)) * (Math.random() - .5) * 1.4;
    const pitch = Math.max(-1, Math.min(1, -this.acc / 40)) * H * .012;
    g.save(); g.translate(0, shake + pitch);
    const horizon = H * .42, focal = W * .82, camH = .95, camX = car.lat * LAT_M, hue = C.def.hue || '#38c6ff';
    const night = this.light.night, golden = this.light.golden;
    this.sky(g, W, horizon, night, golden, car.dist, hue);

    // road slices ahead
    const pts = []; let hd = 0, x = 0;
    for (let k = 0; k <= AHEAD; k++) {
      const s = car.dist + k * STEP, i = Math.floor(mod(s, L) / C.ds) % PW.N;
      if (k) { hd += C.K[i] * STEP; x += Math.sin(hd) * STEP; }
      const z = k * STEP + 2.2, sc = focal / z;
      pts.push({ s, i, z, sc, sx: W / 2 + (x - camX) * sc, sy: horizon + camH * sc, x });
    }
    const wallOff = this.street ? HALF + 1.4 : HALF * 2.35;
    const lamps = [];
    for (let k = AHEAD; k > 0; k--) {
      const a = pts[k], b = pts[k - 1], band = Math.floor(mod(a.s, L) / 4) % 2, band16 = Math.floor(mod(a.s, L) / 16) % 2;
      const quad = (l0, r0, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(a.sx + l0 * a.sc, a.sy); g.lineTo(a.sx + r0 * a.sc, a.sy); g.lineTo(b.sx + r0 * b.sc, b.sy); g.lineTo(b.sx + l0 * b.sc, b.sy); g.fill(); };
      const fog = Math.min(1, a.z / (AHEAD * STEP));
      const kb = this.kerb[a.i], ro = this.runoff[a.i];
      // ground beyond the track, run-off, gravel
      quad(-wallOff - 6, wallOff + 6, night > .5 ? (band16 ? '#0c1016' : '#0e1219') : (band16 ? '#1c2a22' : '#203026'));
      if (!this.street) {
        const gravel = band ? '#a8946b' : '#b29e74', tarmac = band16 ? '#2b3037' : '#2f343c';
        quad(-wallOff, -HALF, ro & 2 ? gravel : ro & 8 ? tarmac : (band16 ? '#151a21' : '#181d25'));
        quad(HALF, wallOff, ro & 1 ? gravel : ro & 4 ? tarmac : (band16 ? '#151a21' : '#181d25'));
      }
      // white lines, kerbs, asphalt with a darker rubbered line
      quad(-HALF - .35, -HALF + .1, '#e8eaee'); quad(HALF - .1, HALF + .35, '#e8eaee');
      if (kb & 2) quad(-HALF - 1.4, -HALF + .6, band ? '#f2f4f8' : '#d6332b');
      if (kb & 1) quad(HALF - .6, HALF + 1.4, band ? '#f2f4f8' : '#d6332b');
      const asph = night > .5 ? (band16 ? '#24272c' : '#272a30') : (band16 ? '#3a3e45' : '#3e424a');
      quad(-HALF + (kb & 2 ? .6 : .1), HALF - (kb & 1 ? .6 : .1), asph);
      const ln = (C.line ? C.line[a.i] : 0) * LAT_M;
      quad(ln - 1.1, ln + 1.1, 'rgba(10,11,13,.22)');
      // start / finish line
      if (mod(a.s, L) < STEP * 1.2 || mod(a.s, L) > L - STEP * .2) {
        for (let c = 0; c < 10; c++) { const l0 = -HALF + c * HALF * 2 / 10; quad(l0, l0 + HALF * .2, c % 2 ? '#111' : '#f2f4f8'); }
      }
      // walls (lit top edge), catch fences with posts, floodlight towers at night
      for (const side of [-1, 1]) {
        const xa = a.sx + side * wallOff * a.sc, xb = b.sx + side * wallOff * b.sc, ha = 1.05 * a.sc, hb = 1.05 * b.sc;
        g.fillStyle = this.street ? (band16 ? '#8d939e' : '#9aa0aa') : band ? '#d9dde5' : '#d6332b';
        if (this.street && night > .5) g.fillStyle = band16 ? '#4a505a' : '#555b66';
        g.beginPath(); g.moveTo(xa, a.sy); g.lineTo(xa, a.sy - ha); g.lineTo(xb, b.sy - hb); g.lineTo(xb, b.sy); g.fill();
        g.strokeStyle = hue; g.globalAlpha = .5 * (1 - fog * .6); g.lineWidth = Math.max(1, .05 * b.sc); g.beginPath(); g.moveTo(xa, a.sy - ha); g.lineTo(xb, b.sy - hb); g.stroke(); g.globalAlpha = 1;
        const fence = 4.2;
        g.strokeStyle = 'rgba(160,170,185,.28)'; g.lineWidth = Math.max(.6, .02 * b.sc); g.beginPath(); g.moveTo(xa, a.sy - fence * a.sc); g.lineTo(xb, b.sy - fence * b.sc); g.stroke();
        if (Math.floor(mod(a.s, L) / STEP) % 4 === 0) { g.fillStyle = '#3a4150'; g.fillRect(xa - .05 * a.sc, a.sy - fence * a.sc, Math.max(1, .1 * a.sc), fence * a.sc); }
        if (night > .2 && Math.floor(mod(a.s, L) / STEP) % 30 === (side > 0 ? 0 : 15)) lamps.push({ x: a.sx + side * (wallOff + 3) * a.sc, y: a.sy, sc: a.sc, fog });
      }
      if (fog > .5) { g.fillStyle = night > .5 ? `rgba(7,9,13,${(fog - .5) * 1.9})` : `rgba(150,170,190,${(fog - .5) * 1.2})`; g.fillRect(Math.min(a.sx, b.sx) - wallOff * 1.6 * b.sc, a.sy, wallOff * 3.2 * b.sc, b.sy - a.sy + 1); }
    }
    // floodlight towers: a pole and a glaring lamp head
    for (const l of lamps) {
      const top = l.y - 16 * l.sc, a = night * (1 - l.fog * .5);
      g.strokeStyle = `rgba(90,98,112,${a})`; g.lineWidth = Math.max(1, .25 * l.sc); g.beginPath(); g.moveTo(l.x, l.y); g.lineTo(l.x, top); g.stroke();
      const r = Math.max(4, 3.2 * l.sc), gl = g.createRadialGradient(l.x, top, 0, l.x, top, r);
      gl.addColorStop(0, `rgba(255,248,230,${.95 * a})`); gl.addColorStop(.2, `rgba(255,236,200,${.5 * a})`); gl.addColorStop(1, 'rgba(255,236,200,0)');
      g.fillStyle = gl; g.beginPath(); g.arc(l.x, top, r, 0, TAU); g.fill();
    }
    // cars ahead (and the safety car), far to near
    const others = [];
    for (const o of race.cars) {
      if (o === car || o.cleared || (o.inPit && !car.inPit)) continue;
      const d = mod(o.dist - car.dist, L); if (d < 3 || d > AHEAD * STEP - 8) continue;
      others.push({ d, lat: o.lat, color: o.color, color2: o.color2, brake: o.v < car.v - 3, rain: race.weather.rain > .3, out: o.out, drs: o.drs, num: o.num });
    }
    if (race.scCar) { const d = mod(race.scCar.dist - car.dist, L); if (d > 3 && d < AHEAD * STEP - 8) others.push({ d, lat: race.scCar.lat, sc: true }); }
    others.sort((a, b) => b.d - a.d);
    for (const o of others) {
      const k = o.d / STEP, k0 = Math.floor(k), f = k - k0, p0 = pts[k0], p1 = pts[Math.min(AHEAD, k0 + 1)];
      const xr = p0.x + (p1.x - p0.x) * f + o.lat * LAT_M, z = o.d + 2.2, sc = focal / z;
      const sx = W / 2 + (xr - camX) * sc, sy = horizon + camH * sc;
      this.rear(g, sx, sy, sc, o, now);
      if (o.rain && !o.sc) { g.fillStyle = `rgba(200,220,240,${Math.min(.14, 2.5 / z)})`; g.beginPath(); g.ellipse(sx, sy - .5 * sc, 1.8 * sc, .7 * sc, 0, 0, TAU); g.fill(); }
    }
    g.restore();
    // rain on the visor
    if (race.weather.rain > .05) {
      g.strokeStyle = `rgba(200,220,255,${.22 * race.weather.rain})`; g.lineWidth = 1; g.beginPath();
      for (let k = 0; k < 90 * race.weather.rain; k++) { const rx = Math.random() * W, ry = Math.random() * H; g.moveTo(rx, ry); g.lineTo(rx - 3, ry + 14); }
      g.stroke();
    }
    this.cockpit(g, W, H, car, race, dt, now, shake * .4);
  }

  sky(g, W, horizon, night, golden, dist, hue) {
    const top = night > .5 ? '#04060a' : golden > .3 ? '#2a3a63' : '#3d6fae', low = night > .5 ? '#152238' : golden > .3 ? '#ff9a52' : '#a9c8e6';
    const sky = g.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, top); sky.addColorStop(1, low);
    g.fillStyle = sky; g.fillRect(0, -6, W, horizon + 6);
    if (night > .5) {
      g.fillStyle = 'rgba(238,242,248,.55)';
      for (let k = 0; k < 70; k++) { const x = (k * 137.5 + dist * .015) % W, y = (k * 53.3) % (horizon * .75); g.fillRect(x, y, 1, 1); }
      const glow = g.createLinearGradient(0, horizon - 40, 0, horizon); glow.addColorStop(0, 'rgba(255,214,150,0)'); glow.addColorStop(1, 'rgba(255,214,150,.18)');
      g.fillStyle = glow; g.fillRect(0, horizon - 40, W, 40);
    }
    // distant skyline / hills
    g.fillStyle = night > .5 ? '#0b1018' : golden > .3 ? '#3b2f3a' : '#56708a';
    g.beginPath(); g.moveTo(0, horizon);
    for (let x = 0; x <= W; x += W / 40) { const n = Math.sin((x + dist * .05) * .013) * .5 + Math.sin((x + dist * .05) * .037) * .3; g.lineTo(x, horizon - 10 - Math.abs(n) * horizon * .1); }
    g.lineTo(W, horizon); g.closePath(); g.fill();
  }

  /* A car seen from behind: wide rear tyres, diffuser, engine cover, rear wing and the rain light. */
  rear(g, x, y, sc, o, now) {
    const w = 1.95 * sc, h = 1.0 * sc;
    if (w < 1.5) return;
    g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.ellipse(x, y, w * .64, h * .13, 0, 0, TAU); g.fill();
    if (o.sc) {
      g.fillStyle = '#ffc21a'; g.beginPath(); g.roundRect(x - w * .5, y - h * 1.1, w, h * 1.05, h * .15); g.fill();
      g.fillStyle = '#1a1300'; g.fillRect(x - w * .38, y - h * 1.0, w * .76, h * .35);
      g.fillStyle = Math.floor(now / 250) % 2 ? '#ff8a00' : '#2a6cff'; g.fillRect(x - w * .3, y - h * 1.22, w * .6, h * .12);
      return;
    }
    const tyre = (cx) => { g.fillStyle = '#0b0c0f'; g.beginPath(); g.roundRect(cx - w * .14, y - h * .7, w * .28, h * .7, w * .04); g.fill(); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(cx - w * .12, y - h * .66, w * .03, h * .6); };
    tyre(x - w * .36); tyre(x + w * .36);
    g.fillStyle = o.color; g.beginPath(); g.moveTo(x - w * .22, y - h * .12); g.lineTo(x - w * .16, y - h * .52); g.lineTo(x - w * .05, y - h * .88); g.lineTo(x + w * .05, y - h * .88); g.lineTo(x + w * .16, y - h * .52); g.lineTo(x + w * .22, y - h * .12); g.fill();
    g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.moveTo(x - w * .02, y - h * .84); g.lineTo(x + w * .02, y - h * .84); g.lineTo(x + w * .01, y - h * .3); g.lineTo(x - w * .01, y - h * .3); g.fill();
    g.fillStyle = '#16181d'; g.fillRect(x - w * .26, y - h * .2, w * .52, h * .18);                                     // diffuser
    for (let k = -2; k <= 2; k++) { g.fillStyle = '#0b0c0f'; g.fillRect(x + k * w * .1 - w * .01, y - h * .2, w * .02, h * .18); }
    g.fillStyle = o.color2; g.fillRect(x - w * .33, y - h * 1.08, w * .07, h * .48); g.fillRect(x + w * .26, y - h * 1.08, w * .07, h * .48);   // endplates
    g.fillStyle = o.color; g.fillRect(x - w * .33, y - h * 1.1, w * .66, h * .13);                                    // main plane
    g.fillStyle = o.drs ? '#2fd780' : '#16181d'; g.fillRect(x - w * .3, y - (o.drs ? h * 1.2 : h * .95), w * .6, h * .07);   // flap (opens with DRS)
    if (o.brake || o.rain) { g.fillStyle = Math.floor(now / 120) % 2 || !o.rain ? '#ff2b2b' : '#5a0d0d'; g.fillRect(x - w * .04, y - h * .34, w * .08, h * .1); }
    if (o.out) { g.fillStyle = 'rgba(255,194,26,.6)'; g.fillRect(x - w * .5, y - h * 1.12, w, h * .08); }
  }

  /* The cockpit: front tyres, suspension, nose, mirrors, halo, steering wheel with display, and gloves. */
  cockpit(g, W, H, car, race, dt, now, jig) {
    const C = race.C, i = Math.floor(PW.mod(car.dist + 22, C.L) / C.ds) % PW.N;
    this.wheel += (Math.max(-1, Math.min(1, C.K[i] * 55)) - this.wheel) * Math.min(1, dt * 6);
    const c1 = car.color, c2 = car.color2, tyreC = (PW.TYRES[car.tyre] || PW.TYRES.M).c, shade = PW.shade || ((c) => c);
    g.save(); g.translate(0, jig);
    // front tyres with rotating tread and the compound stripe
    const spin = (car.dist * 6) % 40;
    for (const side of [-1, 1]) {
      const cx = W / 2 + side * W * .37, tw = W * .17, th = H * .3, ty = H * .6;
      g.save(); g.beginPath(); g.roundRect(cx - tw / 2, ty, tw, th, tw * .18); g.clip();
      const tg = g.createLinearGradient(cx - tw / 2, 0, cx + tw / 2, 0); tg.addColorStop(0, '#050506'); tg.addColorStop(.5, '#1a1c21'); tg.addColorStop(1, '#050506');
      g.fillStyle = tg; g.fillRect(cx - tw / 2, ty, tw, th);
      g.fillStyle = 'rgba(255,255,255,.05)'; for (let y = ty - 40 + spin; y < ty + th; y += 40) g.fillRect(cx - tw / 2, y, tw, 6);
      g.fillStyle = tyreC; g.fillRect(cx + side * -tw * .42 - tw * .03, ty, tw * .06, th);
      g.restore();
      // wishbones from the hub to the chassis
      g.strokeStyle = '#0d0f13'; g.lineWidth = Math.max(3, W * .006); g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx - side * tw * .45, ty + th * .35); g.lineTo(W / 2 + side * W * .07, H * .78); g.moveTo(cx - side * tw * .45, ty + th * .55); g.lineTo(W / 2 + side * W * .07, H * .9); g.stroke();
    }
    // nose with livery
    const ng = g.createLinearGradient(W * .44, 0, W * .56, 0); ng.addColorStop(0, shade(c1, -.45)); ng.addColorStop(.5, shade(c1, .15)); ng.addColorStop(1, shade(c1, -.45));
    g.fillStyle = ng; g.beginPath(); g.moveTo(W * .41, H); g.quadraticCurveTo(W * .47, H * .78, W * .488, H * .66); g.lineTo(W * .512, H * .66); g.quadraticCurveTo(W * .53, H * .78, W * .59, H); g.fill();
    g.fillStyle = c2; g.beginPath(); g.moveTo(W * .494, H * .68); g.lineTo(W * .506, H * .68); g.lineTo(W * .515, H); g.lineTo(W * .485, H); g.fill();
    // chassis sides and cockpit rim
    for (const side of [-1, 1]) {
      const cg = g.createLinearGradient(0, H * .7, 0, H);
      cg.addColorStop(0, shade(c1, -.2)); cg.addColorStop(1, shade(c1, -.7));
      g.fillStyle = cg; g.beginPath();
      const x0 = side < 0 ? 0 : W;
      g.moveTo(x0, H * .9); g.quadraticCurveTo(W / 2 + side * W * .32, H * .88, W / 2 + side * W * .24, H); g.lineTo(x0, H); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, H * .9); g.quadraticCurveTo(W / 2 + side * W * .32, H * .88, W / 2 + side * W * .24, H); g.stroke();
      // mirror on its stalk
      const mx = W / 2 + side * W * .3, my = H * .52, mw = W * .085, mh = H * .055;
      g.strokeStyle = '#111317'; g.lineWidth = Math.max(3, W * .005); g.beginPath(); g.moveTo(mx, my + mh * .5); g.lineTo(mx - side * W * .03, H * .66); g.stroke();
      g.fillStyle = shade(c1, -.3); g.beginPath(); g.roundRect(mx - mw / 2 - 4, my - mh / 2 - 4, mw + 8, mh + 8, 8); g.fill();
      g.save(); g.beginPath(); g.roundRect(mx - mw / 2, my - mh / 2, mw, mh, 6); g.clip();
      const mg = g.createLinearGradient(0, my - mh / 2, 0, my + mh / 2); mg.addColorStop(0, this.light.night > .5 ? '#101826' : '#7ea3c8'); mg.addColorStop(.55, '#20252d'); mg.addColorStop(1, '#2b2f36');
      g.fillStyle = mg; g.fillRect(mx - mw / 2, my - mh / 2, mw, mh);
      const behind = this.behind(race, car, side);
      if (behind) {   // a car in the mirror, bigger when it is closer
        const s = Math.max(.25, Math.min(1, 10 / behind.d)), bx = mx + side * mw * .1 - behind.lat * mw * .08, bw = mw * .5 * s, by = my + mh * .2;
        g.fillStyle = behind.color; g.beginPath(); g.moveTo(bx - bw * .1, by - bw * .35); g.lineTo(bx + bw * .1, by - bw * .35); g.lineTo(bx + bw * .25, by); g.lineTo(bx - bw * .25, by); g.fill();
        g.fillStyle = '#0b0c0f'; g.fillRect(bx - bw * .5, by - bw * .25, bw * .18, bw * .25); g.fillRect(bx + bw * .32, by - bw * .25, bw * .18, bw * .25);
        g.fillStyle = behind.color; g.fillRect(bx - bw * .45, by - bw * .05, bw * .9, bw * .07);
      }
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(mx - mw / 2, my - mh / 2, mw, mh * .18);
      g.restore();
    }
    // halo: centre pillar and the hoop overhead
    const hg = g.createLinearGradient(W / 2 - W * .012, 0, W / 2 + W * .012, 0); hg.addColorStop(0, '#07080a'); hg.addColorStop(.4, '#2a2e36'); hg.addColorStop(1, '#07080a');
    g.fillStyle = hg; g.beginPath(); g.moveTo(W / 2 - W * .016, H * .8); g.lineTo(W / 2 - W * .007, H * .12); g.lineTo(W / 2 + W * .007, H * .12); g.lineTo(W / 2 + W * .016, H * .8); g.fill();
    g.strokeStyle = '#0a0b0e'; g.lineCap = 'butt'; g.lineWidth = Math.max(10, H * .055);
    g.beginPath(); g.ellipse(W / 2, H * .2, W * .46, H * .22, 0, Math.PI * 1.04, Math.PI * 1.96); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 2; g.beginPath(); g.ellipse(W / 2, H * .2 - H * .02, W * .46, H * .22, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
    // steering wheel, rotating with the corner
    const ww = Math.min(W * .3, 470), wh = ww * .46, cx = W / 2, cy = H - wh * .62;
    g.save(); g.translate(cx, cy); g.rotate(this.wheel * .45);
    g.fillStyle = '#0d0f12'; g.beginPath();
    g.moveTo(-ww * .36, -wh * .5); g.lineTo(ww * .36, -wh * .5); g.quadraticCurveTo(ww * .5, -wh * .5, ww * .5, -wh * .2); g.lineTo(ww * .5, wh * .5); g.lineTo(-ww * .5, wh * .5); g.lineTo(-ww * .5, -wh * .2); g.quadraticCurveTo(-ww * .5, -wh * .5, -ww * .36, -wh * .5); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2; g.stroke();
    // grips and gloves
    for (const side of [-1, 1]) {
      const gx = side * ww * .44;
      g.fillStyle = '#1b1e24'; g.beginPath(); g.roundRect(gx - ww * .07, -wh * .45, ww * .14, wh * .95, ww * .06); g.fill();
      const glove = shade(c2 === '#1b1f27' ? '#3a3f4a' : c2, -.25);
      g.fillStyle = glove; g.beginPath(); g.ellipse(gx + side * ww * .01, -wh * .02, ww * .09, wh * .3, side * .15, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2;
      for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(gx - side * ww * .06, -wh * .2 + k * wh * .13); g.lineTo(gx + side * ww * .05, -wh * .18 + k * wh * .13); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.15)'; g.beginPath(); g.ellipse(gx - side * ww * .02, -wh * .18, ww * .03, wh * .08, 0, 0, TAU); g.fill();
    }
    // display
    const dw = ww * .44, dh = wh * .5, gear = car.inPit ? 0 : Math.max(1, Math.min(8, GEARS.findIndex(s => car.v < s)));
    const lo = GEARS[Math.max(0, gear - 1)], hi = GEARS[gear] === 999 ? 92 : GEARS[gear] || 20, rpm = Math.max(0, Math.min(1, (car.v - lo) / Math.max(1, hi - lo)));
    g.fillStyle = '#03050a'; g.beginPath(); g.roundRect(-dw / 2, -wh * .38, dw, dh, 6); g.fill();
    g.strokeStyle = '#1f2530'; g.lineWidth = 2; g.stroke();
    for (let k = 0; k < 15; k++) { const on = rpm > k / 15; g.fillStyle = on ? (k < 5 ? '#2fd780' : k < 10 ? '#ff2b2b' : '#7a5cff') : '#16191e'; g.beginPath(); g.arc(-dw / 2 + dw * (k + .5) / 15, -wh * .45, wh * .026, 0, TAU); g.fill(); }
    const pos = race.order.indexOf(car) + 1, f1 = Math.round(dh * .18);
    g.textBaseline = 'middle'; g.fillStyle = '#eef2f8';
    g.font = `800 ${Math.round(dh * .52)}px "Saira Condensed", "Arial Narrow", sans-serif`; g.textAlign = 'center'; g.fillText(car.inPit ? 'N' : String(gear), 0, -wh * .14);
    g.font = `600 ${f1}px "JetBrains Mono", monospace`;
    g.textAlign = 'left'; g.fillText(String(Math.round(car.v * 3.6)), -dw / 2 + 8, -wh * .3);
    g.fillStyle = '#8a94a8'; g.fillText('KM/H', -dw / 2 + 8, -wh * .3 + f1 * 1.1);
    g.textAlign = 'right'; g.fillStyle = '#eef2f8'; g.fillText('P' + pos, dw / 2 - 8, -wh * .3);
    g.fillStyle = '#8a94a8'; g.fillText('L' + Math.min(race.laps, Math.max(1, Math.floor(car.dist / C.L) + 1)), dw / 2 - 8, -wh * .3 + f1 * 1.1);
    // throttle and brake bars
    const thr = this.acc > -2 ? Math.min(1, .35 + Math.max(0, this.acc) / 8) : 0, brk = this.acc < -6 ? Math.min(1, -this.acc / 45) : 0;
    g.fillStyle = '#16191e'; g.fillRect(-dw / 2 + 8, wh * .02, dw * .38, f1 * .5); g.fillRect(dw / 2 - 8 - dw * .38, wh * .02, dw * .38, f1 * .5);
    g.fillStyle = '#2fd780'; g.fillRect(-dw / 2 + 8, wh * .02, dw * .38 * thr, f1 * .5);
    g.fillStyle = '#ff2b2b'; g.fillRect(dw / 2 - 8 - dw * .38 * brk, wh * .02, dw * .38 * brk, f1 * .5);
    g.font = `700 ${Math.round(f1 * .8)}px "JetBrains Mono", monospace`; g.textAlign = 'center';
    g.fillStyle = car.drs ? '#2fd780' : '#2a2f37'; g.fillText('DRS', -dw * .17, wh * .1 + f1 * .4);
    g.fillStyle = tyreC; g.fillText(car.tyre, dw * .17, wh * .1 + f1 * .4);
    // rotaries and buttons
    [[-.3, .3], [-.12, .32], [.12, .32], [.3, .3]].forEach(([a, b]) => { g.fillStyle = '#20242b'; g.beginPath(); g.arc(ww * a, wh * b, wh * .07, 0, TAU); g.fill(); g.strokeStyle = '#ffd43b'; g.lineWidth = 2; g.beginPath(); g.moveTo(ww * a, wh * b); g.lineTo(ww * a, wh * (b - .06)); g.stroke(); });
    [[-.3, -.08, '#ff2b2b'], [.3, -.08, '#ffd43b'], [-.3, .12, '#2fd780'], [.3, .12, '#4c7dff']].forEach(([a, b, c]) => { g.fillStyle = c; g.beginPath(); g.arc(ww * a, wh * b, wh * .045, 0, TAU); g.fill(); });
    g.restore();
    g.restore();
    // helmet visor edge and vignette
    const vg = g.createRadialGradient(W / 2, H * .5, Math.min(W, H) * .45, W / 2, H * .5, Math.max(W, H) * .78);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    // driver tag
    g.font = `700 ${Math.max(13, Math.round(H * .022))}px "Saira Condensed", "Arial Narrow", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(238,242,248,.85)';
    g.fillText(`ONBOARD · #${car.num} ${String(car.name || '').toUpperCase()}`, W / 2, H * .055);
  }
  /* The nearest car behind on this side, for the mirrors. */
  behind(race, car, side) {
    let best = null;
    for (const o of race.cars) {
      if (o === car || o.out || o.inPit) continue;
      const d = PW.mod(car.dist - o.dist, race.C.L);
      if (d > 2 && d < 60 && (side < 0 ? o.lat <= car.lat + .3 : o.lat >= car.lat - .3) && (!best || d < best.d)) best = { d, lat: o.lat - car.lat, color: o.color };
    }
    return best;
  }
};
})();
