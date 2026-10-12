// Copies the web app into desktop/app so the desktop build ships the same Lapwall.
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '..'), out = join(here, 'app');
rmSync(out, { recursive: true, force: true }); mkdirSync(out);
for (const f of ['index.html', 'manifest.webmanifest', 'css', 'js', 'icons', 'fonts']) cpSync(join(root, f), join(out, f), { recursive: true });
console.log('Copied web app into desktop/app');
