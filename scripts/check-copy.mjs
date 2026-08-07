import { readFile } from 'node:fs/promises';

const files = ['site/index.html', 'site/feste-catering.html', 'site/impressum.html', 'site/datenschutz-sicherheit.html'];
const contents = await Promise.all(files.map(async file => [file, await readFile(file, 'utf8')]));
const errors = [];

for (const [file, html] of contents) {
  if (!/<html[^>]+lang="de"/i.test(html)) errors.push(`${file}: lang="de" fehlt`);
  if (/\bMittags\s+Mittagsmenü\b/i.test(html)) errors.push(`${file}: doppeltes "Mittags Mittagsmenü"`);
  if (/\bStandart\b/i.test(html)) errors.push(`${file}: "Standart" statt "Standard"`);
  if (/href="#"/i.test(html)) errors.push(`${file}: leerer Anker href="#"`);
}

const index = contents.find(([file]) => file === 'site/index.html')[1];
if (!/aria-label="Mittag und Tagesmenü"/.test(index) || !/>Mittag<\/a>/.test(index)) {
  errors.push('site/index.html: oberer Mittag-Link muss exakt "Mittag" heißen');
}
for (const marker of ['og:image', 'twitter:card', 'application/ld+json', 'canonical']) {
  if (!index.includes(marker)) errors.push(`site/index.html: SEO-Marker ${marker} fehlt`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Copy-/SEO-Prüfung OK: ${files.length} Seiten, keine bekannten Schreibfehler.`);
