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

export const holeStand = token => ruf('/api/stand', { token });

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
export async function bleibVerbunden(token, beiAenderung, beiZustand = () => {}) {
  const basis = await apiAdresse();
  if (!basis || !token) return () => {};

  let socket = null;
  let versuch = 0;
  let beendet = false;
  let timer = null;

  const verbinde = () => {
    if (beendet) return;
    const adresse = `${basis.replace(/^http/, 'ws')}/api/live?token=${encodeURIComponent(token)}`;
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
