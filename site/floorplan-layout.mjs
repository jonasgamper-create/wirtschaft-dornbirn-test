// Geometrie des Tischplans. Reine Rechnung: kein DOM, kein Speicher, keine
// Uhrzeit. Gleiche Eingabe, gleiche Ausgabe - Bedingung fuer die Testfixtures
// und dafuer, dass dieselbe Funktion spaeter serverseitig laufen kann.

export const GRID = { cols: 24, gap: 1, minSeats: 1, maxSeats: 12 };

// Ein Tisch ist so hoch, dass oben und unten Stuehle Platz haben. Die Breite
// waechst mit der Personenzahl, aber nicht linear: ein Zehnertisch ist laenger
// als ein Zweiertisch, nicht fuenfmal so lang.
export function footprint(seats) {
  const size = clampSeats(seats);
  return { w: 3 + Math.floor(Math.max(0, size - 2) / 2), h: 4 };
}

export const clampSeats = value =>
  Math.max(GRID.minSeats, Math.min(GRID.maxSeats, Math.trunc(Number(value) || 0)));

/**
 * Ab wie vielen Gaesten ein Tisch in Frage kommt. Die Haelfte der Plaetze ist
 * die Untergrenze: eine Einzelperson blockiert keinen Vierer, aber sieben
 * Gaeste duerfen notfalls an den Zehner. Welcher Tisch gewinnt, entscheidet
 * ohnehin die kleinste Sitzplatzverschwendung.
 */
export const defaultMinGuests = seats => Math.max(1, Math.ceil(Number(seats) / 2));

/**
 * Stuehle rund um den Tisch. Oben die groessere Haelfte, unten der Rest -
 * bei sehr grossen Tischen kommt je einer an die Schmalseiten.
 * Rein geometrisch, damit der Renderer nur noch zeichnen muss.
 */
export function chairSlots(table) {
  const seats = clampSeats(table.seats);
  const body = tableBody(table);
  const slots = [];
  const side = seats >= 8 ? 1 : 0;
  const rest = seats - side * 2;
  const top = Math.ceil(rest / 2);
  const bottom = rest - top;

  const row = (count, y) => {
    for (let i = 0; i < count; i += 1) {
      slots.push({ x: body.x + (body.w * (i + 0.5)) / count - 0.25, y, w: 0.5, h: 0.4 });
    }
  };
  row(top, table.row + 0.18);
  row(bottom, table.row + table.h - 0.58);
  for (let i = 0; i < side; i += 1) {
    const y = body.y + body.h / 2 - 0.25;
    slots.push({ x: table.col + 0.18, y, w: 0.4, h: 0.5 });
    slots.push({ x: table.col + table.w - 0.58, y, w: 0.4, h: 0.5 });
  }
  return slots;
}

/** Die Tischplatte selbst - der Fussabdruck enthaelt zusaetzlich die Stuehle. */
export function tableBody(table) {
  return { x: table.col + 0.15, y: table.row + 0.75, w: table.w - 0.3, h: table.h - 1.5 };
}

// Raumobjekte zur Orientierung. Sie blockieren keine Tische - der Wirt ordnet
// von Hand an, und eine Sperre waere hier eher im Weg als eine Hilfe. Nur die
// automatische Platzierung neuer Tische weicht ihnen aus.
export const ELEMENTS = {
  eingang: { label: 'Eingang', w: 4, h: 1 },
  ausgang: { label: 'Ausgang', w: 4, h: 1 },
  bar: { label: 'Bar', w: 7, h: 2 },
  buehne: { label: 'Bühne', w: 9, h: 3 },
  terrasse: { label: 'Terrasse', w: 7, h: 4 },
  wand: { label: '', w: 8, h: 1 }
};

export const elementKinds = () => Object.keys(ELEMENTS);

const pad = value => String(value).padStart(2, '0');

export function overlapsRect(a, b) {
  return a.col < b.col + b.w && b.col < a.col + a.w && a.row < b.row + b.h && b.row < a.row + a.h;
}

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
 * Position rutscht in die erste freie Luecke. So bleibt eine von Hand gebaute
 * Anordnung erhalten, wenn nur ein Tisch dazukommt.
 */
