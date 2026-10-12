#!/usr/bin/env node
// Builds a Lapwall USB kit for one buyer (seller only). Run it on your own computer, so the
// private key and the buyer's name never leave it.
//
//   node tools/usb-kit.mjs --name "Jane Doe" --videos ./tv-masters --apps ./desktop-builds --out E:\
//
//   --videos  folder of MP4s from tools/render-video.py or the "Render TV videos" workflow
//   --apps    folder with the files from the "Build desktop app" workflow
//             (Lapwall-Portable-*.exe, Lapwall-*-mac.zip, Lapwall-*.AppImage)
//   --out     the USB stick (or a folder to copy onto one later)
//
// What it does:
//   1. signs a licence for the buyer (tools/license.mjs) and records the sale
//   2. stamps the licence ID into the corner of every TV video, and the buyer's name into the file's
//      metadata, so a video that gets shared can be traced to the kit it came from
//   3. copies the apps, a display config that starts straight in locked wall mode, and START HERE.html
// Needs Node 20+ and ffmpeg on the PATH.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, copyFileSync, writeFileSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join, dirname, resolve, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { deflateSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const fail = m => { console.error('\n  ' + m + '\n'); process.exit(1); };
const name = String(arg('name', '')).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 80);
const out = arg('out') && resolve(arg('out'));
if (!name || !out) fail('Usage: node tools/usb-kit.mjs --name "Buyer Name" --out <USB drive or folder> [--videos dir] [--apps dir]');
const videos = arg('videos') && resolve(arg('videos')), apps = arg('apps') && resolve(arg('apps'));
const TV = join(out, 'TV - plug the stick into the TV'), PC = join(out, 'Computer - Windows, Mac, Linux');

// 1. Licence
mkdirSync(out, { recursive: true });
const licFile = join(out, 'lapwall.license');
const r = spawnSync(process.execPath, [join(root, 'tools', 'license.mjs'), 'issue', '--name', name, '--out', licFile], { stdio: 'inherit' });
if (r.status !== 0) fail('Could not sign the licence.');
const lic = JSON.parse(readFileSync(licFile, 'utf8'));

// 2. TV videos, stamped with the licence ID
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const masters = videos && existsSync(videos) ? readdirSync(videos).filter(f => extname(f).toLowerCase() === '.mp4').sort() : [];
if (!masters.length) console.warn('  No TV videos given (--videos). The TV folder will be empty.');
else if (spawnSync(ffmpeg, ['-version']).status !== 0) fail('ffmpeg was not found. Install it (Windows: winget install ffmpeg · Mac: brew install ffmpeg) and run again.');
mkdirSync(TV, { recursive: true });
const tmp = join(tmpdir(), 'lapwall-kit-' + process.pid); mkdirSync(tmp, { recursive: true });
masters.forEach((f, k) => {
  const src = join(videos, f), probe = spawnSync(ffmpeg, ['-i', src], { encoding: 'utf8' }).stderr || '';
  const h = +((probe.match(/, (\d{3,4})x(\d{3,4})/) || [])[2] || 1080);
  const stamp = join(tmp, `stamp-${h}.png`);
  writeFileSync(stamp, stampPNG(`LAPWALL ${lic.id}`, Math.max(1, Math.round(h / 540))));
  const dest = join(TV, f);
  console.log(`  Stamping ${k + 1}/${masters.length}: ${f}`);
  const res = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', src, '-i', stamp,
    '-filter_complex', '[0:v][1:v]overlay=main_w-overlay_w-main_h/36:main_h/36',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2', '-maxrate', '14M', '-bufsize', '28M',
    '-c:a', 'copy', '-movflags', '+faststart',
    '-metadata', `comment=Lapwall licence ${lic.id} · ${name}`, '-metadata', 'copyright=© Arun Pun · Lapwall · personal licence, not for redistribution', dest], { stdio: 'inherit' });
  if (res.status !== 0) fail('ffmpeg failed on ' + f);
});
rmSync(tmp, { recursive: true, force: true });

