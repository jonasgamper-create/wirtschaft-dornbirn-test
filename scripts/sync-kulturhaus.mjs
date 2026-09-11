// Das Kulturhaus-Programm einmal zu uns holen: Liste und Bilder.
//
// Der Dienst liest das Programm selbst und mehrmals taeglich - auf der
// Eventseite steht also immer der aktuelle Stand, auch ohne diesen Schritt.
// Was der Dienst NICHT kann, sind die Fotos: sie liegen bei eugen.family,
// und kein Gast soll beim Blaettern eine Spur auf einer fremden Seite
// hinterlassen. Deshalb wandern sie einmal zu uns.
//
//   npm run sync:kulturhaus
//
// Der Schritt schreibt zwei Dinge:
//   1. site/data/kulturhaus.json  - der Stand als Rueckfallebene, falls der
//      Dienst gerade nicht antwortet (dieselbe Rolle wie events.json).
//   2. site/assets/events/kulturhaus/<kennung>.webp - die Fotos.
//
// Neue Termine erscheinen auch ohne diesen Schritt; sie tragen dann so
// lange ein Abendfoto aus unserem Haus, bis jemand den Abgleich laufen
// laesst. Besser ein Bild von uns als eine Luecke oder ein Nachladen von
// aussen.

import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { holeProgramm, KULTURHAUS_SEITE } from '../server/src/kulturhaus.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ziel = path.join(root, 'site', 'data', 'kulturhaus.json');
const bilderOrdner = path.join(root, 'site', 'assets', 'events', 'kulturhaus');

const events = await holeProgramm();
if (!events) {
  console.error('sync-kulturhaus FEHLER: von ' + KULTURHAUS_SEITE + ' kam kein lesbares Programm.');
  console.error('Die bestehende Datei bleibt unveraendert - lieber ein alter Stand als ein leerer.');
  process.exit(1);
}

await mkdir(bilderOrdner, { recursive: true });
const vorhanden = new Set(await readdir(bilderOrdner).catch(() => []));

/**
 * Aus einem geladenen Bild ein webp machen. Die Pressefotos kommen als JPEG
 * mit bis zu einem halben Megabyte; als webp sind es 20 bis 40 Kilobyte bei
 * gleichem Eindruck. Fehlt cwebp auf dem Rechner, bleibt das Original -
 * ein grosses Bild ist besser als keines.
 */
function alsWebp(rohdatei, zieldatei) {
  try {
    execFileSync('cwebp', ['-quiet', '-q', '72', '-resize', '1200', '0', rohdatei, '-o', zieldatei]);
    return true;
  } catch {
    return false;
  }
}

// Dieselbe Aufnahme fuer mehrere Abende: die drei Luis-Termine teilen sich
// ein Pressefoto. Es einmal zu holen spart ein halbes Megabyte im Repo.
const nachQuelle = new Map();
let geholt = 0;

for (const event of events) {
  if (!event.bildQuelle) continue;
  const schon = nachQuelle.get(event.bildQuelle);
  if (schon) { event.bild = schon; continue; }

  const name = `${event.id}.webp`;
  const pfad = path.join(bilderOrdner, name);
  event.bild = `assets/events/kulturhaus/${name}`;
  nachQuelle.set(event.bildQuelle, event.bild);
  if (vorhanden.has(name)) continue;

  try {
    const antwort = await fetch(event.bildQuelle);
    if (!antwort.ok) throw new Error(String(antwort.status));
    const roh = path.join(bilderOrdner, `${event.id}.roh`);
    await writeFile(roh, Buffer.from(await antwort.arrayBuffer()));
    const umgewandelt = alsWebp(roh, pfad);
    if (!umgewandelt) {
      const endung = (event.bildQuelle.match(/\.(jpe?g|png|webp)(?:\?|$)/i)?.[1] || 'jpg').toLowerCase();
      const ersatz = `${event.id}.${endung === 'jpeg' ? 'jpg' : endung}`;
      await rename(roh, path.join(bilderOrdner, ersatz));
      event.bild = `assets/events/kulturhaus/${ersatz}`;
      nachQuelle.set(event.bildQuelle, event.bild);
    } else {
      await rm(roh, { force: true });
    }
    geholt += 1;
  } catch (fehler) {
    console.warn(`  Bild fehlt: ${event.id} (${fehler.message}) - dort steht vorerst ein Abendfoto.`);
    delete event.bild;
    nachQuelle.delete(event.bildQuelle);
  }
}

// Die Quelladresse des Bildes gehoert nicht in die veroeffentlichte Datei:
// sie wuerde jemanden einladen, doch wieder von aussen zu laden.
const schlank = events.map(({ bildQuelle, ...rest }) => rest);

const alt = await readFile(ziel, 'utf8').catch(() => '');
const neu = JSON.stringify({
  version: 1,
  updatedAt: new Date().toISOString().slice(0, 10),
  sourceUrl: KULTURHAUS_SEITE,
  events: schlank
}, null, 2) + '\n';

if (alt.replace(/"updatedAt":\s*"[^"]*"/, '') === neu.replace(/"updatedAt":\s*"[^"]*"/, '')) {
  console.log(`Kulturhaus: unveraendert (${schlank.length} Termine).`);
} else {
  await writeFile(ziel, neu);
  console.log(`Kulturhaus: ${schlank.length} Termine geschrieben, ${geholt} Bilder neu geholt.`);
}
