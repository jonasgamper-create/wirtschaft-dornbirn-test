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
  'faschingsball', 'faschingsball-only', 'comedynacht-01-2027', 'comedynacht-02-2027',
  'comedynacht-05-2026-1', 'comedynacht-06-2026-1', 'dabado-charity',
  'dabado-charity-dinner', 'dinner-comedy-04-2026', 'dinner-comedy-04-only-2026',
  'dinner-comedy-05-2026', 'dinner-comedy-05-only-2026', 'dinner-comedy-06-2026',
  'dinner-comedy-06-only-2026', 'dinner-comedy-07-2026', 'dinner-comedy-07-only-2026',
  'einarsson-sitzplatz-2027', 'einarsson-stehplatz-2027', 'genussroute',
  'hader-02-2026', 'hanskaspasenkel-2026', 'hanskaspasenkel-2026-only',
  'kellner-2026', 'kellner-2026-only', 'krauthobel-2026',
  'krauthobel-2026-only', 'kulis-02-2026', 'kulis-03-2026',
  'kulturimhaus-h2026', 'landert-2026', 'luis-02-2026',
  'luis-03-2026', 'luis-2026', 'meyle-2026',
  'neuschmid-voegel-02-2026', 'notenlos-2026', 'notenlos-2026-only',
  'philippsmusikzimmer-02-2026', 'philippsmusikzimmer-02-only-2026', 'rebeltell-2026',
  'rebeltell-2026-only', 'rock4-2026', 'rock4-2026-only',
  'singmit-konzertonly', 'spoerk-2026', 'spoerk-2026-only',
  'themonroes-2026', 'themonroes-2026-only', 'ullitroy-brunch-2026',
  'ullitroy-menue-2026'
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
  const verkaufsstart = String(roh.salesStartAt || '').trim();
  const vorverkauf = Boolean(verkaufsstart) && Number.isFinite(Date.parse(verkaufsstart)) && Date.parse(verkaufsstart) > Date.now();

  return {
    id: kennung,
    // Die Nummer des Abends beim Dienst. Ueber sie ist oeffentlich lesbar,
    // wie viele Karten verkauft sind - siehe holeVerkauft().
    eventId: Number(roh.id) || null,
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
    buchbar: (roh.canTicketsBePurchased !== false || vorverkauf) && !/^diese veranstaltung ist ausverkauft/i.test(beschreibung),
    // Der Vorverkauf hat noch nicht begonnen (salesStartAt liegt in der
    // Zukunft): der Schalter steht dann auf "zu", aber der Abend ist nicht
    // ausverkauft - er ist noch nicht dran. Ohne dieses Feld stand ein neuer
    // Abend bis zum Verkaufsstart als "ausverkauft" mit Warteliste da.
    verkaufsstart: verkaufsstart || null
  };
}

/** Ein Termin, der sich anzeigen lässt. */
export function terminGueltig(termin) {
  return Boolean(termin && termin.id && termin.date && termin.title && termin.ticketUrl);
}

/**
 * Ein Abend, zwei Wege zur Karte.
 *
 * Das Haus verkauft viele Abende zweimal: einmal als "dinner & comedy" um
 * 19 Uhr (Essen und Vorstellung) und einmal als "comedy only" um 21 Uhr
 * (nur die Vorstellung, Stehplatz). Beim Ticketdienst sind das zwei
 * getrennte Veranstaltungen mit eigenem Namen, eigener Kennung, eigenem
 * Preis - fuer den Gast ist es EIN Abend mit zwei Moeglichkeiten.
 *
 * Erkannt wird das am Namen: der zweite heisst wie der erste, dann ein
 * Trennzeichen, dann die Art des Zugangs.
 *
 *   "dinner & comedy"  +  "dinner & comedy | comedy only"
 *   "Dabado Charity • Clubbing II"  +  "... - Dinner & Konzert"
 *   "Thorsteinn Einarsson"  +  "Thorsteinn Einarsson | Sitzplatz"
 *
 * Zusammengefasst wird nur, was am selben Tag im selben Haus stattfindet -
 * zwei Luis-Abende an zwei Tagen bleiben zwei Abende (Jonas, 14.09.).
 */
const TRENNER = /\s+[|\u2013-]\s+/;

const schluessel = termin => `${termin.date}|${termin.haus}`;
const normal = wert => String(wert || '').toLowerCase().replace(/\s+/g, ' ').trim();

