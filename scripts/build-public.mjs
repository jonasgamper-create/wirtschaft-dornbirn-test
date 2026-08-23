import { access, cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'site');
const output = path.join(root, 'dist');

const excluded = new Set([
  'gastgeber.html',
  'gastgeber.js',
  'gastgeber.css',
  'gastgeber-mobile-fix.css',
  'inventory-store.js',
  // Der Tischplan ist eine interne Einteilungsansicht. Gaeste sehen ihn nicht
  // und waehlen keinen Tisch, also gehoert nichts davon in den oeffentlichen
  // Build - auch nicht die Stammdaten.
  'table-assignment.mjs',
  'floorplan-layout.mjs',
  'floorplan.js',
  'floorplan.css',
  'floorplan.json',
  'kundenplan.html',
  'kundenplan.js',
  'screen.html',
  'screen.js',
  'screen.css',
  'plan-history.mjs',
  // Die einfache Wirt-Ansicht ist ein Werkzeug fuers Haus. Sie geht als
  // Einzeldatei unter /tischplan/ hinaus, nie als Quelldatei in den Gaeste-Build.
  'wirt.html',
  'wirt.js',
  'wirt.css',
  // Dasselbe fuer den Bildschirm in der Kueche: Werkzeug fuers Haus, nicht
  // fuer Gaeste. Als Quelldatei ging er ohne sein Stilblatt hinaus - die
  // Seite kam unformatiert an, weil wirt.css im Gaeste-Build fehlt.
  'kueche.html',
  'kueche.js',
  // Die Uebersicht ist Werkzeug fuers Haus - wie Wirt und Kueche nur als
  // Einzeldatei unter /tischplan/.
  'uebersicht.html',
  'uebersicht.js',
  'entwuerfe.html',
  'drafts.css',
  'entwuerfe.css',
  'ticketing-cinematic.css',
  'truck-experience.css'
]);

function isInternal(name) {
  return excluded.has(name) || name.startsWith('entwurf-') || name.startsWith('gastgeber');
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, {
  recursive: true,
  filter: sourcePath => !isInternal(path.basename(sourcePath))
});

if (process.env.PUBLIC_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
  const entries = await readdir(output, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    const file = path.join(output, entry.name);
    const html = await readFile(file, 'utf8');
    await writeFile(file, html.replace(/<meta\s+name="robots"\s+content="noindex[^>]*>/gi, '<meta name="robots" content="index,follow">'));
  }
  // Der Tischplan bleibt aus dem Index heraus - er ist ein Werkzeug fuers
  // Haus, keine Seite fuer Gaeste.
  await writeFile(path.join(output, 'robots.txt'),
    'User-agent: *\nAllow: /\nDisallow: /tischplan/\nSitemap: https://wirtschaft-dornbirn.at/sitemap.xml\n');
}

// Die beiden Einzeldateien bekommen einen eigenen, nicht verlinkten Pfad.
// Sie tragen keinerlei Daten: Belegung und Namen entstehen erst im Browser
// dessen, der die Seite oeffnet. Die Quelldateien bleiben trotzdem draussen.
const einzel = [
  ['output/tischplan/wirtschaft-tischplan.html', 'tischplan/index.html'],
  ['output/tischplan/wirtschaft-kundenplan.html', 'tischplan/kunde.html'],
  ['output/tischplan/wirtschaft-screen.html', 'tischplan/screen.html'],
  ['output/tischplan/wirtschaft-wirt.html', 'tischplan/wirt.html'],
  ['output/tischplan/wirtschaft-kueche.html', 'tischplan/kueche.html'],
  ['output/tischplan/wirtschaft-uebersicht.html', 'tischplan/uebersicht.html']
];
let veroeffentlicht = 0;
for (const [quelle, ziel] of einzel) {
  try {
    await access(path.join(root, quelle));
  } catch {
    continue;
  }
  await mkdir(path.dirname(path.join(output, ziel)), { recursive: true });
  await cp(path.join(root, quelle), path.join(output, ziel));
  veroeffentlicht += 1;
}

console.log(`Public build erstellt: ${path.relative(root, output)}`
  + (veroeffentlicht ? ` (plus ${veroeffentlicht} Tischplan-Seite(n) unter /tischplan/)` : ''));
