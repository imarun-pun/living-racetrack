/* Offline cache so an installed Pit Wall keeps running without Wi-Fi. */
const CACHE = 'pitwall-v5';
const FILES = ['./', './index.html', './css/fonts.css', './css/style.css',
  './fonts/saira-condensed-latin-500-normal.woff2', './fonts/saira-condensed-latin-700-normal.woff2', './fonts/saira-condensed-latin-800-normal.woff2',
  './fonts/saira-latin-400-normal.woff2', './fonts/saira-latin-500-normal.woff2', './fonts/saira-latin-600-normal.woff2',
  './fonts/jetbrains-mono-latin-400-normal.woff2', './fonts/jetbrains-mono-latin-600-normal.woff2', './manifest.webmanifest', './icons/icon.svg',
  './js/data.js', './js/flags.js', './js/tracks-real.js', './js/circuit.js', './js/sim.js', './js/render.js', './js/pitcam.js', './js/garage.js', './js/driveby.js', './js/main.js',
  './js/share.js', './js/celebrate.js', './js/world.js', './js/locator.js', './js/calendar.js', './js/send.js', './js/go.js', './js/vendor/qrcode.js',
  './send.html', './go.html', './css/share.css'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok && new URL(e.request.url).origin === location.origin) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => hit)));
});
