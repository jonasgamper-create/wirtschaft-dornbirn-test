// Goldene Testfaelle fuer das Takeaway. Prueft die reine Logik in Node -
// dieselben Funktionen laufen im Worker.

import {
  BESTELLSCHLUSS, LETZTE_ABHOLUNG, MAX_PORTIONEN,
  abholzeitFuer, alsPreis, parseKarte, pruefeBestellung, statistik
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

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Takeaway-Prüfung OK: Karte, Abholzeit, Bestellung und Protokoll geprüft (${karte.length} Beispielgerichte).`);
