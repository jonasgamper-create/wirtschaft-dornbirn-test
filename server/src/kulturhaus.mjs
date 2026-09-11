// Das Programm im Kulturhaus, gelesen bei Emma & Eugen.
//
// Warum ueberhaupt: die Abende im Haus und die Abende im Kulturhaus sind
// fuer den Gast EIN Programm - er will nicht wissen, wer welchen Saal
// bespielt, er will wissen, wann er hin soll. Bisher lagen sie auf zwei
// Webseiten. Seit 11.09. stehen beide auf unserer Eventseite, nach Datum
// sortiert; die Kulturhaus-Abende beige, damit man den Ort trotzdem sieht.
//
// Die Quelle ist die oeffentliche Programmseite eugen.family/kulturhaus.
// Sie liefert ihre Kacheln fertig im HTML - jede traegt Datum, Kuenstler,
// Programm, Bild und den Link auf die Buchung. Keine Schnittstelle, keine
// Anmeldung, kein Schluessel: wir lesen, was jeder Besucher auch sieht.
//
// Bewusst kein vollstaendiger HTML-Zerleger: die Seite ist seit Jahren
// gleich gebaut, und ein paar gezielte Ausdruecke sind hier ehrlicher als
// eine Bibliothek, die alles koennte. Aendert sich der Aufbau, findet der
// Parser nichts mehr - und dann bleibt der letzte bekannte Stand stehen,
// statt dass Unsinn auf der Seite landet (siehe listeGueltig).

export const KULTURHAUS_SEITE = 'https://eugen.family/kulturhaus/';

/** Wie lange ein geholter Stand als frisch gilt: sechs Stunden. */
export const FRISCH_MS = 6 * 60 * 60 * 1000;

const MONATE = {
  jan: 1, feb: 2, mär: 3, maer: 3, mar: 3, apr: 4, mai: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, okt: 10, nov: 11, dez: 12
};

const entkerne = wert => String(wert)
  .replace(/<[^>]+>/g, '\n')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#0?39;|&#x27;/g, "'")
  .replace(/&auml;/g, 'ä').replace(/&ouml;/g, 'ö').replace(/&uuml;/g, 'ü')
  .replace(/&szlig;/g, 'ß')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>');

/**
 * "mittwoch, 07.10.2026" wird zu "2026-10-07". Auch "7. oktober 2026" und
 * "07.10.26" gehen durch - die Seite hat ihre Schreibweise schon einmal
 * gewechselt, und ein Termin, den wir nicht lesen koennen, faellt sonst
 * stillschweigend aus dem Programm.
 */
export function alsDatum(text) {
  const roh = String(text || '').toLowerCase().trim();

  const punkte = roh.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{2,4})/);
  if (punkte) {
    const [, tag, monat, jahrRoh] = punkte;
    const jahr = jahrRoh.length === 2 ? 2000 + Number(jahrRoh) : Number(jahrRoh);
    return zusammen(jahr, Number(monat), Number(tag));
  }

  const wort = roh.match(/(\d{1,2})\.?\s*([a-zäöü]{3,})\s*(\d{4})/);
  if (wort) {
    const monat = MONATE[wort[2].slice(0, 3)];
    if (monat) return zusammen(Number(wort[3]), monat, Number(wort[1]));
  }
  return '';
}

function zusammen(jahr, monat, tag) {
  if (!(jahr >= 2020 && jahr <= 2100) || !(monat >= 1 && monat <= 12) || !(tag >= 1 && tag <= 31)) return '';
  const zwei = zahl => String(zahl).padStart(2, '0');
  return `${jahr}-${zwei(monat)}-${zwei(tag)}`;
}

/**
 * Aus dem Link der Buchung eine Kennung machen:
 * https://eugen.family/event/kulis-02-2026/ -> kulis-02-2026.
 * Sie ist stabil, kurz und taugt als Dateiname fuer das Bild.
 */
export function kennungAusLink(link) {
  const treffer = String(link || '').match(/\/event\/([a-z0-9-]+)\/?/i);
  return treffer ? treffer[1].toLowerCase() : '';
}

/**
 * Die Programmseite in eine Liste verwandeln. Kommt etwas nicht mit -
 * kein Datum, kein Link -, faellt genau diese Kachel weg und nicht die
 * ganze Liste: ein fehlerhafter Eintrag darf das Programm nicht leeren.
 */
export function leseProgramm(html) {
  const text = String(html || '');
  const stuecke = text.split('<div class="box-item').slice(1);
  const events = [];
  const gesehen = new Set();

  for (const stueck of stuecke) {
    const kopf = stueck.match(/box-header-container">([\s\S]*?)<\/div>/);
    const link = stueck.match(/document\.location\.href='([^']+)'/);
    if (!kopf || !link) continue;

    const zeilen = entkerne(kopf[1]).split('\n').map(z => z.trim()).filter(Boolean);
    const datum = alsDatum(zeilen[0]);
    const kennung = kennungAusLink(link[1]);
    if (!datum || !kennung || gesehen.has(kennung)) continue;
    gesehen.add(kennung);

    const bild = stueck.match(/background-image:\s*url\(\s*['"]?([^'")]+)/);
    events.push({
      id: kennung,
      date: datum,
      // Zeile zwei ist der Name, alles weitere die Programmzeile. Steht nur
      // eine Zeile da, ist der Titel eben der Titel - kein Platzhalter.
      title: zeilen[1] || zeilen[0],
      programm: zeilen.slice(2).join(' · '),
      // Zwei Wege zum selben Abend: die Seite von Emma & Eugen erzaehlt
      // ihn, der Ticketshop verkauft ihn. Beide tragen dieselbe Kennung,
      // deshalb genuegt der Link der Programmseite als Quelle fuer beide.
      infoUrl: link[1],
      ticketUrl: `https://www.ticketist.io/events/${kennung}`,
      bildQuelle: bild ? bild[1].trim() : ''
    });
  }

  events.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  return events;
}

/**
 * Taugt der frisch geholte Stand als Ersatz fuer den bisherigen? Eine leere
 * Liste ist kein Programm, sondern ein Fehler - ein Umbau der fremden Seite,
 * ein Wartungsmodus, eine Fehlermeldung statt HTML. In dem Fall bleibt
 * stehen, was wir zuletzt gelesen haben.
 */
export function listeGueltig(events) {
  return Array.isArray(events) && events.length > 0
    && events.every(e => e.id && e.date && e.title && e.ticketUrl && e.infoUrl);
}

/**
 * Holen und lesen. Wirft nicht: der Aufrufer bekommt entweder eine gueltige
 * Liste oder null und behaelt dann seinen alten Stand.
 */
export async function holeProgramm(fetchImpl = fetch, seite = KULTURHAUS_SEITE) {
  try {
    const antwort = await fetchImpl(seite, {
      headers: { 'user-agent': 'wirtschaft-dornbirn-events/1.0 (+https://wirtschaft-dornbirn.at)' },
      cf: { cacheTtl: 900, cacheEverything: true }
    });
    if (!antwort.ok) return null;
    const events = leseProgramm(await antwort.text());
    return listeGueltig(events) ? events : null;
  } catch {
    return null;
  }
}
