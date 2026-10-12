/* Lapwall
   Core data. Every team, driver code and original circuit here is invented for this project. */
window.PW = window.PW || {};

PW.DEFAULT_TEAMS = [
  { name: 'Volta',      color: '#ff4a3d', color2: '#1b1f27' },
  { name: 'Aurora',     color: '#33b8ff', color2: '#0b2240' },
  { name: 'Kite',       color: '#ff9124', color2: '#20140a' },
  { name: 'Halcyon',    color: '#2fd780', color2: '#0b2a1b' },
  { name: 'Nimbus',     color: '#d3d8e4', color2: '#2a2f3a' },
  { name: 'Corsa Nera', color: '#8f72ff', color2: '#121018' },
  { name: 'Tidal',      color: '#19d3c5', color2: '#f2f4f8' },
  { name: 'Ember',      color: '#ffd43b', color2: '#1a1a1a' },
  { name: 'Rook',       color: '#ff5fae', color2: '#16202e' },
  { name: 'Granite',    color: '#4f7dff', color2: '#e8ecf4' }
];

/* Twenty fictional drivers; slot i drives for team floor(i / 2). Names, flags and numbers are editable in the app. */
PW.DEFAULT_DRIVERS = [
  { name: 'Luca Valenti',     flag: 'IT', num: 7 },  { name: 'Mika Korhonen',    flag: 'FI', num: 12 },
  { name: 'Daniel Meier',     flag: 'CH', num: 19 }, { name: 'Tobi Adeyemi',     flag: 'NG', num: 23 },
  { name: 'Andrés Solano',    flag: 'ES', num: 4 },  { name: 'Oliver Brookes',   flag: 'GB', num: 41 },
  { name: 'Liam Finnegan',    flag: 'IE', num: 9 },  { name: 'Ren Okada',        flag: 'JP', num: 66 },
  { name: 'Sofia Lund',       flag: 'SE', num: 15 }, { name: 'Arjun Ravi',       flag: 'IN', num: 30 },
  { name: 'Theo Tan',         flag: 'SG', num: 52 }, { name: 'Hugo Duval',       flag: 'FR', num: 8 },
  { name: 'Jake Ikerd',       flag: 'US', num: 26 }, { name: 'Mateo Moreno',     flag: 'MX', num: 71 },
  { name: 'Rafael Quintana',  flag: 'BR', num: 3 },  { name: 'Max Zeller',       flag: 'DE', num: 88 },
  { name: 'Pablo Navarro',    flag: 'AR', num: 21 }, { name: 'Ethan Wexford',    flag: 'AU', num: 14 },
  { name: 'Leo Yurek',        flag: 'PL', num: 37 }, { name: 'Diego Castro',     flag: 'PT', num: 60 }
];
/* Three-letter timing code from the surname, e.g. "Arun Pun" -> "PUN". */
PW.driverCode = name => {
  const parts = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().split(/\s+/);
  const last = (parts[parts.length - 1] || 'DRV').replace(/[^A-Za-z]/g, '');
  return (last.length >= 3 ? last : (parts.join('') + 'XXX')).slice(0, 3).toUpperCase();
};
/* Short display name: "A. Pun". */
PW.shortName = name => { const p = String(name || '').trim().split(/\s+/); return p.length > 1 ? p[0][0] + '. ' + p.slice(1).join(' ') : p[0] || ''; };
/* Saved settings are untrusted input: clamp every value to a known shape before it is used. */
const hex = (v, d) => /^#[0-9a-fA-F]{6}$/.test(v) ? v : d;
const txt = (v, d, n) => (typeof v === 'string' && v.trim() ? v.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n) : d);
PW.resolveTeams = S => PW.DEFAULT_TEAMS.map((t, i) => {
  const o = (S && Array.isArray(S.teams) && S.teams[i]) || {};
  return { name: txt(o.name, t.name, 16), color: hex(o.color, t.color), color2: hex(o.color2, t.color2) };
});
PW.resolveDrivers = S => PW.DEFAULT_DRIVERS.map((d, i) => {
  const o = (S && Array.isArray(S.drivers) && S.drivers[i]) || {};
  const flag = typeof o.flag === 'string' && (o.flag === '' || (PW.FLAG_NAMES && PW.FLAG_NAMES[o.flag]) || /^[A-Z]{2}$/.test(o.flag)) ? o.flag : d.flag;
  const num = Number.isInteger(+o.num) && +o.num >= 0 && +o.num <= 99 && o.num !== '' && o.num !== undefined ? +o.num : d.num;
  const name = txt(o.name, d.name, 24);
  return { name, flag, num, code: PW.driverCode(name) };
});
PW.POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

