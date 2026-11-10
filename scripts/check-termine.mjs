// Prueft das Lesen der Termine beim Ticketdienst.
//
// Die Eventseite haengt an einer fremden Seite, die wir nicht kontrollieren.
// Hier steht, worauf sich der Leser verlaesst und wie er sich verhaelt, wenn
// sich dort etwas aendert: lieber ein Termin weniger als ein falscher, und
// lieber der alte Stand als eine leere Seite.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ausZeitpunkt, hausAusOrt, kennungAusLink, KENNUNGEN, leseTermin, schneideJson, seiteFuer, terminGueltig, kennungenIn, unterseitenIn, gruppiere,
  holeKategorien, holeVerkauft, leseKategorien, mitPreisen
} from '../server/src/ticketist.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fehler = 0;
const check = (was, bedingung) => {
  if (!bedingung) { console.error(`  ✗ ${was}`); fehler += 1; }
};

// --- Eine Eventseite, wie der Dienst sie ausliefert ------------------------
const seite = `<!doctype html><html><head><title>Gernot Kulis | TICKETIST</title></head><body>
<script type="text/javascript">
window.defaultCountry = {"id":1,"abbreviation":"AT"};
window.event = {"id":1459,"name":"Gernot Kulis","startAt":"2026-10-08T20:00:00+02:00","endAt":null,
"location":{"id":5,"name":"Kulturhaus Dornbirn","address":{"street":"Rathausplatz 1","zipCode":"6850","city":"Dornbirn"}},
"organizer":{"id":7,"name":"Emma & Eugen"},
"image":{"url":"https://www.ticketist.io/uploads/images/kulis.jpg"},
"subtitle":"Programm: Ich kann nicht anders",
"description":"Erste Zeile.\\u2028Zweite Zeile mit { geschweifter } Klammer.",
"canTicketsBePurchased":true};
window.configuration = {"privacyLink":"/privacy"};
</script></body></html>`;

const termin = leseTermin(seite, 'kulis-03-2026');

check('Termin wird gelesen', Boolean(termin));
check('Kennung bleibt die unsere', termin.id === 'kulis-03-2026');
check('Datum aus dem Zeitpunkt', termin.date === '2026-10-08');
check('Uhrzeit aus dem Zeitpunkt', termin.zeit === '20:00');
check('Name', termin.title === 'Gernot Kulis');
check('Untertitel', termin.untertitel === 'Programm: Ich kann nicht anders');
check('Ort', termin.ort === 'Kulturhaus Dornbirn');
check('Haus kommt aus dem Ort', termin.haus === 'kulturhaus');
check('Adresse zusammengesetzt', termin.adresse === 'Rathausplatz 1, Dornbirn');
check('Zeilentrenner im Text sind weg', !/[\u2028\u2029]/.test(termin.beschreibung));
check('Geschweifte Klammer im Text bricht nichts',
  termin.beschreibung === 'Erste Zeile. Zweite Zeile mit { geschweifter } Klammer.');
check('Ticketweg zeigt auf den Dienst', termin.ticketUrl === 'https://www.ticketist.io/events/kulis-03-2026');
check('Buchbar', termin.buchbar === true);

// --- Das eigene Haus -------------------------------------------------------
check('Wirtschaft als Ort', hausAusOrt('"wirtschaft" Dornbirn') === 'wirtschaft');
check('Unbekannter Ort gilt als eigenes Haus', hausAusOrt('') === 'wirtschaft');
check('Kulturhaus erkannt, auch klein geschrieben', hausAusOrt('kulturhaus dornbirn') === 'kulturhaus');

// --- Was schiefgehen kann --------------------------------------------------
check('Leere Seite gibt nichts', leseTermin('<html></html>', 'x') === null);
check('Seite ohne Namen gibt nichts',
  leseTermin('<script>window.event = {"startAt":"2026-10-08T20:00:00+02:00"};</script>', 'x') === null);
check('Seite ohne Zeitpunkt gibt nichts',
  leseTermin('<script>window.event = {"name":"Ohne Datum"};</script>', 'x') === null);
check('Kaputtes JSON gibt nichts', schneideJson('window.event = {"name": ') === null);
check('Unvollstaendiger Termin gilt nicht', terminGueltig({ id: 'x', date: '2026-01-01' }) === false);
check('Zeitpunkt ohne Form', ausZeitpunkt('morgen').datum === '');
check('Adresse einer Kennung', seiteFuer('spoerk-2026') === 'https://www.ticketist.io/events/spoerk-2026');

