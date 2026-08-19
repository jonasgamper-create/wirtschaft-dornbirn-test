// Goldene Testfaelle fuer das Takeaway. Prueft die reine Logik in Node -
// dieselben Funktionen laufen im Worker.

import {
  ALLERGENE, BESTELLSCHLUSS, LETZTE_ABHOLUNG, MAX_PORTIONEN,
  abholzeitFuer, alsPreis, kuechenzettel, parseKarte, pruefeBestellung, statistik
} from '../server/src/takeaway.mjs';

const errors = [];
const check = (name, bedingung, detail = '') => {
  if (bedingung) return;
  errors.push(`Takeaway: ${name}${detail ? ` - ${detail}` : ''}`);
};

// ---- 1. Die Karte aus dem PDF-Text ----------------------------------------

const karte = parseKarte(`
Mittagskarte der Woche

Käsespätzle mit Bergkäse und Röstzwiebeln  12,50
Wiener Schnitzel vom Schwein · Kartoffelsalat € 14,90
Burger der Wirtschaft ....... 15,00 €
Tagessuppe 4,20
Wir freuen uns auf euch!
`);
check('Vier Gerichte erkannt', karte.length === 4, JSON.stringify(karte.map(g => g.name)));
check('Name links, Preis rechts', karte[0].name === 'Käsespätzle mit Bergkäse und Röstzwiebeln' && karte[0].preis === 12.5);
check('Euro-Zeichen vorne wie hinten', karte[1].preis === 14.9 && karte[2].preis === 15);
check('Punktreihen faellen weg', karte[2].name === 'Burger der Wirtschaft');
check('Gruss ohne Preis faellt weg', karte.every(g => !g.name.includes('freuen')));
check('Preis als Text', alsPreis(12.5) === '€ 12,50');

const leer = parseKarte('nur Text ohne jeden Preis\n\nnoch einer');
check('Ohne Preise bleibt die Karte leer', leer.length === 0);

// Allergene in Klammern, wie auf jeder gedruckten Karte im Land.
const mitAllergenen = parseKarte('Käsknöpfle mit Röstzwiebeln (A,C,G) 12,90\nSalat (hausgemacht) 8,50\nSuppe (a/g) 4,20');
check('Allergene werden erkannt und vom Namen getrennt',
  mitAllergenen[0].name === 'Käsknöpfle mit Röstzwiebeln'
  && mitAllergenen[0].allergene.join('') === 'ACG', JSON.stringify(mitAllergenen[0]));
check('Eine Wortklammer bleibt Teil des Namens',
  mitAllergenen[1].name === 'Salat (hausgemacht)' && mitAllergenen[1].allergene.length === 0,
  JSON.stringify(mitAllergenen[1]));
check('Kleinschreibung und Schraegstrich gehen auch',
  mitAllergenen[2].allergene.join('') === 'AG', JSON.stringify(mitAllergenen[2]));
check('Jeder Code hat einen Namen', mitAllergenen[0].allergene.every(code => ALLERGENE[code]));

// ---- 2. Abholzeit ----------------------------------------------------------

check('Sofort heisst eine halbe Stunde, gerundet',
  abholzeitFuer('11:32', 'sofort').zeit === '12:05', JSON.stringify(abholzeitFuer('11:32', 'sofort')));
check('Wunschzeit im Viertelraster geht', abholzeitFuer('11:30', '12:15').ok);
check('Wunschzeit ohne Vorlauf faellt raus', abholzeitFuer('12:00', '12:15').grund === 'zu_frueh');
check('Krummer Slot faellt raus', abholzeitFuer('11:30', '12:10').grund === 'zeit');
check('Nach der letzten Abholung ist Schluss', abholzeitFuer('11:30', '14:15').grund === 'schluss');
check('Sofort kurz vor Schluss geht noch',
  abholzeitFuer('13:30', 'sofort').ok, JSON.stringify(abholzeitFuer('13:30', 'sofort')));
check('Sofort nach 13:30 laeuft auf die letzte Abholung',
  abholzeitFuer('13:31', 'sofort').grund === 'schluss' || abholzeitFuer('13:31', 'sofort').zeit <= LETZTE_ABHOLUNG);

// ---- 3. Bestellung pruefen -------------------------------------------------

const heute = '2026-08-20'; // Donnerstag
const rahmen = { gerichte: karte, heute, jetzt: '11:30' };
const gut = pruefeBestellung({
  name: 'Huber', telefon: '+43 660 1234567',
  posten: [{ id: 'g1', menge: 2 }, { id: 'g4', menge: 1 }], abholung: 'sofort'
}, rahmen);
check('Gute Bestellung geht durch', gut.ok, JSON.stringify(gut));
check('Summe stimmt', gut.bestellung.summe === 2 * 12.5 + 4.2, String(gut.bestellung?.summe));
check('Abholzeit steht drin', gut.bestellung.abholzeit === '12:00');

check('Ohne Telefon faellt raus',
  pruefeBestellung({ name: 'Huber', telefon: '', posten: [{ id: 'g1', menge: 1 }] }, rahmen).grund === 'telefon');
check('Unbekanntes Gericht faellt weg, leere Bestellung raus',
  pruefeBestellung({ name: 'Huber', telefon: '+436601234567', posten: [{ id: 'g99', menge: 2 }] }, rahmen).grund === 'leer');
