// Die Warteliste fuer ausverkaufte Abende.
//
// Sobald ein Abend beim Ticketdienst ausverkauft ist, gibt es fuer ihn eine
// Warteliste - ohne dass jemand sie anlegen muss. Der Gast traegt sich fuer
// genau den Weg ein, den er wollte (die Kennung beim Ticketdienst: "dinner &
// comedy" am 14.10. ist ein anderer Weg als "comedy only" am selben Abend),
// gern auch fuer mehrere auf einmal. Der Wirt sieht in seiner Ansicht, wer
// wann fuer was angefragt hat, verstaendigt die Wartenden, wenn Karten da
// sind, und sieht, wann die Mail hinausging und ob eine Antwort kam.
//
// Was hier NICHT passiert: reservieren. Die Mail oeffnet die Tuer zum
// Ticketdienst, gekauft wird dort - mit denselben Grenzen wie fuer alle.
//
// Reihenfolge ist Ehrlichkeit: die Liste steht so, wie sie entstanden ist.
// Wer zuerst wartet, steht oben und wird zuerst verstaendigt.
//
// Diese Datei rechnet nur - kein Netz, kein Speicher, keine Uhr. Genau
// deshalb laesst sie sich in Node pruefen (scripts/check-event-warteliste.mjs).

const MAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const KENNUNG = /^[a-z0-9-]{3,60}$/;
const DATUM = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** Mehr waere keine Warteliste mehr, sondern ein Verteiler. */
export const HOECHSTENS_JE_WEG = 200;
/** Ein Gast, hoechstens so viele Wege auf einmal. */
export const HOECHSTENS_WEGE = 8;

export const STATUS = ['wartet', 'informiert', 'gebucht', 'kein_bedarf'];

const putzeName = wert => String(wert ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
const putzeTelefon = wert => String(wert ?? '').trim().replace(/[^\d+()\/\s-]/g, '').replace(/\s+/g, ' ').slice(0, 25);
const putzeNotiz = wert => String(wert ?? '').trim().replace(/\s+/g, ' ').slice(0, 140);

/**
 * Einen Eintrag von aussen pruefen. Zurueck kommt entweder der bereinigte
 * Eintrag oder der erste Grund, warum es keiner ist - derselbe Stil wie bei
 * Bestellung und Reservierung.
 *
 * `bekannt` sind die Kennungen, die es beim Ticketdienst gibt. Alles andere
 * wird nicht angenommen: eine Warteliste fuer einen Abend, den es nicht
 * gibt, wartet auf nichts.
 */
export function pruefeEventWartelisteEintrag(roh, bekannt) {
  const name = putzeName(roh?.name);
  if (name.length < 2) return { ok: false, grund: 'name' };
  const email = String(roh?.email ?? '').trim().toLowerCase().slice(0, 120);
  if (!MAIL.test(email)) return { ok: false, grund: 'mail' };
  const telefon = putzeTelefon(roh?.telefon);
  const personen = Math.trunc(Number(roh?.personen ?? 2));
  if (!Number.isFinite(personen) || personen < 1 || personen > 10) return { ok: false, grund: 'personen' };

  const roheWege = Array.isArray(roh?.wege) ? roh.wege : [roh?.weg];
  const wege = [...new Set(roheWege.map(w => String(w ?? '').trim().toLowerCase()).filter(Boolean))];
  if (!wege.length) return { ok: false, grund: 'weg' };
  if (wege.length > HOECHSTENS_WEGE) return { ok: false, grund: 'wege' };
  const erlaubt = bekannt instanceof Set ? bekannt : new Set(bekannt || []);
  for (const weg of wege) {
    if (!KENNUNG.test(weg) || !erlaubt.has(weg)) return { ok: false, grund: 'weg' };
  }
  return { ok: true, eintrag: { name, email, telefon, personen, wege, notiz: putzeNotiz(roh?.notiz) } };
}

/**
 * Was ueber einen Weg bekannt ist, aus dem Stand des Ticketdienstes.
 * Fehlt er dort (frisch aufgesetzter Dienst), darf der Aufrufer die Angaben
 * des Gastes nehmen - gekuerzt, nicht geglaubt: sie stehen nur beim Wirt.
 */
export function wegAusTermin(termin, kennung, ersatz = {}) {
  if (termin) {
    return {
      weg: kennung,
      titel: String(termin.title || '').slice(0, 120),
      datum: termin.date,
      zeit: termin.zeit || '',
      haus: termin.haus || 'wirtschaft',
      ticketUrl: termin.ticketUrl || ''
    };
  }
  const datum = String(ersatz.datum || '').trim();
  return {
    weg: kennung,
    titel: String(ersatz.titel || kennung).trim().replace(/\s+/g, ' ').slice(0, 120) || kennung,
    datum: DATUM.test(datum) ? datum : '',
    zeit: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(ersatz.zeit || '')) ? ersatz.zeit : '',
    haus: ersatz.haus === 'kulturhaus' ? 'kulturhaus' : 'wirtschaft',
    ticketUrl: ''
  };
}