// --- Die Liste und der hinterlegte Stand -----------------------------------
const datei = JSON.parse(await readFile(path.join(root, 'site', 'data', 'termine.json'), 'utf8'));
// Seit 30.09. darf die Datei mehr Kennungen tragen als der Code: was auf den
// eigenen Eventseiten des Hauses verlinkt ist, holt sync-termine dazu. Jede
// feste Kennung muss aber drin sein, und jede zusaetzliche muss gueltig sein.
check('Jede feste Kennung steht in der Datei', KENNUNGEN.every(k => datei.kennungen.includes(k)));
check('Zusaetzliche Kennungen sind gueltig',
  datei.kennungen.every(k => KENNUNGEN.includes(k) || /^[a-z0-9-]{3,60}$/.test(k)));
check('Keine doppelte Kennung', new Set(KENNUNGEN).size === KENNUNGEN.length);
check('Rueckfall-Datei hat Termine', Array.isArray(datei.termine) && datei.termine.length > 0);
check('Rueckfall-Termine sind vollstaendig', datei.termine.every(terminGueltig));
check('Termine sind sortiert',
  datei.termine.every((t, i) => i === 0 || datei.termine[i - 1].date <= t.date));
check('Keine fremden Bildadressen in der Datei',
  datei.termine.every(t => !t.bild || t.bild.startsWith('assets/events/ticketist/')));
// Seit 14.09. kommt jeder Abend vom Ticketdienst - auch die im Kulturhaus.
// Ein Verweis auf eine der alten Seiten hat hier nichts mehr verloren.
check('Kein Verweis auf die alten Seiten',
  !/https?:\/\/[^"\s]*(eugen\.family|wirtschaft-dornbirn\.at)/.test(
    JSON.stringify(datei.termine.map(({ beschreibung, ...rest }) => rest))));
check('Beide Haeuser stehen in der Liste',
  new Set(datei.termine.map(t => t.haus)).size === 2);
check('Jeder Ticketweg zeigt auf den Ticketdienst',
  datei.termine.every(t => t.ticketUrl.startsWith('https://www.ticketist.io/events/')
    && (t.varianten || []).every(v => v.ticketUrl.startsWith('https://www.ticketist.io/events/'))));

// Die zwei Wege zu einem Abend: der zweite traegt eine Beschriftung, eine
// eigene Kennung und einen eigenen Preis - sonst waere er keiner.
const mitZweitem = datei.termine.filter(t => t.varianten?.length);
check('Es gibt Abende mit zweitem Ticketweg', mitZweitem.length > 10);
check('Jeder zweite Weg hat Beschriftung, Kennung und Zeit',
  mitZweitem.every(t => t.varianten.every(v => v.label && v.id && v.id !== t.id)));
check('Kein Abend taucht zweimal auf',
  new Set(datei.termine.map(t => t.id)).size === datei.termine.length);
check('Keine Kennung steckt zugleich in einem zweiten Weg',
  datei.termine.every(t => !datei.termine.some(x => (x.varianten || []).some(v => v.id === t.id))));

// Preise: Kategorien, Preis und freie Karten liest der Dienst live beim
// Ticketdienst (holeKategorien, seit 10.11.2026). Die Datei ist der
// Rueckfall und wird von scripts/sync-termine.mjs aus derselben
// Schnittstelle erzeugt.
const preisDatei = JSON.parse(await readFile(path.join(root, 'site', 'data', 'ticketist-preise.json'), 'utf8'));
// Eine feste Kennung ohne Eintrag ist ein Abend, der vorbei ist oder beim
// Ticketdienst keine Kategorien hat - ein Hinweis, kein Fehler.
const ohnePreis = KENNUNGEN.filter(k => !Array.isArray(preisDatei.preise?.[k]));
if (ohnePreis.length) console.log(`  Hinweis: ohne Preise im Rueckfall: ${ohnePreis.join(', ')}`);
check('Preise fuer die meisten Kennungen hinterlegt', ohnePreis.length <= 10);
check('Jeder Preis ist eine Zahl',
  Object.values(preisDatei.preise).every(l => l.every(p => typeof p.preis === 'number' && p.preis > 0)));
check('Freie Karten sind eine ganze Zahl ab 0 (oder unbekannt)',
  Object.values(preisDatei.preise).every(l => l.every(p => p.frei === undefined || (Number.isInteger(p.frei) && p.frei >= 0))));
check('Die Rueckfall-Liste nennt ihre Quelle', /ticket-categories/.test(String(preisDatei.quelle || '')));
check('Die Termine tragen ihre Preise',
  datei.termine.filter(t => (t.preise || []).length).length > 25);

