import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { GRID, buildFloorplan, deriveTableMix, footprint, totalSeats } from '../site/floorplan-layout.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const fail = message => errors.push(`Tischplan-Prüfung: ${message}`);

const raw = await readFile(path.join(root, 'site/data/floorplan.json'), 'utf8');
const config = JSON.parse(raw);

// Der Tischplan enthält ausschließlich Stammdaten. Belegung, Namen oder
// Kontaktdaten gehören nie in eine statisch ausgelieferte Datei. Geprüft
// werden die Schlüssel selbst - eine Textsuche würde an minGuests scheitern.
const forbiddenKeys = new Set([
  'reserved', 'sold', 'available', 'occupancy', 'bookings', 'reservations',
  'guest', 'guestname', 'email', 'mail', 'phone', 'telefon', 'contact'
]);
(function walkKeys(value, trail = '') {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walkKeys(entry, `${trail}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenKeys.has(key.toLowerCase())) {
      fail(`Verbotenes Feld "${key}" bei ${trail || 'root'} - im Tischplan stehen nur Stammdaten.`);
    }
    walkKeys(child, `${trail}.${key}`);
  }
})(config);

if (!Number.isFinite(Date.parse(config.updatedAt || ''))) fail('updatedAt ist kein gültiger Zeitstempel.');
if (!['beispiel', 'bestaetigt'].includes(config.status)) {
  fail('status muss "beispiel" oder "bestaetigt" sein - erfundene Tischzahlen dürfen nie als bestätigt gelten.');
}
if (Number(config.version) !== 2) fail('version muss 2 sein.');

const layouts = Array.isArray(config.layouts) ? config.layouts : [];
if (!layouts.length || layouts.length > 12) fail('Es braucht 1 bis 12 Tischordnungen.');
if (!layouts.some(layout => layout?.id === config.activeLayout)) {
  fail('activeLayout verweist auf keine vorhandene Ordnung.');
}

const seenLayout = new Set();
const seenLevel = new Set();
for (const [li, layout] of layouts.entries()) {
  if (!/^[a-z][a-z0-9-]{1,23}$/.test(layout?.id || '')) fail(`layouts[${li}].id ist keine saubere Kennung.`);
  if (seenLayout.has(layout?.id)) fail(`Ordnungs-ID "${layout.id}" kommt doppelt vor.`);
  seenLayout.add(layout?.id);
  if (!layout?.name?.trim()) fail(`layouts[${li}].name fehlt.`);

  const levels = Array.isArray(layout?.levels) ? layout.levels : [];
  if (!levels.length || levels.length > 4) fail(`layouts[${li}] braucht 1 bis 4 Etagen.`);

  const inLayout = new Set();
  const orders = new Set();
  for (const [index, level] of levels.entries()) {
    if (!/^[a-z][a-z0-9-]{1,15}$/.test(level?.id || '')) fail(`layouts[${li}].levels[${index}].id ist keine saubere Kennung.`);
    if (inLayout.has(level?.id)) fail(`Etagen-ID "${level.id}" kommt in "${layout.id}" doppelt vor.`);
    inLayout.add(level?.id);
    seenLevel.add(level?.id);
    if (!level?.name?.trim()) fail(`layouts[${li}].levels[${index}].name fehlt.`);
    if (!Number.isInteger(level?.order)) fail(`layouts[${li}].levels[${index}].order muss eine ganze Zahl sein.`);
    if (orders.has(level?.order)) fail(`order ${level.order} kommt in "${layout.id}" doppelt vor.`);
    orders.add(level?.order);

    const tables = Array.isArray(level?.tables) ? level.tables : [];
    if (tables.length > 300) fail(`layouts[${li}].levels[${index}] hat mehr als 300 Tische.`);
    for (const [ti, table] of tables.entries()) {
      if (!/^[a-z][a-z0-9-]{1,23}$/.test(table?.id || '')) fail(`Tisch-Kennung ungültig: ${JSON.stringify(table?.id)}`);
      if (!Number.isInteger(table?.seats) || table.seats < GRID.minSeats || table.seats > GRID.maxSeats) {
        fail(`Tisch ${table?.id}: Plätze müssen ${GRID.minSeats} bis ${GRID.maxSeats} sein.`);
      }
      for (const key of ['col', 'row']) {
        const value = table?.[key];
        if (value !== null && value !== undefined && (!Number.isInteger(value) || value < 0)) {
          fail(`Tisch ${table?.id}: ${key} muss null oder eine nicht negative ganze Zahl sein.`);
        }
      }
      if (tables.findIndex(other => other?.id === table?.id) !== ti) fail(`Tisch-Kennung "${table?.id}" kommt doppelt vor.`);
    }
  }
}

const floorplan = buildFloorplan(config);

if (floorplan.orphans.length) {
  fail(`Kombination(en) verweisen auf Tische, die es nicht gibt: ${floorplan.orphans.map(entry => entry.id || '?').join(', ')}.`);
}

for (const combo of floorplan.combos) {
  const levelIds = new Set(combo.tableIds.map(id => floorplan.tables.find(table => table.id === id)?.levelId));
  if (levelIds.size > 1) fail(`Kombination "${combo.id}" verbindet Tische über Etagen hinweg.`);
  if (combo.minGuests > combo.seats) fail(`Kombination "${combo.id}" hat minGuests über der Sitzplatzzahl.`);
}

const usedInCombo = new Map();
for (const combo of floorplan.combos) {
  for (const id of combo.tableIds) {
    if (usedInCombo.has(id)) fail(`Tisch ${id} steht in zwei Kombinationen - die Sperrlogik wäre mehrdeutig.`);
    usedInCombo.set(id, combo.id);
  }
}

// Geometrie: nichts überlappt, nichts fällt unter das Tapziel von 44 px.
for (const level of floorplan.levels) {
  if (level.cols > GRID.cols) fail(`Etage "${level.id}" nutzt mehr als ${GRID.cols} Rasterspalten.`);
  for (const table of level.tables) {
    const soll = footprint(table.seats);
    if (table.w !== soll.w || table.h !== soll.h) {
      fail(`Tisch ${table.id}: Fußabdruck passt nicht zur Platzzahl.`);
    }
    if (table.col < 0 || table.row < 0 || table.col + table.w > level.cols) {
      fail(`Tisch ${table.id} liegt außerhalb des Rasters.`);
    }
  }
  for (let i = 0; i < level.tables.length; i += 1) {
    for (let j = i + 1; j < level.tables.length; j += 1) {
      const a = level.tables[i];
      const b = level.tables[j];
      if (a.col < b.col + b.w && b.col < a.col + a.w && a.row < b.row + b.h && b.row < a.row + a.h) {
        fail(`Tische ${a.id} und ${b.id} überlappen sich.`);
      }
    }
  }
}

// Bei fortlaufender Zaehlung muss jede Nummer im Haus eindeutig sein, bei
// "pro-etage" nur innerhalb ihrer Etage.
if (!['fortlaufend', 'pro-etage'].includes(config.numbering?.mode ?? 'fortlaufend')) {
  fail('numbering.mode muss "fortlaufend" oder "pro-etage" sein.');
}
if (floorplan.numberingMode === 'pro-etage') {
  for (const level of floorplan.levels) {
    const gesehen = new Set();
    for (const table of level.tables) {
      if (gesehen.has(table.number)) fail(`Tischnummer ${table.number} kommt in "${level.name}" doppelt vor.`);
      gesehen.add(table.number);
    }
    if (level.tables.length && level.tables[0].number !== (config.numbering?.start ?? 1)) {
      fail(`"${level.name}" beginnt nicht bei ${config.numbering?.start ?? 1}.`);
    }
  }
} else {
  const seenNumber = new Set();
  for (const table of floorplan.tables) {
    if (seenNumber.has(table.number)) fail(`Tischnummer ${table.number} kommt doppelt vor.`);
    seenNumber.add(table.number);
  }
}

const policy = config.policy || {};
if (!Array.isArray(policy.durations) || !policy.durations.length) fail('policy.durations fehlt.');
for (const step of policy.durations || []) {
  if (!Number.isInteger(step?.upTo) || !Number.isInteger(step?.minutes) || step.minutes < 30 || step.minutes > 300) {
    fail('policy.durations braucht ganze Zahlen; minutes zwischen 30 und 300.');
  }
}
if (!Number.isInteger(policy.bufferMinutes) || policy.bufferMinutes < 0 || policy.bufferMinutes > 60) {
  fail('policy.bufferMinutes muss 0 bis 60 sein.');
}
if (!Number.isInteger(policy.maxCoversPerSlot) || policy.maxCoversPerSlot < 1) {
  fail('policy.maxCoversPerSlot muss mindestens 1 sein.');
}
const levelOrder = policy.levelOrder || [];
if (!levelOrder.length || levelOrder.some(id => !seenLevel.has(id))) {
  fail('policy.levelOrder darf nur vorhandene Etagen nennen und nicht leer sein.');
}
for (const id of seenLevel) {
  if (!levelOrder.includes(id)) fail(`Etage "${id}" fehlt in policy.levelOrder.`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const mix = deriveTableMix(floorplan);
const mixText = Object.keys(mix).map(Number).sort((a, b) => a - b).map(seats => `${mix[seats]}×${seats}P`).join(' · ');
console.log(
  `Tischplan-Prüfung OK (${config.status}, ${floorplan.numberingMode}): ${floorplan.levels.length} Etagen, ${floorplan.tables.length} Tische, `
  + `${totalSeats(floorplan)} Plätze, Mix ${mixText}.`
);
