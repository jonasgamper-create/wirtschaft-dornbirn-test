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
  const vorverkauf = Boolean(termin.verkaufsstart) && Date.parse(termin.verkaufsstart) > Date.now();
  // Je Ticketweg (Hauptweg und zweite Wege) dieselbe Regel wie auf der
  // Eventseite (site/events.js, ausverkauft): ein Weg ist weg, wenn sein
  // Schalter zu ist oder alle seine Kategorien 0 frei haben - im Vorverkauf
  // nie. Nur fuer einen GANZ ausverkauften Weg gibt es die Warteliste; eine
  // einzelne leere Kategorie (Luis 25.11.: Kat. 1 und 3 weg, Kat. 2 frei)
  // ist "ausverkauft", aber kein Grund fuer eine Warteliste (10.11.2026).
  const wege = [{ ...termin, label: '' }, ...(termin.varianten || [])].map(weg => {
    const preise = (weg.preise || []).filter(p => Number(p.preis) > 0);
    const zu = !vorverkauf && (weg.buchbar === false || (preise.length > 0 && preise.every(p => p.frei === 0)));
    return { weg, preise, zu };
  });
  const arten = [];
  for (const { weg, preise, zu } of wege) {
    // Beim zweiten Weg: sein Name davor, ausser die Kategorie heisst schon
    // so ("comedy only (stehplatz)" statt "comedy only: comedy only ..."),
    // und SEINE Uhrzeit - "comedy only" beginnt um 21:00, nicht um 19:00.
    const praefix = weg.label || '';
    for (const p of preise) {
      const doppelt = praefix && String(p.name).toLowerCase().startsWith(String(praefix).toLowerCase());
      arten.push({
        name: praefix && !doppelt ? `${praefix}: ${p.name}` : p.name,
        preis: Number(p.preis),
        beginn: weg.zeit || termin.zeit || '19:00',
        status: weg.buchbar === false || p.frei === 0 ? 'ausverkauft' : 'buchbar',
        ...(zu ? { warteliste: true } : {})
      });
    }
  }
  // Ohne Kategorien entscheidet je Weg sein Schalter allein.
  const alleWeg = wege.every(w => w.zu);
  const eineWeg = wege.some(w => w.zu);
  // Wohin "Tickets" fuehrt: zum ersten Weg, der noch Karten hat - nicht zum
  // ausverkauften Hauptweg (dinner & comedy: Dinner weg, comedy only frei).
  const offen = wege.find(w => !w.zu);
  const leer = wege.find(w => w.zu);
  const kennungVon = url => (String(url || '').match(/\/events\/([a-z0-9-]+)/) || [])[1] || '';

  return {
    id,
    date: termin.date,
    title: termin.title,
    // Die zweite Zeile auf der Startseite. Der Untertitel des Abends, sonst
    // das Haus - "Dinner & Comedy" sagt mehr als nichts, und wo gespielt
    // wird, ist die naechstbeste Auskunft.
    type: termin.untertitel || (termin.haus === 'kulturhaus' ? 'Kulturhaus Dornbirn' : 'In der „wirtschaft“'),
    // Wo gespielt wird - fuer Kalender und Suchmaschinen (sync-events.mjs).
    haus: termin.haus === 'kulturhaus' ? 'kulturhaus' : 'wirtschaft',
    status: vorverkauf ? 'vorverkauf' : alleWeg ? 'sold_out' : eineWeg ? 'teilweise' : 'scheduled',
    verkaufsstart: termin.verkaufsstart || undefined,
    tickets: arten,
    ticketUrl: termin.ticketUrl,
    ...(offen && offen.weg.ticketUrl && offen.weg.ticketUrl !== termin.ticketUrl ? { kaufUrl: offen.weg.ticketUrl } : {}),
    ...(leer && kennungVon(leer.weg.ticketUrl) ? { wartelisteKennung: kennungVon(leer.weg.ticketUrl) } : {})
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
  // Abende ohne Preise kommen trotzdem auf die Startseite (01.10.): der
  // Knopf fuehrt zum Ticketdienst, die Preise stehen dort.
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
