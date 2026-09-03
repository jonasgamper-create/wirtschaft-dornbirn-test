// Die QR-Codes der Faltkarte, erzeugt aus site/data/qr-ziele.json.
//
// Warum vorab als Datei und nicht im Browser: die Karte wird gedruckt, und
// ein Code, der zur Druckzeit von einer Bibliothek im Browser abhaengt, ist
// ein Code, der eines Tages leer bleibt. Als SVG liegt er im Repo, ist im
// Diff sichtbar und laedt ohne Skript. Erzeugt wird nur, wenn sich das Ziel
// aendert - jeder Code traegt sein Ziel als Kommentar, daran wird verglichen.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const QR = require('qrcode');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ziele = JSON.parse(await readFile(path.join(root, 'site/data/qr-ziele.json'), 'utf8'));
const ordner = path.join(root, 'site/assets/qr');
await mkdir(ordner, { recursive: true });

let neu = 0;
for (const name of ['events', 'takeaway']) {
  const url = String(ziele[name]?.url || '');
  if (!/^https:\/\//.test(url)) { console.error(`build-qr: Ziel "${name}" fehlt oder ist kein https-Link.`); process.exit(1); }
  const datei = path.join(ordner, `${name}.svg`);
  const alt = await readFile(datei, 'utf8').catch(() => '');
  if (alt.includes(`<!-- ${url} -->`)) continue;
  // Fehlerkorrektur M: genug Reserve fuer einen Kaffeefleck, klein genug fuer
  // 30 mm Kantenlaenge. Rand 0 - den Weissraum gibt die Karte selbst.
  const svg = await QR.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 0, color: { dark: '#11110f', light: '#ffffff00' } });
  await writeFile(datei, `${svg.trim()}\n<!-- ${url} -->\n`);
  neu += 1;
}
console.log(`QR-Codes OK: ${neu} neu erzeugt, Ziele aus data/qr-ziele.json.`);
