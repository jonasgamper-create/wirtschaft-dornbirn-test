// Goldene Testfaelle fuer das Takeaway. Prueft die reine Logik in Node -
// dieselben Funktionen laufen im Worker.

import {
  ALLERGENE, BESTELLSCHLUSS, LETZTE_ABHOLUNG, MAX_PORTIONEN,
  ERSTE_ABHOLUNG, PORTIONEN_HART, PORTIONEN_PRO_SLOT, abholzeitFuer, alsPreis,
  bestelltag, freieSlots, kuechenzettel, naechsterWerktag, parseKarte,
  portionenImSlot, pruefeBestellung, slotLage, statistik
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

// Frueh am Tag. Der Gast schaut um neun auf die Karte und drueckt "so bald wie
// moeglich" - die Kueche sperrt aber erst um 11:30 auf. Ohne Untergrenze stand
// in der Bestaetigung "abholbereit heute ca. 09:30 Uhr".
check('Sofort vor der Oeffnung wartet auf die erste Abholzeit',
  abholzeitFuer('09:00', 'sofort').zeit === ERSTE_ABHOLUNG, JSON.stringify(abholzeitFuer('09:00', 'sofort')));
check('Sofort mitten in der Nacht wartet ebenfalls',
  abholzeitFuer('00:50', 'sofort').zeit === ERSTE_ABHOLUNG, JSON.stringify(abholzeitFuer('00:50', 'sofort')));
check('Wunschzeit vor der Oeffnung faellt raus',
  abholzeitFuer('09:00', '10:30').grund === 'zu_frueh', JSON.stringify(abholzeitFuer('09:00', '10:30')));
check('Die erste Abholzeit selbst geht',
  abholzeitFuer('09:00', ERSTE_ABHOLUNG).zeit === ERSTE_ABHOLUNG);

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
// Nach Bestellschluss ist die HEUTIGE Kueche zu - die Bestellung wird
// angenommen, aber fuer den naechsten Werktag. Frueher fiel sie hier ganz
// weg; das machte die Seite abends tot, obwohl der Gast genau dann plant.
const nachSchluss = pruefeBestellung({ name: 'Huber', telefon: '+436601234567', posten: [{ id: 'g1', menge: 1 }] },
  { ...rahmen, jetzt: '13:50' });
check('Nach Bestellschluss kommt nichts mehr in die heutige Kueche',
  nachSchluss.ok && nachSchluss.bestellung.date !== heute, `${BESTELLSCHLUSS}: ${JSON.stringify(nachSchluss)}`);
// Gesperrte Tage (Feiertag oder Wirt): heute zu heisst Vorbestellung auf den
// naechsten OFFENEN Tag - und der Sprung ueberspringt auch gesperrte Ziele.
check('Heute zu rollt auf morgen',
  bestelltag({ heute: '2026-08-25', jetzt: '12:00', zu: new Set(['2026-08-25']) }).datum === '2026-08-26');
check('Der Sprung ueberspringt gesperrte Ziele',
  naechsterWerktag('2026-08-24', new Set(['2026-08-25', '2026-08-26'])) === '2026-08-27');
check('Freitag mit gesperrtem Montag landet am Dienstag',
  naechsterWerktag('2026-08-21', new Set(['2026-08-24'])) === '2026-08-25');
check('Bestellung an gesperrtem Heute wird Vorbestellung',
  pruefeBestellung({ name: 'Huber', telefon: '+436601234567', posten: [{ id: 'g1', menge: 1 }] },
    { ...rahmen, zu: new Set([heute]) }).bestellung?.vorbestellung === true);

check('Am Samstag wird fuer den naechsten Werktag bestellt',
  pruefeBestellung({ name: 'Huber', telefon: '+436601234567', posten: [{ id: 'g1', menge: 1 }] },
    { ...rahmen, heute: '2026-08-22' }).bestellung?.vorbestellung === true);
check('Ohne Karte keine Bestellung',
  pruefeBestellung({ name: 'Huber', telefon: '+436601234567', posten: [{ id: 'g1', menge: 1 }] },
    { ...rahmen, gerichte: [] }).grund === 'karte');

// ---- 3b. Vorbestellen fuer den naechsten Werktag ---------------------------
// Abends und am Wochenende ist die Seite nicht tot: bestellt wird dann fuer
// den naechsten Tag, an dem gekocht wird. Die Regel des Hauses bleibt dabei
// unangetastet - nach 13:45 kommt nichts mehr in die HEUTIGE Kueche.

check('Freitagabend fuehrt auf Montag', naechsterWerktag('2026-08-21') === '2026-08-24',
  naechsterWerktag('2026-08-21'));
check('Samstag fuehrt auf Montag', naechsterWerktag('2026-08-22') === '2026-08-24');
check('Montagabend fuehrt auf Dienstag', naechsterWerktag('2026-08-24') === '2026-08-25');

check('Waehrend der Kueche gilt heute',
  bestelltag({ heute, jetzt: '12:00' }).vorbestellung === false);
check('Nach Bestellschluss wird vorbestellt',
  bestelltag({ heute, jetzt: '13:50' }).vorbestellung === true);
check('Die Vorbestellung geht auf den naechsten Werktag',
  bestelltag({ heute: '2026-08-21', jetzt: '19:00' }).datum === '2026-08-24');
check('Am Wochenende wird immer vorbestellt',
  bestelltag({ heute: '2026-08-22', jetzt: '10:00' }).vorbestellung === true);
// Genau um 13:45 ist noch heute - die Grenze gehoert zur Kueche.
check('Punkt 13:45 zaehlt noch fuer heute',
  bestelltag({ heute, jetzt: '13:45' }).vorbestellung === false);

// Bei einer Vorbestellung sagt die heutige Uhr nichts ueber morgen.
check('Vorbestellung nimmt jeden Slot im Fenster',
  abholzeitFuer('20:00', '11:30', { vorbestellung: true }).zeit === '11:30');
check('Vorbestellung ohne Wunsch nimmt den ersten Slot',
  abholzeitFuer('20:00', 'sofort', { vorbestellung: true }).zeit === ERSTE_ABHOLUNG);
check('Vorbestellung vor der Kueche faellt raus',
  abholzeitFuer('20:00', '09:00', { vorbestellung: true }).grund === 'zu_frueh');
check('Vorbestellung nach der letzten Abholung faellt raus',
  abholzeitFuer('20:00', '15:00', { vorbestellung: true }).grund === 'schluss');

const abends = pruefeBestellung({
  name: 'Huber', telefon: '+43 660 1234567', posten: [{ id: 'g1', menge: 2 }], abholung: '12:00'
}, { ...rahmen, heute: '2026-08-21', jetzt: '19:30' });
check('Abends kommt die Bestellung durch', abends.ok, JSON.stringify(abends));
check('Sie gilt fuer den naechsten Werktag', abends.bestellung?.date === '2026-08-24',
  abends.bestellung?.date);
check('Sie ist als Vorbestellung erkennbar', abends.bestellung?.vorbestellung === true);

// Und die eigentliche Regel: eine Bestellung um 19:30 landet NICHT im
// heutigen Kuechenzettel - sonst kocht jemand fuer einen Tag, der vorbei ist.
check('Die Vorbestellung faellt nicht auf heute', abends.bestellung?.date !== '2026-08-21');

const amSamstag = pruefeBestellung({
  name: 'Huber', telefon: '+43 660 1234567', posten: [{ id: 'g1', menge: 1 }], abholung: '12:00'
}, { ...rahmen, heute: '2026-08-22', jetzt: '10:00' });
check('Am Samstag wird auf Montag vorbestellt',
  amSamstag.ok && amSamstag.bestellung.date === '2026-08-24', JSON.stringify(amSamstag));

// ---- 3c. Das Kuechenlimit je Abholzeit -------------------------------------
// Im Lasttest wurden 36 Portionen fuer dieselbe Viertelstunde angenommen,
// waehrend im Haus 96 Plaetze zu bekochen sind. Angenommen ist nicht dasselbe
// wie fertig: der Gast steht dann da und wartet.

const voll = Array.from({ length: 4 }, (_, i) => ({
  date: heute, abholzeit: '12:15', posten: [{ id: 'g1', name: 'X', preis: 10, menge: 3 }], nr: i
}));
check('Portionen einer Abholzeit werden gezaehlt',
  portionenImSlot(voll, heute, '12:15') === 12, String(portionenImSlot(voll, heute, '12:15')));
check('Eine andere Zeit ist davon unberuehrt', portionenImSlot(voll, heute, '12:30') === 0);
check('Ein anderer Tag ist davon unberuehrt', portionenImSlot(voll, '2026-08-25', '12:15') === 0);

// Die Grenze ist gestuft: bequem, eng, zu. Eine Bestellung abzulehnen,
// obwohl die Kueche sie mit etwas Verzug noch schafft, waere ein verlorener
// Gast wegen einer Zahl.
check('Bis zur bequemen Menge ist frei', slotLage(0, PORTIONEN_PRO_SLOT) === 'frei');
check('Eine Portion darueber wird eng', slotLage(0, PORTIONEN_PRO_SLOT + 1) === 'eng');
check('Bis zur harten Grenze bleibt es eng', slotLage(0, PORTIONEN_HART) === 'eng');
check('Darueber ist zu', slotLage(0, PORTIONEN_HART + 1) === 'voll');
check('Die harte Grenze liegt ueber der bequemen', PORTIONEN_HART > PORTIONEN_PRO_SLOT);

// Im engen Bereich wird angenommen - mit ehrlichem Hinweis.
const engBestand = [{ date: heute, abholzeit: '12:15', posten: [{ id: 'g1', name: 'X', preis: 10, menge: PORTIONEN_PRO_SLOT }] }];
const imEngen = pruefeBestellung({
  name: 'Huber', telefon: '+436601234567', posten: [{ id: 'g1', menge: 2 }], abholung: '12:15'
}, { ...rahmen, bestehende: engBestand });
check('Im engen Bereich wird angenommen', imEngen.ok, JSON.stringify(imEngen));
check('Und als eng gekennzeichnet', imEngen.bestellung?.eng === true);
check('Im bequemen Bereich ist nichts eng',
  pruefeBestellung({ name: 'Huber', telefon: '+436601234567', posten: [{ id: 'g1', menge: 1 }], abholung: '12:30' },
    { ...rahmen, bestehende: engBestand }).bestellung?.eng === false);

// Erst ueber der harten Grenze wird verwiesen.
const uebervoll = [{ date: heute, abholzeit: '12:15', posten: [{ id: 'g1', name: 'X', preis: 10, menge: PORTIONEN_HART }] }];
const inVollenSlot = pruefeBestellung({
  name: 'Huber', telefon: '+436601234567', posten: [{ id: 'g1', menge: 1 }], abholung: '12:15'
}, { ...rahmen, bestehende: uebervoll });
check('Ueber der harten Grenze nimmt nichts mehr an',
  inVollenSlot.grund === 'slot_voll', JSON.stringify(inVollenSlot));
check('Der Gast bekommt freie Zeiten genannt',
  Array.isArray(inVollenSlot.frei) && inVollenSlot.frei.length > 0, JSON.stringify(inVollenSlot.frei));
check('Die genannten Zeiten sind wirklich frei',
  !inVollenSlot.frei.includes('12:15'), JSON.stringify(inVollenSlot.frei));

// Die Liste fuer die Gaesteseite kennt alle drei Lagen.
const slots = freieSlots({ bestellungen: uebervoll, datum: heute, portionen: 1, vorbestellung: true });
const zwoelfFuenfzehn = slots.find(s => s.zeit === '12:15');
check('Die uebervolle Zeit ist gesperrt',
  zwoelfFuenfzehn && zwoelfFuenfzehn.lage === 'voll' && zwoelfFuenfzehn.frei === false,
  JSON.stringify(zwoelfFuenfzehn));
const engSlots = freieSlots({ bestellungen: engBestand, datum: heute, portionen: 1, vorbestellung: true });
const engerSlot = engSlots.find(s => s.zeit === '12:15');
check('Eine enge Zeit bleibt waehlbar',
  engerSlot && engerSlot.lage === 'eng' && engerSlot.frei === true, JSON.stringify(engerSlot));
check('Andere Zeiten bleiben frei', slots.filter(s => s.lage === 'frei').length > 0);
check('Das Fenster beginnt bei der ersten Abholung', slots[0].zeit === ERSTE_ABHOLUNG, slots[0]?.zeit);

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
