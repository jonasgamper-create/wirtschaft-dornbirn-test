import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const fail = message => errors.push(`Mittagsmenü-Prüfung: ${message}`);

const data = JSON.parse(await readFile(path.join(root, 'site/data/lunch-menu.json'), 'utf8'));
const index = await readFile(path.join(root, 'site/index.html'), 'utf8');

const section = index.match(/<div class="lunch-menu"[\s\S]*?<\/div>\s*<div class="party-sizes/)?.[0];
if (!section) fail('Der Menüblock .lunch-menu fehlt auf der Gästeseite.');

for (const course of data.courses || []) {
  if (section && !section.includes(course.title)) fail(`Gang "${course.title}" steht in lunch-menu.json, aber nicht auf der Seite.`);
  if (section && !section.includes(course.price)) fail(`Preis "${course.price}" für "${course.title}" fehlt auf der Seite.`);
}

if (!/href="mailto:willkommen@wirtschaft-dornbirn\.at\?subject=Tischreservierung/.test(index)) {
  fail('Der E-Mail-Reservierungsweg fehlt.');
}
if (!index.includes(data.reservationUrl)) fail('Der offizielle Reservierungslink fehlt auf der Gästeseite.');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Mittagsmenü-Prüfung OK: ${data.courses.length} Gänge synchron, Reservierungswege vorhanden.`);
