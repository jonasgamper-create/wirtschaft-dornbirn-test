// Takeaway zum Mittag: bestellen, abholen, fertig. Reine Logik ohne
// Cloudflare, DOM oder Systemuhr - `npm run ci` spielt sie in Node durch,
// der Worker nutzt dieselben Funktionen.
//
// Die Karte kommt aus der woechentlichen Mittagskarte: der Wirt fuegt die
// Zeilen aus seinem PDF ein, pro Zeile links das Gericht, rechts der Preis.

import { istTelefon } from './kontakt.mjs';

/** Letzte Bestellung. Danach ist die Kueche im Abschluss. */
export const BESTELLSCHLUSS = '13:45';
/** Spaeteste Abholung - eine Viertelstunde nach dem Bestellschluss. */
export const LETZTE_ABHOLUNG = '14:00';
/** Fruehester Vorlauf einer Bestellung in Minuten. */
export const WARTEZEIT_MIN = 20;
/** Was die Seite als Richtwert nennt. */
export const WARTEZEIT_TEXT = '20–30 Minuten';
/** Hoechstens so viele Portionen je Bestellung - darueber bitte anrufen. */
export const MAX_PORTIONEN = 10;

/**
 * Wie weit im Voraus bestellt werden darf. Drei Wochen sind grosszuegig fuer
 * ein Mittagsgeschaeft; weiter voraus steht die Karte ohnehin nicht fest, und
 * eine Bestellung auf ein Gericht, das es dann nicht gibt, waere eine leere
 * Zusage.
 */
export const VORAUS_TAGE = 21;

const DATUM = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Wie viele Portionen die Kueche in einer Viertelstunde bequem schafft.
 *
 * Bis hierher ist die Zeit ohne Einschraenkung waehlbar. Es ist keine Sperre,
 * sondern die Grenze der Bequemlichkeit.
 */
export const PORTIONEN_PRO_SLOT = 12;

/**
 * Ab hier wird gar nichts mehr angenommen.
 *
 * Dazwischen liegt bewusst ein breiter Bereich: eine Bestellung abzulehnen,
 * obwohl die Kueche sie mit etwas Verzug noch schafft, waere ein verlorener
 * Gast wegen einer Zahl. In diesem Bereich wird angenommen und ehrlich
 * gesagt, dass es etwas laenger dauern kann - so wie es der Wirt am Telefon
 * auch machen wuerde. Erst darueber verweist der Dienst auf eine andere Zeit,
 * denn irgendwann ist eine Zusage nicht mehr zu halten.
 */
export const PORTIONEN_HART = 24;

/** Wie voll eine Abholzeit ist: bequem, eng oder zu. */
export function slotLage(belegt, dazu = 0) {
  const summe = belegt + dazu;
  if (summe <= PORTIONEN_PRO_SLOT) return 'frei';
  if (summe <= PORTIONEN_HART) return 'eng';
  return 'voll';
}

/** Wie viele Portionen zu einer Abholzeit schon bestellt sind. */
export function portionenImSlot(bestellungen, datum, zeit) {
  return (bestellungen || [])
    .filter(bestellung => bestellung.date === datum && bestellung.abholzeit === zeit)
    .reduce((summe, bestellung) => summe
      + (bestellung.posten || []).reduce((n, posten) => n + posten.menge, 0), 0);
}

/**
 * Welche Abholzeiten an einem Tag noch Luft haben. Die Gaesteseite graut die
 * vollen aus - dieselbe Loesung wie bei den Uhrzeiten der Reservierung, und
 * dieselbe Begruendung: lieber vorher sehen als hinterher abgewiesen werden.
 */
