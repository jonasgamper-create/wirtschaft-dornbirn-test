import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'site', 'data', 'events.json');
// "teilweise" heisst: eine Kategorie ist ausverkauft, eine andere nicht -
// der haeufigste Fall im Haus (Dinner voll, Stehplatz frei). Frueher gab es
// dafuer nur "waitlist" fuer den ganzen Abend, und ein Gast las "Warteliste",
// obwohl er ein Stehplatzticket bekommen haette.
const allowedStatuses = new Set(['scheduled', 'teilweise', 'sold_out', 'waitlist', 'cancelled', 'paused']);
const ticketStatuses = new Set(['buchbar', 'ausverkauft', 'unbekannt']);
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

const fail = message => {
  console.error(`Eventdaten-Prüfung FEHLER: ${message}`);
  process.exitCode = 1;
};

let data;
try {
  data = JSON.parse(await readFile(file, 'utf8'));
} catch (error) {
  fail(`JSON konnte nicht gelesen werden (${error.message})`);
}

if (!data || typeof data !== 'object') fail('Wurzel muss ein Objekt sein.');
if (!Number.isInteger(data?.version)) fail('version fehlt oder ist keine Ganzzahl.');
if (!data?.sourceUrl || !/^https:\/\/([\w-]+\.)*wirtschaft-dornbirn\.at\//i.test(data.sourceUrl)) {
  fail('sourceUrl muss auf die offizielle Wirtschaft-Dornbirn-Domain zeigen.');
}
if (!data?.updatedAt || !Number.isFinite(Date.parse(data.updatedAt))) fail('updatedAt ist kein gültiger ISO-Zeitstempel.');
if (!Number.isFinite(Number(data?.maxAgeHours)) || Number(data.maxAgeHours) <= 0) fail('maxAgeHours muss positiv sein.');

for (const field of ['start', 'end', 'reopen']) {
  if (!isoDate.test(data?.pause?.[field] || '')) fail(`pause.${field} fehlt oder hat kein ISO-Datum.`);
}
if (data?.pause?.start > data?.pause?.end) fail('Die Sommerpause beginnt nach ihrem Ende.');

const events = Array.isArray(data?.events) ? data.events : [];
if (!events.length) fail('Mindestens ein Event ist erforderlich.');
const ids = new Set();
let previousDate = '';
for (const [index, event] of events.entries()) {
  const prefix = `events[${index}]`;
  if (!event || typeof event !== 'object') { fail(`${prefix} ist kein Objekt.`); continue; }
  if (!event.id || ids.has(event.id)) fail(`${prefix}.id fehlt oder ist doppelt.`);
  ids.add(event.id);
  if (!event.title?.trim()) fail(`${prefix}.title fehlt.`);
  if (!isoDate.test(event.date || '')) fail(`${prefix}.date ist kein ISO-Datum.`);
  if (previousDate && event.date < previousDate) fail('Events müssen chronologisch sortiert sein.');
  previousDate = event.date || previousDate;
  if (!allowedStatuses.has(event.status)) fail(`${prefix}.status ist nicht erlaubt: ${event.status}`);
  if (!event.officialUrl || !/^https:\/\/([\w-]+\.)*wirtschaft-dornbirn\.at\//i.test(event.officialUrl)) {
    fail(`${prefix}.officialUrl muss auf die offizielle Domain zeigen.`);
  }
  // Der direkte Buchungsweg: gebucht wird ohne Zwischenseite beim
  // Ticketanbieter. Das Feld ist freiwillig, aber wenn es da ist, muss es
  // wirklich dorthin zeigen - ein Tippfehler wuerde Gaeste ins Leere schicken.
  if (event.ticketUrl && !/^https:\/\/(www\.)?ticketist\.io\//i.test(event.ticketUrl)) {
    fail(`${prefix}.ticketUrl muss auf ticketist.io zeigen.`);
  }

  // Die Ticketarten sind die eigentliche Wahrheit ueber die Verfuegbarkeit.
  const tickets = Array.isArray(event.tickets) ? event.tickets : [];
  if (!tickets.length) fail(`${prefix}.tickets fehlt - ohne Ticketart keine Verfuegbarkeit.`);
  for (const [t, ticket] of tickets.entries()) {
    const tp = `${prefix}.tickets[${t}]`;
    if (!ticket?.name?.trim()) fail(`${tp}.name fehlt.`);
    if (!Number.isFinite(Number(ticket?.preis)) || Number(ticket.preis) <= 0) fail(`${tp}.preis fehlt oder ist unbrauchbar.`);
    if (!ticketStatuses.has(ticket?.status)) fail(`${tp}.status ist nicht erlaubt: ${ticket?.status}`);
  }

  // Der Status des Abends muss zu seinen Ticketarten passen. Ohne diese
  // Pruefung behauptet die Gaesteseite irgendwann "ausverkauft", waehrend in
  // den Daten eine buchbare Kategorie steht - genau der Fehler, der hier
  // schon einmal drin war.
  const zustaende = tickets.map(ticket => ticket.status);
  const alleWeg = zustaende.length > 0 && zustaende.every(s => s === 'ausverkauft');
  const eineWeg = zustaende.some(s => s === 'ausverkauft');
  if (event.status === 'sold_out' && !alleWeg) {
    fail(`${prefix}.status ist "sold_out", aber nicht jede Ticketart ist ausverkauft.`);
  }
  if (event.status === 'teilweise' && !(eineWeg && !alleWeg)) {
    fail(`${prefix}.status ist "teilweise", passt aber nicht zu den Ticketarten.`);
  }
  if (event.status === 'scheduled' && eineWeg) {
    fail(`${prefix}.status ist "scheduled", obwohl eine Ticketart ausverkauft ist.`);
  }
}

// Die grosse Kalenderdatei wird von Hand gepflegt. Ohne diesen Abgleich
// veraltet sie still: die Seite zeigt einen neuen Termin, der Knopf
// "Alle Termine in den Kalender" liefert ihn aber nicht mit. Jeder buchbare
// Termin aus den Daten muss als VEVENT in der Datei stehen.
const icsPfad = new URL('../site/wirtschaft-events.ics', import.meta.url);
const ics = await readFile(icsPfad, 'utf8');
const icsIds = new Set([...ics.matchAll(/UID:(event-[\d-]+)@/g)].map(m => m[1]));
for (const event of events) {
  if (event.status === 'cancelled' || event.status === 'sold_out') continue;
  if (!icsIds.has(event.id)) {
    fail(`wirtschaft-events.ics: ${event.id} fehlt - der Sammel-Kalender ist veraltet.`);
  }
}

if (process.exitCode) process.exit(1);
console.log(`Eventdaten-Prüfung OK: ${events.length} Events, Kalenderdatei deckt alle buchbaren Termine, ${data.updatedAt}`);
