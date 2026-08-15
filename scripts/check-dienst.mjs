// Goldene Testfaelle fuer den Reservierungsdienst. Prueft die reine Logik in
// Node - ohne Cloudflare, ohne Netz. Genau diese Funktionen laufen im Worker.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  etagenReihenfolge, machId, pruefeAnfrage, raeumeAuf, sitzendeGaeste, verteile, wendeAktionAn
} from '../server/src/haus-logik.mjs';
import { buildFloorplan } from '../site/floorplan-layout.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(path.join(root, 'site/data/floorplan.json'), 'utf8'));

const errors = [];
const check = (name, bedingung, detail = '') => {
  if (bedingung) return;
  errors.push(`Dienst: ${name}${detail ? ` - ${detail}` : ''}`);
};

const heute = '2026-08-20';

// ---- 1. Was von aussen kommt, ist unbekannt -------------------------------

check('Gueltige Anfrage geht durch',
  pruefeAnfrage({ name: 'Huber', date: heute, time: '12:00', guests: 4 }, { heute }).ok);
check('Zu kurzer Name faellt raus',
  pruefeAnfrage({ name: 'H', date: heute, time: '12:00', guests: 4 }, { heute }).grund === 'name');
check('Fehlendes Datum faellt raus',
  pruefeAnfrage({ name: 'Huber', date: '', time: '12:00', guests: 4 }, { heute }).grund === 'datum');
check('Erfundenes Datum faellt raus',
  pruefeAnfrage({ name: 'Huber', date: '2026-02-31', time: '12:00', guests: 4 }, { heute }).grund === 'datum',
  JSON.stringify(pruefeAnfrage({ name: 'Huber', date: '2026-02-31', time: '12:00', guests: 4 }, { heute })));
check('Unmoegliche Uhrzeit faellt raus',
  pruefeAnfrage({ name: 'Huber', date: heute, time: '25:99', guests: 4 }, { heute }).grund === 'uhrzeit');
check('Vergangenheit faellt raus',
  pruefeAnfrage({ name: 'Huber', date: '2020-01-01', time: '12:00', guests: 4 }, { heute }).grund === 'vergangen');
check('Ferne Zukunft faellt raus',
  pruefeAnfrage({ name: 'Huber', date: '2030-01-01', time: '12:00', guests: 4 }, { heute }).grund === 'zu_weit');
check('Null Personen fallen raus',
  pruefeAnfrage({ name: 'Huber', date: heute, time: '12:00', guests: 0 }, { heute }).grund === 'personen');
check('Unsinnige Personenzahl faellt raus',
  pruefeAnfrage({ name: 'Huber', date: heute, time: '12:00', guests: 999 }, { heute }).grund === 'personen');
// Ein zu langer Name darf nicht durchrutschen und den Speicher fuellen.
const lang = pruefeAnfrage({ name: 'A'.repeat(500), date: heute, time: '12:00', guests: 2 }, { heute });
check('Ueberlanger Name wird gekuerzt', lang.ok && lang.anfrage.name.length === 40, String(lang.anfrage?.name.length));
check('Leerraum im Namen wird geglaettet',
  pruefeAnfrage({ name: '  Familie   Huber  ', date: heute, time: '12:00', guests: 2 }, { heute }).anfrage.name === 'Familie Huber');

// ---- 2. Standard-Etage ----------------------------------------------------

const plan = buildFloorplan(config);
const etagen = plan.levels.map(level => level.id);
check('Ohne Vorgabe bleibt die Reihenfolge',
  etagenReihenfolge(plan, null).join(',') === etagen.join(','));
check('Standard-Etage steht vorne',
  etagenReihenfolge(plan, etagen[1])[0] === etagen[1],
  etagenReihenfolge(plan, etagen[1]).join(','));
check('Unbekannte Etage aendert nichts',
  etagenReihenfolge(plan, 'gibtsnicht').join(',') === etagen.join(','));

// ---- 3. Zuweisung: dieselbe Regel wie im Haus -----------------------------

const zwei = verteile({ name: 'Huber', date: heute, time: '12:00', guests: 2 },
  { config, parties: [] });
check('Zwei Gaeste bekommen einen Tisch', zwei.result.ok, JSON.stringify(zwei.result));
check('Zwei Gaeste ohne Sitzplatzverschwendung', zwei.result.seatGap === 0, String(zwei.result.seatGap));

const aufEtage2 = verteile({ name: 'Mayer', date: heute, time: '12:00', guests: 4 },
  { config, parties: [], standardEtage: etagen[1] });
