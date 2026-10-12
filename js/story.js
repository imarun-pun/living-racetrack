/* Story mode: Road to the Grid.
   From a rented kart to the Grand Prix World Series: train, race, sign sponsors, recruit a crew, and deal with a
   mentor, a rival, a team boss and the press. Every race is a real Lapwall race with you in it, and you call the
   strategy from the pit wall (push, save tyres, box, boost). Progress is saved in this browser.
   All characters, teams and series are made up for Lapwall. */
window.PW = window.PW || {};
(() => {
const KEY = 'lapwall-story';
const $ = id => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const money = n => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');

// ---------- the world ----------
const TIERS = [
  { id: 'kart', name: 'Kart Cup', races: 3, laps: 6, pool: 'original', prize: 1200, cost: 300, seat: 0,
    teams: ['Volt Karting', 'Apex Kids', 'Ridgeway', 'Blue Comet', 'Corsa Junior', 'Lumen', 'Sprocket', 'Hilltop', 'Matos Motors', 'Varga School'], mate: 'Leo Fontaine' },
  { id: 'junior', name: 'Junior Single-Seater Series', races: 4, laps: 6, pool: 'real', prize: 5000, cost: 1200, seat: 60000,
    teams: ['Bellandi Junior', 'Arrowline', 'Comet Academy', 'Brandt Junior', 'Sable', 'Kestrel', 'Northfield', 'Duna', 'Pioneer', 'Redline'], mate: 'Mina Park' },
  { id: 'rising', name: 'Rising Series', races: 4, laps: 8, pool: 'real', prize: 14000, cost: 3500, seat: 220000,
    teams: ['Bellandi', 'Arrowline', 'Vortex', 'Brandt Racing', 'Sable', 'Kestrel', 'Helix', 'Duna', 'Quartz', 'Redline'], mate: 'Omar Siddiq' },
  { id: 'feeder', name: 'Feeder Championship', races: 4, laps: 8, pool: 'real', prize: 38000, cost: 9000, seat: 650000,
    teams: ['Bellandi', 'Arrowline', 'Vortex', 'Brandt Racing', 'Sable', 'Kestrel', 'Helix', 'Orbis', 'Quartz', 'Monarch'], mate: 'Lena Hart' },
  { id: 'gp', name: 'Grand Prix World Series', races: 6, laps: 12, pool: 'real', prize: 160000, cost: 25000, seat: 0,
    teams: ['Vanta', 'Aurelia', 'Meridian', 'Brandt Motorsport', 'Halcyon', 'Sable GP', 'Orbis', 'Kite', 'Nimbus', 'Bellandi GP'], mate: 'Rafael Quintana' }
];
const CAST = {
  ines: ['Ines Varga', 'Mentor · former racer', '#ffd43b'],
  kai: ['Kai Brandt', 'Your rival', '#ff4a3d'],
  marco: ['Marco Bellandi', 'Team principal', '#4c7dff'],
  dana: ['Dana Okafor', 'Motorsport journalist', '#2fd780'],
  rui: ['Rui Matos', 'Mechanic', '#ff8a00'],
  priya: ['Priya Nair', 'Data analyst', '#a855f7'],
  north: ['Northwind Energy', 'Sponsor', '#38c6ff'],
  vanta: ['Elise Marchetti', 'Vanta team principal', '#d3d8e4'],
  you: ['You', '', '#eef2f8']
};
const SKILLS = [['pace', 'Pace'], ['racecraft', 'Racecraft'], ['tyres', 'Tyre care'], ['wet', 'Wet driving'], ['fitness', 'Fitness']];
const TRAINING = [
  { id: 'sim', name: 'Simulator night', skill: 'pace', mult: 1, text: 'Two hundred laps of braking points until they are muscle memory.' },
  { id: 'drills', name: 'Racecraft drills with Ines', skill: 'racecraft', mult: 1, text: 'Side by side into the hairpin, again and again. Ines does not let you win.' },
  { id: 'stint', name: 'Long-run tyre stint', skill: 'tyres', mult: 1, text: 'Thirty laps on one set. You learn to hear the tyres before they go.' },
  { id: 'wet', name: 'Wet track day', skill: 'wet', mult: 1.6, text: 'A sprinkler-soaked skid pad and a lot of spinning.' },
  { id: 'gym', name: 'Gym and reaction work', skill: 'fitness', mult: .5, text: 'Neck harness, reaction lights, ice bath. Your body is the chassis too.' }
];
const CREW = {
  engineer: { name: 'Race engineer', effect: 'More pace from the car', people: [['Tomas Weller', 1], ['Hana Ito', 2], ['Sergio Lanza', 3]] },
  mechanic: { name: 'Chief mechanic', effect: 'Faster, safer pit stops', people: [['Rui Matos', 1], ['Sam Okoro', 2], ['Elif Demir', 3]] },
  strategist: { name: 'Strategist', effect: 'Radio calls: when to box and push', people: [['Nell Ashby', 1], ['Victor Hale', 2], ['June Takeda', 3]] },
  analyst: { name: 'Data analyst', effect: 'Unlocks telemetry, faster learning', people: [['Priya Nair', 2], ['Jonas Berg', 1], ['Ama Mensah', 3]] }
};
const SPONSORS = {
  matos: { name: 'Matos Motors', pay: 400, need: 10 },
  north: { name: 'Northwind Energy', pay: 30000, need: 6 },
  orbit: { name: 'Orbit Watches', pay: 120000, need: 8 }
};

// ---------- the story: scenes play in order when their moment comes ----------
// when: 'start' (new story), 'pre' (before a race), 'post' (after a race), 'season' (after the last race of a season)
const SCENES = [
  { id: 'intro', when: 'start', title: 'The kart track', lines: [
      ['ines', 'You are the one who keeps sneaking in after closing to watch the karts. {first}, right?'],
      ['ines', 'I raced for nine seasons. Never won a title. I run this school now, and I can spot someone who wants it. Why do you want it?']],
    choices: [
      { t: 'I want to win. Everything.', fx: s => { s.skills.racecraft += 4; s.flags.hungry = 1; }, after: 'Ines nods slowly. "Winners are made of the races they lose. You will lose plenty first."' },
      { t: 'I want to learn how the fast ones do it.', fx: s => { s.skills.tyres += 4; s.trust += 5; }, after: '"Good answer," says Ines. "Most kids only want the trophy."' },
      { t: 'Everyone says I cannot. I want to prove them wrong.', fx: s => { s.skills.pace += 4; s.rep += 2; }, after: '"Anger is fuel," Ines says. "Just do not let it drive."' }] },
  { id: 'meetkai', when: 'start', title: 'The boy with the factory kart', lines: [
      ['kai', 'Nice rental. I am Kai. Kai Brandt. Yes, that Brandt. My dad\'s team builds my chassis.'],
      ['kai', 'Try to stay out of my mirrors on Sunday.']],
    choices: [
      { t: 'Shake his hand. "See you out there."', fx: s => { s.kai += 10; s.rep += 1; }, after: 'Kai looks surprised, then grins. "Huh. Fine. See you out there."' },
      { t: 'Ignore him and keep working on your kart.', fx: s => { s.trust += 4; }, after: 'Ines, from across the garage: "Good. Let the stopwatch talk."' },
      { t: '"Mirrors? You will be watching my rear bumper."', fx: s => { s.kai -= 15; s.rep += 4; }, after: 'A few kids laugh. Kai does not. You have made an enemy, and a name.' }] },
  { id: 'firstdebrief', when: 'post', cond: s => s.tier === 0 && s.race === 1, title: 'Debrief', lines: [
      ['ines', '{lastpos_line}'],
      ['ines', 'Every week you get one training session. Choose it like a race strategy: what costs you the most time?']] },
  { id: 'rui', when: 'pre', cond: s => s.tier === 0 && s.race === 2, title: 'A tired engine', lines: [
      ['rui', 'Your engine sounds like a coffee grinder. I am Rui, from Matos Motors down the road.'],
      ['rui', 'Put our logo on your helmet and I will keep this thing alive. Small money, but honest.']],
    choices: [
      { t: 'Deal. Matos Motors on the helmet.', fx: s => { s.sponsor = 'matos'; s.crew.mechanic = 1; s.crewName.mechanic = 'Rui Matos'; }, after: 'Rui joins your crew as mechanic, and Matos Motors pays a little every race.' },
      { t: 'No thanks, I will manage.', fx: s => { s.money += 300; s.trust -= 2; }, after: 'You sell your old helmet to buy a spark plug. It works. Just about.' }] },
  { id: 'promo1', when: 'season', cond: s => s.promotedFrom === 0, title: 'A phone call from Bellandi', lines: [
      ['marco', 'Marco Bellandi. I run Bellandi Junior. I watched your Kart Cup. Rough, but fast.'],
      ['marco', 'I have a seat in the Junior Single-Seater Series. My cars are quick and my rules are simple: beat your teammate, every time.'],
      ['ines', 'There is also Sable. Slower car, nobody shouting at you. Your choice.']],
    choices: [
      { t: 'Sign for Bellandi Junior (fast car, high pressure)', fx: s => { s.team = 0; s.carRank = 2; s.flags.bellandi = 1; }, after: 'You sign. Marco hands you a pen and a warning: "Second place is the first loser in my garage."' },
      { t: 'Sign for Sable (slower car, freedom)', fx: s => { s.team = 4; s.carRank = 6; s.trust += 5; s.skills.racecraft += 3; }, after: 'Sable\'s team boss shrugs: "We are not fast, but we are fun." Ines approves.' }] },
  { id: 'dana1', when: 'post', cond: s => s.tier === 1 && s.race === 2, title: 'The first interview', lines: [
      ['dana', 'Dana Okafor, Grid Weekly. People are starting to talk about you. Is {first} the next big thing?']],
    choices: [
      { t: '"I am just here to learn and enjoy it."', fx: s => { s.rep += 3; s.trust += 3; }, after: 'Dana smiles. "Humble. Readers like that."' },
      { t: '"Ask Kai Brandt. He has been looking at my gearbox all season."', fx: s => { s.rep += 7; s.kai -= 12; }, after: 'The headline writes itself. Kai\'s father calls Marco the same evening.' }] },
  { id: 'priya', when: 'pre', cond: s => s.tier === 2 && s.race === 0, title: 'The data', lines: [
      ['priya', 'Hi. Priya Nair. I did your lap data for fun. You lose a tenth in every slow corner by braking too early.'],
      ['priya', 'Hire me and you will see everything: speed traces, mini-sectors, who is faster where.']],
    choices: [
      { t: 'Hire Priya as your data analyst', fx: s => { s.crew.analyst = 2; s.crewName.analyst = 'Priya Nair'; }, after: 'Priya joins. Telemetry is now unlocked in your races (press T).' },
      { t: 'Not yet, money is tight', fx: s => { s.money += 0; }, after: 'Priya leaves her number. "When you are ready." You can hire her any time from Crew.' }] },
  { id: 'clash', when: 'post', cond: s => s.tier === 2 && s.race === 2, title: 'Contact', lines: [
      ['you', 'Kai squeezed you into the wall at turn one. Your front wing is in three pieces.'],
      ['kai', 'Racing incident. Maybe brake later next time.'],
      ['ines', 'The stewards will listen if you complain. So will the cameras.']],
    choices: [
      { t: 'Report him to the stewards', fx: s => { s.rep -= 2; s.kai -= 10; s.money += 3000; }, after: 'Kai gets a fine. Your team gets a cheque for the wing. The paddock calls you a snitch for a week.' },
      { t: 'Say nothing. Beat him on track.', fx: s => { s.trust += 8; s.skills.racecraft += 3; s.flags.revenge = 1; }, after: 'Ines puts a hand on your shoulder. "That is how champions answer."' },
      { t: 'Confront him in the paddock', fx: s => { s.rep += 5; s.kai -= 20; s.skills.fitness -= 2; }, after: 'It gets loud. It gets filmed. Ten million views by morning.' }] },
  { id: 'north', when: 'pre', cond: s => s.tier === 3 && s.race === 0, title: 'Northwind calls', lines: [
      ['north', 'Northwind Energy would like to put you on our cans. $30,000 a race.'],
      ['north', 'One condition: top six, every race. Miss it twice and we walk.'],
      ['ines', 'Big money buys big pressure. Think about it.']],
    choices: [
      { t: 'Sign with Northwind', fx: s => { s.sponsor = 'north'; s.strikes = 0; }, after: 'Your car turns electric blue. So does your bank balance.' },
      { t: 'Stay with what you have', fx: s => { s.trust += 4; }, after: 'Ines: "Smart. Win first, get paid later."' }] },
  { id: 'vanta', when: 'season', cond: s => s.promotedFrom === 3, title: 'The test', lines: [
      ['vanta', 'Elise Marchetti, Vanta. We need a driver for the Grand Prix World Series next year.'],
      ['vanta', 'Brandt Motorsport wants you too. Apparently Kai\'s father likes winners, even ones who annoy his son.'],
      ['marco', 'And Bellandi GP is new, slow, and would build the whole team around you.']],
    choices: [
      { t: 'Vanta (front of the grid, demanding)', fx: s => { s.team = 0; s.carRank = 1; }, after: 'Elise: "Welcome to Vanta. We do not do second."' },
      { t: 'Brandt Motorsport (team-mate to Kai!)', fx: s => { s.team = 3; s.carRank = 2; s.flags.mateKai = 1; s.kai += 5; }, after: 'Kai: "So we share a garage now. Do not touch my coffee."' },
      { t: 'Bellandi GP (slow car, all yours)', fx: s => { s.team = 9; s.carRank = 7; s.trust += 10; s.money += 200000; }, after: 'Marco: "Build it with me. When we win, it will mean more."' }] },
  { id: 'gpdebut', when: 'pre', cond: s => s.tier === 4 && s.race === 0 && s.season === 1, title: 'Grand Prix debut', lines: [
      ['ines', 'Ten years ago I could not get you into a rental kart without a waiver. Look at you.'],
      ['dana', 'Live on Grid Weekly: rookie {name}, against Kai Brandt again. The grudge match of the year.'],
      ['ines', 'Breathe. Same race as always. Lights out, and away you go.']] },
  { id: 'orders', when: 'pre', cond: s => s.tier === 4 && s.race === 3 && s.season === 1, title: 'Team orders', lines: [
      ['ines', 'Your team-mate is fighting for a contract. The team asks you to let him past if you are ahead.']],
    choices: [
      { t: 'Agree. Team first.', fx: s => { s.trust += 6; s.rep += 2; }, after: 'The garage remembers who helped. That is worth something later.' },
      { t: 'Refuse. You race to win.', fx: s => { s.rep += 5; s.trust -= 4; }, after: 'Cold looks at breakfast. But the fans love it.' }] },
  { id: 'champion', when: 'season', cond: s => s.tier === 4 && s.titles > 0 && !s.flags.champScene, title: 'World Champion', lines: [
      ['dana', 'From a rented kart to World Champion. {name}, how does it feel?'],
      ['ines', 'I never won a title. Now I do not need to.'],
      ['kai', 'Next year, Brandt takes it back. Enjoy it while it lasts, champ.']],
    choices: [{ t: 'Defend the title next season', fx: s => { s.flags.champScene = 1; }, after: 'The story goes on. Every season from here is a title defence.' }] }
];

// ---------- state ----------
let st = null, host = null, raceCtx = null;
const load = () => { try { const j = JSON.parse(localStorage.getItem(KEY) || 'null'); return j && j.v === 1 ? j : null; } catch (e) { return null; } };
const save = () => { try { if (st) localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* storage unavailable */ } };
function fresh(name, flag, num) {
  return { v: 1, name, flag, num, tier: 0, race: 0, season: 1, week: 1, money: 1500, rep: 5, trust: 50, kai: 0, team: 9, carRank: 6,
    skills: { pace: 38, racecraft: 34, tyres: 36, wet: 30, fitness: 40 }, crew: { engineer: 0, mechanic: 0, strategist: 0, analyst: 0 }, crewName: {},
    sponsor: null, strikes: 0, pts: {}, seen: {}, flags: {}, trainedWeek: 0, titles: 0, history: [], last: null, promoted: false };
}
const tier = () => TIERS[st.tier];
const first = () => String(st.name).split(/\s+/)[0];
const skillAvg = () => st.skills.pace * .4 + st.skills.racecraft * .2 + st.skills.tyres * .15 + st.skills.wet * .1 + st.skills.fitness * .15;
const clampSkills = () => { for (const [k] of SKILLS) st.skills[k] = Math.max(10, Math.min(99, Math.round(st.skills[k]))); st.rep = Math.max(0, Math.min(100, st.rep)); st.trust = Math.max(0, Math.min(100, st.trust)); };
const salary = () => Object.entries(st.crew).reduce((a, [, l]) => a + l * tier().cost * .6, 0);
const fill = s => String(s).replace(/\{name\}/g, st.name).replace(/\{first\}/g, first()).replace(/\{kai\}/g, 'Kai').replace(/\{lastpos_line\}/g, () => {
  const p = st.last && st.last.pos; return !p ? 'You did not finish. That happens. What matters is why.' : p <= 3 ? `P${p} in your first race. Do not let it go to your head. Okay, maybe a little.` : p <= 10 ? `P${p}. Points on debut. I have seen worse. I have driven worse.` : `P${p}. You were quick in places. Now we make you quick everywhere.`;
});

// ---------- the grid for a story race ----------
function trackFor() {
  const pool = tier().pool === 'original' ? PW.ORIGINAL_CIRCUITS : (PW.REAL_CIRCUITS || PW.ORIGINAL_CIRCUITS);
  return pool[PW.hashSeed(`story-${st.tier}-${st.season}-${st.race}`) % pool.length];
}
function raceSpec() {
  const T = PW.resolveTeams({}).map((t, i) => ({ ...t, name: tier().teams[i] }));
  const D = PW.resolveDrivers({});
  const mySlot = st.team * 2, kaiSlot = st.flags.mateKai && st.tier === 4 ? mySlot + 1 : 6;
  D[mySlot] = { name: st.name, flag: st.flag, num: st.num, code: PW.driverCode(st.name) };
  if (kaiSlot !== mySlot) D[kaiSlot] = { name: 'Kai Brandt', flag: 'DE', num: 11, code: 'BRA' };
  if (mySlot + 1 !== kaiSlot) D[mySlot + 1] = { ...D[mySlot + 1], name: tier().mate, code: PW.driverCode(tier().mate) };
  // team order, fastest first: Kai's team near the front, yours where your contract put you
  const kaiTeam = Math.floor(kaiSlot / 2), order = [...Array(10).keys()].filter(t => t !== st.team && t !== kaiTeam);
  if (kaiTeam !== st.team) order.splice(1, 0, kaiTeam);
  order.splice(Math.min(st.carRank, order.length), 0, st.team);
  const sk = st.skills, bonus = { [mySlot]: (skillAvg() - 40) * .0005 + st.crew.engineer * .0012 - st.tier * .0008 };
  if (kaiSlot !== mySlot) bonus[kaiSlot] = .0025 + st.tier * .0004;
  const traits = { [mySlot]: { wet: sk.wet / 100, tyres: sk.tyres / 100, fitness: sk.fitness / 100, racecraft: sk.racecraft / 100, pit: st.crew.mechanic } };
  const rain = PW.rng(PW.hashSeed(`w-${st.tier}-${st.season}-${st.race}`))() < .25;
  return { kind: 'story', track: trackFor(), laps: tier().laps, teams: T, drivers: D, slot: mySlot, kaiSlot, teamOrder: order, bonus, traits, weather: rain ? 'wet' : 'dry', mission: mission(kaiSlot !== mySlot) };
}
function mission(kaiOn) {
  const list = [
    { id: 'top10', t: 'Finish in the top 10', ok: r => r.pos && r.pos <= 10, pay: 1 },
    { id: 'kai', t: 'Finish ahead of Kai Brandt', ok: r => r.pos && (!r.kaiPos || r.pos < r.kaiPos), pay: 1.5, need: kaiOn },
    { id: 'gain', t: 'Gain 3 places from your grid slot', ok: r => r.pos && r.grid - r.pos >= 3, pay: 1.3 },
    { id: 'podium', t: 'Finish on the podium', ok: r => r.pos && r.pos <= 3, pay: 2.5, need: st.tier >= 1 && skillAvg() > 48 },
    { id: 'clean', t: 'Finish with no more than one pit stop', ok: r => r.pos && r.stops <= 1, pay: 1.2 },
    { id: 'mate', t: 'Beat your team-mate', ok: r => r.pos && (!r.matePos || r.pos < r.matePos), pay: 1.2, need: st.flags.bellandi || st.tier >= 2 }
  ].filter(m => m.need === undefined || m.need);
  const m = list[PW.hashSeed(`m-${st.tier}-${st.season}-${st.race}`) % list.length];
  return { id: m.id, t: m.t, pay: Math.round(tier().prize * m.pay) };
}
const MISSION_OK = {
  top10: r => r.pos && r.pos <= 10, kai: r => r.pos && (!r.kaiPos || r.pos < r.kaiPos), gain: r => r.pos && r.grid - r.pos >= 3,
  podium: r => r.pos && r.pos <= 3, clean: r => r.pos && r.stops <= 1, mate: r => r.pos && (!r.matePos || r.pos < r.matePos)
};

// ---------- UI ----------
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
function panel() { return $('story'); }
function show(on) { panel().hidden = !on; document.body.classList.toggle('in-story', on); }
function avatar(who) {
  const [name, , col] = CAST[who] || CAST.you, a = el('span', 'avatar', who === 'you' ? first()[0] : name.split(' ').map(w => w[0]).join('').slice(0, 2));
  a.style.background = col; return a;
}
function render() {
  const P = panel(); P.textContent = '';
  if (!st) { renderNew(P); return; }
  const next = nextScene('pre');
  const head = el('header', 'st-head');
  const t = el('div'); t.append(el('div', 'eyebrow', `Road to the Grid · Season ${st.season} · ${tier().name}`), el('h2', '', next ? next.title : `Race ${st.race + 1} of ${tier().races}`));
  const stats = el('div', 'st-stats');
  [['Money', money(st.money)], ['Reputation', st.rep], ['Ines trusts you', st.trust + '%'], ['Titles', st.titles]].forEach(([k, v]) => { const d = el('div'); d.append(el('span', '', k), el('b', '', String(v))); stats.appendChild(d); });
  const close = el('button', '', 'Exit story'); close.type = 'button'; close.onclick = () => { exit(); };
  head.append(t, stats, close); P.appendChild(head);
  const body = el('div', 'st-body');
  // driver card
  const me = el('section', 'st-card');
  me.append(el('div', 'eyebrow', 'Your driver'), el('h3', '', `#${st.num} ${st.name}`), el('p', 'hint', `${tier().teams[st.team]} · car ranked ${st.carRank + 1} of 10`));
  SKILLS.forEach(([k, n]) => { const row = el('div', 'st-skill'), bar = el('i'); bar.style.width = st.skills[k] + '%'; const track = el('span', 'bar'); track.appendChild(bar); row.append(el('span', '', n), track, el('b', '', String(st.skills[k]))); me.appendChild(row); });
  const crewList = el('p', 'hint', 'Crew: ' + (Object.entries(st.crew).filter(([, l]) => l).map(([k, l]) => `${st.crewName[k] || CREW[k].name} (${CREW[k].name.toLowerCase()} ${'★'.repeat(l)})`).join(', ') || 'just you and Ines'));
  const sp = st.sponsor ? SPONSORS[st.sponsor] : null;
  me.append(crewList, el('p', 'hint', sp ? `Sponsor: ${sp.name} · ${money(sp.pay)} a race · needs top ${sp.need}${st.strikes ? ' · warning given' : ''}` : 'No sponsor yet'));
  // centre: scene or race week
  const mid = el('section', 'st-card st-main');
  if (next) renderScene(mid, next);
  else renderWeek(mid);
  // standings
  const tab = el('section', 'st-card');
  tab.append(el('div', 'eyebrow', `${tier().name} standings`));
  const ol = el('ol', 'st-table');
  standings().slice(0, 10).forEach((r, i) => { const li = el('li', r.me ? 'me' : r.kai ? 'kai' : ''); li.append(el('span', 'p', String(i + 1)), el('span', 'n', r.name), el('b', '', String(r.pts))); ol.appendChild(li); });
  tab.appendChild(ol);
  if (st.history.length) tab.append(el('p', 'hint', 'Career: ' + st.history.slice(-4).map(h => `S${h.season} ${h.tier} P${h.pos}`).join(' · ')));
  body.append(me, mid, tab); P.appendChild(body);
}
function renderNew(P) {
  const box = el('section', 'st-card st-new');
  box.append(el('div', 'eyebrow', 'Story mode'), el('h2', '', 'Road to the Grid'),
    el('p', '', 'Start in a rented kart. Train, race, sign sponsors and build your crew. Beat Kai Brandt, the rich kid with the factory kart, all the way to the Grand Prix World Series.'));
  const f = el('form', 'st-form');
  const name = el('input'); name.type = 'text'; name.maxLength = 24; name.placeholder = 'Your driver name'; name.required = true;
  const flag = el('select'); flag.innerHTML = '<option value="">No flag</option>' + PW.flagOptions().map(([c, n]) => `<option value="${c}">${n}</option>`).join('');
  const num = el('input'); num.type = 'number'; num.min = 1; num.max = 99; num.value = 27;
  try { const S = JSON.parse(localStorage.getItem('pitwall-settings') || 'null'); if (S && S.drivers && S.drivers[0]) { name.value = S.drivers[0].name || ''; flag.value = S.drivers[0].flag || ''; } } catch (e) { /* ignore */ }
  const go = el('button', 'primary', 'Start my story'); go.type = 'submit';
  const lab = (t, i) => { const l = el('label', 'field'); l.append(t, i); return l; };
  f.append(lab('Name', name), lab('Flag', flag), lab('Car number', num), go);
  f.onsubmit = e => { e.preventDefault(); const n = name.value.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24); if (!n) return; st = fresh(n, flag.value, Math.max(1, Math.min(99, +num.value || 27))); save(); render(); };
  const back = el('button', '', 'Back to Lapwall'); back.type = 'button'; back.onclick = () => exit();
  box.append(f, back); P.appendChild(box);
}
function nextScene(moment) {
  const order = moment === 'pre' ? ['start', 'post', 'season', 'pre'] : [moment];
  for (const s of SCENES) if (!st.seen[s.id] && order.includes(s.when) && (s.when !== 'start' || st.week === 1 && st.race === 0) && (!s.cond || s.cond(st)) && (s.when !== 'post' || st.pendingPost) && (s.when !== 'season' || st.pendingSeason)) return s;
  return null;
}
function renderScene(box, sc) {
  box.appendChild(el('div', 'eyebrow', 'Story'));
  sc.lines.forEach(([who, text]) => { const row = el('div', 'st-line'); const [name, role] = CAST[who] || CAST.you; const tx = el('div'); tx.append(el('b', '', who === 'you' ? '' : name), el('span', 'role', role ? ' · ' + role : ''), el('p', '', fill(text))); row.append(avatar(who), tx); box.appendChild(row); });
  const done = text => { st.seen[sc.id] = 1; clampSkills(); save(); if (text) { box.textContent = ''; box.append(el('div', 'eyebrow', 'Story'), el('p', 'st-after', fill(text))); const b = el('button', 'primary', 'Continue'); b.type = 'button'; b.onclick = render; box.appendChild(b); } else render(); };
  const ch = el('div', 'st-choices');
  (sc.choices || [{ t: 'Continue' }]).forEach(c => { const b = el('button', c.fx ? '' : 'primary', c.t); b.type = 'button'; b.onclick = () => { if (c.fx) c.fx(st); done(c.after); }; ch.appendChild(b); });
  box.appendChild(ch);
}
function renderWeek(box) {
  const spec = upcoming();
  box.append(el('div', 'eyebrow', `Week ${st.week} · Race ${st.race + 1} of ${tier().races}`), el('h3', '', spec.track.name), el('p', 'hint', `${spec.laps} laps · ${spec.weather === 'wet' ? 'rain forecast' : 'dry forecast'} · ${spec.track.place || ''}`));
  const m = el('div', 'st-mission'); m.append(el('span', 'eyebrow', 'Mission'), el('b', '', spec.mission.t), el('span', 'hint', ` · reward ${money(spec.mission.pay)}`)); box.appendChild(m);
  if (st.last) box.appendChild(el('p', 'st-result', st.last.text));
  // training
  const tr = el('div', 'st-group'); tr.append(el('div', 'eyebrow', st.trainedWeek === st.week ? 'Training done this week' : `Train · one session a week · ${money(tier().cost)}`));
  TRAINING.forEach(o => { const b = el('button', '', o.name); b.type = 'button'; b.disabled = st.trainedWeek === st.week || st.money < tier().cost * o.mult; b.title = o.text; b.onclick = () => train(o); tr.appendChild(b); });
  // crew
  const cr = el('div', 'st-group'); cr.append(el('div', 'eyebrow', `Crew · salaries ${money(salary())} a race`));
  Object.entries(CREW).forEach(([role, c]) => {
    const lvl = st.crew[role], nextP = c.people.find(([, l]) => l === lvl + 1);
    const b = el('button', '', lvl >= 3 ? `${c.name}: best there is` : nextP ? `Hire ${nextP[0]} · ${c.name} ${'★'.repeat(nextP[1])}` : `${c.name}`);
    b.type = 'button'; b.title = c.effect + ` · costs ${money(tier().cost * .6 * (lvl + 1))} a race`;
    b.disabled = lvl >= 3 || !nextP || st.money < tier().cost * 2;
    b.onclick = () => { st.crew[role] = nextP[1]; st.crewName[role] = nextP[0]; st.money -= tier().cost * 2; save(); render(); };
    cr.appendChild(b);
  });
  const go = el('button', 'primary st-go', `Race weekend · ${spec.track.name}`); go.type = 'button'; go.onclick = () => startRace();
  box.append(tr, cr, go);
  if (st.crew.analyst) box.appendChild(el('p', 'hint', 'Your data analyst set up telemetry: press T in the race.'));
  box.appendChild(el('p', 'hint', 'In the race you are the pit wall: Push (1), Normal (2), Save tyres (3), Box (B), Boost (O).'));
}
let pendingSpec = null;
const upcoming = () => pendingSpec || (pendingSpec = raceSpec());
function train(o) {
  const cost = tier().cost * o.mult; if (st.money < cost || st.trainedWeek === st.week) return;
  st.money -= cost; st.trainedWeek = st.week;
  const learn = 1 + st.crew.analyst * .15, gain = Math.round(rnd(2, 5.5) * learn * (st.skills.fitness > 60 ? 1.15 : 1) * (st.skills[o.skill] > 80 ? .6 : 1));
  st.skills[o.skill] += gain; if (o.id === 'drills') st.trust += 2;
  clampSkills(); st.last = { text: `${o.name}: ${o.text} ${SKILLS.find(s => s[0] === o.skill)[1]} +${gain}.` };
  pendingSpec = null; save(); render();
}

// ---------- racing ----------
function startRace() {
  const spec = upcoming(); pendingSpec = null; st.pendingPost = false; st.pendingSeason = false; st.promotedFrom = -1; save();
  raceCtx = spec; show(false);
  host.startRace(spec);
  if (st.crew.analyst) host.allowTelemetry();
}
/* Called by the app when a story race is over. */
function raceDone(race) {
  const spec = raceCtx; if (!spec || !st) return;
  const me = race.cars.find(c => c.i === spec.slot), fin = race.finishOrder, pos = me && me.finished ? me.fpos + 1 : 0;
  const kai = race.cars.find(c => c.i === spec.kaiSlot), mate = race.cars.find(c => c.i === (spec.slot ^ 1));
  const r = { pos, grid: me ? me.gridPos + 1 : 20, stops: me ? me.stops || 0 : 0, kaiPos: kai && kai !== me && kai.finished ? kai.fpos + 1 : 0, matePos: mate && mate.finished ? mate.fpos + 1 : 0 };
  // points for everyone in this series
  fin.forEach((c, p) => { if (p < 10) st.pts[c.i] = (st.pts[c.i] || 0) + PW.POINTS[p]; });
  st.names = st.names || {}; race.cars.forEach(c => { st.names[c.i] = c.name; });
  const prize = pos ? Math.max(0, Math.round(tier().prize * (11 - Math.min(11, pos)) / 10)) : 0;
  const ok = MISSION_OK[spec.mission.id](r), reward = ok ? spec.mission.pay : 0;
  let spon = 0, sponTxt = '';
  if (st.sponsor) { const sp = SPONSORS[st.sponsor]; if (pos && pos <= sp.need) { spon = sp.pay; st.strikes = 0; } else if (++st.strikes >= 2) { sponTxt = ` ${sp.name} has ended your deal.`; st.sponsor = null; st.strikes = 0; } else sponTxt = ` ${sp.name} is not happy: one more miss and they walk.`; }
  const pay = salary();
  st.money += prize + reward + spon - pay;
  st.rep += pos === 1 ? 6 : pos && pos <= 3 ? 3 : pos && pos <= 10 ? 1 : -1;
  st.skills.racecraft += pos && r.grid - pos >= 3 ? 1 : 0; st.skills[spec.weather === 'wet' ? 'wet' : 'tyres'] += 1;
  if (st.money < 0) { const role = Object.keys(st.crew).find(k => st.crew[k]); if (role) { st.crew[role] = 0; sponTxt += ` You could not pay ${st.crewName[role] || 'your crew'}; they left.`; } st.money = Math.max(st.money, -tier().cost); }
  clampSkills();
  st.last = { pos, text: `${pos ? 'P' + pos : 'DNF'} at ${spec.track.name}. Prize ${money(prize)}${reward ? `, mission complete +${money(reward)}` : ', mission missed'}${spon ? `, sponsor ${money(spon)}` : ''}, crew ${money(-pay)}.${sponTxt}` };
  st.race++; st.week++; st.pendingPost = true; st.trainedWeek = 0;
  if (st.race >= tier().races) endSeason();
  save(); raceCtx = null;
}
function standings() {
  const names = st.names || {}, rows = Object.keys(st.pts).map(i => ({ i: +i, name: names[i] || '—', pts: st.pts[i] }));
  const mySlot = st.team * 2;
  if (!rows.some(r => r.i === mySlot)) rows.push({ i: mySlot, name: st.name, pts: 0 });
  return rows.sort((a, b) => b.pts - a.pts).map(r => ({ ...r, me: r.i === mySlot, kai: names[r.i] === 'Kai Brandt' }));
}
function endSeason() {
  const tab = standings(), place = tab.findIndex(r => r.me) + 1;
  st.history.push({ season: st.season, tier: tier().name, pos: place });
  st.pendingSeason = true;
  if (st.tier === 4) { if (place === 1) st.titles++; st.promoted = false; st.season++; st.race = 0; st.pts = {}; st.carRank = Math.max(0, st.carRank - (place <= 3 ? 1 : 0)); st.last.text += ` Season over: P${place} in the championship.${place === 1 ? ' WORLD CHAMPION!' : ''}`; return; }
  st.promoted = place <= 3 || (tier().seat && st.money >= TIERS[st.tier + 1].seat);
  const bought = place > 3 && st.promoted;
  st.last.text += ` Season over: P${place} in the ${tier().name}.` + (st.promoted ? (bought ? ` You buy your way up with ${money(TIERS[st.tier + 1].seat)}.` : ' Promoted!') : ' Not enough for promotion: one more season here.');
  if (bought) st.money -= TIERS[st.tier + 1].seat;
  st.promotedFrom = st.promoted ? st.tier : -1;
  if (st.promoted) { st.tier++; st.carRank = 5; st.team = st.tier === 1 ? 4 : st.team; }
  st.season++; st.race = 0; st.pts = {}; st.names = {};
}
function exit() { show(false); if (host) host.exitStory(); }

PW.Story = {
  active: () => !!raceCtx,
  slot: () => raceCtx ? raceCtx.slot : -1,
  attach(h) { host = h; },
  open() { st = load(); pendingSpec = null; show(true); render(); },
  raceDone(race) { raceDone(race); show(true); render(); },
  isOpen: () => !panel().hidden
};
})();
