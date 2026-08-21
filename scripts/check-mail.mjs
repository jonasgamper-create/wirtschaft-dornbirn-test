// Goldene Testfaelle fuer Mailversand, Kalenderabsage und Einwilligung.
// Laeuft in Node, ohne Netz und ohne Brevo: es wird nie eine Mail verschickt.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pruefeKontakt } from '../server/src/kontakt.mjs';
import {
  OFFEN_TAGE, WORTLAUT, bestaetige, empfaenger, machEintrag, pruefeAnmeldung,
  raeumeAufOffene, sperrschluessel
} from '../server/src/newsletter.mjs';
import { absage, baueTermin, bestaetigung, brevoPaket, newsletterFrage } from '../server/src/mail.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const check = (name, bedingung, detail = '') => {
  if (bedingung) return;
  errors.push(`Mail: ${name}${detail ? ` - ${detail}` : ''}`);
};

// ---- 1. Erreichbarkeit ----------------------------------------------------

check('Mail allein genuegt', pruefeKontakt({ email: 'gast@beispiel.at' }).ok);
check('Telefon allein genuegt', pruefeKontakt({ telefon: '+43 660 1234567' }).ok);
check('Beides geht auch', pruefeKontakt({ email: 'a@b.at', telefon: '05572 20540' }).ok);
check('Ohne beides faellt raus', pruefeKontakt({}).grund === 'kontakt');
check('Leerzeichen sind kein Kontakt', pruefeKontakt({ email: '  ', telefon: ' ' }).grund === 'kontakt');
check('Kaputte Mail faellt raus', pruefeKontakt({ email: 'gast@' }).grund === 'mail');
check('Zu kurze Nummer faellt raus', pruefeKontakt({ telefon: '12345' }).grund === 'telefon');
check('Buchstaben sind keine Nummer', pruefeKontakt({ telefon: 'ruf mich an' }).grund === 'telefon');
check('Mail wird kleingeschrieben', pruefeKontakt({ email: 'Gast@Beispiel.AT' }).kontakt.email === 'gast@beispiel.at');
check('Fehlendes Feld wird null',
  pruefeKontakt({ email: 'a@b.at' }).kontakt.telefon === null);

// ---- 2. Kalender: Bestaetigung und Absage --------------------------------

const jetzt = '20260818T100000Z';
const gemeinsam = {
  uid: 'o-abc-001@wirtschaft-dornbirn.at',
  jetzt, name: 'Huber', tag: '2026-08-20', zeit: '12:00', gaeste: 4, absender: 'post@beispiel.at'
};
const termin = baueTermin({ ...gemeinsam, sequenz: 0, methode: 'REQUEST', tisch: '3', etage: 'Gaststube' });
const zurueck = baueTermin({ ...gemeinsam, sequenz: 1, methode: 'CANCEL', grund: 'Heute kein Mittag' });

check('Termin ist ein Kalender', termin.startsWith('BEGIN:VCALENDAR\r\n') && termin.endsWith('END:VCALENDAR\r\n'));
check('Termin wird angefragt', termin.includes('METHOD:REQUEST') && termin.includes('STATUS:CONFIRMED'));
check('Absage zieht zurueck', zurueck.includes('METHOD:CANCEL') && zurueck.includes('STATUS:CANCELLED'));
// Der Kern: ohne dieselbe Kennung findet der Kalender den Termin nicht wieder.
check('Absage trifft denselben Termin', zurueck.includes(`UID:${gemeinsam.uid}`));
check('Absage zaehlt hoeher',
  Number(/SEQUENCE:(\d+)/.exec(zurueck)[1]) > Number(/SEQUENCE:(\d+)/.exec(termin)[1]));
check('Absage erinnert nicht mehr', !zurueck.includes('BEGIN:VALARM'));
check('Bestaetigung erinnert', termin.includes('TRIGGER:-PT1H'));
check('Zeilen bleiben in der Norm',
  termin.split('\r\n').every(zeile => zeile.length <= 75),
  termin.split('\r\n').find(zeile => zeile.length > 75));
