// Die Mittagskarte als PDF - reine Logik, damit `npm run ci` sie ohne
// Cloudflare durchspielen kann.
//
// Der Ablauf ist bewusst der kuerzeste, der ehrlich funktioniert: Wolfgang
// laedt das PDF im Cockpit hoch, der Dienst speichert es, die Gaesteseite
// zeigt es. Kein Bauvorgang, kein Zwischenlager, keine dritte Partei - die
// Karte ist in dem Moment aktuell, in dem der Upload durch ist.

/**
 * Obergrenze fuer die Datei. Eine Mittagskarte ist eine Seite; acht Megabyte
 * tragen auch einen unbeholfen exportierten Scan. Was groesser ist, ist mit
 * hoher Wahrscheinlichkeit die falsche Datei.
 */
export const KARTE_MAX = 8 * 1024 * 1024;

/**
 * Zeilen im Speicher des Dienstes duerfen zwei Megabyte nicht uebersteigen.
 * Deshalb wird die Datei in Stuecke geschnitten und beim Ausliefern wieder
 * zusammengesetzt. Ein Megabyte laesst Luft unter der Grenze.
 */
export const TEIL_GROESSE = 1024 * 1024;

/**
 * Ist das ein PDF? Geprueft wird der Inhalt, nicht der Dateiname: ein Dateiname
 * ist eine Behauptung. Ein PDF beginnt mit "%PDF-".
 */
export function pruefeKarte(bytes) {
  const daten = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  if (!daten || daten.length === 0) return { ok: false, grund: 'leer' };
  if (daten.length > KARTE_MAX) return { ok: false, grund: 'zu_gross' };
  const kopf = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
  if (daten.length < kopf.length || !kopf.every((wert, i) => daten[i] === wert)) {
    return { ok: false, grund: 'kein_pdf' };
  }
  return { ok: true, groesse: daten.length };
}

/** Die Datei in speicherbare Stuecke schneiden. Reihenfolge = Index. */
export function inTeile(bytes, teilGroesse = TEIL_GROESSE) {
  const daten = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  const teile = [];
  for (let ab = 0; ab < daten.length; ab += teilGroesse) {
    // slice kopiert - jedes Stueck ist ein eigener, sauber begrenzter Puffer.
    teile.push(daten.slice(ab, ab + teilGroesse).buffer);
  }
  return teile;
}

/** Die Stuecke wieder zu einer Datei zusammensetzen. */
export function zusammen(teile) {
  const laenge = teile.reduce((sum, teil) => sum + teil.byteLength, 0);
  const daten = new Uint8Array(laenge);
  let ab = 0;
  for (const teil of teile) {
    daten.set(new Uint8Array(teil), ab);
    ab += teil.byteLength;
  }
  return daten;
}

/**
 * Die Kopfzeilen, mit denen die Karte ausgeliefert wird.
 *
 * - inline statt attachment: die Karte soll sich im Browser oeffnen.
 * - nosniff: der Browser darf nicht raten, was das ist. Ohne diese Zeile
 *   wuerde eine als PDF hochgeladene HTML-Datei im Zweifel als Seite laufen -
 *   mit fremdem Skript unter unserer Adresse.
 * - no-store: "immer aktuell" heisst, dass kein Zwischenspeicher eine alte
 *   Karte festhaelt. Die Datei ist klein, der Abruf selten.
 */
export const karteKopf = () => ({
  'content-type': 'application/pdf',
  'content-disposition': 'inline; filename="mittagskarte.pdf"',
  'x-content-type-options': 'nosniff',
  'cache-control': 'no-store'
});
