/* Race simulation. Distances in metres, time in simulated seconds.
   Emits events through race.on(type, data) for the HUD, ticker and cameras. */
window.PW = window.PW || {};
(() => {
const mod = PW.mod, rnd = (a, b) => a + Math.random() * (b - a);
const CP = 40; // timing checkpoints per lap

PW.Race = class Race {
  constructor(C, opt) {
    this.C = C; this.opt = opt; this.listeners = [];
    this.laps = opt.laps; this.state = 'grid'; this.t = 0;
    this.leaderCp = []; this.sc = null; this.yellow = null; this.redUsed = false; this.red = null;
    this.fl = { t: Infinity, car: null }; this.finishOrder = []; this.finishAt = 0; this.debris = [];
    this.pending = null;
    // weather
    let kind = opt.weather === 'auto' ? (Math.random() < .65 ? 'dry' : Math.random() < .55 ? 'shower' : 'wet') : opt.weather;
    this.weather = { kind, rain: kind === 'wet' ? .8 : 0, target: kind === 'wet' ? .8 : 0,
      startLap: kind === 'shower' ? Math.floor(rnd(.25, .55) * this.laps) + 1 : Infinity,
      endLap: kind === 'wet' ? (Math.random() < .5 ? Math.floor(rnd(.55, .8) * this.laps) : Infinity)
            : kind === 'shower' && Math.random() < .5 ? Math.floor(rnd(.7, .9) * this.laps) : Infinity };
    this.scAt = Math.random() < .3 ? (Math.floor(rnd(3, Math.max(4, this.laps - 3))) + Math.random()) * C.L : Infinity;
    const teams = opt.teams;
    // team order: random each race, or the career's fixed pecking order (best team first)
    const order = opt.teamOrder || teams.map((t, i) => i).sort(() => Math.random() - .5), teamPace = [];
    order.forEach((t, r) => teamPace[t] = 1 - r * .003 - Math.random() * (opt.teamOrder ? .001 : .0025));
    const entrants = Array.isArray(opt.entrants) && opt.entrants.length >= 2 ? opt.entrants : opt.drivers.map((d, i) => i);
    this.cars = entrants.map(i => {
      const d = opt.drivers[i];
      const code = d.code, team = Math.floor(i / 2), start = this.weather.rain > .4 ? 'I' : (Math.random() < .5 ? 'S' : 'M');
      const pace = teamPace[team] + rnd(-.0015, .0015) + (opt.bonus && opt.bonus[i] || 0);
      return { i, code, name: d.name, flag: d.flag, num: d.num, team, color: teams[team].color, color2: teams[team].color2, pace, quali: pace + rnd(-.004, .004),
        dist: 0, v: 0, lat: 0, latT: 0, gridLat: 0, yaw: 0, tyre: start, tyreLaps: 0,
        pitLap: Math.max(2, Math.round(this.laps * (start === 'S' ? rnd(.33, .48) : rnd(.48, .64)))), planDone: false,
        pitNext: false, inPit: false, stopped: false, stopT: 0, stopDur: 0,
        noise: 0, cp: -1, cpT: 0, lapStart: 0, best: Infinity, finished: false, out: false,
        passT: null, passCd: 0, react: rnd(.15, .45), lastPos: 0, spin: null, crash: null, puncture: false };
    });
    const quali = [...this.cars].sort((a, b) => b.quali - a.quali);
    this.grid(opt.format === 'reverse' ? quali.reverse() : quali, 0);
    this.order = [...this.cars].sort((a, b) => a.lastPos - b.lastPos);
  }
  on(fn) { this.listeners.push(fn); }
  emit(type, d) { for (const f of this.listeners) f(type, d || {}); }
  leaderLap() { const l = this.running()[0]; return l ? Math.max(1, Math.min(this.laps, Math.floor(l.dist / this.C.L) + 1)) : 1; }
  running() { return this.order.filter(c => !c.out); }

  grid(list, base) {
    list.forEach((c, g) => {
      c.dist = base - 10 - g * 8; c.v = 0; c.gridLat = c.lat = c.latT = (g % 2 ? 1.1 : -1.1); c.lastPos = g;
      c.react = rnd(.15, .45); c.passT = null; c.spin = null; c.yaw = 0;
    });
    this.gridBase = base;
  }
  start() { this.state = 'racing'; this.startT = this.t; }

  /* Red flag: called after the screen fades. Cars line up behind the line in race order. */
  regrid() {
    const L = this.C.L, run = this.running(), lead = run[0];
    const base = (Math.floor(lead.dist / L) + 1) * L;
    for (const c of this.cars) if (c.out) c.cleared = true;
    this.grid(run, base);
    const remain = this.laps - Math.floor(base / L);
    for (const c of run) {
      c.tyre = this.weather.rain > .4 ? 'I' : remain > this.laps * .5 ? 'H' : 'M'; c.tyreLaps = 0; c.planDone = true; c.pitNext = false;
      c.inPit = false; c.stopped = false; c.puncture = false; c.radioPit = false; c.lapStart = null; c.cp = Math.floor(c.dist / (L / CP)); c.cpT = this.t;
    }
    this.leaderCp.length = Math.max(0, Math.floor(base / (L / CP)) - 30);
    this.debris = []; this.sc = null; this.scCar = null; this.yellow = null; this.red = null;
    this.state = 'grid';
    this.emit('regrid', { lap: Math.floor(base / L) + 1 });
  }

  step(dt) {
    this.t += dt;
    const C = this.C, L = C.L, cpLen = L / CP, cars = this.cars, W = this.weather;
    const run = this.running(), leader = run[0];
    const lapNow = leader ? Math.floor(leader.dist / L) + 1 : 1;
    // weather
    if (this.state === 'racing') {
      if (lapNow >= W.startLap && W.target === 0 && lapNow < W.endLap) { W.target = rnd(.6, .9); this.emit('rain', {}); }
      if (lapNow >= W.endLap && W.target > 0) { W.target = 0; this.emit('drying', {}); }
    }
    W.rain += Math.sign(W.target - W.rain) * Math.min(Math.abs(W.target - W.rain), .006 * dt);
    // planned safety car
    if (!this.sc && this.state === 'racing' && leader && leader.dist >= this.scAt) { this.scAt = Infinity; this.deploySC('debris'); }
    if (this.yellow && this.t > this.yellow.until) this.yellow = null;
    if (this.red && this.red.phase === 'stopping' && (this.t - this.red.t > 6 || run.every(c => c.v < 1 || c.inPit))) { this.red.phase = 'stopped'; this.emit('red-stopped', {}); }

    const onRoad = cars.filter(c => !c.out).sort((a, b) => mod(a.dist, L) - mod(b.dist, L));
    for (const c of cars) {
      if (c.out) continue;
      const s = mod(c.dist, L), i = Math.min(PW.N - 1, Math.floor(s / C.ds)), lapIdx = Math.floor(c.dist / L);
      const ty = PW.TYRES[c.tyre];
      c.noise += (Math.random() - .5) * .004 * dt - c.noise * .4 * dt; c.noise = Math.max(-.004, Math.min(.004, c.noise));
      const wet = c.tyre === 'I' ? .905 + .02 * W.rain : 1 - .22 * W.rain;
      let target = C.V[i] * c.pace * (ty.base - ty.deg * c.tyreLaps) * wet * (1 + c.noise) * (c.puncture ? .72 : 1);
      if (c.finished) target = Math.min(target, C.V[i] * .55);
      if (this.sc) {
        target = Math.min(target, C.V[i] * .85);
        const sc = this.scCar;
        if (c === leader && sc && sc.onTrack) { const gapSC = sc.dist - c.dist; if (gapSC > 0 && gapSC < 70) target = Math.min(target, sc.v * (gapSC < 40 ? .9 : 1)); }
        else if (c === leader) target = Math.min(target, 45);
      }
      if (this.yellow && Math.abs(mod(this.yellow.s - c.dist + L / 2, L) - L / 2) < 200) target *= .9;
      if (this.state === 'red') target = 0;
      if (this.state === 'racing' && this.t - this.startT < c.react) target = 0;

      // incidents
      if (this.state === 'racing' && this.opt.incidents && !this.sc && !c.inPit && !c.spin && !c.crash && !c.finished && c.v > 28 && Math.abs(C.K[i]) > 1 / 160 && this.t - this.startT > 20) {
        const slick = c.tyre !== 'I';
        const rate = .0004 * (1 + 2 * W.rain) * (slick ? 1 + 5 * W.rain : 1) * (c.puncture ? 3 : 1);
        if (Math.random() < rate * dt) Math.random() < .3 ? this.startCrash(c, i) : this.startSpin(c, i);
      }
      if (c.spin) {
        const sp = c.spin; sp.t += dt; const p = Math.min(1, sp.t / sp.dur);
        c.yaw = sp.dir * (1 - Math.pow(1 - Math.min(1, p / .7), 3)) * Math.PI * 2;
        c.latT = sp.side * Math.sin(Math.PI * p) * 2.6;
        target = p < .55 ? 0 : Math.min(target, 30);
        if (p >= 1) { c.spin = null; c.yaw = 0; c.passCd = 2; }
      }
      if (c.crash) {
        const cr = c.crash; cr.t += dt;
        c.v = Math.max(0, c.v - 38 * dt); target = 0;
        c.latT = cr.side * 3.9; c.yaw += (cr.yaw - c.yaw) * Math.min(1, dt * 2);
        if (c.v < .5) { c.out = true; c.v = 0; c.outSide = c.crash.side; c.crash = null; c.outAt = this.t; c.recov = { t: 0, lifted: false }; this.emit('out', { car: c }); this.afterCrash(c); }
      }
      // pit decisions
      if (this.state === 'racing' && !c.inPit && !c.finished && !c.crash) {
        const remain = this.laps - lapIdx - 1;
        let why = null;
        if (!c.planDone && lapIdx === c.pitLap - 1 && s > L * .85 && remain > 1) why = 'plan';
        if (W.rain > .45 && c.tyre !== 'I' && remain > 1) why = 'inters';
        if (W.rain < .12 && c.tyre === 'I' && remain > 2) why = 'slicks';
        if (c.puncture) why = 'puncture';
        if (why || c.pitNext) {
          if (!c.radioPit) { c.radioPit = true; this.emit('radio', { car: c, kind: why || 'sc' }); }
          c.pitNext = true;
        }
        if (c.pitNext && s > L * .915 && s < L * .99) { c.inPit = true; c.pitLapIdx = lapIdx + 1; c.boxS = L * (.006 + c.team * .0035); }
      }
      if (c.inPit) {
        target = Math.min(target, 22);
        if (!c.stopped && lapIdx >= c.pitLapIdx && s > c.boxS && s < L * .5) {
          if (c.stopT === 0) {
            const slow = Math.random() < .05;
            c.stopDur = slow ? rnd(5.5, 9) : rnd(2.1, 2.9);
            const remain = this.laps - lapIdx;
            const nt = W.rain > .4 ? 'I' : c.puncture ? (remain > this.laps * .5 ? 'H' : 'M') : remain > this.laps * .5 ? 'H' : remain > 4 ? 'M' : 'S';
            c.newTyre = nt; c.slowStop = slow;
            this.emit('pit', { car: c, dur: c.stopDur, tyre: nt, slow });
          }
          c.stopT += dt; target = 0; c.v = 0;
          if (c.stopT >= c.stopDur) { c.stopped = true; c.tyre = c.newTyre; c.tyreLaps = 0; c.puncture = false; }
        }
        if (c.stopped && s > L * .065 && s < L * .5) { c.inPit = false; c.stopped = false; c.stopT = 0; c.pitNext = false; c.planDone = true; c.pitOut = this.t; c.radioPit = false; }
      }
      // traffic
      let ahead = null, gap = Infinity;
      const j = onRoad.indexOf(c);
      for (let k = 1; k < onRoad.length; k++) {
        const o = onRoad[(j + k) % onRoad.length];
        if (o.inPit !== c.inPit) continue;
        gap = mod(o.dist - c.dist, L); ahead = o; break;
      }
      if (c.passT && (c.passT.dist < c.dist - 7 || mod(c.passT.dist - c.dist, L) > 20 || c.passT.out)) { c.passT = null; c.passCd = 2.5; }
      c.passCd -= dt;
      c.drs = !!(ahead && this.state === 'racing' && !this.sc && !this.yellow && !c.inPit && lapIdx >= 2 && W.rain < .3 &&
        this.inDRS(s) && gap / Math.max(c.v, 1) < 1 && !ahead.inPit);
      if (c.drs) target *= 1.035;
      if (ahead && !c.inPit && !c.spin && !c.crash && this.state !== 'grid') {
        const blue = ahead.finished || ahead.dist < c.dist - L * .5 || ahead.spin || ahead.crash || ahead.puncture;
        if (this.sc && !blue) { if (gap < 24) target = Math.min(target, ahead.v * (gap < 14 ? .9 : 1)); }
        else if (gap < 11 && ahead !== c.passT) {
          const straight = Math.abs(C.K[i]) < 1 / 350;
          if (target > ahead.v * 1.002 && (straight || blue) && c.passCd <= 0) {
            c.passT = ahead; c.latT = ahead.lat > 0 ? -1.15 : 1.15;
            if (this.opt.incidents && !blue && Math.random() < .012 && this.state === 'racing') {
              const victim = Math.random() < .5 ? c : ahead; victim.puncture = true;
              this.emit('contact', { a: c, b: ahead, victim });
            }
          } else target = Math.min(target, ahead.v * (gap < 6 ? .96 : 1));
        }
      }
      if (!c.passT && !c.inPit && !c.spin && !c.crash) c.latT = c.dist - this.gridBase < 220 ? c.gridLat * Math.max(0, Math.min(1, 1 - (c.dist - this.gridBase) / 220)) : 0;
      if (c.inPit) c.latT = C.inside * 2.95;

      if (!c.crash) {
        if (target > c.v) c.v = Math.min(target, c.v + Math.max(4, 14 - c.v * .08) * dt * (1 - .3 * W.rain));
        else c.v = Math.max(target, c.v - (this.state === 'red' ? 14 : 55) * dt);
      }
      const prev = c.dist; c.dist += c.v * dt;
      c.lat += (c.latT - c.lat) * Math.min(1, dt * (c.inPit ? 1.2 : c.crash ? 1.6 : 2.5));
      for (let cp = Math.floor(prev / cpLen) + 1; cp <= Math.floor(c.dist / cpLen); cp++) {
        if (cp < 0) continue;
        const tc = this.t - dt + dt * (cp * cpLen - prev) / Math.max(1e-6, c.dist - prev);
        if (this.leaderCp[cp] === undefined) this.leaderCp[cp] = tc;
        c.cp = cp; c.cpT = tc;
        if (cp > 0 && cp % CP === 0) this.lapDone(c, cp / CP);
      }
    }
    // recovery crane: arrives, lifts the car over the wall, drives away; then the track is clear
    for (const c of cars) {
      if (!c.recov || c.cleared) continue;
      const r = c.recov; r.t += dt;
      if (!r.lifted && r.t > 7) { r.lifted = true; this.emit('recovery', { car: c }); }
      if (this.yellow) this.yellow.until = Math.max(this.yellow.until, this.t + 2);
      if (r.t > 24) { c.cleared = true; this.debris = this.debris.filter(d => Math.abs(d.s - c.dist) > 80); this.emit('cleared', { car: c }); }
    }
    const recovering = cars.some(c => c.recov && !c.cleared);
    // physical safety car: leaves the pit exit, leads the pack, peels into the pit lane when it comes in
    const sc = this.scCar;
    if (sc) {
      const lead = this.running()[0], s = mod(sc.dist, L), i = Math.min(PW.N - 1, Math.floor(s / C.ds));
      const gapLead = lead ? sc.dist - lead.dist : 200;
      let target = Math.min(C.V[i] * .6, 42);
      if (sc.phase === 'exit') { target = Math.min(target, 22); if (s > L * .09 && s < L * .5) { sc.phase = 'track'; } }
      if (sc.phase === 'track' && gapLead > 140) target = Math.min(target, 14);            // wait for the leader
      if (sc.phase === 'track' && this.sc && this.sc.state === 'in' && s > L * .915 && s < L * .99) sc.phase = 'pit';
      if (sc.phase === 'pit') { target = 22; if (s < L * .5 && s > L * .065) { this.scCar = null; } }
      if (this.scCar) {
        sc.v += Math.sign(target - sc.v) * Math.min(Math.abs(target - sc.v), 12 * dt); sc.dist += sc.v * dt;
        sc.latT = sc.phase === 'track' ? 0 : C.inside * 2.95; sc.lat += (sc.latT - sc.lat) * Math.min(1, dt * 1.2);
        sc.onTrack = sc.phase === 'track';
      }
    }
    // safety car phases
    if (this.sc && leader) {
      const ll = Math.floor(leader.dist / L);
      if (this.sc.state === 'out' && ll >= this.sc.endLap && !recovering) { this.sc.state = 'in'; this.emit('sc-in', {}); }
      else if (this.sc.state === 'out' && ll >= this.sc.endLap && recovering) this.sc.endLap = ll + 1;
      else if (this.sc.state === 'in' && ll >= this.sc.endLap + 1 && !this.scCar) { this.sc = null; this.debris = []; this.emit('green', {}); }
    }
    // order and overtakes
    const prevOrder = this.order;
    this.order = [...cars].sort((a, b) => {
      if (a.out !== b.out) return a.out ? 1 : -1;
      if (a.out) return b.outAt - a.outAt;
      if (a.finished && b.finished) return a.fpos - b.fpos;
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      return b.dist - a.dist;
    });
    if (this.state === 'racing' && !this.sc && this.t - this.startT > 8) {
      this.order.forEach((c, p) => {
        const old = prevOrder.indexOf(c);
        if (p < old && p < 10 && !c.inPit && !c.out && !(this.t - (c.pitOut ?? -99) < 40)) {
          const passed = prevOrder[p];
          if (passed && passed !== c && !passed.inPit && !passed.out && !passed.spin && !passed.finished && !(this.t - (passed.pitOut ?? -99) < 40) && Math.abs(passed.dist - c.dist) < 30 && (!this.pending || p < this.pending.p))
            this.pending = { p, a: c, b: passed };
        }
      });
    }
    if (this.state === 'finished' && (this.running().every(c => c.finished) || this.t - this.finishAt > 150)) { this.state = 'done'; this.emit('done', {}); }
  }

  inDRS(s) {
    const L = this.C.L;
    return this.C.drs.some(([a, b]) => PW.mod(s - a, L) <= PW.mod(b - a, L));
  }
  startSpin(c, i) {
    c.spin = { t: 0, dur: rnd(4, 6), dir: Math.random() < .5 ? -1 : 1, side: -Math.sign(this.C.K[i]) || 1 };
    this.yellow = { s: c.dist, until: this.t + 12, corner: this.cornerAt(i) };
    this.emit('spin', { car: c, corner: this.cornerAt(i) });
  }
  startCrash(c, i) {
    c.crash = { t: 0, side: -Math.sign(this.C.K[i]) || 1, yaw: rnd(-.9, .9) };
    this.yellow = { s: c.dist, until: this.t + 30, corner: this.cornerAt(i) };
    const s = c.dist;
    for (let k = 0; k < 16; k++) this.debris.push({ s: s + rnd(-10, 40), lat: rnd(-1.5, 3.5) * c.crash.side, r: rnd(.8, 2.2), a: rnd(0, 6.28), c: Math.random() < .6 ? c.color : '#c9ced8' });
    this.emit('crash', { car: c, corner: this.cornerAt(i) });
  }
  afterCrash(c) {
    if (this.state !== 'racing') return;
    const lapsLeft = this.laps - this.leaderLap();
    const r = Math.random();
    if (!this.redUsed && lapsLeft > 3 && r < .18) {
      this.redUsed = true; this.state = 'red'; this.red = { t: this.t, phase: 'stopping' }; this.sc = null; this.scCar = null;
      this.emit('red', { car: c });
    } else if (!this.sc && r < .8) this.deploySC('crash', c);
  }
  deploySC(reason, car) {
    const leader = this.running()[0]; if (!leader) return;
    this.sc = { state: 'out', endLap: Math.floor(leader.dist / this.C.L) + 2, reason };
    const L = this.C.L, base = Math.floor(leader.dist / L) * L + L * .02;
    const exitDist = base + (base - leader.dist > 30 ? 0 : L);
    this.scCar = { dist: exitDist, v: 12, lat: this.C.inside * 2.95, latT: this.C.inside * 2.95, phase: 'exit', onTrack: false };
    for (const c of this.running()) if (!c.planDone && c.dist / this.C.L > this.laps * .3 && Math.random() < .55) c.pitNext = true;
    this.emit('sc', { reason, car });
  }
  cornerAt(i) {
    const cs = this.C.corners; if (!cs.length) return null;
    let best = 0, bd = Infinity;
    cs.forEach((ci, n) => { const d = Math.min(Math.abs(ci - i), PW.N - Math.abs(ci - i)); if (d < bd) { bd = d; best = n; } });
    return best + 1;
  }
  lapDone(c, lapN) {
    const valid = c.lapStart !== null;
    const lt = c.cpT - c.lapStart; c.lapStart = c.cpT;
    c.tyreLaps++;
    if (valid && lapN >= 2 && lt < c.best) c.best = lt;
    if (valid && lapN >= 2 && lt < this.fl.t && !c.finished && this.state === 'racing') {
      const had = this.fl.car; this.fl = { t: lt, car: c };
      if (had && lapN > 2) this.emit('fastest', { car: c, t: lt });
    }
    if (!c.finished && (this.state === 'finished' || lapN >= this.laps)) {
      if (this.state === 'racing') { this.state = 'finished'; this.finishAt = this.t; this.emit('chequered', { car: c }); }
      if (this.state === 'finished') { c.finished = true; c.fpos = this.finishOrder.length; c.ftime = c.cpT; this.finishOrder.push(c); }
    }
  }
  gapText(c, p) {
    const lead = this.order[0], maxCp = lead ? lead.cp : 0;
    if (c.out) return 'OUT';
    if (this.state === 'grid' && this.t < 1) return 'GRID';
    if (p === 0) return c.finished ? 'WIN' : 'LEADER';
    if (c.finished && lead.finished) return '+' + (c.ftime - lead.ftime).toFixed(3);
    if (c.inPit) return 'PIT';
    if (c.spin || c.crash) return 'SPIN';
    if (maxCp - c.cp >= CP) return '+' + Math.floor((maxCp - c.cp) / CP) + ' LAP';
    if (c.cp >= 0 && this.leaderCp[c.cp] !== undefined) return '+' + (c.cpT - this.leaderCp[c.cp]).toFixed(3);
    return '—';
  }
};
PW.fmtLap = t => { const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + s.toFixed(3).padStart(6, '0'); };
})();
