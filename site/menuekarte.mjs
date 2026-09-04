// Gemeinsames Stueck der beiden Karten-Seiten (mittagskarte.html zum
// Ansehen und Speichern, menuekarte-falten.html fuer den Tisch): den Plan
// holen und die Gerichte setzen. Eine Quelle, zwei Blaetter - was hier
// steht, steht auf beiden gleich.
//
// Gegliedert wie die Mittagskarte des Hauses: Gruppenkopf mit Zeitfenster
// und Hinweis, je Gericht eine Zeile - fett der Name mit seinem Praefix
// (montag:, vital-gericht:), rechts der Preis, darunter die Beilagen, dann
// eine duenne Linie. Unten die Fussnote.
//
// Woche und Datum werden hier ein zweites Mal gerechnet (das Original steht
// in server/src/menueplan.mjs, das im Browser nicht laeuft). Beide Fassungen
// sind absichtlich gleich kurz.

import { holeKarteInfo, holeMenueplan, karteAdresse } from './haus-api.js?v=14d80640';

export const WOCHENTAGE = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag'];
const MONATE = ['jänner', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august',
  'september', 'oktober', 'november', 'dezember'];

/** Die 14 Kennbuchstaben, wie sie in Oesterreich auf jeder Karte stehen. */
export const ALLERGEN_NAMEN = {
  A: 'glutenhaltiges getreide', B: 'krebstiere', C: 'ei', D: 'fisch', E: 'erdnuss', F: 'soja',
  G: 'milch', H: 'schalenfrüchte', L: 'sellerie', M: 'senf', N: 'sesam', O: 'sulfite',
  P: 'lupinen', R: 'weichtiere'
};

export const alsPreis = wert => `€ ${Number(wert).toFixed(2).replace('.', ',')}`;

export function datumPlus(datum, tage) {
  const d = new Date(`${datum}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + tage);
  return d.toISOString().slice(0, 10);
}

/** "31. august – 04. september" */
export function wochenText(plan) {
  const schreib = datum => {
    const [, monat, tag] = datum.split('-');
    return `${tag}. ${MONATE[Number(monat) - 1]}`;
  };
  return `${schreib(plan.montag)} – ${schreib(datumPlus(plan.montag, 4))}`;
}

/** "stand: 31. august 2026" - aus dem Zeitstempel des Plans. */
export function standText(plan) {
  const d = new Date(plan.stand || '');
  if (Number.isNaN(d.getTime())) return '';
  return `stand: ${d.getDate()}. ${MONATE[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Der Plan: vom Dienst, wenn er einen hat. Hat der Dienst keinen Plan, aber
 * ein hochgeladenes PDF, IST das PDF die Karte - dann kommt seine Adresse
 * zurueck. Ohne beides die hinterlegte Ersatzwoche aus dem Repo.
 */
export async function ladePlan(wurzel = '', { pdfErlaubt = true } = {}) {
  const dienst = await holeMenueplan();
  if (dienst?.ok && dienst.plan) return { plan: dienst.plan, quelle: 'dienst' };
  // Die Faltkarte kann mit einem PDF nichts anfangen - sie setzt selbst.
  // Sie bekommt dann die Ersatzwoche und sagt dazu, dass noch kein Plan da ist.
  if (dienst?.ok && pdfErlaubt) {
    const info = await holeKarteInfo();
    if (info?.ok && info.da && info.art === 'pdf') return { plan: null, pdf: await karteAdresse(info) };
  }
  const datei = await fetch(`${wurzel}data/menueplan.json`, { cache: 'no-store' })
    .then(antwort => (antwort.ok ? antwort.json() : null))
    .catch(() => null);
  return { plan: datei, quelle: 'datei' };
}

const el = (tag, klasse = '', text = '') => {
  const knoten = document.createElement(tag);
  if (klasse) knoten.className = klasse;
  if (text) knoten.textContent = text;
  return knoten;
};

/** Eine Zeile der Karte: Praefix + Name fett, Preis rechts, Beilagen darunter. */
function zeile(gericht, { praefix = '', preis = null } = {}) {
  const block = el('div', 'karte-zeile');
  const name = el('p', 'karte-name');
  if (praefix) name.append(el('span', 'karte-praefix', `${praefix}: `));
  name.append(gericht.name);
  block.append(name);
  if (preis !== null) block.append(el('span', 'karte-preis', alsPreis(preis)));
  const unten = [gericht.beilage, gericht.allergene ? `(${gericht.allergene})` : ''].filter(Boolean).join(' ');
  if (unten) block.append(el('p', 'karte-beilage', unten));
  return block;
}

/** Der Kopf einer Gruppe: Titel gross, Zeitfenster klein, Linie, Hinweis. */
export function gruppenKopf(ziel, titel, fenster = '', hinweis = '') {
  const kopf = el('h2', 'karte-gruppe');
  kopf.append(titel);
  if (fenster) kopf.append(' ', el('span', 'karte-fenster', fenster));
  ziel.append(kopf);
  if (hinweis) ziel.append(el('p', 'karte-hinweis', hinweis));
}

/** Montag bis Freitag, dann Vital und Vegi - jede Zeile mit ihrem Preis. */
export function zeichneWoche(ziel, plan) {
  ziel.textContent = '';
  gruppenKopf(ziel, 'wochengerichte', plan.fenster, plan.hinweis);
  plan.tage.forEach((tag, i) => {
    tag.gerichte.forEach((gericht, n) => {
      const praefix = n === 0 ? WOCHENTAGE[i] : `${WOCHENTAGE[i]} oder`;
      ziel.append(zeile(gericht, { praefix, preis: gericht.preis ?? plan.preise.mittag }));
    });
  });
  plan.vital.forEach(gericht => {
    ziel.append(zeile(gericht, { praefix: gericht.titel, preis: gericht.preis ?? plan.preise.vital }));
  });
}

export function zeichneAlacarte(ziel, plan) {
  ziel.textContent = '';
  gruppenKopf(ziel, 'à la carte', plan.alacarteFenster);
  plan.alacarte.forEach(gericht => ziel.append(zeile(gericht, { preis: gericht.preis })));
}

/** Die Fussnote: das erste Wort bis zum Doppelpunkt fett, wie auf der Karte. */
export function zeichneFussnote(ziel, plan) {
  ziel.textContent = '';
  const fuss = String(plan.fussnote || '').trim();
  if (!fuss) { ziel.hidden = true; return; }
  const treffer = /^([^:]{2,24}:)\s*(.*)$/s.exec(fuss);
  if (treffer) ziel.append(el('b', '', treffer[1]), ' ', treffer[2]);
  else ziel.append(fuss);
  ziel.hidden = false;
}

/** Nur die Buchstaben, die auf dieser Karte vorkommen - in Reihenfolge. */
export function legende(plan) {
  const alle = [...plan.tage.flatMap(t => t.gerichte), ...plan.vital, ...plan.alacarte]
    .flatMap(g => String(g.allergene || '').toUpperCase().split(/[^A-R]+/))
    .filter(code => ALLERGEN_NAMEN[code]);
  return [...new Set(alle)].sort()
    .map(code => `${code.toLowerCase()} ${ALLERGEN_NAMEN[code]}`).join(' · ');
}
