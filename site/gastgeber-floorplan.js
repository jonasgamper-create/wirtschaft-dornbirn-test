// Panel 05: Etagen und Tischanzahlen pflegen, Tische auf der Karte verschieben,
// Zuweisung testen. Laeuft nur im internen Cockpit - der oeffentliche Build
// schliesst jede Datei mit dem Praefix "gastgeber" aus.

import { GRID, buildFloorplan, canPlace, deriveTableMix, totalSeats } from './floorplan-layout.mjs';
import { assignTables } from './table-assignment.mjs';
import { renderFloorplan } from './floorplan.js';

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
      // Ein Klick sperrt den Tisch oder gibt ihn wieder frei.
      onSelect: (id, table) => {
        if (!id) return;
        const list = new Set(blocked());
        const wasBlocked = list.has(id);
        if (wasBlocked) list.delete(id); else list.add(id);
        store.setBlockedTables([...list]);
        paintPlan();
        const status = preview.querySelector('[data-status]');
        if (status) status.textContent = `Tisch ${table?.number ?? ''} ist jetzt ${wasBlocked ? 'wieder frei' : 'gesperrt'}.`;
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

    const result = assignTables({
      floorplan: plan,
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
