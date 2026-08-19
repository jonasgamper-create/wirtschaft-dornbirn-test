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
export function abholzeitFuer(jetzt, wunsch = 'sofort') {
  const start = zuMinuten(jetzt);
  if (start === null) return { ok: false, grund: 'zeit' };
  if (wunsch === 'sofort') {
    const fertig = Math.ceil((start + 30) / 5) * 5;
    if (fertig > zuMinuten(LETZTE_ABHOLUNG)) return { ok: false, grund: 'schluss' };
    return { ok: true, zeit: alsZeit(fertig) };
  }
  const gewuenscht = zuMinuten(wunsch);
  if (gewuenscht === null) return { ok: false, grund: 'zeit' };
  if (gewuenscht % 15 !== 0) return { ok: false, grund: 'zeit' };
  if (gewuenscht < start + WARTEZEIT_MIN) return { ok: false, grund: 'zu_frueh' };
  if (gewuenscht > zuMinuten(LETZTE_ABHOLUNG)) return { ok: false, grund: 'schluss' };
  return { ok: true, zeit: alsZeit(gewuenscht) };
}

/**
 * Eine Bestellung von aussen pruefen - streng, wie jede Eingabe von aussen.
 * `gerichte` ist die veroeffentlichte Karte, `jetzt` die Uhrzeit im Haus.
 */
export function pruefeBestellung(roh, { gerichte, heute, jetzt }) {
  const name = String(roh?.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
  if (name.length < 2) return { ok: false, grund: 'name' };

  const telefon = String(roh?.telefon ?? '').trim().slice(0, 25);
  if (!istTelefon(telefon)) return { ok: false, grund: 'telefon' };

  // Nur werktags, nur solange die Kueche kocht.
  const wochentag = new Date(`${heute}T12:00:00Z`).getUTCDay();
  if (wochentag === 0 || wochentag === 6) return { ok: false, grund: 'wochenende' };
  const start = zuMinuten(jetzt);
  if (start === null || start > zuMinuten(BESTELLSCHLUSS)) return { ok: false, grund: 'schluss' };

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

  const abholung = abholzeitFuer(jetzt, roh?.abholung === 'sofort' || !roh?.abholung ? 'sofort' : String(roh.abholung));
  if (!abholung.ok) return { ok: false, grund: abholung.grund };

  const summe = Math.round(posten.reduce((sum, eintrag) => sum + eintrag.preis * eintrag.menge, 0) * 100) / 100;
  return {
    ok: true,
    bestellung: { name, telefon, posten, summe, date: heute, abholzeit: abholung.zeit }
  };
}

/**
 * Was laeuft gut? Zaehlt je Gericht die verkauften Portionen - das Protokoll
 * fuer den Einkauf: was oft geht, steht naechste Woche wieder auf der Karte.
 */
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
