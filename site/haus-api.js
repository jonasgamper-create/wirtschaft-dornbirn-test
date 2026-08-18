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

/** Wo die aktuelle Mittagskarte liegt - oder null, wenn kein Dienst da ist. */
export async function karteAdresse() {
  const basis = await apiAdresse();
  return basis ? `${basis}/mittagskarte.pdf` : null;
}

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

/** Die Ampel: wie voll ist der Mittag heute. Oeffentlich, nur Zahlen. */
export const holeAmpel = datum =>
  ruf(`/api/ampel?datum=${encodeURIComponent(datum)}`);

export const holeStand = token => ruf('/api/stand', { token });

/** Laufkundschaft: der Dienst setzt die Gruppe sofort auf einen freien Tisch. */
export const sendeLaufkunde = (token, personen) =>
  ruf('/api/laufkunde', { methode: 'POST', koerper: { personen }, token });

export const sendePlan = (token, koerper) => ruf('/api/plan', { methode: 'POST', koerper, token });

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