export function freieSlots({ bestellungen, datum, portionen = 1, vorbestellung = false, jetzt = null }) {
  const von = zuMinuten(vorbestellung || !jetzt ? ERSTE_ABHOLUNG : jetzt);
  const bis = zuMinuten(LETZTE_ABHOLUNG);
  const erste = vorbestellung || !jetzt
    ? zuMinuten(ERSTE_ABHOLUNG)
    : Math.max(Math.ceil((von + WARTEZEIT_MIN) / 15) * 15, zuMinuten(ERSTE_ABHOLUNG));

  const slots = [];
  for (let zeit = erste; zeit <= bis; zeit += 15) {
    const alsText = alsZeit(zeit);
    const belegt = portionenImSlot(bestellungen, datum, alsText);
    const lage = slotLage(belegt, portionen);
    // `frei` heisst waehlbar - eng zaehlt dazu. Nur `voll` ist gesperrt.
    //
    // `rest` ist, was zu dieser Zeit noch bestellbar ist. Die Gaesteseite zeigt
    // die Zahl erst, wenn sie klein wird: eine Restangabe bei leerem Mittag
    // erzeugt nur Druck, wo keiner ist. Die Grenze steht bewusst nur hier -
    // eine zweite Kopie im Browser waere die naechste Stelle, die auseinander
    // laeuft, sobald jemand die Kueche anders einschaetzt.
    slots.push({ zeit: alsText, frei: lage !== 'voll', lage, belegt, rest: Math.max(0, PORTIONEN_HART - belegt) });
  }
  return slots;
}

