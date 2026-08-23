// Eigene Termine des Hauses, angelegt vom Wirt in seiner Ansicht.
//
// Sie ergaenzen das offizielle Programm, sie ersetzen es nicht: die grossen
// Abende mit Tickets laufen weiter ueber die offizielle Website und kommen
// als events.json herein. Hier entsteht, was dazwischen liegt - ein
// spontaner Stammtisch, ein geaenderter Ruhetag, ein Zusatzabend.
//
// Die Liste haelt sich selbst sauber: sie ist immer nach Datum sortiert,
// und Vergangenes faellt beim naechsten Schreiben von alleine weg. Ein
// Werkzeug, in dem sich alte Termine stapeln, wird nicht mehr angeschaut.

/** Mehr braucht kein Wirtshaus - und eine volle Liste prueft niemand mehr. */
export const HOECHSTENS = 50;

const DATUM = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const ZEIT = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Einen Termin von aussen pruefen. Zurueck kommt entweder der bereinigte
 * Termin oder der erste Grund, warum es keiner ist - derselbe Stil wie bei
 * Bestellung und Reservierung.
 */
export function pruefeEigenesEvent(roh) {
  const titel = String(roh?.titel ?? '').trim().slice(0, 80);
  if (titel.length < 3) return { ok: false, grund: 'titel' };

  const datum = String(roh?.datum ?? '').trim();
  if (!DATUM.test(datum)) return { ok: false, grund: 'datum' };

  const zeit = String(roh?.zeit ?? '').trim();
  if (zeit && !ZEIT.test(zeit)) return { ok: false, grund: 'zeit' };

  const untertitel = String(roh?.untertitel ?? '').trim().slice(0, 120);

  // Ein Link ist erlaubt, aber nur ein echter: alles andere waere eine Tuer
  // fuer javascript:-Adressen auf der eigenen Gaesteseite.
  const link = String(roh?.link ?? '').trim();
  if (link && !/^https:\/\/[^\s]+$/.test(link)) return { ok: false, grund: 'link' };
  if (link.length > 300) return { ok: false, grund: 'link' };

  return {
    ok: true,
    event: { titel, datum, zeit: zeit || null, untertitel: untertitel || null, link: link || null }
  };
}

/**
 * Die Liste nach einem Schreiben in Ordnung bringen: sortiert nach Datum
 * (bei gleichem Tag nach Uhrzeit), Vergangenes weg, Obergrenze gehalten.
 * `heute` kommt als YYYY-MM-DD herein - der heutige Abend zaehlt noch,
 * erst ab morgen ist er Vergangenheit.
 */
export function ordneEigeneEvents(liste, heute) {
  return (Array.isArray(liste) ? liste : [])
    .filter(event => String(event?.datum || '') >= String(heute || ''))
    .sort((a, b) => (a.datum + (a.zeit || '')).localeCompare(b.datum + (b.zeit || '')))
    .slice(0, HOECHSTENS);
}

/**
 * Was die Gaesteseite bekommt: dieselbe Form wie die Eintraege aus
 * events.json, damit die Seite beide Quellen gleich behandeln kann.
 * Eigene Termine haben keine Ticketkategorien - was sie nicht haben,
 * behaupten sie auch nicht.
 */
export function fuerDieGaesteseite(event) {
  return {
    id: event.id,
    date: event.datum,
    title: event.titel,
    type: event.untertitel || 'Termin im Haus',
    status: 'scheduled',
    officialUrl: event.link || null,
    beginn: event.zeit || null,
    tickets: [],
    quelle: 'haus'
  };
}
