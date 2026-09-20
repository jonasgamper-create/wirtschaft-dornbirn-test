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

// ---- Was der Wirt mit der Liste tun kann -----------------------------------
//
// Bis zum 21.09.2026 war die Mittags-Warteliste unsichtbar: der Gast trug
// sich ein, der Dienst verstaendigte bei einer Absage automatisch - und im
// Haus sah das niemand. Wer nicht drankam, blieb es stillschweigend. Die
// folgenden Funktionen sind die Grundlage des Abschnitts in der Wirt-Ansicht.
//
// Angesprochen wird ein Eintrag ueber Tag UND Mailadresse: die beiden
// zusammen sind eindeutig, dafuer sorgt nimmAuf().

const gleich = (eintrag, datum, email) =>
  eintrag.datum === String(datum || '') && eintrag.email === String(email || '').trim().toLowerCase();

/**
 * Die Liste fuer den Wirt: je Tag eine Gruppe, aelteste Eintragung zuerst.
 * Vergangenes ist da schon weg (raeumeWartelisteAb).
 */
export function mittagUebersicht(liste, heute) {
  const tage = new Map();
  for (const eintrag of (liste || [])) {
    if (eintrag.datum < String(heute || '')) continue;
    if (!tage.has(eintrag.datum)) tage.set(eintrag.datum, []);
    tage.get(eintrag.datum).push(eintrag);
  }
  return [...tage.entries()]
    .map(([datum, eintraege]) => {
      const sortiert = eintraege.slice()
        .sort((a, b) => String(a.eingetragen).localeCompare(String(b.eingetragen)));
      const wartend = sortiert.filter(e => e.status === 'wartet');
      return {
        datum,
        eintraege: sortiert,
        wartend: wartend.length,
        informiert: sortiert.length - wartend.length,
        personen: wartend.reduce((summe, e) => summe + (Number(e.personen) || 0), 0)
      };
    })
    .sort((a, b) => a.datum.localeCompare(b.datum));
}

/** Einen Eintrag entfernen - samt Adresse. */
export function entferneMittagEintrag(liste, datum, email) {
  return (liste || []).filter(eintrag => !gleich(eintrag, datum, email));
}

/**
 * Den Stand setzen. 'wartet' nimmt eine Verstaendigung zurueck - etwa wenn
 * die Mail nicht ankam und der Gast weiter warten soll.
 */
export function setzeMittagStatus(liste, datum, email, status) {
  if (status !== 'wartet' && status !== 'informiert') return liste;
  return (liste || []).map(eintrag => gleich(eintrag, datum, email)
    ? { ...eintrag, status, informiertUm: status === 'informiert' ? eintrag.informiertUm : null }
    : eintrag);
}

/**
 * Eine Mail ist hinausgegangen - oder es wurde versucht. Beides bleibt
 * sichtbar: ein misslungener Versand ist keine Verstaendigung, und der Wirt
 * muss das sehen, statt sich auf eine Zeile zu verlassen, die nie ankam.
 */
export function merkeMittagMail(liste, datum, email, ergebnis, jetzt) {
  return (liste || []).map(eintrag => {
    if (!gleich(eintrag, datum, email)) return eintrag;
    const mails = [...(eintrag.mails || []), {
      um: jetzt,
      ok: ergebnis?.ok === true,
      grund: ergebnis?.ok ? '' : String(ergebnis?.grund || 'fehler')
    }];
    return ergebnis?.ok
      ? { ...eintrag, mails, status: 'informiert', informiertUm: jetzt }
      : { ...eintrag, mails };
  });
}