PW.TYRES = {
  S: { c: '#ff3b3b', base: 1.006,  deg: .0028, n: 'Softs' },
  M: { c: '#ffd21f', base: 1.0025, deg: .0015, n: 'Mediums' },
  H: { c: '#eef2f8', base: 1.0,    deg: .0009, n: 'Hards' },
  I: { c: '#2fd780', base: 1.0,    deg: .0012, n: 'Intermediates' }
};

/* Original circuits: control points in a 1.6 × 1 box, smoothed with a Catmull-Rom spline. */
PW.ORIGINAL_CIRCUITS = [
  { id: 'marina-lights', name: 'Marina Lights', place: 'Harbourfront · night street race', length: 4620, hue: '#38c6ff', kind: 'original',
    pts: [[.08,.80],[.50,.82],[.88,.80],[.92,.72],[.88,.62],[.60,.60],[.55,.52],[.60,.42],[.85,.40],[.90,.30],[.85,.18],[.55,.16],[.45,.22],[.40,.40],[.30,.48],[.15,.45],[.08,.55],[.06,.70]] },
  { id: 'kestrel-park', name: 'Kestrel Park', place: 'Lowland valley · parkland', length: 5180, hue: '#ff5a3c', kind: 'original',
    pts: [[.10,.70],[.30,.78],[.55,.80],[.80,.78],[.90,.65],[.85,.50],[.70,.48],[.62,.38],[.70,.25],[.62,.15],[.45,.18],[.38,.32],[.25,.30],[.15,.20],[.07,.35],[.12,.50]] },
  { id: 'highland-loop', name: 'Highland Loop', place: 'Northern moors · high speed', length: 5940, hue: '#46e08a', kind: 'original',
    pts: [[.10,.75],[.45,.85],[.80,.80],[.92,.60],[.85,.45],[.70,.50],[.58,.40],[.65,.25],[.88,.18],[.80,.08],[.50,.12],[.30,.18],[.28,.35],[.40,.45],[.30,.58],[.15,.55],[.06,.62]] },
  { id: 'dune-crescent', name: 'Dune Crescent', place: 'Coastal desert · twilight', length: 5310, hue: '#ffb23c', kind: 'original',
    pts: [[.15,.78],[.50,.84],[.85,.78],[.93,.55],[.85,.30],[.70,.22],[.55,.32],[.45,.22],[.30,.15],[.12,.22],[.07,.42],[.18,.52],[.30,.48],[.32,.62],[.10,.66]] }
];

/* Fictional car specs for the garage break. */
PW.CAR_SPECS = [
  ['Power unit', '1.6 L V6 turbo hybrid'],
  ['Output', '≈ 1,000 hp combined'],
  ['Minimum weight', '768 kg with driver'],
  ['Top speed', '345 km/h (simulated)'],
  ['Gearbox', '8-speed seamless shift'],
  ['Wheels', '18-inch, low profile']
];

/* General motorsport engineering facts shown during the garage break. */
PW.FACTS = [
  'A top pit crew can change all four tyres in around two seconds.',
  'At speed, a modern single-seater makes more downforce than its own weight.',
  'Drivers can lose two to three kilos of fluid in a hot race.',
  'Brake discs can glow past 1,000 °C under heavy braking.',
  'The steering wheel carries dozens of switches, dials and buttons.',
  'Braking from 300 km/h to a hairpin takes well under four seconds.',
  'Tyre temperature windows are narrow: too cold or too hot and grip falls away.',
  'Cars carry a halo bar over the cockpit to protect the driver’s head.'
];

PW.DEFAULT_SETTINGS = {
  mode: 'race',             // race | ambient
  rotation: 'all',          // all | original | real | custom | single
  single: 'marina-lights',
  laps: 12,
  lapSeconds: 24,           // real seconds per lap
  favTeam: -1,
  incidents: true,
  weather: 'auto',          // auto | dry | wet
  garage: true,
  pitcam: true,
  nightDim: false,
  dimFrom: 23, dimTo: 7,
  teams: null,              // overrides for name/color
  drivers: null,            // overrides for name/flag/num per slot
  season: { pts: [], wins: [], races: 0 },
  driveby: true,            // Zoom-by cars in ambient view
  drivebyMins: 4,
  drivebySpeed: 'cruise',   // fast | cruise | parade
  drivebyDriver: -1,        // -1 random, otherwise a driver slot
  mapStyle: 'circuit',      // circuit | neon
  mapZoom: 'normal',        // close | normal | wide
  weekendSync: true,        // follow the real race calendar
  players: [],              // fantasy league: { name, a, b }
  format: 'standard',       // standard | reverse | elimination
  cup: null,                // elimination cup state { alive: [slots], round, champs: [] }
  view: 'map',              // map | chase | onboard
  camCar: 0,                // -1 leader, otherwise a driver slot
  locator: 'auto',          // auto | on | off
  career: { on: false },
  reminders: { water: true, waterMins: 60, stretch: false, stretchMins: 90, eyes: false, eyesMins: 30, custom: '', customMins: 0 },
  custom: []                // imported tracks
};
