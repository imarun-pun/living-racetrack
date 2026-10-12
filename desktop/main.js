// Lapwall desktop: the display in a window, a transparent click-through strip above the taskbar
// where a car drives by every so often, and a locked full-screen wall display mode for TVs and
// digital screens (kiosk: no cursor, no keys, stays awake, leaves only with the owner's PIN).
const { app, BrowserWindow, Tray, Menu, screen, nativeImage, ipcMain, powerSaveBlocker, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const licence = require('./license.js');

if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

const STRIP = 180; // overlay height in px, sits right on top of the taskbar
const cfgFile = () => path.join(app.getPath('userData'), 'desktop-settings.json');
let cfg = { everyMin: 15, paused: false, sound: false, openOnStart: true, atLogin: false, water: 60, stretch: 0, eyes: 0, custom: 0,
  displayOnStart: false, displayScreen: 'largest', pin: null };
try { cfg = { ...cfg, ...JSON.parse(fs.readFileSync(cfgFile(), 'utf8')) }; } catch (e) { /* first run */ }
const saveCfg = () => { try { fs.writeFileSync(cfgFile(), JSON.stringify(cfg, null, 2)); } catch (e) { /* ignore */ } };

let win = null, overlay = null, tray = null, timer = null, driving = false;
let displayWin = null, pinWin = null, blocker = null, leaving = false, lic = null, kit = null;
const icon = () => nativeImage.createFromPath(path.join(__dirname, 'app', 'icons', 'icon-192.png'));
const devTools = !app.isPackaged; // developer tools only when running from source

function openPitWall() {
  if (displayWin) return;                       // the wall display is locked; leave it with the PIN first
  if (win) { win.show(); win.focus(); return; }
  win = new BrowserWindow({ width: 1280, height: 760, backgroundColor: '#07090d', title: 'Lapwall', icon: icon(), autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload-app.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, devTools } });
  lockDown(win);
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.on('closed', () => { win = null; }); // closing the window keeps the Zoom-bys running from the tray
}

/* Security: pages may only show our own local files. No navigation away, no pop-ups, no device permissions. */
function lockDown(w) {
  w.webContents.on('will-navigate', e => e.preventDefault());
  w.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

// ---------- Wall display mode ----------
function pickScreen() {
  const all = screen.getAllDisplays();
  if ((kit && kit.screen === 'primary') || cfg.displayScreen === 'primary') return screen.getPrimaryDisplay();
  if (typeof cfg.displayScreen === 'number' && all.find(d => d.id === cfg.displayScreen)) return all.find(d => d.id === cfg.displayScreen);
  return all.reduce((a, b) => (b.size.width * b.size.height > a.size.width * a.size.height ? b : a), all[0]);
}
function startDisplay() {
  if (displayWin) return;
  if (win) win.close();
  if (overlay) overlay.hide();
  const d = pickScreen();
  displayWin = new BrowserWindow({
    x: d.bounds.x, y: d.bounds.y, width: d.bounds.width, height: d.bounds.height, show: false, frame: false, backgroundColor: '#07090d',
    title: 'Lapwall', icon: icon(), autoHideMenuBar: true, skipTaskbar: true, alwaysOnTop: true, fullscreenable: true,
    webPreferences: { preload: path.join(__dirname, 'preload-app.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, devTools: false,
      backgroundThrottling: false, spellcheck: false }
  });
  lockDown(displayWin);
  displayWin.setMenu(null);
  displayWin.loadFile(path.join(__dirname, 'app', 'index.html'), { hash: 'display' });
  displayWin.once('ready-to-show', () => { displayWin.show(); displayWin.setKiosk(true); displayWin.setAlwaysOnTop(true, 'screen-saver'); });
  // Keys: everything is swallowed except the unlock shortcut (Ctrl+Shift+L, or Cmd+Shift+L on a Mac).
  displayWin.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') { e.preventDefault(); return; }
    if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'l') askPin();
    e.preventDefault();
  });
  displayWin.on('close', e => { if (!leaving) e.preventDefault(); });
  displayWin.on('closed', () => { displayWin = null; leaving = false; });
  // Keep the art running: reload if the page crashes or freezes.
  displayWin.webContents.on('render-process-gone', () => setTimeout(() => displayWin && displayWin.reload(), 1500));
  displayWin.on('unresponsive', () => setTimeout(() => displayWin && displayWin.reload(), 5000));
  if (!blocker || !powerSaveBlocker.isStarted(blocker)) blocker = powerSaveBlocker.start('prevent-display-sleep');
  buildMenu();
}
function stopDisplay() {
  if (!displayWin) return;
  leaving = true; displayWin.setKiosk(false); displayWin.close();
  if (blocker !== null && powerSaveBlocker.isStarted(blocker)) powerSaveBlocker.stop(blocker);
  blocker = null;
  setTimeout(() => { buildMenu(); openPitWall(); }, 300);
}
function askPin() { if (displayWin) { displayWin.webContents.send('ask-pin'); displayWin.focus(); } }

