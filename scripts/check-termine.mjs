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
  ausZeitpunkt, hausAusOrt, KENNUNGEN, leseTermin, schneideJson, seiteFuer, terminGueltig
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
check('Kennungen im Dienst und in der Datei sind dieselben',
  JSON.stringify([...datei.kennungen].sort()) === JSON.stringify([...KENNUNGEN].sort()));
check('Keine doppelte Kennung', new Set(KENNUNGEN).size === KENNUNGEN.length);
check('Rueckfall-Datei hat Termine', Array.isArray(datei.termine) && datei.termine.length > 0);
check('Rueckfall-Termine sind vollstaendig', datei.termine.every(terminGueltig));
check('Termine sind sortiert',
  datei.termine.every((t, i) => i === 0 || datei.termine[i - 1].date <= t.date));
check('Keine fremden Bildadressen in der Datei',
  datei.termine.every(t => !t.bild || t.bild.startsWith('assets/events/ticketist/')));
// Verweise auf die alten Seiten sind verboten - eine Mailadresse im
// beschreibenden Text des Veranstalters ist keiner.
check('Kein Verweis auf die alten Seiten in der Datei',
  !/https?:\/\/[^"\s]*(eugen\.family|wirtschaft-dornbirn\.at)/.test(JSON.stringify(datei)));
check('Ausverkauft im Text zaehlt als ausverkauft',
  leseTermin(seite.replace('"description":"Erste Zeile.', '"description":"Diese Veranstaltung ist ausverkauft.'), 'x').buchbar === false);

if (fehler) {
  console.error(`Termin-Prüfung FEHLGESCHLAGEN: ${fehler} Punkt(e).`);
  process.exit(1);
}
console.log(`Termin-Prüfung OK: Lesen beim Ticketdienst, Hauszuordnung, Schutz gegen kaputte Seiten `
  + `und der hinterlegte Stand geprüft (${datei.termine.length} Termine, ${KENNUNGEN.length} Kennungen).`);
