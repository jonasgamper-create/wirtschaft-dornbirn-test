import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'site', 'data', 'events.json');
const allowedStatuses = new Set(['scheduled', 'sold_out', 'waitlist', 'cancelled', 'paused']);
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
}

if (process.exitCode) process.exit(1);
console.log(`Eventdaten-Prüfung OK: ${events.length} Events, ${data.updatedAt}, Quelle ${data.sourceUrl}`);
