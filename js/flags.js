/* National flags drawn on canvas, so they look the same on every system
   (Windows does not render flag emoji). Simplified for small sizes. */
window.PW = window.PW || {};
(() => {
const rect = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
function stripes(g, w, h, cols, vertical, weights) {
  const ws = weights || cols.map(() => 1), tot = ws.reduce((a, b) => a + b, 0); let p = 0;
  cols.forEach((c, i) => { const s = (vertical ? w : h) * ws[i] / tot; vertical ? rect(g, c, p, 0, s + .5, h) : rect(g, c, 0, p, w, s + .5); p += s; });
}
function star(g, cx, cy, r, color, n = 5, inner = .4, rot = -Math.PI / 2) {
  g.fillStyle = color; g.beginPath();
  for (let k = 0; k < n * 2; k++) { const rr = k % 2 ? r * inner : r, a = rot + k * Math.PI / n; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  g.closePath(); g.fill();
}
const disc = (g, cx, cy, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(cx, cy, r, 0, 6.2832); g.fill(); };
function crescent(g, cx, cy, r, c, bg, off = .28) { disc(g, cx, cy, r, c); disc(g, cx + r * off, cy, r * .82, bg); }
function nordic(g, w, h, bg, cross, inner) {
  rect(g, bg, 0, 0, w, h);
  const cx = w * .36, bw = h * (inner ? .26 : .2);
  rect(g, cross, cx - bw / 2, 0, bw, h); rect(g, cross, 0, h / 2 - bw / 2, w, bw);
  if (inner) { const iw = bw * .5; rect(g, inner, cx - iw / 2, 0, iw, h); rect(g, inner, 0, h / 2 - iw / 2, w, iw); }
}
function unionJack(g, x, y, w, h) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  rect(g, '#012169', x, y, w, h);
  g.lineCap = 'butt';
  const diag = (col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + h); g.moveTo(x + w, y); g.lineTo(x, y + h); g.stroke(); };
  diag('#fff', h * .2); diag('#c8102e', h * .07);
  rect(g, '#fff', x + w / 2 - h * .17, y, h * .34, h); rect(g, '#fff', x, y + h / 2 - h * .17, w, h * .34);
  rect(g, '#c8102e', x + w / 2 - h * .1, y, h * .2, h); rect(g, '#c8102e', x, y + h / 2 - h * .1, w, h * .2);
  g.restore();
}
const D = {
  AR: (g, w, h) => { stripes(g, w, h, ['#74acdf', '#fff', '#74acdf']); disc(g, w / 2, h / 2, h * .11, '#f6b40e'); },
  AU: (g, w, h) => { rect(g, '#012169', 0, 0, w, h); unionJack(g, 0, 0, w / 2, h / 2); star(g, w * .25, h * .75, h * .13, '#fff', 7, .45);
    [[.75, .2], [.62, .48], [.88, .4], [.75, .84]].forEach(([a, b]) => star(g, w * a, h * b, h * .07, '#fff', 7, .45)); },
  AT: (g, w, h) => stripes(g, w, h, ['#ed2939', '#fff', '#ed2939']),
  AZ: (g, w, h) => { stripes(g, w, h, ['#00b5e2', '#ef3340', '#509e2f']); crescent(g, w * .47, h / 2, h * .12, '#fff', '#ef3340'); star(g, w * .56, h / 2, h * .06, '#fff', 8); },
  BD: (g, w, h) => { rect(g, '#006a4e', 0, 0, w, h); disc(g, w * .45, h / 2, h * .3, '#f42a41'); },
  BE: (g, w, h) => stripes(g, w, h, ['#111', '#fdda24', '#ef3340'], true),
  BR: (g, w, h) => { rect(g, '#009c3b', 0, 0, w, h); g.fillStyle = '#ffdf00'; g.beginPath(); g.moveTo(w * .08, h / 2); g.lineTo(w / 2, h * .1); g.lineTo(w * .92, h / 2); g.lineTo(w / 2, h * .9); g.closePath(); g.fill(); disc(g, w / 2, h / 2, h * .22, '#002776'); },
  CA: (g, w, h) => { stripes(g, w, h, ['#d52b1e', '#fff', '#d52b1e'], true, [1, 2, 1]); star(g, w / 2, h * .47, h * .3, '#d52b1e', 11, .55); rect(g, '#d52b1e', w / 2 - h * .025, h * .6, h * .05, h * .22); },
  CH: (g, w, h) => { rect(g, '#da291c', 0, 0, w, h); rect(g, '#fff', w / 2 - h * .1, h * .2, h * .2, h * .6); rect(g, '#fff', w / 2 - h * .3, h * .4, h * .6, h * .2); },
  CN: (g, w, h) => { rect(g, '#ee1c25', 0, 0, w, h); star(g, w * .17, h * .27, h * .15, '#ffde00');
    [[.33, .1], [.4, .2], [.4, .36], [.33, .46]].forEach(([a, b]) => star(g, w * a, h * b, h * .05, '#ffde00')); },
  CO: (g, w, h) => stripes(g, w, h, ['#fcd116', '#003893', '#ce1126'], false, [2, 1, 1]),
  DE: (g, w, h) => stripes(g, w, h, ['#111', '#dd0000', '#ffce00']),
  DK: (g, w, h) => nordic(g, w, h, '#c8102e', '#fff'),
  EG: (g, w, h) => { stripes(g, w, h, ['#ce1126', '#fff', '#111']); disc(g, w / 2, h / 2, h * .08, '#c09300'); },
  ES: (g, w, h) => stripes(g, w, h, ['#aa151b', '#f1bf00', '#aa151b'], false, [1, 2, 1]),
  FI: (g, w, h) => nordic(g, w, h, '#fff', '#002f6c'),
  FR: (g, w, h) => stripes(g, w, h, ['#0055a4', '#fff', '#ef4135'], true),
  GB: (g, w, h) => unionJack(g, 0, 0, w, h),
  GH: (g, w, h) => { stripes(g, w, h, ['#ce1126', '#fcd116', '#006b3f']); star(g, w / 2, h / 2, h * .15, '#111'); },
  GR: (g, w, h) => { stripes(g, w, h, ['#0d5eaf', '#fff', '#0d5eaf', '#fff', '#0d5eaf', '#fff', '#0d5eaf', '#fff', '#0d5eaf']); rect(g, '#0d5eaf', 0, 0, h * .55, h * .55); rect(g, '#fff', h * .22, 0, h * .11, h * .55); rect(g, '#fff', 0, h * .22, h * .55, h * .11); },
  HU: (g, w, h) => stripes(g, w, h, ['#ce2939', '#fff', '#477050']),
  ID: (g, w, h) => stripes(g, w, h, ['#ce1126', '#fff']),
  IE: (g, w, h) => stripes(g, w, h, ['#169b62', '#fff', '#ff883e'], true),
  IN: (g, w, h) => { stripes(g, w, h, ['#ff9933', '#fff', '#138808']); g.strokeStyle = '#000080'; g.lineWidth = Math.max(1, h * .04); g.beginPath(); g.arc(w / 2, h / 2, h * .12, 0, 6.2832); g.stroke(); },
  IT: (g, w, h) => stripes(g, w, h, ['#009246', '#fff', '#ce2b37'], true),
  JM: (g, w, h) => { rect(g, '#009b3a', 0, 0, w, h); g.fillStyle = '#111'; g.beginPath(); g.moveTo(0, 0); g.lineTo(w / 2, h / 2); g.lineTo(0, h); g.moveTo(w, 0); g.lineTo(w / 2, h / 2); g.lineTo(w, h); g.fill();
    g.strokeStyle = '#fed100'; g.lineWidth = h * .14; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke(); },
  JP: (g, w, h) => { rect(g, '#fff', 0, 0, w, h); disc(g, w / 2, h / 2, h * .3, '#bc002d'); },
  KE: (g, w, h) => { stripes(g, w, h, ['#111', '#fff', '#bb0000', '#fff', '#006600'], false, [6, 1, 6, 1, 6]); g.fillStyle = '#bb0000'; g.beginPath(); g.ellipse(w / 2, h / 2, h * .12, h * .3, 0, 0, 6.2832); g.fill(); },
  KR: (g, w, h) => { rect(g, '#fff', 0, 0, w, h); g.fillStyle = '#cd2e3a'; g.beginPath(); g.arc(w / 2, h / 2, h * .25, Math.PI, 0); g.fill(); g.fillStyle = '#0047a0'; g.beginPath(); g.arc(w / 2, h / 2, h * .25, 0, Math.PI); g.fill();
    [[.18, .2], [.82, .2], [.18, .8], [.82, .8]].forEach(([a, b]) => { g.save(); g.translate(w * a, h * b); g.rotate((a < .5) === (b < .5) ? -.98 : .98); rect(g, '#111', -h * .1, -h * .07, h * .2, h * .14); g.restore(); }); },
  MA: (g, w, h) => { rect(g, '#c1272d', 0, 0, w, h); g.strokeStyle = '#006233'; g.lineWidth = Math.max(1, h * .05); g.beginPath();
    for (let k = 0; k <= 5; k++) { const a = -Math.PI / 2 + k * 4 * Math.PI / 5; g.lineTo(w / 2 + Math.cos(a) * h * .22, h / 2 + Math.sin(a) * h * .22); } g.stroke(); },
  MC: (g, w, h) => stripes(g, w, h, ['#ce1126', '#fff']),
  MX: (g, w, h) => { stripes(g, w, h, ['#006847', '#fff', '#ce1126'], true); disc(g, w / 2, h / 2, h * .1, '#8c5a2b'); },
  MY: (g, w, h) => { stripes(g, w, h, Array.from({ length: 14 }, (_, k) => k % 2 ? '#fff' : '#cc0001')); rect(g, '#010066', 0, 0, w / 2, h * 8 / 14); crescent(g, w * .2, h * .29, h * .17, '#fc0', '#010066', .32); star(g, w * .34, h * .29, h * .1, '#fc0', 14, .45); },
  NG: (g, w, h) => stripes(g, w, h, ['#008751', '#fff', '#008751'], true),
  NL: (g, w, h) => stripes(g, w, h, ['#ae1c28', '#fff', '#21468b']),
  NO: (g, w, h) => nordic(g, w, h, '#ba0c2f', '#fff', '#00205b'),
  NP: (g, w, h) => {
    const fw = h * .82, ox = (w - fw) / 2, P = [[0, 0], [.95, .47], [.4, .47], [1, 1], [0, 1]];
    const path = () => { g.beginPath(); P.forEach(([a, b], k) => k ? g.lineTo(ox + a * fw, b * h) : g.moveTo(ox + a * fw, b * h)); g.closePath(); };
    g.lineJoin = 'miter'; path(); g.fillStyle = '#dc143c'; g.fill(); g.strokeStyle = '#003893'; g.lineWidth = Math.max(1.2, h * .07); g.stroke();
    crescent(g, ox + fw * .28, h * .25, h * .09, '#fff', '#dc143c', -.45); star(g, ox + fw * .28, h * .3, h * .06, '#fff', 8, .5);
    star(g, ox + fw * .28, h * .74, h * .12, '#fff', 12, .55);
  },
  NZ: (g, w, h) => { rect(g, '#012169', 0, 0, w, h); unionJack(g, 0, 0, w / 2, h / 2);
    [[.75, .22], [.65, .45], [.86, .42], [.75, .8]].forEach(([a, b]) => { star(g, w * a, h * b, h * .09, '#fff'); star(g, w * a, h * b, h * .06, '#c8102e'); }); },
  PH: (g, w, h) => { stripes(g, w, h, ['#0038a8', '#ce1126']); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, 0); g.lineTo(w * .45, h / 2); g.lineTo(0, h); g.fill(); disc(g, w * .15, h / 2, h * .09, '#fcd116'); },
  PK: (g, w, h) => { rect(g, '#01411c', 0, 0, w, h); rect(g, '#fff', 0, 0, w * .25, h); crescent(g, w * .62, h / 2, h * .26, '#fff', '#01411c', .32); star(g, w * .7, h * .42, h * .08, '#fff'); },
  PL: (g, w, h) => stripes(g, w, h, ['#fff', '#dc143c']),
  PT: (g, w, h) => { stripes(g, w, h, ['#006600', '#ff0000'], true, [2, 3]); disc(g, w * .4, h / 2, h * .2, '#ffcc00'); disc(g, w * .4, h / 2, h * .12, '#ff0000'); },
  QA: (g, w, h) => { rect(g, '#8a1538', 0, 0, w, h); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, 0); const n = 9;
    for (let k = 0; k <= n * 2; k++) g.lineTo(w * (k % 2 ? .38 : .3), h * k / (n * 2)); g.lineTo(0, h); g.closePath(); g.fill(); },
  SA: (g, w, h) => { rect(g, '#006c35', 0, 0, w, h); rect(g, '#fff', w * .22, h * .3, w * .56, h * .08); rect(g, '#fff', w * .25, h * .68, w * .5, h * .05); },
  SE: (g, w, h) => nordic(g, w, h, '#006aa7', '#fecc00'),
  SG: (g, w, h) => { stripes(g, w, h, ['#ef3340', '#fff']); crescent(g, w * .18, h * .25, h * .15, '#fff', '#ef3340', .35);
    [[.27, .15], [.33, .22], [.31, .32], [.23, .32], [.21, .22]].forEach(([a, b]) => star(g, w * a, h * b, h * .035, '#fff')); },
  TH: (g, w, h) => stripes(g, w, h, ['#a51931', '#f4f5f8', '#2d2a4a', '#f4f5f8', '#a51931'], false, [1, 1, 2, 1, 1]),
  TR: (g, w, h) => { rect(g, '#e30a17', 0, 0, w, h); crescent(g, w * .38, h / 2, h * .25, '#fff', '#e30a17', .26); star(g, w * .58, h / 2, h * .1, '#fff', 5, .4, Math.PI); },
  UA: (g, w, h) => stripes(g, w, h, ['#0057b7', '#ffd700']),
  US: (g, w, h) => { stripes(g, w, h, Array.from({ length: 13 }, (_, k) => k % 2 ? '#fff' : '#b22234')); rect(g, '#3c3b6e', 0, 0, w * .4, h * 7 / 13);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) disc(g, w * (.045 + c * .078), h * (.07 + r * .12), Math.max(.6, h * .025), '#fff'); },
  ZA: (g, w, h) => { rect(g, '#fff', 0, 0, w, h); rect(g, '#e03c31', 0, 0, w, h * .36); rect(g, '#001489', 0, h * .64, w, h * .36);
    const y = (lw, c) => { g.strokeStyle = c; g.lineWidth = lw; g.beginPath(); g.moveTo(-2, -h * .1); g.lineTo(w * .42, h / 2); g.lineTo(-2, h * 1.1); g.moveTo(w * .42, h / 2); g.lineTo(w + 2, h / 2); g.stroke(); };
    y(h * .34, '#fff'); y(h * .2, '#007749');
    g.fillStyle = '#ffb612'; g.beginPath(); g.moveTo(0, h * .14); g.lineTo(w * .32, h / 2); g.lineTo(0, h * .86); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.moveTo(0, h * .22); g.lineTo(w * .25, h / 2); g.lineTo(0, h * .78); g.fill(); }
};
PW.FLAG_NAMES = {
  AR: 'Argentina', AU: 'Australia', AT: 'Austria', AZ: 'Azerbaijan', BD: 'Bangladesh', BE: 'Belgium', BR: 'Brazil', CA: 'Canada', CH: 'Switzerland',
  CN: 'China', CO: 'Colombia', DE: 'Germany', DK: 'Denmark', EG: 'Egypt', ES: 'Spain', FI: 'Finland', FR: 'France', GB: 'United Kingdom', GH: 'Ghana',
  GR: 'Greece', HU: 'Hungary', ID: 'Indonesia', IE: 'Ireland', IN: 'India', IT: 'Italy', JM: 'Jamaica', JP: 'Japan', KE: 'Kenya', KR: 'South Korea',
  MA: 'Morocco', MC: 'Monaco', MX: 'Mexico', MY: 'Malaysia', NG: 'Nigeria', NL: 'Netherlands', NO: 'Norway', NP: 'Nepal', NZ: 'New Zealand',
  PH: 'Philippines', PK: 'Pakistan', PL: 'Poland', PT: 'Portugal', QA: 'Qatar', SA: 'Saudi Arabia', SE: 'Sweden', SG: 'Singapore', TH: 'Thailand',
  TR: 'Türkiye', UA: 'Ukraine', US: 'United States', ZA: 'South Africa'
};
PW.flagOptions = () => Object.entries(PW.FLAG_NAMES).sort((a, b) => a[1].localeCompare(b[1]));

/* Draw a flag into a rectangle. Unknown or empty codes draw nothing and return false. */
PW.drawFlag = function (g, code, x, y, w, h, border = true) {
  const f = D[code]; if (!f) return false;
  g.save(); g.translate(x, y);
  if (code !== 'NP') { g.beginPath(); g.rect(0, 0, w, h); g.clip(); }
  f(g, w, h);
  g.restore();
  if (border && code !== 'NP') { g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1; g.strokeRect(x + .5, y + .5, w - 1, h - 1); }
  return true;
};
const cache = new Map();
/* Data URL for <img> use; cached per code and size. */
PW.flagURL = function (code, w = 24, h = 16) {
  if (!D[code]) return '';
  const key = code + w + 'x' + h; if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'), s = 3; c.width = w * s; c.height = h * s;
  const g = c.getContext('2d'); g.scale(s, s); PW.drawFlag(g, code, 0, 0, w, h);
  const url = c.toDataURL(); cache.set(key, url); return url;
};
})();
