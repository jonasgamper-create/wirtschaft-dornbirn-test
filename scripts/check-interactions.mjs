import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['site/index.html', 'site/feste-catering.html'];
const html = Object.fromEntries(await Promise.all(pages.map(async relative => [relative, await readFile(path.join(root, relative), 'utf8')])));
const fail = message => { throw new Error(`Interaktionsprüfung: ${message}`); };

const main = html['site/index.html'];
const dialogs = new Set([...main.matchAll(/<dialog\b[^>]*\bid="([^"]+)"/g)].map(match => match[1]));
const openTargets = [...main.matchAll(/data-open="([^"]+)"/g)].map(match => match[1]);
const expectedDialogs = new Map([
  ['reservation', 'reservationDialog'],
  ['tickets', 'ticketDialog'],
  ['events', 'eventsDialog'],
  ['menu', 'menuDialog'],
  ['story', 'storyDialog'],
  ['privacy', 'privacyDialog']
]);
for (const target of openTargets) {
  const dialogId = expectedDialogs.get(target);
  if (!dialogId || !dialogs.has(dialogId)) fail(`data-open="${target}" hat kein vorhandenes Dialogziel`);
}

for (const [relative, source] of Object.entries(html)) {
  for (const button of source.matchAll(/<button\b([^>]*)>/g)) {
    if (!/\btype\s*=\s*"(?:button|submit|reset)"/i.test(button[1])) fail(`${relative}: Button ohne explizites type`);
  }
  for (const anchor of source.matchAll(/<a\b([^>]*)>/g)) {
    const attrs = anchor[1];
    const href = attrs.match(/\bhref="([^"]+)"/i)?.[1] || '';
    if (/^https?:\/\//i.test(href) && (!/\btarget="_blank"/i.test(attrs) || !/\brel="[^"]*noopener/i.test(attrs))) {
      fail(`${relative}: externer Link ohne target=_blank und noopener (${href})`);
    }
  }
}

const events = JSON.parse(await readFile(path.join(root, 'site/data/events.json'), 'utf8'));
const eventIds = new Set(events.events.map(event => event.id));
for (const match of main.matchAll(/data-calendar-event="([^"]+)"/g)) {
  if (!eventIds.has(match[1])) fail(`Kalenderaktion verweist auf unbekanntes Event ${match[1]}`);
}
// Entscheidung vom 25.08.2026: Reservierung und Takeaway laufen ueber die
// Entscheidung vom 26.08.: Die Buchung laeuft im Haus - Mittagstisch und
// Takeaway oeffnen die EIGENEN Strecken als Overlay auf der Startseite,
// die alten Subseiten sind abgeloest. Pflicht sind die eigenen Ziele;
// fehlten sie, stuende der Gast ohne Buchungsweg da.
for (const required of [
  'tischreservierung.html',
  'takeaway.html',
  'https://wirtschaft-dornbirn.at/event/',
  'feste-catering.html'
]) {
  const traegtZiel = quelle => quelle.includes(`href="${required}"`) || quelle.includes(`data-haus="${required}`);
  if (!traegtZiel(main) && !traegtZiel(html['site/feste-catering.html'])) fail(`Pfad fehlt: ${required}`);
}


const inventedTicketCopy = ['data-price=', 'Genussloge', 'Show only', 'Dinner + Show'];
for (const marker of inventedTicketCopy) {
  if (main.includes(marker)) fail(`Unbestätigter Ticket-Tarif "${marker}" steht wieder im HTML`);
}

// Tischplan: interne Einteilungsansicht. Gäste sehen ihn nicht und wählen
// keinen Tisch - sie geben nur Tag, Uhrzeit und Personenzahl an.
for (const [name, page] of Object.entries(html)) {
  if (/data-floorplan|floorplan\.(js|css)/.test(page)) {
    fail(`${name} bindet den Tischplan ein - er ist eine interne Ansicht`);
  }
}
const reservation = await readFile(path.join(root, 'site/tischreservierung.html'), 'utf8');
if (/data-floorplan|floorplan\.(js|css)/.test(reservation)) {
  fail('Die Reservierungsseite darf den Tischplan nicht einbinden - Gäste wählen keinen Tisch');
}

// Die interne Seite trägt ihn, und das Markup muss bedienbar bleiben.
const internal = await readFile(path.join(root, 'site/gastgeber-tischplan.html'), 'utf8');
if (!/<div data-floorplan[^>]*id="fpPreview"/.test(internal)) fail('Der Tischplan-Container fehlt auf der internen Seite');
if (!/name="robots" content="noindex/.test(internal)) fail('Die interne Tischplanseite muss noindex tragen');
for (const id of ['fpDate', 'fpTime', 'fpLayout', 'fpResForm', 'fpDishes', 'fpParties', 'fpTableList', 'fpLevels', 'fpKitchen']) {
  if (!internal.includes(`id="${id}"`)) fail(`Der interne Tischplan hat kein Element mit id="${id}"`);
}
// Reservierungen entstehen an genau zwei Stellen: der Gast bucht auf der
// Webseite, oder das Haus traegt sie im Formular ein. Ein dritter Weg - frueher
// das Uebernehmen aus einem Mailtext - ist entfernt, und mit ihm die Regel, die
// den Hinweis dazu verlangte. Was es nicht mehr gibt, muss auch nichts mehr
// erklaeren; die Pruefung darauf waere ab jetzt nur noch Ballast.
if (/fpMailImport|Mailtext/.test(internal)) {
  fail('Das Uebernehmen aus einem Mailtext wurde bewusst entfernt und darf nicht zurueckkommen');
}

const renderer = await readFile(path.join(root, 'site/floorplan.js'), 'utf8');
if (!renderer.includes("'aria-hidden': 'true'")) fail('Das Tischplan-SVG muss aria-hidden tragen');
if (!renderer.includes("setAttribute('role', 'radiogroup')")) fail('Die Tischliste braucht role="radiogroup"');
if (/document\.querySelector\('\[data-floorplan\]\[data-src\]'\)/.test(renderer)) {
  fail('Der Renderer darf sich nicht mehr selbst starten - er ist nur intern eingebunden');
}

const storyTemplate = await readFile(path.join(root, 'output/social-canva/genussroute-story-template/story-template.html'), 'utf8');
if (/story-icons|ⓘ|▧|♡/.test(storyTemplate)) fail('Story-Vorlage enthält noch die entfernten Symbole');
if (!storyTemplate.includes('href="{{OFFICIAL_URL}}"') || !storyTemplate.includes('Nach oben wischen')) fail('Story-CTA oder Swipe-Hinweis fehlt');

console.log(`Interaktionsprüfung OK: ${openTargets.length} Dialog-Aufrufe, ${eventIds.size} Kalender-Events und externe Buchungspfade geprüft.`);
