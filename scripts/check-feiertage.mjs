// Goldene Testfaelle fuer die Feiertagsrechnung. Falsche Feiertage sind
// still: die Seite sperrt einen offenen Tag oder laesst einen gesperrten
// durch, und niemand merkt es vor dem 15. August.

import {
  feiertageImJahr, istFeiertag, istOffenerTag, naechsterOffenerTag, ostersonntag
} from '../site/feiertage.mjs';

const errors = [];
const check = (name, bedingung, detail = '') => {
  if (bedingung) return;
  errors.push(`Feiertage: ${name}${detail ? ` - ${detail}` : ''}`);
};

// Osterdaten gegen bekannte Jahre - die Referenz ist der Kalender, nicht
// die eigene Formel.
const ostern = jahr => ostersonntag(jahr).toISOString().slice(0, 10);
check('Ostern 2024 stimmt', ostern(2024) === '2024-03-31', ostern(2024));
check('Ostern 2025 stimmt', ostern(2025) === '2025-04-20', ostern(2025));
check('Ostern 2026 stimmt', ostern(2026) === '2026-04-05', ostern(2026));
check('Ostern 2027 stimmt', ostern(2027) === '2027-03-28', ostern(2027));
check('Ostern 2038 stimmt (spaetester Termin)', ostern(2038) === '2038-04-25', ostern(2038));

const f2026 = feiertageImJahr(2026);
check('13 gesetzliche Feiertage', f2026.size === 13, String(f2026.size));
check('Ostermontag 2026', f2026.has('2026-04-06'));
check('Christi Himmelfahrt 2026', f2026.has('2026-05-14'));
check('Pfingstmontag 2026', f2026.has('2026-05-25'));
check('Fronleichnam 2026', f2026.has('2026-06-04'));
check('Mariae Himmelfahrt', f2026.has('2026-08-15'));
check('Nationalfeiertag', f2026.has('2026-10-26'));
check('Ein gewoehnlicher Dienstag ist keiner', !istFeiertag('2026-08-25'));
// Karfreitag ist in Oesterreich KEIN allgemeiner gesetzlicher Feiertag.
check('Karfreitag ist offen', !istFeiertag('2026-04-03'));

// Offene Tage
check('Werktag ist offen', istOffenerTag('2026-08-25'));
check('Samstag ist zu', !istOffenerTag('2026-08-22'));
check('Sonntag ist zu', !istOffenerTag('2026-08-23'));
check('Feiertag ist zu', !istOffenerTag('2026-10-26'));
check('Vom Wirt gesperrt ist zu', !istOffenerTag('2026-08-25', ['2026-08-25']));

// Der Standardtag im Formular
check('Heute offen heisst heute', naechsterOffenerTag('2026-08-25') === '2026-08-25');
check('Samstag springt auf Montag', naechsterOffenerTag('2026-08-22') === '2026-08-24');
check('Sonntag springt auf Montag', naechsterOffenerTag('2026-08-23') === '2026-08-24');
// Freitag 14.8.2026 gesperrt, Samstag 15.8. ist Mariae Himmelfahrt UND
// Wochenende, Sonntag 16.8. Wochenende -> Montag 17.8.
check('Sperre plus Feiertag plus Wochenende springt richtig',
  naechsterOffenerTag('2026-08-14', ['2026-08-14']) === '2026-08-17',
  naechsterOffenerTag('2026-08-14', ['2026-08-14']));
// Montag 26.10.2026 ist Nationalfeiertag -> Dienstag.
check('Wochenende vor Feiertagsmontag springt auf Dienstag',
  naechsterOffenerTag('2026-10-24') === '2026-10-27', naechsterOffenerTag('2026-10-24'));

if (errors.length) {
  console.error(`\nFeiertags-Prüfung fehlgeschlagen (${errors.length}):`);
  for (const zeile of errors) console.error(`  - ${zeile}`);
  process.exit(1);
}
console.log('Feiertags-Prüfung OK: Osterformel gegen fünf Kalenderjahre, 13 Feiertage, offene Tage und Standardtag geprüft.');
