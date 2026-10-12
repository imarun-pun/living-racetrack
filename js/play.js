/* Viewer's phone: put your name on a car in the streamer's race and call its strategy. Watch the stream to see it. */
(() => {
const $ = id => document.getElementById(id);
const h = new URLSearchParams(location.hash.slice(1)), room = (h.get('r') || '').toLowerCase(), test = h.has('test');
if (!/^[a-z0-9]{10,24}$/.test(room)) { $('joinMsg').textContent = 'This link looks incomplete. Copy it again from the stream chat.'; $('joinForm').hidden = true; return; }

// a secret id for this phone in this room; the stream only shows names, so nobody else can drive your car
const KEY = 'lapwall-play-' + room;
let me = null; try { me = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { /* none */ }
if (!me || !/^[a-f0-9]{32}$/.test(me.id)) me = { id: Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join(''), name: '' };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(me)); } catch (e) { /* none */ } };
$('name').value = me.name || '';

let busy = false;
function send(p, okText) {
  if (busy) return; busy = true; setTimeout(() => { busy = false; }, 700);
  PW.liveSend(room, test, { ...p, id: me.id })
    .then(() => { if (okText) flash(okText); })
    .catch(e => flash(e.message || 'Could not reach the stream', true));
}
function flash(t, bad) { const el = $('msg'); el.textContent = t; el.className = 'msg' + (bad ? ' bad' : ''); clearTimeout(flash.t); flash.t = setTimeout(() => { el.textContent = ''; }, 3500); }
function showCar() { $('joinCard').hidden = !!me.name && me.joined; $('carCard').hidden = !(me.name && me.joined); $('who').textContent = me.name || ''; }

$('joinForm').addEventListener('submit', e => {
  e.preventDefault();
  const n = $('name').value.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 20); if (!n) return;
  me.name = n; me.joined = true; save(); showCar();
  send({ t: 'join', name: n }, 'Sent! Look for your name on a car on the stream.');
});
document.querySelectorAll('[data-cmd]').forEach(b => b.addEventListener('click', () => {
  send({ t: 'cmd', cmd: b.dataset.cmd }, { push: 'Pushing!', normal: 'Normal pace', save: 'Saving tyres', box: 'Box, box! Pitting this lap', boost: '⚡ Boost!' }[b.dataset.cmd]);
  if (b.closest('.modes')) document.querySelectorAll('.modes [data-cmd]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  if (navigator.vibrate) navigator.vibrate(25);
}));
$('pickForm').addEventListener('submit', e => {
  e.preventDefault(); const c = $('pick').value.replace(/[^\w #]/g, '').trim().slice(0, 20); if (!c) return;
  send({ t: 'pick', code: c }, `Pick sent: ${c.toUpperCase()}. Picks close after lap 1.`);
});
$('change').addEventListener('click', () => { me.joined = false; save(); showCar(); });
$('leave').addEventListener('click', () => { send({ t: 'leave' }, 'You gave your car back.'); me.joined = false; save(); showCar(); });
// stay seated: say hello now and then (the stream frees seats that go quiet for 10 minutes)
setInterval(() => { if (me.joined && me.name && !document.hidden) PW.liveSend(room, test, { t: 'join', name: me.name, id: me.id }).catch(() => {}); }, 180000);
showCar();
})();