export function buildLevelGeometry(level, grid = GRID) {
  const specs = (Array.isArray(level?.tables) ? level.tables : []).map(table => ({
    id: table.id,
    levelId: level.id,
    seats: clampSeats(table.seats),
    seatNames: Array.isArray(table.seatNames) ? table.seatNames : [],
    ...footprint(table.seats),
    col: Number.isInteger(table.col) ? table.col : null,
    row: Number.isInteger(table.row) ? table.row : null
  }));

  const elements = (Array.isArray(level?.elements) ? level.elements : [])
    .filter(item => item && ELEMENTS[item.kind])
    .map((item, index) => ({
      id: item.id || `${level.id}-e${pad(index + 1)}`,
      levelId: level.id,
      kind: item.kind,
      label: typeof item.label === 'string' ? item.label : ELEMENTS[item.kind].label,
      col: Number.isInteger(item.col) ? item.col : 0,
      row: Number.isInteger(item.row) ? item.row : 0,
      w: Number.isInteger(item.w) ? item.w : ELEMENTS[item.kind].w,
      h: Number.isInteger(item.h) ? item.h : ELEMENTS[item.kind].h
    }));

  const placed = [];
  for (const spec of specs.filter(item => item.col !== null && item.row !== null && item.col + item.w <= grid.cols)) {
    placed.push({ ...spec, pinned: true });
  }
  // Neue Tische weichen auch Raumobjekten aus - sonst landet der erste Tisch
  // mitten auf der Buehne.
  for (const spec of specs.filter(item => !placed.some(done => done.id === item.id))) {
    placed.push({ ...spec, ...findSpot([...placed, ...elements], spec, grid), pinned: false });
  }

  // Leserichtung: oben links nach unten rechts. Das macht die Karte
  // selbsterklaerend - Tisch 1 ist der erste, den man beim Reinkommen sieht.
  placed.sort((a, b) => a.row - b.row || a.col - b.col || String(a.id).localeCompare(String(b.id)));
  const rows = [...placed, ...elements].reduce((max, item) => Math.max(max, item.row + item.h), 0);
  return { cols: grid.cols, rows, tables: placed, elements };
}

// Betriebsart je Tischordnung. "frei" ist der rollende Betrieb: die Dauer
// haengt an der Gruppengroesse. "schichten" ist der Doppelbetrieb: feste
// Anfangszeiten, alle gleich lang, Tisch danach wieder frei.
//
// Beides zusammen geht nicht: bei festen Schichten bestimmt der Abstand zur
// naechsten Schicht die Dauer, nicht die Gruppengroesse. Sonst blockiert ein
// Vierertisch mit 105 Minuten die zweite Schicht.
export const DEFAULT_SERVICE = {
  mode: 'frei',
  seatings: ['11:30', '12:45'],
  endsAt: '13:45',
  bufferMinutes: 15,
  // Die berechnete Sitzdauer ist eine Richtzeit, keine Tatsache. Ist sie aus,
  // bleibt ein Tisch belegt, bis jemand "Fertig" drueckt - so arbeiten Haeuser,
  // die den Tisch nicht nach der Uhr weitergeben. Der Preis dafuer: wer das
  // Abraeumen nicht meldet, blockiert den Tisch bis Betriebsschluss.
  richtzeit: true
};

/** Minuten bis Betriebsschluss - die Belegung ohne Richtzeit. */
export const BIS_TAGESENDE = 24 * 60;

export const serviceOf = layout => ({ ...DEFAULT_SERVICE, ...(layout?.service || {}) });

const minutesOf = value => {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(value || ''));
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

/**
 * Rechnet die Schichten aus: wann sie beginnen und wie lange die Gaeste
 * tatsaechlich sitzen. Die letzte Schicht laeuft bis endsAt, alle anderen bis
 * zur naechsten minus Pufferzeit.
 */
export function seatingPlan(service) {
  const rules = { ...DEFAULT_SERVICE, ...service };
  const buffer = Math.max(0, Number(rules.bufferMinutes) || 0);
  const times = [...new Set((rules.seatings || []).filter(minutesOf))]
    .sort((a, b) => minutesOf(a) - minutesOf(b));
  const ende = minutesOf(rules.endsAt) ?? (times.length ? minutesOf(times[times.length - 1]) + 90 : 0);

  return times.map((time, index) => {
    const start = minutesOf(time);
    const bis = index + 1 < times.length ? minutesOf(times[index + 1]) - buffer : ende;
    return { time, minutes: Math.max(0, bis - start), naechste: times[index + 1] || null };
  });
}

/** Die gerade aktive Tischordnung, mit Rueckfall auf die erste. */
export function activeLayout(config) {
  const layouts = Array.isArray(config?.layouts) ? config.layouts : [];
  return layouts.find(layout => layout.id === config?.activeLayout) || layouts[0] || null;
}

/**
 * Baut aus der Konfiguration den vollstaendigen Plan der aktiven Ordnung:
 * Geometrie je Etage, fortlaufende Tischnummern und aufgeloeste Kombinationen.
 */
