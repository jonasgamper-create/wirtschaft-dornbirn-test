// Traegt die Adresse des Reservierungsdienstes in die Content-Security-Policy
// der internen Seiten ein.
//
// Ohne diesen Schritt blockiert der Browser jede Verbindung zum Dienst:
// connect-src 'self' erlaubt nur die eigene Herkunft, und der Draht zum
// Bildschirm waere still tot - die Seite saehe dabei voellig normal aus. Das
// von Hand zu pflegen ist genau die Art Aufgabe, die man einmal vergisst.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'site');

// Alle Seiten, die den Dienst wirklich ansprechen. Bis 17.09. standen hier
// nur drei - die uebrigen fuenf trugen ihre connect-src von Hand und waeren
// beim naechsten Adresswechsel stillschweigend auf der alten haengen
// geblieben. Aufgefallen ist das beim Nachtragen des Testdienstes.
const SEITEN = [
  'screen.html', 'gastgeber-tischplan.html', 'events.html', 'wirt.html',
  'uebersicht.html', 'kueche.html', 'zahlen.html', 'einrichten.html'
];

const konfig = JSON.parse(await readFile(path.join(site, 'data', 'haus.json'), 'utf8'));
const adresse = String(konfig.api || '').trim().replace(/\/+$/, '');
// Der Testdienst gehoert mit in die Liste: im Probemodus spricht dieselbe
// Seite ihn an, und connect-src kennt keine Ausnahme fuer "nur manchmal".
const probe = String(konfig.probe || '').trim().replace(/\/+$/, '');

let quellen = "'self'";
let ziel = 'aus';
if (adresse) {
  let url;
  try {
    url = new URL(adresse);
  } catch {
    console.error(`CSP: "${adresse}" in site/data/haus.json ist keine gueltige Adresse.`);
    process.exit(1);
  }
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    console.error('CSP: Der Dienst muss ueber https laufen (ausser oertlich zum Testen).');
    process.exit(1);
  }
  // Der Draht braucht die ws-Form ausdruecklich; connect-src leitet https
  // nicht automatisch auf wss weiter.
  const draht = `${url.protocol === 'https:' ? 'wss' : 'ws'}://${url.host}`;
  quellen = `'self' ${url.origin} ${draht}`;
  ziel = url.origin;

  if (probe) {
    let pUrl;
    try {
      pUrl = new URL(probe);
    } catch {
      console.error(`CSP: "${probe}" in site/data/haus.json ist keine gueltige Adresse.`);
      process.exit(1);
    }
    if (pUrl.protocol !== 'https:' && pUrl.hostname !== 'localhost' && pUrl.hostname !== '127.0.0.1') {
      console.error('CSP: Der Testdienst muss ueber https laufen (ausser oertlich zum Testen).');
      process.exit(1);
    }
    if (pUrl.origin !== url.origin) {
      const pDraht = `${pUrl.protocol === 'https:' ? 'wss' : 'ws'}://${pUrl.host}`;
      quellen = `${quellen} ${pUrl.origin} ${pDraht}`;
      ziel = `${ziel} + Probe ${pUrl.origin}`;
    }
  }
}

let geaendert = 0;
for (const datei of SEITEN) {
  const pfad = path.join(site, datei);
  const vorher = await readFile(pfad, 'utf8');
  const nachher = vorher.replace(/connect-src [^;"]*/, `connect-src ${quellen}`);
  if (nachher !== vorher) {
    await writeFile(pfad, nachher);
    geaendert += 1;
  }
  if (!nachher.includes(`connect-src ${quellen}`)) {
    console.error(`CSP: In ${datei} liess sich connect-src nicht setzen.`);
    process.exit(1);
  }
}

console.log(`CSP-Abgleich OK: Dienst ${ziel}, ${geaendert} Datei(en) angepasst.`);
