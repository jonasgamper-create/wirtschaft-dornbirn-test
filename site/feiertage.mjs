// Oesterreichische Feiertage - berechnet, nicht gepflegt.
//
// Eine gepflegte Liste veraltet in dem Jahr, in dem niemand daran denkt.
// Die gesetzlichen Feiertage Oesterreichs sind aber vollstaendig berechenbar:
// neun feste Tage plus vier, die am Osterdatum haengen. Das Osterdatum kommt
// aus der Gaussschen Osterformel; sie gilt fuer den gregorianischen Kalender
// und damit fuer jedes Jahr, das dieses Wirtshaus erleben wird.
//
// Dasselbe Modul laeuft im Browser (Gaesteseite: Standardtag, gesperrte
// Tage) und im Worker (Dienst: die Grenze). Zwei Kopien wuerden auseinander
// laufen - genau am 15. August, wenn es drauf ankommt.

const pad = zahl => String(zahl).padStart(2, '0');
const iso = (jahr, monat, tag) => `${jahr}-${pad(monat)}-${pad(tag)}`;

/** Ostersonntag eines Jahres nach der Gaussschen Osterformel. */
export function ostersonntag(jahr) {
  const a = jahr % 19;
  const b = Math.floor(jahr / 100);
  const c = jahr % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31);
  const tag = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(jahr, monat - 1, tag));
}

const tageNachOstern = (jahr, tage) => {
  const datum = ostersonntag(jahr);
  datum.setUTCDate(datum.getUTCDate() + tage);
  return iso(datum.getUTCFullYear(), datum.getUTCMonth() + 1, datum.getUTCDate());
};

/** Alle gesetzlichen Feiertage eines Jahres als YYYY-MM-DD. */
export function feiertageImJahr(jahr) {
  return new Set([
    iso(jahr, 1, 1),    // Neujahr
    iso(jahr, 1, 6),    // Heilige Drei Koenige
    tageNachOstern(jahr, 1),   // Ostermontag
    iso(jahr, 5, 1),    // Staatsfeiertag
    tageNachOstern(jahr, 39),  // Christi Himmelfahrt
    tageNachOstern(jahr, 50),  // Pfingstmontag
    tageNachOstern(jahr, 60),  // Fronleichnam
    iso(jahr, 8, 15),   // Mariae Himmelfahrt
    iso(jahr, 10, 26),  // Nationalfeiertag
    iso(jahr, 11, 1),   // Allerheiligen
    iso(jahr, 12, 8),   // Mariae Empfaengnis
    iso(jahr, 12, 25),  // Christtag
    iso(jahr, 12, 26)   // Stefanitag
  ]);
}

export function istFeiertag(datum) {
  const jahr = Number(String(datum).slice(0, 4));
  if (!Number.isFinite(jahr)) return false;
  return feiertageImJahr(jahr).has(String(datum));
}

const istWochenende = datum => {
  const tag = new Date(`${datum}T12:00:00Z`).getUTCDay();
  return tag === 0 || tag === 6;
};

/** Ist an diesem Tag Mittag? Werktag, kein Feiertag, nicht zugesperrt. */
export function istOffenerTag(datum, geschlossene = []) {
  return !istWochenende(datum) && !istFeiertag(datum) && !geschlossene.includes(String(datum));
}

/**
 * Der naechste Tag, an dem gekocht wird - ab `von` einschliesslich. Das ist
 * der Standardtag im Reservierungsformular: heute, wenn heute offen ist,
 * sonst der naechste offene. Nach 60 Tagen wird abgebrochen; wer zwei Monate
 * durchgehend zusperrt, hat andere Sorgen als ein Formularfeld.
 */
export function naechsterOffenerTag(von, geschlossene = []) {
  const datum = new Date(`${von}T12:00:00Z`);
  for (let schritt = 0; schritt < 60; schritt += 1) {
    const kandidat = iso(datum.getUTCFullYear(), datum.getUTCMonth() + 1, datum.getUTCDate());
    if (istOffenerTag(kandidat, geschlossene)) return kandidat;
    datum.setUTCDate(datum.getUTCDate() + 1);
  }
  return String(von);
}
