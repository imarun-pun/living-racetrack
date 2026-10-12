/* Garage break: an original open-wheel race car, side profile, painted in a team's livery.
   The design is drawn from scratch for this project and does not copy any real team's car. */
window.PW = window.PW || {};
(() => {
const ease = t => t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3);
const poly = (g, pts) => { g.beginPath(); pts.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); };

/* Car in a 1000 × 300 box, ground at y = 266, facing left. */
PW.drawCarSide = function (g, c1, c2, num, teamName, tyreC, spin) {
  // floor and plank
  g.fillStyle = '#0d0f13'; poly(g, [[120, 246], [905, 238], [910, 252], [140, 258]]); g.fill();
  // rear wing endplate and elements
  g.fillStyle = c2; poly(g, [[858, 70], [960, 64], [966, 232], [880, 232], [872, 180]]); g.fill();
  g.fillStyle = c1; poly(g, [[842, 60], [972, 52], [976, 74], [846, 82]]); g.fill();
  g.fillStyle = '#16181d'; poly(g, [[850, 88], [968, 84], [970, 98], [852, 102]]); g.fill();
  g.fillStyle = '#16181d'; g.fillRect(880, 196, 90, 9);                      // beam wing
  // suspension arms
  g.strokeStyle = '#1a1c22'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath();
  g.moveTo(330, 188); g.lineTo(212, 200); g.moveTo(330, 214); g.lineTo(212, 214);
  g.moveTo(700, 196); g.lineTo(790, 200); g.moveTo(700, 218); g.lineTo(790, 214); g.stroke();
  // main body
  g.fillStyle = c1;
  poly(g, [[28, 214], [70, 200], [160, 186], [300, 160], [410, 140], [440, 128], [520, 118], [540, 88], [585, 86], [610, 104],
    [700, 132], [800, 160], [880, 176], [902, 186], [902, 222], [800, 228], [640, 232], [380, 232], [320, 222], [180, 214], [60, 220]]);
  g.fill();
  // sidepod: slightly darker band
  g.fillStyle = 'rgba(0,0,0,.18)'; poly(g, [[420, 168], [520, 156], [660, 160], [760, 186], [760, 226], [420, 230], [395, 200]]); g.fill();
  // inlet
  g.fillStyle = '#0b0c10'; poly(g, [[420, 168], [446, 164], [446, 206], [404, 206]]); g.fill();
  // livery stripe
  g.fillStyle = c2; poly(g, [[60, 208], [300, 184], [700, 196], [900, 202], [900, 212], [700, 210], [300, 200], [70, 216]]); g.fill();
  // engine cover fin
  g.fillStyle = c1; poly(g, [[600, 96], [860, 150], [860, 162], [620, 110]]); g.fill();
  g.fillStyle = 'rgba(255,255,255,.08)'; poly(g, [[600, 96], [860, 150], [858, 154], [600, 101]]); g.fill();
  // airbox and roll hoop
  g.fillStyle = '#0b0c10'; g.beginPath(); g.ellipse(548, 100, 9, 12, 0, 0, 6.29); g.fill();
  // cockpit, driver, halo
  g.fillStyle = '#0b0c10'; poly(g, [[440, 128], [530, 118], [520, 132], [452, 138]]); g.fill();
  g.fillStyle = c2; g.beginPath(); g.arc(488, 112, 22, 0, 6.29); g.fill();
  g.fillStyle = '#0b0c10'; poly(g, [[468, 104], [496, 100], [500, 112], [470, 116]]); g.fill();
  g.strokeStyle = '#121419'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath();
  g.moveTo(426, 132); g.quadraticCurveTo(452, 92, 500, 90); g.quadraticCurveTo(536, 90, 540, 116); g.stroke();
  // mirror
  g.fillStyle = c1; g.fillRect(398, 124, 24, 9); g.fillStyle = '#121419'; g.fillRect(410, 133, 3, 8);
  // number on the nose
  g.fillStyle = '#f4f6fa'; g.beginPath(); g.arc(250, 182, 15, 0, 6.29); g.fill();
  g.fillStyle = '#0b0c10'; g.font = '800 20px "Saira Condensed", "Arial Narrow", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(num, 250, 183);
  // team name on the sidepod
  g.save(); g.fillStyle = 'rgba(244,246,250,.92)'; g.font = '800 30px "Saira Condensed", "Arial Narrow", sans-serif'; g.textAlign = 'left';
  g.fillText(teamName.toUpperCase(), 470, 184); g.restore();
  // front wing
  g.fillStyle = c2; poly(g, [[8, 196], [52, 196], [58, 252], [10, 252]]); g.fill();
  g.fillStyle = c1; poly(g, [[0, 238], [168, 232], [170, 244], [2, 250]]); g.fill();
  g.fillStyle = '#16181d'; poly(g, [[20, 226], [150, 222], [152, 230], [22, 234]]); g.fill();
  // wheels
  [[212, 206, 58], [790, 204, 62]].forEach(([x, y, r]) => {
    g.fillStyle = '#0b0c0f'; g.beginPath(); g.arc(x, y, r, 0, 6.29); g.fill();
    g.strokeStyle = tyreC; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r * .8, 0, 6.29); g.stroke();
    g.fillStyle = '#23262d'; g.beginPath(); g.arc(x, y, r * .64, 0, 6.29); g.fill();
    g.strokeStyle = '#363a44'; g.lineWidth = 3;
    for (let k = 0; k < 6; k++) { const a = spin + k * Math.PI / 3; g.beginPath(); g.moveTo(x + Math.cos(a) * r * .18, y + Math.sin(a) * r * .18); g.lineTo(x + Math.cos(a) * r * .6, y + Math.sin(a) * r * .6); g.stroke(); }
    g.fillStyle = c1; g.beginPath(); g.arc(x, y, r * .16, 0, 6.29); g.fill();
    g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.arc(x - r * .2, y - r * .25, r * .6, Math.PI * 1.05, Math.PI * 1.6); g.lineTo(x, y); g.fill();
  });
};

