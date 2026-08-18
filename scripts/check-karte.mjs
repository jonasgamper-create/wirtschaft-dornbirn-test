// Fuenf kritische Pruefungen fuer den Mittagskarten-Ablauf: hochladen,
// speichern, ausliefern, anzeigen. Laeuft in Node, ohne Cloudflare und ohne
// Netz - die reine Logik ist dieselbe, die im Worker laeuft.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KARTE_MAX, TEIL_GROESSE, inTeile, karteKopf, pruefeKarte, zusammen } from '../server/src/karte.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const check = (name, bedingung, detail = '') => {
  if (bedingung) return;
  errors.push(`Karte: ${name}${detail ? ` - ${detail}` : ''}`);
};

const pdf = laenge => {
  const daten = new Uint8Array(laenge);
  new TextEncoder().encode('%PDF-1.7\n').forEach((b, i) => { daten[i] = b; });
  for (let i = 9; i < laenge; i += 1) daten[i] = i % 251; // unregelmaessig, nicht nur Nullen
  return daten;
};

// ---- Versuch 1: Kommt hinten heraus, was vorn hineinging? -----------------
//
// Der gefaehrlichste Fehler ist der stille: eine Karte, die nach dem
// Zusammensetzen ein anderes Byte hat als vor dem Zerschneiden, waere ein
// kaputtes PDF ohne Fehlermeldung. Deshalb Byte fuer Byte, und zwar genau an
// den Kanten: kleiner als ein Stueck, exakt ein Stueck, ein Byte darueber,
// mehrere Stuecke.
for (const laenge of [9, 1000, TEIL_GROESSE, TEIL_GROESSE + 1, 3 * TEIL_GROESSE + 7]) {
  const orig = pdf(laenge);
  const teile = inTeile(orig);
  const erwartet = Math.ceil(laenge / TEIL_GROESSE);
  check(`Stueckzahl stimmt bei ${laenge} Bytes`, teile.length === erwartet, `${teile.length} statt ${erwartet}`);
  check(`Kein Stueck ueber der Zeilengrenze (${laenge})`, teile.every(teil => teil.byteLength <= TEIL_GROESSE));
  const zurueck = zusammen(teile);
  check(`Byte-identisch nach Rundreise (${laenge})`,
    zurueck.length === orig.length && zurueck.every((b, i) => b === orig[i]));
}
// Vertauschte Reihenfolge muss auffallen - sonst deckt der Test sie nicht.
{
  const orig = pdf(2 * TEIL_GROESSE);
  const teile = inTeile(orig);
  const falsch = zusammen([teile[1], teile[0]]);
  check('Der Test erkennt vertauschte Stuecke', !falsch.every((b, i) => b === orig[i]));
}

// ---- Versuch 2: Maskerade -------------------------------------------------
//
// Ein Dateiname ist eine Behauptung. Eine HTML-Datei als "karte.pdf" darf
// weder angenommen noch - schlimmer - als Seite unter unserer Adresse laufen.
check('HTML als PDF faellt raus',
  pruefeKarte(new TextEncoder().encode('<html><script>alert(1)</script>')).grund === 'kein_pdf');
check('Leere Datei faellt raus', pruefeKarte(new Uint8Array(0)).grund === 'leer');
check('Abgeschnittener Kopf faellt raus', pruefeKarte(new TextEncoder().encode('%PD')).grund === 'kein_pdf');
check('Echtes PDF geht durch', pruefeKarte(pdf(1000)).ok);
{
  const kopfzeilen = karteKopf();
  check('Ausgeliefert wird als PDF', kopfzeilen['content-type'] === 'application/pdf');
  check('Der Browser darf nicht raten (nosniff)', kopfzeilen['x-content-type-options'] === 'nosniff');
  check('Im Browser oeffnen, nicht herunterladen', /^inline/.test(kopfzeilen['content-disposition']));
  check('Kein Zwischenspeicher haelt eine alte Karte', kopfzeilen['cache-control'] === 'no-store');
}