export function buildFloorplan(config, grid = GRID) {
  const layout = activeLayout(config);
  const levels = [...(layout?.levels || [])]
    .filter(level => level && typeof level.id === 'string')
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || a.id.localeCompare(b.id));

  // Zwei Zaehlweisen: fortlaufend ueber alle Etagen, oder in jeder Etage neu
  // bei 1. Bei "pro-etage" gibt es Tisch 1 mehrfach - dann muss ueberall die
  // Etage dazu, sonst schickt man Gaeste in den falschen Raum.
  const start = Math.max(1, Math.trunc(Number(config?.numbering?.start) || 1));
  const proEtage = config?.numbering?.mode === 'pro-etage';
  let number = start;
  const built = [];
  const all = [];

  for (const level of levels) {
    if (proEtage) number = start;
    const geometry = buildLevelGeometry(level, grid);
    const tables = geometry.tables.map(table => ({ ...table, number: number++, levelName: level.name }));
    built.push({
      id: level.id,
      name: level.name,
      order: Number(level.order) || 0,
      cols: geometry.cols,
      rows: geometry.rows,
      tables,
      elements: geometry.elements
    });
    all.push(...tables);
  }

  const byId = new Map(all.map(table => [table.id, table]));
  const combos = [];
  const orphans = [];

  for (const combo of layout?.combos || []) {
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

  return {
    grid,
    layoutId: layout?.id || null,
    layoutName: layout?.name || '',
    numberingMode: proEtage ? 'pro-etage' : 'fortlaufend',
    service: serviceOf(layout),
    levels: built,
    tables: all,
    combos,
    orphans,
    policy: config?.policy || {}
  };
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

/**
 * Beschriftung eines Tisches. Zaehlt jede Etage neu, gehoert die Etage dazu -
 * "Tisch 1" allein waere sonst mehrdeutig.
 */
export const tableLabel = (table, plan) =>
  (plan?.numberingMode === 'pro-etage' && plan.levels?.length > 1)
    ? `${table.number} · ${table.levelName}`
    : String(table.number);

/** Naechste freie Tisch-Kennung einer Etage. */
export function nextTableId(level) {
  const used = new Set((level.tables || []).map(table => table.id));
  for (let index = 1; index < 1000; index += 1) {
    const id = `${level.id}-t${pad(index)}`;
    if (!used.has(id)) return id;
  }
  return `${level.id}-t999`;
}

/** Naechste freie Kennung fuer ein Raumobjekt. */
export function nextElementId(level) {
  const used = new Set((level.elements || []).map(item => item.id));
  for (let index = 1; index < 1000; index += 1) {
    const id = `${level.id}-e${pad(index)}`;
    if (!used.has(id)) return id;
  }
  return `${level.id}-e999`;
}

/**
 * Stuhlnamen auf die Platzzahl bringen. Wird ein Stuhl entfernt, faellt sein
 * Name weg; kommt einer dazu, bleibt er leer.
 */
export function seatNamesFor(table) {
  const seats = clampSeats(table.seats);
  const names = Array.isArray(table.seatNames) ? table.seatNames : [];
  return Array.from({ length: seats }, (_, index) => String(names[index] || ''));
}

/**
 * Hebt eine Konfiguration auf Version 2. Version 1 kannte nur eine Ordnung und
 * beschrieb Tische ueber Anzahlen; jetzt sind es benannte Ordnungen mit
 * einzeln adressierbaren Tischen.
 */
export function migrate(config) {
  if (!config || typeof config !== 'object') return config;
  if (Number(config.version) >= 2 && Array.isArray(config.layouts)) return config;

  const levels = (config.levels || []).map(level => {
    const tables = [];
    let index = 1;
    for (const seats of Object.keys(level.counts || {}).map(Number).sort((a, b) => b - a)) {
      const count = Math.max(0, Math.trunc(Number(level.counts[seats]) || 0));
      for (let i = 0; i < count; i += 1) {
        const oldId = `${level.id}-${seats}-${pad(i + 1)}`;
        const spot = (level.positions || {})[oldId];
        tables.push({
          id: `${level.id}-t${pad(index++)}`,
          legacyId: oldId,
          seats,
          col: Number.isInteger(spot?.col) ? spot.col : null,
          row: Number.isInteger(spot?.row) ? spot.row : null
        });
      }
    }
    return { id: level.id, name: level.name, order: level.order, tables };
  });

  const map = new Map(levels.flatMap(level => level.tables.map(table => [table.legacyId, table.id])));
  levels.forEach(level => level.tables.forEach(table => { delete table.legacyId; }));

  return {
    version: 2,
    updatedAt: config.updatedAt,
    status: config.status,
    numbering: config.numbering || { start: 1 },
    activeLayout: 'standard',
    layouts: [{
      id: 'standard',
      name: 'Standard',
      levels,
      combos: (config.combos || []).map(combo => ({
        ...combo,
        tables: (combo.tables || []).map(id => map.get(id) || id)
      }))
    }],
    policy: config.policy || {},
    menu: config.menu
  };
}
