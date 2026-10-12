/* Safety net: if Lapwall fails to start (an old cached copy, damaged saved settings), show a way out
   instead of a blank screen. Also picks up a new version as soon as it is installed. */
(() => {
  const errors = [];
  addEventListener('error', e => errors.push(String(e.message || e.error || 'error')));
  addEventListener('load', () => setTimeout(() => {
    if (window.__pw || /[?&]capture\b/.test(location.search)) return;
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;inset:0;z-index:99;display:grid;place-items:center;background:#07090d;color:#eef2f8;font:16px/1.5 system-ui,sans-serif;padding:24px;text-align:center';
    const inner = document.createElement('div'); inner.style.maxWidth = '520px';
    const h = document.createElement('h1'); h.textContent = 'Lapwall could not start'; h.style.cssText = 'font-size:28px;margin:0 0 10px';
    const p = document.createElement('p'); p.textContent = 'This is usually an old saved copy of the app. Reload to get the latest version. If that does not help, reset (your saved settings and seasons are cleared).';
    const d = document.createElement('p'); d.textContent = errors.slice(0, 2).join(' · '); d.style.cssText = 'font:12px/1.4 monospace;color:#8a94a8';
    const btn = (t, fn) => { const b = document.createElement('button'); b.textContent = t; b.style.cssText = 'margin:6px;padding:12px 18px;font:600 13px system-ui;border-radius:6px;border:1px solid #ffd43b;background:#ffd43b;color:#07090d;cursor:pointer'; b.onclick = fn; return b; };
    const clearAll = async () => {
      try { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister())); } catch (e) { /* none */ }
      try { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } catch (e) { /* none */ }
    };
    inner.append(h, p, btn('Reload', async () => { await clearAll(); location.reload(); }),
      btn('Reset and reload', async () => { try { localStorage.removeItem('pitwall-settings'); } catch (e) { /* none */ } await clearAll(); location.reload(); }), d);
    box.appendChild(inner); document.body.appendChild(box);
  }, 2500));
  // a new version took over: reload once so every file comes from the same version
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        try { if (sessionStorage.getItem('lapwall-reloaded')) return; sessionStorage.setItem('lapwall-reloaded', '1'); } catch (e) { return; }
        location.reload();
      });
    }
  } catch (e) { /* no service worker */ }
})();
