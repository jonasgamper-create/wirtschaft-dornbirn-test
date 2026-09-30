// Prueft die Sicherung: Form, Strenge, Base64-Hin-und-Zurueck.
//
// Der Dienst selbst laeuft hier nicht (kein Durable Object ausserhalb von
// Cloudflare). Geprueft wird die reine Logik - das, was zwischen Datei und
// Datenbank steht. Ob GET und POST /api/sicherung wirklich funktionieren,
// zeigt der Durchlauf gegen die Probe (docs/uebergabe.md, Abschnitt Beleg).

import {
  SICHERUNG_VERSION, TABELLEN, alsBase64, ausBase64, leereSicherung,
  pruefeSicherung, zeileNachAussen, zeileNachInnen
} from '../server/src/sicherung.mjs';

let fehler = 0;
const check = (was, bedingung, detail = '') => {
  if (!bedingung) { console.error(`  ✗ ${was}${detail ? ` - ${detail}` : ''}`); fehler += 1; }
};

// --- Form -------------------------------------------------------------------
const leer = leereSicherung('2026-09-30T10:00:00Z');
check('Leere Sicherung ist gueltig', pruefeSicherung(leer).ok === true);
check('Sieben Tabellen', Object.keys(TABELLEN).length === 7);
check('Version stimmt', leer.version === SICHERUNG_VERSION);

const voll = leereSicherung();
voll.tabellen.reservierungen.push({ id: 'r1', tag: '2026-10-01', daten: '{"name":"TEST"}' });
voll.tabellen.einstellungen.push({ schluessel: 'menueplan', wert: '{"montag":"2026-09-28"}' });
voll.tabellen.newsletter.push({ email: 'a@b.at', token: 't', daten: '{}' });
voll.tabellen.takeaway.push({ id: 't1', tag: '2026-10-01', daten: '{}' });
voll.tabellen.zahlen.push({ tag: '2026-09-30', art: 'takeaway', name: 'x', menge: 3 });
voll.tabellen.sperrliste.push({ fingerabdruck: 'f', seit: '2026-09-30' });
voll.tabellen.mittagskarte.push({ nr: 0, teil: alsBase64(new Uint8Array([1, 2, 3])) });
const geprueft = pruefeSicherung(voll);
check('Gefuellte Sicherung ist gueltig', geprueft.ok === true, geprueft.grund);
check('Zaehler stimmen', geprueft.ok && geprueft.zaehler.reservierungen === 1 && geprueft.zaehler.zahlen === 1);

// --- Strenge: halb passend wird ganz abgelehnt ------------------------------
check('Falsche Version wird abgelehnt', pruefeSicherung({ ...leer, version: 99 }).grund === 'version');
check('Kein Objekt wird abgelehnt', pruefeSicherung('text').grund === 'kein_objekt');
const ohne = leereSicherung(); delete ohne.tabellen.takeaway;
check('Fehlende Tabelle wird abgelehnt', pruefeSicherung(ohne).grund === 'tabelle_takeaway');
const kaputt = leereSicherung(); kaputt.tabellen.reservierungen.push({ id: 'r', tag: '2026-10-01' });
check('Fehlende Spalte wird abgelehnt', pruefeSicherung(kaputt).grund === 'reservierungen_0_daten');
const zahl = leereSicherung(); zahl.tabellen.zahlen.push({ tag: 't', art: 'a', name: 'n', menge: '3' });
check('Menge muss Zahl sein', pruefeSicherung(zahl).grund === 'zahlen_0_menge');
const nr = leereSicherung(); nr.tabellen.mittagskarte.push({ nr: '0', teil: '' });
check('nr muss Zahl sein', pruefeSicherung(nr).grund === 'mittagskarte_0_nr');

// --- Base64 hin und zurueck, auch ueber die 32-KB-Stueckgrenze ---------------
const gross = new Uint8Array(70000).map((_, i) => i % 251);
const zurueck = ausBase64(alsBase64(gross));
check('Base64 verlustfrei (70 kB)', zurueck.length === gross.length && zurueck.every((b, i) => b === gross[i]));
check('Leere Bytes bleiben leer', ausBase64(alsBase64(new Uint8Array(0))).length === 0);

// --- Zeile nach aussen und nach innen ---------------------------------------
const row = { id: 'r1', tag: '2026-10-01', daten: '{"a":1}', extra: 'weg' };
const aussen = zeileNachAussen('reservierungen', row);
check('Nach aussen nur die Spalten', JSON.stringify(Object.keys(aussen)) === '["id","tag","daten"]');
check('Nach innen in Spaltenreihenfolge', JSON.stringify(zeileNachInnen('reservierungen', aussen)) === '["r1","2026-10-01","{\\"a\\":1}"]');
const blob = zeileNachAussen('mittagskarte', { nr: 2, teil: new Uint8Array([9, 8]) });
check('Blob geht als Base64 hinaus', typeof blob.teil === 'string' && blob.nr === 2);
const innen = zeileNachInnen('mittagskarte', blob);
check('Blob kommt als Bytes zurueck', innen[0] === 2 && innen[1] instanceof Uint8Array && innen[1][1] === 8);

if (fehler) {
  console.error(`Sicherungs-Prüfung FEHLGESCHLAGEN: ${fehler} Punkt(e).`);
  process.exit(1);
}
console.log('Sicherungs-Prüfung OK: Form, Strenge, Base64 und Zeilenwandlung geprüft (7 Tabellen).');
