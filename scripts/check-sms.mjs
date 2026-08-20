// Goldene Testfaelle fuer die SMS an den Gast. Reine Logik, kein Netz.
//
// Der Schwerpunkt liegt auf der Nummer: eine falsch umgeformte Nummer
// schickt die Nachricht an einen Fremden. Lieber gar keine SMS als eine an
// die falsche Person - deshalb gibt jede unklare Eingabe null zurueck.

import { SMS_ZEICHEN, fertigText, nummerFuerSms } from '../server/src/sms.mjs';

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

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('SMS-Prüfung OK: Nummernumwandlung, Grenzfälle und Textlänge geprüft.');
