import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { GRID, buildFloorplan, deriveTableMix, totalSeats } from '../site/floorplan-layout.mjs';

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

const levels = Array.isArray(config.levels) ? config.levels : [];
if (!levels.length || levels.length > 4) fail('Es braucht 1 bis 4 Etagen.');

const seenLevel = new Set();
const seenOrder = new Set();
for (const [index, level] of levels.entries()) {
  if (!/^[a-z][a-z0-9-]{1,15}$/.test(level?.id || '')) fail(`levels[${index}].id ist keine saubere Kennung.`);
  if (seenLevel.has(level?.id)) fail(`Etagen-ID "${level.id}" kommt doppelt vor.`);
  seenLevel.add(level?.id);
  if (!level?.name?.trim()) fail(`levels[${index}].name fehlt.`);
  if (!Number.isInteger(level?.order)) fail(`levels[${index}].order muss eine ganze Zahl sein.`);
  if (seenOrder.has(level?.order)) fail(`order ${level.order} kommt doppelt vor - die Reihenfolge wäre unbestimmt.`);
  seenOrder.add(level?.order);

  const counts = level?.counts || {};
  const keys = Object.keys(counts);
  if (!keys.length || keys.some(key => !['2', '4'].includes(key))) {
    fail(`levels[${index}].counts erlaubt nur die Schlüssel "2" und "4". Sechser und Achter entstehen über Kombinationen.`);
  }
  for (const key of keys) {
    const value = counts[key];
    if (!Number.isInteger(value) || value < 0 || value > 99) fail(`levels[${index}].counts["${key}"] muss 0 bis 99 sein.`);
  }
  if (keys.reduce((sum, key) => sum + (Number(counts[key]) || 0), 0) === 0) {
    fail(`levels[${index}] hat keine Tische.`);
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
    if (table.w < GRID.minSpan || table.h < GRID.minSpan) {
      fail(`Tisch ${table.id} ist kleiner als ${GRID.minSpan} Rastereinheiten und fällt unter 44 px auf 390 px Breite.`);
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

const seenNumber = new Set();
for (const table of floorplan.tables) {
  if (seenNumber.has(table.number)) fail(`Tischnummer ${table.number} kommt doppelt vor.`);
  seenNumber.add(table.number);
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
if (levelOrder.length !== levels.length || levelOrder.some(id => !seenLevel.has(id))) {
  fail('policy.levelOrder muss genau die vorhandenen Etagen enthalten.');
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const mix = deriveTableMix(floorplan);
console.log(
  `Tischplan-Prüfung OK (${config.status}): ${floorplan.levels.length} Etagen, ${floorplan.tables.length} Tische, `
  + `${totalSeats(floorplan)} Plätze, Mix 2er ${mix[2]} / 4er ${mix[4]} / 6er ${mix[6]} / 8er ${mix[8]}.`
);
