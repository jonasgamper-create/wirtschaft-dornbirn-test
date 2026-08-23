// Goldene Testfaelle fuer die eigenen Termine des Hauses.

import {
  HOECHSTENS, fuerDieGaesteseite, ordneEigeneEvents, pruefeEigenesEvent
} from '../server/src/eigene-events.mjs';

const errors = [];
const check = (name, bedingung, detail = '') => {
  if (bedingung) return;
  errors.push(`Eigene Events: ${name}${detail ? ` - ${detail}` : ''}`);
};

// ---- 1. Eingaben -----------------------------------------------------------

check('Guter Termin geht durch',
  pruefeEigenesEvent({ titel: 'Stammtisch', datum: '2026-09-01' }).ok);
check('Titel unter drei Zeichen faellt raus',
  pruefeEigenesEvent({ titel: 'ab', datum: '2026-09-01' }).grund === 'titel');
check('Kaputtes Datum faellt raus',
  pruefeEigenesEvent({ titel: 'Stammtisch', datum: '01.09.2026' }).grund === 'datum');
check('Der 31. Februar faellt raus',
  pruefeEigenesEvent({ titel: 'Stammtisch', datum: '2026-02-32' }).grund === 'datum');
check('Kaputte Zeit faellt raus',
  pruefeEigenesEvent({ titel: 'Stammtisch', datum: '2026-09-01', zeit: '25:00' }).grund === 'zeit');
check('Zeit ist freiwillig',
  pruefeEigenesEvent({ titel: 'Stammtisch', datum: '2026-09-01' }).event.zeit === null);
// Nur https - alles andere waere eine Tuer fuer javascript:-Adressen auf der
// eigenen Gaesteseite.
check('javascript:-Link faellt raus',
  pruefeEigenesEvent({ titel: 'Stammtisch', datum: '2026-09-01', link: 'javascript:alert(1)' }).grund === 'link');
check('http ohne s faellt raus',
  pruefeEigenesEvent({ titel: 'Stammtisch', datum: '2026-09-01', link: 'http://x.at' }).grund === 'link');
check('https-Link geht',
  pruefeEigenesEvent({ titel: 'Stammtisch', datum: '2026-09-01', link: 'https://wirtschaft-dornbirn.at/x' }).ok);
check('Titel wird beschnitten',
  pruefeEigenesEvent({ titel: 'x'.repeat(200), datum: '2026-09-01' }).event.titel.length === 80);

// ---- 2. Ordnung ------------------------------------------------------------

const heute = '2026-08-21';
const wild = [
  { id: 'c', titel: 'C', datum: '2026-09-10', zeit: null },
  { id: 'a', titel: 'A', datum: '2026-08-25', zeit: '19:00' },
  { id: 'alt', titel: 'Vorbei', datum: '2026-08-01', zeit: null },
  { id: 'b', titel: 'B', datum: '2026-08-25', zeit: '11:00' },
  { id: 'heute', titel: 'Heute Abend', datum: '2026-08-21', zeit: '20:00' }
];
const geordnet = ordneEigeneEvents(wild, heute);
check('Nach Datum sortiert, bei gleichem Tag nach Zeit',
  geordnet.map(e => e.id).join(',') === 'heute,b,a,c', geordnet.map(e => e.id).join(','));
check('Vergangenes faellt weg', !geordnet.some(e => e.id === 'alt'));
check('Der heutige Abend zaehlt noch', geordnet.some(e => e.id === 'heute'));
check('Obergrenze haelt',
  ordneEigeneEvents(Array.from({ length: 80 }, (unused, i) => ({ id: String(i), datum: '2026-09-01' })), heute).length === HOECHSTENS);
check('Unsinn statt Liste ergibt leere Liste', ordneEigeneEvents(null, heute).length === 0);

// ---- 3. Form fuer die Gaesteseite ------------------------------------------

const draussen = fuerDieGaesteseite({ id: 'we-1', titel: 'Stammtisch', datum: '2026-09-01', zeit: '19:00', untertitel: null, link: null });
check('Gleiche Felder wie events.json',
  draussen.date === '2026-09-01' && draussen.title === 'Stammtisch' && draussen.status === 'scheduled');
check('Keine erfundenen Tickets', Array.isArray(draussen.tickets) && draussen.tickets.length === 0);
check('Als Haus-Termin erkennbar', draussen.quelle === 'haus');
check('Ohne Untertitel steht etwas Sinnvolles da', draussen.type === 'Termin im Haus');

// ---- Ergebnis --------------------------------------------------------------

if (errors.length) {
  console.error(`\nEigene-Events-Prüfung fehlgeschlagen (${errors.length}):`);
  for (const zeile of errors) console.error(`  - ${zeile}`);
  process.exit(1);
}
console.log('Eigene-Events-Prüfung OK: Eingaben, Sortierung, Aufräumen und Gästeform geprüft.');
