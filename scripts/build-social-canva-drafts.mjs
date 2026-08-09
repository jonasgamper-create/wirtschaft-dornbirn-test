import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'site', 'assets');
const out = path.join(root, 'output', 'social-canva');
const monoOut = path.join(out, 'source-monochrome');
const runFile = promisify(execFile);

const monoUri = async (name) => {
  const destination = path.join(monoOut, `${path.basename(name, path.extname(name))}.png`);
  await runFile('sips', [
    '-s', 'format', 'png',
    '-m', '/System/Library/ColorSync/Profiles/Generic Gray Profile.icc',
    path.join(assets, name),
    '--out', destination,
  ]);
  return `data:image/png;base64,${(await readFile(destination)).toString('base64')}`;
};

await mkdir(monoOut, { recursive: true });

const [food, comedy, stage] = await Promise.all([
  monoUri('food.webp'),
  monoUri('comedy.webp'),
  monoUri('stage.webp'),
]);

const colors = {
  black: '#111111',
  gold: '#B48727',
  white: '#F4F2ED',
};

const fonts = 'font-family="Helvetica Neue, Helvetica, Arial, sans-serif"';
const defs = (id) => `<defs>
  <linearGradient id="shade-${id}" x1="0" y1="0" x2="0" y2="1">
    <stop stop-color="#111" stop-opacity=".20"/>
    <stop offset=".58" stop-color="#111" stop-opacity=".36"/>
    <stop offset="1" stop-color="#111" stop-opacity=".80"/>
  </linearGradient>
</defs>`;

const logoMark = (x, y) => `<text x="${x}" y="${y}" fill="${colors.white}" ${fonts} font-size="43" font-weight="400" letter-spacing="-2">„wirtschaft“</text><text x="${x + 72}" y="${y + 27}" fill="${colors.white}" ${fonts} font-size="11" letter-spacing=".3">cafe restaurant bar</text>`;

const multiline = ({ x, y, lines, size, fill = colors.gold, weight = 700, lineHeight = 0.88, letterSpacing = -3 }) =>
  lines.map((line, index) => `<text x="${x}" y="${y + index * size * lineHeight}" fill="${fill}" ${fonts} font-size="${size}" font-weight="${weight}" letter-spacing="${letterSpacing}">${line}</text>`).join('');

const events = [
  {
    slug: 'genussroute-6850',
    image: food,
    category: 'genuss &amp; live-musik',
    title: ['genussroute', '6850'],
    feedSize: 112,
    storySize: 118,
    date: ['donnerstag,', '03.09.2026', '18:00–01:00 uhr'],
    storyDate: ['03. september 2026', '18:00–01:00 uhr'],
    facts: ['5 gastronomen', '6 live-bands', '6 speisegänge'],
  },
  {
    slug: 'helden-reisen-gaeste-speisen',
    image: comedy,
    category: 'dinner &amp; comedy',
    title: ['helden reisen,', 'gäste speisen!'],
    feedSize: 94,
    storySize: 98,
    date: ['dienstag &amp; mittwoch,', '22. &amp; 23.09.2026', '18:45 uhr'],
    storyDate: ['22. &amp; 23. september 2026', '18:45 uhr'],
    facts: ['4 comedians', '4 haltestellen', '4-gänge-menü'],
  },
  {
    slug: 'dinner-comedy-oktober',
    image: stage,
    category: 'dinner &amp; comedy',
    title: ['dinner &amp;', 'comedy'],
    feedSize: 126,
    storySize: 132,
    date: ['mittwoch,', '14.10.2026', '19:00 uhr'],
    storyDate: ['14. oktober 2026', '19:00 uhr'],
    facts: ['3 comedians', '1 bühne', 'comedy only verfügbar'],
  },
];

const feedSvg = (event) => {
  const id = `feed-${event.slug}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
${defs(id)}
<rect width="1080" height="1350" fill="${colors.black}"/>
<image href="${event.image}" width="1080" height="1350" preserveAspectRatio="xMidYMid slice"/>
<rect width="1080" height="1350" fill="url(#shade-${id})"/>
${logoMark(64, 102)}
<text x="1018" y="105" text-anchor="end" fill="${colors.gold}" ${fonts} font-size="31" font-weight="750">${event.category}</text>
${multiline({ x: 74, y: 432, lines: event.title, size: event.feedSize })}
<rect x="74" y="875" width="932" height="180" fill="#111" fill-opacity=".16" stroke="${colors.white}" stroke-width="2"/>
<line x1="475" y1="875" x2="475" y2="1055" stroke="${colors.white}" stroke-width="2"/>
${event.date.map((line, index) => `<text x="104" y="${928 + index * 42}" fill="${colors.white}" ${fonts} font-size="31" font-weight="400">${line}</text>`).join('')}
${['“wirtschaft”', 'bahnhofstraße 24', '6850 dornbirn'].map((line, index) => `<text x="510" y="${928 + index * 42}" fill="${colors.white}" ${fonts} font-size="31" font-weight="400">${line}</text>`).join('')}
<text x="540" y="1190" text-anchor="middle" fill="${colors.white}" ${fonts} font-size="28" font-weight="400" letter-spacing="1.2">www.wirtschaft-dornbirn.at</text>
<text x="540" y="1262" text-anchor="middle" fill="${colors.gold}" ${fonts} font-size="19" font-weight="700" letter-spacing="2.2">${event.facts.join('  ·  ')}</text>
</svg>`;
};

