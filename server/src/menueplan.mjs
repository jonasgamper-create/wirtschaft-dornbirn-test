// Der Menueplan der Woche - EINE Quelle fuer drei Gestalten:
//
//   1. die Takeaway-Karte auf der Webseite (je Abholtag nur, was es dort gibt),
//   2. die Mittagskarte zum Ansehen und als PDF (mittagskarte.html),
//   3. die Faltkarte fuer den Tisch (menuekarte-falten.html).
//
// Gegliedert wie die Mittagskarte des Hauses (Stand 31.08.2026): eine Gruppe
// "wochengerichte" mit Zeitfenster und Hinweis, darin die Tagesgerichte
// Montag bis Freitag, Vital- und Vegi-Gericht; eine Gruppe "a la carte" mit
// Zeitfenster; unten eine Fussnote (Bestellung, Allergene). Jede Zeile
// traegt ihren Preis - beim Tagesgericht der Gruppenpreis, ausser es hat
// einen eigenen.
//
// Vorher pflegte der Wirt ein PDF UND eine Textliste - zwei Wahrheiten, die
// auseinanderlaufen konnten. Hier wird geprueft und geglaettet; die reine
// Logik laeuft in Node genauso wie im Worker, deshalb ist sie testbar
// (scripts/check-menueplan.mjs).

import { ALLERGENE } from './takeaway.mjs';

export const WOCHENTAGE = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag'];
const MONATE = ['jänner', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august',
  'september', 'oktober', 'november', 'dezember'];

/** Die Vorgaben - so steht es auf der Karte des Hauses. */
export const VORGABEN = {
  fenster: '11:30 bis 13:00 uhr',
  hinweis: 'diese gerichte ändern sich wöchentlich.',
  alacarteFenster: '11:30 bis 13:00 uhr',
  fussnote: 'takeaway: bestellen auf wirtschaft-dornbirn.at oder telefonisch unter +43 (0)5572 20 540. '
    + 'trotz sorgfältiger zubereitung können unsere gerichte spuren von allergenen enthalten – '
    + 'fragen zu zutaten beantworten wir gerne.'
};

const text = (wert, max) => String(wert ?? '').trim().replace(/\s+/g, ' ').slice(0, max);

/** "15,90", "15.9", 15.9 -> 15.9; alles andere -> null. */
export function alsZahl(wert) {
  const zahl = Number(String(wert ?? '').trim().replace(',', '.'));
  return Number.isFinite(zahl) && zahl > 0 && zahl <= 500 ? Math.round(zahl * 100) / 100 : null;
}

/** "a, c, g" oder "A/C/G" -> ['A', 'C', 'G'] - nur bekannte Codes. */
export function allergenCodes(wert) {
  const codes = String(wert ?? '').toUpperCase().split(/[^A-R]+/).filter(Boolean);
  return [...new Set(codes)].filter(code => ALLERGENE[code]);
}

const alsAllergenText = codes => codes.map(code => code.toLowerCase()).join(', ');

function gericht(roh, { preisPflicht = false } = {}) {
  const name = text(roh?.name, 120);
  if (name.length < 2) return null;
  const preis = alsZahl(roh?.preis);
  if (preisPflicht && preis === null) return null;
  const ergebnis = {
    name,
    beilage: text(roh?.beilage, 220),
    allergene: alsAllergenText(allergenCodes(roh?.allergene)),
    // Der Haken "auch zum mitnehmen": er entscheidet allein, was im
    // Takeaway bestellbar ist. Die Karten zeigen IMMER alles - eine
    // Speisekarte, auf der Gerichte fehlen, weil sie nicht zum Mitnehmen
    // sind, waere am Tisch schlicht falsch. Vorgabe ist "ja": so verhaelt
    // sich ein Plan ohne dieses Feld wie bisher.
    takeaway: roh?.takeaway !== false
  };
  // Beim Tagesgericht ist der Preis die Ausnahme (sonst gilt der Gruppenpreis).
  if (preis !== null) ergebnis.preis = preis;
  return ergebnis;
}

