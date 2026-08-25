// Schreibt auf, welche Eventbilder und Hoerproben wirklich daliegen.
//
// Ohne diese Liste muesste die Eventseite fuer jede Kachel Bild und Video
// blind anfragen - zwei 404 pro Kachel, bei jedem Besuch. Mit der Liste
// fragt sie nur an, was existiert. Wolfgang legt Dateien einfach unter
// site/assets/events/<event-id>.webp bzw. .mp4 ab; der naechste CI-Lauf
// traegt sie hier ein.

import { readdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ordner = path.join(root, 'site', 'assets', 'events');
const ziel = path.join(root, 'site', 'data', 'event-medien.json');

let dateien = [];
try {
  dateien = await readdir(ordner);
} catch {
  dateien = [];
}

const bilder = dateien.filter(name => name.endsWith('.webp')).map(name => name.slice(0, -5)).sort();
const videos = dateien.filter(name => name.endsWith('.mp4')).map(name => name.slice(0, -4)).sort();

const inhalt = JSON.stringify({ bilder, videos }, null, 2) + '\n';
const vorher = await readFile(ziel, 'utf8').catch(() => '');
if (vorher !== inhalt) await writeFile(ziel, inhalt);

console.log(`Event-Medien OK: ${bilder.length} Bild(er), ${videos.length} Hoerprobe(n).`);
