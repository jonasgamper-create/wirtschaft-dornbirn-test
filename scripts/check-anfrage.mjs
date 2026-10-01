// Pruefung: Anfragen aus Locations/Agentur und der Hinweis auf der Startseite (01.10.).
import { hinweisAktiv, pruefeAnfrageFormular, pruefeHinweis, raeumeAnfragenAuf } from '../server/src/anfrage.mjs';
import { anfrageAnsHaus, anfrageBestaetigung, brevoPaket } from '../server/src/mail.mjs';

let fehler = 0;
const check = (was, ok) => { if (!ok) { fehler += 1; console.error(`  ✗ ${was}`); } };
const gut = { art: 'feste', name: 'Anna Huber', email: 'Anna@Example.at', telefon: '+43 664 1', betreff: 'Hochzeit · 12. Juni · 80 Gäste',
  zeilen: ['Anlass: Hochzeit', 'Ort: Kulturhaus', ''], einwilligung: true, website: '' };

const g = pruefeAnfrageFormular(gut);
check('Gueltige Anfrage geht durch', g.ok && g.anfrage.email === 'anna@example.at' && g.anfrage.zeilen.length === 2);
check('Fangfeld ausgefuellt = Spam', pruefeAnfrageFormular({ ...gut, website: 'x' }).grund === 'spam');
check('Ohne Einwilligung nicht', pruefeAnfrageFormular({ ...gut, einwilligung: false }).grund === 'einwilligung');
check('Ohne gueltige Mail nicht', pruefeAnfrageFormular({ ...gut, email: 'kaputt' }).grund === 'mail');
check('Unbekannte Art nicht', pruefeAnfrageFormular({ ...gut, art: 'x' }).grund === 'art');
check('Leere Zeilen nicht', pruefeAnfrageFormular({ ...gut, zeilen: [] }).grund === 'leer');
check('Steuerzeichen werden entfernt', pruefeAnfrageFormular({ ...gut, name: 'Anna\u0000 Huber' }).anfrage.name === 'Anna Huber');

const jetzt = Date.parse('2026-10-01T12:00:00Z');
const alt = { zeit: '2026-06-01T10:00:00Z' }; const frisch = { zeit: '2026-09-30T10:00:00Z' };
check('Anfragen aelter als 90 Tage werden geraeumt', raeumeAnfragenAuf([alt, frisch], jetzt).length === 1);

const hausMail = anfrageAnsHaus(g.anfrage);
check('Mail ans Haus nennt Betreff und Gast', hausMail.betreff.includes('Hochzeit') && hausMail.text.includes('anna@example.at'));
check('Mail ans Haus maskiert HTML', !anfrageAnsHaus({ ...g.anfrage, zeilen: ['<script>x</script>'] }).html.includes('<script>x'));
const gast = anfrageBestaetigung(g.anfrage);
check('Bestaetigung an den Gast nennt ihn und seine Angaben', gast.text.includes('Anna Huber') && gast.text.includes('Anlass: Hochzeit'));
const paket = brevoPaket({ absender: 'a@b.at', an: 'haus@b.at', betreff: 'x', html: 'x', text: 'x', antwortAn: { email: 'anna@example.at', name: 'Anna' } });
check('Antworten geht an den Gast (replyTo)', paket.replyTo?.email === 'anna@example.at');
check('Ohne antwortAn kein replyTo', !brevoPaket({ absender: 'a@b.at', an: 'c@d.at', betreff: 'x', html: 'x', text: 'x' }).replyTo);

check('Hinweis: Text gekuerzt auf 90', pruefeHinweis({ text: 'x'.repeat(200) }).hinweis.text.length === 90);
check('Hinweis: leerer Text = entfernen', pruefeHinweis({ text: '  ' }).hinweis === null);
check('Hinweis: falsches Datum abgelehnt', pruefeHinweis({ text: 'a', bis: '24.12.' }).grund === 'bis');
check('Hinweis aktiv bis einschliesslich Enddatum', hinweisAktiv({ text: 'a', bis: '2026-12-24' }, '2026-12-24') && !hinweisAktiv({ text: 'a', bis: '2026-12-24' }, '2026-12-25'));
check('Hinweis ohne Enddatum bleibt', hinweisAktiv({ text: 'a', bis: null }, '2030-01-01'));

if (fehler) { console.error(`Anfrage-Prüfung FEHLGESCHLAGEN: ${fehler} Punkt(e).`); process.exit(1); }
console.log('Anfrage-Prüfung OK: Formulareingaben, Fangfeld, Einwilligung, Aufräumen, beide Mails, Antwortadresse und Hinweis geprüft.');
