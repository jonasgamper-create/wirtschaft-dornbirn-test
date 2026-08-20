// Goldene Testfaelle fuer die SMS an den Gast. Reine Logik, kein Netz.
//
// Der Schwerpunkt liegt auf der Nummer: eine falsch umgeformte Nummer
// schickt die Nachricht an einen Fremden. Lieber gar keine SMS als eine an
// die falsche Person - deshalb gibt jede unklare Eingabe null zurueck.

import {
  SMS_ZEICHEN, bestellungText, erinnerungText, fertigText, nummerFuerSms,
  passtInEineSms, reservierungText
} from '../server/src/sms.mjs';
import { brauchtErinnerung } from '../server/src/haus-logik.mjs';

const errors = [];
const check = (name, bedingung, detail = '') => {
  if (bedingung) return;
  errors.push(`SMS: ${name}${detail ? ` - ${detail}` : ''}`);
};

// ---- 1. Die Nummer --------------------------------------------------------

check('Internationale Form bleibt', nummerFuerSms('+436601234567') === '436601234567');
check('Leerzeichen und Striche fallen weg',
  nummerFuerSms('+43 660 123 45 67') === '436601234567', String(nummerFuerSms('+43 660 123 45 67')));
// Die eingeklammerte Null ist die uebliche oesterreichische Schreibweise -
// sie steht so im Impressum des Hauses. Zaehlt man sie mit, entsteht
// 430660... und die SMS geht an niemanden.
check('Die eingeklammerte Null faellt weg',
  nummerFuerSms('+43 (0)660/123 45 67') === '436601234567', String(nummerFuerSms('+43 (0)660/123 45 67')));
check('Auch ohne Klammern faellt die Inlandsnull weg',
  nummerFuerSms('+43 0660 1234567') === '436601234567', String(nummerFuerSms('+43 0660 1234567')));
check('Doppelnull wird zur Landesvorwahl', nummerFuerSms('00436601234567') === '436601234567');
check('Nationale Form bekommt die Landesvorwahl',
  nummerFuerSms('0660 1234567') === '4366 01234567'.replace(' ', ''), String(nummerFuerSms('0660 1234567')));
// Die Festnetznummer des Hauses, so wie sie auf der Seite steht.
check('Die Hausnummer aus dem Impressum stimmt',
  nummerFuerSms('+43 (0)5572 20 540') === '43557220540', String(nummerFuerSms('+43 (0)5572 20 540')));
check('Deutsche Nummer bleibt deutsch', nummerFuerSms('+49 170 1234567') === '491701234567');

// Was nicht eindeutig ist, wird nicht geraten.
check('Zu kurze Nummer faellt raus', nummerFuerSms('12345') === null);
check('Leere Eingabe faellt raus', nummerFuerSms('') === null && nummerFuerSms(null) === null);
check('Buchstaben allein faellt raus', nummerFuerSms('kein Telefon') === null);
check('Absurd lange Nummer faellt raus', nummerFuerSms('+4366012345678901234') === null);

// ---- 2. Der Text ----------------------------------------------------------

const text = fertigText({ nummer: 7, name: 'Huber' });
check('Die Nummer steht drin', text.includes('Nr. 7'), text);
check('Der Name steht drin', text.includes('Huber'), text);
check('Das Haus nennt sich', text.includes('Wirtschaft Dornbirn'), text);
// Ueber 160 Zeichen wird die SMS geteilt und doppelt berechnet.
check('Der Text passt in eine SMS', text.length <= SMS_ZEICHEN, `${text.length} Zeichen: ${text}`);

const langerName = fertigText({ nummer: 12, name: 'Maximiliane Bartholomäus-Fussenegger von und zu Dornbirn' });
check('Auch mit langem Namen eine SMS', langerName.length <= SMS_ZEICHEN, `${langerName.length} Zeichen`);
check('Nur der Vorname wird genommen', !langerName.includes('Bartholomäus'), langerName);

const ohneName = fertigText({ nummer: 3, name: '' });
check('Ohne Namen bleibt der Satz ganz', ohneName.includes('Nr. 3') && !ohneName.includes('  '), ohneName);

// Die unauffaelligste Falle: ein typografischer Gedankenstrich - wie er im
// ganzen uebrigen Projekt steht - kippt die SMS auf UCS-2. Dann sind nur
// noch 70 Zeichen je Teil erlaubt, und aus einer Nachricht werden zwei.
// Das faellt niemandem auf ausser der Rechnung.
check('Der Text bleibt in einem SMS-Teil', passtInEineSms(text), text);
check('Auch mit langem Vornamen', passtInEineSms(langerName), langerName);
check('Auch ohne Namen', passtInEineSms(ohneName), ohneName);
check('Ein Gedankenstrich wuerde auffallen', !passtInEineSms('Nr. 7 ist fertig – bis gleich'));
check('Ein typografischer Apostroph ebenso', !passtInEineSms('hol’s dir'));
check('Umlaute sind dagegen in Ordnung', passtInEineSms('Käsknöpfle für Süßmaul'));