check('Absagegrund steht drin', zurueck.includes('Heute kein Mittag'));
check('Organisator ist gesetzt', termin.includes('ORGANIZER'));

// ---- 3. Die Mails selbst -------------------------------------------------

const bestaetigt = bestaetigung({
  name: 'Huber & Söhne', tag: '2026-08-20', zeit: '12:00', gaeste: 4, tisch: '3', etage: 'Gaststube',
  absageLink: 'https://dienst.example/absage?t=abc'
});
check('Bestaetigung nennt den Tag', bestaetigt.betreff.includes('20. August'));
check('Bestaetigung hat einen Absageweg', bestaetigt.html.includes('https://dienst.example/absage?t=abc'));
check('Bestaetigung hat auch Text ohne HTML', bestaetigt.text.includes('Huber & Söhne'));
check('Zeichen werden im HTML geschuetzt',
  bestaetigt.html.includes('Huber &amp; Söhne') && !bestaetigt.html.includes('Huber & Söhne'));

const abgesagt = absage({ name: 'Huber', tag: '2026-08-20', zeit: '12:00', gaeste: 4, grund: 'Krankheit', vomHaus: true });
check('Hausabsage nennt den Grund', abgesagt.html.includes('Krankheit') && abgesagt.text.includes('Krankheit'));
check('Hausabsage klingt nicht nach Gastabsage', abgesagt.betreff.startsWith('Leider abgesagt'));

const frage = newsletterFrage({ jaLink: 'https://dienst.example/newsletter/ja?t=abc', wortlaut: WORTLAUT });
check('Bestaetigungsmail fragt nur nach', frage.html.includes('newsletter/ja?t=abc'));
// Eine Bestaetigungsmail darf keine Werbung sein - sonst ist sie selbst schon
// die Zusendung, fuer die noch keine Einwilligung vorliegt.
check('Bestaetigungsmail wirbt nicht',
  !/mittagskarte der woche|jetzt reservieren|angebot/i.test(frage.html));

// ---- 4. Das Paket an Brevo -----------------------------------------------

const paket = brevoPaket({
  absender: 'post@beispiel.at', an: 'gast@beispiel.at', anName: 'Huber',
  betreff: bestaetigt.betreff, html: bestaetigt.html, text: bestaetigt.text,
  anhang: { name: 'termin.ics', inhalt: termin }
});
check('Paket hat einen Absender', paket.sender?.email === 'post@beispiel.at');
check('Paket hat genau einen Empfaenger', paket.to.length === 1 && paket.to[0].email === 'gast@beispiel.at');
check('Anhang ist Base64', /^[A-Za-z0-9+/=]+$/.test(paket.attachment[0].content));
check('Anhang ist der Termin',
  Buffer.from(paket.attachment[0].content, 'base64').toString('utf8') === termin);
// Ein Schluessel im Paket waere ein Schluessel in jedem Protokoll.
check('Kein Schluessel im Paket', !JSON.stringify(paket).toLowerCase().includes('api-key'));

// ---- 5. Einwilligung -----------------------------------------------------

check('Anmeldung braucht eine Mail', pruefeAnmeldung({ einwilligung: true }).grund === 'mail');
// Ohne ausdrueckliches Ja ist es keine Einwilligung.
check('Anmeldung braucht ein Ja', pruefeAnmeldung({ email: 'a@b.at' }).grund === 'einwilligung');
check('Ein "ja" als Text zaehlt nicht',
  pruefeAnmeldung({ email: 'a@b.at', einwilligung: 'ja' }).grund === 'einwilligung');
check('Gueltige Anmeldung geht durch', pruefeAnmeldung({ email: 'A@B.at', einwilligung: true }).ok);

const eintrag = machEintrag({ email: 'a@b.at', quelle: 'reservierung', token: 'tok', jetzt: '2026-08-18T10:00:00.000Z' });
check('Neu ist offen, nicht bestaetigt', eintrag.status === 'offen' && eintrag.bestaetigtAm === null);
check('Wortlaut wird mitgespeichert', eintrag.wortlaut === WORTLAUT && Boolean(eintrag.wortlautVersion));
check('Offene bekommen nichts', empfaenger([eintrag]).length === 0);

