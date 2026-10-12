/* Creator page: builds the card, previews the drive-by live, and hands out the link and QR code. */
(() => {
const $ = id => document.getElementById(id);
const COLOURS = PW.DEFAULT_TEAMS.map(t => [t.color, t.color2]);
let occ = 'birthday', colour = COLOURS[0];

$('occ').innerHTML = Object.entries(PW.OCCASIONS).map(([k, o]) =>
  `<label><input type="radio" name="occ" value="${k}"${k === occ ? ' checked' : ''}><span>${o.label}</span></label>`).join('');
$('fl').insertAdjacentHTML('beforeend', PW.flagOptions().map(([c, n]) => `<option value="${c}">${n}</option>`).join(''));
$('sw').innerHTML = COLOURS.map(([c], i) => `<button type="button" data-i="${i}" style="background:${c}" aria-label="Colour ${i + 1}" aria-pressed="${i === 0}"></button>`).join('') +
  '<input type="color" id="cc" value="#ff4a3d" aria-label="Pick any colour">';

// Prefill from "send one back" (#to=Name) or from Pit Wall's own first driver
const pre = new URLSearchParams(location.hash.slice(1));
if (pre.get('to')) $('to').value = pre.get('to').slice(0, 20);
try {
  const S = JSON.parse(localStorage.getItem('pitwall-settings') || 'null');
  if (S) { const d = PW.resolveDrivers(S)[0], t = PW.resolveTeams(S)[0]; if (S.drivers && S.drivers[0]) { $('fr').value = d.name; $('fl').value = d.flag; $('n').value = d.num; colour = [t.color, t.color2]; } }
} catch (e) { /* storage unavailable */ }

function card() {
  return PW.cleanCard({ o: occ, t: occ === 'custom' ? $('t').value : PW.OCCASIONS[occ].title, to: $('to').value, m: $('m').value,
    fr: $('fr').value, fl: $('fl').value, n: $('n').value, c: colour[0], c2: colour[1] });
}
function syncOcc() { $('tWrap').hidden = occ !== 'custom'; }
$('occ').addEventListener('change', e => { occ = e.target.value; syncOcc(); restart(); });
$('sw').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  colour = COLOURS[+b.dataset.i];
  $('sw').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); restart();
});
$('cc').addEventListener('input', e => { colour = [e.target.value, '#1b1f27']; $('sw').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false')); restart(); });
['to', 't', 'm', 'fr', 'fl', 'n'].forEach(id => $(id).addEventListener('input', () => { if (!$('result').hidden) $('result').hidden = true; }));
['fl', 'n'].forEach(id => $(id).addEventListener('change', restart));
syncOcc();

// Live preview: loops the drive-by with the current card
const pv = new PW.DriveBy($('pv'));
function restart() {
  const c = card();
  pv.start({ name: c.fr || 'You', flag: c.fl, num: c.n, team: { name: c.tm, color: c.c, color2: c.c2 }, tyre: 'S', seconds: 8, board: PW.cardBoard(c), big: true });
}
let last = performance.now();
(function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (!pv.update(dt)) restart();
  requestAnimationFrame(loop);
})(last);
let typing; ['to', 't', 'm', 'fr'].forEach(id => $(id).addEventListener('input', () => { clearTimeout(typing); typing = setTimeout(restart, 500); }));
restart();

// Create link + QR
$('form').addEventListener('submit', e => {
  e.preventDefault();
  const c = card(), url = PW.cardLink(c);
  $('link').value = url; $('open').href = url;
  const who = c.to ? ` for ${c.to}` : '';
  const lead = `Zoooooom! ${c.fr || 'Someone'} sent you a race car with a special message${who}.`;
  const text = `${lead} Tap to watch it arrive: ${url}`;
  $('email').href = 'mailto:?subject=' + encodeURIComponent(`Zoooom! A race car is coming${who}`) + '&body=' + encodeURIComponent(text);
  $('sms').href = 'sms:?&body=' + encodeURIComponent(text);
  $('share').hidden = !navigator.share;
  $('share').onclick = () => navigator.share({ title: 'A drive-by for you', text: lead, url }).catch(() => {});
  drawQR(url);
  $('result').hidden = false;
  $('link').focus(); $('link').select();
});
$('copy').addEventListener('click', () => {
  const v = $('link').value;
  (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => { $('copy').textContent = 'Copied'; setTimeout(() => { $('copy').textContent = 'Copy'; }, 1600); })
    .catch(() => { $('link').focus(); $('link').select(); });
});
function drawQR(url) {
  const q = qrcode(0, 'M'); q.addData(url); q.make();
  const n = q.getModuleCount(), cv = $('qr'), px = 4, size = (n + 8) * px;
  cv.width = size; cv.height = size;
  const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); g.fillStyle = '#07090d';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect((c + 4) * px, (r + 4) * px, px, px);
  $('qrdl').href = cv.toDataURL('image/png');
}
})();
