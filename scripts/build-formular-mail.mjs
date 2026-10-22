// Ausfüllbares PDF-Formular "Mailadressen - Entscheidungsblatt" fuer das Haus.
// Hannah und Wolfgang fuellen es am Handy aus (Ankreuzfelder, Textfelder),
// schicken es zurueck, und der Programmierer traegt die Adressen in den
// Dienst ein (WIRT_MAIL, ANFRAGE_MAIL, BREVO_ABSENDER) und bei Brevo/Hetzner.
//
//   node scripts/build-formular-mail.mjs [docs/pdf/Mailadressen-Entscheidungsblatt-wirtschaft.pdf]
//
// Bewusst ohne Chrome: Chrome druckt keine Formularfelder. pdf-lib baut
// echte AcroForm-Felder, die Vorschau (iPhone/Mac), Acrobat und die meisten
// Android-Leser ausfuellen und speichern koennen.
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, StandardFonts, rgb, PDFName, PDFBool } from 'pdf-lib';

const ziel = process.argv[2] || path.join('docs', 'pdf', 'Mailadressen-Entscheidungsblatt-wirtschaft.pdf');

// Wirtschaft-CI (site/styles.css)
const hex = (h) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const INK = hex('#11110f'), PAPER = hex('#f3efe6'), CREAM = hex('#ead9bc'), WINE = hex('#8c292b'), GOLD = hex('#c59b5d'), GREEN = hex('#244635');
const WEISS = rgb(1, 1, 1);

const A4 = [595.28, 841.89];
const RAND = 46;
const BREITE = A4[0] - 2 * RAND;

const doc = await PDFDocument.create();
doc.setTitle('Mailadressen - Entscheidungsblatt - wirtschaft Dornbirn');
doc.setLanguage('de-AT');
const schrift = await doc.embedFont(StandardFonts.Helvetica);
const fett = await doc.embedFont(StandardFonts.HelveticaBold);
const form = doc.getForm();
// Leser ohne eigene Darstellung sollen die Felder selbst zeichnen.
form.acroForm.dict.set(PDFName.of('NeedAppearances'), PDFBool.True);

// Der Quelltext ist bewusst ASCII; beim Zeichnen werden ae/oe/ue (nach
// Konsonant oder am Wortanfang) und bekannte ss-Woerter in Umlaute gewandelt.
const SS = { geaendert: 'geändert', muessen: 'müssen', Preuss: 'Preuß', weiss: 'weiß', laesst: 'lässt', Fuss: 'Fuß', schliesst: 'schließt', gross: 'groß' };
function u(t) {
  let a = String(t);
  for (const [k, v] of Object.entries(SS)) a = a.replaceAll(k, v);
  return a
    .replace(/(^|[^aeiouAEIOU])ae/g, '$1ä').replace(/(^|[^aeiouAEIOU])oe/g, '$1ö').replace(/(^|[^aeiouAEIOUq])ue/g, '$1ü')
    .replace(/(^|[^aeiouAEIOU])Ae/g, '$1Ä').replace(/(^|[^aeiouAEIOU])Oe/g, '$1Ö').replace(/(^|[^aeiouAEIOU])Ue/g, '$1Ü');
}

let seite, y, seitenZahl = 0;

function neueSeite() {
  seite = doc.addPage(A4);
  seitenZahl += 1;
  seite.drawRectangle({ x: 0, y: 0, width: A4[0], height: A4[1], color: PAPER });
  // Kopfzeile
  seite.drawRectangle({ x: 0, y: A4[1] - 34, width: A4[0], height: 34, color: INK });
  seite.drawText('die "wirtschaft" dornbirn  ·  mailadressen - entscheidungsblatt', { x: RAND, y: A4[1] - 22, size: 9, font: schrift, color: CREAM });
  seite.drawText(`seite ${seitenZahl}`, { x: A4[0] - RAND - 36, y: A4[1] - 22, size: 9, font: schrift, color: GOLD });
  // Fusszeile
  seite.drawText(u('ausgefuellt zurueck an jonas - danach traegt der programmierer alles ein. stand 11. oktober 2026.'), { x: RAND, y: 22, size: 7.5, font: schrift, color: GREEN });
  y = A4[1] - 34 - 36;
}

function platz(hoehe) { if (y - hoehe < 40) neueSeite(); }

