/* Drive-by: a full-size single-seater with the driver's name and flag
   sweeps across the bottom of the screen, right to left.
   Used inside the web app (ambient view) and by the desktop app's overlay above the taskbar. */
window.PW = window.PW || {};
(() => {
PW.DriveBy = class DriveBy {
  constructor(canvas) { this.cv = canvas; this.g = canvas.getContext('2d'); this.run = null; this.audio = null; }
  get active() { return !!this.run; }
  /* info: { name, flag, num, team: { name, color, color2 }, tyre, sound } */
  start(info) {
    this.run = { ...info, t: 0 };
    this.cv.hidden = false;
    if (info.sound) this.engine();
  }
  stop() { this.run = null; this.cv.hidden = true; }
  /* Advance and draw. Returns false once the car has left the screen. */
  update(dtR) {
    const r = this.run; if (!r) return false;
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = this.cv.clientWidth, H = this.cv.clientHeight;
    if (this.cv.width !== Math.round(W * dpr) || this.cv.height !== Math.round(H * dpr)) { this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr); }
    const g = this.g; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    r.t += dtR;
    const ground = H - 6, s = (H * .62) / 214, carW = 1000 * s;
    const speed = Math.max(900, W / 2.4);                 // px per second
    const travel = W + carW + 260, dur = travel / speed;
    const p = r.t / dur;
    if (p >= 1) { this.stop(); return false; }
    const x = W + 60 - travel * p;                        // car's left edge (nose)
    const y = ground - 266 * s;
    // speed streaks behind the car
    g.save(); g.lineCap = 'round';
    for (let k = 0; k < 7; k++) {
      const ly = ground - (40 + k * 26) * s, len = (120 + (k * 53) % 140) * s * 2.2;
      const gx = x + carW * (.55 + (k % 3) * .12), gr = g.createLinearGradient(gx, 0, gx + len, 0);
      gr.addColorStop(0, 'rgba(230,236,248,.35)'); gr.addColorStop(1, 'rgba(230,236,248,0)');
      g.strokeStyle = gr; g.lineWidth = Math.max(1, 3 * s); g.beginPath(); g.moveTo(gx, ly); g.lineTo(gx + len, ly); g.stroke();
    }
    g.restore();
    // shadow
    const sh = g.createRadialGradient(x + 500 * s, ground, 2, x + 500 * s, ground, 480 * s);
    sh.addColorStop(0, 'rgba(0,0,0,.45)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sh; g.fillRect(x, ground - 14 * s, carW, 22 * s);
    // the car, with a tiny vibration at speed
    g.save(); g.translate(x, y + Math.sin(r.t * 60) * .6); g.scale(s, s);
    PW.drawCarSide(g, r.team.color, r.team.color2, r.num, r.team.name, (PW.TYRES[r.tyre] || PW.TYRES.M).c, -r.t * speed / (60 * s));
    g.restore();
    // name tag riding above the cockpit
    const tagH = Math.max(18, H * .17), fs = Math.round(tagH * .52);
    g.font = `700 ${fs}px "Saira Condensed", "Arial Narrow", sans-serif`;
    const label = `${r.num}  ${PW.shortName(r.name).toUpperCase()}`;
    const fw = r.flag && PW.FLAG_NAMES[r.flag] ? tagH * 1.05 : 0;
    const tw = g.measureText(label).width + 20 + (fw ? fw + 8 : 0);
    const tx = x + 470 * s - tw / 2, ty = Math.max(2, y + 40 * s - tagH - 6);
    g.fillStyle = 'rgba(7,9,13,.88)'; g.beginPath(); g.roundRect(tx, ty, tw, tagH, 4); g.fill();
    g.fillStyle = r.team.color; g.fillRect(tx, ty, 4, tagH);
    if (fw) PW.drawFlag(g, r.flag, tx + 12, ty + tagH * .2, fw, tagH * .6);
    g.fillStyle = '#eef2f8'; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillText(label, tx + 12 + (fw ? fw + 8 : 0), ty + tagH / 2 + 1);
    return true;
  }
  /* Optional engine pass: a short Doppler sweep, synthesized (no audio files). */
  engine() {
    try {
      const A = this.audio || (this.audio = new (window.AudioContext || window.webkitAudioContext)());
      const t0 = A.currentTime, d = 2.6;
      const o = A.createOscillator(), o2 = A.createOscillator(), f = A.createBiquadFilter(), v = A.createGain();
      o.type = 'sawtooth'; o2.type = 'square';
      o.frequency.setValueAtTime(310, t0); o.frequency.linearRampToValueAtTime(420, t0 + d * .45); o.frequency.exponentialRampToValueAtTime(190, t0 + d);
      o2.frequency.setValueAtTime(155, t0); o2.frequency.linearRampToValueAtTime(210, t0 + d * .45); o2.frequency.exponentialRampToValueAtTime(95, t0 + d);
      f.type = 'lowpass'; f.frequency.value = 1400;
      v.gain.setValueAtTime(0, t0); v.gain.linearRampToValueAtTime(.12, t0 + d * .45); v.gain.exponentialRampToValueAtTime(.001, t0 + d);
      o.connect(f); o2.connect(f); f.connect(v); v.connect(A.destination);
      o.start(t0); o2.start(t0); o.stop(t0 + d); o2.stop(t0 + d);
    } catch (e) { /* sound is optional */ }
  }
};
})();
