/* Recipient page: reads the card from the link, sends the car past with the pit board, then shows the message. */
(() => {
const $ = id => document.getElementById(id);
const card = PW.decodeCard(location.hash);
const drive = new PW.DriveBy($('road'));
const fx = new PW.Confetti($('fx'));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!card) {
  $('eyebrow').textContent = 'Link not recognised';
  $('title').textContent = 'This drive-by got lost';
  $('msg').textContent = 'The link may be incomplete. Ask the sender to copy it again, or make your own.';
  $('replay').hidden = true; $('reply').textContent = 'Make a drive-by';
  $('card').classList.remove('dim');
  return;
}
const occ = PW.OCCASIONS[card.o];
const board = PW.cardBoard(card);
const team = { name: card.tm, color: card.c, color2: card.c2 };
const titleText = card.t + (card.to ? ', ' + card.to : '');
document.title = card.to ? `${titleText.slice(0, 40)}` : 'A drive-by for you';
$('eyebrow').textContent = occ.label === 'My own words' ? 'Pit board' : occ.label;
$('title').textContent = titleText;
$('msg').textContent = card.m || occ.sub || '';
const from = $('from'); from.textContent = '';
if (card.fr) {
  if (card.fl) { const img = new Image(); img.src = PW.flagURL(card.fl, 24, 16); img.alt = PW.FLAG_NAMES[card.fl]; from.appendChild(img); }
  from.appendChild(document.createTextNode(`From #${card.n} ${card.fr}`));
}
const colours = [card.c, card.c2 === '#1b1f27' ? '#eef2f8' : card.c2, '#ffd43b', '#2fd780', '#4cc3ff', '#ff6fb1'];
let last = 0, running = false, celebrated = false;
function play() {
  $('card').classList.add('dim'); celebrated = false;
  drive.start({ name: card.fr || 'Pit Wall', flag: card.fl, num: card.n, team, tyre: 'S', seconds: reduce ? 9 : 12, board, big: true });
  if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
}
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  const on = drive.update(dt);
  if (on && !celebrated && drive.run && drive.run.t > drive.run.seconds * .38) {
    celebrated = true;
    if (!reduce) { fx.burst(card.o === 'birthday' ? 220 : 140, colours); setTimeout(() => fx.burst(120, colours), 900); }
  }
  if (!on) $('card').classList.remove('dim');
  fx.update(dt);
  if (on || fx.busy) requestAnimationFrame(loop); else running = false;
}
$('replay').addEventListener('click', play);
// Send one back: prefill the sender as the new recipient
$('reply').href = '../send.html' + (card.fr ? '#to=' + encodeURIComponent(card.fr.slice(0, 20)) : '');
play();
})();
