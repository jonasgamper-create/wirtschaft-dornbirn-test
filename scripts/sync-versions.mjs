// Setzt die Versionsangaben (?v=...) aus dem Inhalt der Datei, auf die sie
// zeigen. Vorher waren es 43 handgepflegte Zahlen - ich habe mich in einer
// einzigen Sitzung zweimal vertan, und beide Male sah es wie ein Logikfehler
// aus, war aber nur ein Browser-Cache.
//
// Laeuft bis zum Fixpunkt: aendert sich ein Modul, aendert sich auch der
// Inhalt seiner Importeure, also deren Hash - das muss sich fortpflanzen.

import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'site');

const kurz = text => createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 8);
const quellen = (await readdir(site)).filter(name => /\.(html|js|mjs|css)$/.test(name));

let runden = 0;
let geaendert = true;
const angepasst = new Set();

while (geaendert && runden < 6) {
  geaendert = false;
  runden += 1;
  const hashes = new Map();
  for (const name of quellen) hashes.set(name, kurz(await readFile(path.join(site, name), 'utf8')));

  for (const name of quellen) {
    const datei = path.join(site, name);
    const alt = await readFile(datei, 'utf8');
    // Auch Verweise OHNE ?v= werden erfasst. Vorher galt die Regel nur fuer
    // solche, die schon eine Angabe trugen - eine neue Seite, die einfach
    // "meinskript.js" schrieb, blieb still ohne Versionsangabe. Genau das
    // ist am 04.09. bei mittagskarte.html und menuekarte-falten.html
    // passiert: Besucher haetten dort dauerhaft die alte Fassung aus dem
    // Zwischenspeicher bekommen, ohne dass es irgendwo auffiel.
    //
    // Verweise einer Datei auf sich selbst bleiben unberuehrt. Sie koennen
    // gar nicht stimmen: der eingetragene Hash veraendert den Dateiinhalt und
    // damit den Hash, den er beschreiben soll - das laeuft in jedem Lauf neu.
    // In site/doc-page.js steht so ein Selbstverweis als Beispielzeile in
    // einem Dokumentationskommentar; dadurch tauchte die Datei bisher in
    // jedem Pull Request als geaendert auf und musste von Hand
    // zurueckgenommen werden.
    const neu = alt.replace(/(["'./])([a-z0-9-]+\.(?:js|mjs|css))(\?v=[a-z0-9]+)?(?=["'\s>])/gi,
      (treffer, davor, ziel) => (hashes.has(ziel) && ziel !== name
        ? `${davor}${ziel}?v=${hashes.get(ziel)}`
        : treffer));
    if (neu !== alt) {
      await writeFile(datei, neu);
      angepasst.add(name);
      geaendert = true;
    }
  }
}

console.log(angepasst.size
  ? `Versionsangaben aus dem Dateiinhalt gesetzt: ${[...angepasst].join(', ')} (${runden} Durchläufe)`
  : `Versionsangaben sind aktuell (${runden} Durchlauf).`);
