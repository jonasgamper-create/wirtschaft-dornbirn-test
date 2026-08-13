// Goldene Testfaelle fuer die Tischzuweisung. Laeuft ohne Testframework,
// damit npm run ci keine zusaetzliche Abhaengigkeit braucht.

import { GRID, buildFloorplan, canPlace, defaultMinGuests, footprint } from '../site/floorplan-layout.mjs';
import { assignTables, durationFor, shift, stamp } from '../site/table-assignment.mjs';

const errors = [];
const check = (name, condition, detail = '') => {
  if (condition) return;
  errors.push(`Tischzuweisung: ${name}${detail ? ` - ${detail}` : ''}`);
};

const config = {
  numbering: { start: 1 },
  levels: [
    { id: 'eg', name: 'Gaststube', order: 1, counts: { 2: 3, 4: 2 } },
    { id: 'og', name: 'Saal', order: 2, counts: { 2: 1, 4: 1 } }
  ],
  combos: [{ id: 'c1', tables: ['eg-4-01', 'eg-2-01'], minGuests: 5 }],
  policy: {
    durations: [
      { upTo: 2, minutes: 90 },
      { upTo: 4, minutes: 105 },
      { upTo: 6, minutes: 150 },
      { upTo: 20, minutes: 180 }
    ],
    bufferMinutes: 15,
    slotMinutes: 15,
    maxCoversPerSlot: 10,
    levelOrder: ['eg', 'og']
  }
};

const floorplan = buildFloorplan(config);
const policy = config.policy;
const day = '2026-09-01';
const at = time => `${day}T${time}`;
const numbers = result => (result.numbers || []).join('+');

// Nummerierung: Vierertische zuerst, danach Zweiertische, fortlaufend ueber Etagen.
check('Nummerierung fortlaufend ueber Etagen',
  floorplan.tables.map(table => `${table.id}#${table.number}`).join(',')
    === 'eg-4-01#1,eg-4-02#2,eg-2-01#3,eg-2-02#4,eg-2-03#5,og-4-01#6,og-2-01#7',
  floorplan.tables.map(table => `${table.id}#${table.number}`).join(','));

check('Kombination wird aufgeloest',
  floorplan.combos.length === 1 && floorplan.combos[0].seats === 6,
  JSON.stringify(floorplan.combos));

// 1. Zwei Gaeste bekommen den Zweier, nicht den Vierer.
const two = assignTables({ floorplan, guests: 2, startsAt: at('11:30'), policy });
check('2 Gaeste bekommen den Zweiertisch', two.ok && numbers(two) === '3', numbers(two));
check('2 Gaeste ohne Sitzplatzverschwendung', two.seatGap === 0, String(two.seatGap));

// 2. Vier Gaeste bekommen den Vierer.
const four = assignTables({ floorplan, guests: 4, startsAt: at('11:30'), policy });
check('4 Gaeste bekommen den Vierertisch', four.ok && numbers(four) === '1', numbers(four));

// 3. Fuenf Gaeste bekommen die Kombination, nicht zwei getrennte Tische.
const five = assignTables({ floorplan, guests: 5, startsAt: at('11:30'), policy });
check('5 Gaeste bekommen die Kombination', five.ok && numbers(five) === '1+3', numbers(five));
check('5 Gaeste bekommen 150 Minuten', five.minutes === 150, String(five.minutes));

// 4. Eine belegte Kombination sperrt beide Mitglieder.
const comboBusy = [{ tableIds: ['eg-4-01', 'eg-2-01'], startsAt: at('11:30'), minutes: 150, guests: 5 }];
const afterCombo = assignTables({ floorplan, occupancy: comboBusy, guests: 4, startsAt: at('11:30'), policy });
check('Belegte Kombination sperrt den Vierer', afterCombo.ok && numbers(afterCombo) === '2', numbers(afterCombo));
const afterComboTwo = assignTables({ floorplan, occupancy: comboBusy, guests: 2, startsAt: at('11:30'), policy });
check('Belegte Kombination sperrt den Zweier', afterComboTwo.ok && numbers(afterComboTwo) === '4', numbers(afterComboTwo));

// 5. Ueberlappung greift inklusive Pufferzeit.
const busy = [{ tableIds: ['eg-2-01'], startsAt: at('11:30'), minutes: 90, guests: 2 }];
const afterBuffer = assignTables({ floorplan, occupancy: busy, guests: 2, startsAt: at('13:10'), policy });
check('Puffer haelt den Tisch noch gesperrt', afterBuffer.ok && numbers(afterBuffer) === '4', numbers(afterBuffer));
const afterGap = assignTables({ floorplan, occupancy: busy, guests: 2, startsAt: at('13:20'), policy });
check('Nach Puffer ist der Tisch wieder frei', afterGap.ok && numbers(afterGap) === '3', numbers(afterGap));

// 6. Gesperrte Tische fallen raus.
const blocked = assignTables({ floorplan, blocked: ['eg-2-01'], guests: 2, startsAt: at('11:30'), policy });
check('Gesperrter Tisch wird uebersprungen', blocked.ok && numbers(blocked) === '4', numbers(blocked));