// --- Die Kategorien beim Ticketdienst (10.11.2026) -------------------------
// So antwortet /api/ticket-categories?eventId=<nummer> (gekuerzt, Felder wie
// am 10.11. gelesen).
const kategorienAntwort = {
  items: [
    { id: 1, name: 'Kategorie 1', event: { id: 1630 }, price: 40, sort: 0, totalTicketQuantity: 300,
      existingTicketQuantity: 210, blockedTicketQuantity: 90, availableTicketQuantity: 0, ticketCategoryDiscounts: [{ id: 9 }] },
    { id: 2, name: '  Kategorie   2 ', event: { id: 1630 }, price: 36, sort: 0, totalTicketQuantity: 200,
      existingTicketQuantity: 150, blockedTicketQuantity: 49, availableTicketQuantity: 1 },
    { id: 3, name: 'Gaesteliste', event: { id: 1630 }, price: 0, availableTicketQuantity: 20 },
    { id: 4, name: 'Fremder Abend', event: { id: 999 }, price: 10, availableTicketQuantity: 5 },
    { id: 5, name: 'Ohne verfuegbar', event: { id: 1630 }, price: 33, totalTicketQuantity: 10, existingTicketQuantity: 4, blockedTicketQuantity: 1 },
    { id: 6, name: 'Ohne Zahlen', event: { id: 1630 }, price: 28 },
    null
  ],
  totalItems: 6
};
const kategorien = leseKategorien(kategorienAntwort, 1630);
check('Kategorien: Name, Preis und frei in unserer Form',
  JSON.stringify(kategorien[0]) === JSON.stringify({ name: 'Kategorie 1', preis: 40, frei: 0 }));
check('Kategorien: Reihenfolge des Dienstes, Name geglaettet', kategorien[1]?.name === 'Kategorie 2' && kategorien[1]?.frei === 1);
check('Kategorien: ohne Preis (0 Euro) faellt raus', !kategorien.some(k => k.name === 'Gaesteliste'));
check('Kategorien: ein fremder Abend faellt raus', !kategorien.some(k => k.name === 'Fremder Abend'));
check('Kategorien: frei aus Platzangebot, verkauft und gesperrt gerechnet', kategorien.find(k => k.name === 'Ohne verfuegbar')?.frei === 5);
check('Kategorien: ohne Zahlen bleibt frei unbekannt, nicht 0',
  kategorien.some(k => k.name === 'Ohne Zahlen') && !('frei' in kategorien.find(k => k.name === 'Ohne Zahlen')));
check('Kategorien: Rabatte bleiben beim Dienst', kategorien.every(k => Object.keys(k).every(f => ['name', 'preis', 'frei'].includes(f))));
check('Kategorien: kaputte Antwort heisst nicht gelesen', leseKategorien({ fehler: 1 }) === null && leseKategorien(null) === null);
check('Kategorien: leere Liste ist eine Antwort', JSON.stringify(leseKategorien({ items: [] })) === '[]');

{
  const gefragt = [];
  const antwortet = (status, daten) => async (url, optionen) => {
    gefragt.push({ url, optionen });
    return { ok: status === 200, status, json: async () => daten };
  };
  const gelesen = await holeKategorien(1630, antwortet(200, kategorienAntwort));
  check('Abruf: richtige Adresse beim Ticketdienst',
    gefragt[0]?.url === 'https://www.ticketist.io/api/ticket-categories?eventId=1630');
  check('Abruf: mit eigenem Namen und Zwischenspeicher',
    /wirtschaft-dornbirn-events/.test(gefragt[0]?.optionen?.headers?.['user-agent'] || '') && gefragt[0]?.optionen?.cf?.cacheTtl === 900);
  check('Abruf: liefert die gelesenen Kategorien', Array.isArray(gelesen) && gelesen.length === kategorien.length);
  check('Abruf: Fehler des Dienstes heisst null', await holeKategorien(1630, antwortet(500, {})) === null);
  check('Abruf: Netzfehler heisst null', await holeKategorien(1630, async () => { throw new Error('weg'); }) === null);
  const vorher = gefragt.length;
  check('Abruf: ohne gueltige Nummer kein Abruf',
    await holeKategorien(null, antwortet(200, kategorienAntwort)) === null
    && await holeKategorien(0, antwortet(200, kategorienAntwort)) === null
    && await holeKategorien('x', antwortet(200, kategorienAntwort)) === null
    && await holeVerkauft(null, antwortet(200, { ticketCount: 5 })) === null
    && gefragt.length === vorher);
}

