// Ein ausgefuelltes Mailadressen-Entscheidungsblatt lesen.
//
//   node scripts/lese-formular-mail.mjs ~/Downloads/Mailadressen-Entscheidungsblatt-wirtschaft.pdf
//
// Warum dieses Skript und nicht einfach ins PDF schauen: Vieles steht in
// Formularfeldern, und die zeigt kein Bildbetrachter sauber an - schon gar
// nicht, was angekreuzt ist.
//
// Eine Eigenheit von pdf-lib, die man kennen muss: bei einer Auswahl mit
// MEHR ALS ZWEI Moeglichkeiten liest sich die dritte und jede weitere nicht
// mit ihrem Namen zurueck, sondern mit ihrer Nummer ("2" = die dritte).
// Deshalb steht hier die Reihenfolge der Moeglichkeiten noch einmal - sie
// muss mit scripts/build-formular-mail.mjs zusammenpassen.

import { PDFDocument } from 'pdf-lib';
import { readFile } from 'node:fs/promises';

const AUSWAHL = {
  A2_mailanbieter: ['hetzner:Hetzner', 'andere:anderer Anbieter', 'unbekannt:weiss nicht'],
  B1_absender: ['willkommen:willkommen@wirtschaft-dornbirn.at', 'andere:andere Adresse'],
  B2_anfragen: ['willkommen:willkommen@wirtschaft-dornbirn.at', 'andere:andere Adresse'],
  B3_tageszettel: ['willkommen:willkommen@wirtschaft-dornbirn.at', 'buero:neues Postfach', 'person:Adresse einer Person'],
  B4_takeaway: ['wie3:dieselbe Adresse wie der Tageszettel', 'andere:andere Adresse'],
  B5_inhaber: ['web:web@wirtschaft-dornbirn.at neu anlegen', 'willkommen:willkommen@wirtschaft-dornbirn.at', 'andere:andere Adresse'],
  B8_veranstalter: ['bleibt:bleibt so', 'andere:aendern'],
  B9_autoresponder: ['vorschlag:ja, mit dem vorgeschlagenen Text', 'eigen:ja, mit eigenem Text', 'nein:nein, keine automatische Antwort'],
  C1_inhaber: ['haus:das Haus (Wolfgang Preuss e.U.)', 'person:eine Privatperson', 'agentur:eine Agentur oder Firma', 'unbekannt:weiss nicht'],
  C2_registrar: ['hetzner:Hetzner', 'andere:andere Firma', 'unbekannt:weiss nicht']
};

const FRAGEN = {
  ausgefuellt_von: 'Ausgefuellt von',
  datum: 'Datum',
  A1_postfaecher: 'A1 Welche Postfaecher gibt es, wer liest sie',
  A2_mailanbieter: 'A2 Wo werden die Postfaecher verwaltet',
  A3_hetzner_zugang: 'A3 Wer kann sich dort anmelden',
  B1_absender: 'B1 Absender aller automatischen Mails an Gaeste',
  B2_anfragen: 'B2 Wohin gehen Anfragen (Feste, Catering, Agentur)',
  B3_tageszettel: 'B3 Wohin gehen Tageszettel und Wochenbericht',
  B4_takeaway: 'B4 Wohin geht jede Takeaway-Bestellung',
  B5_inhaber: 'B5 Mit welcher Adresse werden die Konten angelegt',
  B6_zweite_person: 'B6 Zweite Person mit vollem Zugang',
  B7_programmierer: 'B7 Technische Betreuung',
  B8_veranstalter: 'B8 Veranstalter-Kontakt bei den Abenden',
  B9_autoresponder: 'B9 Automatische Antwort im Postfach',
  C1_inhaber: 'C1 Wer ist Inhaber der Domain',
  C2_registrar: 'C2 Von welcher Firma kommt die Domainrechnung',
  C3_verlaengerung: 'C3 Letzte Zahlung, Laufzeit, Zahlungsart',
  C4_kontakt: 'C4 Kontaktadressen beim Registrar',
  D2_sonst: 'D2 Was noch fehlt',
  D3_freigabe: 'D3 Freigabe'
};

const GEHEIM = new Set(['A3_hetzner_zugang']);

const pfad = process.argv[2];
if (!pfad) {
  console.error('Aufruf: node scripts/lese-formular-mail.mjs <ausgefuelltes.pdf>');
  process.exit(1);
}

const doc = await PDFDocument.load(await readFile(pfad), { ignoreEncryption: true });
const form = doc.getForm();
const werte = new Map();
for (const feld of form.getFields()) {
  const art = feld.constructor.name;
  let wert = '';
  if (art === 'PDFTextField') wert = feld.getText() || '';
  else if (art === 'PDFRadioGroup') wert = feld.getSelected() || '';
  else if (art === 'PDFCheckBox') wert = feld.isChecked() ? 'ja' : '';
  werte.set(feld.getName(), String(wert).replace(/\r/g, '\n').trim());
}

const auswahlText = (name, roh) => {
  if (!roh) return '(nicht angekreuzt)';
  const liste = (AUSWAHL[name] || []).map(e => ({ wert: e.slice(0, e.indexOf(':')), text: e.slice(e.indexOf(':') + 1) }));
  // Zahl: pdf-lib gibt ab der dritten Moeglichkeit die Nummer zurueck.
  if (/^\d+$/.test(roh)) return liste[Number(roh)]?.text || `Moeglichkeit ${Number(roh) + 1}`;
  return liste.find(e => e.wert === roh)?.text || roh;
};

console.log(`\nAusgefuelltes Entscheidungsblatt: ${pfad}\n${'='.repeat(60)}`);
for (const [name, frage] of Object.entries(FRAGEN)) {
  if (!werte.has(name)) continue;
  const roh = werte.get(name);
  const istAuswahl = Object.prototype.hasOwnProperty.call(AUSWAHL, name);
  let text = istAuswahl ? auswahlText(name, roh) : (roh || '(leer)');
  if (GEHEIM.has(name) && roh) {
    text = 'ausgefuellt - NICHT hier ausgeben. Enthaelt moeglicherweise ein Passwort; '
      + 'siehe docs/mailadressen-entscheidung.md, Abschnitt "Zugangsdaten".';
  }
  // Das Zusatzfeld einer Moeglichkeit "andere": gleicher Name mit Zusatz.
  const zusatz = [...werte.entries()].filter(([k, v]) => k.startsWith(`${name}_`) && v);
  console.log(`\n${frage}\n  ${text.split('\n').join('\n  ')}`);
  for (const [k, v] of zusatz) console.log(`  dazu (${k.slice(name.length + 1)}): ${v.split('\n').join('\n  ')}`);
}

const wichtig = ['D1_mails', 'D1_domain', 'D1_konten', 'D1_einfach', 'D1_kosten']
  .filter(k => werte.get(k) === 'ja')
  .map(k => ({ D1_mails: 'Mails kommen zuverlaessig an', D1_domain: 'Domain gehoert dem Haus',
    D1_konten: 'Konten gehoeren dem Haus', D1_einfach: 'alles einfach bedienbar',
    D1_kosten: 'Kosten niedrig halten' }[k]));
console.log(`\nD1 Was ist am wichtigsten\n  ${wichtig.length ? wichtig.join('; ') : '(nichts angekreuzt)'}`);
console.log(`\n${'='.repeat(60)}`);
console.log('Hinweis: Passwoerter gehoeren NICHT in dieses Verzeichnis.\n');
