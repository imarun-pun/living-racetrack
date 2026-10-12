// Set, change or remove the wall display PIN. The main process checks and stores it (hashed).
const $ = id => document.getElementById(id);
$('curWrap').hidden = !window.lapwall.hasPin;
$('close').addEventListener('click', () => window.close());
$('f').addEventListener('submit', async e => {
  e.preventDefault();
  const a = $('a').value, b = $('b').value, msg = $('msg');
  if (a !== b) { msg.className = 'err'; msg.textContent = 'The two new PINs do not match.'; return; }
  if (a && !/^\d{4,12}$/.test(a)) { msg.className = 'err'; msg.textContent = 'Use 4 to 12 digits.'; return; }
  const r = await window.lapwall.setPin($('cur').value, a);
  if (r && r.ok) { msg.className = 'ok'; msg.textContent = a ? 'PIN saved.' : 'PIN removed.'; setTimeout(() => window.close(), 900); }
  else { msg.className = 'err'; msg.textContent = r && r.wait ? `Too many tries. Wait ${r.wait} seconds.` : 'The current PIN is not right.'; }
});
