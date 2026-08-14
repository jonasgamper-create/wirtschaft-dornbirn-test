import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const required = ['index.html', 'app.js', 'styles.css', 'truck-motion.js', 'data/events.json', 'wirtschaft-events.ics', 'sitemap.xml', 'datenschutz-sicherheit.html', 'impressum.html'];
// Der Tischplan ist eine interne Einteilungsansicht: Gäste sehen ihn nicht und
// wählen keinen Tisch. Weder Renderer noch Zuweisungsregeln noch Stammdaten
// gehören in ein öffentlich ausgeliefertes Bundle.
const forbidden = ['gastgeber.html', 'gastgeber.js', 'gastgeber.css', 'gastgeber-mobile-fix.css', 'inventory-store.js', 'table-assignment.mjs', 'floorplan-layout.mjs', 'floorplan.js', 'floorplan.css', 'kundenplan.html', 'kundenplan.js', 'screen.html', 'screen.js', 'screen.css', 'plan-history.mjs', 'entwuerfe.html', 'drafts.css', 'entwuerfe.css', 'ticketing-cinematic.css', 'truck-experience.css'];
// Verschachtelte Pfade fängt die Verzeichnisprüfung unten nicht ab.
const forbiddenPaths = ['data/floorplan.json'];
// Bewusst veröffentlicht: die beiden gebauten Einzeldateien unter eigenem,
// nicht verlinktem Pfad. Sie tragen keine Daten - Belegung und Namen entstehen
// erst im Browser dessen, der sie öffnet.
const expectedPaths = ['tischplan/index.html', 'tischplan/kunde.html', 'tischplan/screen.html'];

for (const file of required) await access(path.join(output, file));
const files = await readdir(output);
for (const file of files) {
  if (forbidden.includes(file) || file.startsWith('gastgeber') || file.startsWith('entwurf-')) {
    throw new Error(`Interne Datei im öffentlichen Build: ${file}`);
  }
}
for (const file of forbiddenPaths) {
  let present = true;
  try { await access(path.join(output, file)); } catch { present = false; }
  if (present) throw new Error(`Interne Datei im öffentlichen Build: ${file}`);
}

for (const file of expectedPaths) {
  await access(path.join(output, file));
  const html = await readFile(path.join(output, file), 'utf8');
  if (!/name="robots" content="noindex/.test(html)) throw new Error(`${file} muss noindex tragen`);
  // Keine Namen, keine Belegung, keine Reservierungen in der ausgelieferten Datei.
  for (const muster of [/"parties"\s*:\s*\[\s*\{/, /"seatNames"\s*:\s*\[\s*"[^"]/, /"blockedTables"\s*:\s*\[\s*"/]) {
    if (muster.test(html)) throw new Error(`${file} enthält gespeicherte Daten - es darf nur der leere Raum ausgeliefert werden`);
  }
}

// In der Testumgebung sperrt robots.txt ohnehin alles; in Produktion muss der
// Tischplan ausdrücklich ausgeschlossen sein.
const robots = await readFile(path.join(output, 'robots.txt'), 'utf8').catch(() => '');
const gesperrt = /^\s*Disallow:\s*\/\s*$/m.test(robots) || robots.includes('Disallow: /tischplan/');
if (robots && !gesperrt) throw new Error('robots.txt muss /tischplan/ ausschließen');

console.log(`Public-Build-Prüfung OK (inklusive ${expectedPaths.length} nicht verlinkter Tischplan-Seiten).`);
