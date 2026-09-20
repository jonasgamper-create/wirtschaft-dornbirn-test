// Die Termine beider Häuser einmal zu uns holen: Daten und Bilder.
//
//   npm run sync:termine
//
// Gelesen wird beim Ticketdienst - eine Kennung je Abend, dieselbe, unter
// der dort verkauft wird. Die Liste der Kennungen steht in
// site/data/termine.json und ist das Einzige, was von Hand gepflegt wird;
// alles andere (Name, Untertitel, Tag, Uhrzeit, Ort, Bild, Beschreibung)
// kommt vom Dienst.
//
// Der Dienst im Haus liest dieselbe Liste selbst und mehrmals täglich - auf
// der Eventseite steht also immer der aktuelle Stand, auch ohne diesen
// Schritt. Was der Dienst nicht kann, sind die Fotos: sie wandern hier
// einmal zu uns, damit kein Gast beim Blättern eine Spur beim Ticketdienst
// hinterlässt.
//
// Neue Kennung? In termine.json eintragen, diesen Schritt laufen lassen -
// oder sie dem Dienst nennen, der holt sie beim nächsten Durchgang selbst.

import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gruppiere, holeTermin, KENNUNGEN } from '../server/src/ticketist.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ziel = path.join(root, 'site', 'data', 'termine.json');
const bilderOrdner = path.join(root, 'site', 'assets', 'events', 'ticketist');

const kennungen = [...KENNUNGEN].sort();

await mkdir(bilderOrdner, { recursive: true });
const vorhanden = new Set(await readdir(bilderOrdner).catch(() => []));

/** Aus einem geladenen Bild ein webp machen; ohne cwebp bleibt das Original. */
function alsWebp(rohdatei, zieldatei) {
  try {
    execFileSync('cwebp', ['-quiet', '-q', '72', '-resize', '1200', '0', rohdatei, '-o', zieldatei]);
    return true;
  } catch {
    return false;
  }
}

// Die Preise stehen nicht auf der oeffentlichen Eventseite - der Dienst gibt
// sie nur im Verwaltungsbereich heraus. Sie liegen deshalb als eigene Datei
// im Projekt (site/data/ticketist-preise.json, gelesen am 14.09.) und werden
// hier zu den Terminen gelegt. Preise aendern sich selten; ob noch Karten da
// sind, kommt live von der Eventseite.
const preisDatei = JSON.parse(await readFile(path.join(root, 'site', 'data', 'ticketist-preise.json'), 'utf8'));
const preise = preisDatei.preise || {};

const termine = [];
const fehlend = [];
const nachQuelle = new Map();
let geholt = 0;

for (const kennung of kennungen) {
  const termin = await holeTermin(kennung);
  if (!termin) { fehlend.push(kennung); continue; }
  termin.preise = preise[kennung] || [];

  if (termin.bildQuelle) {
    // Dieselbe Aufnahme für mehrere Abende (die drei Luis-Termine teilen
    // sich ein Pressefoto): einmal holen genügt.
    const schon = nachQuelle.get(termin.bildQuelle);
    if (schon) termin.bild = schon;
    else {
      const name = `${kennung}.webp`;
      termin.bild = `assets/events/ticketist/${name}`;
      nachQuelle.set(termin.bildQuelle, termin.bild);
      if (!vorhanden.has(name)) {
        try {
          const antwort = await fetch(termin.bildQuelle);
          if (!antwort.ok) throw new Error(String(antwort.status));
          const roh = path.join(bilderOrdner, `${kennung}.roh`);
          await writeFile(roh, Buffer.from(await antwort.arrayBuffer()));
          if (alsWebp(roh, path.join(bilderOrdner, name))) await rm(roh, { force: true });
          else {
            const ersatz = `${kennung}.jpg`;
            await rename(roh, path.join(bilderOrdner, ersatz));
            termin.bild = `assets/events/ticketist/${ersatz}`;
            nachQuelle.set(termin.bildQuelle, termin.bild);
          }
          geholt += 1;
        } catch (fehler) {
          console.warn(`  Bild fehlt: ${kennung} (${fehler.message}) - dort steht vorerst ein Abendfoto.`);
          delete termin.bild;
          nachQuelle.delete(termin.bildQuelle);
        }
      }
    }
  }

  // Die Adresse des Bildes beim Dienst gehört nicht in die veröffentlichte
  // Datei: sie würde einladen, doch wieder von außen zu laden.
  const { bildQuelle, ...schlank } = termin;
  termine.push(schlank);
}

// Zwei Wege zu einem Abend zusammenlegen - dieselbe Regel wie im Dienst.
const abende = gruppiere(termine);
// Die Preise des zweiten Weges haengen an SEINER Kennung ("comedy only" hat
// eigene Kategorien). Bis 20.09. bekamen nur die Hauptwege ihre Preise -
// ein zweiter Weg mit 0 frei stand auf der Seite als buchbar (rock4,
// 22.10.: "konzert only" war laut Liste weg, der Knopf sagte "buchbar").
for (const abend of abende) {
  for (const v of abend.varianten || []) v.preise = preise[v.id] || [];
}

if (fehlend.length) {
  console.warn(`  Nicht gelesen: ${fehlend.join(', ')}`);
  console.warn('  (Kennung falsch geschrieben, oder der Termin ist beim Dienst nicht mehr da.)');
}
if (!termine.length) {
  console.error('sync-termine FEHLER: kein einziger Termin gelesen - die alte Datei bleibt stehen.');
  process.exit(1);
}

await writeFile(ziel, JSON.stringify({
  version: 1,
  updatedAt: new Date().toISOString().slice(0, 10),
  quelle: 'https://www.ticketist.io/events/<kennung>',
  kennungen,
  termine: abende
}, null, 2) + '\n');

const haeuser = abende.reduce((zahl, t) => ({ ...zahl, [t.haus]: (zahl[t.haus] || 0) + 1 }), {});
const zweiWege = abende.filter(a => a.varianten?.length).length;
console.log(`Termine: ${abende.length} Abende (${termine.length} Veranstaltungen, ${zweiWege} mit zweitem Ticketweg)`
  + ` (${Object.entries(haeuser).map(([h, n]) => `${n}× ${h}`).join(', ')}), `
  + `${geholt} Bilder neu geholt${fehlend.length ? `, ${fehlend.length} ohne Treffer` : ''}.`);
