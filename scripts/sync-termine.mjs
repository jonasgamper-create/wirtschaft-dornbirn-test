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
/** 1200er-Fassung -> 2x-Fassung, damit geteilte Aufnahmen beide bekommen. */
const zweifach = new Map();

/** Aus einem geladenen Bild ein webp machen; ohne cwebp bleibt das Original. */
function alsWebp(rohdatei, zieldatei) {
  try {
    execFileSync('cwebp', ['-quiet', '-q', '72', '-resize', '1200', '0', rohdatei, '-o', zieldatei]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Die scharfe Fassung fuer Retina-Bildschirme (Jonas, 24.09.: "1500x3000"):
 * hoechstens 1500 px hoch und 3000 px breit, nie hochgerechnet. Die Kachel
 * laedt sie nur auf Bildschirmen, die die Pixel auch zeigen (srcset 2x); am
 * Telefon bleibt die 1200er-Fassung, damit die Seite leicht bleibt.
 */
function alsWebp2x(rohdatei, zieldatei) {
  try {
    let breite = 0; let hoehe = 0;
    try {
      const mass = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', rohdatei]).toString();
      breite = Number(/pixelWidth:\s*(\d+)/.exec(mass)?.[1] || 0);
      hoehe = Number(/pixelHeight:\s*(\d+)/.exec(mass)?.[1] || 0);
    } catch { /* ohne sips: Groesse unbekannt, dann Hoehe 1500 als Ziel */ }
    const groesse = hoehe > 1500 ? ['-resize', '0', '1500']
      : breite > 3000 ? ['-resize', '3000', '0']
      : (breite && hoehe) ? [] : ['-resize', '0', '1500'];
    execFileSync('cwebp', ['-quiet', '-q', '60', ...groesse, rohdatei, '-o', zieldatei]);
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

// Der bisherige Stand. Er ist der Rueckfall fuer jeden Abend, der sich
// gerade nicht lesen laesst: ein Aussetzer beim Ticketdienst darf keinen
// kommenden Abend aus der Datei loeschen. Genau das ist am 20.09.2026
// passiert - der Abend am 22.09. war nach einem einzigen misslungenen
// Abruf weg, ohne dass es jemandem aufgefallen waere.
const bisher = await readFile(ziel, 'utf8').then(JSON.parse).catch(() => ({ termine: [] }));
const bisherNachId = new Map((bisher.termine || []).map(t => [t.id, t]));

const termine = [];
const fehlend = [];
const nachQuelle = new Map();
let geholt = 0;

for (const kennung of kennungen) {
  // Zwei Versuche: der Ticketdienst antwortet gelegentlich nicht, und ein
  // einzelner Aussetzer soll keinen Abend kosten.
  let termin = await holeTermin(kennung);
  if (!termin) {
    await new Promise(fertig => setTimeout(fertig, 1500));
    termin = await holeTermin(kennung);
  }
  if (!termin) { fehlend.push(kennung); continue; }
  termin.preise = preise[kennung] || [];

  if (termin.bildQuelle) {
    // Dieselbe Aufnahme für mehrere Abende (die drei Luis-Termine teilen
    // sich ein Pressefoto): einmal holen genügt.
    const schon = nachQuelle.get(termin.bildQuelle);
    if (schon) { termin.bild = schon; if (zweifach.get(schon)) termin.bild2x = zweifach.get(schon); }
    else {
      const name = `${kennung}.webp`;
      const name2x = `${kennung}@2x.webp`;
      termin.bild = `assets/events/ticketist/${name}`;
      nachQuelle.set(termin.bildQuelle, termin.bild);
      if (vorhanden.has(name2x)) { termin.bild2x = `assets/events/ticketist/${name2x}`; zweifach.set(termin.bild, termin.bild2x); }
      // Auch holen, wenn nur die scharfe Fassung fehlt (seit 24.09.).
      if (!vorhanden.has(name) || !vorhanden.has(name2x)) {
        try {
          const antwort = await fetch(termin.bildQuelle);
          if (!antwort.ok) throw new Error(String(antwort.status));
          const roh = path.join(bilderOrdner, `${kennung}.roh`);
          await writeFile(roh, Buffer.from(await antwort.arrayBuffer()));
          const klein = vorhanden.has(name) || alsWebp(roh, path.join(bilderOrdner, name));
          if (klein && alsWebp2x(roh, path.join(bilderOrdner, name2x))) {
            termin.bild2x = `assets/events/ticketist/${name2x}`;
            zweifach.set(termin.bild, termin.bild2x);
          }
          if (klein) await rm(roh, { force: true });
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

// Was auch beim zweiten Versuch nicht kam: den bisherigen Eintrag behalten,
// solange der Abend nicht vorbei ist. Ein alter Stand ist besser als eine
// Luecke - die Kachel bleibt stehen, der Ticketlink stimmt weiter.
const heute = new Date().toISOString().slice(0, 10);
const gerettet = [];
for (const kennung of fehlend) {
  const alt = bisherNachId.get(kennung);
  if (alt && alt.date >= heute) { abende.push(alt); gerettet.push(kennung); }
}
if (gerettet.length) {
  abende.sort((a, b) => a.date.localeCompare(b.date) || String(a.zeit).localeCompare(String(b.zeit)));
  console.warn(`  Aus dem bisherigen Stand behalten: ${gerettet.join(', ')}`);
}

if (fehlend.length) {
  console.warn(`  Nicht gelesen: ${fehlend.join(', ')}`);
  console.warn('  (Kennung falsch geschrieben, oder der Termin ist beim Dienst nicht mehr da.)');
}

// Mehr als eine Handvoll Ausfaelle heisst: beim Ticketdienst klemmt etwas.
// Dann wird die gute Datei NICHT durch eine halbe ersetzt.
const verloren = fehlend.filter(k => !gerettet.includes(k));
if (fehlend.length > 5) {
  console.error(`sync-termine FEHLER: ${fehlend.length} Abende nicht lesbar - die alte Datei bleibt stehen.`);
  process.exit(1);
}
if (verloren.length) {
  console.warn(`  Ohne Eintrag (weder gelesen noch im bisherigen Stand): ${verloren.join(', ')}`);
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
