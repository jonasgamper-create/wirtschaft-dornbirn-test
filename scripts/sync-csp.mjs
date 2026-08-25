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

// Nur die Seiten, die den Dienst wirklich ansprechen.
const SEITEN = ['screen.html', 'gastgeber-tischplan.html', 'events.html'];

const konfig = JSON.parse(await readFile(path.join(site, 'data', 'haus.json'), 'utf8'));
const adresse = String(konfig.api || '').trim().replace(/\/+$/, '');

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
