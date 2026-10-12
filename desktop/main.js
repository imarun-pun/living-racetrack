// Pit Wall desktop: the display in a window, plus a transparent, click-through strip
// above the taskbar where a car drives by every so often.
const { app, BrowserWindow, Tray, Menu, screen, nativeImage, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

const STRIP = 150; // overlay height in px, sits right on top of the taskbar
const cfgFile = () => path.join(app.getPath('userData'), 'desktop-settings.json');
let cfg = { everyMin: 15, paused: false, sound: false, openOnStart: true, atLogin: false };
try { cfg = { ...cfg, ...JSON.parse(fs.readFileSync(cfgFile(), 'utf8')) }; } catch (e) { /* first run */ }
const saveCfg = () => { try { fs.writeFileSync(cfgFile(), JSON.stringify(cfg, null, 2)); } catch (e) { /* ignore */ } };

let win = null, overlay = null, tray = null, timer = null, driving = false;
const icon = () => nativeImage.createFromPath(path.join(__dirname, 'app', 'icons', 'icon-192.png'));

function openPitWall() {
  if (win) { win.show(); win.focus(); return; }
  win = new BrowserWindow({ width: 1280, height: 760, backgroundColor: '#07090d', title: 'Pit Wall', icon: icon(), autoHideMenuBar: true });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.on('closed', () => { win = null; }); // closing the window keeps the drive-bys running from the tray
}

function stripBounds() {
  const wa = screen.getPrimaryDisplay().workArea; // work area excludes the taskbar / dock
  return { x: wa.x, y: wa.y + wa.height - STRIP, width: wa.width, height: STRIP };
}
function createOverlay() {
  overlay = new BrowserWindow({
    ...stripBounds(), transparent: true, frame: false, resizable: false, movable: false, focusable: false,
    skipTaskbar: true, hasShadow: false, alwaysOnTop: true, show: false, backgroundColor: '#00000000',
    webPreferences: { preload: path.join(__dirname, 'preload.js') }
  });
  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlay.setIgnoreMouseEvents(true);
  if (overlay.setVisibleOnAllWorkspaces) overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
  overlay.loadFile(path.join(__dirname, 'overlay.html'));
}
function driveBy() {
  if (!overlay || driving) return;
  driving = true;
  overlay.setBounds(stripBounds());
  overlay.showInactive();
  overlay.webContents.send('drive', { sound: cfg.sound });
}
ipcMain.on('driveby-done', () => { driving = false; if (overlay) overlay.hide(); });

function schedule() {
  clearTimeout(timer);
  if (cfg.paused) return;
  const ms = cfg.everyMin * 60000 * (0.6 + Math.random() * 0.8); // a little random so it feels natural
  timer = setTimeout(() => { driveBy(); schedule(); }, ms);
}

function buildMenu() {
  const every = m => ({ label: m < 60 ? `Every ${m} minutes` : 'Every hour', type: 'radio', checked: cfg.everyMin === m,
    click: () => { cfg.everyMin = m; saveCfg(); schedule(); } });
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Pit Wall', click: openPitWall },
    { label: 'Drive by now', click: driveBy },
    { type: 'separator' },
    every(5), every(15), every(30), every(60),
    { label: 'Pause drive-bys', type: 'checkbox', checked: cfg.paused, click: i => { cfg.paused = i.checked; saveCfg(); schedule(); } },
    { label: 'Engine sound', type: 'checkbox', checked: cfg.sound, click: i => { cfg.sound = i.checked; saveCfg(); } },
    { type: 'separator' },
    { label: 'Open Pit Wall at start', type: 'checkbox', checked: cfg.openOnStart, click: i => { cfg.openOnStart = i.checked; saveCfg(); } },
    { label: 'Start when I log in', type: 'checkbox', checked: cfg.atLogin, click: i => { cfg.atLogin = i.checked; saveCfg(); app.setLoginItemSettings({ openAtLogin: i.checked }); } },
    { type: 'separator' },
    { label: 'Quit Pit Wall', click: () => app.quit() }
  ]));
}

app.on('second-instance', openPitWall);
app.on('window-all-closed', () => { /* stay in the tray */ });
app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) app.dock.setIcon(icon());
  tray = new Tray(icon().resize({ width: 18, height: 18 }));
  tray.setToolTip('Pit Wall');
  tray.on('click', openPitWall);
  buildMenu();
  createOverlay();
  screen.on('display-metrics-changed', () => overlay && overlay.setBounds(stripBounds()));
  if (cfg.openOnStart) openPitWall();
  overlay.webContents.once('did-finish-load', () => setTimeout(driveBy, 8000)); // a hello lap shortly after launch
  schedule();
});