// ---- Versuch 3: Die Groessengrenze ----------------------------------------
check('Genau an der Grenze geht durch', pruefeKarte(pdf(KARTE_MAX)).ok);
check('Ein Byte darueber faellt raus', pruefeKarte(pdf(KARTE_MAX + 1)).grund === 'zu_gross');

// ---- Versuch 4: Erst fertig, dann sichtbar --------------------------------
//
// Der Stand-Eintrag ist das Signal "die Karte ist vollstaendig". Er muss nach
// den Stuecken geschrieben werden, und Lesen ohne Stand muss leer ausgehen -
// sonst koennte ein Gast eine halb geschriebene Karte erwischen.
const dienst = await readFile(path.join(root, 'server/src/index.js'), 'utf8');
{
  const setzen = /async karteSetzen[\s\S]*?\n  \}/.exec(dienst)?.[0] || '';
  const loeschen = setzen.indexOf('DELETE FROM mittagskarte');
  const einfuegen = setzen.indexOf('INSERT INTO mittagskarte');
  const stand = setzen.indexOf("#schreib('karteStand'");
  check('Alte Karte faellt vor der neuen', loeschen > -1 && einfuegen > loeschen);
  check('Der Stand kommt zuletzt', stand > einfuegen);
  const lesen = /async karte\(\)[\s\S]*?\n  \}/.exec(dienst)?.[0] || '';
  check('Ohne Stand wird nichts ausgeliefert', /if \(!this\.#lies\('karteStand'/.test(lesen));
}

// ---- Versuch 5: Wer darf was, und haengt alles zusammen? ------------------
{
  const route = /if \(url\.pathname === '\/api\/mittagskarte'\)[\s\S]*?\n      \}/.exec(dienst)?.[0] || '';
  check('Info ist oeffentlich', /request\.method === 'GET'\) return json\(await haus\.karteInfo/.test(route));
  const geschuetzt = route.indexOf('if (!darf())');
  check('Hochladen und Loeschen nur mit Schluessel',
    geschuetzt > -1
    && route.indexOf("method === 'DELETE'") > geschuetzt
    && route.indexOf("method === 'POST'") > geschuetzt);
  check('DELETE ist in CORS erlaubt', /GET,POST,DELETE,OPTIONS/.test(dienst));
  check('Zu grosse Koerper scheitern am Tor', /content-length/.test(dienst));
}
{
  const seite = await readFile(path.join(root, 'site/tischreservierung.html'), 'utf8');
  const kasten = /<aside class="lunch-live"[\s\S]*?<\/aside>/.exec(seite)?.[0] || '';
  check('Die Gaesteseite hat den Abschnitt', kasten.includes('id="lunchLive"') && kasten.includes('hidden'));
  check('Der Abschnitt steht unter dem Reservieren-Knopf',
    seite.indexOf('id="lunchLive"') > seite.indexOf('id="bookDirect"'));
  check('Das PDF oeffnet in neuem Tab mit noopener',
    /id="lunchLiveLink"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/.test(kasten));
  const buchung = await readFile(path.join(root, 'site/tischreservierung-buchung.js'), 'utf8');
  check('Die Seite fragt beim Laden nach der Karte', /zeigeKarte\(\);/.test(buchung));
  check('Die Seite haelt die Karte aktuell', /setInterval\(zeigeKarte/.test(buchung));
  const cockpit = await readFile(path.join(root, 'site/gastgeber-tischplan.html'), 'utf8');
  check('Das Cockpit hat den Upload', /id="fpKarteDatei"[^>]*type="file"[^>]*accept="application\/pdf/.test(cockpit));
  const cockpitJs = await readFile(path.join(root, 'site/gastgeber-floorplan.js'), 'utf8');
  check('Das Cockpit prueft die Groesse vor dem Senden', /8 \* 1024 \* 1024/.test(cockpitJs));
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Mittagskarten-Prüfung OK: Rundreise, Maskerade, Grenze, Reihenfolge und Verkabelung geprüft.');
