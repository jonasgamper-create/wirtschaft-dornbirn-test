// Panel 05: Etagen und Tischanzahlen pflegen, Tische auf der Karte verschieben,
// Zuweisung testen. Laeuft nur im internen Cockpit - der oeffentliche Build
// schliesst jede Datei mit dem Praefix "gastgeber" aus.

// Die Versionsangaben muessen mit denen in den HTML-Dateien mitwandern: ein
// Modulimport ohne Version bleibt sonst im Browser-Cache haengen, auch wenn
// die Seite selbst schon neu geladen wurde.
import { GRID, buildFloorplan, canPlace, deriveTableMix, totalSeats } from './floorplan-layout.mjs?v=4';
import { assignTables } from './table-assignment.mjs?v=4';
import { renderFloorplan } from './floorplan.js?v=8';

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
  // Markierte Gruppe: der erste Klick markiert, der zweite setzt sie an einen
  // Tisch. Das spart das doppelte Tippen desselben Namens.
  let marked = null;
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
      // Ein Klick waehlt den Tisch aus und springt in seine Zeile in der
      // Tischliste - so loest ein Fehlklick nichts aus, der Weg zum Bearbeiten
      // ist aber genau ein Schritt.
      onSelect: id => {
        // Ist oben eine Gruppe markiert, setzt dieser Klick sie an den Tisch.
        if (id && marked) return seatMarked(id);
        picked = id;
        paintPlan();
        paintSeating();
        if (!id) return;
        const field = byId('fpTableList').querySelector(`[data-table-id="${id}"][data-field="name"]`);
        if (field && !field.disabled) { field.focus(); field.select(); }
      },
      // Doppelklick schreibt den Namen direkt auf den Tisch.
      onEdit: (id, value) => setTableName(id, value),
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
        if (party.id === marked) item.className = 'is-marked';

        // Die Gruppe selbst ist der Knopf: markieren, dann Tisch anklicken.
        // Zwei Klicks statt Namen zweimal tippen.
        const pickButton = document.createElement('button');
        pickButton.type = 'button';
        pickButton.className = 'pick';
        pickButton.dataset.markParty = party.id;
        pickButton.setAttribute('aria-pressed', String(party.id === marked));

        const name = document.createElement('b');
        name.textContent = party.name;
        const size = document.createElement('span');
        size.className = 'seat';
        size.textContent = `${party.guests}P`;
        pickButton.append(name, size);

        const where = document.createElement('span');
        if (party.tableIds.length) {
          where.className = 'at';
          where.textContent = `Tisch ${party.tableIds.map(id => byId_.get(id)?.number ?? '?').join(' + ')}`;
        } else {
          where.className = 'open';
          where.textContent = party.id === marked ? 'Tisch anklicken' : 'noch offen';
        }
        pickButton.append(where);
        item.append(pickButton);

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.dataset.removeParty = party.id;
        remove.textContent = 'Entfernen';
        item.append(remove);
        list.append(item);
      }
    }

    paintTableList(plan);
  }

  // Eine Zeile je Tisch. Name eintragen belegt, Feld leeren macht frei -
  // das ist der schnellste Weg, wenn am Abend noch etwas umgestellt wird.
  function paintTableList(plan) {
    const box = byId('fpTableList');
    const active = document.activeElement;
    const keepFocus = active?.dataset?.tableId && box.contains(active)
      ? { id: active.dataset.tableId, field: active.dataset.field, start: active.selectionStart }
      : null;
    box.textContent = '';

    for (const table of plan.tables) {
      const party = parties().find(entry => entry.tableIds.includes(table.id));
      const isBlocked = blocked().includes(table.id);

      const row = document.createElement('div');
      row.className = 'fp-table-row'
        + (party ? ' is-busy' : '')
        + (isBlocked ? ' is-blocked' : '')
        + (table.id === picked ? ' is-picked' : '');

      const no = document.createElement('span');
      no.className = 'no';
      no.textContent = String(table.number);
      const meta = document.createElement('small');
      meta.textContent = `${table.seats}P · ${table.levelName}`;
      no.append(meta);
      row.append(no);

      const name = document.createElement('input');
      name.type = 'text';
      name.maxLength = 40;
      name.value = party?.name || '';
      name.placeholder = isBlocked ? 'gesperrt' : 'frei';
      name.disabled = isBlocked;
      name.dataset.tableId = table.id;
      name.dataset.field = 'name';
      name.setAttribute('aria-label', `Name für Tisch ${table.number}`);
      row.append(name);

      // Personen und Aktionen bleiben zusammen, damit die Zeile auf schmalen
      // Schirmen sauber unter den Namen rutscht statt sich zu zerlegen.
      const actions = document.createElement('div');
      actions.className = 'fp-row-actions';

      const guests = document.createElement('input');
      guests.type = 'number';
      guests.min = '1';
      guests.max = String(table.seats);
      guests.value = party ? String(party.guests) : '';
      guests.placeholder = `${table.seats}`;
      guests.disabled = !party;
      guests.dataset.tableId = table.id;
      guests.dataset.field = 'guests';
      guests.setAttribute('aria-label', `Personen an Tisch ${table.number}, höchstens ${table.seats}`);
      actions.append(guests);

      // Der umgekehrte Weg: am Tisch eine offene Gruppe auswaehlen, statt
      // oben zu markieren. Erscheint nur, wenn es beides gibt.
      const open = parties().filter(entry => !entry.tableIds.length);
      if (!party && !isBlocked && open.length) {
        const choose = document.createElement('select');
        choose.dataset.tableId = table.id;
        choose.dataset.field = 'assign';
        choose.setAttribute('aria-label', `Offene Gruppe an Tisch ${table.number} setzen`);
        const empty = document.createElement('option');
        empty.value = '';
        empty.textContent = 'Gruppe wählen …';
        choose.append(empty);
        for (const entry of open) {
          const option = document.createElement('option');
          option.value = entry.id;
          option.textContent = `${entry.name} (${entry.guests}P)`;
          option.disabled = entry.guests > table.seats;
          choose.append(option);
        }
        actions.append(choose);
      }

      const free = document.createElement('button');
      free.type = 'button';
      free.dataset.tableId = table.id;
      free.dataset.action = 'free';
      free.textContent = 'Frei machen';
      free.disabled = !party;
      actions.append(free);

      const block = document.createElement('button');
      block.type = 'button';
      block.dataset.tableId = table.id;
      block.dataset.action = 'block';
      block.textContent = isBlocked ? 'Entsperren' : 'Sperren';
      block.disabled = Boolean(party);
      actions.append(block);
      row.append(actions);

      if (party && party.tableIds.length > 1) {
        const span = document.createElement('p');
        span.className = 'span';
        span.textContent = `Zusammengestellt mit Tisch ${party.tableIds
          .filter(id => id !== table.id)
          .map(id => plan.tables.find(item => item.id === id)?.number ?? '?')
          .join(', ')}.`;
        row.append(span);
      }
      box.append(row);
    }

    if (keepFocus) {
      const back = box.querySelector(`[data-table-id="${keepFocus.id}"][data-field="${keepFocus.field}"]`);
      if (back && !back.disabled) {
        back.focus();
        if (back.type === 'text' && keepFocus.start != null) back.setSelectionRange(keepFocus.start, keepFocus.start);
      }
    }
  }

  /** Setzt die oben markierte Gruppe an einen Tisch. */
  function seatMarked(tableId) {
    const plan = buildFloorplan(current());
    const table = plan.tables.find(item => item.id === tableId);
    const list = parties().map(party => ({ ...party, tableIds: [...party.tableIds] }));
    const party = list.find(entry => entry.id === marked);
    if (!table || !party) { marked = null; return; }

    if (list.some(entry => entry !== party && entry.tableIds.includes(tableId))) {
      return seatResult(`Tisch ${table.number} ist schon belegt. Erst frei machen.`);
    }
    if (blocked().includes(tableId)) return seatResult(`Tisch ${table.number} ist gesperrt. Erst entsperren.`);
    if (party.guests > table.seats) {
      return seatResult(`${party.name} sind ${party.guests} Personen – Tisch ${table.number} hat nur ${table.seats} Plätze.`);
    }

    party.tableIds = [tableId];
    marked = null;
    store.setParties(list);
    seatResult(`${party.name} sitzt an Tisch ${table.number} (${party.guests} von ${table.seats} Plätzen).`);
    paintPlan();
    paintSeating();
  }

  /** Name auf einen Tisch schreiben. Leerer Name macht den Tisch frei. */
  function setTableName(tableId, rawName) {
    const plan = buildFloorplan(current());
    const table = plan.tables.find(item => item.id === tableId);
    if (!table) return;
    const name = rawName.trim();
    const list = parties().map(party => ({ ...party, tableIds: [...party.tableIds] }));
    const existing = list.find(party => party.tableIds.includes(tableId));

    if (!name) {
      if (!existing) return;
      store.setParties(list.filter(party => party !== existing));
      seatResult(`Tisch ${table.number} ist wieder frei (${existing.name} entfernt).`);
    } else if (existing) {
      existing.name = name;
      store.setParties(list);
      seatResult(`Tisch ${table.number}: ${name}.`);
    } else {
      if (blocked().includes(tableId)) return seatResult(`Tisch ${table.number} ist gesperrt. Erst entsperren.`);
      // Eine schon aufgenommene, noch offene Gruppe wird gesetzt statt doppelt
      // angelegt - sonst stuende derselbe Name zweimal in der Liste.
      const open = list.find(party => !party.tableIds.length && party.name === name);
      if (open) {
        open.tableIds = [tableId];
        if (open.guests > table.seats) open.guests = table.seats;
        store.setParties(list);
        seatResult(`${name} sitzt an Tisch ${table.number} (${open.guests} von ${table.seats} Plätzen).`);
      } else {
        list.push({ id: `p-${Date.now().toString(36)}`, name, guests: Math.min(2, table.seats), tableIds: [tableId] });
        store.setParties(list);
        seatResult(`${name} sitzt an Tisch ${table.number}. Personenzahl in der Zeile anpassen.`);
      }
    }
    paintPlan();
    paintSeating();
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
    const mark = event.target.closest('[data-mark-party]');
    if (mark) {
      const party = parties().find(entry => entry.id === mark.dataset.markParty);
      marked = marked === mark.dataset.markParty ? null : mark.dataset.markParty;
      paintSeating();
      seatResult(!marked ? 'Markierung aufgehoben.'
        : party?.tableIds.length
          // Eine schon sitzende Gruppe zu markieren heisst umsetzen.
          ? `${party.name} sitzt bereits – jetzt den neuen Tisch anklicken.`
          : `${party?.name} ist markiert – jetzt einen freien Tisch anklicken.`);
      return;
    }
    const button = event.target.closest('[data-remove-party]');
    if (!button) return;
    const list = parties();
    const gone = list.find(party => party.id === button.dataset.removeParty);
    if (marked === button.dataset.removeParty) marked = null;
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

  // Die Tischliste: Name schreiben belegt, Feld leeren macht frei.
  byId('fpTableList').addEventListener('change', event => {
    const field = event.target.closest('[data-field]');
    if (!field) return;
    if (field.dataset.field === 'name') return setTableName(field.dataset.tableId, field.value);
    if (field.dataset.field === 'assign') {
      if (!field.value) return;
      marked = field.value;
      return seatMarked(field.dataset.tableId);
    }

    const plan = buildFloorplan(current());
    const table = plan.tables.find(item => item.id === field.dataset.tableId);
    const list = parties().map(party => ({ ...party, tableIds: [...party.tableIds] }));
    const party = list.find(entry => entry.tableIds.includes(field.dataset.tableId));
    if (!table || !party) return;
    const wanted = Math.max(1, Math.round(Number(field.value) || 1));
    const seats = party.tableIds.reduce((sum, id) => sum + (plan.tables.find(item => item.id === id)?.seats || 0), 0);
    party.guests = Math.min(wanted, seats);
    store.setParties(list);
    seatResult(wanted > seats
      ? `Tisch ${table.number} hat nur ${seats} Plätze – auf ${seats} begrenzt.`
      : `Tisch ${table.number}: ${party.name}, ${party.guests} Personen.`);
    paintPlan();
    paintSeating();
  });

  byId('fpTableList').addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const id = button.dataset.tableId;
    const plan = buildFloorplan(current());
    const table = plan.tables.find(item => item.id === id);

    if (button.dataset.action === 'free') return setTableName(id, '');

    if (parties().some(party => party.tableIds.includes(id))) {
      return seatResult(`Tisch ${table?.number} ist belegt. Erst frei machen, dann sperren.`);
    }
    const set = new Set(blocked());
    const wasBlocked = set.has(id);
    if (wasBlocked) set.delete(id); else set.add(id);
    store.setBlockedTables([...set]);
    seatResult(`Tisch ${table?.number} ist jetzt ${wasBlocked ? 'wieder frei' : 'gesperrt'}.`);
    paintPlan();
    paintSeating();
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
