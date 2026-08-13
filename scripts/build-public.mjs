import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
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
  await writeFile(path.join(output, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: https://wirtschaft-dornbirn.at/sitemap.xml\n');
}

console.log(`Public build erstellt: ${path.relative(root, output)}`);