/**
 * Prueft, was der Wirt eingetragen hat, und macht daraus den gespeicherten
 * Plan. Was nicht passt, wird beim Namen genannt - kein stilles Verschlucken.
 * Leere Textfelder (Fenster, Hinweis, Fussnote) bleiben leer: wer die Zeile
 * nicht will, loescht sie; die Vorgabe gilt nur, wenn das Feld gar nicht
 * mitgeschickt wurde.
 */
export function normalisiereMenueplan(roh, stand = new Date().toISOString()) {
  const montag = text(roh?.montag, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(montag)) return { ok: false, grund: 'montag' };
  if (new Date(`${montag}T12:00:00Z`).getUTCDay() !== 1) return { ok: false, grund: 'kein_montag' };

  const mittag = alsZahl(roh?.preise?.mittag);
  if (mittag === null) return { ok: false, grund: 'preis' };
  const vital = alsZahl(roh?.preise?.vital) ?? mittag;

  // Seit 04.09. traegt JEDES Gericht seinen Preis - die Preise sind
  // variabel, kein Menue muss so viel kosten wie das naechste. Die beiden
  // Werte oben (mittag, vital) sind nur noch die Vorgabe fuer neue Zeilen
  // und der Rueckfall fuer einen Eintrag ohne Preis.
  const tage = WOCHENTAGE.map((_, i) => {
    const liste = Array.isArray(roh?.tage?.[i]?.gerichte) ? roh.tage[i].gerichte : [];
    return {
      gerichte: liste.slice(0, 3).map(eintrag => gericht(eintrag)).filter(Boolean)
        .map(g => ({ ...g, preis: g.preis ?? mittag }))
    };
  });
  if (!tage.some(tag => tag.gerichte.length)) return { ok: false, grund: 'leer' };

  const vitalListe = (Array.isArray(roh?.vital) ? roh.vital : []).slice(0, 4)
    .map(eintrag => {
      const g = gericht(eintrag);
      return g ? { titel: text(eintrag?.titel, 30) || 'vital-gericht', ...g, preis: g.preis ?? vital } : null;
    })
    .filter(Boolean);

  const alacarte = (Array.isArray(roh?.alacarte) ? roh.alacarte : []).slice(0, 40)
    .map(eintrag => gericht(eintrag, { preisPflicht: true }))
    .filter(Boolean);

  const feld = (name, max) => (roh?.[name] === undefined ? VORGABEN[name] : text(roh[name], max));

  return {
    ok: true,
    plan: {
      montag,
      preise: { mittag, vital },
      fenster: feld('fenster', 40),
      hinweis: feld('hinweis', 120),
      tage,
      vital: vitalListe,
      alacarteFenster: feld('alacarteFenster', 40),
      alacarte,
      fussnote: feld('fussnote', 400),
      stand
    }
  };
}

