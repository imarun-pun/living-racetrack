#!/usr/bin/env node
// Lapwall licence tool (for the seller only).
//
//   node tools/license.mjs keygen
//       Makes your signing key pair, once. The PRIVATE key goes to ~/.lapwall/ on this computer
//       and must never be shared or committed. The PUBLIC key goes into desktop/license-public.pem,
//       which ships inside the app so it can check licences.
//
//   node tools/license.mjs issue --name "Jane Doe" [--edition wall] [--out lapwall.license]
//       Signs a licence for one buyer and records the sale in ~/.lapwall/sales.csv,
//       so a licence that turns up somewhere else can be traced back to its buyer.
//
//   node tools/license.mjs check path/to/lapwall.license
//       Checks a licence against the public key in desktop/license-public.pem.
import { generateKeyPairSync, createPrivateKey, sign, randomInt } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, readFileSync, appendFileSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const home = process.env.LAPWALL_HOME || join(homedir(), '.lapwall');
const PRIVATE = join(home, 'lapwall-license-private.pem');
const PUBLIC = join(root, 'desktop', 'license-public.pem');
const lic = createRequire(import.meta.url)(join(root, 'desktop', 'license.js'));

const [cmd, ...rest] = process.argv.slice(2);
const arg = (name, dflt) => { const i = rest.indexOf('--' + name); return i >= 0 && rest[i + 1] ? rest[i + 1] : dflt; };
const fail = msg => { console.error('\n  ' + msg + '\n'); process.exit(1); };

if (cmd === 'keygen') {
  if (existsSync(PRIVATE)) fail(`A private key already exists at ${PRIVATE}. Keep using it: licences you already sold depend on it.`);
  mkdirSync(home, { recursive: true });
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  writeFileSync(PRIVATE, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
  try { chmodSync(PRIVATE, 0o600); } catch (e) { /* Windows */ }
  writeFileSync(PUBLIC, publicKey.export({ type: 'spki', format: 'pem' }));
  console.log(`\n  Private key saved to ${PRIVATE}`);
  console.log('  Back it up somewhere safe and offline (a password manager or an encrypted USB stick).');
  console.log('  Never commit it, email it or paste it anywhere.\n');
  console.log(`  Public key saved to ${PUBLIC}. Commit this one, then rebuild the desktop app.\n`);
} else if (cmd === 'issue') {
  const name = String(arg('name', '')).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 80);
  if (!name) fail('Give the buyer\'s name: --name "Jane Doe"');
  const pem = process.env.LAPWALL_LICENSE_KEY || (existsSync(PRIVATE) ? readFileSync(PRIVATE, 'utf8') : null);
  if (!pem) fail(`No private key found at ${PRIVATE}. Run "node tools/license.mjs keygen" first.`);
  const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', part = () => Array.from({ length: 4 }, () => A[randomInt(A.length)]).join('');
  const l = { product: 'lapwall', v: 1, id: arg('id', `LW-${part()}-${part()}`), name, edition: arg('edition', 'wall'), issued: new Date().toISOString().slice(0, 10) };
  l.sig = sign(null, Buffer.from(lic.payload(l)), createPrivateKey(pem)).toString('base64');
  const out = resolve(arg('out', 'lapwall.license'));
  writeFileSync(out, JSON.stringify(l, null, 2) + '\n');
  mkdirSync(home, { recursive: true });
  const ledger = join(home, 'sales.csv');
  if (!existsSync(ledger)) writeFileSync(ledger, 'id,name,edition,issued\n');
  appendFileSync(ledger, [l.id, `"${name.replace(/"/g, '""')}"`, l.edition, l.issued].join(',') + '\n');
  console.log(`\n  Licence ${l.id} for ${name} written to ${out}`);
  console.log(`  Sale recorded in ${ledger}\n`);
  if (lic.hasKey() && !lic.verify(readFileSync(out, 'utf8'))) console.warn('  Warning: this licence does not match desktop/license-public.pem. Did you run keygen on another computer?\n');
} else if (cmd === 'check') {
  const file = rest[0]; if (!file) fail('Give a licence file: node tools/license.mjs check lapwall.license');
  if (!lic.hasKey()) fail('desktop/license-public.pem is missing. Run keygen first.');
  const ok = lic.verify(readFileSync(file, 'utf8'));
  console.log(ok ? `\n  Valid: ${ok.id} · ${ok.name} · ${ok.edition} · issued ${ok.issued}\n` : '\n  Not valid: the file was edited, damaged, or signed with a different key.\n');
  process.exit(ok ? 0 : 2);
} else {
  console.log('\n  Usage: node tools/license.mjs keygen | issue --name "Buyer Name" [--edition wall] [--out file] | check file\n');
}
