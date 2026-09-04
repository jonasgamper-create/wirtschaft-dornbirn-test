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
    allergene: alsAllergenText(allergenCodes(roh?.allergene))
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

  const tage = WOCHENTAGE.map((_, i) => {
    const liste = Array.isArray(roh?.tage?.[i]?.gerichte) ? roh.tage[i].gerichte : [];
    return { gerichte: liste.slice(0, 3).map(eintrag => gericht(eintrag)).filter(Boolean) };
  });
  if (!tage.some(tag => tag.gerichte.length)) return { ok: false, grund: 'leer' };

  const vitalListe = (Array.isArray(roh?.vital) ? roh.vital : []).slice(0, 4)
    .map(eintrag => {
      const g = gericht(eintrag);
      return g ? { titel: text(eintrag?.titel, 30) || 'vital-gericht', ...g } : null;
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

  const index = datum ? tagIndex(datum) : -1;
  const tage = datum ? (index >= 0 ? [index] : []) : [0, 1, 2, 3, 4];
  for (const i of tage) {
    const liste = plan.tage[i]?.gerichte || [];
    if (!liste.length) continue;
    gruppen.push({
      id: `tag-${i + 1}`,
      titel: `wochengericht ${datum ? 'am ' : ''}${WOCHENTAGE[i]}`,
      fenster,
      hinweis: liste.length > 1 ? 'zur wahl' : '',
      gerichte: liste.map((g, n) => ({
        id: `m${i + 1}-${n + 1}`, name: `mittagsgericht: ${g.name}`, beilage: g.beilage,
        preis: g.preis ?? plan.preise.mittag, allergene: codes(g)
      }))
    });
  }
  if (plan.vital.length) {
    gruppen.push({
      id: 'vital', titel: 'vital & vegi', fenster, hinweis: '',
      gerichte: plan.vital.map((g, n) => ({
        id: `v${n + 1}`, name: `${g.titel}: ${g.name}`, beilage: g.beilage,
        preis: g.preis ?? plan.preise.vital, allergene: codes(g)
      }))
    });
  }
  if (plan.alacarte.length) {
    gruppen.push({
      id: 'alacarte', titel: 'à la carte', fenster: plan.alacarteFenster || '', hinweis: '',
      gerichte: plan.alacarte.map((g, n) => ({
        id: `a${n + 1}`, name: g.name, beilage: g.beilage, preis: g.preis, allergene: codes(g)
      }))
    });
  }
  return { gruppen, gerichte: gruppen.flatMap(gruppe => gruppe.gerichte) };
}
