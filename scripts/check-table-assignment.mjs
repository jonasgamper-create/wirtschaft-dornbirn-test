// Goldene Testfaelle fuer Geometrie und Tischzuweisung. Laeuft ohne
// Testframework, damit npm run ci keine zusaetzliche Abhaengigkeit braucht.

import { BIS_TAGESENDE, FORMEN, GRID, ausschnitteVon, buildFloorplan, canPlace, chairSlots, defaultMinGuests, footprint, formOf, istGedreht, migrate, nextTableId, seatingPlan, tableBody, tableLabel } from '../site/floorplan-layout.mjs';
import { KARENZ_MINUTEN, assignTables, belegtBis, durationFor, occupiesAt, partyStatus, shift, stamp } from '../site/table-assignment.mjs';

const errors = [];
const check = (name, condition, detail = '') => {
  if (condition) return;
  errors.push(`Tischzuweisung: ${name}${detail ? ` - ${detail}` : ''}`);
};

const policy = {
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
};

// Aus der alten Form gebaut - das prueft die Migration gleich mit.
const config = migrate({
  version: 1,
  numbering: { start: 1 },
  levels: [
    { id: 'eg', name: 'Gaststube', order: 1, counts: { 2: 3, 4: 2 } },
    { id: 'og', name: 'Saal', order: 2, counts: { 2: 1, 4: 1 } }
  ],
  combos: [{ id: 'c1', tables: ['eg-4-01', 'eg-2-01'], minGuests: 5 }],
  policy
});

const floorplan = buildFloorplan(config);
const day = '2026-09-01';
const at = time => `${day}T${time}`;
const numbers = result => (result.numbers || []).join('+');

check('Migration legt eine Standard-Ordnung an',
  config.version === 2 && config.layouts.length === 1 && config.activeLayout === 'standard',
  JSON.stringify({ version: config.version, layouts: config.layouts.length }));
check('Migration erzeugt einzeln adressierbare Tische',
  config.layouts[0].levels[0].tables.map(table => `${table.id}:${table.seats}`).join(',')
    === 'eg-t01:4,eg-t02:4,eg-t03:2,eg-t04:2,eg-t05:2',
  config.layouts[0].levels[0].tables.map(table => `${table.id}:${table.seats}`).join(','));
check('Migration zieht die Kombination mit',
  floorplan.combos.length === 1 && floorplan.combos[0].seats === 6,
  JSON.stringify(floorplan.combos));
check('Nummerierung fortlaufend ueber Etagen',
  floorplan.tables.map(table => table.number).join(',') === '1,2,3,4,5,6,7',
  floorplan.tables.map(table => `${table.id}#${table.number}`).join(','));

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
const comboBusy = [{ tableIds: ['eg-t01', 'eg-t03'], startsAt: at('11:30'), minutes: 150, guests: 5 }];
const afterCombo = assignTables({ floorplan, occupancy: comboBusy, guests: 4, startsAt: at('11:30'), policy });
check('Belegte Kombination sperrt den Vierer', afterCombo.ok && numbers(afterCombo) === '2', numbers(afterCombo));
const afterComboTwo = assignTables({ floorplan, occupancy: comboBusy, guests: 2, startsAt: at('11:30'), policy });
check('Belegte Kombination sperrt den Zweier', afterComboTwo.ok && numbers(afterComboTwo) === '4', numbers(afterComboTwo));

// 5. Ueberlappung greift inklusive Pufferzeit.
const busy = [{ tableIds: ['eg-t03'], startsAt: at('11:30'), minutes: 90, guests: 2 }];
const afterBuffer = assignTables({ floorplan, occupancy: busy, guests: 2, startsAt: at('13:10'), policy });
check('Puffer haelt den Tisch noch gesperrt', afterBuffer.ok && numbers(afterBuffer) === '4', numbers(afterBuffer));
const afterGap = assignTables({ floorplan, occupancy: busy, guests: 2, startsAt: at('13:20'), policy });
check('Nach Puffer ist der Tisch wieder frei', afterGap.ok && numbers(afterGap) === '3', numbers(afterGap));

