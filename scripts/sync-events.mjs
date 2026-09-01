// Eine Quelle fuer alle Termin-Gestalten: data/events.json.
//
// Vorher mussten neue Termine an drei Orten gepflegt werden - events.json,
// die Ersatzliste in app.js (falls das JSON nicht laedt) und die
// Kalenderdatei wirtschaft-events.ics. Die Pruefung warnte zwar bei
// Abweichungen, aber gepflegt werden musste trotzdem dreifach; beim
// Genussroute-Wechsel auf 2027 lief genau das auseinander.
//
// Dieser Schritt laeuft in npm run ci und erzeugt aus dem JSON:
//   1. die Ersatzliste in app.js   (zwischen den [events:auto]-Marken)
//   2. wirtschaft-events.ics       (alle buchbaren Termine, mit Uhrzeit)
//   3. das Google-Eventschema in events.html (zwischen den Marken)
// Wer einen Termin eintraegt, pflegt nur noch die eine Datei.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = seite => path.join(root, 'site', seite);

const daten = JSON.parse(await readFile(site('data/events.json'), 'utf8'));
const events = daten.events.slice().sort((a, b) => a.date.localeCompare(b.date));

let geaendert = 0;
async function ersetzeZwischenMarken(datei, anfang, ende, inhalt) {
  const alt = await readFile(site(datei), 'utf8');
  const i = alt.indexOf(anfang), j = alt.indexOf(ende);
  if (i === -1 || j === -1 || j < i) {
    console.error(`sync-events FEHLER: Marken in ${datei} nicht gefunden.`);
    process.exit(1);
  }
  const neu = alt.slice(0, i + anfang.length) + '\n' + inhalt + '\n  ' + alt.slice(j);
  if (neu !== alt) { await writeFile(site(datei), neu); geaendert += 1; }
}

// --- 1. Ersatzliste in app.js ---------------------------------------------
const jsZeile = e => {
  const tickets = e.tickets.map(t =>
    `{ name: ${JSON.stringify(t.name)}, preis: ${t.preis}, beginn: ${JSON.stringify(t.beginn)}, status: ${JSON.stringify(t.status)} }`).join(', ');
  return `      { id: ${JSON.stringify(e.id)}, date: ${JSON.stringify(e.date)}, title: ${JSON.stringify(e.title)}, type: ${JSON.stringify(e.type)}, status: ${JSON.stringify(e.status)}, officialUrl: ${JSON.stringify(e.officialUrl)}, tickets: [${tickets}]${e.ticketUrl ? `, ticketUrl: ${JSON.stringify(e.ticketUrl)}` : ''} },`;
};
await ersetzeZwischenMarken('app.js',
  '// [events:auto-start] wird von scripts/sync-events.mjs aus data/events.json erzeugt - hier nichts von Hand aendern.',
  '// [events:auto-ende]',
  events.map(jsZeile).join('\n'));

// --- 2. Kalenderdatei ------------------------------------------------------
const schuetzeIcs = wert => String(wert)
  .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const stempel = daten.updatedAt.replace(/[-:]/g, '').replace(/\+.*$/, 'Z').replace('T', 'T').slice(0, 15) + 'Z';
const icsZeilen = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
  'PRODID:-//Wirtschaft Dornbirn//Veranstaltungen//DE',
  'X-WR-CALNAME:Wirtschaft Dornbirn - Events', 'X-WR-TIMEZONE:Europe/Vienna'];
for (const e of events) {
  if (e.status === 'cancelled' || e.status === 'sold_out') continue;
  const d = e.date.replaceAll('-', '');
  const beginn = (e.tickets[0]?.beginn || '19:00').replace(':', '');
  icsZeilen.push('BEGIN:VEVENT',
    `UID:${e.id}@wirtschaft-dornbirn.at`,
    `DTSTAMP:${stempel}`,
    `DTSTART;TZID=Europe/Vienna:${d}T${beginn}00`,
    `DTEND;TZID=Europe/Vienna:${d}T230000`,
    `SUMMARY:${schuetzeIcs(e.title)}`,
    `DESCRIPTION:${schuetzeIcs(`${e.type}. Tickets und Details: wirtschaft-dornbirn.at`)}`,
    `LOCATION:${schuetzeIcs('Wirtschaft Dornbirn, Bahnhofstraße 24, 6850 Dornbirn')}`,
    'STATUS:CONFIRMED', 'END:VEVENT');
}
icsZeilen.push('END:VCALENDAR');
const icsNeu = icsZeilen.join('\r\n') + '\r\n';
const icsAlt = await readFile(site('wirtschaft-events.ics'), 'utf8').catch(() => '');
if (icsNeu !== icsAlt) { await writeFile(site('wirtschaft-events.ics'), icsNeu); geaendert += 1; }

// --- 3. Google-Eventschema in events.html ---------------------------------
const schemaEvents = events
  .filter(e => e.status !== 'cancelled')
  .map(e => ({
    '@type': 'Event',
    name: e.title,
    startDate: `${e.date}T${e.tickets[0]?.beginn || '19:00'}:00+02:00`,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place', name: 'Wirtschaft Dornbirn',
      address: { '@type': 'PostalAddress', streetAddress: 'Bahnhofstraße 24', postalCode: '6850', addressLocality: 'Dornbirn', addressCountry: 'AT' }
    },
    organizer: { '@type': 'Organization', name: 'Wirtschaft Dornbirn', url: 'https://wirtschaft-dornbirn.at' },
    ...(e.ticketUrl && e.status !== 'sold_out' ? {
      offers: {
        '@type': 'Offer', url: e.ticketUrl, priceCurrency: 'EUR',
        price: Math.min(...e.tickets.map(t => t.preis)),
        availability: e.status === 'teilweise' ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/InStock'
      }
    } : {})
  }));
const schemaBlock = `<script type="application/ld+json">\n${JSON.stringify({ '@context': 'https://schema.org', '@graph': schemaEvents }, null, 0)}\n</script>`;
await ersetzeZwischenMarken('events.html',
  '<!-- [events:auto-start] Eventschema fuer Suchmaschinen, erzeugt aus data/events.json -->',
  '<!-- [events:auto-ende] -->',
  '  ' + schemaBlock);

console.log(`Event-Abgleich OK: ${events.length} Termine, ${geaendert} Datei(en) neu erzeugt (Ersatzliste, Kalender, Schema aus einer Quelle).`);
