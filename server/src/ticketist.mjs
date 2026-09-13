// Die Termine, gelesen beim Ticketdienst.
//
// Beide Häuser - die Abende in der Wirtschaft und die im Kulturhaus -
// verkaufen über denselben Dienst (ticketist.io). Damit gibt es genau eine
// Quelle für das, was auf der Eventseite steht: Name, Untertitel, Tag und
// Uhrzeit, Ort, Beschreibung, Bild und ob noch gekauft werden kann.
//
// Warum nicht die beiden alten Webseiten: sie werden abgelöst (Jonas,
// 13.09.). Eine neue Seite, die ihre Termine von der Seite holt, die sie
// ersetzen soll, wäre am Tag der Abschaltung leer. Der Ticketdienst dagegen
// bleibt - dort wird ohnehin verkauft.
//
// Die Eventseite des Dienstes trägt ihre Daten fertig im Quelltext, in einer
// Zeile `window.event = {...};`. Das ist kein Umweg über eine Oberfläche,
// sondern derselbe Datensatz, den die Seite selbst anzeigt.
//
// Was der Dienst NICHT hergibt, sind die Preise der Kategorien - die lädt
// sein Kassenteil später nach. Preise stehen deshalb weiter in unserer
// eigenen Liste (site/data/events.json), und wo wir keine haben, nennt die
// Kachel eben keine. Geraten wird nichts.

/**
 * Die Abende, die wir zeigen - je Abend die Kennung, unter der beim
 * Ticketdienst verkauft wird. Das ist die einzige Liste, die von Hand
 * gepflegt wird; alles andere steht beim Dienst.
 *
 * Warum im Code und nicht nur in einer Datei: der Dienst muss auch dann
 * eine Liste haben, wenn er frisch aufgesetzt wird und noch nichts
 * gespeichert ist. Kommt ein Abend dazu, wandert seine Kennung hierher -
 * und der Dienst holt den Rest selbst.
 */
export const KENNUNGEN = [
  'comedynacht-05-2026-1', 'comedynacht-06-2026-1', 'dinner-comedy-04-2026',
  'dinner-comedy-05-2026', 'dinner-comedy-06-2026', 'dinner-comedy-07-2026',
  'einarsson-2027', 'genussroute', 'genussroute-6850',
  'hader-02-2026', 'hanskaspasenkel-2026', 'kellner-2026',
  'krauthobel-2026', 'kulis-02-2026', 'kulis-03-2026',
  'kulturimhaus-h2026', 'landert-2026', 'luis-02-2026',
  'luis-03-2026', 'luis-2026', 'meyle-2026',
  'neuschmid-voegel-02-2026', 'notenlos-2026', 'philippsmusikzimmer-02-2026',
  'rebeltell-2026', 'rock4-2026-only', 'singmit-2026',
  'spoerk-2026', 'themonroes-2026', 'ullitroy-01-2026',
  'ullitroy-02-2026'
];

/** Wie lange ein gelesener Termin als frisch gilt. */
export const FRISCH_MS = 12 * 60 * 60 * 1000;

export const seiteFuer = kennung => `https://www.ticketist.io/events/${kennung}`;

/** Aus "2026-10-08T20:00:00+02:00" wird { datum: '2026-10-08', zeit: '20:00' }. */
export function ausZeitpunkt(wert) {
  const treffer = String(wert || '').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (!treffer) return { datum: '', zeit: '' };
  return { datum: treffer[1], zeit: `${treffer[2]}:${treffer[3]}` };
}

/**
 * Welches Haus spielt? Der Ort entscheidet, nicht der Veranstalter: beide
 * Häuser treten unter "Emma & Eugen" auf, gespielt wird aber einmal am
 * Rathausplatz und einmal in der Bahnhofstraße.
 */
export function hausAusOrt(ort) {
  return /kulturhaus/i.test(String(ort || '')) ? 'kulturhaus' : 'wirtschaft';
}

