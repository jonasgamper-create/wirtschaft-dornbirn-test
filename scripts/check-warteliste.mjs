// Goldene Testfaelle fuer die Warteliste.

import {
  HOECHSTENS_JE_TAG, markiereInformiert, naechsterWartender, nimmAuf,
  pruefeWartelisteEintrag, raeumeWartelisteAb
} from '../server/src/warteliste.mjs';

const errors = [];
const check = (name, bedingung, detail = '') => {
  if (bedingung) return;
  errors.push(`Warteliste: ${name}${detail ? ` - ${detail}` : ''}`);
};

// ---- Eingaben ---------------------------------------------------------------

check('Guter Eintrag geht durch',
  pruefeWartelisteEintrag({ name: 'Huber', email: 'a@b.at', datum: '2026-09-01', personen: 4 }).ok);
check('Mail wird kleingeschrieben',
  pruefeWartelisteEintrag({ name: 'Huber', email: 'A@B.at', datum: '2026-09-01', personen: 2 }).eintrag.email === 'a@b.at');
check('Kaputte Mail faellt raus',
  pruefeWartelisteEintrag({ name: 'Huber', email: 'a@', datum: '2026-09-01', personen: 2 }).grund === 'mail');
check('Kaputtes Datum faellt raus',
  pruefeWartelisteEintrag({ name: 'Huber', email: 'a@b.at', datum: '1.9.', personen: 2 }).grund === 'datum');
check('21 Personen fallen raus',
  pruefeWartelisteEintrag({ name: 'Huber', email: 'a@b.at', datum: '2026-09-01', personen: 21 }).grund === 'personen');

// ---- Aufnehmen --------------------------------------------------------------

const t1 = { name: 'A', email: 'a@b.at', datum: '2026-09-01', personen: 2 };
const t2 = { name: 'B', email: 'b@b.at', datum: '2026-09-01', personen: 6 };
const t3 = { name: 'C', email: 'c@b.at', datum: '2026-09-01', personen: 2 };
let liste = nimmAuf([], t1, '2026-08-24T10:00:00Z').liste;
liste = nimmAuf(liste, t2, '2026-08-24T10:05:00Z').liste;
liste = nimmAuf(liste, t3, '2026-08-24T10:10:00Z').liste;
check('Drei Eintraege stehen', liste.length === 3);
check('Dieselbe Adresse steht je Tag nur einmal',
  nimmAuf(liste, t1, '2026-08-24T11:00:00Z').schon === true);
check('Anderer Tag, gleiche Adresse geht',
  nimmAuf(liste, { ...t1, datum: '2026-09-02' }, '2026-08-24T11:00:00Z').liste.length === 4);
check('Obergrenze haelt', (() => {
  let volle = [];
  for (let i = 0; i < HOECHSTENS_JE_TAG; i += 1) {
    volle = nimmAuf(volle, { name: 'X', email: `x${i}@b.at`, datum: '2026-09-01', personen: 2 }, 't').liste;
  }
  return nimmAuf(volle, { name: 'Y', email: 'y@b.at', datum: '2026-09-01', personen: 2 }, 't').grund === 'voll';
})());

// ---- Wer kommt dran ---------------------------------------------------------

check('Der Aelteste zuerst', naechsterWartender(liste, '2026-09-01', 4)?.email === 'a@b.at');
check('Zu grosse Gruppen werden uebersprungen',
  (() => { const nach = markiereInformiert(liste, t1, 'jetzt');
    return naechsterWartender(nach, '2026-09-01', 4)?.email === 'c@b.at'; })());
check('Sechsergruppe kommt dran, wenn sechs frei sind',
  (() => { const nach = markiereInformiert(liste, t1, 'jetzt');
    return naechsterWartender(nach, '2026-09-01', 8)?.email === 'b@b.at'; })());
check('Informierte kommen nicht doppelt dran',
  naechsterWartender(markiereInformiert(liste, t1, 'jetzt'), '2026-09-01', 2)?.email === 'c@b.at');
check('Falscher Tag: niemand', naechsterWartender(liste, '2026-09-02', 8) === null);
check('Niemand passt: null', naechsterWartender(liste, '2026-09-01', 1) === null);

// ---- Aufraeumen -------------------------------------------------------------

check('Vergangenes verschwindet samt Adresse',
  raeumeWartelisteAb(liste, '2026-09-02').length === 0);
check('Der Tag selbst bleibt', raeumeWartelisteAb(liste, '2026-09-01').length === 3);
check('markiereInformiert laesst die Eingabe unberuehrt',
  liste.every(eintrag => eintrag.status === 'wartet'));

if (errors.length) {
  console.error(`\nWarteliste-Prüfung fehlgeschlagen (${errors.length}):`);
  for (const zeile of errors) console.error(`  - ${zeile}`);
  process.exit(1);
}
console.log('Warteliste-Prüfung OK: Eingaben, Reihenfolge, Gruppengrößen, Doppelte und Aufräumen geprüft.');
