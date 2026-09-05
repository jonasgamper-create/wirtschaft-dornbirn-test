// Zugang zum Reservierungsdienst. Gemeinsam genutzt von der Gaesteseite, der
// internen Planung und dem Bildschirm am Eingang.
//
// Grundsatz: ohne eingetragene Adresse ist alles wie vorher. Faellt der Dienst
// aus, arbeitet der Tischplan im Haus weiter - er ist nie davon abhaengig.
// Ein Werkzeug, das beim ersten Netzproblem stehen bleibt, ist im Mittag
// schlimmer als gar keins.

const KONFIG = 'data/haus.json';
const TOKEN_SCHLUESSEL = 'wirtschaft-haus-token';

let gemerkt = null;

/** Adresse des Dienstes, oder null wenn er nicht eingerichtet ist. */
export async function apiAdresse() {
  if (gemerkt !== null) return gemerkt;
  // In der Einzeldatei steht die Adresse im Dokument: sie liegt allein unter
  // /tischplan/ und kann data/haus.json nicht nachladen.
  const eingebettet = String(window.WIRTSCHAFT_HAUS?.api || '').trim().replace(/\/+$/, '');
  if (eingebettet) {
    gemerkt = /^https?:\/\//.test(eingebettet) ? eingebettet : '';
    return gemerkt;
  }
  try {
    const antwort = await fetch(`${KONFIG}?t=${Date.now()}`, { cache: 'no-store' });
    const daten = await antwort.json();
    const adresse = String(daten?.api || '').trim().replace(/\/+$/, '');
    gemerkt = /^https?:\/\//.test(adresse) ? adresse : '';
  } catch {
    gemerkt = '';
  }
  return gemerkt;
}

/**
 * Ein Geraet ueber einen Link einrichten. Der Schluessel steht hinter dem
 * Doppelkreuz: dieser Teil einer Adresse wird nie an einen Server geschickt,
 * er bleibt im Browser. Direkt nach dem Uebernehmen wird er aus der Adresszeile
 * entfernt, damit er nicht im Verlauf stehen bleibt.
 */
