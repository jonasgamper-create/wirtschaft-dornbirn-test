// Die Startseite bekommt dasselbe Programm wie die Eventseite.
//
// Vorgeschichte: site/data/events.json wurde von Hand gepflegt, die
// Eventseite las dagegen live beim Ticketdienst. Am 17.09. standen dort 18
// Termine vom 27. August gegen 31 Abende live - dreizehn Abende fehlten auf
// der Startseite, darunter das ganze Kulturhaus-Programm, und ein
// vergangener Abend stand noch drin. Zwei Quellen, die dasselbe behaupten,
// laufen immer auseinander; es ist nur eine Frage der Zeit.
//
// Deshalb wird events.json nicht mehr gepflegt, sondern erzeugt: aus
// site/data/termine.json, die ihrerseits vom Ticketdienst kommt
// (npm run sync:termine). Danach laeuft alles Bisherige unveraendert
// weiter - sync-events.mjs baut daraus die Terminliste im Markup, die
// Auswahl im Dialog, die Ersatzliste in app.js und die Kalenderdatei.
//
// Der gebaute Stand ist so frisch wie der letzte Abgleich. Damit die
// Startseite trotzdem IMMER stimmt, holt sie sich beim Oeffnen zusaetzlich
// die Liste vom Dienst (site/app.js, Abschnitt "Programm vom Dienst").
// Diese Datei ist der Rueckfall - fuer den ersten Augenblick, fuer
// Suchmaschinen und fuer den Fall, dass der Dienst schweigt.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const datei = name => path.join(root, 'site', 'data', name);

const quelle = JSON.parse(await readFile(datei('termine.json'), 'utf8'));
const bisher = JSON.parse(await readFile(datei('events.json'), 'utf8').catch(() => '{}'));

/**
 * Ein Abend wird zu einem Eintrag der alten Form.
 *
 * Die Ticketarten sind die Wahrheit ueber die Verfuegbarkeit: was der
 * Ticketdienst als "frei: 0" meldet, ist ausverkauft. Ist der ganze Abend
 * nicht mehr buchbar, gilt das fuer jede seiner Arten - sonst behauptete die
 * Liste, es gebe noch Karten in einer Kategorie eines geschlossenen Abends.
 */
function alsEvent(termin, id) {
  const arten = [];
  const nimm = (preise, buchbar, praefix = '') => {
    for (const p of preise || []) {
      arten.push({
        name: praefix ? `${praefix}: ${p.name}` : p.name,
        preis: Number(p.preis) || 0,
        beginn: termin.zeit || '19:00',
        status: !buchbar || p.frei === 0 ? 'ausverkauft' : 'buchbar'
      });
    }
  };
  nimm(termin.preise, termin.buchbar !== false);
  for (const v of termin.varianten || []) nimm(v.preise, v.buchbar !== false, v.label);

  const brauchbar = arten.filter(a => a.preis > 0);
  const alleWeg = brauchbar.length > 0 && brauchbar.every(a => a.status === 'ausverkauft');
  const eineWeg = brauchbar.some(a => a.status === 'ausverkauft');

  return {
    id,
    date: termin.date,
    title: termin.title,
    // Die zweite Zeile auf der Startseite. Der Untertitel des Abends, sonst
    // das Haus - "Dinner & Comedy" sagt mehr als nichts, und wo gespielt
    // wird, ist die naechstbeste Auskunft.
    type: termin.untertitel || (termin.haus === 'kulturhaus' ? 'Kulturhaus Dornbirn' : 'In der „wirtschaft“'),
    status: alleWeg ? 'sold_out' : eineWeg ? 'teilweise' : 'scheduled',
    tickets: brauchbar,
    ticketUrl: termin.ticketUrl
  };
}

// Gleiche Kennungen wie bisher (event-JJJJ-MM-TT), damit Kalendereintraege
// und Verweise aus frueheren Staenden weiter passen. Zwei Abende am selben
// Tag gibt es wirklich - am 14.10. spielt eines in der Bahnhofstrasse, das
// andere im Kulturhaus -, deshalb bekommt der zweite eine angehaengte Zahl.
const vergeben = new Map();
const events = [];
for (const termin of [...quelle.termine].sort((a, b) => a.date.localeCompare(b.date))) {
  const zahl = (vergeben.get(termin.date) || 0) + 1;
  vergeben.set(termin.date, zahl);
  const event = alsEvent(termin, zahl === 1 ? `event-${termin.date}` : `event-${termin.date}-${zahl}`);
  if (!event.tickets.length) {
    console.warn(`  Ohne Preis, deshalb ausgelassen: ${termin.date} ${termin.title}`);
    continue;
  }
  events.push(event);
}

if (!events.length) {
  console.error('sync-events-quelle FEHLER: kein einziger Abend - die alte Datei bleibt stehen.');
  process.exit(1);
}

const neu = {
  version: bisher.version ?? 2,
  // Der Stand des Ticketdienst-Abgleichs, nicht der Bauzeitpunkt: sonst
  // saehe eine Woche alte Datei taufrisch aus.
  updatedAt: `${quelle.updatedAt}T12:00:00+02:00`,
  maxAgeHours: bisher.maxAgeHours ?? 48,
  sourceUrl: 'https://www.ticketist.io/',
  pause: bisher.pause,
  events
};

const alt = await readFile(datei('events.json'), 'utf8').catch(() => '');
const text = JSON.stringify(neu, null, 2) + '\n';
if (text !== alt) await writeFile(datei('events.json'), text);

const haeuser = quelle.termine.reduce((z, t) => ({ ...z, [t.haus]: (z[t.haus] || 0) + 1 }), {});
console.log(`Startseiten-Termine erzeugt: ${events.length} Abende aus termine.json `
  + `(${Object.entries(haeuser).map(([h, n]) => `${n}× ${h}`).join(', ')}), Stand ${quelle.updatedAt}.`);
