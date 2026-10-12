// Builds dist/pit-wall.html: one self-contained file (CSS, fonts and JS inlined) you can copy anywhere.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
let html = await readFile(join(root, 'index.html'), 'utf8');

// fonts as data URIs
let fonts = await readFile(join(root, 'css/fonts.css'), 'utf8');
for (const m of [...fonts.matchAll(/url\("\.\.\/fonts\/([^"]+)"\)/g)]) {
  const b64 = (await readFile(join(root, 'fonts', m[1]))).toString('base64');
  fonts = fonts.replace(m[0], `url("data:font/woff2;base64,${b64}")`);
}
const css = await readFile(join(root, 'css/style.css'), 'utf8');
html = html.replace('<link rel="stylesheet" href="css/fonts.css">\n', '')
  .replace('<link rel="stylesheet" href="css/style.css">', `<style>\n${fonts}\n${css}</style>`)
  .replace(/<link rel="manifest"[^>]*>\n/, '').replace(/<link rel="icon"[^>]*>\n/, '')
  // the single file inlines its scripts, so the source CSP (script-src 'self') does not apply; hosts set their own
  .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>\n/, '');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>\n?/g)];
let bundle = '';
for (const m of scripts) bundle += `\n/* ${m[1]} */\n` + await readFile(join(root, m[1]), 'utf8');
html = html.replace(/(<script src="[^"]+"><\/script>\n?)+/, `<script>${bundle.replace(/<\/script/gi, '<\\/script')}</script>\n`);
await mkdir(join(root, 'dist'), { recursive: true });
await writeFile(join(root, 'dist/pit-wall.html'), html);
// Embeddable variant: body content plus styles and script, without the document wrapper.
const head = html.slice(html.indexOf('<title>'), html.indexOf('</head>')).replace(/<meta[^>]*>\n/g, '');
const body = html.slice(html.indexOf('<!--BODY-START-->'), html.indexOf('</body>'));
await writeFile(join(root, 'dist/pit-wall-embed.html'), head + body);
console.log('Built dist/pit-wall.html (' + Math.round(html.length / 1024) + ' KB)');
