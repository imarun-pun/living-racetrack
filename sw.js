/* Offline cache so an installed Lapwall keeps running without Wi-Fi. */
const CACHE = 'lapwall-v13';
const FILES = ['./', './index.html', './css/fonts.css', './css/style.css',
  './fonts/saira-condensed-latin-500-normal.woff2', './fonts/saira-condensed-latin-700-normal.woff2', './fonts/saira-condensed-latin-800-normal.woff2',
  './fonts/saira-latin-400-normal.woff2', './fonts/saira-latin-500-normal.woff2', './fonts/saira-latin-600-normal.woff2',
  './fonts/jetbrains-mono-latin-400-normal.woff2', './fonts/jetbrains-mono-latin-600-normal.woff2', './manifest.webmanifest', './icons/icon.svg',
  './js/boot.js', './js/capture.js', './js/data.js', './js/flags.js', './js/tracks-real.js', './js/circuit.js', './js/sim.js', './js/render.js', './js/pitcam.js', './js/garage.js', './js/carside.js', './js/driveby.js', './js/main.js',
  './js/share.js', './js/celebrate.js', './js/world.js', './js/locator.js', './js/calendar.js', './js/onboard.js', './js/telemetry.js', './js/sync.js', './js/story.js', './stream.html', './js/stream.js', './css/stream.css', './play.html', './js/play.js', './js/live.js', './css/play.css', './room.html', './js/room.js', './js/send.js', './js/go.js', './js/vendor/qrcode.js',
  './send.html', './go.html', './z/', './js/forward.js', './css/share.css'];
// Install: fetch fresh copies (never from the browser's HTTP cache), so a cache never mixes two versions.
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(new Request(f, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
// Network first: always the latest version when online; the saved copy only when offline.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