// PIN: stored as a salted scrypt hash, never in plain text. Wrong guesses slow down: 5 tries, then a pause that doubles.
const hashPin = (pin, salt) => crypto.scryptSync(String(pin), Buffer.from(salt, 'hex'), 32).toString('hex');
function pinMatches(pin) {
  if (!cfg.pin) return true;
  const a = Buffer.from(hashPin(pin, cfg.pin.salt), 'hex'), b = Buffer.from(cfg.pin.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const guard = { fails: 0, until: 0, pause: 60 };
function tryPin(pin) {
  const now = Date.now();
  if (now < guard.until) return { ok: false, wait: Math.ceil((guard.until - now) / 1000) };
  if (pinMatches(pin)) { guard.fails = 0; guard.pause = 60; return { ok: true }; }
  if (++guard.fails >= 5) { guard.fails = 0; guard.until = now + guard.pause * 1000; guard.pause = Math.min(guard.pause * 2, 3600); return { ok: false, wait: guard.pause / 2 }; }
  return { ok: false };
}
ipcMain.on('lapwall-info', e => {
  e.returnValue = { display: !!displayWin && e.sender === displayWin.webContents, hasPin: !!cfg.pin, licence: lic ? { name: lic.name, id: lic.id } : null };
});
ipcMain.handle('lapwall-pin', (e, pin) => {
  if (!displayWin || e.sender !== displayWin.webContents) return { ok: false };
  const r = tryPin(pin);
  if (r.ok) stopDisplay();
  return r;
});
ipcMain.handle('lapwall-set-pin', (e, current, next) => {
  if (!pinWin || e.sender !== pinWin.webContents) return { ok: false };
  const r = tryPin(current); if (!r.ok) return r;
  if (next && !/^\d{4,12}$/.test(next)) return { ok: false };
  if (next) { const salt = crypto.randomBytes(16).toString('hex'); cfg.pin = { salt, hash: hashPin(next, salt) }; } else cfg.pin = null;
  saveCfg(); return { ok: true };
});
function openPinWindow() {
  if (displayWin) { askPin(); return; }
  if (pinWin) { pinWin.focus(); return; }
  pinWin = new BrowserWindow({ width: 420, height: 470, resizable: false, minimizable: false, maximizable: false, title: 'Display PIN', icon: icon(), autoHideMenuBar: true, backgroundColor: '#0d1118',
    webPreferences: { preload: path.join(__dirname, 'preload-app.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, devTools } });
  lockDown(pinWin); pinWin.setMenu(null);
  pinWin.loadFile(path.join(__dirname, 'pin.html'));
  pinWin.on('closed', () => { pinWin = null; });
}

// ---------- Licence ----------
async function addLicence() {
  const r = await dialog.showOpenDialog({ title: 'Choose your Lapwall licence', filters: [{ name: 'Lapwall licence', extensions: ['license'] }], properties: ['openFile'] });
  if (r.canceled || !r.filePaths[0]) return;
  const got = licence.install(app, r.filePaths[0]);
  if (got) { lic = got; dialog.showMessageBox({ type: 'info', message: `Licensed to ${got.name}`, detail: `Licence ${got.id}. Thank you for supporting Lapwall.` }); }
  else dialog.showMessageBox({ type: 'warning', message: 'That licence file is not valid', detail: 'It may be damaged or edited. Copy it again from your Lapwall USB kit or your purchase email.' });
  buildMenu();
  if (win) win.reload();
}

// ---------- Zoom-by strip ----------
function stripBounds() {
  const wa = screen.getPrimaryDisplay().workArea; // work area excludes the taskbar / dock
  return { x: wa.x, y: wa.y + wa.height - STRIP, width: wa.width, height: STRIP };
}
function createOverlay() {
  overlay = new BrowserWindow({
    ...stripBounds(), transparent: true, frame: false, resizable: false, movable: false, focusable: false,
    skipTaskbar: true, hasShadow: false, alwaysOnTop: true, show: false, backgroundColor: '#00000000',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, devTools }
  });
  lockDown(overlay);
  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlay.setIgnoreMouseEvents(true);
  if (overlay.setVisibleOnAllWorkspaces) overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
  overlay.loadFile(path.join(__dirname, 'overlay.html'));
}
function driveBy(kind) {
  if (!overlay || driving || displayWin) return false;
  driving = true;
  overlay.setBounds(stripBounds());
  overlay.showInactive();
  overlay.webContents.send('drive', { sound: cfg.sound, kind: kind || null });
  return true;
}
/* Pit-board reminders: water, stretch, eyes and your own message, each on its own clock. */
const remTimers = {};
function scheduleReminders() {
  for (const k of ['water', 'stretch', 'eyes', 'custom']) {
    clearInterval(remTimers[k]);
    if (cfg[k] > 0) remTimers[k] = setInterval(() => { if (!driveBy(k)) setTimeout(() => driveBy(k), 15000); }, cfg[k] * 60000);
  }
}
ipcMain.on('driveby-done', () => { driving = false; if (overlay) overlay.hide(); });

function schedule() {
  clearTimeout(timer);
  if (cfg.paused) return;
  const ms = cfg.everyMin * 60000 * (0.6 + Math.random() * 0.8); // a little random so it feels natural
  timer = setTimeout(() => { driveBy(); schedule(); }, ms);
}

function buildMenu() {
  if (!tray) return;
  const unlockKey = process.platform === 'darwin' ? 'Cmd+Shift+L' : 'Ctrl+Shift+L';
  if (displayWin) {
    // While the wall display is locked, the tray can only ask for the PIN.
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: `Wall display is locked (${unlockKey} to unlock)`, enabled: false },
      { label: 'Unlock with PIN…', click: askPin }
    ]));
    return;
  }
  const rem = (key, label, opts) => ({ label, submenu: [{ label: 'Off', type: 'radio', checked: !cfg[key], click: () => { cfg[key] = 0; saveCfg(); scheduleReminders(); } },
    ...opts.map(m => ({ label: m < 60 ? `Every ${m} minutes` : m === 60 ? 'Every hour' : `Every ${m / 60} hours`, type: 'radio', checked: cfg[key] === m,
      click: () => { cfg[key] = m; saveCfg(); scheduleReminders(); } }))] });
  const every = m => ({ label: m < 60 ? `Every ${m} minutes` : 'Every hour', type: 'radio', checked: cfg.everyMin === m,
    click: () => { cfg.everyMin = m; saveCfg(); schedule(); } });
  const screens = screen.getAllDisplays().map((d, i) => ({ label: `Screen ${i + 1} · ${d.size.width}×${d.size.height}${d.id === screen.getPrimaryDisplay().id ? ' (main)' : ''}`, type: 'radio',
    checked: cfg.displayScreen === d.id, click: () => { cfg.displayScreen = d.id; saveCfg(); } }));
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Lapwall', click: openPitWall },
    { label: 'Start wall display mode', click: startDisplay },
    { label: 'Wall display', submenu: [
      { label: 'Biggest screen', type: 'radio', checked: cfg.displayScreen === 'largest', click: () => { cfg.displayScreen = 'largest'; saveCfg(); } },
      { label: 'Main screen', type: 'radio', checked: cfg.displayScreen === 'primary', click: () => { cfg.displayScreen = 'primary'; saveCfg(); } },
      ...screens,
      { type: 'separator' },
      { label: 'Start in wall display mode', type: 'checkbox', checked: cfg.displayOnStart, click: i => { cfg.displayOnStart = i.checked; saveCfg(); } },
      { label: cfg.pin ? 'Change or remove PIN…' : 'Set a PIN…', click: openPinWindow },
      { label: `To leave: press ${unlockKey}`, enabled: false }
    ] },
    { type: 'separator' },
    { label: 'Zoom-by now', click: () => driveBy() },
    { label: 'Water reminder now', click: () => driveBy('water') },
    rem('water', 'Drink water reminder', [30, 45, 60, 90]),
    rem('stretch', 'Stretch reminder', [45, 60, 90, 120]),
    rem('eyes', 'Rest your eyes reminder', [20, 30, 60]),
    rem('custom', 'My own message (set in Lapwall)', [30, 60, 120]),
    { label: 'Zoom-by every', submenu: [every(5), every(15), every(30), every(60)] },
    { label: 'Pause Zoom-bys', type: 'checkbox', checked: cfg.paused, click: i => { cfg.paused = i.checked; saveCfg(); schedule(); } },
    { label: 'Engine sound', type: 'checkbox', checked: cfg.sound, click: i => { cfg.sound = i.checked; saveCfg(); } },
    { type: 'separator' },
    { label: 'Open Lapwall at start', type: 'checkbox', checked: cfg.openOnStart, click: i => { cfg.openOnStart = i.checked; saveCfg(); } },
    { label: 'Start when I log in', type: 'checkbox', checked: cfg.atLogin, click: i => { cfg.atLogin = i.checked; saveCfg(); app.setLoginItemSettings({ openAtLogin: i.checked }); } },
    { type: 'separator' },
    lic ? { label: `Licensed to ${lic.name} · ${lic.id}`, enabled: false } : { label: 'Preview copy · Add licence file…', click: addLicence },
    { label: 'Quit Lapwall', click: () => app.quit() }
  ]));
}

