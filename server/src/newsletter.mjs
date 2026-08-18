// Newsletter-Einwilligungen. Bewusst ein eigener Baustein mit eigenem
// Speicher, getrennt von den Reservierungen.
//
// Der Grund ist kein technischer: es sind zwei verschiedene Zwecke. Die
// Reservierung steht auf Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche
// Massnahme), der Newsletter auf lit. a (Einwilligung). Wer beides in einer
// Tabelle fuehrt, kann die Einwilligung nicht widerrufen, ohne die
// Reservierung anzufassen - und kann bei einer Auskunft nicht sauber sagen,
// was wofuer gespeichert ist. Getrennt heisst: getrennt loeschbar.
//
// Ebenso bewusst: eine Anmeldung bei der Reservierung ist nie eine
// Voraussetzung fuer die Reservierung. Keine Kopplung.

/** Wortlaut der Einwilligung. Wird mitgespeichert - sonst ist der Nachweis wertlos. */
export const WORTLAUT_VERSION = '2026-08-18';
export const WORTLAUT = 'Ich möchte die Mittagskarte der Wirtschaft Dornbirn per E-Mail erhalten. '
  + 'Die Einwilligung kann ich jederzeit über den Abmeldelink in jeder Mail widerrufen.';

/** Wie lange eine unbestaetigte Anmeldung aufbewahrt wird. Ohne Klick keine Einwilligung. */
export const OFFEN_TAGE = 30;

// Absichtlich einfach: eine Adresse mit genau einem @, etwas davor, ein Punkt
// dahinter. Strengere Muster lehnen gueltige Adressen ab, und die Wahrheit
// ueber eine Adresse sagt ohnehin erst die Bestaetigungsmail.
const MAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export const istMail = wert => MAIL.test(String(wert ?? '').trim());

/** Eine Anmeldung von aussen pruefen. */
export function pruefeAnmeldung(roh) {
  const email = String(roh?.email ?? '').trim().toLowerCase().slice(0, 120);
  if (!istMail(email)) return { ok: false, grund: 'mail' };
  // Ohne ausdrueckliches Ja gibt es keine Einwilligung - ein vorausgefuelltes
  // Haekchen oder ein stilles true waere keine.
  if (roh?.einwilligung !== true) return { ok: false, grund: 'einwilligung' };
  const quelle = ['reservierung', 'seite'].includes(roh?.quelle) ? roh.quelle : 'seite';
  return { ok: true, anmeldung: { email, quelle } };
}

/**
 * Ein neuer Eintrag. Status `offen`: bis zur Bestaetigung ist das keine
 * Einwilligung, sondern nur eine Behauptung.
 */
export function machEintrag({ email, quelle, token, jetzt }) {
  return {
    email,
    quelle,
    token,
    status: 'offen',
    wortlaut: WORTLAUT,
    wortlautVersion: WORTLAUT_VERSION,
    angefragtAm: jetzt,
    bestaetigtAm: null
  };
}

/** Der Klick in der Bestaetigungsmail. Erst hier entsteht die Einwilligung. */
export function bestaetige(eintrag, jetzt) {
  if (!eintrag) return { ok: false, grund: 'unbekannt' };
  if (eintrag.status === 'bestaetigt') return { ok: true, eintrag, schon: true };
  return { ok: true, eintrag: { ...eintrag, status: 'bestaetigt', bestaetigtAm: jetzt } };
}

/**
 * Der Widerruf loescht den Eintrag vollstaendig. Zurueck bleibt nur ein
 * Fingerabdruck der Adresse in der Sperrliste - damit dieselbe Adresse bei
 * einem spaeteren Import nicht wieder angeschrieben wird. Aus dem
 * Fingerabdruck laesst sich die Adresse nicht zurueckrechnen; er ist Schutz,
 * nicht Vorrat.
 */
export async function sperrschluessel(email) {
  const bytes = new TextEncoder().encode(`wirtschaft-dornbirn:${String(email).trim().toLowerCase()}`);
  const summe = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(summe)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Was faellt weg: unbestaetigte Anmeldungen nach der Frist. */
export function raeumeAufOffene(eintraege, jetzt, tage = OFFEN_TAGE) {
  const grenze = new Date(jetzt);
  grenze.setUTCDate(grenze.getUTCDate() - tage);
  return eintraege.filter(eintrag => {
    if (eintrag.status === 'bestaetigt') return true;
    return new Date(eintrag.angefragtAm) >= grenze;
  });
}

/** Nur bestaetigte Adressen duerfen angeschrieben werden. */
export const empfaenger = eintraege => eintraege
  .filter(eintrag => eintrag.status === 'bestaetigt')
  .map(eintrag => eintrag.email);
