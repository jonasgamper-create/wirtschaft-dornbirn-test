// Goldene Testfaelle fuer die Gastprofile. Prueft die reine Logik in Node -
// dieselben Funktionen laufen im Worker.
//
// Der Schwerpunkt liegt auf dem, was hier teuer ist: eine Unvertraeglichkeit,
// die ohne ausdrueckliche Einwilligung gespeichert wird, ist ein Verstoss
// gegen Art. 9 DSGVO - kein Schoenheitsfehler.

import {
  MAX_NOTIZ, PROFIL_TAGE, WORTLAUT_GESUNDHEIT, WORTLAUT_PROFIL,
  fuerDenWirt, pruefeWunsch, raeumeAufProfile, schluesselFuer, widerrufe, zaehleBesuch
} from '../server/src/gast.mjs';

const errors = [];
const check = (name, bedingung, detail = '') => {
  if (bedingung) return;
  errors.push(`Gast: ${name}${detail ? ` - ${detail}` : ''}`);
};

const JETZT = '2026-08-19T11:30:00.000Z';
const HEUTE = '2026-08-19';

// ---- 1. Der Schluessel: wiedererkennen ohne die Adresse zu speichern ------

const perMail = await schluesselFuer({ email: 'Huber@Beispiel.at', telefon: null });
const gleicheMail = await schluesselFuer({ email: '  huber@beispiel.at ', telefon: null });
check('Gross- und Kleinschreibung ergeben denselben Gast', perMail === gleicheMail);
check('Der Schluessel traegt die Adresse nicht',
  !perMail.includes('huber') && !perMail.includes('@') && perMail.length === 64, perMail);

const perNummer = await schluesselFuer({ email: null, telefon: '+43 660 123 45 67' });
const gleicheNummer = await schluesselFuer({ email: null, telefon: '+436601234567' });
check('Leerzeichen in der Nummer aendern den Gast nicht', perNummer === gleicheNummer);
check('Zwei verschiedene Gaeste, zwei Schluessel', perMail !== perNummer);

// Die Mailadresse gewinnt: sonst waere derselbe Gast zweimal im Speicher,
// je nachdem was er beim Buchen angegeben hat.
const beides = await schluesselFuer({ email: 'huber@beispiel.at', telefon: '+436601234567' });
check('Bei beidem gewinnt die Mailadresse', beides === perMail);
check('Ohne brauchbaren Kontakt kein Schluessel',
  (await schluesselFuer({ email: null, telefon: '12' })) === null);

// ---- 2. Die Einwilligung -------------------------------------------------

const ohneAlles = pruefeWunsch({});
check('Ohne Zustimmung entsteht kein Profil', ohneAlles.merken === false);

// Das Herzstueck: eine Unvertraeglichkeit ohne die eigene Einwilligung dafuer
// wird verworfen - auch wenn sie im Feld steht und "merken" angehakt ist.
const ohneGesundheit = pruefeWunsch({ merken: true, unvertraeglichkeit: 'glutenfrei' });
check('Unvertraeglichkeit ohne ausdrueckliche Einwilligung wird verworfen',
  ohneGesundheit.unvertraeglichkeit === '' && ohneGesundheit.verworfen === true,
  JSON.stringify(ohneGesundheit));

const mitGesundheit = pruefeWunsch({ merken: true, unvertraeglichkeit: 'glutenfrei', gesundheit: true });
check('Mit ausdruecklicher Einwilligung wird sie uebernommen',
  mitGesundheit.unvertraeglichkeit === 'glutenfrei' && mitGesundheit.gesundheit === true);

// Ein Haken bei Gesundheit ohne Angabe ist gegenstandslos - er darf keine
// Einwilligung fuer ein leeres Feld erzeugen.
check('Leeres Feld erzeugt keine Gesundheitseinwilligung',
  pruefeWunsch({ merken: true, unvertraeglichkeit: '', gesundheit: true }).gesundheit === false);

