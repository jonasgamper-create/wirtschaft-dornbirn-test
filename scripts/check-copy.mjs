import { readFile } from 'node:fs/promises';

const files = ['site/index.html', 'site/feste-catering.html', 'site/impressum.html', 'site/datenschutz-sicherheit.html'];
const contents = await Promise.all(files.map(async file => [file, await readFile(file, 'utf8')]));
const errors = [];

for (const [file, html] of contents) {
  if (!/<html[^>]+lang="de"/i.test(html)) errors.push(`${file}: lang="de" fehlt`);
  if (/\bMittags\s+Mittagsmenü\b/i.test(html)) errors.push(`${file}: doppeltes "Mittags Mittagsmenü"`);
  if (/\bStandart\b/i.test(html)) errors.push(`${file}: "Standart" statt "Standard"`);
  if (/href="#"/i.test(html)) errors.push(`${file}: leerer Anker href="#"`);
}

const index = contents.find(([file]) => file === 'site/index.html')[1];
if (/class="experience-actions"/.test(index)) {
  errors.push('site/index.html: Header bleibt ohne Schnellaktionen – Buchungswege liegen im Inhalt');
}
const lunchSection = index.match(/<section[^>]*id="concept-03"[\s\S]*?<\/section>/)?.[0] || '';
// Der Weg zur Reservierung darf ueber die eigene Seite laufen, muss dort aber
// beim offiziellen Anbieter enden.
const reservierung = await readFile('site/tischreservierung.html', 'utf8');
if (!/tischreservierung\.html|tischreservierung\.wirtschaft-dornbirn\.at/.test(lunchSection)) {
  errors.push('site/index.html: Im Mittagsbereich fehlt der Weg zur Reservierung');
}
// Der externe Anbieter ist entfernt: die Wirtschaft nimmt Mittagsreservierungen
// selbst entgegen. Zwei Wege zum selben Ziel waren einer zu viel, und der
// zweite fuehrte aus der Seite hinaus. Was bleiben muss, ist die Telefonnummer
// - ohne sie stuende ein Gast ohne Ausweg da, wenn online nichts frei ist.
if (/tischreservierung\.wirtschaft-dornbirn\.at/.test(reservierung)) {
  errors.push('site/tischreservierung.html: Der alte externe Anbieter wurde bewusst entfernt');
}
if (!/tel:\+43557220540/.test(reservierung)) {
  errors.push('site/tischreservierung.html: Die Telefonnummer fehlt als Ausweg');
}
// Erhoben wird der Name und genau eine Erreichbarkeit: E-Mail oder Telefon.
// Beides steht dort aus einem Grund - eine Absage des Hauses muss ankommen -
// und beides zusammen ist die Obergrenze. Anschrift, Geburtsdatum oder ein
// Konto haben auf dieser Seite nichts verloren; die Grenze steht hier, damit
// sie nicht beim naechsten Wunsch stillschweigend verschoben wird.
const mailFelder = (reservierung.match(/type="email"/g) || []).length;
const telFelder = (reservierung.match(/type="tel"/g) || []).length;
if (mailFelder > 1 || telFelder > 1) {
  errors.push('site/tischreservierung.html: Eine Erreichbarkeit genügt – je ein Feld für Mail und Telefon');
}
if (/name="(adresse|strasse|straße|plz|ort|geburt|firma)"/i.test(reservierung)) {
  errors.push('site/tischreservierung.html: Diese Seite darf keine weiteren persönlichen Daten abfragen');
}
// Ein vorausgefuelltes Haekchen waere keine Einwilligung.
if (/id="guestNewsletter"[^>]*\schecked/i.test(reservierung)) {
  errors.push('site/tischreservierung.html: Die Anmeldung zur Mittagskarte darf nicht vorausgewählt sein');
}
// Kopplung waere unzulaessig: der Tisch darf nie an der Anmeldung haengen.
if (/required[^>]*id="guestNewsletter"|id="guestNewsletter"[^>]*required/i.test(reservierung)) {
  errors.push('site/tischreservierung.html: Die Anmeldung zur Mittagskarte darf keine Pflicht sein');
}
if (/Abendtisch|Tisch am Abend|abends reservieren/i.test(index)) {
  errors.push('site/index.html: Abends gibt es nur Events, keine Tischreservierung');
}
const topHeader = index.match(/<header[\s\S]*?<\/header>/i)?.[0] || '';
if (/\bTee\b/i.test(topHeader)) errors.push('site/index.html: oberer Header darf nicht "Tee" enthalten');
for (const marker of ['og:image', 'twitter:card', 'application/ld+json', 'canonical']) {
  if (!index.includes(marker)) errors.push(`site/index.html: SEO-Marker ${marker} fehlt`);
}


// Die alte Catering-Zeile klang zweideutig und darf nicht zurueckkehren.
if (/dreht auf/i.test(index)) {
  errors.push('site/index.html: Die alte, zweideutige Catering-Zeile ist wieder da');
}


// Strukturierte Daten muessen gueltiges JSON sein - sonst ignoriert Google sie
// vollstaendig, ohne dass man es der Seite ansieht.
for (const [file, html] of contents) {
  for (const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(block[1].trim()); }
    catch { errors.push(`${file}: JSON-LD ist kein gueltiges JSON`); }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Copy-/SEO-Prüfung OK: ${files.length} Seiten, keine bekannten Schreibfehler.`);
