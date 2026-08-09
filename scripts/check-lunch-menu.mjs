import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const fail = message => errors.push(`Mittagskarten-Prüfung: ${message}`);
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

const data = JSON.parse(await readFile(path.join(root, 'site/data/lunch-menu.json'), 'utf8'));
const index = await readFile(path.join(root, 'site/index.html'), 'utf8');

if (!['pause', 'active'].includes(data.status)) fail('status muss "pause" oder "active" sein.');
if (!/^https:\/\/([\w-]+\.)*wirtschaft-dornbirn\.at\//i.test(data.reservationUrl || '')) {
  fail('reservationUrl muss auf die offizielle Domain zeigen.');
}
if (!Number.isFinite(Date.parse(data.updatedAt || ''))) fail('updatedAt ist kein gültiger Zeitstempel.');

if (data.card?.file) {
  try {
    await access(path.join(root, 'site', data.card.file));
  } catch {
    fail(`Die hinterlegte Mittagskarte fehlt: site/${data.card.file}`);
  }
  if (!/^downloads\/mittagskarte\/\d{4}-\d{2}-\d{2}_/.test(data.card.file)) {
    fail('Die Karte gehört nach downloads/mittagskarte/ und beginnt mit ihrem Datum.');
  }
}

for (const [i, day] of (data.days || []).entries()) {
  if (!isoDate.test(day?.date || '')) fail(`days[${i}].date ist kein ISO-Datum.`);
  if (!Array.isArray(day?.dishes) || !day.dishes.length) fail(`days[${i}] hat keine Gerichte.`);
  for (const [d, dish] of (day?.dishes || []).entries()) {
    if (!dish?.title?.trim()) fail(`days[${i}].dishes[${d}].title fehlt.`);
  }
}

if (data.status === 'active' && !(data.days || []).length) {
  fail('status "active" braucht mindestens einen Tag mit Gerichten.');
}
if (data.status === 'pause' && !data.pauseNote?.trim()) fail('pauseNote fehlt für den Pausenzustand.');

if (!/data-lunch-menu/.test(index)) fail('Der Menüblock [data-lunch-menu] fehlt auf der Gästeseite.');
if (/subject=Tischreservierung/.test(index)) {
  fail('Reservierung per E-Mail wurde entfernt und darf nicht zurueckkommen.');
}
if (!index.includes(data.reservationUrl)) fail('Der offizielle Reservierungslink fehlt auf der Gästeseite.');

const invented = ['Vorarlberger Hauptgang', '18,90', '5,50'];
for (const marker of invented) {
  if (index.includes(marker)) fail(`Unbestätigter Menü-Platzhalter "${marker}" steht wieder im HTML.`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Mittagskarten-Prüfung OK: status ${data.status}, ${(data.days || []).length} Tage, Karte ${data.card?.file ? 'hinterlegt' : 'ohne PDF'}.`);
