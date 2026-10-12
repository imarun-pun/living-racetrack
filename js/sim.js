/* Race simulation. Distances in metres, time in simulated seconds.
   Emits events through race.on(type, data) for the HUD, ticker and cameras. */
window.PW = window.PW || {};
(() => {
const mod = PW.mod;
/* Seeded random numbers (mulberry32): the same seed gives the same race on every device. */
PW.rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
PW.hashSeed = str => { let h = 2166136261 >>> 0; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
const q = (v, k) => Math.round(v * k) / k;
const CP = 40; // timing checkpoints per lap

PW.Race = class Race {
  constructor(C, opt) {
    this.C = C; this.opt = opt; this.listeners = [];
    // Synced races (World Race, Race Rooms) use a seed, fixed steps and their own start lights, so every screen agrees.
    this.rand = opt.seed != null ? PW.rng(opt.seed) : Math.random;
    this.auto = !!opt.auto; this.gridT = 0; this.hold = this.rnd(.6, 2.2);
    this.laps = opt.laps; this.state = 'grid'; this.t = 0;
    this.leaderCp = []; this.sc = null; this.yellow = null; this.redUsed = false; this.red = null;
    this.fl = { t: Infinity, car: null }; this.finishOrder = []; this.finishAt = 0; this.debris = [];
    this.pending = null;
    // weather
    let kind = opt.weather === 'auto' ? (this.rand() < .65 ? 'dry' : this.rand() < .55 ? 'shower' : 'wet') : opt.weather;
    this.weather = { kind, rain: kind === 'wet' ? .8 : 0, target: kind === 'wet' ? .8 : 0,
      startLap: kind === 'shower' ? Math.floor(this.rnd(.25, .55) * this.laps) + 1 : Infinity,
      endLap: kind === 'wet' ? (this.rand() < .5 ? Math.floor(this.rnd(.55, .8) * this.laps) : Infinity)
            : kind === 'shower' && this.rand() < .5 ? Math.floor(this.rnd(.7, .9) * this.laps) : Infinity };
    this.scAt = this.rand() < .3 ? (Math.floor(this.rnd(3, Math.max(4, this.laps - 3))) + this.rand()) * C.L : Infinity;
    const teams = opt.teams;
    // team order: random each race, or the career's fixed pecking order (best team first)
    const order = opt.teamOrder || this.shuffle(teams.map((t, i) => i)), teamPace = [];
    order.forEach((t, r) => teamPace[t] = 1 - r * .003 - this.rand() * (opt.teamOrder ? .001 : .0025));
    const entrants = Array.isArray(opt.entrants) && opt.entrants.length >= 2 ? opt.entrants : opt.drivers.map((d, i) => i);
    this.cars = entrants.map(i => {
      const d = opt.drivers[i];
      const code = d.code, team = Math.floor(i / 2), start = this.weather.rain > .4 ? 'I' : (this.rand() < .5 ? 'S' : 'M');
      const pace = teamPace[team] + this.rnd(-.0015, .0015) + (opt.bonus && opt.bonus[i] || 0);
      return { i, code, name: d.name, flag: d.flag, num: d.num, team, color: teams[team].color, color2: teams[team].color2, pace, quali: pace + this.rnd(-.004, .004),
        dist: 0, v: 0, lat: 0, latT: 0, gridLat: 0, yaw: 0, tyre: start, tyreLaps: 0, wear: 0, mode: 'normal', boostT: 0, boostLap: -1,
        trait: opt.traits && opt.traits[i] || null,   // story driver skills (0..1): wet, tyres, fitness, racecraft; pit = mechanic level
        pitLap: Math.max(2, Math.round(this.laps * (start === 'S' ? this.rnd(.33, .48) : this.rnd(.48, .64)))), planDone: false,
        pitNext: false, inPit: false, stopped: false, stopT: 0, stopDur: 0,
        noise: 0, cp: -1, cpT: 0, lapStart: 0, best: Infinity, finished: false, out: false,
        passT: null, passCd: 0, react: this.rnd(.15, .45), lineK: this.rnd(.78, 1), lastPos: 0, spin: null, crash: null, puncture: false };
    });
    const quali = [...this.cars].sort((a, b) => b.quali - a.quali);
    this.grid(opt.format === 'reverse' ? quali.reverse() : quali, 0);
    this.order = [...this.cars].sort((a, b) => a.lastPos - b.lastPos);
  }
  rnd(a, b) { return a + this.rand() * (b - a); }
  /* A call from the pit wall for one car: 'push' | 'normal' | 'save' | 'box' | 'boost'. Not in synced races. */
  command(c, cmd) {
    if (this.auto || !c || c.out || c.finished || c.crash) return null;
    if (cmd === 'push' || cmd === 'save' || cmd === 'normal') { if (c.mode === cmd) return null; c.mode = cmd; this.emit('command', { car: c, cmd }); return cmd; }
    if (this.state !== 'racing') return null;
    const lap = Math.floor(c.dist / this.C.L);
    if (cmd === 'box') { if (c.inPit || c.pitNext || this.laps - lap <= 1) return null; c.pitNext = true; c.radioPit = true; this.emit('command', { car: c, cmd }); return cmd; }
    if (cmd === 'boost') { if (c.boostLap === lap || c.inPit || this.sc) return null; c.boostLap = lap; c.boostT = 14; this.emit('command', { car: c, cmd }); return cmd; }
    return null;
  }
  shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(this.rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  on(fn) { this.listeners.push(fn); }
  emit(type, d) { for (const f of this.listeners) f(type, d || {}); }
  leaderLap() { const l = this.running()[0]; return l ? Math.max(1, Math.min(this.laps, Math.floor(l.dist / this.C.L) + 1)) : 1; }
  running() { return this.order.filter(c => !c.out); }

  grid(list, base) {
    list.forEach((c, g) => {
      c.dist = base - 10 - g * 8; c.v = 0; c.gridLat = c.lat = c.latT = (g % 2 ? 1.1 : -1.1); c.lastPos = g; if (c.gridPos === undefined) c.gridPos = g;
      c.react = this.rnd(.15, .45); c.passT = null; c.spin = null; c.yaw = 0;
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
      c.tyre = this.weather.rain > .4 ? 'I' : remain > this.laps * .5 ? 'H' : 'M'; c.tyreLaps = 0; c.wear = 0; c.planDone = true; c.pitNext = false;
      c.inPit = false; c.stopped = false; c.puncture = false; c.radioPit = false; c.lapStart = null; c.cp = Math.floor(c.dist / (L / CP)); c.cpT = this.t;
    }
    this.leaderCp.length = Math.max(0, Math.floor(base / (L / CP)) - 30);
    this.debris = []; this.sc = null; this.scCar = null; this.yellow = null; this.red = null;
    this.state = 'grid';
    this.emit('regrid', { lap: Math.floor(base / L) + 1 });
  }

  /* Start lights in a synced race: how many are lit, from the race's own clock (in real seconds). */
  lightsOn() { const s = this.gridT; return s < 1 ? 0 : Math.min(5, Math.floor((s - 1) / .9) + 1); }
  step(dt) {
    this.t += dt;
    if (this.auto) {
      if (this.state === 'grid') {
        this.gridT += dt / (this.opt.timeScale || 1);
        if (this.gridT > 1 + 4 * .9 + .9 + this.hold) { this.start(); this.gridT = 0; this.emit('lights-out', {}); }
      }
      if (this.red && this.red.phase === 'stopped' && this.t - this.red.st > 4 * (this.opt.timeScale || 1) / 3.75) { this.regrid(); this.hold = this.rnd(.6, 2.2); }
    }
    const C = this.C, L = C.L, cpLen = L / CP, cars = this.cars, W = this.weather;
    const run = this.running(), leader = run[0];
    const lapNow = leader ? Math.floor(leader.dist / L) + 1 : 1;
    // weather
    if (this.state === 'racing') {
      if (lapNow >= W.startLap && W.target === 0 && lapNow < W.endLap) { W.target = this.rnd(.6, .9); this.emit('rain', {}); }
      if (lapNow >= W.endLap && W.target > 0) { W.target = 0; this.emit('drying', {}); }
    }
    W.rain += Math.sign(W.target - W.rain) * Math.min(Math.abs(W.target - W.rain), .006 * dt);
    // planned safety car
    if (!this.sc && this.state === 'racing' && leader && leader.dist >= this.scAt) { this.scAt = Infinity; this.deploySC('debris'); }
    if (this.yellow && this.t > this.yellow.until) this.yellow = null;
    if (this.red && this.red.phase === 'stopping' && (this.t - this.red.t > 6 || run.every(c => c.v < 1 || c.inPit))) { this.red.phase = 'stopped'; this.red.st = this.t; this.emit('red-stopped', {}); }

    const onRoad = cars.filter(c => !c.out).sort((a, b) => mod(a.dist, L) - mod(b.dist, L));
    for (const c of cars) {
      if (c.out) continue;
      const s = mod(c.dist, L), i = Math.min(PW.N - 1, Math.floor(s / C.ds)), lapIdx = Math.floor(c.dist / L);
      const ty = PW.TYRES[c.tyre];
      c.noise += (this.rand() - .5) * .004 * dt - c.noise * .4 * dt; c.noise = Math.max(-.004, Math.min(.004, c.noise));
      const wet = c.tyre === 'I' ? .905 + .02 * W.rain : 1 - .22 * W.rain * (c.trait ? 1.25 - .5 * c.trait.wet : 1);
      let target = C.V[i] * c.pace * (ty.base - ty.deg * c.wear) * wet * (1 + c.noise) * (c.puncture ? .72 : 1);
      // strategy calls from the pit wall (you, or a viewer in chat): push, save tyres, overtake boost
      target *= c.mode === 'push' ? 1.006 : c.mode === 'save' ? .994 : 1;
      if (c.boostT > 0) { c.boostT -= dt; target *= 1.025; }
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
        const rate = .0004 * (1 + 2 * W.rain) * (slick ? 1 + 5 * W.rain : 1) * (c.puncture ? 3 : 1) * (c.mode === 'push' ? 1.8 : c.mode === 'save' ? .6 : 1) * (c.trait ? 1.4 - .8 * c.trait.fitness : 1);
        if (this.rand() < rate * dt) this.rand() < .3 ? this.startCrash(c, i) : this.startSpin(c, i);
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
            const slow = this.rand() < .05 * (c.trait ? 1 - .25 * (c.trait.pit || 0) : 1);
            c.stopDur = (slow ? this.rnd(5.5, 9) : this.rnd(2.1, 2.9)) * (c.trait ? 1 - .06 * (c.trait.pit || 0) : 1);
            const remain = this.laps - lapIdx;
            const nt = W.rain > .4 ? 'I' : c.puncture ? (remain > this.laps * .5 ? 'H' : 'M') : remain > this.laps * .5 ? 'H' : remain > 4 ? 'M' : 'S';
            c.newTyre = nt; c.slowStop = slow;
            this.emit('pit', { car: c, dur: c.stopDur, tyre: nt, slow });
          }
          c.stopT += dt; target = 0; c.v = 0;
          if (c.stopT >= c.stopDur) { c.stops = (c.stops || 0) + 1; c.stopped = true; c.tyre = c.newTyre; c.tyreLaps = 0; c.wear = 0; c.puncture = false; }
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
      if (c.passT && (c.passT.dist < c.dist - 7 || mod(c.passT.dist - c.dist, L) > 20 || c.passT.out)) { c.passT = null; c.passCd = 2.5 * (c.trait ? 1.3 - .8 * c.trait.racecraft : 1); }
      c.passCd -= dt;
      c.drs = !!(ahead && this.state === 'racing' && !this.sc && !this.yellow && !c.inPit && lapIdx >= 2 && W.rain < .3 &&
        this.inDRS(s) && gap / Math.max(c.v, 1) < 1 && !ahead.inPit);
      if (c.drs) target *= 1.035;
      if (ahead && !c.inPit && !c.spin && !c.crash && this.state !== 'grid') {
        const blue = ahead.finished || ahead.dist < c.dist - L * .5 || ahead.spin || ahead.crash || ahead.puncture;
        if (this.sc && !blue) { if (gap < 24) target = Math.min(target, ahead.v * (gap < 14 ? .9 : 1)); }
        else if (gap < 9 + c.v * .2 && ahead !== c.passT) {
          // keep a real following distance (about 0.2 s plus a car length), so the field never piles up
          const straight = Math.abs(C.K[i]) < 1 / 350, close = 9 + c.v * .2;
          if (target > ahead.v * 1.002 && (straight || blue) && c.passCd <= 0 && gap < close * .8) {
            c.passT = ahead; c.latT = Math.max(-1.2, Math.min(1.2, ahead.lat > 0 ? ahead.lat - 1.6 : ahead.lat + 1.6));
            if (this.opt.incidents && !blue && this.rand() < .012 && this.state === 'racing') {
              const victim = this.rand() < .5 ? c : ahead; victim.puncture = true;
              this.emit('contact', { a: c, b: ahead, victim });
            }
          } else target = Math.min(target, ahead.v * (gap < close * .55 ? .94 : gap < close * .8 ? .985 : 1));
        }
      }
      if (!c.passT && !c.inPit && !c.spin && !c.crash) {
        // follow the racing line (each driver a little differently), blending in from the grid slot after the start
        const line = (C.line ? C.line[i] : 0) * c.lineK * 1.05, k = Math.max(0, Math.min(1, 1 - (c.dist - this.gridBase) / 220));
        c.latT = c.gridLat * k + line * (1 - k);
      }
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
    // Synced races: round the state a little every step, so tiny maths differences between browsers can never grow
    if (this.auto) {
      for (const c of cars) { c.dist = q(c.dist, 1e6); c.v = q(c.v, 1e6); c.lat = q(c.lat, 1e6); c.latT = q(c.latT, 1e6); c.noise = q(c.noise, 1e9); }
      if (this.scCar) { this.scCar.dist = q(this.scCar.dist, 1e6); this.scCar.v = q(this.scCar.v, 1e6); this.scCar.lat = q(this.scCar.lat, 1e6); }
      W.rain = q(W.rain, 1e9);
    }
  }

  inDRS(s) {
    const L = this.C.L;
    return this.C.drs.some(([a, b]) => PW.mod(s - a, L) <= PW.mod(b - a, L));
  }
  startSpin(c, i) {
    c.spin = { t: 0, dur: this.rnd(4, 6), dir: this.rand() < .5 ? -1 : 1, side: -Math.sign(this.C.K[i]) || 1 };
    this.yellow = { s: c.dist, until: this.t + 12, corner: this.cornerAt(i) };
    this.emit('spin', { car: c, corner: this.cornerAt(i) });
  }
  startCrash(c, i) {
    c.crash = { t: 0, side: -Math.sign(this.C.K[i]) || 1, yaw: this.rnd(-.9, .9) };
    this.yellow = { s: c.dist, until: this.t + 30, corner: this.cornerAt(i) };
    const s = c.dist;
    for (let k = 0; k < 16; k++) this.debris.push({ s: s + this.rnd(-10, 40), lat: this.rnd(-1.5, 3.5) * c.crash.side, r: this.rnd(.8, 2.2), a: this.rnd(0, 6.28), c: this.rand() < .6 ? c.color : '#c9ced8' });
    this.emit('crash', { car: c, corner: this.cornerAt(i) });
  }
  afterCrash(c) {
    if (this.state !== 'racing') return;
    const lapsLeft = this.laps - this.leaderLap();
    const r = this.rand();
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
    for (const c of this.running()) if (!c.planDone && c.dist / this.C.L > this.laps * .3 && this.rand() < .55) c.pitNext = true;
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
    c.tyreLaps++; c.wear += (c.mode === 'push' ? 1.5 : c.mode === 'save' ? .65 : 1) * (c.trait ? 1.25 - .5 * c.trait.tyres : 1);
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
