// Goldene Testfaelle fuer den Reservierungsdienst. Prueft die reine Logik in
// Node - ohne Cloudflare, ohne Netz. Genau diese Funktionen laufen im Worker.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AMPEL_WENIGE, ampelFuer, etagenReihenfolge, machId, planTaugt, pruefeAnfrage, raeumeAuf, sitzendeGaeste, verteile, wendeAktionAn
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
check('Samstag faellt raus',
  pruefeAnfrage({ name: 'Huber', date: '2026-08-22', time: '12:00', guests: 4 }, { heute }).grund === 'wochenende');
check('Sonntag faellt raus',
  pruefeAnfrage({ name: 'Huber', date: '2026-08-23', time: '12:00', guests: 4 }, { heute }).grund === 'wochenende');
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


// ---- Pacing: das Kuechenlimit gilt auch online ----------------------------
// Live gefunden: die Bedingung stand verkehrt herum, Online-Buchungen zaehlten
// nicht fuers Pacing - 16 Gedecke gleichzeitig um 12:00 gingen alle durch.

const limit = config.policy?.maxCoversPerSlot || 10;
const paare = [];
let angenommen = 0;
// Paare nacheinander auf dieselbe Zeit setzen, bis das Limit erreicht ist.
for (let i = 0; i < Math.ceil(limit / 2); i += 1) {
  const naechster = verteile({ name: `Paar ${i}`, date: heute, time: '12:00', guests: 2 }, { config, parties: paare });
  if (!naechster.result.ok) break;
  angenommen += 2;
  paare.push({ id: `p${i}`, date: heute, time: '12:00', guests: 2, tableIds: naechster.result.tableIds, quelle: 'online' });
}
check('Bis zum Kuechenlimit wird zugeteilt', angenommen === limit, `${angenommen} von ${limit}`);
const ueberLimit = verteile({ name: 'Zu spaet', date: heute, time: '12:00', guests: 2 }, { config, parties: paare });
check('Ueber dem Kuechenlimit greift Pacing',
  !ueberLimit.result.ok && ueberLimit.result.reason === 'pacing', JSON.stringify(ueberLimit.result));
check('Pacing nennt Ausweichzeiten', (ueberLimit.result.alternatives || []).length > 0);

// Was das Haus selbst einteilt, darf online nichts blockieren - der Wirt hat
// schon entschieden, als er den Tisch vergab.
const vomHaus = paare.map(party => ({ ...party, quelle: 'haus' }));
const trotzdem = verteile({ name: 'Online dazu', date: heute, time: '12:00', guests: 2 }, { config, parties: vomHaus });
check('Hauseigene Einteilung loest kein Pacing aus', trotzdem.result.ok, JSON.stringify(trotzdem.result));

// ---- Die Ampel fuer die Gaesteseite ---------------------------------------
// Sie ist oeffentlich und muss deshalb doppelt stimmen: keine Namen in der
// Antwort, und keine Stufe, die der echten Buchungslage widerspricht.

const leer = ampelFuer({ config, parties: [], date: heute });
check('Leeres Haus ist gruen', leer.stufe === 'gruen', JSON.stringify(leer));
check('Ampel verraet keine Namen', !JSON.stringify(leer).toLowerCase().includes('name'));

// Alle Tische sperren: nichts mehr frei, die Ampel steht auf Rot.
const alleGesperrt = ampelFuer({ config, parties: [], blocked: plan.tables.map(t => t.id), date: heute });
check('Alles gesperrt ist rot', alleGesperrt.stufe === 'rot', JSON.stringify(alleGesperrt));
check('Rot meldet null Tische', alleGesperrt.freieTische === 0);

// Bis auf wenige Tische sperren: das ist genau der Fall "nur noch drei frei".
const bisAufDrei = ampelFuer({
  config, parties: [],
  blocked: plan.tables.slice(0, plan.tables.length - AMPEL_WENIGE).map(t => t.id),
  date: heute
});
check('Wenige Tische sind orange', bisAufDrei.stufe === 'orange', JSON.stringify(bisAufDrei));
check('Orange nennt die Zahl', bisAufDrei.freieTische === AMPEL_WENIGE, String(bisAufDrei.freieTische));

// Nach der letzten Mittagszeit gibt es nichts mehr zu melden.
check('Nach dem Mittag ist es vorbei',
  ampelFuer({ config, parties: [], date: heute, jetzt: '14:00' }).stufe === 'vorbei');
check('Vor dem Mittag zaehlt der ganze Tag',
  ampelFuer({ config, parties: [], date: heute, jetzt: '09:00' }).stufe === 'gruen');

