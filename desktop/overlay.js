// Reads the same drivers and teams you set in Pit Wall (shared local storage), then sends one car past.
const db = new PW.DriveBy(document.getElementById('c'));
const settings = () => { try { return JSON.parse(localStorage.getItem('pitwall-settings') || '{}'); } catch (e) { return {}; } };
let last = 0;
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (db.update(dt)) requestAnimationFrame(loop); else window.pitwall.done();
}
window.pitwall.onDrive(opts => {
  if (db.active) return;
  const S = settings(), drivers = PW.resolveDrivers(S), teams = PW.resolveTeams(S);
  const custom = S.reminders && typeof S.reminders.custom === 'string' ? S.reminders.custom.replace(/[<>]/g, '').slice(0, 28) : '';
  const board = opts && opts.kind === 'custom' ? (custom ? { title: custom.toUpperCase(), sub: 'Pit board from you', icon: 'star' } : null)
    : opts && PW.REMINDERS[opts.kind] ? PW.REMINDERS[opts.kind] : undefined;
  if (board === null) { window.pitwall.done(); return; }
  const fav = typeof S.favTeam === 'number' && S.favTeam >= 0 ? S.favTeam : -1;
  const pool = fav >= 0 && Math.random() < .5 ? [fav * 2, fav * 2 + 1] : drivers.map((d, i) => i);
  const i = pool[Math.floor(Math.random() * pool.length)], d = drivers[i];
  const tyres = ['S', 'M', 'H'];
  db.start({ name: d.name, flag: d.flag, num: d.num, team: teams[Math.floor(i / 2)], tyre: tyres[Math.floor(Math.random() * 3)], sound: !!(opts && opts.sound),
    seconds: PW.DRIVEBY_SPEEDS[S.drivebySpeed] || PW.DRIVEBY_SPEEDS.cruise, board });
  last = performance.now(); requestAnimationFrame(loop);
});