const tisch = plan.tables.find(entry => entry.id === aufEtage2.result.tableIds?.[0]);
check('Onlinebuchung landet auf der Standard-Etage',
  aufEtage2.result.ok && tisch?.levelId === etagen[1],
  `${tisch?.levelName} statt ${etagen[1]}`);

// Ein belegter Tisch darf nicht doppelt vergeben werden - der eigentliche
// Grund, warum es diesen Dienst ueberhaupt gibt.
const belegt = [{
  id: 'x1', name: 'Da', date: heute, time: '12:00', guests: 2,
  tableIds: zwei.result.tableIds, arrived: null, left: null
}];
const zweiter = verteile({ name: 'Zweite', date: heute, time: '12:00', guests: 2 },
  { config, parties: belegt });
check('Derselbe Tisch wird nicht zweimal vergeben',
  zweiter.result.ok && zweiter.result.tableIds[0] !== zwei.result.tableIds[0],
  `${zweiter.result.tableIds} gegen ${zwei.result.tableIds}`);

// Der Sitzplatzdeckel des Hauses gilt auch online.
const gedeckelt = verteile({ name: 'Gross', date: heute, time: '12:00', guests: 6 },
  { config, parties: [], deckel: 4 });
check('Sitzplatzdeckel gilt auch online',
  !gedeckelt.result.ok && gedeckelt.result.reason === 'capacity',
  JSON.stringify(gedeckelt.result));

// Wer gegangen ist, gibt den Tisch frei - auch fuer die Onlinebuchung.
const gegangen = [{
  id: 'x2', name: 'Weg', date: heute, time: '12:00', guests: 2,
  tableIds: zwei.result.tableIds, arrived: '12:00', left: '12:30'
}];
const danach = verteile({ name: 'Neu', date: heute, time: '13:00', guests: 2 },
  { config, parties: gegangen });
check('Nach dem Abgang ist der Tisch wieder buchbar', danach.result.ok, JSON.stringify(danach.result));

check('Sitzende Gaeste werden gezaehlt',
  sitzendeGaeste(belegt, { date: heute, time: '12:00', dauerVon: () => 105 }) === 2);
check('Nach dem Abgang zaehlt niemand mehr',
  sitzendeGaeste(gegangen, { date: heute, time: '13:00', dauerVon: () => 105 }) === 0);

// ---- 4. Aktionen des Hauses ----------------------------------------------

const liste = [{ id: 'a', name: 'Huber', date: heute, time: '12:00', guests: 2, tableIds: ['eg-t01'] }];
check('Ankunft wird gesetzt',
  wendeAktionAn(liste, { art: 'ankunft', id: 'a', zeit: '12:05' }).parties[0].arrived === '12:05');
check('Abgang setzt auch die Ankunft, wenn sie fehlt',
  wendeAktionAn(liste, { art: 'abgang', id: 'a', zeit: '13:00' }).parties[0].arrived === '12:00');
check('Tischwechsel wird uebernommen',
  wendeAktionAn(liste, { art: 'tisch', id: 'a', tableIds: ['eg-t09'] }).parties[0].tableIds[0] === 'eg-t09');
check('Entfernen entfernt',
  wendeAktionAn(liste, { art: 'entfernen', id: 'a' }).parties.length === 0);
check('Unbekannte Reservierung wird abgelehnt',
  !wendeAktionAn(liste, { art: 'ankunft', id: 'gibtsnicht' }).ok);
check('Unbekannte Aktion wird abgelehnt',
  !wendeAktionAn(liste, { art: 'loeschen-alles' }).ok);
// Die Vorlage darf nie veraendert werden - sonst haengt der Dienst an einem
// halb geaenderten Zustand, wenn eine Aktion fehlschlaegt.
wendeAktionAn(liste, { art: 'ankunft', id: 'a', zeit: '12:05' });
check('Die Eingabeliste bleibt unberuehrt', liste[0].arrived === undefined, String(liste[0].arrived));

// ---- 5. Aufbewahrung ------------------------------------------------------

const alt = [
  { id: 'alt', date: '2026-01-01' },
  { id: 'neu', date: heute }
];
check('Alte Reservierungen werden geloescht',
  raeumeAuf(alt, heute, 30).map(entry => entry.id).join(',') === 'neu',
  raeumeAuf(alt, heute, 30).map(entry => entry.id).join(','));

check('Kennungen sind eindeutig und sortierbar',
  machId(1000, 1) !== machId(1000, 2) && machId(1000, 1) < machId(1000, 2));

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Dienst-Prüfung OK: Eingaben, Standard-Etage, Zuweisung, Aktionen und Aufbewahrung geprüft (${plan.tables.length} Tische).`);
