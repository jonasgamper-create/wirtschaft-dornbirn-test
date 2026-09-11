// Prueft das Lesen des Kulturhaus-Programms.
//
// Der Parser haengt an einer fremden Seite, die wir nicht kontrollieren -
// genau deshalb muss hier stehen, worauf er sich verlaesst und wie er sich
// verhaelt, wenn sich dort etwas aendert: lieber ein Termin weniger als
// Unsinn auf der Eventseite, und lieber der alte Stand als gar keiner.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { alsDatum, kennungAusLink, leseProgramm, listeGueltig } from '../server/src/kulturhaus.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fehler = 0;
const check = (was, bedingung) => {
  if (!bedingung) { console.error(`  ✗ ${was}`); fehler += 1; }
};

// --- Eine Seite, wie sie eugen.family ausliefert ---------------------------
const seite = `
<div class="events-container"><div class="row">
  <div class="box-item col-lg-4">
    <div class="box-header-container">
      <b>mittwoch, 07.10.2026</b><br />
      gernot kulis<br />
programm: ich kann nicht anders
    </div>
    <div class="box-image-container" style="background-image: url(https://eugen.family/app/uploads/2025/01/foto.jpg);"></div>
    <div class="box-footer-container" onclick="document.location.href='https://eugen.family/event/kulis-02-2026/';">
      <b>JETZT MEHR ERFAHREN!</b>
    </div>
  </div>
  <div class="box-item col-lg-4">
    <div class="box-header-container">
      <b>samstag, 31.10.2026</b><br />
      sing mit! &amp; freunde
    </div>
    <div class="box-footer-container" onclick="document.location.href='https://eugen.family/event/singmit-2026/';">
      <b>JETZT MEHR ERFAHREN!</b>
    </div>
  </div>
  <div class="box-item col-lg-4">
    <div class="box-header-container"><b>irgendwann</b><br />ohne datum</div>
    <div class="box-footer-container" onclick="document.location.href='https://eugen.family/event/ohne-datum/';"></div>
  </div>
  <div class="box-item col-lg-4">
    <div class="box-header-container"><b>freitag, 05.12.2026</b><br />ohne link</div>
  </div>
</div></div>`;

const events = leseProgramm(seite);

check('Zwei lesbare Termine, die zwei kaputten fallen weg', events.length === 2);
check('Nach Datum sortiert', events[0].date === '2026-10-07' && events[1].date === '2026-10-31');
check('Kennung kommt aus dem Link', events[0].id === 'kulis-02-2026');
check('Name ist die zweite Zeile', events[0].title === 'gernot kulis');
check('Programmzeile getrennt vom Namen', events[0].programm === 'programm: ich kann nicht anders');
check('Ohne Programmzeile bleibt sie leer', events[1].programm === '');
check('HTML-Zeichen werden aufgeloest', events[1].title === 'sing mit! & freunde');
check('Ticketweg zeigt auf den Shop', events[0].ticketUrl === 'https://www.ticketist.io/events/kulis-02-2026');
check('Infoweg zeigt auf Emma & Eugen', events[0].infoUrl === 'https://eugen.family/event/kulis-02-2026/');
check('Bild wird mitgelesen', events[0].bildQuelle.endsWith('/foto.jpg'));

// --- Datumsformen ----------------------------------------------------------
check('Punktformat', alsDatum('mittwoch, 07.10.2026') === '2026-10-07');
check('Ausgeschriebener Monat', alsDatum('7. oktober 2026') === '2026-10-07');
check('Zweistelliges Jahr', alsDatum('07.10.26') === '2026-10-07');
check('Unlesbares bleibt leer', alsDatum('demnaechst') === '');
check('Unmoeglicher Monat faellt durch', alsDatum('07.13.2026') === '');
check('Kennung aus fremdem Link', kennungAusLink('https://eugen.family/event/luis-03-2026/') === 'luis-03-2026');
check('Kein Link, keine Kennung', kennungAusLink('https://eugen.family/kulturhaus/') === '');

// --- Der Schutz gegen eine leere oder kaputte Seite ------------------------
check('Leere Liste gilt nicht als Programm', listeGueltig([]) === false);
check('Wartungsseite ohne Kacheln gibt nichts', leseProgramm('<html><body>Wartung</body></html>').length === 0);
check('Unvollstaendiger Termin gilt nicht', listeGueltig([{ id: 'x', date: '2026-01-01', title: 'x' }]) === false);
check('Vollstaendige Liste gilt', listeGueltig(events) === true);

// --- Der hinterlegte Stand -------------------------------------------------
const datei = JSON.parse(await readFile(path.join(root, 'site', 'data', 'kulturhaus.json'), 'utf8'));
check('Rueckfall-Datei hat Termine', Array.isArray(datei.events) && datei.events.length > 0);
check('Rueckfall-Datei ist vollstaendig', listeGueltig(datei.events));
check('Keine fremden Bildadressen in der Datei',
  datei.events.every(e => !e.bild || e.bild.startsWith('assets/events/kulturhaus/')));
check('Termine der Datei sind sortiert',
  datei.events.every((e, i) => i === 0 || datei.events[i - 1].date <= e.date));

if (fehler) {
  console.error(`Kulturhaus-Prüfung FEHLGESCHLAGEN: ${fehler} Punkt(e).`);
  process.exit(1);
}
console.log(`Kulturhaus-Prüfung OK: Lesen, Datumsformen, Schutz gegen leere Seiten und der hinterlegte Stand geprüft (${datei.events.length} Termine).`);
