// Reine Logik des Reservierungsdienstes: pruefen, zuweisen, zusammenfuehren.
// Kein Cloudflare, kein DOM, keine Systemuhr - damit `npm run ci` sie in Node
// durchspielen kann und dieselbe Funktion im Worker laeuft wie im Test.

import { activeLayout, buildFloorplan, seatingPlan, serviceOf } from '../../site/floorplan-layout.mjs';
import { assignTables, durationFor, occupiesAt } from '../../site/table-assignment.mjs';

/** Wie lange eine Reservierung aufbewahrt wird, bevor sie geloescht wird. */
export const AUFBEWAHRUNG_TAGE = 30;

/** Hoechstzahl Online-Reservierungen je Absender und Stunde. */
export const ONLINE_LIMIT_PRO_STUNDE = 6;

const ISO_TAG = /^\d{4}-\d{2}-\d{2}$/;
const UHRZEIT = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Eine Online-Anfrage in eine saubere Reservierung verwandeln - oder ablehnen.
 * Absichtlich streng: alles, was von aussen kommt, ist unbekannt.
 */
export function pruefeAnfrage(roh, { heute, tageImVoraus = 90 } = {}) {
  const name = String(roh?.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
  const date = String(roh?.date ?? '');
  const time = String(roh?.time ?? '');
  const guests = Math.trunc(Number(roh?.guests));

  if (name.length < 2) return { ok: false, grund: 'name' };
  // Date.parse akzeptiert den 31. Februar und macht daraus stillschweigend den
  // 3. Maerz. Deshalb pruefen, ob das Datum unveraendert zurueckkommt.
  if (!ISO_TAG.test(date)) return { ok: false, grund: 'datum' };
  const geparst = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(geparst.getTime()) || geparst.toISOString().slice(0, 10) !== date) {
    return { ok: false, grund: 'datum' };
  }
  if (!UHRZEIT.test(time)) return { ok: false, grund: 'uhrzeit' };
  if (!Number.isFinite(guests) || guests < 1 || guests > 24) return { ok: false, grund: 'personen' };

  // Kein Datum in der Vergangenheit und keines in ferner Zukunft. Ohne diese
  // Grenze kann jemand den Speicher mit Reservierungen fuer das Jahr 2400
  // fuellen.
  if (heute) {
    if (date < heute) return { ok: false, grund: 'vergangen' };
    const grenze = new Date(`${heute}T00:00:00Z`);
    grenze.setUTCDate(grenze.getUTCDate() + tageImVoraus);
    if (date > grenze.toISOString().slice(0, 10)) return { ok: false, grund: 'zu_weit' };
  }
  return { ok: true, anfrage: { name, date, time, guests } };
}

/**
 * Die Reihenfolge der Etagen fuer eine Zuweisung. Online-Gaeste kommen zuerst
 * auf die hinterlegte Standard-Etage; ist dort nichts frei, wird der Rest in
 * der gewohnten Reihenfolge geprueft. Ein "leider nichts frei", obwohl oben
 * eine ganze Etage leersteht, waere ein verlorener Gast.
 */
export function etagenReihenfolge(floorplan, standardEtage) {
  const alle = floorplan.levels.map(level => level.id);
  if (!standardEtage || !alle.includes(standardEtage)) return alle;
  return [standardEtage, ...alle.filter(id => id !== standardEtage)];
}

/** Wie viele Gaeste zu einem Zeitpunkt sitzen - dieselbe Regel wie im Haus. */
export function sitzendeGaeste(parties, { date, time, dauerVon }) {
  return parties
    .filter(party => party.date === date && party.tableIds?.length)
    .filter(party => occupiesAt(party, { at: `${date}T${time}`, minutes: dauerVon(party) }))
    .reduce((sum, party) => sum + party.guests, 0);
}

/**
 * Belegung fuer die Zuweisung. `countsForPacing:false` fuer bereits sitzende
 * Gaeste: sie sperren ihren Tisch, duerfen aber keine Pacing-Ablehnung
 * ausloesen - sonst lehnt das Haus ab, weil es selbst schon eingeteilt hat.
 */
export function belegungFuer(parties, date, dauerVon) {
  return parties
    .filter(party => party.date === date && party.tableIds?.length)
    .map(party => ({
      tableIds: party.tableIds,
      startsAt: `${party.date}T${party.time}`,
      minutes: dauerVon(party),
      guests: party.guests,
      countsForPacing: party.quelle !== 'online'
    }));
}

