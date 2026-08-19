// Gastprofile: wiedererkennen, wer schon einmal da war.
//
// Wieder ein eigener Baustein mit eigenem Speicher, aus demselben Grund wie
// beim Newsletter: ein anderer Zweck und eine andere Rechtsgrundlage. Die
// Reservierung selbst steht auf Art. 6 Abs. 1 lit. b DSGVO und wird nach
// dreissig Tagen geloescht. Das Profil ueberlebt sie - es steht auf einer
// Einwilligung (lit. a) und muss deshalb getrennt widerrufbar und getrennt
// loeschbar sein.
//
// Zwei Entscheidungen, die diesen Baustein pruegen:
//
// Erstens speichert er die Kontaktdaten nicht. Der Schluessel ist ein Hash
// der Adresse oder Nummer - er genuegt zum Wiedererkennen beim naechsten Mal
// und traegt selbst keine Adresse. Wer die Datenbank sieht, sieht nicht, wer
// diese Gaeste sind; die Namen stehen in der Reservierung, und die verfaellt.
//
// Zweitens sind Unvertraeglichkeiten Gesundheitsdaten nach Art. 9 DSGVO. Sie
// verlangen eine eigene, ausdrueckliche Einwilligung - die allgemeine
// "merkt euch meine Angaben" genuegt dafuer ausdruecklich nicht. Deshalb
// zwei Einwilligungen, zwei Wortlaute, zwei Widerrufe.

/** Wortlaut der Einwilligungen. Mitgespeichert - sonst ist der Nachweis wertlos. */
export const WORTLAUT_VERSION = '2026-08-19';

export const WORTLAUT_PROFIL = 'Ich bin einverstanden, dass sich die Wirtschaft Dornbirn meine '
  + 'Angaben für den nächsten Besuch merkt. Ich kann das jederzeit widerrufen.';

export const WORTLAUT_GESUNDHEIT = 'Ich bin ausdrücklich einverstanden, dass meine Angabe zu '
  + 'Unverträglichkeiten gespeichert wird, damit die Küche beim nächsten Besuch darauf Rücksicht '
  + 'nehmen kann. Ich kann das jederzeit widerrufen.';

/**
 * Wie lange ein Profil ohne Besuch bestehen bleibt. Zwei Jahre: lang genug,
 * dass ein Gast, der einmal im Jahr kommt, wiedererkannt wird - kurz genug,
 * dass niemand unbegrenzt in einer Datei steht, den das Haus nie wiedersieht.
 */
export const PROFIL_TAGE = 730;

/** Hoechstlaenge der Notizfelder. Ein Profil ist keine Akte. */
export const MAX_NOTIZ = 140;

/**
 * Der Schluessel eines Gastes: ein Hash aus Mailadresse oder Telefonnummer.
 * Beides wird vorher vereinheitlicht, sonst waeren "+43 660 123" und
 * "+43660123" zwei verschiedene Gaeste.
 *
 * Die Mailadresse gewinnt, wenn beides da ist: sie aendert sich seltener als
 * eine Nummer und wird seltener von zwei Personen geteilt.
 */
export async function schluesselFuer(kontakt) {
  const roh = kontakt?.email
    ? String(kontakt.email).trim().toLowerCase()
    : String(kontakt?.telefon ?? '').replace(/[^\d+]/g, '');
  if (roh.length < 5) return null;
  const bytes = new TextEncoder().encode(`wirtschaft-gast:${roh}`);
  const summe = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(summe)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Was von aussen kommt, ist unbekannt - auch die Einwilligung. */
export function pruefeWunsch(roh) {
  const merken = roh?.merken === true;
  const unvertraeglichkeit = String(roh?.unvertraeglichkeit ?? '')
    .replace(/\s+/g, ' ').trim().slice(0, MAX_NOTIZ);
  const gesundheit = roh?.gesundheit === true;

  // Eine Unvertraeglichkeit ohne die ausdrueckliche Einwilligung wird nicht
  // gespeichert - auch dann nicht, wenn sie im Feld steht. Das ist kein
  // Formfehler, den man grosszuegig auslegen darf: es sind Gesundheitsdaten.
  if (unvertraeglichkeit && !gesundheit) {
    return { ok: true, merken, unvertraeglichkeit: '', gesundheit: false, verworfen: true };
  }
  // Und ohne das grundsaetzliche Merken gibt es kein Profil, in dem eine
  // Unvertraeglichkeit ueberhaupt stehen koennte.
  if (!merken) return { ok: true, merken: false, unvertraeglichkeit: '', gesundheit: false };
  return { ok: true, merken, unvertraeglichkeit, gesundheit: gesundheit && Boolean(unvertraeglichkeit) };
}

/**
 * Einen Besuch ins Profil schreiben. Legt es an, wenn es noch keines gibt.
 * `jetzt` kommt von aussen, nie aus der Systemuhr - sonst waere die Funktion
 * nicht pruefbar.
 */
export function zaehleBesuch(profil, { jetzt, wunsch, datum }) {
  const basis = profil || {
    besuche: 0,
    seit: jetzt,
    unvertraeglichkeit: null,
    // Der Wortlaut, dem zugestimmt wurde. Ohne ihn laesst sich spaeter nicht
    // sagen, worin der Gast eingewilligt hat.
    einwilligung: null,
    einwilligungGesundheit: null
  };

  const naechstes = {
    ...basis,
    besuche: basis.besuche + 1,
    zuletzt: datum,
    gesehen: jetzt,
    einwilligung: basis.einwilligung || { wortlaut: WORTLAUT_PROFIL, version: WORTLAUT_VERSION, seit: jetzt }
  };

  // Eine neue Angabe ersetzt die alte; eine leere loescht sie nicht
  // stillschweigend - dafuer gibt es den Widerruf.
  if (wunsch?.gesundheit && wunsch.unvertraeglichkeit) {
    naechstes.unvertraeglichkeit = wunsch.unvertraeglichkeit;
    naechstes.einwilligungGesundheit = {
      wortlaut: WORTLAUT_GESUNDHEIT, version: WORTLAUT_VERSION, seit: jetzt
    };
  }
  return naechstes;
}

/**
 * Was der Wirt sehen darf. Bewusst knapp: eine Zahl und, falls vorhanden, die
 * Unvertraeglichkeit. Kein Datum des letzten Besuchs, keine Historie - das
 * Haus soll den Gast begruessen koennen, nicht ihn beobachten.
 */
export function fuerDenWirt(profil) {
  if (!profil || !profil.besuche) return null;
  return {
    besuche: profil.besuche,
    unvertraeglichkeit: profil.unvertraeglichkeit || null
  };
}

/**
 * Den Widerruf ausfuehren. `alles` loescht das Profil, `gesundheit` nur die
 * Unvertraeglichkeit - die beiden Einwilligungen sind getrennt gegeben und
 * muessen getrennt zurueckgenommen werden koennen.
 */
export function widerrufe(profil, umfang = 'alles') {
  if (!profil) return null;
  if (umfang === 'gesundheit') {
    return { ...profil, unvertraeglichkeit: null, einwilligungGesundheit: null };
  }
  return null;
}

/** Profile ohne Besuch seit der Frist fallen weg. */
export function raeumeAufProfile(eintraege, jetzt, tage = PROFIL_TAGE) {
  const grenze = new Date(jetzt);
  if (Number.isNaN(grenze.getTime())) return eintraege;
  grenze.setUTCDate(grenze.getUTCDate() - tage);
  const alsText = grenze.toISOString();
  return eintraege.filter(eintrag => String(eintrag.gesehen || '') >= alsText);
}
