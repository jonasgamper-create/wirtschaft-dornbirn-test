// Baut aus der echten Mittagskarte den fertigen Story-Text fuer Instagram.
//
// Der Hausstil steht fest: abgedunkeltes Foto, grosse Goldschrift klein
// geschrieben, unten die zwei umrandeten Kaesten. Was jede Woche wechselt,
// sind nur die Gerichte - und die stehen bereits im Dienst. Dieses Skript
// nimmt sie und legt den fertigen Textbaustein ab, damit in Canva nur noch
// eingefuegt und exportiert wird. Es veroeffentlicht nichts.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const quelle = path.join(root, 'site', 'data', 'lunch-menu.json');
const ordner = path.join(root, 'output', 'social-canva', 'wochenkarte');

const daten = JSON.parse(await readFile(quelle, 'utf8'));
const tage = [...(daten.days || [])].sort((a, b) => a.date.localeCompare(b.date));

if (!tage.length) {
  console.log('Wochenkarte-Story: keine Tage hinterlegt, nichts zu tun.');
  process.exit(0);
}

const wochentag = datum => new Intl.DateTimeFormat('de-AT', { weekday: 'long' })
  .format(new Date(`${datum}T12:00:00`)).toLowerCase();
const kurz = datum => new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: '2-digit' })
  .format(new Date(`${datum}T12:00:00`));

// Alles klein - die Handschrift des Hauses, wie auf der Webseite.
const klein = text => String(text).toLowerCase();

const zeilen = tage.map(tag => {
  const gerichte = (tag.dishes || []).map(g => `${klein(g.title)} · ${klein(g.price)}`);
  return { tag: wochentag(tag.date), datum: kurz(tag.date), gerichte };
});

const fenster = daten.serviceWindow || 'mo–fr 11:30–13:30';
const kopfzeile = `${klein(fenster)}`;

const story = [
  'headline: die wochenkarte.',
  `label oben: ${kopfzeile}`,
  '',
  ...zeilen.flatMap(z => [
    `${z.tag}, ${z.datum}`,
    ...z.gerichte.map(g => `  ${g}`),
    ''
  ]),
  'kasten links: mo–fr · 11:30–13:30',
  'kasten rechts: „wirtschaft" bahnhofstraße 24 · 6850 dornbirn',
  '',
  'hinweis: auch zum mitnehmen · takeaway bis 13:45 bestellen'
].join('\n');

const bildunterschrift = [
  'diese woche auf dem teller 👇',
  '',
  ...zeilen.map(z => `${z.tag}: ${z.gerichte.map(g => g.split(' · ')[0]).join(', ')}`),
  '',
  'mo–fr 11:30–13:30 · bahnhofstraße 24 · auch zum mitnehmen',
  '#wirtschaftdornbirn #mittagstisch #dornbirn #vorarlberg'
].join('\n');

await mkdir(ordner, { recursive: true });
await writeFile(path.join(ordner, 'story-text.txt'), story + '\n');
await writeFile(path.join(ordner, 'bildunterschrift.txt'), bildunterschrift + '\n');
await writeFile(path.join(ordner, 'wochenkarte.json'), JSON.stringify({
  erzeugtAus: 'site/data/lunch-menu.json',
  stand: daten.updatedAt,
  fenster,
  tage: zeilen
}, null, 2) + '\n');

console.log(`Wochenkarte-Story OK: ${zeilen.length} Tage, Text unter output/social-canva/wochenkarte/.`);