// 6. Gesperrte Tische fallen raus.
const blocked = assignTables({ floorplan, blocked: ['eg-t03'], guests: 2, startsAt: at('11:30'), policy });
check('Gesperrter Tisch wird uebersprungen', blocked.ok && numbers(blocked) === '4', numbers(blocked));

// 7. Pacing lehnt ab und liefert Alternativen.
const pacingPolicy = { ...policy, maxCoversPerSlot: 4 };
const pacing = assignTables({
  floorplan,
  occupancy: [{ tableIds: ['eg-t01'], startsAt: at('12:00'), minutes: 105, guests: 4 }],
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
  occupancy: [{ tableIds: ['eg-t01'], startsAt: at('12:00'), minutes: 105, guests: 4, countsForPacing: false }],
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

// 13. Feste Dauer aus dem Schichtbetrieb schlaegt die Gruppengroesse - aber
//     nur wenn sie wirklich angegeben ist. Number(null) ist 0, ein fehlender
//     Wert darf also nicht als "null Minuten" durchgehen.
const schicht = assignTables({ floorplan, guests: 5, startsAt: at('11:30'), policy, minutes: 60 });
check('Feste Dauer wird uebernommen', schicht.ok && schicht.minutes === 60, String(schicht.minutes));
check('Ohne feste Dauer gilt die Gruppengroesse',
  assignTables({ floorplan, guests: 5, startsAt: at('11:30'), policy, minutes: null }).minutes === 150,
  String(assignTables({ floorplan, guests: 5, startsAt: at('11:30'), policy, minutes: null }).minutes));

// Zwei Schichten am selben Tisch: 11:30 bis 12:30, ab 12:45 wieder frei.
const ersteSchicht = [{ tableIds: ['eg-t01'], startsAt: at('11:30'), minutes: 60, guests: 4, countsForPacing: false }];
const zweite = assignTables({ floorplan, occupancy: ersteSchicht, guests: 4, startsAt: at('12:45'), policy, minutes: 60 });
check('Zweite Schicht bekommt denselben Tisch', zweite.ok && numbers(zweite) === '1', numbers(zweite));
const zufrueh = assignTables({ floorplan, occupancy: ersteSchicht, guests: 4, startsAt: at('12:15'), policy, minutes: 60 });
check('Waehrend der ersten Schicht ist der Tisch belegt', numbers(zufrueh) !== '1', numbers(zufrueh));

// ---------------------------------------------------------------------------
// Gemischte Tischgroessen, Stuehle, Positionen
// ---------------------------------------------------------------------------

const mixedConfig = migrate({
  version: 1,
  numbering: { start: 1 },
  levels: [{ id: 'eg', name: 'Gaststube', order: 1, counts: { 2: 2, 3: 1, 4: 1, 8: 1, 10: 1 } }],
  combos: [],
  policy: { ...policy, levelOrder: ['eg'] }
});
const mixed = buildFloorplan(mixedConfig);
const mixedPolicy = { ...policy, levelOrder: ['eg'] };
const pickFor = guests => {
  const result = assignTables({ floorplan: mixed, guests, startsAt: at('11:30'), policy: mixedPolicy });
  return result.ok ? result.seats : `abgelehnt:${result.reason}`;
};

check('Fussabdruck waechst mit der Personenzahl',
  [2, 3, 4, 6, 8, 10].map(seats => footprint(seats).w).join(',') === '3,3,4,5,6,7',
  [2, 3, 4, 6, 8, 10].map(seats => footprint(seats).w).join(','));
check('Untergrenze ist die halbe Tischgroesse',
  [2, 3, 4, 8, 10].map(defaultMinGuests).join(',') === '1,2,2,4,5',
  [2, 3, 4, 8, 10].map(defaultMinGuests).join(','));

check('3 Gaeste bekommen den Dreiertisch', pickFor(3) === 3, String(pickFor(3)));
check('2 Gaeste bekommen den Zweiertisch', pickFor(2) === 2, String(pickFor(2)));
check('4 Gaeste bekommen den Vierertisch', pickFor(4) === 4, String(pickFor(4)));
check('7 Gaeste bekommen einen einzelnen Achtertisch', pickFor(7) === 8, String(pickFor(7)));
check('5 Gaeste bekommen den Achter, nicht den Zehner', pickFor(5) === 8, String(pickFor(5)));
check('9 Gaeste bekommen den Zehner', pickFor(9) === 10, String(pickFor(9)));
check('1 Gast blockiert keinen grossen Tisch', pickFor(1) === 2, String(pickFor(1)));
check('11 Gaeste passen an keinen Tisch', pickFor(11) === 'abgelehnt:no_fit', String(pickFor(11)));

const clash = mixed.tables.some((a, i) => mixed.tables.slice(i + 1).some(b =>
  a.col < b.col + b.w && b.col < a.col + a.w && a.row < b.row + b.h && b.row < a.row + a.h));
check('Automatische Anordnung ueberlappt nicht', !clash);

// Stuehle: einer je Platz, und alle liegen im Fussabdruck des Tisches.
for (const table of mixed.tables) {
  const slots = chairSlots(table);
  check(`Stuehle je Platz an Tisch ${table.number}`, slots.length === table.seats,
    `${slots.length} statt ${table.seats}`);
  const raus = slots.filter(chair =>
    chair.x < table.col - 0.01 || chair.x + chair.w > table.col + table.w + 0.01
    || chair.y < table.row - 0.01 || chair.y + chair.h > table.row + table.h + 0.01);
  check(`Stuehle bleiben im Fussabdruck an Tisch ${table.number}`, !raus.length, JSON.stringify(raus[0]));
  const body = tableBody(table);
  check(`Tischplatte liegt im Fussabdruck an Tisch ${table.number}`,
    body.x >= table.col && body.y >= table.row
    && body.x + body.w <= table.col + table.w && body.y + body.h <= table.row + table.h);
}

// Eine von Hand angeordnete Etage bleibt stehen.
const pinnedTables = mixed.tables.map(table => ({ id: table.id, seats: table.seats, col: table.col, row: table.row }));
const pinnedLevel = {
  ...mixedConfig.layouts[0].levels[0],
  tables: pinnedTables.map(table => (table.id === 'eg-t05' ? { ...table, row: 30 } : table))
};
const pinned = buildFloorplan({
  ...mixedConfig,
  layouts: [{ ...mixedConfig.layouts[0], levels: [pinnedLevel] }]
});
const drifted = pinned.tables.filter(table => {
  const was = pinnedTables.find(entry => entry.id === table.id);
  return table.id !== 'eg-t05' && (table.col !== was.col || table.row !== was.row);
});
check('Angeordnete Etage bleibt beim Versetzen stehen', !drifted.length, drifted.map(t => t.id).join(','));
check('Der versetzte Tisch sitzt an der neuen Stelle',
  pinned.tables.find(table => table.id === 'eg-t05')?.row === 30);

// Ein neu dazugekommener Tisch sucht sich selbst eine Luecke.
const grownLevel = { ...mixedConfig.layouts[0].levels[0], tables: [...pinnedTables, { id: 'eg-t99', seats: 4, col: null, row: null }] };
const grown = buildFloorplan({ ...mixedConfig, layouts: [{ ...mixedConfig.layouts[0], levels: [grownLevel] }] });
check('Neuer Tisch findet eine eigene Luecke',
  grown.tables.length === mixed.tables.length + 1
  && !grown.tables.some((a, i) => grown.tables.slice(i + 1).some(b =>
    a.col < b.col + b.w && b.col < a.col + a.w && a.row < b.row + b.h && b.row < a.row + a.h)),
  String(grown.tables.length));
check('Naechste Tisch-Kennung ist frei',
  !mixedConfig.layouts[0].levels[0].tables.some(table => table.id === nextTableId(mixedConfig.layouts[0].levels[0])),
  nextTableId(mixedConfig.layouts[0].levels[0]));

// canPlace begruendet, warum ein Zug nicht geht.
const first = mixed.tables[0];
const second = mixed.tables[1];
check('Zug ins Leere ist erlaubt', canPlace(mixed, first.id, 0, 30).ok);
check('Zug aus dem Raster wird abgelehnt',
  canPlace(mixed, first.id, GRID.cols - 1, 0).reason === 'outside');
check('Negative Position wird abgelehnt', canPlace(mixed, first.id, -1, 0).reason === 'outside');
check('Zug auf einen besetzten Platz nennt den Tisch',
  canPlace(mixed, first.id, second.col, second.row).blockedBy === second.number,
  JSON.stringify(canPlace(mixed, first.id, second.col, second.row)));
check('Tisch darf auf seinen eigenen Platz', canPlace(mixed, first.id, first.col, first.row).ok);

// Zaehlweise: fortlaufend ueber alle Etagen oder in jeder Etage neu bei 1.
const fortlaufend = buildFloorplan({ ...config, numbering: { start: 1, mode: 'fortlaufend' } });
const proEtage = buildFloorplan({ ...config, numbering: { start: 1, mode: 'pro-etage' } });
check('Fortlaufend zaehlt durch alle Etagen',
  fortlaufend.tables.map(table => table.number).join(',') === '1,2,3,4,5,6,7',
  fortlaufend.tables.map(table => table.number).join(','));
check('Pro Etage faengt jede Etage bei 1 an',
  proEtage.tables.map(table => table.number).join(',') === '1,2,3,4,5,1,2',
  proEtage.tables.map(table => table.number).join(','));
check('Pro Etage bleibt innerhalb der Etage eindeutig',
  proEtage.levels.every(level => new Set(level.tables.map(table => table.number)).size === level.tables.length));
check('Beschriftung nennt die Etage nur wenn noetig',
  tableLabel(proEtage.tables[5], proEtage) === '1 · Saal' && tableLabel(fortlaufend.tables[5], fortlaufend) === '6',
  `${tableLabel(proEtage.tables[5], proEtage)} / ${tableLabel(fortlaufend.tables[5], fortlaufend)}`);
check('Bei einer einzigen Etage bleibt die Beschriftung kurz',
  tableLabel(mixed.tables[0], mixed) === String(mixed.tables[0].number));

// Mehrere Ordnungen: die aktive bestimmt den Plan.
const zweiOrdnungen = {
  ...mixedConfig,
  activeLayout: 'konzert',
  layouts: [
    mixedConfig.layouts[0],
    { id: 'konzert', name: 'Konzert', levels: [{ id: 'eg', name: 'Gaststube', order: 1, tables: [{ id: 'eg-k01', seats: 10, col: null, row: null }] }], combos: [] }
  ]
};
const konzert = buildFloorplan(zweiOrdnungen);
check('Aktive Ordnung bestimmt den Plan',
  konzert.layoutId === 'konzert' && konzert.tables.length === 1 && konzert.tables[0].seats === 10,
  JSON.stringify({ id: konzert.layoutId, tische: konzert.tables.length }));
check('Standard-Ordnung bleibt unberuehrt',
  buildFloorplan({ ...zweiOrdnungen, activeLayout: 'standard' }).tables.length === mixed.tables.length);
check('Unbekannte Ordnung faellt auf die erste zurueck',
  buildFloorplan({ ...zweiOrdnungen, activeLayout: 'gibtsnicht' }).layoutId === 'standard');

// Schichtplan: Dauer ergibt sich aus dem Abstand minus Pufferzeit.
const zwei = seatingPlan({ seatings: ['11:30', '12:45'], endsAt: '13:45', bufferMinutes: 15 });
check('Zwei Schichten ergeben je 60 Minuten',
  zwei.map(entry => entry.minutes).join(',') === '60,60', zwei.map(entry => entry.minutes).join(','));
check('Die erste Schicht kennt ihre Nachfolgerin', zwei[0].naechste === '12:45', String(zwei[0].naechste));
check('Die letzte Schicht laeuft bis zum Ende', zwei[1].naechste === null);
const unsortiert = seatingPlan({ seatings: ['12:45', '11:30', '11:30'], endsAt: '13:45', bufferMinutes: 15 });
check('Schichten werden sortiert und entdoppelt',
  unsortiert.map(entry => entry.time).join(',') === '11:30,12:45', unsortiert.map(entry => entry.time).join(','));
check('Unbrauchbare Zeiten fallen raus',
  seatingPlan({ seatings: ['25:00', 'abends', '12:00'], endsAt: '13:00', bufferMinutes: 0 }).length === 1);

// ---- Ankunft, Verspaetung und Abgang ---------------------------------------
// Ohne diese Faelle gilt ein Tisch rein nach Uhrzeit als belegt: der
// Verspaetete blockiert ihn, der frueh Gegangene ebenso.

const gast = { date: '2026-08-14', time: '12:00', tableIds: ['eg-4-01'], guests: 4 };
const um = zeit => ({ at: `2026-08-14T${zeit}`, minutes: 105 });

check('Vor der Zeit ist der Tisch frei',
  partyStatus(gast, um('11:30')) === 'kommt' && !occupiesAt(gast, um('11:30')),
  partyStatus(gast, um('11:30')));
check('Punktgenau gilt der Gast als erwartet',
  partyStatus(gast, um('12:00')) === 'wartet', partyStatus(gast, um('12:00')));
check('Innerhalb der Karenz bleibt es beim Erwarten',
  partyStatus(gast, um('12:14')) === 'wartet', partyStatus(gast, um('12:14')));
check('Nach der Karenz ist der Gast ueberfaellig',
  partyStatus(gast, um('12:15')) === 'ueberfaellig', partyStatus(gast, um('12:15')));
check('Die Karenz betraegt eine Viertelstunde', KARENZ_MINUTEN === 15, String(KARENZ_MINUTEN));
check('Eingecheckt schlaegt die Verspaetung',
  partyStatus({ ...gast, arrived: '12:20' }, um('12:40')) === 'da',
  partyStatus({ ...gast, arrived: '12:20' }, um('12:40')));
check('Nach Ablauf der Dauer ist das Fenster vorbei',
  partyStatus(gast, um('13:45')) === 'vorbei' && !occupiesAt(gast, um('13:45')),
  partyStatus(gast, um('13:45')));

const gegangen = { ...gast, arrived: '12:00', left: '13:00' };
check('Wer gegangen ist, gibt den Tisch sofort frei',
  partyStatus(gegangen, um('13:05')) === 'weg' && !occupiesAt(gegangen, um('13:05')),
  partyStatus(gegangen, um('13:05')));
check('Vor dem Abgang sitzt derselbe Gast noch',
  occupiesAt(gegangen, um('12:59')) && partyStatus(gegangen, um('12:59')) === 'da');
check('Der Abgang verkuerzt die Belegung',
  belegtBis(gegangen, 105) === stamp('2026-08-14T13:00'), String(belegtBis(gegangen, 105)));
check('Ein Abgang nach der regulaeren Zeit verlaengert nicht',
  belegtBis({ ...gast, left: '15:00' }, 105) === stamp('2026-08-14T13:45'));
// Ein Bedienfehler darf die Belegung nicht auf eine negative Dauer ziehen.
check('Ein Abgang vor dem Beginn wird ignoriert',
  belegtBis({ ...gast, left: '11:00' }, 105) === stamp('2026-08-14T13:45'),
  String(belegtBis({ ...gast, left: '11:00' }, 105)));
check('Ohne Tisch belegt niemand etwas',
  !occupiesAt({ ...gast, tableIds: [] }, um('12:30')));

// Richtzeit abgeschaltet: die Belegung endet nicht von selbst, sondern erst,
// wenn jemand "Fertig" drueckt. BIS_TAGESENDE ist die Dauer in diesem Fall.
const offen = { at: '2026-08-14T14:30', minutes: BIS_TAGESENDE };
check('Ohne Richtzeit sitzt der Gast auch nach der Regeldauer noch',
  occupiesAt(gast, offen) && partyStatus(gast, offen) === 'ueberfaellig',
  partyStatus(gast, offen));
check('Mit Richtzeit waere derselbe Gast laengst vorbei',
  partyStatus(gast, { at: '2026-08-14T14:30', minutes: 105 }) === 'vorbei');
check('Ohne Richtzeit beendet erst der Abgang die Belegung',
  !occupiesAt({ ...gast, arrived: '12:00', left: '14:00' }, offen),
  String(occupiesAt({ ...gast, arrived: '12:00', left: '14:00' }, offen)));
check('Ohne Richtzeit gilt der Gast bis zum Abgang als da',
  partyStatus({ ...gast, arrived: '12:00' }, offen) === 'da');


// ---- Formen und Drehung ---------------------------------------------------
// Ein Gasthaus hat runde Stammtische, lange Tafeln und eine Theke. Wer nur
// Rechtecke abbilden kann, plant an seinem Haus vorbei.

const flaeche = (seats, table) => {
  const mass = footprint(seats, table);
  return { ...table, seats, col: 0, row: 0, ...mass };
};

check('Ohne Angabe bleibt es beim bisherigen Rechteck',
  JSON.stringify(footprint(4)) === JSON.stringify(footprint(4, { form: 'laenglich' })));
check('Drehen tauscht Breite und Hoehe',
  JSON.stringify(footprint(10, { dreh: 90 })) === JSON.stringify({ w: 4, h: 7 }),
  JSON.stringify(footprint(10, { dreh: 90 })));
check('Drehen macht den Tisch nicht groesser',
  footprint(10).w * footprint(10).h === footprint(10, { dreh: 90 }).w * footprint(10, { dreh: 90 }).h);
check('Ein runder Tisch ist quadratisch',
  footprint(6, { form: 'rund' }).w === footprint(6, { form: 'rund' }).h);
check('Rund bleibt beim Drehen gleich',
  JSON.stringify(footprint(6, { form: 'rund' })) === JSON.stringify(footprint(6, { form: 'rund', dreh: 90 })));
check('Eine Tafel ist laenger als ein normaler Tisch',
  footprint(10, { form: 'tafel' }).w > footprint(10).w);
check('Eine Theke ist flacher als ein normaler Tisch',
  footprint(6, { form: 'theke' }).h < footprint(6).h);
check('Unbekannte Form faellt auf laenglich zurueck', formOf({ form: 'dreieck' }) === 'laenglich');
check('Es gibt genau vier Formen', Object.keys(FORMEN).length === 4, Object.keys(FORMEN).join(','));

// Jeder Stuhl muss existieren und innerhalb der Grundflaeche liegen - sonst
// steht auf der Karte ein Platz irgendwo im Raum.
for (const form of Object.keys(FORMEN)) {
  for (const dreh of [0, 90]) {
    for (const seats of [1, 2, 4, 7, 10, 12]) {
      const table = flaeche(seats, { form, dreh });
      const slots = chairSlots(table);
      check(`Stuhlzahl stimmt (${form}, ${dreh} Grad, ${seats}P)`, slots.length === seats,
        `${slots.length} statt ${seats}`);
      const draussen = slots.filter(chair =>
        chair.x < -0.6 || chair.y < -0.6 || chair.x + chair.w > table.w + 0.6 || chair.y + chair.h > table.h + 0.6);
      check(`Alle Stuehle liegen am Tisch (${form}, ${dreh} Grad, ${seats}P)`, draussen.length === 0,
        JSON.stringify(draussen[0]));
      check(`Die Tischplatte hat eine Flaeche (${form}, ${dreh} Grad, ${seats}P)`,
        tableBody(table).w > 0 && tableBody(table).h > 0);
    }
  }
}
// An der Theke sitzt niemand auf der Rueckseite.
const theke = flaeche(6, { form: 'theke', dreh: 0 });
const thekeReihen = new Set(chairSlots(theke).map(chair => chair.y.toFixed(2)));
check('An der Theke ist nur eine Seite bestuhlt', thekeReihen.size === 1, [...thekeReihen].join(','));
check('istGedreht erkennt nur 90 Grad',
  istGedreht({ dreh: 90 }) && !istGedreht({ dreh: 45 }) && !istGedreht({}));


// ---- Raumform: Ecken wegnehmen --------------------------------------------
// Ein Gastraum ist selten ein Rechteck. Ein Rechteck minus Rechtecke ergibt
// jede Form mit rechten Winkeln - und in einer weggenommenen Ecke darf kein
// Tisch stehen, sonst plant man Gaeste in eine Wand.

const mitLoch = migrate({
  version: 1,
  numbering: { start: 1 },
  levels: [{ id: 'eg', name: 'Gaststube', order: 1, counts: { 4: 2 } }],
  policy
});
const etage = mitLoch.layouts[0].levels[0];
etage.breite = 20;
etage.tiefe = 20;
etage.elements = [{ id: 'loch', kind: 'ausschnitt', col: 12, row: 0, w: 8, h: 8 }];
const raumPlan = buildFloorplan(mitLoch);
const ersterTisch = raumPlan.tables[0].id;

check('Die weggenommene Ecke wird erkannt',
  ausschnitteVon(raumPlan.levels[0]).length === 1,
  String(ausschnitteVon(raumPlan.levels[0]).length));
check('In der weggenommenen Ecke steht kein Tisch',
  canPlace(raumPlan, ersterTisch, 14, 2, GRID).reason === 'ausserhalb',
  JSON.stringify(canPlace(raumPlan, ersterTisch, 14, 2, GRID)));
check('Ausserhalb der Ecke ist alles erlaubt',
  canPlace(raumPlan, ersterTisch, 2, 14, GRID).ok === true,
  JSON.stringify(canPlace(raumPlan, ersterTisch, 2, 14, GRID)));
check('Auch knapp hineinragen zaehlt als aussen',
  canPlace(raumPlan, ersterTisch, 11, 7, GRID).reason === 'ausserhalb',
  JSON.stringify(canPlace(raumPlan, ersterTisch, 11, 7, GRID)));
check('Ueber die Raumbreite hinaus bleibt verboten',
  canPlace(raumPlan, ersterTisch, 19, 12, GRID).reason === 'outside');
// Automatisch gesetzte Tische weichen der Ecke ebenfalls aus.
const drin = raumPlan.tables.every(table =>
  !(table.col + table.w > 12 && table.col < 20 && table.row < 8));
check('Neue Tische landen nicht in der weggenommenen Ecke', drin,
  raumPlan.tables.map(t => `${t.number}@${t.col},${t.row}`).join(' '));

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(
  `Tischzuweisung OK: ${floorplan.tables.length} + ${mixed.tables.length} Tische, `
  + `Groessen ${[...new Set(mixed.tables.map(table => `${table.seats}P`))].join('/')}, `
  + `Stuehle und Ordnungen geprueft.`
);