app.on('second-instance', () => (displayWin ? askPin() : openPitWall()));
app.on('window-all-closed', () => { /* stay in the tray */ });
app.on('before-quit', e => { if (displayWin && !leaving) { e.preventDefault(); askPin(); } });
app.on('web-contents-created', (_e, wc) => {
  wc.session.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
  wc.on('will-attach-webview', e => e.preventDefault());
});
app.whenReady().then(() => {
  lic = licence.find(app);
  kit = licence.kitConfig(app);
  if (process.platform === 'darwin' && app.dock) app.dock.setIcon(icon());
  tray = new Tray(icon().resize({ width: 18, height: 18 }));
  tray.setToolTip('Lapwall');
  tray.on('click', () => (displayWin ? askPin() : openPitWall()));
  buildMenu();
  createOverlay();
  screen.on('display-metrics-changed', () => overlay && overlay.setBounds(stripBounds()));
  screen.on('display-added', buildMenu); screen.on('display-removed', buildMenu);
  if (cfg.displayOnStart || (kit && kit.startInDisplayMode)) startDisplay();
  else if (cfg.openOnStart) openPitWall();
  overlay.webContents.once('did-finish-load', () => setTimeout(driveBy, 8000)); // a hello lap shortly after launch
  schedule();
  scheduleReminders();
});
