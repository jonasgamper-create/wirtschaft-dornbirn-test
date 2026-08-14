// Kundenansicht: Tische und Stühle anordnen, jeden Platz mit einem Namen
// belegen, Schritt für Schritt zurück, als PDF teilen.
//
// Bewusst ohne Reservierungen, Statistik und Ordnungsverwaltung - der Kunde
// plant genau einen Abend in dem Raum, den das Haus vorbereitet hat.

import { ELEMENTS, GRID, activeLayout, buildFloorplan, canPlace, migrate, seatNamesFor, tableLabel, totalSeats } from './floorplan-layout.mjs?v=505679b2';
import { renderFloorplan } from './floorplan.js?v=591cca61';
import { createHistory } from './plan-history.mjs?v=b86ccb46';

const KEY = 'wirtschaft-kundenplan-v1';
const byId = id => document.getElementById(id);
const preview = byId('kpPlan');
if (preview) start();

async function start() {
  // In der Einzeldatei liegt der Raum im Dokument. Aus dem site-Ordner heraus
  // wird er geholt - sonst stuende die Seite leer da.
  let quelle = window.WIRTSCHAFT_FLOORPLAN;
  if (!quelle) {
    try {
      quelle = await (await fetch('data/floorplan.json', { cache: 'no-store' })).json();
    } catch {
      byId('kpStatus').textContent = 'Der Saalplan konnte nicht geladen werden.';
      return;
    }
  }
  const preset = migrate(quelle);

  const read = () => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* Privater Modus: dann eben nur fuer diese Sitzung. */ }
    return JSON.parse(JSON.stringify(preset));
  };
  let plan = read();
  const write = next => {
    plan = next;
    try { localStorage.setItem(KEY, JSON.stringify(plan)); } catch { /* s. o. */ }
  };

  const history = createHistory(() => JSON.stringify(plan), text => write(JSON.parse(text)));
  const commit = () => { write(plan); history.remember(); paint(); };
  const say = text => { byId('kpStatus').textContent = text; };

  const levelOf = tableId => activeLayout(plan).levels.find(level => level.tables.some(table => table.id === tableId));
  const elementLevelOf = id => activeLayout(plan).levels.find(level => (level.elements || []).some(item => item.id === id));

  function paint() {
    renderFloorplan(preview, plan, {
      mode: 'select',
      seatMode: true,
      onSeatName: (tableId, index, value) => {
        const table = levelOf(tableId)?.tables.find(item => item.id === tableId);
        if (!table) return;
        table.seatNames = seatNamesFor(table);
        table.seatNames[index] = value.slice(0, 28);
        commit();
        say(value ? `Platz ${index + 1}: ${value}.` : `Platz ${index + 1} ist wieder frei.`);
      },
      onSelect: () => {},
      onMove: (id, col, row) => {
        const built = buildFloorplan(plan);
        const verdict = canPlace(built, id, col, row, GRID);
        if (!verdict.ok) {
          paint();
          return say(verdict.reason === 'occupied'
            ? `Dort steht schon Tisch ${verdict.blockedBy}.`
            : 'Dort ist kein Platz mehr.');
        }
        // Beim ersten Verschieben die ganze Etage festhalten, sonst rutschen
        // die noch automatisch gesetzten Tische nach.
        const level = levelOf(id);
        const here = built.levels.find(item => item.id === level.id);
        for (const table of level.tables) {
          const spot = here.tables.find(entry => entry.id === table.id);
          if (spot) { table.col = spot.col; table.row = spot.row; }
        }
        const moved = level.tables.find(table => table.id === id);
        if (moved) { moved.col = col; moved.row = row; }
        commit();
        say('Tisch verschoben.');
      },
      onMoveElement: (id, col, row) => {
        const level = elementLevelOf(id);
        const item = level?.elements.find(entry => entry.id === id);
        if (!item) return;
        item.col = Math.max(0, Math.min(GRID.cols - item.w, col));
        item.row = Math.max(0, row);
        commit();
        say(`${item.label || ELEMENTS[item.kind]?.label || 'Wand'} verschoben.`);
      }
    });
    preview.classList.add('fp-seatmode');

    const built = buildFloorplan(plan);
    const namen = built.tables.reduce((sum, table) => sum + seatNamesFor(table).filter(Boolean).length, 0);
    const frei = totalSeats(built) - namen;
    byId('kpInfo').textContent = `${built.tables.length} Tische, ${totalSeats(built)} Plätze. `
      + `${namen === 1 ? 'Ein Platz ist' : `${namen} Plätze sind`} vergeben, ${frei} noch offen.`;

    byId('kpUndo').disabled = !history.canUndo();
    byId('kpRedo').disabled = !history.canRedo();
    paintList(built);
  }

  /** Die Namensliste ist der Weg mit der Tastatur - und die Kontrolle. */
  function paintList(built) {
    const box = byId('kpNames');
    const active = document.activeElement;
    const keep = active?.dataset?.seat && box.contains(active)
      ? { table: active.dataset.tableId, seat: active.dataset.seat, start: active.selectionStart }
      : null;
    box.textContent = '';

    for (const table of built.tables) {
      const row = document.createElement('div');
      row.className = 'kp-table';
      const head = document.createElement('b');
      // Zaehlt jede Etage neu, gibt es Tisch 1 mehrfach - dann muss die Etage
      // dazu, sonst schreibt der Kunde Namen in den falschen Raum.
      head.textContent = `Tisch ${tableLabel(table, built)} · ${table.seats} Plätze`;
      row.append(head);

      const seats = document.createElement('div');
      seats.className = 'kp-seats';
      seatNamesFor(table).forEach((name, index) => {
        const label = document.createElement('label');
        label.append(`Platz ${index + 1}`);
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 28;
        input.value = name;
        input.placeholder = 'frei';
        input.dataset.tableId = table.id;
        input.dataset.seat = String(index);
        input.setAttribute('aria-label', `Name für Platz ${index + 1} an Tisch ${tableLabel(table, built)}`);
        label.append(input);
        seats.append(label);
      });
      row.append(seats);
      box.append(row);
    }

    if (keep) {
      const back = box.querySelector(`[data-table-id="${keep.table}"][data-seat="${keep.seat}"]`);
      if (back) {
        back.focus();
        if (keep.start != null) back.setSelectionRange(keep.start, keep.start);
      }
    }
  }

  byId('kpNames').addEventListener('change', event => {
    const input = event.target.closest('[data-seat]');
    if (!input) return;
    const table = levelOf(input.dataset.tableId)?.tables.find(item => item.id === input.dataset.tableId);
    if (!table) return;
    table.seatNames = seatNamesFor(table);
    table.seatNames[Number(input.dataset.seat)] = input.value.trim().slice(0, 28);
    commit();
  });

  byId('kpUndo').addEventListener('click', () => {
    if (!history.undo()) return say('Weiter zurück geht es nicht.');
    paint();
    say('Ein Schritt zurück.');
  });
  byId('kpRedo').addEventListener('click', () => {
    if (!history.redo()) return say('Es gibt nichts zum Wiederholen.');
    paint();
    say('Ein Schritt vor.');
  });
  document.addEventListener('keydown', event => {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    event.preventDefault();
    byId(event.shiftKey ? 'kpRedo' : 'kpUndo').click();
  });

  byId('kpClear').addEventListener('click', () => {
    if (!confirm('Alle Namen entfernen und die Anordnung zurücksetzen?')) return;
    write(JSON.parse(JSON.stringify(preset)));
    history.remember();
    paint();
    say('Zurückgesetzt. Es sind keine Namen mehr gespeichert.');
  });

  byId('kpEvent').addEventListener('change', () => {
    plan.eventName = byId('kpEvent').value.trim().slice(0, 60);
    commit();
  });

  byId('kpPrint').addEventListener('click', () => {
    const built = buildFloorplan(plan);
    const saal = built.levels.find(level => level.id === preview.dataset.level)?.name || built.levels[0]?.name || '';
    document.title = [plan.eventName || 'Sitzplan', saal, 'Wirtschaft Dornbirn'].filter(Boolean).join(' · ');
    byId('kpPrintHead').textContent = document.title;
    window.print();
  });

  byId('kpSend').addEventListener('click', () => {
    const blob = new Blob([`${JSON.stringify(plan, null, 2)}\n`], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sitzplan-${(plan.eventName || 'ohne-namen').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    say('Datei gespeichert. Diese Datei an die Wirtschaft zurückschicken.');
  });

  byId('kpEvent').value = plan.eventName || '';
  paint();
}
