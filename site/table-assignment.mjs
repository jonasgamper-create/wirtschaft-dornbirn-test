// Best-Fit-Tischzuweisung. Reine Funktion: kein DOM, kein window, kein
// localStorage, keine Systemzeit. Damit ist sie in Node testbar, im Browser
// als Modul ladbar und spaeter unveraendert serverseitig einsetzbar.

import { defaultMinGuests } from './floorplan-layout.mjs?v=4';

export const DEFAULT_POLICY = {
  durations: [
    { upTo: 2, minutes: 90 },
    { upTo: 4, minutes: 105 },
    { upTo: 6, minutes: 150 },
    { upTo: 20, minutes: 180 }
  ],
  bufferMinutes: 15,
  slotMinutes: 15,
  maxCoversPerSlot: 10,
  levelOrder: []
};

// Minuten seit Epoche, rein aus den Ziffern gerechnet. Kein Zeitzonen- oder
// Sommerzeiteinfluss, damit dieselbe Eingabe ueberall dasselbe Ergebnis gibt.
export function stamp(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(String(value ?? ''));
  if (!match) return null;
  return Date.UTC(+match[1], +match[2] - 1, +match[3], +match[4], +match[5]) / 60000;
}

export function shift(value, minutes) {
  const base = stamp(value);
  if (base === null) return null;
  const date = new Date((base + minutes) * 60000);
  const pad = number => String(number).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

export function durationFor(guests, policy = DEFAULT_POLICY) {
  const steps = [...(policy.durations || DEFAULT_POLICY.durations)].sort((a, b) => a.upTo - b.upTo);
  const hit = steps.find(step => guests <= step.upTo);
  return Number(hit?.minutes) || Number(steps[steps.length - 1]?.minutes) || 90;
}

function candidates(floorplan) {
  const singles = floorplan.tables.map(table => ({
    key: table.id,
    tableIds: [table.id],
    numbers: [table.number],
    levelId: table.levelId,
    levelName: table.levelName,
    seats: table.seats,
    minGuests: defaultMinGuests(table.seats)
  }));
  const combos = floorplan.combos.map(combo => {
    const members = combo.tableIds.map(id => floorplan.tables.find(table => table.id === id));
    return {
      key: combo.id,
      tableIds: [...combo.tableIds],
      numbers: members.map(table => table?.number).filter(Number.isFinite),
      levelId: combo.levelId,
      levelName: members[0]?.levelName,
      seats: combo.seats,
      minGuests: combo.minGuests,
      maxGuests: combo.maxGuests
    };
  });
  return [...singles, ...combos];
}

function overlaps(candidate, occupancy, from, to) {
  const own = new Set(candidate.tableIds);
  return occupancy.some(entry => {
    const ids = Array.isArray(entry?.tableIds) ? entry.tableIds : [];
    if (!ids.some(id => own.has(id))) return false;
    const start = stamp(entry.startsAt);
    if (start === null) return false;
    const end = start + (Number(entry.minutes) || 0);
    return start < to && from < end;
  });
}

// Pacing begrenzt den Zustrom, nicht die Anwesenheit. Ein Eintrag mit
// countsForPacing:false blockiert seinen Tisch, zaehlt aber nicht als
// Ankunft - so kann eine bestehende Sitzordnung keine Ablehnung ausloesen.
function coversInSlot(occupancy, slotStart, slotMinutes) {
  return occupancy.reduce((sum, entry) => {
    if (entry.countsForPacing === false) return sum;
    const start = stamp(entry.startsAt);
    if (start === null) return sum;
    if (start < slotStart || start >= slotStart + slotMinutes) return sum;
    return sum + (Number(entry.guests) || 0);
  }, 0);
}

/**
 * @param {object} input
 * @param {object} input.floorplan  Ergebnis von buildFloorplan()
 * @param {Array}  input.occupancy  [{ tableIds, startsAt, minutes, guests }]
 * @param {Array}  input.blocked    gesperrte Tisch-IDs
 * @param {number} input.guests
 * @param {string} input.startsAt   "2026-09-01T11:30"
 * @param {object} input.policy
 * @param {number} input.available  Freie Sitzplaetze aus serviceAvailability()
 * @returns {{ok:true,tableIds:string[],numbers:number[],seats:number,seatGap:number,minutes:number,levelId:string}
 *          |{ok:false,reason:'capacity'|'no_fit'|'pacing'|'invalid',alternatives?:Array}}
 */
export function assignTables(input) {
  const {
    floorplan,
    occupancy = [],
    blocked = [],
    guests,
    startsAt,
    policy = DEFAULT_POLICY,
    available = Infinity,
    withAlternatives = true
  } = input || {};

  const party = Math.trunc(Number(guests));
  const start = stamp(startsAt);
  if (!floorplan?.tables?.length || !Number.isFinite(party) || party < 1 || start === null) {
    return { ok: false, reason: 'invalid' };
  }

  // 1. Der Sitzplatzdeckel inklusive Puffer gewinnt immer gegen einen
  //    geometrisch freien Tisch. So kann ein Bedienfehler im Tischmix nie zu
  //    einer Zusage ueber dem Limit fuehren.
  if (party > available) return { ok: false, reason: 'capacity', available };

  const rules = { ...DEFAULT_POLICY, ...policy };
  const minutes = durationFor(party, rules);
  const buffer = Number(rules.bufferMinutes) || 0;
  const slotMinutes = Number(rules.slotMinutes) || 15;
  const from = start - buffer;
  const to = start + minutes + buffer;

  const blockedSet = new Set(blocked);
  const levelRank = new Map((rules.levelOrder || []).map((id, index) => [id, index]));

  const fits = candidates(floorplan)
    .filter(candidate => !candidate.tableIds.some(id => blockedSet.has(id)))
    .filter(candidate => party >= candidate.minGuests && party <= (candidate.maxGuests ?? candidate.seats))
    .filter(candidate => !overlaps(candidate, occupancy, from, to))
    .sort((a, b) =>
      a.tableIds.length - b.tableIds.length
      || (a.seats - party) - (b.seats - party)
      || (levelRank.get(a.levelId) ?? 99) - (levelRank.get(b.levelId) ?? 99)
      || Math.min(...a.numbers) - Math.min(...b.numbers));

  if (!fits.length) {
    return withAlternatives
      ? { ok: false, reason: 'no_fit', alternatives: nextSlots(input, rules, slotMinutes) }
      : { ok: false, reason: 'no_fit' };
  }

  // Pacing: begrenzt, wie viele Gaeste je Zeitfenster ankommen duerfen, damit
  // Kueche und Service nicht kollabieren. Ein Nein ohne Alternative waere ein
  // verlorener Gast - deshalb liefern wir die naechsten Slots gleich mit.
  const slotStart = start - ((start % slotMinutes) + slotMinutes) % slotMinutes;
  if (coversInSlot(occupancy, slotStart, slotMinutes) + party > Number(rules.maxCoversPerSlot)) {
    return withAlternatives
      ? { ok: false, reason: 'pacing', alternatives: nextSlots(input, rules, slotMinutes) }
      : { ok: false, reason: 'pacing' };
  }

  const best = fits[0];
  return {
    ok: true,
    tableIds: best.tableIds,
    numbers: best.numbers,
    levelId: best.levelId,
    levelName: best.levelName,
    seats: best.seats,
    seatGap: best.seats - party,
    minutes
  };
}

function nextSlots(input, rules, slotMinutes) {
  const found = [];
  for (let step = 1; step <= 3; step += 1) {
    const startsAt = shift(input.startsAt, slotMinutes * step);
    if (!startsAt) break;
    const attempt = assignTables({ ...input, startsAt, policy: rules, withAlternatives: false });
    if (attempt.ok) found.push({ startsAt, tableIds: attempt.tableIds, numbers: attempt.numbers });
  }
  return found;
}
