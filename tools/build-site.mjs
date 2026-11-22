// Copies the game into dist/site/piano-quest/ so it can be served from a
// sub-path (johnshawler.com/piano-quest). Run with: node tools/build-site.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist', 'site', 'piano-quest');
const items = ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'icons', 'licenses'];

fs.rmSync(path.join(root, 'dist', 'site'), { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const item of items) fs.cpSync(path.join(root, item), path.join(out, item), { recursive: true });

const count = fs.readdirSync(out, { recursive: true }).filter(f => fs.statSync(path.join(out, f)).isFile()).length;
console.log('Wrote ' + count + ' files to ' + path.relative(root, out));
