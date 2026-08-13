// Panel 05: Etagen und Tischanzahlen pflegen, Plan ansehen, Zuweisung testen.
// Laeuft nur im internen Cockpit - der oeffentliche Build schliesst jede Datei
// mit dem Praefix "gastgeber" aus.

import { buildFloorplan, deriveTableMix, totalSeats } from './floorplan-layout.mjs';
import { assignTables } from './table-assignment.mjs';
import { renderFloorplan } from './floorplan.js';

const store = window.WirtschaftData;
const byId = id => document.getElementById(id);
const preview = byId('fpPreview');
if (store && preview) start();

async function start() {
  let config = store.load().floorplan;
  if (!config) {
    try {
      config = await (await fetch('data/floorplan.json', { cache: 'no-store' })).json();
      store.updateFloorplan(config);
      config = store.load().floorplan;
    } catch {
      byId('fpWarn').hidden = false;
      byId('fpWarn').textContent = 'Der Tischplan konnte nicht geladen werden. Bitte die Seite über einen lokalen Server öffnen, nicht als Datei.';
      return;
    }
  }

  const slug = name => (name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20) || 'etage');

  function current() { return store.load().floorplan; }
  function blocked() { return store.load().blockedTables || []; }

  function save(next, message) {
    const before = buildFloorplan(current()).tables.map(table => `${table.id}:${table.number}`).join(',');
    store.updateFloorplan(next);
    const after = buildFloorplan(current()).tables.map(table => `${table.id}:${table.number}`).join(',');

    const plan = buildFloorplan(current());
    const notes = [];
    if (before !== after) notes.push('Achtung: Tischnummern haben sich verschoben. Aushänge und Notizen im Haus prüfen.');
    if (plan.orphans.length) notes.push(`${plan.orphans.length} Kombination(en) verweisen jetzt auf Tische, die es nicht mehr gibt.`);
    const warn = byId('fpWarn');
    warn.hidden = !notes.length;
    warn.textContent = notes.join(' ');

    syncServiceMix(plan);
    paint();
    if (message) window.dispatchEvent(new CustomEvent('wirtschaft:datachange'));
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
      row.innerHTML = `
        <label>Name<input data-level="${level.id}" data-field="name" type="text" maxlength="40" value=""></label>
        <label>2er-Tische<input data-level="${level.id}" data-field="two" type="number" min="0" max="99" value="${level.counts[2]}"></label>
        <label>4er-Tische<input data-level="${level.id}" data-field="four" type="number" min="0" max="99" value="${level.counts[4]}"></label>
        <button class="quiet" type="button" data-remove="${level.id}">Etage entfernen</button>`;
      row.querySelector('[data-field="name"]').value = level.name;
      box.append(row);
    }
  }

  function paintPlan() {
    const config = current();
    const states = Object.fromEntries(blocked().map(id => [id, 'blocked']));
    renderFloorplan(preview, config, {
      mode: 'select',
      states,
      // Ein Klick sperrt den Tisch oder gibt ihn wieder frei. Nach dem
      // Neuzeichnen sagt die Statuszeile, was tatsaechlich passiert ist.
      onSelect: (id, table) => {
        if (!id) return;
        const list = new Set(blocked());
        const wasBlocked = list.has(id);
        if (wasBlocked) list.delete(id); else list.add(id);
        store.setBlockedTables([...list]);
        paintPlan();
        const status = preview.querySelector('[data-status]');
        if (status) {
          status.textContent = `Tisch ${table?.number ?? ''} ist jetzt ${wasBlocked ? 'wieder frei' : 'gesperrt'}.`;
        }
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
    if (input.dataset.field === 'name') level.name = input.value.trim() || level.name;
    if (input.dataset.field === 'two') level.counts[2] = Math.max(0, Math.min(99, Number(input.value) || 0));
    if (input.dataset.field === 'four') level.counts[4] = Math.max(0, Math.min(99, Number(input.value) || 0));
    save(config, true);
  });

  byId('fpLevels').addEventListener('click', event => {
    const button = event.target.closest('[data-remove]');
    if (!button) return;
    const config = current();
    if (config.levels.length <= 1) {
      byId('fpWarn').hidden = false;
      byId('fpWarn').textContent = 'Es muss mindestens eine Etage bleiben.';
      return;
    }
    if (!confirm('Diese Etage mit allen Tischen entfernen?')) return;
    const id = button.dataset.remove;
    config.levels = config.levels.filter(level => level.id !== id);
    config.combos = config.combos.filter(combo => !combo.tables.some(table => table.startsWith(`${id}-`)));
    config.policy.levelOrder = config.policy.levelOrder.filter(entry => entry !== id);
    save(config, true);
  });

  byId('fpAddLevel').addEventListener('submit', event => {
    event.preventDefault();
    const config = current();
    if (config.levels.length >= 4) {
      byId('fpWarn').hidden = false;
      byId('fpWarn').textContent = 'Mehr als vier Etagen sind nicht vorgesehen.';
      return;
    }
    const name = byId('fpNewName').value.trim();
    let id = slug(name);
    while (config.levels.some(level => level.id === id)) id = `${id}-2`.slice(0, 24);
    config.levels.push({
      id,
      name,
      order: Math.max(0, ...config.levels.map(level => level.order)) + 1,
      counts: { 2: Number(byId('fpNewTwo').value) || 0, 4: Number(byId('fpNewFour').value) || 0 }
    });
    config.policy.levelOrder = [...config.policy.levelOrder, id];
    byId('fpNewName').value = '';
    save(config, true);
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
      out.textContent = `Tisch ${result.numbers.join(' + ')} · ${result.seats} Plätze · ${result.levelName} · ${result.minutes} Minuten`
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
    const config = current();
    const payload = { ...config, updatedAt: new Date().toISOString() };
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
  byId('fpResult').textContent = `${plan.levels.length} Etagen, ${plan.tables.length} Tische, ${totalSeats(plan)} Plätze. `
    + 'Personenzahl und Uhrzeit eingeben, um die Zuweisung zu testen.';
}
