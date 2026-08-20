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
  // Mittags wird Montag bis Freitag gekocht. Die Seite faengt das Wochenende
  // schon ab - aber die Seite ist nicht die Grenze, der Dienst ist es. Was im
  // Haus von Hand eingetragen wird, geht nicht durch diese Pruefung und
  // bleibt frei fuer Feste am Wochenende.
  const wochentag = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (wochentag === 0 || wochentag === 6) return { ok: false, grund: 'wochenende' };
  // Online bis 20 Personen - das traegt der Plan mit zusammengeschobenen
  // Tischen. Groessere Gesellschaften gehoeren ans Telefon: da haengen Menue,
  // Anzahlung und Raumaufteilung dran, die kein Formular abfragen soll.
  if (!Number.isFinite(guests) || guests < 1 || guests > 20) return { ok: false, grund: 'personen' };

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
 * Belegung fuer die Zuweisung. `countsForPacing:false` fuer Gaeste, die das
 * Haus selbst eingeteilt hat: sie sperren ihren Tisch, duerfen aber keine
 * Pacing-Ablehnung ausloesen - sonst lehnt das Haus ab, weil es selbst schon
 * eingeteilt hat. Online-Buchungen zaehlen dagegen voll: das Limit je
 * Viertelstunde schuetzt die Kueche, und genau der Online-Zustrom ist der,
 * den niemand von Hand bremst. Die Bedingung stand verkehrt herum - damit
 * konnten sich beliebig viele Online-Gaeste in dieselbe Viertelstunde legen.
 */
export function belegungFuer(parties, date, dauerVon) {
  return parties
    .filter(party => party.date === date && party.tableIds?.length)
    .map(party => ({
      tableIds: party.tableIds,
      startsAt: `${party.date}T${party.time}`,
      minutes: dauerVon(party),
      guests: party.guests,
      countsForPacing: party.quelle === 'online'
    }));
}

/**
 * Der Kern: eine gepruefte Anfrage auf einen Tisch setzen. Nutzt dieselben
 * Module wie die Seite im Haus - eine zweite Rechenregel auf dem Server waere
 * die sicherste Art, zwei verschiedene Wahrheiten zu bekommen.
 */
export function dauerRegel(config) {
  const layout = activeLayout(config);
  const service = serviceOf(layout);
  const policy = config?.policy || {};
  const schichten = service.mode === 'schichten' ? seatingPlan(service) : [];
  return party => {
    const schicht = schichten.find(entry => entry.time === party.time);
    if (schicht) return schicht.minutes;
    if (service.mode !== 'schichten' && service.richtzeit === false) return 24 * 60;
    if (service.mode === 'schichten' && schichten.length) return schichten[0].minutes;
    return durationFor(party.guests, policy);
  };
}

export function verteile(anfrage, { config, parties, blocked = [], standardEtage = null, deckel = null, ohnePacing = false }) {
  const floorplan = buildFloorplan(config);
  const layout = activeLayout(config);
  const service = serviceOf(layout);
  const policy = config?.policy || {};
  const schichten = service.mode === 'schichten' ? seatingPlan(service) : [];

  const dauerVon = dauerRegel(config);
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
      // Und wer schon an der Tuer steht, wird nicht von einer Rechenregel
      // weggeschickt: fuer Laufkundschaft entscheidet der Wirt, nicht das Pacing.
      ...(service.mode === 'schichten' || ohnePacing ? { maxCoversPerSlot: Number.MAX_SAFE_INTEGER } : {})
    },
    minutes: feste
  });

  return { result, floorplan, minuten: feste };
}

/**
 * Die Mittagszeiten, zu denen online reserviert werden kann. Dieselbe Liste
 * wie auf der Gaesteseite - stuenden dort andere Zeiten, koennte jemand eine
 * Zeit waehlen, die der Dienst gar nicht kennt.
 */
export const MITTAGSZEITEN = [
  '11:30', '11:45', '12:00', '12:15', '12:30', '12:45', '13:00', '13:15', '13:30'
];

/**
 * Was ist an einem Tag noch frei? Antwortet je Uhrzeit mit "geht" oder "voll" -
 * und zwar fuer genau die angefragte Personenzahl, denn das ist die Frage des
 * Gastes. Ein "frei", das bei vier Personen doch nicht gilt, waere schlimmer
 * als gar keine Angabe.
 *
 * Bewusst ohne jeden Namen: diese Antwort geht an die oeffentliche Seite.
 */
export function freieZeiten({ config, parties, blocked = [], standardEtage = null, deckel = null, guests = 2, zeiten = MITTAGSZEITEN, date }) {
  return zeiten.map(time => {
    const { result } = verteile({ name: 'x', date, time, guests }, {
      config, parties, blocked, standardEtage, deckel
    });
    return {
      zeit: time,
      frei: result.ok === true,
      // Der Grund hilft beim Formulieren, verraet aber nichts ueber Gaeste.
      grund: result.ok ? null : result.reason
    };
  });
}

/** Wie lange vor dem Tisch die Erinnerung rausgeht. */
export const ERINNERUNG_VORLAUF = 60;

/**
 * Wer heute eine Erinnerung bekommt.
 *
 * Drei Bedingungen, und jede hat einen Grund:
 *
 * Sie gilt nur fuer Reservierungen, die an einem FRUEHEREN Tag eingegangen
 * sind. Wer heute frueh fuer heute Mittag bucht, braucht keine Erinnerung an
 * etwas, das er vor zwei Stunden selbst eingetragen hat.
 *
 * Sie geht einmal. `erinnertUm` haelt fest, dass es passiert ist - ohne das
 * schickt jeder Lauf des Zeitplans eine weitere.
 *
 * Und sie geht nur in einem Fenster vor dem Termin, nicht danach. Eine
 * Erinnerung an einen Tisch, der schon vorbei ist, ist Unsinn; sie zu
 * verschicken kostet trotzdem.
 */