check('Zu viele Portionen fallen raus',
  pruefeBestellung({ name: 'Huber', telefon: '+436601234567', posten: [{ id: 'g1', menge: 8 }, { id: 'g2', menge: 8 }] }, rahmen).grund === 'zu_viel',
  String(MAX_PORTIONEN));
check('Nach Bestellschluss ist zu',
  pruefeBestellung({ name: 'Huber', telefon: '+436601234567', posten: [{ id: 'g1', menge: 1 }] },
    { ...rahmen, jetzt: '13:50' }).grund === 'schluss', BESTELLSCHLUSS);
check('Am Samstag gibt es kein Takeaway',
  pruefeBestellung({ name: 'Huber', telefon: '+436601234567', posten: [{ id: 'g1', menge: 1 }] },
    { ...rahmen, heute: '2026-08-22' }).grund === 'wochenende');
check('Ohne Karte keine Bestellung',
  pruefeBestellung({ name: 'Huber', telefon: '+436601234567', posten: [{ id: 'g1', menge: 1 }] },
    { ...rahmen, gerichte: [] }).grund === 'karte');

// ---- 4. Das Protokoll ------------------------------------------------------

const protokoll = statistik([
  { posten: [{ name: 'Käsespätzle', preis: 12.5, menge: 2 }, { name: 'Suppe', preis: 4.2, menge: 1 }] },
  { posten: [{ name: 'Käsespätzle', preis: 12.5, menge: 3 }] }
]);
check('Protokoll zaehlt Bestellungen', protokoll.bestellungen === 2);
check('Protokoll zaehlt Portionen', protokoll.portionen === 6);
check('Der Renner steht oben', protokoll.gerichte[0].name === 'Käsespätzle' && protokoll.gerichte[0].portionen === 5);
check('Umsatz stimmt', protokoll.umsatz === 5 * 12.5 + 4.2, String(protokoll.umsatz));

// ---- Kuechenzettel: wie viel wird heute gebraucht -------------------------
// Er darf nie mehr behaupten, als das Haus wirklich weiss: Bestelltes ist
// Tatsache, der Rest eine Verteilung aus der eigenen Vergangenheit.

const zettelKarte = [{ name: 'Käsespätzle', preis: 12.5 }, { name: 'Schnitzel', preis: 15.9 }];
const HEUTE = '2026-08-24';

// Ohne Vergangenheit wird gleichmaessig verteilt - und der Zettel sagt das.
const ohneErfahrung = kuechenzettel({
  gerichte: zettelKarte, bestellungen: [], parties: [{ date: HEUTE, guests: 10 }], date: HEUTE
});
check('Ohne Vergangenheit keine behauptete Erfahrung', ohneErfahrung.ausErfahrung === false);
check('Ohne Vergangenheit gleichmaessig verteilt',
  ohneErfahrung.zeilen.every(zeile => zeile.empfohlen === 5), JSON.stringify(ohneErfahrung.zeilen));
check('Erwartete Gaeste kommen aus den Reservierungen', ohneErfahrung.erwarteteGaeste === 10);

// Mit Vergangenheit: 8 von 10 Portionen waren Kaesespaetzle, also 80 Prozent.
const gestern = [
  { date: '2026-08-21', posten: [{ name: 'Käsespätzle', preis: 12.5, menge: 8 }, { name: 'Schnitzel', preis: 15.9, menge: 2 }] }
];
const zettel = kuechenzettel({
  gerichte: zettelKarte,
  bestellungen: [...gestern, { date: HEUTE, posten: [{ name: 'Schnitzel', preis: 15.9, menge: 3 }] }],
  parties: [{ date: HEUTE, guests: 10 }],
  date: HEUTE
});
check('Mit Vergangenheit steht die Erfahrung dahinter', zettel.ausErfahrung === true);
check('Die Grundlage wird genannt', zettel.grundlage === 10, String(zettel.grundlage));
const spaetzle = zettel.zeilen.find(zeile => zeile.name === 'Käsespätzle');
const schnitzel = zettel.zeilen.find(zeile => zeile.name === 'Schnitzel');
check('Anteil kommt aus der eigenen Vergangenheit', spaetzle.anteil === 80, String(spaetzle.anteil));
check('Schon Bestelltes zaehlt unveraendert mit', schnitzel.bestellt === 3, String(schnitzel.bestellt));
check('Empfehlung ist Bestelltes plus erwartete Gaeste',
  spaetzle.empfohlen === 8 && schnitzel.empfohlen === 3 + 2,
  `${spaetzle.empfohlen} / ${schnitzel.empfohlen}`);
check('Nur der heutige Tag zaehlt als bestellt', zettel.bestelltGesamt === 3, String(zettel.bestelltGesamt));

// Ein Gericht von der alten Karte darf die Anteile der heutigen nicht druecken.
const alteKarte = kuechenzettel({
  gerichte: [{ name: 'Käsespätzle', preis: 12.5 }],
  bestellungen: [{ date: '2026-08-21', posten: [{ name: 'Gibt es nicht mehr', preis: 9, menge: 90 }, { name: 'Käsespätzle', preis: 12.5, menge: 10 }] }],
  parties: [{ date: HEUTE, guests: 10 }],
  date: HEUTE
});
check('Gerichte ausser Karte verzerren die Anteile nicht',
  alteKarte.zeilen[0].anteil === 100, JSON.stringify(alteKarte.zeilen));

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Takeaway-Prüfung OK: Karte, Abholzeit, Bestellung, Protokoll und Küchenzettel geprüft (${karte.length} Beispielgerichte).`);