export function schluesselAusAdresse() {
  const roh = window.location.hash || '';
  const treffer = /(?:^#|&)k=([^&]+)/.exec(roh);
  if (!treffer) return false;
  try {
    const wert = decodeURIComponent(treffer[1]).trim();
    if (wert.length < 8) return false;
    localStorage.setItem(TOKEN_SCHLUESSEL, wert);
  } catch {
    return false;
  }
  // Aus der Adresszeile nehmen, ohne einen Eintrag im Verlauf zu hinterlassen.
  const sauber = window.location.href.split('#')[0];
  window.history.replaceState(null, '', sauber);
  return true;
}

export const hausToken = () => {
  try { return localStorage.getItem(TOKEN_SCHLUESSEL) || ''; } catch { return ''; }
};
export const setzeToken = wert => {
  try {
    if (wert) localStorage.setItem(TOKEN_SCHLUESSEL, wert);
    else localStorage.removeItem(TOKEN_SCHLUESSEL);
  } catch { /* privater Modus */ }
};

async function ruf(pfad, { methode = 'GET', koerper = null, token = null } = {}) {
  const basis = await apiAdresse();
  if (!basis) return { ok: false, grund: 'aus' };
  const kopf = {};
  if (koerper) kopf['content-type'] = 'application/json';
  if (token) kopf['x-haus-token'] = token;
  try {
    const antwort = await fetch(`${basis}${pfad}`, {
      method: methode,
      headers: kopf,
      body: koerper ? JSON.stringify(koerper) : undefined
    });
    const daten = await antwort.json().catch(() => ({}));
    if (antwort.status === 401) return { ok: false, grund: 'token' };
    return daten;
  } catch {
    // Netzfehler sind kein Grund, die Seite anzuhalten.
    return { ok: false, grund: 'netz' };
  }
}

/** Gaestebuchung. Braucht keinen Token - sonst stuende er auf der Gaesteseite. */
export const buche = anfrage => ruf('/api/reservierung', { methode: 'POST', koerper: anfrage });

/**
 * Anmeldung zur Mittagskarte. Eigener Weg, eigener Zweck - sie haengt an
 * keiner Reservierung und ist nie Bedingung dafuer. Gueltig wird sie erst mit
 * dem Klick in der Bestaetigungsmail; hier passiert nur die Anfrage.
 *
 * Fehler bleiben still: eine misslungene Anmeldung darf eine gelungene
 * Reservierung nicht wie einen Fehlschlag aussehen lassen.
 */
export const meldeMittagskarte = (email, quelle = 'seite') =>
  ruf('/api/newsletter', { methode: 'POST', koerper: { email, quelle, einwilligung: true } });

/**
 * Wo die aktuelle Mittagskarte liegt - oder null, wenn kein Dienst da ist.
 * Mit der Auskunft von holeKarteInfo: ist die Karte ein gesetzter Menueplan
 * (art "plan"), liegt sie als Seite neben dieser hier; sonst als PDF beim
 * Dienst. Ohne Auskunft wie frueher: das PDF.
 */
export async function karteAdresse(info = null) {
  if (info?.art === 'plan') return info.pfad || 'mittagskarte.html';
  const basis = await apiAdresse();
  return basis ? `${basis}/mittagskarte.pdf` : null;
}

/**
 * Der Menueplan der Woche - oeffentlich, er steht ohnehin auf der Seite.
 * Die Antwort traegt zusaetzlich `entwurf`: den Vorschlag fuer die kommende
 * Woche, den der Dienst Freitagabend anlegt. Er ist Arbeitsstand des
 * Hauses; die Gaesteseiten lesen ihn nicht.
 */
export const holeMenueplan = () => ruf('/api/menueplan');

/** Der Wirt setzt den Plan; der Dienst prueft und nennt, was nicht passt. */
export const sendeMenueplan = (token, plan) =>
  ruf('/api/menueplan', { methode: 'POST', koerper: plan, token });

export const loescheMenueplan = token =>
  ruf('/api/menueplan', { methode: 'DELETE', token });

/**
 * Die Woche von Hand vorruecken: legt den Entwurf fuer die kommende Woche
 * an. Denselben Weg geht der Dienst Freitagabend von selbst.
 */
export const rueckeWocheVor = token =>
  ruf('/api/menueplan', { methode: 'PUT', token });

/** Gibt es eine Karte, und von wann ist sie? Oeffentlich, ohne Inhalt. */
export const holeKarteInfo = () => ruf('/api/mittagskarte');

/**
 * Die Karte hochladen. Die Datei geht unveraendert als Koerper hinaus; der
 * Dienst prueft selbst, ob es wirklich ein PDF ist - der Dateiname hier ist
 * nur eine Behauptung.
 */
export async function sendeKarte(token, datei) {
  const basis = await apiAdresse();
  if (!basis) return { ok: false, grund: 'aus' };
  try {
    const antwort = await fetch(`${basis}/api/mittagskarte`, {
      method: 'POST',
      headers: { 'content-type': 'application/pdf', 'x-haus-token': token || '' },
      body: datei
    });
    const daten = await antwort.json().catch(() => ({}));
    if (antwort.status === 401) return { ok: false, grund: 'token' };
    return daten;
  } catch {
    return { ok: false, grund: 'netz' };
  }
}

export async function loescheKarte(token) {
  const basis = await apiAdresse();
  if (!basis) return { ok: false, grund: 'aus' };
  try {
    const antwort = await fetch(`${basis}/api/mittagskarte`, {
      method: 'DELETE',
      headers: { 'x-haus-token': token || '' }
    });
    const daten = await antwort.json().catch(() => ({}));
    if (antwort.status === 401) return { ok: false, grund: 'token' };
    return daten;
  } catch {
    return { ok: false, grund: 'netz' };
  }
}

/**
 * Laeuft der Dienst offen, also ohne Hausschluessel? Die Oberflaeche fragt das
 * einmal beim Start: sie soll weder nach etwas fragen, das nicht gebraucht
 * wird, noch verschweigen, dass gerade jeder mitlesen kann.
 */
export async function istOffen() {
  const antwort = await ruf('/api/gesundheit');
  return antwort?.offen === true;
}

/** Was ist an diesem Tag noch frei? Oeffentlich, ohne Namen. */
export const holeFrei = (datum, personen) =>
  ruf(`/api/frei?datum=${encodeURIComponent(datum)}&personen=${encodeURIComponent(personen)}`);

/** Der Mittag ist voll: auf die Warteliste. Braucht keinen Token. */
export const trageWartelisteEin = eintrag =>
  ruf('/api/warteliste', { methode: 'POST', koerper: eintrag });

/** Welche Tage der Wirt zugesperrt hat. Oeffentlich - die Seite graut sie aus. */
export const holeGeschlossen = () => ruf('/api/geschlossen');

/** Die Ampel: wie voll ist der Mittag heute. Oeffentlich, nur Zahlen. */
export const holeAmpel = datum =>
  ruf(`/api/ampel?datum=${encodeURIComponent(datum)}`);

// ---- Takeaway --------------------------------------------------------------

/** Die bestellbare Karte: Gerichte und Preise. Oeffentlich. */
// Ohne Datum antwortet der Dienst fuer den Tag, an dem als naechstes gekocht
// wird. Mit Datum prueft er den Wunschtag und sagt, wenn er nicht geht.
export const holeTakeawayKarte = (datum = '') =>
  ruf(`/api/takeaway/karte${datum ? `?datum=${encodeURIComponent(datum)}` : ''}`);

/** Eine Bestellung aufgeben. Braucht keinen Token - sie kommt vom Gast. */
export const bestelleTakeaway = bestellung =>
  ruf('/api/takeaway/bestellung', { methode: 'POST', koerper: bestellung });

/** Der Stand der eigenen Bestellung. Der Schluessel ist der Ausweis. */
export const holeBestellStatus = schluessel =>
  ruf(`/api/takeaway/status?t=${encodeURIComponent(schluessel)}`);

/** Der Wirt setzt die Karte: die Zeilen aus dem Mittagskarten-PDF. */
export const sendeTakeawayKarte = (token, text) =>
  ruf('/api/takeaway/karte', { methode: 'POST', koerper: { text }, token });

/** Abgeholt, zurueckgenommen, entfernt. */
export const sendeTakeawayAktion = (token, befehl) =>
  ruf('/api/takeaway/aktion', { methode: 'POST', koerper: befehl, token });

/** Das Protokoll der letzten 30 Tage - was lief gut. */
export const holeTakeawayProtokoll = token => ruf('/api/takeaway/protokoll', { token });

// ---- Abholmeldung aufs Geraet ----------------------------------------------
//
// Kein Hausschluessel: der Bestellschluessel des Gastes ist der Ausweis,
// genau wie bei seiner Statusabfrage. Er kann damit ausschliesslich sein
// eigenes Geraet eintragen.

/** Der oeffentliche Absenderausweis - er gehoert in die Seite, ist kein Geheimnis. */
export const holePushSchluessel = () => ruf('/api/push/schluessel');

/** Push fuers Haus: Stand, anmelden, abmelden - alles mit Hausschluessel. */
export const holeHausPush = token => ruf('/api/push/haus', { token });
export const meldeHausPushAn = (token, anmeldung) =>
  ruf('/api/push/haus', { methode: 'POST', koerper: anmeldung, token });
export const meldeHausPushAb = (token, endpunkt) =>
  ruf('/api/push/haus', { methode: 'DELETE', koerper: { endpunkt }, token });

export const meldePushAn = (token, anmeldung) =>
  ruf('/api/push/anmelden', { methode: 'POST', koerper: { t: token, anmeldung } });

export const meldePushAb = token =>
  ruf('/api/push/abmelden', { methode: 'POST', koerper: { t: token } });

// ---- Eigene Termine des Hauses ---------------------------------------------

/** Oeffentlich: was das Haus selbst angesetzt hat, sortiert nach Datum. */
export const holeEigeneEvents = () => ruf('/api/events');

export const legeEigenesEvent = (token, event) =>
  ruf('/api/events', { methode: 'POST', koerper: event, token });

export const loescheEigenesEvent = (token, id) =>
  ruf('/api/events/entfernen', { methode: 'POST', koerper: { id }, token });

/** Nur fuers Haus: wie viele Mail-Einwilligungen bestehen. Ohne Adressen. */
export const holeNewsletterZahlen = token => ruf('/api/newsletter/zahlen', { token });

/** Wer meldet "Essen fertig": 'kueche', 'wirt' oder 'beide'. */
export const setzeFertigWer = (token, wer) =>
  ruf('/api/takeaway/fertig-wer', { methode: 'POST', koerper: { wer }, token });

/** SMS an den Gast an- oder abschalten. Sie kostet Geld - der Wirt entscheidet. */
export const setzeSms = (token, an) =>
  ruf('/api/sms', { methode: 'POST', koerper: { an }, token });

/** Der Kuechenzettel eines Tages: wie viel wird ungefaehr gebraucht. */
export const holeKuechenzettel = (token, datum) =>
  ruf(`/api/kuechenzettel?datum=${encodeURIComponent(datum)}`, { token });

/** Telefonische Reservierung aus der Wirt-Ansicht: vier Angaben genuegen. */
export const legeEinfach = (token, reservierung) =>
  ruf('/api/reservierung/einfach', { methode: 'POST', koerper: reservierung, token });

/** Tagesabschluss: heute leeren - und sein Rueckgaengig. */
export const leereTag = token => ruf('/api/tag/leeren', { methode: 'POST', koerper: {}, token });
export const stelleTagWiederHer = token =>
  ruf('/api/tag/wiederherstellen', { methode: 'POST', koerper: {}, token });

export const holeStand = token => ruf('/api/stand', { token });

/** Der Monat in Zahlen - anonym gezaehlt, nur mit Hausschluessel lesbar. */
export const holeZahlen = (monat, token) =>
  ruf(`/api/zahlen?monat=${encodeURIComponent(monat || '')}`, { token });

/** Laufkundschaft: der Dienst setzt die Gruppe sofort auf einen freien Tisch. */
export const sendeLaufkunde = (token, personen) =>
  ruf('/api/laufkunde', { methode: 'POST', koerper: { personen }, token });

export const sendePlan = (token, koerper) => ruf('/api/plan', { methode: 'POST', koerper, token });

/** Einen Tag zusperren oder wieder oeffnen - stoppt NEUE Buchungen. */
export const setzeTagZu = (token, datum, zu) =>
  ruf('/api/tag/zu', { methode: 'POST', koerper: { datum, zu }, token });

/** Das Mittagsfenster, wie es auf der Gaesteseite steht. Lesen darf jeder. */
export const holeOeffnung = () => ruf('/api/oeffnung');
export const setzeOeffnung = (token, von, bis) =>
  ruf('/api/oeffnung', { methode: 'POST', koerper: { von, bis }, token });

/** Den ganzen Mittag absagen: Mails an alle Gaeste, Anrufliste fuer den Rest. */
export const sageTagAb = (token, tag, grund) =>
  ruf('/api/aktion', { methode: 'POST', koerper: { art: 'tagesabsage', tag, grund }, token });

/** Tisch sperren oder freigeben - der eine Handgriff des Alltags. */
export const sendeTischsperre = (token, id, gesperrt) =>
  ruf('/api/tisch/sperre', { methode: 'POST', koerper: { id, gesperrt }, token });

export const sendeAktion = (token, befehl) => ruf('/api/aktion', { methode: 'POST', koerper: befehl, token });

export const sendeReservierung = (token, reservierung) =>
  ruf('/api/reservierung/intern', { methode: 'POST', koerper: { reservierung }, token });

/**
 * Live-Draht. Meldet jede Aenderung sofort - ohne Abfragen im Sekundentakt.
 * Bricht die Verbindung ab, wird sie mit wachsendem Abstand neu aufgebaut;
 * ein Bildschirm am Eingang laeuft ueber Wochen und darf nach dem ersten
 * Netzwackler nicht tot sein.
 */
export async function bleibVerbunden(token, beiAenderung, beiZustand = () => {}, rolle = 'haus') {
  const basis = await apiAdresse();
  if (!basis || !token) return () => {};

  let socket = null;
  let versuch = 0;
  let beendet = false;
  let timer = null;

  const verbinde = () => {
    if (beendet) return;
    // Die Rolle entscheidet, was ueber den Draht geht: der Bildschirm im
    // Eingang bekommt keine Kontaktdaten - er zeigt nur Namen und Tische.
    const adresse = `${basis.replace(/^http/, 'ws')}/api/live?token=${encodeURIComponent(token)}`
      + `&rolle=${encodeURIComponent(rolle)}`;
    socket = new WebSocket(adresse);

    socket.addEventListener('open', () => { versuch = 0; beiZustand('verbunden'); });
    socket.addEventListener('message', ereignis => {
      try {
        const paket = JSON.parse(ereignis.data);
        if (paket?.stand) beiAenderung(paket.stand, paket.art);
      } catch { /* unbrauchbares Paket ueberspringen */ }
    });
    const neuVersuchen = () => {
      if (beendet) return;
      beiZustand('getrennt');
      // Hoechstens halbe Minute Abstand: laenger fuehlt sich im Betrieb wie
      // "kaputt" an, kuerzer belastet den Dienst bei einer laengeren Stoerung.
      const abstand = Math.min(30000, 1000 * 2 ** versuch++);
      timer = setTimeout(verbinde, abstand);
    };
    socket.addEventListener('close', neuVersuchen);
    socket.addEventListener('error', () => { try { socket.close(); } catch { /* egal */ } });
  };

  verbinde();
  return () => {
    beendet = true;
    clearTimeout(timer);
    try { socket?.close(); } catch { /* egal */ }
  };
}


// ---- Die Karte zum Mitnehmen aus der Datei ---------------------------------
// Quelle ist data/takeaway-karte.json: die Karte des offiziellen Lieferservice
// (lieferservice.wirtschaft-dornbirn.at), in zwei Gruppen wie dort -
// Wochengerichte und A la carte. Zusage an das Haus: diese Karte steht auf der
// Seite, auch wenn der Bestelldienst nicht laeuft. Bestellt wird dann beim
// offiziellen Dienst oder telefonisch.
export async function holeKarteAusDatei() {
  try {
    const antwort = await fetch('data/takeaway-karte.json', { cache: 'no-store' });
    if (!antwort.ok) return { ok: false, grund: 'datei' };
    const daten = await antwort.json();
    const gruppen = (Array.isArray(daten.gruppen) ? daten.gruppen : [])
      .map(gruppe => ({
        id: gruppe.id,
        titel: gruppe.titel,
        fenster: gruppe.fenster || '',
        hinweis: gruppe.hinweis || '',
        gerichte: (gruppe.gerichte || [])
          .filter(g => g.name && Number.isFinite(g.preis))
          .map(g => ({ id: g.id, name: g.name, beilage: g.beilage || '', preis: g.preis, allergene: g.allergene || [] }))
      }))
      .filter(gruppe => gruppe.gerichte.length);
    if (!gruppen.length) return { ok: false, grund: 'leer' };
    return {
      ok: true,
      nurAnsicht: true,
      quelle: 'datei',
      gruppen,
      gerichte: gruppen.flatMap(gruppe => gruppe.gerichte),
      allergenNamen: daten.allergenNames || {},
      karte: daten.card || null,
      stand: daten.updatedAt || null
    };
  } catch {
    return { ok: false, grund: 'netz' };
  }
}
