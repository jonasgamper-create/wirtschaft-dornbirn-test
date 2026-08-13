// Panel 05: Etagen und Tischanzahlen pflegen, Tische auf der Karte verschieben,
// Zuweisung testen. Laeuft nur im internen Cockpit - der oeffentliche Build
// schliesst jede Datei mit dem Praefix "gastgeber" aus.

// Die Versionsangaben muessen mit denen in den HTML-Dateien mitwandern: ein
// Modulimport ohne Version bleibt sonst im Browser-Cache haengen, auch wenn
// die Seite selbst schon neu geladen wurde.
import { GRID, buildFloorplan, canPlace, deriveTableMix, totalSeats } from './floorplan-layout.mjs?v=4';
import { assignTables } from './table-assignment.mjs?v=4';
import { renderFloorplan } from './floorplan.js?v=6';

const SIZES = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const store = window.WirtschaftData;
const byId = id => document.getElementById(id);
const preview = byId('fpPreview');
if (store && preview) start();

async function start() {
  if (!store.load().floorplan) {
    try {
      store.updateFloorplan(await (await fetch('data/floorplan.json', { cache: 'no-store' })).json());
    } catch {
      warn('Der Tischplan konnte nicht geladen werden. Bitte die Seite über einen lokalen Server öffnen, nicht als Datei.');
      return;
    }
  }

  const slug = name => (name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20) || 'etage');

  const current = () => store.load().floorplan;
  const blocked = () => store.load().blockedTables || [];
  let picked = null;
  const numbering = config => buildFloorplan(config).tables.map(table => `${table.id}:${table.number}`).join(',');

  function warn(text) {
    const box = byId('fpWarn');
    box.hidden = !text;
    box.textContent = text || '';
  }

  function save(next, { quiet = false } = {}) {
    const before = numbering(current());
    store.updateFloorplan(next);
    const plan = buildFloorplan(current());

    const notes = [];
    if (!quiet && before !== numbering(current())) {
      notes.push('Achtung: Tischnummern haben sich verschoben. Aushänge und Notizen im Haus prüfen.');
    }
    if (plan.orphans.length) {
      notes.push(`${plan.orphans.length} Kombination(en) verweisen jetzt auf Tische, die es nicht mehr gibt.`);
    }
    warn(notes.join(' '));

    syncServiceMix(plan);
    paint();
    return plan;
  }

  // Der Tischmix in Panel 02 wird aus dem Plan berechnet, damit es nur eine
  // Quelle fuer die Tischzahlen gibt.
  function syncServiceMix(plan) {
    const mix = deriveTableMix(plan);
    const state = store.load();
    for (const service of state.services) service.tables = { ...mix };
    store.save(state);
  }

  function paintLevels() {
    const config = current();
    const box = byId('fpLevels');
    box.textContent = '';
    for (const level of [...config.levels].sort((a, b) => a.order - b.order)) {
      const row = document.createElement('div');
      row.className = 'fp-level-row';

      const name = document.createElement('label');
      name.className = 'fp-level-name';
      name.append('Name');
      const nameInput = document.createElement('input');
      Object.assign(nameInput, { type: 'text', maxLength: 40, value: level.name });
      nameInput.dataset.level = level.id;
      nameInput.dataset.field = 'name';
      name.append(nameInput);
      row.append(name);

      const sizes = document.createElement('div');
      sizes.className = 'fp-sizes';
      for (const seats of SIZES) {
        const label = document.createElement('label');
        label.append(`${seats}P`);
        const input = document.createElement('input');
        Object.assign(input, { type: 'number', min: 0, max: 99, value: String(level.counts[seats] || 0) });
        input.dataset.level = level.id;
        input.dataset.seats = String(seats);
        input.setAttribute('aria-label', `Anzahl Tische für ${seats} Personen, ${level.name}`);
        label.append(input);
        sizes.append(label);
      }
      row.append(sizes);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'quiet';
      remove.dataset.remove = level.id;
      remove.textContent = 'Etage entfernen';
      row.append(remove);
      box.append(row);
    }
  }

  function paintPlan() {
    renderFloorplan(preview, current(), {
      mode: 'select',
      states: Object.fromEntries(blocked().map(id => [id, 'blocked'])),
      seating: seatingMap(),
      selected: picked,
      // Ein Klick waehlt den Tisch aus. Was damit passiert, entscheidet die
      // Einzelzuweisung in Panel 03 - so loest ein Fehlklick nichts aus.
      onSelect: id => {
        picked = id;
        paintPlan();
        paintSeating();
      },
      // Verschieben. Die Position wird gemerkt und ueberlebt spaetere
      // Anzahl-Aenderungen, weil sie an der Tisch-Kennung haengt.
      onMove: (id, col, row) => {
        const plan = buildFloorplan(current());
        const verdict = canPlace(plan, id, col, row, GRID);
        if (!verdict.ok) {
          paintPlan();
          const reasons = {
            outside: 'Dort ist kein Platz mehr im Raster.',
            occupied: `Dort steht schon Tisch ${verdict.blockedBy}.`,
            unknown: 'Diesen Tisch gibt es nicht mehr.'
          };
          const status = preview.querySelector('[data-status]');
          if (status) status.textContent = reasons[verdict.reason];
          return;
        }
        const config = current();
        const level = config.levels.find(item => id.startsWith(`${item.id}-`));
        if (!level) return;
        // Sobald von Hand angeordnet wird, werden alle Tische der Etage
        // festgehalten. Sonst rutschen die automatisch platzierten Tische bei
        // jedem Zug nach - eine Karte, die sich unter der Hand bewegt, ist
        // unbrauchbar. Nur spaeter neu dazugekommene Tische suchen sich noch
        // selbst eine Luecke.
        const here = plan.levels.find(item => item.id === level.id);
        level.positions = Object.fromEntries(here.tables.map(table => [table.id, { col: table.col, row: table.row }]));
        level.positions[id] = { col, row };
        const updated = save(config, { quiet: true });
        const moved = updated.tables.find(table => table.id === id);
        const status = preview.querySelector('[data-status]');
        if (status) status.textContent = `Tisch ${moved?.number ?? ''} verschoben. Die Nummern folgen der Leserichtung im Raum.`;
      }
    });
  }

  function paint() {
    paintLevels();
    paintPlan();
    paintSeating();
  }

  // ---- Belegung ------------------------------------------------------------

  const parties = () => store.load().parties || [];

  /** tableId -> { name, guests } fuer den Renderer. */
  function seatingMap() {
    const map = {};
    for (const party of parties()) {
      for (const id of party.tableIds) map[id] = { name: party.name, guests: party.guests };
    }
    return map;
  }

  function seatResult(text) { byId('fpSeatResult').textContent = text; }

  function paintSeating() {
    const plan = buildFloorplan(current());
    const byId_ = new Map(plan.tables.map(table => [table.id, table]));
    const list = byId('fpParties');
    list.textContent = '';

    const all = parties();
    if (!all.length) {
      const note = document.createElement('li');
      note.className = 'fp-empty-list';
      note.textContent = 'Noch keine Gruppen aufgenommen.';
      list.append(note);
    } else {
      for (const party of all) {
        const item = document.createElement('li');
        const name = document.createElement('b');
        name.textContent = party.name;
        const size = document.createElement('span');
        size.className = 'seat';
        size.textContent = `${party.guests}P`;
        item.append(name, size);

        const where = document.createElement('span');
        if (party.tableIds.length) {
          where.className = 'at';
          where.textContent = `Tisch ${party.tableIds.map(id => byId_.get(id)?.number ?? '?').join(' + ')}`;
        } else {
          where.className = 'open';
          where.textContent = 'noch offen';
        }
        item.append(where);

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.dataset.removeParty = party.id;
        remove.textContent = 'Entfernen';
        item.append(remove);
        list.append(item);
      }
    }

    const table = picked ? plan.tables.find(item => item.id === picked) : null;
    const label = byId('fpSelected');
    const form = byId('fpSeatForm');
    const actions = byId('fpSeatActions');
    if (!table) {
      label.innerHTML = 'Kein Tisch gewählt<small>Tisch in der Karte oder in der Liste darüber anklicken.</small>';
      form.hidden = true;
      actions.hidden = true;
      return;
    }
    const seated = parties().find(party => party.tableIds.includes(table.id));
    const isBlocked = blocked().includes(table.id);
    label.textContent = `Tisch ${table.number}`;
    const note = document.createElement('small');
    note.textContent = `${table.seats} Plätze · ${table.levelName} · `
      + (seated ? `belegt von ${seated.name}, ${seated.guests} Personen` : isBlocked ? 'gesperrt' : 'frei');
    label.append(note);
    form.hidden = Boolean(seated);
    actions.hidden = false;
    byId('fpFreeTable').hidden = !seated;
    byId('fpBlockTable').textContent = isBlocked ? 'Sperre aufheben' : 'Tisch sperren';
    byId('fpSeatGuests').max = String(table.seats);
  }

  byId('fpLevels').addEventListener('change', event => {
    const input = event.target.closest('[data-level]');
    if (!input) return;
    const config = current();
    const level = config.levels.find(item => item.id === input.dataset.level);
    if (!level) return;
    if (input.dataset.field === 'name') {
      level.name = input.value.trim() || level.name;
      save(config, { quiet: true });
      return;
    }
    const seats = Number(input.dataset.seats);
    const count = Math.max(0, Math.min(99, Number(input.value) || 0));
    if (count > 0) level.counts[seats] = count; else delete level.counts[seats];
    if (!Object.keys(level.counts).length) {
      warn('Eine Etage ohne Tische ist nicht möglich – mindestens ein Tisch muss bleiben.');
      level.counts[seats] = 1;
    }
    save(config);
  });

  byId('fpLevels').addEventListener('click', event => {
    const button = event.target.closest('[data-remove]');
    if (!button) return;
    const config = current();
    if (config.levels.length <= 1) return warn('Es muss mindestens eine Etage bleiben.');
    if (!confirm('Diese Etage mit allen Tischen entfernen?')) return;
    const id = button.dataset.remove;
    config.levels = config.levels.filter(level => level.id !== id);
    config.combos = config.combos.filter(combo => !combo.tables.some(table => table.startsWith(`${id}-`)));
    config.policy.levelOrder = config.policy.levelOrder.filter(entry => entry !== id);
    save(config);
  });

  byId('fpAddLevel').addEventListener('submit', event => {
    event.preventDefault();
    const config = current();
    if (config.levels.length >= 4) return warn('Mehr als vier Etagen sind nicht vorgesehen.');
    const name = byId('fpNewName').value.trim();
    if (!name) return;
    let id = slug(name);
    while (config.levels.some(level => level.id === id)) id = `${id}-2`.slice(0, 20);
    config.levels.push({
      id,
      name,
      order: Math.max(0, ...config.levels.map(level => level.order)) + 1,
      counts: { 4: 4 },
      positions: {}
    });
    config.policy.levelOrder = [...config.policy.levelOrder, id];
    byId('fpNewName').value = '';
    save(config);
  });

  // Der Sitzplan ist eine Momentaufnahme, kein Zeitverlauf. Deshalb bekommen
  // alle Gruppen dieselbe Referenzzeit, und das Pacing - das den Zustrom ueber
  // die Zeit begrenzt - wird hier ausgesetzt.
  const SEAT_TIME = '2000-01-01T12:00';
  const seatPolicy = () => ({ ...current().policy, maxCoversPerSlot: Number.MAX_SAFE_INTEGER });
  const seatOccupancy = () => parties()
    .filter(party => party.tableIds.length)
    .map(party => ({ tableIds: party.tableIds, startsAt: SEAT_TIME, minutes: 60, guests: party.guests }));

  byId('fpPartyForm').addEventListener('submit', event => {
    event.preventDefault();
    const name = byId('fpPartyName').value.trim();
    if (!name) return;
    const guests = Math.max(1, Math.min(20, Number(byId('fpPartyGuests').value) || 1));
    store.setParties([...parties(), { id: `p-${parties().length + 1}-${name.length}${guests}`, name, guests, tableIds: [] }]);
    byId('fpPartyName').value = '';
    seatResult(`${name} mit ${guests} Personen aufgenommen. Noch nicht am Tisch.`);
    paintSeating();
    byId('fpPartyName').focus();
  });

  byId('fpParties').addEventListener('click', event => {
    const button = event.target.closest('[data-remove-party]');
    if (!button) return;
    const list = parties();
    const gone = list.find(party => party.id === button.dataset.removeParty);
    store.setParties(list.filter(party => party.id !== button.dataset.removeParty));
    seatResult(gone ? `${gone.name} entfernt.` : 'Gruppe entfernt.');
    paintPlan();
    paintSeating();
  });

  byId('fpAutoSeat').addEventListener('click', () => {
    const plan = buildFloorplan(current());
    const list = parties().map(party => ({ ...party }));
    // Grosse Gruppen zuerst - sie haben die wenigsten Moeglichkeiten.
    const open = list.filter(party => !party.tableIds.length).sort((a, b) => b.guests - a.guests);
    if (!open.length) return seatResult('Es sind keine offenen Gruppen da.');

    const seated = [];
    const failed = [];
    for (const party of open) {
      const result = assignTables({
        floorplan: plan,
        occupancy: [...seatOccupancy(), ...seated.map(entry => ({ tableIds: entry.tableIds, startsAt: SEAT_TIME, minutes: 60, guests: entry.guests }))],
        blocked: blocked(),
        guests: party.guests,
        startsAt: SEAT_TIME,
        policy: seatPolicy(),
        withAlternatives: false
      });
      if (!result.ok) { failed.push(party); continue; }
      party.tableIds = result.tableIds;
      seated.push({ tableIds: result.tableIds, guests: party.guests, numbers: result.numbers, name: party.name });
    }
    store.setParties(list);
    paintPlan();
    paintSeating();
    seatResult(
      `${seated.length} Gruppe(n) verteilt: ${seated.map(entry => `${entry.name} an Tisch ${entry.numbers.join(' + ')}`).join(', ') || '–'}.`
      + (failed.length ? ` Kein Platz für: ${failed.map(party => `${party.name} (${party.guests}P)`).join(', ')}.` : '')
    );
  });

  byId('fpClearSeating').addEventListener('click', () => {
    if (!parties().length) return seatResult('Es ist nichts zu leeren.');
    if (!confirm('Alle Gruppen und ihre Namen wirklich entfernen?')) return;
    store.setParties([]);
    paintPlan();
    paintSeating();
    seatResult('Belegung geleert. Es sind keine Namen mehr gespeichert.');
  });

  byId('fpSeatForm').addEventListener('submit', event => {
    event.preventDefault();
    if (!picked) return;
    const plan = buildFloorplan(current());
    const table = plan.tables.find(item => item.id === picked);
    const name = byId('fpSeatName').value.trim();
    const guests = Math.max(1, Math.min(20, Number(byId('fpSeatGuests').value) || 1));
    if (!table || !name) return;
    if (guests > table.seats) {
      return seatResult(`Tisch ${table.number} hat nur ${table.seats} Plätze – ${guests} Personen passen nicht.`);
    }
    if (blocked().includes(table.id)) {
      return seatResult(`Tisch ${table.number} ist gesperrt. Erst die Sperre aufheben.`);
    }
    // Eine bereits aufgenommene, noch offene Gruppe mit gleichem Namen und
    // gleicher Groesse wird gesetzt statt doppelt angelegt.
    const list = parties().map(party => ({ ...party }));
    const existing = list.find(party => !party.tableIds.length && party.name === name && party.guests === guests);
    if (existing) existing.tableIds = [table.id];
    else list.push({ id: `p-${list.length + 1}-${name.length}${guests}`, name, guests, tableIds: [table.id] });
    store.setParties(list);
    byId('fpSeatName').value = '';
    paintPlan();
    paintSeating();
    seatResult(`${name} sitzt an Tisch ${table.number} (${guests} von ${table.seats} Plätzen).`);
  });

  byId('fpFreeTable').addEventListener('click', () => {
    if (!picked) return;
    const plan = buildFloorplan(current());
    const table = plan.tables.find(item => item.id === picked);
    const list = parties().filter(party => !party.tableIds.includes(picked));
    const gone = parties().find(party => party.tableIds.includes(picked));
    store.setParties(list);
    paintPlan();
    paintSeating();
    seatResult(gone ? `Tisch ${table?.number} ist wieder frei (${gone.name} entfernt).` : 'Tisch war nicht belegt.');
  });

  byId('fpBlockTable').addEventListener('click', () => {
    if (!picked) return;
    const plan = buildFloorplan(current());
    const table = plan.tables.find(item => item.id === picked);
    if (parties().some(party => party.tableIds.includes(picked))) {
      return seatResult(`Tisch ${table?.number} ist belegt. Erst frei machen, dann sperren.`);
    }
    const list = new Set(blocked());
    const wasBlocked = list.has(picked);
    if (wasBlocked) list.delete(picked); else list.add(picked);
    store.setBlockedTables([...list]);
    paintPlan();
    paintSeating();
    seatResult(`Tisch ${table?.number} ist jetzt ${wasBlocked ? 'wieder frei' : 'gesperrt'}.`);
  });

  byId('fpTryForm').addEventListener('submit', event => {
    event.preventDefault();
    const config = current();
    const plan = buildFloorplan(config);
    const state = store.load();
    const guests = Number(byId('fpTryGuests').value) || 1;
    const time = byId('fpTryTime').value || '12:00';
    const date = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const service = state.services.find(item => item.date === date && item.time === time);
    const free = service ? store.serviceAvailability(service, state.settings).available : Infinity;

    // Die Probe rechnet mit der tatsaechlichen Belegung, sonst schlaegt sie
    // Tische vor, an denen schon jemand sitzt.
    const result = assignTables({
      floorplan: plan,
      occupancy: parties().filter(party => party.tableIds.length)
        .map(party => ({ tableIds: party.tableIds, startsAt: `${date}T${time}`, minutes: 60, guests: party.guests, countsForPacing: false })),
      blocked: blocked(),
      guests,
      startsAt: `${date}T${time}`,
      policy: config.policy,
      available: free
    });

    const out = byId('fpResult');
    const source = service
      ? `Zeitfenster ${time} aus Panel 02: ${free} von ${service.capacity} Plätzen frei.`
      : `Für ${time} gibt es in Panel 02 kein Zeitfenster – der Sitzplatzdeckel bleibt hier außen vor.`;
    if (result.ok) {
      out.textContent = `Tisch ${result.numbers.join(' + ')} · ${result.seats}P · ${result.levelName} · ${result.minutes} Minuten`
        + (result.seatGap ? ` · ${result.seatGap} Platz übrig. ` : ' · passgenau. ') + source;
      return;
    }
    const reasons = {
      capacity: `Sitzplatzdeckel erreicht – ${source}`,
      pacing: 'Zu viele Gäste im selben Viertelstundenfenster.',
      no_fit: 'Kein passender Tisch frei.',
      invalid: 'Eingabe unvollständig.'
    };
    const alternatives = (result.alternatives || [])
      .map(entry => `${entry.startsAt.slice(11)} (Tisch ${entry.numbers.join(' + ')})`).join(', ');
    out.textContent = `${reasons[result.reason]}${alternatives ? ` Alternativen: ${alternatives}.` : ''}`
      + (result.reason === 'capacity' ? '' : ` ${source}`);
  });

  byId('fpExport').addEventListener('click', () => {
    const payload = { ...current(), updatedAt: new Date().toISOString() };
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'floorplan.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  const plan = buildFloorplan(current());
  syncServiceMix(plan);
  paint();
  const mix = deriveTableMix(plan);
  const mixText = Object.keys(mix).map(Number).sort((a, b) => a - b).map(seats => `${mix[seats]}×${seats}P`).join(' · ');
  byId('fpResult').textContent = `${plan.levels.length} Etagen, ${plan.tables.length} Tische, ${totalSeats(plan)} Plätze (${mixText}). `
    + 'Personenzahl und Uhrzeit eingeben, um die Zuweisung zu testen.';
}