// Ein Tisch, der um 11:30 besetzt wird, ist fuer spaetere Zeiten wieder frei -
// die Ampel darf ihn nicht doppelt zaehlen. Erst ein voll belegtes Haus ueber
// alle Zeiten drueckt sie auf Rot.
const elfdreissig = verteile({ name: 'Huber', date: heute, time: '11:30', guests: 2 }, { config, parties: [] });
const besetzt = [{ id: 'p1', date: heute, time: '11:30', guests: 2, tableIds: elfdreissig.result.tableIds, quelle: 'online' }];
const spaeter = ampelFuer({ config, parties: besetzt, date: heute, jetzt: '13:15' });
check('Nach dem Essen zaehlt der Tisch wieder als frei',
  spaeter.freieTische === plan.tables.length, `${spaeter.freieTische} von ${plan.tables.length}`);

// ---- Flexibel-Betrieb: gleiche Tische, zusammenschiebbar ------------------
// 50 Tische a 2 Plaetze, bis 5 zusammenschiebbar: 1 Tisch traegt 1-2 Personen,
// 2 Tische 3-4, 5 Tische 9-10. Alles daraus erzeugt, nichts von Hand gepflegt.

const flexConfig = {
  version: 2,
  numbering: { start: 1 },
  activeLayout: 'flex',
  layouts: [{
    id: 'flex',
    name: 'Flexibel',
    levels: [{ id: 'saal', name: 'Saal', order: 0, modus: 'flexibel', flex: { anzahl: 50, plaetze: 2, maxKombi: 5 }, tables: [] }],
    combos: []
  }],
  policy: { maxCoversPerSlot: 100 }
};
const flexPlan = buildFloorplan(flexConfig);
check('Flexibel erzeugt die Tische', flexPlan.tables.length === 50, String(flexPlan.tables.length));
check('Flexibel erzeugt die Stuehle', flexPlan.tables.reduce((s, t) => s + t.seats, 0) === 100);
check('Flexibel erzeugt die Kombinationen', flexPlan.combos.length === 49 + 48 + 47 + 46, String(flexPlan.combos.length));

const einPaar = verteile({ name: 'Paar', date: heute, time: '12:00', guests: 2 }, { config: flexConfig, parties: [] });
check('Paar bekommt einen einzelnen Tisch', einPaar.result.ok && einPaar.result.tableIds.length === 1,
  JSON.stringify(einPaar.result.tableIds));
const zuDritt = verteile({ name: 'Drei', date: heute, time: '12:00', guests: 3 }, { config: flexConfig, parties: [] });
check('Drei bekommen zwei zusammengeschobene Tische', zuDritt.result.ok && zuDritt.result.tableIds.length === 2,
  JSON.stringify(zuDritt.result.tableIds));
const zehn = verteile({ name: 'Zehn', date: heute, time: '12:00', guests: 10 }, { config: flexConfig, parties: [] });
check('Zehn bekommen fuenf Tische', zehn.result.ok && zehn.result.tableIds.length === 5,
  JSON.stringify(zehn.result.tableIds));
const elf = verteile({ name: 'Elf', date: heute, time: '12:00', guests: 11 }, { config: flexConfig, parties: [] });
check('Elf sprengen die Kombigrenze von 5 Tischen', !elf.result.ok, JSON.stringify(elf.result));

// Online-Grenze: bis 20 Personen, darueber ans Telefon.
check('Zwanzig Personen gehen online durch',
  pruefeAnfrage({ name: 'Gross', date: heute, time: '12:00', guests: 20 }, { heute }).ok);
check('Einundzwanzig gehoeren ans Telefon',
  pruefeAnfrage({ name: 'Zu gross', date: heute, time: '12:00', guests: 21 }, { heute }).grund === 'personen');

// Eine groessere Kombigrenze traegt auch die Zwanzigergruppe.
const grossConfig = structuredClone(flexConfig);
grossConfig.layouts[0].levels[0].flex.maxKombi = 10;
const zwanzig = verteile({ name: 'Zwanzig', date: heute, time: '12:00', guests: 20 }, { config: grossConfig, parties: [] });
check('Mit Kombigrenze 10 sitzen zwanzig an zehn Tischen',
  zwanzig.result.ok && zwanzig.result.tableIds.length === 10, JSON.stringify(zwanzig.result));

// ---- Tischplan annehmen oder ablehnen -------------------------------------
// Live gefunden: ein fehlendes Feld sprengte "Uebernehmen und veroeffentlichen"
// mit 500, weil JSON.stringify(undefined) kein Textstueck liefert und die
// Spalte Leerwerte verbietet. Jetzt wird sauber abgelehnt.
check('Ein echter Plan wird angenommen', planTaugt(config));
check('Leerer Koerper wird abgelehnt', !planTaugt(undefined) && !planTaugt(null) && !planTaugt({}));
check('Text statt Plan wird abgelehnt', !planTaugt('kaputt'));
check('Liste statt Plan wird abgelehnt', !planTaugt([]));
check('Plan ohne Ordnungen wird abgelehnt', !planTaugt({ layouts: [] }));

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Dienst-Prüfung OK: Eingaben, Standard-Etage, Zuweisung, Aktionen und Aufbewahrung geprüft (${plan.tables.length} Tische).`);