const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
PW.esc = esc;
PW.Garage = class Garage {
  constructor(wrap) { this.wrap = wrap; this.cv = wrap.querySelector('canvas'); this.ctx = this.cv.getContext('2d'); this.t = 0; this.active = false; }
  show(info) {
    this.info = info; this.t = 0; this.active = true; this.wrap.hidden = false;
    const q = s => this.wrap.querySelector(s);
    q('[data-team]').textContent = info.team.name;
    q('[data-team]').style.color = info.team.color;
    q('[data-drivers]').textContent = info.drivers.join('  ·  ');
    q('[data-specs]').innerHTML = PW.CAR_SPECS.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    q('[data-fact]').textContent = info.fact;
    q('[data-why]').textContent = info.why;
    q('[data-season]').textContent = info.seasonTitle || 'Championship';
    q('[data-standings]').innerHTML = (info.standings || []).map(d =>
      `<li><span class="b" style="background:${d.color}"></span>${d.flag && PW.FLAG_NAMES[d.flag] ? `<img src="${PW.flagURL(d.flag, 21, 14)}" alt="${PW.FLAG_NAMES[d.flag]}">` : '<span></span>'}<span class="n">${esc(d.name)}</span><span class="p">${d.pts}</span></li>`).join('');
  }
  hide() { this.active = false; this.wrap.hidden = true; }
  update(dtR, left, nextName) {
    if (!this.active) return;
    this.t += dtR;
    this.wrap.querySelector('[data-next]').textContent = `Next race: ${nextName} in ${Math.max(0, Math.ceil(left))}s`;
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = this.cv.clientWidth, H = this.cv.clientHeight;
    if (this.cv.width !== Math.round(W * dpr)) { this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr); }
    const g = this.ctx; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#050608'; g.fillRect(0, 0, W, H);
    const spot = g.createRadialGradient(W / 2, H * .45, 0, W / 2, H * .45, Math.max(W, H) * .6);
    spot.addColorStop(0, this.info.team.color + '30'); spot.addColorStop(.5, 'rgba(20,24,32,.6)'); spot.addColorStop(1, 'rgba(5,6,8,1)');
    g.fillStyle = spot; g.fillRect(0, 0, W, H);
    // floor lines
    g.strokeStyle = 'rgba(200,215,240,.06)'; g.lineWidth = 1;
    for (let k = 0; k < 14; k++) { const y = H * .62 + k * k * 3; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    const s = Math.min(W * .86 / 1000, H * .5 / 300);
    const arrive = ease(this.t / 2.2);
    const x = (W - 1000 * s) / 2 + (1 - arrive) * W * .9, y = H * .58 - 266 * s + Math.sin(this.t * 1.3) * 1.2;
    const spin = -this.t * 2 * (1 - arrive) * 6;
    const sweep = ((this.t - 2) % 5) / 3.2;
    // paint the car off-screen so light effects only touch the car
    const ow = Math.ceil(1000 * s * dpr), oh = Math.ceil(300 * s * dpr);
    if (!this.off) this.off = document.createElement('canvas');
    if (this.off.width !== ow || this.off.height !== oh) { this.off.width = ow; this.off.height = oh; }
    const o = this.off.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, ow, oh);
    o.setTransform(s * dpr, 0, 0, s * dpr, 0, 0);
    if (PW.drawRaceCar) { o.translate(0, 16); PW.drawRaceCar(o, { c1: this.info.team.color, c2: this.info.team.color2, num: this.info.num, team: this.info.team.name, tyre: this.info.tyreC, spin, brake: arrive > .6 && arrive < .99 }); }
    else PW.drawCarSide(o, this.info.team.color, this.info.team.color2, this.info.num, this.info.team.name, this.info.tyreC, spin);
    o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-atop';
    const hl = o.createLinearGradient(0, oh * .2, 0, oh * .85); hl.addColorStop(0, 'rgba(255,255,255,.16)'); hl.addColorStop(.45, 'rgba(255,255,255,0)'); hl.addColorStop(1, 'rgba(0,0,0,.3)');
    o.fillStyle = hl; o.fillRect(0, 0, ow, oh);
    if (this.t > 2 && sweep < 1) {
      const gx = (sweep * 1.3 - .15) * ow, gr = o.createLinearGradient(gx - ow * .09, 0, gx + ow * .09, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.28)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      o.fillStyle = gr; o.fillRect(0, 0, ow, oh);
    }
    o.globalCompositeOperation = 'source-over';
    // ground shadow, car, reflection
    const sh = g.createRadialGradient(x + 500 * s, y + 268 * s, 10, x + 500 * s, y + 268 * s, 470 * s);
    sh.addColorStop(0, 'rgba(0,0,0,.7)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sh; g.fillRect(x, y + 250 * s, 1000 * s, 36 * s);
    g.drawImage(this.off, x, y, 1000 * s, 300 * s);
    g.save(); g.globalAlpha = .1; g.translate(x, y + 266 * s * 2 + 4); g.scale(1, -1); g.drawImage(this.off, 0, 0, 1000 * s, 300 * s); g.restore();
    const fade = g.createLinearGradient(0, H * .6, 0, H); fade.addColorStop(0, 'rgba(5,6,8,0)'); fade.addColorStop(.35, 'rgba(5,6,8,.9)'); fade.addColorStop(1, 'rgba(5,6,8,1)');
    g.fillStyle = fade; g.fillRect(0, H * .6 + 4, W, H * .4);
  }
};
})();