/**
 * Einen Gast aufnehmen - je Weg ein Eintrag. Dieselbe Adresse steht je Weg
 * nur einmal: zweimal eintragen heisst nicht zweimal drankommen.
 *
 * `neu(weg)` liefert Kennung und Geheimnis fuer einen frischen Eintrag;
 * das kommt von aussen, weil diese Datei keinen Zufall kennt.
 */
export function nimmAufEvent(liste, eintrag, wegeInfo, jetzt, neu, quelle = 'gast') {
  let ergebnis = [...(liste || [])];
  const angelegt = [];
  const schon = [];
  const voll = [];
  for (const weg of eintrag.wege) {
    const vorhandene = ergebnis.filter(alt => alt.weg === weg);
    if (vorhandene.some(alt => alt.email === eintrag.email)) { schon.push(weg); continue; }
    if (vorhandene.length >= HOECHSTENS_JE_WEG) { voll.push(weg); continue; }
    const info = wegeInfo[weg] || wegAusTermin(null, weg);
    const kennung = neu(weg);
    const frisch = {
      id: kennung.id,
      token: kennung.token,
      weg,
      titel: info.titel,
      datum: info.datum,
      zeit: info.zeit,
      haus: info.haus,
      name: eintrag.name,
      email: eintrag.email,
      telefon: eintrag.telefon || '',
      personen: eintrag.personen,
      notiz: eintrag.notiz || '',
      quelle,
      status: 'wartet',
      eingetragen: jetzt,
      mails: [],
      rueckmeldung: null
    };
    ergebnis = [...ergebnis, frisch];
    angelegt.push(frisch);
  }
  return { ok: angelegt.length > 0 || schon.length > 0, liste: ergebnis, angelegt, schon, voll };
}

/**
 * Eine Mail ist hinausgegangen - oder es wurde versucht. Beides wird
 * festgehalten: der Wirt soll sehen, WANN er verstaendigt hat, und ob es
 * geklappt hat. Ein misslungener Versand ist keine Verstaendigung.
 */
export function merkeMail(liste, id, ergebnis, jetzt) {
  return (liste || []).map(eintrag => {
    if (eintrag.id !== id) return eintrag;
    const mails = [...(eintrag.mails || []), { um: jetzt, ok: ergebnis?.ok === true, grund: ergebnis?.ok ? '' : String(ergebnis?.grund || 'fehler') }];
    return {
      ...eintrag,
      mails,
      status: ergebnis?.ok && eintrag.status === 'wartet' ? 'informiert' : eintrag.status
    };
  });
}

/**
 * Den Stand eines Eintrags setzen - vom Wirt (Anruf, Zuruf an der Tuer)
 * oder vom Gast (Klick in der Mail). `zurueck` heisst: wieder warten.
 */
export function setzeStatus(liste, id, status, { von = 'wirt', jetzt = '', notiz } = {}) {
  if (!STATUS.includes(status)) return liste;
  return (liste || []).map(eintrag => {
    if (eintrag.id !== id) return eintrag;
    const naechster = { ...eintrag, status };
    if (notiz !== undefined) naechster.notiz = putzeNotiz(notiz);
    if (status === 'gebucht' || status === 'kein_bedarf') {
      naechster.rueckmeldung = { um: jetzt, art: status, von };
    } else if (status === 'wartet') {
      naechster.rueckmeldung = null;
    }
    return naechster;
  });
}

export function setzeNotiz(liste, id, notiz) {
  return (liste || []).map(eintrag => eintrag.id === id ? { ...eintrag, notiz: putzeNotiz(notiz) } : eintrag);
}

export function entferneEintrag(liste, id) {
  return (liste || []).filter(eintrag => eintrag.id !== id);
}

/**
 * Der Gast antwortet ueber den Link in seiner Mail. Das Geheimnis ist sein
 * Ausweis - es steht nur in seiner Mail. `austragen` loescht den Eintrag
 * ganz; 'gebucht' und 'kein_bedarf' bleiben stehen, damit der Wirt sieht,
 * was aus seiner Verstaendigung wurde.
 */
export function antwortVomGast(liste, token, art, jetzt) {
  const eintrag = (liste || []).find(alt => alt.token && alt.token === String(token || ''));
  if (!eintrag) return { ok: false, grund: 'unbekannt', liste };
  if (art === 'austragen') return { ok: true, eintrag, liste: entferneEintrag(liste, eintrag.id) };
  if (art !== 'gebucht' && art !== 'kein_bedarf') return { ok: false, grund: 'art', liste };
  return { ok: true, eintrag, liste: setzeStatus(liste, eintrag.id, art, { von: 'gast', jetzt }) };
}

/**
 * Vergangenes raeumt sich weg - mitsamt Adresse und Telefonnummer. Eine
 * Warteliste fuer gestern wartet auf nichts. Der Abend selbst bleibt bis
 * Mitternacht; ein Eintrag ohne Datum (Weg unbekannt) bleibt 60 Tage.
 */
export function raeumeEventWartelisteAb(liste, heute) {
  const grenze = new Date(`${heute}T12:00:00Z`);
  grenze.setUTCDate(grenze.getUTCDate() - 60);
  const alt = grenze.toISOString().slice(0, 10);
  return (liste || []).filter(eintrag => eintrag.datum
    ? eintrag.datum >= String(heute || '')
    : String(eintrag.eingetragen || '').slice(0, 10) >= alt);
}