export function gruppiere(termine) {
  const nachTag = new Map();
  for (const termin of termine) {
    const k = schluessel(termin);
    if (!nachTag.has(k)) nachTag.set(k, []);
    nachTag.get(k).push(termin);
  }

  const raus = [];
  for (const gruppe of nachTag.values()) {
    // Der kuerzeste Name zuerst: er ist der Abend, alles Weitere ein Zugang.
    const sortiert = gruppe.slice().sort((a, b) => a.title.length - b.title.length
      || String(a.zeit).localeCompare(String(b.zeit)));
    const vergeben = new Set();

    for (const haupt of sortiert) {
      if (vergeben.has(haupt.id)) continue;
      vergeben.add(haupt.id);
      const varianten = [];
      for (const anderer of sortiert) {
        if (vergeben.has(anderer.id)) continue;
        const rest = normal(anderer.title).startsWith(normal(haupt.title))
          ? anderer.title.slice(haupt.title.length)
          : '';
        if (!rest || !TRENNER.test(rest)) continue;
        vergeben.add(anderer.id);
        varianten.push({
          id: anderer.id,
          // Was nach dem Trennzeichen steht, ist die Beschriftung des
          // zweiten Knopfes: "comedy only", "Sitzplatz", "Dinner & Konzert".
          label: rest.replace(TRENNER, '').trim(),
          zeit: anderer.zeit,
          ticketUrl: anderer.ticketUrl,
          buchbar: anderer.buchbar
        });
      }
      // Geschwister ohne gemeinsamen Hauptnamen (30.09., Faschingsball):
      // "Faschingsball | Sitzplatz" und "Faschingsball | Stehplatz" - keiner
      // ist der Anfang des anderen, beide teilen aber den Teil vor dem
      // Trennzeichen. Dann heisst der Abend wie dieser Teil, und jeder Weg
      // traegt seinen Rest als Beschriftung.
      if (!varianten.length) {
        const [basis, ...eigen] = haupt.title.split(TRENNER);
        if (eigen.length) {
          for (const anderer of sortiert) {
            if (vergeben.has(anderer.id)) continue;
            const [ab, ...ar] = anderer.title.split(TRENNER);
            if (!ar.length || normal(ab) !== normal(basis)) continue;
            vergeben.add(anderer.id);
            varianten.push({
              id: anderer.id, label: ar.join(' | ').trim(), zeit: anderer.zeit,
              ticketUrl: anderer.ticketUrl, buchbar: anderer.buchbar
            });
          }
          if (varianten.length) {
            raus.push({ ...haupt, title: basis.trim(), wegLabel: eigen.join(' | ').trim(), varianten });
            continue;
          }
        }
      }
      raus.push(varianten.length ? { ...haupt, varianten } : haupt);
    }
  }

  raus.sort((a, b) => a.date.localeCompare(b.date) || String(a.zeit).localeCompare(String(b.zeit)));
  return raus;
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

/**
 * Wie viele Karten fuer diesen Abend verkauft sind.
 *
 * Der Ticketdienst gibt das oeffentlich heraus (`/api/events/<nummer>`,
 * Feld `ticketCount`) - im Gegensatz zu den Preisen und den Restkarten.
 * Gemessen am 20.09.2026: Kulis 07.10. 774 verkauft bei 0 frei laut
 * Kartenliste, Kulis 08.10. 676 verkauft bei 93 frei. Die Zahl ist also
 * die VERKAUFTEN Karten, und Platzangebot = verkauft + frei.
 *
 * Wozu wir sie brauchen: der Schalter des Dienstes sagt nur, ob der Verkauf
 * offen ist. Ob Karten zurueckkommen, sagt er nicht - die Zahl schon. Faellt
 * sie unter ihren Hoechststand, ist wieder etwas zu haben, und genau darauf
 * wartet die Warteliste.
 *
 * Wirft nicht: ohne Zahl bleibt der bisherige Stand.
 */
export async function holeVerkauft(eventId, fetchImpl = fetch) {
  if (!Number.isFinite(Number(eventId))) return null;
  try {
    const antwort = await fetchImpl(`https://www.ticketist.io/api/events/${Number(eventId)}`, {
      headers: { 'user-agent': 'wirtschaft-dornbirn-events/1.0 (+https://wirtschaft-dornbirn.at)' },
      cf: { cacheTtl: 900, cacheEverything: true }
    });
    if (!antwort.ok) return null;
    const daten = await antwort.json();
    const zahl = Number(daten?.ticketCount);
    return Number.isFinite(zahl) && zahl >= 0 ? zahl : null;
  } catch {
    return null;
  }
}

/** Die Kennung aus einem Link auf den Ticketdienst - oder aus sich selbst. */
export function kennungAusLink(wert) {
  const text = String(wert || '').trim();
  const ausLink = text.match(/\/events\/([a-z0-9-]+)/);
  const kennung = (ausLink ? ausLink[1] : text).toLowerCase();
  return /^[a-z0-9-]{3,60}$/.test(kennung) ? kennung : '';
}

/**
 * Neue Abende finden, ohne beim Ticketdienst herumzusuchen (Jonas, 30.09.).
 * Der Ticketdienst hat keine oeffentliche Liste je Veranstalter. Die eigenen
 * Eventseiten des Hauses verlinken aber jeden Abend auf seine Ticketseite -
 * dort steht die Kennung. Gelesen werden nur diese eigenen Seiten und ihre
 * Unterseiten, nie fremde Kennungen durchprobiert.
 */
export const QUELLSEITEN = [
  'https://wirtschaft-dornbirn.at/event/',
  'https://www.eugen.family/event/'
];

/** Alle Ticketist-Kennungen, die in einem Stueck HTML verlinkt sind. */
export function kennungenIn(html) {
  return [...new Set([...String(html || '').matchAll(/ticketist\.io\/events\/([a-zA-Z0-9-]{3,60})/g)]
    .map(m => m[1].toLowerCase()))];
}

/** Die Unterseiten einer Eventliste (gleicher Host, unter /event/). */
export function unterseitenIn(html, basis) {
  const host = new URL(basis).host.replace(/^www\./, '');
  const raus = new Set();
  for (const m of String(html || '').matchAll(/href="(https?:\/\/[^"#?]+\/event\/[^"#?]+)"/g)) {
    try {
      const u = new URL(m[1]);
      if (u.host.replace(/^www\./, '') === host && u.pathname.replace(/\/+$/, '') !== '/event') raus.add(u.href);
    } catch { /* kaputter Link, weiter */ }
  }
  return [...raus];
}

/**
 * Die Quellseiten lesen und alle verlinkten Kennungen zurueckgeben.
 * `gesehen` ist ein Merker Unterseite -> Kennungen: Unterseiten, die schon
 * einmal gelesen wurden, werden nicht noch einmal geholt - so bleibt ein
 * Durchgang bei zwei Abrufen, wenn nichts Neues dazugekommen ist.
 */
export async function entdecke(gesehen = {}, { hol = fetch, hoechstens = 20 } = {}) {
  const lies = async url => {
    try {
      const antwort = await hol(url, { headers: { 'user-agent': 'Mozilla/5.0 (Wirtschaft Dornbirn Terminabgleich)' } });
      return antwort.ok ? await antwort.text() : '';
    } catch { return ''; }
  };
  const kennungen = new Set();
  const merker = { ...gesehen };
  let neuGelesen = 0;
  // Blaetterseiten (/event/page/2/ ...) sind Listen, keine Abende: ihr Inhalt
  // rutscht weiter, sobald vorne ein Abend dazukommt. Sie werden JEDES Mal
  // gelesen (01.10.: 28 neue Abende standen auf page/2-4, die der Merker
  // fuer erledigt hielt). Gemerkt werden nur einzelne Abendseiten.
  const istListe = url => /\/page\/\d+\/?$/.test(new URL(url).pathname);
  for (const start of QUELLSEITEN) {
    const listen = [start];
    const besucht = new Set();
    while (listen.length && besucht.size < 10) {
      const liste = listen.shift();
      if (besucht.has(liste)) continue;
      besucht.add(liste);
      const html = await lies(liste);
      kennungenIn(html).forEach(k => kennungen.add(k));
      for (const seite of unterseitenIn(html, start)) {
        if (istListe(seite)) { if (!besucht.has(seite)) listen.push(seite); continue; }
        if (!Array.isArray(merker[seite])) {
          if (neuGelesen >= hoechstens) continue;
          merker[seite] = kennungenIn(await lies(seite));
          neuGelesen += 1;
        }
        merker[seite].forEach(k => kennungen.add(k));
      }
    }
  }
  // Alte Eintraege fuer Blaetterseiten aus dem Merker raeumen.
  for (const url of Object.keys(merker)) { try { if (istListe(url)) delete merker[url]; } catch { delete merker[url]; } }
  return { kennungen: [...kennungen], gesehen: merker, neuGelesen };
}