// Zeilenumbruch fuer Fliesstext
function zeilen(text, font, groesse, breite) {
  const woerter = u(text).split(/\s+/);
  const aus = []; let zeile = '';
  for (const w of woerter) {
    const probe = zeile ? `${zeile} ${w}` : w;
    if (font.widthOfTextAtSize(probe, groesse) > breite && zeile) { aus.push(zeile); zeile = w; } else zeile = probe;
  }
  if (zeile) aus.push(zeile);
  return aus;
}

function absatz(text, { groesse = 9.5, font = schrift, farbe = INK, einzug = 0, abstand = 6 } = {}) {
  const z = zeilen(text, font, groesse, BREITE - einzug);
  platz(z.length * (groesse + 3) + abstand);
  for (const t of z) { seite.drawText(t, { x: RAND + einzug, y, size: groesse, font, color: farbe }); y -= groesse + 3; }
  y -= abstand;
}

function titel(text) {
  platz(40);
  seite.drawText(u(text), { x: RAND, y, size: 20, font: fett, color: INK });
  y -= 30;
}

function abschnitt(nummer, text) {
  platz(44);
  y -= 6;
  seite.drawRectangle({ x: RAND, y: y - 6, width: BREITE, height: 24, color: CREAM });
  if (nummer) seite.drawText(`${nummer}`, { x: RAND + 8, y: y + 1, size: 12, font: fett, color: WINE });
  seite.drawText(u(text), { x: RAND + (nummer ? 30 : 8), y: y + 1, size: 12, font: fett, color: INK });
  y -= 30;
}

let nr = 0;
// Frage mit Erklaerung (warum), Anleitung (was eintragen) und Beispiel.
function frage(text, warum, beispiel) {
  nr += 1;
  const z = zeilen(`${nr}.  ${text}`, fett, 10.5, BREITE);
  const w = warum ? zeilen(warum, schrift, 9, BREITE - 16) : [];
  const b = beispiel ? zeilen(`Beispiel: ${beispiel}`, schrift, 8.5, BREITE - 16) : [];
  platz(z.length * 14 + w.length * 11.5 + b.length * 11 + 10);
  for (const t of z) { seite.drawText(t, { x: RAND, y, size: 10.5, font: fett, color: INK }); y -= 14; }
  for (const t of w) { seite.drawText(t, { x: RAND + 16, y, size: 9, font: schrift, color: INK }); y -= 11.5; }
  for (const t of b) { seite.drawText(t, { x: RAND + 16, y, size: 8.5, font: schrift, color: GREEN }); y -= 11; }
  y -= 4;
}

// Begriff: fett links, Erklaerung rechts
function begriff(wort, text) {
  const z = zeilen(text, schrift, 9, BREITE - 110);
  platz(z.length * 11.5 + 6);
  seite.drawText(u(wort), { x: RAND, y, size: 9, font: fett, color: WINE });
  let yy = y;
  for (const t of z) { seite.drawText(t, { x: RAND + 110, y: yy, size: 9, font: schrift, color: INK }); yy -= 11.5; }
  y -= z.length * 11.5 + 5;
}

function schritt(n, text) {
  const z = zeilen(text, schrift, 9.5, BREITE - 22);
  platz(z.length * 12 + 4);
  seite.drawText(`${n}.`, { x: RAND, y, size: 9.5, font: fett, color: WINE });
  let yy = y;
  for (const t of z) { seite.drawText(t, { x: RAND + 20, y: yy, size: 9.5, font: schrift, color: INK }); yy -= 12; }
  y -= z.length * 12 + 4;
}

const feldStil = { borderColor: GOLD, backgroundColor: WEISS, textColor: INK, borderWidth: 1 };

function textfeld(name, beschriftung, { hoehe = 24, breite = BREITE, mehrzeilig = false, vorgabe = '' } = {}) {
  platz(hoehe + 16);
  if (beschriftung) { seite.drawText(u(beschriftung), { x: RAND, y, size: 8.5, font: schrift, color: INK }); y -= 12; }
  const f = form.createTextField(name);
  if (vorgabe) f.setText(u(vorgabe));
  if (mehrzeilig) f.enableMultiline();
  f.addToPage(seite, { x: RAND, y: y - hoehe + 10, width: breite, height: hoehe, ...feldStil });
  f.setFontSize(10);
  y -= hoehe + 2;
}

