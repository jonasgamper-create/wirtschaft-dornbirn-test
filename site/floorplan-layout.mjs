// Erzeugt aus Etagen, Tischanzahlen und gemerkten Positionen eine Geometrie.
// Reine Rechnung: kein DOM, kein Speicher, keine Uhrzeit. Gleiche Eingabe,
// gleiche Ausgabe - das ist Bedingung fuer die Testfixtures und dafuer, dass
// dieselbe Funktion spaeter serverseitig laufen kann.

export const GRID = { cols: 24, gap: 1, minSpan: 3, minSeats: 2, maxSeats: 10 };

/**
 * Fussabdruck in Rastereinheiten. Waechst mit der Personenzahl, aber nicht
 * linear - ein Zehnertisch ist laenger als ein Zweiertisch, nicht fuenfmal so
 * lang. Die Hoehe bleibt gleich, damit Reihen sauber ausrichten.
 * 2P/3P: 3 · 4P/5P: 4 · 6P/7P: 5 · 8P/9P: 6 · 10P: 7
 */
export function footprint(seats) {
  const size = Math.max(GRID.minSeats, Math.min(GRID.maxSeats, Math.trunc(Number(seats) || 0)));
  return { w: 3 + Math.floor((size - 2) / 2), h: 3 };
}

/**
 * Ab wie vielen Gaesten ein Tisch ueberhaupt in Frage kommt. Die Haelfte der
 * Plaetze ist die Untergrenze: eine Einzelperson blockiert keinen Vierer, aber
 * sieben Gaeste duerfen notfalls an den Zehner. Welcher Tisch am Ende gewinnt,
 * entscheidet ohnehin die kleinste Sitzplatzverschwendung.
 */
export const defaultMinGuests = seats => Math.max(1, Math.ceil(Number(seats) / 2));

export const seatSizes = counts => Object.keys(counts || {})
  .map(Number)
  .filter(size => Number.isInteger(size) && size >= GRID.minSeats && size <= GRID.maxSeats)
  .sort((a, b) => a - b);

const pad = value => String(value).padStart(2, '0');

/** Echte Ueberschneidung - beim Verschieben duerfen Tische aneinander stossen. */
export function overlapsRect(a, b) {
  return a.col < b.col + b.w && b.col < a.col + a.w && a.row < b.row + b.h && b.row < a.row + a.h;
}

/** Beim automatischen Platzieren halten wir zusaetzlich einen Gang frei. */
function tooClose(a, b, gap) {
  return a.col < b.col + b.w + gap && b.col < a.col + a.w + gap
    && a.row < b.row + b.h + gap && b.row < a.row + a.h + gap;
}

function findSpot(placed, spec, grid) {
  for (let row = 0; row < 400; row += 1) {
    for (let col = 0; col + spec.w <= grid.cols; col += 1) {
      const candidate = { col, row, w: spec.w, h: spec.h };
      if (!placed.some(other => tooClose(candidate, other, grid.gap))) return { col, row };
    }
  }
  return { col: 0, row: 0 };
}

/**
 * Legt die Tische einer Etage. Gemerkte Positionen gewinnen; alles ohne
 * Position rutscht in die erste freie Luecke. So bleibt eine von Hand
 * gebaute Anordnung erhalten, wenn nur die Anzahl geaendert wird.
 */
export function buildLevelGeometry(level, grid = GRID) {
  const counts = level?.counts || {};
  const positions = level?.positions || {};
  const specs = [];

  // Groesste zuerst: sie brauchen den Platz, kleine fuellen die Luecken.
  for (const seats of seatSizes(counts).reverse()) {
    const count = Math.max(0, Math.trunc(Number(counts[seats] ?? counts[String(seats)] ?? 0)));
    const size = footprint(seats);
    for (let index = 0; index < count; index += 1) {
      specs.push({ id: `${level.id}-${seats}-${pad(index + 1)}`, levelId: level.id, seats, ...size });
    }
  }

  const placed = [];
  const pending = [];
  for (const spec of specs) {
    const pinned = positions[spec.id];
    const col = Number(pinned?.col);
    const row = Number(pinned?.row);
    if (Number.isInteger(col) && Number.isInteger(row) && col >= 0 && row >= 0 && col + spec.w <= grid.cols) {
      placed.push({ ...spec, col, row, pinned: true });
    } else {
      pending.push(spec);
    }
  }
  for (const spec of pending) {
    placed.push({ ...spec, ...findSpot(placed, spec, grid), pinned: false });
  }

  // Leserichtung: oben links nach unten rechts. Das macht die Karte
  // selbsterklaerend - Tisch 1 ist der erste, den man beim Reinkommen sieht.
  placed.sort((a, b) => a.row - b.row || a.col - b.col || a.id.localeCompare(b.id));

  const rows = placed.reduce((max, table) => Math.max(max, table.row + table.h), 0);
  return { cols: grid.cols, rows, tables: placed };
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
      minGuests: Number.isFinite(Number(combo.minGuests)) ? Number(combo.minGuests) : defaultMinGuests(seats),
      maxGuests: Number.isFinite(Number(combo.maxGuests)) ? Number(combo.maxGuests) : seats
    });
  }

  return { grid, levels: built, tables: all, combos, orphans, policy: config?.policy || {} };
}

/** Zaehlt die Tische je Personenzahl. Kombinationen zaehlen als eigene Groesse. */
export function deriveTableMix(floorplan, levelIds) {
  const wanted = Array.isArray(levelIds) && levelIds.length ? new Set(levelIds) : null;
  const mix = {};
  const combined = new Set();

  for (const combo of floorplan.combos) {
    if (wanted && !wanted.has(combo.levelId)) continue;
    mix[combo.seats] = (mix[combo.seats] || 0) + 1;
    combo.tableIds.forEach(id => combined.add(id));
  }
  for (const table of floorplan.tables) {
    if (wanted && !wanted.has(table.levelId)) continue;
    if (combined.has(table.id)) continue;
    mix[table.seats] = (mix[table.seats] || 0) + 1;
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

/**
 * Prueft, ob ein Tisch an eine Position darf. Gibt den Grund zurueck, damit
 * die Oberflaeche sagen kann, warum ein Zug nicht geht.
 */
export function canPlace(floorplan, tableId, col, row, grid = GRID) {
  const table = floorplan.tables.find(item => item.id === tableId);
  if (!table) return { ok: false, reason: 'unknown' };
  if (col < 0 || row < 0 || col + table.w > grid.cols) return { ok: false, reason: 'outside' };
  const moved = { col, row, w: table.w, h: table.h };
  const clash = floorplan.tables.find(other =>
    other.id !== tableId && other.levelId === table.levelId && overlapsRect(moved, other));
  return clash ? { ok: false, reason: 'occupied', blockedBy: clash.number } : { ok: true };
}
