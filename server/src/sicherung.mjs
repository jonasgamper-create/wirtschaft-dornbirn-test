// Sicherung: der ganze Bestand des Dienstes als eine Datei - und zurueck.
//
// Wozu: Bis 30.09.2026 gab es keinen Weg, die Daten des Dienstes
// herauszuholen. Sie liegen in einem Durable Object, und ein Durable Object
// laesst sich nicht zwischen Cloudflare-Konten verschieben. Fuer die Uebergabe
// an den Kunden (eigenes Konto) braucht es deshalb Export und Import - und
// dieselbe Datei ist danach das Backup, das bisher fehlte.
//
// Was drin ist: alle sieben Tabellen, Zeile fuer Zeile, so wie sie liegen.
// Die JSON-Spalten (daten, wert) bleiben Text - nichts wird gedeutet oder
// bereinigt, damit der Import exakt das zurueckschreibt, was der Export
// gelesen hat. Die PDF-Teile der Mittagskarte (BLOB) gehen als Base64.
//
// Was NICHT drin ist: die Geheimnisse (HAUS_TOKEN, BREVO_KEY, VAPID_PRIVAT).
// Die gehoeren nie in eine Datei, die herumgereicht wird; der neue Betreuer
// erzeugt eigene.

export const SICHERUNG_VERSION = 1;

/** Die Tabellen in der Reihenfolge, in der sie gesichert werden. */
export const TABELLEN = {
  reservierungen: ['id', 'tag', 'daten'],
  einstellungen: ['schluessel', 'wert'],
  newsletter: ['email', 'token', 'daten'],
  takeaway: ['id', 'tag', 'daten'],
  zahlen: ['tag', 'art', 'name', 'menge'],
  sperrliste: ['fingerabdruck', 'seit'],
  mittagskarte: ['nr', 'teil']
};

/** Bytes -> Base64 (ohne Node-Buffer, laeuft im Worker wie im Test). */
export function alsBase64(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let text = '';
  for (let i = 0; i < u8.length; i += 0x8000) {
    text += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  }
  return btoa(text);
}

export function ausBase64(text) {
  const bin = atob(String(text || ''));
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
  return u8;
}

/**
 * Eine Sicherung pruefen, bevor sie eingespielt wird.
 *
 * Streng: jede Tabelle muss da sein (auch leer), jede Zeile muss genau die
 * Spalten tragen, Text muss Text sein und Zahlen Zahlen. Eine Datei, die
 * halb passt, wird ganz abgelehnt - lieber "unbrauchbar" als ein Bestand,
 * in dem die Haelfte fehlt.
 */
export function pruefeSicherung(roh) {
  if (!roh || typeof roh !== 'object') return { ok: false, grund: 'kein_objekt' };
  if (roh.version !== SICHERUNG_VERSION) return { ok: false, grund: 'version' };
  const tabellen = roh.tabellen;
  if (!tabellen || typeof tabellen !== 'object') return { ok: false, grund: 'tabellen' };

  const zaehler = {};
  for (const [name, spalten] of Object.entries(TABELLEN)) {
    const zeilen = tabellen[name];
    if (!Array.isArray(zeilen)) return { ok: false, grund: `tabelle_${name}` };
    for (const [n, zeile] of zeilen.entries()) {
      if (!zeile || typeof zeile !== 'object') return { ok: false, grund: `${name}_${n}` };
      for (const spalte of spalten) {
        const wert = zeile[spalte];
        const zahl = (name === 'zahlen' && spalte === 'menge') || (name === 'mittagskarte' && spalte === 'nr');
        if (zahl ? !Number.isInteger(wert) : typeof wert !== 'string') {
          return { ok: false, grund: `${name}_${n}_${spalte}` };
        }
      }
    }
    zaehler[name] = zeilen.length;
  }
  return { ok: true, zaehler };
}

/** Eine Zeile aus der Datenbank in die Form der Sicherung bringen. */
export function zeileNachAussen(name, row) {
  if (name === 'mittagskarte') return { nr: row.nr, teil: alsBase64(row.teil) };
  const zeile = {};
  for (const spalte of TABELLEN[name]) zeile[spalte] = row[spalte];
  return zeile;
}

/** Und zurueck: die Werte in der Reihenfolge der Spalten, fuer INSERT. */
export function zeileNachInnen(name, zeile) {
  if (name === 'mittagskarte') return [zeile.nr, ausBase64(zeile.teil)];
  return TABELLEN[name].map(spalte => zeile[spalte]);
}

/** Der Rahmen einer leeren Sicherung - fuer Tests und als Vorlage. */
export function leereSicherung(erstellt = new Date().toISOString()) {
  const tabellen = {};
  for (const name of Object.keys(TABELLEN)) tabellen[name] = [];
  return { version: SICHERUNG_VERSION, erstellt, tabellen };
}
