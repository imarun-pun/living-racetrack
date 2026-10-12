/* Recipient page: lights out, the car brakes into the middle and parks, a liquid-glass card
   springs up with the message. Tap the car to rev it, send reactions, launch it off, bring it back. */
(() => {
const $ = id => document.getElementById(id);
const stage = $('stage'), road = $('road'), cardEl = $('card');
const card = PW.decodeCard(location.hash);
const drive = new PW.DriveBy(road);
const fx = new PW.Confetti($('fx'));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let sound = false;

// Night bokeh behind the glass
(function bokeh() {
  const tint = card ? card.c : '#ff4a3d';
  const cols = [tint, '#ffb547', '#4cc3ff', '#ff6fb1', '#8a7bff', '#ffd43b', tint];
  const box = $('bokeh'), n = innerWidth < 600 ? 12 : 20;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span'), size = 40 + Math.random() * 200, c = cols[i % cols.length];
    s.style.cssText = `width:${size | 0}px;height:${size | 0}px;left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 70).toFixed(1)}%;` +
      `background:radial-gradient(circle, ${c} 0%, transparent 68%);opacity:${(.18 + Math.random() * .4).toFixed(2)};` +
      `animation-duration:${(14 + Math.random() * 20).toFixed(1)}s;animation-delay:-${(Math.random() * 20).toFixed(1)}s`;
    box.appendChild(s);
  }
})();

if (!card) {
  $('start').hidden = true;
  $('eyebrow').textContent = 'Link not recognised';
  $('title').textContent = 'This Zoom-by got lost';
  $('msg').textContent = 'The link may be incomplete. Ask the sender to copy it again, or make your own.';
  $('react').hidden = true; $('launch').hidden = true; $('reply').textContent = 'Make a Zoom-by';
  cardEl.hidden = false; cardEl.classList.add('show', 'centre');
  return;
}

const occ = PW.OCCASIONS[card.o];
const board = PW.cardBoard(card);
const team = { name: card.tm, color: card.c, color2: card.c2 };
const titleText = card.t + (card.to ? ', ' + card.to : '');
document.title = card.to ? titleText.slice(0, 40) : 'A Zoom-by for you';
stage.style.setProperty('--tint', card.c);
$('sEyebrow').textContent = card.to ? `Incoming Zoom-by for ${card.to}` : 'Incoming Zoom-by';
$('eyebrow').textContent = occ.label === 'My own words' ? 'Pit board' : occ.label;
const message = card.m || occ.sub || '';
const from = $('from'); from.textContent = '';
if (card.fr) {
  if (card.fl) { const img = new Image(); img.src = PW.flagURL(card.fl, 24, 16); img.alt = PW.FLAG_NAMES[card.fl]; from.appendChild(img); }
  from.appendChild(document.createTextNode(`From #${card.n} ${card.fr}`));
}
$('reply').href = '../send.html' + (card.fr ? '#to=' + encodeURIComponent(card.fr.slice(0, 20)) : '');
const colours = [card.c, card.c2 === '#1b1f27' ? '#eef2f8' : card.c2, '#ffd43b', '#2fd780', '#4cc3ff', '#ff6fb1'];

// ---------- main loop ----------
let last = 0, running = false;
function kick() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } }
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  const on = drive.update(dt);
  fx.update(dt);
  if (on && drive.geom) placeCard();
  if (on || fx.busy) requestAnimationFrame(loop); else running = false;
}
function placeCard() {
  const q = drive.geom, rr = road.getBoundingClientRect();
  const bottom = Math.max(12, innerHeight - (rr.top + q.restTop) + Math.max(14, q.s * 40));
  cardEl.style.bottom = bottom + 'px';
  $('hint').style.bottom = Math.max(6, innerHeight - rr.top - q.ground - 30) + 'px';
}

