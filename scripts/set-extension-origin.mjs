// Usage: node scripts/set-extension-origin.mjs https://your-app.onrender.com
// Adds your hosted web app origin to the extension manifest so the Buy bridge works there.
import { readFileSync, writeFileSync } from 'node:fs';

const origin = process.argv[2];
if (!origin || !/^https?:\/\/[^/]+$/.test(origin)) {
  console.error('Usage: node scripts/set-extension-origin.mjs https://your-app.example.com');
  process.exit(1);
}
const file = new URL('../extension/manifest.json', import.meta.url);
const manifest = JSON.parse(readFileSync(file, 'utf8'));
const pattern = `${origin}/*`;
const matches = manifest.content_scripts[0].matches;
if (!matches.includes(pattern)) matches.push(pattern);
writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Added ${pattern}. Reload the extension at chrome://extensions.`);