const storySvg = (event) => {
  const id = `story-${event.slug}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
${defs(id)}
<rect width="1080" height="1920" fill="${colors.black}"/>
<image href="${event.image}" width="1080" height="1920" preserveAspectRatio="xMidYMid slice"/>
<rect width="1080" height="1920" fill="url(#shade-${id})"/>
${logoMark(66, 158)}
<text x="1014" y="155" text-anchor="end" fill="${colors.gold}" ${fonts} font-size="31" font-weight="750">${event.category}</text>
${multiline({ x: 66, y: 615, lines: event.title, size: event.storySize })}
<rect x="66" y="1110" width="948" height="218" fill="#111" fill-opacity=".18" stroke="${colors.white}" stroke-width="2"/>
${event.storyDate.map((line, index) => `<text x="102" y="${1188 + index * 54}" fill="${colors.white}" ${fonts} font-size="36" font-weight="400">${line}</text>`).join('')}
<line x1="620" y1="1110" x2="620" y2="1328" stroke="${colors.white}" stroke-width="2"/>
${['“wirtschaft”', 'dornbirn'].map((line, index) => `<text x="654" y="${1188 + index * 48}" fill="${colors.white}" ${fonts} font-size="30" font-weight="400">${line}</text>`).join('')}
<rect x="66" y="1465" width="430" height="88" rx="44" fill="${colors.gold}"/>
<text x="281" y="1521" text-anchor="middle" fill="${colors.black}" ${fonts} font-size="25" font-weight="750" letter-spacing="1">tickets &amp; infos  ↗</text>
<text x="66" y="1670" fill="${colors.white}" ${fonts} font-size="23" font-weight="450">${event.facts.join('  ·  ')}</text>
<text x="66" y="1775" fill="${colors.white}" ${fonts} font-size="22" letter-spacing="1.2">wirtschaft-dornbirn.at</text>
</svg>`;
};

await mkdir(out, { recursive: true });

const files = [];
for (const event of events) {
  const feedName = `instagram-post-${event.slug}.svg`;
  const storyName = `instagram-story-${event.slug}.svg`;
  await writeFile(path.join(out, feedName), feedSvg(event));
  await writeFile(path.join(out, storyName), storySvg(event));
  files.push(feedName, storyName);
}

await writeFile(path.join(out, 'CAPTIONS.md'), `# Instagram-Texte · Wirtschaft Dornbirn

## Genussroute 6850 · 03. September 2026

5 heimische Gastronomen, 6 Live-Bands und 6 Speisegänge im Kleinformat: Bei der Genussroute 6850 wird Dornbirn für einen Abend zur kulinarischen Bühne. Von 18:00 bis 01:00 Uhr geht es mit Shuttle-Bussen von Genussort zu Genussort; ab 22:00 Uhr wartet die Afterparty im Kulturhaus Dornbirn.

Tickets: 88 Euro. Infos und Tickets über wirtschaft-dornbirn.at.

#genussroute #6850dornbirn #wirtschaftdornbirn #eventsvorarlberg

Story-Sticker: **Tickets & Infos** · Linkziel: https://wirtschaft-dornbirn.at/event/genussroute-2026/

## Helden reisen, Gäste speisen! · 22. & 23. September 2026

Vier Comedians, vier Haltestellen und ein genussvoller Abend: Während ihr in eurer gewählten Location ein feines Menü genießt, reisen die Künstler von Restaurant zu Restaurant und bringen jeweils 20 Minuten aus ihren Programmen mit.

Beginn: 18:45 Uhr. Tickets: 88 Euro. Infos und Tickets über wirtschaft-dornbirn.at.

#heldenreisengaestespeisen #dinnerundcomedy #wirtschaftdornbirn #6850dornbirn

Story-Sticker: **Tickets & Infos** · Linkziele: https://wirtschaft-dornbirn.at/event/comedynacht-05-2026/ und https://wirtschaft-dornbirn.at/event/comedynacht-06-2026/

## Dinner & Comedy · 14. Oktober 2026

Drei Comedians, ein Abend, eine Bühne: schnelle 20-Minuten-Highlights aus Stand-up, Kabarett, Magie und Musikcomedy – moderiert von Niko Formanek.

Dinner & Comedy ist aktuell ausverkauft; die Warteliste ist geöffnet. Comedy only beginnt um 21:00 Uhr und kostet 28 Euro. Infos und Tickets über wirtschaft-dornbirn.at.

#dinnerundcomedy #mixedshow #wirtschaftdornbirn #6850dornbirn

Story-Sticker: **Tickets & Infos** · Linkziel: https://wirtschaft-dornbirn.at/event/dinner-comedy-04-2026/
`);

await writeFile(path.join(out, 'README.md'), `# Instagram-Entwürfe · Wirtschaft Dornbirn

Sechs präsentierbare Entwürfe im verifizierten Instagram-CI von @wirtschaft_dornbirn:

- Schwarz-Weiß-Fotografie
- Senf-/Gold-Akzent
- Helvetica-/Grotesk-Typografie in Kleinschreibung
- weißes „wirtschaft“-Logo
- dünn umrandeter Datums- und Ortsblock

Je Event gibt es einen Feed-Beitrag (1080 × 1350 px, 4:5) und eine Story (1080 × 1920 px, 9:16). Die SVG-Dateien bleiben in Canva editierbar. Die zugehörigen fertigen Texte und Linkziele stehen in CAPTIONS.md.

Grundlage: tatsächlicher Instagram-Auftritt @wirtschaft_dornbirn, live geprüft am 08.08.2026; Eventdaten live mit wirtschaft-dornbirn.at abgeglichen. Keine Veröffentlichung durchgeführt.
`);

console.log(`Social-Entwürfe erstellt: ${files.length} SVG-Dateien in ${out}`);