const ja = bestaetige(eintrag, '2026-08-18T10:05:00.000Z');
check('Bestaetigung setzt den Status', ja.eintrag.status === 'bestaetigt');
check('Bestaetigung haelt den Zeitpunkt fest', ja.eintrag.bestaetigtAm === '2026-08-18T10:05:00.000Z');
check('Bestaetigte bekommen die Karte', empfaenger([ja.eintrag])[0] === 'a@b.at');

const spaeter = '2026-10-01T10:00:00.000Z';
check('Unbestaetigtes verfaellt', raeumeAufOffene([eintrag], spaeter).length === 0);
check('Bestaetigtes bleibt', raeumeAufOffene([ja.eintrag], spaeter).length === 1);
check('Frist ist gesetzt', OFFEN_TAGE === 30);

const abdruck = await sperrschluessel('A@B.at');
check('Sperre ist ein Fingerabdruck', /^[0-9a-f]{64}$/.test(abdruck));
check('Gross und klein sperrt gleich', abdruck === await sperrschluessel('a@b.at'));
check('Sperre enthaelt die Adresse nicht', !abdruck.includes('a@b'));

// ---- 6. Trennung im Dienst -----------------------------------------------

const dienst = await readFile(path.join(root, 'server/src/index.js'), 'utf8');
// Der Kern der DSGVO-Zusage: eigener Speicher, eigener Loeschweg.
check('Newsletter hat eine eigene Tabelle', /CREATE TABLE IF NOT EXISTS newsletter/.test(dienst));
check('Sperrliste hat eine eigene Tabelle', /CREATE TABLE IF NOT EXISTS sperrliste/.test(dienst));
check('Der Token verlaesst den Dienst nicht', /const ohneGeheimnis/.test(dienst));
// Der Bildschirm im Eingang haengt am selben Draht wie das Cockpit - aber
// nicht an denselben Daten.
check('Der Schirm bekommt keine Kontaktdaten',
  /rolle === 'schirm'/.test(dienst) && /const \{ kontakt, gastSchluessel, \.\.\.rest \} = party/.test(dienst));
// Und erst recht kein Gastprofil: "4. Besuch, glutenfrei" neben einem Namen
// waere auf einem Schirm, auf den jeder Gast schaut, ein Aushang ueber
// Menschen, die dem nie zugestimmt haben.
// Die Kueche steht offen im Betrieb. Sie braucht die Bestellungen und sonst
// nichts - nicht einmal die Telefonnummer, denn die SMS verschickt der
// Dienst. Live geprueft: die Rolle liefert weder Reservierungen noch
// Kontaktdaten.
check('Die Kueche ist eine eigene Rolle', /rolle === 'kueche'/.test(dienst));
// Die Telefonnummer muss weg - welche Felder sonst noch wegfallen, ist dem
// Test egal. Frueher stand hier das genaue Muster der Zerlegung; das brach,
// sobald ein zweites Feld dazukam, obwohl die Sache selbst in Ordnung war.
check('Die Kueche bekommt keine Telefonnummer',
  /takeaway: this\.#takeawayAlle\(\)\.map\(\(\{[^}]*\btelefon\b[^}]*\.\.\.rest \}\) => rest\)/.test(dienst));
// Die Push-Anmeldung ist eine Geraetekennung des Gastes. Sie geht an keinen
// Bildschirm im Haus - weder in die Kueche noch zum Wirt.
check('Kein Bildschirm im Haus bekommt die Push-Anmeldung',
  /\.map\(\(\{[^}]*\bpush\b[^}]*\.\.\.rest \}\) => rest\)/.test(dienst)
  && !/takeaway: this\.#takeawayAlle\(\),/.test(dienst));
check('Die Kueche bekommt keine Reservierungen',
  !/rolle === 'kueche'[\s\S]{0,400}parties:/.test(dienst));

check('Der Schirm bekommt kein Gastprofil',
  /CREATE TABLE IF NOT EXISTS gastprofile/.test(dienst)
  && /gastSchluessel \? fuerDenWirt/.test(dienst));
