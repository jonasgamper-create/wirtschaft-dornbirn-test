import { access, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const required = ['index.html', 'app.js', 'styles.css', 'truck-motion.js', 'data/events.json', 'wirtschaft-events.ics', 'sitemap.xml', 'datenschutz-sicherheit.html', 'impressum.html'];
const forbidden = ['gastgeber.html', 'gastgeber.js', 'gastgeber.css', 'gastgeber-mobile-fix.css', 'inventory-store.js', 'entwuerfe.html', 'drafts.css', 'entwuerfe.css', 'ticketing-cinematic.css', 'truck-experience.css'];

for (const file of required) await access(path.join(output, file));
const files = await readdir(output);
for (const file of files) {
  if (forbidden.includes(file) || file.startsWith('gastgeber') || file.startsWith('entwurf-')) {
    throw new Error(`Interne Datei im öffentlichen Build: ${file}`);
  }
}

console.log('Public-Build-Prüfung OK.');
