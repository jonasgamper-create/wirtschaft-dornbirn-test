// Geometrie des Tischplans. Reine Rechnung: kein DOM, kein Speicher, keine
// Uhrzeit. Gleiche Eingabe, gleiche Ausgabe - Bedingung fuer die Testfixtures
// und dafuer, dass dieselbe Funktion spaeter serverseitig laufen kann.

export const GRID = { cols: 24, gap: 1, minSeats: 1, maxSeats: 12 };

/**
 * Tischformen. Ein Gasthaus hat nicht nur Rechtecke: der runde Stammtisch, die
 * lange Tafel fuer Hochzeiten, die Theke mit Hockern auf einer Seite. Wer die
 * echte Anordnung nicht abbilden kann, plant an seinem Haus vorbei.
 */
export const FORMEN = {
  laenglich: { label: 'Länglich', seiten: 2 },
  rund: { label: 'Rund', seiten: 4 },
  tafel: { label: 'Lange Tafel', seiten: 2 },
  theke: { label: 'Theke', seiten: 1 }
};

export const formKinds = () => Object.keys(FORMEN);
export const formOf = table => (FORMEN[table?.form] ? table.form : 'laenglich');
/** Gedreht heisst: um 90 Grad, also hochkant statt quer. */
export const istGedreht = table => Number(table?.dreh) === 90;

/**
 * Grundflaeche in Rastereinheiten. Die Breite waechst mit der Personenzahl,
 * aber nicht linear: ein Zehnertisch ist laenger als ein Zweiertisch, nicht
 * fuenfmal so lang. Beim Drehen tauschen Breite und Hoehe die Rollen - der
 * Tisch wird nicht groesser, er steht nur anders.
 */
export function footprint(seats, table = null) {
  const size = clampSeats(seats);
  const form = table ? formOf(table) : 'laenglich';
  let mass;
  if (form === 'rund') {
    // Rund braucht in beide Richtungen Platz, weil rundherum Stuehle stehen.
    const d = Math.max(4, 3 + Math.ceil(Math.max(0, size - 2) / 3));
    mass = { w: d, h: d };
  } else if (form === 'tafel') {
    // Eine Tafel waechst je Gast, damit die lange Reihe auch lang aussieht.
    mass = { w: Math.min(20, 4 + Math.max(0, size - 2)), h: 4 };
  } else if (form === 'theke') {
    // Nur eine Seite bestuhlt, dafuer flacher.
    mass = { w: Math.min(20, 2 + size), h: 3 };
  } else {
    mass = { w: 3 + Math.floor(Math.max(0, size - 2) / 2), h: 4 };
  }
  // Rund bleibt rund: Drehen aendert dort nichts.
  if (table && istGedreht(table) && form !== 'rund') return { w: mass.h, h: mass.w };
  return mass;
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
  const form = formOf(table);
  const body = tableBody(table);
  const slots = [];

  // Rund: die Stuehle stehen im Kreis. Bei null Grad faengt es oben an, damit
  // Platz 1 dort liegt, wo man bei einem Stammtisch zu zaehlen anfaengt.
  if (form === 'rund') {
    const mx = body.x + body.w / 2;
    const my = body.y + body.h / 2;
    const r = Math.max(body.w, body.h) / 2 + 0.42;
    for (let i = 0; i < seats; i += 1) {
      const winkel = -Math.PI / 2 + (2 * Math.PI * i) / seats;
      slots.push({ x: mx + Math.cos(winkel) * r - 0.25, y: my + Math.sin(winkel) * r - 0.25, w: 0.5, h: 0.5 });
    }
    return slots;
  }

  const gedreht = istGedreht(table);
  // Laengs des Tisches verteilen, quer dazu die beiden Seiten.
  const laengeVon = gedreht ? body.h : body.w;
  const reihe = (anzahl, quer, ausserhalb) => {
    for (let i = 0; i < anzahl; i += 1) {
      const mitte = (laengeVon * (i + 0.5)) / anzahl;
      if (gedreht) {
        slots.push({ x: quer, y: body.y + mitte - 0.25, w: 0.4, h: 0.5 });
      } else {
        slots.push({ x: body.x + mitte - 0.25, y: quer, w: 0.5, h: 0.4 });
      }
      void ausserhalb;
    }
  };

  // Theke: nur eine Seite bestuhlt.
  if (form === 'theke') {
    reihe(seats, gedreht ? table.col + table.w - 0.58 : table.row + table.h - 0.58);
    return slots;
  }

  // Sehr grosse Tische bekommen zusaetzlich je einen Platz an den Schmalseiten.
  const kopf = seats >= 8 ? 1 : 0;
  const rest = seats - kopf * 2;
  const eins = Math.ceil(rest / 2);
  const zwei = rest - eins;
  reihe(eins, gedreht ? table.col + 0.18 : table.row + 0.18);
  reihe(zwei, gedreht ? table.col + table.w - 0.58 : table.row + table.h - 0.58);
  for (let i = 0; i < kopf; i += 1) {
    if (gedreht) {
      const x = body.x + body.w / 2 - 0.25;
      slots.push({ x, y: table.row + 0.18, w: 0.5, h: 0.4 });
      slots.push({ x, y: table.row + table.h - 0.58, w: 0.5, h: 0.4 });
    } else {
      const y = body.y + body.h / 2 - 0.25;
      slots.push({ x: table.col + 0.18, y, w: 0.4, h: 0.5 });
      slots.push({ x: table.col + table.w - 0.58, y, w: 0.4, h: 0.5 });
    }
  }
  return slots;
}