export function brauchtErinnerung(parties, { datum, zeit, vorlauf = ERINNERUNG_VORLAUF, fenster = 20 }) {
  const alsMinuten = wert => {
    const treffer = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(wert || ''));
    return treffer ? Number(treffer[1]) * 60 + Number(treffer[2]) : null;
  };
  const jetzt = alsMinuten(zeit);
  if (jetzt === null) return [];

  return (parties || []).filter(party => {
    if (party.date !== datum) return false;
    if (party.erinnertUm) return false;
    if (party.status === 'storniert') return false;
    if (!party.kontakt?.telefon) return false;
    // Am selben Tag gebucht: der Gast weiss es noch.
    const eingegangen = String(party.eingegangen || '').slice(0, 10);
    if (!eingegangen || eingegangen >= datum) return false;
    const start = alsMinuten(party.time);
    if (start === null) return false;
    const abstand = start - jetzt;
    return abstand <= vorlauf && abstand > vorlauf - fenster;
  });
}

/** Ab so wenigen freien Tischen springt die Ampel auf Orange. */
export const AMPEL_WENIGE = 3;

/**
 * Die Ampel fuer die Gaesteseite: wie voll ist der Mittag an diesem Tag?
 * Antwortet nur mit Zahlen und einer Stufe - keine Namen, keine Belegung im
 * Detail, denn diese Auskunft ist oeffentlich.
 *
 *   gruen  - noch gut Platz
 *   orange - nur noch wenige Tische, oder kein Tisch fuer zwei mehr
 *   rot    - zu keiner verbleibenden Zeit ist ein Tisch frei
 *   vorbei - alle Mittagszeiten dieses Tages liegen hinter uns
 *
 * `jetzt` (HH:MM) kommt von aussen, nie aus der Systemuhr - vergangene Zeiten
 * zaehlen nicht mehr: ein "alles voll", das nur an 11:30 liegt, waere gelogen.
 */
export function ampelFuer({ config, parties, blocked = [], standardEtage = null, deckel = null, date, jetzt = null, zeiten = MITTAGSZEITEN }) {
  const offen = jetzt ? zeiten.filter(zeit => zeit >= jetzt) : [...zeiten];
  if (!offen.length) return { stufe: 'vorbei', freieTische: 0, zweierFrei: false };

  const floorplan = buildFloorplan(config);
  const dauerVon = dauerRegel(config);
  const gesperrt = new Set(blocked);

  // Freie Tische je verbleibender Zeit; die beste Zeit zaehlt. Wer um 12:00
  // nichts bekommt, aber um 13:00 schon, findet noch einen Tisch - und genau
  // das soll die Ampel sagen.
  let freieTische = 0;
  for (const zeit of offen) {
    const belegt = new Set();
    for (const party of parties) {
      if (party.date !== date || !party.tableIds?.length) continue;
      if (!occupiesAt(party, { at: `${date}T${zeit}`, minutes: dauerVon(party) })) continue;
      for (const id of party.tableIds) belegt.add(id);
    }
    const frei = floorplan.tables.filter(table => !gesperrt.has(table.id) && !belegt.has(table.id)).length;
    freieTische = Math.max(freieTische, frei);
  }

  // Der Zweiertisch ist die haeufigste Anfrage - ob er noch geht, entscheidet
  // ueber denselben Weg wie eine echte Buchung, nicht ueber eine Nebenrechnung.
  const zweierFrei = freieZeiten({ config, parties, blocked, standardEtage, deckel, guests: 2, zeiten: offen, date })
    .some(eintrag => eintrag.frei);

  const stufe = freieTische === 0
    ? 'rot'
    : (freieTische <= AMPEL_WENIGE || !zweierFrei ? 'orange' : 'gruen');
  return { stufe, freieTische, zweierFrei };
}

/**
 * Taugt das als Tischplan? Einen unbrauchbaren anzunehmen waere schlimmer als
 * ihn abzulehnen: der Dienst wuerde ab dann jede Onlinebuchung ins Leere
 * zuweisen, und niemand saehe warum.
 */
export function planTaugt(config) {
  return Boolean(config)
    && typeof config === 'object'
    && !Array.isArray(config)
    && Array.isArray(config.layouts)
    && config.layouts.length > 0;
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
    // "Wir sind doch zu sechst": die Zahl aendert sich, der Tisch bleibt -
    // ob er noch passt, entscheidet der Wirt mit dem Tischwechsel daneben.
    case 'personen': {
      const party = finde(aktion.id);
      if (!party) return { ok: false, grund: 'unbekannt' };
      const anzahl = Math.trunc(Number(aktion.guests));
      if (!Number.isFinite(anzahl) || anzahl < 1 || anzahl > 24) return { ok: false, grund: 'personen' };
      party.guests = anzahl;
      return { ok: true, parties: liste };
    }
    // Notiz am Gast: Fensterplatz, Kinderstuhl, glutenfrei. Kurz und ohne
    // Zeilenumbrueche - sie steht in einer Listenzeile, nicht in einem Brief.
    case 'notiz': {
      const party = finde(aktion.id);
      if (!party) return { ok: false, grund: 'unbekannt' };
      const text = String(aktion.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 140);
      party.notiz = text || null;
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
