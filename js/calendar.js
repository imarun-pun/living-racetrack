/* Real race-weekend calendar (dates and places only). When a real race weekend is on,
   Lapwall can switch to that circuit's replica and show a countdown. Update once a year.
   Source: the published 2026 world championship calendar. Dates are Friday to Sunday, local. */
window.PW = window.PW || {};
PW.CALENDAR = [
  { from: '2026-03-06', to: '2026-03-08', track: 'au-1953', place: 'Melbourne' },
  { from: '2026-03-13', to: '2026-03-15', track: 'cn-2004', place: 'Shanghai' },
  { from: '2026-03-27', to: '2026-03-29', track: 'jp-1962', place: 'Suzuka' },
  { from: '2026-04-10', to: '2026-04-12', track: 'bh-2002', place: 'Sakhir' },
  { from: '2026-04-17', to: '2026-04-19', track: 'sa-2021', place: 'Jeddah' },
  { from: '2026-05-01', to: '2026-05-03', track: 'us-2022', place: 'Miami' },
  { from: '2026-05-22', to: '2026-05-24', track: 'ca-1978', place: 'Montreal' },
  { from: '2026-06-05', to: '2026-06-07', track: 'mc-1929', place: 'Monaco' },
  { from: '2026-06-12', to: '2026-06-14', track: 'es-1991', place: 'Barcelona' },
  { from: '2026-06-26', to: '2026-06-28', track: 'at-1969', place: 'Spielberg' },
  { from: '2026-07-03', to: '2026-07-05', track: 'gb-1948', place: 'Silverstone' },
  { from: '2026-07-17', to: '2026-07-19', track: 'be-1925', place: 'Spa-Francorchamps' },
  { from: '2026-07-24', to: '2026-07-26', track: 'hu-1986', place: 'Budapest' },
  { from: '2026-08-21', to: '2026-08-23', track: 'nl-1948', place: 'Zandvoort' },
  { from: '2026-09-04', to: '2026-09-06', track: 'it-1922', place: 'Monza' },
  { from: '2026-09-11', to: '2026-09-13', track: 'es-2026', place: 'Madrid' },
  { from: '2026-09-24', to: '2026-09-26', track: 'az-2016', place: 'Baku' },
  { from: '2026-10-09', to: '2026-10-11', track: 'sg-2008', place: 'Singapore' },
  { from: '2026-10-23', to: '2026-10-25', track: 'us-2012', place: 'Austin' },
  { from: '2026-10-30', to: '2026-11-01', track: 'mx-1962', place: 'Mexico City' },
  { from: '2026-11-06', to: '2026-11-08', track: 'br-1940', place: 'São Paulo' },
  { from: '2026-11-19', to: '2026-11-21', track: 'us-2023', place: 'Las Vegas' },
  { from: '2026-11-27', to: '2026-11-29', track: 'qa-2004', place: 'Lusail' },
  { from: '2026-12-04', to: '2026-12-06', track: 'ae-2009', place: 'Yas Marina' }
];
(() => {
  const day = d => { const t = new Date(d); return new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime(); };
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
  /* The weekend happening now, if any. */
  PW.weekendNow = (now = Date.now()) => PW.CALENDAR.find(e => day(now) >= parse(e.from) && day(now) <= parse(e.to)) || null;
  /* The next weekend that has not started yet, with whole days to go. */
  PW.weekendNext = (now = Date.now()) => {
    const e = PW.CALENDAR.find(e => parse(e.from) > day(now));
    return e ? { ...e, days: Math.round((parse(e.from) - day(now)) / 86400000) } : null;
  };
  PW.weekendLabel = e => {
    const f = new Date(parse(e.from)), t = new Date(parse(e.to));
    const m = d => d.toLocaleDateString([], { month: 'short' });
    return `${e.place} · ${m(f)} ${f.getDate()}–${m(t) === m(f) ? '' : m(t) + ' '}${t.getDate()}`;
  };
})();
