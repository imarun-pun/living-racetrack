/* Race Room maker: builds the invite link (seed, start time, circuit, names) with a QR code and a calendar file. */
(() => {
const $ = id => document.getElementById(id);
const tracks = [...PW.ORIGINAL_CIRCUITS, ...(PW.REAL_CIRCUITS || [])];
$('t').innerHTML = `<optgroup label="Real-layout replicas">${(PW.REAL_CIRCUITS || []).map(t => `<option value="${PW.esc(t.id)}">${PW.esc(t.name)}</option>`).join('')}</optgroup>` +
  `<optgroup label="Original circuits">${PW.ORIGINAL_CIRCUITS.map(t => `<option value="${PW.esc(t.id)}">${PW.esc(t.name)}</option>`).join('')}</optgroup>`;
$('t').value = (PW.REAL_CIRCUITS || []).some(t => t.id === 'gb-1948') ? 'gb-1948' : tracks[0].id;
try { const S = JSON.parse(localStorage.getItem('pitwall-settings') || 'null'); if (S && S.drivers && S.drivers[0] && S.drivers[0].name) $('h').value = String(S.drivers[0].name).slice(0, 20); } catch (e) { /* storage unavailable */ }

const names = () => [$('h').value, ...$('g').value.split('\n')].map(s => s.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 20)).filter(Boolean).slice(0, 20);
function preview() {
  const N = names(), D = PW.resolveDrivers({}), T = PW.resolveTeams({});
  $('preview').innerHTML = D.map((d, i) => `<li${i < N.length ? ' class="you"' : ''}><span class="b" style="background:${T[Math.floor(i / 2)].color}"></span>${PW.esc(i < N.length ? N[i] : d.name)}</li>`).join('');
}
['h', 'g'].forEach(id => $(id).addEventListener('input', () => { preview(); $('result').hidden = true; }));
$('when').addEventListener('change', e => { $('at').hidden = e.target.value !== 'at'; if (!$('at').hidden && !$('at').value) { const d = new Date(Date.now() + 30 * 60000); d.setSeconds(0, 0); $('at').value = new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); } });
preview();

$('form').addEventListener('submit', e => {
  e.preventDefault();
  const w = document.querySelector('input[name="when"]:checked').value;
  const start = w === 'at' ? new Date($('at').value).getTime() : Math.ceil((Date.now() + +w * 60000) / 60000) * 60000;
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  const r = PW.cleanRoom({ n: $('n').value || 'Race Room', h: $('h').value, t: $('t').value, l: +$('l').value, s: start, d: seed, g: names() });
  if (!r) { alert('Pick a start time within the next 60 days.'); return; }
  const link = PW.roomLink(r), when = new Date(r.s).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' });
  const text = `🏁 ${r.h || 'A friend'} invited you to a race: ${r.n} at ${r.track.name}, lights out ${when}. You're on the grid. Tap to watch live: ${link}`;
  $('link').value = link; $('open').href = link;
  $('sms').href = 'sms:?&body=' + encodeURIComponent(text);
  $('email').href = 'mailto:?subject=' + encodeURIComponent(`Race invite: ${r.n} at ${r.track.name}`) + '&body=' + encodeURIComponent(text);
  $('share').hidden = !navigator.share; $('share').onclick = () => navigator.share({ title: 'Lapwall race invite', text, url: link }).catch(() => {});
  $('ics').href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(PW.roomICS(r, link));
  const q = qrcode(0, 'L'); q.addData(link); q.make();
  const n = q.getModuleCount(), cv = $('qr'), px = Math.max(2, Math.floor(200 / (n + 8)));
  cv.width = cv.height = (n + 8) * px; const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = '#07090d';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) g.fillRect((x + 4) * px, (y + 4) * px, px, px);
  $('result').hidden = false; $('link').focus(); $('link').select();
});
$('copy').addEventListener('click', () => { (navigator.clipboard ? navigator.clipboard.writeText($('link').value) : Promise.reject()).then(() => { $('copy').textContent = 'Copied'; setTimeout(() => { $('copy').textContent = 'Copy'; }, 1600); }).catch(() => { $('link').select(); }); });
})();