// 7. Pacing lehnt ab und liefert Alternativen.
const pacingPolicy = { ...policy, maxCoversPerSlot: 4 };
const pacing = assignTables({
  floorplan,
  occupancy: [{ tableIds: ['eg-4-01'], startsAt: at('12:00'), minutes: 105, guests: 4 }],
  guests: 2,
  startsAt: at('12:00'),
  policy: pacingPolicy
});
check('Pacing lehnt ab', !pacing.ok && pacing.reason === 'pacing', JSON.stringify(pacing));
check('Pacing liefert Alternativen', (pacing.alternatives || []).length > 0, JSON.stringify(pacing.alternatives));
check('Erste Alternative ist der naechste Slot',
  pacing.alternatives?.[0]?.startsAt === at('12:15'), JSON.stringify(pacing.alternatives?.[0]));

// 7b. Eine bestehende Sitzordnung blockiert Tische, zaehlt aber nicht als
//     Ankunft - sonst wuerde sie faelschlich Pacing ausloesen.
const seated = assignTables({
  floorplan,
  occupancy: [{ tableIds: ['eg-4-01'], startsAt: at('12:00'), minutes: 105, guests: 4, countsForPacing: false }],
  guests: 2,
  startsAt: at('12:00'),
  policy: pacingPolicy
});
check('Sitzordnung loest kein Pacing aus', seated.ok, JSON.stringify(seated));
check('Sitzordnung sperrt ihren Tisch trotzdem', numbers(seated) !== '1', numbers(seated));

// 8. Der Sitzplatzdeckel schlaegt die Geometrie.
const capped = assignTables({ floorplan, guests: 2, startsAt: at('11:30'), policy, available: 1 });
check('Sitzplatzdeckel gewinnt gegen freien Tisch', !capped.ok && capped.reason === 'capacity', JSON.stringify(capped));

// 9. Kein passender Tisch.
const huge = assignTables({ floorplan, guests: 12, startsAt: at('11:30'), policy });
check('Zu grosse Gruppe wird abgelehnt', !huge.ok && huge.reason === 'no_fit', JSON.stringify(huge));

// 10. Unbrauchbare Eingaben werden abgefangen, nicht geworfen.
check('Ungueltige Zeit wird abgefangen',
  assignTables({ floorplan, guests: 2, startsAt: 'morgen', policy }).reason === 'invalid');
check('Null Gaeste werden abgefangen',
  assignTables({ floorplan, guests: 0, startsAt: at('11:30'), policy }).reason === 'invalid');

// 11. Determinismus: gleiche Eingabe, gleiche Ausgabe.
const runA = assignTables({ floorplan, guests: 3, startsAt: at('12:30'), policy });
const runB = assignTables({ floorplan, guests: 3, startsAt: at('12:30'), policy });
check('Gleiche Eingabe liefert gleiche Ausgabe', JSON.stringify(runA) === JSON.stringify(runB));

// 12. Hilfsfunktionen.
check('Dauer nach Gruppengroesse', durationFor(1, policy) === 90 && durationFor(6, policy) === 150);
check('Zeitverschiebung ueber Stundengrenze', shift(at('11:50'), 25) === at('12:15'), shift(at('11:50'), 25));
check('Zeitstempel ohne Zeitzoneneinfluss', stamp(at('11:30')) - stamp(at('11:00')) === 30);

// ---------------------------------------------------------------------------
// Gemischte Tischgroessen: ungerade Zahlen, grosse Tische, gemerkte Positionen
// ---------------------------------------------------------------------------

const mixedConfig = {
  numbering: { start: 1 },
  levels: [{ id: 'eg', name: 'Gaststube', order: 1, counts: { 2: 2, 3: 1, 4: 1, 8: 1, 10: 1 }, positions: {} }],
  combos: [],
  policy: { ...policy, levelOrder: ['eg'] }
};
const mixed = buildFloorplan(mixedConfig);
const pickFor = guests => {
  const result = assignTables({ floorplan: mixed, guests, startsAt: at('11:30'), policy: mixedConfig.policy });
  return result.ok ? result.seats : `abgelehnt:${result.reason}`;
};

check('Fussabdruck waechst mit der Personenzahl',
  [2, 3, 4, 6, 8, 10].map(seats => footprint(seats).w).join(',') === '3,3,4,5,6,7',
  [2, 3, 4, 6, 8, 10].map(seats => footprint(seats).w).join(','));

check('Untergrenze ist die halbe Tischgroesse',
  [2, 3, 4, 8, 10].map(defaultMinGuests).join(',') === '1,2,2,4,5',
  [2, 3, 4, 8, 10].map(defaultMinGuests).join(','));

