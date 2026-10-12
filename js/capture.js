/* Video capture mode (index.html?capture): the page's clock only moves when the recorder steps it,
   so every frame of a TV video is exact however slowly it is captured. Does nothing otherwise. */
(() => {
  if (!/[?&]capture\b/.test(location.search)) return;
  let t = 0; const frames = [], timers = [];
  performance.now = () => t;
  window.requestAnimationFrame = cb => { frames.push(cb); return frames.length; };
  window.cancelAnimationFrame = () => {};
  const realSetTimeout = window.setTimeout.bind(window);
  window.setTimeout = (cb, ms = 0, ...a) => { if (typeof cb !== 'function') return 0; timers.push({ at: t + (+ms || 0), cb, a }); return timers.length; };
  window.__capture = {
    step(ms) {
      t += ms;
      for (let k = timers.length - 1; k >= 0; k--) if (timers[k].at <= t) { const x = timers.splice(k, 1)[0]; try { x.cb(...x.a); } catch (e) { console.error(e); } }
      const run = frames.splice(0); run.forEach(cb => { try { cb(t); } catch (e) { console.error(e); } });
      return t;
    },
    realSetTimeout
  };
})();
