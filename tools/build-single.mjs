// Bundles the game into one self-contained HTML file: dist/piano-quest.html
// Handy for sharing the game as a single file. Run with: node tools/build-single.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

let html = read('index.html');
html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (_, f) => '<style>\n' + read(f) + '</style>');
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, f) => '<script>\n' + read(f).replace(/<\/script/g, '<\\/script') + '</script>');
// A single file has no manifest, icons or service worker next to it.
html = html.replace(/<link rel="(manifest|apple-touch-icon|icon)"[^>]*>\n/g, '');

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', 'piano-quest.html');
fs.writeFileSync(out, html);
console.log('Wrote ' + path.relative(root, out) + ' (' + Math.round(html.length / 1024) + ' KB)');
