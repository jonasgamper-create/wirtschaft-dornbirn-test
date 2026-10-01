// Uebergabe-Pruefung (01.10.): was haengt noch an Jonas oder an einer
// Testadresse? Zeigt eine Ampel je Punkt. Bricht nie ab (ausser --streng),
// weil "offen" vor der Uebergabe der Normalfall ist.
import { readFile } from 'node:fs/promises';

const streng = process.argv.includes('--streng');
const lies = p => readFile(p, 'utf8');
const haus = JSON.parse(await lies('site/data/haus.json'));
const wrangler = await lies('server/wrangler.jsonc');
const qr = await lies('site/data/qr-ziele.json');
const ticketist = await lies('server/src/ticketist.mjs');

const punkte = [
  ['Dienst im Konto des Kunden (haus.json)', !/jonas-gamper\.workers\.dev/.test(JSON.stringify(haus))],
  ['Dienst-Variablen ohne Jonas-Konto (DIENST_BASIS)', !/jonas-gamper\.workers\.dev/.test(wrangler)],
  ['Tageszettel an den Wirt, nicht an Jonas (WIRT_MAIL)', !/jonas\.gamper@aon\.at/.test(wrangler)],
  ['Seite unter der eigenen Domain (GAESTE_SEITE)', /"GAESTE_SEITE": "https:\/\/(www\.)?wirtschaft-dornbirn\.at"/.test(wrangler)],
  ['Keine Test- oder GitHub-Adresse mehr erlaubt (ALLOWED_ORIGINS)', !/pages\.dev|github\.io/.test((wrangler.match(/"ALLOWED_ORIGINS": "([^"]*)"/) || [])[1] || '')],
  ['QR-Codes zeigen auf die eigene Domain', /wirtschaft-dornbirn\.at\//.test(qr) && !/pages\.dev|github\.io/.test(qr)],
  ['Quelle neuer Abende ist nicht die abgeloeste WordPress-Eventseite', !/'https:\/\/wirtschaft-dornbirn\.at\/event\/'/.test(ticketist)]
];

console.log('Übergabe-Prüfung – was noch an Jonas oder an Testadressen hängt\n');
for (const [was, ok] of punkte) console.log(`  ${ok ? '✓ erledigt' : '○ offen   '}  ${was}`);
const offen = punkte.filter(([, ok]) => !ok).length;
console.log(`\n${offen ? `${offen} von ${punkte.length} Punkten offen` : 'Alles übergeben.'} – Ablauf: docs/uebergabe-wirtschaft.md`);
console.log('Nicht im Code prüfbar: Geheimnisse (HAUS_TOKEN, BREVO_KEY, BREVO_ABSENDER, VAPID_PRIVAT) neu erzeugt? Konten übertragen? Siehe Abnahme.');
if (streng && offen) process.exit(1);
