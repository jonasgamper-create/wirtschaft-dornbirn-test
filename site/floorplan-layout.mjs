// Erzeugt aus Etagen und Tischanzahlen eine reproduzierbare Geometrie.
// Reine Rechnung: kein DOM, kein Speicher, keine Uhrzeit. Gleiche Eingabe,
// gleiche Ausgabe - das ist Bedingung fuer die Testfixtures und dafuer, dass
// dieselbe Funktion spaeter serverseitig laufen kann.

export const GRID = { cols: 24, gap: 1, minSpan: 3 };

// Fussabdruck in Rastereinheiten. 3 ist das Minimum, damit ein Tisch auf
// 390 px Breite noch ueber 44 px Tapflaeche kommt (344 px / 24 Spalten = 14,3 px).
export const FOOTPRINT = { 2: { w: 3, h: 3 }, 4: { w: 4, h: 3 } };

export const SEAT_SIZES = [4, 2];

const pad = value => String(value).padStart(2, '0');

/**
 * Legt die Tische einer Etage zeilenweise ins Raster.
 * Vierertische zuerst - sie brauchen mehr Platz und ergeben ohne Luecken
 * ein ruhigeres Bild.
 */
export function buildLevelGeometry(level, grid = GRID) {
  const tables = [];
  let col = 0;
  let row = 0;
  let rowHeight = 0;

  for (const seats of SEAT_SIZES) {
    const count = Math.max(0, Math.trunc(Number(level?.counts?.[seats] ?? level?.counts?.[String(seats)] ?? 0)));
    const size = FOOTPRINT[seats];
    for (let index = 0; index < count; index += 1) {
      if (col + size.w > grid.cols) {
        col = 0;
        row += rowHeight + grid.gap;
        rowHeight = 0;
      }
      tables.push({
        id: `${level.id}-${seats}-${pad(index + 1)}`,
        levelId: level.id,
        seats,
        col,
        row,
        w: size.w,
        h: size.h
      });
      col += size.w + grid.gap;
      rowHeight = Math.max(rowHeight, size.h);
    }
  }

  return { cols: grid.cols, rows: row + rowHeight, tables };
}

/**
 * Baut aus der Konfiguration den vollstaendigen Plan: Geometrie je Etage,
 * fortlaufende Tischnummern ueber alle Etagen und aufgeloeste Kombinationen.
 */
export function buildFloorplan(config, grid = GRID) {
  const levels = [...(config?.levels || [])]
    .filter(level => level && typeof level.id === 'string')
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || a.id.localeCompare(b.id));

  let number = Math.max(1, Math.trunc(Number(config?.numbering?.start) || 1));
  const built = [];
  const all = [];

  for (const level of levels) {
    const geometry = buildLevelGeometry(level, grid);
    const tables = geometry.tables.map(table => ({ ...table, number: number++, levelName: level.name }));
    built.push({ id: level.id, name: level.name, order: Number(level.order) || 0, cols: geometry.cols, rows: geometry.rows, tables });
    all.push(...tables);
  }

  const byId = new Map(all.map(table => [table.id, table]));
  const combos = [];
  const orphans = [];

  for (const combo of config?.combos || []) {
    const ids = Array.isArray(combo?.tables) ? combo.tables : [];
    const members = ids.map(id => byId.get(id)).filter(Boolean);
    if (members.length !== ids.length || members.length < 2) {
      orphans.push({ id: combo?.id, tables: ids });
      continue;
    }
    const seats = members.reduce((sum, table) => sum + table.seats, 0);
    combos.push({
      id: combo.id || members.map(table => table.id).join('+'),
      tableIds: members.map(table => table.id),
      levelId: members[0].levelId,
      seats,
      minGuests: Number.isFinite(Number(combo.minGuests)) ? Number(combo.minGuests) : Math.max(1, seats - 2),
      maxGuests: Number.isFinite(Number(combo.maxGuests)) ? Number(combo.maxGuests) : seats
    });
  }

  return { grid, levels: built, tables: all, combos, orphans, policy: config?.policy || {} };
}

/**
 * Haelt das bestehende Feld tables:{2,4,6,8} des Cockpits am Leben, damit
 * tableSeats() und die vorhandenen Tabellen unveraendert weiterlaufen.
 * Sechser und Achter entstehen ausschliesslich aus Kombinationen.
 */
export function deriveTableMix(floorplan, levelIds) {
  const wanted = Array.isArray(levelIds) && levelIds.length ? new Set(levelIds) : null;
  const mix = { 2: 0, 4: 0, 6: 0, 8: 0 };
  const combined = new Set();

  for (const combo of floorplan.combos) {
    if (wanted && !wanted.has(combo.levelId)) continue;
    if (mix[combo.seats] === undefined) continue;
    mix[combo.seats] += 1;
    combo.tableIds.forEach(id => combined.add(id));
  }
  for (const table of floorplan.tables) {
    if (wanted && !wanted.has(table.levelId)) continue;
    if (combined.has(table.id)) continue;
    mix[table.seats] += 1;
  }
  return mix;
}

/** Sitzplaetze gesamt - Kombinationen zaehlen nicht doppelt. */
export function totalSeats(floorplan, levelIds) {
  const wanted = Array.isArray(levelIds) && levelIds.length ? new Set(levelIds) : null;
  return floorplan.tables
    .filter(table => !wanted || wanted.has(table.levelId))
    .reduce((sum, table) => sum + table.seats, 0);
}
