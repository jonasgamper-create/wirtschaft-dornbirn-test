// Interne Tischplanung: Ordnungen, Etagen, Tische, Stuehle, Reservierungen mit
// Uhrzeit und Essenswunsch. Laeuft nur im internen Bereich - der oeffentliche
// Build schliesst jede Datei mit dem Praefix "gastgeber" aus.

// Die Versionsangaben muessen mit denen in den HTML-Dateien mitwandern: ein
// Modulimport ohne Version bleibt sonst im Browser-Cache haengen.
import { ELEMENTS, GRID, activeLayout, buildFloorplan, canPlace, clampSeats, deriveTableMix, elementKinds, migrate, nextElementId, nextTableId, seatNamesFor, seatingPlan, serviceOf, tableLabel, totalSeats } from './floorplan-layout.mjs?v=8';
import { assignTables, durationFor, stamp } from './table-assignment.mjs?v=8';
import { renderFloorplan } from './floorplan.js?v=14';
import { createHistory } from './plan-history.mjs?v=1';

const SIZES = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const store = window.WirtschaftData;
const byId = id => document.getElementById(id);
const preview = byId('fpPreview');
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
if (store && preview) start();

async function start() {
  if (!store.load().floorplan) {
    // In der Einzeldatei liegt die Ausgangskonfiguration schon im Dokument.
    // Nur die Fassung im site-Ordner holt sie per fetch.
    if (window.WIRTSCHAFT_FLOORPLAN) {
      store.updateFloorplan(migrate(window.WIRTSCHAFT_FLOORPLAN));
    } else {
      try {
        store.updateFloorplan(migrate(await (await fetch('data/floorplan.json', { cache: 'no-store' })).json()));
      } catch {
        warn('Der Tischplan konnte nicht geladen werden. Bitte die Seite über einen lokalen Server öffnen, nicht als Datei.');
        return;
      }
    }
  }

  const slug = name => (name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20) || 'ordnung');

  const current = () => store.load().floorplan;
  const layout = () => activeLayout(current());
  const parties = () => store.load().parties || [];
  const blocked = () => store.load().blockedTables || [];
  const menu = () => current().menu || [];
  const policy = () => current().policy || {};

  // Der gewaehlte Zeitpunkt steuert alles: Karte, Tischliste, Reservierungen.
  const moment = { date: today(), time: '12:00' };
  let picked = null;
  let marked = null;

  // Jede Aenderung merkt sich, damit Rueckgaengig und Wiederholen jeden
  // einzelnen Schritt treffen - nicht nur den letzten Speichervorgang.
  const history = createHistory(
    () => JSON.stringify(store.planSnapshot()),
    text => { store.restorePlan(JSON.parse(text)); }
  );
  const putParties = list => { const out = store.setParties(list); history.remember(); return out; };
  const putBlocked = list => { const out = store.setBlockedTables(list); history.remember(); return out; };
  const putFloorplan = patch => { const out = store.updateFloorplan(patch); history.remember(); return out; };

  /**
   * Beschriftung eines Tisches fuer Meldungen und Listen. Zaehlt jede Etage
   * neu, gehoert die Etage dazu - "Tisch 1" allein waere mehrdeutig.
   */
  const tisch = (idOrTable, plan = buildFloorplan(current())) => {
    const table = typeof idOrTable === 'string'
      ? plan.tables.find(entry => entry.id === idOrTable)
      : idOrTable;
    return table ? tableLabel(table, plan) : '?';
  };
  const tischListe = (ids, plan = buildFloorplan(current())) =>
    ids.map(id => tisch(id, plan)).join(' + ');

  const say = (id, text) => { byId(id).textContent = text; };
  const seatResult = text => say('fpSeatResult', text);
  function warn(text) {
    const box = byId('fpWarn');
    box.hidden = !text;
    box.textContent = text || '';
  }

  const service = () => serviceOf(layout());
  const schichten = () => (service().mode === 'schichten' ? seatingPlan(service()) : []);
  /** Die Schicht, in der eine Uhrzeit liegt - oder nichts. */
  const schichtFor = time => schichten().find(entry => entry.time === time) || null;

  /**
   * Im Schichtbetrieb bestimmt der Abstand zur naechsten Schicht die Dauer.
   * Nur im freien Betrieb haengt sie an der Gruppengroesse.
   */
  const minutesFor = (guests, time) => {
    const schicht = time ? schichtFor(time) : null;
    if (schicht) return schicht.minutes;
    if (service().mode === 'schichten' && schichten().length) return schichten()[0].minutes;
    return durationFor(guests, policy());
  };
  const startsAt = party => `${party.date}T${party.time}`;
  const dayParties = () => parties().filter(party => party.date === moment.date);

  /** Reservierungen, die zum gewaehlten Zeitpunkt tatsaechlich sitzen. */
  function seatedNow() {
    const now = stamp(`${moment.date}T${moment.time}`);
    if (now === null) return [];
    return dayParties().filter(party => {
      if (!party.tableIds.length) return false;
      const from = stamp(startsAt(party));
      return from !== null && from <= now && now < from + minutesFor(party.guests, party.time);
    });
  }

  function seatingMap() {
    const map = {};
    for (const party of seatedNow()) {
      for (const id of party.tableIds) map[id] = { name: party.name, guests: party.guests };
    }
    return map;
  }

  /** Belegung fuer die Zuweisung: alle Reservierungen des Tages mit Tisch. */
  const occupancyOf = list => list
    .filter(party => party.tableIds.length)
    .map(party => ({
      tableIds: party.tableIds,
      startsAt: startsAt(party),
      minutes: minutesFor(party.guests, party.time),
      guests: party.guests
    }));

  // ---- Speichern und Aufraeumen --------------------------------------------

  const numbering = config => buildFloorplan(config).tables.map(table => `${table.id}:${table.number}`).join(',');

  function save(next, { quiet = false } = {}) {
    const before = numbering(current());
    putFloorplan(next);
    const plan = buildFloorplan(current());

    const notes = [];
    if (!quiet && before !== numbering(current())) {
      notes.push('Achtung: Tischnummern haben sich verschoben. Aushänge und Notizen im Haus prüfen.');
    }
    if (plan.orphans.length) {
      notes.push(`${plan.orphans.length} Kombination(en) verweisen auf Tische, die es nicht mehr gibt.`);
    }
    notes.push(...reconcile(plan));
    warn(notes.join(' '));
    syncServiceMix(plan);
    paint();
    return plan;
  }

  /**
   * Nach jeder Aenderung: Verweise auf Tische aufloesen, die es nicht mehr
   * gibt. Ohne das haengt eine Reservierung an einem geloeschten Tisch, taucht
   * in keiner Liste mehr auf und ist praktisch verloren - das faellt erst auf,
   * wenn die Gaeste vor einem stehen.
   */
  function reconcile(plan) {
    const alive = new Set(plan.tables.map(table => table.id));
    const notes = [];
    const was = parties();
    const list = was.map(party => ({ ...party, tableIds: party.tableIds.filter(id => alive.has(id)) }));
    const freed = list.filter((party, index) => party.tableIds.length !== was[index].tableIds.length);
    if (freed.length) {
      putParties(list);
      const open = freed.filter(party => !party.tableIds.length).map(party => party.name);
      notes.push(open.length
        ? `${open.join(', ')} ${open.length === 1 ? 'hat' : 'haben'} keinen Tisch mehr und ${open.length === 1 ? 'steht' : 'stehen'} wieder offen.`
        : 'Eine Reservierung wurde auf die verbliebenen Tische gekürzt.');
    }
    const kept = blocked().filter(id => alive.has(id));
    if (kept.length !== blocked().length) putBlocked(kept);
    if (marked && !list.some(party => party.id === marked)) marked = null;
    if (picked && !alive.has(picked)) picked = null;
    return notes;
  }

  function syncServiceMix(plan) {
    const mix = deriveTableMix(plan);
    const state = store.load();
    for (const service of state.services) service.tables = { ...mix };
    store.save(state);
  }

  // ---- Zeitpunkt und Ordnung -----------------------------------------------

  function paintMoment() {
    byId('fpDate').value = moment.date;
    byId('fpTime').value = moment.time;
    const select = byId('fpLayout');
    select.textContent = '';
    for (const entry of current().layouts) {
      const option = document.createElement('option');
      option.value = entry.id;
      option.textContent = entry.name;
      option.selected = entry.id === current().activeLayout;
      select.append(option);
    }
    const plan = buildFloorplan(current());
    const sitting = seatedNow();
    const gaeste = sitting.reduce((sum, party) => sum + party.guests, 0);
    const offen = dayParties().filter(party => !party.tableIds.length).length;
    say('fpMomentInfo', `${plan.layoutName}: ${plan.tables.length} Tische, ${totalSeats(plan)} Plätze. `
      + `Um ${moment.time} sitzen ${gaeste} Gäste an ${sitting.reduce((sum, party) => sum + party.tableIds.length, 0)} Tischen. `
      + `${offen} Reservierung(en) ohne Tisch.`);
  }

  byId('fpMomentForm').addEventListener('submit', event => {
    event.preventDefault();
    moment.date = byId('fpDate').value || today();
    moment.time = byId('fpTime').value || '12:00';
    const wanted = byId('fpLayout').value;
    if (wanted !== current().activeLayout) {
      const config = current();
      config.activeLayout = wanted;
      picked = null;
      save(config, { quiet: true });
      return;
    }
    paint();
  });

  // ---- Karte ---------------------------------------------------------------

  const layoutLevelOf = (config, tableId) =>
    activeLayout(config)?.levels.find(level => level.tables.some(table => table.id === tableId));

  function paintPlan() {
    renderFloorplan(preview, current(), {
      mode: 'select',
      states: Object.fromEntries(blocked().map(id => [id, 'blocked'])),
      seating: seatingMap(),
      selected: picked,
      onSelect: id => {
        if (id && marked) return seatMarked(id);
        picked = id;
        paintPlan();
        paintSeating();
        if (!id) return;
        const field = byId('fpTableList').querySelector(`[data-table-id="${id}"][data-field="name"]`);
        if (field && !field.disabled) { field.focus(); field.select(); }
      },
      onEdit: (id, value) => setTableName(id, value),
      // Raumobjekte werden wie Tische gezogen, nur ohne Kollisionspruefung -
      // eine Wand darf an einem Tisch stehen.
      onMoveElement: (id, col, row) => {
        const config = current();
        const level = elementLevel(config, id);
        const item = level?.elements.find(entry => entry.id === id);
        if (!item) return;
        item.col = Math.max(0, Math.min(GRID.cols - item.w, col));
        item.row = Math.max(0, row);
        save(config, { quiet: true });
        const status = preview.querySelector('[data-status]');
        if (status) status.textContent = `${item.label || ELEMENTS[item.kind]?.label || 'Wand'} verschoben.`;
      },
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
        const level = layoutLevelOf(config, id);
        if (!level) return;
        // Sobald von Hand angeordnet wird, halten wir alle Tische der Etage
        // fest. Sonst rutschen automatisch platzierte Tische bei jedem Zug
        // nach - eine Karte, die sich unter der Hand bewegt, ist unbrauchbar.
        const here = plan.levels.find(item => item.id === level.id);
        for (const table of level.tables) {
          const spot = here.tables.find(entry => entry.id === table.id);
          if (spot) { table.col = spot.col; table.row = spot.row; }
        }
        const moved = level.tables.find(table => table.id === id);
        if (moved) { moved.col = col; moved.row = row; }
        const updated = save(config, { quiet: true });
        const status = preview.querySelector('[data-status]');
        const number = updated.tables.find(table => table.id === id)?.number;
        if (status) status.textContent = `Tisch ${number ?? ''} verschoben. Die Nummern folgen der Leserichtung im Raum.`;
      }
    });
  }

  // ---- Reservierungen ------------------------------------------------------

  function paintDishes() {
    const box = byId('fpDishes');
    [...box.querySelectorAll('label')].forEach(node => node.remove());
    for (const dish of menu()) {
      const label = document.createElement('label');
      label.append(dish.name);
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.max = '24';
      input.value = '0';
      input.dataset.dish = dish.id;
      input.setAttribute('aria-label', `Anzahl ${dish.name}`);
      label.append(input);
      box.append(label);
    }
  }

  function dishesFromForm() {
    const dishes = {};
    let total = 0;
    for (const input of byId('fpDishes').querySelectorAll('[data-dish]')) {
      const count = Math.max(0, Math.trunc(Number(input.value) || 0));
      if (count > 0) { dishes[input.dataset.dish] = count; total += count; }
    }
    return { dishes, total };
  }

  const resetDishes = () => byId('fpDishes').querySelectorAll('[data-dish]').forEach(input => { input.value = '0'; });

  const dishLabel = dishes => Object.entries(dishes || {})
    .map(([id, count]) => `${count}× ${menu().find(dish => dish.id === id)?.name || id}`).join(', ');

  /** Legt eine Reservierung an und setzt sie sofort, wenn ein Tisch frei ist. */
  function addReservation({ name, date, time, guests, dishes, source = 'manuell' }, { silent = false } = {}) {
    const plan = buildFloorplan(current());
    const party = {
      id: `r-${Date.now().toString(36)}-${parties().length}`,
      name, date, time, guests, dishes, source, tableIds: []
    };
    const feste = minutesFor(guests, time);
    const result = assignTables({
      floorplan: plan,
      occupancy: occupancyOf(parties().filter(entry => entry.date === date)),
      blocked: blocked(),
      guests,
      startsAt: `${date}T${time}`,
      // Im Schichtbetrieb kommen alle gleichzeitig - Pacing waere sinnlos und
      // wuerde jede zweite Reservierung grundlos ablehnen.
      policy: service().mode === 'schichten'
        ? { ...policy(), maxCoversPerSlot: Number.MAX_SAFE_INTEGER }
        : policy(),
      minutes: feste
    });
    if (result.ok) party.tableIds = result.tableIds;
    putParties([...parties(), party]);

    moment.date = date;
    moment.time = time;
    paint();
    if (silent) return party;

    const wunsch = dishLabel(dishes);
    if (result.ok) {
      const schicht = schichtFor(time);
      say('fpResResult', `${name}, ${guests} Personen am ${date} um ${time}: Tisch ${tischListe(result.tableIds)}`
        + (result.seatGap ? ` (${result.seatGap} Platz übrig).` : ' – passgenau.')
        + (schicht?.naechste
          // Der Gast muss wissen, dass der Tisch wieder gebraucht wird.
          ? ` Tisch wird um ${schicht.naechste} erneut vergeben – dem Gast sagen, dass ${schicht.minutes} Minuten zur Verfügung stehen.`
          : '')
        + (wunsch ? ` Essen vorbestellt: ${wunsch}.` : ''));
      return party;
    }
    const gruende = {
      pacing: 'zu viele Gäste im selben Viertelstundenfenster',
      no_fit: 'kein passender Tisch frei',
      capacity: 'Sitzplatzdeckel erreicht',
      invalid: 'Eingabe unvollständig'
    };
    const alternativen = (result.alternatives || [])
      .map(entry => `${entry.startsAt.slice(11)} (Tisch ${tischListe(entry.tableIds)})`).join(', ');
    say('fpResResult', `${name} ist aufgenommen, aber noch ohne Tisch – ${gruende[result.reason]}.`
      + (alternativen ? ` Möglich wäre: ${alternativen}.` : ''));
    return party;
  }

  byId('fpResForm').addEventListener('submit', event => {
    event.preventDefault();
    const name = byId('fpResName').value.trim();
    if (!name) return;
    const guests = Math.max(1, Math.min(24, Number(byId('fpResGuests').value) || 1));
    const { dishes, total } = dishesFromForm();
    if (total > guests) {
      return say('fpResResult', `${total} Portionen für ${guests} Personen – bitte korrigieren.`);
    }
    addReservation({
      name,
      date: byId('fpResDate').value || today(),
      time: byId('fpResTime').value || '12:00',
      guests,
      dishes
    });
    byId('fpResName').value = '';
    resetDishes();
    byId('fpResName').focus();
  });

  // Aus einem Mailtext lesen. Kein Postfachzugriff - das braucht einen Server.
  function parseMail(text) {
    const clean = text.replace(/\s+/g, ' ');
    const guests = Number((/(\d{1,2})\s*(?:personen|pers\.?|gäste|gaeste|leute)/i.exec(clean) || [])[1]) || null;
    const dmy = /(\d{1,2})\.(\d{1,2})\.(\d{2,4})/.exec(clean);
    const iso = /(\d{4})-(\d{2})-(\d{2})/.exec(clean);

    // Das Datum zuerst herausnehmen, sonst liest der Zeit-Ausdruck "24.08"
    // als 24:08. Erst danach nach der Uhrzeit suchen.
    const ohneDatum = clean.replace(dmy?.[0] || ' ', ' ').replace(iso?.[0] || ' ', ' ');
    const clock = /\b([0-2]?\d)[:.]([0-5]\d)\b/.exec(ohneDatum);
    const uhrOnly = (/\b([0-2]?\d)\s*uhr\b/i.exec(ohneDatum) || [])[1];
    // Das Schluesselwort darf gross oder klein stehen; der Name selbst muss
    // gross anfangen, sonst faengt der Ausdruck das naechstbeste Verb ein.
    const name = (/[Nn]ame[ns]?:?\s+([A-ZÄÖÜ][\wÄÖÜäöüß-]+(?:\s[A-ZÄÖÜ][\wÄÖÜäöüß-]+)?)/.exec(text) || [])[1]
      || (/[Ff]amilie\s+([A-ZÄÖÜ][\wÄÖÜäöüß-]+)/.exec(text) || [])[1]
      || (/\b(?:[Hh]err?n?|[Ff]rau)\s+([A-ZÄÖÜ][\wÄÖÜäöüß-]+)/.exec(text) || [])[1]
      || null;

    let date = today();
    if (iso) date = `${iso[1]}-${iso[2]}-${iso[3]}`;
    else if (dmy) {
      const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
      date = `${year}-${String(dmy[2]).padStart(2, '0')}-${String(dmy[1]).padStart(2, '0')}`;
    }
    const hour = clock ? clock[1] : uhrOnly;
    const minute = clock ? clock[2] : '00';
    return {
      name: name ? name.trim() : null,
      date,
      time: hour ? `${String(hour).padStart(2, '0')}:${minute}` : '12:00',
      guests
    };
  }

  byId('fpMailImport').addEventListener('click', () => {
    const text = byId('fpMailText').value;
    if (!text.trim()) return say('fpResResult', 'Bitte zuerst den Mailtext einfügen.');
    const parsed = parseMail(text);
    if (!parsed.name || !parsed.guests) {
      return say('fpResResult', 'Aus dem Text ließen sich Name und Personenzahl nicht sicher lesen. Bitte oben von Hand eintragen.');
    }
    addReservation({ ...parsed, dishes: {}, source: 'mail' });
    byId('fpMailText').value = '';
  });

  function paintSeating() {
    const plan = buildFloorplan(current());
    const numberOf = new Map(plan.tables.map(table => [table.id, table.number]));
    const list = byId('fpParties');
    list.textContent = '';

    const day = dayParties().sort((a, b) => a.time.localeCompare(b.time) || a.name.localeCompare(b.name));
    if (!day.length) {
      const note = document.createElement('li');
      note.className = 'fp-empty-list';
      note.textContent = 'Für diesen Tag ist noch nichts reserviert.';
      list.append(note);
    }
    for (const party of day) {
      const item = document.createElement('li');
      if (party.id === marked) item.className = 'is-marked';

      const pick = document.createElement('button');
      pick.type = 'button';
      pick.className = 'pick';
      pick.dataset.markParty = party.id;
      pick.setAttribute('aria-pressed', String(party.id === marked));

      const when = document.createElement('span');
      when.className = 'when';
      when.textContent = party.time;
      const name = document.createElement('b');
      name.textContent = party.name;
      const size = document.createElement('span');
      size.className = 'seat';
      size.textContent = `${party.guests}P`;
      pick.append(when, name, size);

      if (Object.keys(party.dishes || {}).length) {
        const dishes = document.createElement('span');
        dishes.className = 'dishes';
        dishes.textContent = dishLabel(party.dishes);
        pick.append(dishes);
      }

      const where = document.createElement('span');
      if (party.tableIds.length) {
        where.className = 'at';
        where.textContent = `Tisch ${tischListe(party.tableIds, plan)}`;
      } else {
        where.className = 'open';
        where.textContent = party.id === marked ? 'Tisch anklicken' : 'noch offen';
      }
      pick.append(where);
      item.append(pick);

      if (party.tableIds.length) {
        // Umsetzen quer durch alle Etagen - der haeufigste Griff, wenn
        // spontan ein Raum gebraucht wird.
        const move = document.createElement('select');
        move.dataset.moveParty = party.id;
        move.setAttribute('aria-label', `${party.name} an einen anderen Tisch setzen`);
        const keep = document.createElement('option');
        keep.value = '';
        keep.textContent = 'Tisch wechseln …';
        move.append(keep);
        for (const level of plan.levels) {
          const group = document.createElement('optgroup');
          group.label = level.name;
          for (const table of level.tables) {
            if (party.tableIds.includes(table.id)) continue;
            const option = document.createElement('option');
            option.value = table.id;
            const belegt = collidesAt(party, [table.id], parties());
            option.textContent = `Tisch ${tisch(table)} · ${table.seats}P`
              + (belegt ? ` · belegt (${belegt.name})` : '');
            option.disabled = Boolean(belegt) || party.guests > table.seats || blocked().includes(table.id);
            group.append(option);
          }
          if (group.children.length) move.append(group);
        }
        item.append(move);
      }

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.dataset.removeParty = party.id;
      remove.textContent = 'Entfernen';
      item.append(remove);
      list.append(item);
    }

    // Kuechenuebersicht: was ist fuer diesen Tag vorbestellt?
    const sums = {};
    let mitWunsch = 0;
    for (const party of day) {
      const own = Object.entries(party.dishes || {});
      if (own.length) mitWunsch += 1;
      for (const [id, count] of own) sums[id] = (sums[id] || 0) + count;
    }
    const gaeste = day.reduce((sum, party) => sum + party.guests, 0);
    say('fpKitchen', Object.keys(sums).length
      ? `Küche für ${moment.date}: ${dishLabel(sums)} – vorbestellt von ${mitWunsch} von ${day.length} Reservierungen, insgesamt ${gaeste} Gäste.`
      : `Küche für ${moment.date}: noch nichts vorbestellt, ${gaeste} Gäste erwartet.`);

    paintTableList(plan);
  }

  byId('fpParties').addEventListener('change', event => {
    const move = event.target.closest('[data-move-party]');
    if (!move || !move.value) return;
    marked = move.dataset.moveParty;
    seatMarked(move.value);
  });

  byId('fpParties').addEventListener('click', event => {
    const mark = event.target.closest('[data-mark-party]');
    if (mark) {
      const party = parties().find(entry => entry.id === mark.dataset.markParty);
      marked = marked === mark.dataset.markParty ? null : mark.dataset.markParty;
      // Zur Reservierungszeit springen, sonst zeigt die Karte einen anderen
      // Moment als den, fuer den gerade eingeteilt wird.
      if (marked && party) moment.time = party.time;
      paint();
      seatResult(!marked ? 'Markierung aufgehoben.'
        : party?.tableIds.length
          ? `${party.name} sitzt bereits – jetzt den neuen Tisch anklicken.`
          : `${party?.name} (${party?.guests}P, ${party?.time}) ist markiert – jetzt einen freien Tisch anklicken.`);
      return;
    }
    const button = event.target.closest('[data-remove-party]');
    if (!button) return;
    const gone = parties().find(party => party.id === button.dataset.removeParty);
    if (marked === button.dataset.removeParty) marked = null;
    putParties(parties().filter(party => party.id !== button.dataset.removeParty));
    seatResult(gone ? `${gone.name} entfernt.` : 'Reservierung entfernt.');
    paint();
  });

  /** Zeitliche Kollision auf denselben Tischen, inklusive Pufferzeit. */
  function collidesAt(party, tableIds, list) {
    const buffer = Number(policy().bufferMinutes) || 0;
    const from = stamp(startsAt(party)) - buffer;
    const to = stamp(startsAt(party)) + minutesFor(party.guests, party.time) + buffer;
    return list.find(other => {
      if (other.id === party.id || other.date !== party.date) return false;
      if (!other.tableIds.some(id => tableIds.includes(id))) return false;
      const start = stamp(startsAt(other));
      return start < to && from < start + minutesFor(other.guests, other.time);
    });
  }

  function seatMarked(tableId) {
    const plan = buildFloorplan(current());
    const table = plan.tables.find(item => item.id === tableId);
    const list = parties().map(party => ({ ...party, tableIds: [...party.tableIds] }));
    const party = list.find(entry => entry.id === marked);
    if (!table || !party) { marked = null; return; }

    if (blocked().includes(tableId)) return seatResult(`Tisch ${tisch(table)} ist gesperrt. Erst entsperren.`);
    if (party.guests > table.seats) {
      return seatResult(`${party.name} sind ${party.guests} Personen – Tisch ${tisch(table)} hat nur ${table.seats} Plätze.`);
    }
    const clash = collidesAt(party, [tableId], list);
    if (clash) return seatResult(`Tisch ${tisch(table)} ist um ${party.time} schon von ${clash.name} belegt.`);

    party.tableIds = [tableId];
    marked = null;
    putParties(list);
    seatResult(`${party.name} sitzt an Tisch ${tisch(table)} (${party.guests} von ${table.seats} Plätzen, ${party.time}).`);
    paint();

    const nextOpen = dayParties().find(entry => !entry.tableIds.length);
    const button = nextOpen && byId('fpParties').querySelector(`[data-mark-party="${nextOpen.id}"]`);
    if (button) button.focus();
    else byId('fpTableList').querySelector(`[data-table-id="${tableId}"][data-field="name"]`)?.focus();
  }

  function paintFloorMove() {
    const plan = buildFloorplan(current());
    for (const [id, vorgabe] of [['fpMoveFrom', 0], ['fpMoveTo', 1]]) {
      const select = byId(id);
      const gewaehlt = select.value;
      select.textContent = '';
      plan.levels.forEach((level, index) => {
        const option = document.createElement('option');
        option.value = level.id;
        option.textContent = level.name;
        option.selected = gewaehlt ? level.id === gewaehlt : index === Math.min(vorgabe, plan.levels.length - 1);
        select.append(option);
      });
    }
    byId('fpMoveFloorForm').hidden = plan.levels.length < 2;
  }

  byId('fpMoveFloorForm').addEventListener('submit', event => {
    event.preventDefault();
    const von = byId('fpMoveFrom').value;
    const nach = byId('fpMoveTo').value;
    if (von === nach) return seatResult('Bitte zwei verschiedene Etagen wählen.');

    const plan = buildFloorplan(current());
    const ziel = plan.levels.find(level => level.id === nach);
    const list = parties().map(party => ({ ...party, tableIds: [...party.tableIds] }));
    // Nur wer an diesem Tag auf der Ausgangsetage sitzt.
    const betroffen = list.filter(party => party.date === moment.date && party.tableIds.length
      && party.tableIds.every(id => plan.tables.find(table => table.id === id)?.levelId === von))
      .sort((a, b) => b.guests - a.guests);
    if (!betroffen.length) return seatResult(`Auf dieser Etage sitzt am ${moment.date} niemand.`);

    // Erst alle abraeumen, dann neu setzen - sonst blockieren sie sich selbst.
    for (const party of betroffen) party.tableIds = [];

    const umgesetzt = [];
    const offen = [];
    for (const party of betroffen) {
      const frei = ziel.tables
        .filter(table => !blocked().includes(table.id))
        .filter(table => party.guests <= table.seats)
        .filter(table => !collidesAt(party, [table.id], list))
        // Kleinster passender Tisch, wie bei der automatischen Verteilung.
        .sort((a, b) => (a.seats - party.guests) - (b.seats - party.guests) || a.number - b.number);
      if (!frei.length) { offen.push(party); continue; }
      party.tableIds = [frei[0].id];
      umgesetzt.push(`${party.name} an Tisch ${tableLabel(frei[0], plan)}`);
    }
    putParties(list);
    paint();
    seatResult(`${umgesetzt.length} umgesetzt nach ${ziel.name}: ${umgesetzt.join(', ') || '–'}.`
      + (offen.length ? ` Kein Platz für: ${offen.map(party => `${party.name} (${party.guests}P)`).join(', ')} – steht wieder offen.` : ''));
  });

  byId('fpAutoSeat').addEventListener('click', () => {
    const plan = buildFloorplan(current());
    const list = parties().map(party => ({ ...party, tableIds: [...party.tableIds] }));
    const open = list.filter(party => party.date === moment.date && !party.tableIds.length)
      .sort((a, b) => b.guests - a.guests);
    if (!open.length) return seatResult('Für diesen Tag ist keine Reservierung offen.');

    const seated = [];
    const failed = [];
    for (const party of open) {
      const result = assignTables({
        floorplan: plan,
        occupancy: occupancyOf(list.filter(entry => entry.date === party.date)),
        blocked: blocked(),
        guests: party.guests,
        startsAt: startsAt(party),
        policy: policy(),
        withAlternatives: false
      });
      if (!result.ok) { failed.push({ party, reason: result.reason }); continue; }
      party.tableIds = result.tableIds;
      seated.push({ name: party.name, tableIds: result.tableIds, time: party.time });
    }
    putParties(list);
    paint();

    const gruende = { pacing: 'Zeitfenster voll', no_fit: 'kein passender Tisch', capacity: 'Deckel erreicht', invalid: 'Eingabe' };
    seatResult(`${seated.length} verteilt: ${seated.map(entry => `${entry.name} ${entry.time} an Tisch ${tischListe(entry.tableIds)}`).join(', ') || '–'}.`
      + (failed.length ? ` Ohne Tisch: ${failed.map(entry => `${entry.party.name} (${entry.party.guests}P, ${gruende[entry.reason]})`).join(', ')}.` : ''));
  });

  byId('fpClearSeating').addEventListener('click', () => {
    if (!dayParties().length) return seatResult('Für diesen Tag ist nichts eingetragen.');
    if (!confirm(`Alle Reservierungen vom ${moment.date} mit Namen entfernen?`)) return;
    putParties(parties().filter(party => party.date !== moment.date));
    marked = null;
    paint();
    seatResult(`Reservierungen vom ${moment.date} gelöscht. Für diesen Tag sind keine Namen mehr gespeichert.`);
  });

  // ---- Tischliste ----------------------------------------------------------

  function paintTableList(plan) {
    const box = byId('fpTableList');
    const active = document.activeElement;
    const keep = active?.dataset?.tableId && box.contains(active)
      ? { id: active.dataset.tableId, field: active.dataset.field, start: active.selectionStart }
      : null;
    box.textContent = '';

    const sitting = seatedNow();
    const open = dayParties().filter(party => !party.tableIds.length);

    for (const table of plan.tables) {
      const party = sitting.find(entry => entry.tableIds.includes(table.id));
      const isBlocked = blocked().includes(table.id);

      const row = document.createElement('div');
      row.className = 'fp-table-row'
        + (party ? ' is-busy' : '') + (isBlocked ? ' is-blocked' : '') + (table.id === picked ? ' is-picked' : '');

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
      name.setAttribute('aria-label', `Name für Tisch ${tisch(table)} um ${moment.time}`);
      row.append(name);

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
      guests.setAttribute('aria-label', `Personen an Tisch ${tisch(table)}, höchstens ${table.seats}`);
      actions.append(guests);

      if (!party && !isBlocked && open.length) {
        const choose = document.createElement('select');
        choose.dataset.tableId = table.id;
        choose.dataset.field = 'assign';
        choose.setAttribute('aria-label', `Offene Reservierung an Tisch ${tisch(table)} setzen`);
        const empty = document.createElement('option');
        empty.value = '';
        empty.textContent = 'Reservierung wählen …';
        choose.append(empty);
        for (const entry of open) {
          const option = document.createElement('option');
          option.value = entry.id;
          option.textContent = `${entry.time} ${entry.name} (${entry.guests}P)`;
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
      box.append(row);
    }

    if (keep) {
      const back = box.querySelector(`[data-table-id="${keep.id}"][data-field="${keep.field}"]`);
      if (back && !back.disabled) {
        back.focus();
        if (back.type === 'text' && keep.start != null) back.setSelectionRange(keep.start, keep.start);
      }
    }
  }

  /** Name auf einen Tisch schreiben. Leerer Name macht ihn frei. */
  function setTableName(tableId, rawName) {
    const plan = buildFloorplan(current());
    const table = plan.tables.find(item => item.id === tableId);
    if (!table) return;
    const name = rawName.trim();
    const list = parties().map(party => ({ ...party, tableIds: [...party.tableIds] }));
    const sitting = seatedNow().find(entry => entry.tableIds.includes(tableId));
    const existing = sitting && list.find(party => party.id === sitting.id);

    if (!name) {
      if (!existing) return;
      existing.tableIds = existing.tableIds.filter(id => id !== tableId);
      putParties(list);
      seatResult(`Tisch ${tisch(table)} ist wieder frei – ${existing.name} steht offen.`);
      paint();
      return;
    }
    if (existing) {
      existing.name = name;
      putParties(list);
      seatResult(`Tisch ${tisch(table)}: ${name}.`);
      paint();
      return;
    }
    if (blocked().includes(tableId)) return seatResult(`Tisch ${tisch(table)} ist gesperrt. Erst entsperren.`);

    const offen = list.find(party => party.date === moment.date && !party.tableIds.length && party.name === name);
    if (offen) {
      const clash = collidesAt(offen, [tableId], list);
      if (clash) return seatResult(`Tisch ${tisch(table)} ist um ${offen.time} schon von ${clash.name} belegt.`);
      offen.tableIds = [tableId];
      putParties(list);
      seatResult(`${name} sitzt an Tisch ${tisch(table)} (${offen.guests} von ${table.seats} Plätzen).`);
      paint();
      return;
    }

    // Neu angelegt und direkt an diesen Tisch gesetzt.
    const fresh = addReservation(
      { name, date: moment.date, time: moment.time, guests: Math.min(2, table.seats), dishes: {} },
      { silent: true }
    );
    putParties(parties().map(party => (party.id === fresh.id ? { ...party, tableIds: [tableId] } : party)));
    seatResult(`${name} sitzt an Tisch ${tisch(table)} um ${moment.time}. Personenzahl in der Zeile anpassen.`);
    paint();
  }

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
    const sitting = seatedNow().find(entry => entry.tableIds.includes(field.dataset.tableId));
    const party = sitting && list.find(entry => entry.id === sitting.id);
    if (!table || !party) return;
    const wanted = Math.max(1, Math.round(Number(field.value) || 1));
    const seats = party.tableIds.reduce((sum, id) => sum + (plan.tables.find(item => item.id === id)?.seats || 0), 0);
    party.guests = Math.min(wanted, seats);
    putParties(list);
    seatResult(wanted > seats
      ? `Tisch ${tisch(table)} hat nur ${seats} Plätze – auf ${seats} begrenzt.`
      : `Tisch ${tisch(table)}: ${party.name}, ${party.guests} Personen.`);
    paint();
  });

  byId('fpTableList').addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const id = button.dataset.tableId;
    const plan = buildFloorplan(current());
    const table = plan.tables.find(item => item.id === id);
    if (button.dataset.action === 'free') return setTableName(id, '');
    if (seatedNow().some(party => party.tableIds.includes(id))) {
      return seatResult(`Tisch ${tisch(table)} ist belegt. Erst frei machen, dann sperren.`);
    }
    const set = new Set(blocked());
    const wasBlocked = set.has(id);
    if (wasBlocked) set.delete(id); else set.add(id);
    putBlocked([...set]);
    seatResult(`Tisch ${tisch(table)} ist jetzt ${wasBlocked ? 'wieder frei' : 'gesperrt'}.`);
    paint();
  });

  // ---- Raeume, Tische, Stuehle ---------------------------------------------

  function paintLevels() {
    const box = byId('fpLevels');
    box.textContent = '';
    const plan = buildFloorplan(current());
    for (const level of [...layout().levels].sort((a, b) => a.order - b.order)) {
      const wrap = document.createElement('div');
      wrap.className = 'fp-level-block';

      const head = document.createElement('div');
      head.className = 'fp-level-row';
      const nameLabel = document.createElement('label');
      nameLabel.className = 'fp-level-name';
      nameLabel.append('Etage');
      const nameInput = document.createElement('input');
      Object.assign(nameInput, { type: 'text', maxLength: 40, value: level.name });
      nameInput.dataset.level = level.id;
      nameInput.dataset.field = 'name';
      nameLabel.append(nameInput);
      head.append(nameLabel);

      const add = document.createElement('div');
      add.className = 'fp-sizes';
      for (const seats of SIZES) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.addTable = level.id;
        button.dataset.seats = String(seats);
        button.textContent = `+ ${seats}P`;
        button.setAttribute('aria-label', `Tisch mit ${seats} Plätzen in ${level.name} ergänzen`);
        add.append(button);
      }
      head.append(add);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'quiet';
      remove.dataset.removeLevel = level.id;
      remove.textContent = 'Etage entfernen';
      head.append(remove);
      wrap.append(head);

      const tables = document.createElement('div');
      tables.className = 'fp-chairs-list';
      for (const table of plan.tables.filter(entry => entry.levelId === level.id)) {
        const chip = document.createElement('div');
        chip.className = 'fp-chair-chip';
        const label = document.createElement('b');
        label.textContent = `Tisch ${tisch(table)}`;
        const seats = document.createElement('span');
        seats.textContent = `${table.seats} Stühle`;
        const minus = document.createElement('button');
        minus.type = 'button';
        minus.dataset.chair = table.id;
        minus.dataset.step = '-1';
        minus.textContent = '−';
        minus.setAttribute('aria-label', `Stuhl an Tisch ${tisch(table)} entfernen`);
        minus.disabled = table.seats <= 1;
        const plus = document.createElement('button');
        plus.type = 'button';
        plus.dataset.chair = table.id;
        plus.dataset.step = '1';
        plus.textContent = '+';
        plus.setAttribute('aria-label', `Stuhl an Tisch ${tisch(table)} ergänzen`);
        plus.disabled = table.seats >= GRID.maxSeats;
        const drop = document.createElement('button');
        drop.type = 'button';
        drop.dataset.removeTable = table.id;
        drop.textContent = 'Tisch weg';
        chip.append(label, seats, minus, plus, drop);
        tables.append(chip);
      }
      wrap.append(tables);
      box.append(wrap);
    }
  }

  byId('fpLevels').addEventListener('change', event => {
    const input = event.target.closest('[data-level][data-field="name"]');
    if (!input) return;
    const config = current();
    const level = activeLayout(config).levels.find(item => item.id === input.dataset.level);
    if (!level) return;
    level.name = input.value.trim() || level.name;
    save(config, { quiet: true });
  });

  byId('fpLevels').addEventListener('click', event => {
    const config = current();
    const active = activeLayout(config);

    const add = event.target.closest('[data-add-table]');
    if (add) {
      const level = active.levels.find(item => item.id === add.dataset.addTable);
      if (!level) return;
      level.tables.push({ id: nextTableId(level), seats: clampSeats(add.dataset.seats), col: null, row: null });
      save(config);
      return;
    }

    const chair = event.target.closest('[data-chair]');
    if (chair) {
      for (const level of active.levels) {
        const table = level.tables.find(item => item.id === chair.dataset.chair);
        if (!table) continue;
        const next = clampSeats(table.seats + Number(chair.dataset.step));
        const sitting = seatedNow().find(entry => entry.tableIds.includes(table.id));
        if (sitting && sitting.guests > next) {
          return warn(`An diesem Tisch sitzen ${sitting.guests} Personen (${sitting.name}) – so weit lässt er sich nicht verkleinern.`);
        }
        table.seats = next;
        save(config, { quiet: true });
        return;
      }
      return;
    }

    const drop = event.target.closest('[data-remove-table]');
    if (drop) {
      if (!confirm('Diesen Tisch aus der Ordnung entfernen?')) return;
      for (const level of active.levels) {
        level.tables = level.tables.filter(table => table.id !== drop.dataset.removeTable);
      }
      active.combos = active.combos.filter(combo => !combo.tables.includes(drop.dataset.removeTable));
      save(config);
      return;
    }

    const removeLevel = event.target.closest('[data-remove-level]');
    if (removeLevel) {
      if (active.levels.length <= 1) return warn('Es muss mindestens eine Etage bleiben.');
      if (!confirm('Diese Etage mit allen Tischen entfernen?')) return;
      const id = removeLevel.dataset.removeLevel;
      active.levels = active.levels.filter(level => level.id !== id);
      active.combos = active.combos.filter(combo => !combo.tables.some(entry => entry.startsWith(`${id}-`)));
      config.policy.levelOrder = config.policy.levelOrder.filter(entry => entry !== id);
      save(config);
    }
  });

  byId('fpAddLevel').addEventListener('submit', event => {
    event.preventDefault();
    const config = current();
    const active = activeLayout(config);
    if (active.levels.length >= 4) return warn('Mehr als vier Etagen sind nicht vorgesehen.');
    const name = byId('fpNewName').value.trim();
    if (!name) return;
    let id = slug(name);
    while (active.levels.some(level => level.id === id)) id = `${id}-2`.slice(0, 20);
    active.levels.push({
      id,
      name,
      order: Math.max(0, ...active.levels.map(level => level.order)) + 1,
      tables: [{ id: `${id}-t01`, seats: 4, col: null, row: null }]
    });
    if (!config.policy.levelOrder.includes(id)) config.policy.levelOrder.push(id);
    byId('fpNewName').value = '';
    save(config);
  });

  // ---- Tischordnungen ------------------------------------------------------

  byId('fpLayoutForm').addEventListener('submit', event => {
    event.preventDefault();
    const config = current();
    const name = byId('fpLayoutName').value.trim();
    if (!name) return;
    if (config.layouts.length >= 12) return warn('Mehr als zwölf Ordnungen sind nicht vorgesehen.');
    let id = slug(name);
    while (config.layouts.some(entry => entry.id === id)) id = `${id}-2`.slice(0, 20);
    // Neue Ordnung uebernimmt die Raeume, aber keine Tische - sie wird von
    // Grund auf gestellt. Zum Uebernehmen gibt es den Kopieren-Knopf.
    config.layouts.push({
      id,
      name,
      levels: activeLayout(config).levels.map(level => ({ id: level.id, name: level.name, order: level.order, tables: [] })),
      combos: []
    });
    config.activeLayout = id;
    byId('fpLayoutName').value = '';
    picked = null;
    save(config, { quiet: true });
    warn(`Ordnung "${name}" angelegt – die Räume sind da, die Tische stellst du neu.`);
  });

  byId('fpLayoutCopy').addEventListener('click', () => {
    const config = current();
    const source = activeLayout(config);
    if (config.layouts.length >= 12) return warn('Mehr als zwölf Ordnungen sind nicht vorgesehen.');
    let id = `${source.id}-kopie`.slice(0, 20);
    while (config.layouts.some(entry => entry.id === id)) id = `${id}2`.slice(0, 20);
    config.layouts.push(JSON.parse(JSON.stringify({ ...source, id, name: `${source.name} (Kopie)` })));
    config.activeLayout = id;
    save(config, { quiet: true });
    warn(`"${source.name}" kopiert.`);
  });

  byId('fpLayoutDelete').addEventListener('click', () => {
    const config = current();
    if (config.layouts.length <= 1) return warn('Es muss mindestens eine Ordnung bleiben.');
    const gone = activeLayout(config);
    if (!confirm(`Ordnung "${gone.name}" mit allen Tischen löschen?`)) return;
    config.layouts = config.layouts.filter(entry => entry.id !== gone.id);
    config.activeLayout = config.layouts[0].id;
    picked = null;
    save(config, { quiet: true });
    warn(`"${gone.name}" gelöscht.`);
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


  // ---- Rueckgaengig und wieder vor ----------------------------------------

  function paintHistory() {
    const { step, total } = history.position();
    byId('fpUndo').disabled = !history.canUndo();
    byId('fpRedo').disabled = !history.canRedo();
    byId('fpUndo').title = `Ein Schritt zurück (Schritt ${step} von ${total})`;
  }

  byId('fpUndo').addEventListener('click', () => {
    if (!history.undo()) return warn('Weiter zurück geht es nicht.');
    warn('');
    paint();
    seatResult('Ein Schritt zurück.');
  });

  byId('fpRedo').addEventListener('click', () => {
    if (!history.redo()) return warn('Es gibt nichts zum Wiederholen.');
    warn('');
    paint();
    seatResult('Ein Schritt vor.');
  });

  // Cmd/Strg + Z und Cmd/Strg + Umschalt + Z - aber nicht waehrend getippt wird.
  document.addEventListener('keydown', event => {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    event.preventDefault();
    byId(event.shiftKey ? 'fpRedo' : 'fpUndo').click();
  });

  // ---- Raumobjekte ---------------------------------------------------------

  function paintElements() {
    const add = byId('fpAddElement');
    add.textContent = '';
    for (const kind of elementKinds()) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.addElement = kind;
      button.textContent = `+ ${ELEMENTS[kind].label || 'Wand'}`;
      add.append(button);
    }

    const box = byId('fpElements');
    box.textContent = '';
    const plan = buildFloorplan(current());
    for (const level of plan.levels) {
      for (const item of level.elements || []) {
        const chip = document.createElement('div');
        chip.className = 'fp-chair-chip';
        const label = document.createElement('b');
        label.textContent = item.label || ELEMENTS[item.kind]?.label || 'Wand';
        const where = document.createElement('span');
        where.textContent = `${level.name} · ${item.w}×${item.h}`;
        chip.append(label, where);
        for (const [step, zeichen, titel] of [['-1', '−', 'kürzer'], ['1', '+', 'länger']]) {
          const button = document.createElement('button');
          button.type = 'button';
          button.dataset.sizeElement = item.id;
          button.dataset.step = step;
          button.textContent = zeichen;
          button.setAttribute('aria-label', `${label.textContent} ${titel}`);
          chip.append(button);
        }
        const turn = document.createElement('button');
        turn.type = 'button';
        turn.dataset.turnElement = item.id;
        turn.textContent = '⟲';
        turn.setAttribute('aria-label', `${label.textContent} drehen`);
        const drop = document.createElement('button');
        drop.type = 'button';
        drop.dataset.removeElement = item.id;
        drop.textContent = 'weg';
        chip.append(turn, drop);
        box.append(chip);
      }
    }
  }

  const elementLevel = (config, id) =>
    activeLayout(config).levels.find(level => (level.elements || []).some(item => item.id === id));

  byId('fpAddElement').addEventListener('click', event => {
    const button = event.target.closest('[data-add-element]');
    if (!button) return;
    const config = current();
    const level = activeLayout(config).levels.find(item => item.id === (picked ? picked.split('-')[0] : null))
      || activeLayout(config).levels[0];
    const kind = button.dataset.addElement;
    level.elements = level.elements || [];
    // Unterhalb des bisherigen Plans absetzen, sonst liegen alle neuen Objekte
    // auf 0,0 uebereinander und man sieht nur das oberste.
    const unten = buildFloorplan(current()).levels.find(item => item.id === level.id)?.rows || 0;
    level.elements.push({
      id: nextElementId(level), kind, label: ELEMENTS[kind].label,
      col: 0, row: unten + 1, w: ELEMENTS[kind].w, h: ELEMENTS[kind].h
    });
    save(config, { quiet: true });
    warn(`${ELEMENTS[kind].label || 'Wand'} in ${level.name} ergänzt – auf der Karte an die richtige Stelle ziehen.`);
  });

  byId('fpElements').addEventListener('click', event => {
    const config = current();

    const size = event.target.closest('[data-size-element]');
    if (size) {
      const id = size.dataset.sizeElement;
      const level = elementLevel(config, id);
      const item = level?.elements.find(entry => entry.id === id);
      if (!item) return;
      const step = Number(size.dataset.step);
      if (item.w >= item.h) item.w = Math.max(1, Math.min(GRID.cols, item.w + step));
      else item.h = Math.max(1, Math.min(24, item.h + step));
      save(config, { quiet: true });
      return;
    }

    const turn = event.target.closest('[data-turn-element]');
    if (turn) {
      const level = elementLevel(config, turn.dataset.turnElement);
      const item = level?.elements.find(entry => entry.id === turn.dataset.turnElement);
      if (!item) return;
      [item.w, item.h] = [item.h, item.w];
      save(config, { quiet: true });
      return;
    }

    const drop = event.target.closest('[data-remove-element]');
    if (drop) {
      const level = elementLevel(config, drop.dataset.removeElement);
      if (!level) return;
      level.elements = level.elements.filter(item => item.id !== drop.dataset.removeElement);
      save(config, { quiet: true });
    }
  });

  // ---- Tagesuebersicht -----------------------------------------------------

  /** Je Tag: wie viele Gaeste, wie viele Plaetze, wie viel davon belegt. */
  function statistics() {
    const plan = buildFloorplan(current());
    const seats = totalSeats(plan);
    const byDay = new Map();
    for (const party of parties()) {
      const day = byDay.get(party.date) || { date: party.date, reservierungen: 0, gaeste: 0, portionen: 0 };
      day.reservierungen += 1;
      day.gaeste += party.guests;
      day.portionen += Object.values(party.dishes || {}).reduce((sum, count) => sum + count, 0);
      byDay.set(party.date, day);
    }
    if (!byDay.has(moment.date)) {
      byDay.set(moment.date, { date: moment.date, reservierungen: 0, gaeste: 0, portionen: 0 });
    }
    return [...byDay.values()]
      .map(day => ({ ...day, plaetze: seats, frei: Math.max(0, seats - day.gaeste), auslastung: seats ? day.gaeste / seats : 0 }))
      // Heute zuerst, danach absteigend - der laufende Tag ist der wichtigste.
      .sort((a, b) => (a.date === moment.date ? -1 : b.date === moment.date ? 1 : b.date.localeCompare(a.date)));
  }

  function paintStats() {
    const body = byId('fpStats').querySelector('tbody');
    body.textContent = '';
    for (const day of statistics()) {
      const row = document.createElement('tr');
      if (day.date === moment.date) row.className = 'is-today';
      const zellen = [
        day.date === moment.date ? `${day.date} · heute gewählt` : day.date,
        day.reservierungen, day.gaeste, day.plaetze, day.gaeste, day.frei,
        `${Math.round(day.auslastung * 100)} %`,
        day.portionen
      ];
      for (const wert of zellen) {
        const cell = document.createElement('td');
        cell.textContent = String(wert);
        row.append(cell);
      }
      body.append(row);
    }
  }

  byId('fpCsv').addEventListener('click', () => {
    const kopf = ['Tag', 'Reservierungen', 'Gäste', 'Plätze gesamt', 'Belegt', 'Frei', 'Auslastung', 'Vorbestellte Portionen'];
    const zeilen = statistics().map(day => [
      day.date, day.reservierungen, day.gaeste, day.plaetze, day.gaeste, day.frei,
      // Deutsches Zahlenformat, sonst liest Excel 0.42 als Datum.
      String(Math.round(day.auslastung * 1000) / 10).replace('.', ',') + ' %',
      day.portionen
    ]);
    const csv = [kopf, ...zeilen]
      .map(zeile => zeile.map(feld => `"${String(feld).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    // BOM, damit Excel die Umlaute richtig liest.
    lade(`\uFEFF${csv}`, 'text/csv;charset=utf-8', `wirtschaft-tagesuebersicht-${moment.date}.csv`);
    seatResult('Tabelle gespeichert. In Excel per Doppelklick zu öffnen.');
  });

  function lade(inhalt, typ, name) {
    const blob = new Blob([inhalt], { type: typ });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  byId('fpPrint').addEventListener('click', () => {
    document.title = [current().eventName, buildFloorplan(current()).levels.find(level => level.id === preview.dataset.level)?.name,
      'Wirtschaft Dornbirn', moment.date].filter(Boolean).join(' · ');
    window.print();
  });

  byId('fpKunde').addEventListener('click', () => {
    const plan = buildFloorplan(current());
    const leer = plan.levels.every(level => !(level.elements || []).length);
    lade(`${JSON.stringify(current(), null, 2)}\n`, 'application/json', 'floorplan.json');
    warn(`Raum gespeichert: ${plan.tables.length} Tische, ${totalSeats(plan)} Plätze`
      + (leer ? ' – aber noch ohne Bühne, Bar oder Eingang. Der Kunde findet sich damit schwer zurecht.' : '.')
      + ' Die Datei nach site/data/floorplan.json legen und "npm run build:tischplan" ausführen –'
      + ' daraus entsteht wirtschaft-kundenplan.html zum Verschicken.');
  });

  byId('fpNumbering').addEventListener('change', () => {
    const config = current();
    config.numbering = { ...(config.numbering || {}), mode: byId('fpNumbering').value };
    save(config, { quiet: true });
    const plan = buildFloorplan(current());
    warn(plan.numberingMode === 'pro-etage'
      ? 'Jede Etage zählt jetzt neu bei 1. Weil es Tisch 1 dadurch mehrfach gibt, steht überall die Etage dabei.'
      : 'Die Tischnummern laufen jetzt durch alle Etagen durch.');
  });

  byId('fpEventName').addEventListener('change', () => {
    const config = current();
    config.eventName = byId('fpEventName').value.trim();
    save(config, { quiet: true });
  });


  // ---- Betriebsart ---------------------------------------------------------

  function paintService() {
    const rules = service();
    const plan = buildFloorplan(current());
    byId('fpMode').value = rules.mode;
    byId('fpSeatings').value = rules.seatings.join(', ');
    byId('fpEndsAt').value = rules.endsAt;
    byId('fpBuffer').value = String(rules.bufferMinutes);
    const schicht = rules.mode === 'schichten';
    for (const id of ['fpSeatings', 'fpEndsAt']) byId(id).disabled = !schicht;

    if (!schicht) {
      say('fpServiceInfo', 'Durchgehender Betrieb: die Dauer richtet sich nach der Gruppengröße '
        + `(${(policy().durations || []).map(step => `bis ${step.upTo}P ${step.minutes} Min`).join(', ')}). `
        + `Höchstens ${policy().maxCoversPerSlot} Gäste je Viertelstunde.`);
      return;
    }

    const liste = seatingPlan(rules);
    const plaetze = totalSeats(plan);
    const knapp = liste.filter(entry => entry.minutes < 45);
    say('fpServiceInfo',
      `${liste.length} Schichten: ${liste.map(entry => `${entry.time} → ${entry.minutes} Min`).join(', ')}, `
      + `danach ${rules.bufferMinutes} Min zum Abräumen. `
      + `${plaetze} Plätze × ${liste.length} Schichten = bis zu ${plaetze * liste.length} Gäste am Tag. `
      + 'Pacing ist ausgesetzt – im Schichtbetrieb kommen alle gleichzeitig.'
      + (knapp.length
        ? ` Achtung: ${knapp.map(entry => entry.time).join(', ')} lässt den Gästen unter 45 Minuten.`
        : ''));
  }

  byId('fpMode').addEventListener('change', () => {
    const config = current();
    activeLayout(config).service = { ...serviceOf(activeLayout(config)), mode: byId('fpMode').value };
    save(config, { quiet: true });
  });

  byId('fpServiceForm').addEventListener('submit', event => {
    event.preventDefault();
    const config = current();
    const alt = serviceOf(activeLayout(config));
    const zeiten = byId('fpSeatings').value.split(/[,;\s]+/).map(entry => entry.trim())
      .filter(entry => /^([01]?\d|2[0-3]):[0-5]\d$/.test(entry));
    if (byId('fpMode').value === 'schichten' && !zeiten.length) {
      return say('fpServiceInfo', 'Bitte mindestens eine Schichtzeit angeben, z. B. 11:30, 12:45.');
    }
    activeLayout(config).service = {
      mode: byId('fpMode').value,
      seatings: zeiten.length ? zeiten : alt.seatings,
      endsAt: byId('fpEndsAt').value || alt.endsAt,
      bufferMinutes: Math.max(0, Math.min(60, Number(byId('fpBuffer').value) || 0))
    };
    save(config, { quiet: true });
    seatResult('Betriebsart übernommen. Bestehende Reservierungen behalten ihre Uhrzeit.');
  });

  /** Im Schichtbetrieb gibt es nur die Schichtzeiten zur Auswahl. */
  function paintReservationTime() {
    const liste = schichten();
    const alt = byId('fpResTime');
    const brauchtSelect = liste.length > 0;
    if (brauchtSelect === (alt.tagName === 'SELECT')) {
      if (brauchtSelect) {
        const gewaehlt = alt.value;
        alt.textContent = '';
        for (const entry of liste) {
          const option = document.createElement('option');
          option.value = entry.time;
          option.textContent = `${entry.time} (${entry.minutes} Min)`;
          option.selected = entry.time === gewaehlt;
          alt.append(option);
        }
      }
      return;
    }
    const neu = document.createElement(brauchtSelect ? 'select' : 'input');
    neu.id = 'fpResTime';
    if (brauchtSelect) {
      for (const entry of liste) {
        const option = document.createElement('option');
        option.value = entry.time;
        option.textContent = `${entry.time} (${entry.minutes} Min)`;
        neu.append(option);
      }
    } else {
      neu.type = 'time';
      neu.step = '900';
      neu.value = moment.time;
      neu.required = true;
    }
    neu.setAttribute('aria-label', 'Uhrzeit der Reservierung');
    alt.replaceWith(neu);
  }

  // ---- Start ---------------------------------------------------------------

  function paint() {
    paintMoment();
    paintPlan();
    paintSeating();
    paintLevels();
    paintElements();
    paintService();
    paintReservationTime();
    paintFloorMove();
    paintStats();
    paintHistory();
    byId('fpEventName').value = current().eventName || '';
    byId('fpNumbering').value = buildFloorplan(current()).numberingMode;
  }

  byId('fpResDate').value = moment.date;
  byId('fpResTime').value = moment.time;
  paintDishes();
  syncServiceMix(buildFloorplan(current()));
  paint();
}
