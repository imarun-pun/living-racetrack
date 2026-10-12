/* Circuit geometry: spline → equal-spaced samples → curvature → speed profile → corners. */
window.PW = window.PW || {};
(() => {
const N = 1600, VMAX = 86, ALAT = 30, ACC = 11, BRAKE = 45;
const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
PW.N = N;
PW.mod = (a, b) => ((a % b) + b) % b;

function spline(P, per) {
  const n = P.length, raw = [];
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    for (let j = 0; j < per; j++) {
      const t = j / per, t2 = t * t, t3 = t2 * t;
      const f = k => .5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      raw.push([f(0), f(1)]);
    }
  }
  return raw;
}

PW.buildCircuit = function (def) {
  const real = def.kind !== 'original';
  let P = def.pts.map(([x, y]) => real ? [x, y] : [x * 1.6, y]);
  // drop near-duplicate points (they make spline kinks)
  if (real) P = P.filter((p, i) => { const q = P[(i - 1 + P.length) % P.length]; return i === 0 || Math.hypot(p[0] - q[0], p[1] - q[1]) > 2; });
  const raw = spline(P, real ? 12 : 40), m = raw.length, cum = [0];
  for (let i = 1; i <= m; i++) { const a = raw[i - 1], b = raw[i % m]; cum[i] = cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]); }
  const Ld = cum[m], L = def.length || Ld, ds = L / N;
  let X = new Float64Array(N), Y = new Float64Array(N);
  for (let i = 0, seg = 0; i < N; i++) {
    const tg = i / N * Ld;
    while (cum[seg + 1] < tg) seg++;
    const f = (tg - cum[seg]) / (cum[seg + 1] - cum[seg] || 1), a = raw[seg], b = raw[(seg + 1) % m];
    X[i] = a[0] + (b[0] - a[0]) * f; Y[i] = a[1] + (b[1] - a[1]) * f;
  }
  // light positional smoothing for surveyed layouts
  if (real) for (let p = 0; p < 2; p++) {
    const x = X.slice(), y = Y.slice();
    for (let i = 0; i < N; i++) { let sx = 0, sy = 0; for (let d = -2; d <= 2; d++) { sx += x[(i + d + N) % N]; sy += y[(i + d + N) % N]; } X[i] = sx / 5; Y[i] = sy / 5; }
  }
  const K = new Float64Array(N), A = new Float64Array(N);
  for (let i = 0; i < N; i++) A[i] = Math.atan2(Y[(i + 1) % N] - Y[(i - 1 + N) % N], X[(i + 1) % N] - X[(i - 1 + N) % N]);
  for (let i = 0; i < N; i++) K[i] = wrapA(A[(i + 1) % N] - A[(i - 1 + N) % N]) / (2 * ds); // per metre: angle is scale-free, ds is metres
  const passes = real ? 6 : 4;
  for (let p = 0; p < passes; p++) { const c = K.slice(); for (let i = 0; i < N; i++) { let s = 0; for (let d = -3; d <= 3; d++) s += c[(i + d + N) % N]; K[i] = s / 7; } }

  // Start line: real layouts start at their first point; original ones start on the longest straight
  let s0 = 0;
  if (!real) {
    let best = 0, bestStart = 0, run = 0, runStart = 0;
    for (let i = 0; i < 2 * N; i++) {
      if (Math.abs(K[i % N]) < 1 / 500) { if (run === 0) runStart = i; run++; if (run > best && run <= N) { best = run; bestStart = runStart; } } else run = 0;
    }
    s0 = (bestStart + Math.floor(best * .65)) % N;
  }
  if (def.reverse) { X = X.reverse(); Y = Y.reverse(); K.reverse(); for (let i = 0; i < N; i++) K[i] = -K[i]; }
  const rot = arr => { const o = new Float64Array(N); for (let i = 0; i < N; i++) o[i] = arr[(i + s0) % N]; return o; };
  const Xr = rot(X), Yr = rot(Y), Kr = rot(K);
  const sc = L / Ld;
  for (let i = 0; i < N; i++) { Xr[i] *= sc; Yr[i] *= sc; }

  const V = new Float64Array(N);
  for (let i = 0; i < N; i++) V[i] = Math.min(VMAX, Math.sqrt(ALAT / Math.max(Math.abs(Kr[i]), 1e-6)));
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < 2 * N; i++) { const a = i % N, b = (i + 1) % N; V[b] = Math.min(V[b], Math.sqrt(V[a] * V[a] + 2 * ACC * ds)); }
    for (let i = 2 * N; i > 0; i--) { const a = i % N, b = (i - 1) % N; V[b] = Math.min(V[b], Math.sqrt(V[a] * V[a] + 2 * BRAKE * ds)); }
  }
  let T = 0, turn = 0; for (let i = 0; i < N; i++) { T += ds / V[i]; turn += Kr[i] * ds; }

  const peaks = [];
  for (let i = 0; i < N; i++) {
    const k = Math.abs(Kr[i]); if (k < 1 / 220) continue;
    let isMax = true; for (let d = -18; d <= 18 && isMax; d++) if (d && Math.abs(Kr[(i + d + N) % N]) > k) isMax = false;
    if (isMax) peaks.push(i);
  }
  const corners = [];
  for (const p of peaks) { const last = corners[corners.length - 1]; if (last !== undefined && (p - last) * ds < 110) { if (Math.abs(Kr[p]) > Math.abs(Kr[last])) corners[corners.length - 1] = p; } else corners.push(p); }
  if (corners.length > 1 && (corners[0] + N - corners[corners.length - 1]) * ds < 110) corners.pop();
  // pit straight must be long enough; otherwise shorten the pit lane window
  return { def, L, ds, X: Xr, Y: Yr, K: Kr, V, T, corners, inside: Math.sign(turn) || 1 };
};

