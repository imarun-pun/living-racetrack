/* Zoomed-out locator: where in the world this circuit is. Equirectangular world from PW.WORLD. */
window.PW = window.PW || {};
PW.drawLocator = function (canvas, lat, lon, color) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = canvas.clientWidth, H = canvas.clientHeight;
  if (!W || !H) return;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  const g = canvas.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  // frame the world from 60°S to 75°N so land fills the box
  const top = 75, bot = -60, X = lo => (lo + 180) / 360 * W, Y = la => (top - la) / (top - bot) * H;
  g.fillStyle = 'rgba(10,14,20,.85)'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(200,215,240,.06)'; g.lineWidth = 1;
  for (let lo = -150; lo <= 150; lo += 30) { g.beginPath(); g.moveTo(X(lo), 0); g.lineTo(X(lo), H); g.stroke(); }
  for (let la = -30; la <= 60; la += 30) { g.beginPath(); g.moveTo(0, Y(la)); g.lineTo(W, Y(la)); g.stroke(); }
  g.fillStyle = 'rgba(160,178,205,.32)';
  for (const r of PW.WORLD || []) {
    g.beginPath();
    for (let k = 0; k < r.length; k += 2) { const x = X(r[k]), y = Y(r[k + 1]); k ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.closePath(); g.fill();
  }
  if (typeof lat !== 'number' || typeof lon !== 'number') return;
  const px = X(lon), py = Y(lat);
  g.strokeStyle = color; g.lineWidth = 1;
  g.globalAlpha = .5; g.beginPath(); g.moveTo(px, 0); g.lineTo(px, H); g.moveTo(0, py); g.lineTo(W, py); g.stroke(); g.globalAlpha = 1;
  g.beginPath(); g.arc(px, py, 7, 0, 6.29); g.stroke();
  g.fillStyle = color; g.beginPath(); g.arc(px, py, 3, 0, 6.29); g.fill();
};
PW.fmtCoord = (lat, lon) => `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}  ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
