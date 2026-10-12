// Lapwall licences: a small JSON file signed with the seller's Ed25519 private key.
// The app only holds the public key, so it can check a licence but can never make one.
// A licence names who bought it; a copy that turns up somewhere else leads back to them.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const FIELDS = ['product', 'v', 'id', 'name', 'edition', 'issued'];
const MAX_BYTES = 8 * 1024;

let PUBLIC_KEY = null;
try { PUBLIC_KEY = crypto.createPublicKey(fs.readFileSync(path.join(__dirname, 'license-public.pem'), 'utf8')); } catch (e) { /* not set up yet: every copy runs as a preview */ }

/* The exact bytes that get signed: the fields in a fixed order, without the signature. */
function payload(lic) { return JSON.stringify(FIELDS.map(k => [k, lic[k]])); }

/* Returns { id, name, edition, issued } for a valid licence, otherwise null. */
function verify(text) {
  if (!PUBLIC_KEY || typeof text !== 'string' || text.length > MAX_BYTES) return null;
  let lic;
  try { lic = JSON.parse(text); } catch (e) { return null; }
  if (!lic || lic.product !== 'lapwall' || lic.v !== 1 || typeof lic.sig !== 'string') return null;
  if (![lic.id, lic.name, lic.edition, lic.issued].every(s => typeof s === 'string' && s.length > 0 && s.length <= 120)) return null;
  if (!/^LW-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(lic.id)) return null;
  let ok = false;
  try { ok = crypto.verify(null, Buffer.from(payload(lic)), PUBLIC_KEY, Buffer.from(lic.sig, 'base64')); } catch (e) { ok = false; }
  return ok ? { id: lic.id, name: lic.name, edition: lic.edition, issued: lic.issued } : null;
}

function readSmall(file) {
  try { const st = fs.statSync(file); if (!st.isFile() || st.size > MAX_BYTES) return null; return fs.readFileSync(file, 'utf8'); } catch (e) { return null; }
}

/* Folders to look in: next to the app, then up towards the root of the drive (the USB kit keeps
   lapwall.license at the top of the stick), then the app's own data folder. */
function searchDirs(app) {
  const dirs = [], add = d => { if (d && !dirs.includes(d)) dirs.push(d); };
  // The Windows portable .exe runs from a temporary folder and reports where it really lives in PORTABLE_EXECUTABLE_DIR.
  for (const start of [process.env.PORTABLE_EXECUTABLE_DIR, path.dirname(app.getPath('exe'))]) {
    let d = start;
    for (let k = 0; d && k < 8; k++) { add(d); const up = path.dirname(d); if (up === d) break; d = up; }
  }
  add(app.getPath('userData'));
  return dirs;
}

function find(app) {
  for (const dir of searchDirs(app)) {
    const text = readSmall(path.join(dir, 'lapwall.license'));
    const lic = text && verify(text);
    if (lic) return { ...lic, file: path.join(dir, 'lapwall.license') };
  }
  return null;
}

/* Copy a chosen licence file into the app's data folder, after checking it. */
function install(app, file) {
  const text = readSmall(file), lic = text && verify(text);
  if (!lic) return null;
  fs.writeFileSync(path.join(app.getPath('userData'), 'lapwall.license'), text);
  return lic;
}

/* Settings that come with a USB kit (lapwall-display.json), read with the same search. Only known keys, only simple values. */
function kitConfig(app) {
  for (const dir of searchDirs(app)) {
    const text = readSmall(path.join(dir, 'lapwall-display.json'));
    if (!text) continue;
    try {
      const j = JSON.parse(text);
      return { startInDisplayMode: j.startInDisplayMode === true, screen: ['largest', 'primary'].includes(j.screen) ? j.screen : 'largest' };
    } catch (e) { return null; }
  }
  return null;
}

module.exports = { verify, find, install, kitConfig, payload, FIELDS, hasKey: () => !!PUBLIC_KEY };