const zuMinuten = wert => {
  const treffer = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(wert || ''));
  return treffer ? Number(treffer[1]) * 60 + Number(treffer[2]) : null;
};
const alsZeit = minuten => {
  const h = Math.floor(minuten / 60) % 24;
  const m = minuten % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Die oesterreichischen Allergen-Codes nach Allergeninformationsverordnung.
 * Der Wirt schreibt sie in Klammern hinter das Gericht - "(A,C,G)" -,
 * genau wie auf jeder gedruckten Karte im Land.
 */
export const ALLERGENE = {
  A: 'Glutenhaltiges Getreide',
  B: 'Krebstiere',
  C: 'Eier',
  D: 'Fisch',
  E: 'Erdnüsse',
  F: 'Sojabohnen',
  G: 'Milch oder Laktose',
  H: 'Schalenfrüchte',
  L: 'Sellerie',
  M: 'Senf',
  N: 'Sesam',
  O: 'Schwefeldioxid und Sulfite',
  P: 'Lupinen',
  R: 'Weichtiere'
};

/**
 * Zeilen der Mittagskarte in Gerichte verwandeln. Pro Zeile links der Name,
 * dahinter optional die Allergene in Klammern, rechts der Preis - genau so,
 * wie die Karte im PDF aussieht. Zeilen ohne Preis (Ueberschriften,
 * Grussworte) fallen still weg; der Wirt sieht das Ergebnis vor dem
 * Veroeffentlichen.
 */
export function parseKarte(text) {
  const gerichte = [];
  for (const roh of String(text || '').split(/\r?\n/)) {
    const zeile = roh.trim().replace(/\s+/g, ' ');
    if (!zeile) continue;
    // Preis am Zeilenende: "€ 12,50", "12,50 €", "12.50" - mit oder ohne Zeichen.
    const treffer = /^(.*?)[\s.·…]*(?:€\s*)?(\d{1,3}[.,]\d{2})\s*(?:€|EUR)?\s*$/i.exec(zeile);
    if (!treffer) continue;
    let name = treffer[1].replace(/[\s.·…\-–]+$/, '').trim().slice(0, 80);
    const preis = Number(treffer[2].replace(',', '.'));

    // Allergene in Klammern hinter dem Namen: "(A,C,G)". Nur bekannte
    // Buchstaben zaehlen - eine Klammer wie "(hausgemacht)" bleibt Name.
    let allergene = [];
    const klammer = /\(([A-Ra-r](?:\s*[,/]\s*[A-Ra-r])*)\)$/.exec(name);
    if (klammer) {
      allergene = [...new Set(klammer[1].toUpperCase().split(/[,/]/).map(code => code.trim()))]
        .filter(code => ALLERGENE[code]);
      name = name.slice(0, klammer.index).replace(/[\s.·…\-–]+$/, '').trim();
    }

    if (name.length < 2 || !Number.isFinite(preis) || preis <= 0 || preis > 500) continue;
    gerichte.push({ id: `g${gerichte.length + 1}`, name, preis: Math.round(preis * 100) / 100, allergene });
  }
  // Mehr als 30 Gerichte sind keine Mittagskarte mehr, sondern ein Versehen.
  return gerichte.slice(0, 30);
}

/** Preis als Text, wie er auf der Karte steht. */
export const alsPreis = wert => `€ ${Number(wert).toFixed(2).replace('.', ',')}`;

/**
 * Wann die Bestellung abholbereit ist. "sofort" heisst: eine halbe Stunde ab
 * jetzt, auf fuenf Minuten gerundet - die Kueche verspricht 20 bis 30 Minuten
 * und haelt lieber das obere Ende. Ein Wunschtermin muss den Vorlauf lassen
 * und vor Ladenschluss liegen.
 */
/** Frueheste Abholung an einem Tag, an dem noch nicht gekocht wurde. */
export const ERSTE_ABHOLUNG = '11:30';

/**
 * Der naechste Tag, an dem gekocht wird. Samstag und Sonntag fallen aus -
 * und alles, was `zu` enthaelt: Feiertage und vom Wirt gesperrte Tage. Die
 * Menge kommt von aussen, damit diese Datei rein bleibt und der Aufrufer
 * entscheidet, was "zu" heisst.
 */
export function naechsterWerktag(datum, zu = new Set()) {
  const tag = new Date(`${datum}T12:00:00Z`);
  if (Number.isNaN(tag.getTime())) return datum;
  let schritte = 0;
  do {
    tag.setUTCDate(tag.getUTCDate() + 1);
    schritte += 1;
  } while (schritte < 60
    && (tag.getUTCDay() === 0 || tag.getUTCDay() === 6 || zu.has(tag.toISOString().slice(0, 10))));
  return tag.toISOString().slice(0, 10);
}

/**
 * Darf fuer diesen Tag bestellt werden? Der Gast darf den Abholtag selbst
 * waehlen - aber nicht jeden: kein Wochenende, kein Feiertag, kein
 * zugesperrter Tag, nichts Vergangenes und nichts, was zu weit voraus liegt.
 * Und der heutige Tag nur, solange die Kueche noch annimmt.
 *
 * Gibt entweder { ok: true } oder den Grund zurueck - denselben Wortlaut, den
 * die Gaesteseite in einen Satz verwandelt.
 */
export function pruefeWunschtag(datum, { heute, jetzt, zu = new Set() }) {
  if (!DATUM.test(String(datum || ''))) return { ok: false, grund: 'datum' };
  if (datum < heute) return { ok: false, grund: 'vergangen' };

  const grenze = new Date(`${heute}T12:00:00Z`);
  grenze.setUTCDate(grenze.getUTCDate() + VORAUS_TAGE);
  if (datum > grenze.toISOString().slice(0, 10)) return { ok: false, grund: 'zu_weit' };

  const wochentag = new Date(`${datum}T12:00:00Z`).getUTCDay();
  if (wochentag === 0 || wochentag === 6) return { ok: false, grund: 'wochenende' };
  if (zu.has(String(datum))) return { ok: false, grund: 'geschlossen' };

  // Heute geht nur, solange die Kueche noch annimmt.
  if (datum === heute) {
    const start = zuMinuten(jetzt);
    if (start !== null && start > zuMinuten(BESTELLSCHLUSS)) return { ok: false, grund: 'schluss' };
  }
  return { ok: true };
}

/**
 * Fuer welchen Tag gilt eine Bestellung, die gerade hereinkommt?
 *
 * Solange die Kueche kocht, fuer heute. Danach - und am Wochenende - fuer den
 * naechsten Werktag. Ohne das waere die Seite abends tot, obwohl der Gast
 * genau dann plant, was er morgen mitnimmt. Die Regel des Hauses bleibt
 * unangetastet: nach 13:45 kommt nichts mehr in die heutige Kueche.
 */
export function bestelltag({ heute, jetzt, zu = new Set() }) {
  const wochentag = new Date(`${heute}T12:00:00Z`).getUTCDay();
  const werktag = wochentag >= 1 && wochentag <= 5 && !zu.has(heute);
  const start = zuMinuten(jetzt);
  if (werktag && start !== null && start <= zuMinuten(BESTELLSCHLUSS)) {
    return { datum: heute, vorbestellung: false };
  }
  return { datum: naechsterWerktag(heute, zu), vorbestellung: true };
}

export function abholzeitFuer(jetzt, wunsch = 'sofort', { vorbestellung = false } = {}) {
  // Vorbestellung: die Uhr von heute sagt nichts ueber morgen. Es zaehlt nur,
  // dass die Zeit im Abholfenster liegt - "sofort" gibt es dann nicht, also
  // wird daraus der erste Slot.
  if (vorbestellung) {
    const gewuenscht = wunsch === 'sofort' || !wunsch
      ? zuMinuten(ERSTE_ABHOLUNG)
      : zuMinuten(String(wunsch));
    if (gewuenscht === null) return { ok: false, grund: 'zeit' };
    if (gewuenscht % 15 !== 0) return { ok: false, grund: 'zeit' };
    if (gewuenscht < zuMinuten(ERSTE_ABHOLUNG)) return { ok: false, grund: 'zu_frueh' };
    if (gewuenscht > zuMinuten(LETZTE_ABHOLUNG)) return { ok: false, grund: 'schluss' };
    return { ok: true, zeit: alsZeit(gewuenscht) };
  }
  const start = zuMinuten(jetzt);
  if (start === null) return { ok: false, grund: 'zeit' };
  if (wunsch === 'sofort') {
    // Vor der ersten Abholzeit heisst "so bald wie moeglich" nicht "in einer
    // halben Stunde", sondern "sobald die Kueche aufsperrt". Ohne diese
    // Untergrenze bekam ein Gast, der um neun auf die Karte schaut, die
    // Zusage "abholbereit heute ca. 09:30 Uhr" - eine Zeit, zu der niemand
    // da ist.
    const fertig = Math.max(Math.ceil((start + 30) / 5) * 5, zuMinuten(ERSTE_ABHOLUNG));
    if (fertig > zuMinuten(LETZTE_ABHOLUNG)) return { ok: false, grund: 'schluss' };
    return { ok: true, zeit: alsZeit(fertig) };
  }
  const gewuenscht = zuMinuten(wunsch);
  if (gewuenscht === null) return { ok: false, grund: 'zeit' };
  if (gewuenscht % 15 !== 0) return { ok: false, grund: 'zeit' };
  // Dieselbe Untergrenze fuer eine selbst gewaehlte Zeit: wer frueh am Tag
  // bestellt, haette sonst 10:30 waehlen koennen - die Wartezeit stimmte,
  // die Oeffnungszeit nicht.
  if (gewuenscht < zuMinuten(ERSTE_ABHOLUNG)) return { ok: false, grund: 'zu_frueh' };
  if (gewuenscht < start + WARTEZEIT_MIN) return { ok: false, grund: 'zu_frueh' };
  if (gewuenscht > zuMinuten(LETZTE_ABHOLUNG)) return { ok: false, grund: 'schluss' };
  return { ok: true, zeit: alsZeit(gewuenscht) };
}

/**
 * Eine Bestellung von aussen pruefen - streng, wie jede Eingabe von aussen.
 * `gerichte` ist die veroeffentlichte Karte, `jetzt` die Uhrzeit im Haus.
 */
export function pruefeBestellung(roh, { gerichte, heute, jetzt, bestehende = [], zu = new Set() }) {
  const name = String(roh?.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
  if (name.length < 2) return { ok: false, grund: 'name' };

  const telefon = String(roh?.telefon ?? '').trim().slice(0, 25);
  if (!istTelefon(telefon)) return { ok: false, grund: 'telefon' };

  // Fuer welchen Tag das gilt: normalerweise entscheidet die Uhr - heute,
  // solange die Kueche kocht, sonst der naechste Tag, an dem gekocht wird.
  // Nennt der Gast einen Wunschtag, gilt der - aber er muss durch dieselbe
  // Pruefung wie alles andere. Ein Feld, das der Dienst blind uebernimmt,
  // waere eine Tuer an der Kapazitaets- und Feiertagsgrenze vorbei.
  const wunsch = String(roh?.datum ?? '').trim();
  let tag;
  if (wunsch) {
    const erlaubt = pruefeWunschtag(wunsch, { heute, jetzt, zu });
    if (!erlaubt.ok) return { ok: false, grund: erlaubt.grund };
    tag = { datum: wunsch, vorbestellung: wunsch !== heute };
  } else {
    tag = bestelltag({ heute, jetzt, zu });
  }

  const karte = new Map((gerichte || []).map(gericht => [gericht.id, gericht]));
  if (!karte.size) return { ok: false, grund: 'karte' };

  const posten = [];
  for (const eintrag of Array.isArray(roh?.posten) ? roh.posten.slice(0, 30) : []) {
    const gericht = karte.get(String(eintrag?.id || ''));
    const menge = Math.trunc(Number(eintrag?.menge));
    if (!gericht || !Number.isFinite(menge) || menge < 1) continue;
    posten.push({ id: gericht.id, name: gericht.name, preis: gericht.preis, menge: Math.min(menge, MAX_PORTIONEN) });
  }
  if (!posten.length) return { ok: false, grund: 'leer' };
  const portionen = posten.reduce((sum, eintrag) => sum + eintrag.menge, 0);
  if (portionen > MAX_PORTIONEN) return { ok: false, grund: 'zu_viel' };

  const abholung = abholzeitFuer(
    jetzt,
    roh?.abholung === 'sofort' || !roh?.abholung ? 'sofort' : String(roh.abholung),
    { vorbestellung: tag.vorbestellung }
  );
  if (!abholung.ok) return { ok: false, grund: abholung.grund };

  // Die Kueche ist die eigentliche Grenze, nicht der Speicher. Passt die
  // Bestellung nicht mehr in die Viertelstunde, bekommt der Gast die
  // naechsten freien Zeiten genannt - eine Zusage, die niemand halten kann,
  // waere schlimmer als ein "geht erst um 12:30".
  const schon = portionenImSlot(bestehende, tag.datum, abholung.zeit);
  const lage = slotLage(schon, portionen);
  if (lage === 'voll') {
    return {
      ok: false,
      grund: 'slot_voll',
      frei: freieSlots({
        bestellungen: bestehende, datum: tag.datum, portionen,
        vorbestellung: tag.vorbestellung, jetzt
      }).filter(slot => slot.lage === 'frei').map(slot => slot.zeit).slice(0, 4)
    };
  }

  const summe = Math.round(posten.reduce((sum, eintrag) => sum + eintrag.preis * eintrag.menge, 0) * 100) / 100;
  return {
    ok: true,
    bestellung: {
      name, telefon, posten, summe,
      date: tag.datum,
      abholzeit: abholung.zeit,
      // Der Wirt muss auf einen Blick sehen, dass das nicht fuer heute ist.
      vorbestellung: tag.vorbestellung,
      // Eng heisst: angenommen, aber es kann laenger dauern. Der Gast erfaehrt
      // das sofort - und der Wirt sieht es in seiner Liste.
      eng: lage === 'eng'
    }
  };
}

/**
 * Was laeuft gut? Zaehlt je Gericht die verkauften Portionen - das Protokoll
 * fuer den Einkauf: was oft geht, steht naechste Woche wieder auf der Karte.
 */
/**
 * Der Kuechenzettel: wie viel wird heute ungefaehr gebraucht?
 *
 * Drei Zahlen, die im Haus wirklich vorliegen, statt einer Prognose, die
 * Genauigkeit vortaeuscht:
 *
 *   - schon bestellt: die Takeaway-Portionen des Tages. Das ist eine Tatsache,
 *     keine Schaetzung, und steht deshalb unveraendert im Zettel.
 *   - erwartete Gaeste: die Personen aus den Reservierungen des Tages.
 *   - Verteilung: welcher Anteil der bisherigen Portionen auf welches Gericht
 *     fiel. Aus der eigenen Vergangenheit gerechnet, nicht geraten.
 *
 * Die Empfehlung ist die Summe aus dem Bestellten und dem, was die erwarteten
 * Gaeste nach bisheriger Verteilung waehlen duerften. Ohne Vergangenheit wird
 * gleichmaessig verteilt - und der Zettel sagt das dann auch, statt eine
 * Erfahrung zu behaupten, die es noch nicht gibt.
 */
export function kuechenzettel({ gerichte = [], bestellungen = [], parties = [], date, historie = null }) {
  const heutige = bestellungen.filter(bestellung => bestellung.date === date);
  const vergangene = Array.isArray(historie)
    ? historie
    : bestellungen.filter(bestellung => bestellung.date !== date);

  // Anteile aus der Vergangenheit. Nur Gerichte, die heute auf der Karte
  // stehen, zaehlen mit: ein Anteil fuer ein Gericht, das es nicht gibt,
  // verschoebe die Empfehlung aller anderen nach unten.
  const aufDerKarte = new Set(gerichte.map(gericht => gericht.name));
  const frueher = new Map();
  let frueherGesamt = 0;
  for (const bestellung of vergangene) {
    for (const posten of bestellung.posten || []) {
      if (!aufDerKarte.has(posten.name)) continue;
      frueher.set(posten.name, (frueher.get(posten.name) || 0) + posten.menge);
      frueherGesamt += posten.menge;
    }
  }

  const bestelltJe = new Map();
  let bestelltGesamt = 0;
  for (const bestellung of heutige) {
    for (const posten of bestellung.posten || []) {
      bestelltJe.set(posten.name, (bestelltJe.get(posten.name) || 0) + posten.menge);
      bestelltGesamt += posten.menge;
    }
  }

  const erwarteteGaeste = parties
    .filter(party => party.date === date)
    .reduce((summe, party) => summe + (Number(party.guests) || 0), 0);

  const ausErfahrung = frueherGesamt > 0;
  const zeilen = gerichte.map(gericht => {
    const anteil = ausErfahrung
      ? (frueher.get(gericht.name) || 0) / frueherGesamt
      : 1 / Math.max(1, gerichte.length);
    const bestellt = bestelltJe.get(gericht.name) || 0;
    return {
      name: gericht.name,
      bestellt,
      // Aufgerundet: eine Portion zu wenig steht als "ausverkauft" auf der
      // Karte, eine zu viel ist das Personalessen.
      empfohlen: bestellt + Math.ceil(erwarteteGaeste * anteil),
      anteil: Math.round(anteil * 100)
    };
  });

  return {
    date,
    erwarteteGaeste,
    bestelltGesamt,
    ausErfahrung,
    // Worauf die Verteilung beruht - ohne diese Zahl ist ein Anteil von 40 %
    // nicht einzuordnen: aus vier Portionen oder aus vierhundert?
    grundlage: frueherGesamt,
    zeilen: zeilen.sort((a, b) => b.empfohlen - a.empfohlen)
  };
}

export function statistik(bestellungen) {
  const jeGericht = new Map();
  let gesamt = 0;
  let umsatz = 0;
  for (const bestellung of bestellungen || []) {
    for (const eintrag of bestellung.posten || []) {
      const stand = jeGericht.get(eintrag.name) || { name: eintrag.name, portionen: 0, umsatz: 0 };
      stand.portionen += eintrag.menge;
      stand.umsatz = Math.round((stand.umsatz + eintrag.preis * eintrag.menge) * 100) / 100;
      jeGericht.set(eintrag.name, stand);
      gesamt += eintrag.menge;
      umsatz += eintrag.preis * eintrag.menge;
    }
  }
  return {
    bestellungen: (bestellungen || []).length,
    portionen: gesamt,
    umsatz: Math.round(umsatz * 100) / 100,
    gerichte: [...jeGericht.values()].sort((a, b) => b.portionen - a.portionen)
  };
}