/**
 * Die Zeile `window.event = {...};` aus der Seite schneiden. Von Hand und
 * nicht mit einem HTML-Zerleger: gesucht wird eine JSON-Klammer, und die
 * findet man zuverlässiger durch Zählen als durch Raten mit einem Ausdruck,
 * der an jedem `}` in der Beschreibung scheitern kann.
 */
export function schneideJson(html, name = 'window.event') {
  const text = String(html || '');
  const start = text.indexOf(`${name} = {`);
  if (start === -1) return null;
  let i = text.indexOf('{', start);
  let tiefe = 0;
  let inText = false;
  let maskiert = false;
  for (let n = i; n < text.length; n += 1) {
    const z = text[n];
    if (maskiert) { maskiert = false; continue; }
    if (z === '\\') { maskiert = true; continue; }
    if (z === '"') { inText = !inText; continue; }
    if (inText) continue;
    if (z === '{') tiefe += 1;
    if (z === '}') {
      tiefe -= 1;
      if (tiefe === 0) {
        try { return JSON.parse(text.slice(i, n + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

/**
 * Eine Eventseite des Dienstes in unseren Termin verwandeln. Fehlt das
 * Nötigste - Name oder Zeitpunkt -, kommt null zurück; ein halber Termin
 * ist schlimmer als keiner.
 */
export function leseTermin(html, kennung) {
  const roh = schneideJson(html);
  if (!roh) return null;
  const { datum, zeit } = ausZeitpunkt(roh.startAt);
  const name = String(roh.name || '').trim();
  if (!datum || !name) return null;

  const ort = String(roh.location?.name || '').trim();
  // Der Dienst schickt in seinen Texten Zeilentrenner (U+2028) mit; sie
  // kommen aus dem Redaktionswerkzeug und wuerden hier als Kaestchen
  // erscheinen. Absaetze werden zu einem Leerzeichen - die Kachel zeigt
  // ohnehin nur den Anfang.
  const beschreibung = String(roh.description || '')
    .replace(/[\u2028\u2029]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    id: kennung,
    date: datum,
    zeit,
    title: name,
    untertitel: String(roh.subtitle || '').trim(),
    ort,
    haus: hausAusOrt(ort),
    // Die Straße gehört dazu: "Kulturhaus Dornbirn" sagt einem Auswärtigen
    // noch nicht, wo er hin soll.
    adresse: [roh.location?.address?.street, roh.location?.address?.city].filter(Boolean).join(', '),
    beschreibung: beschreibung.slice(0, 600),
    bildQuelle: String(roh.image?.url || '').trim(),
    ticketUrl: seiteFuer(kennung),
    // Zwei Wege zur selben Auskunft: der Schalter des Dienstes - und der
    // Satz, den das Haus in die Beschreibung schreibt, wenn nichts mehr da
    // ist ("Diese Veranstaltung ist ausverkauft"). Beim Luis-Abend am
    // 13.10. stand der Satz da, waehrend der Schalter noch auf offen
    // stand; eine Kachel mit "Tickets buchen" waere eine Luege gewesen.
    buchbar: roh.canTicketsBePurchased !== false && !/^diese veranstaltung ist ausverkauft/i.test(beschreibung)
  };
}

/** Ein Termin, der sich anzeigen lässt. */
export function terminGueltig(termin) {
  return Boolean(termin && termin.id && termin.date && termin.title && termin.ticketUrl);
}

/**
 * Einen Termin holen. Wirft nicht - der Aufrufer behält bei null einfach
 * seinen alten Stand.
 */
export async function holeTermin(kennung, fetchImpl = fetch) {
  try {
    const antwort = await fetchImpl(seiteFuer(kennung), {
      headers: { 'user-agent': 'wirtschaft-dornbirn-events/1.0 (+https://wirtschaft-dornbirn.at)' },
      cf: { cacheTtl: 900, cacheEverything: true }
    });
    if (!antwort.ok) return null;
    const termin = leseTermin(await antwort.text(), kennung);
    return terminGueltig(termin) ? termin : null;
  } catch {
    return null;
  }
}
