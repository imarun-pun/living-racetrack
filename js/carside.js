/* A realistic modern single-seater in side profile, facing left, drawn from scratch for Lapwall.
   Box is 1000 × 260 units (about 5.6 m long), ground at y = 250.
   opts: { c1, c2, num, team, tyre, spin, blur (0–1 motion blur), brake, pitch (radians), rev (0–1 exhaust heat) } */
window.PW = window.PW || {};
(() => {
const TAU = Math.PI * 2;
const shade = (hex, k) => {           // k > 0 lighter, k < 0 darker
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255;
  const f = v => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
};
PW.shade = shade;

function bodyPath(g) {
  g.beginPath();
  g.moveTo(18, 214);
  g.bezierCurveTo(60, 206, 110, 198, 170, 191);           // nose top
  g.bezierCurveTo(230, 184, 290, 176, 334, 168);          // into the cockpit
  g.lineTo(456, 150);                                      // cockpit rim
  g.bezierCurveTo(470, 132, 488, 104, 512, 92);            // airbox rises
  g.bezierCurveTo(530, 84, 560, 84, 580, 92);              // airbox top
  g.bezierCurveTo(690, 112, 800, 148, 882, 172);           // engine cover sweeps down
  g.lineTo(902, 182); g.lineTo(904, 212);
  g.bezierCurveTo(860, 218, 800, 224, 740, 226);          // sidepod undercut
  g.lineTo(380, 228);
  g.bezierCurveTo(340, 226, 310, 218, 280, 214);
  g.lineTo(150, 216);
  g.bezierCurveTo(90, 218, 50, 220, 18, 220);
  g.closePath();
}
function sidepodPath(g) {
  g.beginPath();
  g.moveTo(372, 170);
  g.bezierCurveTo(430, 154, 560, 152, 640, 162);
  g.bezierCurveTo(720, 172, 790, 196, 846, 214);
  g.lineTo(740, 226); g.lineTo(380, 228);
  g.bezierCurveTo(364, 214, 362, 186, 372, 170);
  g.closePath();
}

function wheel(g, x, y, r, tyreC, spin, blur, cover) {
  const rg = g.createRadialGradient(x - r * .2, y - r * .25, r * .2, x, y, r);
  rg.addColorStop(0, '#2a2c31'); rg.addColorStop(.7, '#121317'); rg.addColorStop(1, '#050506');
  g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  // sidewall marking in the compound colour, broken into arcs like real tyre lettering
  g.strokeStyle = tyreC; g.lineWidth = r * .045;
  for (let k = 0; k < 4; k++) { const a = spin + k * TAU / 4; g.beginPath(); g.arc(x, y, r * .8, a, a + TAU / 4 * .6); g.stroke(); }
  // rim
  const rm = g.createRadialGradient(x - r * .15, y - r * .2, r * .05, x, y, r * .6);
  rm.addColorStop(0, '#5b606a'); rm.addColorStop(1, '#1c1e23');
  g.fillStyle = rm; g.beginPath(); g.arc(x, y, r * .6, 0, TAU); g.fill();
  if (blur > .35) {
    g.fillStyle = 'rgba(160,166,178,.18)'; g.beginPath(); g.arc(x, y, r * .55, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(200,205,215,.18)'; g.lineWidth = r * .04; g.beginPath(); g.arc(x, y, r * .38, 0, TAU); g.stroke();
  } else if (cover) {
    const cv = g.createLinearGradient(x - r * .6, y - r * .6, x + r * .6, y + r * .6);
    cv.addColorStop(0, '#3a3e47'); cv.addColorStop(.5, '#16181d'); cv.addColorStop(1, '#2c3038');
    g.fillStyle = cv; g.beginPath(); g.arc(x, y, r * .56, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r * .45, spin, spin + 1.2); g.stroke();
  } else {
    g.strokeStyle = '#3d424c'; g.lineWidth = r * .07; g.lineCap = 'round';
    for (let k = 0; k < 10; k++) { const a = spin + k * TAU / 10; g.beginPath(); g.moveTo(x + Math.cos(a) * r * .16, y + Math.sin(a) * r * .16); g.lineTo(x + Math.cos(a) * r * .55, y + Math.sin(a) * r * .55); g.stroke(); }
  }
  g.fillStyle = '#c9a227'; g.beginPath(); g.arc(x, y, r * .1, 0, TAU); g.fill();          // wheel nut
  // tyre shine
  g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = r * .08; g.beginPath(); g.arc(x, y, r * .9, Math.PI * 1.1, Math.PI * 1.45); g.stroke();
}

PW.drawRaceCar = function (g, o) {
  const c1 = o.c1, c2 = o.c2, tyreC = o.tyre || '#ffd21f', spin = o.spin || 0, blur = o.blur || 0;
  g.save();
  // soft ground shadow
  const sh = g.createRadialGradient(500, 252, 10, 500, 252, 470);
  sh.addColorStop(0, 'rgba(0,0,0,.55)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sh; g.beginPath(); g.ellipse(500, 252, 480, 14, 0, 0, TAU); g.fill();
  if (o.pitch) { g.translate(500, 230); g.rotate(o.pitch); g.translate(-500, -230); }
  // suspension (behind wheels and body)
  g.strokeStyle = '#15171b'; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(205, 182); g.lineTo(330, 176); g.moveTo(205, 198); g.lineTo(330, 206);
  g.moveTo(770, 180); g.lineTo(690, 176); g.moveTo(770, 196); g.lineTo(690, 210); g.stroke();
  // floor and plank
  const fl = g.createLinearGradient(0, 228, 0, 246); fl.addColorStop(0, '#24272d'); fl.addColorStop(1, '#0b0c0f');
  g.fillStyle = fl; g.beginPath(); g.moveTo(150, 232); g.lineTo(908, 228); g.lineTo(912, 238); g.bezierCurveTo(700, 244, 300, 246, 160, 244); g.closePath(); g.fill();
  g.fillStyle = '#c9a227'; g.fillRect(420, 243, 260, 2);                                    // titanium skid blocks
  // rear wing
  g.fillStyle = '#121418'; g.beginPath(); g.moveTo(884, 92); g.lineTo(990, 86); g.lineTo(986, 212); g.lineTo(902, 214); g.bezierCurveTo(896, 170, 890, 130, 884, 92); g.fill();
  const ep = g.createLinearGradient(884, 0, 990, 0); ep.addColorStop(0, shade(c2, .1)); ep.addColorStop(1, shade(c2, -.25));
  g.fillStyle = ep; g.beginPath(); g.moveTo(892, 94); g.lineTo(982, 90); g.lineTo(980, 150); g.lineTo(900, 154); g.closePath(); g.fill();
  const wg = g.createLinearGradient(0, 74, 0, 92); wg.addColorStop(0, shade(c1, .3)); wg.addColorStop(1, shade(c1, -.3));
  g.fillStyle = wg; g.beginPath(); g.roundRect(866, 74, 128, 16, 6); g.fill();               // main plane
  g.fillStyle = '#1b1d22'; g.beginPath(); g.roundRect(872, 94, 120, 9, 4); g.fill();         // flap
  g.fillStyle = '#16181c'; g.fillRect(904, 196, 80, 7);                                      // beam wing
  if (o.brake) { g.save(); g.shadowColor = '#ff2b2b'; g.shadowBlur = 18; g.fillStyle = '#ff3b3b'; g.fillRect(984, 156, 8, 10); g.restore(); }
  else { g.fillStyle = '#5a1010'; g.fillRect(984, 156, 8, 10); }
  // main body with paint gradient
  bodyPath(g);
  const bg = g.createLinearGradient(0, 84, 0, 228);
  bg.addColorStop(0, shade(c1, .35)); bg.addColorStop(.35, c1); bg.addColorStop(1, shade(c1, -.45));
  g.fillStyle = bg; g.fill();
  // sidepod volume
  sidepodPath(g);
  const sp = g.createLinearGradient(0, 152, 0, 228); sp.addColorStop(0, shade(c1, .15)); sp.addColorStop(.5, shade(c1, -.08)); sp.addColorStop(1, shade(c1, -.5));
  g.fillStyle = sp; g.fill();
  // livery swoosh in the second colour
  g.fillStyle = c2; g.beginPath(); g.moveTo(30, 216); g.bezierCurveTo(200, 206, 320, 196, 420, 196);
  g.bezierCurveTo(560, 196, 700, 200, 860, 212); g.lineTo(856, 220); g.bezierCurveTo(700, 210, 560, 206, 420, 207); g.bezierCurveTo(320, 207, 200, 214, 40, 220); g.closePath(); g.fill();
  // sidepod inlet
  g.fillStyle = '#07080a'; g.beginPath(); g.moveTo(372, 172); g.bezierCurveTo(392, 166, 408, 166, 414, 170); g.lineTo(410, 206); g.bezierCurveTo(396, 208, 380, 208, 368, 204); g.closePath(); g.fill();
  // rear wheel is outboard of the bodywork
  wheel(g, 770, 188, 64, tyreC, spin, blur, true);
  // highlights: top sheen and a sharp specular line along the spine
  g.save(); bodyPath(g); g.clip();
  const hl = g.createLinearGradient(0, 84, 0, 170); hl.addColorStop(0, 'rgba(255,255,255,.42)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = hl; g.fillRect(0, 80, 1000, 90);
  g.restore();
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(60, 207); g.bezierCurveTo(200, 188, 300, 174, 334, 168); g.moveTo(582, 94); g.bezierCurveTo(690, 114, 800, 148, 878, 171); g.stroke();
  // shark fin and team name
  g.fillStyle = shade(c1, -.15); g.beginPath(); g.moveTo(600, 96); g.lineTo(860, 160); g.lineTo(860, 170); g.lineTo(610, 106); g.closePath(); g.fill();
  if (o.team) { g.save(); g.font = '800 25px "Saira Condensed", "Arial Narrow", sans-serif'; g.fillStyle = 'rgba(255,255,255,.88)'; g.textBaseline = 'middle'; g.fillText(String(o.team).toUpperCase().slice(0, 14), 470, 186); g.restore(); }
  // airbox, T-cam, cockpit, driver, halo, mirror
  g.fillStyle = '#060708'; g.beginPath(); g.ellipse(533, 104, 11, 14, 0, 0, TAU); g.fill();
  g.fillStyle = c2; g.beginPath(); g.roundRect(522, 78, 38, 7, 3); g.fill();
  g.fillStyle = '#0b0c0f'; g.beginPath(); g.moveTo(334, 168); g.bezierCurveTo(380, 156, 420, 150, 458, 150); g.lineTo(450, 164); g.bezierCurveTo(410, 162, 370, 166, 340, 172); g.closePath(); g.fill();
  const hg = g.createRadialGradient(412, 128, 4, 420, 138, 28); hg.addColorStop(0, shade(c2, .5)); hg.addColorStop(1, shade(c2, -.2));
  g.fillStyle = hg; g.beginPath(); g.arc(420, 140, 25, 0, TAU); g.fill();                     // helmet
  g.fillStyle = '#0a0b0e'; g.beginPath(); g.moveTo(398, 132); g.bezierCurveTo(408, 126, 424, 126, 430, 130); g.lineTo(428, 142); g.bezierCurveTo(418, 140, 406, 141, 398, 144); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(410, 130, 6, 2.5, -.2, 0, TAU); g.fill();
  g.strokeStyle = '#101216'; g.lineWidth = 9; g.lineCap = 'round';
  g.beginPath(); g.moveTo(336, 166); g.bezierCurveTo(352, 122, 392, 104, 440, 104); g.bezierCurveTo(466, 104, 476, 124, 474, 150); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.beginPath(); g.moveTo(348, 140); g.bezierCurveTo(362, 116, 400, 102, 440, 101); g.stroke();
  g.strokeStyle = '#15171b'; g.lineWidth = 3; g.beginPath(); g.moveTo(352, 168); g.lineTo(368, 152); g.stroke();
  g.fillStyle = c1; g.beginPath(); g.ellipse(374, 150, 15, 6, -.08, 0, TAU); g.fill();
  // number on the nose
  if (o.num !== undefined) {
    g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.roundRect(222, 180, 40, 22, 5); g.fill();
    g.fillStyle = '#0b0c10'; g.font = '800 18px "Saira Condensed", "Arial Narrow", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(o.num), 242, 192); g.textAlign = 'left';
  }
  // front wheel with aero cover, then front wing on top
  wheel(g, 205, 190, 62, tyreC, spin, blur, true);
  g.fillStyle = '#121418'; g.beginPath(); g.moveTo(0, 236); g.bezierCurveTo(60, 230, 120, 228, 178, 230); g.lineTo(176, 240); g.bezierCurveTo(120, 240, 60, 244, 2, 248); g.closePath(); g.fill();
  const fw = g.createLinearGradient(0, 222, 0, 234); fw.addColorStop(0, shade(c1, .3)); fw.addColorStop(1, shade(c1, -.3));
  g.fillStyle = fw; g.beginPath(); g.moveTo(4, 230); g.bezierCurveTo(60, 222, 120, 218, 172, 220); g.lineTo(172, 228); g.bezierCurveTo(120, 228, 60, 232, 4, 238); g.closePath(); g.fill();
  const fe = g.createLinearGradient(6, 0, 62, 0); fe.addColorStop(0, shade(c2, .15)); fe.addColorStop(1, shade(c2, -.25));
  g.fillStyle = fe; g.beginPath(); g.moveTo(8, 196); g.lineTo(54, 200); g.lineTo(62, 246); g.lineTo(6, 249); g.closePath(); g.fill();
  // exhaust heat when revving
  if (o.rev > 0) {
    for (let k = 0; k < 3; k++) {
      const a = o.rev * (.4 + Math.random() * .6);
      g.fillStyle = `rgba(255,${120 + Math.random() * 80 | 0},40,${.5 * a})`;
      g.beginPath(); g.ellipse(912 + k * 14 + Math.random() * 8, 176 + (Math.random() - .5) * 4, 12 * a + 4, 4, 0, 0, TAU); g.fill();
    }
  }
  g.restore();
};
})();