{
  const abende = [{ id: 'a', title: 'A', varianten: [{ id: 'a-only', label: 'only' }, { id: 'a-zwei', label: 'zwei' }] }, { id: 'b', title: 'B' }];
  const stand = {
    a: { termin: {}, preise: [{ name: 'Sitzplatz', preis: 68, frei: 3 }] },
    'a-only': { termin: {}, preise: [{ name: 'Stehplatz', preis: 28, frei: 0 }] },
    'a-zwei': { termin: {}, preise: [] },
    b: { termin: {}, preise: null }
  };
  const mit = mitPreisen(abende, stand);
  check('Antwort: Hauptweg traegt seine Kategorien', mit[0].preise?.[0]?.preis === 68);
  check('Antwort: der zweite Weg seine eigenen', mit[0].varianten[0].preise?.[0]?.name === 'Stehplatz');
  check('Antwort: ohne gelesene Kategorien bleibt das Feld weg',
    !('preise' in mit[0].varianten[1]) && !('preise' in mit[1]));
  check('Antwort: der Stand im Speicher bleibt unberuehrt', stand.a.preise[0] !== mit[0].preise[0]);
}

check('Ausverkauft im Text zaehlt als ausverkauft',
  leseTermin(seite.replace('"description":"Erste Zeile.', '"description":"Diese Veranstaltung ist ausverkauft.'), 'x').buchbar === false);

// Die Nummer des Abends beim Dienst: ueber sie ist oeffentlich lesbar, wie
// viele Karten verkauft sind (holeVerkauft). Ohne sie faellt der Dienst auf
// den Schalter zurueck und merkt nicht, wenn Karten zurueckkommen.
check('Der Termin traegt die Nummer des Dienstes', typeof leseTermin(seite, 'x').eventId === 'number');
check('Die hinterlegten Termine tragen sie auch',
  datei.termine.every(t => Number.isFinite(t.eventId)),
  String(datei.termine.filter(t => !Number.isFinite(t.eventId)).map(t => t.id)));

// Einen Abend aufnehmen heisst: Link einfuegen. Was daraus wird, entscheidet
// diese eine Funktion - sie ist die Tuer, durch die von aussen etwas
// hereinkommt, und laesst nur eine Kennung durch.
check('Link wird zur Kennung', kennungAusLink('https://www.ticketist.io/events/kulis-02-2026') === 'kulis-02-2026');
check('Link mit Anhang geht auch', kennungAusLink('https://www.ticketist.io/events/kulis-02-2026?utm=x#a') === 'kulis-02-2026');
check('Die blosse Kennung geht auch', kennungAusLink('  KULIS-02-2026  ') === 'kulis-02-2026');
check('javascript: faellt raus', kennungAusLink('javascript:alert(1)') === '');
check('Leeres faellt raus', kennungAusLink('') === '' && kennungAusLink(null) === '');
check('Pfadtricks fallen raus', kennungAusLink('../../etc/passwd') === '');
check('Ueberlanges faellt raus', kennungAusLink('a'.repeat(80)) === '');

// Neue Abende von den eigenen Eventseiten (30.09.)
{
  const html = '<a href="https://www.ticketist.io/events/Faschingsball">x</a> <a href="https://www.ticketist.io/events/faschingsball">y</a>'
    + '<a href="https://wirtschaft-dornbirn.at/event/abend-1/">1</a><a href="https://wirtschaft-dornbirn.at/event/">liste</a>'
    + '<a href="https://fremd.example/event/x/">fremd</a>';
  check('Kennungen aus eigenen Seiten: klein, ohne Doppelte', kennungenIn(html).join() === 'faschingsball');
  const unter = unterseitenIn(html, 'https://wirtschaft-dornbirn.at/event/');
  check('Unterseiten: nur gleicher Host, ohne die Liste selbst', unter.length === 1 && unter[0].endsWith('/event/abend-1/'));
  const g = gruppiere([
    { id: 'fb', title: 'Faschingsball | Sitzplatz', date: '2027-01-09', zeit: '19:00', haus: 'kulturhaus', ticketUrl: 'a' },
    { id: 'fb-only', title: 'Faschingsball | Stehplatz', date: '2027-01-09', zeit: '21:00', haus: 'kulturhaus', ticketUrl: 'b' }
  ]);
  check('Geschwister-Wege werden ein Abend mit zwei Knoepfen',
    g.length === 1 && g[0].title === 'Faschingsball' && g[0].wegLabel === 'Sitzplatz' && g[0].varianten[0].label === 'Stehplatz');
  check('Die vier neuen Abende sind fest hinterlegt',
    ['faschingsball', 'faschingsball-only', 'comedynacht-01-2027', 'comedynacht-02-2027'].every(k => KENNUNGEN.includes(k)));
}

if (fehler) {
  console.error(`Termin-Prüfung FEHLGESCHLAGEN: ${fehler} Punkt(e).`);
  process.exit(1);
}
console.log(`Termin-Prüfung OK: Lesen beim Ticketdienst, Hauszuordnung, Schutz gegen kaputte Seiten `
  + `und der hinterlegte Stand geprüft (${datei.termine.length} Termine, ${KENNUNGEN.length} Kennungen).`);