/* Turn an imported file into a circuit definition.
   Accepts GeoJSON (Feature, FeatureCollection, LineString, Polygon) with lon/lat,
   or a plain JSON array of [x, y] points in metres. */
PW.parseTrackFile = function (text, fallbackName) {
  const j = JSON.parse(text);
  let coords = null, props = {};
  const fromGeom = g => g && (g.type === 'LineString' ? g.coordinates : g.type === 'Polygon' ? g.coordinates[0] : g.type === 'MultiLineString' ? g.coordinates[0] : null);
  if (Array.isArray(j)) coords = { xy: j };
  else if (j.type === 'FeatureCollection') { const f = j.features.find(f => fromGeom(f.geometry)); if (f) { coords = { ll: fromGeom(f.geometry) }; props = f.properties || {}; } }
  else if (j.type === 'Feature') { coords = { ll: fromGeom(j.geometry) }; props = j.properties || {}; }
  else if (j.type) coords = { ll: fromGeom(j) };
  else if (Array.isArray(j.points)) { coords = { xy: j.points }; props = j; }
  if (!coords || !(coords.ll || coords.xy) || (coords.ll || coords.xy).length < 8) throw new Error('No track line with at least 8 points found in this file.');
  let pts;
  if (coords.ll) {
    let c = coords.ll; if (c[0][0] === c[c.length - 1][0] && c[0][1] === c[c.length - 1][1]) c = c.slice(0, -1);
    const lat0 = c.reduce((s, p) => s + p[1], 0) / c.length, lon0 = c.reduce((s, p) => s + p[0], 0) / c.length;
    pts = c.map(p => [(p[0] - lon0) * 111320 * Math.cos(lat0 * Math.PI / 180), -(p[1] - lat0) * 110540]);
  } else pts = coords.xy.map(p => [+p[0], +p[1]]);
  let len = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; len += Math.hypot(b[0] - a[0], b[1] - a[1]); }
  if (!(len > 500)) throw new Error('The track is shorter than 500 m. Check that coordinates are longitude/latitude or metres.');
  const name = props.Location || props.name || props.Name || fallbackName || 'Custom track';
  return { id: 'custom-' + Date.now().toString(36), name, place: 'Imported layout', length: Math.round(props.length || len), hue: '#ff6fb1', kind: 'custom',
    pts: pts.map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]) };
};
})();