// 3. Apps, display config, START HERE
const files = apps && existsSync(apps) ? readdirSync(apps) : [];
const pick = re => files.find(f => re.test(f));
const place = (re, dir, as) => { const f = pick(re); if (!f) return null; mkdirSync(join(PC, dir), { recursive: true }); copyFileSync(join(apps, f), join(PC, dir, as)); return `${dir}/${as}`; };
const got = [place(/Portable.*\.exe$/i, 'Windows', 'Lapwall.exe'), place(/-mac\.zip$/i, 'Mac', 'Lapwall-mac.zip'), place(/\.AppImage$/i, 'Linux', 'Lapwall.AppImage')].filter(Boolean);
if (!got.length) console.warn('  No desktop apps given (--apps). The Computer folder will be empty.');
writeFileSync(join(out, 'lapwall-display.json'), JSON.stringify({ startInDisplayMode: true, screen: 'largest' }, null, 2) + '\n');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const page = readFileSync(join(root, 'tools', 'usb', 'START-HERE.html'), 'utf8')
  .replaceAll('{{NAME}}', esc(name)).replaceAll('{{ID}}', esc(lic.id)).replaceAll('{{DATE}}', esc(lic.issued))
  .replaceAll('{{VIDEOS}}', masters.length ? masters.map(f => `<li>${esc(basename(f, '.mp4'))}</li>`).join('') : '<li>No videos on this stick</li>');
writeFileSync(join(out, 'START HERE.html'), page);

const size = d => { let n = 0; for (const f of readdirSync(d, { withFileTypes: true })) n += f.isDirectory() ? size(join(d, f.name)) : statSync(join(d, f.name)).size; return n; };
console.log(`\n  Kit ready in ${out}`);
console.log(`  Licence ${lic.id} for ${name} · ${masters.length} TV video(s) · apps: ${got.join(', ') || 'none'} · ${(size(out) / 1e9).toFixed(2)} GB\n`);

/* A tiny PNG of the stamp text in a 5×7 pixel font, white at about 30% opacity with a soft shadow.
   Made here so the kit needs nothing but Node and ffmpeg (no font files). */
function stampPNG(text, scale) {
  const F = { A: '0e11111f111111', B: '1e11111e11111e', C: '0e11101010110e', D: '1e11111111111e', E: '1f10101e10101f', F: '1f10101e101010', G: '0e11101711110f', H: '1111111f111111',
    I: '0e04040404040e', J: '0702020202120c', K: '11121418141211', L: '1010101010101f', M: '111b1515111111', N: '11111915131111', O: '0e11111111110e', P: '1e11111e101010',
    Q: '0e11111115120d', R: '1e11111e141211', S: '0f10100e01011e', T: '1f040404040404', U: '1111111111110e', V: '11111111110a04', W: '1111111515150a', X: '11110a040a1111',
    Y: '11110a04040404', Z: '1f01020408101f', 0: '0e11131519110e', 1: '040c040404040e', 2: '0e11010204081f', 3: '1f02040201110e', 4: '02060a121f0202', 5: '1f101e0101110e',
    6: '0608101e11110e', 7: '1f010204080808', 8: '0e11110e11110e', 9: '0e11110f01020c', '-': '0000001f000000', ' ': '00000000000000' };
  const glyph = c => (F[c] || F[' ']).match(/../g).map(h => parseInt(h, 16));
  const chars = [...text.toUpperCase()], cw = 6 * scale, pad = 2 * scale;
  const W = chars.length * cw - scale + pad * 2, H = 7 * scale + pad * 2, px = new Uint8Array(W * H * 4);
  const put = (x, y, a, v) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; if (px[i + 3] >= a) return; px[i] = px[i + 1] = px[i + 2] = v; px[i + 3] = a; };
  for (const [dx, dy, a, v] of [[scale, scale, 70, 0], [0, 0, 80, 255]])
    chars.forEach((c, n) => glyph(c).forEach((row, y) => { for (let x = 0; x < 5; x++) if (row & (16 >> x)) for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) put(pad + n * cw + x * scale + sx + dx, pad + y * scale + sy + dy, a, v); }));
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; Buffer.from(px.buffer, y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1); }
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4), td = Buffer.concat([Buffer.from(type), data]), c = Buffer.alloc(4); len.writeUInt32BE(data.length); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