// Kein Gericht im Text: sonst muesste die Nachricht jedes Mal mitwandern,
// wenn die Karte wechselt - und die wechselt woechentlich.
const kein = ['Schnitzel', 'Käsknöpfle', 'Suppe', 'Portion'];
check('Der Text nennt kein Gericht',
  kein.every(wort => !text.includes(wort)), text);

// ---- 3. Die anderen beiden Texte ------------------------------------------

const bestellt = bestellungText({ nummer: 7, zeit: '12:15' });
check('Bestellbestaetigung nennt Nummer und Zeit',
  bestellt.includes('Nr. 7') && bestellt.includes('12:15'), bestellt);
check('Bestellbestaetigung passt in eine SMS', passtInEineSms(bestellt), `${bestellt.length}`);
check('Vorbestellung sagt es dazu',
  bestellungText({ nummer: 7, zeit: '12:15', wann: 'am naechsten Werktag' }).includes('naechsten Werktag'));
check('Vorbestellung passt auch in eine SMS',
  passtInEineSms(bestellungText({ nummer: 12, zeit: '12:15', wann: 'am naechsten Werktag' })));

const reserviert = reservierungText({ datum: '24.08.', zeit: '12:00', personen: 4 });
check('Reservierungsbestaetigung ist vollstaendig',
  reserviert.includes('24.08.') && reserviert.includes('12:00') && reserviert.includes('4 Personen'), reserviert);
check('Reservierungsbestaetigung passt in eine SMS', passtInEineSms(reserviert), `${reserviert.length}`);
check('Einzahl bei einer Person',
  reservierungText({ datum: '24.08.', zeit: '12:00', personen: 1 }).includes('1 Person.'),
  reservierungText({ datum: '24.08.', zeit: '12:00', personen: 1 }));

const erinnert = erinnerungText({ zeit: '12:00', personen: 2 });
check('Erinnerung nennt Zeit und Personen',
  erinnert.includes('12:00') && erinnert.includes('2 Personen'), erinnert);
check('Erinnerung passt in eine SMS', passtInEineSms(erinnert), `${erinnert.length}`);
check('Erinnerung bietet den Absageweg an', erinnert.includes('20540'), erinnert);

// ---- 4. Wer bekommt eine Erinnerung ---------------------------------------
// Eine falsche Bedingung hat hier zwei teure Richtungen: sie schweigt, wenn
// sie sollte - oder sie schickt bei jedem Lauf des Zeitplans erneut.

const HEUTE = '2026-08-24';
const gast = (mehr = {}) => ({
  id: 'p1', date: HEUTE, time: '12:00', guests: 2,
  kontakt: { email: null, telefon: '+436601234567' },
  eingegangen: '2026-08-21T10:00:00.000Z', ...mehr
});

check('Eine Stunde vorher ist faellig',
  brauchtErinnerung([gast()], { datum: HEUTE, zeit: '11:00' }).length === 1);
check('Zwei Stunden vorher noch nicht',
  brauchtErinnerung([gast()], { datum: HEUTE, zeit: '10:00' }).length === 0);
check('Nach dem Termin nicht mehr',
  brauchtErinnerung([gast()], { datum: HEUTE, zeit: '12:30' }).length === 0);
check('Direkt davor nicht mehr - das Fenster ist vorbei',
  brauchtErinnerung([gast()], { datum: HEUTE, zeit: '11:50' }).length === 0);

// Am selben Tag gebucht: der Gast weiss es noch.
check('Wer heute fuer heute bucht, bekommt keine Erinnerung',
  brauchtErinnerung([gast({ eingegangen: `${HEUTE}T09:00:00.000Z` })], { datum: HEUTE, zeit: '11:00' }).length === 0);

// Einmal und nicht mehr.
check('Schon erinnert heisst nicht noch einmal',
  brauchtErinnerung([gast({ erinnertUm: '2026-08-24T09:00:00.000Z' })], { datum: HEUTE, zeit: '11:00' }).length === 0);

check('Ohne Telefonnummer keine Erinnerung',
  brauchtErinnerung([gast({ kontakt: { email: 'a@b.at', telefon: null } })], { datum: HEUTE, zeit: '11:00' }).length === 0);
check('Stornierte bekommen nichts',
  brauchtErinnerung([gast({ status: 'storniert' })], { datum: HEUTE, zeit: '11:00' }).length === 0);
check('Ein anderer Tag zaehlt nicht',
  brauchtErinnerung([gast({ date: '2026-08-25' })], { datum: HEUTE, zeit: '11:00' }).length === 0);

// Mehrere Gaeste zur selben Zeit bekommen alle ihre Erinnerung.
const viele = [gast(), gast({ id: 'p2' }), gast({ id: 'p3', time: '13:00' })];
check('Alle faelligen werden gefunden',
  brauchtErinnerung(viele, { datum: HEUTE, zeit: '11:00' }).length === 2);
check('Der spaetere kommt spaeter dran',
  brauchtErinnerung(viele, { datum: HEUTE, zeit: '12:00' }).map(p => p.id).join() === 'p3');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('SMS-Prüfung OK: Nummernumwandlung, alle vier Texte, Kodierung und Erinnerungsfenster geprüft.');