const schirm = await readFile(path.join(root, 'site/screen.js'), 'utf8');
check('Der Schirm meldet sich als Schirm an', /'schirm'\)/.test(schirm));
check('Absage und Einwilligung brauchen ein Formular',
  /request\.method !== 'POST'\) return json\(\{ ok: false \}, 405/.test(dienst));

const wrangler = await readFile(path.join(root, 'server/wrangler.jsonc'), 'utf8');
// Ein Schluessel in einer versionierten Datei ist ein oeffentlicher Schluessel.
check('Kein Brevo-Schluessel in der Konfiguration',
  !/BREVO_KEY"\s*:/.test(wrangler) && !/xkeysib-/i.test(wrangler));

const seite = await readFile(path.join(root, 'site/tischreservierung.html'), 'utf8');
check('Die Seite fragt nach einer Erreichbarkeit', /id="guestMail"/.test(seite) && /id="guestPhone"/.test(seite));
check('Das Haekchen ist nicht vorausgefuellt',
  /id="guestNewsletter"[^>]*>/.test(seite) && !/id="guestNewsletter"[^>]*checked/.test(seite));

for (const datei of ['site/tischreservierung.html', 'site/tischreservierung-buchung.js', 'site/haus-api.js']) {
  const inhalt = await readFile(path.join(root, datei), 'utf8');
  check(`Kein Brevo-Zugang in ${datei}`, !/xkeysib-|api\.brevo\.com/i.test(inhalt));
}

// ---- Terminhinweise in der Bestaetigung -----------------------------------
// Direktwerbung an Bestandskunden ist nach § 174 Abs 4 TKG nur zulaessig,
// wenn sie jederzeit ablehnbar ist. Ohne Widerspruchslink darf der Block
// deshalb gar nicht erst mitgehen - das ist keine Formsache, sondern die
// Bedingung, unter der er ueberhaupt stehen darf.

const termine = [
  { datum: '03.09.', titel: 'Genussroute 6850', url: 'https://wirtschaft-dornbirn.at/event/genussroute-2026/' },
  { datum: '22.09.', titel: 'Helden reisen', url: 'https://wirtschaft-dornbirn.at/event/comedynacht-05-2026/' }
];
const basis = { name: 'Huber', tag: '2026-08-24', zeit: '12:00', gaeste: 2, tisch: '4', etage: null, absageLink: 'https://x.at/absage?t=abc' };

const ohneLink = bestaetigung({ ...basis, events: termine, widerspruchLink: '' });
check('Ohne Widerspruchslink kein Terminblock',
  !ohneLink.html.includes('Nächste Abende') && !ohneLink.text.includes('Nächste Abende'));

const ohneTermine = bestaetigung({ ...basis, events: [], widerspruchLink: 'https://x.at/termine/aus?t=abc' });
check('Ohne Termine kein leerer Block', !ohneTermine.html.includes('Nächste Abende'));

const mitTerminen = bestaetigung({ ...basis, events: termine, widerspruchLink: 'https://x.at/termine/aus?t=abc' });
check('Mit beidem steht der Block da', mitTerminen.html.includes('Nächste Abende'));
check('Die Termine stehen drin', mitTerminen.html.includes('Genussroute 6850'));
check('Der Widerspruchslink steht drin', mitTerminen.html.includes('termine/aus?t=abc'));
check('Auch die Textfassung traegt den Widerspruch', mitTerminen.text.includes('termine/aus?t=abc'));
check('Die Bestaetigung selbst bleibt vollstaendig',
  mitTerminen.html.includes('absage?t=abc') && mitTerminen.text.includes('Huber'));
// Hoechstens drei - eine Bestaetigung ist kein Programmheft.
const viele = bestaetigung({
  ...basis,
  events: [...termine, ...termine, ...termine],
  widerspruchLink: 'https://x.at/termine/aus?t=abc'
});
check('Hoechstens drei Termine', (viele.html.match(/Genussroute 6850/g) || []).length <= 2,
  String((viele.html.match(/Genussroute 6850/g) || []).length));

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Mail-Prüfung OK: Kontakt, Kalenderabsage, Brevo-Paket, Einwilligung, Terminhinweise und Trennung geprüft.');