// ---------- the show ----------
let typed = false, typing = 0, gone = false;
function arrive() {
  gone = false;
  cardEl.classList.remove('show'); $('hint').hidden = true;
  drive.start({ name: card.fr || 'Lapwall', flag: card.fl, num: card.n, team, tyre: 'S', board, park: true, dom: true, reduce,
    fit: innerWidth > 900 ? .5 : innerWidth < 600 ? .8 : .62, sound, onPark: parked });
  $('launch').textContent = 'Launch';
  kick();
}
function parked() {
  if (!reduce) { fx.burst(card.o === 'birthday' ? 200 : 130, colours); setTimeout(() => fx.burst(90, colours), 700); kick(); }
  cardEl.hidden = false;
  requestAnimationFrame(() => cardEl.classList.add('show'));
  $('title').textContent = titleText;
  if (typed || reduce) { $('msg').textContent = message; done(); return; }
  typed = true; let i = 0; $('msg').textContent = ''; clearInterval(typing);
  setTimeout(() => {
    typing = setInterval(() => {
      i += message[i] === ' ' ? 2 : 1; $('msg').textContent = message.slice(0, i);
      if (i >= message.length) { clearInterval(typing); done(); }
    }, 34);
  }, 450);
}
function done() { cardEl.classList.add('ready'); if (!gone) $('hint').hidden = false; }

// Start lights: tap to unlock sound, or it starts on its own
let started = false, auto = setTimeout(() => lightsOut(false), 7000);
function lightsOut(withSound) {
  if (started) return; started = true; clearTimeout(auto);
  if (withSound) { sound = true; drive.unlock(); syncSound(); }
  const lights = [...$('lights').children];
  $('go').disabled = true; $('go').textContent = 'Get ready';
  const step = reduce ? 0 : 420;
  lights.forEach((l, i) => setTimeout(() => { l.classList.add('on'); if (sound) beep(520, .09); }, step * (i + 1)));
  setTimeout(() => {
    lights.forEach(l => l.classList.remove('on'));
    $('start').classList.add('away');
    setTimeout(() => { $('start').hidden = true; }, 500);
    arrive();
  }, step * 6 + (reduce ? 0 : 300));
}
$('go').addEventListener('click', () => lightsOut(true));
function beep(hz, d) {
  try { const A = drive.ctx(); if (!A) return; const o = A.createOscillator(), v = A.createGain(); o.type = 'sine'; o.frequency.value = hz;
    v.gain.setValueAtTime(.08, A.currentTime); v.gain.exponentialRampToValueAtTime(.0001, A.currentTime + d); o.connect(v); v.connect(A.destination); o.start(); o.stop(A.currentTime + d); } catch (e) { /* optional */ }
}

// Sound toggle
function syncSound() { $('snd').setAttribute('aria-pressed', String(sound)); $('snd').textContent = sound ? 'Sound on' : 'Sound off'; drive.setSound(sound); }
$('snd').addEventListener('click', () => { sound = !sound; if (sound) drive.unlock(); syncSound(); });

// Tap the car to rev
let revs = 0;
const local = e => { const r = road.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
stage.addEventListener('pointerdown', e => {
  if (e.target.closest('button, a, .msgcard')) return;
  const [x, y] = local(e);
  if (drive.parked && drive.hit(x, y)) {
    if (sound) drive.unlock();
    drive.rev(); revs++; kick();
    stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake');
    $('hint').textContent = revs < 3 ? 'Again!' : revs < 6 ? 'Louder!' : 'Now hit Launch';
  }
});
stage.addEventListener('pointermove', e => { const [x, y] = local(e); stage.style.cursor = drive.parked && drive.hit(x, y) ? 'pointer' : ''; });

// Launch / bring it back
$('launch').addEventListener('click', () => {
  if (drive.parked) { drive.leave(); gone = true; $('hint').hidden = true; $('launch').textContent = 'Bring it back'; kick(); }
  else if (!drive.active) arrive();
});

// Reactions float up from the button
$('react').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const r = b.getBoundingClientRect();
  for (let k = 0; k < (reduce ? 1 : 5); k++) {
    const s = document.createElement('span'); s.className = 'floatie'; s.textContent = b.dataset.e;
    s.style.left = (r.left + r.width / 2 + (Math.random() - .5) * 30) + 'px'; s.style.top = r.top + 'px';
    s.style.setProperty('--dx', ((Math.random() - .5) * 120).toFixed(0) + 'px');
    s.style.animationDelay = (k * .08).toFixed(2) + 's';
    document.body.appendChild(s); setTimeout(() => s.remove(), 2200);
  }
  if (b.dataset.e === '🔥' && drive.parked) { drive.rev(); kick(); }
  if (b.dataset.e === '🎉' && !reduce) { fx.burst(80, colours); kick(); }
});
addEventListener('resize', () => { if (drive.geom) { drive.update(0); placeCard(); } });
})();