/**
 * Der Kern: eine gepruefte Anfrage auf einen Tisch setzen. Nutzt dieselben
 * Module wie die Seite im Haus - eine zweite Rechenregel auf dem Server waere
 * die sicherste Art, zwei verschiedene Wahrheiten zu bekommen.
 */
export function verteile(anfrage, { config, parties, blocked = [], standardEtage = null, deckel = null }) {
  const floorplan = buildFloorplan(config);
  const layout = activeLayout(config);
  const service = serviceOf(layout);
  const policy = config?.policy || {};
  const schichten = service.mode === 'schichten' ? seatingPlan(service) : [];

  const dauerVon = party => {
    const schicht = schichten.find(entry => entry.time === party.time);
    if (schicht) return schicht.minutes;
    if (service.mode !== 'schichten' && service.richtzeit === false) return 24 * 60;
    if (service.mode === 'schichten' && schichten.length) return schichten[0].minutes;
    return durationFor(party.guests, policy);
  };
  const feste = dauerVon({ guests: anfrage.guests, time: anfrage.time });

  // Der Sitzplatzdeckel des Hauses gilt auch online. Ohne ihn koennte eine
  // Onlinebuchung ueber das Limit zusagen, das der Wirt bewusst gesetzt hat.
  const sitzen = sitzendeGaeste(parties, { date: anfrage.date, time: anfrage.time, dauerVon });
  const frei = deckel === null ? Infinity : Math.max(0, deckel - sitzen);

  const result = assignTables({
    floorplan,
    occupancy: belegungFuer(parties, anfrage.date, dauerVon),
    blocked,
    guests: anfrage.guests,
    available: frei,
    startsAt: `${anfrage.date}T${anfrage.time}`,
    policy: {
      ...policy,
      levelOrder: etagenReihenfolge(floorplan, standardEtage),
      // Im Schichtbetrieb kommen alle gleichzeitig - Pacing waere sinnlos.
      ...(service.mode === 'schichten' ? { maxCoversPerSlot: Number.MAX_SAFE_INTEGER } : {})
    },
    minutes: feste
  });

  return { result, floorplan, minuten: feste };
}

/** Eindeutige, sortierbare Kennung ohne Zufall - der Zaehler kommt von aussen. */
export const machId = (zeitstempel, nummer) =>
  `o-${Number(zeitstempel).toString(36)}-${String(nummer).padStart(3, '0')}`;

/**
 * Fuehrt eine Aktion des Hauses auf der Liste aus. Der Dienst ist die
 * Wahrheit fuer Reservierungen; die Seite im Haus schickt Absichten, keine
 * fertigen Listen. So koennen zwei Geraete sich nicht gegenseitig ueberschreiben.
 */
export function wendeAktionAn(parties, aktion) {
  const liste = parties.map(party => ({ ...party, tableIds: [...(party.tableIds || [])] }));
  const finde = id => liste.find(party => party.id === id);

  switch (aktion?.art) {
    case 'ankunft': {
      const party = finde(aktion.id);
      if (!party) return { ok: false, grund: 'unbekannt' };
      party.arrived = aktion.zeit || null;
      if (!party.arrived) party.left = null;
      return { ok: true, parties: liste };
    }
    case 'abgang': {
      const party = finde(aktion.id);
      if (!party) return { ok: false, grund: 'unbekannt' };
      party.left = aktion.zeit || null;
      if (party.left && !party.arrived) party.arrived = party.time;
      return { ok: true, parties: liste };
    }
    case 'tisch': {
      const party = finde(aktion.id);
      if (!party) return { ok: false, grund: 'unbekannt' };
      party.tableIds = Array.isArray(aktion.tableIds) ? aktion.tableIds.slice(0, 4) : [];
      return { ok: true, parties: liste };
    }
    case 'entfernen':
      return { ok: true, parties: liste.filter(party => party.id !== aktion.id) };
    default:
      return { ok: false, grund: 'unbekannt' };
  }
}

/** Alles aelter als die Aufbewahrungsfrist faellt weg. */
export function raeumeAuf(parties, heute, tage = AUFBEWAHRUNG_TAGE) {
  const grenze = new Date(`${heute}T00:00:00Z`);
  grenze.setUTCDate(grenze.getUTCDate() - tage);
  const alsText = grenze.toISOString().slice(0, 10);
  return parties.filter(party => party.date >= alsText);
}
