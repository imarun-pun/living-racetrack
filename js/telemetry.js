/* Live telemetry: what the race engineer sees for one car.
   Speed, gear, revs, throttle and brake, DRS and battery; a speed trace for this lap against the driver's best lap
   and the car ahead; mini-sectors in purple, green and yellow; a battle forecast; and live win chances.
   It also works out who is fastest through each mini-sector, which the map shows as "track dominance". */
window.PW = window.PW || {};
(() => {
const MS = 24;                          // mini-sectors per lap
const TAU = Math.PI * 2;
const GEARS = [0, 20, 30, 40, 50, 60, 70, 80, 999];

PW.Telemetry = class Telemetry {
  constructor(canvas) { this.cv = canvas; this.g = canvas.getContext('2d'); this.reset(null); }
  reset(race) {
    this.race = race; this.cars = new Map(); this.best = new Array(MS).fill(Infinity); this.bestCar = new Array(MS).fill(null);
  }
  st(c) {
    let s = this.cars.get(c);
    if (!s) {
      s = { trace: new Float32Array(PW.N), bestTrace: null, lap: -1, lapT0: 0, bestLap: Infinity, prevV: c.v, acc: 0, ers: .7, msT: -1, ms: -1,
        msBest: new Array(MS).fill(Infinity), msNow: new Array(MS).fill(0), gapHist: [], pace: [] };
      this.cars.set(c, s);
    }
    return s;
  }
  /* Called every frame with the simulated time step. */
  update(race, dt) {
    if (race !== this.race) this.reset(race);
    if (!(dt > 0)) return;
    const C = race.C, L = C.L, N = PW.N;
    for (const c of race.cars) {
      if (c.out) continue;
      const s = this.st(c), pos = PW.mod(c.dist, L), i = Math.min(N - 1, Math.floor(pos / C.ds)), lap = Math.floor(c.dist / L);
      s.acc += ((c.v - s.prevV) / dt - s.acc) * Math.min(1, dt * 5); s.prevV = c.v;
      // battery: harvest under braking, deploy on straights
      if (s.acc < -8) s.ers = Math.min(1, s.ers + dt * .05); else if (Math.abs(C.K[i]) < 1 / 600 && c.v > 55) s.ers = Math.max(0, s.ers - dt * .03);
      if (lap !== s.lap) {
        if (s.lap >= 0 && race.t - s.lapT0 < s.bestLap && !c.inPit && lap === s.lap + 1) { s.bestLap = race.t - s.lapT0; s.bestTrace = s.trace.slice(); }
        if (lap === s.lap + 1) {   // gap to the car ahead, once a lap, for the battle forecast
          const p = race.order.indexOf(c), ahead = race.order[p - 1];
          if (ahead && !ahead.out) s.gapHist.push((ahead.dist - c.dist) / Math.max(20, c.v)); else s.gapHist.push(null);
          if (s.gapHist.length > 6) s.gapHist.shift();
        }
        s.lap = lap; s.lapT0 = race.t; s.trace.fill(0); s.msNow.fill(0);
      }
      s.trace[i] = c.v * 3.6;
      // mini-sectors
      const m = Math.floor(pos / L * MS);
      if (m !== s.ms) {
        if (s.ms >= 0 && s.msT >= 0 && (m === (s.ms + 1) % MS) && race.state === 'racing' && !c.inPit) {
          const t = race.t - s.msT, k = s.ms;
          s.msNow[k] = t < this.best[k] ? 3 : t < s.msBest[k] ? 2 : 1;          // purple, green, yellow
          if (t < s.msBest[k]) s.msBest[k] = t;
          if (t < this.best[k]) { this.best[k] = t; this.bestCar[k] = c; }
        }
        s.ms = m; s.msT = race.t;
      }
    }
  }
  /* Team colour of the fastest car through each mini-sector, for the map. */
  dominance() { return this.bestCar.map(c => c ? c.color : null); }

  /* Chance to win for the top runners: how far behind, how many laps left, how quick. */
  winChances(race) {
    const run = race.running().filter(c => !c.inPit || true), lead = run[0]; if (!lead) return [];
    if (race.finishOrder.length) return [{ c: race.finishOrder[0], p: 1 }];
    const left = Math.max(.3, race.laps - lead.dist / race.C.L), sigma = 1.6 * Math.sqrt(left), v = Math.max(30, race.C.L / race.C.T);
    const sc = run.slice(0, 10).map(c => ({ c, s: Math.exp(-((lead.dist - c.dist) / v) / sigma + (c.pace - lead.pace) * 300 * left / 10) }));
    const tot = sc.reduce((a, b) => a + b.s, 0);
    return sc.map(x => ({ c: x.c, p: x.s / tot })).sort((a, b) => b.p - a.p).slice(0, 4);
  }

  draw(race, car) {
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = this.cv.clientWidth, H = this.cv.clientHeight;
    if (!W || !H) return;
    if (this.cv.width !== Math.round(W * dpr) || this.cv.height !== Math.round(H * dpr)) { this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr); }
    const g = this.g; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    if (!car) return;
    const s = this.st(car), C = race.C, P = 14, mono = '"JetBrains Mono", monospace', disp = '"Saira Condensed", "Arial Narrow", sans-serif';
    const pos = race.order.indexOf(car) + 1, ty = PW.TYRES[car.tyre] || PW.TYRES.M;
    let y = P;
    const label = (txt, x, yy, col = '#8a94a8', al = 'left') => { g.font = `600 10px ${mono}`; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'alphabetic'; g.fillText(txt, x, yy); };
    // header
    g.fillStyle = car.color; g.fillRect(P, y, 4, 34);
    g.font = `800 26px ${disp}`; g.fillStyle = '#eef2f8'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(`P${pos}  ${car.code}`, P + 12, y + 24);
    label(`#${car.num} · ${String(car.name).toUpperCase()}`.slice(0, 34), P + 12, y + 36);
    g.strokeStyle = ty.c; g.lineWidth = 3; g.beginPath(); g.arc(W - P - 14, y + 15, 11, 0, TAU); g.stroke();
    g.font = `700 11px ${mono}`; g.fillStyle = ty.c; g.textAlign = 'center'; g.fillText(car.tyre, W - P - 14, y + 19);
    label(`${car.tyreLaps} LAP${car.tyreLaps === 1 ? "" : "S"}`, W - P - 30, y + 19, '#8a94a8', 'right');
    const wear = Math.max(0, Math.min(1, 1 - car.tyreLaps * ty.deg * 22)); label(`TYRE ${Math.round(wear * 100)}%`, W - P - 30, y + 33, wear < .35 ? '#ff5a5a' : '#8a94a8', 'right');
    y += 50;
    // speed, gear, revs
    const gear = car.inPit ? 0 : Math.max(1, Math.min(8, GEARS.findIndex(v => car.v < v))), lo = GEARS[Math.max(0, gear - 1)], hi = GEARS[gear] === 999 ? 92 : GEARS[gear] || 20;
    const rpm = Math.max(0, Math.min(1, (car.v - lo) / Math.max(1, hi - lo)));
    g.font = `800 46px ${disp}`; g.fillStyle = '#eef2f8'; g.textAlign = 'left'; g.fillText(String(Math.round(car.v * 3.6)), P, y + 40);
    label('KM/H', P + 2, y + 54);
    g.strokeStyle = 'rgba(196,210,235,.25)'; g.lineWidth = 1; g.strokeRect(P + 100, y + 4, 40, 44);
    g.font = `800 34px ${disp}`; g.textAlign = 'center'; g.fillStyle = '#eef2f8'; g.fillText(car.inPit ? 'N' : String(gear), P + 120, y + 39);
    label('GEAR', P + 120, y + 60, '#8a94a8', 'center');
    const rx = P + 152, rw = W - P - rx;
    for (let k = 0; k < 15; k++) { g.fillStyle = rpm > k / 15 ? (k < 5 ? '#2fd780' : k < 10 ? '#ff2b2b' : '#7a5cff') : '#1a1e26'; g.fillRect(rx + k * rw / 15, y + 6, rw / 15 - 2, 8); }
    const bar = (yy, name, val, col) => { label(name, rx, yy - 2); g.fillStyle = '#1a1e26'; g.fillRect(rx, yy, rw, 7); g.fillStyle = col; g.fillRect(rx, yy, rw * Math.max(0, Math.min(1, val)), 7); };
    const thr = s.acc > -2 ? Math.min(1, .3 + Math.max(0, s.acc) / 7) * (car.v > 1 ? 1 : 0) : 0, brk = s.acc < -6 ? Math.min(1, -s.acc / 45) : 0;
    bar(y + 30, 'THROTTLE', thr, '#2fd780'); bar(y + 48, 'BRAKE', brk, '#ff2b2b'); bar(y + 66, 'BATTERY', s.ers, '#ffd43b');
    g.font = `700 10px ${mono}`; g.textAlign = 'right'; g.fillStyle = car.drs ? '#2fd780' : '#3a3f47'; g.fillText('DRS', W - P, y + 28 - 2);
    y += 82;
    // speed trace
    const th = Math.max(80, Math.min(140, H * .2)), tw = W - P * 2;
    label('SPEED TRACE · THIS LAP vs BEST' + (race.order[pos - 2] ? ' vs ' + race.order[pos - 2].code : ''), P, y);
    y += 6;
    g.fillStyle = 'rgba(255,255,255,.03)'; g.fillRect(P, y, tw, th);
    g.strokeStyle = 'rgba(196,210,235,.08)'; g.lineWidth = 1;
    for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(P, y + th * k / 4); g.lineTo(P + tw, y + th * k / 4); g.stroke(); }
    const plot = (arr, col, dash, upto) => {
      if (!arr) return; g.strokeStyle = col; g.lineWidth = 1.5; g.setLineDash(dash || []); g.beginPath(); let started = false;
      const n = upto ?? PW.N;
      for (let i = 0; i < n; i += 4) { const v = arr[i]; if (!v) { started = false; continue; } const x = P + tw * i / PW.N, yy = y + th - th * Math.min(1, v / 340); started ? g.lineTo(x, yy) : g.moveTo(x, yy); started = true; }
      g.stroke(); g.setLineDash([]);
    };
    const here = Math.floor(PW.mod(car.dist, C.L) / C.ds);
    plot(s.bestTrace, 'rgba(196,210,235,.35)');
    const ah = race.order[pos - 2]; if (ah && this.cars.get(ah)) plot(this.cars.get(ah).trace, 'rgba(238,242,248,.6)', [3, 3]);
    plot(s.trace, car.color, null, here);
    g.fillStyle = '#eef2f8'; g.beginPath(); g.arc(P + tw * here / PW.N, y + th - th * Math.min(1, car.v * 3.6 / 340), 3, 0, TAU); g.fill();
    y += th + 18;
    // mini-sectors
    label('MINI-SECTORS', P, y); y += 5;
    const mw = tw / MS, curM = Math.floor(PW.mod(car.dist, C.L) / C.L * MS);
    for (let k = 0; k < MS; k++) {
      const v = s.msNow[k]; g.fillStyle = v === 3 ? '#a855f7' : v === 2 ? '#2fd780' : v === 1 ? '#ffd43b' : '#1a1e26';
      g.fillRect(P + k * mw, y, mw - 2, 10);
      if (k === curM) { g.strokeStyle = '#eef2f8'; g.lineWidth = 1; g.strokeRect(P + k * mw - .5, y - .5, mw - 1, 11); }
    }
    y += 28;
    // battle forecast
    const behind = race.order[pos], line = (o, gapS, hist, isAhead) => {
      if (!o || o.out) return;
      const valid = hist.filter(v => v !== null), rate = valid.length >= 2 ? (valid[valid.length - 1] - valid[0]) / (valid.length - 1) : 0;
      g.fillStyle = o.color; g.fillRect(P, y - 9, 3, 24);
      g.font = `700 13px ${disp}`; g.fillStyle = '#eef2f8'; g.textAlign = 'left'; g.fillText(`${isAhead ? 'AHEAD' : 'BEHIND'} ${o.code}  ${gapS.toFixed(2)}s`, P + 9, y + 2);
      let msg;
      if (isAhead) msg = Math.abs(rate) < .02 ? 'holding station' : rate < 0 ? `gaining ${(-rate).toFixed(2)}s a lap${gapS > 1 ? ` · DRS range in ${Math.max(1, Math.ceil((gapS - 1) / -rate))} lap${Math.ceil((gapS - 1) / -rate) > 1 ? 's' : ''}` : ' · in DRS range'}` : `losing ${rate.toFixed(2)}s a lap`;
      else msg = gapS < 1 ? 'in DRS range: under attack' : 'safe for now';
      label(msg.toUpperCase(), P + 9, y + 14, isAhead && rate < 0 ? '#2fd780' : !isAhead && gapS < 1 ? '#ff5a5a' : '#8a94a8');
      y += 32;
    };
    const ahead = race.order[pos - 2];
    label('BATTLE FORECAST', P, y); y += 16;
    if (ahead) line(ahead, (ahead.dist - car.dist) / Math.max(20, car.v), s.gapHist, true);
    if (behind && !behind.out) line(behind, (car.dist - behind.dist) / Math.max(20, behind.v), [], false);
    if (!ahead && !(behind && !behind.out)) { label('NO ONE CLOSE', P, y + 4); y += 20; }
    y += 6;
    // win chances
    if (y + 80 < H) {
      label('WIN CHANCE', P, y); y += 8;
      for (const { c, p } of this.winChances(race)) {
        g.fillStyle = c.color; g.fillRect(P, y, 3, 14);
        g.font = `700 12px ${mono}`; g.fillStyle = '#eef2f8'; g.textAlign = 'left'; g.fillText(c.code, P + 8, y + 11);
        g.fillStyle = '#1a1e26'; g.fillRect(P + 46, y + 3, tw - 96, 8); g.fillStyle = c === car ? '#ffd43b' : 'rgba(238,242,248,.55)'; g.fillRect(P + 46, y + 3, (tw - 96) * p, 8);
        g.textAlign = 'right'; g.fillText(Math.round(p * 100) + '%', P + tw, y + 11);
        y += 19;
      }
    }
  }
};
})();
