// Goldene Testfaelle fuer die Tischzuweisung. Laeuft ohne Testframework,
// damit npm run ci keine zusaetzliche Abhaengigkeit braucht.

import { buildFloorplan } from '../site/floorplan-layout.mjs';
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

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Tischzuweisung OK: ${floorplan.tables.length} Tische, ${floorplan.combos.length} Kombination(en), alle Regeln geprueft.`);
