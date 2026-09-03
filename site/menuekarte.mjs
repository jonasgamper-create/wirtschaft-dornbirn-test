// Gemeinsames Stueck der beiden Karten-Seiten (mittagskarte.html zum
// Ansehen und Speichern, menuekarte-falten.html fuer den Tisch): den Plan
// holen und die Gerichte setzen. Eine Quelle, zwei Blaetter - was hier
// steht, steht auf beiden gleich.
//
// Woche und Datum werden hier ein zweites Mal gerechnet (das Original steht
// in server/src/menueplan.mjs, das im Browser nicht laeuft). Beide Fassungen
// sind absichtlich gleich kurz; die Pruefung im Repo haelt die Serverseite
// fest, diese hier zeigt dieselbe Woche auf der Karte.

import { holeKarteInfo, holeMenueplan, karteAdresse } from './haus-api.js?v=309a63fc';

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

/**
 * Der Plan: vom Dienst, wenn er einen hat. Hat der Dienst keinen Plan, aber
 * ein hochgeladenes PDF, IST das PDF die Karte - dann kommt seine Adresse
 * zurueck. Ohne beides die hinterlegte Ersatzwoche aus dem Repo.
 */
export async function ladePlan(wurzel = '') {
  const dienst = await holeMenueplan();
  if (dienst?.ok && dienst.plan) return { plan: dienst.plan, quelle: 'dienst' };
  if (dienst?.ok) {
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

function gerichtBlock(gericht, { preis = null } = {}) {
  const block = el('div', 'karte-gericht');
  const name = el('p', 'karte-name', gericht.name);
  block.append(name);
  if (gericht.beilage) block.append(el('p', 'karte-beilage', gericht.beilage));
  if (gericht.allergene) block.append(el('p', 'karte-codes', `(${gericht.allergene})`));
  if (preis !== null) block.append(el('span', 'karte-preis', alsPreis(preis)));
  return block;
}

/** Montag bis Freitag mit "oder" zwischen zwei Gerichten zur Wahl. */
export function zeichneTage(ziel, plan) {
  ziel.textContent = '';
  plan.tage.forEach((tag, i) => {
    if (!tag.gerichte.length) return;
    const block = el('section', 'karte-tag');
    block.append(el('h3', '', WOCHENTAGE[i]));
    tag.gerichte.forEach((gericht, n) => {
      if (n > 0) block.append(el('p', 'karte-oder', 'oder'));
      // Ein eigener Preis steht am Gericht; der Gruppenpreis steht im Kopf.
      block.append(gerichtBlock(gericht, { preis: gericht.preis ?? null }));
    });
    ziel.append(block);
  });
}

export function zeichneVital(ziel, plan) {
  ziel.textContent = '';
  plan.vital.forEach(gericht => {
    const block = el('section', 'karte-tag');
    block.append(el('h3', '', gericht.titel));
    block.append(gerichtBlock(gericht, { preis: gericht.preis ?? null }));
    ziel.append(block);
  });
}

export function zeichneAlacarte(ziel, plan) {
  ziel.textContent = '';
  plan.alacarte.forEach(gericht => ziel.append(gerichtBlock(gericht, { preis: gericht.preis })));
}

/** Nur die Buchstaben, die auf dieser Karte vorkommen - in Reihenfolge. */
export function legende(plan) {
  const alle = [...plan.tage.flatMap(t => t.gerichte), ...plan.vital, ...plan.alacarte]
    .flatMap(g => String(g.allergene || '').toUpperCase().split(/[^A-R]+/))
    .filter(code => ALLERGEN_NAMEN[code]);
  return [...new Set(alle)].sort()
    .map(code => `${code.toLowerCase()} ${ALLERGEN_NAMEN[code]}`).join(' · ');
}