/** Die Tischplatte selbst - der Fussabdruck enthaelt zusaetzlich die Stuehle. */
export function tableBody(table) {
  const form = formOf(table);
  // Rund: rundherum Stuehle, also auf allen Seiten derselbe Abstand.
  if (form === 'rund') {
    return { x: table.col + 0.75, y: table.row + 0.75, w: table.w - 1.5, h: table.h - 1.5 };
  }
  // Theke: nur eine Seite bestuhlt, die andere darf an die Wand.
  if (form === 'theke') {
    const rand = istGedreht(table)
      ? { x: 0.15, y: 0.15, w: 0.9, h: 0.3 }
      : { x: 0.15, y: 0.15, w: 0.3, h: 0.9 };
    return { x: table.col + rand.x, y: table.row + rand.y, w: table.w - rand.w, h: table.h - rand.h };
  }
  // Sonst: an den bestuhlten Laengsseiten mehr Luft als an den Schmalseiten.
  // Beim Drehen tauschen die beiden Abstaende die Richtung.
  const laengs = 0.75;
  const quer = 0.15;
  const ix = istGedreht(table) ? laengs : quer;
  const iy = istGedreht(table) ? quer : laengs;
  return { x: table.col + ix, y: table.row + iy, w: table.w - 2 * ix, h: table.h - 2 * iy };
}

// Raumobjekte zur Orientierung. Sie blockieren keine Tische - der Wirt ordnet
// von Hand an, und eine Sperre waere hier eher im Weg als eine Hilfe. Nur die
// automatische Platzierung neuer Tische weicht ihnen aus.
/**
 * Massstab. Eine Rastereinheit ist ein halber Meter - damit ist ein Vierertisch
 * 2 mal 2 Meter und ein Zweiertisch 1,5 mal 2 Meter, also das, was wirklich im
 * Raum steht. Ohne festen Massstab ist jede Zeichnung nur ein Bild und beim
 * Ausmessen im Lokal wertlos.
 */
export const METER_PRO_EINHEIT = 0.5;

/** Rastereinheiten als Meterangabe, wie man sie hinschreibt: 3,5 m */
export const alsMeter = einheiten =>
  `${(Number(einheiten) * METER_PRO_EINHEIT).toFixed(1).replace('.', ',')} m`;