// Auswahl: eine Option je Zeile, optional mit Textfeld "andere: ..."
function auswahl(name, optionen) {
  const gruppe = form.createRadioGroup(name);
  for (const o of optionen) {
    const z = zeilen(o.text, schrift, 9.5, BREITE - 26 - (o.feld ? 170 : 0));
    const h = Math.max(16, z.length * 12);
    platz(h + 4);
    gruppe.addOptionToPage(o.wert, seite, { x: RAND + 2, y: y - 4, width: 12, height: 12, borderColor: GOLD, backgroundColor: WEISS, borderWidth: 1 });
    let yy = y;
    for (const t of z) { seite.drawText(t, { x: RAND + 22, y: yy, size: 9.5, font: schrift, color: INK }); yy -= 12; }
    if (/\(Empfehlung/.test(o.text)) gruppe.select(o.wert);
    if (o.feld) {
      const f = form.createTextField(`${name}_${o.wert}`);
      f.addToPage(seite, { x: A4[0] - RAND - 165, y: y - 7, width: 165, height: 18, ...feldStil });
      f.setFontSize(9);
    }
    y -= h + 4;
  }
  y -= 4;
}

function haken(name, text) {
  const z = zeilen(text, schrift, 9.5, BREITE - 26);
  const h = Math.max(16, z.length * 12);
  platz(h + 4);
  const k = form.createCheckBox(name);
  k.addToPage(seite, { x: RAND + 2, y: y - 4, width: 12, height: 12, borderColor: GOLD, backgroundColor: WEISS, borderWidth: 1 });
  let yy = y;
  for (const t of z) { seite.drawText(t, { x: RAND + 22, y: yy, size: 9.5, font: schrift, color: INK }); yy -= 12; }
  y -= h + 4;
}

function hinweis(text) {
  const z = zeilen(text, schrift, 8.5, BREITE - 20);
  platz(z.length * 11 + 14);
  seite.drawRectangle({ x: RAND, y: y - z.length * 11 + 4, width: 3, height: z.length * 11 + 4, color: WINE });
  for (const t of z) { seite.drawText(t, { x: RAND + 12, y, size: 8.5, font: schrift, color: INK }); y -= 11; }
  y -= 8;
}

// ---------------------------------------------------------------- Seite 1: Bevor ihr anfangt
neueSeite();
titel('Mailadressen - was wohin geht');
absatz('Liebe Hannah, lieber Wolfgang, dieses Blatt kommt von Jonas. Es ist der erste und wichtigste Schritt, bevor die neue Webseite ganz in eure Haende uebergeht. Es geht nur um eine Frage: Welche Mailadresse soll wofuer gelten? Sobald das feststeht, tragen wir es ein - und ab dann kommen Reservierungen, Takeaway-Bestellungen, Anfragen und die Post der Anbieter dort an, wo ihr sie haben wollt. Ihr muesst nichts kaufen, nichts anmelden und nichts installieren.', { groesse: 10 });

abschnitt('', 'Worum es geht - in fuenf Saetzen');
absatz('Die neue Webseite macht vieles von selbst: Sie nimmt Reservierungen fuer den Mittagstisch an, Takeaway-Bestellungen, Wartelisten fuer ausverkaufte Abende und Anfragen fuer Feste und die Agentur. Zu jedem dieser Vorgaenge schickt sie dem Gast sofort eine Bestaetigung per Mail - und euch eine Nachricht. Jede dieser Mails braucht eine Absenderadresse (die der Gast sieht) und eine Empfaengeradresse (wo sie bei euch ankommt). Heute stehen an diesen Stellen noch Adressen von Jonas, weil er die Seite gebaut und getestet hat. Mit diesem Blatt legt ihr fest, welche Adressen des Hauses dort stehen sollen.', { groesse: 9.5 });

abschnitt('', 'Was ihr schon habt - und warum hier "Hetzner" steht');
absatz('Ihr habt bereits eine Domain: wirtschaft-dornbirn.at. Das ist eure Adresse im Internet, und sie gehoert bereits zum Haus - es muss keine neue angemeldet werden. Jonas hat am 1. Oktober 2026 nachgesehen, wie diese Domain eingerichtet ist. Das geht oeffentlich, ohne Zugangsdaten, so wie man im Telefonbuch nachschlagen kann. Dabei kam heraus:', { groesse: 9.5 });
absatz('- Die Verwaltung eurer Domain liegt bei der Firma Hetzner (ein grosser deutscher Anbieter fuer Internetadressen, Server und Postfaecher). Die sogenannten Nameserver heissen hydrogen.ns.hetzner.com, oxygen.ns.hetzner.com und helium.ns.hetzner.de.', { groesse: 9.5, einzug: 10 });
absatz('- Eure bisherige Webseite (WordPress) und euer Mailserver (mail.wirtschaft-dornbirn.at) laufen auf demselben Hetzner-Server.', { groesse: 9.5, einzug: 10 });
absatz('- Das Postfach willkommen@wirtschaft-dornbirn.at gibt es also sehr wahrscheinlich bei Hetzner.', { groesse: 9.5, einzug: 10 });
absatz('Wer eure Webseite vor Jahren gebaut hat, hat das damals bei Hetzner eingerichtet - vielleicht in eurem Namen, vielleicht im Namen einer Agentur. Deshalb fragt dieses Blatt, wer sich dort anmelden kann und wer auf der Rechnung steht. Wenn euch "Hetzner" nichts sagt: Das ist in Ordnung und genau der Grund fuer die Fragen 2, 3, 13 und 14. "Weiss ich nicht" ist eine gute Antwort - dann sucht Jonas mit euch weiter.', { groesse: 9.5 });

abschnitt('', 'Die Begriffe, die vorkommen');
begriff('Domain', 'Eure Adresse im Internet: wirtschaft-dornbirn.at. Sie gehoert dem, der auf der Rechnung steht, und wird jaehrlich bezahlt (etwa 15 bis 30 Euro). Alle Mailadressen @wirtschaft-dornbirn.at haengen an ihr.');
begriff('Registrar', 'Die Firma, bei der die Domain gekauft wurde und jaehrlich bezahlt wird. Bei euch vermutlich Hetzner. Steht auf der Rechnung.');
begriff('Postfach', 'Eine Mailadresse, in der Mails wirklich ankommen und gelesen werden, z. B. willkommen@wirtschaft-dornbirn.at. Postfaecher werden beim Mailanbieter angelegt - bei euch vermutlich Hetzner.');
begriff('Weiterleitung', 'Eine Mailadresse ohne eigenes Postfach, die alles an eine andere Adresse weiterreicht. Reicht fuer z. B. web@, wenn Hannah das in ihrem Postfach lesen soll.');
begriff('Hetzner', 'Der Anbieter, bei dem eure Domain, eure Postfaecher und die alte Webseite liegen (siehe oben). Hat eine Verwaltungsoberflaeche (konsoleH), in der man Postfaecher anlegt. Jemand hat dafuer Zugangsdaten.');
begriff('Brevo', 'Der Dienst, der die automatischen Mails der neuen Webseite verschickt (Bestaetigungen an Gaeste). Kostenlos bis 300 Mails am Tag. Damit er in eurem Namen senden darf, muessen vier kleine Eintraege bei eurer Domain gemacht werden - das macht der Programmierer, dafuer braucht er Zugang zu Hetzner.');
begriff('Der Dienst', 'Das Programm hinter der Webseite, das Reservierungen, Bestellungen und Wartelisten verwaltet. Ihr bedient es ueber die Wirt-Ansicht am Handy.');
begriff('Programmierer', 'Die Person, die die Webseite kuenftig technisch betreut. Jonas uebergibt an sie. Kann auch vorerst Jonas bleiben.');

abschnitt('', 'So fuellt ihr das Blatt aus');
schritt(1, 'Am Handy: Die PDF-Datei aus der Mail oeffnen. Am iPhone geht das direkt in der Vorschau oder in der App "Dateien"; am Android-Handy in "Google Drive" oder "Adobe Acrobat Reader" (kostenlos). Am Computer: in Vorschau (Mac) oder Acrobat Reader (Windows).');
schritt(2, 'Auf einen Kreis tippen, um ihn anzukreuzen. Bei vielen Fragen ist unsere Empfehlung schon angekreuzt - wenn ihr einverstanden seid, muesst ihr nichts tun. Wollt ihr etwas anderes, tippt den anderen Kreis an.');
schritt(3, 'Auf ein weisses Feld tippen, dann erscheint die Tastatur. Eintragen, fertig.');
schritt(4, 'Am Ende Frage 18 mit eurem Namen ausfuellen. Dann speichern (das Handy fragt meist von selbst) und die Datei per Mail oder WhatsApp an Jonas zurueckschicken: ueber "Teilen" bzw. den Pfeil nach oben.');
schritt(5, 'Wenn eine Frage unklar ist: "weiss ich nicht" ankreuzen oder leer lassen. Lieber eine ehrliche Luecke als eine geratene Adresse.');
hinweis('Die wichtigste Regel: Jede Adresse, die ihr eintragt, muss ein echtes Postfach sein, das jemand regelmaessig liest. Eine Adresse, die niemand liest, ist schlimmer als keine - der Gast glaubt dann, er wurde gehoert.');

// ---------------------------------------------------------------- Fragen
y -= 6;
textfeld('ausgefuellt_von', 'Ausgefuellt von (Name)', { breite: 240 });
y += 26; // Datum daneben
{
  const f = form.createTextField('datum');
  seite.drawText('Datum', { x: RAND + 260, y: y + 12, size: 8.5, font: schrift, color: INK });
  f.addToPage(seite, { x: RAND + 260, y: y - 14, width: 160, height: 24, ...feldStil });
  f.setFontSize(10);
  y -= 30;
}

abschnitt('A', 'Was es heute gibt');
frage('Welche Mailadressen @wirtschaft-dornbirn.at gibt es heute, und wer liest sie?',
  'Wir kennen nur willkommen@wirtschaft-dornbirn.at, weil sie auf eurer alten Webseite steht. Vielleicht gibt es weitere (eine fuer Wolfgang, eine fuer die Kueche, eine alte der Agentur). Bitte alle eintragen, die ihr kennt - auch solche, die niemand mehr liest. So wissen wir, was wir weiterverwenden koennen und was aufgeraeumt gehoert.',
  'willkommen@wirtschaft-dornbirn.at - Service und Buero - taeglich / wolfgang@wirtschaft-dornbirn.at - Wolfgang - wenn Zeit ist');
textfeld('A1_postfaecher', 'Je Zeile eine Adresse: Adresse - wer liest sie - wie oft', { hoehe: 60, mehrzeilig: true, vorgabe: 'willkommen@wirtschaft-dornbirn.at - ' });
frage('Wo werden diese Mailadressen verwaltet?',
  'Dort muessen spaeter neue Adressen angelegt und eine automatische Antwort eingestellt werden. Nach allem, was oeffentlich sichtbar ist, liegt euer Mailserver bei Hetzner (siehe Seite 1). Falls ihr Mails ueber ein anderes Programm oder einen anderen Anbieter abruft, hier eintragen. "Weiss ich nicht" ist in Ordnung.',
  'Wenn ihr Mails im Browser unter webmail.wirtschaft-dornbirn.at lest, ist es Hetzner.');
auswahl('A2_mailanbieter', [
  { wert: 'hetzner', text: 'bei Hetzner - vermutlich, so wie Jonas es aus der Domain abgelesen hat' },
  { wert: 'andere', text: 'bei einem anderen Anbieter (z. B. Google, GMX, A1), naemlich:', feld: true },
  { wert: 'unbekannt', text: 'weiss ich nicht - Jonas soll mit uns nachsehen' }
]);
frage('Wer kann sich heute bei Hetzner anmelden - also Postfaecher anlegen und die Domain verwalten?',
  'Diese Zugangsdaten sind der Schluessel zu eurer Domain und zu allen Postfaechern. Ohne sie kann niemand ein Postfach web@ anlegen, keine Eintraege fuer Brevo machen und die Webseite nicht auf wirtschaft-dornbirn.at umziehen. Oft liegen sie bei der Agentur, die die alte Seite gebaut hat, oder in einer alten Mail. Bitte nachforschen - das ist der Punkt, der am laengsten dauern kann.',
  '"Wolfgang hat die Zugangsdaten in einer Mail von 2019 von der Agentur XY" oder "wissen wir nicht - die Agentur war Firma XY, Kontakt: ..."');
textfeld('A3_hetzner_zugang', 'Wer hat die Zugangsdaten - oder: wer koennte sie haben (Name, Firma, Kontakt)', { hoehe: 46, mehrzeilig: true });

abschnitt('B', 'Die Entscheidungen - welche Adresse wofuer');
absatz('Jede der folgenden Fragen steht fuer eine Stelle im System, an der eine Mailadresse eingetragen wird. Was dort steht, bekommt die Post. Unsere Empfehlung ist schon angekreuzt; ihr muesst nur aendern, was anders sein soll.', { groesse: 9 });

frage('Absender aller automatischen Mails an Gaeste',
  'Wenn ein Gast reserviert, bestellt oder sich auf die Warteliste setzt, bekommt er sofort eine Bestaetigung. Darin steht als Absender "Wirtschaft Dornbirn" mit dieser Adresse. Antwortet der Gast auf die Bestaetigung ("kann ich auf 18 Uhr aendern?"), landet seine Antwort hier. Die Adresse muss auf @wirtschaft-dornbirn.at enden - mit einer fremden Adresse (gmx, aon, gmail) landen die Mails bei den Gaesten im Spam. Genau das passiert heute noch mit der Testadresse von Jonas.',
  'Gast sieht: "Wirtschaft Dornbirn <willkommen@wirtschaft-dornbirn.at>"');
auswahl('B1_absender', [
  { wert: 'willkommen', text: 'willkommen@wirtschaft-dornbirn.at  (Empfehlung)' },
  { wert: 'andere', text: 'eine andere Adresse @wirtschaft-dornbirn.at:', feld: true }
]);

frage('Wohin sollen Anfragen fuer Feste, Catering (Seite "Locations") und fuer die Agentur gehen?',
  'Wer auf der Webseite das Anfrageformular ausfuellt, loest zwei Mails aus: Der Gast bekommt eine Bestaetigung, und ihr bekommt die Anfrage mit allen Angaben (Datum, Personen, Wunsch). Auf eure Mail koennt ihr einfach "Antworten" druecken - die Antwort geht direkt an den Gast. Es sollte eine Adresse sein, die die Person liest, die Feste plant.',
  'Betreff bei euch: "Anfrage Feste: Geburtstag 40 Personen im Maerz"');
auswahl('B2_anfragen', [
  { wert: 'willkommen', text: 'willkommen@wirtschaft-dornbirn.at  (Empfehlung)' },
  { wert: 'andere', text: 'eine andere Adresse:', feld: true }
]);

frage('Wohin sollen der Tageszettel (werktags um 08:00) und der Wochenbericht (Freitag 15:00) gehen?',
  'Der Tageszettel ist eine Mail mit allem, was fuer den Mittag ansteht: welche Reservierungen, wie viele Personen, welche Takeaway-Vorbestellungen - und eine Warnung, wenn die Wochenkarte noch fehlt. Der Wochenbericht fasst die Woche zusammen (Gaeste, Portionen). Beides sollte bei der Person ankommen, die den Mittag plant. Es kann willkommen@ sein; wenn ihr das Postfach nicht mit Dienstmails fuellen wollt, legen wir ein eigenes an.',
  'buero@wirtschaft-dornbirn.at (neu) - liest Hannah jeden Morgen');
auswahl('B3_tageszettel', [
  { wert: 'willkommen', text: 'willkommen@wirtschaft-dornbirn.at' },
  { wert: 'buero', text: 'ein eigenes, neues Postfach - Wunschname eintragen (z. B. buero@ oder kueche@):', feld: true },
  { wert: 'person', text: 'die bestehende Adresse einer Person:', feld: true }
]);

frage('Wohin soll die Meldung jeder einzelnen Takeaway-Bestellung gehen?',
  'Bei jeder Bestellung ueber die Webseite geht sofort eine Mail mit Bestellnummer, Name, Speisen und Abholzeit raus - der Beleg fuer die Kueche. Zusaetzlich klingelt das Handy mit der Wirt-Ansicht und die Bestellung steht dort in der Liste. Die Mail ist die Sicherheit, falls das Handy stumm ist.',
  'dieselbe Adresse wie beim Tageszettel - dann liegt alles an einem Ort');
auswahl('B4_takeaway', [
  { wert: 'wie3', text: 'dieselbe Adresse wie beim Tageszettel (Frage 6)  (Empfehlung)' },
  { wert: 'andere', text: 'eine andere Adresse:', feld: true }
]);

frage('Mit welcher Mailadresse sollen die Konten der Webseite angelegt werden?',
  'Die neue Webseite braucht drei kostenlose Konten: GitHub (dort liegt der Quellcode), Cloudflare (dort laeuft die Seite) und Brevo (verschickt die Mails). Heute laufen sie auf Jonas. Hannah legt sie neu an, damit alles dem Haus gehoert. Die Adresse dafuer bekommt Rechnungen (0 Euro), Sicherheitswarnungen und die Mails zum Zuruecksetzen des Passworts - sie ist der Generalschluessel. Deshalb soll sie nicht an einer Person haengen, die das Haus verlassen koennte, und nicht zwischen Gaestemails untergehen. Unsere Empfehlung: eine neue Adresse web@, die an Hannah weitergeleitet wird.',
  'web@wirtschaft-dornbirn.at - Weiterleitung an Hannah; Wolfgang kennt das Passwort');
auswahl('B5_inhaber', [
  { wert: 'web', text: 'web@wirtschaft-dornbirn.at neu anlegen, als Weiterleitung an Hannah  (Empfehlung)' },
  { wert: 'willkommen', text: 'willkommen@wirtschaft-dornbirn.at (geht, aber Rechnungen und Warnungen liegen dann zwischen Gaestemails)' },
  { wert: 'andere', text: 'eine andere Adresse:', feld: true }
]);

frage('Wer ist die zweite Person mit vollem Zugang zu diesen Konten?',
  'Faellt die erste Person aus (Urlaub, Krankheit, Ausscheiden), darf das Haus nicht ausgesperrt sein. Die zweite Person bekommt zu jedem Konto eine Einladung und bewahrt die Wiederherstellungscodes mit auf. Meist ist das Wolfgang.',
  'Wolfgang Preuss - wolfgang@wirtschaft-dornbirn.at');
textfeld('B6_zweite_person', 'Name und Mailadresse der zweiten Person');

frage('Wer soll die Webseite kuenftig technisch betreuen (Programmierer)?',
  'Diese Person wird in die drei Konten eingeladen und bekommt eine Mail, wenn die taegliche automatische Pruefung einen Fehler findet (sonst nie). Ihr koennt jeden Webentwickler nehmen - alle Anleitungen liegen bei. Wenn ihr noch niemanden habt, kann Jonas vorerst bleiben oder jemanden vorschlagen.',
  '"Max Muster, max@firma.at, 0664 ..." oder "noch offen - Jonas soll vorerst bleiben"');
textfeld('B7_programmierer', 'Name, Mailadresse, Telefon - oder "noch offen"', { hoehe: 36, mehrzeilig: true });

frage('Soll der Veranstalter-Kontakt bei den Abenden so bleiben?',
  'Im Fuss der Webseite und bei jedem Abend steht als Veranstalter "emma & eugen" mit uri@eugen.family und +43 664 230 65 87 - weil die Abende ueber Ticketist im Namen von Emma & Eugen verkauft werden. Das haben wir von eurer bisherigen Eventseite uebernommen. Bitte mit Uri abstimmen.',
  'bleibt so');
auswahl('B8_veranstalter', [
  { wert: 'bleibt', text: 'bleibt so  (Empfehlung, wenn Uri einverstanden ist)' },
  { wert: 'andere', text: 'aendern in (Adresse und Telefon):', feld: true }
]);

frage('Soll das Postfach willkommen@ eine automatische Antwort schicken, wenn jemand direkt hinschreibt?',
  'Alles bisher betrifft Mails, die die Webseite ausloest. Schreibt ein Gast einfach selbst eine Mail an willkommen@, sieht die Webseite das nicht - nur das Postfach selbst kann automatisch antworten ("Autoresponder"). Das stellt man bei Hetzner ein; der Programmierer hilft dabei. Vorschlag fuer den Text: "Danke fuer deine Nachricht an die wirtschaft! Wir lesen jede Mail persoenlich und melden uns so bald wie moeglich. Tisch fuer mittags reservieren geht sofort online: wirtschaft-dornbirn.at/tischreservierung - Takeaway: wirtschaft-dornbirn.at/takeaway - Tickets: wirtschaft-dornbirn.at/events". Wir raten davon ab, eine Antwortzeit zu versprechen.',
  'ja, mit dem Vorschlag - oder eigenen Text unten eintragen');
auswahl('B9_autoresponder', [
  { wert: 'vorschlag', text: 'ja, mit dem oben vorgeschlagenen Text  (Empfehlung)' },
  { wert: 'eigen', text: 'ja, mit eigenem Text (unten eintragen)' },
  { wert: 'nein', text: 'nein, keine automatische Antwort' }
]);
textfeld('B9_text', 'Eigener Text fuer die automatische Antwort (nur wenn gewuenscht)', { hoehe: 46, mehrzeilig: true });

abschnitt('C', 'Eure Domain wirtschaft-dornbirn.at');
absatz('Die Domain habt ihr bereits; sie muss nicht neu angemeldet werden. Aber wem sie gehoert, dem gehoert die Adresse der Webseite und aller Postfaecher. Wenn sie noch auf eine Agentur oder eine frueher zustaendige Person laeuft, sollte das vor dem Umzug der Webseite geaendert werden - das dauert Wochen, deshalb fragen wir jetzt. Bitte die letzte Rechnung fuer die Domain heraussuchen (Betreff meist "Domain", "Webhosting" oder "Hetzner", einmal im Jahr).', { groesse: 9.5 });
frage('Wer steht auf dieser Rechnung als Kunde bzw. Inhaber?',
  'Richtig ist: euer Betrieb. Steht dort eine Agentur oder ein Name, der nicht mehr zum Haus gehoert, muss die Domain auf euch uebertragen werden ("Inhaberwechsel"). Das geht, braucht aber die Mitwirkung des Eingetragenen.',
  '"wirtschaft" cafe restaurant bar Wolfgang Preuss e.U.');
auswahl('C1_inhaber', [
  { wert: 'haus', text: '"wirtschaft" cafe restaurant bar Wolfgang Preuss e.U. - so soll es sein' },
  { wert: 'person', text: 'eine Privatperson, naemlich:', feld: true },
  { wert: 'agentur', text: 'eine Agentur oder andere Firma, naemlich:', feld: true },
  { wert: 'unbekannt', text: 'weiss ich nicht - keine Rechnung gefunden' }
]);
frage('Von welcher Firma kommt diese Rechnung (der Registrar)?',
  'Dort wird die Domain jaehrlich bezahlt und dort kann man die Kontaktadresse und die automatische Verlaengerung einstellen. Vermutlich Hetzner.',
  'Hetzner Online GmbH');
auswahl('C2_registrar', [
  { wert: 'hetzner', text: 'Hetzner' },
  { wert: 'andere', text: 'eine andere Firma:', feld: true },
  { wert: 'unbekannt', text: 'weiss ich nicht' }
]);
frage('Wann wurde die Domain zuletzt bezahlt, und verlaengert sie sich automatisch?',
  'Laeuft eine Domain ab, weil die Rechnung uebersehen wurde, sind Webseite und alle Postfaecher von einem Tag auf den anderen weg. Automatische Verlaengerung mit gueltiger Zahlungsart verhindert das.',
  '"Rechnung vom Maerz 2026, fuer ein Jahr, Lastschrift" - oder "unbekannt"');
textfeld('C3_verlaengerung', 'Datum der letzten Rechnung, Laufzeit, Zahlungsart');
frage('Welche Mailadressen sollen beim Registrar als Kontakt hinterlegt sein?',
  'Dorthin kommt die Warnung, bevor die Domain ablaeuft, und die Rechnung. Zwei Adressen sind sicherer als eine: eine des Hauses und eine private als Reserve - falls die Hausadresse gerade nicht funktioniert, weil genau die Domain das Problem ist.',
  'web@wirtschaft-dornbirn.at, hannah.privat@gmail.com');
textfeld('C4_kontakt', 'Zwei Adressen, mit Komma getrennt', { vorgabe: 'web@wirtschaft-dornbirn.at, ' });

abschnitt('D', 'Zum Schluss');
frage('Was ist euch am Ganzen am wichtigsten?',
  'Damit wir die naechsten Wochen in der richtigen Reihenfolge angehen. Mehrere Haken sind erlaubt; die Reihenfolge der Haken ist egal.');
haken('D1_mails', 'dass die Bestaetigungen bei den Gaesten sicher ankommen (nicht im Spam)');
haken('D1_domain', 'dass die neue Webseite bald unter wirtschaft-dornbirn.at erreichbar ist');
haken('D1_konten', 'dass alles dem Haus gehoert und nichts mehr an Jonas haengt');
haken('D1_einfach', 'dass wir im Alltag moeglichst wenig damit zu tun haben');
haken('D1_kosten', 'dass es nichts kostet (heute: 0 Euro im Monat, nur die Domain wie bisher)');
textfeld('D2_sonst', 'Was sonst noch wichtig ist, Fragen an Jonas, Wuensche', { hoehe: 56, mehrzeilig: true });
frage('Freigabe',
  'Mit dem Zurueckschicken dieses Blattes beauftragt ihr Jonas, die angekreuzten Adressen in die Webseite, bei Brevo und - sobald Zugang besteht - bei Hetzner einzutragen. Nichts davon ist endgueltig: Jede Adresse laesst sich spaeter in fuenf Minuten aendern.');
textfeld('D3_freigabe', 'Euer Name (gilt als Unterschrift)', { breite: 300 });

form.updateFieldAppearances(schrift);
fs.mkdirSync(path.dirname(ziel), { recursive: true });
fs.writeFileSync(ziel, await doc.save());
console.log(`Formular: ${ziel} (${seitenZahl} Seiten, ${form.getFields().length} Felder)`);
