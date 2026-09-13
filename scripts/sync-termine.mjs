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
import { holeTermin } from '../server/src/ticketist.mjs';
import { holeProgramm } from '../server/src/kulturhaus.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ziel = path.join(root, 'site', 'data', 'termine.json');
const bilderOrdner = path.join(root, 'site', 'assets', 'events', 'ticketist');

const vorher = JSON.parse(await readFile(ziel, 'utf8').catch(() => '{"kennungen":[]}'));
const kennungen = [...new Set(vorher.kennungen || [])].sort();
if (!kennungen.length) {
  console.error('sync-termine FEHLER: keine Kennungen in site/data/termine.json.');
  process.exit(1);
}

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

// Das Programm des Kulturhauses sagt, WELCHE Abende es gibt - auch die, die
// beim Ticketdienst (noch) keine eigene Seite haben. Der Dienst im Haus liest
// dieselbe Seite; hier geht es nur um den hinterlegten Stand und die Bilder.
const programm = await holeProgramm() || [];
const ausProgramm = new Map(programm.map(e => [e.id, e]));
const alleKennungen = [...new Set([...kennungen, ...ausProgramm.keys()])].sort();

const termine = [];
const nurKulturhaus = [];
const nachQuelle = new Map();
let geholt = 0;

for (const kennung of alleKennungen) {
  let termin = await holeTermin(kennung);
  if (!termin) {
    // Kein Eintrag beim Ticketdienst: steht der Abend im Programm des
    // Kulturhauses, kommt er von dort - mit dem Shop des Hauses als
    // Ticketweg, bis er beim Ticketdienst auftaucht.
    const roh = ausProgramm.get(kennung);
    if (!roh) continue;
    nurKulturhaus.push(kennung);
    termin = {
      id: roh.id, date: roh.date, zeit: '', title: roh.title,
      untertitel: roh.programm || '', ort: 'Kulturhaus Dornbirn', haus: 'kulturhaus',
      adresse: 'Rathausplatz 1, Dornbirn', beschreibung: '',
      bildQuelle: roh.bildQuelle || '', ticketUrl: roh.infoUrl, buchbar: true,
      quelle: 'kulturhaus'
    };
  } else {
    termin.quelle = 'ticketist';
  }

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

termine.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

if (nurKulturhaus.length) {
  console.log(`  Nur im Kulturhaus-Programm (noch nicht beim Ticketdienst): ${nurKulturhaus.join(', ')}`);
}
if (!termine.length) {
  console.error('sync-termine FEHLER: kein einziger Termin gelesen - die alte Datei bleibt stehen.');
  process.exit(1);
}

await writeFile(ziel, JSON.stringify({
  version: 1,
  updatedAt: new Date().toISOString().slice(0, 10),
  quelle: 'https://www.ticketist.io/events/<kennung>',
  kennungen: alleKennungen,
  termine
}, null, 2) + '\n');

const haeuser = termine.reduce((zahl, t) => ({ ...zahl, [t.haus]: (zahl[t.haus] || 0) + 1 }), {});
console.log(`Termine: ${termine.length} gelesen (${Object.entries(haeuser).map(([h, n]) => `${n}× ${h}`).join(', ')}), `
  + `${geholt} Bilder neu geholt${nurKulturhaus.length ? `, davon ${nurKulturhaus.length} aus dem Kulturhaus-Programm` : ''}.`);