/**
 * Welche Wege seit dem letzten Lesen wieder buchbar geworden sind - das ist
 * der Moment, in dem der Wirt etwas tun kann. Verglichen wird der alte mit
 * dem neuen Stand des Ticketdienstes; gemeldet wird nur, wofuer jemand
 * wartet. Ein Abend, auf den niemand wartet, braucht keine Meldung.
 */
export function wiederBuchbar(alterStand, neuerStand, liste) {
  const wartende = new Set((liste || []).filter(e => e.status === 'wartet').map(e => e.weg));
  const raus = [];
  for (const [kennung, neu] of Object.entries(neuerStand || {})) {
    if (!wartende.has(kennung)) continue;
    const vorher = alterStand?.[kennung]?.termin;
    const jetzt = neu?.termin;
    if (!jetzt || !vorher) continue;
    if (vorher.buchbar === false && jetzt.buchbar !== false) raus.push(kennung);
  }
  return raus;
}

/**
 * Ausverkauft laut der hinterlegten Preisliste: alle Kategorien eines Weges
 * mit 0 frei. Die Zahl ist eine Momentaufnahme aus dem Verwaltungsbereich
 * des Ticketdienstes (site/data/ticketist-preise.json) - dieselbe Regel, mit
 * der die Eventseite ihre Kacheln grau stellt. Der Schalter des Dienstes
 * ("canTicketsBePurchased") sagt naemlich nur, ob der Verkauf offen ist,
 * nicht, ob noch etwas da ist: Kulis am 07.10. war am 14.09. mit 0 frei
 * eingetragen, der Schalter stand weiter auf offen.
 */
export function ausverkauftLautPreisen(preise) {
  const raus = new Set();
  for (const [kennung, kategorien] of Object.entries(preise || {})) {
    if (Array.isArray(kategorien) && kategorien.length && kategorien.every(k => Number(k?.frei) === 0)) raus.add(kennung);
  }
  return raus;
}

/**
 * Die Uebersicht fuer den Wirt: je Weg eine Gruppe - was, wann, ob gerade
 * ausverkauft, und wer wartet. Dabei sind auch die ausverkauften Abende,
 * fuer die noch niemand wartet: die Warteliste gibt es, sobald der Abend
 * ausverkauft ist, nicht erst mit dem ersten Eintrag.
 *
 * `termine` ist der Stand des Ticketdienstes (Kennung -> { termin }).
 */
export function wartelisteUebersicht(liste, termine, heute, lautPreisen = new Set()) {
  const gruppen = new Map();
  const lege = (weg, info) => {
    if (!gruppen.has(weg)) gruppen.set(weg, { ...info, eintraege: [] });
    return gruppen.get(weg);
  };
  // Ausverkauft ist ein Weg, wenn der Dienst es sagt ODER die Preisliste
  // nichts Freies mehr kennt - dieselbe Regel wie auf der Eventseite.
  const weg = kennung => termine?.[kennung]?.termin?.buchbar === false || lautPreisen.has(kennung);
  for (const [kennung, stand] of Object.entries(termine || {})) {
    const termin = stand?.termin;
    if (!termin || termin.date < String(heute || '')) continue;
    if (!weg(kennung)) continue;
    lege(kennung, { ...wegAusTermin(termin, kennung), buchbar: false });
  }
  for (const eintrag of (liste || [])) {
    const termin = termine?.[eintrag.weg]?.termin;
    const gruppe = lege(eintrag.weg, {
      ...wegAusTermin(termin, eintrag.weg, eintrag),
      buchbar: termin ? !weg(eintrag.weg) : null
    });
    gruppe.eintraege.push(eintrag);
  }
  const raus = [...gruppen.values()].map(gruppe => ({
    ...gruppe,
    eintraege: gruppe.eintraege.slice().sort((a, b) => String(a.eingetragen).localeCompare(String(b.eingetragen))),
    wartend: gruppe.eintraege.filter(e => e.status === 'wartet').length,
    informiert: gruppe.eintraege.filter(e => e.status === 'informiert').length,
    personen: gruppe.eintraege.filter(e => e.status === 'wartet' || e.status === 'informiert')
      .reduce((summe, e) => summe + (Number(e.personen) || 0), 0)
  }));
  raus.sort((a, b) => String(a.datum).localeCompare(String(b.datum)) || String(a.zeit).localeCompare(String(b.zeit)) || a.titel.localeCompare(b.titel));
  return raus;
}

/**
 * Die Zahl am Reiter: Wartende, fuer deren Abend es wieder Karten gibt.
 * Das ist die einzige Zahl, die zum Handeln auffordert - solange ein Abend
 * ausverkauft ist, gibt es nichts zu tun.
 */
export function zuVerstaendigen(uebersicht) {
  return (uebersicht || [])
    .filter(gruppe => gruppe.buchbar === true)
    .reduce((summe, gruppe) => summe + gruppe.wartend, 0);
}