// Ein Dreiertisch existiert - drei Gaeste bekommen ihn, nicht den Vierer.
check('3 Gaeste bekommen den Dreiertisch', pickFor(3) === 3, String(pickFor(3)));
check('2 Gaeste bekommen den Zweiertisch', pickFor(2) === 2, String(pickFor(2)));
check('4 Gaeste bekommen den Vierertisch', pickFor(4) === 4, String(pickFor(4)));
// Sieben Personen passen an einen einzelnen Tisch - hier den Achter.
check('7 Gaeste bekommen einen einzelnen Achtertisch', pickFor(7) === 8, String(pickFor(7)));
check('5 Gaeste bekommen den Achter, nicht den Zehner', pickFor(5) === 8, String(pickFor(5)));
check('9 Gaeste bekommen den Zehner', pickFor(9) === 10, String(pickFor(9)));
check('1 Gast blockiert keinen grossen Tisch', pickFor(1) === 2, String(pickFor(1)));
check('11 Gaeste passen an keinen Tisch', pickFor(11) === 'abgelehnt:no_fit', String(pickFor(11)));

// Kein Tisch ueberlappt einen anderen, auch nicht bei gemischten Groessen.
const clash = mixed.tables.some((a, i) => mixed.tables.slice(i + 1).some(b =>
  a.col < b.col + b.w && b.col < a.col + a.w && a.row < b.row + b.h && b.row < a.row + a.h));
check('Automatische Anordnung ueberlappt nicht', !clash);

// Verschieben: gemerkte Position gewinnt, Nummerierung folgt der Leserichtung.
const moved = buildFloorplan({
  ...mixedConfig,
  levels: [{ ...mixedConfig.levels[0], positions: { 'eg-2-01': { col: 0, row: 8 } } }]
});
const movedTable = moved.tables.find(table => table.id === 'eg-2-01');
check('Gemerkte Position wird uebernommen',
  movedTable.col === 0 && movedTable.row === 8, JSON.stringify(movedTable));
check('Nummerierung folgt der Leserichtung',
  movedTable.number === moved.tables.length,
  `${movedTable.number} von ${moved.tables.length}`);
check('Verschobener Tisch verdraengt keinen anderen',
  !moved.tables.some(other => other.id !== 'eg-2-01'
    && other.col < movedTable.col + movedTable.w && movedTable.col < other.col + other.w
    && other.row < movedTable.row + movedTable.h && movedTable.row < other.row + other.h));

// Eine von Hand angeordnete Etage bleibt stehen: wird ein Tisch versetzt,
// duerfen die uebrigen nicht nachrutschen.
const pinnedPositions = Object.fromEntries(mixed.tables.map(table => [table.id, { col: table.col, row: table.row }]));
const pinnedLevel = { ...mixedConfig.levels[0], positions: { ...pinnedPositions, 'eg-2-01': { col: 0, row: 30 } } };
const pinned = buildFloorplan({ ...mixedConfig, levels: [pinnedLevel] });
const drifted = pinned.tables.filter(table => {
  const was = pinnedPositions[table.id];
  return table.id !== 'eg-2-01' && (table.col !== was.col || table.row !== was.row);
});
check('Angeordnete Etage bleibt beim Versetzen stehen', !drifted.length,
  drifted.map(table => table.id).join(','));
check('Der versetzte Tisch sitzt an der neuen Stelle',
  pinned.tables.find(table => table.id === 'eg-2-01')?.row === 30);

// Ein neu dazugekommener Tisch sucht sich selbst eine Luecke, ohne die
// festgehaltenen Tische zu stoeren.
const grown = buildFloorplan({
  ...mixedConfig,
  levels: [{ ...mixedConfig.levels[0], counts: { ...mixedConfig.levels[0].counts, 4: 2 }, positions: pinnedPositions }]
});
check('Neuer Tisch findet eine eigene Luecke',
  grown.tables.length === mixed.tables.length + 1
  && !grown.tables.some((a, i) => grown.tables.slice(i + 1).some(b =>
    a.col < b.col + b.w && b.col < a.col + a.w && a.row < b.row + b.h && b.row < a.row + a.h)),
  String(grown.tables.length));

// canPlace begruendet, warum ein Zug nicht geht.
const first = mixed.tables[0];
const second = mixed.tables[1];
check('Zug ins Leere ist erlaubt', canPlace(mixed, first.id, 0, 20).ok);
check('Zug aus dem Raster wird abgelehnt',
  canPlace(mixed, first.id, GRID.cols - 1, 0).reason === 'outside');
check('Negative Position wird abgelehnt', canPlace(mixed, first.id, -1, 0).reason === 'outside');
check('Zug auf einen besetzten Platz nennt den Tisch',
  canPlace(mixed, first.id, second.col, second.row).blockedBy === second.number,
  JSON.stringify(canPlace(mixed, first.id, second.col, second.row)));
check('Tisch darf auf seinen eigenen Platz', canPlace(mixed, first.id, first.col, first.row).ok);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(
  `Tischzuweisung OK: ${floorplan.tables.length} + ${mixed.tables.length} Tische, `
  + `Groessen ${[...new Set(mixed.tables.map(table => `${table.seats}P`))].join('/')}, alle Regeln geprueft.`
);
