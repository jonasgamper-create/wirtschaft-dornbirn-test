// Die Warteliste: wenn der Mittag voll ist, traegt sich der Gast ein - und
// wird automatisch verstaendigt, sobald durch eine Absage etwas frei wird.
//
// Das ist der Baustein, den die teuren Werkzeuge als Hauptargument fuehren.
// Er braucht keine Zahlungsdaten und kein Konto: eine Mailadresse, ein Datum,
// eine Personenzahl. Die Adresse lebt nur bis zum Tag selbst - danach raeumt
// sie sich weg, denn eine Warteliste fuer gestern wartet auf nichts.
//
// Reihenfolge ist Ehrlichkeit: Wer zuerst wartet, erfaehrt es zuerst. Die
// Meldung reserviert nichts - sie oeffnet die Tuer, gebucht wird ueber den
// normalen Weg mit denselben Grenzen. So kann die Warteliste nie an der
// Kapazitaetspruefung vorbei buchen.

const MAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** Mehr waere keine Warteliste mehr, sondern ein Verteiler. */
export const HOECHSTENS_JE_TAG = 30;

/** Einen Eintrag von aussen pruefen. */
export function pruefeWartelisteEintrag(roh) {
  const name = String(roh?.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
  if (name.length < 2) return { ok: false, grund: 'name' };
  const email = String(roh?.email ?? '').trim().toLowerCase().slice(0, 120);
  if (!MAIL.test(email)) return { ok: false, grund: 'mail' };
  const datum = String(roh?.datum ?? '').trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(datum)) return { ok: false, grund: 'datum' };
  const personen = Math.trunc(Number(roh?.personen));
  if (!Number.isFinite(personen) || personen < 1 || personen > 20) return { ok: false, grund: 'personen' };
  return { ok: true, eintrag: { name, email, datum, personen } };
}

/**
 * Einen Eintrag aufnehmen. Dieselbe Adresse steht je Tag nur einmal auf der
 * Liste - zweimal eintragen heisst nicht zweimal drankommen.
 */
export function nimmAuf(liste, eintrag, jetzt) {
  const vorhandene = (liste || []).filter(alt => alt.datum === eintrag.datum);
  if (vorhandene.some(alt => alt.email === eintrag.email)) return { ok: true, schon: true, liste };
  if (vorhandene.length >= HOECHSTENS_JE_TAG) return { ok: false, grund: 'voll' };
  return {
    ok: true,
    liste: [...(liste || []), { ...eintrag, status: 'wartet', eingetragen: jetzt }]
  };
}

/**
 * Wer als Naechstes drankommt, wenn an einem Tag etwas frei wird: der
 * aelteste noch wartende Eintrag mit hoechstens so vielen Personen wie frei
 * geworden sind. Eine Sechsergruppe zu rufen, weil ein Zweiertisch frei
 * wurde, waere eine Einladung zur Enttaeuschung.
 */
export function naechsterWartender(liste, datum, freiePersonen) {
  return (liste || [])
    .filter(eintrag => eintrag.datum === datum
      && eintrag.status === 'wartet'
      && eintrag.personen <= freiePersonen)
    .sort((a, b) => String(a.eingetragen).localeCompare(String(b.eingetragen)))[0] || null;
}

/** Einen Eintrag als verstaendigt markieren. Gibt eine NEUE Liste zurueck. */
export function markiereInformiert(liste, eintrag, jetzt) {
  return (liste || []).map(alt =>
    alt.datum === eintrag.datum && alt.email === eintrag.email
      ? { ...alt, status: 'informiert', informiertUm: jetzt }
      : alt);
}

/**
 * Vergangenes raeumt sich weg - mitsamt der Mailadresse. Die Warteliste ist
 * kein Verteiler: was der Tag nicht mehr braucht, behaelt niemand.
 */
export function raeumeWartelisteAb(liste, heute) {
  return (liste || []).filter(eintrag => eintrag.datum >= String(heute || ''));
}