// `label` steht im Plan auf dem Element, `name` nur in der Bedienung. Eine
// Saeule traegt keine Aufschrift - der Knopf zum Anlegen braucht aber einen
// Namen, sonst heissen Saeule, Fenster und Wand alle gleich.
export const ELEMENTS = {
  eingang: { label: 'Eingang', name: 'Eingang', w: 4, h: 1 },
  ausgang: { label: 'Ausgang', name: 'Ausgang', w: 4, h: 1 },
  bar: { label: 'Bar', name: 'Bar', w: 7, h: 2 },
  buehne: { label: 'Bühne', name: 'Bühne', w: 9, h: 3 },
  terrasse: { label: 'Terrasse', name: 'Terrasse', w: 7, h: 4 },
  // Ein Gastraum besteht nicht nur aus Tischen. Der Weg zur Toilette, die
  // Saeule mitten im Raum und die Garderobe entscheiden mit darueber, wo ein
  // Tisch ueberhaupt stehen kann.
  toilette: { label: 'WC', name: 'WC', w: 3, h: 2 },
  garderobe: { label: 'Garderobe', name: 'Garderobe', w: 4, h: 1 },
  kueche: { label: 'Küche', name: 'Küche', w: 6, h: 3 },
  saeule: { label: '', name: 'Säule', w: 1, h: 1 },
  fenster: { label: '', name: 'Fenster', w: 4, h: 1 },
  weg: { label: 'Weg', name: 'Weg zur Toilette', w: 2, h: 6 },
  // Ecke wegnehmen: dieser Bereich gehoert nicht zum Gastraum. Ein Rechteck
  // minus Rechtecke ergibt jede Form mit rechten Winkeln - L, U, Nische. Ein
  // Vieleck-Editor waere maechtiger und fuer den Zweck deutlich zu
  // umstaendlich, und niemand zeichnet damit freiwillig einen Gastraum.
  ausschnitt: { label: '', name: 'Ecke wegnehmen', w: 6, h: 6 },
  // Waende sind der Weg zu einem Raum, der nicht rechteckig ist: mehrere
  // Segmente ergeben jeden Grundriss. Ein Vieleck-Editor waere maechtiger und
  // fuer den Zweck deutlich zu umstaendlich.
  wand: { label: '', name: 'Wand', w: 8, h: 1 }
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

function findSpot(placed, spec, grid, breite = grid.cols, umriss = null) {
  for (let row = 0; row < 400; row += 1) {
    for (let col = 0; col + spec.w <= breite; col += 1) {
      const candidate = { col, row, w: spec.w, h: spec.h };
      if (umriss && !rechteckImUmriss(candidate, umriss)) continue;
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
/**
 * Die Raumflaeche einer Etage in Rastereinheiten. Traegt die Etage eigene
 * Masse, gelten die - so passt der Plan zum echten Lokal statt zu einem
 * Standardraster. Ohne Angabe bleibt es bei der bisherigen Breite.
 */
export function raumMass(level, grid = GRID) {
  const breite = Number.isInteger(level?.breite) && level.breite >= 6
    ? Math.min(level.breite, 60) : grid.cols;
  const tiefe = Number.isInteger(level?.tiefe) && level.tiefe >= 6
    ? Math.min(level.tiefe, 80) : null;
  return { breite, tiefe };
}

export function buildLevelGeometry(level, grid = GRID) {
  const specs = (Array.isArray(level?.tables) ? level.tables : []).map(table => ({
    id: table.id,
    levelId: level.id,
    seats: clampSeats(table.seats),
    seatNames: Array.isArray(table.seatNames) ? table.seatNames : [],
    form: formOf(table),
    dreh: istGedreht(table) ? 90 : 0,
    ...footprint(table.seats, table),
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

  const { breite, tiefe } = raumMass(level, grid);

  const placed = [];
  for (const spec of specs.filter(item => item.col !== null && item.row !== null && item.col + item.w <= breite)) {
    placed.push({ ...spec, pinned: true });
  }
  // Neue Tische weichen auch Raumobjekten aus - sonst landet der erste Tisch
  // mitten auf der Buehne.
  for (const spec of specs.filter(item => !placed.some(done => done.id === item.id))) {
    placed.push({ ...spec, ...findSpot([...placed, ...elements], spec, grid, breite, umrissVon(level)), pinned: false });
  }

  // Leserichtung: oben links nach unten rechts. Das macht die Karte
  // selbsterklaerend - Tisch 1 ist der erste, den man beim Reinkommen sieht.
  placed.sort((a, b) => a.row - b.row || a.col - b.col || String(a.id).localeCompare(String(b.id)));
  // Die Zeichenflaeche ist mindestens der eingestellte Raum. Steht etwas
  // darueber hinaus, waechst sie mit - sonst waere es unsichtbar und man
  // suchte einen Tisch, den es scheinbar nicht gibt.
  const belegt = [...placed, ...elements].reduce((max, item) => Math.max(max, item.row + item.h), 0);
  const umriss = umrissVon(level);
  const umrissTief = umriss ? Math.ceil(Math.max(...umriss.map(([, y]) => y))) : 0;
  const umrissBreit = umriss ? Math.ceil(Math.max(...umriss.map(([x]) => x))) : 0;
  const rows = Math.max(tiefe || 0, umrissTief, belegt);
  return {
    cols: Math.max(breite, umrissBreit),
    rows,
    raum: tiefe ? { breite, tiefe } : null,
    umriss,
    tables: placed,
    elements
  };
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
      raum: geometry.raum,
      umriss: geometry.umriss,
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
/**
 * Der gezeichnete Umriss einer Etage: eine Folge von Punkten in
 * Rastereinheiten. Damit laesst sich jeder Grundriss abbilden, auch mit
 * schraegen Waenden - was mit "Ecke wegnehmen" allein nicht geht.
 * Weniger als drei Punkte ergeben keine Flaeche.
 */
export function umrissVon(level) {
  const roh = level?.umriss;
  if (!Array.isArray(roh) || roh.length < 3) return null;
  const punkte = roh
    .map(punkt => (Array.isArray(punkt) ? punkt : [punkt?.x, punkt?.y]))
    .map(([x, y]) => [Number(x), Number(y)])
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  return punkte.length >= 3 ? punkte : null;
}

/**
 * Liegt ein Punkt im Vieleck? Strahlenverfahren: eine Halbgerade nach rechts
 * schneidet den Rand bei einem Punkt innerhalb ungerade oft.
 */
export function punktImUmriss(x, y, umriss) {
  let drin = false;
  for (let i = 0, j = umriss.length - 1; i < umriss.length; j = i, i += 1) {
    const [xi, yi] = umriss[i];
    const [xj, yj] = umriss[j];
    const schneidet = (yi > y) !== (yj > y)
      && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (schneidet) drin = !drin;
  }
  return drin;
}

/**
 * Passt ein Rechteck vollstaendig in den Umriss? Geprueft wird jede
 * Rasterzelle, die es belegt. Nur die vier Ecken zu pruefen genuegt nicht:
 * ein Tisch kann ueber eine einspringende Ecke hinwegreichen, waehrend alle
 * vier Ecken im Raum liegen.
 */
export function rechteckImUmriss(rect, umriss) {
  for (let x = rect.col; x < rect.col + rect.w; x += 1) {
    for (let y = rect.row; y < rect.row + rect.h; y += 1) {
      if (!punktImUmriss(x + 0.5, y + 0.5, umriss)) return false;
    }
  }
  return true;
}

/** Die weggenommenen Bereiche einer Etage - dort ist kein Gastraum. */
export const ausschnitteVon = level =>
  (level?.elements || []).filter(item => item.kind === 'ausschnitt');

export function canPlace(floorplan, tableId, col, row, grid = GRID) {
  const table = floorplan.tables.find(item => item.id === tableId);
  if (!table) return { ok: false, reason: 'unknown' };
  // Die Grenze ist der Raum dieser Etage, nicht das Raster.
  const heim = floorplan.levels.find(entry => entry.tables.some(item => item.id === tableId));
  const breite = heim?.cols || grid.cols;
  if (col < 0 || row < 0 || col + table.w > breite) return { ok: false, reason: 'outside' };
  const moved = { col, row, w: table.w, h: table.h };
  // In einer weggenommenen Ecke steht kein Tisch - dort ist kein Raum.
  if (ausschnitteVon(heim).some(loch => overlapsRect(moved, loch))) {
    return { ok: false, reason: 'ausserhalb' };
  }
  // Und ist ein Umriss gezeichnet, gilt der.
  const umriss = heim?.umriss;
  if (umriss && !rechteckImUmriss(moved, umriss)) {
    return { ok: false, reason: 'ausserhalb' };
  }
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
