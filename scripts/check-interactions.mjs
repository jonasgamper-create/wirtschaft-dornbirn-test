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

console.log(`Interaktionsprüfung OK: ${openTargets.length} Dialog-Aufrufe, ${eventIds.size} Kalender-Events und externe Buchungspfade geprüft.`);
