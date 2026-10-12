/* Living Racetrack · Pit Wall
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

PW.CODES = ['VAL','KOR','MEI','ADE','SOL','BRK','FIN','OKA','LUN','RAV','TAN','DUV','IKE','MOR','QUI','ZEL','NAV','WEX','YUR','CAS'];
PW.NUMBERS = [7, 12, 19, 23, 4, 41, 9, 66, 15, 30, 52, 8, 26, 71, 3, 88, 21, 14, 37, 60];

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
  custom: []                // imported tracks
};
