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
const SS = { muessen: 'müssen', Preuss: 'Preuß', weiss: 'weiß', laesst: 'lässt', Fuss: 'Fuß', schliesst: 'schließt', gross: 'groß' };
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
  seite.drawText(`${nummer}`, { x: RAND + 8, y: y + 1, size: 12, font: fett, color: WINE });
  seite.drawText(u(text), { x: RAND + 30, y: y + 1, size: 12, font: fett, color: INK });
  y -= 30;
}

let nr = 0;
function frage(text, warum) {
  nr += 1;
  const z = zeilen(`${nr}.  ${text}`, fett, 10.5, BREITE);
  const w = warum ? zeilen(warum, schrift, 8.5, BREITE - 16) : [];
  platz(z.length * 14 + w.length * 11 + 8);
  for (const t of z) { seite.drawText(t, { x: RAND, y, size: 10.5, font: fett, color: INK }); y -= 14; }
  for (const t of w) { seite.drawText(t, { x: RAND + 16, y, size: 8.5, font: schrift, color: GREEN }); y -= 11; }
  y -= 4;
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

// ---------------------------------------------------------------- Seite 1
neueSeite();
titel('Mailadressen - was wohin geht');
absatz('Liebe Hannah, lieber Wolfgang - bevor die Webseite ganz auf euch uebergeht, muessen wir einmal festlegen, welche Mailadresse wofuer gilt. Das ist der wichtigste Punkt der Uebergabe: An diese Adressen gehen kuenftig Reservierungen, Bestellungen, Anfragen und die Rechnungen der Anbieter. Alles andere (Domain, Hosting) haengt daran.', { groesse: 10 });
absatz('So geht es: Am Handy oder Computer oeffnen, ankreuzen, eintragen, speichern, an Jonas zurueckschicken. Dauer etwa 15 Minuten. Wo eine Empfehlung steht, ist sie bereits angekreuzt - ihr muesst nur aendern, was anders sein soll.', { groesse: 10 });
hinweis('Alle Adressen muessen echte, gelesene Postfaecher sein. Eine Adresse, die niemand liest, ist schlimmer als keine: Der Gast glaubt, er wurde gehoert.');

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
frage('Welche Postfaecher hat das Haus bei Hetzner (oder anderswo)?', 'Wir wissen von willkommen@wirtschaft-dornbirn.at. Bitte alle eintragen, auch Weiterleitungen - und wer sie liest.');
textfeld('A1_postfaecher', 'Je Zeile: Adresse - wer liest sie - wie oft (z. B. "willkommen@ - Service - taeglich")', { hoehe: 56, mehrzeilig: true, vorgabe: 'willkommen@wirtschaft-dornbirn.at - ' });
frage('Wo liegen die Postfaecher?', 'Das bestimmt, wo der Autoresponder und spaeter die vier Brevo-Eintraege gemacht werden.');
auswahl('A2_mailanbieter', [
  { wert: 'hetzner', text: 'bei Hetzner (zusammen mit Domain und alter Webseite) - vermutlich' },
  { wert: 'andere', text: 'woanders, naemlich:', feld: true },
  { wert: 'unbekannt', text: 'weiss ich nicht - Jonas soll nachsehen (braucht Zugang zur Hetzner-Verwaltung)' }
]);
frage('Wer kann sich heute bei Hetzner anmelden (Domain, Postfaecher, DNS)?', 'Ohne diesen Zugang kann niemand Postfaecher anlegen oder die Domain umziehen.');
textfeld('A3_hetzner_zugang', 'Name(n) - und ob die Zugangsdaten im Haus liegen', { hoehe: 36, mehrzeilig: true });

// ---------------------------------------------------------------- Entscheidungen
abschnitt('B', 'Die Entscheidungen - welche Adresse wofuer');
absatz('Jede Zeile ist eine Stelle im System, an der eine Adresse eingetragen wird. Empfehlung ist vorangekreuzt.', { groesse: 9 });

frage('Absender aller automatischen Mails an Gaeste', 'Bestaetigungen fuer Reservierung, Takeaway, Warteliste, Newsletter. Der Gast sieht "Wirtschaft Dornbirn <diese Adresse>" und antwortet darauf. Muss eine Adresse der Domain wirtschaft-dornbirn.at sein, sonst landen die Mails im Spam.');
auswahl('B1_absender', [
  { wert: 'willkommen', text: 'willkommen@wirtschaft-dornbirn.at  (Empfehlung)' },
  { wert: 'andere', text: 'andere Adresse @wirtschaft-dornbirn.at:', feld: true }
]);

frage('Empfaenger der Anfragen von Locations (Feste, Catering) und Agentur', 'Jede Anfrage kommt als Mail mit allen Angaben; "Antworten" geht direkt an den Gast. Zusaetzlich in der Wirt-Ansicht unter haus > Anfragen.');
auswahl('B2_anfragen', [
  { wert: 'willkommen', text: 'willkommen@wirtschaft-dornbirn.at  (Empfehlung)' },
  { wert: 'andere', text: 'andere Adresse:', feld: true }
]);

frage('Tageszettel (werktags 08:00) und Wochenbericht (Freitag 15:00)', 'Wer kommt heute, was ist vorbestellt, fehlt die Wochenkarte. Soll bei der Person landen, die den Mittag plant.');
auswahl('B3_tageszettel', [
  { wert: 'willkommen', text: 'willkommen@wirtschaft-dornbirn.at' },
  { wert: 'buero', text: 'ein eigenes Postfach, neu anlegen (z. B. buero@ oder kueche@):', feld: true },
  { wert: 'person', text: 'die Adresse einer Person:', feld: true }
]);

frage('Meldung jeder Takeaway-Bestellung (sofort, mit Speisen und Abholzeit)', 'Zusaetzlich klingelt das Handy mit der Wirt-Ansicht. Die Mail ist der Beleg fuer die Kueche.');
auswahl('B4_takeaway', [
  { wert: 'wie3', text: 'dieselbe Adresse wie beim Tageszettel  (Empfehlung)' },
  { wert: 'andere', text: 'andere Adresse:', feld: true }
]);

frage('Inhaber-Adresse fuer die Konten GitHub, Cloudflare, Brevo (und die Domain)', 'Dorthin gehen Rechnungen, Warnungen, Passwort-Zuruecksetzen. Darf an keiner Person haengen, die gehen koennte. Empfehlung: web@ neu anlegen als Weiterleitung an Hannah.');
auswahl('B5_inhaber', [
  { wert: 'web', text: 'web@wirtschaft-dornbirn.at - Hannah legt es als Postfach oder Weiterleitung an  (Empfehlung)' },
  { wert: 'willkommen', text: 'willkommen@wirtschaft-dornbirn.at (dann liegen Rechnungen zwischen Gaestemails)' },
  { wert: 'andere', text: 'andere Adresse:', feld: true }
]);

frage('Zweite Person mit vollem Zugang zu allen Konten', 'Faellt eine Person aus, ist das Haus nicht ausgesperrt. Diese Person bekommt die Einladungen und die Wiederherstellungscodes.');
textfeld('B6_zweite_person', 'Name und Mailadresse', { breite: BREITE });

frage('Programmierer, der die Webseite kuenftig betreut', 'Er wird in die Konten eingeladen und bekommt die Fehlermails der taeglichen Pruefung (nur wenn etwas schiefgeht).');
textfeld('B7_programmierer', 'Name, Mailadresse, Telefon - oder "noch offen, Jonas soll vorschlagen"', { hoehe: 36, mehrzeilig: true });

frage('Veranstalter-Kontakt bei den Abenden (Fuss der Seite: "emma & eugen")', 'Heute: uri@eugen.family und +43 664 230 65 87. Steht auf sechs Seiten und bei jedem Abend.');
auswahl('B8_veranstalter', [
  { wert: 'bleibt', text: 'bleibt so  (Empfehlung, mit Uri abgestimmt)' },
  { wert: 'andere', text: 'aendern in:', feld: true }
]);

frage('Automatische Antwort auf Mails, die direkt an willkommen@ geschrieben werden', 'Die Webseite kann das nicht - nur das Postfach selbst (Autoresponder bei Hetzner). Vorschlag: eine kurze Eingangsbestaetigung mit den drei Online-Wegen, ohne Antwortzeit zu versprechen.');
auswahl('B9_autoresponder', [
  { wert: 'vorschlag', text: 'ja, mit dem vorgeschlagenen Text (siehe Handbuch fuers Haus, Abschnitt 4)  (Empfehlung)' },
  { wert: 'eigen', text: 'ja, mit eigenem Text (unten eintragen)' },
  { wert: 'nein', text: 'nein, keine automatische Antwort' }
]);
textfeld('B9_text', 'Eigener Text (falls gewuenscht)', { hoehe: 46, mehrzeilig: true });

// ---------------------------------------------------------------- Domain
abschnitt('C', 'Die Domain wirtschaft-dornbirn.at');
absatz('Nichts Neues muss registriert werden. Aber: Wem die Domain gehoert, dem gehoert die Adresse der Webseite und aller Postfaecher. Bitte auf der letzten Rechnung nachsehen.', { groesse: 9.5 });
frage('Wer steht als Inhaber der Domain auf der Rechnung?');
auswahl('C1_inhaber', [
  { wert: 'haus', text: '"wirtschaft" cafe restaurant bar Wolfgang Preuss e.U.  (so soll es sein)' },
  { wert: 'person', text: 'eine Privatperson, naemlich:', feld: true },
  { wert: 'agentur', text: 'eine Agentur oder Firma, naemlich:', feld: true },
  { wert: 'unbekannt', text: 'weiss ich nicht - Rechnung liegt nicht vor' }
]);
frage('Bei wem wird die Domain bezahlt (Registrar)?');
auswahl('C2_registrar', [
  { wert: 'hetzner', text: 'Hetzner' },
  { wert: 'andere', text: 'woanders:', feld: true },
  { wert: 'unbekannt', text: 'weiss ich nicht' }
]);
frage('Wann wurde die Domain zuletzt bezahlt, und laeuft die Verlaengerung automatisch?');
textfeld('C3_verlaengerung', 'z. B. "Rechnung Maerz 2026, 1 Jahr, automatisch" - oder "unbekannt"');
frage('Welche Mailadresse soll beim Registrar als Kontakt stehen?', 'Dorthin kommt die Warnung, bevor die Domain ablaeuft. Zwei Adressen: eine des Hauses und eine private als Reserve.');
textfeld('C4_kontakt', 'Zwei Adressen, mit Komma getrennt', { vorgabe: 'web@wirtschaft-dornbirn.at, ' });

// ---------------------------------------------------------------- Abschluss
abschnitt('D', 'Zum Schluss');
frage('Was ist euch am Ganzen am wichtigsten?', 'Damit die Reihenfolge der naechsten Wochen stimmt. Mehrere Kreuze moeglich.');
haken('D1_mails', 'dass die Bestaetigungen an Gaeste sicher ankommen (nicht im Spam)');
haken('D1_domain', 'dass die Webseite bald unter wirtschaft-dornbirn.at laeuft');
haken('D1_konten', 'dass alles dem Haus gehoert und nichts an Jonas haengt');
haken('D1_einfach', 'dass wir im Alltag moeglichst wenig damit zu tun haben');
haken('D1_kosten', 'dass es nichts kostet');
textfeld('D2_sonst', 'Sonst noch wichtig, Fragen an Jonas, Wuensche', { hoehe: 56, mehrzeilig: true });
frage('Freigabe');
absatz('Mit dem Zurueckschicken dieses Blattes beauftragt ihr Jonas, die angekreuzten Adressen in den Dienst, bei Brevo und - sobald Zugang besteht - bei Hetzner einzutragen. Nichts davon ist endgueltig; jede Adresse laesst sich spaeter in fuenf Minuten aendern.', { groesse: 9 });
textfeld('D3_freigabe', 'Name (gilt als Unterschrift)', { breite: 300 });

form.updateFieldAppearances(schrift);
fs.mkdirSync(path.dirname(ziel), { recursive: true });
fs.writeFileSync(ziel, await doc.save());
console.log(`Formular: ${ziel} (${seitenZahl} Seiten, ${form.getFields().length} Felder)`);
