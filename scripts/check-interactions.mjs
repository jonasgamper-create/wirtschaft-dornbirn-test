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
for (const required of [
  'https://tischreservierung.wirtschaft-dornbirn.at/',
  'https://wirtschaft-dornbirn.at/event/',
  'feste-catering.html'
]) {
  if (!main.includes(`href="${required}"`) && !html['site/feste-catering.html'].includes(`href="${required}"`)) fail(`Pfad fehlt: ${required}`);
}


const inventedTicketCopy = ['data-price=', 'Genussloge', 'Show only', 'Dinner + Show'];
for (const marker of inventedTicketCopy) {
  if (main.includes(marker)) fail(`Unbestätigter Ticket-Tarif "${marker}" steht wieder im HTML`);
}

// Tischplan: das SVG ist rein visuell, bedienbar ist die Liste daneben. Die
// Markup-Regeln stehen im Renderer - hier wird geprueft, dass die Seiten den
// Renderer ueberhaupt einbinden und die Gaesteseite ihn nur als Orientierung
// nutzt, nie als Buchungsschritt.
const reservation = await readFile(path.join(root, 'site/tischreservierung.html'), 'utf8');
if (!/<div data-floorplan[^>]*data-src="data\/floorplan\.json"/.test(reservation)) {
  fail('Der Tischplan-Container fehlt auf der Reservierungsseite');
}
if (!/data-mode="orientation"/.test(reservation)) {
  fail('Der Tischplan der Gästeseite muss data-mode="orientation" tragen - dort wird nicht gebucht');
}
if (!reservation.includes('floorplan.css') || !reservation.includes('floorplan.js')) {
  fail('Tischplan-Stil oder -Renderer ist auf der Reservierungsseite nicht eingebunden');
}

const renderer = await readFile(path.join(root, 'site/floorplan.js'), 'utf8');
if (!renderer.includes("'aria-hidden': 'true'")) fail('Das Tischplan-SVG muss aria-hidden tragen');
if (!renderer.includes("setAttribute('role', 'radiogroup')")) fail('Die Tischliste braucht role="radiogroup"');
if (!renderer.includes("config.status !== 'bestaetigt'")) {
  fail('Der Renderer muss einen unbestätigten Tischplan auf der Gästeseite zurückhalten');
}

const storyTemplate = await readFile(path.join(root, 'output/social-canva/genussroute-story-template/story-template.html'), 'utf8');
if (/story-icons|ⓘ|▧|♡/.test(storyTemplate)) fail('Story-Vorlage enthält noch die entfernten Symbole');
if (!storyTemplate.includes('href="{{OFFICIAL_URL}}"') || !storyTemplate.includes('Nach oben wischen')) fail('Story-CTA oder Swipe-Hinweis fehlt');

console.log(`Interaktionsprüfung OK: ${openTargets.length} Dialog-Aufrufe, ${eventIds.size} Kalender-Events und externe Buchungspfade geprüft.`);