// Ohne das grundsaetzliche Merken gibt es kein Profil - dann auch keine
// Unvertraeglichkeit, egal was angehakt ist.
check('Ohne Merken bleibt nichts uebrig',
  pruefeWunsch({ merken: false, unvertraeglichkeit: 'Nüsse', gesundheit: true }).unvertraeglichkeit === '');

const lang = pruefeWunsch({ merken: true, unvertraeglichkeit: 'x'.repeat(400), gesundheit: true });
check('Ueberlange Angabe wird gekuerzt', lang.unvertraeglichkeit.length === MAX_NOTIZ,
  String(lang.unvertraeglichkeit.length));

// ---- 3. Besuche zaehlen --------------------------------------------------

const erster = zaehleBesuch(null, { jetzt: JETZT, datum: HEUTE, wunsch: pruefeWunsch({ merken: true }) });
check('Der erste Besuch zaehlt', erster.besuche === 1);
check('Der Wortlaut wird mitgespeichert', erster.einwilligung.wortlaut === WORTLAUT_PROFIL);
check('Ohne Gesundheitsangabe bleibt sie leer', erster.unvertraeglichkeit === null);

const zweiter = zaehleBesuch(erster, {
  jetzt: '2026-09-01T11:30:00.000Z', datum: '2026-09-01',
  wunsch: pruefeWunsch({ merken: true, unvertraeglichkeit: 'Nüsse', gesundheit: true })
});
check('Der zweite Besuch zaehlt weiter', zweiter.besuche === 2);
check('Die Unvertraeglichkeit kommt dazu', zweiter.unvertraeglichkeit === 'Nüsse');
check('Die Gesundheitseinwilligung wird eigens festgehalten',
  zweiter.einwilligungGesundheit.wortlaut === WORTLAUT_GESUNDHEIT);
check('Die erste Einwilligung bleibt bei ihrem Datum',
  zweiter.einwilligung.seit === JETZT, zweiter.einwilligung.seit);

// ---- 4. Was der Wirt sieht -----------------------------------------------

const sicht = fuerDenWirt(zweiter);
check('Der Wirt sieht die Besuchszahl', sicht.besuche === 2);
check('Der Wirt sieht die Unvertraeglichkeit', sicht.unvertraeglichkeit === 'Nüsse');
// Nicht mehr als noetig: kein Datum, keine Historie, kein Schluessel.
check('Der Wirt sieht nicht mehr als noetig',
  Object.keys(sicht).sort().join(',') === 'besuche,unvertraeglichkeit', Object.keys(sicht).join(','));
check('Ohne Profil sieht der Wirt nichts', fuerDenWirt(null) === null);

// ---- 5. Widerruf ---------------------------------------------------------

check('Voller Widerruf loescht das Profil', widerrufe(zweiter, 'alles') === null);
const nurGesundheit = widerrufe(zweiter, 'gesundheit');
check('Teilwiderruf nimmt nur die Unvertraeglichkeit',
  nurGesundheit.unvertraeglichkeit === null && nurGesundheit.einwilligungGesundheit === null);
check('Teilwiderruf laesst die Besuche stehen', nurGesundheit.besuche === 2);

// ---- 6. Aufbewahrung -----------------------------------------------------

const profile = [
  { schluessel: 'a', gesehen: '2026-08-01T12:00:00.000Z' },
  { schluessel: 'b', gesehen: '2023-01-01T12:00:00.000Z' }
];
const behalten = raeumeAufProfile(profile, JETZT);
check('Wer laenger nicht da war, faellt weg',
  behalten.length === 1 && behalten[0].schluessel === 'a', JSON.stringify(behalten));
check('Die Frist sind zwei Jahre', PROFIL_TAGE === 730);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Gastprofil-Prüfung OK: Schlüssel, Einwilligung, Besuche, Wirtsicht, Widerruf und Aufbewahrung geprüft (${PROFIL_TAGE} Tage).`);