export function datumPlus(datum, tage) {
  const d = new Date(`${datum}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + tage);
  return d.toISOString().slice(0, 10);
}

/** "31. august – 04. september" - so steht die Woche auf der Karte. */
export function wochenText(plan) {
  const schreib = datum => {
    const [, monat, tag] = datum.split('-');
    return `${tag}. ${MONATE[Number(monat) - 1]}`;
  };
  return `${schreib(plan.montag)} – ${schreib(datumPlus(plan.montag, 4))}`;
}

/** 0 fuer Montag ... 4 fuer Freitag; -1 am Wochenende. */
export function tagIndex(datum) {
  const wochentag = (new Date(`${datum}T12:00:00Z`).getUTCDay() + 6) % 7;
  return wochentag < 5 ? wochentag : -1;
}

/**
 * Die Takeaway-Karte aus dem Plan. Mit Abholtag: das Gericht dieses Tages,
 * dazu Vital und A la carte - genau das, was es an dem Tag gibt. Ohne Datum:
 * alles - fuer die Bestellpruefung und den Kuechenzettel, die jede bestellte
 * Kennung kennen muessen.
 *
 * Die Kennungen sind stabil (m1-1 = Montag, erstes Gericht; v1; a1): eine
 * Bestellung nennt sie, und der Dienst findet das Gericht wieder, egal an
 * welchem Tag er nachschaut. Die Namen tragen den Praefix der Karte
 * ("mittagsgericht: ...", "vital-gericht: ..."), damit Kuechenzettel und
 * Beleg dasselbe sagen wie das gedruckte Blatt.
 */
export function takeawayAusPlan(plan, datum = '') {
  if (!plan) return { gruppen: [], gerichte: [] };
  const gruppen = [];
  const codes = g => allergenCodes(g.allergene);
  const fenster = plan.fenster || '';

  // Nur was der Wirt zum Mitnehmen freigegeben hat. Die Kennungen bleiben
  // trotzdem am Platz des Gerichts IM PLAN (m2-2 ist immer das zweite
  // Gericht am Dienstag): nimmt er einen Haken weg, verschieben sich die
  // Kennungen der anderen nicht - eine laufende Bestellung zeigt sonst
  // ploetzlich auf ein anderes Gericht.
  const mit = liste => liste.map((g, n) => ({ g, n })).filter(({ g }) => g.takeaway !== false);

  const index = datum ? tagIndex(datum) : -1;
  const tage = datum ? (index >= 0 ? [index] : []) : [0, 1, 2, 3, 4];
  for (const i of tage) {
    const liste = mit(plan.tage[i]?.gerichte || []);
    if (!liste.length) continue;
    gruppen.push({
      id: `tag-${i + 1}`,
      titel: `wochengericht ${datum ? 'am ' : ''}${WOCHENTAGE[i]}`,
      fenster,
      hinweis: liste.length > 1 ? 'zur wahl' : '',
      gerichte: liste.map(({ g, n }) => ({
        id: `m${i + 1}-${n + 1}`, name: `mittagsgericht: ${g.name}`, beilage: g.beilage,
        preis: g.preis ?? plan.preise.mittag, allergene: codes(g)
      }))
    });
  }
  const vital = mit(plan.vital);
  if (vital.length) {
    gruppen.push({
      id: 'vital', titel: 'vital & vegi', fenster, hinweis: '',
      gerichte: vital.map(({ g, n }) => ({
        id: `v${n + 1}`, name: `${g.titel}: ${g.name}`, beilage: g.beilage,
        preis: g.preis ?? plan.preise.vital, allergene: codes(g)
      }))
    });
  }
  const alacarte = mit(plan.alacarte);
  if (alacarte.length) {
    gruppen.push({
      id: 'alacarte', titel: 'à la carte', fenster: plan.alacarteFenster || '', hinweis: '',
      gerichte: alacarte.map(({ g, n }) => ({
        id: `a${n + 1}`, name: g.name, beilage: g.beilage, preis: g.preis, allergene: codes(g)
      }))
    });
  }
  return { gruppen, gerichte: gruppen.flatMap(gruppe => gruppe.gerichte) };
}

/**
 * Der Plan fuer die naechste Woche, aus dem laufenden abgeleitet.
 *
 * Freitagabend rueckt der Dienst die Woche vor und legt das Ergebnis als
 * ENTWURF ab - die Gerichte bleiben stehen, weil sich meist nur ein Teil
 * aendert und der Wirt bis Sonntag ohnehin darueberschaut. Live geht davon
 * nichts: was die Gaeste sehen, bleibt die bestaetigte Woche, bis der Wirt
 * den Entwurf veroeffentlicht. Eine Karte, die sich von selbst um eine
 * Woche weiterdatiert, waere sonst eine Behauptung ueber Gerichte, die
 * niemand geprueft hat.
 */
export function naechsteWoche(plan, stand = new Date().toISOString()) {
  if (!plan?.montag) return null;
  return { ...plan, montag: datumPlus(plan.montag, 7), stand };
}

/** Der Montag der Woche, die auf `datum` folgt. */
export function montagDanach(datum) {
  const wochentag = (new Date(`${datum}T12:00:00Z`).getUTCDay() + 6) % 7;
  return datumPlus(datum, 7 - wochentag);
}
